import { NextRequest, NextResponse } from "next/server";
import { importRowBusinessIdentity, isBfsPdfUploadFile, parseDemoImportFiles } from "@/lib/demo-import";
import { createServiceClient, requireSuperAdmin } from "@/lib/server-auth";
import type { ImportPreviewRow, ParsedImportMovement } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupabaseDbClient = any;

type ImportPersistenceResult = {
  batchId: string;
  imported: number;
  duplicates: number;
  failed: number;
  errors: Array<{ file: string; message: string }>;
};

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase Service-Client ist nicht konfiguriert." }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("bfs_documents")
      .select("extracted_json, created_at")
      .not("extracted_json", "is", null)
      .eq("status", "imported")
      .order("created_at", { ascending: true })
      .limit(5000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? [])
      .map((entry: { extracted_json: unknown }) => entry.extracted_json)
      .filter(isImportPreviewRow);

    return NextResponse.json({ rows: reconcileRowsByBusinessIdentity(rows) }, { headers: noStoreHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Importdaten konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase Service-Client ist nicht konfiguriert." }, { status: 500 });
    }

    const formData = await request.formData();
    const paths = formData
      .getAll("paths")
      .map((entry) => typeof entry === "string" ? entry : "")
      .filter(Boolean);
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File)
      .map((file, index) => fileWithUploadPath(file, paths[index]))
      .filter(isBfsPdfUploadFile);
    if (!files.length) return NextResponse.json({ error: "Keine PDF-Dateien übermittelt." }, { status: 400 });

    const rows = await parseDemoImportFiles(files);
    const persistence = await persistImport(supabase, auth.profile.id, files, rows);
    return NextResponse.json({ rows, persistence }, { headers: noStoreHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Serverseitiger Import fehlgeschlagen." },
      { status: 500 }
    );
  }
}

function fileWithUploadPath(file: File, uploadPath: string | undefined) {
  if (!uploadPath || uploadPath === file.name) return file;
  return new File([file], uploadPath, {
    type: file.type || "application/pdf",
    lastModified: file.lastModified
  });
}

function noStoreHeaders() {
  return {
    "cache-control": "no-store, max-age=0"
  };
}

async function persistImport(
  supabase: SupabaseDbClient,
  userId: string,
  files: File[],
  rows: ImportPreviewRow[]
): Promise<ImportPersistenceResult> {
  const { data: standorte } = await supabase.from("standorte").select("id, name, bfs_mandant_nr");
  const { data: standortMandanten } = await supabase.from("standort_mandanten").select("standort_id, mandant_nr");
  const standortByName = new Map<string, string>((standorte ?? []).map((standort: { id: string; name: string }) => [standort.name, standort.id]));
  const standortByMandant = new Map<string, string>(
    (standorte ?? [])
      .filter((standort: { bfs_mandant_nr: string | null }) => !!standort.bfs_mandant_nr)
      .map((standort: { id: string; bfs_mandant_nr: string }) => [standort.bfs_mandant_nr, standort.id])
  );
  (standortMandanten ?? []).forEach((entry: { standort_id: string; mandant_nr: string }) => {
    standortByMandant.set(entry.mandant_nr, entry.standort_id);
  });
  const { data: batch, error: batchError } = await supabase
    .from("bfs_import_batches")
    .insert({
      uploaded_by: userId,
      status: "processing",
      total_files: rows.length,
      successful_files: 0,
      failed_files: 0,
      notes: "Serverseitiger Import aus Orisus BFS Monitor"
    })
    .select("id")
    .single();
  if (batchError || !batch) throw batchError ?? new Error("Import-Batch konnte nicht erstellt werden.");
  const batchId = String(batch.id);

  let imported = 0;
  let duplicates = 0;
  let failed = 0;
  const errors: ImportPersistenceResult["errors"] = [];
  const fileByName = new Map(files.map((file) => [file.name, file]));

  for (const row of rows) {
    const file = fileByName.get(row.file) ?? fileByName.get(row.file.split("/").at(-1) ?? "");
    const standortId = standortByName.get(row.location) ?? standortByMandant.get(row.mandantNo) ?? null;
    if (!file || !standortId || !row.fileHash) {
      failed += 1;
      errors.push({ file: row.file, message: "Datei, Standort oder Hash konnte nicht eindeutig ermittelt werden." });
      continue;
    }

    let documentId: string | undefined;
    try {
      const existingDocumentId = await findExistingDocumentId(supabase, standortId, row);
      if (existingDocumentId) {
        duplicates += 1;
        continue;
      }

      const storagePath = `${batchId}/${safeStorageName(row.file)}`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const { error: storageError } = await supabase.storage.from("bfs-documents").upload(storagePath, fileBuffer, {
        contentType: file.type || "application/pdf",
        upsert: false
      });
      if (storageError) throw storageError;

      documentId = await insertDocument(supabase, batchId, standortId, storagePath, file, row);
      if (!documentId) throw new Error("Dokument konnte nicht gespeichert werden.");
      const abrechnungId = await insertAbrechnung(supabase, documentId, standortId, row);
      await insertForderungen(supabase, documentId, standortId, abrechnungId, row);
      await insertBewegungenAndCases(supabase, documentId, standortId, abrechnungId, row);
      imported += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unbekannter Importfehler";
      if (documentId) {
        await supabase
          .from("bfs_documents")
          .update({ status: "error", parse_error: message })
          .eq("id", documentId);
      }
      errors.push({ file: row.file, message });
    }
  }

  await supabase
    .from("bfs_import_batches")
    .update({
      status: failed ? (imported || duplicates ? "partially_completed" : "failed") : "completed",
      successful_files: imported + duplicates,
      failed_files: failed,
      notes: [
        "Serverseitiger Import aus Orisus BFS Monitor",
        `${imported} neu importiert`,
        `${duplicates} Dubletten übersprungen`,
        `${failed} fehlgeschlagen`
      ].join(" · ")
    })
    .eq("id", batchId);

  return { batchId, imported, duplicates, failed, errors };
}

async function findExistingDocumentId(
  supabase: SupabaseDbClient,
  standortId: string,
  row: ImportPreviewRow
) {
  if (row.fileHash) {
    const { data: existingByHash } = await supabase
      .from("bfs_documents")
      .select("id")
      .eq("file_hash", row.fileHash)
      .maybeSingle();
    if (existingByHash?.id) return existingByHash.id as string;
  }

  const businessIdentity = importRowBusinessIdentity(row);
  if (!businessIdentity) return null;

  const { data: existingByStatement } = await supabase
    .from("bfs_documents")
    .select("id")
    .eq("standort_id", standortId)
    .eq("bfs_mandant_nr", row.mandantNo)
    .eq("abrechnung_nr", row.statementNo)
    .limit(1)
    .maybeSingle();
  return existingByStatement?.id as string | null;
}

async function insertDocument(
  supabase: SupabaseDbClient,
  batchId: string,
  standortId: string,
  storagePath: string,
  file: File,
  row: ImportPreviewRow
) {
  const { data, error } = await supabase
    .from("bfs_documents")
    .insert({
      batch_id: batchId,
      standort_id: standortId,
      storage_path: storagePath,
      original_filename: row.file,
      file_hash: row.fileHash,
      file_size_bytes: row.fileSizeBytes ?? file.size,
      mime_type: file.type || "application/pdf",
      bfs_mandant_nr: row.mandantNo,
      mandant_name: row.practice,
      abrechnung_nr: row.statementNo,
      abrechnung_datum: parseGermanDate(row.date),
      status: "imported",
      extracted_json: row
    })
    .select("id")
    .single();
  if (!error) return data.id as string;

  const { data: existing } = await supabase
    .from("bfs_documents")
    .select("id")
    .eq("file_hash", row.fileHash)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const businessIdentity = importRowBusinessIdentity(row);
  if (!businessIdentity) return undefined;

  const { data: existingByStatement } = await supabase
    .from("bfs_documents")
    .select("id")
    .eq("standort_id", standortId)
    .eq("bfs_mandant_nr", row.mandantNo)
    .eq("abrechnung_nr", row.statementNo)
    .limit(1)
    .maybeSingle();
  return existingByStatement?.id as string | undefined;
}

async function insertAbrechnung(
  supabase: SupabaseDbClient,
  documentId: string,
  standortId: string,
  row: ImportPreviewRow
) {
  const { data, error } = await supabase
    .from("bfs_abrechnungen")
    .insert({
      document_id: documentId,
      standort_id: standortId,
      mandant_nr: row.mandantNo,
      mandant_name: row.practice,
      abrechnung_nr: row.statementNo,
      abrechnung_datum: parseGermanDate(row.date),
      anzahl_forderungen: row.claimsHeader,
      forderungen_brutto: row.sumHeader,
      gebuehr_netto: row.feeNet ?? 0,
      gebuehr_mwst: row.feeVat ?? 0,
      gebuehr_summe: row.feeTotal ?? 0,
      umsatz_netto: row.netRevenue ?? 0,
      auszahlung: row.payout ?? 0
    })
    .select("id")
    .single();
  if (error) throw error;
  return data?.id as string | undefined;
}

async function insertForderungen(
  supabase: SupabaseDbClient,
  documentId: string,
  standortId: string,
  abrechnungId: string | undefined,
  row: ImportPreviewRow
) {
  const claims = row.parsedClaims ?? [];
  if (!claims.length) return;
  const { error } = await supabase.from("bfs_forderungen").insert(claims.map((claim) => ({
    standort_id: standortId,
    abrechnung_id: abrechnungId,
    document_id: documentId,
    patient_name: claim.patientName,
    rechnungsnummer: claim.invoiceNo,
    bfs_nr: claim.bfsNo,
    betrag: claim.amount,
    ausfallschutz_status: claim.protectionStatus,
    kennzeichen: claim.marker,
    current_status: claim.protectionStatus === "ohne_ausfallschutz" ? "risiko" : "eingereicht"
  })));
  if (error) throw error;
}

async function insertBewegungenAndCases(
  supabase: SupabaseDbClient,
  documentId: string,
  standortId: string,
  abrechnungId: string | undefined,
  row: ImportPreviewRow
) {
  for (const movement of row.parsedMovements ?? []) {
    const { data, error } = await supabase
      .from("bfs_bewegungen")
      .insert({
        standort_id: standortId,
        abrechnung_id: abrechnungId,
        document_id: documentId,
        patient_name: movement.patientName,
        rechnungsnummer: movement.invoiceNo,
        bfs_nr: movement.bfsNo,
        bewegung_datum: parseShortGermanDate(movement.date, row.date),
        bewegung_typ: movement.type,
        betrag: movement.amount ?? 0,
        bemerkung: movement.reason,
        raw_text: movement.rawText
      })
      .select("id")
      .single();
    if (error) throw error;

    if (isCaseMovement(movement)) {
      const { error: caseError } = await supabase.from("bfs_cases").insert({
        standort_id: standortId,
        bewegung_id: data?.id,
        document_id: documentId,
        case_type: caseType(movement),
        status: "offen",
        patient_name: movement.patientName ?? "Patient noch nicht gematcht",
        rechnungsnummer: movement.invoiceNo,
        bfs_nr: movement.bfsNo,
        amount: Math.abs(movement.amount ?? 0),
        resolution_comment: null
      });
      if (caseError) throw caseError;
    }
  }
}

function isImportPreviewRow(value: unknown): value is ImportPreviewRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<ImportPreviewRow>;
  return typeof row.file === "string"
    && typeof row.location === "string"
    && typeof row.mandantNo === "string"
    && typeof row.statementNo === "string"
    && typeof row.date === "string";
}

function reconcileRowsByBusinessIdentity(rows: ImportPreviewRow[]) {
  const byIdentity = new Map<string, ImportPreviewRow>();
  rows.forEach((row) => {
    byIdentity.set(importRowBusinessIdentity(row) ?? row.fileHash ?? `${row.file}-${row.statementNo}-${row.date}`, row);
  });
  return [...byIdentity.values()];
}

function isCaseMovement(movement: ParsedImportMovement) {
  return !!movement.reasonCategory && !["regulierung", "abrechnungsumsatz"].includes(movement.reasonCategory);
}

function caseType(movement: ParsedImportMovement) {
  if (movement.type.includes("storno")) return "storno_praxis";
  if (movement.type.includes("rueckgabe") || movement.type.includes("rueckbelastung")) return "rueckbelastung";
  return "sonstiges";
}

function parseGermanDate(value: string | undefined) {
  const match = value?.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function parseShortGermanDate(value: string | undefined, fallback: string) {
  const match = value?.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (match) return `20${match[3]}-${match[2]}-${match[1]}`;
  return parseGermanDate(fallback);
}

function safeStorageName(value: string) {
  return value.replace(/\\/g, "/").split("/").map((part) => part.replace(/[^a-zA-Z0-9._-]+/g, "_")).join("/");
}

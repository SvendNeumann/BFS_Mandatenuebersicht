import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { parseDemoImportFiles } from "@/lib/demo-import";
import type { ImportPreviewRow, ParsedImportMovement } from "@/lib/types";

const accessCookie = "orisus_bfs_access_token";
type SupabaseDbClient = any;

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(accessCookie)?.value;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!accessToken || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Nicht angemeldet oder Supabase nicht konfiguriert." }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) return NextResponse.json({ error: "Session ungültig." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!profile?.active || profile.role !== "super_admin") {
    return NextResponse.json({ error: "Keine Importberechtigung." }, { status: 403 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (!files.length) return NextResponse.json({ error: "Keine Dateien übermittelt." }, { status: 400 });

  const rows = await parseDemoImportFiles(files);
  const persistence = await persistImport(supabase, userData.user.id, files, rows);
  return NextResponse.json({ rows, persistence });
}

async function persistImport(
  supabase: SupabaseDbClient,
  userId: string,
  files: File[],
  rows: ImportPreviewRow[]
) {
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

  let successful = 0;
  let failed = 0;
  const fileByName = new Map(files.map((file) => [file.name, file]));

  for (const row of rows) {
    const file = fileByName.get(row.file) ?? fileByName.get(row.file.split("/").at(-1) ?? "");
    const standortId = standortByName.get(row.location) ?? standortByMandant.get(row.mandantNo) ?? null;
    if (!file || !standortId || !row.fileHash) {
      failed += 1;
      continue;
    }

    try {
      const { data: existingDocument } = await supabase
        .from("bfs_documents")
        .select("id")
        .eq("file_hash", row.fileHash)
        .maybeSingle();
      if (existingDocument?.id) {
        successful += 1;
        continue;
      }

      const storagePath = `${batchId}/${safeStorageName(row.file)}`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await supabase.storage.from("bfs-documents").upload(storagePath, fileBuffer, {
        contentType: file.type || "application/pdf",
        upsert: false
      });

      const documentId = await insertDocument(supabase, batchId, standortId, storagePath, file, row);
      if (!documentId) {
        successful += 1;
        continue;
      }
      const abrechnungId = await insertAbrechnung(supabase, documentId, standortId, row);
      await insertForderungen(supabase, documentId, standortId, abrechnungId, row);
      await insertBewegungenAndCases(supabase, documentId, standortId, abrechnungId, row);
      successful += 1;
    } catch {
      failed += 1;
    }
  }

  await supabase
    .from("bfs_import_batches")
    .update({
      status: failed ? (successful ? "partially_completed" : "failed") : "completed",
      successful_files: successful,
      failed_files: failed
    })
    .eq("id", batchId);

  return { batchId, successful, failed };
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
  return existing?.id as string | undefined;
}

async function insertAbrechnung(
  supabase: SupabaseDbClient,
  documentId: string,
  standortId: string,
  row: ImportPreviewRow
) {
  const { data } = await supabase
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
  await supabase.from("bfs_forderungen").insert(claims.map((claim) => ({
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
}

async function insertBewegungenAndCases(
  supabase: SupabaseDbClient,
  documentId: string,
  standortId: string,
  abrechnungId: string | undefined,
  row: ImportPreviewRow
) {
  for (const movement of row.parsedMovements ?? []) {
    const { data } = await supabase
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

    if (isCaseMovement(movement)) {
      await supabase.from("bfs_cases").insert({
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
    }
  }
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

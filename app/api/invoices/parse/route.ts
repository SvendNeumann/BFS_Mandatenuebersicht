import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { standorte as appStandorte } from "@/lib/demo-data";
import { parseInvoicePdfBytes, parsePracticeSoftwareInvoicePdfBytes } from "@/lib/invoice-parser";
import { createServiceClient, getRequestProfile, requireSuperAdmin } from "@/lib/server-auth";
import type { ParsedInvoiceDocument, ParsedInvoiceLine } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupabaseDbClient = SupabaseClient;

type DbStandort = {
  id: string;
  name: string;
  praxisname?: string | null;
  bfs_mandant_nr?: string | null;
};

type StandortMaps = {
  dbByAppId: Map<string, DbStandort>;
  dbByName: Map<string, DbStandort>;
  dbByMandant: Map<string, DbStandort>;
  appByDbId: Map<string, typeof appStandorte[number]>;
};

type InvoicePersistenceResult = {
  batchId: string;
  imported: number;
  duplicates: number;
  failed: number;
  errors: Array<{ file: string; message: string }>;
};

export async function GET() {
  try {
    const auth = await getRequestProfile();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "Supabase Service-Client ist nicht konfiguriert." }, { status: 500 });

    const readableIds = await readableStandortIds(supabase, auth.profile.id, auth.profile.role);
    if (auth.profile.role !== "super_admin" && !readableIds.size) {
      return NextResponse.json({ rows: [] }, { headers: noStoreHeaders() });
    }

    const rows = await fetchPersistedInvoiceRows(supabase, auth.profile.role === "super_admin" ? undefined : readableIds);
    return NextResponse.json({ rows }, { headers: noStoreHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rechnungen konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  const paths = formData.getAll("paths").map((entry) => String(entry));
  const importSource = String(formData.get("importSource") ?? "bfs_invoice_pdf");
  const standortId = String(formData.get("standortId") ?? "");

  if (!files.length) {
    return NextResponse.json({ error: "Keine Rechnungs-PDFs im Upload gefunden." }, { status: 400 });
  }

  const rows = [];
  const errors: Array<{ file: string; message: string }> = [];

  for (const [index, file] of files.entries()) {
    const filePath = paths[index] || file.name;
    try {
      const bytes = await file.arrayBuffer();
      if (importSource === "practice_software_pdf") {
        rows.push(...await parsePracticeSoftwareInvoicePdfBytes(bytes, {
          file: filePath,
          fileSizeBytes: file.size,
          standortId
        }));
      } else {
        rows.push(await parseInvoicePdfBytes(bytes, {
          file: filePath,
          fileSizeBytes: file.size
        }));
      }
    } catch (error) {
      errors.push({
        file: filePath,
        message: error instanceof Error ? error.message : "Rechnung konnte nicht gelesen werden."
      });
    }
  }

  return NextResponse.json({
    rows,
    persistence: {
      parsed: rows.length,
      failed: errors.length,
      errors
    }
  }, { headers: noStoreHeaders() });
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "Supabase Service-Client ist nicht konfiguriert." }, { status: 500 });

    const body = await request.json() as { rows?: unknown[] };
    const rows = Array.isArray(body.rows) ? body.rows.filter(isParsedInvoiceDocument) : [];
    if (!rows.length) return NextResponse.json({ error: "Keine gültigen Rechnungen zur Bestätigung gefunden." }, { status: 400 });

    const persistence = await persistInvoiceRows(supabase, auth.profile.id, rows);
    const persistedRows = await fetchPersistedInvoiceRows(supabase);
    return NextResponse.json({ rows: persistedRows, persistence }, { headers: noStoreHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rechnungsimport konnte nicht bestätigt werden." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const auth = await requireSuperAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "Supabase Service-Client ist nicht konfiguriert." }, { status: 500 });

    await throwIfSupabaseError(supabase.from("bfs_patient_invoice_lines").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
    await throwIfSupabaseError(supabase.from("bfs_patient_invoices").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
    await throwIfSupabaseError(supabase.from("bfs_invoice_import_batches").delete().neq("id", "00000000-0000-0000-0000-000000000000"));

    return NextResponse.json({ rows: [], reset: true }, { headers: noStoreHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rechnungsdatenstand konnte nicht zurückgesetzt werden." },
      { status: 500 }
    );
  }
}

async function persistInvoiceRows(
  supabase: SupabaseDbClient,
  userId: string,
  rows: ParsedInvoiceDocument[]
): Promise<InvoicePersistenceResult> {
  const maps = await fetchStandortMaps(supabase);
  const { data: batch, error: batchError } = await supabase
    .from("bfs_invoice_import_batches")
    .insert({
      uploaded_by: userId,
      status: "processing",
      total_files: rows.length,
      successful_files: 0,
      failed_files: 0,
      notes: "Patientenrechnungen aus BFS-Rechnungsanalyse"
    })
    .select("id")
    .single();
  if (batchError || !batch) throw batchError ?? new Error("Rechnungsimport-Batch konnte nicht erstellt werden.");
  const batchId = String(batch.id);

  let imported = 0;
  let duplicates = 0;
  let failed = 0;
  const errors: InvoicePersistenceResult["errors"] = [];

  for (const row of rows) {
    try {
      const standort = resolveDbStandort(row, maps);
      if (!standort) throw new Error("Standort konnte nicht eindeutig zugeordnet werden.");
      if (!row.fileHash) throw new Error("Datei-Hash fehlt.");
      if (row.ocrStatus === "required") throw new Error("OCR fehlt noch; Praxissoftware-Bild-PDF kann noch nicht bestätigt werden.");
      if (invoicePersistenceKey(row) === "-") throw new Error("BFS-Nr. oder Praxissoftware-Rechnungsschlüssel fehlt.");

      const existingId = await findExistingInvoiceId(supabase, row);
      if (existingId) {
        duplicates += 1;
        continue;
      }

      const { data: invoice, error } = await supabase
        .from("bfs_patient_invoices")
        .insert(invoiceInsertPayload(batchId, standort.id, row))
        .select("id")
        .single();
      if (error || !invoice?.id) throw error ?? new Error("Rechnung konnte nicht gespeichert werden.");

      await insertInvoiceLines(supabase, String(invoice.id), row);
      imported += 1;
    } catch (error) {
      failed += 1;
      errors.push({
        file: row.file,
        message: error instanceof Error ? error.message : "Unbekannter Fehler beim Rechnungsimport."
      });
    }
  }

  await supabase
    .from("bfs_invoice_import_batches")
    .update({
      status: failed ? (imported || duplicates ? "partially_completed" : "failed") : "completed",
      successful_files: imported + duplicates,
      failed_files: failed,
      notes: [
        "Patientenrechnungen aus BFS-Rechnungsanalyse",
        `${imported} neu importiert`,
        `${duplicates} Dubletten übersprungen`,
        `${failed} fehlgeschlagen`
      ].join(" · ")
    })
    .eq("id", batchId);

  return { batchId, imported, duplicates, failed, errors };
}

function invoiceInsertPayload(batchId: string, standortId: string, row: ParsedInvoiceDocument) {
  return {
    batch_id: batchId,
    standort_id: standortId,
    original_filename: row.file,
    file_hash: row.fileHash,
    file_size_bytes: row.fileSizeBytes,
    storage_path: null,
    bfs_nr: invoicePersistenceKey(row),
    mandant_nr: row.mandantNo,
    praxisname: row.practiceName,
    rechnungsnummer: row.invoiceNo,
    rechnungsdatum: parseGermanDate(row.invoiceDate),
    patient_name: row.patientName,
    treated_person: row.treatedPerson,
    birth_date: row.birthDate,
    treatment_period: row.treatmentPeriod,
    integration_date: row.integrationDate,
    total_amount: row.totalAmount,
    open_amount: row.openAmount,
    subsidy_amount: row.subsidyAmount,
    honorar_bema: row.honorarBema,
    honorar_goz: row.honorarGoz,
    eigenlabor_total: row.eigenlaborTotal,
    fremdlabor_net: row.fremdlaborNet,
    fremdlabor_gross: row.fremdlaborGross,
    material_auslagen: row.materialAuslagen,
    has_eigenlabor: row.hasEigenlabor,
    has_fremdlabor: row.hasFremdlabor,
    lab_providers: row.labProviders,
    parse_status: row.status,
    parse_notes: row.parseNotes,
    extracted_json: row
  };
}

async function insertInvoiceLines(supabase: SupabaseDbClient, invoiceId: string, row: ParsedInvoiceDocument) {
  const lines = [
    ...row.serviceLines.map((line, index) => lineInsertPayload(invoiceId, "service", index, line)),
    ...row.labLines.map((line, index) => lineInsertPayload(invoiceId, "lab", row.serviceLines.length + index, line))
  ];
  if (!lines.length) return;
  const { error } = await supabase.from("bfs_patient_invoice_lines").insert(lines);
  if (error) throw error;
}

function lineInsertPayload(invoiceId: string, lineKind: "service" | "lab", sortOrder: number, line: ParsedInvoiceLine) {
  return {
    invoice_id: invoiceId,
    line_kind: lineKind,
    sort_order: sortOrder,
    line_date: line.date,
    region: line.region,
    code: line.code,
    description: line.description,
    factor: line.factor,
    quantity: line.quantity,
    amount: line.amount,
    category: line.category,
    source_section: line.sourceSection
  };
}

async function findExistingInvoiceId(supabase: SupabaseDbClient, row: ParsedInvoiceDocument) {
  if (row.fileHash && row.fileHash !== emptySha256Hash) {
    const { data: byHash } = await supabase
      .from("bfs_patient_invoices")
      .select("id")
      .eq("file_hash", row.fileHash)
      .maybeSingle();
    if (byHash?.id) return String(byHash.id);
  }

  const { data: byBfsNo } = await supabase
    .from("bfs_patient_invoices")
    .select("id")
    .eq("bfs_nr", invoicePersistenceKey(row))
    .maybeSingle();
  return byBfsNo?.id ? String(byBfsNo.id) : null;
}

function invoicePersistenceKey(row: ParsedInvoiceDocument) {
  if (row.bfsNo !== "-") return row.bfsNo;
  if (row.importSource === "practice_software_pdf" && row.standortId && row.invoiceNo !== "-") {
    return `PRACTICE-${row.standortId}-${row.invoiceNo}`;
  }
  return "-";
}

async function fetchPersistedInvoiceRows(supabase: SupabaseDbClient, allowedStandortIds?: Set<string>) {
  const maps = await fetchStandortMaps(supabase);
  const allInvoices: Array<Record<string, unknown>> = [];
  const standortChunks = allowedStandortIds ? chunkArray([...allowedStandortIds], 100) : [undefined];

  for (const standortChunk of standortChunks) {
    let offset = 0;
    while (true) {
      let query = supabase
        .from("bfs_patient_invoices")
        .select("*")
        .order("rechnungsdatum", { ascending: true })
        .order("created_at", { ascending: true })
        .range(offset, offset + 999);
      if (standortChunk) query = query.in("standort_id", standortChunk);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      allInvoices.push(...(data ?? []));
      if (!data || data.length < 1000) break;
      offset += 1000;
    }
  }

  if (!allInvoices.length) return [];
  const linesByInvoiceId = await fetchLinesByInvoiceId(supabase, allInvoices.map((invoice) => String(invoice.id)));
  return allInvoices.map((invoice) => invoiceRowFromDb(invoice, linesByInvoiceId.get(String(invoice.id)) ?? [], maps));
}

async function fetchLinesByInvoiceId(supabase: SupabaseDbClient, invoiceIds: string[]) {
  const linesByInvoiceId = new Map<string, Array<Record<string, unknown>>>();
  for (const chunk of chunkArray(invoiceIds, 200)) {
    const { data, error } = await supabase
      .from("bfs_patient_invoice_lines")
      .select("*")
      .in("invoice_id", chunk)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    (data ?? []).forEach((line: Record<string, unknown>) => {
      const invoiceId = String(line.invoice_id);
      linesByInvoiceId.set(invoiceId, [...(linesByInvoiceId.get(invoiceId) ?? []), line]);
    });
  }
  return linesByInvoiceId;
}

function invoiceRowFromDb(invoice: Record<string, unknown>, lines: Array<Record<string, unknown>>, maps: StandortMaps): ParsedInvoiceDocument {
  const extracted = isParsedInvoiceDocument(invoice.extracted_json) ? invoice.extracted_json : undefined;
  const dbStandortId = String(invoice.standort_id ?? "");
  const appStandort = maps.appByDbId.get(dbStandortId);
  const serviceLines = lines.filter((line) => line.line_kind === "service").map(lineFromDb);
  const labLines = lines.filter((line) => line.line_kind === "lab").map(lineFromDb);

  return {
    file: stringValue(invoice.original_filename) || extracted?.file || "-",
    fileSizeBytes: numberValue(invoice.file_size_bytes) || extracted?.fileSizeBytes || 0,
    fileHash: stringValue(invoice.file_hash) || extracted?.fileHash,
    importSource: extracted?.importSource,
    ocrStatus: extracted?.ocrStatus,
    sourcePageStart: extracted?.sourcePageStart,
    sourcePageEnd: extracted?.sourcePageEnd,
    bfsNo: extracted?.importSource === "practice_software_pdf" ? extracted?.bfsNo ?? "-" : stringValue(invoice.bfs_nr) || extracted?.bfsNo || "-",
    mandantNo: stringValue(invoice.mandant_nr) || extracted?.mandantNo || "-",
    standortId: appStandort?.id ?? extracted?.standortId,
    standortName: appStandort?.name ?? extracted?.standortName ?? "Unbekannt",
    practiceName: stringValue(invoice.praxisname) || appStandort?.praxisname || extracted?.practiceName,
    invoiceNo: stringValue(invoice.rechnungsnummer) || extracted?.invoiceNo || "-",
    invoiceDate: formatIsoDateGerman(stringValue(invoice.rechnungsdatum)) || extracted?.invoiceDate || "-",
    patientName: stringValue(invoice.patient_name) || extracted?.patientName || "-",
    treatedPerson: stringValue(invoice.treated_person) || extracted?.treatedPerson,
    birthDate: stringValue(invoice.birth_date) || extracted?.birthDate,
    treatmentPeriod: stringValue(invoice.treatment_period) || extracted?.treatmentPeriod,
    integrationDate: stringValue(invoice.integration_date) || extracted?.integrationDate,
    totalAmount: numberValue(invoice.total_amount),
    openAmount: numberValue(invoice.open_amount),
    subsidyAmount: numberValue(invoice.subsidy_amount),
    honorarBema: numberValue(invoice.honorar_bema),
    honorarGoz: numberValue(invoice.honorar_goz),
    eigenlaborTotal: numberValue(invoice.eigenlabor_total),
    fremdlaborNet: numberValue(invoice.fremdlabor_net),
    fremdlaborGross: numberValue(invoice.fremdlabor_gross),
    materialAuslagen: numberValue(invoice.material_auslagen),
    hasEigenlabor: booleanValue(invoice.has_eigenlabor),
    hasFremdlabor: booleanValue(invoice.has_fremdlabor),
    labProviders: stringArrayValue(invoice.lab_providers),
    serviceLines,
    labLines,
    pageCount: extracted?.pageCount ?? 0,
    status: invoice.parse_status === "OK" ? "OK" : "Zu prüfen",
    parseNotes: stringArrayValue(invoice.parse_notes)
  };
}

function lineFromDb(line: Record<string, unknown>): ParsedInvoiceLine {
  return {
    date: stringValue(line.line_date) || undefined,
    region: stringValue(line.region) || undefined,
    code: stringValue(line.code) || "-",
    description: stringValue(line.description) || "-",
    factor: line.factor === null ? undefined : numberValue(line.factor),
    quantity: line.quantity === null ? undefined : numberValue(line.quantity),
    amount: numberValue(line.amount),
    category: parsedLineCategory(line.category),
    sourceSection: stringValue(line.source_section) || "-"
  };
}

async function fetchStandortMaps(supabase: SupabaseDbClient): Promise<StandortMaps> {
  const { data: dbStandorte, error } = await supabase.from("standorte").select("id, name, praxisname, bfs_mandant_nr");
  if (error) throw new Error(error.message);
  const { data: mandanten, error: mandantenError } = await supabase.from("standort_mandanten").select("standort_id, mandant_nr");
  if (mandantenError) throw new Error(mandantenError.message);

  const dbByAppId = new Map<string, DbStandort>();
  const dbByName = new Map<string, DbStandort>();
  const dbByMandant = new Map<string, DbStandort>();
  const appByDbId = new Map<string, typeof appStandorte[number]>();

  (dbStandorte ?? []).forEach((dbStandort: DbStandort) => {
    dbByName.set(dbStandort.name, dbStandort);
    if (dbStandort.bfs_mandant_nr) dbByMandant.set(dbStandort.bfs_mandant_nr, dbStandort);
    const appStandort = appStandorte.find((standort) => standort.name === dbStandort.name);
    if (appStandort) {
      dbByAppId.set(appStandort.id, dbStandort);
      appByDbId.set(dbStandort.id, appStandort);
    }
  });

  (mandanten ?? []).forEach((entry: { standort_id: string; mandant_nr: string }) => {
    const dbStandort = (dbStandorte ?? []).find((standort: DbStandort) => standort.id === entry.standort_id);
    if (dbStandort) dbByMandant.set(entry.mandant_nr, dbStandort);
  });

  return { dbByAppId, dbByName, dbByMandant, appByDbId };
}

function resolveDbStandort(row: ParsedInvoiceDocument, maps: StandortMaps) {
  return (row.standortId ? maps.dbByAppId.get(row.standortId) : undefined)
    ?? maps.dbByName.get(row.standortName)
    ?? maps.dbByMandant.get(row.mandantNo);
}

async function readableStandortIds(supabase: SupabaseDbClient, userId: string, role: string): Promise<Set<string>> {
  if (role === "super_admin") return allStandortIds(supabase);
  return assignedStandortIds(supabase, userId);
}

async function allStandortIds(supabase: SupabaseDbClient): Promise<Set<string>> {
  const { data, error } = await supabase.from("standorte").select("id").eq("active", true);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((entry: { id: string }) => entry.id));
}

async function assignedStandortIds(supabase: SupabaseDbClient, userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("user_standorte").select("standort_id").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((entry: { standort_id: string }) => entry.standort_id));
}

async function throwIfSupabaseError(query: PromiseLike<{ error?: { message?: string } | null }>) {
  const { error } = await query;
  if (error) throw new Error(error.message ?? "Supabase-Operation fehlgeschlagen.");
}

function isParsedInvoiceDocument(value: unknown): value is ParsedInvoiceDocument {
  const row = value as Partial<ParsedInvoiceDocument> | null;
  return !!row
    && typeof row.file === "string"
    && typeof row.fileSizeBytes === "number"
    && typeof row.bfsNo === "string"
    && typeof row.mandantNo === "string"
    && typeof row.standortName === "string"
    && typeof row.invoiceNo === "string"
    && typeof row.invoiceDate === "string"
    && typeof row.patientName === "string"
    && typeof row.totalAmount === "number"
    && Array.isArray(row.serviceLines)
    && row.serviceLines.every(isParsedInvoiceLine)
    && Array.isArray(row.labLines)
    && row.labLines.every(isParsedInvoiceLine);
}

function isParsedInvoiceLine(value: unknown): value is ParsedInvoiceLine {
  const line = value as Partial<ParsedInvoiceLine> | null;
  return !!line
    && typeof line.code === "string"
    && typeof line.description === "string"
    && typeof line.amount === "number"
    && typeof line.category === "string"
    && typeof line.sourceSection === "string";
}

function parsedLineCategory(value: unknown): ParsedInvoiceLine["category"] {
  return value === "eigenlabor" || value === "fremdlabor" || value === "material" || value === "auslage"
    ? value
    : "leistung";
}

function parseGermanDate(value: string | undefined) {
  const match = value?.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function formatIsoDateGerman(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : "";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0) || 0;
}

function booleanValue(value: unknown) {
  return value === true;
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function noStoreHeaders() {
  return {
    "cache-control": "no-store, max-age=0"
  };
}

const emptySha256Hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

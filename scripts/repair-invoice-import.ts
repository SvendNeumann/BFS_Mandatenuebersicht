import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { standorte } from "../lib/demo-data.ts";
import { parseInvoicePdfBytes } from "../lib/invoice-parser.ts";
import type { ParsedInvoiceDocument, ParsedInvoiceLine } from "../lib/types.ts";

silenceKnownPdfWarnings();

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
};

const defaultFolders = [
  "/Users/svendneumann/Desktop/BFS Uploads/3. Einzel-Rechnungen_BFS/1. Kallweit",
  "/Users/svendneumann/Desktop/BFS Uploads/3. Einzel-Rechnungen_BFS/2. Krause",
  "/Users/svendneumann/Desktop/BFS Uploads/3. Einzel-Rechnungen_BFS/3. Zorn de Bulach",
  "/Users/svendneumann/Desktop/BFS Uploads/3. Einzel-Rechnungen_BFS/4. Hangx"
];

const emptySha256Hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase-Zugang fehlt in .env.local.");
}

const folders = process.argv.slice(2);
const sourceFolders = folders.length ? folders : defaultFolders;
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
type SupabaseClientLike = typeof supabase;

const pdfFiles = (await Promise.all(sourceFolders.map(listPdfFiles))).flat().sort((a, b) => a.localeCompare(b, "de"));
console.log(`PDFs gefunden: ${pdfFiles.length}`);

const parsedRows: ParsedInvoiceDocument[] = [];
const parseErrors: Array<{ file: string; message: string }> = [];

for (const [index, file] of pdfFiles.entries()) {
  try {
    const bytes = await readFile(file);
    parsedRows.push(await parseInvoicePdfBytes(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), {
      file,
      fileSizeBytes: bytes.byteLength
    }));
  } catch (error) {
    parseErrors.push({ file, message: error instanceof Error ? error.message : "PDF konnte nicht gelesen werden." });
  }
  if ((index + 1) % 250 === 0 || index + 1 === pdfFiles.length) {
    console.log(`PDFs gelesen: ${index + 1}/${pdfFiles.length}`);
  }
}

const skippedNonInformative = parsedRows.filter(isNonInformativeInvoice);
const rows = dedupeInvoices(parsedRows.filter((row) => !isNonInformativeInvoice(row)));
console.log(`Eindeutige Rechnungen: ${rows.length} (${parsedRows.length - rows.length} lokale Dubletten übersprungen)`);
if (skippedNonInformative.length) console.log(`Leere/nicht auswertbare PDFs übersprungen: ${skippedNonInformative.length}`);
if (parseErrors.length) console.log(`Lesefehler: ${parseErrors.length}`);

const maps = await fetchStandortMaps(supabase);
const batchId = await createBatch(supabase, rows.length);

let inserted = 0;
let updated = 0;
let failed = 0;
const importErrors: Array<{ file: string; message: string }> = [];

for (const [index, row] of rows.entries()) {
  try {
    const standort = resolveDbStandort(row, maps);
    if (!standort) throw new Error("Standort konnte nicht eindeutig zugeordnet werden.");
    if (!row.fileHash) throw new Error("Datei-Hash fehlt.");
    if (invoicePersistenceKey(row) === "-") throw new Error("BFS-Nr. fehlt.");

    const existingId = await findExistingInvoiceId(supabase, row);
    if (existingId) {
      await replaceExistingInvoice(supabase, existingId, batchId, standort.id, row);
      updated += 1;
    } else {
      const { data, error } = await supabase
        .from("bfs_patient_invoices")
        .insert(invoiceInsertPayload(batchId, standort.id, row))
        .select("id")
        .single();
      if (error || !data?.id) throw error ?? new Error("Rechnung konnte nicht gespeichert werden.");
      await insertInvoiceLines(supabase, String(data.id), row);
      inserted += 1;
    }
  } catch (error) {
    failed += 1;
    importErrors.push({ file: row.file, message: error instanceof Error ? error.message : "Unbekannter Importfehler." });
  }

  if ((index + 1) % 250 === 0 || index + 1 === rows.length) {
    console.log(`Supabase aktualisiert: ${index + 1}/${rows.length}`);
  }
}

await updateBatch(supabase, batchId, inserted, updated, failed);

const verification = await verifyInvoiceLines(supabase);
console.log(JSON.stringify({
  batchId,
  pdfFiles: pdfFiles.length,
  parsed: parsedRows.length,
  unique: rows.length,
  skippedNonInformative: skippedNonInformative.length,
  skippedNonInformativeFiles: skippedNonInformative.slice(0, 20).map((row) => row.file),
  localDuplicates: parsedRows.length - rows.length,
  inserted,
  updated,
  failed,
  parseErrors: parseErrors.slice(0, 10),
  importErrors: importErrors.slice(0, 10),
  verification
}, null, 2));

if (failed > 0 || verification.suspiciousPerformanceLines > 0) {
  process.exitCode = 1;
}

async function listPdfFiles(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(folder, entry.name);
    if (entry.isDirectory()) return listPdfFiles(absolute);
    if (entry.isFile() && /\.pdf$/i.test(entry.name)) return [absolute];
    return [];
  }));
  return files.flat();
}

function dedupeInvoices(rows: ParsedInvoiceDocument[]) {
  const byKey = new Map<string, ParsedInvoiceDocument>();
  for (const row of rows) {
    const key = row.fileHash && row.fileHash !== emptySha256Hash ? `hash:${row.fileHash}` : `bfs:${invoicePersistenceKey(row)}`;
    if (!byKey.has(key)) byKey.set(key, row);
  }
  return [...byKey.values()];
}

async function createBatch(client: SupabaseClientLike, totalFiles: number) {
  const { data, error } = await client
    .from("bfs_invoice_import_batches")
    .insert({
      uploaded_by: null,
      status: "processing",
      total_files: totalFiles,
      successful_files: 0,
      failed_files: 0,
      notes: "Korrekturimport Einzelrechnungen nach Parser-Bereinigung"
    })
    .select("id")
    .single();
  if (error || !data?.id) throw error ?? new Error("Import-Batch konnte nicht erstellt werden.");
  return String(data.id);
}

async function updateBatch(client: SupabaseClientLike, batchId: string, inserted: number, updated: number, failed: number) {
  await throwIfSupabaseError(client
    .from("bfs_invoice_import_batches")
    .update({
      status: failed ? (inserted || updated ? "partially_completed" : "failed") : "completed",
      successful_files: inserted + updated,
      failed_files: failed,
      notes: [
        "Korrekturimport Einzelrechnungen nach Parser-Bereinigung",
        `${inserted} neu importiert`,
        `${updated} bestehende aktualisiert`,
        `${failed} fehlgeschlagen`
      ].join(" · ")
    })
    .eq("id", batchId));
}

async function fetchStandortMaps(client: SupabaseClientLike): Promise<StandortMaps> {
  const { data: dbStandorte, error } = await client.from("standorte").select("id, name, praxisname, bfs_mandant_nr");
  if (error) throw new Error(error.message);
  const { data: mandanten, error: mandantenError } = await client.from("standort_mandanten").select("standort_id, mandant_nr");
  if (mandantenError) throw new Error(mandantenError.message);

  const dbByAppId = new Map<string, DbStandort>();
  const dbByName = new Map<string, DbStandort>();
  const dbByMandant = new Map<string, DbStandort>();

  (dbStandorte ?? []).forEach((dbStandort: DbStandort) => {
    dbByName.set(dbStandort.name, dbStandort);
    if (dbStandort.bfs_mandant_nr) dbByMandant.set(dbStandort.bfs_mandant_nr, dbStandort);
    const appStandort = standorte.find((standort) => standort.name === dbStandort.name);
    if (appStandort) dbByAppId.set(appStandort.id, dbStandort);
  });

  (mandanten ?? []).forEach((entry: { standort_id: string; mandant_nr: string }) => {
    const dbStandort = (dbStandorte ?? []).find((standort: DbStandort) => standort.id === entry.standort_id);
    if (dbStandort) dbByMandant.set(entry.mandant_nr, dbStandort);
  });

  return { dbByAppId, dbByName, dbByMandant };
}

function resolveDbStandort(row: ParsedInvoiceDocument, maps: StandortMaps) {
  return (row.standortId ? maps.dbByAppId.get(row.standortId) : undefined)
    ?? maps.dbByName.get(row.standortName)
    ?? maps.dbByMandant.get(row.mandantNo);
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

async function insertInvoiceLines(client: SupabaseClientLike, invoiceId: string, row: ParsedInvoiceDocument) {
  const lines = [
    ...row.serviceLines.map((line, index) => lineInsertPayload(invoiceId, "service", index, line)),
    ...row.labLines.map((line, index) => lineInsertPayload(invoiceId, "lab", row.serviceLines.length + index, line))
  ];
  for (const chunk of chunkArray(lines, 500)) {
    await throwIfSupabaseError(client.from("bfs_patient_invoice_lines").insert(chunk));
  }
}

async function replaceExistingInvoice(client: SupabaseClientLike, invoiceId: string, batchId: string, standortId: string, row: ParsedInvoiceDocument) {
  await throwIfSupabaseError(client.from("bfs_patient_invoice_lines").delete().eq("invoice_id", invoiceId));
  await throwIfSupabaseError(client
    .from("bfs_patient_invoices")
    .update(invoiceInsertPayload(batchId, standortId, row))
    .eq("id", invoiceId));
  await insertInvoiceLines(client, invoiceId, row);
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

async function findExistingInvoiceId(client: SupabaseClientLike, row: ParsedInvoiceDocument) {
  if (row.fileHash && row.fileHash !== emptySha256Hash) {
    const { data } = await client
      .from("bfs_patient_invoices")
      .select("id")
      .eq("file_hash", row.fileHash)
      .maybeSingle();
    if (data?.id) return String(data.id);
  }

  const { data } = await client
    .from("bfs_patient_invoices")
    .select("id")
    .eq("bfs_nr", invoicePersistenceKey(row))
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

function invoicePersistenceKey(row: ParsedInvoiceDocument) {
  return row.bfsNo !== "-" ? row.bfsNo : "-";
}

function isNonInformativeInvoice(row: ParsedInvoiceDocument) {
  return row.bfsNo !== "-"
    && row.invoiceDate === "-"
    && row.patientName === "-"
    && row.totalAmount === 0
    && row.serviceLines.length === 0
    && row.labLines.length === 0;
}

async function verifyInvoiceLines(client: SupabaseClientLike) {
  let offset = 0;
  let totalPerformanceLines = 0;
  let suspiciousPerformanceLines = 0;
  const examples: Array<{ code: string; description: string; factor: number | null }> = [];

  while (true) {
    const { data, error } = await client
      .from("bfs_patient_invoice_lines")
      .select("code, description, factor, category, line_kind")
      .eq("line_kind", "service")
      .eq("category", "leistung")
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    const lines = data ?? [];
    for (const line of lines) {
      totalPerformanceLines += 1;
      const code = String(line.code ?? "");
      const factor = line.factor === null || line.factor === undefined ? null : Number(line.factor);
      if (!isPlausiblePerformanceCode(code) || (factor !== null && factor > 15)) {
        suspiciousPerformanceLines += 1;
        if (examples.length < 20) examples.push({
          code,
          description: String(line.description ?? ""),
          factor
        });
      }
    }
    if (lines.length < 1000) break;
    offset += 1000;
  }

  return { totalPerformanceLines, suspiciousPerformanceLines, examples };
}

function isPlausiblePerformanceCode(code: string) {
  return /^(?:13[A-Z]0|\d{3,4}[a-z]?|Ä\d{1,4}[a-z]?)$/i.test(code.trim());
}

function parseGermanDate(value: string | undefined) {
  const match = value?.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

async function throwIfSupabaseError(query: PromiseLike<{ error?: { message?: string } | null }>) {
  const { error } = await query;
  if (error) throw new Error(error.message ?? "Supabase-Operation fehlgeschlagen.");
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function loadEnvFile(file: string) {
  try {
    const text = readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    return;
  }
}

function silenceKnownPdfWarnings() {
  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const message = args.map((arg) => String(arg)).join(" ");
    if (message.includes("TT: undefined function") || message.includes("standardFontDataUrl")) return;
    originalWarn(...args);
  };
}

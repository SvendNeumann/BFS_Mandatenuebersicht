import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { standorte } from "../lib/demo-data.ts";
import { parseInvoicePdfBytes } from "../lib/invoice-parser.ts";
import type { ParsedInvoiceDocument } from "../lib/types.ts";

silenceKnownPdfWarnings();

const emptySha256Hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const folders = process.argv.slice(2);

if (!folders.length) {
  throw new Error("Bitte mindestens einen Rechnungsordner übergeben.");
}

const pdfFiles = (await Promise.all(folders.map(listPdfFiles))).flat().sort((a, b) => a.localeCompare(b, "de"));
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
const hardIssues = rows.flatMap((row) => validateParsedInvoice(row));
const statusCounts = rows.reduce<Record<string, number>>((counts, row) => {
  counts[row.status] = (counts[row.status] ?? 0) + 1;
  return counts;
}, {});
const locationCounts = rows.reduce<Record<string, number>>((counts, row) => {
  counts[row.standortName] = (counts[row.standortName] ?? 0) + 1;
  return counts;
}, {});

console.log(JSON.stringify({
  pdfFiles: pdfFiles.length,
  parsed: parsedRows.length,
  unique: rows.length,
  skippedNonInformative: skippedNonInformative.length,
  skippedNonInformativeFiles: skippedNonInformative.slice(0, 20).map((row) => row.file),
  localDuplicates: parsedRows.length - rows.length,
  parseErrors: parseErrors.slice(0, 20),
  hardIssues: hardIssues.slice(0, 20),
  statusCounts,
  locationCounts
}, null, 2));

if (parseErrors.length || hardIssues.length) {
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

function validateParsedInvoice(row: ParsedInvoiceDocument) {
  const issues: Array<{ file: string; message: string }> = [];
  const standortKnown = standorte.some((standort) =>
    standort.id === row.standortId
    || standort.name === row.standortName
    || standort.mandantNo === row.mandantNo
    || standort.mandantNos?.includes(row.mandantNo)
  );
  if (!standortKnown) issues.push({ file: row.file, message: `Standort nicht eindeutig: ${row.standortName} / Mandant ${row.mandantNo}` });
  if (!row.fileHash || row.fileHash === emptySha256Hash) issues.push({ file: row.file, message: "Datei-Hash fehlt." });
  if (invoicePersistenceKey(row) === "-") issues.push({ file: row.file, message: "BFS-Nr. fehlt." });
  if (!row.invoiceNo || row.invoiceNo === "-") issues.push({ file: row.file, message: "Rechnungsnummer fehlt." });
  if (!row.patientName || row.patientName === "-") issues.push({ file: row.file, message: "Patient fehlt." });
  return issues;
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

function silenceKnownPdfWarnings() {
  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const message = args.map((arg) => String(arg)).join(" ");
    if (message.includes("TT: undefined function") || message.includes("standardFontDataUrl")) return;
    originalWarn(...args);
  };
}

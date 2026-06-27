import { isStandortLive, standorte } from "./demo-data";
import { parseBfsPdfBytes, parseBfsText } from "./bfs-parser";
import type { ImportPreviewRow } from "./types";

const amountPattern = /(\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:EUR|€)?/g;
const datePattern = /(\d{2}\.\d{2}\.\d{4})/;

export async function parseDemoImportFiles(files: File[]) {
  const rows = await Promise.all(files.map(parseDemoImportFile));
  return rows;
}

async function parseDemoImportFile(file: File): Promise<ImportPreviewRow> {
  const bytes = await file.arrayBuffer();
  const hash = await sha256(bytes);
  const notes: string[] = [];
  const parsed = file.type === "application/pdf" || /\.pdf$/i.test(file.name)
    ? await parsePdfSafely(bytes, notes)
    : parseBfsText(await readLikelyText(file, bytes));
  const text = parsed.rawText;
  const mandantNo = parsed.mandantNo || detectMandantNo(file.name, text);
  const standort = standorte.find((entry) => entry.mandantNo === mandantNo);
  const statementNo = parsed.statementNo || detectStatementNo(file.name, text);
  const date = parsed.statementDate || detectDate(text);
  const claimsHeader = parsed.claimsHeader || detectClaimCount(text);
  const amounts = detectAmounts(text);
  const sumHeader = parsed.claimsSum || amounts[0] || 0;
  const movements = parsed.movements.length || detectMovements(text);
  const sumExtracted = parsed.claims.length
    ? parsed.claims.reduce((sum, claim) => sum + claim.amount, 0)
    : sumHeader;

  if (!text.trim()) notes.push("Keine lesbaren Textdaten erkannt.");
  if (!mandantNo) notes.push("BFS-Mandant-Nr. nicht erkannt.");
  if (mandantNo && !standort) notes.push("Mandant-Nr. keinem Standort zugeordnet.");
  if (standort && !isStandortLive(standort)) notes.push(`${standort.name} ist erst ab ${standort.goLiveLabel} uploadpflichtig.`);
  if (!statementNo) notes.push("Abrechnungs-Nr. nicht erkannt.");
  if (!date) notes.push("Abrechnungsdatum nicht erkannt.");
  if (!claimsHeader) notes.push("Anzahl Forderungen nicht erkannt.");
  if (!sumHeader) notes.push("Forderungssumme nicht erkannt.");
  if (!movements) notes.push("Kontoauszug/Bewegungen nicht erkannt.");
  if (claimsHeader && parsed.claims.length && claimsHeader !== parsed.claims.length) notes.push(`Forderungsliste unvollständig: ${parsed.claims.length} von ${claimsHeader} Positionen erkannt.`);
  if (sumHeader && parsed.claims.length && Math.abs(sumHeader - sumExtracted) > 0.02) notes.push("Summenabweichung zwischen Kopf und Forderungsliste erkannt.");

  return {
    file: relativeFilePath(file),
    location: standort?.name ?? "Unbekannt",
    mandantNo: mandantNo || "-",
    practice: standort?.praxisname ?? "nicht zugeordnet",
    statementNo: statementNo || "-",
    date: date || "-",
    claimsHeader,
    claimsExtracted: parsed.claims.length || detectExtractedClaims(text, claimsHeader),
    sumHeader,
    sumExtracted,
    hasLedger: movements > 0,
    movements,
    noProtectionCount: parsed.noProtectionCount,
    noProtectionAmount: parsed.noProtectionAmount,
    feeTotal: parsed.feeTotal,
    netRevenue: parsed.netRevenue,
    payout: parsed.payout,
    parsedClaims: parsed.claims,
    parsedMovements: parsed.movements,
    status: statusFromNotes(notes),
    fileHash: hash,
    fileSizeBytes: file.size,
    parseNotes: notes.length ? notes : ["Testdatei wurde für die Import-Vorschau verarbeitet."]
  };
}

function relativeFilePath(file: File) {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

async function parsePdfSafely(bytes: ArrayBuffer, notes: string[]) {
  try {
    return await parseBfsPdfBytes(bytes);
  } catch (error) {
    notes.push(`PDF.js-Extraktion fehlgeschlagen: ${error instanceof Error ? error.message : "unbekannter Fehler"}.`);
    return parseBfsText(await readLikelyText(new File([bytes], "fallback.pdf", { type: "application/pdf" }), bytes));
  }
}

async function readLikelyText(file: File, bytes: ArrayBuffer) {
  if (file.type.startsWith("text/") || /\.(csv|txt|json)$/i.test(file.name)) {
    return new TextDecoder("utf-8").decode(bytes);
  }

  // Demo fallback: many BFS PDFs expose enough uncompressed text for early mapping checks.
  const raw = new TextDecoder("latin1").decode(bytes);
  return raw
    .replace(/[^\x20-\x7EÄÖÜäöüß€\n\r\t.,;:/()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectMandantNo(filename: string, text: string) {
  const known = standorte.find((standort) => filename.includes(standort.mandantNo) || text.includes(standort.mandantNo));
  if (known) return known.mandantNo;
  return text.match(/Mandant(?:en)?(?:-|\s)?(?:Nr\.?|nummer)?\D{0,24}(\d{4,6})/i)?.[1]
    ?? filename.match(/(?:^|[_\-\s])(\d{4,6})(?:[_\-\s.]|$)/)?.[1]
    ?? "";
}

function detectStatementNo(filename: string, text: string) {
  return text.match(/Abrechnung(?:s)?(?:-|\s)?(?:Nr\.?)?\D{0,18}(\d{1,6})/i)?.[1]
    ?? filename.match(/_(\d{2,6})(?:\D|$)/)?.[1]
    ?? "";
}

function detectDate(text: string) {
  return text.match(datePattern)?.[1] ?? "";
}

function detectClaimCount(text: string) {
  const match = text.match(/(?:Forderungen|Rechnungen|Anzahl)\D{0,24}(\d{1,4})/i);
  return match ? Number(match[1]) : 0;
}

function detectExtractedClaims(text: string, fallback: number) {
  const invoiceMatches = text.match(/\b\d{2,3}-\d{6}\b/g);
  return invoiceMatches?.length || fallback || 0;
}

function detectAmounts(text: string) {
  return [...text.matchAll(amountPattern)]
    .map((match) => Number(match[1].replaceAll(".", "").replace(",", ".")))
    .filter((value) => Number.isFinite(value));
}

function detectMovements(text: string) {
  const matches = text.match(/Rückgabe|Rückbelastung|Storno|Überweisung|Regulierung|Kontoauszug/gi);
  return matches?.length ?? 0;
}

function statusFromNotes(notes: string[]) {
  if (!notes.length) return "OK";
  if (notes.some((note) => note.includes("uploadpflichtig"))) return "Standort geplant";
  if (notes.some((note) => note.includes("keinem Standort") || note.includes("Mandant-Nr."))) return "Standort unbekannt";
  if (notes.some((note) => note.includes("PDF-Text"))) return "Parsing-Hinweis";
  return "Prüfen";
}

async function sha256(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

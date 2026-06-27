import { isStandortLive, standorte } from "./demo-data";
import { parseBfsPdfBytes, parseBfsText } from "./bfs-parser";
import type { ImportPreviewRow, ParsedImportClaim, ParsedImportMovement } from "./types";

const amountPattern = /(\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:EUR|€)?/g;
const datePattern = /(\d{2}\.\d{2}\.\d{4})/;

export async function parseDemoImportFiles(files: File[], onProgress?: (processed: number, total: number, fileName: string) => void) {
  const rows: ImportPreviewRow[] = [];
  for (const [index, file] of files.entries()) {
    rows.push(await parseDemoImportFile(file));
    onProgress?.(index + 1, files.length, file.name);
    if ((index + 1) % 8 === 0) await yieldToBrowser();
  }
  return reconcileImportRows(rows);
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

async function parseDemoImportFile(file: File): Promise<ImportPreviewRow> {
  const bytes = await file.arrayBuffer();
  const hash = await sha256(bytes);
  const notes: string[] = [];
  const parsed = file.type === "application/pdf" || /\.pdf$/i.test(file.name)
    ? await parsePdfSafely(bytes, notes)
    : parseBfsText(await readLikelyText(file, bytes));
  const text = parsed.rawText;
  const filePath = relativeFilePath(file);
  const mandantNo = parsed.mandantNo || detectMandantNo(file.name, text);
  const standort = detectStandortFromMandantNo(mandantNo) ?? detectStandortFromText(text) ?? detectStandortFromFilePath(filePath);
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
  if (mandantNo && standort && !standortMandantNos(standort).includes(mandantNo)) notes.push(`Standort über Anschrift/Ordnerpfad ${standort.name} zugeordnet; Mandant-Nr. ${mandantNo} bitte final hinterlegen.`);
  if (standort && !isStandortLive(standort)) notes.push(`${standort.name} ist erst ab ${standort.goLiveLabel} uploadpflichtig.`);
  if (!statementNo) notes.push("Abrechnungs-Nr. nicht erkannt.");
  if (!date) notes.push("Abrechnungsdatum nicht erkannt.");
  if (!claimsHeader) notes.push("Anzahl Forderungen nicht erkannt.");
  if (!sumHeader) notes.push("Forderungssumme nicht erkannt.");
  if (!movements) notes.push("Kontoauszug/Bewegungen nicht erkannt.");
  if (claimsHeader && parsed.claims.length && claimsHeader !== parsed.claims.length) notes.push(`Forderungsliste unvollständig: ${parsed.claims.length} von ${claimsHeader} Positionen erkannt.`);
  if (sumHeader && parsed.claims.length && Math.abs(sumHeader - sumExtracted) > 0.02) notes.push("Summenabweichung zwischen Kopf und Forderungsliste erkannt.");

  const parsedClaims = parsed.claims.map((claim) => ({
    ...claim,
    sourceFile: filePath,
    sourceLocation: standort?.name ?? "Unbekannt",
    sourceStatementNo: statementNo || undefined,
    sourceStatementDate: date || undefined
  }));

  return {
    file: filePath,
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
    feeNet: parsed.feeNet,
    feeVat: parsed.feeVat,
    ewmaNet: parsed.ewmaNet,
    ewmaVat: parsed.ewmaVat,
    ewmaTotal: parsed.ewmaTotal,
    netRevenue: parsed.netRevenue,
    payout: parsed.payout,
    parsedClaims,
    parsedMovements: parsed.movements,
    status: statusFromNotes(notes),
    fileHash: hash,
    fileSizeBytes: file.size,
    parseNotes: notes.length ? notes : ["Testdatei wurde für die Import-Vorschau verarbeitet."]
  };
}

export function reconcileImportRows(rows: ImportPreviewRow[]) {
  const byBfsNo = new Map<string, ParsedImportClaim>();
  const byInvoiceNo = new Map<string, ParsedImportClaim>();

  rows.forEach((row) => {
    row.parsedClaims?.forEach((claim) => {
      if (claim.bfsNo) byBfsNo.set(claim.bfsNo, claim);
      if (claim.invoiceNo) byInvoiceNo.set(claim.invoiceNo, claim);
    });
  });

  return rows.map((row) => {
    const parsedMovements: ParsedImportMovement[] | undefined = row.parsedMovements?.map((movement) => {
      const matchedClaim = findMovementClaim(movement, byBfsNo, byInvoiceNo);
      const patientName = matchedClaim?.patientName ?? movement.patientName;
      const matchStatus: ParsedImportMovement["matchStatus"] = matchedClaim
        ? "matched_claim"
        : patientName ? "patient_from_kontoauszug" : "unmatched";

      return {
        ...movement,
        patientName,
        matchedStatementNo: matchedClaim?.sourceStatementNo ?? movement.matchedStatementNo,
        matchedStatementDate: matchedClaim?.sourceStatementDate ?? movement.matchedStatementDate,
        matchedFile: matchedClaim?.sourceFile ?? movement.matchedFile,
        matchStatus
      };
    });
    const enrichedRow = { ...row, parsedMovements };
    return {
      ...enrichedRow,
      parseNotes: addMatchingNotes(enrichedRow)
    };
  });
}

function findMovementClaim(
  movement: ParsedImportMovement,
  byBfsNo: Map<string, ParsedImportClaim>,
  byInvoiceNo: Map<string, ParsedImportClaim>
) {
  if (movement.bfsNo) {
    const claim = byBfsNo.get(movement.bfsNo);
    if (claim) return claim;
  }
  if (movement.invoiceNo) {
    return byInvoiceNo.get(movement.invoiceNo);
  }
  return undefined;
}

function addMatchingNotes(row: ImportPreviewRow) {
  const notes = row.parseNotes ?? [];
  const relevantMovements = row.parsedMovements?.filter((movement) => movement.reasonCategory && !["regulierung", "abrechnungsumsatz"].includes(movement.reasonCategory)) ?? [];
  if (!relevantMovements.length) return notes;

  const unmatched = relevantMovements.filter((movement) => movement.matchStatus === "unmatched").length;
  const matched = relevantMovements.length - unmatched;
  const matchingNote = unmatched
    ? `${matched} Rückgaben/Stornos gematcht, ${unmatched} brauchen historische Abrechnung.`
    : `${matched} Rückgaben/Stornos mit Patient und Grund zugeordnet.`;

  return [...notes.filter((note) => !note.includes("Rückgaben/Stornos")), matchingNote];
}

function relativeFilePath(file: File) {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

function detectStandortFromMandantNo(mandantNo: string) {
  if (!mandantNo) return undefined;
  return standorte.find((standort) => standortMandantNos(standort).includes(mandantNo));
}

function detectStandortFromText(text: string) {
  const normalized = normalizeLookupText(text);
  return standorte.find((standort) => [
    standort.name,
    standort.praxisname,
    ...(standort.locationHints ?? [])
  ].some((hint) => normalized.includes(normalizeLookupText(hint))));
}

function detectStandortFromFilePath(filePath: string) {
  const normalized = normalizeLookupText(filePath);
  return standorte.find((standort) => [
    standort.name,
    standort.praxisname,
    ...(standort.locationHints ?? [])
  ].some((hint) => normalized.includes(normalizeLookupText(hint))));
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
  const knownMandantNo = standorte.flatMap(standortMandantNos).find((mandantNo) => filename.includes(mandantNo) || text.includes(mandantNo));
  if (knownMandantNo) return knownMandantNo;
  return text.match(/Mandant(?:en)?(?:-|\s)?(?:Nr\.?|nummer)?\D{0,24}(\d{4,6})/i)?.[1]
    ?? filename.match(/(?:^|[_\-\s])(\d{4,6})(?:[_\-\s.]|$)/)?.[1]
    ?? "";
}

function standortMandantNos(standort: { mandantNo: string; mandantNos?: string[] }) {
  return [...new Set([standort.mandantNo, ...(standort.mandantNos ?? [])])];
}

function normalizeLookupText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
  const invoiceMatches = text.match(/\b(?:\d{2,3}-\d{4,6}|\d{8})\b/g);
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
  if (notes.some((note) => note.includes("keinem Standort") || note.includes("BFS-Mandant-Nr. nicht erkannt"))) return "Standort unbekannt";
  if (notes.some((note) => note.includes("bitte final hinterlegen"))) return "Mapping prüfen";
  if (notes.some((note) => note.includes("PDF-Text"))) return "Parsing-Hinweis";
  return "Prüfen";
}

async function sha256(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

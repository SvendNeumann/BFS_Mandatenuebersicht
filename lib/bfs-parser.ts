import type { ParsedImportClaim, ParsedImportMovement } from "./types";

export type ParsedBfsDocument = {
  mandantNo?: string;
  mandantName?: string;
  statementNo?: string;
  statementDate?: string;
  claimsHeader: number;
  claimsSum: number;
  feeTotal: number;
  netRevenue: number;
  payout: number;
  noProtectionCount: number;
  noProtectionAmount: number;
  claims: ParsedImportClaim[];
  movements: ParsedImportMovement[];
  rawText: string;
};

const amountPattern = /-?\d{1,3}(?:\.\d{3})*,\d{2}/;
const claimLinePattern = /^(.+?)\s+(\d{2,3}-\d{4,6}|\d{8})\s+(5-\d{5}-\d+)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})(?:\s+(\*[A-ZÄÖÜ]{2}|RS\/A))?$/;
const dateLinePattern = /\b\d{2}\.\d{2}\.\d{4}\b/;
const shortDatePattern = /\b\d{2}\.\d{2}\.\d{2}\b/;

export async function parseBfsPdfBytes(bytes: ArrayBuffer): Promise<ParsedBfsDocument> {
  const text = await extractPdfText(bytes);
  return parseBfsText(text);
}

export function parseBfsText(rawText: string): ParsedBfsDocument {
  const text = normalizeText(rawText);
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const headerTriple = text.match(/\b(\d{5})\s*\/\s*(\d{1,5})\s*\/\s*(\d{1,5})\b/);
  const headerLine = findLine(lines, /Forderungen\s+\d+\s+\d{1,3}(?:\.\d{3})*,\d{2}/i);
  const headerLineMatch = headerLine?.match(/Forderungen\s+(\d+)\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i);
  const claims = parseClaims(lines);
  const movements = parseMovements(lines, claims);
  const noProtectionStats = parseNoProtectionStats(lines, claims);

  return {
    mandantNo: text.match(/Mandant-Nr:?\s*(\d{4,6})/i)?.[1] ?? headerTriple?.[1],
    mandantName: text.match(/Mandant:\s*(.+?)(?:\n|Mandant-Nr)/i)?.[1]?.trim(),
    statementNo: text.match(/Abrechnung-Nr\.?:\s*(\d{1,6})/i)?.[1] ?? headerTriple?.[2],
    statementDate: text.match(/Datum:\s*(\d{2}\.\d{2}\.\d{4})/i)?.[1] ?? text.match(/Abrechnung Nr\.?\s*\d+\s+vom\s+(\d{2}\.\d{2}\.\d{4})/i)?.[1],
    claimsHeader: Number(headerLineMatch?.[1] ?? headerTriple?.[3] ?? 0),
    claimsSum: parseAmount(headerLineMatch?.[2] ?? "0,00"),
    feeTotal: parseAmount(text.match(/Summe Gebühren\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/i)?.[1] ?? "0,00"),
    netRevenue: parseAmount(text.match(/Umsatz Netto\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/i)?.[1] ?? "0,00"),
    payout: parseAmount(text.match(/Auszahlung\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/i)?.[1] ?? text.match(/Regulierungsbetrag in Höhe von\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/i)?.[1] ?? "0,00"),
    noProtectionCount: noProtectionStats.count,
    noProtectionAmount: noProtectionStats.amount,
    claims,
    movements,
    rawText: text
  };
}

async function extractPdfText(bytes: ArrayBuffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  configurePdfWorker(pdfjs);
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    disableWorker: typeof window === "undefined"
  } as Record<string, unknown>).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = groupTextItemsIntoLines(content.items as Array<{ str?: string; transform?: number[] }>);
    pages.push(lines.join("\n"));
  }

  return pages.join("\n");
}

function configurePdfWorker(pdfjs: { GlobalWorkerOptions?: { workerSrc?: string } }) {
  if (typeof window === "undefined" || !pdfjs.GlobalWorkerOptions) return;
  pdfjs.GlobalWorkerOptions.workerSrc ||= new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();
}

function groupTextItemsIntoLines(items: Array<{ str?: string; transform?: number[] }>) {
  const positioned = items
    .filter((item) => item.str?.trim() && item.transform)
    .map((item) => ({ text: item.str?.trim() ?? "", x: item.transform?.[4] ?? 0, y: item.transform?.[5] ?? 0 }))
    .sort((a, b) => Math.abs(b.y - a.y) > 3 ? b.y - a.y : a.x - b.x);
  const lines: Array<{ y: number; items: typeof positioned }> = [];

  positioned.forEach((item) => {
    const line = lines.find((entry) => Math.abs(entry.y - item.y) < 3);
    if (line) {
      line.items.push(item);
    } else {
      lines.push({ y: item.y, items: [item] });
    }
  });

  return lines
    .map((line) => line.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(" "))
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function parseClaims(lines: string[]): ParsedImportClaim[] {
  return lines.flatMap((line) => {
    const match = line.match(claimLinePattern);
    if (!match) return [];
    const marker = match[5];
    return [{
      patientName: match[1].trim(),
      invoiceNo: match[2],
      bfsNo: match[3],
      amount: parseAmount(match[4]),
      marker,
      protectionStatus: marker === "*KA" ? "ohne_ausfallschutz" : "mit_ausfallschutz"
    }];
  });
}

function parseMovements(lines: string[], claims: ParsedImportClaim[]): ParsedImportMovement[] {
  const kontoStart = lines.findIndex((line) => line.includes("Kontoauszug Mandant"));
  if (kontoStart < 0) return [];
  const kontoLines = lines.slice(kontoStart + 1);
  const claimsByBfsNo = new Map(claims.map((claim) => [claim.bfsNo, claim]));
  const claimsByInvoiceNo = new Map(claims.map((claim) => [claim.invoiceNo, claim]));
  const movements: ParsedImportMovement[] = [];

  kontoLines.forEach((line, index) => {
    if (!shortDatePattern.test(line)) return [];
    const date = line.match(shortDatePattern)?.[0];
    const bfsMatch = line.match(/(5-\d{5}-\d+)\s*\/\s*(\d{2,3}-\d{4,6}|\d{8})/);
    const matchedClaim = bfsMatch ? claimsByBfsNo.get(bfsMatch[1]) ?? claimsByInvoiceNo.get(bfsMatch[2]) : undefined;
    const amount = [...line.matchAll(new RegExp(amountPattern, "g"))].map((match) => parseAmount(match[0])).at(-1);
    const reason = extractMovementReason(line, bfsMatch?.[0]);
    const continuation = movementContinuation(kontoLines[index + 1]);
    const finalReason = reason ?? continuation.reason;
    const patientName = matchedClaim?.patientName ?? continuation.patientName ?? extractMovementPatient(line);
    movements.push({
      date,
      type: movementType(line),
      reason: finalReason,
      reasonCategory: reasonCategory(finalReason, line),
      patientName,
      invoiceNo: bfsMatch?.[2],
      bfsNo: bfsMatch?.[1],
      amount,
      matchedStatementNo: matchedClaim?.sourceStatementNo,
      matchedStatementDate: matchedClaim?.sourceStatementDate,
      matchedFile: matchedClaim?.sourceFile,
      matchStatus: matchedClaim ? "matched_claim" : patientName ? "patient_from_kontoauszug" : "unmatched",
      rawText: line
    });
  });

  return movements;
}

function parseNoProtectionStats(lines: string[], claims: ParsedImportClaim[]) {
  const statisticLine = lines.find((line) => /^regulär\s+\d+/.test(line));
  const values = statisticLine?.match(/\d{1,3}(?:\.\d{3})*,\d{2}|\d+/g) ?? [];
  const countFromStats = values.length >= 6 ? Number(values[4]) : 0;
  const amountFromStats = values.length >= 6 ? parseAmount(values[5]) : 0;
  const markedClaims = claims.filter((claim) => claim.protectionStatus === "ohne_ausfallschutz");

  return {
    count: countFromStats || markedClaims.length,
    amount: amountFromStats || markedClaims.reduce((sum, claim) => sum + claim.amount, 0)
  };
}

function movementType(line: string) {
  const lower = line.toLowerCase();
  if (lower.includes("abr.-umsatz")) return "abr_umsatz";
  if (lower.includes("regulierung") || lower.includes("überweisung")) return "regulierung_ueberweisung";
  if (lower.includes("storno liquidation")) return "storno_liquidation_praxis";
  if (lower.includes("rückgabe") && (lower.includes("ausfallschutz") || lower.includes("rückgabe ohne"))) return "rueckgabe_ohne_ausfallschutz";
  if (lower.includes("rückbelastung")) return "sonstige_rueckbelastung";
  if (lower.includes("mwst")) return "mwst";
  if (lower.includes("ewma")) return "ewma_anfrage";
  return "unbekannt";
}

function extractMovementReason(line: string, bfsAndInvoice?: string) {
  if (!bfsAndInvoice) {
    if (line.toLowerCase().includes("regulierung")) return "Überweisung";
    if (line.toLowerCase().includes("abr.-umsatz")) return "Abrechnungsumsatz";
    return undefined;
  }

  const afterReference = line.slice(line.indexOf(bfsAndInvoice) + bfsAndInvoice.length);
  const withoutAmount = afterReference.replace(new RegExp(`${amountPattern.source}\\s*$`), "").trim();
  const reason = withoutAmount.replace(/^lt\.\s*/i, "lt. ").trim();
  return reason || undefined;
}

function reasonCategory(reason: string | undefined, line: string) {
  const value = `${reason ?? ""} ${line}`.toLowerCase();
  if (value.includes("unzustellbar")) return "unzustellbar";
  if (value.includes("factoringvereinbarung")) return "factoringvereinbarung";
  if (value.includes("nachricht")) return "nachricht_praxis";
  if (value.includes("neue rechnung")) return "neue_rechnung";
  if (value.includes("zahlung nach storno")) return "zahlung_nach_storno";
  if (value.includes("gem. vertrag") || value.includes("gemäß vertrag")) return "gemaess_vertrag";
  if (value.includes("rückgabe") && value.includes("ausfallschutz")) return "rueckgabe_ohne_ausfallschutz";
  if (value.includes("rückgabe ohne")) return "rueckgabe_ohne_ausfallschutz";
  if (value.includes("iportal-rechnungsliste")) return "iportal_rechnungsliste";
  if (value.includes("überweisung")) return "regulierung";
  if (value.includes("abrechnungsumsatz") || value.includes("abr.-umsatz")) return "abrechnungsumsatz";
  return reason ? "sonstiger_storno_grund" : undefined;
}

function extractMovementPatient(line: string) {
  const praxisMatch = line.match(/Praxis\s+(.+)$/);
  if (praxisMatch) return praxisMatch[1].trim();
  return line.match(/EWMA-Anfrage\s+(.+?)\s+\d{1,3}(?:\.\d{3})*,\d{2}/)?.[1]?.trim()
    ?? line.match(/MwSt\.\s+19\s+%\s+(.+?)\s+\d{1,3}(?:\.\d{3})*,\d{2}/)?.[1]?.trim();
}

function movementContinuation(nextLine: string | undefined) {
  if (!nextLine || shortDatePattern.test(nextLine)) return {};
  if (/^(Kontostand|Bitte prüfen|Sollzinsen|Hinweis|Abrechnung|Überweisung)/i.test(nextLine)) return {};

  const ausfallschutzMatch = nextLine.match(/^Ausfallschutz\s+(.+)$/i);
  if (ausfallschutzMatch) {
    return { patientName: cleanMovementPatientName(ausfallschutzMatch[1]), reason: "ohne Ausfallschutz" };
  }

  const praxisMatch = nextLine.match(/^Praxis\s+(.+)$/i);
  if (praxisMatch) {
    return { patientName: cleanMovementPatientName(praxisMatch[1]) };
  }

  return { patientName: cleanMovementPatientName(nextLine) };
}

function cleanMovementPatientName(value: string) {
  return value
    .replace(/^(Direktzahlung|Korrektur|Rechnung|ufkl\.|ung)\s+/i, "")
    .trim();
}

function findLine(lines: string[], pattern: RegExp) {
  return lines.find((line) => pattern.test(line));
}

function normalizeText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function parseAmount(value: string) {
  return Number(value.replaceAll(".", "").replace(",", "."));
}

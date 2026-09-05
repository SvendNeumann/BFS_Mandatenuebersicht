import { standorte } from "./demo-data.ts";
import { withoutObsoleteBfsTemplate } from "./bfs-template-text.ts";
import type { ParsedInvoiceDocument, ParsedInvoiceLine, Standort } from "./types.ts";

const amountPattern = /-?\d{1,3}(?:\.\d{3})*,\d{2}/;
const shortDatePattern = /^\d{2}\.\d{2}\.\d{2}$/;
const serviceCodePattern = /^(?:§?\d{1,4}(?:[a-z])?|\d{1,3}\.\d|[a-z]{1,4}\d{2,4}|[A-Z]{1,4}\d{2,4}|[A-Z]{1,4}\d{2,4}[a-z]?|AG|Vers_?|Glasur|Cerkat)$/;
const bemaFillingCodePattern = /^13[A-Z]0$/i;
const strongServiceCodePattern = /^(?:13[A-Z]0|Ä\d{1,3}[a-z]?|§?\d{3,4}[a-z]?|\d{1,3}\.\d|[a-zäöü]{1,4}\d{1,4}[a-z]?|Glasur|Cerkat)$/i;
const siteSpecificBillingCodePattern = /^(?:R|Air|[A-Za-z]{1,6}[_-]\d{1,4}[A-Za-z0-9]*|[A-Za-z]{1,4}\d{1,4}[A-Za-z0-9]*)$/i;

export async function parseInvoiceUploadFiles(files: File[], onProgress?: (processed: number, total: number, fileName: string) => void) {
  const pdfFiles = files.filter(isInvoicePdfUploadFile);
  const rows: ParsedInvoiceDocument[] = [];
  for (const [index, file] of pdfFiles.entries()) {
    rows.push(await parseInvoiceUploadFile(file));
    onProgress?.(index + 1, pdfFiles.length, uploadFilePath(file));
    if ((index + 1) % 8 === 0) await yieldToBrowser();
  }
  return dedupeInvoices(rows);
}

export function isInvoicePdfUploadFile(file: File) {
  return /\.pdf$/i.test(file.name) || file.type === "application/pdf";
}

export async function parseInvoicePdfBytes(bytes: ArrayBuffer, meta: { file?: string; fileSizeBytes?: number } = {}) {
  const fileSizeBytes = meta.fileSizeBytes ?? bytes.byteLength;
  const fileHash = await sha256(bytes);
  const extracted = await extractPdfText(bytes);
  return parseInvoiceText(extracted.text, {
    file: meta.file ?? "Rechnung.pdf",
    fileSizeBytes,
    pageCount: extracted.pageCount,
    fileHash
  });
}

export async function parsePracticeSoftwareInvoicePdfBytes(bytes: ArrayBuffer, meta: { file?: string; fileSizeBytes?: number; standortId?: string } = {}) {
  const fileSizeBytes = meta.fileSizeBytes ?? bytes.byteLength;
  const fileHash = await sha256(bytes);
  const extracted = await extractPdfText(bytes);
  const file = meta.file ?? "Praxissoftware-Rechnungsexport.pdf";
  const text = normalizeText(extracted.text);
  const selectedStandort = meta.standortId ? standorte.find((standort) => standort.id === meta.standortId) : undefined;

  if (!text.trim()) {
    return [practiceOcrRequiredDocument({
      file,
      fileSizeBytes,
      fileHash,
      pageCount: extracted.pageCount,
      standort: selectedStandort ?? detectStandort("-", "", file)
    })];
  }

  return parsePracticeSoftwareInvoiceText(text, {
    file,
    fileSizeBytes,
    fileHash,
    pageCount: extracted.pageCount,
    standort: selectedStandort
  });
}

export function parseInvoiceText(rawText: string, meta: { file: string; fileSizeBytes: number; pageCount: number; fileHash?: string }): ParsedInvoiceDocument {
  const text = normalizeText(rawText);
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const notes: string[] = [];
  const bfsNo = text.match(/\b5-(\d{5})-\d{6,10}\b/)?.[0] ?? "-";
  const mandantNo = bfsNo.match(/^5-(\d{5})-/)?.[1] ?? "-";
  const standort = detectStandort(mandantNo, text, meta.file);
  const invoiceHeader = extractInvoiceHeader(text, lines, meta.file);
  const patientName = findValueLine(lines, /^Behandelte Person:\s*(.+)$/i)
    ?? text.match(/Verwendungszweck:\s*BFS-Nr\.\s*5-\d{5}-\d+,\s*(.+)/i)?.[1]?.trim()
    ?? "-";
  const treatedPerson = findValueLine(lines, /^Behandelte Person:\s*(.+)$/i);
  const treatmentPeriod = text.match(/Behandlungszeitraum(?:\s+von|:)?\s*([^\n]+)/i)?.[1]?.trim();
  const integrationDate = findValueLine(lines, /^Eingliederungsdatum:\s*(.+)$/i);
  const eigenlaborTotals = [
    ...matchAmounts(text, /(?:^|\n)Eigenlabor:\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})/gi),
    ...matchAmounts(text, /Summe Laborkosten\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})/gi),
    ...matchAmounts(text, /Gesamtbetrag Anlage\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})/gi)
  ];
  const fremdlaborNet = sumUniqueAmounts(matchAmounts(text, /Gesamtsumme netto:\s*€?\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})/gi));
  const fremdlaborGross = sumUniqueAmounts([
    ...matchAmounts(text, /Endsumme\s*\n?(-?\d{1,3}(?:\.\d{3})*,\d{2})/gi),
    ...matchAmounts(text, /Endbetrag\s*€:\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})/gi)
  ]);
  const honorarBema = firstAmount(text, /(?:Honorar Bema|ZA-Honorar BEMA)[^:]*:\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})/i);
  const serviceLines = parseServiceLines(lines);
  const labLines = parseLabLines(lines);
  const labProviders = detectLabProviders(lines);
  const invoiceTotalAmount = firstAmount(text, /Rechnungsbetrag:\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})/i);
  const openAmount = firstAmount(text, /Offener Betrag:?\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})/i);
  const totalAmount = invoiceTotalAmount || openAmount;
  const honorarGoz = firstAmount(text, /(?:Honorar GOZ|ZA-Honorar GOZ):\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})/i) || (isUlmetInvoiceWithoutServiceLines(standort, serviceLines, totalAmount) ? totalAmount : 0);
  const recognizedNonFactorInvoice = isRecognizedNonFactorInvoice({
    honorarBema,
    eigenlaborTotal: eigenlaborTotals.length ? Math.max(...eigenlaborTotals) : 0,
    labLines
  });

  if (!text.trim()) notes.push("Keine lesbaren Textdaten erkannt.");
  if (bfsNo === "-") notes.push("BFS-Nr. nicht erkannt.");
  if (mandantNo === "-") notes.push("BFS-Mandantennummer nicht erkannt.");
  if (!standort) notes.push("Standort konnte nicht sicher zugeordnet werden.");
  if (invoiceHeader.invoiceNo === "-") notes.push("Rechnungsnummer nicht erkannt.");
  if (invoiceHeader.invoiceDate === "-" && !isUlmetInvoiceWithoutServiceLines(standort, serviceLines, totalAmount)) notes.push("Rechnungsdatum nicht erkannt.");
  if (patientName === "-" && !isUlmetInvoiceWithoutServiceLines(standort, serviceLines, totalAmount)) notes.push("Patient nicht erkannt.");
  if (/Behandelte Person:|Rechnungsnummer:|Rechnungsdatum:/i.test(patientName)) notes.push("Patientenfeld enthält vermischte Feldbeschriftungen; Original-PDF prüfen.");
  if (!serviceLines.length && !recognizedNonFactorInvoice && !isUlmetInvoiceWithoutServiceLines(standort, serviceLines, totalAmount)) {
    notes.push("Keine abrechenbaren Leistungspositionen mit Faktor erkannt.");
  }

  return {
    file: meta.file,
    fileSizeBytes: meta.fileSizeBytes,
    fileHash: meta.fileHash,
    importSource: "bfs_invoice_pdf",
    ocrStatus: "not_needed",
    bfsNo,
    mandantNo,
    standortId: standort?.id,
    standortName: standort?.name ?? "Unbekannt",
    practiceName: standort?.praxisname,
    invoiceNo: invoiceHeader.invoiceNo,
    invoiceDate: invoiceHeader.invoiceDate,
    patientName,
    treatedPerson,
    birthDate: findValueLine(lines, /^Geburtsdatum:\s*(.+)$/i),
    treatmentPeriod,
    integrationDate,
    totalAmount,
    openAmount,
    subsidyAmount: Math.abs(firstAmount(text, /(?:Zuschuss der Krankenkasse|Kassenanteil|abzgl\. Festzuschuss):\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})/i)),
    honorarBema,
    honorarGoz,
    eigenlaborTotal: eigenlaborTotals.length ? Math.max(...eigenlaborTotals) : 0,
    fremdlaborNet,
    fremdlaborGross,
    materialAuslagen: firstAmount(text, /(?:Mehrkosten Material, Auslagen|Praxismaterial \/ Auslagen)\s*:?\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})/i),
    hasEigenlabor: /Anlage Eigenlabor|Eigenlabor:|Summe Laborkosten/i.test(text),
    hasFremdlabor: /FREMDLABORBELEG|Zahntechnik|Dentalkonzept|Fremdlabor/i.test(text),
    labProviders,
    serviceLines,
    labLines,
    pageCount: meta.pageCount,
    status: notes.length ? "Zu prüfen" : "OK",
    parseNotes: notes.length ? notes : [isUlmetInvoiceWithoutServiceLines(standort, serviceLines, totalAmount)
      ? "Ulmet-Rechnung ohne Positionsauswertung; Endbetrag wurde fuer die Statistik übernommen."
      : "Rechnung wurde ausgelesen und einem Standort zugeordnet."]
  };
}

export function parsePracticeSoftwareInvoiceText(
  text: string,
  meta: { file: string; fileSizeBytes: number; pageCount: number; fileHash?: string; standort?: Standort }
) {
  const blocks = splitPracticeInvoiceBlocks(text);
  const standort = meta.standort ?? detectStandort("-", text, meta.file);
  const rows = blocks.map((block, index) => parsePracticeInvoiceBlock(block, {
    file: meta.file,
    fileSizeBytes: meta.fileSizeBytes,
    fileHash: `${meta.fileHash ?? meta.file}:${index + 1}`,
    pageCount: meta.pageCount,
    standort,
    sourcePageStart: undefined,
    sourcePageEnd: undefined
  }));
  return dedupeInvoices(rows);
}

function splitPracticeInvoiceBlocks(text: string) {
  const markers = [...text.matchAll(/(?=Rechnungsdaten:\s*[\s\S]*?Rechnungsnr\.:|(?=Rechnung\s*\n[\s\S]{0,260}?Rechnungsnummer:))/gi)]
    .map((match) => match.index ?? 0)
    .filter((index, position, all) => index === 0 || index !== all[position - 1]);
  if (markers.length <= 1) return [text];
  return markers.map((start, index) => text.slice(start, markers[index + 1] ?? text.length).trim()).filter(Boolean);
}

function parsePracticeInvoiceBlock(
  text: string,
  meta: { file: string; fileSizeBytes: number; fileHash?: string; pageCount: number; standort?: Standort; sourcePageStart?: number; sourcePageEnd?: number }
): ParsedInvoiceDocument {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const invoiceNo = text.match(/Rechnungsnr\.:\s*(\S+)/i)?.[1]
    ?? text.match(/Rechnungsnummer:\s*(\S+)/i)?.[1]
    ?? "-";
  const invoiceDate = text.match(/Rechnungsdatum:?\s*(\d{2}\.\d{2}\.\d{4})/i)?.[1]
    ?? "-";
  const patientName = text.match(/Patient:\s*(?:\(Patientennummer:\s*\d+\s*\)\s*)?([^,\n]+)/i)?.[1]?.trim()
    ?? findValueLine(lines, /^Behandelte Person:\s*(.+)$/i)
    ?? "-";
  const birthDate = text.match(/Geburtsdatum:?\s*(\d{2}\.\d{2}\.\d{4})/i)?.[1]
    ?? text.match(/Geburtsdatum:?\s*(\d{2}\.\d{2}\.\d{2})/i)?.[1];
  const totalAmount = firstAmount(text, /(?:Zahlbetrag|Rechnungsbetrag):?\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})/i)
    || firstAmount(text, /EUR\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})/i);
  const openAmount = firstAmount(text, /Offener Betrag:?\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})/i);
  const treatmentPeriod = text.match(/Behandlung vom\s*([^\n]+)/i)?.[1]?.trim();
  const serviceLines = parsePracticeServiceLines(lines);
  const notes: string[] = [];

  if (!meta.standort) notes.push("Praxis/Standort wurde nicht sicher erkannt.");
  if (invoiceNo === "-") notes.push("Rechnungsnummer nicht erkannt.");
  if (invoiceDate === "-") notes.push("Rechnungsdatum nicht erkannt.");
  if (patientName === "-") notes.push("Patient nicht erkannt.");
  if (!serviceLines.length) notes.push("Keine Leistungspositionen erkannt.");
  const suspiciousLineCount = serviceLines.filter(isSuspiciousPracticeServiceLine).length;
  if (suspiciousLineCount) {
    notes.push(`${suspiciousLineCount} Leistungspositionen wegen OCR-/Zuordnungsrisiko prüfen.`);
  }

  return {
    file: meta.file,
    fileSizeBytes: meta.fileSizeBytes,
    fileHash: meta.fileHash,
    importSource: "practice_software_pdf",
    ocrStatus: "not_needed",
    sourcePageStart: meta.sourcePageStart,
    sourcePageEnd: meta.sourcePageEnd,
    bfsNo: "-",
    mandantNo: meta.standort?.mandantNo ?? "-",
    standortId: meta.standort?.id,
    standortName: meta.standort?.name ?? "Unbekannt",
    practiceName: meta.standort?.praxisname,
    invoiceNo,
    invoiceDate,
    patientName,
    treatedPerson: findValueLine(lines, /^Behandelte Person:\s*(.+)$/i),
    birthDate,
    treatmentPeriod,
    totalAmount,
    openAmount,
    subsidyAmount: 0,
    honorarBema: 0,
    honorarGoz: totalAmount,
    eigenlaborTotal: 0,
    fremdlaborNet: 0,
    fremdlaborGross: 0,
    materialAuslagen: 0,
    hasEigenlabor: /Eigenlabor/i.test(text),
    hasFremdlabor: /Fremdlabor|Zahntechnik/i.test(text),
    labProviders: [],
    serviceLines,
    labLines: [],
    pageCount: meta.pageCount,
    status: notes.length ? "Zu prüfen" : "OK",
    parseNotes: notes.length ? notes : ["Praxissoftware-Rechnung wurde aus lesbarem PDF-Text ausgelesen."]
  };
}

function parsePracticeServiceLines(lines: string[]) {
  const tableStart = lines.findIndex((line) => /(?:Leistungsdaten:|Datum\s+Region\s+Nr\.|Datum\s+Zähne\s+Geb\.-Nr\.)/i.test(line));
  const sourceLines = tableStart >= 0 ? lines.slice(tableStart + 1) : lines;
  const mainLines = sourceLines.slice(0, firstIndex(sourceLines, /(?:Zwischensumme Honorar|Rechnungstexte:|Begründungen:|Bankverbindung:)/i));
  return mainLines.flatMap((line) => parseFactorLine(line, "leistung", "Praxissoftware-Rechnung"));
}

function isSuspiciousPracticeServiceLine(line: ParsedInvoiceLine) {
  return suspiciousPracticeServiceLineReason(line) !== null;
}

function suspiciousPracticeServiceLineReason(line: ParsedInvoiceLine) {
  const code = line.code.trim();
  const description = line.description.trim();
  if (/^(?:0+|1|5|88)$/.test(code)) return "Gebührennummer wirkt wie OCR-Rest.";
  if (/^[\d\s,.;:()/-]+$/.test(description)) return "Beschreibung besteht fast nur aus Zahlen/Satzzeichen.";
  if (/^\([a-z0-9]{1,3}\)\s/i.test(description)) return "Beschreibung beginnt mit OCR-/Zahnrest.";
  if (/\b(?:ode\d|nalch)\b/i.test(description)) return "Beschreibung enthält typischen OCR-Lesefehler.";
  if (/\b\d{3}\s+\d\b/.test(description)) return "Faktor/Begründung scheint in die Beschreibung gerutscht.";
  if (/\b(?:Präparieren|Kiefer|Implantat|Sinusbodenelevation|Krone|Teilkrone)\b.*\b\d\s+\d\b/i.test(description)) {
    return "Zahn-/Begründungsangaben scheinen an die Beschreibung angehängt.";
  }
  if (description.length < 3) return "Beschreibung ist zu kurz.";
  return null;
}

function practiceOcrRequiredDocument(meta: {
  file: string;
  fileSizeBytes: number;
  fileHash?: string;
  pageCount: number;
  standort?: Standort;
}): ParsedInvoiceDocument {
  return {
    file: meta.file,
    fileSizeBytes: meta.fileSizeBytes,
    fileHash: meta.fileHash,
    importSource: "practice_software_pdf",
    ocrStatus: "required",
    sourcePageStart: 1,
    sourcePageEnd: meta.pageCount,
    bfsNo: "-",
    mandantNo: meta.standort?.mandantNo ?? "-",
    standortId: meta.standort?.id,
    standortName: meta.standort?.name ?? "Unbekannt",
    practiceName: meta.standort?.praxisname,
    invoiceNo: "-",
    invoiceDate: "-",
    patientName: "-",
    totalAmount: 0,
    openAmount: 0,
    subsidyAmount: 0,
    honorarBema: 0,
    honorarGoz: 0,
    eigenlaborTotal: 0,
    fremdlaborNet: 0,
    fremdlaborGross: 0,
    materialAuslagen: 0,
    hasEigenlabor: false,
    hasFremdlabor: false,
    labProviders: [],
    serviceLines: [],
    labLines: [],
    pageCount: meta.pageCount,
    status: "Zu prüfen",
    parseNotes: [
      "Praxissoftware-Sammel-PDF erkannt.",
      "Das PDF enthält keinen eingebetteten Text; OCR ist für den Import erforderlich.",
      "Die Datei wurde noch nicht in Rechnungspositionen aufgeteilt."
    ]
  };
}

async function parseInvoiceUploadFile(file: File) {
  const bytes = await file.arrayBuffer();
  return parseInvoicePdfBytes(bytes, {
    file: uploadFilePath(file),
    fileSizeBytes: file.size
  });
}

function parseServiceLines(lines: string[]) {
  const tableStart = findServiceTableStart(lines);
  const sourceLines = tableStart >= 0 ? lines.slice(tableStart) : lines;
  const mainLines = sourceLines.slice(0, firstIndex(sourceLines, /(?:Zwischensumme Honorar|ZA-Honorar|Anlage Eigenlabor|FREMDLABORBELEG)/i));
  return dedupeInvoiceLines([
    ...mainLines.flatMap((line) => parseFactorLine(line, "leistung", "Patientenrechnung")),
    ...parseWrappedServiceLines(mainLines)
  ]);
}

function findServiceTableStart(lines: string[]) {
  const inlineStart = lines.findIndex((line) => /Datum\s+Region\s+Nr\.\s+Leistungsbeschreibung/i.test(line));
  if (inlineStart >= 0) return inlineStart + 1;
  const headerIndex = lines.findIndex((line, index) => {
    const header = lines.slice(index, index + 8).join(" ");
    return /Datum\s+Region\s+Nr\.\s+Leistungsbeschreibung\/Auslagen\s+Bgr\.\s+Faktor\s+Anz\.\s+EUR/i.test(header);
  });
  return headerIndex >= 0 ? headerIndex + 8 : -1;
}

function parseLabLines(lines: string[]) {
  const labStart = lines.findIndex((line) => /Anlage Eigenlabor|FREMDLABORBELEG|Eigenbeleg|Laborrechnung/i.test(line));
  if (labStart < 0) return [];
  return lines.slice(labStart).flatMap((line) => parseLabLine(line));
}

function extractInvoiceHeader(text: string, lines: string[], filePath: string) {
  const inlineHeader = text.match(/Rechnungsnummer:\s*(\S+)\s+Rechnungsdatum:\s*(\d{2}\.\d{2}\.\d{4})/i);
  const splitHeaderLine = lines.find((line) => /Rechnungsnummer:|Rechnungsdatum:/i.test(line));
  const splitInvoiceNo = splitHeaderLine?.match(/Rechnungsnummer:\s*(\S+)/i)?.[1]
    ?? text.match(/Rech\.-Nr\.:\s*(\S+)/i)?.[1]
    ?? filePath.match(/Rechnung_(5-\d{5}-\d+)\.pdf/i)?.[1];
  const splitInvoiceDate = splitHeaderLine?.match(/Rechnungsdatum:\s*(\d{2}\.\d{2}\.\d{4})/i)?.[1]
    ?? text.match(/Anlage zur Rechnung Nr\.\s+\S+\s+Datum\s+(\d{2}\.\d{2}\.\d{4})/i)?.[1]
    ?? text.match(/\bDatum:\s*(\d{2}\.\d{2}\.\d{4})/i)?.[1];

  return {
    invoiceNo: [inlineHeader?.[1], splitInvoiceNo].find((value) => value && /\d/.test(value) && !/:|^\d{2}\.\d{2}\.\d{4}$/.test(value))?.trim() ?? "-",
    invoiceDate: inlineHeader?.[2] ?? splitInvoiceDate ?? "-"
  };
}

function isRecognizedNonFactorInvoice(invoice: { honorarBema: number; eigenlaborTotal: number; labLines: ParsedInvoiceLine[] }) {
  return invoice.honorarBema > 0 || invoice.eigenlaborTotal > 0 || invoice.labLines.length > 0;
}

function isUlmetInvoiceWithoutServiceLines(standort: Standort | undefined, serviceLines: ParsedInvoiceLine[], totalAmount: number) {
  return standort?.id === "ulmet" && !serviceLines.length && totalAmount > 0;
}

function parseFactorLine(line: string, category: ParsedInvoiceLine["category"], sourceSection: string): ParsedInvoiceLine[] {
  const amounts = [...line.matchAll(new RegExp(amountPattern, "g"))];
  const amountMatch = amounts.at(-1);
  const factorMatch = [...line.matchAll(/\b\d{1,2},\d{2,4}\b/g)]
    .filter((match) => (match.index ?? 0) < (amountMatch?.index ?? 0))
    .at(-1);
  if (!amounts.length || !factorMatch) return [];
  const amount = parseAmount(amountMatch?.[0] ?? "0,00");
  const beforeFactor = line.slice(0, factorMatch.index).trim();
  const afterFactor = line.slice((factorMatch.index ?? 0) + factorMatch[0].length).trim();
  const quantity = Number(afterFactor.match(/^(\d+(?:,\d+)?)/)?.[1]?.replace(",", ".") ?? 1);
  const factor = parseAmount(factorMatch[0]);
  if (factor > 15) return [];
  const tokens = beforeFactor.split(/\s+/);
  const date = shortDatePattern.test(tokens[0] ?? "") ? tokens.shift() : undefined;
  const serviceCode = findServiceCode(tokens);
  if (!serviceCode) return [];
  const region = tokens.slice(0, serviceCode.index).join(" ") || undefined;
  const description = normalizeLineDescription(tokens.slice(serviceCode.descriptionStartIndex).join(" ").trim() || serviceCode.code);
  if (isExcludedServiceAdjustment(description)) return [];
  const normalizedCode = normalizeLineServiceCode(serviceCode.code, description);
  return [{
    date,
    region,
    code: normalizedCode,
    description,
    factor,
    quantity,
    amount,
    category: isBenchmarkFeeServiceLine(normalizedCode, description, region) ? category : "auslage",
    sourceSection
  }];
}

function parseWrappedServiceLines(lines: string[]) {
  const rows: ParsedInvoiceLine[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const parsed = parseWrappedServiceLineAt(lines, index);
    if (parsed) {
      rows.push(parsed.line);
      index = parsed.nextIndex - 1;
    }
  }
  return rows;
}

function parseWrappedServiceLineAt(lines: string[], startIndex: number): { line: ParsedInvoiceLine; nextIndex: number } | null {
  const startLine = lines[startIndex];
  const dateMatch = startLine.match(/^(\d{2}\.\d{2}\.\d{2})(?!\d)\s*(.*)$/);
  const date = dateMatch?.[1];
  let cursor = startIndex + 1;
  const regionParts: string[] = [];

  if (dateMatch) {
    if (dateMatch[2]?.trim()) regionParts.push(dateMatch[2].trim());
  } else if (looksLikeWrappedRegionStart(lines, startIndex)) {
    regionParts.push(startLine);
    cursor = startIndex + 1;
  } else {
    return null;
  }

  const codeMatch = findWrappedCode(lines, cursor);
  if (!codeMatch) return null;
  regionParts.push(...lines.slice(cursor, codeMatch.index).filter(isRegionContinuationLine));
  cursor = codeMatch.nextIndex;

  const descriptionParts: string[] = [];
  while (cursor < lines.length && !isStandaloneFactor(lines[cursor])) {
    if (!isBgrMarker(lines[cursor])) descriptionParts.push(lines[cursor]);
    cursor += 1;
  }
  if (cursor >= lines.length) return null;
  const factor = parseAmount(lines[cursor]);
  if (factor > 15) return null;
  cursor += 1;

  const quantityLine = lines[cursor];
  if (!/^\d+(?:,\d+)?$/.test(quantityLine ?? "")) return null;
  const quantity = Number(quantityLine.replace(",", "."));
  cursor += 1;

  const amountLine = lines[cursor];
  if (!amountLine || !new RegExp(`^${amountPattern.source}$`).test(amountLine)) return null;
  const amount = parseAmount(amountLine);
  cursor += 1;

  while (cursor < lines.length && !looksLikeWrappedRowStart(lines, cursor) && !isServiceTableStop(lines[cursor])) {
    if (!isBgrMarker(lines[cursor])) descriptionParts.push(lines[cursor]);
    cursor += 1;
  }

  const description = normalizeLineDescription(descriptionParts.join(" ").replace(/\s+/g, " ").trim() || codeMatch.code);
  if (isExcludedServiceAdjustment(description)) return null;

  return {
    line: {
      date,
      region: regionParts.join(" ").replace(/\s+/g, " ").trim() || undefined,
      code: normalizeLineServiceCode(codeMatch.code, description),
      description,
      factor,
      quantity,
      amount,
      category: isBenchmarkFeeServiceLine(normalizeLineServiceCode(codeMatch.code, description), description, regionParts.join(" ")) ? "leistung" : "auslage",
      sourceSection: "Patientenrechnung"
    },
    nextIndex: cursor
  };
}

function findWrappedCode(lines: string[], startIndex: number) {
  for (let index = startIndex; index < Math.min(lines.length, startIndex + 5); index += 1) {
    const line = lines[index];
    if (!line || isRegionContinuationLine(line)) continue;
    if (strongServiceCodePattern.test(line) && !isZeroOnlyServiceCode(line)) return { index, code: line, nextIndex: index + 1 };
    if (isSiteSpecificBillingCode(line)) return { index, code: line, nextIndex: index + 1 };
    if (isKnownExpenseCode(line)) {
      const suffix = lines[index + 1];
      if (/^[A-Za-zÄÖÜäöü]$/.test(suffix ?? "") && isKnownExpenseCode(`${line}${suffix}`)) {
        return { index, code: `${line}${suffix}`, nextIndex: index + 2 };
      }
      return { index, code: line, nextIndex: index + 1 };
    }
  }
  return null;
}

function looksLikeWrappedRowStart(lines: string[], index: number) {
  return /^\d{2}\.\d{2}\.\d{2}(?!\d)/.test(lines[index] ?? "") || looksLikeWrappedRegionStart(lines, index);
}

function looksLikeWrappedRegionStart(lines: string[], index: number) {
  const line = lines[index] ?? "";
  if (!isRegionContinuationLine(line)) return false;
  return !!findWrappedCode(lines, index + 1);
}

function isRegionContinuationLine(line: string) {
  return /^(?:\d{1,2}(?:[-,]\d{0,2})*(?:,\d{1,2}-?)?|OK|UK)$/i.test(line.trim());
}

function isStandaloneFactor(line: string) {
  return /^\d{1,2},\d{2,4}$/.test(line.trim());
}

function isBgrMarker(line: string) {
  return /^\d+\)$/.test(line.trim());
}

function isServiceTableStop(line: string) {
  return /^(?:Zwischensumme Honorar|Rechnungsbetrag|Offener Betrag|Kosten für Auslagen|ZA-Honorar|Anlage Eigenlabor|FREMDLABORBELEG)/i.test(line);
}

function dedupeInvoiceLines(lines: ParsedInvoiceLine[]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = [line.date, line.region, line.code, line.factor, line.quantity, line.amount, line.category].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findServiceCode(tokens: string[]) {
  const strongIndex = tokens.findIndex((token) => strongServiceCodePattern.test(token) && !isZeroOnlyServiceCode(token));
  const bemaIndex = tokens.findIndex((token) => bemaFillingCodePattern.test(token));
  const alphaIndex = tokens.findIndex((token) => isKnownExpenseCode(token));
  const siteSpecificIndex = tokens.findIndex((token) => isSiteSpecificBillingCode(token));
  const index = strongIndex >= 0
    ? strongIndex
    : bemaIndex >= 0
      ? bemaIndex
      : alphaIndex >= 0
        ? alphaIndex
        : siteSpecificIndex >= 0
          ? siteSpecificIndex
          : tokens.findIndex((token) => serviceCodePattern.test(token) && !isZeroOnlyServiceCode(token));
  if (index < 0) return null;
  const token = tokens[index];
  const suffix = tokens[index + 1];
  if (/^\d{3,4}$/i.test(token) && /^[a-zäöü]$/i.test(suffix ?? "")) {
    return { index, code: `${token}${suffix}`, descriptionStartIndex: index + 2 };
  }
  return { index, code: token, descriptionStartIndex: index + 1 };
}

function isFeeServiceCode(code: string) {
  const normalizedCode = normalizeServiceCode(code);
  if (isZeroOnlyServiceCode(normalizedCode)) return false;
  return /^(?:\d{3,4}[a-z]?|13[A-Z]0|Ä\d{1,4}[a-z]?)$/i.test(normalizedCode);
}

function isBenchmarkFeeServiceLine(code: string, description: string, region?: string) {
  const normalizedCode = normalizeServiceCode(code);
  const normalizedDescription = description.trim();
  const normalizedRegion = (region ?? "").trim();
  if (!isFeeServiceCode(normalizedCode)) return false;
  if (/^\d{1,3}$/.test(normalizedCode) && /^(?:mg|mm|g|ml|stk\.?)$/i.test(normalizedDescription)) return false;
  if (normalizedCode === "9092" && /^(?:9092|verklebte Titanbasis\b)/i.test(normalizedDescription)) return false;
  if (/^(?:biooss|bgide|naht|fal_|abdr_|impl_)/i.test(normalizedRegion)) return false;
  return true;
}

function isKnownExpenseCode(code: string) {
  return /^(?:gela|termosta|b_selbst)$/i.test(code.trim());
}

function isSiteSpecificBillingCode(code: string) {
  const normalizedCode = code.trim();
  if (!siteSpecificBillingCodePattern.test(normalizedCode)) return false;
  return !isKnownExpenseCode(normalizedCode);
}

function normalizeServiceCode(code: string) {
  return code.trim().replace(/^Ä0*(\d+[a-z]?)$/i, "Ä$1");
}

function isZeroOnlyServiceCode(code: string) {
  return /^0+$/.test(code.trim());
}

function normalizeLineServiceCode(code: string, description: string) {
  const bemaCode = description.match(/\b(13[A-Z]0)\b/i)?.[1];
  if (bemaCode) return bemaCode.toUpperCase();
  const leadingFeeCode = description.match(/^\s*(Ä?\d{3,4}[a-z]?)(?:-\d+)?\b/i)?.[1];
  if (!leadingFeeCode && isSiteSpecificBillingCode(code)) return code.trim().replace(/[_-]/g, "").toUpperCase();
  return leadingFeeCode ? normalizeServiceCode(leadingFeeCode) : normalizeServiceCode(code);
}

function normalizeLineDescription(description: string) {
  return description.replace(/^\s*(?:\d{1,2}(?:[-,]\d{1,2})?\s+)+(13[A-Z]0\b)/i, "$1").trim();
}

function isExcludedServiceAdjustment(description: string) {
  return /\babzgl\.\s*Bema-Sachleistung\b/i.test(description);
}

function parseLabLine(line: string): ParsedInvoiceLine[] {
  const amounts = [...line.matchAll(new RegExp(amountPattern, "g"))];
  if (!amounts.length) return [];
  const amount = parseAmount(amounts.at(-1)?.[0] ?? "0,00");
  const beforeAmount = line.slice(0, amounts.at(-1)?.index).trim();
  const tokens = beforeAmount.split(/\s+/);
  const date = shortDatePattern.test(tokens[0] ?? "") ? tokens.shift() : undefined;
  const codeIndex = tokens.findIndex((token) => serviceCodePattern.test(token));
  if (codeIndex < 0) return [];
  const code = tokens[codeIndex];
  const quantityToken = tokens[codeIndex + 1];
  const quantity = quantityToken && /^\d+(?:,\d+)?$/.test(quantityToken) ? Number(quantityToken.replace(",", ".")) : undefined;
  const descriptionStart = quantity ? codeIndex + 2 : codeIndex + 1;
  const description = tokens.slice(descriptionStart).join(" ").trim() || code;
  const sourceSection = /FREMDLABORBELEG|Zahntechnik|Dentalkonzept/i.test(line) ? "Fremdlabor" : "Laboranlage";
  return [{
    date,
    code,
    description,
    quantity,
    amount,
    category: sourceSection === "Fremdlabor" ? "fremdlabor" : description.toLowerCase().includes("material") ? "material" : "eigenlabor",
    sourceSection
  }];
}

function detectStandort(mandantNo: string, text: string, filePath: string) {
  return standorte.find((standort) => standortMandantNos(standort).includes(mandantNo))
    ?? standorte.find((standort) => [standort.name, standort.praxisname, ...(standort.locationHints ?? [])].some((hint) => hint && text.toLowerCase().includes(hint.toLowerCase())))
    ?? standorte.find((standort) => [standort.name, ...(standort.locationHints ?? [])].some((hint) => hint && filePath.toLowerCase().includes(hint.toLowerCase())));
}

function detectLabProviders(lines: string[]) {
  const providers = new Set<string>();
  lines.forEach((line, index) => {
    if (/Pilz Dentalkonzept/i.test(line)) providers.add("Pilz Dentalkonzept");
    if (/Zahntechnik Laube|Laube Zahntechnik|Kathrin Laube/i.test(line)) providers.add("Zahntechnik Laube");
    if (/FREMDLABORBELEG/i.test(line)) {
      const next = lines.slice(index + 1, index + 5).find((entry) => !/Orisus|MVZ|Tel\.|Fax|E-Mail/i.test(entry));
      if (next) providers.add(next.replace(/\s+/g, " ").trim());
    }
  });
  return [...providers];
}

function dedupeInvoices(rows: ParsedInvoiceDocument[]) {
  const byKey = new Map<string, ParsedInvoiceDocument>();
  rows.forEach((row) => {
    const key = row.bfsNo !== "-" ? row.bfsNo : row.fileHash ?? row.file;
    if (!byKey.has(key)) byKey.set(key, row);
  });
  return [...byKey.values()];
}

function firstIndex(lines: string[], pattern: RegExp) {
  const index = lines.findIndex((line) => pattern.test(line));
  return index < 0 ? lines.length : index;
}

function firstAmount(text: string, pattern: RegExp) {
  return parseAmount(text.match(pattern)?.[1] ?? "0,00");
}

function matchAmounts(text: string, pattern: RegExp) {
  return [...text.matchAll(pattern)].map((match) => parseAmount(match[1] ?? "0,00")).filter((value) => value > 0);
}

function sumUniqueAmounts(values: number[]) {
  return [...new Set(values.map((value) => value.toFixed(2)))].reduce((sum, value) => sum + Number(value), 0);
}

function findValueLine(lines: string[], pattern: RegExp) {
  return lines.map((line) => line.match(pattern)?.[1]?.trim()).find(Boolean);
}

function standortMandantNos(standort: Standort) {
  return [...new Set([standort.mandantNo, ...(standort.mandantNos ?? [])])];
}

function parseAmount(value: string) {
  if (!value) return 0;
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function normalizeText(text: string) {
  return text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
}

function uploadFilePath(file: File) {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

function yieldToBrowser() {
  if (typeof window === "undefined") return Promise.resolve();
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

async function sha256(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function extractPdfText(bytes: ArrayBuffer) {
  ensurePdfJsServerPolyfills();
  await ensurePdfJsServerWorker();
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
    const lines = groupTextItemsIntoLines(withoutObsoleteBfsTemplate(content.items as Array<{ str?: string; transform?: number[] }>));
    pages.push(lines.join("\n"));
  }

  return { text: pages.join("\n"), pageCount: pdf.numPages };
}

async function ensurePdfJsServerWorker() {
  if (typeof window !== "undefined") return;
  const globalScope = globalThis as Record<string, unknown>;
  if ((globalScope.pdfjsWorker as { WorkerMessageHandler?: unknown } | undefined)?.WorkerMessageHandler) return;
  await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
}

function ensurePdfJsServerPolyfills() {
  if (typeof window !== "undefined") return;
  const globalScope = globalThis as Record<string, unknown>;
  globalScope.DOMMatrix ??= SimpleDOMMatrix;
  globalScope.ImageData ??= SimpleImageData;
  globalScope.Path2D ??= SimplePath2D;
}

class SimpleDOMMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;
  is2D = true;
  isIdentity = true;

  constructor(init?: string | number[]) {
    if (Array.isArray(init)) {
      [this.a, this.b, this.c, this.d, this.e, this.f] = [init[0] ?? 1, init[1] ?? 0, init[2] ?? 0, init[3] ?? 1, init[4] ?? 0, init[5] ?? 0];
      this.isIdentity = this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0;
    }
  }

  multiplySelf() {
    return this;
  }

  preMultiplySelf() {
    return this;
  }

  translateSelf(x = 0, y = 0) {
    this.e += x;
    this.f += y;
    this.isIdentity = false;
    return this;
  }

  scaleSelf(scaleX = 1, scaleY = scaleX) {
    this.a *= scaleX;
    this.d *= scaleY;
    this.isIdentity = false;
    return this;
  }

  rotateSelf() {
    return this;
  }

  inverse() {
    return new SimpleDOMMatrix([this.a, this.b, this.c, this.d, this.e, this.f]);
  }
}

class SimpleImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
    if (typeof dataOrWidth === "number") {
      this.width = dataOrWidth;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = dataOrWidth;
      this.width = widthOrHeight;
      this.height = height ?? 0;
    }
  }
}

class SimplePath2D {
  addPath() {
    return undefined;
  }
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

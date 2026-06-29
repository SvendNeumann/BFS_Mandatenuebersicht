import type { ParsedInvoiceStatusDocument, ParsedInvoiceStatusRow } from "./types";

const amountPattern = String.raw`-?\d{1,3}(?:\.\d{3})*,\d{2}`;
const statusLinePattern = new RegExp(String.raw`^(?<mandantNo>\d{5})\s+(?<bfsNo>5-\d{5}-\d+)\s+(?<patient>.+?)\s+(?<externalPatientNo>\d+)\s+(?<invoiceNo>\S+)\s+(?<invoiceDate>\d{2}\.\d{2}\.\d{4})\s+(?<flags>.*?)\s+(?<amount>${amountPattern})\s€\s+(?<saldo>${amountPattern})\s€?$`);

export async function parseInvoiceStatusUploadFiles(files: File[], onProgress?: (processed: number, total: number, fileName: string) => void) {
  const pdfFiles = files.filter(isInvoiceStatusPdfUploadFile);
  const documents: ParsedInvoiceStatusDocument[] = [];
  for (const [index, file] of pdfFiles.entries()) {
    documents.push(await parseInvoiceStatusUploadFile(file));
    onProgress?.(index + 1, pdfFiles.length, uploadFilePath(file));
    if ((index + 1) % 4 === 0) await yieldToBrowser();
  }
  return documents;
}

export function isInvoiceStatusPdfUploadFile(file: File) {
  return /\.pdf$/i.test(file.name) || file.type === "application/pdf";
}

export async function parseInvoiceStatusPdfBytes(bytes: ArrayBuffer, meta: { file?: string; fileSizeBytes?: number } = {}) {
  const extracted = await extractPdfText(bytes);
  return parseInvoiceStatusText(extracted.text, {
    file: meta.file ?? "Rechnungsstatus.pdf",
    fileSizeBytes: meta.fileSizeBytes ?? bytes.byteLength,
    pageCount: extracted.pageCount,
    fileHash: await sha256(bytes)
  });
}

export function parseInvoiceStatusText(rawText: string, meta: { file: string; fileSizeBytes: number; pageCount: number; fileHash?: string }): ParsedInvoiceStatusDocument {
  const pages = rawText.split(/\f|\n(?=MDT\s+BFS-NR\.)/i);
  const rows: ParsedInvoiceStatusRow[] = [];
  const notes: string[] = [];

  pages.forEach((pageText, pageIndex) => {
    const lines = normalizeText(pageText).split("\n").map((line) => line.trim()).filter(Boolean);
    lines.forEach((line) => {
      const parsed = parseStatusLine(line, meta.file, pageIndex + 1);
      if (parsed) rows.push(parsed);
    });
  });

  if (!rawText.trim()) notes.push("Keine lesbaren Textdaten erkannt.");
  if (!rows.length) notes.push("Keine Rechnungsstatus-Zeilen erkannt.");

  return {
    file: meta.file,
    fileSizeBytes: meta.fileSizeBytes,
    fileHash: meta.fileHash,
    pageCount: meta.pageCount,
    rows,
    status: notes.length ? "Zu prüfen" : "OK",
    parseNotes: notes.length ? notes : ["Rechnungsstatus-Liste wurde ausgelesen."]
  };
}

function parseStatusLine(line: string, file: string, page: number): ParsedInvoiceStatusRow | null {
  const match = line.match(statusLinePattern);
  if (!match?.groups) return null;
  const amount = parseAmount(match.groups.amount);
  const saldo = parseAmount(match.groups.saldo);
  const flags = parseStatusFlags(match.groups.flags);
  return {
    file,
    page,
    mandantNo: match.groups.mandantNo,
    bfsNo: match.groups.bfsNo,
    patientName: match.groups.patient.trim(),
    externalPatientNo: match.groups.externalPatientNo,
    invoiceNo: match.groups.invoiceNo,
    invoiceDate: match.groups.invoiceDate,
    reminderLevel: flags.reminderLevel,
    installmentPlan: flags.installmentPlan,
    installmentMonths: flags.installmentMonths,
    prefinancing: flags.prefinancing,
    protection: flags.protection,
    amount,
    saldo,
    paymentStatus: paymentStatus(amount, saldo, flags.installmentPlan),
    riskFlags: []
  };
}

function parseStatusFlags(raw: string) {
  const tokens = raw.split(/\s+/).filter(Boolean);
  const protectionToken = tokens.pop();
  const prefinancingToken = tokens.pop();
  const rest = tokens.join(" ");
  const restWithoutInstallmentMonths = rest.replace(/\(\d+\)/g, " ");
  const reminderLevel = Number(restWithoutInstallmentMonths.match(/\b(\d+)\b/)?.[1] ?? 0);
  const installmentPlan = /\bja\b/i.test(rest);
  const installmentMonths = Number(rest.match(/\((\d+)\)/)?.[1] ?? 0) || undefined;

  return {
    reminderLevel,
    installmentPlan,
    installmentMonths,
    prefinancing: yesNoToBoolean(prefinancingToken),
    protection: yesNoToBoolean(protectionToken) ?? false
  };
}

function paymentStatus(amount: number, saldo: number, installmentPlan: boolean): ParsedInvoiceStatusRow["paymentStatus"] {
  if (Math.abs(saldo) < 0.005) return "bezahlt";
  if (installmentPlan) return "ratenzahlung";
  if (saldo < -0.005 && Math.abs(saldo) < amount - 0.005) return "teilbezahlt";
  return "offen";
}

function yesNoToBoolean(value: string | undefined) {
  if (!value) return undefined;
  if (/^ja$/i.test(value)) return true;
  if (/^nein$/i.test(value)) return false;
  return undefined;
}

function parseAmount(value: string) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function normalizeText(text: string) {
  return text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
}

async function parseInvoiceStatusUploadFile(file: File) {
  const bytes = await file.arrayBuffer();
  return parseInvoiceStatusPdfBytes(bytes, {
    file: uploadFilePath(file),
    fileSizeBytes: file.size
  });
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
    const lines = groupTextItemsIntoLines(content.items as Array<{ str?: string; transform?: number[] }>);
    pages.push(lines.join("\n"));
  }

  return { text: pages.join("\f"), pageCount: pdf.numPages };
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

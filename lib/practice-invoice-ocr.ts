import { parsePracticeSoftwareInvoiceText } from "./invoice-parser";
import type { ParsedInvoiceDocument, Standort } from "./types";

type OcrProgress = {
  processedPages: number;
  totalPages: number;
  fileName: string;
  status: string;
  progress?: number;
};

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
type TesseractModule = typeof import("tesseract.js");

export async function parsePracticeSoftwareOcrFiles(
  files: File[],
  standort: Standort,
  onProgress?: (progress: OcrProgress) => void
) {
  if (typeof window === "undefined") return [];
  const pdfFiles = files.filter((file) => /\.pdf$/i.test(file.name) || file.type === "application/pdf");
  const rows: ParsedInvoiceDocument[] = [];
  const pdfjs = await loadPdfJs();
  const tesseract = await import("tesseract.js");
  const worker = await createOcrWorker(tesseract, onProgress);

  try {
    for (const file of pdfFiles) {
      rows.push(...await parsePracticeSoftwareOcrFile(file, standort, pdfjs, worker, onProgress));
    }
  } finally {
    await worker.terminate();
  }

  return mergePracticeInvoiceRows(rows);
}

async function parsePracticeSoftwareOcrFile(
  file: File,
  standort: Standort,
  pdfjs: PdfJsModule,
  worker: Awaited<ReturnType<TesseractModule["createWorker"]>>,
  onProgress?: (progress: OcrProgress) => void
) {
  const bytes = await file.arrayBuffer();
  const fileHash = await sha256(bytes);
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    disableWorker: false
  } as Record<string, unknown>).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress?.({
      processedPages: pageNumber - 1,
      totalPages: pdf.numPages,
      fileName: file.name,
      status: `Seite ${pageNumber} wird vorbereitet`
    });
    const canvas = await renderPdfPageToCanvas(pdf, pageNumber);
    const { data } = await worker.recognize(canvas);
    pageTexts.push(cleanOcrText(data.text));
    onProgress?.({
      processedPages: pageNumber,
      totalPages: pdf.numPages,
      fileName: file.name,
      status: `Seite ${pageNumber} gelesen`,
      progress: pageNumber / pdf.numPages
    });
    await yieldToBrowser();
  }

  return parsePracticeSoftwareInvoiceText(pageTexts.join("\n\n"), {
    file: uploadFilePath(file),
    fileSizeBytes: file.size,
    fileHash,
    pageCount: pdf.numPages,
    standort
  }).map((row) => ({
    ...row,
    ocrStatus: "completed" as const,
    parseNotes: row.status === "OK"
      ? ["Praxissoftware-Rechnung per OCR ausgelesen."]
      : row.parseNotes
  }));
}

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc ||= new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();
  return pdfjs;
}

async function createOcrWorker(tesseract: TesseractModule, onProgress?: (progress: OcrProgress) => void) {
  const worker = await tesseract.createWorker("deu", tesseract.OEM.LSTM_ONLY, {
    workerPath: "/ocr/tesseract/worker.min.js",
    corePath: "/ocr/tesseract-core",
    langPath: "/ocr/lang",
    logger: (message) => {
      if (message.status) {
        onProgress?.({
          processedPages: 0,
          totalPages: 0,
          fileName: "OCR",
          status: ocrStatusLabel(message.status),
          progress: message.progress
        });
      }
    }
  });
  await worker.setParameters({
    tessedit_pageseg_mode: tesseract.PSM.AUTO,
    preserve_interword_spaces: "1",
    user_defined_dpi: "180"
  });
  return worker;
}

async function renderPdfPageToCanvas(pdf: Awaited<ReturnType<PdfJsModule["getDocument"]>["promise"]>, pageNumber: number) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 2.4 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("PDF-Seite konnte nicht gerendert werden.");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas;
}

function cleanOcrText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[|]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function ocrStatusLabel(status: string) {
  if (status === "recognizing text") return "OCR liest Text";
  if (status === "loading language traineddata") return "OCR lädt Sprachdaten";
  if (status === "initializing tesseract") return "OCR startet";
  return status;
}

function mergePracticeInvoiceRows(rows: ParsedInvoiceDocument[]) {
  const byKey = new Map<string, ParsedInvoiceDocument>();
  rows.forEach((row) => {
    const key = `${row.standortId ?? row.standortName}:${row.invoiceNo}:${row.patientName}:${row.invoiceDate}:${row.fileHash ?? row.file}`;
    byKey.set(key, row);
  });
  return [...byKey.values()];
}

function uploadFilePath(file: File) {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

async function sha256(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}

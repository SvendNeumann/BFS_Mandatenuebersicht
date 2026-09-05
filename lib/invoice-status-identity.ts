import type { ParsedInvoiceStatusDocument, ParsedInvoiceStatusRow } from "./types";

const emptyFileHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export function invoiceStatusDocumentKey(document: ParsedInvoiceStatusDocument) {
  if (document.fileHash && document.fileHash !== emptyFileHash) return document.fileHash;
  // Older imports could contain the empty-buffer hash. Do not merge unrelated lists.
  return JSON.stringify([document.file, document.fileSizeBytes, document.pageCount, document.rows]);
}

export function mergeInvoiceStatusDocuments(current: ParsedInvoiceStatusDocument[], incoming: ParsedInvoiceStatusDocument[]) {
  const byKey = new Map<string, ParsedInvoiceStatusDocument>();
  for (const document of [...current, ...incoming]) {
    const key = invoiceStatusDocumentKey(document);
    const previous = byKey.get(key);
    if (!previous || document.rows.length >= previous.rows.length) byKey.set(key, document);
  }
  return [...byKey.values()];
}

export function currentInvoiceStatusRows(documents: ParsedInvoiceStatusDocument[]): ParsedInvoiceStatusRow[] {
  const byInvoice = new Map<string, ParsedInvoiceStatusRow>();
  for (const document of mergeInvoiceStatusDocuments([], documents)) {
    for (const row of document.rows) {
      // Keep the originals for audit; the most recently imported status wins per invoice.
      byInvoice.set(`${row.mandantNo}|${row.bfsNo}`, row);
    }
  }
  return [...byInvoice.values()];
}

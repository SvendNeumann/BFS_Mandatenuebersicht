import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseInvoiceText, parseInvoicePdfBytes, parsePracticeSoftwareInvoicePdfBytes } from "../lib/invoice-parser.ts";

test("Feldbeschriftungen sind keine gueltigen Rechnungsnummern", () => {
  const parsed = parseInvoiceText("BFS-Nr: 5-18790-12345678\nRechnungsnummer: Rechnungsnummer:\nRechnungsdatum: 31.07.2026\nBehandelte Person: Behandelte Person: Beispiel\nRechnungsbetrag: 100,00", { file: "test.pdf", fileSizeBytes: 1, pageCount: 1 });
  assert.equal(parsed.invoiceNo, "-");
  assert.equal(parsed.status, "Zu prüfen");
  assert.ok(parsed.parseNotes.some((note) => note.includes("Feldbeschriftungen")));
});

test("Rechnungs-PDF-Parser bewahren die Bytegroesse vor dem PDF.js-Transfer", async () => {
  const bytes = await readFile(new URL("./fixtures/invoice-status-two-pages.pdf", import.meta.url));
  const invoice = await parseInvoicePdfBytes(Uint8Array.from(bytes).buffer);
  assert.equal(invoice.fileSizeBytes, bytes.length);
  const practice = await parsePracticeSoftwareInvoicePdfBytes(Uint8Array.from(bytes).buffer);
  assert.equal(practice[0].fileSizeBytes, bytes.length);
});

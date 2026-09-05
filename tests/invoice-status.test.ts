import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseInvoiceStatusPdfBytes, parseInvoiceStatusText } from "../lib/invoice-status-parser.ts";
import { currentInvoiceStatusRows, mergeInvoiceStatusDocuments } from "../lib/invoice-status-identity.ts";

function document(file = "saldo.pdf", saldo = "-100,00", hash?: string) {
  return parseInvoiceStatusText(`18504 5-18504-1000 Testperson, Beispiel 123 RE-1 31.07.2026 0 nein ja ja 1200,00 € ${saldo} €`, {
    file, fileSizeBytes: 100, pageCount: 1, fileHash: hash
  });
}

test("Echte PDF: Hash und Dateigroesse bleiben trotz PDF.js-Transfer korrekt", async () => {
  const fixture = await readFile(new URL("./fixtures/invoice-status-two-pages.pdf", import.meta.url));
  const expectedHash = createHash("sha256").update(fixture).digest("hex");
  const parsed = await parseInvoiceStatusPdfBytes(Uint8Array.from(fixture).buffer);
  assert.equal(parsed.fileHash, expectedHash);
  assert.equal(parsed.fileSizeBytes, fixture.length);
  assert.equal(parsed.pageCount, 2);
  assert.equal(parsed.status, "OK");
  assert.deepEqual(parsed.rows.map((row) => [row.mandantNo, row.page, row.amount, row.saldo]), [
    ["18504", 1, 1200, -100], ["20309", 2, 1200, -100]
  ]);
});

test("Text ohne Seitenumbrueche zaehlt Titel vor erstem Tabellenkopf nicht als Seite", () => {
  const row = "18504 5-18504-1000 Testperson 123 RE-1 31.07.2026 0 nein ja ja 100,00 € -100,00 €";
  const parsed = parseInvoiceStatusText(`Titel\nMDT BFS-NR.\n${row}\nMDT BFS-NR.\n${row}`, { file: "test", fileSizeBytes: 1, pageCount: 2 });
  assert.deepEqual(parsed.rows.map((entry) => entry.page), [1, 2]);
});

test("Unlesbare Statuszeilen werden nicht stillschweigend als OK freigegeben", () => {
  const parsed = parseInvoiceStatusText("18504 5-18504-1000 unvollstaendig", { file: "test", fileSizeBytes: 1, pageCount: 1 });
  assert.equal(parsed.status, "Zu prüfen");
  assert.match(parsed.parseNotes.join(" "), /Seite 1/);
});

test("Text der direkt mit Tabellenkopf beginnt behaelt beide Seiten", () => {
  const row = "18504 5-18504-1000 Testperson 123 RE-1 31.07.2026 ja ja 100,00 € -100,00 €";
  const parsed = parseInvoiceStatusText(`MDT BFS-NR.\n${row}\nMDT BFS-NR.\n${row}`, { file: "test", fileSizeBytes: 1, pageCount: 2 });
  assert.deepEqual(parsed.rows.map((entry) => entry.page), [1, 2]);
});

test("Aktueller Saldo ersetzt alten Saldo ohne doppelte Rechnungsbetraege", () => {
  const old = document("juni.pdf", "-100,00", "old");
  const next = document("juli.pdf", "0,00", "new");
  const originals = JSON.stringify([old, next]);
  const rows = currentInvoiceStatusRows(mergeInvoiceStatusDocuments([old], [next]));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].saldo, 0);
  assert.equal(rows[0].paymentStatus, "bezahlt");
  assert.equal(rows.reduce((sum, row) => sum + row.amount, 0), 1200);
  assert.equal(JSON.stringify([old, next]), originals);
});

test("Erneuter Upload einer alten identischen Datei setzt neueren Saldo nicht zurueck", () => {
  const old = document("juni.pdf", "-100,00", "old");
  const next = document("juli.pdf", "0,00", "new");
  const merged = mergeInvoiceStatusDocuments([old, next], [old]);
  assert.equal(merged.length, 2);
  assert.equal(currentInvoiceStatusRows(merged)[0].saldo, 0);
});

test("Legacy-Leerhash und gleicher Dateiname verschlucken keine neuen Statuslisten", () => {
  const hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const old = document("saldo.pdf", "-100,00", hash);
  const next = document("saldo.pdf", "0,00", hash);
  assert.equal(mergeInvoiceStatusDocuments([old], [next]).length, 2);
  assert.equal(currentInvoiceStatusRows([old, next])[0].saldo, 0);
});

test("Teilimport eines Standorts entfernt keine anderen Rechnungen", () => {
  const old = document();
  const next = document("kassel.pdf");
  next.rows[0] = { ...next.rows[0], mandantNo: "20309", bfsNo: "5-20309-1000" };
  assert.equal(currentInvoiceStatusRows([old, next]).length, 2);
});

test("Umgebrochenes Eurozeichen bei grossen Salden verliert keine Rechnungen", () => {
  const parsed = parseInvoiceStatusText("19260 5-19260-1000 Testperson 123 RE-1 31.07.2026 ja ja 21.757,36 € -21.757,36\n€", { file: "test", fileSizeBytes: 1, pageCount: 1 });
  assert.equal(parsed.status, "OK");
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].saldo, -21757.36);
});

test("Verbesserter Parser darf identische Quelldatei vervollstaendigen, nicht wieder kuerzen", () => {
  const incomplete = document("saldo.pdf", "0,00", "same");
  const complete = structuredClone(incomplete);
  complete.rows.push({ ...complete.rows[0], bfsNo: "5-18504-1001" });
  const repaired = mergeInvoiceStatusDocuments([incomplete], [complete]);
  assert.equal(repaired.length, 1);
  assert.equal(currentInvoiceStatusRows(repaired).length, 2);
  assert.equal(currentInvoiceStatusRows(mergeInvoiceStatusDocuments(repaired, [incomplete])).length, 2);
});

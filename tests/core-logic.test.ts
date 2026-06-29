import assert from "node:assert/strict";
import test from "node:test";
import { buildPaidResolutionKeySet, caseResolutionKeyFromParts, caseResolutionKeys } from "../lib/case-resolution.ts";
import { dedupeImportRows, importRowBusinessIdentity } from "../lib/import-identity.ts";
import { parseInvoiceStatusText } from "../lib/invoice-status-parser.ts";
import type { ImportPreviewRow } from "../lib/types.ts";

test("Import-Business-Identity nutzt Mandant und Abrechnungsnummer", () => {
  assert.equal(importRowBusinessIdentity({ mandantNo: "18504", statementNo: "7" }), "18504:7");
  assert.equal(importRowBusinessIdentity({ mandantNo: "-", statementNo: "7" }), null);
  assert.equal(importRowBusinessIdentity({ mandantNo: "18504", statementNo: "-" }), null);
});

test("Import-Dubletten werden anhand der fachlichen Abrechnungsidentität entfernt", () => {
  const first = importRow("a.pdf", "18504", "7", "hash-a");
  const duplicate = importRow("copy.pdf", "18504", "7", "hash-b");
  const other = importRow("b.pdf", "18504", "8", "hash-c");

  assert.deepEqual(dedupeImportRows([first, duplicate, other]).map((row) => row.file), ["a.pdf", "b.pdf"]);
});

test("Klärfall-Schlüssel bleibt stabil trotz Schreibweise, Umlaut und Cent-Rundung", () => {
  const first = caseResolutionKeyFromParts({
    standortId: "kehl",
    patientName: "Müller, Anna",
    invoiceNo: "RE-001",
    bfsNo: "5-18790-123",
    amount: 10.724,
    reason: "Storno lt. Stellungnahme"
  });
  const sameCase = caseResolutionKeyFromParts({
    standortId: "kehl",
    patientName: "Muller Anna",
    invoiceNo: "re 001",
    bfsNo: "5 18790 123",
    amount: 10.72,
    reason: "Storno lt Stellungnahme"
  });

  assert.equal(first, sameCase);
});

test("Bezahlte Klärfälle bleiben bei Re-Upload trotz Grundtext-Abweichung erledigt", () => {
  const paidResolution = {
    caseKey: caseResolutionKeyFromParts({
      standortId: "kirchberg",
      patientName: "Rühling, Jens",
      invoiceNo: "24-0210",
      bfsNo: "5-18504-59527147",
      amount: 22,
      reason: "neue Rechnung"
    }),
    standortId: "kirchberg",
    patientName: "Rühling, Jens",
    invoiceNo: "24 0210",
    bfsNo: "5 18504 59527147",
    amount: 22,
    reason: "lt. iPortal-Rechnungsliste",
    status: "paid_manual"
  };
  const stillOpenResolution = {
    ...paidResolution,
    caseKey: "other",
    status: "open_manual"
  };
  const paidKeys = buildPaidResolutionKeySet([paidResolution, stillOpenResolution]);
  const uploadedAgain = {
    standortId: "kirchberg",
    patientName: "Rühling, Jens",
    invoiceNo: "24-0210",
    bfsNo: "5-18504-59527147",
    amount: 22,
    reason: "Storno aus Abrechnung"
  };

  assert.equal(caseResolutionKeys(uploadedAgain).some((key) => paidKeys.has(key)), true);
});

test("Rechnungsstatus-Parser trennt Mahnstufe und Ratenplan-Monate", () => {
  const document = parseInvoiceStatusText(
    [
      "MDT BFS-NR. PATIENT PAT-NR RE-DATUM FLAGS BETRAG SALDO",
      "19260 5-19260-123456 Mustermann Max 4711 R12345 15.06.2026 2 nein nein 1.234,56 € -234,56 €",
      "18790 5-18790-999999 Beispiel Erika 42 R999 20.06.2026 ja (12) ja ja 900,00 € -900,00 €",
      "18504 5-18504-111111 Fertig Paula 7 R111 21.06.2026 0 nein ja 100,00 € 0,00 €",
      "19260 5-19260-67553333 Nies, Ella Gabriele 5223 223-022607 04.09.2025 ja ja 131,36 € 0,00 € 12,94 €"
    ].join("\n"),
    { file: "status.pdf", fileSizeBytes: 1, pageCount: 1 }
  );

  assert.equal(document.rows.length, 4);
  assert.equal(document.rows[0].reminderLevel, 2);
  assert.equal(document.rows[0].paymentStatus, "teilbezahlt");
  assert.equal(document.rows[1].reminderLevel, 0);
  assert.equal(document.rows[1].installmentPlan, true);
  assert.equal(document.rows[1].installmentMonths, 12);
  assert.equal(document.rows[1].paymentStatus, "ratenzahlung");
  assert.equal(document.rows[2].paymentStatus, "bezahlt");
  assert.equal(document.rows[3].cancelledAmount, 12.94);
  assert.equal(document.rows[3].paymentStatus, "storniert");
});

function importRow(file: string, mandantNo: string, statementNo: string, fileHash: string): ImportPreviewRow {
  return {
    file,
    location: "Kirchberg",
    mandantNo,
    practice: "Praxis",
    statementNo,
    date: "01.01.2026",
    claimsHeader: 1,
    claimsExtracted: 1,
    sumHeader: 10,
    sumExtracted: 10,
    hasLedger: true,
    movements: 0,
    noProtectionCount: 0,
    noProtectionAmount: 0,
    status: "ok",
    fileHash,
    fileSizeBytes: 100,
    parseNotes: []
  };
}

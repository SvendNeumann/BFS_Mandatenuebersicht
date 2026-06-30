import assert from "node:assert/strict";
import test from "node:test";
import { buildPaidResolutionKeySet, caseResolutionKeyFromParts, caseResolutionKeys } from "../lib/case-resolution.ts";
import { parseBfsText } from "../lib/bfs-parser.ts";
import { dedupeImportRows, importRowBusinessIdentity } from "../lib/import-identity.ts";
import { parsePracticeSoftwareInvoiceText } from "../lib/invoice-parser.ts";
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

test("BFS-Parser erkennt Rückgabe laut RA-Liste als relevante Rückgabe", () => {
  const document = parseBfsText([
    "Mandant-Nr: 19260",
    "Abrechnung-Nr.: 90",
    "Datum: 07.04.2026",
    "Forderungen 1 349,06",
    "Kuschel, Vanessa Laura 529-024110 5-19260-69972010 349,06",
    "Kontoauszug Mandant",
    "02.04.26 Rückgabe lt. RA-Liste 5-19260-69972010 / 529-024110 349,06"
  ].join("\n"));

  assert.equal(document.movements.length, 1);
  assert.equal(document.movements[0].type, "sonstige_rueckbelastung");
  assert.equal(document.movements[0].reasonCategory, "ra_liste");
});

test("Praxissoftware-OCR-Text liest Rechnungsbetrag und Leistungsposition", () => {
  const rows = parsePracticeSoftwareInvoiceText([
    "Paroimplantologie®",
    "Dres. Kallweit MVZ",
    "Rechnung",
    "Rechnungsnummer: 20260001 Rechnungsdatum: 07.04.2026",
    "Behandelte Person: Andreas Oschatz",
    "Geburtsdatum: 15.09.1970",
    "für zahnärztliche Leistungen erlaube ich mir zu berechnen: EUR 127,44",
    "Datum Region Nr. Leistungsbeschreibung/Auslagen Bgr. Faktor Anz. EUR",
    "07.04.26 11-17, 1040 Professionelle Zahnreinigung 1) 3,00 27 127,44",
    "Zwischensumme Honorar: 127,44",
    "Rechnungsbetrag: 127,44",
    "Seite 1 von 1"
  ].join("\n"), {
    file: "Rechnungsexport_04_2026.pdf",
    fileSizeBytes: 1000,
    fileHash: "hash",
    pageCount: 1,
    standort: {
      id: "kirchberg",
      name: "Kirchberg",
      praxisname: "Dres. Kallweit MVZ",
      mandantNo: "18504",
      goLiveDate: "2024-07-01",
      goLiveLabel: "01.07.2024",
      lastImport: "kein Import",
      submittedThisMonth: 0,
      feesThisMonth: 0,
      openCases: 0,
      openChargebacks: 0,
      withoutProtection: 0,
      olderThan30: 0
    }
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].invoiceNo, "20260001");
  assert.equal(rows[0].invoiceDate, "07.04.2026");
  assert.equal(rows[0].patientName, "Andreas Oschatz");
  assert.equal(rows[0].totalAmount, 127.44);
  assert.equal(rows[0].serviceLines.length, 1);
  assert.equal(rows[0].serviceLines[0].code, "1040");
  assert.equal(rows[0].serviceLines[0].description, "Professionelle Zahnreinigung 1)");
  assert.equal(rows[0].serviceLines[0].factor, 3);
  assert.equal(rows[0].serviceLines[0].quantity, 27);
  assert.equal(rows[0].serviceLines[0].amount, 127.44);
});

test("Praxissoftware-OCR-Text markiert verdächtige Leistungszeilen zur Prüfung", () => {
  const rows = parsePracticeSoftwareInvoiceText([
    "Dres. Kallweit MVZ",
    "Rechnung",
    "Rechnungsnummer: 20269999 Rechnungsdatum: 30.06.2026",
    "Behandelte Person: Test Patient",
    "für zahnärztliche Leistungen erlaube ich mir zu berechnen: EUR 129,00",
    "Datum Region Nr. Leistungsbeschreibung/Auslagen Bgr. Faktor Anz. EUR",
    "30.06.26 11 88 612, 1,00 1 56,00",
    "30.06.26 12 5 5 1,00 1 1,00",
    "30.06.26 13 2080 (dl) Präparieren einer Kavität und Restauration mit 1 2,30 1 72,00",
    "Rechnungsbetrag: 129,00"
  ].join("\n"), {
    file: "Rechnungsexport_06_2026.pdf",
    fileSizeBytes: 1000,
    fileHash: "hash-risk",
    pageCount: 1,
    standort: {
      id: "kirchberg",
      name: "Kirchberg",
      praxisname: "Dres. Kallweit MVZ",
      mandantNo: "18504",
      goLiveDate: "2024-07-01",
      goLiveLabel: "01.07.2024",
      lastImport: "kein Import",
      submittedThisMonth: 0,
      feesThisMonth: 0,
      openCases: 0,
      openChargebacks: 0,
      withoutProtection: 0,
      olderThan30: 0
    }
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "Zu prüfen");
  assert.equal(rows[0].parseNotes.some((note) => note.includes("Leistungspositionen wegen OCR-/Zuordnungsrisiko")), true);
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

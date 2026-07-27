import assert from "node:assert/strict";
import test from "node:test";
import { buildClosedResolutionKeySet, buildPaidResolutionKeySet, caseResolutionIdentityKeys, caseResolutionKeyFromParts, caseResolutionKeys, isAusfallhonorarDescription } from "../lib/case-resolution.ts";
import { parseBfsText } from "../lib/bfs-parser.ts";
import { dedupeImportRows, importRowBusinessIdentity } from "../lib/import-identity.ts";
import { parseInvoiceText, parsePracticeSoftwareInvoiceText } from "../lib/invoice-parser.ts";
import { parseInvoiceStatusText } from "../lib/invoice-status-parser.ts";
import { buildInvoiceQualityChainFindings, buildInvoiceQualityFactorDeviationFindingsFromProfiles, buildInvoiceQualityFindingsFromProfiles, createInvoiceQualityChainCsv, createInvoiceQualityCsv, filterInvoiceQualityFindings, invoiceQualityChainKpis, invoiceQualityKpis, type InvoiceQualityProfile } from "../lib/invoice-quality-analysis.ts";
import type { ImportPreviewRow, ParsedInvoiceLine } from "../lib/types.ts";

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

test("Ausfallhonorar wird als feste Storno-Regel erkannt", () => {
  assert.equal(isAusfallhonorarDescription("Ausfallhonorar gemäß § 615 BGB"), true);
  assert.equal(isAusfallhonorarDescription("Ausfall-Honorar"), true);
  assert.equal(isAusfallhonorarDescription("AG Ausfallgebühr"), true);
  assert.equal(isAusfallhonorarDescription("Vers_ Versäumnis Termin"), true);
  assert.equal(isAusfallhonorarDescription("Terminversäumnis"), true);
  assert.equal(isAusfallhonorarDescription("Versäumnisgebühr"), true);
  assert.equal(isAusfallhonorarDescription("Terminausfall"), true);
  assert.equal(isAusfallhonorarDescription("§615 Ausfallhonorar gemäß § 615 BGB"), true);
  assert.equal(isAusfallhonorarDescription("Ausfallschutz"), false);
  assert.equal(isAusfallhonorarDescription("Versiegelung von kariesfreien Zahnfissuren"), false);
  assert.equal(isAusfallhonorarDescription("Versorgung eines Zahnes durch eine Krone"), false);
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

test("Erledigte Prüflistenfälle schließen auch bei geändertem Betrag oder Grund", () => {
  const closedResolution = {
    caseKey: caseResolutionKeyFromParts({
      standortId: "ulmet",
      patientName: "Schäfer, Helene",
      invoiceNo: "673-022512",
      bfsNo: "5-19260-67367636",
      amount: 2043.64,
      reason: "lt. iPortal-Rechnungsliste"
    }),
    standortId: "ulmet",
    patientName: "Schäfer, Helene",
    invoiceNo: "673 022512",
    bfsNo: "5 19260 67367636",
    amount: 2043.64,
    reason: "lt. iPortal-Rechnungsliste",
    status: "paid_manual"
  };
  const rebuiltCase = {
    standortId: "ulmet",
    patientName: "Schäfer, Helene",
    invoiceNo: "673-022512",
    bfsNo: "5-19260-67367636",
    amount: 1900,
    reason: "BFS offen prüfen: anderer Saldo"
  };
  const closedKeys = buildClosedResolutionKeySet([closedResolution]);
  const rebuiltKeys = [...caseResolutionKeys(rebuiltCase), ...caseResolutionIdentityKeys(rebuiltCase)];

  assert.equal(rebuiltKeys.some((key) => closedKeys.has(key)), true);
});

test("Rechnungsstatus-Parser trennt Mahnstufe und Ratenplan-Monate", () => {
  const document = parseInvoiceStatusText(
    [
      "MDT BFS-NR. PATIENT PAT-NR RE-DATUM FLAGS BETRAG SALDO",
      "19260 5-19260-123456 Mustermann Max 4711 R12345 15.06.2026 2 nein nein 1.234,56 € -234,56 €",
      "18790 5-18790-999999 Beispiel Erika 42 R999 20.06.2026 ja (12) ja ja 900,00 € -900,00 €",
      "18504 5-18504-111111 Fertig Paula 7 R111 21.06.2026 0 nein ja 100,00 € 0,00 €",
      "19260 5-19260-67553333 Nies, Ella Gabriele 5223 223-022607 04.09.2025 ja ja 131,36 € 0,00 € 12,94 €",
      "19260 5-19260-66994516 Bösi, Alina 7489 489-022180 23.07.2025 RA ja ja 50,00 € 0,00 €"
    ].join("\n"),
    { file: "status.pdf", fileSizeBytes: 1, pageCount: 1 }
  );

  assert.equal(document.rows.length, 5);
  assert.equal(document.rows[0].reminderLevel, 2);
  assert.equal(document.rows[0].paymentStatus, "teilbezahlt");
  assert.equal(document.rows[1].reminderLevel, 0);
  assert.equal(document.rows[1].installmentPlan, true);
  assert.equal(document.rows[1].installmentMonths, 12);
  assert.equal(document.rows[1].paymentStatus, "ratenzahlung");
  assert.equal(document.rows[2].paymentStatus, "bezahlt");
  assert.equal(document.rows[3].cancelledAmount, 12.94);
  assert.equal(document.rows[3].paymentStatus, "storniert");
  assert.equal(document.rows[4].bfsNo, "5-19260-66994516");
  assert.equal(document.rows[4].invoiceNo, "489-022180");
  assert.equal(document.rows[4].paymentStatus, "bezahlt");
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

test("BFS-Rechnungsparser rekonstruiert mehrzeilige Faktorpositionen", () => {
  const row = parseInvoiceText([
    "Orisus Zahnmedizin MVZ GmbH",
    "Zahnmedizin Westpfalz MVZ",
    "Feldstraße 40",
    "66887 Ulmet",
    "BFS-Nr. 5-19260-66450000",
    "Behandelte Person: Edgar Krein",
    "Rechnung",
    "Rechnungsnummer: 131-021989 Rechnungsdatum: 08.07.2025",
    "Rechnungsbetrag:",
    "264,12",
    "Datum",
    "Region",
    "Nr.",
    "Leistungsbeschreibung/Auslagen",
    "Bgr.",
    "Faktor",
    "Anz.",
    "EUR",
    "01.07.25 26",
    "2400",
    "Elektrometrische Längenbestimmung eines",
    "1)",
    "11,180",
    "3",
    "132,06",
    "Wurzelkanals",
    "26",
    "2420",
    "Zusätzliche Anwendung elektrophysikalisch-chemischer",
    "2)",
    "11,180",
    "3",
    "132,06",
    "Methoden",
    "Zwischensumme Honorar:",
    "264,12"
  ].join("\n"), { file: "Rechnung_5-19260-66450000.pdf", fileSizeBytes: 1, pageCount: 1 });

  assert.equal(row.status, "OK");
  assert.equal(row.serviceLines.length, 2);
  assert.equal(row.serviceLines[0].code, "2400");
  assert.equal(row.serviceLines[0].description, "Elektrometrische Längenbestimmung eines Wurzelkanals");
  assert.equal(row.serviceLines[0].factor, 11.18);
  assert.equal(row.serviceLines[0].quantity, 3);
  assert.equal(row.serviceLines[0].amount, 132.06);
  assert.equal(row.serviceLines[1].code, "2420");
});

test("BFS-Rechnungsparser rekonstruiert mehrzeilige Auslagenpositionen", () => {
  const row = parseInvoiceText([
    "Orisus Zahnmedizin MVZ GmbH",
    "Zahnmedizin Westpfalz MVZ",
    "Feldstraße 40",
    "66887 Ulmet",
    "BFS-Nr. 5-19260-66994529",
    "Behandelte Person: Ramona Schäfer",
    "Rechnung",
    "Rechnungsnummer: 322-022160 Rechnungsdatum: 22.07.2025",
    "Rechnungsbetrag:",
    "10,00",
    "Datum",
    "Region",
    "Nr.",
    "Leistungsbeschreibung/Auslagen",
    "Bgr.",
    "Faktor",
    "Anz.",
    "EUR",
    "11.07.25 24-26",
    "gela",
    "Gelastypt",
    "1,000",
    "4",
    "10,00",
    "Kosten für Auslagen nach §3, §4 GOZ und §10 GOÄ:",
    "10,00"
  ].join("\n"), { file: "Rechnung_5-19260-66994529.pdf", fileSizeBytes: 1, pageCount: 1 });

  assert.equal(row.status, "OK");
  assert.equal(row.serviceLines.length, 1);
  assert.equal(row.serviceLines[0].code, "gela");
  assert.equal(row.serviceLines[0].description, "Gelastypt");
  assert.equal(row.serviceLines[0].category, "auslage");
  assert.equal(row.serviceLines[0].factor, 1);
  assert.equal(row.serviceLines[0].quantity, 4);
  assert.equal(row.serviceLines[0].amount, 10);
});

test("BFS-Rechnungsparser nimmt Beträge ohne Faktor nicht als Leistungsfaktor", () => {
  const row = parseInvoiceText([
    "Orisus Zahnmedizin MVZ GmbH",
    "Praxis Krause",
    "BFS-Nr. 5-18790-12345678",
    "Behandelte Person: Max Test",
    "Rechnung",
    "Rechnungsnummer: 100-200 Rechnungsdatum: 10.02.2026",
    "Datum Region Nr. Leistungsbeschreibung/Auslagen Bgr. Faktor Anz. EUR",
    "10.02.26 11 1040 Professionelle Zahnreinigung 1 56,01",
    "10.02.26 11 2080 Kompositfüllung in Adhäsivtechnik, zweiflächig 2,300 1 48,10",
    "Zwischensumme Honorar:",
    "104,11"
  ].join("\n"), { file: "Rechnung_5-18790-12345678.pdf", fileSizeBytes: 1, pageCount: 1 });

  assert.equal(row.serviceLines.length, 1);
  assert.equal(row.serviceLines[0].code, "2080");
  assert.equal(row.serviceLines[0].factor, 2.3);
  assert.equal(row.serviceLines[0].amount, 48.1);
});

test("BFS-Rechnungsparser erkennt Versaeumnis-Termin als Ausfallhonorar-Position", () => {
  const row = parseInvoiceText([
    "Praxis Dr. Krauhausen",
    "BFS-Nr. 5-19804-71218567",
    "Behandelte Person: Heino Engel",
    "Rechnung",
    "Rechnungsnummer: 978-091576 Rechnungsdatum: 27.02.2026",
    "Datum Region Nr. Leistungsbeschreibung/Auslagen Bgr. Faktor Anz. EUR",
    "27.02.26 Vers_ Versäumnis Termin 1,000 1 50,00",
    "Zwischensumme Honorar:",
    "50,00"
  ].join("\n"), { file: "Rechnung_5-19804-71218567.pdf", fileSizeBytes: 1, pageCount: 1 });

  assert.equal(row.serviceLines.length, 1);
  assert.equal(row.serviceLines[0].code, "Vers_");
  assert.equal(row.serviceLines[0].description, "Versäumnis Termin");
  assert.equal(row.serviceLines[0].amount, 50);
  assert.equal(isAusfallhonorarDescription(`${row.serviceLines[0].code} ${row.serviceLines[0].description}`), true);
});

test("BFS-Rechnungsparser erkennt Ulmet-615-Ausfallhonorar", () => {
  const row = parseInvoiceText([
    "Zahnmedizin Westpfalz MVZ",
    "BFS-Nr. 5-19260-67946990",
    "Behandelte Person: Bashar Dergham",
    "Rechnung",
    "Rechnungsnummer: 047-022885 Rechnungsdatum: 25.09.2025",
    "Datum Region Nr. Leistungsbeschreibung/Auslagen Bgr. Faktor Anz. EUR",
    "25.09.25 §615 Ausfallhonorar gemäß § 615 BGB 1,000 1 50,00",
    "Zwischensumme Honorar:",
    "50,00"
  ].join("\n"), { file: "Rechnung_5-19260-67946990.pdf", fileSizeBytes: 1, pageCount: 1 });

  assert.equal(row.serviceLines.length, 1);
  assert.equal(row.serviceLines[0].code, "§615");
  assert.equal(row.serviceLines[0].description, "Ausfallhonorar gemäß § 615 BGB");
  assert.equal(row.serviceLines[0].amount, 50);
  assert.equal(isAusfallhonorarDescription(`${row.serviceLines[0].code} ${row.serviceLines[0].description}`), true);
});

test("BFS-Rechnungsparser erkennt Kehl-Ausfallgebuehr mit AG-Code", () => {
  const row = parseInvoiceText([
    "Zahnarztpraxis Zorn de Bulach",
    "BFS-Nr. 5-19092-68627547",
    "Behandelte Person: Pedro Nicolas Spagnuolo",
    "Rechnung",
    "Rechnungsnummer: 2/14219/5 Rechnungsdatum: 30.10.2025",
    "Datum Region Nr. Leistungsbeschreibung/Auslagen Bgr. Faktor Anz. EUR",
    "29.10.25 AG Ausfallgebühr 1,000 1 60,00",
    "Zwischensumme Honorar:",
    "60,00"
  ].join("\n"), { file: "Rechnung_5-19092-68627547.pdf", fileSizeBytes: 1, pageCount: 1 });

  assert.equal(row.serviceLines.length, 1);
  assert.equal(row.serviceLines[0].code, "AG");
  assert.equal(row.serviceLines[0].description, "Ausfallgebühr");
  assert.equal(row.serviceLines[0].amount, 60);
  assert.equal(isAusfallhonorarDescription(`${row.serviceLines[0].code} ${row.serviceLines[0].description}`), true);
});

test("BFS-Rechnungsparser ignoriert Bema-Sachleistungsabzüge und normalisiert Kassenleistungsfüllungen", () => {
  const row = parseInvoiceText([
    "Zahnarztpraxis Zorn de Bulach",
    "BFS-Nr. 5-19092-66852712",
    "Behandelte Person: Test Patient",
    "Rechnung",
    "Rechnungsnummer: 2/13819/3 Rechnungsdatum: 31.07.2025",
    "Datum Region Nr. Leistungsbeschreibung/Auslagen Bgr. Faktor Anz. EUR",
    "31.07.25 15 15 abzgl. Bema-Sachleistung 1,000 1 -51,81",
    "31.07.25 17 17 13C0 Füllung, dreiflächig (Kassenleistung zur Mehrkostenfüllung) 1,245 1 -49,20",
    "31.07.25 24 24 13B0 Füllung, zweiflächig (Kassenleistung zur Mehrkostenfüllung) 1,245 1 -41,70",
    "31.07.25 25 25 13A0 Füllung, einflächig (Kassenleistung zur Mehrkostenfüllung) 1,245 1 -32,00",
    "31.07.25 27 27 13D0 Füllung, mehrflächig (Kassenleistung zur Mehrkostenfüllung) 1,245 1 -58,40",
    "31.07.25 37 37 13D0 Füllung, mehrflächig (Kassenleistung zur Mehrkostenfüllung) 1,245 1 -58,40",
    "31.07.25 15 1040 Professionelle Zahnreinigung 1 2,300 1 120,00",
    "Zwischensumme Honorar:",
    "68,19"
  ].join("\n"), { file: "Rechnung_5-19092-66852712.pdf", fileSizeBytes: 1, pageCount: 1 });

  assert.equal(row.serviceLines.length, 6);
  assert.deepEqual(row.serviceLines.map((line) => line.code), ["13C0", "13B0", "13A0", "13D0", "13D0", "1040"]);
  assert.deepEqual(row.serviceLines.slice(0, 5).map((line) => line.description), [
    "Füllung, dreiflächig (Kassenleistung zur Mehrkostenfüllung)",
    "Füllung, zweiflächig (Kassenleistung zur Mehrkostenfüllung)",
    "Füllung, einflächig (Kassenleistung zur Mehrkostenfüllung)",
    "Füllung, mehrflächig (Kassenleistung zur Mehrkostenfüllung)",
    "Füllung, mehrflächig (Kassenleistung zur Mehrkostenfüllung)"
  ]);
  assert.equal(row.serviceLines[5].description, "Professionelle Zahnreinigung 1");
});

test("BFS-Rechnungsparser normalisiert GOÄ-Codes mit führenden Nullen", () => {
  const row = parseInvoiceText([
    "Dres. Kallweit MVZ",
    "BFS-Nr. 5-18504-66850000",
    "Behandelte Person: Test Patient",
    "Rechnung",
    "Rechnungsnummer: 131-022000 Rechnungsdatum: 31.07.2025",
    "Datum Region Nr. Leistungsbeschreibung/Auslagen Bgr. Faktor Anz. EUR",
    "31.07.25 11 Ä0001 Beratung - auch mittels Fernsprecher - 2,300 1 10,72",
    "31.07.25 11 0010 Untersuchung zur Feststellung von Erkrankungen 2,300 1 14,75",
    "Zwischensumme Honorar:",
    "25,47"
  ].join("\n"), { file: "Rechnung_5-18504-66850000.pdf", fileSizeBytes: 1, pageCount: 1 });

  assert.equal(row.serviceLines.length, 2);
  assert.equal(row.serviceLines[0].code, "Ä1");
  assert.equal(row.serviceLines[1].code, "0010");
});

test("BFS-Rechnungsparser interpretiert Fließtext nicht als Gebührennummer", () => {
  const row = parseInvoiceText([
    "Orisus Zahnmedizin MVZ GmbH",
    "Zahnarztpraxis Zorn de Bulach",
    "BFS-Nr. 5-19092-12345678",
    "Behandelte Person: Erika Test",
    "Rechnung",
    "Rechnungsnummer: 300-400 Rechnungsdatum: 10.02.2026",
    "Datum",
    "Region",
    "Nr.",
    "Leistungsbeschreibung/Auslagen",
    "Bgr.",
    "Faktor",
    "Anz.",
    "EUR",
    "10.02.26 11",
    "Höhe",
    "von",
    "53,81",
    "1",
    "53,81",
    "10.02.26 11",
    "2080",
    "Kompositfüllung in Adhäsivtechnik, zweiflächig",
    "2,300",
    "1",
    "48,10",
    "Zwischensumme Honorar:",
    "101,91"
  ].join("\n"), { file: "Rechnung_5-19092-12345678.pdf", fileSizeBytes: 1, pageCount: 1 });

  assert.equal(row.serviceLines.length, 1);
  assert.equal(row.serviceLines[0].code, "2080");
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

test("Abrechnungsqualität erkennt kuratierte Leistungsketten aus Profilen", () => {
  const groupProfiles = [
    invoiceQualityProfile("gruppe-1", "gruppe-a", "Vergleich A", ["8000", "8010"]),
    invoiceQualityProfile("gruppe-2", "gruppe-a", "Vergleich A", ["8000", "8010"]),
    invoiceQualityProfile("gruppe-3", "gruppe-b", "Vergleich B", ["8000", "8010"]),
    invoiceQualityProfile("ziel-1", "ziel", "Zielpraxis", ["8000"]),
    invoiceQualityProfile("ziel-2", "ziel", "Zielpraxis", ["8000"]),
    invoiceQualityProfile("ziel-3", "ziel", "Zielpraxis", ["8000"])
  ];
  const findings = buildInvoiceQualityFindingsFromProfiles(groupProfiles, [{
    id: "ziel",
    name: "Zielpraxis",
    praxisname: "Zielpraxis",
    mandantNo: "1",
    goLiveDate: "2024-01-01",
    goLiveLabel: "01.01.2024",
    lastImport: "",
    submittedThisMonth: 0,
    feesThisMonth: 0,
    openCases: 0,
    openChargebacks: 0,
    withoutProtection: 0,
    olderThan30: 0
  }], { minGroupRate: 0.4, minCaseCount: 3, minPotential: 0 });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].anchorCode, "8000");
  assert.equal(findings[0].companionCode, "8010");
  assert.equal(findings[0].rule?.title, "FAL-Zentrallage einordnen");
  assert.equal(findings[0].affectedInvoices.length, 3);
});

test("Abrechnungsqualität filtert, aggregiert und exportiert Hinweise stabil", () => {
  const finding = buildInvoiceQualityFindingsFromProfiles([
    invoiceQualityProfile("gruppe-1", "gruppe-a", "Vergleich A", ["8000", "8010"]),
    invoiceQualityProfile("gruppe-2", "gruppe-a", "Vergleich A", ["8000", "8010"]),
    invoiceQualityProfile("gruppe-3", "gruppe-b", "Vergleich B", ["8000", "8010"]),
    invoiceQualityProfile("ziel-1", "ziel", "Zielpraxis", ["8000"]),
    invoiceQualityProfile("ziel-2", "ziel", "Zielpraxis", ["8000"]),
    invoiceQualityProfile("ziel-3", "ziel", "Zielpraxis", ["8000"])
  ], [{
    id: "ziel",
    name: "Zielpraxis",
    praxisname: "Zielpraxis",
    mandantNo: "1",
    goLiveDate: "2024-01-01",
    goLiveLabel: "01.01.2024",
    lastImport: "",
    submittedThisMonth: 0,
    feesThisMonth: 0,
    openCases: 0,
    openChargebacks: 0,
    withoutProtection: 0,
    olderThan30: 0
  }], { minGroupRate: 0.4, minCaseCount: 3, minPotential: 0 })[0];

  const filtered = filterInvoiceQualityFindings([finding], "Allgemein", "Zentrallage", "regeln");
  const kpis = invoiceQualityKpis(filtered);
  const csv = createInvoiceQualityCsv(filtered, { label: "2026 gesamt" }, new Map(), ["Einordnungstest"]);

  assert.equal(filtered.length, 1);
  assert.equal(kpis.count, 1);
  assert.equal(kpis.affectedInvoices, 3);
  assert.equal(filtered[0].hintType, "Kataloghinweis");
  assert.equal(filtered[0].precheckStatus, "Regel hinterlegt");
  assert.match(csv, /2026 gesamt/);
  assert.match(csv, /Regel hinterlegt/);
  assert.match(csv, /Einordnungstest/);
  assert.match(csv, /Fachliche Vorprüfung/);
  assert.doesNotMatch(csv, /Lücke/);
  assert.doesNotMatch(csv, /Nachberechnen/);
});

test("Abrechnungsqualität zeigt unbekannte Kombinationen als Datenmuster", () => {
  const findings = buildInvoiceQualityFindingsFromProfiles([
    invoiceQualityProfile("gruppe-1", "gruppe-a", "Vergleich A", ["7777", "8888"], "Neuer Leistungsbereich"),
    invoiceQualityProfile("gruppe-2", "gruppe-a", "Vergleich A", ["7777", "8888"], "Neuer Leistungsbereich"),
    invoiceQualityProfile("gruppe-3", "gruppe-b", "Vergleich B", ["7777", "8888"], "Neuer Leistungsbereich"),
    invoiceQualityProfile("ziel-1", "ziel", "Zielpraxis", ["7777"], "Neuer Leistungsbereich"),
    invoiceQualityProfile("ziel-2", "ziel", "Zielpraxis", ["7777"], "Neuer Leistungsbereich"),
    invoiceQualityProfile("ziel-3", "ziel", "Zielpraxis", ["7777"], "Neuer Leistungsbereich")
  ], [testStandort("ziel", "Zielpraxis")], { minGroupRate: 0.4, minCaseCount: 3, minPotential: 0 });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].caseType, "Neuer Leistungsbereich");
  assert.equal(findings[0].hintType, "Datenmuster");
  assert.equal(findings[0].precheckStatus, "Keine Regel vorhanden");
  assert.equal(findings[0].orientationLevel, "einzelfallabhängig");
  assert.equal(findings[0].status, "offen");
  assert.ok(findings[0].topicCluster.length > 0);
  assert.match(findings[0].explanation, /Standortvergleich/);
});

test("Qualitätscockpit bewertet Muster mit Score, Priorität und vorsichtiger Klassifikation", () => {
  const implantRows = [
    ...Array.from({ length: 18 }, (_, index) => invoiceQualityProfile(`gruppe-implant-${index}`, index % 2 ? "gruppe-a" : "gruppe-b", "Vergleich", ["9000", "9010"], "ZE/Implantat/Labor")),
    ...Array.from({ length: 12 }, (_, index) => invoiceQualityProfile(`ziel-implant-${index}`, "ziel", "Zielpraxis", ["9000"], "ZE/Implantat/Labor"))
  ];
  const implantFinding = buildInvoiceQualityFindingsFromProfiles(implantRows, [testStandort("ziel", "Zielpraxis")], { minGroupRate: 0.4, minCaseCount: 8, minPotential: 0 })
    .find((row) => row.anchorCode === "9000" && row.companionCode === "9010");

  assert.equal(implantFinding?.context, "implantology");
  assert.equal(implantFinding?.classification, "kontextabhaengig");
  assert.equal(implantFinding?.priority, "hoch");
  assert.match(implantFinding?.comparisonBasis ?? "", /ohne ausgewählten Standort/);
  assert.ok((implantFinding?.score ?? 0) >= 75);

  const weakRows = [
    ...Array.from({ length: 18 }, (_, index) => invoiceQualityProfile(`gruppe-weak-${index}`, index % 2 ? "gruppe-a" : "gruppe-b", "Vergleich", ["0070", "2420"], "Endodontie")),
    ...Array.from({ length: 12 }, (_, index) => invoiceQualityProfile(`ziel-weak-${index}`, "ziel", "Zielpraxis", ["0070"], "Endodontie"))
  ];
  const weakFinding = buildInvoiceQualityFindingsFromProfiles(weakRows, [testStandort("ziel", "Zielpraxis")], { minGroupRate: 0.4, minCaseCount: 8, minPotential: 0 })
    .find((row) => row.anchorCode === "0070" && row.companionCode === "2420");

  assert.equal(weakFinding?.classification, "schwach_statistisch");
  assert.notEqual(weakFinding?.priority, "hoch");

  const unknownRows = [
    ...Array.from({ length: 12 }, (_, index) => invoiceQualityProfile(`gruppe-unknown-${index}`, index % 2 ? "gruppe-a" : "gruppe-b", "Vergleich", ["7777", "8888"], "Neuer Falltyp")),
    ...Array.from({ length: 8 }, (_, index) => invoiceQualityProfile(`ziel-unknown-${index}`, "ziel", "Zielpraxis", ["7777"], "Neuer Falltyp"))
  ];
  const unknownFinding = buildInvoiceQualityFindingsFromProfiles(unknownRows, [testStandort("ziel", "Zielpraxis")], { minGroupRate: 0.4, minCaseCount: 8, minPotential: 0 })
    .find((row) => row.anchorCode === "7777" && row.companionCode === "8888");

  assert.equal(unknownFinding?.classification, "unklassifiziert");
  assert.equal(unknownFinding?.context, "unknown");
  assert.ok(unknownFinding);
});

test("Qualitätscockpit stuft OP-Zuschlag, Anästhesie und geringe Fallzahlen konservativ ein", () => {
  const surchargeRows = [
    ...Array.from({ length: 18 }, (_, index) => invoiceQualityProfile(`gruppe-surcharge-${index}`, index % 2 ? "gruppe-a" : "gruppe-b", "Vergleich", ["0530", "9100"], "ZE/Implantat/Labor")),
    ...Array.from({ length: 12 }, (_, index) => invoiceQualityProfile(`ziel-surcharge-${index}`, "ziel", "Zielpraxis", ["0530"], "ZE/Implantat/Labor"))
  ];
  const surchargeFinding = buildInvoiceQualityFindingsFromProfiles(surchargeRows, [testStandort("ziel", "Zielpraxis")], { minGroupRate: 0.4, minCaseCount: 8, minPotential: 0 })
    .find((row) => row.anchorCode === "0530" && row.companionCode === "9100");

  assert.equal(surchargeFinding?.context, "surgery");
  assert.equal(surchargeFinding?.classification, "schwach_statistisch");
  assert.notEqual(surchargeFinding?.priority, "hoch");

  const anesthesiaRows = [
    ...Array.from({ length: 18 }, (_, index) => invoiceQualityProfile(`gruppe-anesthesia-${index}`, index % 2 ? "gruppe-a" : "gruppe-b", "Vergleich", ["3010", "0090"], "Chirurgie")),
    ...Array.from({ length: 12 }, (_, index) => invoiceQualityProfile(`ziel-anesthesia-${index}`, "ziel", "Zielpraxis", ["3010"], "Chirurgie"))
  ];
  const anesthesiaFinding = buildInvoiceQualityFindingsFromProfiles(anesthesiaRows, [testStandort("ziel", "Zielpraxis")], { minGroupRate: 0.4, minCaseCount: 8, minPotential: 0 })
    .find((row) => row.anchorCode === "3010" && row.companionCode === "0090");

  assert.equal(anesthesiaFinding?.context, "anesthesia");
  assert.equal(anesthesiaFinding?.classification, "schwach_statistisch");
  assert.notEqual(anesthesiaFinding?.priority, "hoch");

  const lowCaseRows = [
    ...Array.from({ length: 9 }, (_, index) => invoiceQualityProfile(`gruppe-low-${index}`, index % 2 ? "gruppe-a" : "gruppe-b", "Vergleich", ["5040", "8020"], "ZE/FAL")),
    ...Array.from({ length: 4 }, (_, index) => invoiceQualityProfile(`ziel-low-${index}`, "ziel", "Zielpraxis", ["5040"], "ZE/FAL"))
  ];
  const lowCaseFinding = buildInvoiceQualityFindingsFromProfiles(lowCaseRows, [testStandort("ziel", "Zielpraxis")], { minGroupRate: 0.4, minCaseCount: 3, minPotential: 0 })
    .find((row) => row.anchorCode === "5040" && row.companionCode === "8020");

  assert.equal(lowCaseFinding?.context, "prosthetics");
  assert.equal(lowCaseFinding?.lowCaseCount, true);
  assert.notEqual(lowCaseFinding?.priority, "hoch");
});

test("Abrechnungsqualität zeigt Faktorabweichungen als Faktorhinweis", () => {
  const profiles = [
    invoiceQualityProfile("gruppe-1", "gruppe-a", "Vergleich A", ["1040"], "Prophylaxe/PZR", { "1040": 3.5 }),
    invoiceQualityProfile("gruppe-2", "gruppe-a", "Vergleich A", ["1040"], "Prophylaxe/PZR", { "1040": 3.4 }),
    invoiceQualityProfile("gruppe-3", "gruppe-b", "Vergleich B", ["1040"], "Prophylaxe/PZR", { "1040": 3.6 }),
    invoiceQualityProfile("ziel-1", "ziel", "Zielpraxis", ["1040"], "Prophylaxe/PZR", { "1040": 2.3 }),
    invoiceQualityProfile("ziel-2", "ziel", "Zielpraxis", ["1040"], "Prophylaxe/PZR", { "1040": 2.4 }),
    invoiceQualityProfile("ziel-3", "ziel", "Zielpraxis", ["1040"], "Prophylaxe/PZR", { "1040": 2.2 })
  ];
  const findings = buildInvoiceQualityFactorDeviationFindingsFromProfiles(profiles, [testStandort("ziel", "Zielpraxis")], { minCaseCount: 3, minPotential: 0 });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].analysisType, "factor_deviation");
  assert.equal(findings[0].hintType, "Faktorhinweis");
  assert.equal(findings[0].topicCluster, "Faktoren / Steigerungssätze");
  assert.equal(findings[0].precheckStatus, "Keine Regel vorhanden");
  assert.equal(findings[0].orientationLevel, "einzelfallabhängig");
  assert.ok((findings[0].groupAverageFactor ?? 0) > (findings[0].practiceAverageFactor ?? 0));
});

test("Leistungsketten bündeln mehrere Begleitpositionen je Hauptleistung", () => {
  const findings = buildInvoiceQualityFindingsFromProfiles([
    invoiceQualityProfile("gruppe-1", "gruppe-a", "Vergleich A", ["8000", "8010", "8020"]),
    invoiceQualityProfile("gruppe-2", "gruppe-a", "Vergleich A", ["8000", "8010", "8020"]),
    invoiceQualityProfile("gruppe-3", "gruppe-b", "Vergleich B", ["8000", "8010", "8020"]),
    invoiceQualityProfile("ziel-1", "ziel", "Zielpraxis", ["8000"]),
    invoiceQualityProfile("ziel-2", "ziel", "Zielpraxis", ["8000"]),
    invoiceQualityProfile("ziel-3", "ziel", "Zielpraxis", ["8000"])
  ], [{
    id: "ziel",
    name: "Zielpraxis",
    praxisname: "Zielpraxis",
    mandantNo: "1",
    goLiveDate: "2024-01-01",
    goLiveLabel: "01.01.2024",
    lastImport: "",
    submittedThisMonth: 0,
    feesThisMonth: 0,
    openCases: 0,
    openChargebacks: 0,
    withoutProtection: 0,
    olderThan30: 0
  }], { minGroupRate: 0.4, minCaseCount: 3, minPotential: 0 });

  const chains = buildInvoiceQualityChainFindings(findings);
  const kpis = invoiceQualityChainKpis(chains);
  const csv = createInvoiceQualityChainCsv(chains, { label: "2026 gesamt" }, ["Kettentest"]);

  assert.equal(chains.length, 1);
  assert.equal(chains[0].anchorCode, "8000");
  assert.deepEqual(chains[0].companions.map((companion) => companion.code).sort(), ["8010", "8020"]);
  assert.equal(chains[0].catalogPlausibilityLevel, "A");
  assert.equal(chains[0].catalogPlausibilityStatus, "regel_hinterlegt");
  assert.equal(kpis.count, 1);
  assert.equal(kpis.companionCount, 2);
  assert.match(csv, /8010/);
  assert.match(csv, /8020/);
  assert.match(csv, /A · regelmäßig naheliegend/);
  assert.match(csv, /Kettentest/);
});

test("Leistungsketten markieren unbekannte und Seed-Ketten mit Katalog-Plausibilität", () => {
  const unknownFindings = buildInvoiceQualityFindingsFromProfiles([
    invoiceQualityProfile("gruppe-1", "gruppe-a", "Vergleich A", ["7777", "8888", "9999"], "Neuer Falltyp"),
    invoiceQualityProfile("gruppe-2", "gruppe-a", "Vergleich A", ["7777", "8888", "9999"], "Neuer Falltyp"),
    invoiceQualityProfile("gruppe-3", "gruppe-b", "Vergleich B", ["7777", "8888", "9999"], "Neuer Falltyp"),
    invoiceQualityProfile("ziel-1", "ziel", "Zielpraxis", ["7777"], "Neuer Falltyp"),
    invoiceQualityProfile("ziel-2", "ziel", "Zielpraxis", ["7777"], "Neuer Falltyp"),
    invoiceQualityProfile("ziel-3", "ziel", "Zielpraxis", ["7777"], "Neuer Falltyp")
  ], [testStandort("ziel", "Zielpraxis")], { minGroupRate: 0.4, minCaseCount: 3, minPotential: 0 });
  const unknownChain = buildInvoiceQualityChainFindings(unknownFindings)[0];

  assert.equal(unknownChain.riskLevel, "yellow");
  assert.equal(unknownChain.reviewStatus, "ungeprüft");
  assert.equal(unknownChain.sourceStatus, "keine_quelle");
  assert.equal(unknownChain.classification, "nur Datenmuster");
  assert.equal(unknownChain.ruleStatus, "Nur Datenmuster");
  assert.equal(unknownChain.hintType, "Datenmuster");
  assert.equal(unknownChain.catalogPlausibilityLevel, "E");
  assert.equal(unknownChain.catalogPlausibilityStatus, "keine_regel");
  assert.match(unknownChain.catalogPlausibilityLabel, /Datenmuster/);
  assert.match(unknownChain.shortHint, /Nur Datenmuster/);

  const seedFindings = buildInvoiceQualityFindingsFromProfiles([
    invoiceQualityProfile("gruppe-a-1", "gruppe-a", "Vergleich A", ["0010", "2010", "Ä1"], "Prophylaxe/PZR"),
    invoiceQualityProfile("gruppe-a-2", "gruppe-a", "Vergleich A", ["0010", "2010", "Ä1"], "Prophylaxe/PZR"),
    invoiceQualityProfile("gruppe-b-1", "gruppe-b", "Vergleich B", ["0010", "2010", "Ä1"], "Prophylaxe/PZR"),
    invoiceQualityProfile("ziel-a-1", "ziel", "Zielpraxis", ["0010"], "Prophylaxe/PZR"),
    invoiceQualityProfile("ziel-a-2", "ziel", "Zielpraxis", ["0010"], "Prophylaxe/PZR"),
    invoiceQualityProfile("ziel-a-3", "ziel", "Zielpraxis", ["0010"], "Prophylaxe/PZR")
  ], [testStandort("ziel", "Zielpraxis")], { minGroupRate: 0.4, minCaseCount: 3, minPotential: 0 });
  const seedChain = buildInvoiceQualityChainFindings(seedFindings)[0];
  const seedCsv = createInvoiceQualityChainCsv([seedChain], { label: "2026 gesamt" });

  assert.equal(seedChain.riskLevel, "yellow");
  assert.equal(seedChain.reviewStatus, "seed_ungeprüft");
  assert.equal(seedChain.sourceStatus, "keine_quelle");
  assert.equal(seedChain.ruleStatus, "Vorsichtig einordnen");
  assert.equal(seedChain.classification, "vorsichtig einordnen");
  assert.equal(seedChain.catalogPlausibilityLevel, "B");
  assert.equal(seedChain.catalogPlausibilityStatus, "regel_hinterlegt");
  assert.match(seedChain.ruleSummary, /als Orientierung geeignet/);
  assert.match(seedCsv, /B · einzelfallabhängig/);
  assert.match(seedCsv, /Keine automatische Abrechnungsempfehlung/);
  assert.doesNotMatch(seedCsv, /Nachberechnung/);
});

test("Leistungsketten kennzeichnen Behandlungsverlauf und gruppieren Begleitpositionen", () => {
  const flowFindings = buildInvoiceQualityFindingsFromProfiles([
    invoiceQualityProfile("gruppe-a-1", "gruppe-a", "Vergleich A", ["3290", "9010", "0530", "Ä5004"], "Implantat-Fallverlauf"),
    invoiceQualityProfile("gruppe-a-2", "gruppe-a", "Vergleich A", ["3290", "9010", "0530", "Ä5004"], "Implantat-Fallverlauf"),
    invoiceQualityProfile("gruppe-b-1", "gruppe-b", "Vergleich B", ["3290", "9010", "0530", "Ä5004"], "Implantat-Fallverlauf"),
    invoiceQualityProfile("ziel-a-1", "ziel", "Zielpraxis", ["3290"], "Implantat-Fallverlauf"),
    invoiceQualityProfile("ziel-a-2", "ziel", "Zielpraxis", ["3290"], "Implantat-Fallverlauf"),
    invoiceQualityProfile("ziel-a-3", "ziel", "Zielpraxis", ["3290"], "Implantat-Fallverlauf")
  ], [testStandort("ziel", "Zielpraxis")], { minGroupRate: 0.4, minCaseCount: 3, minPotential: 0 });
  const flowChain = buildInvoiceQualityChainFindings(flowFindings)[0];

  assert.equal(flowChain.classification, "vorsichtig einordnen");
  assert.equal(flowChain.hintType, "Behandlungsverlauf");
  assert.equal(flowChain.ruleStatus, "Vorsichtig einordnen");
  assert.equal(flowChain.catalogPlausibilityLevel, "C");
  assert.equal(flowChain.catalogPlausibilityLabel, "Behandlungsverlauf");
  assert.match(flowChain.detailHint, /Behandlungsverlauf/);
  assert.ok(flowChain.companions.every((companion) => companion.topic));
});

test("Leistungsketten markieren PZR-Kontext mit 1020 als vorsichtig einzuordnen", () => {
  const findings = buildInvoiceQualityFindingsFromProfiles([
    invoiceQualityProfile("gruppe-a-1", "gruppe-a", "Vergleich A", ["1040", "1020"], "Prophylaxe/PZR"),
    invoiceQualityProfile("gruppe-a-2", "gruppe-a", "Vergleich A", ["1040", "1020"], "Prophylaxe/PZR"),
    invoiceQualityProfile("gruppe-b-1", "gruppe-b", "Vergleich B", ["1040", "1020"], "Prophylaxe/PZR"),
    invoiceQualityProfile("ziel-a-1", "ziel", "Zielpraxis", ["1040"], "Prophylaxe/PZR"),
    invoiceQualityProfile("ziel-a-2", "ziel", "Zielpraxis", ["1040"], "Prophylaxe/PZR"),
    invoiceQualityProfile("ziel-a-3", "ziel", "Zielpraxis", ["1040"], "Prophylaxe/PZR")
  ], [testStandort("ziel", "Zielpraxis")], { minGroupRate: 0.4, minCaseCount: 3, minPotential: 0 });
  const chain = buildInvoiceQualityChainFindings(findings, 1)[0];

  assert.equal(chain.anchorCode, "1040");
  assert.equal(chain.companions[0].code, "1020");
  assert.equal(chain.catalogPlausibilityLevel, "D");
  assert.equal(chain.catalogPlausibilityLabel, "vorsichtig einordnen");
  assert.match(chain.catalogPlausibilityExplanation, /Fluoridierung/);
});

test("Leistungsketten erkennen Ein-Begleitpositions-Kette 2360 zu 2410 als A", () => {
  const findings = buildInvoiceQualityFindingsFromProfiles([
    invoiceQualityProfile("gruppe-a-1", "gruppe-a", "Vergleich A", ["2360", "2410"], "Endodontie"),
    invoiceQualityProfile("gruppe-a-2", "gruppe-a", "Vergleich A", ["2360", "2410"], "Endodontie"),
    invoiceQualityProfile("gruppe-b-1", "gruppe-b", "Vergleich B", ["2360", "2410"], "Endodontie"),
    invoiceQualityProfile("ziel-a-1", "ziel", "Zielpraxis", ["2360"], "Endodontie"),
    invoiceQualityProfile("ziel-a-2", "ziel", "Zielpraxis", ["2360"], "Endodontie"),
    invoiceQualityProfile("ziel-a-3", "ziel", "Zielpraxis", ["2360"], "Endodontie")
  ], [testStandort("ziel", "Zielpraxis")], { minGroupRate: 0.4, minCaseCount: 3, minPotential: 0 });
  const chain = buildInvoiceQualityChainFindings(findings, 1)[0];

  assert.equal(chain.anchorCode, "2360");
  assert.equal(chain.companions[0].code, "2410");
  assert.equal(chain.catalogPlausibilityLevel, "A");
  assert.equal(chain.catalogPlausibilityLabel, "regelmäßig naheliegend");
});

function invoiceQualityProfile(key: string, standortId: string, standortName: string, codes: string[], caseType = "Allgemein", factors: Record<string, number> = {}): InvoiceQualityProfile {
  const lineByCode = new Map<string, ParsedInvoiceLine>();
  codes.forEach((code) => {
    lineByCode.set(code, {
      code,
      description: code === "8010" ? "Registrierung der gelenkbezüglichen Zentrallage" : code === "7777" || code === "8888" ? "Neue Leistungsart" : "Klinische Funktionsanalyse",
      factor: factors[code],
      amount: code === "8010" ? 50 : 100,
      category: "leistung",
      sourceSection: "test"
    });
  });
  return {
    invoice: {} as InvoiceQualityProfile["invoice"],
    standortId,
    standortName,
    invoiceNo: key,
    bfsNo: `bfs-${key}`,
    invoiceDate: "01.01.2026",
    patientName: `Patient ${key}`,
    amount: 100,
    codes,
    codeSet: new Set(codes),
    lineByCode,
    caseType
  };
}

function testStandort(id: string, name: string) {
  return {
    id,
    name,
    praxisname: name,
    mandantNo: "1",
    goLiveDate: "2024-01-01",
    goLiveLabel: "01.01.2024",
    lastImport: "",
    submittedThisMonth: 0,
    feesThisMonth: 0,
    openCases: 0,
    openChargebacks: 0,
    withoutProtection: 0,
    olderThan30: 0
  };
}

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

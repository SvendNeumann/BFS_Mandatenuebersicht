import assert from "node:assert/strict";
import test from "node:test";
import { buildClosedResolutionKeySet, buildPaidResolutionKeySet, caseResolutionIdentityKeys, caseResolutionKeyFromParts, caseResolutionKeys, isAusfallhonorarDescription } from "../lib/case-resolution.ts";
import { parseBfsText } from "../lib/bfs-parser.ts";
import { dedupeImportRows, importRowBusinessIdentity } from "../lib/import-identity.ts";
import { parseInvoiceText, parsePracticeSoftwareInvoiceText } from "../lib/invoice-parser.ts";
import { parseInvoiceStatusText } from "../lib/invoice-status-parser.ts";
import { buildInvoiceQualityFindingsFromProfiles, createInvoiceQualityCsv, filterInvoiceQualityFindings, invoiceQualityKpis, type InvoiceQualityProfile } from "../lib/invoice-quality-analysis.ts";
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
  assert.equal(isAusfallhonorarDescription("Vers_ Versäumnis Termin"), true);
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
    "Praxis Dr. Krauthausen",
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
  assert.match(csv, /2026 gesamt/);
  assert.match(csv, /FAL-Zentrallage einordnen/);
  assert.match(csv, /Einordnungstest/);
});

function invoiceQualityProfile(key: string, standortId: string, standortName: string, codes: string[]): InvoiceQualityProfile {
  const lineByCode = new Map<string, ParsedInvoiceLine>();
  codes.forEach((code) => {
    lineByCode.set(code, {
      code,
      description: code === "8010" ? "Registrierung der gelenkbezüglichen Zentrallage" : "Klinische Funktionsanalyse",
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
    caseType: "Allgemein"
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

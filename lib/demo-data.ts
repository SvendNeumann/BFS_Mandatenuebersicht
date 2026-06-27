import type { BfsCase, BfsPeriodMetric, ImportPreviewRow, RiskClaim, Standort } from "./types";

export const standorte: Standort[] = [
  {
    id: "kirchberg",
    name: "Kirchberg",
    praxisname: "Dres. Kallweit MVZ",
    mandantNo: "18504",
    mandantNos: ["18504", "21988"],
    locationHints: ["Kirchberg", "08107", "Dres. Kallweit", "Kallweit MVZ"],
    goLiveDate: "2024-07-01",
    goLiveLabel: "01.07.2024",
    lastImport: "19.06.2026",
    submittedThisMonth: 7620.33,
    feesThisMonth: 169.54,
    openCases: 1,
    openChargebacks: 450.4,
    withoutProtection: 220.0,
    olderThan30: 0
  },
  {
    id: "essen",
    name: "Essen",
    praxisname: "Praxis Krause",
    mandantNo: "18790",
    mandantNos: ["18790", "19220", "19221", "22341"],
    locationHints: ["Essen", "Praxis Krause", "Praxis Krause | Aligner RP 24", "Praxis Krause | Aligner RP 36"],
    goLiveDate: "2025-01-01",
    goLiveLabel: "01.01.2025",
    lastImport: "22.06.2026",
    submittedThisMonth: 15420.2,
    feesThisMonth: 351.9,
    openCases: 2,
    openChargebacks: 1280.55,
    withoutProtection: 540.25,
    olderThan30: 0
  },
  {
    id: "kehl",
    name: "Kehl",
    praxisname: "Zahnarztpraxis Zorn de Bulach",
    mandantNo: "19092",
    mandantNos: ["19092", "20411"],
    locationHints: ["Kehl", "Zorn de Bulach", "Zorn von Bulach"],
    goLiveDate: "2025-04-01",
    goLiveLabel: "01.04.2025",
    lastImport: "18.06.2026",
    submittedThisMonth: 12840.15,
    feesThisMonth: 287.3,
    openCases: 3,
    openChargebacks: 1410.2,
    withoutProtection: 630.4,
    olderThan30: 0
  },
  {
    id: "huettenberg",
    name: "Hüttenberg",
    praxisname: "Praxis Dr. Krauthausen",
    mandantNo: "19804",
    mandantNos: ["19804", "22674"],
    locationHints: ["Hüttenberg", "Huettenberg", "Krauthausen"],
    goLiveDate: "2026-01-01",
    goLiveLabel: "01.01.2026",
    lastImport: "24.06.2026",
    submittedThisMonth: 9310.75,
    feesThisMonth: 214.8,
    openCases: 2,
    openChargebacks: 790.3,
    withoutProtection: 310.0,
    olderThan30: 1
  },
  {
    id: "ulmet",
    name: "Ulmet",
    praxisname: "Praxis Dr. Hangx",
    mandantNo: "19260",
    mandantNos: ["19260", "19668", "19669"],
    locationHints: ["Ulmet", "Hangx", "Praxis Dr. Hangx | Aligner RP 24", "Praxis Dr. Hangx | Aligner RP 36"],
    goLiveDate: "2025-07-01",
    goLiveLabel: "01.07.2025",
    lastImport: "26.06.2026",
    submittedThisMonth: 3912.6,
    feesThisMonth: 104.77,
    openCases: 5,
    openChargebacks: 5385.51,
    withoutProtection: 315.9,
    olderThan30: 2
  },
  {
    id: "kassel",
    name: "Kassel",
    praxisname: "Praxis Dr. Spohr",
    mandantNo: "20309",
    mandantNos: ["20309", "20902"],
    locationHints: ["Kassel", "Spohr"],
    goLiveDate: "2026-07-01",
    goLiveLabel: "01.07.2026",
    lastImport: "noch kein Import",
    submittedThisMonth: 0,
    feesThisMonth: 0,
    openCases: 0,
    openChargebacks: 0,
    withoutProtection: 0,
    olderThan30: 0
  }
];

export const monthlyKpis = [
  ["Anzahl Standorte", "5 + 1", "fünf live, Kassel ab 01.07.2026"],
  ["BFS-Abrechnungen aktueller Monat", "9", "importiert und geprüft"],
  ["Eingereichte Forderungen", "49.026,03 €", "aktueller Monat ohne Kassel"],
  ["Offene Rückbelastungen", "9.317,36 €", "echte To-dos ohne Kassel"]
];

const metricMonths = ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];

export const bfsPeriodMetrics: BfsPeriodMetric[] = standorte.flatMap((standort, standortIndex) => {
  const goLiveMonth = standort.goLiveDate.slice(0, 7);
  if (!isStandortLive(standort, new Date("2026-06-27T00:00:00"))) return [];

  return metricMonths
    .filter((month) => month >= goLiveMonth)
    .map((month, monthIndex) => {
      const wave = 0.78 + ((monthIndex + standortIndex) % 6) * 0.075;
      const seasonal = month.endsWith("-03") || month.endsWith("-06") || month.endsWith("-09") || month.endsWith("-12") ? 1.08 : 1;
      const submitted = roundMoney(standort.submittedThisMonth * wave * seasonal);
      const fees = roundMoney(submitted * (standort.feesThisMonth / Math.max(standort.submittedThisMonth, 1)));
      const cancellationCount = (monthIndex + standortIndex) % 5 === 0 ? 2 : (monthIndex + standortIndex) % 3 === 0 ? 1 : 0;
      const returnCount = standort.openChargebacks > 0 && (monthIndex + standortIndex) % 4 === 0 ? Math.max(1, Math.round(standort.openCases / 2)) : cancellationCount ? 1 : 0;
      const returnAmount = roundMoney(returnCount ? standort.openChargebacks * (0.16 + ((monthIndex + 1) % 4) * 0.04) : 0);
      const cancellationAmount = roundMoney(cancellationCount ? submitted * (0.006 + (cancellationCount * 0.004)) : 0);
      const noProtectionCount = (monthIndex + standortIndex) % 3 === 1 ? 2 : 1;
      const noProtectionAmount = roundMoney(standort.withoutProtection * (0.45 + ((monthIndex + 2) % 5) * 0.08));

      return {
        standortId: standort.id,
        month,
        submitted,
        payout: roundMoney(Math.max(submitted - fees - cancellationAmount, 0)),
        fees,
        returnCount,
        returnAmount,
        cancellationCount,
        cancellationAmount,
        noProtectionCount,
        noProtectionAmount
      };
    });
});

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function isStandortLive(standort: Standort, referenceDate = new Date()) {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  return new Date(`${standort.goLiveDate}T00:00:00`) <= today;
}

export function liveStatusLabel(standort: Standort, referenceDate = new Date()) {
  return isStandortLive(standort, referenceDate) ? "aktiv" : `ab ${standort.goLiveLabel}`;
}

export const cases: BfsCase[] = [
  {
    id: "case-1",
    standortId: "ulmet",
    locationName: "Ulmet",
    patientName: "Gavrila, Dan-Cristinel",
    invoiceNo: "370-025140",
    bfsNo: "BFS-370-025140",
    amount: 400.47,
    reason: "Rückgabe ohne Ausfallschutz",
    ageDays: 34,
    traffic: "red",
    status: "offen",
    dueDate: "03.07.2026",
    lastComment: "Prüfung mit Standort angefragt"
  },
  {
    id: "case-2",
    standortId: "ulmet",
    locationName: "Ulmet",
    patientName: "Weigand, Waltraud",
    invoiceNo: "232-025232",
    bfsNo: "BFS-232-025232",
    amount: 3259.63,
    reason: "Rückgabe ohne Ausfallschutz",
    ageDays: 41,
    traffic: "red",
    status: "in_klaerung",
    dueDate: "28.06.2026",
    lastComment: "Direktzahlung wird geprüft"
  },
  {
    id: "case-3",
    standortId: "ulmet",
    locationName: "Ulmet",
    patientName: "Grünwald, Daniel",
    invoiceNo: "443-025284",
    bfsNo: "BFS-443-025284",
    amount: 15,
    reason: "Rückgabe ohne Ausfallschutz",
    ageDays: 12,
    traffic: "yellow",
    status: "offen",
    dueDate: "10.07.2026",
    lastComment: "Kleinstbetrag, Empfehlung offen"
  },
  {
    id: "case-4",
    standortId: "ulmet",
    locationName: "Ulmet",
    patientName: "Faber, Leana",
    invoiceNo: "988-025269",
    bfsNo: "BFS-988-025269",
    amount: 170.66,
    reason: "Rückgabe ohne Ausfallschutz",
    ageDays: 8,
    traffic: "yellow",
    status: "offen",
    dueDate: "12.07.2026",
    lastComment: "Keine Rückmeldung"
  },
  {
    id: "case-5",
    standortId: "ulmet",
    locationName: "Ulmet",
    patientName: "Cepik, Melisa",
    invoiceNo: "136-025306",
    bfsNo: "BFS-136-025306",
    amount: 1539.75,
    reason: "Rückgabe ohne Ausfallschutz",
    ageDays: 19,
    traffic: "orange",
    status: "wiedervorlage",
    dueDate: "01.07.2026",
    lastComment: "Wiedervorlage Standortleitung"
  },
  {
    id: "case-6",
    standortId: "ulmet",
    locationName: "Ulmet",
    patientName: "Theobald, Jan Luca",
    invoiceNo: "334-026246",
    bfsNo: "BFS-334-026246",
    amount: 239.91,
    reason: "Fehlerhafte Rechnung",
    ageDays: 0,
    traffic: "green",
    status: "erledigt_automatisch",
    dueDate: "-",
    lastComment: "Sicheres Match mit Neueinreichung 118"
  },
  {
    id: "case-7",
    standortId: "kehl",
    locationName: "Kehl",
    patientName: "Muster, Helena",
    invoiceNo: "883-026144",
    bfsNo: "BFS-883-026144",
    amount: 620.2,
    reason: "Storno durch Praxis",
    ageDays: 6,
    traffic: "green",
    status: "offen",
    dueDate: "08.07.2026",
    lastComment: "Unterlagen angefordert"
  }
];

export const riskClaims: RiskClaim[] = [
  { id: "risk-1", standortId: "ulmet", patientName: "Bachtler, Luisa Marie", invoiceNo: "717-026607", bfsNo: "BFS-717-026607", amount: 101.9, statementNo: "116", date: "17.06.2026", marker: "*KA" },
  { id: "risk-1b", standortId: "ulmet", patientName: "Bachtler, Luisa Marie", invoiceNo: "717-026104", bfsNo: "BFS-717-026104", amount: 128.4, statementNo: "114", date: "03.06.2026", marker: "*KA" },
  { id: "risk-1c", standortId: "ulmet", patientName: "Bachtler, Luisa Marie", invoiceNo: "717-025882", bfsNo: "BFS-717-025882", amount: 94.6, statementNo: "111", date: "14.05.2026", marker: "*KA" },
  { id: "risk-2", standortId: "ulmet", patientName: "Horvath, Kevin", invoiceNo: "176-026622", bfsNo: "BFS-176-026622", amount: 99, statementNo: "116", date: "17.06.2026", marker: "*KA" },
  { id: "risk-2b", standortId: "ulmet", patientName: "Horvath, Kevin", invoiceNo: "176-026211", bfsNo: "BFS-176-026211", amount: 220.5, statementNo: "115", date: "10.06.2026", marker: "*KA" },
  { id: "risk-3", standortId: "ulmet", patientName: "Kischkat, Selin", invoiceNo: "220-026605", bfsNo: "BFS-220-026605", amount: 115, statementNo: "116", date: "17.06.2026", marker: "*KA" },
  { id: "risk-4", standortId: "kehl", patientName: "Roth, Milan", invoiceNo: "512-026310", bfsNo: "BFS-512-026310", amount: 630.4, statementNo: "91", date: "18.06.2026", marker: "*KA" },
  { id: "risk-4b", standortId: "kehl", patientName: "Roth, Milan", invoiceNo: "512-025944", bfsNo: "BFS-512-025944", amount: 410.2, statementNo: "89", date: "21.05.2026", marker: "*KA" },
  { id: "risk-5", standortId: "essen", patientName: "Meyer, Thomas", invoiceNo: "681-026512", bfsNo: "BFS-681-026512", amount: 315.8, statementNo: "62", date: "20.06.2026", marker: "*KA" },
  { id: "risk-5b", standortId: "essen", patientName: "Meyer, Thomas", invoiceNo: "681-026205", bfsNo: "BFS-681-026205", amount: 287.6, statementNo: "61", date: "06.06.2026", marker: "*KA" },
  { id: "risk-5c", standortId: "essen", patientName: "Meyer, Thomas", invoiceNo: "681-025870", bfsNo: "BFS-681-025870", amount: 190.4, statementNo: "59", date: "09.05.2026", marker: "*KA" }
];

export const importPreviewRows: ImportPreviewRow[] = [
  {
    file: "AbrechnungsNachweis_19260_116.pdf",
    location: "Ulmet",
    mandantNo: "19260",
    practice: "Praxis Dr. Hangx",
    statementNo: "116",
    date: "17.06.2026",
    claimsHeader: 19,
    claimsExtracted: 19,
    sumHeader: 3573.69,
    sumExtracted: 3573.69,
    hasLedger: true,
    movements: 11,
    status: "OK"
  },
  {
    file: "AbrechnungsNachweis_19260_118.pdf",
    location: "Ulmet",
    mandantNo: "19260",
    practice: "Praxis Dr. Hangx",
    statementNo: "118",
    date: "26.06.2026",
    claimsHeader: 2,
    claimsExtracted: 2,
    sumHeader: 338.91,
    sumExtracted: 338.91,
    hasLedger: true,
    movements: 3,
    status: "OK"
  },
  {
    file: "Abrechnung_unbekannter_mandant.pdf",
    location: "Unbekannt",
    mandantNo: "90877",
    practice: "nicht zugeordnet",
    statementNo: "44",
    date: "20.06.2026",
    claimsHeader: 8,
    claimsExtracted: 8,
    sumHeader: 1550,
    sumExtracted: 1550,
    hasLedger: false,
    movements: 0,
    status: "Standort unbekannt"
  }
];

export const documents = importPreviewRows;

export const users = [
  { name: "Svend Neumann", email: "svend@orisus.de", role: "super_admin", location: "alle Standorte", active: true },
  { name: "Standortleitung Ulmet", email: "ulmet@orisus.de", role: "standortleitung", location: "Ulmet", active: true }
];

export const dashboardSeries = [
  { title: "Eingereicht vs. ausgezahlt", values: [{ label: "Mrz", value: 48 }, { label: "Apr", value: 66 }, { label: "Mai", value: 74 }, { label: "Jun", value: 92 }] },
  { title: "Gebührenentwicklung", values: [{ label: "Mrz", value: 28 }, { label: "Apr", value: 42 }, { label: "Mai", value: 55 }, { label: "Jun", value: 61 }] },
  { title: "Rückbelastungen je Standort", values: [{ label: "Ulm", value: 88 }, { label: "Keh", value: 24 }, { label: "Kas", value: 46 }, { label: "Kir", value: 18 }] }
];

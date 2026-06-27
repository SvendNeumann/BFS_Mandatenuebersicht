import type { BfsCase, ImportPreviewRow, RiskClaim, Standort } from "./types";

export const standorte: Standort[] = [
  {
    id: "kirchberg",
    name: "Kirchberg",
    praxisname: "Orisus MVZ Kirchberg",
    mandantNo: "21988",
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
    praxisname: "Orisus MVZ Essen",
    mandantNo: "22341",
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
    praxisname: "Orisus MVZ Kehl",
    mandantNo: "20411",
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
    praxisname: "Orisus MVZ Hüttenberg",
    mandantNo: "22674",
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
    praxisname: "Orisus MVZ Kassel",
    mandantNo: "20902",
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
  { id: "risk-2", standortId: "ulmet", patientName: "Horvath, Kevin", invoiceNo: "176-026622", bfsNo: "BFS-176-026622", amount: 99, statementNo: "116", date: "17.06.2026", marker: "*KA" },
  { id: "risk-3", standortId: "ulmet", patientName: "Kischkat, Selin", invoiceNo: "220-026605", bfsNo: "BFS-220-026605", amount: 115, statementNo: "116", date: "17.06.2026", marker: "*KA" },
  { id: "risk-4", standortId: "kehl", patientName: "Roth, Milan", invoiceNo: "512-026310", bfsNo: "BFS-512-026310", amount: 630.4, statementNo: "91", date: "18.06.2026", marker: "*KA" }
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

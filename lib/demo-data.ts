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
    lastImport: "kein Import",
    submittedThisMonth: 0,
    feesThisMonth: 0,
    openCases: 0,
    openChargebacks: 0,
    withoutProtection: 0,
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
    lastImport: "kein Import",
    submittedThisMonth: 0,
    feesThisMonth: 0,
    openCases: 0,
    openChargebacks: 0,
    withoutProtection: 0,
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
    lastImport: "kein Import",
    submittedThisMonth: 0,
    feesThisMonth: 0,
    openCases: 0,
    openChargebacks: 0,
    withoutProtection: 0,
    olderThan30: 0
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
    lastImport: "kein Import",
    submittedThisMonth: 0,
    feesThisMonth: 0,
    openCases: 0,
    openChargebacks: 0,
    withoutProtection: 0,
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
    lastImport: "kein Import",
    submittedThisMonth: 0,
    feesThisMonth: 0,
    openCases: 0,
    openChargebacks: 0,
    withoutProtection: 0,
    olderThan30: 0
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
    lastImport: "kein Import",
    submittedThisMonth: 0,
    feesThisMonth: 0,
    openCases: 0,
    openChargebacks: 0,
    withoutProtection: 0,
    olderThan30: 0
  }
];

export function isStandortLive(standort: Standort, referenceDate = new Date()) {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  return new Date(`${standort.goLiveDate}T00:00:00`) <= today;
}

export function liveStatusLabel(standort: Standort, referenceDate = new Date()) {
  return isStandortLive(standort, referenceDate) ? "aktiv" : `ab ${standort.goLiveLabel}`;
}

export function compareStandorteByContractStart(a: Standort, b: Standort) {
  return a.goLiveDate.localeCompare(b.goLiveDate) || a.name.localeCompare(b.name, "de");
}

export function orderedStandorte(source: Standort[] = standorte) {
  return [...source].sort(compareStandorteByContractStart);
}

export const monthlyKpis: string[][] = [];
export const bfsPeriodMetrics: BfsPeriodMetric[] = [];
export const cases: BfsCase[] = [];
export const riskClaims: RiskClaim[] = [];
export const importPreviewRows: ImportPreviewRow[] = [];
export const documents: ImportPreviewRow[] = [];
export const users: Array<{ name: string; email: string; role: string; location: string; active: boolean }> = [];
export const dashboardSeries: Array<{ title: string; values: Array<{ label: string; value: number }> }> = [];

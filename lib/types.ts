export type AppRole = "super_admin" | "standortleitung";

export type Standort = {
  id: string;
  name: string;
  praxisname: string;
  mandantNo: string;
  lastImport: string;
  submittedThisMonth: number;
  feesThisMonth: number;
  openCases: number;
  openChargebacks: number;
  withoutProtection: number;
  olderThan30: number;
};

export type Traffic = "green" | "yellow" | "orange" | "red";

export type BfsCase = {
  id: string;
  standortId: string;
  locationName: string;
  patientName: string;
  invoiceNo: string;
  bfsNo: string;
  amount: number;
  reason: string;
  ageDays: number;
  traffic: Traffic;
  status: string;
  dueDate: string;
  lastComment: string;
};

export type RiskClaim = {
  id: string;
  standortId: string;
  patientName: string;
  invoiceNo: string;
  bfsNo: string;
  amount: number;
  statementNo: string;
  date: string;
  marker: string;
};

export type ImportPreviewRow = {
  file: string;
  location: string;
  mandantNo: string;
  practice: string;
  statementNo: string;
  date: string;
  claimsHeader: number;
  claimsExtracted: number;
  sumHeader: number;
  sumExtracted: number;
  hasLedger: boolean;
  movements: number;
  status: string;
  fileHash?: string;
  fileSizeBytes?: number;
  parseNotes?: string[];
};

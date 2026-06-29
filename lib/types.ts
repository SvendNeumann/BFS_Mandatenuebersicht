export type AppRole = "super_admin" | "standortleitung";

export type Standort = {
  id: string;
  name: string;
  praxisname: string;
  mandantNo: string;
  mandantNos?: string[];
  locationHints?: string[];
  goLiveDate: string;
  goLiveLabel: string;
  lastImport: string;
  submittedThisMonth: number;
  feesThisMonth: number;
  openCases: number;
  openChargebacks: number;
  withoutProtection: number;
  olderThan30: number;
};

export type BfsPeriodMetric = {
  standortId: string;
  month: string;
  submitted: number;
  payout: number;
  fees: number;
  returnCount: number;
  returnAmount: number;
  cancellationCount: number;
  cancellationAmount: number;
  noProtectionCount: number;
  noProtectionAmount: number;
};

export type Traffic = "green" | "yellow" | "orange" | "red";

export type BfsCase = {
  id: string;
  resolutionKey?: string;
  standortId: string;
  locationName: string;
  patientName: string;
  invoiceNo: string;
  bfsNo: string;
  amount: number;
  reason: string;
  sourceDate?: string;
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
  markerReason?: string;
  markerCategory?: string;
  eventCount?: number;
  eventAmount?: number;
  eventLabels?: string[];
  assessment?: "unauffaellig" | "auffaellig" | "erledigt";
  assessmentLabel?: string;
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
  noProtectionCount?: number;
  noProtectionAmount?: number;
  feeTotal?: number;
  feeNet?: number;
  feeVat?: number;
  ewmaNet?: number;
  ewmaVat?: number;
  ewmaTotal?: number;
  netRevenue?: number;
  payout?: number;
  parsedClaims?: ParsedImportClaim[];
  parsedMovements?: ParsedImportMovement[];
  status: string;
  fileHash?: string;
  fileSizeBytes?: number;
  parseNotes?: string[];
};

export type ParsedImportClaim = {
  patientName: string;
  invoiceNo: string;
  bfsNo: string;
  amount: number;
  marker?: string;
  markerReason?: string;
  markerCategory?: string;
  protectionStatus: "mit_ausfallschutz" | "ohne_ausfallschutz" | "unbekannt";
  sourceFile?: string;
  sourceLocation?: string;
  sourceStatementNo?: string;
  sourceStatementDate?: string;
};

export type ParsedImportMovement = {
  date?: string;
  type: string;
  reason?: string;
  reasonCategory?: string;
  patientName?: string;
  invoiceNo?: string;
  bfsNo?: string;
  amount?: number;
  matchedStatementNo?: string;
  matchedStatementDate?: string;
  matchedFile?: string;
  matchStatus?: "matched_claim" | "patient_from_kontoauszug" | "unmatched";
  rawText: string;
};

export type ParsedInvoiceLine = {
  date?: string;
  region?: string;
  code: string;
  description: string;
  factor?: number;
  quantity?: number;
  amount: number;
  category: "leistung" | "eigenlabor" | "fremdlabor" | "material" | "auslage";
  sourceSection: string;
};

export type ParsedInvoiceDocument = {
  file: string;
  fileSizeBytes: number;
  fileHash?: string;
  bfsNo: string;
  mandantNo: string;
  standortId?: string;
  standortName: string;
  practiceName?: string;
  invoiceNo: string;
  invoiceDate: string;
  patientName: string;
  treatedPerson?: string;
  birthDate?: string;
  treatmentPeriod?: string;
  integrationDate?: string;
  totalAmount: number;
  openAmount: number;
  subsidyAmount: number;
  honorarBema: number;
  honorarGoz: number;
  eigenlaborTotal: number;
  fremdlaborNet: number;
  fremdlaborGross: number;
  materialAuslagen: number;
  hasEigenlabor: boolean;
  hasFremdlabor: boolean;
  labProviders: string[];
  serviceLines: ParsedInvoiceLine[];
  labLines: ParsedInvoiceLine[];
  pageCount: number;
  status: "OK" | "Zu prüfen";
  parseNotes: string[];
};

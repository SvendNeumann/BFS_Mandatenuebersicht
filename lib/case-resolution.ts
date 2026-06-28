export type CaseResolutionIdentityParts = {
  standortId: string;
  patientName: string;
  invoiceNo: string;
  bfsNo: string;
  amount: number;
  reason: string;
};

export function caseResolutionKeyFromParts(parts: CaseResolutionIdentityParts) {
  return [
    parts.standortId,
    normalizeResolutionPart(parts.patientName),
    normalizeResolutionPart(parts.invoiceNo),
    normalizeResolutionPart(parts.bfsNo),
    Math.round(parts.amount * 100),
    normalizeResolutionPart(parts.reason)
  ].join("|");
}

export function normalizeResolutionPart(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim() || "-";
}

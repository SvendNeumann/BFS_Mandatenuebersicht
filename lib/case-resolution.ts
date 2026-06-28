export type CaseResolutionIdentityParts = {
  resolutionKey?: string;
  standortId: string;
  patientName: string;
  invoiceNo: string;
  bfsNo: string;
  amount: number;
  reason: string;
};

export type CaseResolutionEntry = CaseResolutionIdentityParts & {
  status?: string;
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

export function caseResolutionKeys(parts: CaseResolutionIdentityParts) {
  const exactKey = parts.resolutionKey ?? caseResolutionKeyFromParts(parts);
  const invoiceNo = parts.invoiceNo || "-";
  const bfsNo = parts.bfsNo || "-";
  const reason = parts.reason || "-";
  const variants = [
    { invoiceNo, bfsNo, reason },
    { invoiceNo, bfsNo, reason: "-" },
    { invoiceNo, bfsNo: "-", reason: "-" },
    { invoiceNo: "-", bfsNo, reason: "-" }
  ];
  return Array.from(new Set([
    exactKey,
    ...variants.map((variant) => caseResolutionKeyFromParts({
      standortId: parts.standortId,
      patientName: parts.patientName,
      invoiceNo: variant.invoiceNo,
      bfsNo: variant.bfsNo,
      amount: parts.amount,
      reason: variant.reason
    }))
  ]));
}

export function buildPaidResolutionKeySet<T extends CaseResolutionEntry>(resolutions: T[]) {
  return buildManualResolutionKeySet(resolutions.filter((resolution) => resolution.status === "paid_manual"));
}

export function buildManualResolutionKeySet<T extends CaseResolutionEntry>(resolutions: T[]) {
  const keys = new Set<string>();
  resolutions.forEach((resolution) => {
    caseResolutionKeys(resolution).forEach((key) => keys.add(key));
  });
  return keys;
}

export function normalizeResolutionPart(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim() || "-";
}

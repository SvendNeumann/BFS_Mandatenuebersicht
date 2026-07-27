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

export function caseResolutionIdentityKeys(parts: Pick<CaseResolutionIdentityParts, "standortId" | "patientName" | "invoiceNo" | "bfsNo">) {
  const patient = normalizeResolutionPart(parts.patientName);
  const invoiceNo = normalizeResolutionPart(parts.invoiceNo || "-");
  const bfsNo = normalizeResolutionPart(parts.bfsNo || "-");
  const keys = [
    invoiceNo !== "-" && bfsNo !== "-" ? `${parts.standortId}|${patient}|invoice:${invoiceNo}|bfs:${bfsNo}` : "",
    invoiceNo !== "-" ? `${parts.standortId}|${patient}|invoice:${invoiceNo}` : "",
    bfsNo !== "-" ? `${parts.standortId}|${patient}|bfs:${bfsNo}` : ""
  ].filter(Boolean);
  return Array.from(new Set(keys));
}

export function buildPaidResolutionKeySet<T extends CaseResolutionEntry>(resolutions: T[]) {
  return buildManualResolutionKeySet(resolutions.filter((resolution) => resolution.status === "paid_manual"));
}

export function buildResubmittedResolutionKeySet<T extends CaseResolutionEntry>(resolutions: T[]) {
  return buildManualResolutionKeySet(resolutions.filter((resolution) => resolution.status === "resubmitted_manual"));
}

export function buildClosedResolutionKeySet<T extends CaseResolutionEntry>(resolutions: T[]) {
  const closed = resolutions.filter((resolution) => resolution.status === "paid_manual" || resolution.status === "resubmitted_manual" || resolution.status === "cancelled_manual");
  const keys = buildManualResolutionKeySet(closed);
  closed.forEach((resolution) => {
    caseResolutionIdentityKeys(resolution).forEach((key) => keys.add(key));
  });
  return keys;
}

export function buildCancelledResolutionKeySet<T extends CaseResolutionEntry>(resolutions: T[]) {
  return buildManualResolutionKeySet(resolutions.filter((resolution) => resolution.status === "cancelled_manual"));
}

export function buildManualResolutionKeySet<T extends CaseResolutionEntry>(resolutions: T[]) {
  const keys = new Set<string>();
  resolutions.forEach((resolution) => {
    caseResolutionKeys(resolution).forEach((key) => keys.add(key));
  });
  return keys;
}

export function isAusfallhonorarDescription(value: string | null | undefined) {
  const normalized = normalizeResolutionPart(value ?? "");
  return normalized === "ausfallhonorar"
    || /\bausfall(?:\s+|-)?honorar\b/.test(normalized)
    || /\bausfall(?:\s+|-)?gebuhr\b/.test(normalized)
    || /\btermin(?:\s+|-)?ausfall\b/.test(normalized)
    || /(?:^|\s)615(?:\s|$)/.test(normalized)
    || /\bvers\s+versaumnis\s+termin\b/.test(normalized)
    || /\bversaeumnis\s+termin\b/.test(normalized)
    || /\bversaumnis\s+termin\b/.test(normalized)
    || /\btermin(?:\s+|-)?versaumnis\b/.test(normalized)
    || /\bversaeumnis(?:\s+|-)?gebuhr\b/.test(normalized)
    || /\bversaumnis(?:\s+|-)?gebuhr\b/.test(normalized);
}

export function normalizeResolutionPart(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim() || "-";
}

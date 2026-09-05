import { normalizeResolutionPart } from "./case-resolution.ts";

export function resubmissionPatientKey(standortId: string, patientName: string) {
  return `${standortId}|${normalizeResolutionPart(patientName)}`;
}

export function indexResubmissionClaims<T extends { standortId: string; patientName: string }>(claims: T[]) {
  const byPatient = new Map<string, T[]>();
  for (const claim of claims) {
    const key = resubmissionPatientKey(claim.standortId, claim.patientName);
    const entries = byPatient.get(key);
    if (entries) entries.push(claim);
    else byPatient.set(key, [claim]);
  }
  return byPatient;
}

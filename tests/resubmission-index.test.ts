import assert from "node:assert/strict";
import test from "node:test";
import { indexResubmissionClaims, resubmissionPatientKey } from "../lib/resubmission-index.ts";

test("Neueinreichungen suchen nur beim selben Patienten am selben Standort", () => {
  const claims = [
    { standortId: "kassel", patientName: "Müller, Anna", invoiceNo: "A" },
    { standortId: "kehl", patientName: "Müller, Anna", invoiceNo: "B" },
    { standortId: "kassel", patientName: "Muller Anna", invoiceNo: "C" }
  ];
  const index = indexResubmissionClaims(claims);
  assert.deepEqual(index.get(resubmissionPatientKey("kassel", "Müller Anna"))?.map((claim) => claim.invoiceNo), ["A", "C"]);
  assert.equal(index.get(resubmissionPatientKey("kassel", "Andere Person")), undefined);
});

test("Grosser Bestand begrenzt den Vergleich auf relevante Rechnungen", () => {
  const claims = Array.from({ length: 20000 }, (_, i) => ({ standortId: "kassel", patientName: `Patient ${i}` }));
  const index = indexResubmissionClaims(claims);
  assert.equal(index.get(resubmissionPatientKey("kassel", "Patient 9999"))?.length, 1);
});

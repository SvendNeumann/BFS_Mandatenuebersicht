import assert from "node:assert/strict";
import test from "node:test";
import { parseBfsText } from "../lib/bfs-parser.ts";

test("Monatsabrechnung erkennt einstellige Rechnungsnummernpraefixe", () => {
  const parsed = parseBfsText([
    "19260 / 125 / 2",
    "Forderungen 2 160,06",
    "Beispiel, Testperson 8-026825 5-19260-12345678 60,06",
    "Muster, Testperson 28-026826 5-19260-12345679 100,00 *NB"
  ].join("\n"));
  assert.equal(parsed.claims.length, 2);
  assert.equal(parsed.claims[0].invoiceNo, "8-026825");
  assert.equal(parsed.claims.reduce((sum, claim) => sum + Math.round(claim.amount * 100), 0), 16006);
  assert.equal(parsed.claims[1].protectionStatus, "ohne_ausfallschutz");
});

import assert from "node:assert/strict";
import test from "node:test";
import { withoutObsoleteBfsTemplate } from "../lib/bfs-template-text.ts";

const sample = ["Musterarzt", "Musterstadt", "00-00000-0000000", "Kontoinhaber: BFS health finance GmbH"].map((str) => ({ str }));
const real = ["Praxis Beispiel", "Rechnungsnummer: 2/214/105", "5-18790-12345678"].map((str) => ({ str }));

test("Verdeckte BFS-Mustervorlage wird vor der Koordinatensortierung entfernt", () => {
  assert.deepEqual(withoutObsoleteBfsTemplate([...sample, ...real]), real);
});

test("Normale Rechnungen und reine Musterdateien bleiben unveraendert", () => {
  assert.equal(withoutObsoleteBfsTemplate(real), real);
  assert.equal(withoutObsoleteBfsTemplate(sample), sample);
});

test("Unvollstaendige Mustermarker loeschen keine Originaltexte", () => {
  const items = [...sample.filter((item) => item.str !== "Musterarzt"), ...real];
  assert.equal(withoutObsoleteBfsTemplate(items), items);
});

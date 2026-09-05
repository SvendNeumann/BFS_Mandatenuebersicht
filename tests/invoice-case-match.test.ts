import assert from "node:assert/strict";
import test from "node:test";
import { caseMatchesAusfallhonorarInvoice as matches } from "../lib/invoice-case-match.ts";

test("Ausfallhonorar muss bei vorhandenen BFS-Nummern exakt zur Rechnung passen", () => {
  assert.equal(matches({ bfsNo: "5-19260-123" }, { bfsNo: "5 19260 123" }), true);
  assert.equal(matches({ bfsNo: "5-19260-123", invoiceNo: "8-12345", standortId: "ulmet" }, { bfsNo: "5-19260-124", invoiceNo: "8-12345", standortId: "ulmet" }), false);
});

test("Ohne BFS-Nummer sind Rechnungsnummer und Standort gemeinsam erforderlich", () => {
  assert.equal(matches({ invoiceNo: "8-12345", standortId: "ulmet" }, { invoiceNo: "8-12345", standortId: "ulmet" }), true);
  assert.equal(matches({ invoiceNo: "8-12345", standortId: "ulmet" }, { invoiceNo: "8-12345", standortId: "kehl" }), false);
  assert.equal(matches({ invoiceNo: "8-12345" }, { invoiceNo: "8-12345" }), false);
  assert.equal(matches({ invoiceNo: "-", standortId: "ulmet" }, { invoiceNo: "-", standortId: "ulmet" }), false);
});

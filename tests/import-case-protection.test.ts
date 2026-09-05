import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertImportDocumentsHaveNoCases } from "../lib/import-case-protection.ts";

function database(results: Array<{ data: { id: string }[] | null; error: { message: string } | null }>) {
  const chunks: string[][] = [];
  return {
    chunks,
    client: { from(table: string) {
      assert.equal(table, "bfs_cases");
      return { select() { return { in(column: string, ids: string[]) {
        assert.equal(column, "document_id");
        chunks.push(ids);
        return { limit: async () => results.shift()! };
      } }; } };
    } } as unknown as SupabaseClient
  };
}

test("Importersetzung blockiert bestehende Faelle vor jeder Loeschung", async () => {
  const db = database([{ data: [{ id: "reviewed-case" }], error: null }]);
  await assert.rejects(assertImportDocumentsHaveNoCases(db.client, ["document"]), /Schutz der Fallbearbeitung/);
});

test("Importreset prueft auch nachfolgende Dokumentbloecke vor jeder Loeschung", async () => {
  const db = database([{ data: [], error: null }, { data: [{ id: "case" }], error: null }]);
  await assert.rejects(assertImportDocumentsHaveNoCases(db.client, Array.from({ length: 201 }, (_, i) => String(i))), /blockiert/);
  assert.deepEqual(db.chunks.map((chunk) => chunk.length), [200, 1]);
});

test("Fehler der Schutzabfrage stoppen die Importersetzung", async () => {
  const db = database([{ data: null, error: { message: "database unavailable" } }]);
  await assert.rejects(assertImportDocumentsHaveNoCases(db.client, ["document"]), /database unavailable/);
});

test("Dokumente ohne Faelle duerfen ersetzt werden", async () => {
  const db = database([{ data: [], error: null }]);
  await assertImportDocumentsHaveNoCases(db.client, ["document"]);
});

import type { SupabaseClient } from "@supabase/supabase-js";

export async function assertImportDocumentsHaveNoCases(supabase: SupabaseClient, documentIds: string[]) {
  // Replacing children also deletes comments and links through cascading foreign keys.
  for (let offset = 0; offset < documentIds.length; offset += 200) {
    const { data, error } = await supabase.from("bfs_cases").select("id")
      .in("document_id", documentIds.slice(offset, offset + 200)).limit(1);
    if (error) throw new Error(error.message);
    if (data?.length) {
      throw new Error("Dieser Import ist mit bestehenden Prüffällen verknüpft. Ersetzen oder Zurücksetzen wurde zum Schutz der Fallbearbeitung blockiert; vorhandene Daten bleiben erhalten.");
    }
  }
}

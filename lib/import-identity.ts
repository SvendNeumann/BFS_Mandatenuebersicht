import type { ImportPreviewRow } from "./types";

export function importRowBusinessIdentity(row: Pick<ImportPreviewRow, "mandantNo" | "statementNo">) {
  if (row.mandantNo !== "-" && row.statementNo !== "-") {
    return `${row.mandantNo}:${row.statementNo}`;
  }
  return null;
}

export function dedupeImportRows(rows: ImportPreviewRow[]) {
  const rowsByIdentity = new Map<string, ImportPreviewRow>();
  for (const row of rows) {
    const identity = importRowBusinessIdentity(row) ?? row.fileHash ?? row.file;
    if (!rowsByIdentity.has(identity)) {
      rowsByIdentity.set(identity, row);
    }
  }
  return [...rowsByIdentity.values()];
}

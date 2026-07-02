import type { ImportPreviewRow, ParsedImportClaim, ParsedImportMovement } from "./types";

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

export function reconcileImportRows(rows: ImportPreviewRow[]) {
  const byBfsNo = new Map<string, ParsedImportClaim>();
  const byInvoiceNo = new Map<string, ParsedImportClaim>();

  rows.forEach((row) => {
    row.parsedClaims?.forEach((claim) => {
      if (claim.bfsNo) byBfsNo.set(claim.bfsNo, claim);
      if (claim.invoiceNo) byInvoiceNo.set(claim.invoiceNo, claim);
    });
  });

  return rows.map((row) => {
    const parsedMovements: ParsedImportMovement[] | undefined = row.parsedMovements?.map((movement) => {
      const matchedClaim = findMovementClaim(movement, byBfsNo, byInvoiceNo);
      const patientName = matchedClaim?.patientName ?? movement.patientName;
      const matchStatus: ParsedImportMovement["matchStatus"] = matchedClaim
        ? "matched_claim"
        : patientName ? "patient_from_kontoauszug" : "unmatched";

      return {
        ...movement,
        patientName,
        matchedStatementNo: matchedClaim?.sourceStatementNo ?? movement.matchedStatementNo,
        matchedStatementDate: matchedClaim?.sourceStatementDate ?? movement.matchedStatementDate,
        matchedFile: matchedClaim?.sourceFile ?? movement.matchedFile,
        matchStatus
      };
    });
    const enrichedRow = { ...row, parsedMovements };
    return {
      ...enrichedRow,
      parseNotes: addMatchingNotes(enrichedRow)
    };
  });
}

function findMovementClaim(
  movement: ParsedImportMovement,
  byBfsNo: Map<string, ParsedImportClaim>,
  byInvoiceNo: Map<string, ParsedImportClaim>
) {
  if (movement.bfsNo) {
    const claim = byBfsNo.get(movement.bfsNo);
    if (claim) return claim;
  }
  if (movement.invoiceNo) {
    return byInvoiceNo.get(movement.invoiceNo);
  }
  return undefined;
}

function addMatchingNotes(row: ImportPreviewRow) {
  const notes = row.parseNotes ?? [];
  const relevantMovements = row.parsedMovements?.filter(isRelevantDeductionMovement) ?? [];
  if (!relevantMovements.length) return notes;

  const unmatched = relevantMovements.filter((movement) => movement.matchStatus === "unmatched").length;
  const matched = relevantMovements.length - unmatched;
  const matchingNote = unmatched
    ? `${matched} Rückgaben/Stornos gematcht, ${unmatched} brauchen historische Abrechnung.`
    : `${matched} Rückgaben/Stornos mit Patient und Grund zugeordnet.`;

  return [...notes.filter((note) => !note.includes("Rückgaben/Stornos")), matchingNote];
}

function isRelevantDeductionMovement(movement: ParsedImportMovement) {
  if (["regulierung", "abrechnungsumsatz"].includes(movement.reasonCategory ?? "")) return false;
  if (movement.reasonCategory) return true;
  const type = movement.type.toLowerCase();
  const reason = `${movement.reason ?? ""} ${movement.rawText ?? ""}`.toLowerCase();
  return type.includes("storno")
    || reason.includes("storno")
    || type.includes("rueckgabe")
    || type.includes("rueckbelastung");
}

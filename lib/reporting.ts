import type { BfsCase } from "./types";

export function createCasesCsv(cases: BfsCase[]) {
  const header = ["Standort", "Patient", "Rechnungsnummer", "BFS-Nr.", "Betrag", "Grund", "Alter Tage", "Status", "Kommentar", "Wenn storniert: in der Praxissoftware ausgebucht?"];
  const rows = cases.map((fall) => [
    fall.locationName,
    fall.patientName,
    fall.invoiceNo,
    fall.bfsNo,
    String(fall.amount).replace(".", ","),
    fall.reason,
    String(fall.ageDays),
    fall.status,
    "",
    ""
  ]);
  return [header, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\n");
}

export function downloadTextFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string) {
  if (/[;"\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

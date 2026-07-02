import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

type SuspiciousLine = {
  id: string;
  invoice_id: string;
  code: string;
  description: string;
  factor: number | null;
  amount: number;
  sort_order: number;
};

type InvoiceRow = {
  id: string;
  original_filename: string;
  bfs_nr: string;
  mandant_nr: string;
  rechnungsnummer: string;
  rechnungsdatum: string;
  patient_name: string;
  praxisname: string;
};

loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase-Zugang fehlt.");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const lines = await fetchSuspiciousLines();
const chosen = pickExamples(lines, 4);
const invoiceIds = [...new Set(chosen.map((line) => line.invoice_id))];

const { data: invoices, error } = await supabase
  .from("bfs_patient_invoices")
  .select("id, original_filename, bfs_nr, mandant_nr, rechnungsnummer, rechnungsdatum, patient_name, praxisname")
  .in("id", invoiceIds);
if (error) throw new Error(error.message);

const invoiceById = new Map((invoices ?? []).map((invoice: InvoiceRow) => [invoice.id, invoice]));

console.log(JSON.stringify(chosen.map((line) => ({
  suspiciousCode: line.code,
  suspiciousDescription: line.description,
  suspiciousFactor: line.factor,
  suspiciousAmount: line.amount,
  sortOrder: line.sort_order,
  invoice: invoiceById.get(line.invoice_id)
})), null, 2));

async function fetchSuspiciousLines() {
  const result: SuspiciousLine[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("bfs_patient_invoice_lines")
      .select("id, invoice_id, code, description, factor, amount, sort_order")
      .eq("line_kind", "service")
      .eq("category", "leistung")
      .range(offset, offset + 999)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as SuspiciousLine[];
    result.push(...batch.filter((line) => isSuspicious(line)));
    if (batch.length < 1000) break;
    offset += 1000;
  }
  return result;
}

function isSuspicious(line: SuspiciousLine) {
  const code = String(line.code ?? "").trim();
  const factor = Number(line.factor ?? 0);
  return !/^(?:\d{3,4}[a-z]?|Ä\d{3,4}[a-z]?)$/i.test(code) || factor > 15;
}

function pickExamples(lines: SuspiciousLine[], count: number) {
  const preferredCodes = ["15", "24", "26", "25", "45", "41", "2"];
  const picked: SuspiciousLine[] = [];
  for (const code of preferredCodes) {
    const line = lines.find((entry) => entry.code === code && !picked.some((pickedLine) => pickedLine.invoice_id === entry.invoice_id));
    if (line) picked.push(line);
    if (picked.length >= count) return picked;
  }
  for (const line of lines) {
    if (!picked.some((pickedLine) => pickedLine.invoice_id === line.invoice_id)) picked.push(line);
    if (picked.length >= count) break;
  }
  return picked;
}

function loadEnvFile(file: string) {
  try {
    const text = readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    return;
  }
}

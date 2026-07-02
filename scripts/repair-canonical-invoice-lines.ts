import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

type InvoiceLine = {
  id: string;
  code: string | null;
  description: string | null;
  factor: number | null;
  category: string | null;
  line_kind: string | null;
};

loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase-Zugang fehlt.");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

let scanned = 0;
let codeUpdated = 0;
let movedToExpense = 0;
let offset = 0;

while (true) {
  const { data, error } = await supabase
    .from("bfs_patient_invoice_lines")
    .select("id, code, description, factor, category, line_kind")
    .eq("line_kind", "service")
    .range(offset, offset + 999)
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as InvoiceLine[];
  if (!rows.length) break;

  for (const row of rows) {
    scanned += 1;
    const currentCode = String(row.code ?? "").trim();
    const description = String(row.description ?? "").trim();
    const factor = row.factor === null || row.factor === undefined ? null : Number(row.factor);
    const nextCode = normalizeLineServiceCode(currentCode, description);
    const nextCategory = isFeeServiceCode(nextCode) && (factor === null || factor <= 15) ? row.category : "auslage";
    const update: Record<string, string> = {};

    if (nextCode && nextCode !== currentCode) {
      update.code = nextCode;
      codeUpdated += 1;
    }
    if (row.category === "leistung" && nextCategory === "auslage") {
      update.category = "auslage";
      movedToExpense += 1;
    }

    if (Object.keys(update).length) {
      const { error: updateError } = await supabase
        .from("bfs_patient_invoice_lines")
        .update(update)
        .eq("id", row.id);
      if (updateError) throw new Error(updateError.message);
    }
  }

  if (rows.length < 1000) break;
  offset += 1000;
  if (scanned % 5000 === 0) console.log(`Zeilen geprüft: ${scanned}`);
}

const verification = await verifyInvoiceLines();

console.log(JSON.stringify({
  scanned,
  codeUpdated,
  movedToExpense,
  verification
}, null, 2));

function normalizeServiceCode(code: string) {
  return code.trim().replace(/^Ä0*(\d+[a-z]?)$/i, "Ä$1");
}

function normalizeLineServiceCode(code: string, description: string) {
  const bemaCode = description.match(/\b(13[A-Z]0)\b/i)?.[1];
  if (bemaCode) return bemaCode.toUpperCase();
  const leadingFeeCode = description.match(/^\s*(Ä?\d{3,4}[a-z]?)(?:-\d+)?\b/i)?.[1];
  return leadingFeeCode ? normalizeServiceCode(leadingFeeCode) : normalizeServiceCode(code);
}

function isFeeServiceCode(code: string) {
  return /^(?:\d{3,4}[a-z]?|13[A-Z]0|Ä\d{1,4}[a-z]?)$/i.test(normalizeServiceCode(code));
}

async function verifyInvoiceLines() {
  let verifyOffset = 0;
  let totalPerformanceLines = 0;
  let suspiciousPerformanceLines = 0;
  const examples: Array<{ code: string; description: string; factor: number | null }> = [];

  while (true) {
    const { data, error } = await supabase
      .from("bfs_patient_invoice_lines")
      .select("code, description, factor, category, line_kind")
      .eq("line_kind", "service")
      .eq("category", "leistung")
      .range(verifyOffset, verifyOffset + 999);
    if (error) throw new Error(error.message);
    const lines = data ?? [];
    for (const line of lines) {
      totalPerformanceLines += 1;
      const code = String(line.code ?? "");
      const factor = line.factor === null || line.factor === undefined ? null : Number(line.factor);
      if (!isFeeServiceCode(code) || (factor !== null && factor > 15)) {
        suspiciousPerformanceLines += 1;
        if (examples.length < 20) examples.push({
          code,
          description: String(line.description ?? ""),
          factor
        });
      }
    }
    if (lines.length < 1000) break;
    verifyOffset += 1000;
  }

  return { totalPerformanceLines, suspiciousPerformanceLines, examples };
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

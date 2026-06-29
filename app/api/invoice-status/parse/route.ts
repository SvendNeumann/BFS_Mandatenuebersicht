import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { standorte as appStandorte } from "@/lib/demo-data";
import { parseInvoiceStatusPdfBytes } from "@/lib/invoice-status-parser";
import { createServiceClient, getRequestProfile, requireSuperAdmin } from "@/lib/server-auth";
import type { ParsedInvoiceStatusDocument, ParsedInvoiceStatusRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupabaseDbClient = SupabaseClient;

export async function GET() {
  try {
    const auth = await getRequestProfile();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "Supabase Service-Client ist nicht konfiguriert." }, { status: 500 });

    const { data, error } = await supabase
      .from("audit_log")
      .select("new_value, created_at")
      .eq("action", "invoice_status_import_confirmed")
      .eq("entity_type", "invoice_status_import")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const payload = parseStoredInvoiceStatusPayload(data?.[0]?.new_value);
    const allowedStandortIds = await readableStandortIds(supabase, auth.profile.id, auth.profile.role);
    const documents = auth.profile.role === "super_admin"
      ? payload.documents
      : filterInvoiceStatusDocumentsByStandort(payload.documents, allowedStandortIds);

    return NextResponse.json({ documents, confirmedAt: payload.confirmedAt }, { headers: noStoreHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rechnungsstatus konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  const paths = formData.getAll("paths").map((entry) => String(entry));

  if (!files.length) {
    return NextResponse.json({ error: "Keine Rechnungsstatus-PDFs im Upload gefunden." }, { status: 400 });
  }

  const documents = [];
  const errors: Array<{ file: string; message: string }> = [];

  for (const [index, file] of files.entries()) {
    const filePath = paths[index] || file.name;
    try {
      const bytes = await file.arrayBuffer();
      documents.push(await parseInvoiceStatusPdfBytes(bytes, {
        file: filePath,
        fileSizeBytes: file.size
      }));
    } catch (error) {
      errors.push({
        file: filePath,
        message: error instanceof Error ? error.message : "Rechnungsstatus-Liste konnte nicht gelesen werden."
      });
    }
  }

  return NextResponse.json({
    documents,
    persistence: {
      parsed: documents.reduce((sum, document) => sum + document.rows.length, 0),
      failed: errors.length,
      errors
    }
  });
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "Supabase Service-Client ist nicht konfiguriert." }, { status: 500 });

    const body = await request.json() as { documents?: unknown[] };
    const documents = Array.isArray(body?.documents) ? body.documents.filter(isParsedInvoiceStatusDocument) : [];
    const rowCount = documents.reduce((sum, document) => sum + document.rows.length, 0);
    const payload = {
      documents,
      confirmedAt: new Date().toISOString(),
      confirmedBy: auth.profile.id,
      rowCount
    };

    const { error } = await supabase.from("audit_log").insert({
      user_id: auth.profile.id,
      action: "invoice_status_import_confirmed",
      entity_type: "invoice_status_import",
      entity_id: null,
      old_value: null,
      new_value: payload,
      reason: `${rowCount} Rechnungsstatus-Zeilen bestätigt`
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ documents, confirmedAt: payload.confirmedAt }, { headers: noStoreHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Saldo-Import konnte nicht bestätigt werden." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const auth = await requireSuperAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "Supabase Service-Client ist nicht konfiguriert." }, { status: 500 });

    const payload = {
      documents: [],
      confirmedAt: new Date().toISOString(),
      confirmedBy: auth.profile.id,
      rowCount: 0,
      reset: true
    };

    const { error } = await supabase.from("audit_log").insert({
      user_id: auth.profile.id,
      action: "invoice_status_import_confirmed",
      entity_type: "invoice_status_import",
      entity_id: null,
      old_value: null,
      new_value: payload,
      reason: "Rechnungsstatus-Datenstand zurückgesetzt"
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ documents: [], confirmedAt: payload.confirmedAt }, { headers: noStoreHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Saldo-Import konnte nicht zurückgesetzt werden." },
      { status: 500 }
    );
  }
}

function parseStoredInvoiceStatusPayload(value: unknown) {
  const entry = value && typeof value === "object" ? value as { documents?: unknown; confirmedAt?: unknown } : {};
  const documents = Array.isArray(entry.documents) ? entry.documents.filter(isParsedInvoiceStatusDocument) : [];
  return {
    documents,
    confirmedAt: typeof entry.confirmedAt === "string" ? entry.confirmedAt : ""
  };
}

function filterInvoiceStatusDocumentsByStandort(documents: ParsedInvoiceStatusDocument[], allowedStandortIds: Set<string>) {
  return documents
    .map((document) => ({
      ...document,
      rows: document.rows.filter((row) => {
        const standort = standortFromMandantNo(row.mandantNo);
        return standort ? allowedStandortIds.has(standort.id) : false;
      })
    }))
    .filter((document) => document.rows.length);
}

async function readableStandortIds(supabase: SupabaseDbClient, userId: string, role: string) {
  if (role === "super_admin") return new Set(appStandorte.map((standort) => standort.id));
  const { data, error } = await supabase.from("user_standorte").select("standort_id").eq("user_id", userId);
  if (error) throw error;
  const dbStandortIds = (data ?? []).map((entry: { standort_id: string }) => entry.standort_id).filter(Boolean);
  if (!dbStandortIds.length) return new Set<string>();
  const { data: standortRows, error: standortError } = await supabase.from("standorte").select("id, name").in("id", dbStandortIds);
  if (standortError) throw standortError;
  const ids = new Set<string>();
  (standortRows ?? []).forEach((row: { name: string }) => {
    const appStandort = appStandorte.find((standort) => standort.name === row.name);
    if (appStandort) ids.add(appStandort.id);
  });
  return ids;
}

function standortFromMandantNo(mandantNo: string) {
  return appStandorte.find((standort) => [standort.mandantNo, ...(standort.mandantNos ?? [])].includes(mandantNo));
}

function isParsedInvoiceStatusDocument(value: unknown): value is ParsedInvoiceStatusDocument {
  const document = value as Partial<ParsedInvoiceStatusDocument> | null;
  return !!document
    && typeof document.file === "string"
    && typeof document.fileSizeBytes === "number"
    && Array.isArray(document.rows)
    && document.rows.every(isParsedInvoiceStatusRow);
}

function isParsedInvoiceStatusRow(value: unknown): value is ParsedInvoiceStatusRow {
  const row = value as Partial<ParsedInvoiceStatusRow> | null;
  return !!row
    && typeof row.mandantNo === "string"
    && typeof row.bfsNo === "string"
    && typeof row.patientName === "string"
    && typeof row.invoiceNo === "string"
    && typeof row.amount === "number"
    && typeof row.saldo === "number";
}

function noStoreHeaders() {
  return {
    "cache-control": "no-store, max-age=0"
  };
}

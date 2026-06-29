import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { standorte as appStandorte } from "@/lib/demo-data";
import { createServiceClient, getRequestProfile } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ManualCaseResolution = {
  caseKey: string;
  standortId: string;
  patientName: string;
  invoiceNo: string;
  bfsNo: string;
  amount: number;
  reason: string;
  status: "paid_manual" | "resubmitted_manual" | "open_manual" | "cancelled_manual";
  comment: string;
  resolvedAt: string;
  resolvedBy: string;
};

type SupabaseDbClient = SupabaseClient;

export async function GET() {
  try {
    const auth = await getRequestProfile();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "Supabase Service-Client ist nicht konfiguriert." }, { status: 500 });

    const allowedStandortIds = await readableStandortIds(supabase, auth.profile.id, auth.profile.role);
    const { data, error } = await supabase
      .from("audit_log")
      .select("new_value, created_at")
      .eq("action", "manual_case_resolved")
      .eq("entity_type", "bfs_case_resolution")
      .order("created_at", { ascending: false })
      .limit(10000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const byKey = new Map<string, ManualCaseResolution>();
    (data ?? []).forEach((entry: { new_value: unknown }) => {
      const resolution = parseResolution(entry.new_value);
      if (!resolution) return;
      if (!allowedStandortIds.has(resolution.standortId)) return;
      if (!byKey.has(resolution.caseKey)) byKey.set(resolution.caseKey, resolution);
    });

    return NextResponse.json({ resolutions: [...byKey.values()] }, { headers: noStoreHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erledigungen konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestProfile();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "Supabase Service-Client ist nicht konfiguriert." }, { status: 500 });

    const body = await request.json();
    const resolution = normalizeResolution(body, auth.profile.id);
    const allowedStandortIds = await writableStandortIds(supabase, auth.profile.id, auth.profile.role);
    if (!allowedStandortIds.has(resolution.standortId)) {
      return NextResponse.json({ error: "Keine Berechtigung für diesen Standort." }, { status: 403 });
    }

    const existingResolution = await findLatestResolutionForCase(supabase, resolution.caseKey);
    if (existingResolution?.status === resolution.status) {
      if (resolution.status === "paid_manual" || resolution.status === "resubmitted_manual" || resolution.status === "cancelled_manual") await markMatchingDatabaseCasesResolved(supabase, existingResolution, auth.profile.id);
      return NextResponse.json({ resolution: existingResolution, duplicate: true }, { headers: noStoreHeaders() });
    }

    const { error: auditError } = await supabase.from("audit_log").insert({
      user_id: auth.profile.id,
      action: "manual_case_resolved",
      entity_type: "bfs_case_resolution",
      entity_id: null,
      old_value: null,
      new_value: resolution,
      reason: resolution.comment
    });

    if (auditError) return NextResponse.json({ error: auditError.message }, { status: 500 });

    if (resolution.status === "paid_manual" || resolution.status === "resubmitted_manual" || resolution.status === "cancelled_manual") await markMatchingDatabaseCasesResolved(supabase, resolution, auth.profile.id);
    return NextResponse.json({ resolution }, { headers: noStoreHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Klärfall konnte nicht erledigt werden." },
      { status: 500 }
    );
  }
}

async function findLatestResolutionForCase(supabase: SupabaseDbClient, caseKey: string) {
  const { data, error } = await supabase
    .from("audit_log")
    .select("new_value, created_at")
    .eq("action", "manual_case_resolved")
    .eq("entity_type", "bfs_case_resolution")
    .contains("new_value", { caseKey })
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return parseResolution(data?.[0]?.new_value);
}

function normalizeResolution(value: unknown, userId: string): ManualCaseResolution {
  const entry = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const caseKey = stringValue(entry.caseKey);
  const standortId = stringValue(entry.standortId);
  if (!caseKey || !standortId) throw new Error("Klärfall-Schlüssel oder Standort fehlt.");
  return {
    caseKey,
    standortId,
    patientName: stringValue(entry.patientName) || "Patient noch nicht gematcht",
    invoiceNo: stringValue(entry.invoiceNo) || "-",
    bfsNo: stringValue(entry.bfsNo) || "-",
    amount: Number(entry.amount) || 0,
    reason: stringValue(entry.reason) || "Manuell erledigt",
    status: normalizeResolutionStatus(entry.status),
    comment: stringValue(entry.comment) || defaultResolutionComment(entry.status),
    resolvedAt: new Date().toISOString(),
    resolvedBy: userId
  };
}

function parseResolution(value: unknown): ManualCaseResolution | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<ManualCaseResolution>;
  if (!entry.caseKey || !entry.standortId || !["paid_manual", "resubmitted_manual", "open_manual", "cancelled_manual"].includes(entry.status ?? "")) return null;
  return entry as ManualCaseResolution;
}

async function markMatchingDatabaseCasesResolved(supabase: SupabaseDbClient, resolution: ManualCaseResolution, userId: string) {
  const databaseStandortId = await databaseStandortIdForAppId(supabase, resolution.standortId);
  let query = supabase
    .from("bfs_cases")
    .update({
      status: "erledigt_manuell",
      resolved_at: resolution.resolvedAt,
      resolved_by: userId,
      resolution_reason: resolution.status === "cancelled_manual" ? "rechnung_wird_nicht_weiterverfolgt" : resolution.status === "resubmitted_manual" ? "neue_rechnung" : "direktzahlung_patient",
      resolution_comment: resolution.comment
    })
    .eq("standort_id", databaseStandortId)
    .eq("patient_name", resolution.patientName)
    .eq("amount", resolution.amount)
    .neq("status", "erledigt_manuell");

  if (resolution.invoiceNo && resolution.invoiceNo !== "-") query = query.eq("rechnungsnummer", resolution.invoiceNo);
  if (resolution.bfsNo && resolution.bfsNo !== "-") query = query.eq("bfs_nr", resolution.bfsNo);
  const { error } = await query;
  if (error) throw error;
}

function normalizeResolutionStatus(value: unknown): ManualCaseResolution["status"] {
  if (value === "open_manual") return "open_manual";
  if (value === "cancelled_manual") return "cancelled_manual";
  if (value === "resubmitted_manual") return "resubmitted_manual";
  return "paid_manual";
}

function defaultResolutionComment(status: unknown) {
  if (status === "open_manual") return "Manuell geprüft: weiterhin offen.";
  if (status === "cancelled_manual") return "Manuell geprüft: endgültig storniert.";
  if (status === "resubmitted_manual") return "Manuell geprüft: neu eingereicht.";
  return "Manuell geprüft: bezahlt.";
}

async function readableStandortIds(supabase: SupabaseDbClient, userId: string, role: string) {
  if (role === "super_admin") return allStandortIds(supabase);
  return assignedStandortIds(supabase, userId);
}

async function writableStandortIds(supabase: SupabaseDbClient, userId: string, role: string) {
  if (role === "super_admin") return allStandortIds(supabase);
  return assignedStandortIds(supabase, userId);
}

async function allStandortIds(supabase: SupabaseDbClient) {
  const { data, error } = await supabase.from("standorte").select("id, name").eq("active", true);
  if (error) throw error;
  return allowedStandortIdsFromRows(data ?? []);
}

async function assignedStandortIds(supabase: SupabaseDbClient, userId: string) {
  const { data, error } = await supabase.from("user_standorte").select("standort_id").eq("user_id", userId);
  if (error) throw error;
  const dbStandortIds = (data ?? []).map((entry: { standort_id: string }) => entry.standort_id).filter(Boolean);
  if (!dbStandortIds.length) return new Set<string>();
  const { data: standortRows, error: standortError } = await supabase.from("standorte").select("id, name").in("id", dbStandortIds);
  if (standortError) throw standortError;
  return allowedStandortIdsFromRows(standortRows ?? []);
}

function allowedStandortIdsFromRows(rows: Array<{ id: string; name: string }>) {
  const ids = new Set<string>();
  rows.forEach((row) => {
    ids.add(row.id);
    const appStandort = appStandorte.find((standort) => standort.name === row.name);
    if (appStandort) ids.add(appStandort.id);
  });
  return ids;
}

async function databaseStandortIdForAppId(supabase: SupabaseDbClient, standortId: string) {
  if (isUuid(standortId)) return standortId;
  const appStandort = appStandorte.find((standort) => standort.id === standortId);
  if (!appStandort) return standortId;
  const { data, error } = await supabase
    .from("standorte")
    .select("id")
    .eq("name", appStandort.name)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? standortId;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function noStoreHeaders() {
  return {
    "cache-control": "no-store, max-age=0"
  };
}

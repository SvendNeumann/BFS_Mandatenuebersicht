import { NextRequest, NextResponse } from "next/server";
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
  status: "paid_manual" | "open_manual";
  comment: string;
  resolvedAt: string;
  resolvedBy: string;
};

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
      if (resolution.status === "paid_manual") await markMatchingDatabaseCasesResolved(supabase, existingResolution, auth.profile.id);
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

    if (resolution.status === "paid_manual") await markMatchingDatabaseCasesResolved(supabase, resolution, auth.profile.id);
    return NextResponse.json({ resolution }, { headers: noStoreHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Klärfall konnte nicht erledigt werden." },
      { status: 500 }
    );
  }
}

async function findLatestResolutionForCase(supabase: any, caseKey: string) {
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

function normalizeResolution(value: any, userId: string): ManualCaseResolution {
  const caseKey = stringValue(value.caseKey);
  const standortId = stringValue(value.standortId);
  if (!caseKey || !standortId) throw new Error("Klärfall-Schlüssel oder Standort fehlt.");
  return {
    caseKey,
    standortId,
    patientName: stringValue(value.patientName) || "Patient noch nicht gematcht",
    invoiceNo: stringValue(value.invoiceNo) || "-",
    bfsNo: stringValue(value.bfsNo) || "-",
    amount: Number(value.amount) || 0,
    reason: stringValue(value.reason) || "Manuell erledigt",
    status: value.status === "open_manual" ? "open_manual" : "paid_manual",
    comment: stringValue(value.comment) || (value.status === "open_manual" ? "Manuell geprüft: weiterhin offen." : "Manuell geprüft: bezahlt."),
    resolvedAt: new Date().toISOString(),
    resolvedBy: userId
  };
}

function parseResolution(value: unknown): ManualCaseResolution | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<ManualCaseResolution>;
  if (!entry.caseKey || !entry.standortId || !["paid_manual", "open_manual"].includes(entry.status ?? "")) return null;
  return entry as ManualCaseResolution;
}

async function markMatchingDatabaseCasesResolved(supabase: any, resolution: ManualCaseResolution, userId: string) {
  let query = supabase
    .from("bfs_cases")
    .update({
      status: "erledigt_manuell",
      resolved_at: resolution.resolvedAt,
      resolved_by: userId,
      resolution_reason: "direktzahlung_patient",
      resolution_comment: resolution.comment
    })
    .eq("standort_id", resolution.standortId)
    .eq("patient_name", resolution.patientName)
    .eq("amount", resolution.amount)
    .neq("status", "erledigt_manuell");

  if (resolution.invoiceNo && resolution.invoiceNo !== "-") query = query.eq("rechnungsnummer", resolution.invoiceNo);
  if (resolution.bfsNo && resolution.bfsNo !== "-") query = query.eq("bfs_nr", resolution.bfsNo);
  const { error } = await query;
  if (error) throw error;
}

async function readableStandortIds(supabase: any, userId: string, role: string) {
  if (role === "super_admin") return allStandortIds(supabase);
  return assignedStandortIds(supabase, userId);
}

async function writableStandortIds(supabase: any, userId: string, role: string) {
  if (role === "super_admin") return allStandortIds(supabase);
  return assignedStandortIds(supabase, userId);
}

async function allStandortIds(supabase: any) {
  const { data } = await supabase.from("standorte").select("id").eq("active", true);
  return new Set((data ?? []).map((entry: { id: string }) => entry.id));
}

async function assignedStandortIds(supabase: any, userId: string) {
  const { data } = await supabase.from("user_standorte").select("standort_id").eq("user_id", userId);
  return new Set((data ?? []).map((entry: { standort_id: string }) => entry.standort_id));
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function noStoreHeaders() {
  return {
    "cache-control": "no-store, max-age=0"
  };
}

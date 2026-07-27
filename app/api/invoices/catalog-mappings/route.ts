import { NextResponse } from "next/server";
import { createServiceClient, getRequestProfile } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type InvoiceCatalogMapping = {
  sourceCode: string;
  sourceDescription?: string;
  targetCode: string;
  targetDescription: string;
  system: "GOZ" | "GOÄ" | "BEMA" | "Eigen" | "Ignorieren";
  action: "map" | "ignore";
  createdAt?: string;
  createdBy?: string;
};

export async function GET() {
  try {
    const auth = await getRequestProfile();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "Supabase Service-Client ist nicht konfiguriert." }, { status: 500 });

    const mappings = await loadMappings(supabase);
    return NextResponse.json({ mappings }, { headers: noStoreHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Katalog-Mappings konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getRequestProfile();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (!["super_admin", "abrechnungsmanagement"].includes(auth.profile.role)) {
      return NextResponse.json({ error: "Nur Super Admins und Abrechnungsmanagement dürfen Katalog-Mappings speichern." }, { status: 403 });
    }

    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "Supabase Service-Client ist nicht konfiguriert." }, { status: 500 });

    const mapping = normalizeMapping(await request.json().catch(() => null), auth.profile.id);
    const { error } = await supabase.from("audit_log").insert({
      user_id: auth.profile.id,
      action: "invoice_catalog_mapping_saved",
      entity_type: "invoice_catalog_mapping",
      entity_id: mappingKey(mapping),
      old_value: null,
      new_value: mapping,
      reason: mapping.action === "ignore" ? "Katalogposition ignoriert" : "Katalog-Mapping gespeichert"
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const mappings = await loadMappings(supabase);
    return NextResponse.json({ mapping, mappings }, { headers: noStoreHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Katalog-Mapping konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}

async function loadMappings(supabase: NonNullable<ReturnType<typeof createServiceClient>>) {
  const { data, error } = await supabase
    .from("audit_log")
    .select("new_value, created_at")
    .eq("action", "invoice_catalog_mapping_saved")
    .eq("entity_type", "invoice_catalog_mapping")
    .order("created_at", { ascending: false })
    .limit(10000);
  if (error) throw new Error(error.message);

  const byKey = new Map<string, InvoiceCatalogMapping>();
  (data ?? []).forEach((entry: { new_value: unknown; created_at?: string | null }) => {
    const mapping = parseMapping(entry.new_value);
    if (!mapping) return;
    if (!byKey.has(mappingKey(mapping))) byKey.set(mappingKey(mapping), { ...mapping, createdAt: mapping.createdAt ?? entry.created_at ?? undefined });
  });
  return [...byKey.values()];
}

function normalizeMapping(value: unknown, userId: string): InvoiceCatalogMapping {
  const entry = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const sourceCode = stringValue(entry.sourceCode);
  const targetCode = stringValue(entry.targetCode);
  const action = entry.action === "ignore" ? "ignore" : "map";
  if (!sourceCode) throw new Error("Originalnummer fehlt.");
  if (action === "map" && !targetCode) throw new Error("Zielnummer fehlt.");
  return {
    sourceCode,
    sourceDescription: stringValue(entry.sourceDescription) || undefined,
    targetCode: action === "ignore" ? sourceCode : targetCode,
    targetDescription: stringValue(entry.targetDescription) || stringValue(entry.sourceDescription) || targetCode || sourceCode,
    system: normalizeSystem(entry.system, action),
    action,
    createdAt: new Date().toISOString(),
    createdBy: userId
  };
}

function parseMapping(value: unknown): InvoiceCatalogMapping | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<InvoiceCatalogMapping>;
  if (!entry.sourceCode || !entry.targetCode || !entry.action) return null;
  if (!["GOZ", "GOÄ", "BEMA", "Eigen", "Ignorieren"].includes(entry.system ?? "")) return null;
  if (!["map", "ignore"].includes(entry.action)) return null;
  return entry as InvoiceCatalogMapping;
}

function normalizeSystem(value: unknown, action: InvoiceCatalogMapping["action"]): InvoiceCatalogMapping["system"] {
  if (action === "ignore") return "Ignorieren";
  if (value === "GOÄ" || value === "BEMA" || value === "Eigen") return value;
  return "GOZ";
}

function mappingKey(mapping: Pick<InvoiceCatalogMapping, "sourceCode" | "sourceDescription">) {
  return `${normalizeKey(mapping.sourceCode)}|${normalizeKey(mapping.sourceDescription ?? "")}`;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function noStoreHeaders() {
  return {
    "cache-control": "no-store, max-age=0"
  };
}

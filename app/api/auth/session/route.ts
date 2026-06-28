import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { standorte as appStandorte } from "@/lib/demo-data";
import { getRequestProfile, createServiceClient, createUserClient } from "@/lib/server-auth";

const accessCookie = "orisus_bfs_access_token";
const refreshCookie = "orisus_bfs_refresh_token";
const legacyAppSessionCookie = "orisus_bfs_app_session";

export async function GET() {
  const auth = await getRequestProfile();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const userClient = createUserClient(auth.accessToken);
  if (!userClient) return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  const assignmentClient = createServiceClient() ?? userClient;
  const standortIds = auth.profile.role === "standortleitung" ? await loadAssignedAppStandortIds(assignmentClient, auth.profile.id) : [];
  return NextResponse.json({
    session: {
      email: auth.profile.email,
      role: auth.profile.role,
      active: true,
      mustChangePassword: Boolean(auth.profile.must_change_password),
      standortIds
    }
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    remember?: boolean;
  } | null;

  if (!body?.accessToken || !body.refreshToken) {
    return NextResponse.json({ error: "Session tokens fehlen." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const maxAge = body.remember
    ? 60 * 60 * 24 * 30
    : Math.max(60, (body.expiresAt ?? Math.floor(Date.now() / 1000) + 60 * 60) - Math.floor(Date.now() / 1000));

  response.cookies.set(accessCookie, body.accessToken, sessionCookieOptions(maxAge));
  response.cookies.set(refreshCookie, body.refreshToken, sessionCookieOptions(body.remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7));
  response.cookies.set(legacyAppSessionCookie, "", sessionCookieOptions(0));
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(accessCookie, "", sessionCookieOptions(0));
  response.cookies.set(refreshCookie, "", sessionCookieOptions(0));
  response.cookies.set(legacyAppSessionCookie, "", sessionCookieOptions(0));
  return response;
}

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge
  };
}

async function loadAssignedAppStandortIds(userClient: SupabaseClient | null, userId: string) {
  if (!userClient) return [];
  const { data: assignments } = await userClient
    .from("user_standorte")
    .select("standort_id")
    .eq("user_id", userId);
  const dbIds = (assignments ?? []).map((entry: { standort_id: string }) => entry.standort_id).filter(Boolean);
  if (!dbIds.length) return [];
  const { data: rows } = await userClient
    .from("standorte")
    .select("id, name")
    .in("id", dbIds);
  return (rows ?? [])
    .map((row: { name: string | null }) => appStandorte.find((standort) => standort.name === row.name)?.id)
    .filter((id: string | undefined): id is string => Boolean(id));
}

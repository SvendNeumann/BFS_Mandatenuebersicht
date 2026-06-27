import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { appSessionCookie, createAppSession } from "@/lib/app-session";

const accessCookie = "orisus_bfs_access_token";
const refreshCookie = "orisus_bfs_refresh_token";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    email?: string;
    password?: string;
    remember?: boolean;
  } | null;

  const email = body?.email?.trim().toLowerCase();
  if (!email || !body?.password) {
    return NextResponse.json({ error: "E-Mail und Passwort sind erforderlich." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase Auth ist nicht konfiguriert." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: body.password });
  if (error || !data.user || !data.session?.access_token || !data.session.refresh_token) {
    const fallback = await trySuperAdminFallback(supabaseUrl, serviceRoleKey, email, body.password, Boolean(body.remember));
    if (fallback) return fallback;
    return NextResponse.json({ error: "Login fehlgeschlagen. Bitte E-Mail und Passwort prüfen." }, { status: 401 });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }
  });

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("email, role, active, must_change_password")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile?.active || (profile.role !== "super_admin" && profile.role !== "standortleitung")) {
    return NextResponse.json({ error: "Dieser Nutzer ist für den BFS Monitor nicht freigegeben." }, { status: 403 });
  }

  const response = NextResponse.json({
    session: {
      email: profile.email,
      role: profile.role,
      active: true,
      mustChangePassword: Boolean(profile.must_change_password)
    }
  });
  const maxAge = body.remember
    ? 60 * 60 * 24 * 30
    : Math.max(60, (data.session.expires_at ?? Math.floor(Date.now() / 1000) + 60 * 60) - Math.floor(Date.now() / 1000));

  response.cookies.set(accessCookie, data.session.access_token, sessionCookieOptions(maxAge));
  response.cookies.set(refreshCookie, data.session.refresh_token, sessionCookieOptions(body.remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7));
  response.cookies.set(appSessionCookie, "", sessionCookieOptions(0));
  return response;
}

async function trySuperAdminFallback(
  supabaseUrl: string,
  serviceRoleKey: string | undefined,
  email: string,
  password: string,
  remember: boolean
) {
  if (!serviceRoleKey) return null;

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await serviceClient.rpc("verify_super_admin_password", {
    candidate_email: email,
    candidate_password: password
  });
  const profile = Array.isArray(data) ? data[0] : null;
  if (error || !profile?.user_id || !profile.active || profile.role !== "super_admin") return null;

  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
  const expiresAt = Math.floor(Date.now() / 1000) + maxAge;
  const response = NextResponse.json({
    session: {
      email: profile.email,
      role: profile.role,
      active: true,
      mustChangePassword: Boolean(profile.must_change_password)
    }
  });
  response.cookies.set(appSessionCookie, createAppSession({
    userId: profile.user_id,
    email: profile.email,
    exp: expiresAt
  }), sessionCookieOptions(maxAge));
  response.cookies.set(accessCookie, "", sessionCookieOptions(0));
  response.cookies.set(refreshCookie, "", sessionCookieOptions(0));
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

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase Auth ist nicht konfiguriert." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: body.password });
  if (error || !data.user || !data.session?.access_token || !data.session.refresh_token) {
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

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const accessCookie = "orisus_bfs_access_token";
const refreshCookie = "orisus_bfs_refresh_token";

const superAdminPaths = ["/dashboard", "/importe", "/nutzer", "/reports", "/standorte"];
const standortPaths = ["/standort"];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!isProtectedPath(pathname)) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return redirectToLogin(request);

  const session = await resolveSession(request, supabaseUrl, supabaseAnonKey);
  if (!session.userId || !session.accessToken) return redirectToLogin(request, session.response);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.accessToken}` } }
  });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", session.userId)
    .maybeSingle();

  if (error || !profile?.active) return redirectToLogin(request, session.response);
  if (superAdminPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`)) && profile.role !== "super_admin") {
    return redirectToLogin(request, session.response);
  }
  if (standortPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`)) && !["super_admin", "standortleitung"].includes(profile.role)) {
    return redirectToLogin(request, session.response);
  }

  return session.response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/importe/:path*",
    "/nutzer/:path*",
    "/reports/:path*",
    "/standorte/:path*",
    "/standort/:path*"
  ]
};

function isProtectedPath(pathname: string) {
  return [...superAdminPaths, ...standortPaths].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

async function resolveSession(request: NextRequest, supabaseUrl: string, supabaseAnonKey: string) {
  const accessToken = request.cookies.get(accessCookie)?.value;
  const refreshToken = request.cookies.get(refreshCookie)?.value;
  const response = NextResponse.next();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  if (accessToken) {
    const { data } = await supabase.auth.getUser(accessToken);
    if (data.user) return { userId: data.user.id, accessToken, response };
  }

  if (!refreshToken) return { response };

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session?.access_token || !data.session.refresh_token || !data.user) return { response };

  const maxAge = Math.max(60, (data.session.expires_at ?? Math.floor(Date.now() / 1000) + 60 * 60) - Math.floor(Date.now() / 1000));
  response.cookies.set(accessCookie, data.session.access_token, sessionCookieOptions(maxAge));
  response.cookies.set(refreshCookie, data.session.refresh_token, sessionCookieOptions(60 * 60 * 24 * 30));
  return { userId: data.user.id, accessToken: data.session.access_token, response };
}

function redirectToLogin(request: NextRequest, response = NextResponse.next()) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
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

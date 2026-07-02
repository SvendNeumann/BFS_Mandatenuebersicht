import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const accessCookie = "orisus_bfs_access_token";
const refreshCookie = "orisus_bfs_refresh_token";

export type ServerProfile = {
  id: string;
  email: string;
  role: "super_admin" | "standortleitung" | "abrechnungsmanagement";
  active: boolean;
  must_change_password?: boolean;
};

export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function createUserClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
}

export async function getRequestProfile(): Promise<{ accessToken: string; profile: ServerProfile } | { error: string; status: number }> {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get(accessCookie)?.value;
  const refreshToken = cookieStore.get(refreshCookie)?.value;

  if (!accessToken && refreshToken) {
    const refreshed = await refreshServerSession(refreshToken);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      cookieStore.set(accessCookie, refreshed.accessToken, sessionCookieOptions(refreshed.accessMaxAge));
      cookieStore.set(refreshCookie, refreshed.refreshToken, sessionCookieOptions(60 * 60 * 24 * 30));
    }
  }

  if (!accessToken) return { error: "Nicht angemeldet.", status: 401 };

  const userClient = createUserClient(accessToken);
  if (!userClient) return { error: "Supabase ist nicht konfiguriert.", status: 500 };

  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if ((userError || !userData.user) && refreshToken) {
    const refreshed = await refreshServerSession(refreshToken);
    if (refreshed) {
      cookieStore.set(accessCookie, refreshed.accessToken, sessionCookieOptions(refreshed.accessMaxAge));
      cookieStore.set(refreshCookie, refreshed.refreshToken, sessionCookieOptions(60 * 60 * 24 * 30));
      const refreshedUserClient = createUserClient(refreshed.accessToken);
      if (!refreshedUserClient) return { error: "Supabase ist nicht konfiguriert.", status: 500 };
      const { data: refreshedUserData, error: refreshedUserError } = await refreshedUserClient.auth.getUser(refreshed.accessToken);
      if (!refreshedUserError && refreshedUserData.user) {
        accessToken = refreshed.accessToken;
        const { data: refreshedProfile, error: refreshedProfileError } = await refreshedUserClient
          .from("profiles")
          .select("id, email, role, active, must_change_password")
          .eq("id", refreshedUserData.user.id)
          .maybeSingle();

        if (refreshedProfileError || !refreshedProfile?.active) return { error: "Kein aktiver Zugriff.", status: 403 };
        if (!isServerRole(refreshedProfile.role)) return { error: "Rolle nicht freigegeben.", status: 403 };
        return { accessToken, profile: refreshedProfile as ServerProfile };
      }
    }
  }
  if (userError || !userData.user) return { error: "Session ungültig.", status: 401 };

  const { data: profile, error } = await userClient
    .from("profiles")
    .select("id, email, role, active, must_change_password")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error || !profile?.active) return { error: "Kein aktiver Zugriff.", status: 403 };
  if (!isServerRole(profile.role)) return { error: "Rolle nicht freigegeben.", status: 403 };
  return { accessToken, profile: profile as ServerProfile };
}

function isServerRole(role: string): role is ServerProfile["role"] {
  return role === "super_admin" || role === "standortleitung" || role === "abrechnungsmanagement";
}

async function refreshServerSession(refreshToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session?.access_token || !data.session.refresh_token) return null;
  const expiresAt = data.session.expires_at ?? Math.floor(Date.now() / 1000) + 60 * 60;
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    accessMaxAge: Math.max(60, expiresAt - Math.floor(Date.now() / 1000))
  };
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

export async function requireSuperAdmin() {
  const result = await getRequestProfile();
  if ("error" in result) return result;
  if (result.profile.role !== "super_admin") return { error: "Nur Super Admins dürfen diese Aktion ausführen.", status: 403 };
  return result;
}

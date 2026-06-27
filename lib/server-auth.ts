import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const accessCookie = "orisus_bfs_access_token";

export type ServerProfile = {
  id: string;
  email: string;
  role: "super_admin" | "standortleitung";
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
  const accessToken = cookieStore.get(accessCookie)?.value;

  if (!accessToken) return { error: "Nicht angemeldet.", status: 401 };

  const userClient = createUserClient(accessToken);
  if (!userClient) return { error: "Supabase ist nicht konfiguriert.", status: 500 };

  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData.user) return { error: "Session ungültig.", status: 401 };

  const { data: profile, error } = await userClient
    .from("profiles")
    .select("id, email, role, active, must_change_password")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error || !profile?.active) return { error: "Kein aktiver Zugriff.", status: 403 };
  if (profile.role !== "super_admin" && profile.role !== "standortleitung") return { error: "Rolle nicht freigegeben.", status: 403 };
  return { accessToken, profile: profile as ServerProfile };
}

export async function requireSuperAdmin() {
  const result = await getRequestProfile();
  if ("error" in result) return result;
  if (result.profile.role !== "super_admin") return { error: "Nur Super Admins dürfen diese Aktion ausführen.", status: 403 };
  return result;
}

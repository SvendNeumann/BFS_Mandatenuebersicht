import type { AppRole } from "./types";
import { supabase } from "./supabase";

const sessionKey = "orisus_bfs_monitor_session";

export type DemoSession = {
  email: string;
  role: AppRole;
  active: boolean;
  mustChangePassword?: boolean;
  standortIds?: string[];
  expiresAt: number;
};

export async function loginWithEmail(email: string, password: string, remember: boolean) {
  const serverSession = await loginWithServerAuth(email, password, remember);
  if (serverSession) return persistSession({ ...serverSession, expiresAt: expiresAt(remember) });

  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await loadProfile(data.user?.id);
    if (!profile?.active) throw new Error("Dieser Nutzer ist für den BFS Monitor nicht freigegeben.");
    if (!data.session?.access_token || !data.session.refresh_token) throw new Error("Supabase-Session konnte nicht erstellt werden.");
    await persistServerSession(data.session.access_token, data.session.refresh_token, data.session.expires_at, remember);
    return persistSession({ email: profile.email, role: profile.role, active: true, mustChangePassword: profile.mustChangePassword, standortIds: profile.standortIds, expiresAt: expiresAt(remember) });
  }

  throw new Error("Supabase Auth ist nicht konfiguriert.");
}

async function loginWithServerAuth(email: string, password: string, remember: boolean) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, remember })
  }).catch(() => null);

  if (!response) return null;
  const payload = await response.json().catch(() => null) as {
    session?: Omit<DemoSession, "expiresAt">;
    error?: string;
  } | null;

  if (response.ok && payload?.session) return payload.session;
  if (response.status === 404) return null;
  throw new Error(payload?.error ?? "Login fehlgeschlagen.");
}

export async function requestPasswordReset(email: string) {
  if (!supabase) {
    throw new Error("Supabase Auth ist nicht konfiguriert.");
  }
  await supabase.auth.resetPasswordForEmail(email);
}

export async function updateOwnPassword(newPassword: string) {
  if (!supabase) throw new Error("Supabase Auth ist nicht konfiguriert.");
  if (newPassword.length < 8) throw new Error("Das neue Passwort muss mindestens 8 Zeichen haben.");
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;

  const response = await fetch("/api/auth/complete-password-change", { method: "POST" });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? "Passwortwechsel konnte nicht abgeschlossen werden.");
  }

  const session = getStoredSession();
  if (session) persistSession({ ...session, mustChangePassword: false });
}

export function getStoredSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(sessionKey);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as DemoSession;
    if (!session.active || session.expiresAt < Date.now()) {
      logout();
      return null;
    }
    return session;
  } catch {
    window.localStorage.removeItem(sessionKey);
    return null;
  }
}

export const getDemoSession = getStoredSession;

export async function getCurrentSession(): Promise<DemoSession | null> {
  const stored = getStoredSession();
  if (stored?.role === "super_admin" || (stored && Array.isArray(stored.standortIds))) return stored;
  const serverSession = await loadServerSession().catch(() => null);
  if (serverSession) return persistSession({ ...serverSession, expiresAt: stored?.expiresAt ?? expiresAt(true) });
  if (stored) return stored;
  if (!supabase) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;
  const profile = await loadProfile(userId);
  if (!profile?.active) return null;
  return persistSession({ email: profile.email, role: profile.role, active: true, mustChangePassword: profile.mustChangePassword, standortIds: profile.standortIds, expiresAt: expiresAt(true) });
}

export async function logout() {
  if (supabase) await supabase.auth.signOut();
  await clearServerSession();
  if (typeof window !== "undefined") window.localStorage.removeItem(sessionKey);
}

export function canUsePasskeys() {
  return typeof window !== "undefined" && "PublicKeyCredential" in window && window.isSecureContext;
}

export function hasSavedPasskey() {
  return false;
}

export async function enablePasskey() {
  throw new Error("Biometrischer Login ist noch nicht produktiv aktiviert.");
}

export function removePasskey() {
  return;
}

export async function loginWithPasskey(): Promise<DemoSession> {
  throw new Error("Biometrischer Login ist noch nicht produktiv aktiviert.");
}

function persistSession(session: DemoSession) {
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
  return session;
}

function expiresAt(remember: boolean) {
  return Date.now() + (remember ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 8);
}

async function loadProfile(userId: string | undefined) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("email, role, active, must_change_password")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || (data.role !== "super_admin" && data.role !== "standortleitung")) return null;
  const standortIds = data.role === "standortleitung" ? await loadProfileStandortIds(userId) : [];
  return {
    email: data.email,
    role: data.role,
    active: data.active,
    mustChangePassword: Boolean(data.must_change_password),
    standortIds
  } as { email: string; role: AppRole; active: boolean; mustChangePassword: boolean; standortIds: string[] };
}

async function loadProfileStandortIds(userId: string) {
  if (!supabase) return [];
  const { data: assignments } = await supabase
    .from("user_standorte")
    .select("standort_id")
    .eq("user_id", userId);
  const dbIds = (assignments ?? []).map((entry: { standort_id: string }) => entry.standort_id).filter(Boolean);
  if (!dbIds.length) return [];
  const { data: rows } = await supabase
    .from("standorte")
    .select("id, name")
    .in("id", dbIds);
  return mapDatabaseStandorteToAppIds(rows ?? []);
}

async function loadServerSession() {
  const response = await fetch("/api/auth/session", { method: "GET" }).catch(() => null);
  if (!response?.ok) return null;
  const payload = await response.json().catch(() => null) as { session?: Omit<DemoSession, "expiresAt"> } | null;
  return payload?.session ?? null;
}

function mapDatabaseStandorteToAppIds(rows: Array<{ name?: string | null }>) {
  const appStandorte = [
    { id: "kirchberg", name: "Kirchberg" },
    { id: "essen", name: "Essen" },
    { id: "kehl", name: "Kehl" },
    { id: "ulmet", name: "Ulmet" },
    { id: "huettenberg", name: "Hüttenberg" },
    { id: "kassel", name: "Kassel" }
  ];
  return rows
    .map((row) => appStandorte.find((standort) => standort.name === row.name)?.id)
    .filter((id): id is string => Boolean(id));
}

async function persistServerSession(accessToken: string, refreshToken: string, expiresAtSeconds: number | undefined, remember: boolean) {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accessToken, refreshToken, expiresAt: expiresAtSeconds, remember })
  });
  if (!response.ok) throw new Error("Server-Session konnte nicht gespeichert werden.");
}

async function clearServerSession() {
  if (typeof window === "undefined") return;
  await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
}

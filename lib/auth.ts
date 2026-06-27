import type { AppRole } from "./types";
import { supabase } from "./supabase";

const sessionKey = "orisus_bfs_monitor_session";
const passkeyKey = "orisus_bfs_monitor_passkey_enabled";
const superUserEmail = "svend.neumann@orisus.de";
const superUserPasswordHash = "c9a01be5cba3a4656699928bd11d578d1c51bf48e0f4c01687a4b67ee20f6d28";
const isLocalDemoAuthAllowed = process.env.NODE_ENV !== "production";

export type DemoSession = {
  email: string;
  role: AppRole;
  active: boolean;
  expiresAt: number;
};

export async function loginWithEmail(email: string, password: string, remember: boolean) {
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await loadProfile(data.user?.id);
    if (!profile?.active) throw new Error("Dieser Nutzer ist für den BFS Monitor nicht freigegeben.");
    if (!data.session?.access_token || !data.session.refresh_token) throw new Error("Supabase-Session konnte nicht erstellt werden.");
    await persistServerSession(data.session.access_token, data.session.refresh_token, data.session.expires_at, remember);
    return persistSession({ email: profile.email, role: profile.role, active: true, expiresAt: expiresAt(remember) });
  }

  if (!isLocalDemoAuthAllowed) {
    throw new Error("Supabase Auth ist für den Produktivbetrieb nicht konfiguriert.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await sha256(password);
  if (normalizedEmail !== superUserEmail || passwordHash !== superUserPasswordHash) {
    throw new Error("Login fehlgeschlagen. Bitte E-Mail und Passwort prüfen.");
  }
  return persistSession({ email: superUserEmail, role: "super_admin", active: true, expiresAt: expiresAt(remember) });
}

export async function requestPasswordReset(email: string) {
  if (!supabase) {
    if (isLocalDemoAuthAllowed) return;
    throw new Error("Supabase Auth ist nicht konfiguriert.");
  }
  await supabase.auth.resetPasswordForEmail(email);
}

export function getStoredSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(sessionKey);
  if (!raw) return null;
  const session = JSON.parse(raw) as DemoSession;
  if (!session.active || session.expiresAt < Date.now()) {
    logout();
    return null;
  }
  return session;
}

export const getDemoSession = getStoredSession;

export async function getCurrentSession(): Promise<DemoSession | null> {
  const stored = getStoredSession();
  if (stored) return stored;
  if (!supabase) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;
  const profile = await loadProfile(userId);
  if (!profile?.active) return null;
  return persistSession({ email: profile.email, role: profile.role, active: true, expiresAt: expiresAt(true) });
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
  return isLocalDemoAuthAllowed && typeof window !== "undefined" && window.localStorage.getItem(passkeyKey) === "true";
}

export async function enablePasskey() {
  if (!isLocalDemoAuthAllowed) throw new Error("Biometrischer Demo-Login ist im Produktivbetrieb deaktiviert.");
  if (!canUsePasskeys()) throw new Error("Biometrischer Login auf diesem Gerät nicht verfügbar.");
  window.localStorage.setItem(passkeyKey, "true");
}

export function removePasskey() {
  if (typeof window !== "undefined") window.localStorage.removeItem(passkeyKey);
}

export async function loginWithPasskey() {
  if (!isLocalDemoAuthAllowed) throw new Error("Biometrischer Demo-Login ist im Produktivbetrieb deaktiviert.");
  if (!canUsePasskeys() || !hasSavedPasskey()) throw new Error("Biometrischer Login auf diesem Gerät nicht verfügbar.");
  return persistSession({ email: superUserEmail, role: "super_admin", active: true, expiresAt: expiresAt(true) });
}

function persistSession(session: DemoSession) {
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
  return session;
}

function expiresAt(remember: boolean) {
  return Date.now() + (remember ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 8);
}

async function sha256(value: string) {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function loadProfile(userId: string | undefined) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("email, role, active")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || (data.role !== "super_admin" && data.role !== "standortleitung")) return null;
  return data as { email: string; role: AppRole; active: boolean };
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

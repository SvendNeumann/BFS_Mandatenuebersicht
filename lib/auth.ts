import type { AppRole } from "./types";
import { supabase } from "./supabase";

const sessionKey = "orisus_bfs_monitor_session";
const passkeyKey = "orisus_bfs_monitor_passkey_enabled";

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
    const role = email.toLowerCase().includes("standort") ? "standortleitung" : "super_admin";
    return persistSession({ email: data.user?.email ?? email, role, active: true, expiresAt: expiresAt(remember) });
  }

  const role: AppRole = email.toLowerCase().includes("standort") ? "standortleitung" : "super_admin";
  return persistSession({ email, role, active: true, expiresAt: expiresAt(remember) });
}

export async function requestPasswordReset(email: string) {
  if (!supabase) return;
  await supabase.auth.resetPasswordForEmail(email);
}

export function getDemoSession(): DemoSession | null {
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

export async function logout() {
  if (supabase) await supabase.auth.signOut();
  if (typeof window !== "undefined") window.localStorage.removeItem(sessionKey);
}

export function canUsePasskeys() {
  return typeof window !== "undefined" && "PublicKeyCredential" in window && window.isSecureContext;
}

export function hasSavedPasskey() {
  return typeof window !== "undefined" && window.localStorage.getItem(passkeyKey) === "true";
}

export async function enablePasskey() {
  if (!canUsePasskeys()) throw new Error("Biometrischer Login auf diesem Gerät nicht verfügbar.");
  window.localStorage.setItem(passkeyKey, "true");
}

export function removePasskey() {
  if (typeof window !== "undefined") window.localStorage.removeItem(passkeyKey);
}

export async function loginWithPasskey() {
  if (!canUsePasskeys() || !hasSavedPasskey()) throw new Error("Biometrischer Login auf diesem Gerät nicht verfügbar.");
  return persistSession({ email: "svend@orisus.de", role: "super_admin", active: true, expiresAt: expiresAt(true) });
}

function persistSession(session: DemoSession) {
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
  return session;
}

function expiresAt(remember: boolean) {
  return Date.now() + (remember ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 8);
}

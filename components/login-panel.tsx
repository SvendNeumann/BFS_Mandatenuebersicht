"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Eye, Fingerprint, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { canUsePasskeys, getCurrentSession, hasSavedPasskey, loginWithEmail, loginWithPasskey, requestPasswordReset, type DemoSession } from "@/lib/auth";

type LoginPanelProps = {
  variant?: "card" | "landing";
};

export function LoginPanel({ variant = "card" }: LoginPanelProps) {
  const [email, setEmail] = useState("svend.neumann@orisus.de");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionCheckDone, setSessionCheckDone] = useState(false);
  const [message, setMessage] = useState("Geschützter interner Bereich für berechtigte Nutzer der Orisus-Gruppe.");

  useEffect(() => {
    setPasskeyAvailable(canUsePasskeys() && hasSavedPasskey());
  }, []);

  useEffect(() => {
    let active = true;
    getCurrentSession()
      .then((session) => {
        if (!active) return;
        if (session?.active) {
          window.location.replace(nextPathFromLocation() ?? dashboardPathForSession(session));
          return;
        }
        setSessionCheckDone(true);
      })
      .catch(() => {
        if (active) setSessionCheckDone(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("Login wird geprüft...");
    try {
      const session = await loginWithEmail(email, password, remember);
      window.location.href = session.mustChangePassword
        ? "/passwort-aendern"
        : nextPathFromLocation() ?? dashboardPathForSession(session);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login fehlgeschlagen.");
      setIsSubmitting(false);
    }
  }

  async function submitPasskeyLogin() {
    try {
      const session = await loginWithPasskey();
      window.location.href = nextPathFromLocation() ?? dashboardPathForSession(session);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Biometrischer Login nicht verfügbar.");
    }
  }

  async function resetPassword() {
    await requestPasswordReset(email);
    setMessage("Wenn die E-Mail bekannt ist, wurde ein Link zum Zurücksetzen versendet.");
  }

  return (
    <section className={`auth-card login-card ${variant === "landing" ? "landing-login-card" : ""}`}>
      <div className="login-lock" aria-hidden="true">
        <LockKeyhole size={30} />
      </div>
      <span className="login-eyebrow">Geschützter Zugang</span>
      <div className="brand mini-brand login-brand">
        <Image className="brand-mark" src="/orisus-bfs-mark.svg" alt="Orisus BFS Monitor" width={48} height={48} />
        <div>
          <strong>Orisus BFS Monitor</strong>
          <span>Abrechnungen, Risiken und Fälle</span>
        </div>
      </div>
      <p>{message}</p>

      {!sessionCheckDone && <p className="form-hint">Bestehende Anmeldung wird geprüft...</p>}
      <form className="login-form" onSubmit={submitLogin}>
        <label>
          Login-Name
          <span><Mail size={16} /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required disabled={isSubmitting} /></span>
        </label>
        <label>
          Passwort
          <span><LockKeyhole size={16} /><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required disabled={isSubmitting} /></span>
        </label>
        <div className="login-row">
          <label className="checkbox-label"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} disabled={isSubmitting} /> angemeldet bleiben</label>
          <button type="button" className="text-button" onClick={resetPassword} disabled={isSubmitting}>Passwort vergessen?</button>
        </div>
        <button className="primary-button wide-button" type="submit" disabled={isSubmitting}><Eye size={16} /> {isSubmitting ? "Login wird geprüft" : "Einloggen"}</button>
      </form>

      <button className="secondary-button wide-button passkey-button" disabled={!passkeyAvailable || isSubmitting} onClick={submitPasskeyLogin}>
        <Fingerprint size={16} /> Mit Face ID einloggen
      </button>
      {!passkeyAvailable && <small className="form-hint">Biometrischer Login auf diesem Gerät nicht verfügbar oder noch nicht aktiviert.</small>}
      <div className="internal-use-note"><ShieldCheck size={15} /> Internal Use Only</div>
    </section>
  );
}

function dashboardPathForSession(session: Pick<DemoSession, "role">) {
  return session.role === "standortleitung" ? "/standort/dashboard" : "/dashboard";
}

function nextPathFromLocation() {
  if (typeof window === "undefined") return null;
  return safeNextPath(new URLSearchParams(window.location.search).get("next"));
}

function safeNextPath(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

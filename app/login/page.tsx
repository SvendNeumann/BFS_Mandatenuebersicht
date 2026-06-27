"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Eye, Fingerprint, LockKeyhole, Mail } from "lucide-react";
import { canUsePasskeys, hasSavedPasskey, loginWithEmail, loginWithPasskey, requestPasswordReset } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("svend.neumann@orisus.de");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("Geschützter interner Bereich für berechtigte Nutzer der Orisus-Gruppe.");

  useEffect(() => {
    setPasskeyAvailable(canUsePasskeys() && hasSavedPasskey());
  }, []);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("Login wird geprüft...");
    try {
      const session = await loginWithEmail(email, password, remember);
      window.location.href = session.mustChangePassword
        ? "/passwort-aendern"
        : nextPathFromLocation() ?? (session.role === "standortleitung" ? "/standort/dashboard" : "/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login fehlgeschlagen.");
      setIsSubmitting(false);
    }
  }

  async function submitPasskeyLogin() {
    try {
      const session = await loginWithPasskey();
      window.location.href = nextPathFromLocation() ?? (session.role === "standortleitung" ? "/standort/dashboard" : "/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Biometrischer Login nicht verfügbar.");
    }
  }

  async function resetPassword() {
    await requestPasswordReset(email);
    setMessage("Wenn die E-Mail bekannt ist, wurde ein Link zum Zurücksetzen versendet.");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card login-card">
        <a className="back-link" href="/"><ArrowLeft size={16} /> Zurück zur Startseite</a>
        <div className="brand mini-brand">
          <img className="brand-mark" src="/orisus-bfs-mark.svg" alt="Orisus BFS Monitor" />
          <div>
            <strong>Orisus BFS Monitor</strong>
            <span>Sicherer Login</span>
          </div>
        </div>
        <h1>Einloggen</h1>
        <p>{message}</p>

        <form className="login-form" onSubmit={submitLogin}>
          <label>
            E-Mail
            <span><Mail size={16} /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required disabled={isSubmitting} /></span>
          </label>
          <label>
            Passwort
            <span><LockKeyhole size={16} /><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required disabled={isSubmitting} /></span>
          </label>
          <div className="login-row">
            <label className="checkbox-label"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} disabled={isSubmitting} /> angemeldet bleiben</label>
            <button type="button" className="text-button" onClick={resetPassword} disabled={isSubmitting}>Passwort vergessen</button>
          </div>
          <button className="primary-button wide-button" type="submit" disabled={isSubmitting}><Eye size={16} /> {isSubmitting ? "Login wird geprüft" : "Einloggen"}</button>
        </form>

        <button className="secondary-button wide-button" disabled={!passkeyAvailable || isSubmitting} onClick={submitPasskeyLogin}>
          <Fingerprint size={16} /> Mit Face ID einloggen
        </button>
        {!passkeyAvailable && <small className="form-hint">Biometrischer Login auf diesem Gerät nicht verfügbar oder noch nicht aktiviert.</small>}
      </section>
    </main>
  );
}

function nextPathFromLocation() {
  if (typeof window === "undefined") return null;
  return safeNextPath(new URLSearchParams(window.location.search).get("next"));
}

function safeNextPath(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

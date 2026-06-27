"use client";

import { useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { updateOwnPassword } from "@/lib/auth";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("Bitte ersetze dein temporäres Passwort durch ein eigenes Passwort.");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setMessage("Die Passwörter stimmen nicht überein.");
      return;
    }
    setSaving(true);
    try {
      await updateOwnPassword(password);
      window.location.href = "/dashboard";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Passwort konnte nicht geändert werden.");
      setSaving(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card login-card">
        <div className="brand mini-brand">
          <img className="brand-mark" src="/orisus-bfs-mark.svg" alt="Orisus BFS Monitor" />
          <div>
            <strong>Orisus BFS Monitor</strong>
            <span>Erster Login</span>
          </div>
        </div>
        <h1>Passwort ändern</h1>
        <p>{message}</p>
        <form className="login-form" onSubmit={submit}>
          <label>
            Neues Passwort
            <span><LockKeyhole size={16} /><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required minLength={8} /></span>
          </label>
          <label>
            Neues Passwort wiederholen
            <span><ShieldCheck size={16} /><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} type="password" required minLength={8} /></span>
          </label>
          <button className="primary-button wide-button" type="submit" disabled={saving}>
            <ShieldCheck size={16} /> {saving ? "Wird gespeichert" : "Eigenes Passwort speichern"}
          </button>
        </form>
      </section>
    </main>
  );
}

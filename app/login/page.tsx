import { ArrowLeft } from "lucide-react";
import { LoginPanel } from "@/components/login-panel";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <a className="back-link auth-back-link" href="/"><ArrowLeft size={16} /> Zurück zur Startseite</a>
      <LoginPanel />
    </main>
  );
}

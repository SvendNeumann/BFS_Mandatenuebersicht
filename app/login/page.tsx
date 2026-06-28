import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginPanel } from "@/components/login-panel";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <Link className="back-link auth-back-link" href="/"><ArrowLeft size={16} /> Zurück zur Startseite</Link>
      <LoginPanel />
    </main>
  );
}

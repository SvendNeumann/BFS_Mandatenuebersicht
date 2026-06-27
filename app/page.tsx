import { AlertTriangle, BarChart3, FileText, FolderUp, Landmark, ReceiptText, ShieldCheck, Stethoscope, WalletCards } from "lucide-react";
import { LoginPanel } from "@/components/login-panel";

const featureCards = [
  {
    title: "BFS-Import",
    text: "PDF-Abrechnungen, Ordner und große Uploads werden paketweise verarbeitet und fachlich geprüft.",
    icon: FolderUp
  },
  {
    title: "Standortzuordnung",
    text: "Mandantennummern ordnen jede Abrechnung automatisch dem richtigen Orisus-Standort zu.",
    icon: Landmark
  },
  {
    title: "Kosten & Auszahlung",
    text: "Eingereichter Umsatz, Auszahlung, BFS-Gebühr, MwSt und Zusatzkosten auf einen Blick.",
    icon: WalletCards
  },
  {
    title: "Rückbelastungen",
    text: "Rückgaben, Stornos und offene Klärfälle werden getrennt von normalen Kosten ausgewertet.",
    icon: AlertTriangle
  },
  {
    title: "Ausfallschutz",
    text: "Forderungen ohne Ausfallschutz bleiben sichtbar, ohne echte Klärfälle zu vermischen.",
    icon: ShieldCheck
  },
  {
    title: "Reports",
    text: "Standort- und Gruppenberichte für Controlling, Nachverfolgung und interne Abstimmung.",
    icon: FileText
  }
];

const previewMetrics = [
  { label: "Eingereichter Umsatz", value: "542 Tsd. EUR", trend: "+ 839 PDFs vorbereitet" },
  { label: "Auszahlung BFS", value: "498 Tsd. EUR", trend: "nach Gebühren & Steuer" },
  { label: "BFS-Gebühr netto", value: "12,4 Tsd. EUR", trend: "inkl. Importkontrolle" },
  { label: "MwSt auf Gebühr", value: "2,36 Tsd. EUR", trend: "separat ausgewiesen" },
  { label: "Offene Klärfälle", value: "5", trend: "Rückgaben & Stornos" },
  { label: "Ohne Ausfallschutz", value: "315,90 EUR", trend: "Risikohinweis" },
  { label: "Neueinreichungen", value: "2", trend: "Matching-Vorschläge" },
  { label: "Aktive Standorte", value: "6", trend: "inkl. Kassel vorbereitet" }
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <div className="landing-grid-shell">
        <section className="landing-board" aria-label="Orisus BFS Monitor Übersicht">
          <a className="brand compact-brand landing-brand" href="/">
            <img className="brand-mark" src="/orisus-bfs-mark.svg" alt="Orisus BFS Monitor" />
            <div>
              <strong>Orisus BFS Monitor</strong>
              <span>Interne Abrechnungs- und Fallsteuerung</span>
            </div>
          </a>

          <div className="landing-headline">
            <span className="eyebrow">BFS-Abrechnungen fuer Orisus</span>
            <h1>Die zentrale Plattform fuer BFS-Importe, Standortanalyse und offene Klaerfaelle.</h1>
            <p>
              Abrechnungsnachweise werden importiert, eindeutig zugeordnet und in Kennzahlen, Risiken,
              Rueckbelastungen, Neueinreichungen und Reports uebersetzt.
            </p>
          </div>

          <div className="landing-cards">
            {featureCards.map((card) => (
              <article className="landing-card" key={card.title}>
                <span className="landing-card-icon"><card.icon size={24} /></span>
                <h2>{card.title}</h2>
                <p>{card.text}</p>
              </article>
            ))}
          </div>

          <section className="dashboard-preview" aria-label="Dashboard Vorschau">
            <div className="preview-heading">
              <div>
                <span className="eyebrow">Dashboard Vorschau</span>
                <h2>Monatsimport und BFS-Kennzahlen</h2>
              </div>
              <ReceiptText size={24} />
            </div>
            <div className="preview-metrics">
              {previewMetrics.map((metric) => (
                <div className="preview-metric" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.trend}</small>
                </div>
              ))}
            </div>
          </section>
        </section>

        <aside className="landing-login-panel" aria-label="Geschuetzter Login">
          <div className="login-context">
            <Stethoscope size={24} />
            <span>Orisus Zahnmedizin</span>
          </div>
          <LoginPanel variant="landing" />
          <div className="landing-login-footer">
            <BarChart3 size={17} />
            <span>Rollenbasierter Zugriff fuer Super Admins und Standortleitungen.</span>
          </div>
        </aside>
      </div>
    </main>
  );
}

import { ArrowRight, BarChart3, FileArchive, FileText, LockKeyhole, MapPinned, ShieldCheck, Upload } from "lucide-react";

const cards = [
  {
    title: "Sammelupload",
    text: "Mehrere PDFs, ganze Ordner oder ZIP-Dateien monatlich gesammelt hochladen. Automatische Standortzuordnung über BFS-Mandantennummer.",
    icon: Upload
  },
  {
    title: "Offene Klärfälle",
    text: "Rückbelastungen, fehlerhafte Rechnungen und offene Patienten je Standort erkennen.",
    icon: FileArchive
  },
  {
    title: "Standort-Dashboard",
    text: "Standortleitungen sehen nur ihren eigenen Standort. Super Admins sehen alle Standorte konsolidiert.",
    icon: BarChart3
  },
  {
    title: "Reports",
    text: "Offene BFS-Klärfälle je Standort als PDF, Druckansicht oder Excel/CSV exportieren.",
    icon: FileText
  }
];

const processSteps = ["BFS-PDFs hochladen", "Standort automatisch erkennen", "Abrechnungen prüfen", "offene Fälle anzeigen", "Report je Standort erstellen"];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <a className="brand compact-brand" href="/">
          <div className="brand-mark">O</div>
          <div>
            <strong>Orisus BFS Monitor</strong>
            <span>Interner Bereich</span>
          </div>
        </a>
        <a className="secondary-button" href="/login">Einloggen</a>
      </header>

      <section className="landing-hero">
        <div>
          <span className="eyebrow">BFS Monitor</span>
          <h1>BFS Monitor</h1>
          <h2>Factoring-Abrechnungen je Standort prüfen, Rückbelastungen erkennen und offene Klärfälle sauber nachverfolgen.</h2>
          <p>
            Der BFS Monitor wertet BFS-Abrechnungsnachweise aus, ordnet sie automatisch dem richtigen Standort zu und zeigt offene Rückbelastungen,
            fehlerhafte Rechnungen, Fälle ohne Ausfallschutz und Neueinreichungsvorschläge übersichtlich an.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="/login">Einloggen <ArrowRight size={17} /></a>
            <span>Nur für berechtigte Nutzer der Orisus-Gruppe.</span>
          </div>
        </div>
        <div className="hero-panel" aria-label="BFS Monitor Vorschau">
          <div className="hero-panel-header">
            <ShieldCheck size={20} />
            <strong>Offene BFS-Klärfälle</strong>
          </div>
          <div className="hero-kpis">
            <span><strong>5</strong> Rückbelastungen</span>
            <span><strong>315,90 €</strong> ohne Ausfallschutz</span>
            <span><strong>2</strong> Neueinreichungen</span>
          </div>
          <div className="hero-list">
            <span>Ulmet · Rückgabe ohne Ausfallschutz</span>
            <span>Kehl · fehlerhafte Rechnung</span>
            <span>Kassel · Wiedervorlage</span>
          </div>
        </div>
      </section>

      <section className="landing-cards">
        {cards.map((card) => (
          <article className="landing-card" key={card.title}>
            <card.icon size={22} />
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </article>
        ))}
      </section>

      <section className="process-section">
        {processSteps.map((step, index) => (
          <div className="process-step" key={step}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </section>

      <section className="security-section">
        <LockKeyhole size={24} />
        <div>
          <h2>Sichere Standorttrennung</h2>
          <p>
            Die App nutzt rollenbasierte Rechte. Standortleitungen sehen ausschließlich die Daten ihres zugewiesenen Standorts.
            Super Admins verwalten Uploads, Standorte, Nutzer und konsolidierte Auswertungen.
          </p>
        </div>
        <MapPinned size={24} />
      </section>
    </main>
  );
}

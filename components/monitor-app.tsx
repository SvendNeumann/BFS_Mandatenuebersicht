"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  Download,
  FileArchive,
  FileText,
  FolderUp,
  LayoutDashboard,
  LockKeyhole,
  Printer,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  Users
} from "lucide-react";
import {
  cases,
  dashboardSeries,
  documents,
  importPreviewRows,
  monthlyKpis,
  riskClaims,
  standorte,
  users
} from "@/lib/demo-data";
import type { AppRole, BfsCase, ImportPreviewRow, Standort } from "@/lib/types";
import { createCasesCsv, downloadTextFile } from "@/lib/reporting";
import { enablePasskey, getDemoSession, hasSavedPasskey, logout, removePasskey, type DemoSession } from "@/lib/auth";

const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

const superAdminNav = [
  ["dashboard", "Gruppen-Dashboard", LayoutDashboard],
  ["upload", "Abrechnungen importieren", FolderUp],
  ["history", "Import-Historie", FileArchive],
  ["cases", "Alle offenen Fälle", AlertCircle],
  ["risks", "Ohne Ausfallschutz", ShieldCheck],
  ["matches", "Neueinreichungen", RefreshCw],
  ["reports", "Reports", FileText],
  ["locations", "Standorte", Building2],
  ["users", "Nutzer", Users],
  ["settings", "Einstellungen", Settings]
] as const;

const leadNav = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["cases", "Offene Fälle", AlertCircle],
  ["risks", "Ohne Ausfallschutz", ShieldCheck],
  ["matches", "Neueinreichungen", RefreshCw],
  ["reports", "Reports", FileText]
] as const;

type MonitorAppProps = {
  lockedRole?: AppRole;
  initialView?: string;
  requireAuth?: boolean;
};

export default function MonitorApp({ lockedRole, initialView = "dashboard", requireAuth = true }: MonitorAppProps) {
  const [session, setSession] = useState<DemoSession | null>(() => getDemoSession());
  const [role, setRole] = useState<AppRole>(lockedRole ?? session?.role ?? "super_admin");
  const [activeView, setActiveView] = useState(initialView);
  const [selectedStandortId, setSelectedStandortId] = useState(standorte[0].id);
  const selectedStandort = standorte.find((standort) => standort.id === selectedStandortId) ?? standorte[0];
  const visibleStandorte = role === "super_admin" ? standorte : standorte.filter((standort) => standort.id === selectedStandort.id);
  const visibleCases = useMemo(
    () => cases.filter((fall) => role === "super_admin" || fall.standortId === selectedStandort.id),
    [role, selectedStandort.id]
  );
  const nav = role === "super_admin" ? superAdminNav : leadNav;

  if (requireAuth && !session) {
    return <AccessGate title="Login erforderlich" message="Bitte melde dich an, um diesen geschützten Bereich zu öffnen." />;
  }

  if (requireAuth && lockedRole && session?.role !== lockedRole) {
    return <AccessGate title="Kein Zugriff auf diesen Bereich." message="Dieser Bereich ist für deine Rolle nicht freigegeben." />;
  }

  function switchRole(nextRole: AppRole) {
    setRole(nextRole);
    setActiveView("dashboard");
    if (nextRole === "standortleitung") setSelectedStandortId(standorte[0].id);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">O</div>
          <div>
            <strong>Orisus BFS Monitor</strong>
            <span>Factoring-Kontrolle</span>
          </div>
        </div>

        {!lockedRole && (
          <div className="role-switch" aria-label="Rolle wählen">
            <button className={role === "super_admin" ? "active" : ""} onClick={() => switchRole("super_admin")}>
              Super Admin
            </button>
            <button className={role === "standortleitung" ? "active" : ""} onClick={() => switchRole("standortleitung")}>
              Standortleitung
            </button>
          </div>
        )}

        <nav>
          {nav.map(([key, label, Icon]) => (
            <button key={key} className={activeView === key ? "nav-item active" : "nav-item"} onClick={() => setActiveView(key)}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <button
          className="logout-button"
          onClick={() => {
            logout();
            setSession(null);
            window.location.href = "/login";
          }}
        >
          Abmelden
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">{role === "super_admin" ? "Zentrale Ansicht" : selectedStandort.name}</span>
            <h1>{titleFor(activeView, role)}</h1>
          </div>
          <div className="topbar-actions">
            <label className="select-label">
              Standort
              <select value={selectedStandortId} disabled={role === "standortleitung"} onChange={(event) => setSelectedStandortId(event.target.value)}>
                {visibleStandorte.map((standort) => (
                  <option key={standort.id} value={standort.id}>
                    {standort.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {activeView === "dashboard" && (
          role === "super_admin" ? <GroupDashboard onOpenReports={() => setActiveView("reports")} /> : <LocationDashboard standort={selectedStandort} cases={visibleCases} />
        )}
        {activeView === "upload" && <UploadView />}
        {activeView === "history" && <ImportHistory />}
        {activeView === "cases" && <CasesView cases={visibleCases} />}
        {activeView === "risks" && <RiskView standortId={role === "super_admin" ? undefined : selectedStandort.id} />}
        {activeView === "matches" && <MatchesView />}
        {activeView === "reports" && <ReportsView role={role} standort={selectedStandort} cases={visibleCases} />}
        {activeView === "locations" && <LocationsView />}
        {activeView === "users" && <UsersView />}
        {activeView === "settings" && <SettingsView />}
      </section>
    </main>
  );
}

function AccessGate({ title, message }: { title: string; message: string }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand mini-brand">
          <div className="brand-mark">O</div>
          <div>
            <strong>Orisus BFS Monitor</strong>
            <span>Geschützter Bereich</span>
          </div>
        </div>
        <h1>{title}</h1>
        <p>{message}</p>
        <a className="primary-link" href="/login">Zum Login</a>
      </section>
    </main>
  );
}

function titleFor(view: string, role: AppRole) {
  const titles: Record<string, string> = {
    dashboard: role === "super_admin" ? "Gruppen-Dashboard" : "Standort-Dashboard",
    upload: "Monats-Sammelimport",
    history: "Import-Historie",
    cases: "Offene BFS-Klärfälle",
    risks: "Laufend ohne Ausfallschutz",
    matches: "Neueinreichungsvorschläge",
    reports: "Reports je Standort",
    locations: "Standorte",
    users: "Nutzerverwaltung",
    settings: "Einstellungen"
  };
  return titles[view] ?? "Orisus BFS Monitor";
}

function GroupDashboard({ onOpenReports }: { onOpenReports: () => void }) {
  return (
    <div className="content-stack">
      <KpiGrid />
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Standortübersicht</h2>
            <p>Offene To-dos, Rückbelastungen und Risikohinweise je Standort.</p>
          </div>
          <button className="secondary-button" onClick={onOpenReports}>
            <Printer size={16} /> Reports
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Standort</th>
                <th>Letzter Import</th>
                <th>Eingereicht</th>
                <th>Gebühren</th>
                <th>Offene Fälle</th>
                <th>Rückbelastungen offen</th>
                <th>Ohne Ausfallschutz</th>
                <th>&gt; 30 Tage</th>
              </tr>
            </thead>
            <tbody>
              {standorte.map((standort) => (
                <tr key={standort.id}>
                  <td>
                    <strong>{standort.name}</strong>
                    <span>{standort.praxisname}</span>
                  </td>
                  <td>{standort.lastImport}</td>
                  <td>{money.format(standort.submittedThisMonth)}</td>
                  <td>{money.format(standort.feesThisMonth)}</td>
                  <td>{standort.openCases}</td>
                  <td>{money.format(standort.openChargebacks)}</td>
                  <td>{money.format(standort.withoutProtection)}</td>
                  <td>{standort.olderThan30}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="chart-grid">
        {dashboardSeries.map((chart) => (
          <div className="panel mini-chart" key={chart.title}>
            <h2>{chart.title}</h2>
            <div className="bars">
              {chart.values.map((value) => (
                <span key={value.label} style={{ height: `${value.value}%` }} title={`${value.label}: ${value.value}`} />
              ))}
            </div>
            <div className="axis">{chart.values.map((value) => <span key={value.label}>{value.label}</span>)}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

function LocationDashboard({ standort, cases }: { standort: Standort; cases: BfsCase[] }) {
  return (
    <div className="content-stack">
      <KpiGrid standort={standort} />
      <CasesView cases={cases} compact />
    </div>
  );
}

function KpiGrid({ standort }: { standort?: Standort }) {
  const cards = standort
    ? [
        ["Eingereicht aktueller Monat", money.format(standort.submittedThisMonth), "Aus BFS-Abrechnungen"],
        ["BFS-Gebühren", money.format(standort.feesThisMonth), "Netto und MwSt"],
        ["Offene BFS-Klärfälle", String(standort.openCases), "echte To-dos"],
        ["Laufend ohne Ausfallschutz", money.format(standort.withoutProtection), "Risikoüberwachung"]
      ]
    : monthlyKpis;
  return (
    <section className="kpi-grid">
      {cards.map(([label, value, hint]) => (
        <article className="kpi-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{hint}</small>
        </article>
      ))}
    </section>
  );
}

function UploadView() {
  return (
    <div className="content-stack">
      <section className="upload-zone">
        <Upload size={28} />
        <div>
          <h2>PDFs, Ordner oder ZIP-Dateien für den Monats-Sammelimport ablegen</h2>
          <p>Standorte werden später aus BFS-Mandant-Nr., Praxisname und Adresse erkannt. Dateinamen dienen nur als Hinweis.</p>
        </div>
        <input type="file" multiple accept=".pdf,.zip,application/pdf,application/zip" />
      </section>
      <ImportPreview rows={importPreviewRows} />
    </div>
  );
}

function ImportPreview({ rows }: { rows: ImportPreviewRow[] }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Import-Vorschau</h2>
          <p>Import wird erst nach Prüfung und Bestätigung final geschrieben.</p>
        </div>
        <button className="primary-button">
          <CheckCircle2 size={16} /> Import bestätigen
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Datei</th>
              <th>Standort</th>
              <th>Mandant-Nr.</th>
              <th>Abrechnung</th>
              <th>Forderungen</th>
              <th>Summe</th>
              <th>Kontoauszug</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.file}>
                <td><strong>{row.file}</strong><span>{row.practice}</span></td>
                <td>{row.location}</td>
                <td>{row.mandantNo}</td>
                <td>{row.statementNo} / {row.date}</td>
                <td>{row.claimsHeader} / {row.claimsExtracted}</td>
                <td>{money.format(row.sumHeader)} / {money.format(row.sumExtracted)}</td>
                <td>{row.hasLedger ? `${row.movements} Bewegungen` : "fehlt"}</td>
                <td><StatusBadge status={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CasesView({ cases: rows, compact = false }: { cases: BfsCase[]; compact?: boolean }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{compact ? "Offene Fälle am Standort" : "Offene Rückbelastungen / Klärfälle"}</h2>
          <p>Originaldaten sind read-only; nur interne Bearbeitung und Erledigungsgründe werden gepflegt.</p>
        </div>
        <div className="search-box"><Search size={16} /><input placeholder="Patient, Re.-Nr. oder BFS-Nr." /></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ampel</th>
              <th>Patient</th>
              <th>Re.-Nr.</th>
              <th>BFS-Nr.</th>
              <th>Betrag</th>
              <th>Grund</th>
              <th>Alter</th>
              <th>Status</th>
              <th>Wiedervorlage</th>
              <th>Kommentar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((fall) => (
              <tr key={fall.id}>
                <td><span className={`traffic traffic-${fall.traffic}`} /></td>
                <td><strong>{fall.patientName}</strong><span>{fall.locationName}</span></td>
                <td>{fall.invoiceNo}</td>
                <td>{fall.bfsNo}</td>
                <td>{money.format(fall.amount)}</td>
                <td>{fall.reason}</td>
                <td>{fall.ageDays} Tage</td>
                <td><StatusBadge status={fall.status} /></td>
                <td>{fall.dueDate}</td>
                <td>{fall.lastComment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RiskView({ standortId }: { standortId?: string }) {
  const rows = riskClaims.filter((claim) => !standortId || claim.standortId === standortId);
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Laufend ohne Ausfallschutz</h2>
          <p>Risikohinweise, noch keine offenen To-dos. Erst eine Rückgabe erzeugt einen Klärfall.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Re.-Nr.</th>
              <th>BFS-Nr.</th>
              <th>Betrag</th>
              <th>Abrechnung</th>
              <th>Kennzeichen</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((claim) => (
              <tr key={claim.id}>
                <td><strong>{claim.patientName}</strong></td>
                <td>{claim.invoiceNo}</td>
                <td>{claim.bfsNo}</td>
                <td>{money.format(claim.amount)}</td>
                <td>{claim.statementNo} / {claim.date}</td>
                <td>{claim.marker}</td>
                <td><StatusBadge status="Ausgezahlt ohne Ausfallschutz" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MatchesView() {
  const matched = cases.filter((fall) => fall.status.includes("automatisch"));
  return (
    <CasesView cases={matched.length ? matched : cases.slice(0, 2).map((fall) => ({ ...fall, status: "neueinreichung_vorschlag", reason: "Neueinreichungsvorschlag" }))} />
  );
}

function ReportsView({ role, standort, cases }: { role: AppRole; standort: Standort; cases: BfsCase[] }) {
  const reportCases = cases.filter((fall) => fall.status !== "erledigt_automatisch");
  function exportCsv() {
    downloadTextFile(`offene-bfs-klaerfaelle-${standort.name.toLowerCase()}.csv`, createCasesCsv(reportCases));
  }
  return (
    <div className="content-stack report-screen">
      <section className="panel report-toolbar">
        <div>
          <h2>Offene BFS-Klärfälle je Standort</h2>
          <p>{role === "super_admin" ? "Super Admin kann Reports je Standort erzeugen." : "Standortleitung sieht nur den eigenen Standort."}</p>
        </div>
        <button className="secondary-button" onClick={() => window.print()}><Printer size={16} /> Drucken / PDF</button>
        <button className="secondary-button" onClick={exportCsv}><Download size={16} /> CSV</button>
      </section>
      <section className="print-report">
        <header>
          <div>
            <span>Orisus BFS Monitor</span>
            <h2>Report: {standort.name}</h2>
          </div>
          <p>Erstellt am 27.06.2026</p>
        </header>
        <div className="report-summary">
          <strong>{reportCases.length}</strong><span>offene Klärfälle</span>
          <strong>{money.format(reportCases.reduce((sum, fall) => sum + fall.amount, 0))}</strong><span>offener Betrag</span>
        </div>
        <h3>Abschnitt 1: Offene Rückbelastungen / Klärfälle</h3>
        <CasesView cases={reportCases} compact />
        <h3>Abschnitt 2: Laufend ohne Ausfallschutz</h3>
        <RiskView standortId={standort.id} />
      </section>
    </div>
  );
}

function ImportHistory() {
  return <ImportPreview rows={importPreviewRows} />;
}

function LocationsView() {
  return (
    <section className="panel">
      <div className="panel-heading"><h2>Standorte</h2><button className="primary-button">Standort anlegen</button></div>
      <div className="cards-grid">
        {standorte.map((standort) => (
          <article className="data-card" key={standort.id}>
            <Building2 size={18} />
            <strong>{standort.name}</strong>
            <span>{standort.praxisname}</span>
            <small>Mandant-Nr. {standort.mandantNo}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function UsersView() {
  return (
    <section className="panel">
      <div className="panel-heading"><h2>Nutzer</h2><button className="primary-button">Nutzer einladen</button></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>E-Mail</th><th>Rolle</th><th>Standort</th><th>Status</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.email}><td><strong>{user.name}</strong></td><td>{user.email}</td><td>{user.role}</td><td>{user.location}</td><td><StatusBadge status={user.active ? "aktiv" : "inaktiv"} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SettingsView() {
  const [passkeyEnabled, setPasskeyEnabled] = useState(() => hasSavedPasskey());
  const [message, setMessage] = useState("Face ID speichert keine biometrischen Daten in der App. Das Gerät übernimmt die Prüfung über WebAuthn/Passkeys.");

  async function activatePasskey() {
    try {
      await enablePasskey();
      setPasskeyEnabled(true);
      setMessage("Dieses Gerät ist für schnellen Login gespeichert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Passkey konnte nicht aktiviert werden.");
    }
  }

  function deletePasskey() {
    removePasskey();
    setPasskeyEnabled(false);
    setMessage("Gespeichertes Gerät wurde entfernt.");
  }

  return (
    <section className="panel settings-panel">
      <LockKeyhole size={22} />
      <h2>Sicherheit und Importlogik</h2>
      <p>PDFs bleiben privat im Bucket <strong>bfs-documents</strong>. Zugriff erfolgt später ausschließlich über autorisierte Signed URLs.</p>
      <p>Matching-Regeln sind bewusst konservativ: automatische Erledigung nur bei gleichem Standort, Patient, Rechnungsnummer und Betrag.</p>
      <div className="security-actions">
        <h3>Face ID / Passkey</h3>
        <p>{message}</p>
        <div>
          <button className="secondary-button" onClick={activatePasskey}>Face ID aktivieren</button>
          <button className="secondary-button" onClick={deletePasskey} disabled={!passkeyEnabled}>Gespeichertes Gerät entfernen</button>
        </div>
        <small>{passkeyEnabled ? "Registriertes Gerät: dieses Gerät · letzter biometrischer Login: noch nicht verwendet" : "Kein gespeichertes Gerät aktiv."}</small>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes("ok") || normalized.includes("aktiv") || normalized.includes("automatisch")
    ? "green"
    : normalized.includes("warn") || normalized.includes("vorschlag") || normalized.includes("ohne")
      ? "amber"
      : normalized.includes("fehler") || normalized.includes("offen")
        ? "red"
        : "gray";
  return <span className={`status ${tone}`}>{status}</span>;
}

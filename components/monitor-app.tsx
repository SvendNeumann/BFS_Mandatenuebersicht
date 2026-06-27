"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Download,
  ChevronDown,
  FileArchive,
  FileText,
  FolderUp,
  HardDriveUpload,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  UserRoundCheck,
  Users,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  cases,
  dashboardSeries,
  importPreviewRows,
  monthlyKpis,
  riskClaims,
  standorte,
  isStandortLive,
  liveStatusLabel,
  users
} from "@/lib/demo-data";
import type { AppRole, BfsCase, ImportPreviewRow, RiskClaim, Standort } from "@/lib/types";
import { createCasesCsv, downloadTextFile } from "@/lib/reporting";
import { enablePasskey, getDemoSession, hasSavedPasskey, logout, removePasskey, type DemoSession } from "@/lib/auth";
import { parseDemoImportFiles } from "@/lib/demo-import";

const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

type NavItem = readonly [string, string, LucideIcon];
type NavSection = {
  title: string;
  items: NavItem[];
};

const superAdminNav: NavSection[] = [
  {
    title: "Überblick",
    items: [
      ["dashboard", "CFO-Cockpit", LayoutDashboard],
      ["answers", "Schnellantworten", ClipboardList],
      ["claims", "Forderungen & Geldfluss", ReceiptText],
      ["worklist", "Prioritäten heute", AlertCircle]
    ]
  },
  {
    title: "Klärfälle",
    items: [
      ["cases", "Offene BFS-Klärfälle", AlertCircle],
      ["chargebacks", "Rückbelastungen", CircleDollarSign],
      ["followups", "Wiedervorlagen", CalendarClock]
    ]
  },
  {
    title: "Risiko & Matching",
    items: [
      ["risks", "Ohne Ausfallschutz", ShieldCheck],
      ["repeatRisks", "Wiederholer ohne Schutz", AlertTriangle],
      ["matches", "Neueinreichungen", RefreshCw]
    ]
  },
  {
    title: "Import & Prüfung",
    items: [
      ["upload", "Monats-Sammelupload", FolderUp],
      ["preview", "Import-Vorschau", ReceiptText],
      ["history", "Import-Historie", FileArchive]
    ]
  },
  {
    title: "Auswertung",
    items: [
      ["reports", "Report je Standort", FileText],
      ["groupReports", "Gruppenreport", BarChart3]
    ]
  },
  {
    title: "Verwaltung",
    items: [
      ["locations", "Standorte", Building2],
      ["users", "Nutzer & Rollen", Users],
      ["settings", "Sicherheit & Regeln", Settings]
    ]
  }
];

const leadNav: NavSection[] = [
  {
    title: "Mein Standort",
    items: [
      ["dashboard", "Standort-Dashboard", LayoutDashboard],
      ["answers", "Schnellantworten", ClipboardList],
      ["claims", "Forderungen & Geldfluss", ReceiptText],
      ["worklist", "Meine Prioritäten", AlertCircle]
    ]
  },
  {
    title: "Klärfälle",
    items: [
      ["cases", "Offene Fälle", AlertCircle],
      ["chargebacks", "Rückbelastungen", CircleDollarSign],
      ["followups", "Wiedervorlagen", CalendarClock]
    ]
  },
  {
    title: "Risiko & Matching",
    items: [
      ["risks", "Ohne Ausfallschutz", ShieldCheck],
      ["repeatRisks", "Wiederholer ohne Schutz", AlertTriangle],
      ["matches", "Neueinreichungen", RefreshCw]
    ]
  },
  {
    title: "Auswertung",
    items: [
      ["reports", "Standort-Reports", FileText],
      ["settings", "Mein Profil & Sicherheit", UserRoundCheck]
    ]
  }
];

type MonitorAppProps = {
  lockedRole?: AppRole;
  initialView?: string;
  requireAuth?: boolean;
};

export default function MonitorApp({ lockedRole, initialView = "dashboard", requireAuth = true }: MonitorAppProps) {
  const [session, setSession] = useState<DemoSession | null>(() => getDemoSession());
  const [role, setRole] = useState<AppRole>(lockedRole ?? session?.role ?? "super_admin");
  const [activeView, setActiveView] = useState(initialView);
  const [selectedStandortId, setSelectedStandortId] = useState(role === "super_admin" ? "gruppe" : standorte[0].id);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const selectedStandort = standorte.find((standort) => standort.id === selectedStandortId) ?? standorte[0];
  const isGroupScope = role === "super_admin" && selectedStandortId === "gruppe";
  const visibleCases = useMemo(
    () => cases.filter((fall) => isGroupScope || fall.standortId === selectedStandort.id),
    [isGroupScope, selectedStandort.id]
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
    setSelectedStandortId(nextRole === "standortleitung" ? standorte[0].id : "gruppe");
  }

  function selectStandortTab(nextStandortId: string) {
    setSelectedStandortId(nextStandortId);
    if (activeView === "groupReports" && nextStandortId !== "gruppe") setActiveView("dashboard");
  }

  function toggleNavSection(title: string) {
    setExpandedSections((current) => ({ ...current, [title]: !current[title] }));
  }

  function navigateTo(key: string) {
    setActiveView(key);
    setMobileNavOpen(false);
  }

  return (
    <main className={mobileNavOpen ? "app-shell nav-open" : "app-shell"}>
      <button className="mobile-nav-overlay" aria-label="Navigation schließen" onClick={() => setMobileNavOpen(false)} />
      <aside className="sidebar">
        <div className="sidebar-inner">
          <div className="sidebar-top">
            <div className="brand">
              <img className="brand-mark" src="/orisus-bfs-mark.svg" alt="Orisus BFS Monitor" />
              <div>
                <strong>Orisus BFS Monitor</strong>
                <span>Factoring-Kontrolle</span>
              </div>
            </div>
            <button className="drawer-close" aria-label="Navigation schließen" onClick={() => setMobileNavOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <nav>
            {nav.map((section) => {
              const sectionActive = section.items.some(([key]) => activeView === key);
              const sectionExpanded = sectionActive || (expandedSections[section.title] ?? false);
              const SectionIcon = section.items[0][2];
              return (
                <div className={sectionExpanded ? "nav-section expanded" : "nav-section"} key={section.title}>
                  <button className={sectionActive ? "nav-section-toggle active" : "nav-section-toggle"} onClick={() => toggleNavSection(section.title)}>
                    <SectionIcon size={17} />
                    <span>{section.title}</span>
                    <ChevronDown size={16} />
                  </button>
                  <div className="nav-subitems">
                    {section.items.map(([key, label, Icon]) => (
                      <button key={key} className={activeView === key ? "nav-item active" : "nav-item"} onClick={() => navigateTo(key)}>
                        <Icon size={18} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="sidebar-footer">
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
            <div className="user-box">
              <UserRoundCheck size={18} />
              <div>
                <strong>{role === "super_admin" ? "Zentrale / CFO" : selectedStandort.name}</strong>
                <span>{session?.email ?? "Demo-Zugang"}</span>
              </div>
            </div>
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
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="mobile-menu-button" aria-label="Navigation öffnen" onClick={() => setMobileNavOpen(true)}>
            <Menu size={18} />
          </button>
          <div>
            <span className="eyebrow">{isGroupScope ? "Alle Standorte" : selectedStandort.name}</span>
            <h1>{titleFor(activeView, role, isGroupScope)}</h1>
          </div>
          <div className="topbar-actions">
            <button className="secondary-button" onClick={() => setActiveView("worklist")}><ClipboardList size={16} /> Prioritäten</button>
            {role === "super_admin" && <button className="primary-button" onClick={() => setActiveView("upload")}><Upload size={16} /> Upload</button>}
          </div>
        </header>

        <StandortTabs
          role={role}
          selectedStandortId={selectedStandortId}
          onSelect={selectStandortTab}
        />

        {activeView === "dashboard" && (
          role === "super_admin" && isGroupScope
            ? <GroupDashboard onNavigate={setActiveView} />
            : <LocationDashboard standort={selectedStandort} cases={visibleCases} onNavigate={setActiveView} />
        )}
        {activeView === "worklist" && <WorklistView cases={visibleCases} onNavigate={setActiveView} />}
        {activeView === "answers" && <AnswerCockpit scope={isGroupScope ? "group" : "location"} standort={selectedStandort} cases={visibleCases} onNavigate={setActiveView} />}
        {activeView === "claims" && <ClaimsFlowView standort={isGroupScope ? undefined : selectedStandort} cases={visibleCases} />}
        {activeView === "upload" && <UploadView />}
        {activeView === "preview" && <ImportPreview rows={importPreviewRows} />}
        {activeView === "history" && <ImportHistory />}
        {activeView === "cases" && <CasesView cases={visibleCases} />}
        {activeView === "chargebacks" && <CasesView cases={visibleCases.filter((fall) => fall.reason.includes("Rückgabe") || fall.reason.includes("Rückbelastung"))} title="Rückbelastungen" description="Alle echten Rückbelastungen, die aktiv geklärt oder an den Standort gegeben werden müssen." />}
        {activeView === "followups" && <CasesView cases={visibleCases.filter((fall) => fall.status === "wiedervorlage" || fall.dueDate !== "-")} title="Wiedervorlagen" description="Fälle mit Frist, Rückfrage oder nächstem Bearbeitungstermin." />}
        {activeView === "risks" && <RiskView standortId={isGroupScope ? undefined : selectedStandort.id} />}
        {activeView === "repeatRisks" && <RecurringRiskView standortId={isGroupScope ? undefined : selectedStandort.id} />}
        {activeView === "matches" && <MatchesView cases={visibleCases} />}
        {activeView === "reports" && <ReportsView role={role} standort={selectedStandort} cases={visibleCases} />}
        {activeView === "groupReports" && (isGroupScope ? <GroupReportsView onNavigate={setActiveView} /> : <ReportsView role={role} standort={selectedStandort} cases={visibleCases} />)}
        {activeView === "locations" && <LocationsView />}
        {activeView === "users" && <UsersView />}
        {activeView === "settings" && <SettingsView />}
      </section>
    </main>
  );
}

function StandortTabs({ role, selectedStandortId, onSelect }: { role: AppRole; selectedStandortId: string; onSelect: (standortId: string) => void }) {
  const visibleStandorte = role === "super_admin" ? standorte : standorte.slice(0, 1);
  return (
    <section className="standort-tabs" aria-label="Standorte">
      {role === "super_admin" && (
        <button className={selectedStandortId === "gruppe" ? "active" : ""} onClick={() => onSelect("gruppe")}>
          <BarChart3 size={16} />
          Gruppe
        </button>
      )}
      {visibleStandorte.map((standort) => (
        <button key={standort.id} className={selectedStandortId === standort.id ? "active" : ""} onClick={() => onSelect(standort.id)}>
          <Building2 size={16} />
          {standort.name}
          <span>{isStandortLive(standort) ? `${standort.openCases} offen` : liveStatusLabel(standort)}</span>
        </button>
      ))}
    </section>
  );
}

function AccessGate({ title, message }: { title: string; message: string }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand mini-brand">
          <img className="brand-mark" src="/orisus-bfs-mark.svg" alt="Orisus BFS Monitor" />
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

function titleFor(view: string, role: AppRole, isGroupScope: boolean) {
  const titles: Record<string, string> = {
    dashboard: role === "super_admin" && isGroupScope ? "CFO-Cockpit" : "Standort-Dashboard",
    answers: "Schnellantworten",
    claims: "Forderungen & Geldfluss",
    worklist: role === "super_admin" ? "Prioritäten heute" : "Meine Prioritäten",
    upload: "Monats-Sammelimport",
    preview: "Import-Vorschau",
    history: "Import-Historie",
    cases: "Offene BFS-Klärfälle",
    chargebacks: "Rückbelastungen",
    followups: "Wiedervorlagen",
    risks: "Laufend ohne Ausfallschutz",
    repeatRisks: "Wiederholer ohne Ausfallschutz",
    matches: "Neueinreichungsvorschläge",
    reports: "Reports je Standort",
    groupReports: "Gruppenreport",
    locations: "Standorte",
    users: "Nutzerverwaltung",
    settings: "Einstellungen"
  };
  return titles[view] ?? "Orisus BFS Monitor";
}

function GroupDashboard({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [groupStandortFilter, setGroupStandortFilter] = useState("alle");
  const [groupFocus, setGroupFocus] = useState("gesamt");
  const filteredStandorte = groupStandortFilter === "alle"
    ? standorte
    : standorte.filter((standort) => standort.id === groupStandortFilter);
  const filteredStandortIds = new Set(filteredStandorte.map((standort) => standort.id));
  const openCases = cases.filter((fall) => !fall.status.includes("erledigt") && filteredStandortIds.has(fall.standortId));
  const focusedCases = openCases.filter((fall) => {
    if (groupFocus === "rueckbelastungen") return fall.reason.includes("Rückgabe") || fall.reason.includes("Rückbelastung");
    if (groupFocus === "wiedervorlagen") return fall.status === "wiedervorlage" || fall.dueDate !== "-";
    return true;
  });
  const focusedRisks = riskClaims.filter((claim) => filteredStandortIds.has(claim.standortId));
  const overdueCases = openCases.filter((fall) => fall.ageDays > 30);
  const chargebackTotal = focusedCases.reduce((sum, fall) => sum + fall.amount, 0);
  const liveStandorte = filteredStandorte.filter((standort) => isStandortLive(standort));
  const plannedStandorte = filteredStandorte.filter((standort) => !isStandortLive(standort));
  const groupKpis = [
    ["Standorte im Blick", groupStandortFilter === "alle" ? `${liveStandorte.length} live` : liveStatusLabel(filteredStandorte[0]), plannedStandorte.length ? `${plannedStandorte.length} Standort ab 01.07.2026 vorbereitet` : "aktive BFS-Standorte"],
    ["Eingereichte Forderungen", money.format(filteredStandorte.reduce((sum, standort) => sum + standort.submittedThisMonth, 0)), "aktueller Monat"],
    ["Offene Klärfälle", String(focusedCases.length), groupFocus === "gesamt" ? "nach Standortfilter" : "nach Fokus gefiltert"],
    ["Ohne Ausfallschutz", money.format(focusedRisks.reduce((sum, claim) => sum + claim.amount, 0)), "laufende Risikohinweise"]
  ];
  return (
    <div className="content-stack">
      <GroupFilterBar
        selectedStandort={groupStandortFilter}
        selectedFocus={groupFocus}
        onStandortChange={setGroupStandortFilter}
        onFocusChange={setGroupFocus}
      />
      <KpiGrid cards={groupKpis} />
      <AnswerCockpit scope="group" cases={focusedCases} onNavigate={onNavigate} compact />
      <section className="dashboard-grid">
        <article className="panel command-panel">
          <div>
            <span className="eyebrow">Heute zuerst</span>
            <h2>{overdueCases.length} ältere Klärfälle und {money.format(chargebackTotal)} im Fokus</h2>
            <p>Beginne mit Rückbelastungen über 30 Tage, danach Wiedervorlagen und neue Importfehler prüfen.</p>
          </div>
          <div className="quick-actions">
            <button className="primary-button" onClick={() => onNavigate("worklist")}><ClipboardList size={16} /> Prioritäten öffnen</button>
            <button className="secondary-button" onClick={() => onNavigate("upload")}><Upload size={16} /> Monatsimport</button>
            <button className="secondary-button" onClick={() => onNavigate("reports")}><Printer size={16} /> Standortreport</button>
          </div>
        </article>
        <article className="panel process-panel">
          <h2>Monatslauf</h2>
          <div className="mini-process">
            <button onClick={() => onNavigate("upload")}>Upload</button>
            <button onClick={() => onNavigate("preview")}>Prüfen</button>
            <button onClick={() => onNavigate("cases")}>Fälle</button>
            <button onClick={() => onNavigate("reports")}>Reports</button>
          </div>
        </article>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Standortübersicht</h2>
            <p>Gefilterter Gruppenblick über Standorte, offene To-dos, Rückbelastungen und Risikohinweise.</p>
          </div>
          <button className="secondary-button" onClick={() => onNavigate("reports")}>
            <Printer size={16} /> Reports
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Standort</th>
                <th>Live seit</th>
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
              {filteredStandorte.map((standort) => (
                <tr key={standort.id}>
                  <td>
                    <strong>{standort.name}</strong>
                    <span>{standort.praxisname}</span>
                  </td>
                  <td><StatusBadge status={liveStatusLabel(standort)} /></td>
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
      <section className="insight-grid">
        <InsightCard title="Klärfälle nach Dringlichkeit" items={["Rot: älter als 30 Tage", "Orange: 15-30 Tage", "Gelb: 8-14 Tage"]} />
        <InsightCard title="Importkontrolle" items={["Unbekannte Mandant-Nr. prüfen", "Summenabweichungen blockieren", "Dubletten nicht importieren"]} />
        <InsightCard title="Reportversand" items={["Standort auswählen", "Nur offene Fälle filtern", "Druck/PDF oder CSV erzeugen"]} />
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

function GroupFilterBar({
  selectedStandort,
  selectedFocus,
  onStandortChange,
  onFocusChange
}: {
  selectedStandort: string;
  selectedFocus: string;
  onStandortChange: (value: string) => void;
  onFocusChange: (value: string) => void;
}) {
  return (
    <section className="panel group-filter-bar">
      <div>
        <span className="eyebrow">Gruppenfilter</span>
        <h2>Gesamtblick gezielt eingrenzen</h2>
      </div>
      <div className="filter-pill-row" aria-label="Standortfilter">
        <button className={selectedStandort === "alle" ? "active" : ""} onClick={() => onStandortChange("alle")}>Alle Standorte</button>
        {standorte.map((standort) => (
          <button key={standort.id} className={selectedStandort === standort.id ? "active" : ""} onClick={() => onStandortChange(standort.id)}>
            {standort.name}
            <span>{liveStatusLabel(standort)}</span>
          </button>
        ))}
      </div>
      <div className="filter-pill-row compact" aria-label="Fokusfilter">
        <button className={selectedFocus === "gesamt" ? "active" : ""} onClick={() => onFocusChange("gesamt")}>Gesamt</button>
        <button className={selectedFocus === "rueckbelastungen" ? "active" : ""} onClick={() => onFocusChange("rueckbelastungen")}>Rückbelastungen</button>
        <button className={selectedFocus === "wiedervorlagen" ? "active" : ""} onClick={() => onFocusChange("wiedervorlagen")}>Wiedervorlagen</button>
      </div>
    </section>
  );
}

function LocationDashboard({ standort, cases, onNavigate }: { standort: Standort; cases: BfsCase[]; onNavigate: (view: string) => void }) {
  return (
    <div className="content-stack">
      <KpiGrid standort={standort} />
      <AnswerCockpit scope="location" standort={standort} cases={cases} onNavigate={onNavigate} compact />
      <section className="dashboard-grid">
        <article className="panel command-panel">
          <div>
            <span className="eyebrow">Standortfokus</span>
            <h2>{standort.openCases} offene Fälle am Standort {standort.name}</h2>
            <p>Rückbelastungen zuerst prüfen, laufend ohne Ausfallschutz getrennt beobachten und Report für die Standortleitung erstellen.</p>
          </div>
          <div className="quick-actions">
            <button className="primary-button" onClick={() => onNavigate("cases")}><AlertCircle size={16} /> Offene Fälle</button>
            <button className="secondary-button" onClick={() => onNavigate("risks")}><ShieldCheck size={16} /> Risiko</button>
            <button className="secondary-button" onClick={() => onNavigate("reports")}><Printer size={16} /> Report</button>
          </div>
        </article>
        <article className="panel process-panel">
          <h2>Bearbeitungslogik</h2>
          <div className="stacked-checks">
            <span>1. echte Rückbelastungen klären</span>
            <span>2. fehlerhafte Rechnungen neu einreichen</span>
            <span>3. ohne Ausfallschutz beobachten</span>
          </div>
        </article>
      </section>
      <CasesView cases={cases} compact />
    </div>
  );
}

function AnswerCockpit({
  scope,
  standort,
  cases: rows,
  onNavigate,
  compact = false
}: {
  scope: "group" | "location";
  standort?: Standort;
  cases: BfsCase[];
  onNavigate: (view: string) => void;
  compact?: boolean;
}) {
  const relevantStandorte = standort ? [standort] : standorte;
  const openCases = rows.filter((fall) => !fall.status.includes("erledigt"));
  const chargebacks = openCases.filter((fall) => fall.reason.includes("Rückgabe") || fall.reason.includes("Rückbelastung"));
  const riskTotal = riskClaims
    .filter((claim) => relevantStandorte.some((entry) => entry.id === claim.standortId))
    .reduce((sum, claim) => sum + claim.amount, 0);
  const recurringRisks = getRecurringRiskProfiles(standort?.id).filter((profile) => relevantStandorte.some((entry) => entry.name === profile.standortName));
  const openAmount = openCases.reduce((sum, fall) => sum + fall.amount, 0);
  const submitted = relevantStandorte.reduce((sum, entry) => sum + entry.submittedThisMonth, 0);
  const fees = relevantStandorte.reduce((sum, entry) => sum + entry.feesThisMonth, 0);
  const oldest = openCases.reduce((max, fall) => Math.max(max, fall.ageDays), 0);
  const title = scope === "group" ? "Antwortcockpit für Standort-Rückfragen" : `Antwortcockpit ${standort?.name}`;

  return (
    <section className={compact ? "answer-cockpit compact" : "answer-cockpit"}>
      <div className="answer-header">
        <div>
          <span className="eyebrow">CFO-Schnellantworten</span>
          <h2>{title}</h2>
        </div>
        <button className="secondary-button" onClick={() => onNavigate("reports")}><Printer size={16} /> Report senden</button>
      </div>
      <div className="answer-grid">
        <button onClick={() => onNavigate("claims")}>
          <span>Wie viel wurde eingereicht?</span>
          <strong>{money.format(submitted)}</strong>
          <small>aktueller Monat</small>
        </button>
        <button onClick={() => onNavigate("cases")}>
          <span>Was ist noch offen?</span>
          <strong>{money.format(openAmount)}</strong>
          <small>{openCases.length} offene Klärfälle</small>
        </button>
        <button onClick={() => onNavigate("chargebacks")}>
          <span>Wie viele Rückläufer?</span>
          <strong>{chargebacks.length}</strong>
          <small>{money.format(chargebacks.reduce((sum, fall) => sum + fall.amount, 0))}</small>
        </button>
        <button onClick={() => onNavigate("risks")}>
          <span>Ohne Ausfallschutz?</span>
          <strong>{money.format(riskTotal)}</strong>
          <small>laufende Risikohinweise</small>
        </button>
        <button onClick={() => onNavigate("repeatRisks")}>
          <span>Wiederholer?</span>
          <strong>{recurringRisks.length}</strong>
          <small>mehrfach ohne Ausfallschutz</small>
        </button>
        <button onClick={() => onNavigate("claims")}>
          <span>BFS-Gebühren?</span>
          <strong>{money.format(fees)}</strong>
          <small>aktueller Monat</small>
        </button>
        <button onClick={() => onNavigate("worklist")}>
          <span>Ältester offener Fall?</span>
          <strong>{oldest} Tage</strong>
          <small>Priorität zuerst klären</small>
        </button>
      </div>
    </section>
  );
}

function ClaimsFlowView({ standort, cases: rows }: { standort?: Standort; cases: BfsCase[] }) {
  const rowsStandorte = standort ? [standort] : standorte;
  const periodOptions = buildCashflowPeriods();
  const [selectedPeriodId, setSelectedPeriodId] = useState(periodOptions[0].id);
  const selectedPeriod = periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0];
  return (
    <div className="content-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{standort ? `Forderungen & Geldfluss ${standort.name}` : "Forderungen & Geldfluss Gruppe"}</h2>
            <p>Vom Monatsimport bis zur Rückfrage: eingereicht, Gebühren, offene Klärfälle, Rückläufer und Risiko je Standort.</p>
          </div>
        </div>
        <div className="period-filter">
          <label className="select-label">
            Zeitraum
            <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
          </label>
          <div>
            <strong>{selectedPeriod.label}</strong>
            <span>{selectedPeriod.detail}. Vor dem jeweiligen Go-live des Standorts wird automatisch nichts gezählt.</span>
          </div>
        </div>
        <div className="cashflow-grid">
          {rowsStandorte.map((entry) => {
            const StandortCases = rows.filter((fall) => standort ? fall.standortId === entry.id : fall.standortId === entry.id);
            const openAmount = StandortCases.filter((fall) => !fall.status.includes("erledigt")).reduce((sum, fall) => sum + fall.amount, 0);
            const periodCashflow = cashflowForPeriod(entry, selectedPeriod);
            const riskAmount = riskClaims.filter((claim) => claim.standortId === entry.id).reduce((sum, claim) => sum + claim.amount, 0);
            const periodRiskAmount = Math.min(riskAmount, periodCashflow.withoutProtection);
            const paidEstimate = Math.max(periodCashflow.submitted - periodCashflow.fees - openAmount, 0);
            return (
              <article className="cashflow-card" key={entry.id}>
                <div>
                  <strong>{entry.name}</strong>
                  <span>{entry.praxisname}</span>
                  <small>{periodCashflow.activeMonths ? `${periodCashflow.activeMonths} aktive Monate ab ${periodCashflow.startLabel}` : `noch nicht live im Zeitraum, Start ${entry.goLiveLabel}`}</small>
                </div>
                <dl>
                  <div><dt>Eingereicht</dt><dd>{money.format(periodCashflow.submitted)}</dd></div>
                  <div><dt>geschätzt gutgeschrieben</dt><dd>{money.format(paidEstimate)}</dd></div>
                  <div><dt>BFS-Gebühren</dt><dd>{money.format(periodCashflow.fees)}</dd></div>
                  <div><dt>offene Klärfälle</dt><dd>{money.format(openAmount)}</dd></div>
                  <div><dt>Rückläufer offen</dt><dd>{money.format(periodCashflow.openChargebacks)}</dd></div>
                  <div><dt>ohne Ausfallschutz</dt><dd>{money.format(periodRiskAmount)}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>
      <CasesView cases={rows.filter((fall) => !fall.status.includes("erledigt"))} title="Offene Positionen zu diesem Geldfluss" description="Alle offenen Fälle, die den Forderungs- und Rückläuferstand erklären." />
    </div>
  );
}

function WorklistView({ cases: rows, onNavigate }: { cases: BfsCase[]; onNavigate: (view: string) => void }) {
  const sorted = [...rows].filter((fall) => !fall.status.includes("erledigt")).sort((a, b) => b.ageDays - a.ageDays);
  return (
    <div className="content-stack">
      <section className="priority-grid">
        <PriorityCard label="Sofort prüfen" value={String(sorted.filter((fall) => fall.ageDays > 30).length)} hint="älter als 30 Tage" tone="red" />
        <PriorityCard label="Diese Woche" value={String(sorted.filter((fall) => fall.ageDays >= 8 && fall.ageDays <= 30).length)} hint="8-30 Tage offen" tone="amber" />
        <PriorityCard label="Wiedervorlage" value={String(sorted.filter((fall) => fall.status === "wiedervorlage").length)} hint="mit Termin" tone="blue" />
        <PriorityCard label="Offener Betrag" value={money.format(sorted.reduce((sum, fall) => sum + fall.amount, 0))} hint="alle offenen Fälle" tone="green" />
      </section>
      <section className="panel slim-panel">
        <div className="panel-heading">
          <div>
            <h2>Arbeitsliste nach Priorität</h2>
            <p>Die Liste ist so sortiert, wie ein Standort oder die Zentrale sinnvollerweise abarbeitet.</p>
          </div>
          <button className="secondary-button" onClick={() => onNavigate("reports")}><Printer size={16} /> Report erzeugen</button>
        </div>
      </section>
      <CasesView cases={sorted} compact />
    </div>
  );
}

function PriorityCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: string }) {
  return (
    <article className={`priority-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function InsightCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="panel insight-card">
      <h2>{title}</h2>
      {items.map((item) => <span key={item}>{item}</span>)}
    </article>
  );
}

type PeriodOption = {
  id: string;
  label: string;
  detail: string;
  start?: Date;
  end?: Date;
};

const demoToday = new Date("2026-06-27T00:00:00");

function buildCashflowPeriods(): PeriodOption[] {
  const earliestGoLive = new Date(`${standorte.map((entry) => entry.goLiveDate).sort()[0]}T00:00:00`);
  const earliestStartYear = earliestGoLive.getFullYear();
  const currentYear = demoToday.getFullYear();
  const currentQuarter = Math.floor(demoToday.getMonth() / 3) + 1;
  const periods: PeriodOption[] = [
    {
      id: "since-start",
      label: "Seit Standortstart",
      detail: "je Standort ab eigenem MVZ-Start"
    },
    {
      id: `year-${currentYear}`,
      label: `${currentYear} gesamt`,
      detail: "bis zum aktuellen Monat",
      start: new Date(currentYear, 0, 1),
      end: demoToday
    }
  ];

  for (let year = currentYear; year >= earliestStartYear; year -= 1) {
    const maxQuarter = year === currentYear ? currentQuarter : 4;
    for (let quarter = maxQuarter; quarter >= 1; quarter -= 1) {
      const quarterStart = new Date(year, (quarter - 1) * 3, 1);
      const quarterEnd = new Date(year, quarter * 3, 0);
      if (quarterEnd < earliestGoLive) continue;
      periods.push({
        id: `q${quarter}-${year}`,
        label: `Q${quarter} ${year}`,
        detail: year === currentYear && quarter === currentQuarter ? "laufendes Quartal" : "Quartal",
        start: quarterStart,
        end: quarterEnd > demoToday ? demoToday : quarterEnd
      });
    }

    if (year !== currentYear) {
      periods.push({
        id: `year-${year}`,
        label: `${year} gesamt`,
        detail: "Kalenderjahr",
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31)
      });
    }
  }

  return periods;
}

function cashflowForPeriod(standort: Standort, period: PeriodOption) {
  const goLive = new Date(`${standort.goLiveDate}T00:00:00`);
  const periodStart = period.start ? maxDate(period.start, goLive) : goLive;
  const periodEnd = period.end ? minDate(period.end, demoToday) : demoToday;
  const activeMonths = periodEnd < periodStart ? 0 : countStartedMonths(periodStart, periodEnd);
  const scale = activeMonths;

  return {
    activeMonths,
    startLabel: formatMonth(periodStart),
    submitted: standort.submittedThisMonth * scale,
    fees: standort.feesThisMonth * scale,
    openChargebacks: standort.openChargebacks * Math.min(scale, 1),
    withoutProtection: standort.withoutProtection * scale
  };
}

function countStartedMonths(start: Date, end: Date) {
  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  return (endMonth.getFullYear() - startMonth.getFullYear()) * 12 + endMonth.getMonth() - startMonth.getMonth() + 1;
}

function maxDate(a: Date, b: Date) {
  return a > b ? a : b;
}

function minDate(a: Date, b: Date) {
  return a < b ? a : b;
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { month: "2-digit", year: "numeric" }).format(date);
}

function KpiGrid({ standort, cards: customCards }: { standort?: Standort; cards?: string[][] }) {
  const cards = customCards ?? (standort
    ? [
        ["Eingereicht aktueller Monat", money.format(standort.submittedThisMonth), "Aus BFS-Abrechnungen"],
        ["BFS-Gebühren", money.format(standort.feesThisMonth), "Netto und MwSt"],
        ["Offene BFS-Klärfälle", String(standort.openCases), "echte To-dos"],
        ["Laufend ohne Ausfallschutz", money.format(standort.withoutProtection), "Risikoüberwachung"]
      ]
    : monthlyKpis);
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
  const [liveRows, setLiveRows] = useState<ImportPreviewRow[]>(() => loadStoredImportRows());
  const [isProcessing, setIsProcessing] = useState(false);
  const previewRows = liveRows.length ? liveRows : importPreviewRows;
  const okRows = previewRows.filter((row) => row.status === "OK").length;
  const warningRows = previewRows.length - okRows;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setIsProcessing(true);
    try {
      const parsedRows = await parseDemoImportFiles([...files]);
      setLiveRows(parsedRows);
      storeImportRows(parsedRows);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="content-stack">
      <section className="upload-zone">
        <HardDriveUpload size={28} />
        <div>
          <h2>Testdateien für den Monats-Sammelimport hochladen</h2>
          <p>Die Demo liest echte Dateien, berechnet Hashes, erkennt Mandant-Nr. und zeigt sofort, wo Zuordnung oder Parsing noch geprüft werden müssen.</p>
        </div>
        <label className="file-upload-button">
          <Upload size={16} />
          Dateien auswählen
          <input type="file" multiple accept=".pdf,.zip,.csv,.txt,.json,application/pdf,application/zip,text/*" onChange={(event) => handleFiles(event.target.files)} />
        </label>
      </section>
      <section className="priority-grid">
        <PriorityCard label="Dateien im Lauf" value={String(previewRows.length)} hint={liveRows.length ? "aus deinem Testupload" : "Demo-Vorschau"} tone="blue" />
        <PriorityCard label="Importfähig" value={String(okRows)} hint="ohne harte Hinweise" tone="green" />
        <PriorityCard label="Zu prüfen" value={String(warningRows)} hint="Mapping oder Parsing" tone="amber" />
        <PriorityCard label="Verarbeitung" value={isProcessing ? "läuft" : "bereit"} hint="lokaler Demo-Import" tone={isProcessing ? "amber" : "green"} />
      </section>
      {liveRows.length > 0 && (
        <section className="panel slim-panel">
          <div className="panel-heading">
            <div>
              <h2>Live-Testupload aktiv</h2>
              <p>Diese Vorschau basiert auf deinen hochgeladenen Dateien und bleibt lokal im Browser gespeichert.</p>
            </div>
            <button
              className="secondary-button"
              onClick={() => {
                setLiveRows([]);
                window.localStorage.removeItem("orisus_bfs_monitor_import_preview");
              }}
            >
              Testlauf zurücksetzen
            </button>
          </div>
        </section>
      )}
      <ImportPreview rows={previewRows} />
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
              <th>Hinweise</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.file}-${row.fileHash ?? row.statementNo}`}>
                <td>
                  <strong>{row.file}</strong>
                  <span>{row.practice}</span>
                  {row.fileHash && <small>{formatBytes(row.fileSizeBytes ?? 0)} · Hash {row.fileHash.slice(0, 10)}</small>}
                </td>
                <td>{row.location}</td>
                <td>{row.mandantNo}</td>
                <td>{row.statementNo} / {row.date}</td>
                <td>{row.claimsHeader} / {row.claimsExtracted}</td>
                <td>{money.format(row.sumHeader)} / {money.format(row.sumExtracted)}</td>
                <td>{row.hasLedger ? `${row.movements} Bewegungen` : "fehlt"}</td>
                <td><StatusBadge status={row.status} /></td>
                <td>
                  <div className="note-list">
                    {(row.parseNotes ?? ["Demo-Datensatz"]).slice(0, 3).map((note) => (
                      <span key={note}><AlertTriangle size={13} /> {note}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function loadStoredImportRows() {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem("orisus_bfs_monitor_import_preview");
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ImportPreviewRow[];
  } catch {
    return [];
  }
}

function storeImportRows(rows: ImportPreviewRow[]) {
  window.localStorage.setItem("orisus_bfs_monitor_import_preview", JSON.stringify(rows));
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function CasesView({ cases: rows, compact = false, title, description }: { cases: BfsCase[]; compact?: boolean; title?: string; description?: string }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title ?? (compact ? "Offene Fälle am Standort" : "Offene Rückbelastungen / Klärfälle")}</h2>
          <p>{description ?? "Originaldaten sind read-only; nur interne Bearbeitung und Erledigungsgründe werden gepflegt."}</p>
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

function getRecurringRiskProfiles(standortId?: string) {
  const rows = riskClaims.filter((claim) => !standortId || claim.standortId === standortId);
  const groups = new Map<string, RiskClaim[]>();

  rows.forEach((claim) => {
    const key = `${claim.standortId}:${claim.patientName.toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), claim]);
  });

  return [...groups.values()]
    .filter((claims) => claims.length > 1)
    .map((claims) => {
      const first = claims[0];
      const standort = standorte.find((entry) => entry.id === first.standortId);
      const sortedClaims = [...claims].sort((a, b) => parseGermanDate(b.date).getTime() - parseGermanDate(a.date).getTime());
      const total = claims.reduce((sum, claim) => sum + claim.amount, 0);
      const tone = claims.length >= 3 || total >= 500 ? "red" : "amber";
      return {
        id: `${first.standortId}-${first.patientName}`,
        standortName: standort?.name ?? first.standortId,
        patientName: first.patientName,
        count: claims.length,
        total,
        lastDate: sortedClaims[0].date,
        tone,
        recommendation: tone === "red"
          ? "Sperrhinweis / Praxisprozess prüfen"
          : "Standort informieren und beobachten",
        claims: sortedClaims
      };
    })
    .sort((a, b) => b.count - a.count || b.total - a.total);
}

function parseGermanDate(value: string) {
  const [day, month, year] = value.split(".").map(Number);
  return new Date(year, month - 1, day);
}

function RecurringRiskView({ standortId, compact = false }: { standortId?: string; compact?: boolean }) {
  const profiles = getRecurringRiskProfiles(standortId);
  const urgent = profiles.filter((profile) => profile.tone === "red");
  const total = profiles.reduce((sum, profile) => sum + profile.total, 0);

  return (
    <div className="content-stack">
      {!compact && (
        <section className="priority-grid">
          <PriorityCard label="Wiederholer" value={String(profiles.length)} hint="Patienten mehrfach ohne Schutz" tone={urgent.length ? "red" : "amber"} />
          <PriorityCard label="Maßnahme nötig" value={String(urgent.length)} hint="ab 3 Einreichungen oder hoher Summe" tone="red" />
          <PriorityCard label="Risikosumme" value={money.format(total)} hint="mehrfach eingereicht ohne Schutz" tone="amber" />
          <PriorityCard label="Letzte Sichtung" value={profiles[0]?.lastDate ?? "-"} hint="neueste betroffene Abrechnung" tone="blue" />
        </section>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Wiederholer ohne Ausfallschutz</h2>
            <p>Patienten, die mehrfach über BFS eingereicht wurden, obwohl sie ohne Ausfallschutz gekennzeichnet sind.</p>
          </div>
        </div>
        {profiles.length ? (
          <>
            <div className="risk-profile-grid">
              {profiles.map((profile) => (
                <article className={`risk-profile-card ${profile.tone}`} key={profile.id}>
                  <div>
                    <span>{profile.standortName}</span>
                    <strong>{profile.patientName}</strong>
                  </div>
                  <dl>
                    <div><dt>Einreichungen</dt><dd>{profile.count}</dd></div>
                    <div><dt>Risikosumme</dt><dd>{money.format(profile.total)}</dd></div>
                    <div><dt>zuletzt</dt><dd>{profile.lastDate}</dd></div>
                  </dl>
                  <StatusBadge status={profile.recommendation} />
                </article>
              ))}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Standort</th>
                    <th>Einreichungen</th>
                    <th>Summe</th>
                    <th>Letzte Abrechnung</th>
                    <th>Empfehlung</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={`${profile.id}-row`}>
                      <td><strong>{profile.patientName}</strong><span>{profile.claims.map((claim) => claim.invoiceNo).join(", ")}</span></td>
                      <td>{profile.standortName}</td>
                      <td>{profile.count}</td>
                      <td>{money.format(profile.total)}</td>
                      <td>{profile.lastDate}</td>
                      <td><StatusBadge status={profile.recommendation} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="empty-state">Keine mehrfachen Patienten ohne Ausfallschutz im aktuellen Datenstand.</p>
        )}
      </section>
    </div>
  );
}

function MatchesView({ cases: rows }: { cases: BfsCase[] }) {
  const matched = rows.filter((fall) => fall.status.includes("automatisch"));
  return (
    <CasesView cases={matched.length ? matched : rows.slice(0, 2).map((fall) => ({ ...fall, status: "neueinreichung_vorschlag", reason: "Neueinreichungsvorschlag" }))} />
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
        <h3>Abschnitt 3: Wiederholer ohne Ausfallschutz</h3>
        <RecurringRiskView standortId={standort.id} compact />
      </section>
    </div>
  );
}

function GroupReportsView({ onNavigate }: { onNavigate: (view: string) => void }) {
  return (
    <div className="content-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Gruppenreport</h2>
            <p>Konsolidierte Auswertung über alle Standorte für Zentrale und Monatsabschluss.</p>
          </div>
          <button className="secondary-button" onClick={() => onNavigate("reports")}><FileText size={16} /> Report je Standort</button>
        </div>
        <div className="report-type-grid">
          <button onClick={() => onNavigate("cases")}><AlertCircle size={18} /> Offene Klärfälle gruppiert</button>
          <button onClick={() => onNavigate("chargebacks")}><CircleDollarSign size={18} /> Rückbelastungen je Standort</button>
          <button onClick={() => onNavigate("risks")}><ShieldCheck size={18} /> Ohne Ausfallschutz laufend</button>
          <button onClick={() => onNavigate("history")}><FileArchive size={18} /> Monatsimport-Status</button>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Auswertungsfilter</h2>
            <p>Vorbereitet für Zeitraum, Standort, Status, Falltyp und Sortierung.</p>
          </div>
        </div>
        <div className="filter-grid">
          <label>Zeitraum<select><option>Aktueller Monat</option><option>Letzte 3 Monate</option></select></label>
          <label>Status<select><option>Nur offene Fälle</option><option>inkl. erledigte Fälle</option></select></label>
          <label>Falltyp<select><option>Alle Falltypen</option><option>Rückbelastungen</option><option>Fehlerhafte Rechnungen</option></select></label>
          <label>Sortierung<select><option>Alter absteigend</option><option>Betrag absteigend</option><option>Standort</option></select></label>
        </div>
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
            <StatusBadge status={isStandortLive(standort) ? `live seit ${standort.goLiveLabel}` : `geplant ab ${standort.goLiveLabel}`} />
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
    : normalized.includes("warn") || normalized.includes("vorschlag") || normalized.includes("ohne") || normalized.includes("beobachten")
      ? "amber"
      : normalized.includes("fehler") || normalized.includes("offen") || normalized.includes("sperrhinweis") || normalized.includes("praxisprozess")
        ? "red"
        : "gray";
  return <span className={`status ${tone}`}>{status}</span>;
}

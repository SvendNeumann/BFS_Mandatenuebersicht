"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Download,
  ChevronDown,
  FileArchive,
  FileText,
  FolderUp,
  HardDriveUpload,
  Info,
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
  bfsPeriodMetrics,
  dashboardSeries,
  importPreviewRows,
  monthlyKpis,
  riskClaims,
  standorte,
  isStandortLive,
  liveStatusLabel,
  users
} from "@/lib/demo-data";
import type { AppRole, BfsCase, BfsPeriodMetric, ImportPreviewRow, RiskClaim, Standort } from "@/lib/types";
import { createCasesCsv, downloadTextFile } from "@/lib/reporting";
import { enablePasskey, getDemoSession, hasSavedPasskey, logout, removePasskey, type DemoSession } from "@/lib/auth";
import { parseDemoImportFiles, reconcileImportRows } from "@/lib/demo-import";

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
      ["patientClasses", "Patientenklassifizierung", Users],
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
      ["reports", "Report-Center", FileText],
      ["outcomes", "Maßnahmenkontrolle", ClipboardCheck],
      ["groupReports", "Gruppenreports", BarChart3]
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
      ["patientClasses", "Patientenklassifizierung", Users],
      ["matches", "Neueinreichungen", RefreshCw]
    ]
  },
  {
    title: "Auswertung",
    items: [
      ["reports", "Report-Center", FileText],
      ["outcomes", "Maßnahmenkontrolle", ClipboardCheck],
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
  const [liveImportRows, setLiveImportRows] = useState<ImportPreviewRow[]>(() => loadStoredImportRows());
  const selectedStandort = standorte.find((standort) => standort.id === selectedStandortId) ?? standorte[0];
  const isGroupScope = role === "super_admin" && selectedStandortId === "gruppe";
  const previewRows = liveImportRows.length ? liveImportRows : importPreviewRows;
  const appCases = useMemo(() => {
    const importedCases = casesFromImportRows(liveImportRows);
    return importedCases.length ? importedCases : cases;
  }, [liveImportRows]);
  const visibleCases = useMemo(
    () => appCases.filter((fall) => isGroupScope || fall.standortId === selectedStandort.id),
    [appCases, isGroupScope, selectedStandort.id]
  );
  const nav = role === "super_admin" ? superAdminNav : leadNav;

  useEffect(() => {
    let active = true;
    loadStoredImportRowsFromDb()
      .then((rows) => {
        if (active && rows.length) setLiveImportRows(rows);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

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
          <div className="mobile-app-brand" aria-label="Orisus Zahnmedizin">
            <strong>ORISUS</strong>
            <span>ZAHNMEDIZIN</span>
          </div>
          <button className="mobile-menu-button" aria-label="Navigation öffnen" onClick={() => setMobileNavOpen(true)}>
            <Menu size={18} />
          </button>
          <div className="topbar-title desktop-page-title">
            <span className="eyebrow">{isGroupScope ? "Alle Standorte" : selectedStandort.name}</span>
            <h1>{titleFor(activeView, role, isGroupScope)}</h1>
          </div>
          <div className="topbar-actions desktop-page-actions">
            {activeView !== "dashboard" && <button className="secondary-button" onClick={() => setActiveView("worklist")}><ClipboardList size={16} /> Prioritäten</button>}
            {role === "super_admin" && activeView !== "dashboard" && <button className="primary-button" onClick={() => setActiveView("upload")}><Upload size={16} /> Upload</button>}
          </div>
        </header>
        <div className="mobile-page-heading">
          <div>
            <span className="eyebrow">{isGroupScope ? "Alle Standorte" : selectedStandort.name}</span>
            <h1>{titleFor(activeView, role, isGroupScope)}</h1>
          </div>
          <div className="topbar-actions">
            {activeView !== "dashboard" && <button className="secondary-button" onClick={() => setActiveView("worklist")}><ClipboardList size={16} /> Prioritäten</button>}
            {role === "super_admin" && activeView !== "dashboard" && <button className="primary-button" onClick={() => setActiveView("upload")}><Upload size={16} /> Upload</button>}
          </div>
        </div>

        <StandortTabs
          role={role}
          selectedStandortId={selectedStandortId}
          onSelect={selectStandortTab}
        />

        {activeView === "dashboard" && (
          role === "super_admin" && isGroupScope
            ? <GroupDashboard onNavigate={setActiveView} importRows={liveImportRows} />
            : <LocationDashboard standort={selectedStandort} cases={visibleCases} onNavigate={setActiveView} importRows={liveImportRows} />
        )}
        {activeView === "worklist" && <WorklistView cases={visibleCases} onNavigate={setActiveView} />}
        {activeView === "answers" && <AnswerCockpit scope={isGroupScope ? "group" : "location"} standort={selectedStandort} cases={visibleCases} onNavigate={setActiveView} importRows={liveImportRows} />}
        {activeView === "claims" && <ClaimsFlowView standort={isGroupScope ? undefined : selectedStandort} cases={visibleCases} importRows={liveImportRows} />}
        {activeView === "upload" && <UploadView liveRows={liveImportRows} onRowsChange={setLiveImportRows} />}
        {activeView === "preview" && <ImportPreview rows={previewRows} />}
        {activeView === "history" && <ImportHistory rows={previewRows} />}
        {activeView === "cases" && <CasesView cases={visibleCases} />}
        {activeView === "chargebacks" && <CasesView cases={visibleCases.filter((fall) => fall.reason.includes("Rückgabe") || fall.reason.includes("Rückbelastung"))} title="Rückbelastungen" description="Alle echten Rückbelastungen, die aktiv geklärt oder an den Standort gegeben werden müssen." />}
        {activeView === "followups" && <CasesView cases={visibleCases.filter((fall) => fall.status === "wiedervorlage" || fall.dueDate !== "-")} title="Wiedervorlagen" description="Fälle mit Frist, Rückfrage oder nächstem Bearbeitungstermin." />}
        {activeView === "risks" && <RiskView standortId={isGroupScope ? undefined : selectedStandort.id} importRows={liveImportRows} />}
        {activeView === "repeatRisks" && <RecurringRiskView standortId={isGroupScope ? undefined : selectedStandort.id} importRows={liveImportRows} />}
        {activeView === "patientClasses" && <PatientClassificationView standort={isGroupScope ? undefined : selectedStandort} cases={visibleCases} importRows={liveImportRows} />}
        {activeView === "matches" && <MatchesView cases={visibleCases} importRows={liveImportRows} />}
        {activeView === "reports" && <ReportsView role={role} standort={selectedStandort} cases={visibleCases} importRows={liveImportRows} />}
        {activeView === "outcomes" && <OutcomeControlView standort={isGroupScope ? undefined : selectedStandort} cases={visibleCases} importRows={liveImportRows} />}
        {activeView === "groupReports" && (isGroupScope ? <GroupReportsView onNavigate={setActiveView} /> : <ReportsView role={role} standort={selectedStandort} cases={visibleCases} importRows={liveImportRows} />)}
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
    patientClasses: "Patientenklassifizierung",
    matches: "Neueinreichungsvorschläge",
    reports: "Report-Center",
    outcomes: "Maßnahmenkontrolle",
    groupReports: "Gruppenreports",
    locations: "Standorte",
    users: "Nutzerverwaltung",
    settings: "Einstellungen"
  };
  return titles[view] ?? "Orisus BFS Monitor";
}

function GroupDashboard({ onNavigate, importRows }: { onNavigate: (view: string) => void; importRows: ImportPreviewRow[] }) {
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
  const importSummary = summarizeImportRows(importRows.filter((row) => filteredStandorte.some((standort) => standort.name === row.location)));
  const liveStandorte = filteredStandorte.filter((standort) => isStandortLive(standort));
  const plannedStandorte = filteredStandorte.filter((standort) => !isStandortLive(standort));
  const groupKpis = [
    ["Standorte im Blick", groupStandortFilter === "alle" ? `${liveStandorte.length} live` : liveStatusLabel(filteredStandorte[0]), plannedStandorte.length ? `${plannedStandorte.length} Standort ab 01.07.2026 vorbereitet` : "aktive BFS-Standorte"],
    ["Eingereichte Forderungen", money.format(importSummary.rows ? importSummary.submitted : filteredStandorte.reduce((sum, standort) => sum + standort.submittedThisMonth, 0)), importSummary.rows ? "aus aktuellem Testupload" : "aktueller Monat"],
    ["Offene Klärfälle", String(focusedCases.length), groupFocus === "gesamt" ? "nach Standortfilter" : "nach Fokus gefiltert"],
    ["Ohne Ausfallschutz", money.format(importSummary.rows ? importSummary.noProtectionAmount : focusedRisks.reduce((sum, claim) => sum + claim.amount, 0)), importSummary.rows ? "aus aktuellem Testupload" : "laufende Risikohinweise"]
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
      <AnswerCockpit scope="group" cases={focusedCases} onNavigate={onNavigate} compact showReportAction={false} importRows={importRows} />
      <section className="panel import-preview-panel">
        <div className="panel-heading import-preview-heading">
          <div>
            <h2>Standortübersicht</h2>
            <p>Gefilterter Gruppenblick über Standorte, Eingänge, Gebühren, Rückbelastungen und Risikohinweise.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Standort</th>
                <th>Live seit</th>
                <th>Letzter Import</th>
                <th>Umsatz eingereicht</th>
                <th>Gesamtkosten BFS</th>
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
      <section className="chart-grid">
        {dashboardSeries.map((chart) => (
          <div className="panel mini-chart" key={chart.title}>
            <h2>{chart.title}</h2>
            <small className="period-note">Zeitraum: aktueller Trendvergleich</small>
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

function LocationDashboard({ standort, cases, onNavigate, importRows }: { standort: Standort; cases: BfsCase[]; onNavigate: (view: string) => void; importRows: ImportPreviewRow[] }) {
  const periodOptions = buildCashflowPeriods();
  const [selectedPeriodId, setSelectedPeriodId] = useState(periodOptions[0].id);
  const selectedPeriod = periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0];
  const locationImportRows = importRows.filter((row) => row.location === standort.name && importRowInPeriod(row, selectedPeriod, standort));
  const importSummary = summarizeImportRows(locationImportRows);
  const selectedMetrics = importSummary.rows ? metricsFromImportSummary(importSummary) : aggregateMetrics([standort.id], selectedPeriod);
  const selectedCashflow = importSummary.rows ? cashflowFromImportSummary(importSummary) : cashflowForPeriod(standort, selectedPeriod);
  const periodLabel = importSummary.rows ? selectedPeriod.label : selectedPeriod.label;
  const openCases = cases.filter((fall) => !fall.status.includes("erledigt"));
  const locationKpis = [
    ["Umsatz eingereicht", money.format(selectedMetrics.submitted), periodLabel],
    ["BFS-Gebühr netto", money.format(selectedMetrics.feeNet), periodLabel],
    ["MwSt auf Gebühren", money.format(selectedMetrics.feeVat), periodLabel],
    ["Auszahlungsbetrag", money.format(selectedMetrics.payout), periodLabel],
    ["Gesamtkosten BFS", money.format(selectedMetrics.fees), periodLabel],
    ["Laufend ohne Ausfallschutz", money.format(selectedMetrics.noProtectionAmount), periodLabel]
  ];

  return (
    <div className="content-stack">
      <section className="panel period-filter">
        <label className="select-label">
          Zeitraum Standort-Dashboard
          <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>
            {periodOptions.map((period) => (
              <option key={period.id} value={period.id}>{period.label}</option>
            ))}
          </select>
        </label>
        <div>
          <strong>{periodLabel}</strong>
          <span>{selectedCashflow.activeMonths ? `${selectedCashflow.activeMonths} aktive Monate ab ${selectedCashflow.startLabel}` : `${standort.name} ist in diesem Zeitraum noch nicht aktiv`}. Klärfälle ohne echtes Falldatum bleiben als aktueller Datenstand ausgewiesen.</span>
        </div>
      </section>
      <KpiGrid cards={locationKpis} />
        <AnswerCockpit scope="location" standort={standort} cases={cases} onNavigate={onNavigate} compact showReportAction={false} importRows={locationImportRows} periodMetrics={selectedMetrics} periodLabel={periodLabel} />
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
            <button className="secondary-button" onClick={() => onNavigate("claims")}><ReceiptText size={16} /> Geldfluss</button>
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
  compact = false,
  showReportAction = false,
  importRows = [],
  periodMetrics,
  periodLabel
}: {
  scope: "group" | "location";
  standort?: Standort;
  cases: BfsCase[];
  onNavigate: (view: string) => void;
  compact?: boolean;
  showReportAction?: boolean;
  importRows?: ImportPreviewRow[];
  periodMetrics?: ReturnType<typeof aggregateMetrics>;
  periodLabel?: string;
}) {
  const relevantStandorte = standort ? [standort] : standorte;
  const importSummary = summarizeImportRows(importRows.filter((row) => relevantStandorte.some((entry) => entry.name === row.location)));
  const openCases = rows.filter((fall) => !fall.status.includes("erledigt"));
  const chargebacks = openCases.filter((fall) => fall.reason.includes("Rückgabe") || fall.reason.includes("Rückbelastung"));
  const riskTotal = riskClaims
    .filter((claim) => relevantStandorte.some((entry) => entry.id === claim.standortId))
    .reduce((sum, claim) => sum + claim.amount, 0);
  const recurringRisks = getRecurringRiskProfiles(standort?.id, importRows).filter((profile) => relevantStandorte.some((entry) => entry.name === profile.standortName));
  const openAmount = openCases.reduce((sum, fall) => sum + fall.amount, 0);
  const submitted = importSummary.rows ? importSummary.submitted : periodMetrics?.submitted ?? relevantStandorte.reduce((sum, entry) => sum + entry.submittedThisMonth, 0);
  const fees = importSummary.rows ? importSummary.fees : periodMetrics?.fees ?? relevantStandorte.reduce((sum, entry) => sum + entry.feesThisMonth, 0);
  const feeNet = importSummary.rows ? importSummary.feeNet : periodMetrics?.feeNet ?? fees;
  const feeVat = importSummary.rows ? importSummary.feeVat : periodMetrics?.feeVat ?? 0;
  const noProtectionAmount = importSummary.rows ? importSummary.noProtectionAmount : periodMetrics?.noProtectionAmount ?? riskTotal;
  const oldest = openCases.reduce((max, fall) => Math.max(max, fall.ageDays), 0);
  const title = scope === "group" ? "Antwortcockpit für Standort-Rückfragen" : `Antwortcockpit ${standort?.name}`;
  const resolvedPeriodLabel = periodLabel ?? (importSummary.rows ? "aktueller Testupload" : "aktueller Monat");

  return (
    <section className={compact ? "answer-cockpit compact" : "answer-cockpit"}>
      <div className="answer-header">
        <div>
          <span className="eyebrow">CFO-Schnellantworten</span>
          <h2>{title}</h2>
        </div>
        {showReportAction && <button className="secondary-button" onClick={() => onNavigate("reports")}><Printer size={16} /> Report senden</button>}
      </div>
      <div className="answer-grid">
        <button onClick={() => onNavigate("claims")}>
          <span>Umsatz eingereicht?</span>
          <strong>{money.format(submitted)}</strong>
          <small>{resolvedPeriodLabel}</small>
          <small className="period-note">{periodLabelFromHint(resolvedPeriodLabel)}</small>
        </button>
        <button onClick={() => onNavigate("cases")}>
          <span>Was ist noch offen?</span>
          <strong>{money.format(openAmount)}</strong>
          <small>{openCases.length} offene Klärfälle</small>
          <small className="period-note">Zeitraum: aktueller Datenstand</small>
        </button>
        <button onClick={() => onNavigate("chargebacks")}>
          <span>Wie viele Rückläufer?</span>
          <strong>{chargebacks.length}</strong>
          <small>{money.format(chargebacks.reduce((sum, fall) => sum + fall.amount, 0))}</small>
          <small className="period-note">Zeitraum: aktueller Datenstand</small>
        </button>
        <button onClick={() => onNavigate("risks")}>
          <span>Ohne Ausfallschutz?</span>
          <strong>{money.format(noProtectionAmount)}</strong>
          <small>{resolvedPeriodLabel}</small>
          <small className="period-note">{periodLabelFromHint(resolvedPeriodLabel)}</small>
        </button>
        <button onClick={() => onNavigate("repeatRisks")}>
          <span>Wiederholer?</span>
          <strong>{recurringRisks.length}</strong>
          <small>mehrfach ohne Ausfallschutz</small>
          <small className="period-note">Zeitraum: aktueller Datenstand</small>
        </button>
        <button onClick={() => onNavigate("claims")}>
          <span>BFS-Kosten?</span>
          <strong>{money.format(fees)}</strong>
          <small>Gebühr {money.format(feeNet)} · MwSt {money.format(feeVat)}</small>
          <small className="period-note">{periodLabelFromHint(resolvedPeriodLabel)}</small>
        </button>
        <button onClick={() => onNavigate("worklist")}>
          <span>Ältester offener Fall?</span>
          <strong>{oldest} Tage</strong>
          <small>Priorität zuerst klären</small>
          <small className="period-note">Zeitraum: aktueller Datenstand</small>
        </button>
      </div>
    </section>
  );
}

function ClaimsFlowView({ standort, cases: rows, importRows = [] }: { standort?: Standort; cases: BfsCase[]; importRows?: ImportPreviewRow[] }) {
  const rowsStandorte = standort ? [standort] : standorte;
  const periodOptions = buildCashflowPeriods();
  const [selectedPeriodId, setSelectedPeriodId] = useState(periodOptions[0].id);
  const selectedPeriod = periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0];
  const scopedImportRows = importRows.filter((row) => {
    const rowStandort = rowsStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedPeriod, rowStandort) : false;
  });
  const allScopedLocationRows = importRows.filter((row) => rowsStandorte.some((entry) => entry.name === row.location));
  const importSummary = summarizeImportRows(scopedImportRows);
  const selectedMetrics = importSummary.rows ? metricsFromImportSummary(importSummary) : aggregateMetrics(rowsStandorte.map((entry) => entry.id), selectedPeriod);
  const recentMonths = buildRecentMonthlyTrend(rowsStandorte.map((entry) => entry.id));
  const quarterRows = buildQuarterComparison(rowsStandorte.map((entry) => entry.id));
  const recoveryMatches = resubmissionCandidatesFromImportRows(allScopedLocationRows)
    .filter((candidate) => {
      const candidateStandort = rowsStandorte.find((entry) => entry.name === candidate.locationName);
      return candidateStandort ? shortDateInPeriod(candidate.originalDate, selectedPeriod, candidateStandort) : false;
    });
  const deductionAmount = selectedMetrics.returnAmount + selectedMetrics.cancellationAmount;
  const recoveredAmount = recoveryMatches.reduce((sum, candidate) => sum + candidate.newAmount, 0);
  const stillOpenAmount = Math.max(deductionAmount - recoveredAmount, 0);
  const recoveryRate = deductionAmount ? Math.min(100, (recoveredAmount / deductionAmount) * 100) : 0;

  return (
    <div className="content-stack">
      <section className="priority-grid">
        <PriorityCard label="Umsatz eingereicht" value={money.format(selectedMetrics.submitted)} hint="Summe aus Abrechnungen" period={selectedPeriod.label} tone="blue" />
        <PriorityCard label="BFS-Gebühr netto" value={money.format(selectedMetrics.feeNet)} hint="ohne MwSt" period={selectedPeriod.label} tone="amber" />
        <PriorityCard label="MwSt auf Gebühren" value={money.format(selectedMetrics.feeVat)} hint="separat erkannt" period={selectedPeriod.label} tone="amber" />
        <PriorityCard label="Auszahlungsbetrag" value={money.format(selectedMetrics.payout)} hint="nach BFS-Abzug" period={selectedPeriod.label} tone="green" />
        <PriorityCard label="Gesamtkosten BFS" value={money.format(selectedMetrics.fees)} hint={`${selectedMetrics.feeRate.toFixed(2)} % vom Eingang`} period={selectedPeriod.label} tone="amber" />
        <PriorityCard label="Rückläufer" value={String(selectedMetrics.returnCount)} hint={money.format(selectedMetrics.returnAmount)} period={selectedPeriod.label} tone={selectedMetrics.returnCount ? "red" : "green"} />
        <PriorityCard label="Stornierungen" value={String(selectedMetrics.cancellationCount)} hint={money.format(selectedMetrics.cancellationAmount)} period={selectedPeriod.label} tone={selectedMetrics.cancellationCount ? "amber" : "green"} />
      </section>
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
            const rowImportSummary = summarizeImportRows(importRows.filter((row) => row.location === entry.name && importRowInPeriod(row, selectedPeriod, entry)));
            const periodCashflow = rowImportSummary.rows ? cashflowFromImportSummary(rowImportSummary) : cashflowForPeriod(entry, selectedPeriod);
            const riskAmount = riskClaims.filter((claim) => claim.standortId === entry.id).reduce((sum, claim) => sum + claim.amount, 0);
            const periodRiskAmount = periodCashflow.withoutProtection || Math.min(riskAmount, standort ? riskAmount : entry.withoutProtection);
            const paidEstimate = periodCashflow.payout || Math.max(periodCashflow.submitted - periodCashflow.fees - openAmount, 0);
            return (
              <article className="cashflow-card" key={entry.id}>
                <div>
                  <strong>{entry.name}</strong>
                  <span>{entry.praxisname}</span>
                  <small>{periodCashflow.activeMonths ? `${periodCashflow.activeMonths} aktive Monate ab ${periodCashflow.startLabel}` : `noch nicht live im Zeitraum, Start ${entry.goLiveLabel}`}</small>
                </div>
                <dl>
                  <div><dt>Umsatz eingereicht</dt><dd>{money.format(periodCashflow.submitted)}</dd></div>
                  <div><dt>Auszahlungsbetrag</dt><dd>{money.format(paidEstimate)}</dd></div>
                  <div><dt>BFS-Gebühr netto</dt><dd>{money.format(periodCashflow.feeNet)}</dd></div>
                  <div><dt>MwSt</dt><dd>{money.format(periodCashflow.feeVat)}</dd></div>
                  <div><dt>Gesamtkosten BFS</dt><dd>{money.format(periodCashflow.fees)}</dd></div>
                  <div><dt>offene Klärfälle</dt><dd>{money.format(openAmount)}</dd></div>
                  <div><dt>Rückläufer</dt><dd>{periodCashflow.returnCount} / {money.format(periodCashflow.returnAmount)}</dd></div>
                  <div><dt>Stornos</dt><dd>{periodCashflow.cancellationCount} / {money.format(periodCashflow.cancellationAmount)}</dd></div>
                  <div><dt>ohne Ausfallschutz</dt><dd>{money.format(periodRiskAmount)}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Storno/Rückgabe & Wiedereinholung</h2>
            <p>Zeitraum: {selectedPeriod.label}. Abgezogene Fälle werden gegen spätere Einreichungen desselben Patienten gematcht.</p>
          </div>
        </div>
        <div className="priority-grid compact-priority">
          <PriorityCard label="Storno-/Rückgabe-Abzug" value={money.format(deductionAmount)} hint="Rückläufer plus Stornierungen" period={selectedPeriod.label} tone={deductionAmount ? "red" : "green"} />
          <PriorityCard label="Wieder reingeholt" value={money.format(recoveredAmount)} hint={`${recoveryMatches.length} gematchte Neueinreichungen`} period={selectedPeriod.label} tone={recoveredAmount ? "green" : "amber"} />
          <PriorityCard label="Noch nicht reingeholt" value={money.format(stillOpenAmount)} hint="Abzug minus gematchte Neueinreichung" period={selectedPeriod.label} tone={stillOpenAmount ? "amber" : "green"} />
          <PriorityCard label="Matchingquote" value={`${recoveryRate.toFixed(0)} %`} hint="bezogen auf Abzugssumme" period={selectedPeriod.label} tone={recoveryRate >= 80 ? "green" : recoveryRate ? "amber" : "blue"} />
        </div>
        <div className="table-wrap compact-table">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Standort</th>
                <th>Ursprung</th>
                <th>Grund</th>
                <th>Abzug</th>
                <th>Neue Einreichung</th>
                <th>Wieder eingereicht</th>
              </tr>
            </thead>
            <tbody>
              {recoveryMatches.slice(0, 50).map((candidate) => (
                <tr key={`${candidate.patientName}-${candidate.originalDate}-${candidate.newDate}-${candidate.newBfsNo}`}>
                  <td><strong>{candidate.patientName}</strong></td>
                  <td>{candidate.locationName}</td>
                  <td>{candidate.originalDate}</td>
                  <td>{candidate.reason}</td>
                  <td>{money.format(candidate.originalAmount)}</td>
                  <td>{candidate.newDate}</td>
                  <td>{money.format(candidate.newAmount)}</td>
                </tr>
              ))}
              {!recoveryMatches.length && (
                <tr>
                  <td colSpan={7}>Noch keine späteren Neueinreichungen im Upload-Matching gefunden.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Monatstrend</h2>
              <p>Zeitraum: letzte Monate aus dem ausgewählten Standortumfang.</p>
            </div>
          </div>
          <div className="table-wrap compact-table">
            <table>
              <thead>
                <tr>
                  <th>Monat</th>
                  <th>Umsatz eingereicht</th>
                  <th>Gesamtkosten BFS</th>
                  <th>Rückläufer</th>
                  <th>Stornos</th>
                  <th>Ohne Schutz</th>
                </tr>
              </thead>
              <tbody>
                {recentMonths.map((metric) => (
                  <tr key={metric.month}>
                    <td><strong>{formatMetricMonth(metric.month)}</strong></td>
                    <td>{money.format(metric.submitted)}</td>
                    <td>{money.format(metric.fees)}</td>
                    <td>{metric.returnCount} / {money.format(metric.returnAmount)}</td>
                    <td>{metric.cancellationCount} / {money.format(metric.cancellationAmount)}</td>
                    <td>{money.format(metric.noProtectionAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Quartalsvergleich</h2>
              <p>Zeitraum: Quartale im Vergleich, inklusive Veränderung zum Vorquartal.</p>
            </div>
          </div>
          <div className="table-wrap compact-table">
            <table>
              <thead>
                <tr>
                  <th>Quartal</th>
                  <th>Umsatz eingereicht</th>
                  <th>Delta</th>
                  <th>Rückläufer</th>
                  <th>Gebührenquote</th>
                </tr>
              </thead>
              <tbody>
                {quarterRows.map((metric) => (
                  <tr key={metric.label}>
                    <td><strong>{metric.label}</strong></td>
                    <td>{money.format(metric.submitted)}</td>
                    <td><StatusBadge status={formatDelta(metric.deltaPercent)} /></td>
                    <td>{metric.returnCount} / {money.format(metric.returnAmount)}</td>
                    <td>{metric.feeRate.toFixed(2)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
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
        </div>
      </section>
      <section className="insight-grid">
        <InsightCard title="Klärfälle nach Dringlichkeit" items={["Rot: älter als 30 Tage", "Orange: 15-30 Tage", "Gelb: 8-14 Tage"]} />
        <InsightCard title="Bearbeitung" items={["Rückbelastungen zuerst", "Wiedervorlagen fristgerecht klären", "Erledigte Neueinreichungen ausblenden"]} />
        <InsightCard title="Standort-Rückfragen" items={["Patient, Re.-Nr. und BFS-Nr. nennen", "Grund aus BFS-Bemerkung übernehmen", "Maßnahme und Frist dokumentieren"]} />
      </section>
      <CasesView cases={sorted} compact />
    </div>
  );
}

function PriorityCard({ label, value, hint, tone, info, period }: { label: string; value: string; hint: string; tone: string; info?: string; period?: string }) {
  const periodText = period ? periodLabelFromHint(period) : periodLabelFromHint(hint);

  return (
    <article className={`priority-card ${tone}`}>
      <MetricInfo title={label} text={info ?? metricExplanation(label, value, hint)} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
      <small className="period-note">{periodText}</small>
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
  const metric = aggregateMetrics([standort.id], period);

  return {
    activeMonths,
    startLabel: formatMonth(periodStart),
    submitted: metric.submitted,
    payout: metric.payout,
    fees: metric.fees,
    feeNet: metric.fees,
    feeVat: 0,
    returnCount: metric.returnCount,
    returnAmount: metric.returnAmount,
    cancellationCount: metric.cancellationCount,
    cancellationAmount: metric.cancellationAmount,
    withoutProtection: metric.noProtectionAmount
  };
}

function aggregateMetrics(standortIds: string[], period: PeriodOption) {
  const selected = bfsPeriodMetrics.filter((metric) => standortIds.includes(metric.standortId) && metricInPeriod(metric, period));
  const submitted = selected.reduce((sum, metric) => sum + metric.submitted, 0);
  const fees = selected.reduce((sum, metric) => sum + metric.fees, 0);
  const totals = {
    submitted,
    payout: selected.reduce((sum, metric) => sum + metric.payout, 0),
    fees,
    feeNet: fees,
    feeVat: 0,
    feeRate: submitted ? (fees / submitted) * 100 : 0,
    returnCount: selected.reduce((sum, metric) => sum + metric.returnCount, 0),
    returnAmount: selected.reduce((sum, metric) => sum + metric.returnAmount, 0),
    cancellationCount: selected.reduce((sum, metric) => sum + metric.cancellationCount, 0),
    cancellationAmount: selected.reduce((sum, metric) => sum + metric.cancellationAmount, 0),
    noProtectionCount: selected.reduce((sum, metric) => sum + metric.noProtectionCount, 0),
    noProtectionAmount: selected.reduce((sum, metric) => sum + metric.noProtectionAmount, 0)
  };
  return totals;
}

type ImportSummary = ReturnType<typeof summarizeImportRows>;

function summarizeImportRows(rows: ImportPreviewRow[]) {
  const relevantMovements = rows.flatMap((row) => row.parsedMovements ?? [])
    .filter((movement) => movement.reasonCategory && !["regulierung", "abrechnungsumsatz"].includes(movement.reasonCategory));
  const returnMovements = relevantMovements.filter((movement) => movement.type.includes("rueckgabe") || movement.type.includes("rueckbelastung"));
  const cancellationMovements = relevantMovements.filter((movement) => movement.type.includes("storno"));
  const submitted = rows.reduce((sum, row) => sum + rowSubmittedAmount(row), 0);
  const fees = rows.reduce((sum, row) => sum + rowFeeAmount(row), 0);
  const feeNet = rows.reduce((sum, row) => sum + rowFeeNetAmount(row), 0);
  const feeVat = rows.reduce((sum, row) => sum + rowFeeVatAmount(row), 0);
  const payout = rows.reduce((sum, row) => sum + (row.payout ?? 0), 0);
  const noProtectionAmount = rows.reduce((sum, row) => sum + rowNoProtectionAmount(row), 0);
  const noProtectionCount = rows.reduce((sum, row) => sum + rowNoProtectionCount(row), 0);

  return {
    rows: rows.length,
    submitted,
    payout,
    fees,
    feeNet,
    feeVat,
    feeRate: submitted ? (fees / submitted) * 100 : 0,
    returnCount: returnMovements.length,
    returnAmount: returnMovements.reduce((sum, movement) => sum + Math.abs(movement.amount ?? 0), 0),
    cancellationCount: cancellationMovements.length,
    cancellationAmount: cancellationMovements.reduce((sum, movement) => sum + Math.abs(movement.amount ?? 0), 0),
    noProtectionCount,
    noProtectionAmount,
    activeMonths: countImportMonths(rows),
    startLabel: formatImportStart(rows)
  };
}

function rowSubmittedAmount(row: ImportPreviewRow) {
  return row.sumExtracted || row.sumHeader || row.parsedClaims?.reduce((sum, claim) => sum + claim.amount, 0) || 0;
}

function rowFeeAmount(row: ImportPreviewRow) {
  if (row.feeTotal && row.feeTotal > 0) return row.feeTotal;
  const feeParts = rowFeeNetAmount(row) + rowFeeVatAmount(row);
  if (feeParts > 0) return Math.round(feeParts * 100) / 100;
  const submitted = rowSubmittedAmount(row);
  if (submitted > 0 && row.payout && row.payout > 0 && submitted > row.payout) {
    return Math.round((submitted - row.payout) * 100) / 100;
  }
  return 0;
}

function rowFeeNetAmount(row: ImportPreviewRow) {
  if (row.feeNet && row.feeNet > 0) return row.feeNet;
  if (row.feeTotal && row.feeVat && row.feeTotal > row.feeVat) return Math.round((row.feeTotal - row.feeVat) * 100) / 100;
  return rowFeeAmountFallbackNet(row);
}

function rowFeeVatAmount(row: ImportPreviewRow) {
  if (row.feeVat && row.feeVat > 0) return row.feeVat;
  return 0;
}

function rowFeeAmountFallbackNet(row: ImportPreviewRow) {
  if (row.feeTotal && row.feeTotal > 0) return row.feeTotal;
  const submitted = rowSubmittedAmount(row);
  if (submitted > 0 && row.payout && row.payout > 0 && submitted > row.payout) {
    return Math.round((submitted - row.payout) * 100) / 100;
  }
  return 0;
}

function rowNoProtectionClaims(row: ImportPreviewRow) {
  return row.parsedClaims?.filter((claim) => claim.protectionStatus === "ohne_ausfallschutz") ?? [];
}

function rowNoProtectionMovements(row: ImportPreviewRow) {
  return row.parsedMovements?.filter((movement) => movement.reasonCategory === "rueckgabe_ohne_ausfallschutz") ?? [];
}

function rowNoProtectionAmount(row: ImportPreviewRow) {
  const fromStats = row.noProtectionAmount ?? 0;
  const fromClaims = rowNoProtectionClaims(row).reduce((sum, claim) => sum + claim.amount, 0);
  const fromMovements = rowNoProtectionMovements(row).reduce((sum, movement) => sum + Math.abs(movement.amount ?? 0), 0);
  return Math.max(fromStats, fromClaims, fromMovements);
}

function rowNoProtectionCount(row: ImportPreviewRow) {
  return Math.max(row.noProtectionCount ?? 0, rowNoProtectionClaims(row).length, rowNoProtectionMovements(row).length);
}

function metricsFromImportSummary(summary: ImportSummary) {
  return {
    submitted: summary.submitted,
    payout: summary.payout,
    fees: summary.fees,
    feeNet: summary.feeNet,
    feeVat: summary.feeVat,
    feeRate: summary.feeRate,
    returnCount: summary.returnCount,
    returnAmount: summary.returnAmount,
    cancellationCount: summary.cancellationCount,
    cancellationAmount: summary.cancellationAmount,
    noProtectionCount: summary.noProtectionCount,
    noProtectionAmount: summary.noProtectionAmount
  };
}

function cashflowFromImportSummary(summary: ImportSummary) {
  return {
    ...metricsFromImportSummary(summary),
    activeMonths: summary.activeMonths,
    startLabel: summary.startLabel,
    withoutProtection: summary.noProtectionAmount
  };
}

function casesFromImportRows(rows: ImportPreviewRow[]): BfsCase[] {
  return rows.flatMap((row) => {
    const standort = standorte.find((entry) => entry.name === row.location);
    if (!standort) return [];
    return (row.parsedMovements ?? [])
      .filter((movement) => movement.reasonCategory && !["regulierung", "abrechnungsumsatz"].includes(movement.reasonCategory))
      .map((movement, index) => {
        const ageDays = movement.date ? ageFromShortDate(movement.date) : 0;
        const amount = Math.abs(movement.amount ?? 0);
        return {
          id: `import-${row.fileHash ?? row.file}-${movement.bfsNo ?? index}`,
          standortId: standort.id,
          locationName: standort.name,
          patientName: movement.patientName ?? "Patient noch nicht gematcht",
          invoiceNo: movement.invoiceNo ?? "-",
          bfsNo: movement.bfsNo ?? "-",
          amount,
          reason: movement.reason ?? reasonLabel(movement.reasonCategory),
          ageDays,
          traffic: ageDays > 30 ? "red" : ageDays >= 15 ? "orange" : ageDays >= 8 ? "yellow" : "green",
          status: movement.matchStatus === "unmatched" ? "historisches_match_offen" : "offen",
          dueDate: "-",
          lastComment: movement.matchedFile ? `Gematcht mit ${movement.matchedFile}` : "Aus aktuellem Testupload erzeugt"
        } satisfies BfsCase;
      });
  });
}

function riskClaimsFromImportRows(rows: ImportPreviewRow[]): RiskClaim[] {
  return rows.flatMap((row) => {
    const standort = standorte.find((entry) => entry.name === row.location);
    if (!standort) return [];
    return (row.parsedClaims ?? [])
      .filter((claim) => claim.protectionStatus === "ohne_ausfallschutz")
      .map((claim, index) => ({
        id: `import-risk-${row.fileHash ?? row.file}-${claim.bfsNo}-${index}`,
        standortId: standort.id,
        patientName: claim.patientName,
        invoiceNo: claim.invoiceNo,
        bfsNo: claim.bfsNo,
        amount: claim.amount,
        statementNo: row.statementNo,
        date: row.date,
        marker: claim.marker ?? "*KA"
      }));
  });
}

function resubmissionCandidatesFromImportRows(rows: ImportPreviewRow[]) {
  const claims = rows.flatMap((row) => {
    const standort = standorte.find((entry) => entry.name === row.location);
    return (row.parsedClaims ?? []).map((claim) => ({
      ...claim,
      file: row.file,
      locationName: row.location,
      standortId: standort?.id ?? row.location,
      statementDate: row.date,
      statementNo: row.statementNo
    }));
  });
  const relevantMovements = rows.flatMap((row) => {
    const standort = standorte.find((entry) => entry.name === row.location);
    return (row.parsedMovements ?? [])
      .filter((movement) => movement.reasonCategory && !["regulierung", "abrechnungsumsatz"].includes(movement.reasonCategory))
      .map((movement) => ({
        ...movement,
        file: row.file,
        locationName: row.location,
        standortId: standort?.id ?? row.location,
        statementDate: row.date
      }));
  });

  return relevantMovements.flatMap((movement) => {
    const patientKey = normalizePatientName(movement.patientName ?? "");
    if (!patientKey) return [];
    return claims
      .filter((claim) => normalizePatientName(claim.patientName) === patientKey && importDateKey(claim.statementDate) > importDateKey(movement.statementDate))
      .slice(0, 3)
      .map((claim) => ({
        patientName: claim.patientName,
        locationName: movement.locationName,
        originalDate: movement.statementDate,
        invoiceNo: movement.invoiceNo ?? "-",
        bfsNo: movement.bfsNo ?? "-",
        reason: movement.reason ?? reasonLabel(movement.reasonCategory),
        originalAmount: Math.abs(movement.amount ?? 0),
        newDate: claim.statementDate,
        newInvoiceNo: claim.invoiceNo,
        newBfsNo: claim.bfsNo,
        newAmount: claim.amount,
        newFile: claim.file
      }));
  });
}

function patientProfilesFromImportRows(rows: ImportPreviewRow[], standortId?: string) {
  const groups = new Map<string, {
    patientName: string;
    locationName: string;
    claimCount: number;
    claimAmount: number;
    badEventCount: number;
    badAmount: number;
    noProtectionCount: number;
    noProtectionAmount: number;
    examples: Set<string>;
  }>();

  rows.forEach((row) => {
    const standort = standorte.find((entry) => entry.name === row.location);
    if (!standort || (standortId && standort.id !== standortId)) return;

    (row.parsedClaims ?? []).forEach((claim) => {
      const key = `${standort.id}:${normalizePatientName(claim.patientName)}`;
      const current = groups.get(key) ?? emptyPatientProfile(claim.patientName, standort.name);
      current.claimCount += 1;
      current.claimAmount += claim.amount;
      current.examples.add(claim.invoiceNo);
      if (claim.protectionStatus === "ohne_ausfallschutz") {
        current.noProtectionCount += 1;
        current.noProtectionAmount += claim.amount;
      }
      groups.set(key, current);
    });

    (row.parsedMovements ?? [])
      .filter((movement) => movement.reasonCategory && !["regulierung", "abrechnungsumsatz"].includes(movement.reasonCategory))
      .forEach((movement) => {
        const patientName = movement.patientName ?? "Patient noch nicht gematcht";
        const key = `${standort.id}:${normalizePatientName(patientName)}`;
        const current = groups.get(key) ?? emptyPatientProfile(patientName, standort.name);
        current.badEventCount += 1;
        current.badAmount += Math.abs(movement.amount ?? 0);
        current.examples.add(movement.invoiceNo ?? movement.bfsNo ?? reasonLabel(movement.reasonCategory));
        groups.set(key, current);
      });
  });

  return [...groups.values()].map(classifyPatientProfile).sort((a, b) => gradeRank(b.grade) - gradeRank(a.grade) || b.riskAmount - a.riskAmount || b.badEventCount - a.badEventCount);
}

function patientProfilesFromCases(rows: BfsCase[], standortId?: string) {
  const groups = new Map<string, ReturnType<typeof emptyPatientProfile>>();
  rows.filter((row) => !standortId || row.standortId === standortId).forEach((row) => {
    const key = `${row.standortId}:${normalizePatientName(row.patientName)}`;
    const current = groups.get(key) ?? emptyPatientProfile(row.patientName, row.locationName);
    current.badEventCount += row.reason.includes("Rückgabe") || row.reason.includes("Rückbelastung") || row.reason.includes("Storno") ? 1 : 0;
    current.badAmount += row.amount;
    current.examples.add(row.invoiceNo);
    groups.set(key, current);
  });
  return [...groups.values()].map(classifyPatientProfile).sort((a, b) => gradeRank(b.grade) - gradeRank(a.grade) || b.riskAmount - a.riskAmount);
}

function emptyPatientProfile(patientName: string, locationName: string) {
  return {
    patientName,
    locationName,
    claimCount: 0,
    claimAmount: 0,
    badEventCount: 0,
    badAmount: 0,
    noProtectionCount: 0,
    noProtectionAmount: 0,
    examples: new Set<string>()
  };
}

function classifyPatientProfile(profile: ReturnType<typeof emptyPatientProfile>) {
  const riskAmount = profile.badAmount + profile.noProtectionAmount;
  const denominator = Math.max(profile.claimCount, profile.badEventCount, 1);
  const badRate = (profile.badEventCount / denominator) * 100;
  const grade = profile.badEventCount >= 5 || profile.noProtectionCount >= 4 || riskAmount >= 2500
    ? "D"
    : profile.badEventCount >= 2 || profile.noProtectionCount >= 2 || riskAmount >= 500
      ? "C"
      : profile.badEventCount === 1 || profile.noProtectionCount === 1
        ? "B"
        : "A";
  const recommendation = grade === "D"
    ? "BFS-Sperrhinweis / Vorkasseprozess prüfen"
    : grade === "C"
      ? "Standort aktiv informieren und Behandlung/Factoring prüfen"
      : grade === "B"
        ? "Beobachten und bei Neueinreichung prüfen"
        : "Unauffällig";

  return {
    ...profile,
    grade,
    badRate,
    riskAmount,
    examples: [...profile.examples].slice(0, 4),
    recommendation
  };
}

function gradeRank(grade: string) {
  return { A: 1, B: 2, C: 3, D: 4 }[grade as "A" | "B" | "C" | "D"] ?? 0;
}

function outcomeRowsFromImportRows(rows: ImportPreviewRow[], standortId?: string) {
  const candidates = resubmissionCandidatesFromImportRows(rows);
  const candidateKeys = new Set(candidates.map((candidate) => `${normalizePatientName(candidate.patientName)}:${candidate.originalDate}:${candidate.bfsNo}`));
  const rawRows = rows.flatMap((row) => {
    const standort = standorte.find((entry) => entry.name === row.location);
    if (!standort || (standortId && standort.id !== standortId)) return [];

    return (row.parsedMovements ?? [])
      .filter((movement) => movement.reasonCategory && !["regulierung", "abrechnungsumsatz"].includes(movement.reasonCategory))
      .map((movement) => {
        const key = `${normalizePatientName(movement.patientName ?? "")}:${row.date}:${movement.bfsNo ?? "-"}`;
        const wasReworked = candidateKeys.has(key) || movement.reasonCategory === "neue_rechnung";
        const reasonText = movement.reason?.toLowerCase() ?? "";
        const wasPaid = movement.reasonCategory === "zahlung_nach_storno" || reasonText.includes("zahlung nach storno") || reasonText.includes("direktzahlung");
        return {
          month: monthLabelFromDate(row.date),
          locationName: row.location,
          patientName: movement.patientName ?? "Patient noch nicht gematcht",
          amount: Math.abs(movement.amount ?? 0),
          reworked: wasReworked || wasPaid,
          paid: wasPaid,
          open: !(wasReworked || wasPaid)
        };
      });
  });

  return groupOutcomeRows(rawRows);
}

function openUnresolvedMovementsFromImportRows(rows: ImportPreviewRow[], standortId?: string) {
  const candidates = resubmissionCandidatesFromImportRows(rows);
  const candidateKeys = new Set(candidates.map((candidate) => `${normalizePatientName(candidate.patientName)}:${candidate.originalDate}:${candidate.bfsNo}`));

  return rows.flatMap((row) => {
    const standort = standorte.find((entry) => entry.name === row.location);
    if (!standort || (standortId && standort.id !== standortId)) return [];

    return (row.parsedMovements ?? [])
      .filter((movement) => movement.reasonCategory && !["regulierung", "abrechnungsumsatz"].includes(movement.reasonCategory))
      .flatMap((movement) => {
        const patientName = movement.patientName ?? "Patient noch nicht gematcht";
        const key = `${normalizePatientName(patientName)}:${row.date}:${movement.bfsNo ?? "-"}`;
        const reasonText = movement.reason?.toLowerCase() ?? "";
        const wasReworked = candidateKeys.has(key) || movement.reasonCategory === "neue_rechnung";
        const wasPaid = movement.reasonCategory === "zahlung_nach_storno" || reasonText.includes("zahlung nach storno") || reasonText.includes("direktzahlung");
        if (wasReworked || wasPaid) return [];

        return [{
          patientName,
          locationName: row.location,
          date: row.date,
          invoiceNo: movement.invoiceNo ?? "-",
          bfsNo: movement.bfsNo ?? "-",
          reason: movement.reason ?? reasonLabel(movement.reasonCategory),
          amount: Math.abs(movement.amount ?? 0),
          file: row.file
        }];
      });
  }).sort((a, b) => b.amount - a.amount);
}

function outcomeRowsFromCases(rows: BfsCase[]) {
  return groupOutcomeRows(rows.map((row) => ({
    month: "aktueller Stand",
    locationName: row.locationName,
    patientName: row.patientName,
    amount: row.amount,
    reworked: row.status.includes("neueinreichung") || row.status.includes("erledigt") || row.status.includes("klaerung"),
    paid: row.status.includes("erledigt"),
    open: !row.status.includes("erledigt")
  })));
}

function groupOutcomeRows(rows: Array<{ month: string; locationName: string; patientName: string; amount: number; reworked: boolean; paid: boolean; open: boolean }>) {
  const grouped = new Map<string, typeof rows>();
  rows.forEach((row) => {
    const key = `${row.month}:${row.locationName}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  });

  return [...grouped.values()].map((entries) => ({
    month: entries[0].month,
    locationName: entries[0].locationName,
    total: entries.length,
    reworked: entries.filter((entry) => entry.reworked).length,
    paid: entries.filter((entry) => entry.paid).length,
    open: entries.filter((entry) => entry.open).length,
    amount: entries.filter((entry) => entry.open).reduce((sum, entry) => sum + entry.amount, 0),
    examples: entries.slice(0, 3).map((entry) => entry.patientName)
  })).sort((a, b) => b.month.localeCompare(a.month) || a.locationName.localeCompare(b.locationName));
}

function ageFromShortDate(value: string) {
  const [day, month, year] = value.split(".").map(Number);
  const fullYear = year < 100 ? 2000 + year : year;
  const date = new Date(fullYear, month - 1, day);
  return Math.max(0, Math.floor((demoToday.getTime() - date.getTime()) / 86400000));
}

function normalizePatientName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function importDateKey(value: string | undefined) {
  const match = value?.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return match ? `${match[3]}${match[2]}${match[1]}` : "";
}

function monthLabelFromDate(value: string) {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return match ? `${match[2]}.${match[3]}` : "ohne Datum";
}

function reasonLabel(reasonCategory?: string) {
  const labels: Record<string, string> = {
    unzustellbar: "Unzustellbar",
    factoringvereinbarung: "lt. Factoringvereinbarung",
    nachricht_praxis: "lt. Nachricht / Praxisanweisung",
    neue_rechnung: "Neue Rechnung",
    zahlung_nach_storno: "Zahlung nach Storno",
    gemaess_vertrag: "gem. Vertrag",
    rueckgabe_ohne_ausfallschutz: "Rückgabe ohne Ausfallschutz",
    iportal_rechnungsliste: "lt. iPortal-Rechnungsliste",
    sonstiger_storno_grund: "Sonstiger Storno-/Rückgabegrund"
  };
  return reasonCategory ? labels[reasonCategory] ?? reasonCategory : "Klärfall";
}

function countImportMonths(rows: ImportPreviewRow[]) {
  const months = new Set(rows.map((row) => importRowMonth(row)).filter(Boolean));
  return months.size;
}

function formatImportStart(rows: ImportPreviewRow[]) {
  const months = rows.map((row) => importRowMonth(row)).filter(Boolean).sort();
  if (!months[0]) return "Testupload";
  return formatMetricMonth(months[0]);
}

function importRowMonth(row: ImportPreviewRow) {
  const match = row.date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2]}`;
}

function importRowInPeriod(row: ImportPreviewRow, period: PeriodOption, standort: Standort) {
  const month = importRowMonth(row);
  if (!month) return true;
  const metricDate = new Date(`${month}-01T00:00:00`);
  if (!period.start && !period.end) return month >= standort.goLiveDate.slice(0, 7);
  if (period.start && metricDate < new Date(period.start.getFullYear(), period.start.getMonth(), 1)) return false;
  if (period.end && metricDate > new Date(period.end.getFullYear(), period.end.getMonth(), 1)) return false;
  return true;
}

function shortDateInPeriod(value: string | undefined, period: PeriodOption, standort: Standort) {
  const match = value?.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return true;
  const month = `${match[3]}-${match[2]}`;
  const metricDate = new Date(`${month}-01T00:00:00`);
  if (!period.start && !period.end) return month >= standort.goLiveDate.slice(0, 7);
  if (period.start && metricDate < new Date(period.start.getFullYear(), period.start.getMonth(), 1)) return false;
  if (period.end && metricDate > new Date(period.end.getFullYear(), period.end.getMonth(), 1)) return false;
  return true;
}

function metricInPeriod(metric: BfsPeriodMetric, period: PeriodOption) {
  const metricDate = new Date(`${metric.month}-01T00:00:00`);
  if (!period.start && !period.end) {
    const standort = standorte.find((entry) => entry.id === metric.standortId);
    return standort ? metric.month >= standort.goLiveDate.slice(0, 7) : true;
  }
  if (period.start && metricDate < new Date(period.start.getFullYear(), period.start.getMonth(), 1)) return false;
  if (period.end && metricDate > new Date(period.end.getFullYear(), period.end.getMonth(), 1)) return false;
  return true;
}

function buildRecentMonthlyTrend(standortIds: string[]) {
  return groupMetricsByMonth(bfsPeriodMetrics.filter((metric) => standortIds.includes(metric.standortId)))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 6);
}

function buildQuarterComparison(standortIds: string[]) {
  const quarters = groupMetricsByQuarter(bfsPeriodMetrics.filter((metric) => standortIds.includes(metric.standortId)))
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .slice(0, 8);

  return quarters.map((quarter, index) => {
    const previous = quarters[index + 1];
    const deltaPercent = previous?.submitted ? ((quarter.submitted - previous.submitted) / previous.submitted) * 100 : 0;
    return {
      ...quarter,
      deltaPercent,
      feeRate: quarter.submitted ? (quarter.fees / quarter.submitted) * 100 : 0
    };
  });
}

function groupMetricsByMonth(metrics: BfsPeriodMetric[]) {
  const grouped = new Map<string, BfsPeriodMetric[]>();
  metrics.forEach((metric) => grouped.set(metric.month, [...(grouped.get(metric.month) ?? []), metric]));
  return [...grouped.entries()].map(([month, entries]) => ({ month, ...sumMetricEntries(entries) }));
}

function groupMetricsByQuarter(metrics: BfsPeriodMetric[]) {
  const grouped = new Map<string, BfsPeriodMetric[]>();
  metrics.forEach((metric) => {
    const [year, month] = metric.month.split("-").map(Number);
    const quarter = Math.floor((month - 1) / 3) + 1;
    const key = `${year}-Q${quarter}`;
    grouped.set(key, [...(grouped.get(key) ?? []), metric]);
  });
  return [...grouped.entries()].map(([key, entries]) => {
    const [year, quarter] = key.split("-Q");
    return {
      label: `Q${quarter} ${year}`,
      sortKey: `${year}-${quarter}`,
      ...sumMetricEntries(entries)
    };
  });
}

function sumMetricEntries(entries: BfsPeriodMetric[]) {
  return {
    submitted: entries.reduce((sum, metric) => sum + metric.submitted, 0),
    payout: entries.reduce((sum, metric) => sum + metric.payout, 0),
    fees: entries.reduce((sum, metric) => sum + metric.fees, 0),
    returnCount: entries.reduce((sum, metric) => sum + metric.returnCount, 0),
    returnAmount: entries.reduce((sum, metric) => sum + metric.returnAmount, 0),
    cancellationCount: entries.reduce((sum, metric) => sum + metric.cancellationCount, 0),
    cancellationAmount: entries.reduce((sum, metric) => sum + metric.cancellationAmount, 0),
    noProtectionCount: entries.reduce((sum, metric) => sum + metric.noProtectionCount, 0),
    noProtectionAmount: entries.reduce((sum, metric) => sum + metric.noProtectionAmount, 0)
  };
}

function formatMetricMonth(month: string) {
  const [year, monthNo] = month.split("-");
  return `${monthNo}.${year}`;
}

function formatDelta(value: number) {
  if (!value) return "Vergleich startet";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} %`;
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

function KpiGrid({ standort, cards: customCards, importRows = [] }: { standort?: Standort; cards?: string[][]; importRows?: ImportPreviewRow[] }) {
  const importSummary = summarizeImportRows(standort ? importRows.filter((row) => row.location === standort.name) : importRows);
  const cards = customCards ?? (standort
    ? [
        ["Eingereicht aktueller Monat", money.format(importSummary.rows ? importSummary.submitted : standort.submittedThisMonth), importSummary.rows ? "aus aktuellem Testupload" : "Aus BFS-Abrechnungen"],
        ["Gesamtkosten BFS", money.format(importSummary.rows ? importSummary.fees : standort.feesThisMonth), importSummary.rows ? `Gebühr ${money.format(importSummary.feeNet)} · MwSt ${money.format(importSummary.feeVat)}` : "Gebühr netto und MwSt"],
        ["Offene BFS-Klärfälle", String(standort.openCases), "echte To-dos"],
        ["Laufend ohne Ausfallschutz", money.format(importSummary.rows ? importSummary.noProtectionAmount : standort.withoutProtection), importSummary.rows ? "aus aktuellem Testupload" : "Risikoüberwachung"]
      ]
    : monthlyKpis);
  return (
    <section className="kpi-grid">
      {cards.map(([label, value, hint]) => (
        <article className="kpi-card" key={label}>
          <MetricInfo title={label} text={metricExplanation(label, value, hint)} />
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{hint}</small>
          <small className="period-note">{periodLabelFromHint(hint)}</small>
        </article>
      ))}
    </section>
  );
}

function periodLabelFromHint(hint: string) {
  const normalized = hint.toLowerCase();
  if (normalized.includes("testupload") || normalized.includes("upload")) return "Zeitraum: aktueller Testupload";
  if (normalized.includes("monat")) return "Zeitraum: aktueller Monat";
  if (normalized.includes("jahr") || normalized.includes("quartal") || normalized.includes("q1") || normalized.includes("q2") || normalized.includes("q3") || normalized.includes("q4")) return `Zeitraum: ${hint}`;
  if (/\d{2}\.\d{2}\.\d{4}/.test(hint) || /\d{4}/.test(hint)) return `Zeitraum: ${hint}`;
  return "Zeitraum: aktueller Datenstand";
}

function MetricInfo({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="metric-info">
      <button className="metric-info-button" aria-label={`Herleitung ${title}`} onClick={() => setOpen(true)}>
        <Info size={14} />
      </button>
      {open && (
        <>
          <button className="metric-info-backdrop" aria-label="Infobox schließen" onClick={() => setOpen(false)} />
          <div className="metric-info-popover" role="dialog" aria-label={`Herleitung ${title}`}>
            <div>
              <strong>{title}</strong>
              <button aria-label="Infobox schließen" onClick={() => setOpen(false)}>
                <X size={14} />
              </button>
            </div>
            <p>{text}</p>
          </div>
        </>
      )}
    </div>
  );
}

function metricExplanation(label: string, value: string, hint: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("eingereicht") || normalized.includes("forderungen")) {
    return `Herleitung: Summe der aus den BFS-Abrechnungen erkannten Forderungsbeträge im gewählten Zeitraum. Aktueller Wert: ${value}. Bezug: ${hint}.`;
  }
  if (normalized.includes("mwst")) {
    return `Herleitung: Separat erkannte Mehrwertsteuer auf BFS-Gebühren aus den Abrechnungen. Aktueller Wert: ${value}. Bezug: ${hint}.`;
  }
  if (normalized.includes("gesamtkosten")) {
    return `Herleitung: BFS-Gebühr netto plus erkannte MwSt. Aktueller Wert: ${value}. Bezug: ${hint}.`;
  }
  if (normalized.includes("gebühr")) {
    return `Herleitung: Netto-Gebührenposition der BFS-Abrechnungen; MwSt wird separat ausgewiesen und fließt mit in die Gesamtkosten. Aktueller Wert: ${value}. Bezug: ${hint}.`;
  }
  if (normalized.includes("rückläufer") || normalized.includes("rückgaben")) {
    return `Herleitung: Gezählt werden Kontoauszug-Bewegungen mit Rückgabe, Rückbelastung oder vergleichbarer BFS-Bemerkung. Der Betrag kommt aus der jeweiligen Bewegungszeile. Aktueller Wert: ${value}. Bezug: ${hint}.`;
  }
  if (normalized.includes("storno")) {
    return `Herleitung: Gezählt werden Kontoauszug-Zeilen vom Typ Storno Liquidation. Der Originalgrund aus der BFS-Bemerkung bleibt zusätzlich gespeichert. Aktueller Wert: ${value}. Bezug: ${hint}.`;
  }
  if (normalized.includes("ausfallschutz") || normalized.includes("schutz")) {
    return `Herleitung: Summe der Forderungen, die in der Forderungsliste ohne Ausfallschutz markiert sind oder als spätere Rückgabe ohne Ausfallschutz auftauchen. Aktueller Wert: ${value}. Bezug: ${hint}.`;
  }
  if (normalized.includes("offen") || normalized.includes("klä") || normalized.includes("prüfen")) {
    return `Herleitung: Alle noch nicht erledigten Klärfälle im aktuellen Standort- oder Gruppenfilter. Aktueller Wert: ${value}. Bezug: ${hint}.`;
  }
  if (normalized.includes("import")) {
    return `Herleitung: Status aus dem aktuellen Test- oder Demo-Import, inklusive erkannter Dateien, Hash-Dubletten und Parsing-Hinweisen. Aktueller Wert: ${value}. Bezug: ${hint}.`;
  }
  return `Herleitung: Dieser Wert wird aus den aktuell gefilterten BFS-Daten und dem ausgewählten Zeitraum berechnet. Aktueller Wert: ${value}. Bezug: ${hint}.`;
}

function UploadView({ liveRows, onRowsChange }: { liveRows: ImportPreviewRow[]; onRowsChange: (rows: ImportPreviewRow[]) => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("Bereit für Testupload");
  const [selectedFileCount, setSelectedFileCount] = useState(0);
  const previewRows = liveRows.length ? liveRows : importPreviewRows;
  const okRows = previewRows.filter((row) => row.status === "OK").length;
  const warningRows = previewRows.length - okRows;

  async function handleFiles(files: FileList | null, mode: "replace" | "append" = "replace") {
    if (!files?.length) return;
    const importableFiles = [...files].filter(isImportableUploadFile);
    setSelectedFileCount(importableFiles.length);
    if (!importableFiles.length) {
      setUploadStatus("Keine importfähigen Dateien gefunden");
      return;
    }
    setIsProcessing(true);
    setUploadStatus(`${importableFiles.length} Dateien werden eingelesen`);
    try {
      const parsedRows = await parseDemoImportFiles(importableFiles, (processed, total, fileName) => {
        const shortName = fileName.length > 34 ? `${fileName.slice(0, 31)}...` : fileName;
        setUploadStatus(`${processed} von ${total} Dateien eingelesen (${shortName})`);
      });
      const nextRows = reconcileImportRows(mode === "append" ? mergeImportRows(liveRows, parsedRows) : parsedRows);
      onRowsChange(nextRows);
      try {
        await storeImportRows(nextRows);
        setUploadStatus(`${parsedRows.length} Dateien fertig eingelesen und lokal gespeichert`);
      } catch (storageError) {
        setUploadStatus(`${parsedRows.length} Dateien eingelesen; dauerhafte Speicherung nicht möglich: ${storageError instanceof Error ? storageError.message : "Browser-Speicher voll"}`);
      }
    } catch (error) {
      setUploadStatus(`Upload konnte nicht vollständig verarbeitet werden: ${error instanceof Error ? error.message : "unbekannter Fehler"}`);
    } finally {
      setIsProcessing(false);
    }
  }

  function resetUpload() {
    onRowsChange([]);
    setSelectedFileCount(0);
    setUploadStatus("Kompletter Upload zurückgesetzt");
    void clearStoredImportRows();
  }

  return (
    <div className="content-stack">
      <section className="upload-zone">
        <HardDriveUpload size={28} />
        <div>
          <h2>Testdateien für den Monats-Sammelimport hochladen</h2>
          <p>Die Demo liest echte Dateien auch aus Unterordnern, berechnet Hashes, erkennt Mandant-Nr. und zeigt sofort, wo Zuordnung oder Parsing noch geprüft werden müssen.</p>
          <div className={isProcessing ? "upload-status processing" : liveRows.length ? "upload-status done" : "upload-status"} aria-live="polite">
            <RefreshCw size={14} />
            <span>{isProcessing ? "Wird eingelesen" : liveRows.length ? "Fertig" : "Bereit"}</span>
            <strong>{uploadStatus}</strong>
          </div>
        </div>
        <div className="upload-actions">
          <label className={isProcessing ? "file-upload-button disabled" : "file-upload-button"}>
            <Upload size={16} />
            Dateien auswählen
            <input disabled={isProcessing} type="file" multiple accept=".pdf,.zip,.csv,.txt,.json,application/pdf,application/zip,text/*" onChange={(event) => handleFiles(event.target.files, "replace")} />
          </label>
          <label className={isProcessing ? "file-upload-button secondary-upload disabled" : "file-upload-button secondary-upload"}>
            <FolderUp size={16} />
            Ordner inkl. Unterordner
            <input
              disabled={isProcessing}
              type="file"
              multiple
              accept=".pdf,.zip,.csv,.txt,.json,application/pdf,application/zip,text/*"
              onChange={(event) => handleFiles(event.target.files, liveRows.length ? "append" : "replace")}
              {...{ webkitdirectory: "", directory: "" }}
            />
          </label>
          <button className="secondary-button reset-upload-button" disabled={isProcessing || !liveRows.length} onClick={resetUpload}>
            <X size={16} />
            Upload zurücksetzen
          </button>
        </div>
      </section>
      <section className="priority-grid">
        <PriorityCard label="Dateien im Lauf" value={String(isProcessing ? selectedFileCount : previewRows.length)} hint={isProcessing ? "werden eingelesen" : liveRows.length ? "aus deinem Testupload" : "Demo-Vorschau"} tone="blue" />
        <PriorityCard label="Importfähig" value={String(okRows)} hint="ohne harte Hinweise" tone="green" />
        <PriorityCard label="Zu prüfen" value={String(warningRows)} hint="Mapping oder Parsing" tone="amber" />
        <PriorityCard label="Unterordner" value={String(countNestedUploadFolders(previewRows))} hint="rekursiv mitverarbeitet" tone="blue" />
      </section>
      <section className="insight-grid">
        <InsightCard title="Importkontrolle" items={["Mandant-Nr. muss Standort treffen", "Kopf- und Positionssumme müssen passen", "Dubletten über Abrechnungs-ID und Hash"]} />
        <InsightCard title="Ordnerstruktur" items={["Standortordner dürfen Jahresordner enthalten", "Monatsordner werden automatisch mitgelesen", "PDF-Pfade bleiben in der Vorschau sichtbar"]} />
        <InsightCard title="Freigabe vor Import" items={["Unbekannte Standorte prüfen", "Summenabweichungen klären", "Kassel erst ab 01.07.2026 erwarten"]} />
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
              onClick={resetUpload}
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

function isImportableUploadFile(file: File) {
  return /\.(pdf|csv|txt|json)$/i.test(file.name) || file.type === "application/pdf" || file.type.startsWith("text/");
}

function countNestedUploadFolders(rows: ImportPreviewRow[]) {
  const folders = new Set<string>();
  rows.forEach((row) => {
    const pathParts = row.file.split("/");
    pathParts.slice(0, -1).forEach((_, index) => folders.add(pathParts.slice(0, index + 1).join("/")));
  });
  return folders.size;
}

function ImportPreview({ rows }: { rows: ImportPreviewRow[] }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const relevantMovements = rows.flatMap((row) => row.parsedMovements ?? [])
    .filter((movement) => movement.reasonCategory && !["regulierung", "abrechnungsumsatz"].includes(movement.reasonCategory));
  const retainedAmount = relevantMovements.reduce((sum, movement) => sum + Math.abs(movement.amount ?? 0), 0);
  const matchedMovements = relevantMovements.filter((movement) => movement.matchStatus !== "unmatched");
  const reasonCount = new Set(relevantMovements.map((movement) => movement.reasonCategory)).size;
  const reasonGroups = aggregateMovementReasons(rows);

  return (
    <div className="content-stack">
      <section className="priority-grid">
        <PriorityCard label="Rückgaben/Stornos" value={String(relevantMovements.length)} hint={`${matchedMovements.length} mit Patient zugeordnet`} tone={relevantMovements.length ? "amber" : "green"} />
        <PriorityCard label="Einbehaltene Summe" value={money.format(retainedAmount)} hint="aus Kontoauszug-Bewegungen" tone={retainedAmount ? "amber" : "green"} />
        <PriorityCard label="Grund-Klassen" value={String(reasonCount)} hint="z.B. unzustellbar, Ausfallschutz" tone="blue" />
        <PriorityCard label="Historisch offen" value={String(relevantMovements.length - matchedMovements.length)} hint="braucht ältere Abrechnung zum Match" tone={relevantMovements.length - matchedMovements.length ? "red" : "green"} />
      </section>
      {!!reasonGroups.length && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Grundauswertung aus BFS-Bemerkungen</h2>
              <p>Bekannte Gründe werden gruppiert; neue Wortlaute bleiben als Originalgrund sichtbar und können später als eigene Kategorie übernommen werden.</p>
            </div>
          </div>
          <div className="table-wrap compact-table">
            <table>
              <thead>
                <tr>
                  <th>Kategorie</th>
                  <th>Anzahl</th>
                  <th>Betrag</th>
                  <th>Originalgründe</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reasonGroups.map((group) => (
                  <tr key={group.key}>
                    <td><strong>{group.label}</strong></td>
                    <td>{group.count}</td>
                    <td>{money.format(group.amount)}</td>
                    <td>{group.examples.join(", ")}</td>
                    <td><StatusBadge status={group.needsReview ? "neuen Grund prüfen" : "kategorisiert"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Import-Vorschau</h2>
            <p>Import wird erst nach Prüfung und Bestätigung final geschrieben.</p>
          </div>
          <button className="primary-button" onClick={() => setConfirmOpen(true)}>
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
              {rows.map((row) => {
                const rowReasons = row.parsedMovements?.filter((movement) => movement.reasonCategory && !["regulierung", "abrechnungsumsatz"].includes(movement.reasonCategory)) ?? [];
                return (
                  <tr key={`${row.file}-${row.fileHash ?? row.statementNo}`}>
                    <td>
                      <strong>{row.file}</strong>
                      <span>{row.practice}</span>
                      {row.fileHash && <small>{formatBytes(row.fileSizeBytes ?? 0)} · Hash {row.fileHash.slice(0, 10)}</small>}
                      {!!row.parsedClaims?.length && (
                        <small>{row.parsedClaims.length} Patientenpositionen · {rowNoProtectionCount(row)} ohne Ausfallschutz</small>
                      )}
                    </td>
                    <td>{row.location}</td>
                    <td>{row.mandantNo}</td>
                    <td>{row.statementNo} / {row.date}</td>
                    <td>{row.claimsHeader} / {row.claimsExtracted}</td>
                    <td>{money.format(row.sumHeader)} / {money.format(row.sumExtracted)}</td>
                    <td>
                      {row.hasLedger ? `${row.movements} Bewegungen` : "fehlt"}
                      {!!row.payout && <span>Auszahlung {money.format(row.payout)}</span>}
                      {!!rowFeeAmount(row) && (
                        <>
                          <span>BFS-Gebühr netto {money.format(rowFeeNetAmount(row))}</span>
                          <span>MwSt {money.format(rowFeeVatAmount(row))}</span>
                          <span>Gesamtkosten {money.format(rowFeeAmount(row))}</span>
                        </>
                      )}
                      {!!rowReasons.length && (
                        <>
                          <span>{rowReasons.length} Storno-/Rückgabegründe</span>
                          {rowReasons.slice(0, 3).map((movement) => (
                            <small key={`${movement.rawText}-${movement.bfsNo ?? ""}`}>
                              {formatMovementReason(movement)}
                            </small>
                          ))}
                        </>
                      )}
                    </td>
                    <td><StatusBadge status={row.status} /></td>
                    <td>
                      <div className="note-list">
                        {(row.parseNotes ?? ["Demo-Datensatz"]).slice(0, 3).map((note) => (
                          <span key={note}><AlertTriangle size={13} /> {note}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {confirmOpen && (
        <div className="confirmation-overlay" role="dialog" aria-modal="true" aria-label="Import bestätigt">
          <button className="confirmation-backdrop" aria-label="Dialog schließen" onClick={() => setConfirmOpen(false)} />
          <section className="confirmation-dialog">
            <div className="confirmation-icon">
              <CheckCircle2 size={24} />
            </div>
            <h2>Testimport bestätigt</h2>
            <p>Die Import-Vorschau wurde für die Demo übernommen. Die App wertet diesen Datenstand jetzt in Cockpit, Fällen, Matching, Maßnahmenkontrolle, Patientenklassifizierung und Reports aus.</p>
            <dl>
              <div><dt>Dateien</dt><dd>{rows.length}</dd></div>
              <div><dt>Importfähig</dt><dd>{rows.filter((row) => row.status === "OK").length}</dd></div>
              <div><dt>Rückgaben/Stornos</dt><dd>{relevantMovements.length}</dd></div>
              <div><dt>Einbehalten</dt><dd>{money.format(retainedAmount)}</dd></div>
            </dl>
            <button className="primary-button" onClick={() => setConfirmOpen(false)}>Verstanden</button>
          </section>
        </div>
      )}
    </div>
  );
}

function formatMovementReason(movement: NonNullable<ImportPreviewRow["parsedMovements"]>[number]) {
  const patient = movement.patientName ?? "Patient noch nicht gematcht";
  const reason = movement.reason ?? movement.reasonCategory ?? "Grund offen";
  const amount = movement.amount ? ` · ${money.format(Math.abs(movement.amount))}` : "";
  return `${patient}: ${reason}${amount}`;
}

function aggregateMovementReasons(rows: ImportPreviewRow[]) {
  const groups = new Map<string, { key: string; label: string; count: number; amount: number; examples: Set<string>; needsReview: boolean }>();

  rows.flatMap((row) => row.parsedMovements ?? [])
    .filter((movement) => movement.reasonCategory && !["regulierung", "abrechnungsumsatz"].includes(movement.reasonCategory))
    .forEach((movement) => {
      const category = movement.reasonCategory ?? "sonstiger_storno_grund";
      const originalReason = movement.reason?.trim() || reasonLabel(category);
      const key = category === "sonstiger_storno_grund" ? `sonstiger:${originalReason.toLowerCase()}` : category;
      const current = groups.get(key) ?? {
        key,
        label: category === "sonstiger_storno_grund" ? "Sonstiger / neuer Grund" : reasonLabel(category),
        count: 0,
        amount: 0,
        examples: new Set<string>(),
        needsReview: category === "sonstiger_storno_grund"
      };

      current.count += 1;
      current.amount += Math.abs(movement.amount ?? 0);
      current.examples.add(originalReason);
      groups.set(key, current);
    });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      amount: Math.round(group.amount * 100) / 100,
      examples: [...group.examples].slice(0, 3)
    }))
    .sort((a, b) => b.count - a.count || b.amount - a.amount);
}

const importStorageDbName = "orisus-bfs-monitor-imports";
const importStorageStoreName = "imports";
const importStorageRowsKey = "current-preview";
const importStorageLegacyKey = "orisus_bfs_monitor_import_preview";

function loadStoredImportRows() {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(importStorageLegacyKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ImportPreviewRow[];
  } catch {
    return [];
  }
}

async function loadStoredImportRowsFromDb() {
  if (typeof window === "undefined" || !("indexedDB" in window)) return [];
  const db = await openImportDb();
  return new Promise<ImportPreviewRow[]>((resolve, reject) => {
    const transaction = db.transaction(importStorageStoreName, "readonly");
    const request = transaction.objectStore(importStorageStoreName).get(importStorageRowsKey);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as ImportPreviewRow[] | undefined) ?? []);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

function mergeImportRows(existingRows: ImportPreviewRow[], nextRows: ImportPreviewRow[]) {
  const rowsByKey = new Map<string, ImportPreviewRow>();
  [...existingRows, ...nextRows].forEach((row) => {
    rowsByKey.set(importRowIdentity(row), row);
  });
  return [...rowsByKey.values()];
}

function importRowIdentity(row: ImportPreviewRow) {
  if (row.mandantNo !== "-" && row.statementNo !== "-" && row.date !== "-") {
    return `${row.mandantNo}:${row.statementNo}:${row.date}`;
  }
  return row.fileHash ?? `${row.file}-${row.statementNo}-${row.date}`;
}

async function storeImportRows(rows: ImportPreviewRow[]) {
  if (typeof window === "undefined") return;

  try {
    await storeImportRowsInDb(rows);
    window.localStorage.removeItem(importStorageLegacyKey);
    return;
  } catch (dbError) {
    try {
      window.localStorage.setItem(importStorageLegacyKey, JSON.stringify(rows));
    } catch {
      throw new Error(dbError instanceof Error ? dbError.message : "Browser-Speicher voll");
    }
  }
}

async function storeImportRowsInDb(rows: ImportPreviewRow[]) {
  if (!("indexedDB" in window)) throw new Error("IndexedDB nicht verfügbar");
  const db = await openImportDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(importStorageStoreName, "readwrite");
    transaction.objectStore(importStorageStoreName).put(rows, importStorageRowsKey);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function clearStoredImportRows() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(importStorageLegacyKey);
  if (!("indexedDB" in window)) return;
  try {
    const db = await openImportDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(importStorageStoreName, "readwrite");
      transaction.objectStore(importStorageStoreName).delete(importStorageRowsKey);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch {
    // Reset should still clear the visible upload even if browser storage cleanup fails.
  }
}

function openImportDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(importStorageDbName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(importStorageStoreName)) {
        request.result.createObjectStore(importStorageStoreName);
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function CasesView({ cases: rows, compact = false, title, description }: { cases: BfsCase[]; compact?: boolean; title?: string; description?: string }) {
  const totalAmount = rows.reduce((sum, fall) => sum + fall.amount, 0);
  const oldestAge = rows.reduce((max, fall) => Math.max(max, fall.ageDays), 0);
  const highestCase = rows.reduce<BfsCase | undefined>((max, fall) => !max || fall.amount > max.amount ? fall : max, undefined);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title ?? (compact ? "Offene Fälle am Standort" : "Offene Rückbelastungen / Klärfälle")}</h2>
          <p>{description ?? "Originaldaten sind read-only; nur interne Bearbeitung und Erledigungsgründe werden gepflegt."}</p>
        </div>
        <div className="search-box"><Search size={16} /><input placeholder="Patient, Re.-Nr. oder BFS-Nr." /></div>
      </div>
      <div className="case-summary-grid" aria-label="Gesamtüberblick offene Fälle">
        <article>
          <span>Offener Betrag gesamt</span>
          <strong>{money.format(totalAmount)}</strong>
        </article>
        <article>
          <span>Offene Fälle</span>
          <strong>{rows.length}</strong>
        </article>
        <article>
          <span>Ältester Fall</span>
          <strong>{oldestAge} Tage</strong>
        </article>
        <article>
          <span>Höchste Einzelposition</span>
          <strong>{money.format(highestCase?.amount ?? 0)}</strong>
        </article>
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

function RiskView({ standortId, importRows = [] }: { standortId?: string; importRows?: ImportPreviewRow[] }) {
  const importedRisks = riskClaimsFromImportRows(importRows);
  const sourceRows = importedRisks.length ? importedRisks : riskClaims;
  const rows = sourceRows.filter((claim) => !standortId || claim.standortId === standortId);
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

function getRecurringRiskProfiles(standortId?: string, importRows: ImportPreviewRow[] = []) {
  const importedRisks = riskClaimsFromImportRows(importRows);
  const sourceRows = importedRisks.length ? importedRisks : riskClaims;
  const rows = sourceRows.filter((claim) => !standortId || claim.standortId === standortId);
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

function RecurringRiskView({ standortId, compact = false, importRows = [] }: { standortId?: string; compact?: boolean; importRows?: ImportPreviewRow[] }) {
  const profiles = getRecurringRiskProfiles(standortId, importRows);
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

function PatientClassificationView({ standort, cases: rows, importRows = [] }: { standort?: Standort; cases: BfsCase[]; importRows?: ImportPreviewRow[] }) {
  const profiles = patientProfilesFromImportRows(importRows, standort?.id);
  const fallbackProfiles = profiles.length ? profiles : patientProfilesFromCases(rows, standort?.id);
  const counts = ["A", "B", "C", "D"].map((grade) => ({
    grade,
    count: fallbackProfiles.filter((profile) => profile.grade === grade).length
  }));
  const total = fallbackProfiles.length || 1;

  return (
    <div className="content-stack">
      <section className="priority-grid">
        {counts.map(({ grade, count }) => (
          <PriorityCard
            key={grade}
            label={`Klasse ${grade}`}
            value={`${Math.round((count / total) * 100)} %`}
            hint={`${count} Patienten`}
            tone={grade === "A" ? "green" : grade === "B" ? "blue" : grade === "C" ? "amber" : "red"}
          />
        ))}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{standort ? `Patientenklassifizierung ${standort.name}` : "Patientenklassifizierung Gruppe"}</h2>
            <p>Patienten werden je Standort anhand von Zahlungsverhalten, Stornos/Rückgaben, Ausfallschutz und Wiederholungen klassifiziert.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Klasse</th>
                <th>Patient</th>
                <th>Standort</th>
                <th>Einreichungen</th>
                <th>Storno/Rückgabe</th>
                <th>Ohne Schutz</th>
                <th>Risikosumme</th>
                <th>Quote</th>
                <th>Empfehlung</th>
              </tr>
            </thead>
            <tbody>
              {fallbackProfiles.slice(0, 100).map((profile) => (
                <tr key={`${profile.locationName}-${profile.patientName}`}>
                  <td><StatusBadge status={`Klasse ${profile.grade}`} /></td>
                  <td><strong>{profile.patientName}</strong><span>{profile.examples.join(", ")}</span></td>
                  <td>{profile.locationName}</td>
                  <td>{profile.claimCount}</td>
                  <td>{profile.badEventCount}</td>
                  <td>{profile.noProtectionCount}</td>
                  <td>{money.format(profile.riskAmount)}</td>
                  <td>{profile.badRate.toFixed(1)} %</td>
                  <td>{profile.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function OutcomeControlView({ standort, cases: rows, importRows = [] }: { standort?: Standort; cases: BfsCase[]; importRows?: ImportPreviewRow[] }) {
  const outcomeRows = outcomeRowsFromImportRows(importRows, standort?.id);
  const openItems = openUnresolvedMovementsFromImportRows(importRows, standort?.id);
  const fallbackRows = outcomeRows.length ? outcomeRows : outcomeRowsFromCases(rows);
  const totals = fallbackRows.reduce((sum, row) => ({
    total: sum.total + row.total,
    reworked: sum.reworked + row.reworked,
    paid: sum.paid + row.paid,
    open: sum.open + row.open,
    amount: sum.amount + row.amount
  }), { total: 0, reworked: 0, paid: 0, open: 0, amount: 0 });
  const openAmount = openItems.length ? openItems.reduce((sum, item) => sum + item.amount, 0) : totals.amount;
  const successRate = totals.total ? Math.round((totals.paid / totals.total) * 100) : 0;

  return (
    <div className="content-stack">
      <section className="priority-grid">
        <PriorityCard label="Fälle im Blick" value={String(totals.total)} hint={standort ? standort.name : "alle Standorte"} tone="blue" />
        <PriorityCard label="Nachbearbeitet" value={String(totals.reworked)} hint="Neueinreichung oder Maßnahme erkannt" tone="amber" />
        <PriorityCard label="Bezahlt / erledigt" value={String(totals.paid)} hint={`${successRate} % Erfolgsquote`} tone="green" />
        <PriorityCard label="Noch offen" value={String(openItems.length || totals.open)} hint={money.format(openAmount)} tone={(openItems.length || totals.open) ? "red" : "green"} />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{standort ? `Maßnahmenkontrolle ${standort.name}` : "Maßnahmenkontrolle Gruppe"}</h2>
            <p>Zeigt je Standort und Monat, ob stornierte oder zurückgegebene Fälle nachbearbeitet wurden und ob daraus eine Erledigung erkennbar ist.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Monat</th>
                <th>Standort</th>
                <th>Ausgangsfälle</th>
                <th>Nachbearbeitet</th>
                <th>Bezahlt / erledigt</th>
                <th>Noch offen</th>
                <th>Offener Betrag</th>
                <th>Beispiele</th>
              </tr>
            </thead>
            <tbody>
              {fallbackRows.map((row) => (
                <tr key={`${row.locationName}-${row.month}`}>
                  <td><strong>{row.month}</strong></td>
                  <td>{row.locationName}</td>
                  <td>{row.total}</td>
                  <td>{row.reworked}</td>
                  <td>{row.paid}</td>
                  <td>{row.open}</td>
                  <td>{money.format(row.amount)}</td>
                  <td>{row.examples.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {!!openItems.length && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Offen nach Storno/Rückgabe</h2>
              <p>Patienten, bei denen eine Rückgabe oder Stornierung erkannt wurde, aber im hochgeladenen Datenstand keine spätere Neueinreichung oder Erledigung gefunden wurde.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Standort</th>
                  <th>Datum</th>
                  <th>Re.-Nr.</th>
                  <th>BFS-Nr.</th>
                  <th>Grund</th>
                  <th>Betrag</th>
                  <th>Quelle</th>
                </tr>
              </thead>
              <tbody>
                {openItems.slice(0, 120).map((item) => (
                  <tr key={`${item.file}-${item.bfsNo}-${item.invoiceNo}-${item.patientName}`}>
                    <td><strong>{item.patientName}</strong></td>
                    <td>{item.locationName}</td>
                    <td>{item.date}</td>
                    <td>{item.invoiceNo}</td>
                    <td>{item.bfsNo}</td>
                    <td>{item.reason}</td>
                    <td>{money.format(item.amount)}</td>
                    <td>{item.file}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function MatchesView({ cases: rows, importRows = [] }: { cases: BfsCase[]; importRows?: ImportPreviewRow[] }) {
  const candidates = resubmissionCandidatesFromImportRows(importRows);
  if (candidates.length) {
    return (
      <div className="content-stack">
        <section className="priority-grid">
          <PriorityCard label="Neueinreichungen" value={String(candidates.length)} hint="nach Storno/Rückgabe erkannt" tone="blue" />
          <PriorityCard label="Betroffene Patienten" value={String(new Set(candidates.map((candidate) => candidate.patientName)).size)} hint="aus aktuellem Upload" tone="amber" />
          <PriorityCard label="Ursprungsbetrag" value={money.format(candidates.reduce((sum, candidate) => sum + candidate.originalAmount, 0))} hint="stornierte/rückgegebene Beträge" tone="red" />
          <PriorityCard label="Neue Summe" value={money.format(candidates.reduce((sum, candidate) => sum + candidate.newAmount, 0))} hint="spätere Forderungen" tone="green" />
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Neueinreichungen nach Storno/Rückgabe</h2>
              <p>Automatisch erkannte Fälle, bei denen ein Patient nach einer Storno- oder Rückgabe-Bewegung später wieder in einer Forderungsliste auftaucht.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Ursprung</th>
                  <th>Grund</th>
                  <th>Neue Einreichung</th>
                  <th>Beträge</th>
                  <th>Quelle</th>
                </tr>
              </thead>
              <tbody>
                {candidates.slice(0, 60).map((candidate) => (
                  <tr key={`${candidate.patientName}-${candidate.bfsNo}-${candidate.newInvoiceNo}-${candidate.newDate}`}>
                    <td><strong>{candidate.patientName}</strong><span>{candidate.locationName}</span></td>
                    <td>{candidate.originalDate}<span>{candidate.invoiceNo} / {candidate.bfsNo}</span></td>
                    <td>{candidate.reason}</td>
                    <td>{candidate.newDate}<span>{candidate.newInvoiceNo} / {candidate.newBfsNo}</span></td>
                    <td>{money.format(candidate.originalAmount)}<span>neu {money.format(candidate.newAmount)}</span></td>
                    <td>{candidate.newFile}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }
  const matched = rows.filter((fall) => fall.status.includes("automatisch"));
  return (
    <CasesView cases={matched.length ? matched : rows.slice(0, 2).map((fall) => ({ ...fall, status: "neueinreichung_vorschlag", reason: "Neueinreichungsvorschlag" }))} />
  );
}

function ReportsView({ role, standort, cases, importRows = [] }: { role: AppRole; standort: Standort; cases: BfsCase[]; importRows?: ImportPreviewRow[] }) {
  const reportCases = cases.filter((fall) => fall.status !== "erledigt_automatisch");
  function exportCsv() {
    downloadTextFile(`offene-bfs-klaerfaelle-${standort.name.toLowerCase()}.csv`, createCasesCsv(reportCases));
  }
  return (
    <div className="content-stack report-screen">
      <section className="priority-grid">
        <PriorityCard label="Reportfälle" value={String(reportCases.length)} hint="offen und reportfähig" tone={reportCases.length ? "amber" : "green"} />
        <PriorityCard label="Offener Betrag" value={money.format(reportCases.reduce((sum, fall) => sum + fall.amount, 0))} hint={standort.name} tone="blue" />
        <PriorityCard label="Exportformate" value="2" hint="PDF/Druck und CSV" tone="green" />
        <PriorityCard label="Empfängerlogik" value={role === "super_admin" ? "Standort" : "eigener"} hint="rollenbasiert gefiltert" tone="blue" />
      </section>
      <section className="panel report-toolbar">
        <div>
          <h2>Report-Center {standort.name}</h2>
          <p>{role === "super_admin" ? "Reports werden je Standort erzeugt und können als PDF/Druck oder CSV exportiert werden." : "Standortleitung sieht und exportiert nur den eigenen Standort."}</p>
        </div>
        <button className="secondary-button" onClick={() => window.print()}><Printer size={16} /> Drucken / PDF</button>
        <button className="secondary-button" onClick={exportCsv}><Download size={16} /> CSV</button>
      </section>
      <section className="insight-grid">
        <InsightCard title="Reportversand" items={["Standort auswählen", "Nur offene Fälle filtern", "PDF/Druck oder CSV erzeugen"]} />
        <InsightCard title="Reportinhalte" items={["Offene Rückbelastungen", "Ohne Ausfallschutz laufend", "Wiederholer mit Maßnahme"]} />
        <InsightCard title="Qualität vor Versand" items={["Import-Vorschau muss geprüft sein", "Unklare Mandanten vorher klären", "Historische Matches beachten"]} />
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
        <RiskView standortId={standort.id} importRows={importRows} />
        <h3>Abschnitt 3: Wiederholer ohne Ausfallschutz</h3>
        <RecurringRiskView standortId={standort.id} compact importRows={importRows} />
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

function ImportHistory({ rows }: { rows: ImportPreviewRow[] }) {
  return <ImportPreview rows={rows} />;
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

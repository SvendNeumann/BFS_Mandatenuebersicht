"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
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
  standorte,
  compareStandorteByContractStart,
  isStandortLive,
  liveStatusLabel,
  orderedStandorte
} from "@/lib/demo-data";
import type { AppRole, BfsCase, ImportPreviewRow, RiskClaim, Standort } from "@/lib/types";
import { createCasesCsv, downloadTextFile } from "@/lib/reporting";
import { enablePasskey, getCurrentSession, getStoredSession, hasSavedPasskey, logout, removePasskey, type DemoSession } from "@/lib/auth";
import { importRowBusinessIdentity, isBfsPdfUploadFile, parseDemoImportFiles, reconcileImportRows } from "@/lib/demo-import";
import { caseResolutionKeyFromParts } from "@/lib/case-resolution";

const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const defaultStandorteSnapshot = standorte.map(locationConfigSnapshot);
const locationConfigStorageKey = "orisus_bfs_monitor_locations";
const viewStateStorageKey = "orisus_bfs_monitor_view_state";

type NavItem = readonly [string, string, LucideIcon];
type NavSection = {
  title: string;
  items: NavItem[];
};

const superAdminNav: NavSection[] = [
  {
    title: "Management",
    items: [
      ["dashboard", "Cockpit", LayoutDashboard],
      ["answers", "Schnellantworten", ClipboardList],
      ["worklist", "Prioritäten heute", AlertCircle]
    ]
  },
  {
    title: "Analyse & Benchmarking",
    items: [
      ["benchmark", "Standorte", Building2],
      ["claims", "Forderungen & Geldfluss", ReceiptText],
      ["quality", "Forderungsqualität", ShieldCheck]
    ]
  },
  {
    title: "Operative Fallarbeit",
    items: [
      ["cases", "Klärfälle", AlertCircle],
      ["matches", "Matching & Neueinreichungen", RefreshCw],
      ["chargebacks", "Rückbelastungen", CircleDollarSign],
      ["followups", "Wiedervorlagen", CalendarClock]
    ]
  },
  {
    title: "Reports",
    items: [
      ["reports", "Report-Center", FileText],
      ["groupReports", "Gruppenreports", BarChart3],
      ["outcomes", "Maßnahmenkontrolle", ClipboardCheck]
    ]
  },
  {
    title: "Import & Prüfung",
    items: [
      ["upload", "Import-Center", FolderUp]
    ]
  },
  {
    title: "Admin Bereich",
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
      ["dashboard", "Cockpit", LayoutDashboard],
      ["answers", "Schnellantworten", ClipboardList],
      ["worklist", "Meine Prioritäten", AlertCircle]
    ]
  },
  {
    title: "Analyse",
    items: [
      ["claims", "Forderungen & Geldfluss", ReceiptText],
      ["quality", "Forderungsqualität", ShieldCheck]
    ]
  },
  {
    title: "Operative Fallarbeit",
    items: [
      ["cases", "Klärfälle", AlertCircle],
      ["matches", "Matching & Neueinreichungen", RefreshCw],
      ["chargebacks", "Rückbelastungen", CircleDollarSign],
      ["followups", "Wiedervorlagen", CalendarClock]
    ]
  },
  {
    title: "Reports",
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

type ManualCaseResolution = {
  caseKey: string;
  standortId: string;
  patientName: string;
  invoiceNo: string;
  bfsNo: string;
  amount: number;
  reason: string;
  status: "paid_manual" | "open_manual";
  comment: string;
  resolvedAt: string;
  resolvedBy: string;
};

export default function MonitorApp({ lockedRole, initialView = "dashboard", requireAuth = true }: MonitorAppProps) {
  const [session, setSession] = useState<DemoSession | null>(() => getStoredSession());
  const [sessionChecked, setSessionChecked] = useState(false);
  const role = lockedRole ?? session?.role ?? "super_admin";
  const [activeView, setActiveView] = useState(() => {
    const storedView = readStoredViewState()?.activeView;
    return storedView && isKnownViewForRole(storedView, role) ? storedView : initialView;
  });
  const [, setLocationConfigVersion] = useState(0);
  const [selectedStandortId, setSelectedStandortId] = useState(() => {
    const storedStandortId = readStoredViewState()?.selectedStandortId;
    return storedStandortId && isKnownStandortScopeForRole(storedStandortId, role) ? storedStandortId : role === "super_admin" ? "gruppe" : standorte[0].id;
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [liveImportRows, setLiveImportRows] = useState<ImportPreviewRow[]>(() => loadStoredImportRows());
  const [manualCaseResolutions, setManualCaseResolutions] = useState<ManualCaseResolution[]>([]);
  const [caseToResolve, setCaseToResolve] = useState<BfsCase | null>(null);
  const [caseResolutionMode, setCaseResolutionMode] = useState<ManualCaseResolution["status"]>("paid_manual");
  const [caseResolveError, setCaseResolveError] = useState("");
  const [caseResolveSaving, setCaseResolveSaving] = useState(false);
  const selectedStandort = standorte.find((standort) => standort.id === selectedStandortId) ?? standorte[0];
  const isGroupScope = role === "super_admin" && selectedStandortId === "gruppe";
  const hasUploadData = liveImportRows.length > 0;
  const emptyDataAllowedViews = ["upload", "preview", "history", "locations", "users", "settings"];
  const viewsWithStandortScope = [
    "dashboard",
    "worklist",
    "answers",
    "quality",
    "claims",
    "cases",
    "chargebacks",
    "followups",
    "risks",
    "repeatRisks",
    "patientClasses",
    "matches",
    "reports",
    "outcomes"
  ];
  const showStandortTabs = viewsWithStandortScope.includes(activeView);
  const showNoUploadData = !hasUploadData && !emptyDataAllowedViews.includes(activeView);
  const appCases = useMemo(() => {
    const resolvedKeys = new Set(manualCaseResolutions.filter((resolution) => resolution.status === "paid_manual").map((resolution) => resolution.caseKey));
    return casesFromImportRows(liveImportRows).filter((fall) => !resolvedKeys.has(caseResolutionKey(fall)));
  }, [liveImportRows, manualCaseResolutions]);
  const visibleCases = useMemo(
    () => appCases.filter((fall) => isGroupScope || fall.standortId === selectedStandort.id),
    [appCases, isGroupScope, selectedStandort.id]
  );
  const nav = role === "super_admin" ? superAdminNav : leadNav;

  useEffect(() => {
    getCurrentSession()
      .then((currentSession) => {
        setSession(currentSession);
        setSessionChecked(true);
      })
      .catch(() => setSessionChecked(true));
    applyStoredStandorteConfig();
    setLocationConfigVersion((version) => version + 1);
    let active = true;
    loadStoredImportRowsFromDb()
      .then((rows) => {
        if (active) setLiveImportRows(rows);
      })
      .catch(() => undefined);
    loadManualCaseResolutions()
      .then((resolutions) => {
        if (active) setManualCaseResolutions(resolutions);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [activeView]);

  useEffect(() => {
    if (role !== "super_admin" && selectedStandortId === "gruppe") {
      setSelectedStandortId(standorte[0].id);
      return;
    }
    writeStoredViewState(activeView, selectedStandortId, role);
  }, [activeView, selectedStandortId, role]);

  if (requireAuth && !session && !sessionChecked) {
    return <AccessGate title="Session wird geprüft" message="Die Anmeldung wird serverseitig validiert." />;
  }

  if (requireAuth && !session) {
    return <AccessGate title="Login erforderlich" message="Bitte melde dich an, um diesen geschützten Bereich zu öffnen." />;
  }

  if (requireAuth && lockedRole && session?.role !== lockedRole) {
    return <AccessGate title="Kein Zugriff auf diesen Bereich." message="Dieser Bereich ist für deine Rolle nicht freigegeben." />;
  }

  function selectStandortTab(nextStandortId: string) {
    setSelectedStandortId(nextStandortId);
    if (activeView === "groupReports" && nextStandortId !== "gruppe") navigateTo("dashboard");
  }

  function toggleNavSection(title: string) {
    setExpandedSections((current) => current[title] ? {} : { [title]: true });
  }

  function navigateTo(key: string) {
    setActiveView(key);
    setMobileNavOpen(false);
    openNavSectionForView(key);
  }

  function goToSummary() {
    if (role === "super_admin") setSelectedStandortId("gruppe");
    setActiveView("dashboard");
    setMobileNavOpen(false);
    openNavSectionForView("dashboard");
  }

  function openNavSectionForView(key: string) {
    const section = nav.find((entry) => entry.items.some(([itemKey]) => itemKey === key));
    setExpandedSections(section ? { [section.title]: true } : {});
  }

  function resolveCaseAsPaid(fall: BfsCase) {
    setCaseResolutionMode("paid_manual");
    setCaseResolveError("");
    setCaseToResolve(fall);
  }

  function markCaseStillOpen(fall: BfsCase) {
    setCaseResolutionMode("open_manual");
    setCaseResolveError("");
    setCaseToResolve(fall);
  }

  async function confirmResolveCaseAsPaid() {
    if (!caseToResolve) return;
    setCaseResolveSaving(true);
    setCaseResolveError("");
    try {
      const resolution = await saveManualCaseResolution(caseToResolve, caseResolutionMode);
      setManualCaseResolutions((current) => [resolution, ...current.filter((entry) => entry.caseKey !== resolution.caseKey)]);
      setCaseToResolve(null);
    } catch (error) {
      setCaseResolveError(error instanceof Error ? error.message : "Der Klärfall konnte nicht als bezahlt markiert werden.");
    } finally {
      setCaseResolveSaving(false);
    }
  }

  function closeResolveCaseDialog() {
    if (caseResolveSaving) return;
    setCaseToResolve(null);
    setCaseResolveError("");
  }

  function hardReload() {
    writeStoredViewState(activeView, selectedStandortId, role);
    window.location.reload();
  }

  return (
    <main className={mobileNavOpen ? "app-shell nav-open" : "app-shell"}>
      <button className="mobile-nav-overlay" aria-label="Navigation schließen" onClick={() => setMobileNavOpen(false)} />
      <aside className="sidebar">
        <div className="sidebar-inner">
          <div className="sidebar-top">
            <button className="brand brand-button" onClick={goToSummary} aria-label="Zur Zusammenfassung">
              <img className="orisus-wordmark" src="/orisus-zahnmedizin-transparent.png" alt="Orisus Zahnmedizin" />
            </button>
            <button className="drawer-close" aria-label="Navigation schließen" onClick={() => setMobileNavOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <nav>
            {nav.map((section) => {
              const sectionActive = section.items.some(([key]) => activeView === key);
              const sectionExpanded = Boolean(expandedSections[section.title]);
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
            <div className="user-box">
              <UserRoundCheck size={18} />
              <div>
                <strong>{role === "super_admin" ? "Zentrale / CFO" : selectedStandort.name}</strong>
                <span>{session?.email ?? "Nicht angemeldet"}</span>
                <small>{role === "super_admin" ? "Super Admin" : "Standortleitung"} · {isGroupScope ? "Alle Standorte" : selectedStandort.name}</small>
              </div>
            </div>
            <button className="reload-button" onClick={hardReload}>
              <RefreshCw size={16} /> Neu laden
            </button>
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
          <button className="mobile-app-brand" onClick={goToSummary} aria-label="Zur Zusammenfassung">
            <img className="orisus-wordmark" src="/orisus-zahnmedizin-transparent.png" alt="Orisus Zahnmedizin" />
          </button>
          <button className="mobile-menu-button" aria-label="Navigation öffnen" onClick={() => setMobileNavOpen(true)}>
            <Menu size={18} />
          </button>
          <div className="topbar-title desktop-page-title">
            <span className="eyebrow">{isGroupScope ? "Alle Standorte" : selectedStandort.name}</span>
            <h1>{titleFor(activeView, role, isGroupScope)}</h1>
          </div>
          <div className="topbar-actions desktop-page-actions">
            {activeView !== "dashboard" && <button className="secondary-button" onClick={() => navigateTo("worklist")}><ClipboardList size={16} /> Prioritäten</button>}
          </div>
        </header>
        <div className="mobile-page-heading">
          <div>
            <span className="eyebrow">{isGroupScope ? "Alle Standorte" : selectedStandort.name}</span>
            <h1>{titleFor(activeView, role, isGroupScope)}</h1>
          </div>
          <div className="topbar-actions">
            {activeView !== "dashboard" && <button className="secondary-button" onClick={() => navigateTo("worklist")}><ClipboardList size={16} /> Prioritäten</button>}
          </div>
        </div>

        {showStandortTabs && (
          <StandortTabs
            role={role}
            selectedStandortId={selectedStandortId}
            onSelect={selectStandortTab}
            importRows={liveImportRows}
          />
        )}

        {showNoUploadData ? (
          <NoUploadDataView onUpload={() => navigateTo("upload")} />
        ) : (
          <>
            {activeView === "dashboard" && (
              role === "super_admin" && isGroupScope
                ? <GroupDashboard onNavigate={navigateTo} importRows={liveImportRows} />
                : <LocationDashboard standort={selectedStandort} cases={visibleCases} onNavigate={navigateTo} importRows={liveImportRows} />
            )}
            {activeView === "worklist" && <WorklistView cases={visibleCases} onNavigate={navigateTo} />}
            {activeView === "answers" && <AnswerCockpit scope={isGroupScope ? "group" : "location"} standort={isGroupScope ? undefined : selectedStandort} cases={visibleCases} onNavigate={navigateTo} importRows={liveImportRows} />}
            {activeView === "benchmark" && <BenchmarkView onNavigate={navigateTo} importRows={liveImportRows} />}
            {activeView === "quality" && <QualityView standort={isGroupScope ? undefined : selectedStandort} cases={visibleCases} importRows={liveImportRows} onNavigate={navigateTo} manualCaseResolutions={manualCaseResolutions} />}
            {activeView === "claims" && <ClaimsFlowView standort={isGroupScope ? undefined : selectedStandort} cases={visibleCases} importRows={liveImportRows} manualCaseResolutions={manualCaseResolutions} onResolvePaid={resolveCaseAsPaid} onKeepOpen={markCaseStillOpen} />}
            {["upload", "preview", "history"].includes(activeView) && <UploadView liveRows={liveImportRows} onRowsChange={setLiveImportRows} />}
            {activeView === "cases" && <CasesView cases={visibleCases} onResolvePaid={resolveCaseAsPaid} />}
            {activeView === "chargebacks" && <CasesView cases={visibleCases.filter((fall) => fall.reason.includes("Rückgabe") || fall.reason.includes("Rückbelastung"))} title="Rückbelastungen" description="Alle echten Rückbelastungen, die aktiv geklärt oder an den Standort gegeben werden müssen." onResolvePaid={resolveCaseAsPaid} />}
            {activeView === "followups" && <CasesView cases={visibleCases.filter((fall) => fall.status === "wiedervorlage" || fall.dueDate !== "-")} title="Wiedervorlagen" description="Fälle mit Frist, Rückfrage oder nächstem Bearbeitungstermin." onResolvePaid={resolveCaseAsPaid} />}
            {activeView === "risks" && <RiskView standortId={isGroupScope ? undefined : selectedStandort.id} importRows={liveImportRows} />}
            {activeView === "repeatRisks" && <RecurringRiskView standortId={isGroupScope ? undefined : selectedStandort.id} importRows={liveImportRows} />}
            {activeView === "patientClasses" && <PatientClassificationView standort={isGroupScope ? undefined : selectedStandort} cases={visibleCases} importRows={liveImportRows} />}
            {activeView === "matches" && <MatchesView cases={visibleCases} importRows={liveImportRows} standort={isGroupScope ? undefined : selectedStandort} />}
            {activeView === "reports" && <ReportsView role={role} standort={selectedStandort} cases={visibleCases} importRows={liveImportRows} />}
            {activeView === "outcomes" && <OutcomeControlView standort={isGroupScope ? undefined : selectedStandort} cases={visibleCases} importRows={liveImportRows} manualCaseResolutions={manualCaseResolutions} />}
            {activeView === "groupReports" && (isGroupScope ? <GroupReportsView onNavigate={navigateTo} /> : <ReportsView role={role} standort={selectedStandort} cases={visibleCases} importRows={liveImportRows} />)}
            {activeView === "locations" && <LocationsView onLocationsChange={() => setLocationConfigVersion((version) => version + 1)} />}
            {activeView === "users" && <UsersView />}
            {activeView === "settings" && <SettingsView />}
          </>
        )}
      </section>
      {caseToResolve && (
        <div className="case-resolution-overlay" role="dialog" aria-modal="true" aria-label="Klärfall als bezahlt markieren">
          <button className="confirmation-backdrop" aria-label="Dialog schließen" onClick={closeResolveCaseDialog} />
          <section className="confirmation-dialog case-resolution-dialog">
            <div className="case-resolution-icon"><CheckCircle2 size={24} /></div>
            <h2>{caseResolutionMode === "paid_manual" ? "Fall als bezahlt markieren?" : "Fall weiterhin offen lassen?"}</h2>
            <p>
              {caseResolutionMode === "paid_manual"
                ? `${caseToResolve.patientName} wird als manuell geprüft und bezahlt gespeichert. Der Vorgang wird danach aus den offenen Klärfällen ausgeblendet, auch wenn derselbe Importfall erneut auftaucht.`
                : `${caseToResolve.patientName} wird als geprüft, aber weiterhin offen gespeichert. Der Vorgang verschwindet aus dieser Geldfluss-Prüfliste und bleibt in den Klärfällen für die operative Bearbeitung sichtbar.`}
            </p>
            <dl>
              <div><dt>Standort</dt><dd>{caseToResolve.locationName}</dd></div>
              <div><dt>Betrag</dt><dd>{money.format(caseToResolve.amount)}</dd></div>
              <div><dt>Grund</dt><dd>{caseToResolve.reason}</dd></div>
              <div><dt>Re.-Nr.</dt><dd>{caseToResolve.invoiceNo}</dd></div>
            </dl>
            {caseResolveError && <p className="case-resolution-error">{caseResolveError}</p>}
            <div className="case-resolution-actions">
              <button className="secondary-button" disabled={caseResolveSaving} onClick={closeResolveCaseDialog}>
                Abbrechen
              </button>
              <button className="primary-button" disabled={caseResolveSaving} onClick={() => void confirmResolveCaseAsPaid()}>
                <CheckCircle2 size={16} /> {caseResolveSaving ? "Speichern..." : caseResolutionMode === "paid_manual" ? "Als bezahlt markieren" : "Weiterhin offen speichern"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function StandortTabs({ role, selectedStandortId, onSelect, importRows }: { role: AppRole; selectedStandortId: string; onSelect: (standortId: string) => void; importRows: ImportPreviewRow[] }) {
  const visibleStandorte = role === "super_admin" ? orderedStandorte() : orderedStandorte(standorte.slice(0, 1));
  const openCasesByStandort = countOpenCasesByStandort(importRows);
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
          <span>{importRows.length ? `${openCasesByStandort.get(standort.id) ?? 0} offen` : "0 offen"}</span>
        </button>
      ))}
    </section>
  );
}

function NoUploadDataView({ onUpload }: { onUpload: () => void }) {
  return (
    <section className="panel empty-data-panel">
      <HardDriveUpload size={28} />
      <div>
        <span className="eyebrow">Keine Importdaten</span>
        <h2>Datenupload zurückgesetzt</h2>
        <p>Aktuell sind keine BFS-Abrechnungen im Datenstand. Deshalb werden Cockpit, Auswertungen, Klärfälle, Risiko, Matching und Reports erst wieder befüllt, sobald ein neuer Upload verarbeitet wurde.</p>
      </div>
      <div className="case-summary-grid" aria-label="Leerer Datenstand">
        <article><span>Dateien</span><strong>0</strong></article>
        <article><span>Umsatz eingereicht</span><strong>{money.format(0)}</strong></article>
        <article><span>Offene Klärfälle</span><strong>0</strong></article>
        <article><span>Rückgaben/Stornos</span><strong>0</strong></article>
      </div>
      <button className="primary-button" onClick={onUpload}>
        <FolderUp size={16} /> Zum Import-Center
      </button>
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

function readStoredViewState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(currentViewStateStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<{ activeView: string; selectedStandortId: string }>;
    return {
      activeView: typeof parsed.activeView === "string" && isKnownView(parsed.activeView) ? parsed.activeView : undefined,
      selectedStandortId: typeof parsed.selectedStandortId === "string" && isKnownStandortScope(parsed.selectedStandortId)
        ? parsed.selectedStandortId
        : undefined
    };
  } catch {
    window.localStorage.removeItem(currentViewStateStorageKey());
    return null;
  }
}

function writeStoredViewState(activeView: string, selectedStandortId: string, role: AppRole) {
  if (typeof window === "undefined") return;
  if (!isKnownViewForRole(activeView, role) || !isKnownStandortScopeForRole(selectedStandortId, role)) return;
  window.localStorage.setItem(currentViewStateStorageKey(), JSON.stringify({ activeView, selectedStandortId }));
}

function currentViewStateStorageKey() {
  if (typeof window === "undefined") return viewStateStorageKey;
  return `${viewStateStorageKey}:${window.location.pathname}`;
}

function isKnownView(view: string) {
  return [...superAdminNav, ...leadNav].some((section) => section.items.some(([key]) => key === view));
}

function isKnownViewForRole(view: string, role: AppRole) {
  const nav = role === "super_admin" ? superAdminNav : leadNav;
  return nav.some((section) => section.items.some(([key]) => key === view));
}

function isKnownStandortScope(standortId: string) {
  return standortId === "gruppe" || standorte.some((standort) => standort.id === standortId);
}

function isKnownStandortScopeForRole(standortId: string, role: AppRole) {
  if (role !== "super_admin" && standortId === "gruppe") return false;
  return isKnownStandortScope(standortId);
}

function titleFor(view: string, role: AppRole, isGroupScope: boolean) {
  const titles: Record<string, string> = {
    dashboard: role === "super_admin" && isGroupScope ? "Cockpit" : "Standort-Cockpit",
    answers: "Schnellantworten",
    benchmark: "Standorte",
    quality: "Forderungsqualität",
    claims: "Forderungen & Geldfluss",
    worklist: role === "super_admin" ? "Prioritäten heute" : "Meine Prioritäten",
    upload: "Import-Center",
    preview: "Import-Center",
    history: "Import-Center",
    cases: "Klärfälle",
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
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(periodOptions[0].id);
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0], [periodOptions, selectedPeriodId]);
  const filteredStandorte = useMemo(() => groupStandortFilter === "alle"
    ? orderedStandorte()
    : standorte.filter((standort) => standort.id === groupStandortFilter), [groupStandortFilter]);
  const filteredStandortIds = useMemo(() => new Set(filteredStandorte.map((standort) => standort.id)), [filteredStandorte]);
  const dashboardCases = useMemo(() => casesFromImportRows(importRows), [importRows]);
  const openCases = useMemo(() => dashboardCases.filter((fall) => !fall.status.includes("erledigt") && filteredStandortIds.has(fall.standortId)), [dashboardCases, filteredStandortIds]);
  const focusedCases = useMemo(() => openCases.filter((fall) => {
    if (groupFocus === "rueckbelastungen") return fall.reason.includes("Rückgabe") || fall.reason.includes("Rückbelastung");
    if (groupFocus === "wiedervorlagen") return fall.status === "wiedervorlage" || fall.dueDate !== "-";
    return true;
  }), [openCases, groupFocus]);
  const focusedRisks = useMemo(() => riskClaimsFromImportRows(importRows).filter((claim) => filteredStandortIds.has(claim.standortId)), [importRows, filteredStandortIds]);
  const scopedImportRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = filteredStandorte.find((standort) => standort.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedPeriod, rowStandort) : false;
  }), [importRows, filteredStandorte, selectedPeriod]);
  const importSummary = useMemo(() => summarizeImportRows(scopedImportRows), [scopedImportRows]);
  const selectedMetrics = useMemo(() => importSummary.rows ? metricsFromImportSummary(importSummary) : zeroMetrics(), [importSummary]);
  const periodLabel = importRows.length ? "aktueller Import" : selectedPeriod.label;
  const groupChartSeries = useMemo(() => buildGroupDashboardSeries(filteredStandorte, selectedPeriod, importRows), [filteredStandorte, selectedPeriod, importRows]);
  const locationSnapshots = useMemo(() => buildLocationSnapshots(filteredStandorte, selectedPeriod, scopedImportRows, openCases), [filteredStandorte, selectedPeriod, scopedImportRows, openCases]);
  const oldestOpenCase = focusedCases.reduce((max, fall) => Math.max(max, fall.ageDays), 0);
  const chargebackRate = selectedMetrics.submitted ? ((selectedMetrics.returnAmount + selectedMetrics.cancellationAmount) / selectedMetrics.submitted) * 100 : 0;
  const groupKpiInfo = buildKpiDerivationInfo(selectedMetrics, periodLabel);
  const groupKpis: KpiCardTuple[] = [
    ["Umsatz eingereicht", money.format(selectedMetrics.submitted), periodLabel, groupKpiInfo.submitted],
    ["Auszahlungsbetrag", money.format(selectedMetrics.payout), periodLabel, groupKpiInfo.payout],
    ["Gesamtkosten BFS", money.format(selectedMetrics.fees), periodLabel, groupKpiInfo.fees],
    ["Gebührenquote", `${selectedMetrics.feeRate.toFixed(2)} %`, periodLabel],
    ["Rückbelastungsquote", `${chargebackRate.toFixed(2)} %`, "Rückgaben und Stornos am Eingang"],
    ["Ohne Ausfallschutz", money.format(importSummary.rows ? importSummary.noProtectionAmount : selectedMetrics.noProtectionAmount || focusedRisks.reduce((sum, claim) => sum + claim.amount, 0)), importSummary.rows ? "aus aktuellem Import" : selectedPeriod.label],
    ["Offene Klärfälle", String(focusedCases.length), groupFocus === "gesamt" ? "nach Standortfilter" : "nach Fokus gefiltert"],
    ["Ältester Fall", `${oldestOpenCase} Tage`, "älteste offene Position"]
  ];
  const cockpitAlerts = buildCockpitAlerts(locationSnapshots, selectedMetrics, focusedCases);
  return (
    <div className="content-stack">
      <GroupFilterBar
        selectedStandort={groupStandortFilter}
        selectedFocus={groupFocus}
        onStandortChange={setGroupStandortFilter}
        onFocusChange={setGroupFocus}
      />
      <section className="panel period-filter">
        <label className="select-label">
          Zeitraum Zusammenfassung
          <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>
            {periodOptions.map((period) => (
              <option key={period.id} value={period.id}>{period.label}</option>
            ))}
          </select>
        </label>
        <div>
          <strong>{selectedPeriod.label}</strong>
          <span>{selectedPeriod.detail}. Jeder Standort wird erst ab seinem Vertragsstart gezählt: Kirchberg 01.07.2024, Essen 01.01.2025, Kehl 01.04.2025, Ulmet 01.07.2025, Hüttenberg 01.01.2026, Kassel ab 01.07.2026.</span>
        </div>
      </section>
      <KpiGrid cards={groupKpis} />
      <section className="dashboard-grid cockpit-action-grid">
        <article className="panel command-panel">
          <div>
            <span className="eyebrow">Was ist auffällig?</span>
            <h2>{cockpitAlerts.headline}</h2>
            <p>{cockpitAlerts.detail}</p>
          </div>
          <div className="quick-actions">
            <button className="primary-button" onClick={() => onNavigate(cockpitAlerts.primaryView)}><AlertCircle size={16} /> Jetzt prüfen</button>
            <button className="secondary-button" onClick={() => onNavigate("benchmark")}><Building2 size={16} /> Standorte vergleichen</button>
            <button className="secondary-button" onClick={() => onNavigate("quality")}><ShieldCheck size={16} /> Qualität ansehen</button>
          </div>
        </article>
        <article className="panel process-panel">
          <h2>Was muss geprüft werden?</h2>
          <div className="stacked-checks">
            {cockpitAlerts.actions.map((action) => <span key={action}>{action}</span>)}
          </div>
        </article>
      </section>
      <section className="chart-grid">
        {groupChartSeries.map((chart) => (
          <div className="panel mini-chart" key={chart.title}>
            <h2>{chart.title}</h2>
            <small className="period-note">Zeitraum: {selectedPeriod.label}</small>
            <InteractiveBars title={chart.title} values={chart.values} />
          </div>
        ))}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Standort-Benchmark</h2>
            <p>Chronologisch nach Vertragsstart: Volumen, Gebühren, Rückbelastungen, Ohne-Ausfallschutz und offene Fälle je Standort.</p>
          </div>
          <button className="secondary-button" onClick={() => onNavigate("benchmark")}><BarChart3 size={16} /> Vollansicht</button>
        </div>
        <LocationBenchmarkCards snapshots={locationSnapshots} onNavigate={onNavigate} compact />
      </section>
      <AnswerCockpit scope="group" cases={focusedCases} onNavigate={onNavigate} compact showReportAction={false} importRows={scopedImportRows} periodMetrics={selectedMetrics} periodLabel={periodLabel} hasImportDataset={importRows.length > 0} />
    </div>
  );
}

function InteractiveBars({ title, values }: { title: string; values: { label: string; value: number }[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeValue = values[activeIndex] ?? values[0];
  const valueLabel = formatChartValue(title, activeValue.value);
  const maxValue = Math.max(...values.map((value) => value.value), 100);

  return (
    <div className="interactive-chart" onMouseLeave={() => setActiveIndex(0)}>
      <MetricInfo title={title} text={chartExplanation(title, values)} />
      <div className="chart-legend">
        <span />
        <strong>{chartLegendLabel(title)}</strong>
      </div>
      <div className="chart-tooltip">
        <strong>{activeValue.label}</strong>
        <span>{chartLegendLabel(title)}: {valueLabel}</span>
      </div>
      <div className="bars" role="list" aria-label={title}>
        {values.map((value, index) => (
          <button
            type="button"
            key={value.label}
            className={index === activeIndex ? "active" : ""}
            style={{ height: `${Math.max(14, (value.value / maxValue) * 100)}%` }}
            aria-label={`${value.label}: ${formatChartValue(title, value.value)}`}
            onPointerEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>
      <div className="axis">{values.map((value) => <span key={value.label}>{value.label}</span>)}</div>
    </div>
  );
}

function chartLegendLabel(title: string) {
  if (title.toLowerCase().includes("gebühr") || title.toLowerCase().includes("kosten")) return "Gesamtkosten BFS";
  if (title.toLowerCase().includes("umsatz")) return "Umsatz eingereicht";
  if (title.toLowerCase().includes("rück")) return "Rückbelastungen";
  return "Performanceindex";
}

function chartExplanation(title: string, values: { label: string; value: number }[]) {
  const normalizedTitle = title.toLowerCase();
  const total = values.reduce((sum, entry) => sum + entry.value, 0);
  const filters = "Es wirken die aktuell ausgewählten Standort-, Zeitraum- und Rollenfilter der jeweiligen Seite.";
  const scope = values.length ? `Dargestellt werden ${values.length} Datenpunkte.` : "Es liegen für diese Auswahl keine Datenpunkte vor.";
  if (normalizedTitle.includes("umsatz")) {
    return `Datenquelle: importierte BFS-Abrechnungen aus dem aktuellen Datenstand. Berechnung: Summe der erkannten Forderungsbeträge je angezeigtem Standort oder Zeitraum. Zeitraum: der auf der Seite ausgewählte Zeitraum. Filter: ${filters} Besonderheit: Standorte werden erst ab Vertragsstart berücksichtigt. ${scope} Gesamtsumme der dargestellten Werte: ${money.format(total)}.`;
  }
  if (normalizedTitle.includes("gebühr") || normalizedTitle.includes("kosten")) {
    return `Datenquelle: erkannte Gebühren-, MwSt- und Kostenpositionen aus den BFS-Abrechnungen. Berechnung: Summe der Kostenpositionen je angezeigtem Standort oder Zeitraum, passend zur bestehenden Auswertung. Zeitraum: der auf der Seite ausgewählte Zeitraum. Filter: ${filters} Besonderheit: fehlende Importdaten werden als 0 angezeigt und nicht mit Demo-Werten ergänzt. ${scope} Gesamtsumme der dargestellten Werte: ${money.format(total)}.`;
  }
  if (normalizedTitle.includes("rück") || normalizedTitle.includes("storno")) {
    return `Datenquelle: Kontoauszug-Bewegungen aus den importierten BFS-PDFs. Berechnung: gezählt oder summiert werden erkannte Rückgaben, Rückbelastungen und Storno-Bewegungen gemäß bestehender Falllogik. Zeitraum: der auf der Seite ausgewählte Zeitraum. Filter: ${filters} Besonderheit: manuell erledigte Fälle verändern die Fallarbeit, die Ursprungsbewegung bleibt als Bewegungsereignis auswertbar. ${scope}`;
  }
  if (normalizedTitle.includes("risiko") || normalizedTitle.includes("qualität") || normalizedTitle.includes("patient")) {
    return `Datenquelle: erkannte Forderungen, Bewegungen und Ausfallschutz-Marker aus dem aktuellen Importdatenstand. Berechnung: Die App verdichtet die bestehenden Risiko- und Qualitätsklassen in die angezeigten Gruppen. Zeitraum: aktuelle Auswahl der Seite. Filter: ${filters} Besonderheit: Ohne-Ausfallschutz ist Risiko, nicht automatisch Klärfall. ${scope}`;
  }
  return `Datenquelle: aktueller Importdatenstand der App. Berechnung: Die bereits vorhandenen Kennzahlen werden ohne fachliche Änderung als Diagrammwerte dargestellt. Zeitraum: aktuelle Auswahl der Seite. Filter: ${filters} ${scope}`;
}

function formatChartValue(title: string, value: number) {
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle.includes("gebühr") || normalizedTitle.includes("kosten") || normalizedTitle.includes("umsatz") || normalizedTitle.includes("risikoart")) return money.format(value);
  if (normalizedTitle.includes("rück") || normalizedTitle.includes("patientenqualität")) return `${value} Fälle`;
  return `${value} %`;
}

function buildGroupDashboardSeries(rowsStandorte: Standort[], period: PeriodOption, importRows: ImportPreviewRow[] = []) {
  const activeRows = rowsStandorte.filter((standort) => standortActiveInPeriod(standort, period));
  const sourceRows = activeRows.length ? activeRows : rowsStandorte;
  return [
    {
      title: "Umsatz eingereicht je Standort",
      values: sourceRows.map((standort) => ({
        label: standort.name,
        value: metricsFromImportRowsForStandort(importRows, standort, period).submitted
      }))
    },
    {
      title: "Gesamtkosten BFS je Standort",
      values: sourceRows.map((standort) => ({
        label: standort.name,
        value: metricsFromImportRowsForStandort(importRows, standort, period).fees
      }))
    },
    {
      title: "Rückbelastungen je Standort",
      values: sourceRows.map((standort) => ({
        label: standort.name,
        value: metricsFromImportRowsForStandort(importRows, standort, period).returnCount
      }))
    }
  ];
}

type LocationSnapshot = ReturnType<typeof buildLocationSnapshots>[number];

function buildLocationSnapshots(rowsStandorte: Standort[], period: PeriodOption, importRows: ImportPreviewRow[], openCases: BfsCase[] = []) {
  return rowsStandorte.map((standort) => {
    const locationRows = importRows.filter((row) => row.location === standort.name);
    const summary = summarizeImportRows(locationRows);
    const metrics = summary.rows ? metricsFromImportSummary(summary) : zeroMetrics();
    const locationCases = openCases.filter((fall) => fall.standortId === standort.id);
    const openAmount = locationCases.reduce((sum, fall) => sum + fall.amount, 0);
    const oldest = locationCases.reduce((max, fall) => Math.max(max, fall.ageDays), 0);
    const chargebackAmount = metrics.returnAmount + metrics.cancellationAmount;
    const chargebackRate = metrics.submitted ? (chargebackAmount / metrics.submitted) * 100 : 0;
    const claimCount = locationRows.reduce((sum, row) => sum + (row.parsedClaims?.length ?? 0), 0);
    const noProtectionClaimCount = locationRows.reduce((sum, row) => sum + rowNoProtectionClaims(row).length, 0);
    const noProtectionCaseRate = claimCount ? (noProtectionClaimCount / claimCount) * 100 : 0;
    const riskClaims = riskClaimsFromImportRows(locationRows);
    const suspiciousNoProtectionAmount = riskClaims
      .filter((claim) => claim.assessment === "auffaellig")
      .reduce((sum, claim) => sum + claim.amount, 0);
    const cleanNoProtectionShare = Math.max(metrics.noProtectionAmount - suspiciousNoProtectionAmount, 0) / Math.max(metrics.submitted, 1);
    const suspiciousNoProtectionShare = suspiciousNoProtectionAmount / Math.max(metrics.submitted, 1);
    const riskScore = chargebackRate * 2
      + Math.min(10, cleanNoProtectionShare * 100)
      + Math.min(35, suspiciousNoProtectionShare * 150)
      + (oldest > 30 ? 20 : oldest > 14 ? 10 : 0);
    return {
      standort,
      metrics,
      rows: summary.rows,
      latestImport: latestImportDateForStandort(locationRows),
      status: periodStatusLabel(standort, period),
      openCases: locationCases.length,
      openAmount,
      oldest,
      chargebackRate,
      claimCount,
      noProtectionClaimCount,
      noProtectionCaseRate,
      riskScore
    };
  }).sort((a, b) => compareStandorteByContractStart(a.standort, b.standort));
}

function buildCockpitAlerts(snapshots: LocationSnapshot[], metrics: BfsMetrics, focusedCases: BfsCase[]) {
  const riskyLocation = snapshots.find((entry) => entry.riskScore > 0);
  const oldCases = focusedCases.filter((fall) => fall.ageDays > 30);
  if (oldCases.length) {
    return {
      headline: `${oldCases.length} Klärfall(e) über 30 Tage offen`,
      detail: "Die operative Fallarbeit hat Vorrang, weil alte Rückbelastungen und Stornos sonst in der Steuerung hängen bleiben.",
      primaryView: "cases",
      actions: ["Älteste offenen Fälle zuerst prüfen", "Rückbelastung/Storno von Risiko ohne Ausfallschutz trennen", "Neueinreichungen gegen offene Fälle matchen"]
    };
  }
  if (riskyLocation) {
    return {
      headline: `${riskyLocation.standort.name} ist im Benchmark auffällig`,
      detail: `Risiko entsteht aktuell vor allem aus ${money.format(riskyLocation.metrics.noProtectionAmount)} ohne Ausfallschutz und ${riskyLocation.openCases} offenen Klärfällen.`,
      primaryView: "benchmark",
      actions: ["Standort im Ranking prüfen", "Gebührenquote und Rückbelastungsquote vergleichen", "Forderungsqualität nach Patient und Ursache ansehen"]
    };
  }
  if (metrics.submitted > 0) {
    return {
      headline: "Datenstand wirkt aktuell unauffällig",
      detail: "Es liegen importierte BFS-Werte vor, aber keine dominante Sofortauffälligkeit im aktuellen Filter.",
      primaryView: "quality",
      actions: ["Gebührenquote regelmäßig vergleichen", "Ohne-Ausfallschutz als Risiko beobachten", "Reports nach Monatsabschluss erzeugen"]
    };
  }
  return {
    headline: "Für diese Auswahl liegen keine Werte vor",
    detail: "Sobald ein Importdatenstand vorhanden ist, füllt das Cockpit KPIs, Rankings und Hinweise automatisch.",
    primaryView: "upload",
    actions: ["BFS-Abrechnungen importieren", "Mandantenmapping prüfen", "Fehlerbericht nach Upload kontrollieren"]
  };
}

function LocationBenchmarkCards({ snapshots, onNavigate, compact = false }: { snapshots: LocationSnapshot[]; onNavigate: (view: string) => void; compact?: boolean }) {
  const visible = [...snapshots].sort((a, b) => compareStandorteByContractStart(a.standort, b.standort));
  return (
    <div className={compact ? "location-card-grid compact" : "location-card-grid"}>
      {visible.map((entry) => (
        <article className={`location-benchmark-card ${entry.riskScore >= 35 ? "red" : entry.riskScore > 0 ? "amber" : "green"}`} key={entry.standort.id}>
          <div className="location-card-head">
            <div>
              <span>Seit {entry.standort.goLiveLabel} · {entry.status}</span>
              <strong>{entry.standort.name}</strong>
            </div>
            <StatusBadge status={entry.riskScore >= 35 ? "prüfen" : entry.riskScore > 0 ? "beobachten" : "OK"} />
          </div>
          <div className="location-metric-grid">
            <span><b>{money.format(entry.metrics.submitted)}</b> Umsatz</span>
            <span><b>{entry.metrics.feeRate.toFixed(2)} %</b> Gebühr</span>
            <span className="location-metric-with-info">
              <MetricInfo title={`Rückbelastungsquote ${entry.standort.name}`} text={locationChargebackRateInfo(entry)} />
              <b>{entry.chargebackRate.toFixed(2)} %</b> Rückbelastung
            </span>
            <span><b>{money.format(entry.metrics.noProtectionAmount)}</b> ohne Schutz</span>
            <span><b>{entry.noProtectionCaseRate.toFixed(2)} %</b> ohne Schutz Quote</span>
            <span><b>{entry.openCases}</b> Klärfälle</span>
            <span><b>{entry.oldest} Tage</b> ältester Fall</span>
          </div>
          <button className="secondary-button" onClick={() => onNavigate("claims")}>Details ansehen</button>
        </article>
      ))}
    </div>
  );
}

function locationChargebackRateInfo(entry: LocationSnapshot) {
  const chargebackAmount = entry.metrics.returnAmount + entry.metrics.cancellationAmount;
  return [
    `Herleitung Rückbelastungsquote: Rückgaben/Rückbelastungen plus Stornos geteilt durch eingereichten Umsatz.`,
    `${money.format(chargebackAmount)} / ${money.format(entry.metrics.submitted)} = ${entry.chargebackRate.toFixed(2)} %.`,
    `Rückgaben/Rückbelastungen: ${entry.metrics.returnCount} Fall/Fälle mit ${money.format(entry.metrics.returnAmount)}. Stornos: ${entry.metrics.cancellationCount} Fall/Fälle mit ${money.format(entry.metrics.cancellationAmount)}.`,
    `Zusatzinfo ohne Ausfallschutz: ${entry.noProtectionClaimCount} von ${entry.claimCount} erkannten Forderungspositionen laufen ohne Schutz, also ${entry.noProtectionCaseRate.toFixed(2)} %.`
  ].join(" ");
}

function BenchmarkView({ onNavigate, importRows }: { onNavigate: (view: string) => void; importRows: ImportPreviewRow[] }) {
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(periodOptions[0].id);
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0], [periodOptions, selectedPeriodId]);
  const scopedRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = standorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedPeriod, rowStandort) : false;
  }), [importRows, selectedPeriod]);
  const openCases = useMemo(() => casesFromImportRows(scopedRows).filter((fall) => !fall.status.includes("erledigt")), [scopedRows]);
  const orderedLocations = useMemo(() => orderedStandorte(), []);
  const snapshots = useMemo(() => buildLocationSnapshots(orderedLocations, selectedPeriod, scopedRows, openCases), [orderedLocations, selectedPeriod, scopedRows, openCases]);
  const highestVolume = useMemo(() => [...snapshots].sort((a, b) => b.metrics.submitted - a.metrics.submitted)[0], [snapshots]);
  const highestFees = useMemo(() => [...snapshots].sort((a, b) => b.metrics.feeRate - a.metrics.feeRate)[0], [snapshots]);
  const highestRisk = useMemo(() => [...snapshots].sort((a, b) => b.riskScore - a.riskScore || b.metrics.submitted - a.metrics.submitted)[0], [snapshots]);
  const benchmarkCharts = useMemo(() => buildGroupDashboardSeries(orderedLocations, selectedPeriod, scopedRows), [orderedLocations, selectedPeriod, scopedRows]);

  return (
    <div className="content-stack">
      <section className="panel period-filter">
        <label className="select-label">
          Zeitraum Standort-Benchmark
          <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>
            {periodOptions.map((period) => <option key={period.id} value={period.id}>{period.label}</option>)}
          </select>
        </label>
        <div>
          <strong>{selectedPeriod.label}</strong>
          <span>Gruppenvergleich aller Standorte nach Volumen, Gebührenquote, Rückbelastungen, Ohne-Ausfallschutz und offenen Fällen.</span>
        </div>
      </section>
      <section className="priority-grid">
        <PriorityCard label="Höchstes Volumen" value={highestVolume?.standort.name ?? "-"} hint={money.format(highestVolume?.metrics.submitted ?? 0)} period={selectedPeriod.label} tone="blue" />
        <PriorityCard label="Höchste Gebührenquote" value={highestFees?.standort.name ?? "-"} hint={`${(highestFees?.metrics.feeRate ?? 0).toFixed(2)} %`} period={selectedPeriod.label} tone={(highestFees?.metrics.feeRate ?? 0) ? "amber" : "green"} />
        <PriorityCard label="Auffälligster Standort" value={highestRisk?.standort.name ?? "-"} hint={`${highestRisk?.openCases ?? 0} offene Klärfälle`} period={selectedPeriod.label} tone={(highestRisk?.riskScore ?? 0) >= 35 ? "red" : "amber"} />
        <PriorityCard label="Standorte ohne Werte" value={String(snapshots.filter((entry) => !entry.rows).length)} hint="im gewählten Zeitraum" period={selectedPeriod.label} tone="blue" />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Standorte im Vergleich</h2>
            <p>Alle Standorte chronologisch nach Vertragsstart, mit Kennzahlen und Prüfhinweisen je Standort.</p>
          </div>
        </div>
        <LocationBenchmarkCards snapshots={snapshots} onNavigate={onNavigate} />
      </section>
      <section className="chart-grid">
        {benchmarkCharts.map((chart) => (
          <div className="panel mini-chart" key={chart.title}>
            <h2>{chart.title}</h2>
            <small className="period-note">Zeitraum: {selectedPeriod.label}</small>
            <InteractiveBars title={chart.title} values={chart.values} />
          </div>
        ))}
      </section>
    </div>
  );
}

function QualityView({ standort, cases: rows, importRows = [], onNavigate, manualCaseResolutions = [] }: { standort?: Standort; cases: BfsCase[]; importRows?: ImportPreviewRow[]; onNavigate: (view: string) => void; manualCaseResolutions?: ManualCaseResolution[] }) {
  const scopedRows = useMemo(() => standort ? importRows.filter((row) => row.location === standort.name) : importRows, [standort, importRows]);
  const summary = useMemo(() => summarizeImportRows(scopedRows), [scopedRows]);
  const metrics = useMemo(() => summary.rows ? metricsFromImportSummary(summary) : zeroMetrics(), [summary]);
  const riskRows = useMemo(() => riskClaimsFromImportRows(scopedRows), [scopedRows]);
  const recurring = useMemo(() => getRecurringRiskProfiles(standort?.id, scopedRows), [standort?.id, scopedRows]);
  const unresolved = useMemo(() => openUnresolvedMovementsFromImportRows(scopedRows, standort?.id), [scopedRows, standort?.id]);
  const stornoReview = useMemo(() => stornoReviewFromImportRows(scopedRows, standort?.id, manualCaseResolutions), [scopedRows, standort?.id, manualCaseResolutions]);
  const noProtectionShare = metrics.submitted ? (metrics.noProtectionAmount / metrics.submitted) * 100 : 0;
  const chargebackShare = metrics.submitted ? ((metrics.returnAmount + metrics.cancellationAmount) / metrics.submitted) * 100 : 0;
  const unresolvedAmount = unresolved.reduce((sum, item) => sum + item.amount, 0);
  const openStornoInfo = [
    `Diese Kachel betrachtet nur erkannte Storno-Zeilen: ${stornoReview.done} von ${stornoReview.total} Storno-Zeilen gelten als erledigt.`,
    "Als erledigt gelten Zahlung nach Storno, erkannte spätere Neueinreichung oder manuell als bezahlt markiert.",
    `Noch offene Storno-Zeilen aus dieser Storno-Grundmenge: ${stornoReview.open}.`
  ].join(" ");
  const operationalOpenInfo = [
    `Diese Kachel ist eine Arbeitsliste, keine zweite Storno-Gesamtzahl: ${unresolved.length} offene negative Bewegungen mit ${money.format(unresolvedAmount)} sind noch nicht erledigt.`,
    "Gezählt werden offene Rückgaben, Rückbelastungen, Stornos und vergleichbare BFS-Bewegungen.",
    `Darin können die ${stornoReview.open} offenen Storno-Zeilen enthalten sein. Bereits erledigte Stornos werden hier nicht mehr gezählt. Deshalb Storno erledigt und operativ offen nicht addieren.`
  ].join(" ");

  return (
    <div className="content-stack">
      <section className="priority-grid">
        <PriorityCard label="Ohne Ausfallschutz" value={money.format(metrics.noProtectionAmount)} hint={`${noProtectionShare.toFixed(2)} % vom Eingang`} tone={metrics.noProtectionAmount ? "amber" : "green"} />
        <PriorityCard label="Rückbelastung/Storno" value={money.format(metrics.returnAmount + metrics.cancellationAmount)} hint={`${chargebackShare.toFixed(2)} % vom Eingang`} tone={chargebackShare ? "red" : "green"} />
        <PriorityCard label="Storno-Zeilen erledigt" value={`${stornoReview.done}/${stornoReview.total}`} hint={`${stornoReview.open} Storno-Zeilen offen`} tone={stornoReview.open ? "amber" : "green"} info={openStornoInfo} />
        <PriorityCard label="Wiederholer" value={String(recurring.length)} hint="Patienten mehrfach ohne Schutz" tone={recurring.length ? "amber" : "green"} />
        <PriorityCard label="Offene Klärbewegungen" value={String(unresolved.length)} hint={money.format(unresolvedAmount)} tone={unresolved.length ? "red" : "green"} info={operationalOpenInfo} />
      </section>
      <section className="dashboard-grid">
        <article className="panel command-panel">
          <div>
            <span className="eyebrow">Forderungsqualität</span>
            <h2>Risiko und Klärfall sauber trennen</h2>
            <p>Ohne Ausfallschutz ist ein Risikobestand. Offene Klärbewegungen sind die noch nicht erledigten negativen BFS-Bewegungen.</p>
          </div>
          <div className="quick-actions">
            <button className="primary-button" onClick={() => onNavigate("cases")}><AlertCircle size={16} /> Klärfälle öffnen</button>
            <button className="secondary-button" onClick={() => onNavigate("matches")}><RefreshCw size={16} /> Matching prüfen</button>
          </div>
        </article>
        <article className="panel process-panel">
          <h2>Prüflogik</h2>
          <div className="stacked-checks">
            <span>1. Ohne Ausfallschutz beobachten, nicht als To-do zählen</span>
            <span>2. Offene Rückgabe/Storno-Bewegungen als Klärfall priorisieren</span>
            <span>3. Storno-Erledigung und offene Klärbewegungen nicht addieren</span>
          </div>
        </article>
      </section>
      <section className="chart-grid">
        <div className="panel mini-chart">
          <h2>Risikoarten</h2>
          <InteractiveBars title="Risikoarten" values={[
            { label: "ohne Schutz", value: metrics.noProtectionAmount },
            { label: "Rückgabe", value: metrics.returnAmount },
            { label: "Storno", value: metrics.cancellationAmount },
            { label: "EWMA", value: metrics.ewmaTotal }
          ]} />
        </div>
        <div className="panel mini-chart">
          <h2>Patientenqualität</h2>
          <InteractiveBars title="Patientenqualität" values={[
            { label: "Risiken", value: riskRows.length },
            { label: "Wiederholer", value: recurring.length },
            { label: "offen", value: unresolved.length },
            { label: "Storno offen", value: stornoReview.open }
          ]} />
        </div>
      </section>
      <StornoReviewSection review={stornoReview} />
      <RiskView standortId={standort?.id} importRows={scopedRows} />
    </div>
  );
}

function StornoReviewSection({ review }: { review: ReturnType<typeof stornoReviewFromImportRows> }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Quercheck</span>
          <h2>Stornierungen gesamt und je Standort</h2>
          <p>Gezählt werden erkannte Storno-Zeilen. Als erledigt gelten Stornos mit Zahlung nach Storno, direkter Erledigung oder erkannter späterer Neueinreichung.</p>
        </div>
      </div>
      <div className="priority-grid compact-priority">
        <PriorityCard label="Stornos gesamt" value={String(review.total)} hint={money.format(review.amount)} tone={review.total ? "amber" : "green"} />
        <PriorityCard label="Davon erledigt" value={String(review.done)} hint={`${review.doneRate.toFixed(0)} % Erledigungsquote`} tone={review.done ? "green" : "blue"} />
        <PriorityCard label="Noch offen" value={String(review.open)} hint="ohne erkennbare Erledigung" tone={review.open ? "red" : "green"} />
      </div>
      <div className="location-card-grid storno-review-grid">
        {review.byLocation.map((entry) => (
          <article className={`location-benchmark-card ${entry.open ? "amber" : entry.total ? "green" : "blue"}`} key={entry.standort.id}>
            <div className="location-card-head">
              <div>
                <span>Storno-Quercheck</span>
                <strong>{entry.standort.name}</strong>
              </div>
              <StatusBadge status={entry.open ? `${entry.open} offen` : entry.total ? "erledigt" : "keine Stornos"} />
            </div>
            <div className="location-metric-grid">
              <span><b>{entry.total}</b> Stornos gesamt</span>
              <span><b>{entry.done}</b> erledigt</span>
              <span><b>{entry.open}</b> offen</span>
              <span><b>{entry.doneRate.toFixed(0)} %</b> Quote</span>
            </div>
          </article>
        ))}
      </div>
      <div className="table-wrap compact-table">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Standort</th>
              <th>Patient</th>
              <th>Datum</th>
              <th>Re.-Nr.</th>
              <th>BFS-Nr.</th>
              <th>Betrag</th>
              <th>Erledigungsgrund</th>
            </tr>
          </thead>
          <tbody>
            {review.rows.slice(0, 120).map((row) => (
              <tr key={row.id}>
                <td><StatusBadge status={row.done ? "erledigt" : "offen"} /></td>
                <td>{row.locationName}</td>
                <td><strong>{row.patientName}</strong><span>{row.reason}</span></td>
                <td>{row.date}</td>
                <td>{row.invoiceNo}</td>
                <td>{row.bfsNo}</td>
                <td>{money.format(row.amount)}</td>
                <td>{row.doneReason}</td>
              </tr>
            ))}
            {!review.rows.length && (
              <tr>
                <td colSpan={8}>Keine Stornierungen im aktuellen Datenstand erkannt.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
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
        {orderedStandorte().map((standort) => (
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
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(periodOptions[0].id);
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0], [periodOptions, selectedPeriodId]);
  const locationImportRows = useMemo(() => importRows.filter((row) => row.location === standort.name && importRowInPeriod(row, selectedPeriod, standort)), [importRows, selectedPeriod, standort]);
  const importSummary = useMemo(() => summarizeImportRows(locationImportRows), [locationImportRows]);
  const selectedMetrics = useMemo(() => importSummary.rows ? metricsFromImportSummary(importSummary) : zeroMetrics(), [importSummary]);
  const selectedCashflow = useMemo(() => importSummary.rows ? cashflowFromImportSummary(importSummary) : zeroCashflow(), [importSummary]);
  const periodLabel = importRows.length ? "aktueller Import" : selectedPeriod.label;
  const openCases = useMemo(() => cases.filter((fall) => !fall.status.includes("erledigt")), [cases]);
  const locationKpiInfo = buildKpiDerivationInfo(selectedMetrics, periodLabel);
  const locationKpis: KpiCardTuple[] = [
    ["Umsatz eingereicht", money.format(selectedMetrics.submitted), periodLabel, locationKpiInfo.submitted],
    ["BFS-Gebühr netto", money.format(selectedMetrics.feeNet), periodLabel, locationKpiInfo.feeNet],
    ["MwSt auf Gebühren", money.format(selectedMetrics.feeVat), periodLabel, locationKpiInfo.tax],
    ["Auszahlungsbetrag", money.format(selectedMetrics.payout), periodLabel, locationKpiInfo.payout],
    ["Gesamtkosten BFS", money.format(selectedMetrics.fees), periodLabel, locationKpiInfo.fees],
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
          <span>{importRows.length && !importSummary.rows ? `Für ${standort.name} liegen im aktuellen Import keine Daten vor` : selectedCashflow.activeMonths ? `${selectedCashflow.activeMonths} aktive Monate ab ${selectedCashflow.startLabel}` : `${standort.name} ist in diesem Zeitraum noch nicht aktiv`}. Klärfälle ohne echtes Falldatum bleiben als aktueller Datenstand ausgewiesen.</span>
        </div>
      </section>
      <KpiGrid cards={locationKpis} />
        <AnswerCockpit scope="location" standort={standort} cases={cases} onNavigate={onNavigate} compact showReportAction={false} importRows={locationImportRows} periodMetrics={selectedMetrics} periodLabel={periodLabel} hasImportDataset={importRows.length > 0} />
      <section className="dashboard-grid">
        <article className="panel command-panel">
          <div>
            <span className="eyebrow">Standortfokus</span>
            <h2>{openCases.length} offene Fälle am Standort {standort.name}</h2>
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
  periodLabel,
  hasImportDataset: hasImportDatasetProp
}: {
  scope: "group" | "location";
  standort?: Standort;
  cases: BfsCase[];
  onNavigate: (view: string) => void;
  compact?: boolean;
  showReportAction?: boolean;
  importRows?: ImportPreviewRow[];
  periodMetrics?: BfsMetrics;
  periodLabel?: string;
  hasImportDataset?: boolean;
}) {
  const hasImportDataset = hasImportDatasetProp ?? importRows.length > 0;
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(periodOptions[0].id);
  const [selectedAnswerStandortId, setSelectedAnswerStandortId] = useState(() => scope === "group" ? "alle" : standort?.id ?? "alle");
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0], [periodOptions, selectedPeriodId]);
  const relevantStandorte = useMemo(() => scope === "group"
    ? selectedAnswerStandortId === "alle"
      ? standorte
      : standorte.filter((entry) => entry.id === selectedAnswerStandortId)
    : standort
      ? [standort]
      : standorte, [scope, selectedAnswerStandortId, standort]);
  const relevantStandortIds = useMemo(() => new Set(relevantStandorte.map((entry) => entry.id)), [relevantStandorte]);
  const scopedImportRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = relevantStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedPeriod, rowStandort) : false;
  }), [importRows, relevantStandorte, selectedPeriod]);
  const scopedRows = useMemo(() => importRows.length
    ? casesFromImportRows(scopedImportRows)
    : rows.filter((fall) => relevantStandortIds.has(fall.standortId)), [importRows.length, scopedImportRows, rows, relevantStandortIds]);
  const importSummary = useMemo(() => summarizeImportRows(scopedImportRows), [scopedImportRows]);
  const selectedMetrics = useMemo(() => importSummary.rows ? metricsFromImportSummary(importSummary) : periodMetrics ?? zeroMetrics(), [importSummary, periodMetrics]);
  const openCases = useMemo(() => scopedRows.filter((fall) => !fall.status.includes("erledigt")), [scopedRows]);
  const chargebacks = useMemo(() => openCases.filter((fall) => fall.reason.includes("Rückgabe") || fall.reason.includes("Rückbelastung")), [openCases]);
  const recurringRisks = useMemo(() => getRecurringRiskProfiles(
    relevantStandorte.length === 1 ? relevantStandorte[0].id : undefined,
    scopedImportRows,
    hasImportDataset
  ).filter((profile) => relevantStandorte.some((entry) => entry.name === profile.standortName)), [relevantStandorte, scopedImportRows, hasImportDataset]);
  const openAmount = openCases.reduce((sum, fall) => sum + fall.amount, 0);
  const submitted = selectedMetrics.submitted;
  const fees = selectedMetrics.fees;
  const feeNet = selectedMetrics.feeNet || fees;
  const feeVat = selectedMetrics.feeVat;
  const ewmaTotal = selectedMetrics.ewmaTotal;
  const noProtectionAmount = selectedMetrics.noProtectionAmount;
  const oldest = openCases.reduce((max, fall) => Math.max(max, fall.ageDays), 0);
  const selectedStandortLabel = scope === "group"
    ? selectedAnswerStandortId === "alle"
      ? "Alle Standorte"
      : relevantStandorte[0]?.name ?? "Alle Standorte"
    : standort?.name ?? "Standort";
  const title = scope === "group" ? "Antwortcockpit für Standort-Rückfragen" : `Antwortcockpit ${selectedStandortLabel}`;
  const resolvedPeriodLabel = periodLabel ?? selectedPeriod.label;

  useEffect(() => {
    if (scope === "location" && standort) setSelectedAnswerStandortId(standort.id);
  }, [scope, standort?.id]);

  return (
    <section className={compact ? "answer-cockpit compact" : "answer-cockpit"}>
      <div className="answer-header">
        <div>
          <span className="eyebrow">CFO-Schnellantworten</span>
          <h2>{title}</h2>
        </div>
        {showReportAction && <button className="secondary-button" onClick={() => onNavigate("reports")}><Printer size={16} /> Report senden</button>}
      </div>
      {!compact && (
        <section className="period-filter answer-filter-panel">
          <label className="select-label">
            Zeitraum
            <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
          </label>
          <label className="select-label">
            Standort
            <select value={selectedAnswerStandortId} onChange={(event) => setSelectedAnswerStandortId(event.target.value)} disabled={scope !== "group"}>
              {scope === "group" && <option value="alle">Alle Standorte</option>}
              {orderedStandorte().map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
          </label>
          <div>
            <strong>{selectedStandortLabel} · {selectedPeriod.label}</strong>
            <span>{scopedImportRows.length ? `${scopedImportRows.length} Importdatei(en) im Filter` : "Für diese Auswahl liegen keine importierten Werte vor."}</span>
          </div>
        </section>
      )}
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
          <small className="period-note">{periodLabelFromHint(resolvedPeriodLabel)}</small>
        </button>
        <button onClick={() => onNavigate("chargebacks")}>
          <span>Wie viele Rückläufer?</span>
          <strong>{chargebacks.length}</strong>
          <small>{money.format(chargebacks.reduce((sum, fall) => sum + fall.amount, 0))}</small>
          <small className="period-note">{periodLabelFromHint(resolvedPeriodLabel)}</small>
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
          <small className="period-note">{periodLabelFromHint(resolvedPeriodLabel)}</small>
        </button>
        <button onClick={() => onNavigate("claims")}>
          <span>BFS-Kosten?</span>
          <strong>{money.format(fees)}</strong>
          <small>Gebühr {money.format(feeNet)} · MwSt {money.format(feeVat)}{ewmaTotal ? ` · EWMA ${money.format(ewmaTotal)}` : ""}</small>
          <small className="period-note">{periodLabelFromHint(resolvedPeriodLabel)}</small>
        </button>
        <button onClick={() => onNavigate("worklist")}>
          <span>Ältester offener Fall?</span>
          <strong>{oldest} Tage</strong>
          <small>Priorität zuerst klären</small>
          <small className="period-note">{periodLabelFromHint(resolvedPeriodLabel)}</small>
        </button>
      </div>
    </section>
  );
}

function ClaimsFlowView({
  standort,
  cases: rows,
  importRows = [],
  manualCaseResolutions = [],
  onResolvePaid,
  onKeepOpen
}: {
  standort?: Standort;
  cases: BfsCase[];
  importRows?: ImportPreviewRow[];
  manualCaseResolutions?: ManualCaseResolution[];
  onResolvePaid?: (fall: BfsCase) => void | Promise<void>;
  onKeepOpen?: (fall: BfsCase) => void | Promise<void>;
}) {
  const rowsStandorte = useMemo(() => standort ? [standort] : standorte, [standort]);
  const rowsStandortIds = useMemo(() => rowsStandorte.map((entry) => entry.id), [rowsStandorte]);
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(periodOptions[0].id);
  const [standortPeriodIds, setStandortPeriodIds] = useState<Record<string, string>>({});
  const [recoveryPeriodId, setRecoveryPeriodId] = useState(periodOptions[0].id);
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0], [periodOptions, selectedPeriodId]);
  const recoveryPeriod = useMemo(() => periodOptions.find((period) => period.id === recoveryPeriodId) ?? selectedPeriod, [periodOptions, recoveryPeriodId, selectedPeriod]);
  const scopedImportRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = rowsStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedPeriod, rowStandort) : false;
  }), [importRows, rowsStandorte, selectedPeriod]);
  const recoveryScopedImportRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = rowsStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, recoveryPeriod, rowStandort) : false;
  }), [importRows, rowsStandorte, recoveryPeriod]);
  const allScopedLocationRows = useMemo(() => importRows.filter((row) => rowsStandorte.some((entry) => entry.name === row.location)), [importRows, rowsStandorte]);
  const importSummary = useMemo(() => summarizeImportRows(scopedImportRows), [scopedImportRows]);
  const selectedMetrics = useMemo(() => importSummary.rows ? metricsFromImportSummary(importSummary) : zeroMetrics(), [importSummary]);
  const recoverySummary = useMemo(() => summarizeImportRows(recoveryScopedImportRows), [recoveryScopedImportRows]);
  const recoveryMetrics = useMemo(() => recoverySummary.rows ? metricsFromImportSummary(recoverySummary) : zeroMetrics(), [recoverySummary]);
  const recentMonths = useMemo(() => buildRecentMonthlyTrend(rowsStandortIds, selectedPeriod, importRows), [rowsStandortIds, selectedPeriod, importRows]);
  const quarterRows = useMemo(() => buildQuarterComparison(rowsStandortIds, importRows), [rowsStandortIds, importRows]);
  const recoveryMatches = useMemo(() => resubmissionCandidatesFromImportRows(allScopedLocationRows)
    .filter((candidate) => {
      const candidateStandort = rowsStandorte.find((entry) => entry.name === candidate.locationName);
      return candidateStandort ? shortDateInPeriod(candidate.originalDate, recoveryPeriod, candidateStandort) : false;
    }), [allScopedLocationRows, rowsStandorte, recoveryPeriod]);
  const recoveredByResubmission = useMemo(() => uniqueRecoveryCandidates(recoveryMatches), [recoveryMatches]);
  const recoveredByResubmissionKeys = useMemo(() => new Set(recoveredByResubmission.map((candidate) => resubmissionResolutionKey(candidate))), [recoveredByResubmission]);
  const manualResolutionKeys = useMemo(() => new Set(manualCaseResolutions.map((resolution) => resolution.caseKey)), [manualCaseResolutions]);
  const manuallyPaidCases = useMemo(() => casesFromImportRows(recoveryScopedImportRows)
    .filter((fall) => manualResolutionKeys.has(caseResolutionKey(fall)) && !recoveredByResubmissionKeys.has(caseResolutionKey(fall))), [recoveryScopedImportRows, manualResolutionKeys, recoveredByResubmissionKeys]);
  const deductionAmount = selectedMetrics.returnAmount + selectedMetrics.cancellationAmount;
  const recoveryDeductionAmount = recoveryMetrics.returnAmount + recoveryMetrics.cancellationAmount;
  const recoveredByResubmissionAmount = recoveredByResubmission.reduce((sum, candidate) => sum + Math.min(candidate.originalAmount, candidate.newAmount), 0);
  const matchedNewSubmissionAmount = recoveredByResubmission.reduce((sum, candidate) => sum + candidate.newAmount, 0);
  const manuallyPaidAmount = manuallyPaidCases.reduce((sum, fall) => sum + fall.amount, 0);
  const recoveredAmount = Math.min(recoveryDeductionAmount, recoveredByResubmissionAmount + manuallyPaidAmount);
  const stillOpenAmount = Math.max(recoveryDeductionAmount - recoveredAmount, 0);
  const totalCostAndDeductions = selectedMetrics.fees + selectedMetrics.ewmaTotal + deductionAmount;
  const deductionBreakdown = useMemo(() => [
    { label: "Stornierungen", amount: selectedMetrics.cancellationAmount, detail: `${selectedMetrics.cancellationCount} Fälle`, kind: "Kontoauszug-Abzug" },
    { label: "Rückläufer/Rückgaben", amount: selectedMetrics.returnAmount, detail: `${selectedMetrics.returnCount} Fälle`, kind: "Kontoauszug-Abzug" },
    { label: "BFS-Gebühr netto", amount: selectedMetrics.feeNet, detail: "Factoring-/Bearbeitungsgebühr", kind: "BFS-Kosten" },
    { label: "MwSt auf BFS-Gebühr", amount: selectedMetrics.feeVat, detail: "Steuer auf BFS-Gebühr", kind: "Steuer" },
    { label: "EWMA / Adressprüfung netto", amount: selectedMetrics.ewmaNet, detail: "Einwohnermeldeamt-Abfragen", kind: "Adressprüfung" },
    { label: "MwSt auf EWMA", amount: selectedMetrics.ewmaVat, detail: "Steuer auf EWMA", kind: "Steuer" }
  ].sort((a, b) => b.amount - a.amount), [selectedMetrics]);
  const biggestDeduction = deductionBreakdown.find((entry) => entry.amount > 0);
  const recoveryDeductionRate = recoveryMetrics.submitted ? (recoveryDeductionAmount / recoveryMetrics.submitted) * 100 : 0;
  const cancellationRate = selectedMetrics.submitted ? (selectedMetrics.cancellationAmount / selectedMetrics.submitted) * 100 : 0;
  const notRecoveredRate = recoveryMetrics.submitted ? (stillOpenAmount / recoveryMetrics.submitted) * 100 : 0;
  const recoveryRate = recoveryDeductionAmount ? Math.min(100, (recoveredAmount / recoveryDeductionAmount) * 100) : 0;
  const reviewedCaseKeys = useMemo(() => new Set(manualCaseResolutions.map((resolution) => resolution.caseKey)), [manualCaseResolutions]);
  const openCashflowReviewCases = useMemo(() => rows.filter((fall) => !fall.status.includes("erledigt") && !reviewedCaseKeys.has(caseResolutionKey(fall))), [rows, reviewedCaseKeys]);

  return (
    <div className="content-stack">
      <section className="priority-grid">
        <PriorityCard label="Umsatz eingereicht" value={money.format(selectedMetrics.submitted)} hint="Summe aus Abrechnungen" period={selectedPeriod.label} tone="blue" />
        <PriorityCard label="BFS-Gebühr netto" value={money.format(selectedMetrics.feeNet)} hint="ohne MwSt" period={selectedPeriod.label} tone="amber" />
        <PriorityCard label="MwSt auf Gebühren" value={money.format(selectedMetrics.feeVat)} hint="separat erkannt" period={selectedPeriod.label} tone="amber" />
        <PriorityCard label="EWMA / Adressprüfung" value={money.format(selectedMetrics.ewmaTotal)} hint={`netto ${money.format(selectedMetrics.ewmaNet)} · MwSt ${money.format(selectedMetrics.ewmaVat)}`} period={selectedPeriod.label} tone={selectedMetrics.ewmaTotal ? "amber" : "green"} />
        <PriorityCard label="Auszahlungsbetrag" value={money.format(selectedMetrics.payout)} hint="nach BFS-Abzug" period={selectedPeriod.label} tone="green" />
        <PriorityCard label="Gesamtkosten BFS" value={money.format(selectedMetrics.fees)} hint={`${selectedMetrics.feeRate.toFixed(2)} % vom Eingang`} period={selectedPeriod.label} tone="amber" />
        <PriorityCard label="Gesamtabzug" value={money.format(totalCostAndDeductions)} hint="BFS-Gebühr, MwSt, EWMA und Storno/Rückgabe" period={selectedPeriod.label} tone={totalCostAndDeductions ? "red" : "green"} />
        <PriorityCard label="Rückläufer" value={String(selectedMetrics.returnCount)} hint={money.format(selectedMetrics.returnAmount)} period={selectedPeriod.label} tone={selectedMetrics.returnCount ? "red" : "green"} />
        <PriorityCard label="Stornierungen" value={String(selectedMetrics.cancellationCount)} hint={money.format(selectedMetrics.cancellationAmount)} period={selectedPeriod.label} tone={selectedMetrics.cancellationCount ? "amber" : "green"} />
        <PriorityCard label="Stornoquote" value={`${cancellationRate.toFixed(2)} %`} hint="Stornos vom eingereichten Umsatz" period={selectedPeriod.label} tone={cancellationRate ? "amber" : "green"} />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Abzugsanalyse nach Kostenart</h2>
            <p>Zeitraum: {selectedPeriod.label}. Sortiert danach, welche Abzugsart neben Stornos/Rückgaben am meisten Geld kostet.</p>
          </div>
        </div>
        <div className="priority-grid compact-priority">
          <PriorityCard label="Größter Abzug" value={biggestDeduction ? money.format(biggestDeduction.amount) : "0,00 €"} hint={biggestDeduction?.label ?? "keine Abzüge"} period={selectedPeriod.label} tone={biggestDeduction ? "red" : "green"} />
          <PriorityCard label="Kosten ohne Storno" value={money.format(selectedMetrics.fees + selectedMetrics.ewmaTotal)} hint="BFS-Gebühr, MwSt und EWMA" period={selectedPeriod.label} tone={selectedMetrics.fees + selectedMetrics.ewmaTotal ? "amber" : "green"} />
          <PriorityCard label="Storno/Rückgabe" value={money.format(deductionAmount)} hint="echte Kontoauszug-Abzüge" period={selectedPeriod.label} tone={deductionAmount ? "red" : "green"} />
        </div>
        <div className="table-wrap compact-table recovery-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Abzugsart</th>
                <th>Kategorie</th>
                <th>Betrag</th>
                <th>Anteil am Umsatz</th>
                <th>Hinweis</th>
              </tr>
            </thead>
            <tbody>
              {deductionBreakdown.map((entry) => (
                <tr key={entry.label}>
                  <td><strong>{entry.label}</strong></td>
                  <td>{entry.kind}</td>
                  <td>{money.format(entry.amount)}</td>
                  <td>{selectedMetrics.submitted ? `${((entry.amount / selectedMetrics.submitted) * 100).toFixed(2)} %` : "0,00 %"}</td>
                  <td>{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
            const cardPeriodId = standortPeriodIds[entry.id] ?? selectedPeriodId;
            const cardPeriod = periodOptions.find((period) => period.id === cardPeriodId) ?? selectedPeriod;
            const rowImportSummary = summarizeImportRows(importRows.filter((row) => row.location === entry.name && importRowInPeriod(row, cardPeriod, entry)));
            const periodCashflow = rowImportSummary.rows ? cashflowFromImportSummary(rowImportSummary) : zeroCashflow();
            const periodRiskAmount = periodCashflow.withoutProtection;
            const paidEstimate = periodCashflow.payout || Math.max(periodCashflow.submitted - periodCashflow.fees - openAmount, 0);
            return (
              <article className="cashflow-card" key={entry.id}>
                <div>
                  <strong>{entry.name}</strong>
                  <span>{entry.praxisname}</span>
                  <small>{periodCashflow.activeMonths ? `${periodCashflow.activeMonths} aktive Monate im Zeitraum ${cardPeriod.label}` : `noch nicht live im Zeitraum, Start ${entry.goLiveLabel}`}</small>
                  <label className="cashflow-card-period">
                    Zeitraum
                    <select
                      value={cardPeriodId}
                      onChange={(event) => setStandortPeriodIds((current) => ({ ...current, [entry.id]: event.target.value }))}
                    >
                      {periodOptions.map((period) => (
                        <option key={period.id} value={period.id}>{period.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <dl>
                  <div><dt>Umsatz eingereicht</dt><dd>{money.format(periodCashflow.submitted)}</dd></div>
                  <div><dt>Auszahlungsbetrag</dt><dd>{money.format(paidEstimate)}</dd></div>
                  <div><dt>BFS-Gebühr netto</dt><dd>{money.format(periodCashflow.feeNet)}</dd></div>
                  <div><dt>MwSt</dt><dd>{money.format(periodCashflow.feeVat)}</dd></div>
                  <div><dt>EWMA / Adressprüfung</dt><dd>{money.format(periodCashflow.ewmaTotal)}</dd></div>
                  <div><dt>Gesamtkosten BFS</dt><dd>{money.format(periodCashflow.fees)}</dd></div>
                  <div><dt>Gesamtabzug</dt><dd>{money.format(periodCashflow.fees + periodCashflow.ewmaTotal + periodCashflow.returnAmount + periodCashflow.cancellationAmount)}</dd></div>
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
            <p>Abgezogene Fälle werden gegen spätere Einreichungen oder manuell als bezahlt markierte Fälle geprüft.</p>
          </div>
        </div>
        <div className="period-filter">
          <label className="select-label">
            Zeitraum Wiedereinholung
            <select value={recoveryPeriodId} onChange={(event) => setRecoveryPeriodId(event.target.value)}>
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
          </label>
          <div>
            <strong>{recoveryPeriod.label}</strong>
            <span>{recoveryPeriod.detail}. Die Tabelle zeigt erledigte Rückgaben/Stornos im gewählten Zeitraum.</span>
          </div>
        </div>
        <div className="priority-grid compact-priority">
          <PriorityCard label="Abzug Storno/Rückgabe" value={money.format(recoveryDeductionAmount)} hint="Rückläufer, Rückgaben und Stornos" period={recoveryPeriod.label} tone={recoveryDeductionAmount ? "red" : "green"} />
          <PriorityCard label="Abzugsquote" value={`${recoveryDeductionRate.toFixed(2)} %`} hint="Abzug vom eingereichten Umsatz" period={recoveryPeriod.label} tone={recoveryDeductionRate ? "red" : "green"} />
          <PriorityCard label="Abzug erledigt" value={money.format(recoveredAmount)} hint={`${recoveredByResubmission.length} Matches · brutto neu ${money.format(matchedNewSubmissionAmount)}`} period={recoveryPeriod.label} tone={recoveredAmount ? "green" : "amber"} />
          <PriorityCard label="Offener Abzug" value={money.format(stillOpenAmount)} hint="ursprünglicher Abzug minus angerechnete Erledigung" period={recoveryPeriod.label} tone={stillOpenAmount ? "amber" : "green"} />
          <PriorityCard label="Offene Abzugsquote" value={`${notRecoveredRate.toFixed(2)} %`} hint="offener Abzug vom eingereichten Umsatz" period={recoveryPeriod.label} tone={notRecoveredRate ? "amber" : "green"} />
          <PriorityCard label="Erledigungsquote Abzug" value={`${recoveryRate.toFixed(0)} %`} hint="angerechnete Erledigung bezogen auf Abzug" period={recoveryPeriod.label} tone={recoveryRate >= 80 ? "green" : recoveryRate ? "amber" : "blue"} />
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
                <th>Erledigt durch</th>
                <th>Neue Einreichung brutto</th>
                <th>Auf Abzug angerechnet</th>
              </tr>
            </thead>
            <tbody>
              {recoveredByResubmission.slice(0, 50).map((candidate) => (
                <tr key={`${candidate.patientName}-${candidate.originalDate}-${candidate.newDate}-${candidate.newBfsNo}`}>
                  <td><strong>{candidate.patientName}</strong></td>
                  <td>{candidate.locationName}</td>
                  <td>{candidate.originalDate}</td>
                  <td>{candidate.reason}</td>
                  <td>{money.format(candidate.originalAmount)}</td>
                  <td>Neueinreichung {candidate.newDate}</td>
                  <td>{money.format(candidate.newAmount)}</td>
                  <td>{money.format(Math.min(candidate.originalAmount, candidate.newAmount))}</td>
                </tr>
              ))}
              {manuallyPaidCases.slice(0, Math.max(0, 50 - recoveredByResubmission.length)).map((fall) => {
                const StandortName = standorte.find((entry) => entry.id === fall.standortId)?.name ?? fall.standortId;
                return (
                  <tr key={`manual-${fall.resolutionKey ?? caseResolutionKey(fall)}`}>
                    <td><strong>{fall.patientName}</strong></td>
                    <td>{StandortName}</td>
                    <td>{fall.lastComment}</td>
                    <td>{fall.reason}</td>
                    <td>{money.format(fall.amount)}</td>
                    <td>manuell bezahlt markiert</td>
                    <td>{money.format(fall.amount)}</td>
                    <td>{money.format(fall.amount)}</td>
                  </tr>
                );
              })}
              {!recoveredByResubmission.length && !manuallyPaidCases.length && (
                <tr>
                  <td colSpan={8}>Noch keine späteren Neueinreichungen oder manuell bezahlten Fälle im Zeitraum gefunden.</td>
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
      <CasesView
        cases={openCashflowReviewCases}
        title="Offene Positionen zu diesem Geldfluss"
        description="Prüfliste für offene Positionen. Als bezahlt markieren blendet den Fall aus den Klärfällen aus; weiterhin offen lässt ihn in der operativen Fallarbeit."
        onResolvePaid={onResolvePaid}
        onKeepOpen={onKeepOpen}
        enableFilters
        tableScrollable
      />
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
      <CaseWorkflowBoard cases={sorted} />
      <CasesView cases={sorted} compact />
    </div>
  );
}

function CaseWorkflowBoard({ cases: rows }: { cases: BfsCase[] }) {
  const columns = [
    {
      title: "Offen",
      rows: rows.filter((fall) => fall.status === "offen" || fall.status === "historisches_match_offen")
    },
    {
      title: "In Prüfung",
      rows: rows.filter((fall) => fall.ageDays >= 8 && fall.ageDays <= 30)
    },
    {
      title: "Wiedervorlage",
      rows: rows.filter((fall) => fall.status === "wiedervorlage" || fall.dueDate !== "-")
    },
    {
      title: "Kein Match",
      rows: rows.filter((fall) => fall.status === "historisches_match_offen")
    }
  ];

  return (
    <section className="case-board" aria-label="Klärfälle Arbeitsboard">
      {columns.map((column) => (
        <article className="panel case-board-column" key={column.title}>
          <div>
            <span>{column.title}</span>
            <strong>{column.rows.length}</strong>
          </div>
          {column.rows.slice(0, 4).map((fall) => (
            <button key={`${column.title}-${fall.id}`} className="case-board-item" type="button">
              <strong>{fall.patientName}</strong>
              <span>{fall.locationName} · {money.format(fall.amount)}</span>
              <small>{fall.reason}</small>
            </button>
          ))}
          {!column.rows.length && <p className="empty-state">Keine Fälle.</p>}
        </article>
      ))}
    </section>
  );
}

function PriorityCard({ label, value, hint, tone, info, period }: { label: string; value: string; hint: string; tone: string; info?: string; period?: string }) {
  const displayHint = normalizeProductCopy(hint);
  const periodText = period ? periodLabelFromHint(period) : periodLabelFromHint(displayHint);

  return (
    <article className={`priority-card ${tone}`}>
      <MetricInfo title={label} text={normalizeProductCopy(info ?? metricExplanation(label, value, displayHint))} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{displayHint}</small>
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

const todayReference = new Date();

function buildCashflowPeriods(): PeriodOption[] {
  const earliestGoLive = new Date(`${standorte.map((entry) => entry.goLiveDate).sort()[0]}T00:00:00`);
  const earliestStartYear = earliestGoLive.getFullYear();
  const currentYear = todayReference.getFullYear();
  const currentQuarter = Math.floor(todayReference.getMonth() / 3) + 1;
  const periods: PeriodOption[] = [
    {
      id: "since-start",
      label: "Seit Standortstart",
      detail: "je Standort ab eigenem MVZ-Start"
    }
  ];

  for (let year = currentYear; year >= earliestStartYear; year -= 1) {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = year === currentYear ? todayReference : new Date(year, 11, 31);
    if (yearEnd >= earliestGoLive) {
      periods.push({
        id: `year-${year}`,
        label: `${year} gesamt`,
        detail: year === currentYear ? "bis zum aktuellen Monat" : "Kalenderjahr",
        start: yearStart,
        end: yearEnd
      });
    }

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
        end: quarterEnd > todayReference ? todayReference : quarterEnd
      });
    }
  }

  return periods;
}

function zeroMetrics() {
  return {
    submitted: 0,
    payout: 0,
    fees: 0,
    feeNet: 0,
    feeVat: 0,
    ewmaNet: 0,
    ewmaVat: 0,
    ewmaTotal: 0,
    totalCost: 0,
    feeRate: 0,
    returnCount: 0,
    returnAmount: 0,
    cancellationCount: 0,
    cancellationAmount: 0,
    noProtectionCount: 0,
    noProtectionAmount: 0
  };
}

type BfsMetrics = ReturnType<typeof zeroMetrics>;

function zeroCashflow() {
  return {
    ...zeroMetrics(),
    activeMonths: 0,
    startLabel: "kein Import",
    withoutProtection: 0
  };
}

function metricsFromImportRowsForStandort(importRows: ImportPreviewRow[], standort: Standort, period: PeriodOption) {
  const summary = summarizeImportRows(importRows.filter((row) => row.location === standort.name && importRowInPeriod(row, period, standort)));
  return summary.rows ? metricsFromImportSummary(summary) : zeroMetrics();
}

type ImportSummary = ReturnType<typeof summarizeImportRows>;
type ImportPersistenceSummary = {
  batchId: string;
  imported: number;
  duplicates: number;
  failed: number;
  errors?: Array<{ file: string; message: string }>;
};

const uploadChunkMaxFiles = 6;
const uploadChunkMaxBytes = 3.5 * 1024 * 1024;

function summarizeImportRows(rows: ImportPreviewRow[]) {
  const relevantMovements = rows.flatMap((row) => row.parsedMovements ?? [])
    .filter((movement) => movement.reasonCategory && !["regulierung", "abrechnungsumsatz"].includes(movement.reasonCategory));
  const returnMovements = relevantMovements.filter((movement) => movement.type.includes("rueckgabe") || movement.type.includes("rueckbelastung"));
  const cancellationMovements = relevantMovements.filter((movement) => movement.type.includes("storno"));
  const submitted = rows.reduce((sum, row) => sum + rowSubmittedAmount(row), 0);
  const fees = rows.reduce((sum, row) => sum + rowFeeAmount(row), 0);
  const feeNet = rows.reduce((sum, row) => sum + rowFeeNetAmount(row), 0);
  const feeVat = rows.reduce((sum, row) => sum + rowFeeVatAmount(row), 0);
  const ewmaNet = rows.reduce((sum, row) => sum + rowEwmaNetAmount(row), 0);
  const ewmaVat = rows.reduce((sum, row) => sum + rowEwmaVatAmount(row), 0);
  const ewmaTotal = rows.reduce((sum, row) => sum + rowEwmaAmount(row), 0);
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
    ewmaNet,
    ewmaVat,
    ewmaTotal,
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

function rowEwmaAmount(row: ImportPreviewRow) {
  if (row.ewmaTotal && row.ewmaTotal > 0) return row.ewmaTotal;
  const fromParts = rowEwmaNetAmount(row) + rowEwmaVatAmount(row);
  return Math.round(fromParts * 100) / 100;
}

function rowEwmaNetAmount(row: ImportPreviewRow) {
  if (row.ewmaNet && row.ewmaNet > 0) return row.ewmaNet;
  return row.parsedMovements
    ?.filter((movement) => movement.type === "ewma_anfrage")
    .reduce((sum, movement) => sum + Math.abs(movement.amount ?? 0), 0) ?? 0;
}

function rowEwmaVatAmount(row: ImportPreviewRow) {
  if (row.ewmaVat && row.ewmaVat > 0) return row.ewmaVat;
  return row.parsedMovements
    ?.filter((movement) => movement.type === "ewma_mwst")
    .reduce((sum, movement) => sum + Math.abs(movement.amount ?? 0), 0) ?? 0;
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
    ewmaNet: summary.ewmaNet,
    ewmaVat: summary.ewmaVat,
    ewmaTotal: summary.ewmaTotal,
    totalCost: summary.fees + summary.ewmaTotal,
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
          resolutionKey: caseResolutionKeyFromParts({
            standortId: standort.id,
            patientName: movement.patientName ?? "Patient noch nicht gematcht",
            invoiceNo: movement.invoiceNo ?? "-",
            bfsNo: movement.bfsNo ?? "-",
            amount,
            reason: movement.reason ?? reasonLabel(movement.reasonCategory)
          }),
          standortId: standort.id,
          locationName: standort.name,
          patientName: movement.patientName ?? "Patient noch nicht gematcht",
          invoiceNo: movement.invoiceNo ?? "-",
          bfsNo: movement.bfsNo ?? "-",
          amount,
          reason: movement.reason ?? reasonLabel(movement.reasonCategory),
          sourceDate: movement.date,
          ageDays,
          traffic: ageDays > 30 ? "red" : ageDays >= 15 ? "orange" : ageDays >= 8 ? "yellow" : "green",
          status: movement.matchStatus === "unmatched" ? "historisches_match_offen" : "offen",
          dueDate: "-",
          lastComment: movement.matchedFile ? `Gematcht mit ${movement.matchedFile}` : "Aus aktuellem Import erzeugt"
        } satisfies BfsCase;
      });
  });
}

function caseResolutionKey(fall: BfsCase) {
  return fall.resolutionKey ?? caseResolutionKeyFromParts(fall);
}

function countOpenCasesByStandort(rows: ImportPreviewRow[]) {
  const counts = new Map<string, number>();
  casesFromImportRows(rows)
    .filter((fall) => !fall.status.includes("erledigt"))
    .forEach((fall) => counts.set(fall.standortId, (counts.get(fall.standortId) ?? 0) + 1));
  return counts;
}

function riskClaimsFromImportRows(rows: ImportPreviewRow[]): RiskClaim[] {
  const activityByClaim = buildRiskClaimActivityLookup(rows);
  return rows.flatMap((row) => {
    const standort = standorte.find((entry) => entry.name === row.location);
    if (!standort) return [];
    return (row.parsedClaims ?? [])
      .filter((claim) => claim.protectionStatus === "ohne_ausfallschutz")
      .map((claim, index) => {
        const activity = activityForRiskClaim(activityByClaim, standort.id, claim.patientName, claim.invoiceNo, claim.bfsNo);
        return {
        id: `import-risk-${row.fileHash ?? row.file}-${claim.bfsNo}-${index}`,
        standortId: standort.id,
        patientName: claim.patientName,
        invoiceNo: claim.invoiceNo,
        bfsNo: claim.bfsNo,
        amount: claim.amount,
        statementNo: row.statementNo,
        date: row.date,
        marker: claim.marker ?? "*KA",
        markerReason: claim.markerReason ?? protectionMarkerLabel(claim.marker),
        markerCategory: claim.markerCategory ?? protectionMarkerCategory(claim.marker),
        eventCount: activity.eventCount,
        eventAmount: activity.eventAmount,
        eventLabels: activity.eventLabels,
        assessment: activity.assessment,
        assessmentLabel: activity.assessmentLabel
        };
      });
  });
}

function buildRiskClaimActivityLookup(rows: ImportPreviewRow[]) {
  const lookup = new Map<string, {
    negativeCount: number;
    negativeAmount: number;
    resolvedCount: number;
    labels: Set<string>;
  }>();

  rows.forEach((row) => {
    const standort = standorte.find((entry) => entry.name === row.location);
    if (!standort) return;
    (row.parsedMovements ?? [])
      .filter((movement) => movement.reasonCategory && !["regulierung", "abrechnungsumsatz"].includes(movement.reasonCategory))
      .forEach((movement) => {
        const keys = riskActivityKeys(standort.id, movement.patientName ?? "", movement.invoiceNo, movement.bfsNo);
        if (!keys.length) return;
        const isResolved = isResolvedMovement(movement);
        keys.forEach((key) => {
          const current = lookup.get(key) ?? { negativeCount: 0, negativeAmount: 0, resolvedCount: 0, labels: new Set<string>() };
          if (isResolved) {
            current.resolvedCount += 1;
          } else {
            current.negativeCount += 1;
            current.negativeAmount += Math.abs(movement.amount ?? 0);
          }
          current.labels.add(movement.reason ?? reasonLabel(movement.reasonCategory));
          lookup.set(key, current);
        });
      });
  });

  return lookup;
}

function activityForRiskClaim(
  lookup: ReturnType<typeof buildRiskClaimActivityLookup>,
  standortId: string,
  patientName: string,
  invoiceNo?: string,
  bfsNo?: string
) {
  const keys = riskActivityKeys(standortId, patientName, invoiceNo, bfsNo);
  const combined = keys
    .map((key) => lookup.get(key))
    .find((entry) => entry && (entry.negativeCount > 0 || entry.resolvedCount > 0))
    ?? { negativeCount: 0, negativeAmount: 0, resolvedCount: 0, labels: new Set<string>() };

  const eventLabels = [...combined.labels].slice(0, 3);
  if (combined.negativeCount > 0) {
    return {
      eventCount: combined.negativeCount,
      eventAmount: Math.round(combined.negativeAmount * 100) / 100,
      eventLabels,
      assessment: "auffaellig" as const,
      assessmentLabel: `${combined.negativeCount} Storno/Rückgabe erkannt`
    };
  }
  if (combined.resolvedCount > 0) {
    return {
      eventCount: 0,
      eventAmount: 0,
      eventLabels,
      assessment: "erledigt" as const,
      assessmentLabel: "Zahlung/Erledigung erkannt"
    };
  }
  return {
    eventCount: 0,
    eventAmount: 0,
    eventLabels: [],
    assessment: "unauffaellig" as const,
    assessmentLabel: "bisher keine Auffälligkeit"
  };
}

function riskActivityKeys(standortId: string, patientName: string, invoiceNo?: string, bfsNo?: string) {
  const patientKey = normalizePatientName(patientName);
  if (!patientKey) return [];
  return [
    invoiceNo ? `${standortId}:invoice:${invoiceNo}` : "",
    bfsNo ? `${standortId}:bfs:${bfsNo}` : "",
    `${standortId}:patient:${patientKey}`
  ].filter(Boolean);
}

function isResolvedMovement(movement: NonNullable<ImportPreviewRow["parsedMovements"]>[number]) {
  const reasonText = `${movement.reason ?? ""} ${movement.rawText ?? ""}`.toLowerCase();
  return movement.reasonCategory === "zahlung_nach_storno"
    || movement.reasonCategory === "neue_rechnung"
    || reasonText.includes("zahlung nach storno")
    || reasonText.includes("direktzahlung");
}

function protectionMarkerLabel(marker?: string) {
  const labels: Record<string, string> = {
    "*NB": "Negative Bonität",
    "*RS": "Risikoschuldner",
    "*AA": "Auslandsadresse",
    "*PM": "Schuldner minderjährig",
    "*FÜ": "Fristüberschreitung",
    "*KA": "Kein Ausfallschutz",
    "RS/A": "Risikoschuldner mit Ausfallschutz"
  };
  return labels[marker ?? ""] ?? (marker ? `Unbekannter Marker ${marker}` : "Kein Ausfallschutz");
}

function protectionMarkerCategory(marker?: string) {
  const categories: Record<string, string> = {
    "*NB": "negative_bonitaet",
    "*RS": "risikoschuldner",
    "*AA": "auslandsadresse",
    "*PM": "minderjaehrig",
    "*FÜ": "fristueberschreitung",
    "*KA": "kein_ausfallschutz",
    "RS/A": "risikoschuldner_mit_ausfallschutz"
  };
  return categories[marker ?? ""] ?? "sonstiger_marker";
}

function aggregateNoProtectionReasons(rows: RiskClaim[]) {
  const groups = new Map<string, { label: string; category: string; count: number; amount: number; markers: Set<string> }>();
  rows.forEach((claim) => {
    const category = claim.markerCategory ?? protectionMarkerCategory(claim.marker);
    const current = groups.get(category) ?? {
      label: claim.markerReason ?? protectionMarkerLabel(claim.marker),
      category,
      count: 0,
      amount: 0,
      markers: new Set<string>()
    };
    current.count += 1;
    current.amount += claim.amount;
    current.markers.add(claim.marker);
    groups.set(category, current);
  });

  return [...groups.values()]
    .map((group) => ({ ...group, amount: Math.round(group.amount * 100) / 100, markers: [...group.markers].join(", ") }))
    .sort((a, b) => b.amount - a.amount || b.count - a.count);
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

type ResubmissionCandidate = ReturnType<typeof resubmissionCandidatesFromImportRows>[number];

function uniqueRecoveryCandidates(candidates: ResubmissionCandidate[]) {
  const byKey = new Map<string, ResubmissionCandidate>();
  candidates.forEach((candidate) => {
    const key = resubmissionResolutionKey(candidate);
    const current = byKey.get(key);
    if (!current || candidate.newAmount > current.newAmount) {
      byKey.set(key, candidate);
    }
  });
  return [...byKey.values()];
}

function resubmissionResolutionKey(candidate: ResubmissionCandidate) {
  const standort = standorte.find((entry) => entry.name === candidate.locationName);
  return caseResolutionKeyFromParts({
    standortId: standort?.id ?? candidate.locationName,
    patientName: candidate.patientName,
    invoiceNo: candidate.invoiceNo,
    bfsNo: candidate.bfsNo,
    amount: candidate.originalAmount,
    reason: candidate.reason
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
      current.examples.add(row.statementNo);
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
        current.examples.add(movement.matchedStatementNo ?? row.statementNo);
        groups.set(key, current);
      });
  });

  return [...groups.values()].map(classifyPatientProfile).sort((a, b) => gradeRank(b.grade) - gradeRank(a.grade) || b.riskAmount - a.riskAmount || b.badEventCount - a.badEventCount);
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
  const grade = profile.badEventCount >= 5 || (profile.badEventCount >= 2 && riskAmount >= 2500)
    ? "D"
    : profile.badEventCount >= 2 || profile.badAmount >= 500
      ? "C"
      : profile.badEventCount === 1 || profile.noProtectionCount > 0
        ? "B"
        : "A";
  const recommendation = grade === "D"
    ? "BFS-Sperrhinweis / Vorkasseprozess prüfen"
    : grade === "C"
      ? "Standort aktiv informieren und Behandlung/Factoring prüfen"
      : grade === "B" && profile.badEventCount > 0
        ? "Beobachten und bei Neueinreichung prüfen"
        : grade === "B"
          ? "Ohne Schutz, bisher unauffällig"
        : "Unauffällig";

  return {
    ...profile,
    grade,
    badRate,
    riskAmount,
    examples: [...profile.examples].filter(Boolean).slice(0, 3),
    recommendation
  };
}

function gradeRank(grade: string) {
  return { A: 1, B: 2, C: 3, D: 4 }[grade as "A" | "B" | "C" | "D"] ?? 0;
}

function patientClassInfo(grade: string, count: number, total: number) {
  const share = total ? Math.round((count / total) * 100) : 0;
  const base = `Aktueller Wert: ${share} % beziehungsweise ${count} von ${total} Patient(en) im aktuellen Standort- und Zeitraumfilter. Datenquelle: importierte BFS-Forderungen und Kontoauszug-Bewegungen. Berücksichtigt werden Einreichungen, Stornos/Rückgaben/Rückbelastungen, ohne-Ausfallschutz-Marker und Wiederholungen je Patient.`;
  const rules: Record<string, string> = {
    A: "Klasse A bedeutet: keine Storno-, Rückgabe- oder Rückbelastungsereignisse und keine relevante ohne-Ausfallschutz-Auffälligkeit. Diese Patienten gelten im aktuellen Datenstand als unauffällig.",
    B: "Klasse B bedeutet: Beobachtung. Dazu zählen Patienten mit genau einem negativen Ereignis oder Patienten ohne Ausfallschutz, bei denen bisher keine Storno-/Rückgabehistorie erkannt wurde. Ohne Ausfallschutz allein ist hier noch kein harter Klärfall.",
    C: "Klasse C bedeutet: erhöhtes Risiko. Dazu zählen Patienten mit mindestens zwei Storno-/Rückgabe-/Rückbelastungsereignissen oder mindestens 500 Euro erkannter negativer Ereignissumme. Hier sollte der Standort aktiv prüfen.",
    D: "Klasse D bedeutet: stark auffällig. Dazu zählen Patienten mit mindestens fünf negativen Ereignissen oder mindestens zwei negativen Ereignissen bei gleichzeitig mindestens 2.500 Euro Risikosumme. Empfehlung: Sperrhinweis, Vorkasse- oder Praxisprozess prüfen."
  };
  return `${rules[grade] ?? "Patientenklasse aus der bestehenden Klassifizierungslogik."} ${base}`;
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

function stornoReviewFromImportRows(rows: ImportPreviewRow[], standortId?: string, manualCaseResolutions: ManualCaseResolution[] = []) {
  const candidates = resubmissionCandidatesFromImportRows(rows);
  const candidateKeys = new Set(candidates.map((candidate) => `${normalizePatientName(candidate.patientName)}:${candidate.originalDate}:${candidate.bfsNo}`));
  const manualKeys = new Set(manualCaseResolutions.map((resolution) => resolution.caseKey));
  const stornoRows = rows.flatMap((row) => {
    const standort = standorte.find((entry) => entry.name === row.location);
    if (!standort || (standortId && standort.id !== standortId)) return [];

    return (row.parsedMovements ?? [])
      .filter((movement) => isStornoMovement(movement))
      .map((movement, index) => {
        const patientName = movement.patientName ?? "Patient noch nicht gematcht";
        const key = `${normalizePatientName(patientName)}:${row.date}:${movement.bfsNo ?? "-"}`;
        const reasonText = movement.reason?.toLowerCase() ?? "";
        const reason = movement.reason ?? reasonLabel(movement.reasonCategory);
        const manualKey = caseResolutionKeyFromParts({
          standortId: standort.id,
          patientName,
          invoiceNo: movement.invoiceNo ?? "-",
          bfsNo: movement.bfsNo ?? "-",
          amount: Math.abs(movement.amount ?? 0),
          reason
        });
        const doneByPayment = movement.reasonCategory === "zahlung_nach_storno" || reasonText.includes("zahlung nach storno") || reasonText.includes("direktzahlung");
        const doneByResubmission = candidateKeys.has(key) || movement.reasonCategory === "neue_rechnung";
        const doneByManualResolution = manualKeys.has(manualKey);
        const done = doneByPayment || doneByResubmission || doneByManualResolution;
        return {
          id: `${row.fileHash ?? row.file}-${movement.bfsNo ?? index}-${movement.invoiceNo ?? index}`,
          standortId: standort.id,
          locationName: standort.name,
          patientName,
          date: movement.date ?? row.date,
          invoiceNo: movement.invoiceNo ?? "-",
          bfsNo: movement.bfsNo ?? "-",
          amount: Math.abs(movement.amount ?? 0),
          reason,
          done,
          doneReason: doneByPayment ? "Zahlung nach Storno" : doneByResubmission ? "Neueinreichung erkannt" : doneByManualResolution ? "Manuell als bezahlt markiert" : "offen"
        };
      });
  });
  const byLocation = orderedStandorte()
    .filter((standort) => !standortId || standort.id === standortId)
    .map((standort) => {
      const locationRows = stornoRows.filter((row) => row.standortId === standort.id);
      const done = locationRows.filter((row) => row.done).length;
      const total = locationRows.length;
      return {
        standort,
        total,
        done,
        open: total - done,
        amount: locationRows.reduce((sum, row) => sum + row.amount, 0),
        doneRate: total ? (done / total) * 100 : 0,
        rows: locationRows
      };
    });
  const done = stornoRows.filter((row) => row.done).length;
  const total = stornoRows.length;

  return {
    total,
    done,
    open: total - done,
    amount: stornoRows.reduce((sum, row) => sum + row.amount, 0),
    doneRate: total ? (done / total) * 100 : 0,
    byLocation,
    rows: stornoRows.sort((a, b) => Number(a.done) - Number(b.done) || b.amount - a.amount)
  };
}

function isStornoMovement(movement: NonNullable<ImportPreviewRow["parsedMovements"]>[number]) {
  const type = movement.type.toLowerCase();
  const reason = `${movement.reason ?? ""} ${movement.rawText ?? ""}`.toLowerCase();
  return type.includes("storno") || reason.includes("storno");
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
  })).sort((a, b) => b.month.localeCompare(a.month) || compareLocationNamesByContractStart(a.locationName, b.locationName));
}

function compareLocationNamesByContractStart(a: string, b: string) {
  const StandortA = standorte.find((standort) => standort.name === a);
  const StandortB = standorte.find((standort) => standort.name === b);
  if (StandortA && StandortB) return compareStandorteByContractStart(StandortA, StandortB);
  if (StandortA) return -1;
  if (StandortB) return 1;
  return a.localeCompare(b, "de");
}

function ageFromShortDate(value: string) {
  const [day, month, year] = value.split(".").map(Number);
  const fullYear = year < 100 ? 2000 + year : year;
  const date = new Date(fullYear, month - 1, day);
  return Math.max(0, Math.floor((todayReference.getTime() - date.getTime()) / 86400000));
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
  if (!months[0]) return "Importlauf";
  return formatMetricMonth(months[0]);
}

function latestImportDateForStandort(rows: ImportPreviewRow[]) {
  const dates = rows
    .map((row) => importDateKey(row.date))
    .filter(Boolean)
    .sort();
  const latest = dates.at(-1);
  if (!latest) return "-";
  return `${latest.slice(6, 8)}.${latest.slice(4, 6)}.${latest.slice(0, 4)}`;
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

function standortActiveInPeriod(standort: Standort, period: PeriodOption) {
  const goLive = new Date(`${standort.goLiveDate}T00:00:00`);
  const periodEnd = period.end ? minDate(period.end, todayReference) : todayReference;
  return goLive <= periodEnd;
}

function periodStatusLabel(standort: Standort, period: PeriodOption) {
  if (!standortActiveInPeriod(standort, period)) return `ab ${standort.goLiveLabel}`;
  if (!period.start && !period.end) return liveStatusLabel(standort, todayReference);
  const goLive = new Date(`${standort.goLiveDate}T00:00:00`);
  const periodStart = period.start ? maxDate(period.start, goLive) : goLive;
  return `aktiv ab ${formatMonth(periodStart)}`;
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

function buildRecentMonthlyTrend(standortIds: string[], period?: PeriodOption, importRows: ImportPreviewRow[] = []) {
  const rows = importRows.filter((row) => {
    const standort = standorte.find((entry) => entry.name === row.location);
    return standort && standortIds.includes(standort.id) && (!period || importRowInPeriod(row, period, standort));
  });
  return groupImportRowsByMonth(rows)
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, period?.id === "since-start" ? 12 : 24)
    .sort((a, b) => a.month.localeCompare(b.month));
}

function buildQuarterComparison(standortIds: string[], importRows: ImportPreviewRow[] = []) {
  const quarters = groupImportRowsByQuarter(importRows.filter((row) => {
    const standort = standorte.find((entry) => entry.name === row.location);
    return standort && standortIds.includes(standort.id);
  }))
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .slice(0, 10);

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

function groupImportRowsByMonth(rows: ImportPreviewRow[]) {
  const grouped = new Map<string, ImportPreviewRow[]>();
  rows.forEach((row) => {
    const month = importRowMonth(row);
    if (month) grouped.set(month, [...(grouped.get(month) ?? []), row]);
  });
  return [...grouped.entries()].map(([month, entries]) => ({ month, ...metricsFromImportSummary(summarizeImportRows(entries)) }));
}

function groupImportRowsByQuarter(rows: ImportPreviewRow[]) {
  const grouped = new Map<string, ImportPreviewRow[]>();
  rows.forEach((row) => {
    const monthKey = importRowMonth(row);
    if (!monthKey) return;
    const [year, month] = monthKey.split("-").map(Number);
    const quarter = Math.floor((month - 1) / 3) + 1;
    const key = `${year}-Q${quarter}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  });
  return [...grouped.entries()].map(([key, entries]) => {
    const [year, quarter] = key.split("-Q");
    return {
      label: `Q${quarter} ${year}`,
      sortKey: `${year}-${quarter}`,
      ...metricsFromImportSummary(summarizeImportRows(entries))
    };
  });
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

type KpiCardTuple = [label: string, value: string, hint: string, info?: string];

function KpiGrid({ standort, cards: customCards, importRows = [] }: { standort?: Standort; cards?: KpiCardTuple[]; importRows?: ImportPreviewRow[] }) {
  const cards = useMemo(() => {
    if (customCards) return customCards;
    const importSummary = summarizeImportRows(standort ? importRows.filter((row) => row.location === standort.name) : importRows);
    const defaultMetrics = importSummary.rows ? metricsFromImportSummary(importSummary) : zeroMetrics();
    const defaultInfo = buildKpiDerivationInfo(defaultMetrics, importSummary.rows ? "aktueller Import" : "kein Datenstand");
    return standort
      ? [
          ["Umsatz eingereicht", money.format(defaultMetrics.submitted), importSummary.rows ? "aus aktuellem Import" : "kein Datenstand", defaultInfo.submitted],
          ["Gesamtkosten BFS", money.format(defaultMetrics.fees), importSummary.rows ? `Gebühr ${money.format(importSummary.feeNet)} · MwSt ${money.format(importSummary.feeVat)}` : "kein Datenstand", defaultInfo.fees],
          ["Offene BFS-Klärfälle", "0", "kein Datenstand"],
          ["Laufend ohne Ausfallschutz", money.format(defaultMetrics.noProtectionAmount), importSummary.rows ? "aus aktuellem Import" : "kein Datenstand"]
        ] satisfies KpiCardTuple[]
      : [
          ["Anzahl Standorte", `${standorte.filter((entry) => isStandortLive(entry, todayReference)).length} + ${standorte.filter((entry) => !isStandortLive(entry, todayReference)).length}`, "aktive und geplante Standorte"],
          ["Umsatz eingereicht", money.format(defaultMetrics.submitted), importSummary.rows ? "aus aktuellem Import" : "kein Datenstand", defaultInfo.submitted],
          ["Auszahlungsbetrag", money.format(defaultMetrics.payout), importSummary.rows ? "aus aktuellem Import" : "kein Datenstand", defaultInfo.payout],
          ["Gesamtkosten BFS", money.format(defaultMetrics.fees), importSummary.rows ? `Gebühr ${money.format(importSummary.feeNet)} · MwSt ${money.format(importSummary.feeVat)}` : "kein Datenstand", defaultInfo.fees]
        ] satisfies KpiCardTuple[];
  }, [customCards, importRows, standort]);
  return (
    <section className="kpi-grid">
      {cards.map(([label, value, hint, info]) => (
        <article className="kpi-card" key={label}>
          <MetricInfo title={label} text={normalizeProductCopy(info ?? metricExplanation(label, value, normalizeProductCopy(hint)))} />
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{normalizeProductCopy(hint)}</small>
          <small className="period-note">{periodLabelFromHint(hint)}</small>
        </article>
      ))}
    </section>
  );
}

function buildKpiDerivationInfo(metrics: BfsMetrics, periodLabel: string) {
  const stornoLoss = metrics.returnAmount + metrics.cancellationAmount;
  const extraCostsNet = metrics.feeNet + metrics.ewmaNet;
  const taxTotal = metrics.feeVat + metrics.ewmaVat;
  const ewmaTotal = metrics.ewmaNet + metrics.ewmaVat;
  const payoutGap = Math.max(metrics.submitted - metrics.payout, 0);
  const totalOutflow = stornoLoss + extraCostsNet + taxTotal;

  return {
    submitted: [
      `Herleitung: Eingereichter Umsatz ist die Summe der Forderungen im Zeitraum ${periodLabel}: ${money.format(metrics.submitted)}.`,
      `Davon als Storno/Rückgabe weggegangen: ${money.format(stornoLoss)} (${metrics.returnCount} Rückgaben / ${money.format(metrics.returnAmount)} plus ${metrics.cancellationCount} Stornos / ${money.format(metrics.cancellationAmount)}).`,
      `Zusatzkosten ohne Steuer: ${money.format(extraCostsNet)} (BFS-Gebühr netto ${money.format(metrics.feeNet)} plus EWMA/Meldeamtabfragen netto ${money.format(metrics.ewmaNet)}). Steuer separat: ${money.format(taxTotal)}.`
    ].join(" "),
    payout: [
      `Herleitung: Auszahlungsbetrag laut Abrechnung im Zeitraum ${periodLabel}: ${money.format(metrics.payout)}.`,
      `Differenz zum eingereichten Umsatz: ${money.format(payoutGap)}. Darin stecken laufende BFS-Abzüge/Kosten sowie zeitversetzt sichtbare Rückgaben oder Stornos.`,
      `Aktuell erkannte Storno-/Rückgabe-Belastung: ${money.format(stornoLoss)}. Zusatzkosten ohne Steuer: ${money.format(extraCostsNet)}. Steueranteil: ${money.format(taxTotal)}.`
    ].join(" "),
    fees: [
      `Herleitung: Diese Kachel zeigt BFS-Gebühr netto plus MwSt: ${money.format(metrics.feeNet)} + ${money.format(metrics.feeVat)} = ${money.format(metrics.fees)}.`,
      `Zusatzkosten außerhalb dieser reinen BFS-Gebühr, z.B. EWMA/Meldeamtabfragen: netto ${money.format(metrics.ewmaNet)}, MwSt ${money.format(metrics.ewmaVat)}, zusammen ${money.format(ewmaTotal)}.`,
      `Storno-/Rückgabe-Umsatzverlust zusätzlich: ${money.format(stornoLoss)}. Gesamter erkannter Abfluss aus Storno/Rückgabe, Zusatzkosten und Steuer: ${money.format(totalOutflow)}.`
    ].join(" "),
    feeNet: `Herleitung: Netto-BFS-Gebühren ohne Steuer im Zeitraum ${periodLabel}: ${money.format(metrics.feeNet)}. Weitere Zusatzkosten ohne Steuer, insbesondere EWMA/Meldeamtabfragen, betragen ${money.format(metrics.ewmaNet)}. Storno-/Rückgabe-Umsatzverlust separat: ${money.format(stornoLoss)}.`,
    tax: `Herleitung: Steueranteil auf BFS-Gebühren und Zusatzkosten im Zeitraum ${periodLabel}. BFS-MwSt: ${money.format(metrics.feeVat)}, EWMA-/Zusatzkosten-MwSt: ${money.format(metrics.ewmaVat)}, zusammen ${money.format(taxTotal)}. Steuer wird getrennt von Netto-Zusatzkosten und Stornos betrachtet.`
  };
}

function periodLabelFromHint(hint: string) {
  const cleanedHint = normalizeProductCopy(hint);
  const normalized = cleanedHint.toLowerCase();
  if (normalized.includes("testupload") || normalized.includes("upload") || normalized.includes("import")) return "Zeitraum: aktueller Import";
  if (normalized.includes("monat")) return "Zeitraum: aktueller Monat";
  if (normalized.includes("seit standortstart")) return `Zeitraum: ${cleanedHint}`;
  if (normalized.includes("jahr") || normalized.includes("quartal") || normalized.includes("q1") || normalized.includes("q2") || normalized.includes("q3") || normalized.includes("q4")) return `Zeitraum: ${cleanedHint}`;
  if (/\d{2}\.\d{2}\.\d{4}/.test(cleanedHint) || /\d{4}/.test(cleanedHint)) return `Zeitraum: ${cleanedHint}`;
  return "Zeitraum: aktueller Datenstand";
}

function normalizeProductCopy(text: string) {
  return text
    .replace(/aktueller\s+Testupload/gi, "aktueller Import")
    .replace(/aus\s+deinem\s+Testupload/gi, "aus aktuellem Import")
    .replace(/aus\s+aktuellem\s+Testupload/gi, "aus aktuellem Import")
    .replace(/Testupload/gi, "Import")
    .replace(/Testlauf/gi, "Upload")
    .replace(/Testimport/gi, "Import")
    .replace(/Testdateien/gi, "BFS-Dateien")
    .replace(/Testdatei/gi, "BFS-Datei");
}

function MetricInfo({ title, text }: { title: string; text: string }) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function handleInfoOpen(event: Event) {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (detail?.id !== id) setOpen(false);
    }

    function close() {
      setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("orisus:metric-info-open", handleInfoOpen);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("orisus:metric-info-open", handleInfoOpen);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [id]);

  function toggleInfo() {
    if (open) {
      setOpen(false);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const popoverWidth = Math.min(340, window.innerWidth - 32);
      const left = Math.max(16, Math.min(rect.right - popoverWidth, window.innerWidth - popoverWidth - 16));
      const top = Math.min(rect.bottom + 10, window.innerHeight - 180);
      setPosition({ top: Math.max(16, top), left });
    }
    window.dispatchEvent(new CustomEvent("orisus:metric-info-open", { detail: { id } }));
    setOpen(true);
  }

  return (
    <div className="metric-info">
      <button ref={buttonRef} className="metric-info-button" aria-label={`Herleitung ${title}`} onClick={toggleInfo}>
        <Info size={14} />
      </button>
      {open && (
        <>
          <button className="metric-info-backdrop" aria-label="Infobox schließen" onClick={() => setOpen(false)} />
          <div className="metric-info-popover" style={position} role="dialog" aria-label={`Herleitung ${title}`}>
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
  if (normalized.includes("abzugsquote")) {
    return `Herleitung: Rückläufer- plus Storno-/Rückgabebeträge geteilt durch den eingereichten Umsatz im gewählten Zeitraum. Aktueller Wert: ${value}. Bezug: ${hint}.`;
  }
  if (normalized.includes("nicht reingeholt") || normalized.includes("offene abzugsquote")) {
    return `Herleitung: Noch nicht durch spätere Neueinreichungen oder manuelle Zahlung erledigter Abzug geteilt durch den eingereichten Umsatz im gewählten Zeitraum. Aktueller Wert: ${value}. Bezug: ${hint}.`;
  }
  if (normalized.includes("stornoquote")) {
    return `Herleitung: Stornobeträge geteilt durch den eingereichten Umsatz im gewählten Zeitraum. Aktueller Wert: ${value}. Bezug: ${hint}.`;
  }
  if (normalized.includes("matchingquote") || normalized.includes("erledigungsquote abzug")) {
    return `Herleitung: Auf den ursprünglichen Storno-/Rückgabe-Abzug angerechnete Neueinreichungen und manuell bezahlte Fälle geteilt durch die gesamte Abzugssumme. Neue Einreichungen werden höchstens bis zur Höhe des ursprünglichen Abzugs angerechnet. Aktueller Wert: ${value}. Bezug: ${hint}.`;
  }
  if (normalized.includes("erledigungsquote") || normalized.includes("wieder erledigt") || normalized.includes("noch nicht erledigt") || normalized.includes("abzug erledigt") || normalized.includes("offener abzug")) {
    return `Herleitung: Als erledigt zählen spätere Neueinreichungen sowie Klärfälle, die manuell als bezahlt markiert wurden. Angerechnet wird maximal der ursprüngliche Storno-/Rückgabe-Abzug, auch wenn die spätere Neueinreichung höher ist. Aktueller Wert: ${value}. Bezug: ${hint}.`;
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
    return `Herleitung: Status aus dem aktuellen Import, inklusive erkannter Dateien, Hash-Dubletten und Parsing-Hinweisen. Aktueller Wert: ${value}. Bezug: ${hint}.`;
  }
  return `Herleitung: Dieser Wert wird aus den aktuell gefilterten BFS-Daten und dem ausgewählten Zeitraum berechnet. Aktueller Wert: ${value}. Bezug: ${hint}.`;
}

function UploadView({ liveRows, onRowsChange }: { liveRows: ImportPreviewRow[]; onRowsChange: (rows: ImportPreviewRow[]) => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("Bereit für Upload");
  const [selectedFileCount, setSelectedFileCount] = useState(0);
  const previewRows = liveRows;
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
    setUploadStatus(`${importableFiles.length} PDF-Dateien werden serverseitig eingelesen`);
    try {
      onRowsChange(mode === "replace" ? [] : liveRows);
      const result = await parseImportFiles(importableFiles, (processed, total, fileName) => {
        const shortName = fileName.length > 34 ? `${fileName.slice(0, 31)}...` : fileName;
        setUploadStatus(`${processed} von ${total} Dateien eingelesen (${shortName})`);
      });
      const parsedRows = result.rows;
      const nextRows = reconcileImportRows(mode === "append" ? mergeImportRows(liveRows, parsedRows) : parsedRows);
      onRowsChange(nextRows);
      try {
        await storeImportRows(nextRows);
        setUploadStatus(importStatusMessage(parsedRows.length, result.persistence));
      } catch (storageError) {
        setUploadStatus(`${importStatusMessage(parsedRows.length, result.persistence)} Import-Vorschau konnte nicht im Browser gespeichert werden: ${storageError instanceof Error ? storageError.message : "Browser-Speicher voll"}`);
      }
    } catch (error) {
      if (mode === "replace") onRowsChange([]);
      setUploadStatus(`Upload konnte nicht vollständig verarbeitet werden: ${error instanceof Error ? error.message : "unbekannter Fehler"}`);
    } finally {
      setIsProcessing(false);
    }
  }

  async function resetUpload() {
    setIsProcessing(true);
    setUploadStatus("Upload wird vollständig zurückgesetzt");
    try {
      await clearStoredImportRowsFromServer();
      await clearStoredImportRows();
      onRowsChange([]);
      setSelectedFileCount(0);
      setUploadStatus("Importdatenstand zurückgesetzt");
    } catch (error) {
      setUploadStatus(`Upload konnte nicht vollständig zurückgesetzt werden: ${error instanceof Error ? error.message : "unbekannter Fehler"}`);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="content-stack">
      <section className="upload-zone">
        <HardDriveUpload size={28} />
        <div>
          <h2>BFS-Dateien für den Monats-Sammelimport hochladen</h2>
          <p>Die App liest echte PDF-Dateien auch aus Unterordnern, berechnet Hashes, erkennt Mandant-Nr. und zeigt sofort, wo Zuordnung oder Parsing noch geprüft werden müssen.</p>
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
            <input disabled={isProcessing} type="file" multiple accept=".pdf,application/pdf" onChange={(event) => handleFiles(event.target.files, "replace")} />
          </label>
          <label className={isProcessing ? "file-upload-button secondary-upload disabled" : "file-upload-button secondary-upload"}>
            <FolderUp size={16} />
            Ordner inkl. Unterordner
            <input
              disabled={isProcessing}
              type="file"
              multiple
              accept=".pdf,application/pdf"
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
        <PriorityCard label="Dateien im Lauf" value={String(isProcessing ? selectedFileCount : previewRows.length)} hint={isProcessing ? "werden eingelesen" : liveRows.length ? "aus aktuellem Upload" : "kein Upload vorhanden"} tone="blue" />
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
              <h2>Aktueller Upload aktiv</h2>
              <p>Diese Vorschau basiert auf deinen hochgeladenen Dateien und bleibt für die Auswertung gespeichert.</p>
            </div>
            <button
              className="secondary-button"
              onClick={resetUpload}
            >
              Upload zurücksetzen
            </button>
          </div>
        </section>
      )}
      <ImportHistorySummary rows={previewRows} />
      <ImportPreview rows={previewRows} />
    </div>
  );
}

async function parseImportFiles(
  files: File[],
  onProgress?: (processed: number, total: number, fileName: string) => void
) {
  const chunks = chunkUploadFiles(files);
  if (chunks.length <= 1) return parseImportFileChunk(files, onProgress, files.length, 0);

  const rows: ImportPreviewRow[] = [];
  const persistence: ImportPersistenceSummary = { batchId: "chunked", imported: 0, duplicates: 0, failed: 0, errors: [] };
  let processed = 0;

  for (const [chunkIndex, chunk] of chunks.entries()) {
    const chunkResult = await parseImportChunkWithRetry(chunk, (chunkProcessed, _chunkTotal, fileName) => {
      onProgress?.(processed + chunkProcessed, files.length, `Paket ${chunkIndex + 1}/${chunks.length}: ${fileName}`);
    });
    rows.push(...chunkResult.rows);
    mergePersistenceSummary(persistence, chunkResult.persistence);
    processed += chunk.length;
    onProgress?.(processed, files.length, `Paket ${chunkIndex + 1}/${chunks.length} abgeschlossen`);
  }

  return { rows: reconcileImportRows(rows), persistence };
}

async function parseImportChunkWithRetry(
  files: File[],
  onProgress?: (processed: number, total: number, fileName: string) => void
): Promise<{ rows: ImportPreviewRow[]; persistence?: ImportPersistenceSummary }> {
  try {
    return await parseImportFileChunk(files, onProgress, files.length, 0);
  } catch (error) {
    if (error instanceof ImportChunkError && (error.status === 401 || error.status === 403)) throw error;
    if (files.length > 1) {
      const midpoint = Math.ceil(files.length / 2);
      const left = await parseImportChunkWithRetry(files.slice(0, midpoint), onProgress);
      const right = await parseImportChunkWithRetry(files.slice(midpoint), onProgress);
      const persistence: ImportPersistenceSummary = { batchId: "split", imported: 0, duplicates: 0, failed: 0, errors: [] };
      mergePersistenceSummary(persistence, left.persistence);
      mergePersistenceSummary(persistence, right.persistence);
      return { rows: [...left.rows, ...right.rows], persistence };
    }
    return {
      rows: [failedImportRow(files[0], error instanceof Error ? error.message : "Serverseitiger Import fehlgeschlagen.")],
      persistence: {
        batchId: "failed-single",
        imported: 0,
        duplicates: 0,
        failed: 1,
        errors: [{ file: uploadFilePath(files[0]), message: error instanceof Error ? error.message : "Serverseitiger Import fehlgeschlagen." }]
      }
    };
  }
}

async function parseImportFileChunk(
  files: File[],
  onProgress: ((processed: number, total: number, fileName: string) => void) | undefined,
  total: number,
  offset: number
) {
  const formData = new FormData();
  files.forEach((file) => {
    const filePath = uploadFilePath(file);
    formData.append("files", file, filePath);
    formData.append("paths", filePath);
  });

  const response = await fetch("/api/imports/parse", {
    method: "POST",
    body: formData,
    cache: "no-store"
  });

  if (response.ok) {
    const payload = await response.json() as { rows: ImportPreviewRow[]; persistence?: ImportPersistenceSummary };
    payload.rows.forEach((row, index) => onProgress?.(offset + index + 1, total, row.file));
    return { rows: payload.rows, persistence: payload.persistence };
  }

  if (process.env.NODE_ENV !== "production") {
    return { rows: await parseDemoImportFiles(files, onProgress), persistence: undefined };
  }

  const errorPayload = await response.json().catch(() => null) as { error?: string } | null;
  throw new ImportChunkError(response.status, errorPayload?.error ?? "Serverseitiger Import fehlgeschlagen.");
}

function uploadFilePath(file: File) {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

function chunkUploadFiles(files: File[]) {
  const chunks: File[][] = [];
  let current: File[] = [];
  let currentBytes = 0;

  files.forEach((file) => {
    const wouldExceedSize = current.length > 0 && currentBytes + file.size > uploadChunkMaxBytes;
    const wouldExceedCount = current.length >= uploadChunkMaxFiles;
    if (wouldExceedSize || wouldExceedCount) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += file.size;
  });

  if (current.length) chunks.push(current);
  return chunks;
}

function mergePersistenceSummary(target: ImportPersistenceSummary, next?: ImportPersistenceSummary) {
  if (!next) return;
  target.imported += next.imported;
  target.duplicates += next.duplicates;
  target.failed += next.failed;
  target.errors = [...(target.errors ?? []), ...(next.errors ?? [])];
}

class ImportChunkError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function importStatusMessage(parsedCount: number, persistence?: ImportPersistenceSummary) {
  if (!persistence) return `${parsedCount} PDF-Dateien fertig eingelesen`;
  const base = `${parsedCount} PDF-Dateien verarbeitet: ${persistence.imported} neu gespeichert, ${persistence.duplicates} Dubletten übersprungen`;
  if (!persistence.failed) return `${base}. Kacheln und Auswertungen wurden aktualisiert.`;
  const firstError = persistence.errors?.[0];
  return `${base}, ${persistence.failed} fehlgeschlagen${firstError ? ` (${firstError.file}: ${firstError.message})` : ""}.`;
}

function failedImportRow(file: File, message: string): ImportPreviewRow {
  return {
    file: uploadFilePath(file),
    location: "Unbekannt",
    mandantNo: "-",
    practice: "nicht gespeichert",
    statementNo: "-",
    date: "-",
    claimsHeader: 0,
    claimsExtracted: 0,
    sumHeader: 0,
    sumExtracted: 0,
    hasLedger: false,
    movements: 0,
    status: "Fehler",
    fileSizeBytes: file.size,
    parseNotes: [
      message,
      "Diese Datei wurde vom Server nicht gespeichert und muss erneut geprüft werden."
    ]
  };
}

function isImportableUploadFile(file: File) {
  return isBfsPdfUploadFile(file);
}

function countNestedUploadFolders(rows: ImportPreviewRow[]) {
  const folders = new Set<string>();
  rows.forEach((row) => {
    const pathParts = row.file.split("/");
    pathParts.slice(0, -1).forEach((_, index) => folders.add(pathParts.slice(0, index + 1).join("/")));
  });
  return folders.size;
}

function ImportHistorySummary({ rows }: { rows: ImportPreviewRow[] }) {
  const months = buildImportHistoryMonths(rows);
  const totalSubmitted = months.reduce((sum, month) => sum + month.submitted, 0);
  const totalPayout = months.reduce((sum, month) => sum + month.payout, 0);
  const totalCosts = months.reduce((sum, month) => sum + month.feeNet + month.feeVat + month.ewmaTotal, 0);
  const totalRetained = months.reduce((sum, month) => sum + month.chargebackAmount, 0);

  return (
    <section className="panel import-history-panel">
      <div className="panel-heading">
        <div>
          <h2>Import-Status & Historie</h2>
          <p>Ein gemeinsamer Überblick über hochgeladene Monate, Prüfstatus und die wichtigsten Summen vor der Detailfreigabe.</p>
        </div>
      </div>
      <div className="case-summary-grid" aria-label="Import-Historie Gesamtsummen">
        <article>
          <span>Dateien gesamt</span>
          <strong>{rows.length}</strong>
        </article>
        <article>
          <span>Eingereichter Umsatz</span>
          <strong>{money.format(totalSubmitted)}</strong>
        </article>
        <article>
          <span>Auszahlungsbetrag</span>
          <strong>{money.format(totalPayout)}</strong>
        </article>
        <article>
          <span>Kosten BFS/EWMA</span>
          <strong>{money.format(totalCosts)}</strong>
        </article>
        <article>
          <span>Rückgaben/Stornos</span>
          <strong>{money.format(totalRetained)}</strong>
        </article>
      </div>
      <div className="table-wrap compact-table import-history-scroll">
        <table>
          <thead>
            <tr>
              <th>Monat</th>
              <th>Standorte</th>
              <th>Dateien</th>
              <th>Prüfung</th>
              <th>Umsatz</th>
              <th>Auszahlung</th>
              <th>BFS-Gebühr</th>
              <th>MwSt</th>
              <th>EWMA</th>
              <th>Rückgaben/Stornos</th>
              <th>Ohne Schutz</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => (
              <tr key={month.month}>
                <td><strong>{month.label}</strong></td>
                <td>{month.locations.join(", ") || "unbekannt"}</td>
                <td>{month.rows}</td>
                <td>
                  <StatusBadge status={month.warnings ? `${month.warnings} prüfen` : "OK"} />
                  <span>{month.importable} importfähig</span>
                </td>
                <td>{money.format(month.submitted)}</td>
                <td>{money.format(month.payout)}</td>
                <td>{money.format(month.feeNet)}</td>
                <td>{money.format(month.feeVat)}</td>
                <td>{money.format(month.ewmaTotal)}</td>
                <td>{month.chargebackCount}<span>{money.format(month.chargebackAmount)}</span></td>
                <td>{month.noProtectionCount}<span>{money.format(month.noProtectionAmount)}</span></td>
              </tr>
            ))}
            {!months.length && (
              <tr><td colSpan={11}>Noch keine Importdaten vorhanden.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildImportHistoryMonths(rows: ImportPreviewRow[]) {
  const months = new Map<string, {
    month: string;
    label: string;
    rows: number;
    importable: number;
    warnings: number;
    submitted: number;
    payout: number;
    feeNet: number;
    feeVat: number;
    ewmaTotal: number;
    chargebackCount: number;
    chargebackAmount: number;
    noProtectionCount: number;
    noProtectionAmount: number;
    locations: Set<string>;
  }>();

  rows.forEach((row) => {
    const monthKey = importRowMonth(row) || "unbekannt";
    const summary = summarizeImportRows([row]);
    const current = months.get(monthKey) ?? {
      month: monthKey,
      label: monthKey === "unbekannt" ? "Monat unbekannt" : formatMetricMonth(monthKey),
      rows: 0,
      importable: 0,
      warnings: 0,
      submitted: 0,
      payout: 0,
      feeNet: 0,
      feeVat: 0,
      ewmaTotal: 0,
      chargebackCount: 0,
      chargebackAmount: 0,
      noProtectionCount: 0,
      noProtectionAmount: 0,
      locations: new Set<string>()
    };
    const isOk = row.status.toLowerCase().includes("ok");

    current.rows += 1;
    current.importable += isOk ? 1 : 0;
    current.warnings += isOk ? 0 : 1;
    current.submitted += summary.submitted;
    current.payout += summary.payout;
    current.feeNet += summary.feeNet;
    current.feeVat += summary.feeVat;
    current.ewmaTotal += summary.ewmaTotal;
    current.chargebackCount += summary.returnCount + summary.cancellationCount;
    current.chargebackAmount += summary.returnAmount + summary.cancellationAmount;
    current.noProtectionCount += summary.noProtectionCount;
    current.noProtectionAmount += summary.noProtectionAmount;
    if (row.location && row.location !== "Unbekannt") current.locations.add(row.location);
    months.set(monthKey, current);
  });

  return [...months.values()]
    .map((month) => ({
      ...month,
      locations: [...month.locations].sort(compareLocationNamesByContractStart)
    }))
    .sort((a, b) => {
      if (a.month === "unbekannt") return 1;
      if (b.month === "unbekannt") return -1;
      return b.month.localeCompare(a.month);
    });
}

function ImportPreview({ rows }: { rows: ImportPreviewRow[] }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reviewRows = rows.filter(importRowNeedsReview);
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
      <section className="panel import-detail-panel">
        <div className="panel-heading">
          <div>
            <h2>Prüfung & Detailvorschau</h2>
            <p>Die Einzeldateien bleiben bis zur Bestätigung prüfbar; danach wertet die App diesen Datenstand aus.</p>
          </div>
          <div className="import-report-actions">
            <button className="secondary-button" disabled={!rows.length} onClick={() => printImportIssueReport(rows)}>
              <Printer size={16} /> Fehlerbericht als PDF
            </button>
            <button className="primary-button" onClick={() => setConfirmOpen(true)}>
              <CheckCircle2 size={16} /> Import bestätigen
            </button>
          </div>
        </div>
        {!!rows.length && (
          <div className="import-review-summary">
            <AlertTriangle size={16} />
            <span>{reviewRows.length} von {rows.length} Importzeilen brauchen Prüfung. Der PDF-Bericht enthält alle Hinweise und vollständige Dateipfade.</span>
          </div>
        )}
        <div className="table-wrap import-detail-scroll">
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
                      {!!rowEwmaAmount(row) && (
                        <span>EWMA {money.format(rowEwmaAmount(row))} inkl. MwSt</span>
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
                        {(row.parseNotes ?? ["Keine Hinweise hinterlegt."]).slice(0, 3).map((note) => (
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
            <h2>Import bestätigt</h2>
            <p>Die Import-Vorschau wurde übernommen. Die App wertet diesen Datenstand jetzt in Cockpit, Fällen, Matching, Maßnahmenkontrolle, Patientenklassifizierung und Reports aus.</p>
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

function importRowNeedsReview(row: ImportPreviewRow) {
  if (row.status !== "OK") return true;
  if (!row.hasLedger) return true;
  if (row.claimsHeader !== row.claimsExtracted) return true;
  if (Math.abs(row.sumHeader - row.sumExtracted) > 0.02) return true;
  return (row.parseNotes ?? []).some((note) => !note.toLowerCase().includes("datei wurde"));
}

function printImportIssueReport(rows: ImportPreviewRow[]) {
  const reviewRows = rows.filter(importRowNeedsReview);
  const reportRows = reviewRows.length ? reviewRows : rows;
  const summary = {
    total: rows.length,
    ok: rows.filter((row) => row.status === "OK").length,
    review: reviewRows.length,
    failed: rows.filter((row) => row.status.toLowerCase().includes("fehler")).length,
    missingLedger: rows.filter((row) => !row.hasLedger).length,
    claimMismatch: rows.filter((row) => row.claimsHeader !== row.claimsExtracted).length,
    sumMismatch: rows.filter((row) => Math.abs(row.sumHeader - row.sumExtracted) > 0.02).length
  };
  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Orisus BFS Import-Fehlerbericht</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #102a3a; font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
    header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; border-bottom: 2px solid #30d5c8; padding-bottom: 10px; margin-bottom: 12px; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    h2 { margin: 16px 0 8px; font-size: 15px; }
    p { margin: 0; color: #48606c; line-height: 1.35; }
    .meta { text-align: right; color: #48606c; }
    .summary { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin: 10px 0 12px; }
    .summary div { border: 1px solid #c8d7dc; border-radius: 6px; padding: 8px; }
    .summary span { display: block; color: #607783; font-size: 9px; font-weight: 700; text-transform: uppercase; }
    .summary strong { display: block; margin-top: 4px; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #d7e3e7; padding: 5px; vertical-align: top; text-align: left; overflow-wrap: anywhere; }
    th { background: #eaf7f6; color: #0f5360; font-size: 9px; text-transform: uppercase; }
    tr:nth-child(even) td { background: #f8fbfc; }
    .file { width: 30%; }
    .small { color: #607783; font-size: 9px; }
    .status { display: inline-block; border-radius: 999px; background: #fee4e2; color: #b42318; padding: 2px 6px; font-weight: 700; }
    .status.ok { background: #dcfae6; color: #067647; }
    .notes { margin: 0; padding-left: 14px; }
    .notes li { margin: 0 0 3px; }
    footer { margin-top: 12px; color: #607783; font-size: 9px; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Orisus BFS Import-Fehlerbericht</h1>
      <p>Analysebericht fuer Importzeilen mit Fehlern, Warnungen, fehlendem Kontoauszug oder Summen-/Positionsabweichungen.</p>
    </div>
    <div class="meta">
      <strong>${escapeHtml(new Date().toLocaleString("de-DE"))}</strong><br />
      ${escapeHtml(reportRows.length.toString())} Detailzeilen im Bericht
    </div>
  </header>
  <section class="summary">
    <div><span>Importzeilen</span><strong>${summary.total}</strong></div>
    <div><span>OK</span><strong>${summary.ok}</strong></div>
    <div><span>Zu pruefen</span><strong>${summary.review}</strong></div>
    <div><span>Fehler</span><strong>${summary.failed}</strong></div>
    <div><span>Kontoauszug fehlt</span><strong>${summary.missingLedger}</strong></div>
    <div><span>Positionsabweichung</span><strong>${summary.claimMismatch}</strong></div>
    <div><span>Summenabweichung</span><strong>${summary.sumMismatch}</strong></div>
  </section>
  <h2>Detailanalyse</h2>
  <table>
    <thead>
      <tr>
        <th class="file">Datei</th>
        <th>Standort</th>
        <th>Mandant</th>
        <th>Abrechnung</th>
        <th>Forderungen</th>
        <th>Summe</th>
        <th>Kontoauszug</th>
        <th>Status</th>
        <th>Hinweise</th>
      </tr>
    </thead>
    <tbody>
      ${reportRows.map(importReportRowHtml).join("")}
    </tbody>
  </table>
  <footer>Hinweis: Nicht-PDF-Dateien aus dem Ordner werden vom Upload bewusst ignoriert. Der Bericht bildet die aktuell in der App vorhandenen Importzeilen ab.</footer>
  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 150));</script>
</body>
</html>`;
  const reportWindow = window.open("", "_blank", "width=1200,height=900");
  if (!reportWindow) {
    downloadTextFile("orisus-bfs-import-fehlerbericht.html", html);
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
}

function importReportRowHtml(row: ImportPreviewRow) {
  const notes = row.parseNotes?.length ? row.parseNotes : ["Keine Hinweise hinterlegt."];
  const statusClass = row.status === "OK" ? "status ok" : "status";
  return `<tr>
    <td class="file"><strong>${escapeHtml(row.file)}</strong><br /><span class="small">${escapeHtml(row.practice)}${row.fileSizeBytes ? ` · ${escapeHtml(formatBytes(row.fileSizeBytes))}` : ""}${row.fileHash ? ` · Hash ${escapeHtml(row.fileHash.slice(0, 10))}` : ""}</span></td>
    <td>${escapeHtml(row.location)}</td>
    <td>${escapeHtml(row.mandantNo)}</td>
    <td>${escapeHtml(row.statementNo)} / ${escapeHtml(row.date)}</td>
    <td>${row.claimsHeader} / ${row.claimsExtracted}</td>
    <td>${escapeHtml(money.format(row.sumHeader))}<br />${escapeHtml(money.format(row.sumExtracted))}</td>
    <td>${row.hasLedger ? `${row.movements} Bewegungen` : "fehlt"}</td>
    <td><span class="${statusClass}">${escapeHtml(row.status)}</span></td>
    <td><ul class="notes">${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul></td>
  </tr>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

const importStorageDbName = "orisus-bfs-monitor-imports-v2-reset";
const importStorageStoreName = "imports";
const importStorageRowsKey = "current-preview";
const importStorageLegacyKey = "orisus_bfs_monitor_import_preview_v2_reset";
const importStorageDbNames = [importStorageDbName, "orisus-bfs-monitor-imports"];
const importStorageLocalKeys = [importStorageLegacyKey, "orisus_bfs_monitor_import_preview"];

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
  const serverRows = await loadStoredImportRowsFromServer().catch(() => undefined);
  if (serverRows) return serverRows;
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

async function loadStoredImportRowsFromServer() {
  if (typeof window === "undefined") return [];
  const response = await fetch("/api/imports/parse", { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error("Server-Importdaten konnten nicht geladen werden.");
  const payload = await response.json() as { rows?: ImportPreviewRow[] };
  return reconcileImportRows(payload.rows ?? []);
}

async function loadManualCaseResolutions() {
  if (typeof window === "undefined") return [];
  const response = await fetch("/api/cases/resolutions", { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error("Manuelle Erledigungen konnten nicht geladen werden.");
  const payload = await response.json() as { resolutions?: ManualCaseResolution[] };
  return payload.resolutions ?? [];
}

async function saveManualCaseResolution(fall: BfsCase, status: ManualCaseResolution["status"] = "paid_manual") {
  const response = await fetch("/api/cases/resolutions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      caseKey: caseResolutionKey(fall),
      standortId: fall.standortId,
      patientName: fall.patientName,
      invoiceNo: fall.invoiceNo,
      bfsNo: fall.bfsNo,
      amount: fall.amount,
      reason: fall.reason,
      status,
      comment: status === "paid_manual" ? "Manuell geprüft: bezahlt." : "Manuell geprüft: weiterhin offen."
    })
  });
  const payload = await response.json().catch(() => null) as { resolution?: ManualCaseResolution; error?: string } | null;
  if (!response.ok || !payload?.resolution) throw new Error(payload?.error ?? "Klärfall konnte nicht erledigt werden.");
  return payload.resolution;
}

async function clearStoredImportRowsFromServer() {
  if (typeof window === "undefined") return;
  const response = await fetch("/api/imports/parse", { method: "DELETE", cache: "no-store" });
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Server-Importdaten konnten nicht zurückgesetzt werden.");
}

function mergeImportRows(existingRows: ImportPreviewRow[], nextRows: ImportPreviewRow[]) {
  const rowsByKey = new Map<string, ImportPreviewRow>();
  [...existingRows, ...nextRows].forEach((row) => {
    rowsByKey.set(importRowIdentity(row), row);
  });
  return [...rowsByKey.values()];
}

function importRowIdentity(row: ImportPreviewRow) {
  const businessIdentity = importRowBusinessIdentity(row);
  if (businessIdentity) return businessIdentity;
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
  importStorageLocalKeys.forEach((key) => window.localStorage.removeItem(key));
  if (!("indexedDB" in window)) return;
  await clearCurrentImportDbRows();
  await Promise.all(importStorageDbNames.map(deleteImportDb));
}

async function clearCurrentImportDbRows() {
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

function deleteImportDb(dbName: string) {
  return new Promise<void>((resolve) => {
    const request = window.indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
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

function CasesView({
  cases: rows,
  compact = false,
  title,
  description,
  onResolvePaid,
  onKeepOpen,
  enableFilters = false,
  tableScrollable = false
}: {
  cases: BfsCase[];
  compact?: boolean;
  title?: string;
  description?: string;
  onResolvePaid?: (fall: BfsCase) => void | Promise<void>;
  onKeepOpen?: (fall: BfsCase) => void | Promise<void>;
  enableFilters?: boolean;
  tableScrollable?: boolean;
}) {
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [caseStandortFilter, setCaseStandortFilter] = useState("alle");
  const [casePeriodId, setCasePeriodId] = useState(periodOptions[0].id);
  const casePeriod = useMemo(() => periodOptions.find((period) => period.id === casePeriodId) ?? periodOptions[0], [periodOptions, casePeriodId]);
  const caseStandorte = useMemo(() => orderedStandorte().filter((entry) => rows.some((fall) => fall.standortId === entry.id)), [rows]);
  const filteredRows = useMemo(() => enableFilters
    ? rows.filter((fall) => {
      const rowStandort = standorte.find((entry) => entry.id === fall.standortId);
      const matchesStandort = caseStandortFilter === "alle" || fall.standortId === caseStandortFilter;
      const matchesPeriod = rowStandort ? shortDateInPeriod(fall.sourceDate, casePeriod, rowStandort) : true;
      return matchesStandort && matchesPeriod;
    })
    : rows, [enableFilters, rows, caseStandortFilter, casePeriod]);
  const totalAmount = useMemo(() => filteredRows.reduce((sum, fall) => sum + fall.amount, 0), [filteredRows]);
  const oldestAge = useMemo(() => filteredRows.reduce((max, fall) => Math.max(max, fall.ageDays), 0), [filteredRows]);
  const highestCase = useMemo(() => filteredRows.reduce<BfsCase | undefined>((max, fall) => !max || fall.amount > max.amount ? fall : max, undefined), [filteredRows]);
  const reportTitle = title ?? (compact ? "Offene Fälle am Standort" : "Offene Rückbelastungen / Klärfälle");

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{reportTitle}</h2>
          <p>{description ?? "Originaldaten sind read-only; nur interne Bearbeitung und Erledigungsgründe werden gepflegt."}</p>
        </div>
        <div className="case-list-actions">
          <button className="secondary-button" disabled={!filteredRows.length} onClick={() => printCasesReport(filteredRows, reportTitle)}>
            <Printer size={16} /> PDF für Standortleitung
          </button>
          <div className="search-box"><Search size={16} /><input placeholder="Patient, Re.-Nr. oder BFS-Nr." /></div>
        </div>
      </div>
      {enableFilters && (
        <div className="period-filter case-table-filter">
          <label className="select-label">
            Standort
            <select value={caseStandortFilter} onChange={(event) => setCaseStandortFilter(event.target.value)}>
              <option value="alle">Alle Standorte</option>
              {caseStandorte.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
          </label>
          <label className="select-label">
            Zeitraum
            <select value={casePeriodId} onChange={(event) => setCasePeriodId(event.target.value)}>
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
          </label>
          <div>
            <strong>{caseStandortFilter === "alle" ? "Alle Standorte" : standorte.find((entry) => entry.id === caseStandortFilter)?.name}</strong>
            <span>{casePeriod.label}. Gefiltert nach Bewegungsdatum der offenen Position.</span>
          </div>
        </div>
      )}
      <div className="case-summary-grid" aria-label="Gesamtüberblick offene Fälle">
        <article>
          <span>Offener Betrag gesamt</span>
          <strong>{money.format(totalAmount)}</strong>
        </article>
        <article>
          <span>Offene Fälle</span>
          <strong>{filteredRows.length}</strong>
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
      <div className={`table-wrap${tableScrollable ? " case-table-scroll" : ""}`}>
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
              <th>AbrechnungsNr</th>
              {(onResolvePaid || onKeepOpen) && <th>Aktion</th>}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((fall) => (
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
                <td>{formatCaseAbrechnungReference(fall.lastComment)}</td>
                {(onResolvePaid || onKeepOpen) && (
                  <td>
                    <div className="case-action-stack">
                      {onResolvePaid && (
                        <button className="secondary-button resolve-case-button" onClick={() => void onResolvePaid(fall)}>
                          <CheckCircle2 size={15} /> Erledigt / bezahlt
                        </button>
                      )}
                      {onKeepOpen && (
                        <button className="secondary-button resolve-case-button" onClick={() => void onKeepOpen(fall)}>
                          <AlertCircle size={15} /> Weiterhin offen
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!filteredRows.length && (
              <tr>
                <td colSpan={onResolvePaid || onKeepOpen ? 11 : 10}>Keine Klärfälle für den aktuellen Datenstand.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function printCasesReport(rows: BfsCase[], title: string) {
  const totalAmount = rows.reduce((sum, fall) => sum + fall.amount, 0);
  const oldestAge = rows.reduce((max, fall) => Math.max(max, fall.ageDays), 0);
  const locations = [...new Set(rows.map((fall) => fall.locationName).filter(Boolean))].sort(compareLocationNamesByContractStart);
  const sortedRows = [...rows].sort((a, b) => b.ageDays - a.ageDays || b.amount - a.amount);
  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - Orisus BFS Monitor</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #102a3a; font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
    header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; border-bottom: 2px solid #30d5c8; padding-bottom: 10px; margin-bottom: 12px; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    h2 { margin: 16px 0 8px; font-size: 15px; }
    p { margin: 0; color: #48606c; line-height: 1.35; }
    .meta { text-align: right; color: #48606c; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0 12px; }
    .summary div { border: 1px solid #c8d7dc; border-radius: 6px; padding: 8px; }
    .summary span { display: block; color: #607783; font-size: 9px; font-weight: 700; text-transform: uppercase; }
    .summary strong { display: block; margin-top: 4px; font-size: 17px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #d7e3e7; padding: 5px; vertical-align: top; text-align: left; overflow-wrap: anywhere; }
    th { background: #eaf7f6; color: #0f5360; font-size: 9px; text-transform: uppercase; }
    tr:nth-child(even) td { background: #f8fbfc; }
    .patient { width: 17%; }
    .reason { width: 20%; }
    .comment { width: 18%; }
    .status { display: inline-block; border-radius: 999px; background: #eaf7f6; color: #0f5360; padding: 2px 6px; font-weight: 700; }
    .traffic { display: inline-block; width: 9px; height: 9px; border-radius: 999px; margin-right: 5px; background: #30d5c8; }
    .traffic-red { background: #f04438; }
    .traffic-amber { background: #f59e0b; }
    .traffic-green { background: #12b76a; }
    footer { margin-top: 12px; color: #607783; font-size: 9px; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${escapeHtml(title)}</h1>
      <p>Orisus BFS Monitor · Offene Fälle zur direkten Weitergabe und Bearbeitung.</p>
    </div>
    <div class="meta">
      <strong>${escapeHtml(new Date().toLocaleString("de-DE"))}</strong><br />
      ${escapeHtml(locations.join(", ") || "Alle Standorte")}
    </div>
  </header>
  <section class="summary">
    <div><span>Offene Fälle</span><strong>${rows.length}</strong></div>
    <div><span>Offener Betrag</span><strong>${escapeHtml(money.format(totalAmount))}</strong></div>
    <div><span>Ältester Fall</span><strong>${oldestAge} Tage</strong></div>
    <div><span>Standorte</span><strong>${locations.length || "-"}</strong></div>
  </section>
  <h2>Fallliste</h2>
  <table>
    <thead>
      <tr>
        <th>Ampel</th>
        <th class="patient">Patient</th>
        <th>Re.-Nr.</th>
        <th>BFS-Nr.</th>
        <th>Betrag</th>
        <th class="reason">Grund</th>
        <th>Alter</th>
        <th>Status</th>
        <th>Wiedervorlage</th>
        <th class="comment">AbrechnungsNr</th>
      </tr>
    </thead>
    <tbody>
      ${sortedRows.length ? sortedRows.map(caseReportRowHtml).join("") : `<tr><td colspan="10">Keine offenen Fälle im aktuellen Datenstand.</td></tr>`}
    </tbody>
  </table>
  <footer>Hinweis: Der Bericht bildet die aktuell in der Ansicht gefilterten offenen Fälle ab. Originaldaten bleiben unverändert; interne Erledigungen werden separat in der App gepflegt.</footer>
  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 150));</script>
</body>
</html>`;
  const reportWindow = window.open("", "_blank", "width=1200,height=900");
  if (!reportWindow) {
    downloadTextFile("orisus-bfs-offene-faelle.html", html);
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
}

function caseReportRowHtml(fall: BfsCase) {
  return `<tr>
    <td><span class="traffic traffic-${escapeHtml(fall.traffic)}"></span>${escapeHtml(fall.traffic)}</td>
    <td><strong>${escapeHtml(fall.patientName)}</strong><br />${escapeHtml(fall.locationName)}</td>
    <td>${escapeHtml(fall.invoiceNo)}</td>
    <td>${escapeHtml(fall.bfsNo)}</td>
    <td>${escapeHtml(money.format(fall.amount))}</td>
    <td>${escapeHtml(fall.reason)}</td>
    <td>${fall.ageDays} Tage</td>
    <td><span class="status">${escapeHtml(fall.status)}</span></td>
    <td>${escapeHtml(fall.dueDate)}</td>
    <td>${escapeHtml(formatCaseAbrechnungReference(fall.lastComment))}</td>
  </tr>`;
}

function formatCaseAbrechnungReference(value: string) {
  const matchedPrefix = value.match(/Gematcht mit\s+(\d+)/i);
  if (matchedPrefix) return matchedPrefix[1];
  const fileNumber = value.match(/AbrechnungsNachweis_[^/_]+_(\d+)\.pdf/i);
  if (fileNumber) return fileNumber[1];
  const fallbackNumber = value.match(/(?:Abrechnung|AbrechnungsNr|Nachweis)[^\d]*(\d+)/i);
  if (fallbackNumber) return fallbackNumber[1];
  return "-";
}

function RiskView({ standortId, importRows = [] }: { standortId?: string; importRows?: ImportPreviewRow[] }) {
  const importedRisks = useMemo(() => riskClaimsFromImportRows(importRows), [importRows]);
  const rows = useMemo(() => importedRisks
    .filter((claim) => !standortId || claim.standortId === standortId)
    .sort((a, b) => riskAssessmentRank(b) - riskAssessmentRank(a) || (b.eventAmount ?? 0) - (a.eventAmount ?? 0) || b.amount - a.amount), [importedRisks, standortId]);
  const reasonRows = useMemo(() => aggregateNoProtectionReasons(rows), [rows]);
  const paymentRisk = useMemo(() => summarizeNoProtectionPaymentRisk(rows), [rows]);
  return (
    <div className="content-stack">
      <section className="priority-grid">
        <PriorityCard
          label="Ohne-Schutz-Patienten"
          value={String(paymentRisk.totalPatients)}
          hint={`${rows.length} Positionen · ${money.format(rows.reduce((sum, claim) => sum + claim.amount, 0))}`}
          tone={rows.length ? "amber" : "green"}
          info={paymentRisk.info}
        />
        <PriorityCard
          label="Davon nicht gezahlt"
          value={String(paymentRisk.unpaidPatients)}
          hint="nicht erledigte Storno-/Rückgabe-Bewegung"
          tone={paymentRisk.unpaidPatients ? "red" : "green"}
          info={paymentRisk.info}
        />
        <PriorityCard
          label="Nichtzahlungsquote"
          value={`${paymentRisk.unpaidRate.toFixed(1)} %`}
          hint="kritische Patienten ohne Schutz"
          tone={paymentRisk.unpaidRate >= 10 ? "red" : paymentRisk.unpaidRate ? "amber" : "green"}
          info={paymentRisk.info}
        />
        <PriorityCard
          label="Bisher unauffällig"
          value={String(paymentRisk.cleanPatients)}
          hint="kein negatives Ereignis erkannt"
          tone="green"
          info={paymentRisk.info}
        />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Gründe ohne Ausfallschutz</h2>
            <p>Mandantenübergreifend aus allen hochgeladenen Abrechnungen gruppiert: warum Forderungen ohne Ausfallschutz angekauft wurden.</p>
          </div>
        </div>
        <div className="table-wrap compact-table">
          <table>
            <thead>
              <tr>
                <th>Grund</th>
                <th>Kennzeichen</th>
                <th>Anzahl</th>
                <th>Summe</th>
              </tr>
            </thead>
            <tbody>
              {reasonRows.map((reason) => (
                <tr key={reason.category}>
                  <td><strong>{reason.label}</strong></td>
                  <td>{reason.markers}</td>
                  <td>{reason.count}</td>
                  <td>{money.format(reason.amount)}</td>
                </tr>
              ))}
              {!reasonRows.length && (
                <tr><td colSpan={4}>Keine Fälle ohne Ausfallschutz im aktuellen Datenstand.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Laufend ohne Ausfallschutz</h2>
            <p>Risikohinweise mit Querprüfung gegen Storno, Rückgabe, Rückbelastung und erkennbare Erledigung. Erst eine echte Auffälligkeit wird operativ priorisiert.</p>
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
                <th>Grund</th>
                <th>Querprüfung</th>
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
                  <td>{claim.markerReason ?? protectionMarkerLabel(claim.marker)}</td>
                  <td>
                    <strong>{claim.assessmentLabel ?? "bisher keine Auffälligkeit"}</strong>
                    {!!claim.eventLabels?.length && <span>{claim.eventLabels.join(", ")}</span>}
                    {!!claim.eventAmount && <small>{money.format(claim.eventAmount)}</small>}
                  </td>
                  <td><StatusBadge status={riskAssessmentStatus(claim)} /></td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={9}>Keine Fälle ohne Ausfallschutz im aktuellen Datenstand.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function summarizeNoProtectionPaymentRisk(rows: RiskClaim[]) {
  const patients = new Map<string, { patientName: string; claims: RiskClaim[] }>();
  rows.forEach((claim) => {
    const key = `${claim.standortId}:${normalizePatientName(claim.patientName)}`;
    const current = patients.get(key) ?? { patientName: claim.patientName, claims: [] };
    current.claims.push(claim);
    patients.set(key, current);
  });

  const patientRows = [...patients.values()];
  const unpaidPatients = patientRows.filter((patient) => patient.claims.some((claim) => claim.assessment === "auffaellig")).length;
  const resolvedPatients = patientRows.filter((patient) => patient.claims.some((claim) => claim.assessment === "erledigt") && !patient.claims.some((claim) => claim.assessment === "auffaellig")).length;
  const cleanPatients = patientRows.filter((patient) => patient.claims.every((claim) => claim.assessment === "unauffaellig")).length;
  const totalPatients = patientRows.length;
  const unpaidRate = totalPatients ? (unpaidPatients / totalPatients) * 100 : 0;
  const unpaidAmount = patientRows
    .filter((patient) => patient.claims.some((claim) => claim.assessment === "auffaellig"))
    .reduce((sum, patient) => sum + patient.claims.reduce((patientSum, claim) => patientSum + (claim.eventAmount ?? 0), 0), 0);
  const info = [
    `Herleitung: Grundgesamtheit sind ${totalPatients} eindeutige Patient(en), bei denen mindestens eine Forderung ohne Ausfallschutz erkannt wurde.`,
    `Davon zählen ${unpaidPatients} Patient(en) als kritisch, weil zu ihnen eine nicht erledigte Storno-, Rückgabe- oder Rückbelastungsbewegung erkannt wurde.`,
    `Nichtzahlungsquote: ${unpaidPatients} / ${totalPatients || 1} = ${unpaidRate.toFixed(1)} %.`,
    `Als nicht kritisch gelten ${cleanPatients} Patient(en) ohne negative Bewegung und ${resolvedPatients} Patient(en) mit erkannter Zahlung/Erledigung. Erkannte kritische Summe: ${money.format(unpaidAmount)}.`
  ].join(" ");

  return {
    totalPatients,
    unpaidPatients,
    resolvedPatients,
    cleanPatients,
    unpaidRate,
    unpaidAmount,
    info
  };
}

function riskAssessmentRank(claim: RiskClaim) {
  if (claim.assessment === "auffaellig") return 3;
  if (claim.assessment === "erledigt") return 2;
  return 1;
}

function riskAssessmentStatus(claim: RiskClaim) {
  if (claim.assessment === "auffaellig") return "Priorität: auffällig";
  if (claim.assessment === "erledigt") return "Erledigung erkannt";
  return "Beobachten, bisher unauffällig";
}

function getRecurringRiskProfiles(standortId?: string, importRows: ImportPreviewRow[] = [], hasImportDataset = importRows.length > 0) {
  const importedRisks = riskClaimsFromImportRows(importRows);
  const rows = (hasImportDataset ? importedRisks : []).filter((claim) => !standortId || claim.standortId === standortId);
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
      const eventCount = claims.reduce((sum, claim) => sum + (claim.eventCount ?? 0), 0);
      const eventAmount = claims.reduce((sum, claim) => sum + (claim.eventAmount ?? 0), 0);
      const hasNegativeEvent = claims.some((claim) => claim.assessment === "auffaellig");
      const tone = hasNegativeEvent || claims.length >= 4 || total >= 1500 ? "red" : "amber";
      return {
        id: `${first.standortId}-${first.patientName}`,
        standortName: standort?.name ?? first.standortId,
        patientName: first.patientName,
        count: claims.length,
        total,
        eventCount,
        eventAmount,
        lastDate: sortedClaims[0].date,
        tone,
        recommendation: hasNegativeEvent
          ? "Auffällig: Praxisprozess prüfen"
          : tone === "red"
            ? "Mehrfach ohne Schutz beobachten"
            : "Unauffällig beobachten",
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
  const profiles = useMemo(() => getRecurringRiskProfiles(standortId, importRows), [standortId, importRows]);
  const urgent = useMemo(() => profiles.filter((profile) => profile.tone === "red"), [profiles]);
  const total = useMemo(() => profiles.reduce((sum, profile) => sum + profile.total, 0), [profiles]);

  return (
    <div className="content-stack">
      {!compact && (
        <section className="priority-grid">
          <PriorityCard label="Wiederholer" value={String(profiles.length)} hint="Patienten mehrfach ohne Schutz" tone={urgent.length ? "red" : "amber"} />
          <PriorityCard label="Maßnahme nötig" value={String(urgent.length)} hint="bei Storno/Rückgabe oder hoher Wiederholung" tone="red" />
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
                    <div><dt>Auffälligkeiten</dt><dd>{profile.eventCount}</dd></div>
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
                    <th>Auffälligkeiten</th>
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
                      <td>{profile.eventCount}<span>{money.format(profile.eventAmount)}</span></td>
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
  const profiles = useMemo(() => patientProfilesFromImportRows(importRows, standort?.id), [importRows, standort?.id]);
  const counts = useMemo(() => ["A", "B", "C", "D"].map((grade) => ({
    grade,
    count: profiles.filter((profile) => profile.grade === grade).length
  })), [profiles]);
  const total = profiles.length || 1;

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
            info={patientClassInfo(grade, count, total)}
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
              {profiles.slice(0, 100).map((profile) => (
                <tr key={`${profile.locationName}-${profile.patientName}`}>
                  <td><StatusBadge status={`Klasse ${profile.grade}`} /></td>
                  <td><strong>{profile.patientName}</strong><span>Abr.-Nr. {profile.examples.join(", ") || "-"}</span></td>
                  <td>{profile.locationName}</td>
                  <td>{profile.claimCount}</td>
                  <td>{profile.badEventCount}</td>
                  <td>{profile.noProtectionCount}</td>
                  <td>{money.format(profile.riskAmount)}</td>
                  <td>{profile.badRate.toFixed(1)} %</td>
                  <td>{profile.recommendation}</td>
                </tr>
              ))}
              {!profiles.length && (
                <tr><td colSpan={9}>Keine Patientenklassifizierung im aktuellen Datenstand.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function OutcomeControlView({ standort, cases: rows, importRows = [], manualCaseResolutions = [] }: { standort?: Standort; cases: BfsCase[]; importRows?: ImportPreviewRow[]; manualCaseResolutions?: ManualCaseResolution[] }) {
  const outcomeRows = useMemo(() => outcomeRowsFromImportRows(importRows, standort?.id), [importRows, standort?.id]);
  const openItems = useMemo(() => openUnresolvedMovementsFromImportRows(importRows, standort?.id), [importRows, standort?.id]);
  const stornoReview = useMemo(() => stornoReviewFromImportRows(importRows, standort?.id, manualCaseResolutions), [importRows, standort?.id, manualCaseResolutions]);
  const totals = useMemo(() => outcomeRows.reduce((sum, row) => ({
    total: sum.total + row.total,
    reworked: sum.reworked + row.reworked,
    paid: sum.paid + row.paid,
    open: sum.open + row.open,
    amount: sum.amount + row.amount
  }), { total: 0, reworked: 0, paid: 0, open: 0, amount: 0 }), [outcomeRows]);
  const openAmount = openItems.length ? openItems.reduce((sum, item) => sum + item.amount, 0) : totals.amount;
  const successRate = totals.total ? Math.round((totals.paid / totals.total) * 100) : 0;

  return (
    <div className="content-stack">
      <section className="priority-grid">
        <PriorityCard label="Fälle im Blick" value={String(totals.total)} hint={standort ? standort.name : "alle Standorte"} tone="blue" />
        <PriorityCard label="Nachbearbeitet" value={String(totals.reworked)} hint="Neueinreichung oder Maßnahme erkannt" tone="amber" />
        <PriorityCard label="Bezahlt / erledigt" value={String(totals.paid)} hint={`${successRate} % Erfolgsquote`} tone="green" />
        <PriorityCard label="Storno erledigt" value={`${stornoReview.done}/${stornoReview.total}`} hint={`${stornoReview.doneRate.toFixed(0)} % Erledigungsquote`} tone={stornoReview.open ? "amber" : "green"} />
        <PriorityCard label="Noch offen" value={String(openItems.length || totals.open)} hint={money.format(openAmount)} tone={(openItems.length || totals.open) ? "red" : "green"} />
      </section>
      <StornoReviewSection review={stornoReview} />
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
              {outcomeRows.map((row) => (
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
              {!outcomeRows.length && (
                <tr><td colSpan={8}>Keine Maßnahmenkontrolle im aktuellen Datenstand.</td></tr>
              )}
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

function MatchesView({ cases: rows, importRows = [], standort }: { cases: BfsCase[]; importRows?: ImportPreviewRow[]; standort?: Standort }) {
  const scopedImportRows = useMemo(() => standort ? importRows.filter((row) => row.location === standort.name) : importRows, [standort, importRows]);
  const candidates = useMemo(() => resubmissionCandidatesFromImportRows(scopedImportRows), [scopedImportRows]);
  const scopeLabel = standort?.name ?? "Gruppe";
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
              <h2>Neueinreichungen nach Storno/Rückgabe {scopeLabel}</h2>
              <p>Automatisch erkannte Fälle im gewählten Standortumfang, bei denen ein Patient nach einer Storno- oder Rückgabe-Bewegung später wieder in einer Forderungsliste auftaucht.</p>
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
    <CasesView cases={matched} title="Neueinreichungsvorschläge" description="Keine automatisch erkannten Neueinreichungen im aktuellen Datenstand." />
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
          <button onClick={() => onNavigate("upload")}><FolderUp size={18} /> Import-Center</button>
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
  return (
    <div className="content-stack">
      <ImportHistorySummary rows={rows} />
      <ImportPreview rows={rows} />
    </div>
  );
}

function cloneStandorteForEditing() {
  return orderedStandorte().map((standort) => ({ ...standort, mandantNos: [...(standort.mandantNos ?? [standort.mandantNo])], locationHints: [...(standort.locationHints ?? [])] }));
}

function standorteDefaults() {
  return defaultStandorteSnapshot.map((snapshot) => ({
    ...standorte.find((standort) => standort.id === snapshot.id)!,
    ...snapshot,
    mandantNos: [...snapshot.mandantNos],
    locationHints: [...snapshot.locationHints]
  })).sort(compareStandorteByContractStart);
}

function applyStoredStandorteConfig() {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(locationConfigStorageKey);
  if (!raw) return;
  try {
    applyStandorteConfig(JSON.parse(raw) as ReturnType<typeof locationConfigSnapshot>[]);
  } catch {
    window.localStorage.removeItem(locationConfigStorageKey);
  }
}

function applyStandorteConfig(config: ReturnType<typeof locationConfigSnapshot>[]) {
  config.forEach((snapshot) => {
    const target = standorte.find((standort) => standort.id === snapshot.id);
    if (!target) return;
    const mandantNos = uniqueMandantNos(snapshot.mandantNos);
    Object.assign(target, {
      name: snapshot.name,
      praxisname: snapshot.praxisname,
      mandantNo: mandantNos[0] ?? target.mandantNo,
      mandantNos,
      locationHints: uniqueTextValues(snapshot.locationHints),
      goLiveDate: snapshot.goLiveDate,
      goLiveLabel: formatGermanDate(snapshot.goLiveDate)
    });
  });
  standorte.sort(compareStandorteByContractStart);
}

function locationConfigSnapshot(standort: Standort) {
  return {
    id: standort.id,
    name: standort.name,
    praxisname: standort.praxisname,
    mandantNo: standort.mandantNo,
    mandantNos: uniqueMandantNos(standort.mandantNos ?? [standort.mandantNo]),
    locationHints: uniqueTextValues(standort.locationHints ?? []),
    goLiveDate: standort.goLiveDate,
    goLiveLabel: formatGermanDate(standort.goLiveDate)
  };
}

function uniqueMandantNos(values: string[]) {
  return Array.from(new Set(values.map((value) => value.replace(/\D/g, "").trim()).filter(Boolean)));
}

function uniqueTextValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function formatGermanDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
}

function LocationsView({ onLocationsChange }: { onLocationsChange: () => void }) {
  const [drafts, setDrafts] = useState(() => cloneStandorteForEditing());
  const [message, setMessage] = useState("Änderungen werden lokal im Browser gespeichert und für die Standortzuordnung genutzt.");

  function updateLocation(id: string, patch: Partial<Standort>) {
    setDrafts((current) => current.map((standort) => standort.id === id ? { ...standort, ...patch } : standort));
  }

  function updateMandantNo(id: string, index: number, value: string) {
    setDrafts((current) => current.map((standort) => {
      if (standort.id !== id) return standort;
      const mandantNos = [...(standort.mandantNos ?? [standort.mandantNo])];
      mandantNos[index] = value.replace(/\D/g, "");
      return { ...standort, mandantNos, mandantNo: mandantNos[0] ?? "" };
    }));
  }

  function addMandantNo(id: string) {
    setDrafts((current) => current.map((standort) => standort.id === id ? { ...standort, mandantNos: [...(standort.mandantNos ?? [standort.mandantNo]), ""] } : standort));
  }

  function removeMandantNo(id: string, index: number) {
    setDrafts((current) => current.map((standort) => {
      if (standort.id !== id) return standort;
      const mandantNos = (standort.mandantNos ?? [standort.mandantNo]).filter((_, currentIndex) => currentIndex !== index);
      const fallbackMandantNos = mandantNos.length ? mandantNos : [standort.mandantNo];
      return { ...standort, mandantNos: fallbackMandantNos, mandantNo: fallbackMandantNos[0] ?? "" };
    }));
  }

  function resetLocations() {
    if (typeof window !== "undefined") window.localStorage.removeItem(locationConfigStorageKey);
    applyStandorteConfig(standorteDefaults());
    setDrafts(cloneStandorteForEditing());
    setMessage("Standortverwaltung wurde auf den Projektstandard zurückgesetzt.");
    onLocationsChange();
  }

  function saveLocations() {
    const cleaned = drafts.map((standort) => {
      const mandantNos = uniqueMandantNos(standort.mandantNos ?? [standort.mandantNo]);
      return {
        ...standort,
        mandantNo: mandantNos[0] ?? standort.mandantNo,
        mandantNos,
        goLiveLabel: formatGermanDate(standort.goLiveDate)
      };
    });
    applyStandorteConfig(cleaned);
    if (typeof window !== "undefined") window.localStorage.setItem(locationConfigStorageKey, JSON.stringify(cleaned.map(locationConfigSnapshot)));
    setDrafts(cloneStandorteForEditing());
    setMessage("Standorte und BFS-Mandantennummern wurden gespeichert.");
    onLocationsChange();
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Standorte verwalten</h2>
          <p>{message}</p>
        </div>
        <div className="topbar-actions">
          <button className="secondary-button" onClick={resetLocations}>Zurücksetzen</button>
          <button className="primary-button" onClick={saveLocations}>Speichern</button>
        </div>
      </div>
      <div className="location-editor-grid">
        {drafts.map((standort) => (
          <article className="location-editor-card" key={standort.id}>
            <div className="location-editor-head">
              <Building2 size={18} />
              <div>
                <strong>{standort.name}</strong>
                <span>{standort.praxisname}</span>
              </div>
              <StatusBadge status={isStandortLive(standort) ? `live seit ${formatGermanDate(standort.goLiveDate)}` : `geplant ab ${formatGermanDate(standort.goLiveDate)}`} />
            </div>
            <label>
              Standortname
              <input value={standort.name} onChange={(event) => updateLocation(standort.id, { name: event.target.value })} />
            </label>
            <label>
              Praxisname
              <input value={standort.praxisname} onChange={(event) => updateLocation(standort.id, { praxisname: event.target.value })} />
            </label>
            <label>
              Vertragsstart / Go-live
              <input type="date" value={standort.goLiveDate} onChange={(event) => updateLocation(standort.id, { goLiveDate: event.target.value, goLiveLabel: formatGermanDate(event.target.value) })} />
            </label>
            <div className="mandant-editor">
              <div>
                <strong>BFS-Mandantennummern</strong>
                <span>Hauptnummer zuerst, Aligner- und Zusatzkonten darunter.</span>
              </div>
              {(standort.mandantNos ?? [standort.mandantNo]).map((mandantNo, index) => (
                <div className="mandant-row" key={`${standort.id}-${index}`}>
                  <input inputMode="numeric" value={mandantNo} placeholder="z.B. 19260" onChange={(event) => updateMandantNo(standort.id, index, event.target.value)} />
                  <button className="secondary-button" onClick={() => removeMandantNo(standort.id, index)} disabled={(standort.mandantNos ?? [standort.mandantNo]).length <= 1}>Entfernen</button>
                </div>
              ))}
              <button className="secondary-button" onClick={() => addMandantNo(standort.id)}>Mandant-Nr. hinzufügen</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

type ManagedUser = {
  id: string;
  email: string;
  fullName?: string | null;
  role: AppRole;
  active: boolean;
  mustChangePassword: boolean;
  standortIds: string[];
};

function UsersView() {
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Nutzer werden aus Supabase geladen.");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("standortleitung");
  const [standortId, setStandortId] = useState(standorte[0]?.id ?? "");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users");
      const body = await response.json().catch(() => null) as { users?: ManagedUser[]; error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Nutzer konnten nicht geladen werden.");
      setManagedUsers(body?.users ?? []);
      setMessage("Admins legen Nutzer mit temporärem Passwort an. Beim ersten Login muss der Nutzer ein eigenes Passwort setzen.");
    } catch (error) {
      setManagedUsers([]);
      setMessage(error instanceof Error ? error.message : "Nutzer konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          fullName,
          role,
          active: true,
          temporaryPassword,
          standortIds: role === "standortleitung" ? [standortId] : []
        })
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Nutzer konnte nicht angelegt werden.");
      setEmail("");
      setFullName("");
      setTemporaryPassword("");
      setMessage("Nutzer wurde angelegt. Das temporäre Passwort muss dem Nutzer intern mitgeteilt werden.");
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nutzer konnte nicht angelegt werden.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: ManagedUser) {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: !user.active, role: user.role, standortIds: user.standortIds })
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Status konnte nicht geändert werden.");
      setMessage(!user.active ? "Nutzer wurde aktiviert." : "Nutzer wurde deaktiviert.");
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Status konnte nicht geändert werden.");
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Nutzer</h2>
          <p>{message}</p>
        </div>
      </div>
      <form className="user-admin-form" onSubmit={createUser}>
        <label>
          Name
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Vorname Nachname" />
        </label>
        <label>
          E-Mail
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required placeholder="name@orisus.de" />
        </label>
        <label>
          Rolle
          <select value={role} onChange={(event) => setRole(event.target.value as AppRole)}>
            <option value="standortleitung">Standortleitung</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </label>
        <label>
          Standort
          <select value={standortId} onChange={(event) => setStandortId(event.target.value)} disabled={role === "super_admin"}>
            {orderedStandorte().map((standort) => <option key={standort.id} value={standort.id}>{standort.name}</option>)}
          </select>
        </label>
        <label>
          Temporäres Passwort
          <input value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} type="text" required minLength={8} placeholder="mind. 8 Zeichen" />
        </label>
        <button className="primary-button" type="submit" disabled={saving}>
          <Users size={16} /> {saving ? "Wird angelegt" : "Nutzer anlegen"}
        </button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>E-Mail</th><th>Rolle</th><th>Standort</th><th>Status</th><th>Aktion</th></tr></thead>
          <tbody>
            {managedUsers.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.fullName || "-"}</strong></td>
                <td>{user.email}</td>
                <td>{user.role === "super_admin" ? "Super Admin" : "Standortleitung"}</td>
                <td>{user.role === "super_admin" ? "alle Standorte" : user.standortIds.map(locationNameForId).join(", ") || "-"}</td>
                <td>
                  <div className="status-stack">
                    <StatusBadge status={user.active ? "aktiv" : "inaktiv"} />
                    {user.mustChangePassword && <StatusBadge status="Passwortwechsel offen" />}
                  </div>
                </td>
                <td>
                  <button className="secondary-button" onClick={() => toggleActive(user)} type="button">
                    {user.active ? "Deaktivieren" : "Aktivieren"}
                  </button>
                </td>
              </tr>
            ))}
            {!managedUsers.length && !loading && (
              <tr><td colSpan={6}>Noch keine Nutzer vorhanden.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function locationNameForId(id: string) {
  return standorte.find((standort) => standort.id === id)?.name ?? id;
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

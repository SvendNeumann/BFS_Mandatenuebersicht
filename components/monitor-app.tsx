"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
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
  TrendingUp,
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
import type { AppRole, BfsCase, ImportPreviewRow, ParsedImportClaim, ParsedImportMovement, ParsedInvoiceDocument, ParsedInvoiceStatusDocument, ParsedInvoiceStatusRow, RiskClaim, Standort } from "@/lib/types";
import { createCasesCsv, downloadTextFile } from "@/lib/reporting";
import { enablePasskey, getCurrentSession, getStoredSession, hasSavedPasskey, logout, removePasskey, type DemoSession } from "@/lib/auth";
import { importRowBusinessIdentity, isBfsPdfUploadFile, parseDemoImportFiles, reconcileImportRows } from "@/lib/demo-import";
import { isInvoicePdfUploadFile, parseInvoiceUploadFiles } from "@/lib/invoice-parser";
import { isInvoiceStatusPdfUploadFile, parseInvoiceStatusUploadFiles } from "@/lib/invoice-status-parser";
import { buildCancelledResolutionKeySet, buildClosedResolutionKeySet, buildPaidResolutionKeySet, caseResolutionKeyFromParts, caseResolutionKeys } from "@/lib/case-resolution";

const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
const exactMoney = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const integerNumber = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
const percentNumber = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});
const feeRateNumber = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const formatPercent = (value: number) => `${percentNumber.format(Number.isFinite(value) ? value : 0)} %`;
const formatFeeRate = (value: number) => `${feeRateNumber.format(Number.isFinite(value) ? value : 0)} %`;
const defaultStandorteSnapshot = standorte.map(locationConfigSnapshot);
const locationConfigStorageKey = "orisus_bfs_monitor_locations";
const viewStateStorageKey = "orisus_bfs_monitor_view_state";

type NavItem = readonly [string, string, LucideIcon];
type NavSection = {
  title: string;
  items: NavItem[];
};

type NavGroup = {
  title: string;
  sections: NavSection[];
};

const superAdminNavGroups: NavGroup[] = [
  {
    title: "BFS-Abrechnungen",
    sections: [
      {
        title: "Management",
        items: [
          ["custom", "Zusammenfassung", BarChart3],
          ["dashboard", "Management Cockpit", LayoutDashboard],
          ["answers", "Schnellantworten", ClipboardList]
        ]
      },
      {
        title: "Analyse & Benchmarking",
        items: [
          ["benchmark", "Standorte", Building2],
          ["claims", "Standortdetails", ReceiptText],
          ["cashflow", "Forderungen und Geldfluss", CircleDollarSign],
          ["quality", "Forderungsqualität", ShieldCheck],
          ["patientClasses", "Patientenklassifizierung", Users]
        ]
      },
      {
        title: "Operative Fallarbeit",
        items: [
          ["practiceFollowup", "Praxis nachfassen", AlertCircle],
          ["economicCheck", "Zahlung / Grund prüfen", ClipboardCheck],
          ["matches", "Neueinreichung / Matching", RefreshCw]
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
          ["upload", "Import-Center Abrechnung", FolderUp]
        ]
      }
    ]
  },
  {
    title: "BFS-Rechnungsanalyse",
    sections: [
      {
        title: "Auswertungen",
        items: [
          ["invoiceServices", "Leistungsübersicht", BarChart3],
          ["invoicePotential", "Potenzialanalyse", TrendingUp],
          ["invoiceLocations", "Standortvergleich", Building2]
        ]
      },
      {
        title: "Import & Prüfung",
        items: [
          ["invoiceImport", "Import-Center Rechnungen", FolderUp]
        ]
      }
    ]
  },
  {
    title: "Administration",
    sections: [
      {
        title: "Admin Bereich",
        items: [
          ["locations", "Standorte", Building2],
          ["users", "Nutzer & Rollen", Users],
          ["settings", "Sicherheit & Regeln", Settings]
        ]
      }
    ]
  }
];

const leadNavGroups: NavGroup[] = [
  {
    title: "BFS-Abrechnungen",
    sections: [
      {
        title: "Mein Standort",
        items: [
          ["custom", "Zusammenfassung", BarChart3],
          ["dashboard", "Management Cockpit", LayoutDashboard],
          ["answers", "Schnellantworten", ClipboardList]
        ]
      },
      {
        title: "Analyse",
        items: [
          ["claims", "Standortdetails", ReceiptText],
          ["cashflow", "Forderungen und Geldfluss", CircleDollarSign],
          ["quality", "Forderungsqualität", ShieldCheck],
          ["patientClasses", "Patientenklassifizierung", Users]
        ]
      },
      {
        title: "Operative Fallarbeit",
        items: [
          ["practiceFollowup", "Praxis nachfassen", AlertCircle],
          ["economicCheck", "Zahlung / Grund prüfen", ClipboardCheck],
          ["matches", "Neueinreichung / Matching", RefreshCw]
        ]
      },
      {
        title: "Reports",
        items: [
          ["reports", "Report-Center", FileText],
          ["outcomes", "Maßnahmenkontrolle", ClipboardCheck]
        ]
      }
    ]
  },
  {
    title: "BFS-Rechnungsanalyse",
    sections: [
      {
        title: "Auswertungen",
        items: [
          ["invoiceServices", "Leistungsübersicht", BarChart3],
          ["invoicePotential", "Potenzialanalyse", TrendingUp],
          ["invoiceLocations", "Standortvergleich", Building2]
        ]
      },
      {
        title: "Import & Prüfung",
        items: [
          ["invoiceImport", "Import-Center Rechnungen", FolderUp]
        ]
      }
    ]
  },
  {
    title: "Administration",
    sections: [
      {
        title: "Mein Profil",
        items: [
          ["settings", "Mein Profil & Sicherheit", UserRoundCheck]
        ]
      }
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
  status: "paid_manual" | "open_manual" | "cancelled_manual";
  comment: string;
  resolvedAt: string;
  resolvedBy: string;
};

type ViewHistoryEntry = {
  activeView: string;
  selectedStandortId: string;
};

export default function MonitorApp({ lockedRole, initialView = "dashboard", requireAuth = true }: MonitorAppProps) {
  const [session, setSession] = useState<DemoSession | null>(() => getStoredSession());
  const [sessionChecked, setSessionChecked] = useState(false);
  const [appDataLoaded, setAppDataLoaded] = useState(() => loadStoredImportRows().length > 0);
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
  const [viewHistory, setViewHistory] = useState<ViewHistoryEntry[]>([]);
  const [liveImportRows, setLiveImportRows] = useState<ImportPreviewRow[]>(() => loadStoredImportRows());
  const [invoiceRows, setInvoiceRows] = useState<ParsedInvoiceDocument[]>([]);
  const [invoiceStatusDocuments, setInvoiceStatusDocuments] = useState<ParsedInvoiceStatusDocument[]>([]);
  const [manualCaseResolutions, setManualCaseResolutions] = useState<ManualCaseResolution[]>([]);
  const [invoiceRowsLoaded, setInvoiceRowsLoaded] = useState(false);
  const [invoiceStatusLoaded, setInvoiceStatusLoaded] = useState(false);
  const [caseResolutionsLoaded, setCaseResolutionsLoaded] = useState(false);
  const [caseToResolve, setCaseToResolve] = useState<BfsCase | null>(null);
  const [caseResolutionMode, setCaseResolutionMode] = useState<ManualCaseResolution["status"]>("paid_manual");
  const [caseResolveError, setCaseResolveError] = useState("");
  const [caseResolveSaving, setCaseResolveSaving] = useState(false);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const permittedStandorte = useMemo(() => permittedStandorteForRole(role, session), [role, session]);
  const selectedStandort = permittedStandorte.find((standort) => standort.id === selectedStandortId) ?? permittedStandorte[0] ?? standorte[0];
  const isGroupScope = role === "super_admin" && selectedStandortId === "gruppe";
  const privacyScopedImportRows = useMemo(() => scopeImportRowsForRole(liveImportRows, role, permittedStandorte), [liveImportRows, role, permittedStandorte]);
  const hasAssignedStandort = role === "super_admin" || permittedStandorte.length > 0;
  const hasUploadData = privacyScopedImportRows.length > 0;
  const invoiceStatusRows = useMemo(() => invoiceStatusDocuments.flatMap((document) => document.rows), [invoiceStatusDocuments]);
  const emptyDataAllowedViews = ["upload", "preview", "history", "invoiceImport", "invoiceServices", "invoicePotential", "invoiceLocations", "locations", "users", "settings"];
  const groupLevelViews = ["custom", "answers", "benchmark", "claims", "cashflow", "cases", "practiceFollowup", "economicCheck", "matches", "patientClasses", "reports", "locations", "users", "upload", "preview", "history", "invoiceImport", "invoiceServices", "invoicePotential", "invoiceLocations"];
  const pageScopeLabel = role === "super_admin" && (isGroupScope || groupLevelViews.includes(activeView))
    ? "Alle Standorte"
    : selectedStandort.name;
  const showNoUploadData = !hasUploadData && !emptyDataAllowedViews.includes(activeView);
  const appCases = useMemo(() => {
    const resolvedKeys = buildClosedResolutionKeySet(manualCaseResolutions);
    return applyInvoiceStatusToCases(
      casesFromImportRows(privacyScopedImportRows).filter((fall) => !caseResolutionKeys(fall).some((key) => resolvedKeys.has(key))),
      invoiceStatusRows
    );
  }, [privacyScopedImportRows, manualCaseResolutions, invoiceStatusRows]);
  const visibleCases = useMemo(
    () => appCases.filter((fall) => isGroupScope || fall.standortId === selectedStandort.id),
    [appCases, isGroupScope, selectedStandort.id]
  );
  const navGroups = role === "super_admin" ? superAdminNavGroups : leadNavGroups;
  const nav = flattenNavGroups(navGroups);

  useEffect(() => {
    let active = true;
    let initialDataVisible = false;
    const showAppWithAvailableData = () => {
      if (!active || initialDataVisible) return;
      initialDataVisible = true;
      setAppDataLoaded(true);
    };
    const fallbackTimer = window.setTimeout(showAppWithAvailableData, 1600);
    getCurrentSession()
      .then((currentSession) => {
        if (active) setSession(currentSession);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setSessionChecked(true);
      });
    applyStoredStandorteConfig();
    setLocationConfigVersion((version) => version + 1);
    loadStoredImportRowsFromBrowser()
      .then((rows) => {
        if (!active) return;
        if (rows.length) setLiveImportRows(rows);
        if (rows.length) {
          window.clearTimeout(fallbackTimer);
          showAppWithAvailableData();
        }
      })
      .catch(() => undefined);
    loadStoredImportRowsFromServer()
      .then((rows) => {
        if (!active) return;
        setLiveImportRows(rows);
        window.clearTimeout(fallbackTimer);
        showAppWithAvailableData();
        if (rows.length) void storeImportRows(rows).catch(() => undefined);
      })
      .catch(() => {
        window.clearTimeout(fallbackTimer);
        showAppWithAvailableData();
      });
    loadManualCaseResolutions()
      .then((resolutions) => {
        if (active) setManualCaseResolutions(resolutions);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setCaseResolutionsLoaded(true);
      });
    loadConfirmedInvoiceRows()
      .then((rows) => {
        if (active) setInvoiceRows(rows);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setInvoiceRowsLoaded(true);
      });
    loadConfirmedInvoiceStatusDocuments()
      .then((documents) => {
        if (active) setInvoiceStatusDocuments(documents);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setInvoiceStatusLoaded(true);
      });
    return () => {
      active = false;
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [activeView]);

  useEffect(() => {
    if (!isKnownViewForRole(activeView, role)) {
      setActiveView("dashboard");
    }
  }, [activeView, role]);

  useEffect(() => {
    if (role !== "super_admin" && permittedStandorte.length && !permittedStandorte.some((standort) => standort.id === selectedStandortId)) {
      setSelectedStandortId(permittedStandorte[0].id);
      return;
    }
    writeStoredViewState(activeView, selectedStandortId, role);
  }, [activeView, selectedStandortId, role, permittedStandorte]);

  if (requireAuth && !session && !sessionChecked) {
    return <AppLoadingScreen title="Anmeldung wird geprüft" message="Die Session wird validiert und der Datenstand vorbereitet." />;
  }

  if (requireAuth && !session) {
    return <AccessGate title="Login erforderlich" message="Bitte melde dich an, um diesen geschützten Bereich zu öffnen." />;
  }

  if (requireAuth && lockedRole && session?.role !== lockedRole) {
    return <AccessGate title="Kein Zugriff auf diesen Bereich." message="Dieser Bereich ist für deine Rolle nicht freigegeben." />;
  }

  if (requireAuth && role === "standortleitung" && sessionChecked && !hasAssignedStandort) {
    return <AccessGate title="Kein Standort zugeordnet." message="Deinem Nutzer ist aktuell kein Standort freigegeben. Bitte die Nutzerverwaltung prüfen." />;
  }

  if (!appDataLoaded || !caseResolutionsLoaded || !invoiceRowsLoaded || !invoiceStatusLoaded) {
    return <AppLoadingScreen title="Dashboard wird geladen" message="Importdaten, Rechnungen, Fallstände, Saldo-Status und Standortfilter werden synchronisiert." />;
  }

  function toggleNavSection(title: string) {
    setExpandedSections((current) => current[title] ? {} : { [title]: true });
  }

  function navigateTo(key: string) {
    if (key !== activeView) pushCurrentViewToHistory();
    setActiveView(key);
    setMobileNavOpen(false);
    openNavSectionForView(key);
    scrollToPageStart();
  }

  function goToCockpit() {
    if (!(activeView === "dashboard" && (role !== "super_admin" || selectedStandortId === "gruppe"))) pushCurrentViewToHistory();
    if (role === "super_admin") setSelectedStandortId("gruppe");
    setActiveView("dashboard");
    setMobileNavOpen(false);
    openNavSectionForView("dashboard");
    scrollToPageStart();
  }

  function pushCurrentViewToHistory() {
    setViewHistory((current) => {
      const entry = { activeView, selectedStandortId };
      const last = current[current.length - 1];
      if (last?.activeView === entry.activeView && last.selectedStandortId === entry.selectedStandortId) return current;
      return [...current, entry].slice(-20);
    });
  }

  function goBackInApp() {
    const previous = viewHistory[viewHistory.length - 1];
    if (!previous) return;
    setViewHistory((current) => current.slice(0, -1));
    const nextStandortId = role !== "super_admin" && previous.selectedStandortId === "gruppe"
      ? permittedStandorte[0]?.id ?? selectedStandort.id
      : previous.selectedStandortId;
    setSelectedStandortId(isKnownStandortScopeForRole(nextStandortId, role) ? nextStandortId : role === "super_admin" ? "gruppe" : permittedStandorte[0]?.id ?? selectedStandort.id);
    setActiveView(isKnownViewForRole(previous.activeView, role) ? previous.activeView : "dashboard");
    setMobileNavOpen(false);
    openNavSectionForView(previous.activeView);
    scrollToPageStart();
  }

  function scrollToPageStart() {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      workspaceRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
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

  function cancelCaseFinally(fall: BfsCase) {
    setCaseResolutionMode("cancelled_manual");
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
      setCaseResolveError(error instanceof Error ? error.message : "Der Klärfall konnte nicht gespeichert werden.");
    } finally {
      setCaseResolveSaving(false);
    }
  }

  async function resolveResubmissionCandidate(candidate: ResubmissionCandidate, status: "paid_manual" | "cancelled_manual") {
    const resolution = await saveManualCaseResolution(resubmissionCandidateToCase(candidate), status);
    setManualCaseResolutions((current) => [resolution, ...current.filter((entry) => entry.caseKey !== resolution.caseKey)]);
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

  const tabFilterStandort = role === "super_admin" ? undefined : selectedStandort;
  const operativeCases = (role === "super_admin" ? appCases : visibleCases).filter(isPracticeFollowupCase);

  return (
    <main className={mobileNavOpen ? "app-shell nav-open" : "app-shell"}>
      <button className="mobile-nav-overlay" aria-label="Navigation schließen" onClick={() => setMobileNavOpen(false)} />
      <aside className="sidebar">
        <div className="sidebar-inner">
          <div className="sidebar-top">
            <button type="button" className="brand brand-button" onClick={goToCockpit} aria-label="Zum Management Cockpit">
              <Image className="orisus-wordmark" src="/orisus-zahnmedizin-transparent.png" alt="Orisus Zahnmedizin" width={1859} height={557} priority />
            </button>
            <button className="drawer-close" aria-label="Navigation schließen" onClick={() => setMobileNavOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <nav>
            {navGroups.map((group) => (
              <div className="nav-group" key={group.title}>
                <span className="nav-group-label">{group.title}</span>
                {group.sections.map((section) => {
                  const sectionActive = section.items.some(([key]) => activeView === key);
                  const sectionExpanded = Boolean(expandedSections[section.title]);
                  const SectionIcon = section.items[0][2];
                  return (
                    <div className={sectionExpanded ? "nav-section expanded" : "nav-section"} key={`${group.title}-${section.title}`}>
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
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-box">
              <UserRoundCheck size={18} />
              <div>
                <strong>{role === "super_admin" ? "Orisus BFS Monitor" : selectedStandort.name}</strong>
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

      <section className="workspace" ref={workspaceRef}>
        <header className="topbar">
          <button type="button" className="mobile-app-brand" onClick={goToCockpit} aria-label="Zum Management Cockpit">
            <Image className="orisus-wordmark" src="/orisus-zahnmedizin-transparent.png" alt="Orisus Zahnmedizin" width={1859} height={557} priority />
          </button>
          <button className="mobile-menu-button" aria-label="Navigation öffnen" onClick={() => setMobileNavOpen(true)}>
            <Menu size={18} />
          </button>
          <div className="topbar-title desktop-page-title">
            <span className="eyebrow">{pageScopeLabel}</span>
            <h1>{titleFor(activeView)}</h1>
          </div>
        </header>
        <div className="mobile-page-heading">
          <div>
            <span className="eyebrow">{pageScopeLabel}</span>
            <h1>{titleFor(activeView)}</h1>
          </div>
        </div>

        {showNoUploadData ? (
          <NoUploadDataView onUpload={() => navigateTo("upload")} />
        ) : (
          <>
            {activeView === "dashboard" && (
              role === "super_admin" && isGroupScope
                ? <GroupDashboard onNavigate={navigateTo} importRows={privacyScopedImportRows} manualCaseResolutions={manualCaseResolutions} invoiceStatusRows={invoiceStatusRows} />
                : <LocationDashboard standort={selectedStandort} cases={visibleCases} onNavigate={navigateTo} onScopeChange={setSelectedStandortId} importRows={privacyScopedImportRows} peerImportRows={liveImportRows} manualCaseResolutions={manualCaseResolutions} />
            )}
            {activeView === "custom" && <CustomKpiView standort={role === "super_admin" ? undefined : selectedStandort} importRows={privacyScopedImportRows} manualCaseResolutions={manualCaseResolutions} invoiceStatusRows={invoiceStatusRows} />}
            {activeView === "answers" && <AnswerCockpit scope={role === "super_admin" ? "group" : "location"} standort={tabFilterStandort} cases={operativeCases} onNavigate={navigateTo} importRows={privacyScopedImportRows} manualCaseResolutions={manualCaseResolutions} invoiceStatusRows={invoiceStatusRows} />}
            {activeView === "benchmark" && role === "super_admin" && <BenchmarkView importRows={privacyScopedImportRows} manualCaseResolutions={manualCaseResolutions} invoiceStatusRows={invoiceStatusRows} />}
            {activeView === "quality" && <QualityView standort={tabFilterStandort} importRows={privacyScopedImportRows} manualCaseResolutions={manualCaseResolutions} invoiceStatusRows={invoiceStatusRows} />}
            {activeView === "claims" && <ClaimsFlowView mode="details" standort={tabFilterStandort} cases={operativeCases} importRows={privacyScopedImportRows} manualCaseResolutions={manualCaseResolutions} invoiceStatusRows={invoiceStatusRows} />}
            {activeView === "cashflow" && <ClaimsFlowView mode="cashflow" standort={tabFilterStandort} cases={operativeCases} importRows={privacyScopedImportRows} manualCaseResolutions={manualCaseResolutions} invoiceStatusRows={invoiceStatusRows} />}
            {["upload", "preview", "history"].includes(activeView) && <UploadView liveRows={liveImportRows} onRowsChange={setLiveImportRows} statusDocuments={invoiceStatusDocuments} onStatusDocumentsChange={setInvoiceStatusDocuments} />}
            {activeView === "invoiceImport" && <InvoiceImportView invoiceRows={invoiceRows} onRowsChange={setInvoiceRows} />}
            {activeView === "invoiceServices" && <InvoiceServicesView invoiceRows={invoiceRows} />}
            {activeView === "invoicePotential" && <InvoicePotentialView invoiceRows={invoiceRows} />}
            {activeView === "invoiceLocations" && <InvoiceLocationsView invoiceRows={invoiceRows} />}
            {(activeView === "cases" || activeView === "practiceFollowup") && (
              <CasesView
                title="Praxis nachfassen"
                description="Rückgaben ohne Ausfallschutz und echte Praxis-Aufgaben. Diese Beträge sind bei BFS nicht mehr abgesichert; die Praxis muss Zahlung oder Klärung selbst nachhalten."
                cases={(role === "super_admin" ? appCases : visibleCases).filter(isPracticeFollowupCase)}
                onResolvePaid={resolveCaseAsPaid}
                onCancelFinal={cancelCaseFinally}
              />
            )}
            {activeView === "economicCheck" && (
              <EconomicCheckView
                rows={invoiceStatusRows}
                importRows={privacyScopedImportRows}
                standort={tabFilterStandort}
                manualCaseResolutions={manualCaseResolutions}
                onResolvePaid={resolveCaseAsPaid}
                onCancelFinal={cancelCaseFinally}
              />
            )}
            {activeView === "risks" && <RiskView standortId={tabFilterStandort?.id} importRows={privacyScopedImportRows} />}
            {activeView === "repeatRisks" && <RecurringRiskView standortId={tabFilterStandort?.id} importRows={privacyScopedImportRows} />}
            {activeView === "patientClasses" && <PatientClassificationView standort={role === "super_admin" ? undefined : selectedStandort} importRows={privacyScopedImportRows} />}
            {activeView === "matches" && <MatchesView importRows={privacyScopedImportRows} standort={tabFilterStandort} manualCaseResolutions={manualCaseResolutions} onResolveCandidate={resolveResubmissionCandidate} />}
            {activeView === "reports" && <ReportsView role={role} standort={selectedStandort} cases={appCases.filter(isPracticeFollowupCase)} importRows={privacyScopedImportRows} invoiceStatusRows={invoiceStatusRows} manualCaseResolutions={manualCaseResolutions} />}
            {activeView === "outcomes" && <OutcomeControlView standort={tabFilterStandort} importRows={privacyScopedImportRows} manualCaseResolutions={manualCaseResolutions} />}
            {activeView === "groupReports" && (isGroupScope ? <GroupReportsView onNavigate={navigateTo} /> : <ReportsView role={role} standort={selectedStandort} cases={appCases} importRows={privacyScopedImportRows} manualCaseResolutions={manualCaseResolutions} />)}
            {activeView === "locations" && <LocationsView onLocationsChange={() => setLocationConfigVersion((version) => version + 1)} />}
            {activeView === "users" && <UsersView />}
            {activeView === "settings" && <SettingsView />}
          </>
        )}
      </section>
      {viewHistory.length > 0 && (
        <button type="button" className="app-back-button" onClick={goBackInApp}>
          <ArrowLeft size={18} />
          Zurück
        </button>
      )}
      {caseToResolve && (
        <div className="case-resolution-overlay" role="dialog" aria-modal="true" aria-label="Klärfall bearbeiten">
          <button className="confirmation-backdrop" aria-label="Dialog schließen" onClick={closeResolveCaseDialog} />
          <section className="confirmation-dialog case-resolution-dialog">
            <div className="case-resolution-icon"><CheckCircle2 size={24} /></div>
            <h2>{caseResolutionDialogTitle(caseResolutionMode)}</h2>
            <p>
              {caseResolutionDialogText(caseResolutionMode, caseToResolve.patientName)}
            </p>
            <dl>
              <div><dt>Standort</dt><dd>{caseToResolve.locationName}</dd></div>
              <div><dt>Betrag</dt><dd>{exactMoney.format(caseToResolve.amount)}</dd></div>
              <div><dt>Grund</dt><dd>{caseToResolve.reason}</dd></div>
              <div><dt>Re.-Nr.</dt><dd>{caseToResolve.invoiceNo}</dd></div>
            </dl>
            {caseResolveError && <p className="case-resolution-error">{caseResolveError}</p>}
            <div className="case-resolution-actions">
              <button className="secondary-button" disabled={caseResolveSaving} onClick={closeResolveCaseDialog}>
                Abbrechen
              </button>
              <button className="primary-button" disabled={caseResolveSaving} onClick={() => void confirmResolveCaseAsPaid()}>
                <CheckCircle2 size={16} /> {caseResolveSaving ? "Speichern..." : caseResolutionDialogAction(caseResolutionMode)}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function permittedStandorteForRole(role: AppRole, session: DemoSession | null) {
  if (role === "super_admin") return orderedStandorte();
  const assigned = new Set(session?.standortIds ?? []);
  return orderedStandorte(standorte.filter((standort) => assigned.has(standort.id)));
}

function scopeImportRowsForRole(rows: ImportPreviewRow[], role: AppRole, permittedStandorte: Standort[]) {
  if (role === "super_admin") return rows;
  const permittedNames = new Set(permittedStandorte.map((standort) => standort.name));
  return rows.filter((row) => permittedNames.has(row.location));
}

function NoUploadDataView({ onUpload }: { onUpload: () => void }) {
  return (
    <section className="panel empty-data-panel">
      <HardDriveUpload size={28} />
      <div>
        <span className="eyebrow">Keine Importdaten</span>
        <h2>Datenupload zurückgesetzt</h2>
        <p>Aktuell sind keine BFS-Abrechnungen im Datenstand. Deshalb werden Cockpit, Auswertungen, Praxis-Nachfassen, Risiko, Matching und Reports erst wieder befüllt, sobald ein neuer Upload verarbeitet wurde.</p>
      </div>
      <div className="case-summary-grid" aria-label="Leerer Datenstand">
        <article><span>Dateien</span><strong>0</strong></article>
        <article><span>Umsatz eingereicht</span><strong>{money.format(0)}</strong></article>
        <article><span>Praxis nachfassen</span><strong>0</strong></article>
        <article><span>Rückgaben/Stornos</span><strong>0</strong></article>
      </div>
      <button className="primary-button" onClick={onUpload}>
        <FolderUp size={16} /> Zum Import-Center Abrechnung
      </button>
    </section>
  );
}

function AppLoadingScreen({ title, message }: { title: string; message: string }) {
  return (
    <main className="app-loading-shell" aria-live="polite" aria-busy="true">
      <section className="app-loading-card">
        <Image className="app-loading-logo" src="/orisus-zahnmedizin-transparent.png" alt="Orisus Zahnmedizin" width={1859} height={557} priority />
        <div>
          <span className="eyebrow">Orisus BFS Monitor</span>
          <h1>{title}</h1>
          <p>{message}</p>
        </div>
        <div className="app-loading-bar" aria-hidden="true">
          <span />
        </div>
      </section>
    </main>
  );
}

function AccessGate({ title, message }: { title: string; message: string }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand mini-brand">
          <Image className="brand-mark" src="/orisus-bfs-mark.svg" alt="Orisus BFS Monitor" width={48} height={48} />
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

function flattenNavGroups(groups: NavGroup[]) {
  return groups.flatMap((group) => group.sections);
}

function isKnownView(view: string) {
  return view === "cases" || [...flattenNavGroups(superAdminNavGroups), ...flattenNavGroups(leadNavGroups)].some((section) => section.items.some(([key]) => key === view));
}

function isKnownViewForRole(view: string, role: AppRole) {
  if (view === "cases") return true;
  const nav = flattenNavGroups(role === "super_admin" ? superAdminNavGroups : leadNavGroups);
  return nav.some((section) => section.items.some(([key]) => key === view));
}

function isKnownStandortScope(standortId: string) {
  return standortId === "gruppe" || standorte.some((standort) => standort.id === standortId);
}

function isKnownStandortScopeForRole(standortId: string, role: AppRole) {
  if (role !== "super_admin" && standortId === "gruppe") return false;
  return isKnownStandortScope(standortId);
}

function titleFor(view: string) {
  const titles: Record<string, string> = {
    dashboard: "Management Cockpit",
    custom: "Zusammenfassung",
    answers: "Schnellantworten",
    benchmark: "Standorte",
    quality: "Forderungsqualität",
    claims: "Standortdetails",
    cashflow: "Forderungen und Geldfluss",
    upload: "Import-Center Abrechnung",
    preview: "Import-Center Abrechnung",
    history: "Import-Center Abrechnung",
    invoiceImport: "Import-Center Rechnungen",
    invoiceServices: "Leistungsübersicht",
    invoicePotential: "Potenzialanalyse",
    invoiceLocations: "Standortvergleich",
    cases: "Praxis nachfassen",
    practiceFollowup: "Praxis nachfassen",
    economicCheck: "Zahlung / Grund prüfen",
    risks: "Laufend ohne Ausfallschutz",
    repeatRisks: "Wiederholer ohne Ausfallschutz",
    patientClasses: "Patientenklassifizierung",
    matches: "Neueinreichung / Matching",
    reports: "Report-Center",
    outcomes: "Maßnahmenkontrolle",
    groupReports: "Gruppenreports",
    locations: "Standorte",
    users: "Nutzerverwaltung",
    settings: "Einstellungen"
  };
  return titles[view] ?? "Orisus BFS Monitor";
}

function caseResolutionDialogTitle(status: ManualCaseResolution["status"]) {
  if (status === "cancelled_manual") return "Fall endgültig stornieren?";
  if (status === "open_manual") return "Fall weiterhin offen lassen?";
  return "Fall als bezahlt markieren?";
}

function caseResolutionDialogText(status: ManualCaseResolution["status"], patientName: string) {
  if (status === "cancelled_manual") {
    return `${patientName} wird als endgültig storniert gespeichert. Der Vorgang wird danach aus Praxis-Nachfassen und Neueinreichungsprüfung ausgeblendet, bleibt aber als Brutto-Storno in den Storno-Auswertungen enthalten.`;
  }
  if (status === "open_manual") {
    return `${patientName} wird als geprüft, aber weiterhin offen gespeichert. Der Vorgang bleibt als Praxis-Nachfassfall sichtbar, wenn die Praxis noch Zahlung oder Klärung nachhalten muss.`;
  }
  return `${patientName} wird als wirtschaftlich geklärt/bezahlt gespeichert. Der Vorgang wird danach aus Praxis-Nachfassen ausgeblendet und als bezahlt in den Auswertungen berücksichtigt.`;
}

function caseResolutionDialogAction(status: ManualCaseResolution["status"]) {
  if (status === "cancelled_manual") return "Endgültig stornieren";
  if (status === "open_manual") return "Weiterhin offen speichern";
  return "Als bezahlt markieren";
}

function CustomKpiView({ standort, importRows, manualCaseResolutions = [], invoiceStatusRows = [] }: { standort?: Standort; importRows: ImportPreviewRow[]; manualCaseResolutions?: ManualCaseResolution[]; invoiceStatusRows?: ParsedInvoiceStatusRow[] }) {
  const exportRef = useRef<HTMLDivElement | null>(null);
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const chartPeriodOptions = useMemo(() => buildCustomChartPeriods(), []);
  const [periodId, setPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [standortFilterId, setStandortFilterId] = useState(() => standort?.id ?? "alle");
  const [chartPeriodId, setChartPeriodId] = useState(() => defaultPeriodId(chartPeriodOptions));
  const [chartStandortFilterId, setChartStandortFilterId] = useState(() => standort?.id ?? "alle");
  const [benchmarkPeriodId, setBenchmarkPeriodId] = useState(() => defaultPeriodId(chartPeriodOptions));
  const selectedPeriod = useMemo(
    () => periodOptions.find((period) => period.id === periodId) ?? periodOptions[0],
    [periodOptions, periodId]
  );
  const selectedChartPeriod = useMemo(
    () => chartPeriodOptions.find((period) => period.id === chartPeriodId) ?? chartPeriodOptions[0],
    [chartPeriodOptions, chartPeriodId]
  );
  const selectedBenchmarkPeriod = useMemo(
    () => chartPeriodOptions.find((period) => period.id === benchmarkPeriodId) ?? chartPeriodOptions[0],
    [benchmarkPeriodId, chartPeriodOptions]
  );
  const selectableStandorte = useMemo(() => standort ? [standort] : orderedStandorte(), [standort]);
  const relevantStandorte = useMemo(() => {
    if (standort) return [standort];
    if (standortFilterId === "alle") return selectableStandorte;
    return selectableStandorte.filter((entry) => entry.id === standortFilterId);
  }, [selectableStandorte, standort, standortFilterId]);
  const chartStandorte = useMemo(() => {
    if (standort) return [standort];
    if (chartStandortFilterId === "alle") return selectableStandorte;
    return selectableStandorte.filter((entry) => entry.id === chartStandortFilterId);
  }, [chartStandortFilterId, selectableStandorte, standort]);
  const relevantStandortNames = useMemo(() => new Set(relevantStandorte.map((entry) => entry.name)), [relevantStandorte]);
  const chartStandortNames = useMemo(() => new Set(chartStandorte.map((entry) => entry.name)), [chartStandorte]);
  const scopedRows = useMemo(() => importRows.filter((row) => {
    if (!relevantStandortNames.has(row.location)) return false;
    const rowStandort = relevantStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedPeriod, rowStandort) : false;
  }), [importRows, relevantStandortNames, relevantStandorte, selectedPeriod]);
  const chartRows = useMemo(() => importRows.filter((row) => {
    if (!chartStandortNames.has(row.location)) return false;
    const rowStandort = chartStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedChartPeriod, rowStandort) : false;
  }), [chartStandortNames, chartStandorte, importRows, selectedChartPeriod]);
  const summary = useMemo(() => summarizeImportRows(scopedRows), [scopedRows]);
  const metrics = useMemo(() => metricsFromImportSummary(summary), [summary]);
  const stornoReview = useMemo(() => stornoReviewFromImportRows(scopedRows, standort?.id, manualCaseResolutions), [scopedRows, standort?.id, manualCaseResolutions]);
  const closedCaseKeys = useMemo(() => buildClosedResolutionKeySet(manualCaseResolutions), [manualCaseResolutions]);
  const practiceFollowupCases = useMemo(() => applyInvoiceStatusToCases(
    casesFromImportRows(scopedRows).filter((fall) => !fall.status.includes("erledigt") && !caseResolutionKeys(fall).some((key) => closedCaseKeys.has(key))),
    invoiceStatusRows
  ).filter(isPracticeFollowupCase), [closedCaseKeys, invoiceStatusRows, scopedRows]);
  const economicCheckRows = useMemo(() => buildInvoiceStatusReviewBasket(invoiceStatusRows, scopedRows)
    .filter((row) => row.category === "economic_check"), [invoiceStatusRows, scopedRows]);
  const economicCheckAmount = useMemo(() => economicCheckRows.reduce((sum, row) => sum + row.amount, 0), [economicCheckRows]);
  const kpiTrendPoints = useMemo(() => customMonthlyChartPoints(scopedRows, manualCaseResolutions), [manualCaseResolutions, scopedRows]);
  const chartPoints = useMemo(() => customMonthlyChartPoints(chartRows, manualCaseResolutions), [chartRows, manualCaseResolutions]);
  const benchmarkRows = useMemo(() => customBenchmarkRows(importRows, selectableStandorte, selectedBenchmarkPeriod, manualCaseResolutions), [importRows, manualCaseResolutions, selectableStandorte, selectedBenchmarkPeriod]);
  const chartScopeHint = chartStandorte.length === 1 ? chartStandorte[0].name : "alle Standorte";
  const invoiceCount = useMemo(() => scopedRows.reduce((sum, row) => {
    const parsedCount = row.parsedClaims?.length ?? 0;
    return sum + (parsedCount || row.claimsExtracted || row.claimsHeader || 0);
  }, 0), [scopedRows]);
  const averageClaimValue = invoiceCount ? metrics.submitted / invoiceCount : 0;
  const deductionRecovery = useMemo(() => buildDeductionRecovery(importRows, relevantStandorte, selectedPeriod, manualCaseResolutions), [importRows, manualCaseResolutions, relevantStandorte, selectedPeriod]);
  const grossDeductionAmount = deductionRecovery.grossDeductionAmount;
  const recoveredStornoAmount = deductionRecovery.recoveredAmount;
  const openStornoAmount = deductionRecovery.openAmount;
  const practiceFollowupAmount = practiceFollowupCases.reduce((sum, fall) => sum + fall.amount, 0);
  const finalCashflowAmount = Math.max(metrics.submitted - metrics.feeNet - metrics.feeVat - metrics.ewmaTotal - grossDeductionAmount + recoveredStornoAmount, 0);
  const scopeHint = relevantStandorte.length === 1 ? relevantStandorte[0].name : "alle Standorte";
  const locationExportTarget = relevantStandorte.length === 1 ? relevantStandorte[0] : undefined;
  const printLocationExport = () => {
    if (!locationExportTarget) return;
    flushSync(() => setChartStandortFilterId(locationExportTarget.id));
    printCustomTabPdf(exportRef.current, `Standort-Export · ${locationExportTarget.name} · ${selectedPeriod.label}`, {
      targetStandortName: locationExportTarget.name,
      locationNames: selectableStandorte.map((entry) => entry.name)
    });
  };

  return (
    <div className="content-stack custom-kpi-view" ref={exportRef}>
      <section className="panel period-filter custom-kpi-period">
        <label className="select-label">
          Zeitraum
          <select value={periodId} onChange={(event) => setPeriodId(event.target.value)}>
            {periodOptions.map((period) => (
              <option key={period.id} value={period.id}>{period.label}</option>
            ))}
          </select>
        </label>
        <label className="select-label">
          Standort
          <select value={standort ? standort.id : standortFilterId} onChange={(event) => setStandortFilterId(event.target.value)} disabled={Boolean(standort)}>
            {!standort && <option value="alle">Alle Standorte</option>}
            {selectableStandorte.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
        </label>
        <div>
          <strong>Zusammenfassung</strong>
          <span>{scopeHint} · {selectedPeriod.detail}</span>
        </div>
        <div className="custom-export-actions">
          <button className="secondary-button custom-export-action" type="button" onClick={() => printCustomTabPdf(exportRef.current, `Zusammenfassung · ${scopeHint} · ${selectedPeriod.label}`)}>
            <Printer size={16} /> PDF Export
          </button>
          <button
            className="secondary-button custom-export-action"
            type="button"
            onClick={printLocationExport}
            disabled={!locationExportTarget}
            title={locationExportTarget ? `Anonymisierter Standort-Export für ${locationExportTarget.name}` : "Bitte zuerst genau einen Standort auswählen"}
          >
            <Printer size={16} /> Standort-Export
          </button>
        </div>
      </section>

      <section className="custom-kpi-slider" aria-label="Zusammenfassung KPI-Kacheln">
        <PriorityCard
          label="Eingereichter Umsatz"
          value={money.format(metrics.submitted)}
          hint={scopeHint}
          period={selectedPeriod.label}
          tone="blue"
          trend={customKpiTrend("submitted", kpiTrendPoints)}
          info={`Summe aller im gewählten Zeitraum eingereichten Forderungen für ${scopeHint}.`}
        />
        <PriorityCard
          label="BFS-Gebühren"
          value={money.format(metrics.fees)}
          hint={`Gebührenquote ${formatFeeRate(metrics.feeRate)}`}
          period={selectedPeriod.label}
          tone="amber"
          trend={customKpiTrend("fees", kpiTrendPoints, true)}
          info="Summe der erkannten BFS-Gebühren im gewählten Zeitraum; die Quote bezieht sich auf den eingereichten Umsatz."
        />
        <PriorityCard
          label="BFS-Gebühr netto"
          value={money.format(metrics.feeNet)}
          hint="ohne MwSt"
          period={selectedPeriod.label}
          tone={metrics.feeNet ? "amber" : "green"}
          trend={customKpiTrend("feeNet", kpiTrendPoints, true)}
          info={`Netto-Gebühr aus dem BFS-Abrechnungsimport im gewählten Zeitraum für ${scopeHint}. Diese Kachel ist Teil der CashFlow-Herleitung vom eingereichten Umsatz zur Auszahlung.`}
        />
        <PriorityCard
          label="MwSt"
          value={money.format(metrics.feeVat + metrics.ewmaVat)}
          hint={`BFS ${money.format(metrics.feeVat)} · EWMA ${money.format(metrics.ewmaVat)}`}
          period={selectedPeriod.label}
          tone={metrics.feeVat + metrics.ewmaVat ? "amber" : "green"}
          trend={customKpiTrend("tax", kpiTrendPoints, true)}
          info="Separat erkannte Steueranteile auf BFS-Gebühren und EWMA/Adressprüfung. Wird in der CashFlow-Herleitung getrennt von Netto-Gebühren geführt."
        />
        <PriorityCard
          label="EWMA / Adressprüfung"
          value={money.format(metrics.ewmaTotal)}
          hint={`netto ${money.format(metrics.ewmaNet)}`}
          period={selectedPeriod.label}
          tone={metrics.ewmaTotal ? "amber" : "green"}
          trend={customKpiTrend("ewma", kpiTrendPoints, true)}
          info="Zusatzkosten für Meldeamt/Adressprüfung aus dem Import. Diese Kosten reduzieren den wirtschaftlich verbleibenden Betrag zusätzlich zur BFS-Gebühr."
        />
        <PriorityCard
          label="Ausgezahlter Umsatz"
          value={money.format(metrics.payout)}
          hint="nach BFS-Abrechnung"
          period={selectedPeriod.label}
          tone="green"
          trend={customKpiTrend("payout", kpiTrendPoints)}
          info={`Summe der in den Importdaten ausgewiesenen Auszahlungen für ${scopeHint}.`}
        />
        <PriorityCard
          label="Brutto Storno/Rückgabe"
          value={money.format(grossDeductionAmount)}
          hint={`${integerNumber.format(stornoReview.total)} Stornos · ${integerNumber.format(metrics.returnCount)} Rückgaben`}
          period={selectedPeriod.label}
          tone={grossDeductionAmount ? "amber" : "green"}
          trend={customKpiTrend("openStornoAmount", kpiTrendPoints, true)}
          info={`Grundmenge nach der neuen Logik: alle erkannten Rückgaben und Stornos im Zeitraum ${selectedPeriod.label} für ${scopeHint}. Diese Kachel zeigt den Brutto-Abzug vor weiterer Einordnung in zurückgeholt, bezahlt, Zahlung/Grund prüfen, Praxis nachfassen oder endgültig storniert.`}
        />
      </section>

      <section className="custom-kpi-slider custom-kpi-secondary" aria-label="Zusammenfassung Storno- und Rechnungs-KPI">
        <PriorityCard
          label="Storno-Grundmenge"
          value={integerNumber.format(stornoReview.total)}
          hint={`${money.format(stornoReview.amount)} Brutto-Storno`}
          period={selectedPeriod.label}
          tone={stornoReview.open ? "amber" : stornoReview.total ? "green" : "blue"}
          trend={customKpiTrend("cancellations", kpiTrendPoints, true)}
          info={`Grundmenge: alle erkannten Storno-Zeilen im gewählten Zeitraum für ${scopeHint}. Danach wird getrennt: zurückgeholt durch Neueinreichung, bezahlt/manuell geklärt, Zahlung/Grund prüfen, Praxis nachfassen oder endgültig storniert. Storno-Betrag gesamt: ${money.format(stornoReview.amount)}.`}
        />
        <PriorityCard
          label="Davon zurückgeholt"
          value={integerNumber.format(deductionRecovery.recoveredCount)}
          hint={`${money.format(recoveredStornoAmount)} · ${formatPercent(grossDeductionAmount ? (recoveredStornoAmount / grossDeductionAmount) * 100 : 0)} vom Brutto-Abzug`}
          period={selectedPeriod.label}
          tone={recoveredStornoAmount ? "green" : grossDeductionAmount ? "amber" : "blue"}
          trend={customKpiTrend("recoveredStornos", kpiTrendPoints)}
          info="Lesart: Vom Brutto-Abzug aus Rückgaben und Stornos wurde dieser Betrag über echte Neueinreichung/Ersatzrechnung oder wirtschaftlich belegte Zahlung geklärt. Saldo 0 allein zählt hier nicht als Zahlung."
        />
        <PriorityCard
          label="Offener Abzug"
          value={money.format(openStornoAmount)}
          hint="Brutto-Abzug minus zurückgeholt/bezahlt"
          period={selectedPeriod.label}
          tone={openStornoAmount ? "amber" : "green"}
          trend={customKpiTrend("openStornoAmount", kpiTrendPoints, true)}
          info="Noch nicht zurückgeholter Betrag aus Brutto Storno/Rückgabe. Dieser Rest muss weiter eingeordnet werden: Zahlung/Grund prüfen, Praxis nachfassen oder endgültig storniert."
        />
        <PriorityCard
          label="Zahlung/Grund prüfen"
          value={integerNumber.format(economicCheckRows.length)}
          hint={money.format(economicCheckAmount)}
          period={selectedPeriod.label}
          tone={economicCheckRows.length ? "amber" : "green"}
          info={`Diese Fälle sind laut Saldo-Liste bei BFS geschlossen, aber wirtschaftlich noch nicht erklärt. Es muss belegt werden, ob Zahlung, echte Neueinreichung oder korrekter Storno-Grund vorliegt. Saldo 0 allein ist kein Zahlungsnachweis.`}
        />
        <PriorityCard
          label="Praxis nachfassen"
          value={integerNumber.format(practiceFollowupCases.length)}
          hint={money.format(practiceFollowupAmount)}
          period={selectedPeriod.label}
          tone={practiceFollowupCases.length ? "amber" : "green"}
          trend={customKpiTrend("practiceFollowupAmount", kpiTrendPoints, true)}
          info="Echte operative Praxis-Aufgaben, vor allem Rückgaben ohne Ausfallschutz. Diese Fälle sind nicht nur saldobereinigt, sondern müssen durch die Praxis nachgehalten werden."
        />
        <PriorityCard
          label="Wirtschaftlich verbleibend"
          value={money.format(finalCashflowAmount)}
          hint="eingereicht minus Kosten/Abzug plus zurückgeholt"
          period={selectedPeriod.label}
          tone="green"
          trend={customKpiTrend("finalCashflow", kpiTrendPoints)}
          info={`CashFlow-Herleitung: ${money.format(metrics.submitted)} eingereicht minus BFS-Gebühr netto, MwSt, EWMA und Brutto Storno/Rückgabe plus ${money.format(recoveredStornoAmount)} zurückgeholt/bezahlt.`}
        />
        <PriorityCard
          label="Eingereichte Rechnungen"
          value={integerNumber.format(invoiceCount)}
          hint="Patienten-/Rechnungspositionen"
          period={selectedPeriod.label}
          tone="blue"
          trend={customKpiTrend("claims", kpiTrendPoints)}
          info={`Gezählt werden die erkannten Forderungspositionen aus den importierten Abrechnungen für ${scopeHint}. Wenn keine Positionsliste erkannt wurde, nutzt die App die erkannte Kopfanzahl als Fallback.`}
        />
        <PriorityCard
          label="Ø Wert je Forderung"
          value={money.format(averageClaimValue)}
          hint="eingereicht / Forderungen"
          period={selectedPeriod.label}
          tone="blue"
          trend={customKpiTrend("averageClaim", kpiTrendPoints)}
          info={`Berechnung: eingereichter Umsatz ${money.format(metrics.submitted)} geteilt durch ${integerNumber.format(invoiceCount)} erkannte Forderungs-/Rechnungspositionen im gewählten Zeitraum für ${scopeHint}.`}
        />
      </section>

      <section className="panel period-filter custom-kpi-period custom-chart-period">
        <label className="select-label">
          Zeitraum Diagramme
          <select value={chartPeriodId} onChange={(event) => setChartPeriodId(event.target.value)}>
            {chartPeriodOptions.map((period) => (
              <option key={period.id} value={period.id}>{period.label}</option>
            ))}
          </select>
        </label>
        <label className="select-label">
          Standort Diagramme
          <select value={standort ? standort.id : chartStandortFilterId} onChange={(event) => setChartStandortFilterId(event.target.value)} disabled={Boolean(standort)}>
            {!standort && <option value="alle">Alle Standorte</option>}
            {selectableStandorte.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
        </label>
        <div>
          <strong>Diagramme individuell steuern</strong>
          <span>{chartScopeHint} · {selectedChartPeriod.detail}</span>
        </div>
      </section>

      <section className="custom-chart-grid" aria-label="Zusammenfassung Diagramme">
        <CustomComboChart
          title="Umsatz eingereicht vs. ausgezahlt"
          values={chartPoints}
          barKey="submitted"
          lineKey="payout"
          barLabel="eingereicht"
          lineLabel="ausgezahlt"
          format={money.format}
        />
        <CustomDualAxisChart
          title="Forderungen vs. Stornierungen"
          values={chartPoints}
          barKey="claims"
          lineKey="cancellations"
          barLabel="Forderungen"
          lineLabel="Stornierungen"
          formatBar={integerNumber.format}
          formatLine={integerNumber.format}
        />
        <CustomDonutChart
          title="Patienten mit Ausfallschutz"
          protectedCount={chartPoints.reduce((sum, point) => sum + point.protectedClaims, 0)}
          unprotectedCount={chartPoints.reduce((sum, point) => sum + point.noProtectionClaims, 0)}
        />
        <CustomDualAxisChart
          title="Stornierungen vs. zurückgeholt"
          values={chartPoints}
          barKey="cancellations"
          lineKey="recoveredStornos"
          barLabel="Stornierungen"
          lineLabel="zurückgeholt"
          formatBar={integerNumber.format}
          formatLine={integerNumber.format}
        />
      </section>

      <CustomBenchmarkTable
        rows={benchmarkRows}
        periodLabel={selectedBenchmarkPeriod.label}
        periodDetail={selectedBenchmarkPeriod.detail}
        periodOptions={chartPeriodOptions}
        periodId={benchmarkPeriodId}
        onPeriodChange={setBenchmarkPeriodId}
      />
    </div>
  );
}

type CustomBenchmarkRow = {
  standort: Standort;
  submitted: number;
  monthlyAverage: number;
  activeMonths: number;
  claimCount: number;
  averageClaim: number;
  stornoCount: number;
  stornoRate: number;
  recoveredStornos: number;
  recoveredRate: number;
  noProtectionCount: number;
  noProtectionRate: number;
  feeRate: number;
  signal: string;
};

function CustomBenchmarkTable({
  rows,
  periodLabel,
  periodDetail,
  periodOptions,
  periodId,
  onPeriodChange
}: {
  rows: CustomBenchmarkRow[];
  periodLabel: string;
  periodDetail: string;
  periodOptions: PeriodOption[];
  periodId: string;
  onPeriodChange: (periodId: string) => void;
}) {
  const totalRow = useMemo(() => customBenchmarkTotalRow(rows), [rows]);

  return (
    <section className="panel custom-benchmark-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Benchmarking</span>
          <h2>Standorte nach Kennzahlen vergleichen</h2>
          <p>Zeitraum: {periodLabel}. Umsatz, Forderungsvolumen, Stornoqualität, Schutzquote und Gebührenquote je Standort.</p>
        </div>
      </div>
      <div className="period-filter custom-benchmark-filter">
        <label className="select-label">
          Zeitraum Benchmark
          <select value={periodId} onChange={(event) => onPeriodChange(event.target.value)}>
            {periodOptions.map((period) => (
              <option key={period.id} value={period.id}>{period.label}</option>
            ))}
          </select>
        </label>
        <div>
          <strong>Tabellenzeitraum separat steuern</strong>
          <span>{periodDetail}</span>
        </div>
      </div>
      <div className="table-wrap custom-benchmark-scroll">
        <table className="custom-benchmark-table">
          <thead>
            <tr>
              <th>Standort</th>
              <th>Umsatz</th>
              <th>Ø Monat</th>
              <th>Forderungen</th>
              <th>Ø Forderung</th>
              <th>Stornos</th>
              <th>Stornoquote</th>
              <th>gewandelt</th>
              <th>ohne Schutz</th>
              <th>Gebühr</th>
              <th>Signal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.standort.id} data-benchmark-row="true" data-location-name={row.standort.name}>
                <td><strong>{row.standort.name}</strong><span>{row.activeMonths ? `${row.activeMonths} aktive Monate` : "keine Daten im Zeitraum"}</span></td>
                <td data-metric="submitted" data-value={row.submitted}>{money.format(row.submitted)}</td>
                <td data-metric="monthlyAverage" data-value={row.monthlyAverage}>{money.format(row.monthlyAverage)}</td>
                <td data-metric="claimCount" data-value={row.claimCount}>{integerNumber.format(row.claimCount)}</td>
                <td data-metric="averageClaim" data-value={row.averageClaim}>{money.format(row.averageClaim)}</td>
                <td data-metric="stornoCount" data-value={row.stornoCount}>{integerNumber.format(row.stornoCount)}</td>
                <td data-metric="stornoRate" data-value={row.stornoRate}>{formatPercent(row.stornoRate)}</td>
                <td data-metric="recoveredStornos" data-value={row.recoveredStornos}>{integerNumber.format(row.recoveredStornos)}<span>{formatPercent(row.recoveredRate)}</span></td>
                <td data-metric="noProtectionCount" data-value={row.noProtectionCount}>{integerNumber.format(row.noProtectionCount)}<span>{formatPercent(row.noProtectionRate)}</span></td>
                <td data-metric="feeRate" data-value={row.feeRate}>{formatFeeRate(row.feeRate)}</td>
                <td><StatusBadge status={row.signal} /></td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={11}>Keine Benchmarkdaten im aktuellen Filter.</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="custom-benchmark-total-row">
                <td><strong>Gesamt</strong><span>{integerNumber.format(rows.length)} Standort(e)</span></td>
                <td data-metric="submitted" data-value={totalRow.submitted}>{money.format(totalRow.submitted)}</td>
                <td data-metric="monthlyAverage" data-value={totalRow.monthlyAverage}>{money.format(totalRow.monthlyAverage)}</td>
                <td data-metric="claimCount" data-value={totalRow.claimCount}>{integerNumber.format(totalRow.claimCount)}</td>
                <td data-metric="averageClaim" data-value={totalRow.averageClaim}>{money.format(totalRow.averageClaim)}</td>
                <td data-metric="stornoCount" data-value={totalRow.stornoCount}>{integerNumber.format(totalRow.stornoCount)}</td>
                <td data-metric="stornoRate" data-value={totalRow.stornoRate}>{formatPercent(totalRow.stornoRate)}</td>
                <td data-metric="recoveredStornos" data-value={totalRow.recoveredStornos}>{integerNumber.format(totalRow.recoveredStornos)}<span>{formatPercent(totalRow.recoveredRate)}</span></td>
                <td data-metric="noProtectionCount" data-value={totalRow.noProtectionCount}>{integerNumber.format(totalRow.noProtectionCount)}<span>{formatPercent(totalRow.noProtectionRate)}</span></td>
                <td data-metric="feeRate" data-value={totalRow.feeRate}>{formatFeeRate(totalRow.feeRate)}</td>
                <td><StatusBadge status={totalRow.signal} /></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

function customBenchmarkTotalRow(rows: CustomBenchmarkRow[]) {
  const submitted = rows.reduce((sum, row) => sum + row.submitted, 0);
  const claimCount = rows.reduce((sum, row) => sum + row.claimCount, 0);
  const stornoCount = rows.reduce((sum, row) => sum + row.stornoCount, 0);
  const recoveredStornos = rows.reduce((sum, row) => sum + row.recoveredStornos, 0);
  const noProtectionCount = rows.reduce((sum, row) => sum + row.noProtectionCount, 0);
  const feeAmount = rows.reduce((sum, row) => sum + (row.submitted * row.feeRate) / 100, 0);
  const activeMonths = Math.max(...rows.map((row) => row.activeMonths), 0);
  const averageClaim = claimCount ? submitted / claimCount : 0;
  const monthlyAverage = activeMonths ? submitted / activeMonths : 0;
  const stornoRate = claimCount ? (stornoCount / claimCount) * 100 : 0;
  const recoveredRate = stornoCount ? (recoveredStornos / stornoCount) * 100 : 0;
  const noProtectionRate = claimCount ? (noProtectionCount / claimCount) * 100 : 0;
  const feeRate = submitted ? (feeAmount / submitted) * 100 : 0;

  return {
    submitted,
    monthlyAverage,
    claimCount,
    averageClaim,
    stornoCount,
    stornoRate,
    recoveredStornos,
    recoveredRate,
    noProtectionCount,
    noProtectionRate,
    feeRate,
    signal: customBenchmarkSignal(stornoRate, recoveredRate, noProtectionRate, feeRate)
  };
}

type CustomChartPoint = {
  month: string;
  label: string;
  submitted: number;
  payout: number;
  fees: number;
  feeNet: number;
  tax: number;
  ewma: number;
  claims: number;
  cancellations: number;
  recoveredStornos: number;
  openStornoAmount: number;
  practiceFollowupAmount: number;
  finalCashflow: number;
  protectedClaims: number;
  noProtectionClaims: number;
};

function CustomComboChart({
  title,
  values,
  barKey,
  lineKey,
  barLabel,
  lineLabel,
  format
}: {
  title: string;
  values: CustomChartPoint[];
  barKey: keyof Pick<CustomChartPoint, "submitted" | "payout" | "claims" | "cancellations" | "recoveredStornos">;
  lineKey: keyof Pick<CustomChartPoint, "submitted" | "payout" | "claims" | "cancellations" | "recoveredStornos">;
  barLabel: string;
  lineLabel: string;
  format: (value: number) => string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartValues = values.length ? values : [emptyCustomChartPoint("Keine Daten")];
  const active = activeIndex === null ? undefined : chartValues[Math.min(activeIndex, chartValues.length - 1)];
  const maxValue = Math.max(...chartValues.flatMap((point) => [Number(point[barKey]), Number(point[lineKey])]), 1);
  const slot = 100 / chartValues.length;
  const resolvedActiveIndex = activeIndex ?? 0;
  const activeX = chartValues.length === 1 ? 50 : resolvedActiveIndex * slot + slot / 2;
  const activeValuePeak = active ? Math.max(Number(active[barKey]), Number(active[lineKey])) : 0;
  const activeY = Math.max(10, Math.min(78, 100 - (activeValuePeak / maxValue) * 86));
  const linePoints = chartValues.map((point, index) => {
    const x = chartValues.length === 1 ? 50 : index * slot + slot / 2;
    const y = 100 - (Number(point[lineKey]) / maxValue) * 86;
    return `${x},${Math.max(8, Math.min(96, y))}`;
  }).join(" ");

  return (
    <article className="custom-chart-card">
      <div className="custom-chart-head">
        <div>
          <h2>{title}</h2>
        </div>
        <div className="custom-chart-legend">
          <span><i className="bar-dot" /> {barLabel}</span>
          <span><i className="line-dot" /> {lineLabel}</span>
        </div>
      </div>
      <div className="custom-combo-chart" onPointerLeave={() => setActiveIndex(null)}>
        {active && (
          <div className="custom-chart-tooltip" style={{ left: `${Math.max(13, Math.min(87, activeX))}%`, top: `${activeY}%` }}>
            <strong>{active.label}</strong>
            <span>{barLabel}: {format(Number(active[barKey]))}</span>
            <span>{lineLabel}: {format(Number(active[lineKey]))}</span>
          </div>
        )}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={title}>
          {[24, 50, 76].map((y) => <line key={y} className="custom-grid-line" x1="0" x2="100" y1={y} y2={y} />)}
          {chartValues.map((point, index) => {
            const height = Math.max(3, (Number(point[barKey]) / maxValue) * 84);
            return (
              <rect
                key={point.month}
                className={index === activeIndex ? "custom-bar active" : "custom-bar"}
                x={index * slot + slot * 0.28}
                y={96 - height}
                width={Math.min(10, slot * 0.44)}
                height={height}
                rx="1.8"
                tabIndex={0}
                onFocus={() => setActiveIndex(index)}
                onPointerEnter={() => setActiveIndex(index)}
                onClick={() => setActiveIndex(index)}
              />
            );
          })}
          <polyline className="custom-line" points={linePoints} />
        </svg>
      </div>
      <div className="custom-chart-axis">{chartValues.map((point) => <span key={point.month}>{point.label}</span>)}</div>
    </article>
  );
}

function CustomDualAxisChart({
  title,
  values,
  barKey,
  lineKey,
  barLabel,
  lineLabel,
  formatBar,
  formatLine
}: {
  title: string;
  values: CustomChartPoint[];
  barKey: keyof Pick<CustomChartPoint, "claims" | "cancellations" | "recoveredStornos">;
  lineKey: keyof Pick<CustomChartPoint, "claims" | "cancellations" | "recoveredStornos">;
  barLabel: string;
  lineLabel: string;
  formatBar: (value: number) => string;
  formatLine: (value: number) => string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartValues = values.length ? values : [emptyCustomChartPoint("Keine Daten")];
  const active = activeIndex === null ? undefined : chartValues[Math.min(activeIndex, chartValues.length - 1)];
  const maxBar = Math.max(...chartValues.map((point) => Number(point[barKey])), 1);
  const maxLine = Math.max(...chartValues.map((point) => Number(point[lineKey])), 1);
  const slot = 100 / chartValues.length;
  const resolvedActiveIndex = activeIndex ?? 0;
  const activeX = chartValues.length === 1 ? 50 : resolvedActiveIndex * slot + slot / 2;
  const activeBarY = active ? 96 - Math.max(3, (Number(active[barKey]) / maxBar) * 84) : 78;
  const activeLineY = active ? Math.max(8, Math.min(96, 100 - (Number(active[lineKey]) / maxLine) * 86)) : 78;
  const activeY = Math.max(10, Math.min(78, Math.min(activeBarY, activeLineY)));
  const linePoints = chartValues.map((point, index) => {
    const x = chartValues.length === 1 ? 50 : index * slot + slot / 2;
    const y = 100 - (Number(point[lineKey]) / maxLine) * 86;
    return `${x},${Math.max(8, Math.min(96, y))}`;
  }).join(" ");

  return (
    <article className="custom-chart-card">
      <div className="custom-chart-head">
        <div>
          <h2>{title}</h2>
        </div>
        <div className="custom-chart-legend">
          <span><i className="bar-dot" /> {barLabel}</span>
          <span><i className="line-dot" /> {lineLabel}</span>
        </div>
      </div>
      <div className="custom-combo-chart dual-axis" onPointerLeave={() => setActiveIndex(null)}>
        {active && (
          <div className="custom-chart-tooltip" style={{ left: `${Math.max(13, Math.min(87, activeX))}%`, top: `${activeY}%` }}>
            <strong>{active.label}</strong>
            <span>{barLabel}: {formatBar(Number(active[barKey]))}</span>
            <span>{lineLabel}: {formatLine(Number(active[lineKey]))}</span>
          </div>
        )}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={title}>
          {[24, 50, 76].map((y) => <line key={y} className="custom-grid-line" x1="0" x2="100" y1={y} y2={y} />)}
          {chartValues.map((point, index) => {
            const height = Math.max(3, (Number(point[barKey]) / maxBar) * 84);
            return (
              <rect
                key={point.month}
                className={index === activeIndex ? "custom-bar active" : "custom-bar"}
                x={index * slot + slot * 0.28}
                y={96 - height}
                width={Math.min(10, slot * 0.44)}
                height={height}
                rx="1.8"
                tabIndex={0}
                onFocus={() => setActiveIndex(index)}
                onPointerEnter={() => setActiveIndex(index)}
                onClick={() => setActiveIndex(index)}
              />
            );
          })}
          <polyline className="custom-line warning" points={linePoints} />
        </svg>
      </div>
      <div className="custom-chart-axis">{chartValues.map((point) => <span key={point.month}>{point.label}</span>)}</div>
      <div className="custom-axis-scale">
        <span>{barLabel}: max. {formatBar(maxBar)}</span>
        <span>{lineLabel}: max. {formatLine(maxLine)}</span>
      </div>
    </article>
  );
}

function CustomDonutChart({ title, protectedCount, unprotectedCount }: { title: string; protectedCount: number; unprotectedCount: number }) {
  const total = protectedCount + unprotectedCount;
  const protectedShare = total ? (protectedCount / total) * 100 : 0;
  const unprotectedShare = total ? (unprotectedCount / total) * 100 : 0;
  const safeShare = Math.max(0, Math.min(100, protectedShare));
  return (
    <article className="custom-chart-card custom-donut-card">
      <div className="custom-chart-head">
        <div>
          <h2>{title}</h2>
          <span>{formatPercent(protectedShare)} mit Schutz · {formatPercent(unprotectedShare)} ohne Schutz</span>
        </div>
      </div>
      <div className="custom-donut-wrap">
        <div className="custom-donut" style={{ background: `conic-gradient(#35d8c9 0 ${safeShare}%, #f2bd5b ${safeShare}% 100%)` }}>
          <div>
            <strong>{formatPercent(unprotectedShare)}</strong>
            <span>ohne Schutz</span>
          </div>
        </div>
        <div className="custom-donut-stats">
          <span><i className="protected" /> Mit Ausfallschutz <b>{integerNumber.format(protectedCount)}</b></span>
          <span><i className="unprotected" /> Ohne Ausfallschutz <b>{integerNumber.format(unprotectedCount)}</b></span>
          <span>Gesamt <b>{integerNumber.format(total)}</b></span>
        </div>
      </div>
    </article>
  );
}

function emptyCustomChartPoint(label: string): CustomChartPoint {
  return {
    month: label,
    label,
    submitted: 0,
    payout: 0,
    fees: 0,
    feeNet: 0,
    tax: 0,
    ewma: 0,
    claims: 0,
    cancellations: 0,
    recoveredStornos: 0,
    openStornoAmount: 0,
    practiceFollowupAmount: 0,
    finalCashflow: 0,
    protectedClaims: 0,
    noProtectionClaims: 0
  };
}

type CustomKpiTrendMetric = "submitted" | "fees" | "feeNet" | "tax" | "ewma" | "payout" | "cancellations" | "recoveredStornos" | "openStornoAmount" | "practiceFollowupAmount" | "finalCashflow" | "claims" | "averageClaim";

function customKpiTrend(metric: CustomKpiTrendMetric, points: CustomChartPoint[], lowerIsBetter = false): AnswerSparklineTrend {
  const values = points.map((point) => customKpiTrendValue(metric, point)).slice(-12);
  const nonEmptyValues = values.length ? values : [0, 0, 0];
  const first = nonEmptyValues[0] ?? 0;
  const last = nonEmptyValues[nonEmptyValues.length - 1] ?? 0;
  const delta = first ? ((last - first) / first) * 100 : last ? 100 : 0;
  const desiredDelta = lowerIsBetter ? -delta : delta;
  const tone: AnswerSparklineTrend["tone"] = desiredDelta >= 0 ? "green" : desiredDelta <= -15 ? "red" : "amber";
  const label = first
    ? `Trend ${delta >= 0 ? "+" : ""}${formatPercent(delta)}`
    : last
      ? "Trend neu"
      : "kein Trend";

  return {
    points: nonEmptyValues,
    tone,
    label
  };
}

function customKpiTrendValue(metric: CustomKpiTrendMetric, point: CustomChartPoint) {
  if (metric === "averageClaim") return point.claims ? point.submitted / point.claims : 0;
  return Number(point[metric]);
}

function customBenchmarkRows(importRows: ImportPreviewRow[], benchmarkStandorte: Standort[], period: PeriodOption, manualCaseResolutions: ManualCaseResolution[]): CustomBenchmarkRow[] {
  return benchmarkStandorte.map((standort) => {
    const rows = importRows.filter((row) => row.location === standort.name && importRowInPeriod(row, period, standort));
    const summary = summarizeImportRows(rows);
    const metrics = summary.rows ? metricsFromImportSummary(summary) : zeroMetrics();
    const stornoReview = stornoReviewFromImportRows(rows, standort.id, manualCaseResolutions);
    const claimCount = rows.reduce((sum, row) => {
      const parsedCount = row.parsedClaims?.length ?? 0;
      return sum + (parsedCount || row.claimsExtracted || row.claimsHeader || 0);
    }, 0);
    const noProtectionCount = rows.reduce((sum, row) => {
      const parsedClaims = row.parsedClaims ?? [];
      if (parsedClaims.length) return sum + parsedClaims.filter((claim) => claim.protectionStatus === "ohne_ausfallschutz").length;
      return sum + rowNoProtectionCount(row);
    }, 0);
    const activeMonths = summary.activeMonths || countImportMonths(rows);
    const monthlyAverage = activeMonths ? metrics.submitted / activeMonths : 0;
    const averageClaim = claimCount ? metrics.submitted / claimCount : 0;
    const stornoRate = claimCount ? (stornoReview.total / claimCount) * 100 : 0;
    const recoveredRate = stornoReview.total ? (stornoReview.done / stornoReview.total) * 100 : 0;
    const noProtectionRate = claimCount ? (noProtectionCount / claimCount) * 100 : 0;

    return {
      standort,
      submitted: metrics.submitted,
      monthlyAverage,
      activeMonths,
      claimCount,
      averageClaim,
      stornoCount: stornoReview.total,
      stornoRate,
      recoveredStornos: stornoReview.done,
      recoveredRate,
      noProtectionCount,
      noProtectionRate,
      feeRate: metrics.feeRate,
      signal: customBenchmarkSignal(stornoRate, recoveredRate, noProtectionRate, metrics.feeRate)
    };
  }).sort((a, b) => b.submitted - a.submitted);
}

function customBenchmarkSignal(stornoRate: number, recoveredRate: number, noProtectionRate: number, feeRate: number) {
  if (stornoRate >= 5 || noProtectionRate >= 10 || feeRate >= 4) return "prüfen";
  if (stornoRate >= 2 || noProtectionRate >= 5 || (stornoRate > 0 && recoveredRate < 50)) return "beobachten";
  return "ok";
}

function GroupDashboard({ onNavigate, importRows, manualCaseResolutions = [], invoiceStatusRows = [] }: { onNavigate: (view: string) => void; importRows: ImportPreviewRow[]; manualCaseResolutions?: ManualCaseResolution[]; invoiceStatusRows?: ParsedInvoiceStatusRow[] }) {
  const [groupStandortFilter, setGroupStandortFilter] = useState("alle");
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [cockpitPeriodId, setCockpitPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [chartPeriodId, setChartPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [chartStandortFilter, setChartStandortFilter] = useState("alle");
  const [benchmarkPeriodId, setBenchmarkPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const cockpitPeriod = useMemo(() => periodOptions.find((period) => period.id === cockpitPeriodId) ?? periodOptions[0], [periodOptions, cockpitPeriodId]);
  const chartPeriod = useMemo(() => periodOptions.find((period) => period.id === chartPeriodId) ?? cockpitPeriod, [periodOptions, chartPeriodId, cockpitPeriod]);
  const benchmarkPeriod = useMemo(() => periodOptions.find((period) => period.id === benchmarkPeriodId) ?? cockpitPeriod, [periodOptions, benchmarkPeriodId, cockpitPeriod]);
  const filteredStandorte = useMemo(() => groupStandortFilter === "alle"
    ? orderedStandorte()
    : standorte.filter((standort) => standort.id === groupStandortFilter), [groupStandortFilter]);
  const cockpitScopeLabel = filteredStandorte.length === 1 ? filteredStandorte[0].name : "Alle Standorte";
  const chartStandorte = useMemo(() => chartStandortFilter === "alle"
    ? orderedStandorte()
    : standorte.filter((standort) => standort.id === chartStandortFilter), [chartStandortFilter]);
  const chartScopeLabel = chartStandorte.length === 1 ? chartStandorte[0].name : "Alle Standorte";
  const filteredStandortIds = useMemo(() => new Set(filteredStandorte.map((standort) => standort.id)), [filteredStandorte]);
  const closedCaseKeys = useMemo(() => buildClosedResolutionKeySet(manualCaseResolutions), [manualCaseResolutions]);
  const dashboardCases = useMemo(() => applyInvoiceStatusToCases(casesFromImportRows(importRows).filter((fall) => !caseResolutionKeys(fall).some((key) => closedCaseKeys.has(key))), invoiceStatusRows), [importRows, closedCaseKeys, invoiceStatusRows]);
  const openCases = useMemo(() => dashboardCases.filter((fall) => {
    if (fall.status.includes("erledigt") || !isPracticeFollowupCase(fall) || !filteredStandortIds.has(fall.standortId)) return false;
    const fallStandort = filteredStandorte.find((standort) => standort.id === fall.standortId);
    return fallStandort ? shortDateInPeriod(fall.sourceDate, cockpitPeriod, fallStandort) : false;
  }), [cockpitPeriod, dashboardCases, filteredStandortIds, filteredStandorte]);
  const benchmarkImportRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = filteredStandorte.find((standort) => standort.name === row.location);
    return rowStandort ? importRowInPeriod(row, benchmarkPeriod, rowStandort) : false;
  }), [importRows, filteredStandorte, benchmarkPeriod]);
  const benchmarkOpenCases = useMemo(() => dashboardCases.filter((fall) => {
    if (fall.status.includes("erledigt") || !isPracticeFollowupCase(fall) || !filteredStandortIds.has(fall.standortId)) return false;
    const fallStandort = filteredStandorte.find((standort) => standort.id === fall.standortId);
    return fallStandort ? shortDateInPeriod(fall.sourceDate, benchmarkPeriod, fallStandort) : false;
  }), [dashboardCases, filteredStandortIds, filteredStandorte, benchmarkPeriod]);
  const managementComparison = useMemo(() => buildManagementComparison(importRows, filteredStandorte, openCases, cockpitPeriod, manualCaseResolutions), [importRows, filteredStandorte, openCases, cockpitPeriod, manualCaseResolutions]);
  const groupChartSeries = useMemo(() => buildManagementChartSeries(chartStandorte, importRows, chartPeriod), [chartStandorte, importRows, chartPeriod]);
  const benchmarkSnapshots = useMemo(() => buildLocationSnapshots(filteredStandorte, benchmarkPeriod, benchmarkImportRows, benchmarkOpenCases), [filteredStandorte, benchmarkPeriod, benchmarkImportRows, benchmarkOpenCases]);
  const oldestOpenCase = managementComparison.openCases.reduce((max, fall) => Math.max(max, fall.ageDays), 0);
  const groupKpiInfo = buildKpiDerivationInfo(managementComparison.currentMetrics, managementComparison.currentPeriod.label);
  const groupSparklineContext = { importRows, relevantStandorte: filteredStandorte, period: managementComparison.currentPeriod, manualCaseResolutions };
  const groupSparkline = (metric: AnswerSparklineMetric) => buildAnswerSparkline(metric, groupSparklineContext);
  const groupKpis: KpiCardTuple[] = [
    ["Eingereicht", money.format(managementComparison.currentMetrics.submitted), managementComparison.currentPeriod.label, groupKpiInfo.submitted, groupSparkline("submitted")],
    ["Eingereicht Vorjahr", money.format(managementComparison.previousMetrics.submitted), managementComparison.previousPeriod.label, undefined, kpiSparklineForPeriod("submitted", importRows, filteredStandorte, managementComparison.previousPeriod)],
    ["Delta zum Vorjahr", money.format(managementComparison.submittedDelta), formatDelta(managementComparison.submittedDeltaRate), undefined, groupSparkline("submitted"), managementComparison.currentPeriod.label],
    ["BFS-Gebühren", money.format(managementComparison.currentMetrics.fees), managementComparison.currentPeriod.label, groupKpiInfo.fees, groupSparkline("fees")],
    ["Gebührenquote", formatFeeRate(managementComparison.currentMetrics.feeRate), `Vorjahr ${formatFeeRate(managementComparison.previousMetrics.feeRate)}`, undefined, groupSparkline("feeRate")],
    ["Brutto Storno/Rückgabe", money.format(managementComparison.deductionAmount), `${formatPercent(managementComparison.chargebackRate)} vom Eingang`, `Grundmenge nach BFS-Abrechnung: erkannte Rückgaben, Rückläufer und Stornos im Zeitraum ${managementComparison.currentPeriod.label}. Dieser Betrag ist vor der weiteren Einordnung in zurückgeholt, bezahlt, Zahlung/Grund prüfen, Praxis nachfassen oder endgültig storniert.`, groupSparkline("deductionAmount")],
    ["Davon zurückgeholt", formatPercent(managementComparison.recoveryRate), `${money.format(managementComparison.recoveredAmount)} angerechnet`, "Zurückgeholt bedeutet: echte spätere Neueinreichung/Ersatzrechnung oder wirtschaftlich belegte Zahlung. Saldo 0 allein zählt nicht als Zahlung.", groupSparkline("recoveryRate")],
    ["Ohne-Ausfallschutz-Anteil", formatPercent(managementComparison.noProtectionShare), money.format(managementComparison.currentMetrics.noProtectionAmount), undefined, groupSparkline("noProtection")],
    ["Praxis nachfassen", String(managementComparison.openCases.length), `${oldestOpenCase} Tage ältester Fall`, "Gezählt werden nur echte Praxis-Aufgaben, vor allem Rückgaben ohne Ausfallschutz. Fälle mit BFS-Saldo 0, deren wirtschaftlicher Grund noch unklar ist, liegen separat unter Zahlung / Grund prüfen.", caseSparklineForPeriod(managementComparison.openCases, managementComparison.currentPeriod, "count")],
    ["Ältester Praxisfall", `${oldestOpenCase} Tage`, "älteste Nachfassposition", "Alter des ältesten Praxis-Nachfassfalls im aktuellen Filter. Saldo-geschlossene Prüffälle werden hier nicht mitgezählt.", caseSparklineForPeriod(managementComparison.openCases, managementComparison.currentPeriod, "oldest")]
  ];
  return (
    <div className="content-stack">
      <CockpitFilterBar
        periodOptions={periodOptions}
        selectedPeriodId={cockpitPeriodId}
        onPeriodChange={setCockpitPeriodId}
        selectedStandort={groupStandortFilter}
        onStandortChange={setGroupStandortFilter}
        scopeLabel={cockpitScopeLabel}
        detail={cockpitPeriod.detail}
      />
      <KpiGrid cards={groupKpis} className="cockpit-kpi-grid" />
      <CockpitChartFilterBar
        periodOptions={periodOptions}
        selectedPeriodId={chartPeriodId}
        onPeriodChange={setChartPeriodId}
        selectedStandort={chartStandortFilter}
        onStandortChange={setChartStandortFilter}
        scopeLabel={chartScopeLabel}
        detail={chartPeriod.detail}
      />
      <section className="chart-grid management-chart-grid">
        {groupChartSeries.map((chart) => (
          <div className="panel mini-chart year-chart-panel cockpit-combo-panel" key={chart.title}>
            <h2>{chart.title}</h2>
            <small className="period-note">
              {chart.title.includes("Standortvergleich") ? `Je Standort · ${chartPeriod.label} vs. Vorjahr` : `${chartScopeLabel} · ${chartPeriod.label} vs. Vorjahr`}
            </small>
            <ManagementComboChart title={chart.title} values={chart.values} format={chart.format} />
          </div>
        ))}
      </section>
      <section className="management-summary-grid">
        <ManagementDeltaPanel comparison={managementComparison} />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Standort-Benchmark</h2>
            <p>Zeitraum: {benchmarkPeriod.label}. Chronologisch nach Vertragsstart: Volumen, Gebühren, Rückbelastungen, Ohne-Ausfallschutz und offene Fälle je Standort.</p>
          </div>
          <div className="benchmark-panel-actions">
            <label className="select-label benchmark-period-select">
              Zeitraum Benchmark
              <select value={benchmarkPeriodId} onChange={(event) => setBenchmarkPeriodId(event.target.value)}>
                {periodOptions.map((period) => (
                  <option key={period.id} value={period.id}>{period.label}</option>
                ))}
              </select>
            </label>
            <button className="secondary-button" onClick={() => onNavigate("benchmark")}><BarChart3 size={16} /> Vollansicht</button>
          </div>
        </div>
        <LocationBenchmarkCards snapshots={benchmarkSnapshots} compact />
      </section>
    </div>
  );
}

function InteractiveBars({ title, values }: { title: string; values: { label: string; value: number; detailLabel?: string }[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeValue = activeIndex === null ? undefined : values[activeIndex] ?? values[0];
  const valueLabel = activeValue ? formatChartValue(title, activeValue.value) : "";
  const maxValue = Math.max(...values.map((value) => value.value), 1);
  const isSingleValue = values.length === 1;
  const rawActiveLeft = activeIndex === null || !values.length ? 50 : ((activeIndex + 0.5) / values.length) * 100;
  const activeLeft = Math.min(78, Math.max(22, rawActiveLeft));
  const tooltipStyle = activeIndex === 0
    ? { left: 12, transform: "none" }
    : activeIndex === values.length - 1
      ? { right: 12, transform: "none" }
      : { left: `${activeLeft}%` };

  return (
    <div className={isSingleValue ? "interactive-chart single-value" : "interactive-chart"}>
      <MetricInfo title={title} text={chartExplanation(title, values)} />
      <div className="chart-legend">
        <span />
        <strong>{chartLegendLabel(title)}</strong>
      </div>
      {activeValue && (
        <div
          className="chart-tooltip active"
          style={tooltipStyle}
        >
          <strong>{activeValue.label}</strong>
          <span>{chartLegendLabel(title)}: {valueLabel}{activeValue.detailLabel ? ` (${activeValue.detailLabel})` : ""}</span>
        </div>
      )}
      <div className="bars" role="list" aria-label={title} onPointerLeave={() => setActiveIndex(null)}>
        {values.map((value, index) => (
          <span className={`bar-slot${index === activeIndex ? " active" : ""}`} key={value.label}>
            <button
              type="button"
              className={index === activeIndex ? "active" : ""}
              style={{ height: `${isSingleValue && value.value > 0 ? 72 : Math.max(value.value ? 18 : 3, (value.value / maxValue) * 100)}%` }}
              aria-label={`${value.label}: ${formatChartValue(title, value.value)}${value.detailLabel ? ` (${value.detailLabel})` : ""}`}
              onPointerEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={() => setActiveIndex(index)}
            />
          </span>
        ))}
      </div>
      <div className="axis">{values.map((value) => <span key={value.label}>{value.label}</span>)}</div>
    </div>
  );
}

function CaseColumnChart({ title, values, valueKind }: { title: string; values: { label: string; value: number; detailLabel?: string }[]; valueKind: "money" | "count" }) {
  const maxValue = Math.max(...values.map((value) => value.value), 1);
  const format = (value: number) => valueKind === "money" ? exactMoney.format(value) : integerNumber.format(value);
  return (
    <div className="case-column-chart" role="img" aria-label={title}>
      <div className="case-column-plot">
        {values.map((entry) => (
          <div className="case-column-slot" key={entry.label}>
            <strong>{format(entry.value)}</strong>
            <div className="case-column-track">
              <span style={{ height: `${Math.max(entry.value ? 12 : 2, (entry.value / maxValue) * 100)}%` }} />
            </div>
            <small>{entry.label}</small>
            {entry.detailLabel && <em>{entry.detailLabel}</em>}
          </div>
        ))}
        {!values.length && <p className="empty-state">Keine Werte für die aktuelle Auswahl.</p>}
      </div>
    </div>
  );
}

type CashflowWaterfallStep = {
  label: string;
  amount: number;
  start: number;
  end: number;
  tone: "start" | "negative" | "positive" | "final";
  detail: string;
};

function CashflowWaterfallChart({
  steps,
  periodLabel,
  scopeLabel,
  payout,
  openDeduction,
  recoveredCount
}: {
  steps: CashflowWaterfallStep[];
  periodLabel: string;
  scopeLabel: string;
  payout: number;
  openDeduction: number;
  recoveredCount: number;
}) {
  const maxValue = Math.max(...steps.flatMap((step) => [step.start, step.end, Math.abs(step.amount)]), 1);
  const chartHeight = 260;
  const yFor = (value: number) => chartHeight - (Math.max(0, value) / maxValue) * chartHeight;
  const finalAmount = steps.at(-1)?.end ?? 0;
  const bridgeDelta = payout ? finalAmount - payout : 0;

  return (
    <div className="cashflow-waterfall">
      <div className="cashflow-waterfall-summary">
        <article>
          <span>Eingereicht</span>
          <strong>{money.format(steps[0]?.end ?? 0)}</strong>
        </article>
        <article>
          <span>BFS-Auszahlung laut Import</span>
          <strong>{money.format(payout)}</strong>
        </article>
        <article>
          <span>Zurückgeholt / bezahlt</span>
          <strong>{integerNumber.format(recoveredCount)}</strong>
        </article>
        <article>
          <span>Offener Abzug</span>
          <strong>{money.format(openDeduction)}</strong>
        </article>
        <article>
          <span>Wirtschaftlich verbleibend</span>
          <strong>{money.format(finalAmount)}</strong>
        </article>
      </div>
      <div className="cashflow-waterfall-chart" role="img" aria-label={`CashFlow-Herleitung ${scopeLabel}, ${periodLabel}`}>
        <div className="cashflow-waterfall-grid" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        {steps.map((step) => {
          const top = yFor(Math.max(step.start, step.end));
          const bottom = yFor(Math.min(step.start, step.end));
          const height = Math.max(8, bottom - top);
          return (
            <div className={`waterfall-step ${step.tone}`} key={step.label}>
              <div className="waterfall-bar-space" style={{ height: chartHeight }}>
                <span
                  className="waterfall-bar"
                  style={{
                    height,
                    top
                  }}
                />
              </div>
              <strong>{money.format(step.amount)}</strong>
              <span>{step.label}</span>
              <small>{step.detail}</small>
            </div>
          );
        })}
      </div>
      <div className="cashflow-waterfall-note">
        <span>{scopeLabel} · {periodLabel}</span>
        <strong>{payout ? `Differenz zur BFS-Auszahlung nach späteren Abzügen/Erledigungen: ${money.format(bridgeDelta)}` : "Keine BFS-Auszahlung im Filter erkannt"}</strong>
      </div>
    </div>
  );
}

function LocationRevenueBars({ title, values }: { title: string; values: { label: string; value: number; detailLabel?: string }[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartValues = values.length ? values : [{ label: "Keine Daten", value: 0 }];
  const activeValue = activeIndex === null ? undefined : chartValues[Math.min(activeIndex, chartValues.length - 1)];
  const maxValue = Math.max(...chartValues.map((value) => value.value), 1);
  const total = chartValues.reduce((sum, value) => sum + value.value, 0);

  return (
    <div className="location-revenue-chart">
      {activeValue && (
        <div className="location-revenue-tooltip">
          <strong>{activeValue.label}</strong>
          <span>{title.includes("ausgezahlt") ? "Umsatz ausgezahlt" : "Umsatz kumuliert"}: {money.format(activeValue.value)}</span>
          {activeValue.detailLabel && <em>{activeValue.detailLabel}</em>}
        </div>
      )}
      <div className="location-revenue-total">
        <span>Gesamt</span>
        <strong>{money.format(total)}</strong>
      </div>
      <div className="location-revenue-scroll" role="list" aria-label={title} onPointerLeave={() => setActiveIndex(null)}>
        {chartValues.map((value, index) => {
          const width = value.value ? 18 + (value.value / maxValue) * 82 : 0;
          return (
            <button
              type="button"
              className={index === activeIndex ? "location-revenue-bar active" : "location-revenue-bar"}
              key={value.label}
              aria-label={`${value.label}: Umsatz kumuliert ${money.format(value.value)}${value.detailLabel ? `, ${value.detailLabel}` : ""}`}
              onPointerEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={() => setActiveIndex(index)}
            >
              <b>{value.label}</b>
              <span className="location-revenue-bar-track" style={{ "--bar-width": `${width}%` } as CSSProperties & Record<"--bar-width", string>}>
                <i style={{ width: `${width}%` }} />
                <small>{money.format(value.value)}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type ManagementComparison = ReturnType<typeof buildManagementComparison>;

function ManagementDeltaPanel({ comparison }: { comparison: ManagementComparison }) {
  const quarterRows = buildQuarterComparison(comparison.standortIds, comparison.importRows);
  const currentQuarter = quarterRows[0];
  const previousQuarter = quarterRows[1];
  const quarterDelta = currentQuarter && previousQuarter?.submitted
    ? ((currentQuarter.submitted - previousQuarter.submitted) / previousQuarter.submitted) * 100
    : 0;
  return (
    <article className="panel management-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Lage & Entwicklung</span>
          <h2>YTD, Quartal und Vorjahr auf einen Blick</h2>
          <p>Diese Sicht bewertet Entwicklung und Abweichung, bevor operative Falllisten geöffnet werden.</p>
        </div>
      </div>
      <div className="management-delta-grid">
        <span><b>{money.format(comparison.currentMetrics.submitted)}</b> YTD 2026</span>
        <span><b>{money.format(comparison.previousMetrics.submitted)}</b> Vorjahr YTD</span>
        <span className={comparison.submittedDelta >= 0 ? "positive" : "negative"}><b>{money.format(comparison.submittedDelta)}</b> Delta EUR</span>
        <span className={comparison.submittedDeltaRate >= 0 ? "positive" : "negative"}><b>{formatDelta(comparison.submittedDeltaRate)}</b> Delta Prozent</span>
        <span><b>{currentQuarter?.label ?? "-"}</b> aktuelles Quartal</span>
        <span className={quarterDelta >= 0 ? "positive" : "negative"}><b>{formatDelta(quarterDelta)}</b> ggü. Vorquartal</span>
      </div>
    </article>
  );
}

type ComparisonChartValue = { label: string; current: number; previous: number; context?: string; currentYear?: number; previousYear?: number };

function ManagementComboChart({
  title,
  values,
  format
}: {
  title: string;
  values: ComparisonChartValue[];
  format: (value: number) => string;
}) {
  const fallbackYear = todayReference.getFullYear();
  const chartValues = values.length ? values : [{ label: "-", current: 0, previous: 0, currentYear: fallbackYear, previousYear: fallbackYear - 1 }];
  const defaultCurrentYear = chartValues[0]?.currentYear ?? fallbackYear;
  const defaultPreviousYear = chartValues[0]?.previousYear ?? defaultCurrentYear - 1;
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, chartValues.length - 1));
  const activeValue = chartValues[Math.min(activeIndex, chartValues.length - 1)] ?? chartValues[0];
  const maxValue = Math.max(...chartValues.flatMap((value) => [value.current, value.previous]), 1);
  const width = 420;
  const height = 230;
  const padding = { top: 18, right: 20, bottom: 38, left: 24 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xFor = (index: number) => padding.left + (chartValues.length === 1 ? plotWidth / 2 : (index / (chartValues.length - 1)) * plotWidth);
  const yFor = (value: number) => padding.top + plotHeight - (value / maxValue) * plotHeight;
  const barWidth = Math.max(12, Math.min(42, plotWidth / Math.max(chartValues.length, 1) * 0.48));
  const previousLine = chartValues.map((value, index) => `${index === 0 ? "M" : "L"} ${xFor(index).toFixed(1)} ${yFor(value.previous).toFixed(1)}`).join(" ");
  const activeX = chartValues.length === 1 ? 50 : (activeIndex / (chartValues.length - 1)) * 100;
  const currentTotal = chartValues.reduce((sum, value) => sum + value.current, 0);
  const previousTotal = chartValues.reduce((sum, value) => sum + value.previous, 0);
  const delta = previousTotal ? ((currentTotal - previousTotal) / previousTotal) * 100 : currentTotal ? 100 : 0;
  const activeCurrentYear = activeValue.currentYear ?? defaultCurrentYear;
  const activeLabel = Number.isInteger(Number(activeValue.label))
    ? monthAxisLabel(activeValue.label, activeCurrentYear)
    : activeValue.label;
  const normalizedTitle = title.toLowerCase();
  const tone = normalizedTitle.includes("rück") || normalizedTitle.includes("storno")
    ? "risk"
    : normalizedTitle.includes("standort")
      ? "benchmark"
      : "revenue";

  return (
    <div className={`management-combo-chart ${tone}`} aria-label={title} onPointerLeave={() => setActiveIndex(Math.max(0, chartValues.length - 1))}>
      <div className="combo-chart-summary">
        <div className="combo-legend">
          <span><i className="current" /> {defaultCurrentYear}</span>
          <span><i className="previous" /> {defaultPreviousYear}</span>
        </div>
        <strong className={delta >= 0 ? "positive" : "negative"}>{formatDelta(delta)}</strong>
      </div>
      <div className="combo-chart-canvas">
        <div className="combo-chart-tooltip" style={{ left: `${Math.max(16, Math.min(84, activeX))}%` }}>
          <span>{activeValue.context ?? activeLabel}</span>
          <strong>{format(activeValue.current)}</strong>
          <small>{activeLabel} · Vorjahr {format(activeValue.previous)}</small>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}: Balken ${defaultCurrentYear}, Linie ${defaultPreviousYear}`}>
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line key={ratio} className="combo-grid-line" x1={padding.left} x2={width - padding.right} y1={padding.top + plotHeight * ratio} y2={padding.top + plotHeight * ratio} />
          ))}
          {chartValues.map((value, index) => {
            const x = xFor(index);
            const y = yFor(value.current);
            const barHeight = Math.max(value.current ? 4 : 2, padding.top + plotHeight - y);
            const label = Number.isInteger(Number(value.label)) ? monthAxisLabel(value.label, value.currentYear ?? defaultCurrentYear) : value.label;
            return (
              <g key={`${value.label}-${index}`}>
                <rect className={index === activeIndex ? "combo-current-bar active" : "combo-current-bar"} x={x - barWidth / 2} y={padding.top + plotHeight - barHeight} width={barWidth} height={barHeight} rx="7" />
                <rect
                  className="combo-hit-area"
                  x={x - Math.max(24, barWidth)}
                  y={padding.top}
                  width={Math.max(48, barWidth * 2)}
                  height={plotHeight}
                  tabIndex={0}
                  role="button"
                  aria-label={`${value.context ?? label}: ${format(value.current)}, Vorjahr ${format(value.previous)}`}
                  onFocus={() => setActiveIndex(index)}
                  onPointerEnter={() => setActiveIndex(index)}
                  onClick={() => setActiveIndex(index)}
                />
                <text className="combo-axis-label" x={x} y={height - 10}>{label}</text>
              </g>
            );
          })}
          <path className="combo-previous-line" d={previousLine} />
          {chartValues.map((value, index) => (
            <circle key={`${value.label}-previous`} className={index === activeIndex ? "combo-line-point active" : "combo-line-point"} cx={xFor(index)} cy={yFor(value.previous)} r="4" />
          ))}
        </svg>
      </div>
    </div>
  );
}

function YearComparisonLines({
  title,
  values,
  format
}: {
  title: string;
  values: { label: string; current: number; previous: number; context?: string; currentYear?: number; previousYear?: number }[];
  format: (value: number) => string;
}) {
  const defaultCurrentYear = values[0]?.currentYear ?? todayReference.getFullYear();
  const defaultPreviousYear = values[0]?.previousYear ?? defaultCurrentYear - 1;
  const [activePoint, setActivePoint] = useState<{ label: string; year: number; value: number; context?: string; index: number } | null>(null);
  const chartValues = values.length ? values : [{ label: "01", current: 0, previous: 0, currentYear: defaultCurrentYear, previousYear: defaultPreviousYear }];
  const maxValue = Math.max(...chartValues.flatMap((value) => [value.current, value.previous]), 1);
  const minValue = Math.min(...chartValues.flatMap((value) => [value.current, value.previous]), 0);
  const range = Math.max(maxValue - minValue, 1);
  const width = 360;
  const height = 190;
  const padding = { top: 22, right: 18, bottom: 34, left: 18 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const active = activePoint ?? {
    label: chartValues[chartValues.length - 1].label,
    year: chartValues[chartValues.length - 1].currentYear ?? defaultCurrentYear,
    value: chartValues[chartValues.length - 1].current,
    context: chartValues[chartValues.length - 1].context,
    index: chartValues.length - 1
  };
  const activeValueStyle = active.index === 0
    ? { left: 0, right: "auto", transform: "none" }
    : active.index === chartValues.length - 1
      ? { left: "auto", right: 0, transform: "none" }
      : { left: `${chartValues.length === 1 ? 50 : (active.index / (chartValues.length - 1)) * 100}%`, right: "auto", transform: "translateX(-50%)" };
  const pointFor = (entry: typeof chartValues[number], index: number, key: "current" | "previous") => {
    const x = padding.left + (chartValues.length === 1 ? plotWidth / 2 : (index / (chartValues.length - 1)) * plotWidth);
    const y = padding.top + plotHeight - (((entry[key] - minValue) / range) * plotHeight);
    return { x, y };
  };
  const pathFor = (key: "current" | "previous") => chartValues.map((entry, index) => {
    const point = pointFor(entry, index, key);
    return `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }).join(" ");

  return (
    <div className="year-line-chart" aria-label={title}>
      <div className="year-chart-head">
        <div className="year-legend detailed">
          <span><i className="previous" /> Vorjahr {defaultPreviousYear}</span>
          <span><i className="current" /> Aktuell {defaultCurrentYear}</span>
        </div>
        <div className="year-active-value" style={activeValueStyle}>
          <span>{active.context ?? title}</span>
          <em>{monthLabelForYear(active.label, active.year)}</em>
          <strong>{format(active.value)}</strong>
        </div>
      </div>
      <svg className="year-line-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}: Vorjahr gegen aktuelles Jahr`}>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line key={ratio} className="grid-line" x1={padding.left} x2={width - padding.right} y1={padding.top + plotHeight * ratio} y2={padding.top + plotHeight * ratio} />
        ))}
        <path className="line previous-line" d={pathFor("previous")} />
        <path className="line current-line" d={pathFor("current")} />
        {chartValues.map((entry, index) => {
          const previousPoint = pointFor(entry, index, "previous");
          const currentPoint = pointFor(entry, index, "current");
          return (
            <g key={entry.label}>
              <circle
                className="line-hit previous-hit"
                cx={previousPoint.x}
                cy={previousPoint.y}
                r="12"
                tabIndex={0}
                role="button"
                aria-label={`${entry.context ?? title}, Vorjahr ${monthLabelForYear(entry.label, entry.previousYear ?? defaultPreviousYear)}: ${format(entry.previous)}`}
                onFocus={() => setActivePoint({ label: entry.label, year: entry.previousYear ?? defaultPreviousYear, value: entry.previous, context: entry.context, index })}
                onPointerEnter={() => setActivePoint({ label: entry.label, year: entry.previousYear ?? defaultPreviousYear, value: entry.previous, context: entry.context, index })}
                onClick={() => setActivePoint({ label: entry.label, year: entry.previousYear ?? defaultPreviousYear, value: entry.previous, context: entry.context, index })}
              />
              <circle
                className="line-hit current-hit"
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="12"
                tabIndex={0}
                role="button"
                aria-label={`${entry.context ?? title}, aktuell ${monthLabelForYear(entry.label, entry.currentYear ?? defaultCurrentYear)}: ${format(entry.current)}`}
                onFocus={() => setActivePoint({ label: entry.label, year: entry.currentYear ?? defaultCurrentYear, value: entry.current, context: entry.context, index })}
                onPointerEnter={() => setActivePoint({ label: entry.label, year: entry.currentYear ?? defaultCurrentYear, value: entry.current, context: entry.context, index })}
                onClick={() => setActivePoint({ label: entry.label, year: entry.currentYear ?? defaultCurrentYear, value: entry.current, context: entry.context, index })}
              />
            </g>
          );
        })}
        {chartValues.map((entry, index) => {
          const point = pointFor(entry, index, "current");
          return <text className="line-axis-label" key={`label-${entry.label}`} x={point.x} y={height - 8}>{monthAxisLabel(entry.label, entry.currentYear ?? defaultCurrentYear)}</text>;
        })}
      </svg>
    </div>
  );
}

const shortMonthLabels = ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function shortMonthYearLabel(year: number, monthIndex: number) {
  return `${shortMonthLabels[monthIndex] ?? String(monthIndex + 1).padStart(2, "0")} ${String(year).slice(-2)}`;
}

function monthLabelForYear(label: string, year: number) {
  const monthNumber = Number(label);
  if (Number.isInteger(monthNumber) && monthNumber >= 1 && monthNumber <= 12) return shortMonthYearLabel(year, monthNumber - 1);
  return label;
}

function monthAxisLabel(label: string, year: number) {
  return monthLabelForYear(label, year);
}

function chartLegendLabel(title: string) {
  const valueKind = chartValueKind(title);
  if (valueKind === "percent") return "Quote";
  if (valueKind === "money") return title.toLowerCase().includes("umsatz") ? "Umsatz eingereicht" : "Betrag";
  if (valueKind === "cases") return title.toLowerCase().includes("rück") ? "Rückläufer" : "Fälle";
  return "Anzahl";
}

function chartExplanation(title: string, values: { label: string; value: number; detailLabel?: string }[]) {
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
  const valueKind = chartValueKind(title);
  if (valueKind === "money") return money.format(value);
  if (valueKind === "percent") return formatPercent(value);
  if (valueKind === "cases") {
    const normalizedTitle = title.toLowerCase();
    if (normalizedTitle.includes("rück") && normalizedTitle.includes("standort")) return `${integerNumber.format(value)} Rückläufer`;
    return `${integerNumber.format(value)} Fälle`;
  }
  return integerNumber.format(value);
}

function chartValueKind(title: string): "money" | "percent" | "cases" | "count" {
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle.includes("quote")) return "percent";
  if (normalizedTitle.includes("neueinreichungen je standort") || normalizedTitle.includes("ohne-schutz-selektion")) return "count";
  if (
    normalizedTitle.includes("umsatz") ||
    normalizedTitle.includes("betrag") ||
    normalizedTitle.includes("kosten") ||
    normalizedTitle.includes("gebühr") ||
    normalizedTitle.includes("abzug") ||
    normalizedTitle.includes("einreichung") ||
    normalizedTitle.includes("risikoart") ||
    normalizedTitle.includes("gründe ohne schutz")
  ) {
    return "money";
  }
  if (
    normalizedTitle.includes("fälle") ||
    normalizedTitle.includes("fall") ||
    normalizedTitle.includes("patientenqualität") ||
    normalizedTitle.includes("rückbelastungen") ||
    normalizedTitle.includes("zahlungsstatus") ||
    normalizedTitle.includes("maßnahmenstatus")
  ) {
    return "cases";
  }
  return "count";
}

function buildGroupDashboardSeries(rowsStandorte: Standort[], period: PeriodOption, importRows: ImportPreviewRow[] = []) {
  const activeRows = rowsStandorte.filter((standort) => standortActiveInPeriod(standort, period));
  const sourceRows = activeRows.length ? activeRows : rowsStandorte;
  const metricsFor = (standort: Standort) => metricsFromImportRowsForStandort(importRows, standort, period);
  return [
    {
      title: "Umsatz eingereicht je Standort",
      values: sourceRows.map((standort) => {
        const metrics = metricsFor(standort);
        return {
          label: standort.name,
          value: metrics.submitted
        };
      })
    },
    {
      title: "Umsatz ausgezahlt je Standort",
      values: sourceRows.map((standort) => {
        const metrics = metricsFor(standort);
        return {
          label: standort.name,
          value: metrics.payout,
          detailLabel: `${formatPercent(metrics.submitted ? (metrics.payout / metrics.submitted) * 100 : 0)} vom eingereichten Umsatz`
        };
      })
    }
  ];
}

function buildManagementChartSeries(rowsStandorte: Standort[], importRows: ImportPreviewRow[] = [], period: PeriodOption) {
  return [
    {
      title: "Monatsentwicklung eingereichter Umsatz",
      format: (value: number) => money.format(value),
      values: buildYearMonthComparison(rowsStandorte, importRows, "submitted", period)
    },
    {
      title: "Rückbelastungen/Stornos je Monat",
      format: (value: number) => money.format(value),
      values: buildYearMonthComparison(rowsStandorte, importRows, "deductionAmount", period)
    },
    {
      title: "Standortvergleich eingereicht",
      format: (value: number) => money.format(value),
      values: buildLocationYtdDeltaComparison(rowsStandorte, importRows, period)
    }
  ];
}

function buildManagementComparison(importRows: ImportPreviewRow[], relevantStandorte: Standort[], openCases: BfsCase[], period?: PeriodOption, manualCaseResolutions: ManualCaseResolution[] = []) {
  const currentPeriod = comparableCurrentPeriod(period ?? ytdPeriod(todayReference.getFullYear()));
  const previousPeriod = previousYearPeriod(currentPeriod);
  const currentRows = rowsForSparklinePeriod(importRows, relevantStandorte, currentPeriod);
  const previousRows = rowsForSparklinePeriod(importRows, relevantStandorte, previousPeriod);
  const currentMetrics = metricsFromRows(currentRows);
  const previousMetrics = metricsFromRows(previousRows);
  const deductionRecovery = buildDeductionRecovery(importRows, relevantStandorte, currentPeriod, manualCaseResolutions);
  const deductionAmount = deductionRecovery.grossDeductionAmount;
  const recoveredAmount = deductionRecovery.recoveredAmount;
  const currentOpenCases = openCases.filter((fall) => {
    const standort = relevantStandorte.find((entry) => entry.id === fall.standortId);
    return standort ? shortDateInPeriod(fall.sourceDate, currentPeriod, standort) : false;
  });
  const submittedDelta = currentMetrics.submitted - previousMetrics.submitted;
  const submittedDeltaRate = previousMetrics.submitted ? (submittedDelta / previousMetrics.submitted) * 100 : currentMetrics.submitted ? 100 : 0;
  return {
    importRows,
    standortIds: relevantStandorte.map((standort) => standort.id),
    currentPeriod,
    previousPeriod,
    currentMetrics,
    previousMetrics,
    submittedDelta,
    submittedDeltaRate,
    deductionAmount,
    recoveredAmount,
    recoveryRate: deductionAmount ? Math.min(100, (recoveredAmount / deductionAmount) * 100) : 0,
    chargebackRate: currentMetrics.submitted ? (deductionAmount / currentMetrics.submitted) * 100 : 0,
    noProtectionShare: currentMetrics.submitted ? (currentMetrics.noProtectionAmount / currentMetrics.submitted) * 100 : 0,
    openCases: currentOpenCases
  };
}

function ytdPeriod(year: number): PeriodOption {
  return {
    id: `year-${year}-ytd`,
    label: `${year} YTD`,
    detail: "Jahresbeginn bis aktueller Stichtag",
    start: new Date(year, 0, 1),
    end: year === todayReference.getFullYear() ? todayReference : new Date(year, todayReference.getMonth(), todayReference.getDate())
  };
}

function metricsFromRows(rows: ImportPreviewRow[]) {
  const summary = summarizeImportRows(rows);
  return summary.rows ? metricsFromImportSummary(summary) : zeroMetrics();
}

function buildYearMonthComparison(rowsStandorte: Standort[], importRows: ImportPreviewRow[], metric: "submitted" | "feeRate" | "deductionAmount", period: PeriodOption) {
  const comparisonPeriod = comparableCurrentPeriod(period);
  const currentYear = comparisonPeriod.start?.getFullYear() ?? todayReference.getFullYear();
  const previousYear = currentYear - 1;
  const startMonth = comparisonPeriod.start?.getMonth() ?? 0;
  const periodEndMonth = comparisonPeriod.end?.getMonth() ?? (currentYear === todayReference.getFullYear() ? todayReference.getMonth() : 11);
  const latestImportedMonth = latestImportedMonthForYear(importRows, rowsStandorte, currentYear, comparisonPeriod);
  const endMonth = latestImportedMonth === null
    ? periodEndMonth
    : Math.max(startMonth, Math.min(periodEndMonth, latestImportedMonth));
  const context = rowsStandorte.length === 1 ? rowsStandorte[0].name : "Alle Standorte";
  return Array.from({ length: endMonth - startMonth + 1 }, (_, offset) => {
    const monthIndex = startMonth + offset;
    const currentRows = rowsForMonth(importRows, rowsStandorte, currentYear, monthIndex);
    const previousRows = rowsForMonth(importRows, rowsStandorte, previousYear, monthIndex);
    return {
      label: String(monthIndex + 1).padStart(2, "0"),
      context,
      currentYear,
      previousYear,
      current: metricValueForRows(currentRows, metric),
      previous: metricValueForRows(previousRows, metric)
    };
  });
}

function latestImportedMonthForYear(importRows: ImportPreviewRow[], rowsStandorte: Standort[], year: number, period: PeriodOption) {
  return importRows.reduce<number | null>((latestMonth, row) => {
    const standort = rowsStandorte.find((entry) => entry.name === row.location);
    if (!standort) return latestMonth;
    const month = importRowMonth(row);
    const match = month.match(/^(\d{4})-(\d{2})$/);
    if (!match || Number(match[1]) !== year) return latestMonth;
    if (!importRowInPeriod(row, period, standort)) return latestMonth;
    const monthIndex = Number(match[2]) - 1;
    return latestMonth === null ? monthIndex : Math.max(latestMonth, monthIndex);
  }, null);
}

function buildLocationYtdDeltaComparison(rowsStandorte: Standort[], importRows: ImportPreviewRow[], period: PeriodOption) {
  const currentPeriod = comparableCurrentPeriod(period);
  const previousPeriod = previousYearPeriod(currentPeriod);
  const currentYear = currentPeriod.start?.getFullYear() ?? todayReference.getFullYear();
  const previousYear = currentYear - 1;
  return rowsStandorte
    .filter((standort) => standortActiveInPeriod(standort, currentPeriod))
    .map((standort) => ({
      label: standort.name,
      context: standort.name,
      currentYear,
      previousYear,
      current: metricsFromImportRowsForStandort(importRows, standort, currentPeriod).submitted,
      previous: metricsFromImportRowsForStandort(importRows, standort, previousPeriod).submitted
    }));
}

function rowsForMonth(importRows: ImportPreviewRow[], rowsStandorte: Standort[], year: number, monthIndex: number) {
  const month = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  return importRows.filter((row) => {
    const standort = rowsStandorte.find((entry) => entry.name === row.location);
    return standort && importRowMonth(row) === month && month >= standort.goLiveDate.slice(0, 7);
  });
}

function metricValueForRows(rows: ImportPreviewRow[], metric: "submitted" | "feeRate" | "deductionAmount") {
  const metrics = metricsFromRows(rows);
  if (metric === "submitted") return metrics.submitted;
  if (metric === "feeRate") return metrics.feeRate;
  return metrics.returnAmount + metrics.cancellationAmount;
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

function LocationBenchmarkCards({ snapshots, previousSnapshots = [], compact = false }: { snapshots: LocationSnapshot[]; previousSnapshots?: LocationSnapshot[]; compact?: boolean }) {
  const visible = [...snapshots].sort((a, b) => compareStandorteByContractStart(a.standort, b.standort));
  const previousByStandort = new Map(previousSnapshots.map((entry) => [entry.standort.id, entry]));
  return (
    <div className={compact ? "location-card-grid compact" : "location-card-grid"}>
      {visible.map((entry) => {
        const previous = previousByStandort.get(entry.standort.id);
        return (
          <article className={`location-benchmark-card ${entry.riskScore >= 35 ? "red" : entry.riskScore > 0 ? "amber" : "green"}`} key={entry.standort.id}>
            <div className="location-card-head">
              <div>
                <span>Seit {entry.standort.goLiveLabel} · {entry.status}</span>
                <strong>{entry.standort.name}</strong>
              </div>
              <StatusBadge status={entry.riskScore >= 35 ? "prüfen" : entry.riskScore > 0 ? "beobachten" : "OK"} />
            </div>
            <div className="location-metric-grid">
              <LocationMetricTile label="Umsatz" value={money.format(entry.metrics.submitted)} current={entry.metrics.submitted} previous={previous?.metrics.submitted ?? 0} format={money.format} />
              <LocationMetricTile label="Auszahlung" value={money.format(entry.metrics.payout)} current={entry.metrics.payout} previous={previous?.metrics.payout ?? 0} format={money.format} />
              <LocationMetricTile label="Gebühr" value={formatFeeRate(entry.metrics.feeRate)} current={entry.metrics.feeRate} previous={previous?.metrics.feeRate ?? 0} format={formatFeeRate} />
              <span className="location-metric-with-info">
                <MetricInfo title={`Rückbelastungsquote ${entry.standort.name}`} text={locationChargebackRateInfo(entry)} />
                <LocationMetricTile label="Rückbelastung" value={formatPercent(entry.chargebackRate)} current={entry.chargebackRate} previous={previous?.chargebackRate ?? 0} format={formatPercent} bare />
              </span>
              <LocationMetricTile label="ohne Schutz" value={money.format(entry.metrics.noProtectionAmount)} current={entry.metrics.noProtectionAmount} previous={previous?.metrics.noProtectionAmount ?? 0} format={money.format} />
              <LocationMetricTile label="ohne Schutz Quote" value={formatPercent(entry.noProtectionCaseRate)} current={entry.noProtectionCaseRate} previous={previous?.noProtectionCaseRate ?? 0} format={formatPercent} />
              <LocationMetricTile label="Praxis nachfassen" value={String(entry.openCases)} current={entry.openCases} previous={previous?.openCases ?? 0} format={integerNumber.format} />
              <LocationMetricTile label="ältester Fall" value={`${entry.oldest} Tage`} current={entry.oldest} previous={previous?.oldest ?? 0} format={(value) => `${integerNumber.format(value)} Tage`} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function LocationMetricTile({ label, value, current, previous, format, bare = false }: { label: string; value: string; current: number; previous: number; format: (value: number) => string; bare?: boolean }) {
  const delta = previous ? ((current - previous) / previous) * 100 : current ? 100 : 0;
  const deltaClass = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
  const content = (
    <>
      <b>{value}</b>
      {label}
      <small className={deltaClass}>Vorjahr {format(previous)} · {formatDelta(delta)}</small>
    </>
  );
  return bare ? content : <span>{content}</span>;
}

function locationChargebackRateInfo(entry: LocationSnapshot) {
  const chargebackAmount = entry.metrics.returnAmount + entry.metrics.cancellationAmount;
  return [
    `Herleitung Rückbelastungsquote: Rückgaben/Rückbelastungen plus Stornos geteilt durch eingereichten Umsatz.`,
    `${money.format(chargebackAmount)} / ${money.format(entry.metrics.submitted)} = ${formatPercent(entry.chargebackRate)}.`,
    `Rückgaben/Rückbelastungen: ${entry.metrics.returnCount} Fall/Fälle mit ${money.format(entry.metrics.returnAmount)}. Stornos: ${entry.metrics.cancellationCount} Fall/Fälle mit ${money.format(entry.metrics.cancellationAmount)}.`,
    `Zusatzinfo ohne Ausfallschutz: ${entry.noProtectionClaimCount} von ${entry.claimCount} erkannten Forderungspositionen laufen ohne Schutz, also ${formatPercent(entry.noProtectionCaseRate)}.`
  ].join(" ");
}

function buildBenchmarkSignals(snapshots: LocationSnapshot[], scopedRows: ImportPreviewRow[], manualCaseResolutions: ManualCaseResolution[] = []) {
  const growing = [...snapshots]
    .map((snapshot) => {
      const comparison = buildManagementComparison(scopedRows, [snapshot.standort], [], undefined, manualCaseResolutions);
      return { snapshot, delta: comparison.submittedDeltaRate };
    })
    .sort((a, b) => b.delta - a.delta);
  const expensive = [...snapshots].sort((a, b) => b.metrics.feeRate - a.metrics.feeRate);
  const weakQuality = [...snapshots].sort((a, b) => b.chargebackRate - a.chargebackRate || b.noProtectionCaseRate - a.noProtectionCaseRate);
  const goodRecovery = [...snapshots].sort((a, b) => {
    const aComparison = buildManagementComparison(scopedRows, [a.standort], [], undefined, manualCaseResolutions);
    const bComparison = buildManagementComparison(scopedRows, [b.standort], [], undefined, manualCaseResolutions);
    return bComparison.recoveryRate - aComparison.recoveryRate;
  });
  return [
    {
      title: "Wer wächst?",
      items: [
        `${growing[0]?.snapshot.standort.name ?? "-"} führt beim YTD-Delta (${formatDelta(growing[0]?.delta ?? 0)})`,
        `${growing.at(-1)?.snapshot.standort.name ?? "-"} ist im Wachstum schwächster Vergleichspunkt`,
        "Wachstum immer gegen Gebührenquote und Rückbelastung lesen"
      ]
    },
    {
      title: "Wer wird teurer?",
      items: [
        `${expensive[0]?.standort.name ?? "-"} hat die höchste Gebührenquote (${formatFeeRate(expensive[0]?.metrics.feeRate ?? 0)})`,
        `${expensive[0]?.standort.name ?? "-"} gegen Gruppenschnitt und Monatsverlauf prüfen`,
        "Kostenanstieg ohne Volumenanstieg ist Management-Signal"
      ]
    },
    {
      title: "Forderungsqualität",
      items: [
        `${weakQuality[0]?.standort.name ?? "-"} hat den stärksten Qualitätsdruck`,
        `Rückbelastungsquote dort: ${formatPercent(weakQuality[0]?.chargebackRate ?? 0)}`,
        `Ohne-Schutz-Quote dort: ${formatPercent(weakQuality[0]?.noProtectionCaseRate ?? 0)}`
      ]
    },
    {
      title: "Wiedereinholung",
      items: [
        `${goodRecovery[0]?.standort.name ?? "-"} wirkt bei Wiedereinholung am stärksten`,
        "Hohe Rückbelastung mit guter Wiedereinholung ist anders zu bewerten als offene Rückbelastung",
        "Niedrige Rückbelastung mit schlechter Patientenselektion bleibt Standortthema"
      ]
    }
  ];
}

function BenchmarkView({ importRows, manualCaseResolutions = [], invoiceStatusRows = [] }: { importRows: ImportPreviewRow[]; manualCaseResolutions?: ManualCaseResolution[]; invoiceStatusRows?: ParsedInvoiceStatusRow[] }) {
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [comparisonPeriodId, setComparisonPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0], [periodOptions, selectedPeriodId]);
  const comparisonPeriod = useMemo(() => periodOptions.find((period) => period.id === comparisonPeriodId) ?? periodOptions[0], [comparisonPeriodId, periodOptions]);
  const closedCaseKeys = useMemo(() => buildClosedResolutionKeySet(manualCaseResolutions), [manualCaseResolutions]);
  const orderedLocations = useMemo(() => orderedStandorte(), []);
  const scopedRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = standorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedPeriod, rowStandort) : false;
  }), [importRows, selectedPeriod]);
  const openCases = useMemo(() => applyInvoiceStatusToCases(casesFromImportRows(scopedRows).filter((fall) => !fall.status.includes("erledigt") && !caseResolutionKeys(fall).some((key) => closedCaseKeys.has(key))), invoiceStatusRows).filter(isPracticeFollowupCase), [scopedRows, closedCaseKeys, invoiceStatusRows]);
  const snapshots = useMemo(() => buildLocationSnapshots(orderedLocations, selectedPeriod, scopedRows, openCases), [orderedLocations, selectedPeriod, scopedRows, openCases]);
  const comparisonRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = standorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, comparisonPeriod, rowStandort) : false;
  }), [comparisonPeriod, importRows]);
  const comparisonOpenCases = useMemo(() => applyInvoiceStatusToCases(casesFromImportRows(comparisonRows).filter((fall) => !fall.status.includes("erledigt") && !caseResolutionKeys(fall).some((key) => closedCaseKeys.has(key))), invoiceStatusRows).filter(isPracticeFollowupCase), [closedCaseKeys, comparisonRows, invoiceStatusRows]);
  const comparisonSnapshots = useMemo(() => buildLocationSnapshots(orderedLocations, comparisonPeriod, comparisonRows, comparisonOpenCases), [comparisonOpenCases, comparisonPeriod, comparisonRows, orderedLocations]);
  const previousComparisonPeriod = useMemo(() => previousYearPeriod(comparisonPeriod), [comparisonPeriod]);
  const previousComparisonRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = standorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, previousComparisonPeriod, rowStandort) : false;
  }), [importRows, previousComparisonPeriod]);
  const previousComparisonOpenCases = useMemo(() => applyInvoiceStatusToCases(casesFromImportRows(previousComparisonRows).filter((fall) => !fall.status.includes("erledigt") && !caseResolutionKeys(fall).some((key) => closedCaseKeys.has(key))), invoiceStatusRows).filter(isPracticeFollowupCase), [closedCaseKeys, previousComparisonRows, invoiceStatusRows]);
  const previousComparisonSnapshots = useMemo(() => buildLocationSnapshots(orderedLocations, previousComparisonPeriod, previousComparisonRows, previousComparisonOpenCases), [orderedLocations, previousComparisonOpenCases, previousComparisonPeriod, previousComparisonRows]);
  const highestVolume = useMemo(() => [...snapshots].sort((a, b) => b.metrics.submitted - a.metrics.submitted)[0], [snapshots]);
  const highestFees = useMemo(() => [...snapshots].sort((a, b) => b.metrics.feeRate - a.metrics.feeRate)[0], [snapshots]);
  const highestRisk = useMemo(() => [...snapshots].sort((a, b) => b.riskScore - a.riskScore || b.metrics.submitted - a.metrics.submitted)[0], [snapshots]);
  const benchmarkCharts = useMemo(() => buildGroupDashboardSeries(orderedLocations, selectedPeriod, scopedRows), [orderedLocations, selectedPeriod, scopedRows]);
  const benchmarkSignals = useMemo(() => buildBenchmarkSignals(snapshots, importRows, manualCaseResolutions), [snapshots, importRows, manualCaseResolutions]);

  return (
    <div className="content-stack">
      <section className="panel period-filter">
        <label className="select-label">
          Zeitraum Standort-Benchmark
          <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>
            {periodOptions.map((period) => <option key={period.id} value={period.id}>{period.label}</option>)}
          </select>
        </label>
      </section>
      <section className="priority-grid benchmark-priority-grid">
        <PriorityCard label="Höchstes Volumen" value={highestVolume?.standort.name ?? "-"} hint={money.format(highestVolume?.metrics.submitted ?? 0)} period={selectedPeriod.label} tone="blue" />
        <PriorityCard label="Höchste Gebührenquote" value={highestFees?.standort.name ?? "-"} hint={formatFeeRate(highestFees?.metrics.feeRate ?? 0)} period={selectedPeriod.label} tone={(highestFees?.metrics.feeRate ?? 0) ? "amber" : "green"} />
        <PriorityCard label="Auffälligster Standort" value={highestRisk?.standort.name ?? "-"} hint={`${highestRisk?.openCases ?? 0} Praxis-Nachfassfälle`} period={selectedPeriod.label} tone={(highestRisk?.riskScore ?? 0) >= 35 ? "red" : "amber"} info="Risikoscore aus Brutto-Storno/Rückgabe, Ohne-Ausfallschutz-Anteil und echten Praxis-Nachfassfällen. Zahlung/Grund-prüfen-Fälle werden separat geführt." />
      </section>
      <section className="insight-grid benchmark-signal-grid">
        {benchmarkSignals.map((signal) => (
          <InsightCard key={signal.title} title={signal.title} items={signal.items} />
        ))}
      </section>
      <section className="chart-grid benchmark-chart-grid">
        {benchmarkCharts.map((chart) => (
          <div className={chart.title.includes("Umsatz") ? "panel mini-chart benchmark-revenue-card" : "panel mini-chart"} key={chart.title}>
            {chart.title.includes("Umsatz") && <MetricInfo title={chart.title} text={chartExplanation(chart.title, chart.values)} />}
            <h2>{chart.title}</h2>
            <small className="period-note">Zeitraum: {selectedPeriod.label}</small>
            {chart.title.includes("Umsatz")
              ? <LocationRevenueBars title={chart.title} values={chart.values} />
              : <InteractiveBars title={chart.title} values={chart.values} />}
          </div>
        ))}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Standorte im Vergleich</h2>
            <p>Alle Standorte chronologisch nach Vertragsstart, mit Kennzahlen und Prüfhinweisen je Standort. Zeitraum: {comparisonPeriod.label}.</p>
          </div>
          <div className="benchmark-panel-actions">
            <label className="select-label benchmark-period-select">
              Zeitraum Standortvergleich
              <select value={comparisonPeriodId} onChange={(event) => setComparisonPeriodId(event.target.value)}>
                {periodOptions.map((period) => <option key={period.id} value={period.id}>{period.label}</option>)}
              </select>
            </label>
          </div>
        </div>
        <LocationBenchmarkCards snapshots={comparisonSnapshots} previousSnapshots={previousComparisonSnapshots} />
      </section>
    </div>
  );
}

function QualityView({ standort, importRows = [], manualCaseResolutions = [] }: { standort?: Standort; importRows?: ImportPreviewRow[]; manualCaseResolutions?: ManualCaseResolution[]; invoiceStatusRows?: ParsedInvoiceStatusRow[] }) {
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [qualityStandortFilterId, setQualityStandortFilterId] = useState(() => standort?.id ?? "alle");
  const [noProtectionPeriodId, setNoProtectionPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [noProtectionStandortFilterId, setNoProtectionStandortFilterId] = useState(() => standort?.id ?? "alle");
  const [reviewPeriodId, setReviewPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [reviewStandortFilterId, setReviewStandortFilterId] = useState(() => standort?.id ?? "alle");
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0], [periodOptions, selectedPeriodId]);
  const noProtectionPeriod = useMemo(() => periodOptions.find((period) => period.id === noProtectionPeriodId) ?? selectedPeriod, [periodOptions, noProtectionPeriodId, selectedPeriod]);
  const reviewPeriod = useMemo(() => periodOptions.find((period) => period.id === reviewPeriodId) ?? selectedPeriod, [periodOptions, reviewPeriodId, selectedPeriod]);
  const relevantStandorte = useMemo(() => standort ? [standort] : orderedStandorte(), [standort]);
  const qualityStandorte = useMemo(() => {
    if (standort) return [standort];
    if (qualityStandortFilterId === "alle") return relevantStandorte;
    return relevantStandorte.filter((entry) => entry.id === qualityStandortFilterId);
  }, [qualityStandortFilterId, relevantStandorte, standort]);
  const noProtectionStandorte = useMemo(() => {
    if (standort) return [standort];
    if (noProtectionStandortFilterId === "alle") return relevantStandorte;
    return relevantStandorte.filter((entry) => entry.id === noProtectionStandortFilterId);
  }, [noProtectionStandortFilterId, relevantStandorte, standort]);
  const reviewStandorte = useMemo(() => {
    if (standort) return [standort];
    if (reviewStandortFilterId === "alle") return relevantStandorte;
    return relevantStandorte.filter((entry) => entry.id === reviewStandortFilterId);
  }, [relevantStandorte, reviewStandortFilterId, standort]);
  const scopedRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = qualityStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedPeriod, rowStandort) : false;
  }), [importRows, qualityStandorte, selectedPeriod]);
  const reviewRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = reviewStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, reviewPeriod, rowStandort) : false;
  }), [importRows, reviewPeriod, reviewStandorte]);
  const noProtectionRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = noProtectionStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, noProtectionPeriod, rowStandort) : false;
  }), [importRows, noProtectionPeriod, noProtectionStandorte]);
  const summary = useMemo(() => summarizeImportRows(scopedRows), [scopedRows]);
  const metrics = useMemo(() => summary.rows ? metricsFromImportSummary(summary) : zeroMetrics(), [summary]);
  const recurring = useMemo(() => getRecurringRiskProfiles(standort?.id, scopedRows), [standort?.id, scopedRows]);
  const noProtectionClaims = useMemo(() => riskClaimsFromImportRows(noProtectionRows)
    .filter((claim) => noProtectionStandorte.some((entry) => entry.id === claim.standortId)), [noProtectionRows, noProtectionStandorte]);
  const noProtectionPaymentRisk = useMemo(() => summarizeNoProtectionPaymentRisk(noProtectionClaims), [noProtectionClaims]);
  const stornoReview = useMemo(() => stornoReviewFromImportRows(
    scopedRows,
    qualityStandorte.length === 1 ? qualityStandorte[0].id : undefined,
    manualCaseResolutions
  ), [manualCaseResolutions, qualityStandorte, scopedRows]);
  const filteredStornoReview = useMemo(() => stornoReviewFromImportRows(
    reviewRows,
    reviewStandorte.length === 1 ? reviewStandorte[0].id : undefined,
    manualCaseResolutions
  ), [manualCaseResolutions, reviewRows, reviewStandorte]);
  const noProtectionShare = metrics.submitted ? (metrics.noProtectionAmount / metrics.submitted) * 100 : 0;
  const chargebackShare = metrics.submitted ? (metrics.returnAmount / metrics.submitted) * 100 : 0;
  const stornoShare = metrics.submitted ? (metrics.cancellationAmount / metrics.submitted) * 100 : 0;
  const qualityScopeLabel = qualityStandorte.length === 1 ? qualityStandorte[0].name : "Alle Standorte";
  const grossQualityDeduction = metrics.returnAmount + metrics.cancellationAmount;
  const openStornoInfo = [
    `Diese Kachel betrachtet nur erkannte Storno-Zeilen: ${stornoReview.done} von ${stornoReview.total} Storno-Zeilen gelten als zurückgeholt/gewandelt.`,
    `${stornoReview.finalCancelled} Storno-Zeilen sind endgültig storniert und deshalb nicht mehr operativ offen.`,
    "Als zurückgeholt/bezahlt gelten echte Neueinreichung/Ersatzrechnung oder wirtschaftlich belegte Zahlung. Saldo 0 allein reicht nicht.",
    `Weiter zu prüfen sind hier die noch nicht geklärten Storno-Zeilen aus dieser Grundmenge: ${stornoReview.open}.`
  ].join(" ");

  return (
    <div className="content-stack">
      <section className="panel period-filter">
        <label className="select-label">
          Zeitraum Forderungsqualität
          <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>
            {periodOptions.map((period) => (
              <option key={period.id} value={period.id}>{period.label}</option>
            ))}
          </select>
        </label>
        <label className="select-label">
          Standort Forderungsqualität
          <select value={standort ? standort.id : qualityStandortFilterId} onChange={(event) => setQualityStandortFilterId(event.target.value)} disabled={Boolean(standort)}>
            {!standort && <option value="alle">Alle Standorte</option>}
            {relevantStandorte.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
        </label>
        <div>
          <strong>{qualityScopeLabel}</strong>
          <span>{selectedPeriod.detail}</span>
        </div>
      </section>
      <section className="priority-grid quality-priority-grid">
        <PriorityCard label="Ohne Ausfallschutz" value={money.format(metrics.noProtectionAmount)} hint={`${formatPercent(noProtectionShare)} vom Eingang`} period={selectedPeriod.label} tone={metrics.noProtectionAmount ? "amber" : "green"} info={`Qualitätsrisiko im Filter ${qualityScopeLabel}: Summe der eingereichten Forderungen ohne Ausfallschutz. Diese Kachel zeigt Risikoexposition, nicht offenen Abzug.`} />
        <PriorityCard label="Brutto Storno/Rückgabe" value={money.format(grossQualityDeduction)} hint={`${formatPercent(metrics.submitted ? (grossQualityDeduction / metrics.submitted) * 100 : 0)} vom Eingang`} period={selectedPeriod.label} tone={grossQualityDeduction ? "red" : "green"} info="Qualitäts-Grundmenge aus Rückgaben/Rückbelastungen plus Stornos im gewählten Filter. Die wirtschaftliche Restlogik Offener Abzug = Brutto Storno/Rückgabe minus zurückgeholt/bezahlt liegt im Tab Forderungen und Geldfluss bzw. Zusammenfassung." />
        <PriorityCard label="Rückgabe/Rückbelastung" value={money.format(metrics.returnAmount)} hint={`${formatPercent(chargebackShare)} vom Eingang`} period={selectedPeriod.label} tone={chargebackShare ? "red" : "green"} info="Nur Rückgaben/Rückbelastungen aus den BFS-Kontoauszügen. Rückgabe ohne Ausfallschutz wird operativ als Praxis nachfassen geführt; saldogeschlossene Belegfälle liegen unter Zahlung/Grund prüfen." />
        <PriorityCard label="Stornoquote" value={formatPercent(stornoShare)} hint={money.format(metrics.cancellationAmount)} period={selectedPeriod.label} tone={stornoShare ? "amber" : "green"} info="Nur Storno-Bewegungen bezogen auf eingereichten Umsatz. Das ist bewusst eine Storno-Untermenge und nicht identisch mit dem appweiten offenen Abzug." />
        <PriorityCard label="Storno-Zeilen erledigt" value={`${stornoReview.done}/${stornoReview.total}`} hint={`${stornoReview.open} offene Klärbewegungen`} period={selectedPeriod.label} tone={stornoReview.open ? "amber" : "green"} info={openStornoInfo} />
        <PriorityCard label="Wiederholer" value={String(recurring.length)} hint="Patienten mehrfach ohne Schutz" period={selectedPeriod.label} tone={recurring.length ? "amber" : "green"} info="Patienten mit wiederholten Ohne-Ausfallschutz-Markierungen im gewählten Qualitätsfilter. Diese Kachel dient der Patientenselektion, nicht der Abzugsbuchung." />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Ohne Ausfallschutz</span>
            <h2>Zahlungsstatus ohne Schutz</h2>
            <p>Verdichtung nach Zeitraum und Standort, ohne einzelne Patientenliste.</p>
          </div>
        </div>
        <div className="period-filter deduction-analysis-filter">
          <label className="select-label">
            Zeitraum ohne Schutz
            <select value={noProtectionPeriodId} onChange={(event) => setNoProtectionPeriodId(event.target.value)}>
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
          </label>
          <label className="select-label">
            Standort ohne Schutz
            <select value={standort ? standort.id : noProtectionStandortFilterId} onChange={(event) => setNoProtectionStandortFilterId(event.target.value)} disabled={Boolean(standort)}>
              {!standort && <option value="alle">Alle Standorte</option>}
              {relevantStandorte.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
          </label>
          <div>
            <strong>{noProtectionStandorte.length === 1 ? noProtectionStandorte[0].name : "Alle Standorte"}</strong>
            <span>{noProtectionPeriod.detail}</span>
          </div>
        </div>
        <section className="priority-grid storno-review-priority">
          <PriorityCard
            label="Ohne-Schutz-Patienten"
            value={String(noProtectionPaymentRisk.totalPatients)}
            hint={`${noProtectionClaims.length} Positionen · ${money.format(noProtectionClaims.reduce((sum, claim) => sum + claim.amount, 0))}`}
            period={noProtectionPeriod.label}
            tone={noProtectionClaims.length ? "amber" : "green"}
            info={noProtectionPaymentRisk.info}
          />
          <PriorityCard
            label="Davon nicht gezahlt"
            value={String(noProtectionPaymentRisk.unpaidPatients)}
            hint="nicht erledigte Storno-/Rückgabe-Bewegung"
            period={noProtectionPeriod.label}
            tone={noProtectionPaymentRisk.unpaidPatients ? "red" : "green"}
            info={noProtectionPaymentRisk.info}
          />
          <PriorityCard
            label="Nichtzahlungsquote"
            value={formatPercent(noProtectionPaymentRisk.unpaidRate)}
            hint="kritische Patienten ohne Schutz"
            period={noProtectionPeriod.label}
            tone={noProtectionPaymentRisk.unpaidRate >= 10 ? "red" : noProtectionPaymentRisk.unpaidRate ? "amber" : "green"}
            info={noProtectionPaymentRisk.info}
          />
          <PriorityCard
            label="Bisher unauffällig"
            value={String(noProtectionPaymentRisk.cleanPatients)}
            hint="kein negatives Ereignis erkannt"
            period={noProtectionPeriod.label}
            tone="green"
            info={noProtectionPaymentRisk.info}
          />
        </section>
      </section>
      <StornoReviewSection
        review={filteredStornoReview}
        periodOptions={periodOptions}
        selectedPeriodId={reviewPeriodId}
        onPeriodChange={setReviewPeriodId}
        selectedStandortId={standort ? standort.id : reviewStandortFilterId}
        onStandortChange={setReviewStandortFilterId}
        standorteOptions={relevantStandorte}
        disableStandortFilter={Boolean(standort)}
        scopeLabel={reviewStandorte.length === 1 ? reviewStandorte[0].name : "Alle Standorte"}
        detail={reviewPeriod.detail}
        periodLabel={reviewPeriod.label}
      />
    </div>
  );
}

function StornoReviewSection({
  review,
  periodOptions,
  selectedPeriodId,
  onPeriodChange,
  selectedStandortId,
  onStandortChange,
  standorteOptions,
  disableStandortFilter = false,
  scopeLabel,
  detail,
  periodLabel
}: {
  review: ReturnType<typeof stornoReviewFromImportRows>;
  periodOptions?: PeriodOption[];
  selectedPeriodId?: string;
  onPeriodChange?: (value: string) => void;
  selectedStandortId?: string;
  onStandortChange?: (value: string) => void;
  standorteOptions?: Standort[];
  disableStandortFilter?: boolean;
  scopeLabel?: string;
  detail?: string;
  periodLabel?: string;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Quercheck</span>
          <h2>Stornierungen gesamt und je Standort</h2>
          <p>Gezählt werden erkannte Storno-Zeilen als Brutto-Grundmenge. Danach wird getrennt: zurückgeholt durch Neueinreichung, bezahlt, endgültig storniert oder weiter zu prüfen.</p>
        </div>
      </div>
      {periodOptions && selectedPeriodId && onPeriodChange && selectedStandortId && onStandortChange && standorteOptions && (
        <div className="period-filter deduction-analysis-filter">
          <label className="select-label">
            Zeitraum Quercheck
            <select value={selectedPeriodId} onChange={(event) => onPeriodChange(event.target.value)}>
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
          </label>
          <label className="select-label">
            Standort Quercheck
            <select value={selectedStandortId} onChange={(event) => onStandortChange(event.target.value)} disabled={disableStandortFilter}>
              {!disableStandortFilter && <option value="alle">Alle Standorte</option>}
              {standorteOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
          </label>
          <div>
            <strong>{scopeLabel ?? "Alle Standorte"}</strong>
            <span>{detail}</span>
          </div>
        </div>
      )}
      <div className="priority-grid compact-priority recovery-priority-grid storno-review-priority">
        <PriorityCard label="Stornos gesamt" value={String(review.total)} hint={money.format(review.amount)} period={periodLabel} tone={review.total ? "amber" : "green"} />
        <PriorityCard label="Zurückgeholt / bezahlt" value={String(review.done)} hint={`${formatPercent(review.doneRate)} der Storno-Grundmenge`} period={periodLabel} tone={review.done ? "green" : "blue"} info="Zurückgeholt/bezahlt meint echte Neueinreichung, belegte Zahlung oder manuelle Zahlungsklärung. Saldo 0 allein reicht dafür nicht." />
        <PriorityCard label="Weiter zu prüfen" value={String(review.open)} hint="nicht zurückgeholt oder storniert" period={periodLabel} tone={review.open ? "red" : "green"} />
      </div>
      <div className="location-card-grid storno-review-grid">
        {review.byLocation.map((entry) => (
          <article className={`location-benchmark-card ${entry.open ? "amber" : entry.total ? "green" : "blue"}`} key={entry.standort.id}>
            <div className="location-card-head">
              <div>
                <span>Storno-Quercheck</span>
                <strong>{entry.standort.name}</strong>
              </div>
              <StatusBadge status={entry.open ? `${entry.open} prüfen` : entry.total ? "geklärt" : "keine Stornos"} />
            </div>
            <div className="location-metric-grid">
              <span><b>{entry.total}</b> Stornos gesamt</span>
              <span><b>{entry.done}</b> zurückgeholt/bezahlt</span>
              <span><b>{entry.open}</b> prüfen</span>
              <span><b>{formatPercent(entry.doneRate)}</b> Quote</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CockpitFilterBar({
  periodOptions,
  selectedPeriodId,
  onPeriodChange,
  selectedStandort,
  onStandortChange,
  scopeLabel,
  detail
}: {
  periodOptions: PeriodOption[];
  selectedPeriodId: string;
  onPeriodChange: (value: string) => void;
  selectedStandort: string;
  onStandortChange: (value: string) => void;
  scopeLabel: string;
  detail: string;
}) {
  return (
    <section className="panel cockpit-filter-bar">
      <div>
        <span className="eyebrow">Cockpit-Filter</span>
        <h2>Kennzahlen steuern</h2>
        <p>{scopeLabel} · {detail}</p>
      </div>
      <div className="cockpit-filter-controls">
        <label className="select-label">
          Zeitraum
          <select value={selectedPeriodId} onChange={(event) => onPeriodChange(event.target.value)}>
            {periodOptions.map((period) => (
              <option key={period.id} value={period.id}>{period.label}</option>
            ))}
          </select>
        </label>
        <label className="select-label">
          Standort
          <select value={selectedStandort} onChange={(event) => onStandortChange(event.target.value)}>
            <option value="alle">Alle Standorte</option>
            {orderedStandorte().map((standort) => (
              <option key={standort.id} value={standort.id}>{standort.name} · {liveStatusLabel(standort)}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function CockpitChartFilterBar({
  periodOptions,
  selectedPeriodId,
  onPeriodChange,
  selectedStandort,
  onStandortChange,
  scopeLabel,
  detail
}: {
  periodOptions: PeriodOption[];
  selectedPeriodId: string;
  onPeriodChange: (value: string) => void;
  selectedStandort: string;
  onStandortChange: (value: string) => void;
  scopeLabel: string;
  detail: string;
}) {
  return (
    <section className="panel cockpit-filter-bar cockpit-chart-filter-bar">
      <div>
        <span className="eyebrow">Diagramm-Filter</span>
        <h2>Charts separat steuern</h2>
        <p>{scopeLabel} · {detail}</p>
      </div>
      <div className="cockpit-filter-controls">
        <label className="select-label">
          Zeitraum Charts
          <select value={selectedPeriodId} onChange={(event) => onPeriodChange(event.target.value)}>
            {periodOptions.map((period) => (
              <option key={period.id} value={period.id}>{period.label}</option>
            ))}
          </select>
        </label>
        <label className="select-label">
          Standort Charts
          <select value={selectedStandort} onChange={(event) => onStandortChange(event.target.value)}>
            <option value="alle">Alle Standorte</option>
            {orderedStandorte().map((standort) => (
              <option key={standort.id} value={standort.id}>{standort.name} · {liveStatusLabel(standort)}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function LocationDashboard({
  standort,
  cases,
  onNavigate,
  onScopeChange,
  importRows,
  peerImportRows,
  manualCaseResolutions = []
}: {
  standort: Standort;
  cases: BfsCase[];
  onNavigate: (view: string) => void;
  onScopeChange?: (standortId: string) => void;
  importRows: ImportPreviewRow[];
  peerImportRows: ImportPreviewRow[];
  manualCaseResolutions?: ManualCaseResolution[];
}) {
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0], [periodOptions, selectedPeriodId]);
  const locationImportRows = useMemo(() => importRows.filter((row) => row.location === standort.name && importRowInPeriod(row, selectedPeriod, standort)), [importRows, selectedPeriod, standort]);
  const importSummary = useMemo(() => summarizeImportRows(locationImportRows), [locationImportRows]);
  const selectedMetrics = useMemo(() => importSummary.rows ? metricsFromImportSummary(importSummary) : zeroMetrics(), [importSummary]);
  const periodLabel = importRows.length ? "aktueller Import" : selectedPeriod.label;
  const openCases = useMemo(() => cases.filter((fall) => !fall.status.includes("erledigt") && isPracticeFollowupCase(fall)), [cases]);
  const managementComparison = useMemo(() => buildManagementComparison(importRows, [standort], openCases, undefined, manualCaseResolutions), [importRows, openCases, standort, manualCaseResolutions]);
  const peerAverage = useMemo(() => buildAnonymousPeerAverage(peerImportRows), [peerImportRows]);
  const locationKpiInfo = buildKpiDerivationInfo(selectedMetrics, periodLabel);
  const locationSparklineContext = { importRows, relevantStandorte: [standort], period: selectedPeriod };
  const groupChargebackRate = peerAverage.chargebackRate;
  const groupNoProtectionShare = peerAverage.noProtectionShare;
  const locationKpis: KpiCardTuple[] = [
    ["Eingereicht YTD", money.format(managementComparison.currentMetrics.submitted), managementComparison.currentPeriod.label, locationKpiInfo.submitted, kpiSparklineForLabel("Umsatz eingereicht", locationSparklineContext)],
    ["Vorjahr YTD", money.format(managementComparison.previousMetrics.submitted), managementComparison.previousPeriod.label, undefined, kpiSparklineForLabel("Umsatz eingereicht", { ...locationSparklineContext, period: managementComparison.previousPeriod })],
    ["Delta Vorjahr", money.format(managementComparison.submittedDelta), formatDelta(managementComparison.submittedDeltaRate), undefined, kpiSparklineForLabel("Umsatz eingereicht", locationSparklineContext), managementComparison.currentPeriod.label],
    ["Gebührenquote", formatFeeRate(managementComparison.currentMetrics.feeRate), `Ø Gruppe ${formatFeeRate(peerAverage.feeRate)}`, undefined, kpiSparklineForLabel("Gebührenquote", locationSparklineContext)],
    ["Rückbelastungsquote", formatPercent(managementComparison.chargebackRate), `Ø Gruppe ${formatPercent(groupChargebackRate)}`, undefined, kpiSparklineForLabel("Rückbelastungsquote", locationSparklineContext)],
    ["Ohne-Ausfallschutz-Anteil", formatPercent(managementComparison.noProtectionShare), `Ø Gruppe ${formatPercent(groupNoProtectionShare)}`, undefined, kpiSparklineForLabel("Laufend ohne Ausfallschutz", locationSparklineContext)],
    ["Praxis nachfassen", String(openCases.length), `${openCases.reduce((max, fall) => Math.max(max, fall.ageDays), 0)} Tage ältester Fall`, "Echte Praxis-Aufgaben, vor allem Rückgaben ohne Ausfallschutz. Saldobereinigte Fälle ohne wirtschaftlichen Beleg liegen unter Zahlung / Grund prüfen.", kpiSparklineForLabel("Praxis nachfassen", locationSparklineContext)],
    ["Patientenqualität", patientQualityMixLabel(importRows, standort.id), "A/B/C/D-Mix", undefined, kpiSparklineForLabel("Ohne Ausfallschutz", locationSparklineContext)]
  ];

  return (
    <div className="content-stack">
      <section className="panel period-filter">
        {onScopeChange && (
          <label className="select-label">
            Standort Management Cockpit
            <select value={standort.id} onChange={(event) => onScopeChange(event.target.value)}>
              <option value="gruppe">Alle Standorte</option>
              {orderedStandorte().map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
          </label>
        )}
        <label className="select-label">
          Zeitraum Standort-Dashboard
          <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>
            {periodOptions.map((period) => (
              <option key={period.id} value={period.id}>{period.label}</option>
            ))}
          </select>
        </label>
      </section>
      <KpiGrid cards={locationKpis} />
      <section className="chart-grid location-trend-grid">
        <article className="panel mini-chart year-chart-panel location-trend-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Standort über Zeit</span>
              <h2>{standort.name} im Verlauf</h2>
              <p>Der Verlauf zeigt das aktuelle Jahr gegen den gleichen Zeitraum im Vorjahr, ohne internes Diagramm-Scrolling.</p>
            </div>
          </div>
          <YearComparisonLines
            title={`Monatsentwicklung ${standort.name}`}
            values={buildYearMonthComparison([standort], importRows, "submitted", selectedPeriod)}
            format={(value) => money.format(value)}
          />
        </article>
      </section>
      <section className="management-summary-grid">
        <ManagementDeltaPanel comparison={managementComparison} />
        <article className="panel management-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Einordnung</span>
              <h2>{standort.name} gegen anonymen Gruppenschnitt</h2>
              <p>Gebührenquote, Rückbelastung und Ohne-Ausfallschutz werden gegen den Durchschnitt aller Standorte seit jeweiligem Vertragsstart eingeordnet. Andere Standortnamen und Klarwerte werden nicht angezeigt.</p>
            </div>
          </div>
          <div className="stacked-checks">
            <span>Gebührenquote Standort: {formatFeeRate(managementComparison.currentMetrics.feeRate)} · Ø Gruppe: {formatFeeRate(peerAverage.feeRate)}</span>
            <span>Rückbelastungsquote Standort: {formatPercent(managementComparison.chargebackRate)} · Ø Gruppe: {formatPercent(groupChargebackRate)}</span>
            <span>Ohne-Ausfallschutz-Anteil Standort: {formatPercent(managementComparison.noProtectionShare)} · Ø Gruppe: {formatPercent(groupNoProtectionShare)}</span>
          </div>
        </article>
      </section>
      <section className="dashboard-grid">
        <article className="panel command-panel">
          <div>
            <span className="eyebrow">Standortfokus</span>
            <h2>{standort.name}: Entwicklung zuerst, Fallarbeit danach</h2>
            <p>Gebührenquote {formatFeeRate(managementComparison.currentMetrics.feeRate)} gegen Ø Gruppe {formatFeeRate(peerAverage.feeRate)}. Rückbelastungsquote {formatPercent(managementComparison.chargebackRate)} gegen Ø Gruppe {formatPercent(groupChargebackRate)}.</p>
          </div>
          <div className="quick-actions">
            <button className="primary-button" onClick={() => onNavigate("practiceFollowup")}><AlertCircle size={16} /> Praxis nachfassen</button>
            <button className="secondary-button" onClick={() => onNavigate("economicCheck")}><ClipboardCheck size={16} /> Zahlung / Grund prüfen</button>
            <button className="secondary-button" onClick={() => onNavigate("risks")}><ShieldCheck size={16} /> Risiko</button>
            <button className="secondary-button" onClick={() => onNavigate("claims")}><ReceiptText size={16} /> Geldfluss</button>
          </div>
        </article>
        <article className="panel process-panel">
          <h2>Bearbeitungslogik</h2>
          <div className="stacked-checks">
            <span>1. Brutto Storno/Rückgabe erkennen</span>
            <span>2. Neueinreichung oder Zahlung belegen</span>
            <span>3. Ohne Ausfallschutz durch Praxis nachfassen</span>
          </div>
        </article>
      </section>
      <section className="panel operative-entry-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Prüfung & Fallarbeit</span>
            <h2>Operative Schnellantworten {standort.name}</h2>
            <p>Konkrete Patienten, Praxis-Nachfassfälle, Zahlung/Grund-Prüfungen und Reports werden hier weiterbearbeitet.</p>
          </div>
        </div>
        <AnswerCockpit scope="location" standort={standort} cases={cases} onNavigate={onNavigate} compact showReportAction={false} importRows={importRows} hasImportDataset={importRows.length > 0} />
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
  manualCaseResolutions = [],
  invoiceStatusRows = [],
  periodMetrics,
  hasImportDataset: hasImportDatasetProp
}: {
  scope: "group" | "location";
  standort?: Standort;
  cases: BfsCase[];
  onNavigate: (view: string) => void;
  compact?: boolean;
  showReportAction?: boolean;
  importRows?: ImportPreviewRow[];
  manualCaseResolutions?: ManualCaseResolution[];
  invoiceStatusRows?: ParsedInvoiceStatusRow[];
  periodMetrics?: BfsMetrics;
  hasImportDataset?: boolean;
}) {
  const hasImportDataset = hasImportDatasetProp ?? importRows.length > 0;
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [selectedAnswerStandortId, setSelectedAnswerStandortId] = useState(() => scope === "group" ? "alle" : standort?.id ?? "alle");
  const previousAnswerScope = useRef(scope);
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
  const openCases = useMemo(() => scopedRows.filter((fall) => !fall.status.includes("erledigt") && isPracticeFollowupCase(fall)), [scopedRows]);
  const economicCheckRows = useMemo(() => buildInvoiceStatusReviewBasket(invoiceStatusRows, scopedImportRows)
    .filter((row) => row.category === "economic_check"), [invoiceStatusRows, scopedImportRows]);
  const chargebacks = useMemo(() => openCases.filter((fall) => fall.reason.includes("Rückgabe") || fall.reason.includes("Rückbelastung")), [openCases]);
  const recurringRisks = useMemo(() => getRecurringRiskProfiles(
    relevantStandorte.length === 1 ? relevantStandorte[0].id : undefined,
    scopedImportRows,
    hasImportDataset
  ).filter((profile) => relevantStandorte.some((entry) => entry.name === profile.standortName)), [relevantStandorte, scopedImportRows, hasImportDataset]);
  const submitted = selectedMetrics.submitted;
  const payout = selectedMetrics.payout;
  const fees = selectedMetrics.fees;
  const feeNet = selectedMetrics.feeNet || fees;
  const feeVat = selectedMetrics.feeVat;
  const ewmaTotal = selectedMetrics.ewmaTotal;
  const noProtectionAmount = selectedMetrics.noProtectionAmount;
  const oldest = openCases.reduce((max, fall) => Math.max(max, fall.ageDays), 0);
  const stornoReview = useMemo(() => stornoReviewFromImportRows(
    scopedImportRows,
    relevantStandorte.length === 1 ? relevantStandorte[0].id : undefined,
    manualCaseResolutions
  ), [manualCaseResolutions, relevantStandorte, scopedImportRows]);
  const selectedStandortLabel = scope === "group"
    ? selectedAnswerStandortId === "alle"
      ? "Alle Standorte"
      : relevantStandorte[0]?.name ?? "Alle Standorte"
    : standort?.name ?? "Standort";
  const title = scope === "group" ? "Antwortcockpit für Standort-Rückfragen" : `Antwortcockpit ${selectedStandortLabel}`;
  const resolvedPeriodLabel = selectedPeriod.label;
  const effectivePeriod = selectedPeriod;
  const answerSparklineContext = useMemo(() => ({
    importRows,
    relevantStandorte,
    period: effectivePeriod
  }), [effectivePeriod, importRows, relevantStandorte]);
  const submittedTrend = useMemo(() => buildAnswerSparkline("submitted", answerSparklineContext), [answerSparklineContext]);
  const payoutTrend = useMemo(() => buildAnswerSparkline("payout", answerSparklineContext), [answerSparklineContext]);
  const noProtectionTrend = useMemo(() => buildAnswerSparkline("noProtection", answerSparklineContext), [answerSparklineContext]);
  const recurringTrend = useMemo(() => buildAnswerSparkline("recurring", answerSparklineContext), [answerSparklineContext]);
  const feesTrend = useMemo(() => buildAnswerSparkline("fees", answerSparklineContext), [answerSparklineContext]);
  const stornoTotalTrend = useMemo(() => stornoAnswerSparkline(stornoReview.rows, "total"), [stornoReview.rows]);
  const stornoDoneTrend = useMemo(() => stornoAnswerSparkline(stornoReview.rows, "done"), [stornoReview.rows]);
  const stornoOpenTrend = useMemo(() => stornoAnswerSparkline(stornoReview.rows, "open"), [stornoReview.rows]);
  const answerInfo = useMemo(() => buildAnswerCardInfo({
    periodLabel: resolvedPeriodLabel,
    scopeLabel: selectedStandortLabel,
    metrics: selectedMetrics,
    openCases,
    chargebacks,
    recurringRisks,
    oldest,
    stornoReview,
    economicCheckCount: economicCheckRows.length
  }), [chargebacks, economicCheckRows.length, openCases, oldest, recurringRisks, resolvedPeriodLabel, selectedMetrics, selectedStandortLabel, stornoReview]);

  useEffect(() => {
    if (previousAnswerScope.current !== scope) {
      setSelectedAnswerStandortId(scope === "group" ? "alle" : standort?.id ?? "alle");
      previousAnswerScope.current = scope;
      return;
    }
    if (scope === "location" && standort) setSelectedAnswerStandortId(standort.id);
  }, [scope, standort]);

  return (
    <section className={compact ? "answer-cockpit compact" : "answer-cockpit"}>
      <div className="answer-header">
        <div>
          <span className="eyebrow">Cockpit-Schnellantworten</span>
          <h2>{title}</h2>
        </div>
        {showReportAction && <button className="secondary-button" onClick={() => onNavigate("reports")}><Printer size={16} /> Report senden</button>}
      </div>
      <section className={compact ? "period-filter answer-filter-panel compact-answer-filter" : "period-filter answer-filter-panel"}>
        <label className="select-label">
          Zeitraum Schnellantworten
          <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>
            {periodOptions.map((period) => (
              <option key={period.id} value={period.id}>{period.label}</option>
            ))}
          </select>
        </label>
        <label className="select-label">
          Standort Schnellantworten
          <select value={selectedAnswerStandortId} onChange={(event) => setSelectedAnswerStandortId(event.target.value)} disabled={scope !== "group"}>
            {scope === "group" && <option value="alle">Alle Standorte</option>}
            {orderedStandorte().map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
        </label>
      </section>
      <div className="answer-grid">
        <AnswerMetricCard title="Umsatz eingereicht" value={money.format(submitted)} hint={resolvedPeriodLabel} trend={submittedTrend} periodLabel={resolvedPeriodLabel} info={answerInfo.submitted} onClick={() => onNavigate("claims")} />
        <AnswerMetricCard title="BFS-Kosten" value={money.format(fees)} hint={`Gebühr ${money.format(feeNet)} · MwSt ${money.format(feeVat)}${ewmaTotal ? ` · EWMA ${money.format(ewmaTotal)}` : ""}`} trend={feesTrend} periodLabel={resolvedPeriodLabel} info={answerInfo.fees} onClick={() => onNavigate("claims")} />
        <AnswerMetricCard title="Umsatz ausgezahlt" value={money.format(payout)} hint="nach BFS-Abzug" trend={payoutTrend} periodLabel={resolvedPeriodLabel} info={answerInfo.payout} onClick={() => onNavigate("claims")} />
        <AnswerMetricCard title="Ohne Ausfallschutz" value={money.format(noProtectionAmount)} hint={resolvedPeriodLabel} trend={noProtectionTrend} periodLabel={resolvedPeriodLabel} info={answerInfo.noProtection} onClick={() => onNavigate("risks")} />
        <AnswerMetricCard title="Stornierte Fälle" value={integerNumber.format(stornoReview.total)} hint={money.format(stornoReview.amount)} trend={stornoTotalTrend} periodLabel={resolvedPeriodLabel} info={answerInfo.stornoTotal} onClick={() => onNavigate("matches")} />
        <AnswerMetricCard title="Davon zurückgeholt" value={integerNumber.format(stornoReview.done)} hint={`${formatPercent(stornoReview.doneRate)} gewandelt`} trend={stornoDoneTrend} periodLabel={resolvedPeriodLabel} info={answerInfo.stornoDone} onClick={() => onNavigate("matches")} />
        <AnswerMetricCard title="Stornos offen" value={integerNumber.format(stornoReview.open)} hint="noch nicht zurückgeholt" trend={stornoOpenTrend} periodLabel={resolvedPeriodLabel} info={answerInfo.stornoOpen} onClick={() => onNavigate("economicCheck")} />
        <AnswerMetricCard title="Wiederholer" value={String(recurringRisks.length)} hint="Patienten mehrfach ohne Schutz" trend={recurringTrend} periodLabel={resolvedPeriodLabel} info={answerInfo.recurring} onClick={() => onNavigate("repeatRisks")} />
      </div>
    </section>
  );
}

function AnswerMetricCard({ title, value, hint, trend, periodLabel, info, onClick }: { title: string; value: string; hint: string; trend: AnswerSparklineTrend; periodLabel: string; info: string; onClick: () => void }) {
  return (
    <article className="answer-card">
      <MetricInfo title={title} text={info} />
      <button className="answer-card-action" onClick={onClick}>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
        <AnswerSparkline trend={trend} />
        <small className="period-note">{periodLabelFromHint(periodLabel)}</small>
      </button>
    </article>
  );
}

function buildAnswerCardInfo({ periodLabel, scopeLabel, metrics, openCases, chargebacks, recurringRisks, oldest, stornoReview, economicCheckCount }: {
  periodLabel: string;
  scopeLabel: string;
  metrics: BfsMetrics;
  openCases: BfsCase[];
  chargebacks: BfsCase[];
  recurringRisks: ReturnType<typeof getRecurringRiskProfiles>;
  oldest: number;
  stornoReview: ReturnType<typeof stornoReviewFromImportRows>;
  economicCheckCount: number;
}) {
  const openAmount = openCases.reduce((sum, fall) => sum + fall.amount, 0);
  const chargebackAmount = chargebacks.reduce((sum, fall) => sum + fall.amount, 0);
  const feeTotal = metrics.fees;
  const feeNet = metrics.feeNet || feeTotal;
  const taxTotal = metrics.feeVat + metrics.ewmaVat;
  return {
    submitted: `Herleitung: Summe aller erkannten Forderungen im Zeitraum ${periodLabel} für ${scopeLabel}. Verwendet werden die importierten BFS-Forderungsbeträge je Abrechnung. Aktueller Wert: ${money.format(metrics.submitted)}. Die Sparkline zeigt die Monatsentwicklung im gewählten Zeitraum und der VJ-Wert vergleicht denselben Zeitraum mit dem Vorjahr.`,
    payout: `Herleitung: Summe der erkannten Auszahlungsbeträge im Zeitraum ${periodLabel} für ${scopeLabel}. Aktueller Wert: ${money.format(metrics.payout)}. Die Differenz zum eingereichten Umsatz entsteht aus BFS-Kosten, Steuern, EWMA/Meldeamtabfragen sowie Rückgaben oder Stornos, sofern diese im Import erkannt wurden.`,
    open: `Herleitung: Summe echter Praxis-Nachfassfälle im aktuellen Standortfilter ${scopeLabel}. Zeitraum: ${periodLabel}. Gezählt werden ${openCases.length} Fälle mit zusammen ${money.format(openAmount)}. Das sind vor allem Rückgaben ohne Ausfallschutz. Fälle mit BFS-Saldo 0, deren wirtschaftlicher Grund noch unklar ist, liegen separat unter Zahlung / Grund prüfen.`,
    chargebacks: `Herleitung: Gezählt werden offene Fälle mit Rückgabe oder Rückbelastung im Zeitraum ${periodLabel} für ${scopeLabel}. Aktuell: ${chargebacks.length} Rückläufer mit ${money.format(chargebackAmount)} offenem Betrag. Stornos werden in den separaten Qualitäts- und Geldflussansichten ausgewertet.`,
    noProtection: `Herleitung: Summe aller Forderungen und erkannten Bewegungen ohne Ausfallschutz im Zeitraum ${periodLabel} für ${scopeLabel}. Aktueller Wert: ${money.format(metrics.noProtectionAmount)}. Ohne Ausfallschutz ist ein Risikobestand, nicht automatisch ein offener Klärfall.`,
    recurring: `Herleitung: Patientenprofile mit mehrfachen Ohne-Ausfallschutz-Ereignissen im Zeitraum ${periodLabel} für ${scopeLabel}. Aktuell: ${recurringRisks.length} Wiederholer. Diese Kachel zeigt Patientenselektion und Standortprozess, nicht einzelne Buchungssummen.`,
    fees: `Herleitung: BFS-Kosten im Zeitraum ${periodLabel} für ${scopeLabel}: Gebühr netto ${money.format(feeNet)}, Steuer/Zusatzsteuer ${money.format(taxTotal)}, Gesamtkosten ${money.format(feeTotal)}. EWMA- und Meldeamtabfragen sind enthalten, sofern sie im Import erkannt wurden.`,
    stornoTotal: `Herleitung: Grundmenge aller erkannten Storno-Zeilen im Zeitraum ${periodLabel} für ${scopeLabel}. Aktuell: ${stornoReview.total} Storno-Zeilen mit zusammen ${money.format(stornoReview.amount)}.`,
    stornoDone: `Herleitung: Von ${stornoReview.total} erkannten Storno-Zeilen gelten ${stornoReview.done} als zurückgeholt oder wirtschaftlich geklärt. Dazu zählen echte spätere Neueinreichung/Ersatzrechnung oder belegte Zahlung. Saldo 0 allein ist kein Zahlungsnachweis. Quote: ${formatPercent(stornoReview.doneRate)}.`,
    stornoOpen: `Herleitung: Noch offene Storno-Zeilen aus derselben Grundmenge. Aktuell sind ${stornoReview.open} von ${stornoReview.total} Storno-Zeilen weder zurückgeholt noch endgültig storniert. Zusätzlich gibt es ${economicCheckCount} saldogeschlossene Fälle, deren Zahlung/Grund wirtschaftlich geprüft werden muss.`,
    oldest: `Herleitung: Höchstes Alter unter allen Praxis-Nachfassfällen im aktuellen Filter ${scopeLabel}. Zeitraum: aktueller Bearbeitungsstand mit fachlicher Einordnung zum Zeitraum ${periodLabel}. Aktueller Wert: ${oldest} Tage.`
  };
}

type AnswerSparklineMetric =
  | "submitted"
  | "payout"
  | "feeNet"
  | "tax"
  | "feeRate"
  | "deductionAmount"
  | "recoveryRate"
  | "chargebackRate"
  | "openAmount"
  | "openCount"
  | "chargebacks"
  | "noProtection"
  | "recurring"
  | "fees"
  | "oldest";
type AnswerSparklineTrend = {
  points: number[];
  tone: "green" | "amber" | "red";
  label: string;
};
type AnswerSparklineContext = {
  importRows: ImportPreviewRow[];
  relevantStandorte: Standort[];
  period: PeriodOption;
  manualCaseResolutions?: ManualCaseResolution[];
};

function AnswerSparkline({ trend }: { trend: AnswerSparklineTrend }) {
  const width = 136;
  const height = 34;
  const points = trend.points.length ? trend.points : [0, 0, 0];
  const maxValue = Math.max(...points, 1);
  const minValue = Math.min(...points, 0);
  const range = Math.max(maxValue - minValue, 1);
  const path = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - ((point - minValue) / range) * (height - 8) - 4;
    return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  return (
    <span className={`answer-sparkline ${trend.tone}`} aria-label={trend.label}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <path className="sparkline-area" d={`${path} L ${width} ${height} L 0 ${height} Z`} />
        <path className="sparkline-line" d={path} />
      </svg>
      <small>{trend.label}</small>
    </span>
  );
}

function buildAnswerSparkline(metric: AnswerSparklineMetric, context: AnswerSparklineContext): AnswerSparklineTrend {
  const currentRows = rowsForSparklinePeriod(context.importRows, context.relevantStandorte, context.period);
  const comparisonPeriod = comparableCurrentPeriod(context.period);
  const currentComparisonRows = rowsForSparklinePeriod(context.importRows, context.relevantStandorte, comparisonPeriod);
  const previousRows = rowsForSparklinePeriod(context.importRows, context.relevantStandorte, previousYearPeriod(comparisonPeriod));
  const currentTotal = valueForAnswerMetric(metric, currentComparisonRows, context.relevantStandorte, context.manualCaseResolutions);
  const previousTotal = valueForAnswerMetric(metric, previousRows, context.relevantStandorte, context.manualCaseResolutions);
  const points = monthlySparklinePoints(metric, currentRows, context.relevantStandorte, context.manualCaseResolutions);
  const delta = previousTotal ? ((currentTotal - previousTotal) / previousTotal) * 100 : currentTotal ? 100 : 0;
  const lowerIsBetter: AnswerSparklineMetric[] = ["feeNet", "tax", "feeRate", "deductionAmount", "chargebackRate", "openAmount", "openCount", "chargebacks", "noProtection", "recurring", "fees", "oldest"];
  const desiredDelta = lowerIsBetter.includes(metric) ? -delta : delta;
  const tone = desiredDelta >= 0 ? "green" : desiredDelta <= -15 ? "red" : "amber";
  const label = previousTotal
    ? `VJ ${delta >= 0 ? "+" : ""}${formatPercent(delta)}`
    : currentTotal
      ? "VJ 0"
      : "kein Trend";

  return {
    points: points.length ? points : [0, currentTotal, currentTotal],
    tone,
    label
  };
}

function kpiSparklineForPeriod(metric: AnswerSparklineMetric, importRows: ImportPreviewRow[], relevantStandorte: Standort[], period: PeriodOption): AnswerSparklineTrend {
  const rows = rowsForSparklinePeriod(importRows, relevantStandorte, period);
  const points = monthlySparklinePoints(metric, rows, relevantStandorte);
  const total = valueForAnswerMetric(metric, rows, relevantStandorte);
  const yearLabel = period.start?.getFullYear() ? String(period.start.getFullYear()) : period.label;
  return {
    points: points.length ? points : [0, total, total],
    tone: "green",
    label: `${yearLabel} Verlauf`
  };
}

function caseSparklineForPeriod(cases: BfsCase[], period: PeriodOption, metric: "count" | "oldest"): AnswerSparklineTrend {
  const monthKeys = [...new Set(cases.map((fall) => monthKeyFromShortDate(fall.sourceDate)).filter(Boolean))].sort();
  const points = monthKeys.map((month) => {
    const monthCases = cases.filter((fall) => monthKeyFromShortDate(fall.sourceDate) === month);
    return metric === "count" ? monthCases.length : monthCases.reduce((max, fall) => Math.max(max, fall.ageDays), 0);
  });
  const total = metric === "count" ? cases.length : cases.reduce((max, fall) => Math.max(max, fall.ageDays), 0);
  return {
    points: points.length ? points : [0, total, total],
    tone: total ? "red" : "green",
    label: metric === "count" ? "offener Verlauf" : "Fallalter"
  };
}

function stornoAnswerSparkline(stornoRows: ReturnType<typeof stornoReviewFromImportRows>["rows"], metric: "total" | "done" | "open"): AnswerSparklineTrend {
  const monthForRow = (row: ReturnType<typeof stornoReviewFromImportRows>["rows"][number]) => metric === "done"
    ? monthKeyFromGermanDate(row.recoveryDate || row.date)
    : monthKeyFromGermanDate(row.date);
  const monthKeys = [...new Set(stornoRows.map((row) => monthForRow(row)).filter(Boolean))].sort();
  const points = monthKeys.map((month) => {
    const monthRows = stornoRows.filter((row) => monthForRow(row) === month);
    if (metric === "done") return monthRows.filter((row) => row.done).length;
    if (metric === "open") return monthRows.filter((row) => row.open).length;
    return monthRows.length;
  });
  const total = metric === "done"
    ? stornoRows.filter((row) => row.done).length
    : metric === "open"
      ? stornoRows.filter((row) => row.open).length
      : stornoRows.length;
  return {
    points: points.length ? points : [0, total, total],
    tone: metric === "done" ? "green" : total ? metric === "open" ? "red" : "amber" : "green",
    label: metric === "done" ? "gewandelt" : metric === "open" ? "offen" : "Storno Verlauf"
  };
}

function kpiSparklineForLabel(label: string, context: AnswerSparklineContext) {
  const normalized = label.toLowerCase();
  if (normalized.includes("umsatz") || normalized.includes("eingereicht")) return buildAnswerSparkline("submitted", context);
  if (normalized.includes("auszahlung")) return buildAnswerSparkline("payout", context);
  if (normalized.includes("gebührenquote")) return buildAnswerSparkline("feeRate", context);
  if (normalized.includes("rückbelastungsquote")) return buildAnswerSparkline("chargebackRate", context);
  if (normalized.includes("mwst")) return buildAnswerSparkline("tax", context);
  if (normalized.includes("gebühr netto")) return buildAnswerSparkline("feeNet", context);
  if (normalized.includes("gesamtkosten") || normalized.includes("bfs-kosten")) return buildAnswerSparkline("fees", context);
  if (normalized.includes("ausfallschutz") || normalized.includes("schutz")) return buildAnswerSparkline("noProtection", context);
  if (normalized.includes("klä") || normalized.includes("offen")) return buildAnswerSparkline("openCount", context);
  if (normalized.includes("ältester")) return buildAnswerSparkline("oldest", context);
  return buildAnswerSparkline("submitted", context);
}

function comparableCurrentPeriod(period: PeriodOption): PeriodOption {
  if (period.start || period.end) return period;
  return {
    ...period,
    id: `${period.id}-current-year-comparison`,
    label: `${todayReference.getFullYear()} bis heute`,
    start: new Date(todayReference.getFullYear(), 0, 1),
    end: todayReference
  };
}

function rowsForSparklinePeriod(importRows: ImportPreviewRow[], relevantStandorte: Standort[], period: PeriodOption) {
  return importRows.filter((row) => {
    const standort = relevantStandorte.find((entry) => entry.name === row.location);
    return standort ? importRowInPeriod(row, period, standort) : false;
  });
}

function buildDeductionRecovery(importRows: ImportPreviewRow[], relevantStandorte: Standort[], period: PeriodOption, manualCaseResolutions: ManualCaseResolution[] = []) {
  const scopedRows = rowsForSparklinePeriod(importRows, relevantStandorte, period);
  const allLocationRows = importRows.filter((row) => relevantStandorte.some((entry) => entry.name === row.location));
  const metrics = metricsFromRows(scopedRows);
  const grossDeductionAmount = metrics.returnAmount + metrics.cancellationAmount;
  const recoveryMatches = resubmissionCandidatesFromImportRows(allLocationRows)
    .filter((candidate) => {
      const candidateStandort = relevantStandorte.find((entry) => entry.name === candidate.locationName);
      return candidateStandort ? shortDateInPeriod(candidate.originalDate, period, candidateStandort) : false;
    });
  const recoveredByResubmission = uniqueRecoveryCandidates(recoveryMatches);
  const recoveredByResubmissionKeys = new Set(recoveredByResubmission.map((candidate) => resubmissionResolutionKey(candidate)));
  const manualPaidKeys = buildPaidResolutionKeySet(manualCaseResolutions);
  const manuallyPaidCases = casesFromImportRows(scopedRows)
    .filter((fall) => caseResolutionKeys(fall).some((key) => manualPaidKeys.has(key)) && !recoveredByResubmissionKeys.has(caseResolutionKey(fall)));
  const recoveredByResubmissionAmount = recoveredByResubmission.reduce((sum, candidate) => sum + Math.min(candidate.originalAmount, candidate.newAmount), 0);
  const manuallyPaidAmount = manuallyPaidCases.reduce((sum, fall) => sum + fall.amount, 0);
  const recoveredAmount = Math.min(grossDeductionAmount, recoveredByResubmissionAmount + manuallyPaidAmount);
  return {
    scopedRows,
    metrics,
    grossDeductionAmount,
    recoveredAmount,
    openAmount: Math.max(grossDeductionAmount - recoveredAmount, 0),
    recoveryRate: grossDeductionAmount ? Math.min(100, (recoveredAmount / grossDeductionAmount) * 100) : 0,
    recoveredByResubmission,
    manuallyPaidCases,
    recoveredCount: recoveredByResubmission.length + manuallyPaidCases.length,
    matchedNewSubmissionAmount: recoveredByResubmission.reduce((sum, candidate) => sum + candidate.newAmount, 0)
  };
}

function previousYearPeriod(period: PeriodOption): PeriodOption {
  const currentYear = period.start?.getFullYear();
  const previousYear = currentYear ? currentYear - 1 : undefined;
  return {
    ...period,
    id: `${period.id}-previous-year`,
    label: currentYear && previousYear ? period.label.replace(String(currentYear), String(previousYear)) : `${period.label} Vorjahr`,
    start: period.start ? new Date(period.start.getFullYear() - 1, period.start.getMonth(), 1) : undefined,
    end: period.end ? new Date(period.end.getFullYear() - 1, period.end.getMonth(), period.end.getDate()) : undefined
  };
}

function monthlySparklinePoints(metric: AnswerSparklineMetric, rows: ImportPreviewRow[], relevantStandorte: Standort[], manualCaseResolutions: ManualCaseResolution[] = []) {
  const monthKeys = [...new Set(rows.map((row) => importRowMonth(row)).filter(Boolean))].sort();
  return monthKeys.map((month) => {
    const monthRows = rows.filter((row) => importRowMonth(row) === month);
    return valueForAnswerMetric(metric, monthRows, relevantStandorte, manualCaseResolutions);
  }).slice(-12);
}

function valueForAnswerMetric(metric: AnswerSparklineMetric, rows: ImportPreviewRow[], relevantStandorte: Standort[], manualCaseResolutions: ManualCaseResolution[] = []) {
  const summary = summarizeImportRows(rows);
  const metrics = summary.rows ? metricsFromImportSummary(summary) : zeroMetrics();
  if (metric === "submitted") return metrics.submitted;
  if (metric === "payout") return metrics.payout;
  if (metric === "feeNet") return metrics.feeNet;
  if (metric === "tax") return metrics.feeVat + metrics.ewmaVat;
  if (metric === "fees") return metrics.fees;
  if (metric === "feeRate") return metrics.feeRate;
  if (metric === "deductionAmount") return metrics.returnAmount + metrics.cancellationAmount;
  if (metric === "recoveryRate") {
    const deductionAmount = metrics.returnAmount + metrics.cancellationAmount;
    const recoveredByResubmission = uniqueRecoveryCandidates(resubmissionCandidatesFromImportRows(rows));
    const recoveredByResubmissionKeys = new Set(recoveredByResubmission.map((candidate) => resubmissionResolutionKey(candidate)));
    const manualPaidKeys = buildPaidResolutionKeySet(manualCaseResolutions);
    const recoveredByResubmissionAmount = recoveredByResubmission.reduce((sum, candidate) => sum + Math.min(candidate.originalAmount, candidate.newAmount), 0);
    const manuallyPaidAmount = casesFromImportRows(rows)
      .filter((fall) => caseResolutionKeys(fall).some((key) => manualPaidKeys.has(key)) && !recoveredByResubmissionKeys.has(caseResolutionKey(fall)))
      .reduce((sum, fall) => sum + fall.amount, 0);
    const recoveredAmount = Math.min(deductionAmount, recoveredByResubmissionAmount + manuallyPaidAmount);
    return deductionAmount ? Math.min(100, (recoveredAmount / deductionAmount) * 100) : 0;
  }
  if (metric === "chargebackRate") return metrics.submitted ? ((metrics.returnAmount + metrics.cancellationAmount) / metrics.submitted) * 100 : 0;
  if (metric === "noProtection") return metrics.noProtectionAmount;

  const cases = casesFromImportRows(rows).filter((fall) => relevantStandorte.some((entry) => entry.id === fall.standortId) && !fall.status.includes("erledigt"));
  if (metric === "openAmount") return cases.reduce((sum, fall) => sum + fall.amount, 0);
  if (metric === "openCount") return cases.length;
  if (metric === "chargebacks") {
    return cases
      .filter((fall) => fall.reason.includes("Rückgabe") || fall.reason.includes("Rückbelastung"))
      .reduce((sum, fall) => sum + fall.amount, 0);
  }
  if (metric === "oldest") return cases.reduce((max, fall) => Math.max(max, fall.ageDays), 0);
  if (metric === "recurring") {
    return getRecurringRiskProfiles(
      relevantStandorte.length === 1 ? relevantStandorte[0].id : undefined,
      rows,
      rows.length > 0
    ).filter((profile) => relevantStandorte.some((entry) => entry.name === profile.standortName)).length;
  }
  return 0;
}

function ClaimsFlowView({
  mode = "details",
  standort,
  cases: rows,
  importRows = [],
  manualCaseResolutions = [],
  invoiceStatusRows = []
}: {
  mode?: "details" | "cashflow";
  standort?: Standort;
  cases: BfsCase[];
  importRows?: ImportPreviewRow[];
  manualCaseResolutions?: ManualCaseResolution[];
  invoiceStatusRows?: ParsedInvoiceStatusRow[];
}) {
  const rowsStandorte = useMemo(() => standort ? [standort] : standorte, [standort]);
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [detailsStandortFilterId, setDetailsStandortFilterId] = useState(() => standort?.id ?? "alle");
  const [standortPeriodIds, setStandortPeriodIds] = useState<Record<string, string>>({});
  const [deductionPeriodId, setDeductionPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [deductionStandortFilterId, setDeductionStandortFilterId] = useState(() => standort?.id ?? "alle");
  const [recoveryPeriodId, setRecoveryPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [recoveryStandortFilterId, setRecoveryStandortFilterId] = useState(() => standort?.id ?? "alle");
  const [waterfallPeriodId, setWaterfallPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [waterfallStandortFilterId, setWaterfallStandortFilterId] = useState(() => standort?.id ?? "alle");
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0], [periodOptions, selectedPeriodId]);
  const deductionPeriod = useMemo(() => periodOptions.find((period) => period.id === deductionPeriodId) ?? selectedPeriod, [periodOptions, deductionPeriodId, selectedPeriod]);
  const recoveryPeriod = useMemo(() => periodOptions.find((period) => period.id === recoveryPeriodId) ?? selectedPeriod, [periodOptions, recoveryPeriodId, selectedPeriod]);
  const waterfallPeriod = useMemo(() => periodOptions.find((period) => period.id === waterfallPeriodId) ?? selectedPeriod, [periodOptions, selectedPeriod, waterfallPeriodId]);
  const detailsStandorte = useMemo(() => {
    if (standort) return [standort];
    if (detailsStandortFilterId === "alle") return rowsStandorte;
    return rowsStandorte.filter((entry) => entry.id === detailsStandortFilterId);
  }, [detailsStandortFilterId, rowsStandorte, standort]);
  const detailsStandortIds = useMemo(() => detailsStandorte.map((entry) => entry.id), [detailsStandorte]);
  const deductionStandorte = useMemo(() => {
    if (standort) return [standort];
    if (deductionStandortFilterId === "alle") return rowsStandorte;
    return rowsStandorte.filter((entry) => entry.id === deductionStandortFilterId);
  }, [deductionStandortFilterId, rowsStandorte, standort]);
  const recoveryStandorte = useMemo(() => {
    if (standort) return [standort];
    if (recoveryStandortFilterId === "alle") return rowsStandorte;
    return rowsStandorte.filter((entry) => entry.id === recoveryStandortFilterId);
  }, [recoveryStandortFilterId, rowsStandorte, standort]);
  const waterfallStandorte = useMemo(() => {
    if (standort) return [standort];
    if (waterfallStandortFilterId === "alle") return rowsStandorte;
    return rowsStandorte.filter((entry) => entry.id === waterfallStandortFilterId);
  }, [rowsStandorte, standort, waterfallStandortFilterId]);
  const scopedImportRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = detailsStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedPeriod, rowStandort) : false;
  }), [detailsStandorte, importRows, selectedPeriod]);
  const deductionScopedImportRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = deductionStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, deductionPeriod, rowStandort) : false;
  }), [deductionPeriod, deductionStandorte, importRows]);
  const recoveryScopedImportRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = recoveryStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, recoveryPeriod, rowStandort) : false;
  }), [importRows, recoveryPeriod, recoveryStandorte]);
  const waterfallScopedImportRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = waterfallStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, waterfallPeriod, rowStandort) : false;
  }), [importRows, waterfallPeriod, waterfallStandorte]);
  const importSummary = useMemo(() => summarizeImportRows(scopedImportRows), [scopedImportRows]);
  const selectedMetrics = useMemo(() => importSummary.rows ? metricsFromImportSummary(importSummary) : zeroMetrics(), [importSummary]);
  const deductionSummary = useMemo(() => summarizeImportRows(deductionScopedImportRows), [deductionScopedImportRows]);
  const deductionMetrics = useMemo(() => deductionSummary.rows ? metricsFromImportSummary(deductionSummary) : zeroMetrics(), [deductionSummary]);
  const recoverySummary = useMemo(() => summarizeImportRows(recoveryScopedImportRows), [recoveryScopedImportRows]);
  const recoveryMetrics = useMemo(() => recoverySummary.rows ? metricsFromImportSummary(recoverySummary) : zeroMetrics(), [recoverySummary]);
  const waterfallSummary = useMemo(() => summarizeImportRows(waterfallScopedImportRows), [waterfallScopedImportRows]);
  const waterfallMetrics = useMemo(() => waterfallSummary.rows ? metricsFromImportSummary(waterfallSummary) : zeroMetrics(), [waterfallSummary]);
  const recentMonths = useMemo(() => buildRecentMonthlyTrend(detailsStandortIds, selectedPeriod, importRows), [detailsStandortIds, selectedPeriod, importRows]);
  const quarterRows = useMemo(() => buildQuarterComparison(detailsStandortIds, importRows), [detailsStandortIds, importRows]);
  const deductionRecoverySummary = useMemo(() => buildDeductionRecovery(importRows, deductionStandorte, deductionPeriod, manualCaseResolutions), [deductionPeriod, deductionStandorte, importRows, manualCaseResolutions]);
  const recoveryDeductionSummary = useMemo(() => buildDeductionRecovery(importRows, recoveryStandorte, recoveryPeriod, manualCaseResolutions), [importRows, manualCaseResolutions, recoveryPeriod, recoveryStandorte]);
  const waterfallDeductionSummary = useMemo(() => buildDeductionRecovery(importRows, waterfallStandorte, waterfallPeriod, manualCaseResolutions), [importRows, manualCaseResolutions, waterfallPeriod, waterfallStandorte]);
  const recoveryClosedKeys = useMemo(() => buildClosedResolutionKeySet(manualCaseResolutions), [manualCaseResolutions]);
  const recoveryReviewRows = useMemo(() => buildInvoiceStatusReviewBasket(invoiceStatusRows, recoveryScopedImportRows), [invoiceStatusRows, recoveryScopedImportRows]);
  const recoveryEconomicCheckRows = useMemo(() => recoveryReviewRows.filter((row) => row.category === "economic_check"), [recoveryReviewRows]);
  const recoveryEconomicCheckAmount = useMemo(() => recoveryEconomicCheckRows.reduce((sum, row) => sum + row.amount, 0), [recoveryEconomicCheckRows]);
  const recoveryPracticeFollowupCases = useMemo(() => applyInvoiceStatusToCases(
    casesFromImportRows(recoveryScopedImportRows).filter((fall) => !fall.status.includes("erledigt") && !caseResolutionKeys(fall).some((key) => recoveryClosedKeys.has(key))),
    invoiceStatusRows
  ).filter(isPracticeFollowupCase), [invoiceStatusRows, recoveryClosedKeys, recoveryScopedImportRows]);
  const recoveryPracticeFollowupAmount = useMemo(() => recoveryPracticeFollowupCases.reduce((sum, fall) => sum + fall.amount, 0), [recoveryPracticeFollowupCases]);
  const recoveryStornoReview = useMemo(() => stornoReviewFromImportRows(
    recoveryScopedImportRows,
    recoveryStandorte.length === 1 ? recoveryStandorte[0].id : undefined,
    manualCaseResolutions
  ), [manualCaseResolutions, recoveryScopedImportRows, recoveryStandorte]);
  const recoveryFinalCancelledAmount = useMemo(() => recoveryStornoReview.rows.filter((row) => row.finalCancelled).reduce((sum, row) => sum + row.amount, 0), [recoveryStornoReview.rows]);
  const deductionAmount = selectedMetrics.returnAmount + selectedMetrics.cancellationAmount;
  const analysisDeductionAmount = deductionMetrics.returnAmount + deductionMetrics.cancellationAmount;
  const analysisRecoveredAmount = deductionRecoverySummary.recoveredAmount;
  const recoveryDeductionAmount = recoveryDeductionSummary.grossDeductionAmount;
  const matchedNewSubmissionAmount = recoveryDeductionSummary.matchedNewSubmissionAmount;
  const recoveredAmount = recoveryDeductionSummary.recoveredAmount;
  const stillOpenAmount = recoveryDeductionSummary.openAmount;
  const waterfallDeductionAmount = waterfallDeductionSummary.grossDeductionAmount;
  const waterfallRecoveredAmount = waterfallDeductionSummary.recoveredAmount;
  const waterfallScopeLabel = waterfallStandorte.length === 1 ? waterfallStandorte[0].name : "Alle Standorte";
  const waterfallSteps = useMemo(() => buildCashflowWaterfallSteps(waterfallMetrics, waterfallDeductionAmount, waterfallRecoveredAmount), [waterfallDeductionAmount, waterfallMetrics, waterfallRecoveredAmount]);
  const totalCostAndDeductions = selectedMetrics.fees + selectedMetrics.ewmaTotal + deductionAmount;
  const deductionBreakdown = useMemo(() => [
    { label: "Stornierungen", amount: deductionMetrics.cancellationAmount, detail: `${deductionMetrics.cancellationCount} Fälle`, kind: "Kontoauszug-Abzug" },
    { label: "Rückläufer/Rückgaben", amount: deductionMetrics.returnAmount, detail: `${deductionMetrics.returnCount} Fälle`, kind: "Kontoauszug-Abzug" },
    { label: "BFS-Gebühr netto", amount: deductionMetrics.feeNet, detail: "Factoring-/Bearbeitungsgebühr", kind: "BFS-Kosten" },
    { label: "MwSt auf BFS-Gebühr", amount: deductionMetrics.feeVat, detail: "Steuer auf BFS-Gebühr", kind: "Steuer" },
    { label: "EWMA / Adressprüfung netto", amount: deductionMetrics.ewmaNet, detail: "Einwohnermeldeamt-Abfragen", kind: "Adressprüfung" },
    { label: "MwSt auf EWMA", amount: deductionMetrics.ewmaVat, detail: "Steuer auf EWMA", kind: "Steuer" }
  ].sort((a, b) => b.amount - a.amount), [deductionMetrics]);
  const recoveryDeductionRate = recoveryMetrics.submitted ? (recoveryDeductionAmount / recoveryMetrics.submitted) * 100 : 0;
  const cancellationRate = selectedMetrics.submitted ? (selectedMetrics.cancellationAmount / selectedMetrics.submitted) * 100 : 0;
  const notRecoveredRate = recoveryMetrics.submitted ? (stillOpenAmount / recoveryMetrics.submitted) * 100 : 0;
  const recoveryRate = recoveryDeductionAmount ? Math.min(100, (recoveredAmount / recoveryDeductionAmount) * 100) : 0;

  return (
    <div className="content-stack">
      {mode === "details" && (
        <>
      <section className="panel period-filter deduction-analysis-filter">
        <label className="select-label">
          Zeitraum Standortdetails
          <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>
            {periodOptions.map((period) => (
              <option key={period.id} value={period.id}>{period.label}</option>
            ))}
          </select>
        </label>
        <label className="select-label">
          Standort Standortdetails
          <select value={standort ? standort.id : detailsStandortFilterId} onChange={(event) => setDetailsStandortFilterId(event.target.value)} disabled={Boolean(standort)}>
            {!standort && <option value="alle">Alle Standorte</option>}
            {rowsStandorte.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
        </label>
        <div>
          <strong>{detailsStandorte.length === 1 ? detailsStandorte[0].name : "Alle Standorte"}</strong>
          <span>{selectedPeriod.detail}</span>
        </div>
      </section>
      <section className="priority-grid">
        <PriorityCard label="Umsatz eingereicht" value={money.format(selectedMetrics.submitted)} hint="Summe aus Abrechnungen" period={selectedPeriod.label} tone="blue" />
        <PriorityCard label="BFS-Gebühr netto" value={money.format(selectedMetrics.feeNet)} hint="ohne MwSt" period={selectedPeriod.label} tone="amber" />
        <PriorityCard label="MwSt auf Gebühren" value={money.format(selectedMetrics.feeVat)} hint="separat erkannt" period={selectedPeriod.label} tone="amber" />
        <PriorityCard label="EWMA / Adressprüfung" value={money.format(selectedMetrics.ewmaTotal)} hint={`netto ${money.format(selectedMetrics.ewmaNet)} · MwSt ${money.format(selectedMetrics.ewmaVat)}`} period={selectedPeriod.label} tone={selectedMetrics.ewmaTotal ? "amber" : "green"} />
        <PriorityCard label="Auszahlungsbetrag" value={money.format(selectedMetrics.payout)} hint="nach BFS-Abzug" period={selectedPeriod.label} tone="green" />
        <PriorityCard label="Gesamtkosten BFS" value={money.format(selectedMetrics.fees)} hint={`${formatFeeRate(selectedMetrics.feeRate)} vom Eingang`} period={selectedPeriod.label} tone="amber" />
        <PriorityCard label="Gesamtabzug" value={money.format(totalCostAndDeductions)} hint="BFS-Gebühr, MwSt, EWMA und Storno/Rückgabe" period={selectedPeriod.label} tone={totalCostAndDeductions ? "red" : "green"} />
        <PriorityCard label="Rückläufer" value={String(selectedMetrics.returnCount)} hint={money.format(selectedMetrics.returnAmount)} period={selectedPeriod.label} tone={selectedMetrics.returnCount ? "red" : "green"} />
        <PriorityCard label="Stornierungen" value={String(selectedMetrics.cancellationCount)} hint={money.format(selectedMetrics.cancellationAmount)} period={selectedPeriod.label} tone={selectedMetrics.cancellationCount ? "amber" : "green"} />
        <PriorityCard label="Stornoquote" value={formatPercent(cancellationRate)} hint="Stornos vom eingereichten Umsatz" period={selectedPeriod.label} tone={cancellationRate ? "amber" : "green"} />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Abzugsanalyse nach Kostenart</h2>
            <p>Eigenständig gefilterte Sicht auf Kosten, Storno/Rückgabe und zurückgeholte Abzüge.</p>
          </div>
        </div>
        <div className="period-filter deduction-analysis-filter">
          <label className="select-label">
            Zeitraum Abzugsanalyse
            <select value={deductionPeriodId} onChange={(event) => setDeductionPeriodId(event.target.value)}>
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
          </label>
          <label className="select-label">
            Standort Abzugsanalyse
            <select value={standort ? standort.id : deductionStandortFilterId} onChange={(event) => setDeductionStandortFilterId(event.target.value)} disabled={Boolean(standort)}>
              {!standort && <option value="alle">Alle Standorte</option>}
              {rowsStandorte.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
          </label>
          <div>
            <strong>{deductionStandorte.length === 1 ? deductionStandorte[0].name : "Alle Standorte"}</strong>
            <span>{deductionPeriod.detail}</span>
          </div>
        </div>
        <div className="priority-grid compact-priority deduction-priority-grid">
          <PriorityCard label="Größter Abzug" value={money.format(deductionMetrics.fees)} hint="BFS-Gebühr inkl. MwSt" period={deductionPeriod.label} tone={deductionMetrics.fees ? "red" : "green"} />
          <PriorityCard label="Kosten ohne Storno" value={money.format(deductionMetrics.fees + deductionMetrics.ewmaTotal)} hint="BFS-Gebühr, MwSt und EWMA" period={deductionPeriod.label} tone={deductionMetrics.fees + deductionMetrics.ewmaTotal ? "amber" : "green"} />
          <PriorityCard label="Brutto Storno/Rückgabe" value={money.format(analysisDeductionAmount)} hint="ursprünglicher Abzug aus Kontoauszug" period={deductionPeriod.label} tone={analysisDeductionAmount ? "red" : "green"} info="Brutto-Grundmenge aus Rückgaben, Rückläufern und Stornos, bevor die App in zurückgeholt, bezahlt, Zahlung/Grund prüfen, Praxis nachfassen oder endgültig storniert trennt." />
          <PriorityCard label="Davon zurückgeholt" value={money.format(analysisRecoveredAmount)} hint={`${deductionRecoverySummary.recoveredCount} Matches/Zahlungen`} period={deductionPeriod.label} tone={analysisRecoveredAmount ? "green" : analysisDeductionAmount ? "amber" : "blue"} info="Zurückgeholt zählt nur echte spätere Neueinreichung/Ersatzrechnung oder wirtschaftlich belegte Zahlung. Saldo 0 allein zählt nicht als Geldzufluss." />
        </div>
        <div className="table-wrap compact-table recovery-table-scroll deduction-breakdown-table">
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
                  <td>{formatPercent(deductionMetrics.submitted ? (entry.amount / deductionMetrics.submitted) * 100 : 0)}</td>
                  <td>{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
        </>
      )}
      {mode === "cashflow" && (
        <>
      <section className="panel cashflow-waterfall-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">CashFlow-Herleitung</span>
            <h2>Vom eingereichten Umsatz zum wirtschaftlichen Betrag</h2>
            <p>Gebühren, Steuer, EWMA, Brutto-Storno/Rückgabe und zurückgeholte Beträge werden als Wasserfall zusammengeführt.</p>
          </div>
        </div>
        <div className="period-filter deduction-analysis-filter">
          <label className="select-label">
            Zeitraum CashFlow
            <select value={waterfallPeriodId} onChange={(event) => setWaterfallPeriodId(event.target.value)}>
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
          </label>
          <label className="select-label">
            Standort CashFlow
            <select value={standort ? standort.id : waterfallStandortFilterId} onChange={(event) => setWaterfallStandortFilterId(event.target.value)} disabled={Boolean(standort)}>
              {!standort && <option value="alle">Alle Standorte</option>}
              {rowsStandorte.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
          </label>
          <div>
            <strong>{waterfallScopeLabel}</strong>
            <span>{waterfallPeriod.detail}</span>
          </div>
        </div>
        <CashflowWaterfallChart
          steps={waterfallSteps}
          periodLabel={waterfallPeriod.label}
          scopeLabel={waterfallScopeLabel}
          payout={waterfallMetrics.payout}
          openDeduction={Math.max(waterfallDeductionAmount - waterfallRecoveredAmount, 0)}
          recoveredCount={waterfallDeductionSummary.recoveredCount}
        />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{standort ? `Forderungen und Geldfluss ${standort.name}` : "Forderungen und Geldfluss Gruppe"}</h2>
            <p>Vom Monatsimport bis zur Rückfrage: eingereicht, Gebühren, Brutto-Storno/Rückgabe, Praxis-Nachfassen und Risiko je Standort.</p>
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
                  <div><dt>Praxis nachfassen</dt><dd>{money.format(openAmount)}</dd></div>
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
        <div className="period-filter deduction-analysis-filter">
          <label className="select-label">
            Zeitraum Wiedereinholung
            <select value={recoveryPeriodId} onChange={(event) => setRecoveryPeriodId(event.target.value)}>
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
          </label>
          <label className="select-label">
            Standort Wiedereinholung
            <select value={standort ? standort.id : recoveryStandortFilterId} onChange={(event) => setRecoveryStandortFilterId(event.target.value)} disabled={Boolean(standort)}>
              {!standort && <option value="alle">Alle Standorte</option>}
              {rowsStandorte.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
          </label>
          <div>
            <strong>{recoveryStandorte.length === 1 ? recoveryStandorte[0].name : "Alle Standorte"}</strong>
            <span>{recoveryPeriod.detail}</span>
          </div>
        </div>
        <div className="priority-grid compact-priority recovery-priority-grid">
          <PriorityCard label="Brutto Storno/Rückgabe" value={money.format(recoveryDeductionAmount)} hint="Rückläufer, Rückgaben und Stornos" period={recoveryPeriod.label} tone={recoveryDeductionAmount ? "red" : "green"} info="Grundmenge vor Folgeentscheidung: Rückläufer, Rückgaben und Stornos aus den BFS-Kontoauszug-Bewegungen." />
          <PriorityCard label="Abzugsquote" value={formatPercent(recoveryDeductionRate)} hint="Abzug vom eingereichten Umsatz" period={recoveryPeriod.label} tone={recoveryDeductionRate ? "red" : "green"} />
          <PriorityCard label="Zurückgeholt / bezahlt" value={money.format(recoveredAmount)} hint={`${recoveryDeductionSummary.recoveredCount} Matches/Zahlungen · brutto neu ${money.format(matchedNewSubmissionAmount)}`} period={recoveryPeriod.label} tone={recoveredAmount ? "green" : "amber"} info="Angerechnet werden echte Neueinreichungen und belegte Zahlungen bis maximal zur Höhe des ursprünglichen Abzugs." />
          <PriorityCard label="Noch ungeklärt" value={money.format(stillOpenAmount)} hint="Brutto-Abzug minus zurückgeholt/bezahlt" period={recoveryPeriod.label} tone={stillOpenAmount ? "amber" : "green"} info="Restbetrag nach angerechneter Neueinreichung oder Zahlung. Dieser Rest muss weiter eingeordnet werden: Zahlung/Grund prüfen, Praxis nachfassen oder endgültig storniert." />
          <PriorityCard label="Offene Abzugsquote" value={formatPercent(notRecoveredRate)} hint="offener Abzug vom eingereichten Umsatz" period={recoveryPeriod.label} tone={notRecoveredRate ? "amber" : "green"} />
          <PriorityCard label="Erledigungsquote Abzug" value={formatPercent(recoveryRate)} hint="angerechnete Erledigung bezogen auf Abzug" period={recoveryPeriod.label} tone={recoveryRate >= 80 ? "green" : recoveryRate ? "amber" : "blue"} />
          <PriorityCard label="Zahlung/Grund prüfen" value={integerNumber.format(recoveryEconomicCheckRows.length)} hint={money.format(recoveryEconomicCheckAmount)} period={recoveryPeriod.label} tone={recoveryEconomicCheckRows.length ? "amber" : "green"} info="Saldogeschlossene Fälle: BFS zeigt keinen offenen Saldo mehr, aber Zahlung, Neueinreichung oder Storno-Grund muss wirtschaftlich belegt werden." />
          <PriorityCard label="Praxis nachfassen" value={integerNumber.format(recoveryPracticeFollowupCases.length)} hint={money.format(recoveryPracticeFollowupAmount)} period={recoveryPeriod.label} tone={recoveryPracticeFollowupCases.length ? "amber" : "green"} info="Echte Praxis-Aufgaben aus dem offenen Rest, vor allem Rückgaben ohne Ausfallschutz. Diese Fälle muss die Praxis aktiv nachhalten." />
          <PriorityCard label="Endgültig storniert" value={integerNumber.format(recoveryStornoReview.finalCancelled)} hint={money.format(recoveryFinalCancelledAmount)} period={recoveryPeriod.label} tone={recoveryStornoReview.finalCancelled ? "red" : "green"} info="Manuell als endgültig storniert markierte Fälle. Sie bleiben in der Brutto-Storno-Grundmenge enthalten, sind aber nicht mehr offene Fallarbeit." />
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
                    <td>{formatFeeRate(metric.feeRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
        </>
      )}
    </div>
  );
}

function PriorityCard({ label, value, hint, tone, info, period, trend }: { label: string; value: string; hint: string; tone: string; info?: string; period?: string; trend?: AnswerSparklineTrend }) {
  const displayHint = normalizeProductCopy(hint);
  const periodText = period ? periodLabelFromHint(period) : periodLabelFromHint(displayHint);
  const infoText = normalizeProductCopy(info ?? metricExplanation(label, value, displayHint, periodText));

  return (
    <article className={`priority-card ${tone}`}>
      <MetricInfo title={label} text={infoText} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{displayHint}</small>
      {trend && <AnswerSparkline trend={trend} />}
      <small className="period-note">{periodText}</small>
    </article>
  );
}

function InsightCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="panel insight-card" lang="de">
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

function defaultPeriodId(periods: PeriodOption[]) {
  return periods.find((period) => period.id === "year-2026")?.id ?? periods[0]?.id ?? "since-start";
}

function buildCustomChartPeriods(): PeriodOption[] {
  const basePeriods = buildCashflowPeriods().map((period) => period.id === "since-start"
    ? { ...period, label: "ab Standortstart" }
    : period);
  const earliestGoLive = new Date(`${standorte.map((entry) => entry.goLiveDate).sort()[0]}T00:00:00`);
  const earliestStartYear = earliestGoLive.getFullYear();
  const currentYear = todayReference.getFullYear();
  const monthPeriods: PeriodOption[] = [];

  for (let year = currentYear; year >= earliestStartYear; year -= 1) {
    const maxMonth = year === currentYear ? todayReference.getMonth() : 11;
    for (let month = maxMonth; month >= 0; month -= 1) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      if (monthEnd < earliestGoLive) continue;
      monthPeriods.push({
        id: `month-${year}-${String(month + 1).padStart(2, "0")}`,
        label: shortMonthYearLabel(year, month),
        detail: "Monat",
        start: monthStart,
        end: monthEnd > todayReference ? todayReference : monthEnd
      });
    }
  }

  return [...basePeriods, ...monthPeriods];
}

function customMonthlyChartPoints(rows: ImportPreviewRow[], manualCaseResolutions: ManualCaseResolution[] = []): CustomChartPoint[] {
  const byMonth = new Map<string, CustomChartPoint>();
  const ensurePoint = (month: string) => {
    const current = byMonth.get(month);
    if (current) return current;
    const [year, monthNumber] = month.split("-").map(Number);
    const point = emptyCustomChartPoint(shortMonthYearLabel(year, monthNumber - 1));
    point.month = month;
    byMonth.set(month, point);
    return point;
  };

  rows.forEach((row) => {
    const month = importRowMonth(row);
    if (!month) return;
    const point = ensurePoint(month);
    const submitted = rowSubmittedAmount(row);
    const feeNet = rowFeeNetAmount(row);
    const feeVat = rowFeeVatAmount(row);
    const ewma = rowEwmaAmount(row);
    point.submitted += submitted;
    point.payout += row.payout ?? 0;
    point.fees += rowFeeAmount(row);
    point.feeNet += feeNet;
    point.tax += feeVat + rowEwmaVatAmount(row);
    point.ewma += ewma;
    const parsedClaims = row.parsedClaims ?? [];
    const claimCount = parsedClaims.length || row.claimsExtracted || row.claimsHeader || 0;
    point.claims += claimCount;
    if (parsedClaims.length) {
      point.noProtectionClaims += parsedClaims.filter((claim) => claim.protectionStatus === "ohne_ausfallschutz").length;
      point.protectedClaims += parsedClaims.filter((claim) => claim.protectionStatus !== "ohne_ausfallschutz").length;
    } else if (claimCount > 0) {
      point.protectedClaims += Math.max(0, claimCount - rowNoProtectionCount(row));
      point.noProtectionClaims += rowNoProtectionCount(row);
    }
    let monthDeductionAmount = 0;
    (row.parsedMovements ?? [])
      .filter((movement) => isStornoMovement(movement) || movement.type.includes("rueckgabe") || movement.type.includes("rueckbelastung"))
      .forEach((movement) => {
      const movementMonth = monthKeyFromGermanDate(movement.date ?? row.date);
      const cancellationPoint = movementMonth ? ensurePoint(movementMonth) : point;
      if (isStornoMovement(movement)) cancellationPoint.cancellations += 1;
      const amount = Math.abs(movement.amount ?? 0);
      cancellationPoint.practiceFollowupAmount += movement.reasonCategory === "rueckgabe_ohne_ausfallschutz" ? amount : 0;
      cancellationPoint.openStornoAmount += amount;
      monthDeductionAmount += movementMonth === month || !movementMonth ? amount : 0;
    });
    point.finalCashflow += Math.max(submitted - feeNet - feeVat - ewma - monthDeductionAmount, 0);
  });

  const recoveredByResubmission = uniqueRecoveryCandidates(resubmissionCandidatesFromImportRows(rows));
  const recoveredByResubmissionKeys = new Set(recoveredByResubmission.map((candidate) => resubmissionResolutionKey(candidate)));
  recoveredByResubmission.forEach((candidate) => {
    const month = monthKeyFromGermanDate(candidate.originalDate);
    if (!month) return;
    const point = ensurePoint(month);
    const recoveredAmount = Math.min(candidate.originalAmount, candidate.newAmount);
    point.openStornoAmount = Math.max(point.openStornoAmount - recoveredAmount, 0);
    point.recoveredStornos += 1;
    point.finalCashflow += recoveredAmount;
  });

  const manualPaidKeys = buildPaidResolutionKeySet(manualCaseResolutions);
  casesFromImportRows(rows)
    .filter((fall) => caseResolutionKeys(fall).some((key) => manualPaidKeys.has(key)) && !recoveredByResubmissionKeys.has(caseResolutionKey(fall)))
    .forEach((fall) => {
      const month = monthKeyFromGermanDate(fall.sourceDate ?? "");
      if (!month) return;
      const point = ensurePoint(month);
      point.openStornoAmount = Math.max(point.openStornoAmount - fall.amount, 0);
      point.recoveredStornos += 1;
      point.finalCashflow += fall.amount;
  });

  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

function monthKeyFromGermanDate(value: string) {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2]}`;
}

function germanDateFromIsoDate(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
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

function buildAnonymousPeerAverage(importRows: ImportPreviewRow[]) {
  const sinceStart = buildCashflowPeriods().find((period) => period.id === "since-start") ?? buildCashflowPeriods()[0];
  const locationMetrics = orderedStandorte()
    .map((standort) => {
      const metrics = metricsFromImportRowsForStandort(importRows, standort, sinceStart);
      const chargebackRate = metrics.submitted ? ((metrics.returnAmount + metrics.cancellationAmount) / metrics.submitted) * 100 : 0;
      const noProtectionShare = metrics.submitted ? (metrics.noProtectionAmount / metrics.submitted) * 100 : 0;
      return {
        submitted: metrics.submitted,
        feeRate: metrics.feeRate,
        chargebackRate,
        noProtectionShare
      };
    })
    .filter((metrics) => metrics.submitted > 0);

  if (!locationMetrics.length) {
    return {
      feeRate: 0,
      chargebackRate: 0,
      noProtectionShare: 0
    };
  }

  return {
    feeRate: average(locationMetrics.map((metrics) => metrics.feeRate)),
    chargebackRate: average(locationMetrics.map((metrics) => metrics.chargebackRate)),
    noProtectionShare: average(locationMetrics.map((metrics) => metrics.noProtectionShare))
  };
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
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
    .filter((movement) => {
      if (movement.reasonCategory && !["regulierung", "abrechnungsumsatz"].includes(movement.reasonCategory)) return true;
      return isStornoMovement(movement) || movement.type.includes("rueckgabe") || movement.type.includes("rueckbelastung");
    });
  const returnMovements = relevantMovements.filter((movement) => movement.type.includes("rueckgabe") || movement.type.includes("rueckbelastung"));
  const cancellationMovements = relevantMovements.filter((movement) => isStornoMovement(movement));
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

function buildCashflowWaterfallSteps(metrics: BfsMetrics, deductionAmount: number, recoveredAmount: number): CashflowWaterfallStep[] {
  const feeNet = Math.max(metrics.feeNet, 0);
  const feeVat = Math.max(metrics.feeVat, 0);
  const ewmaTotal = Math.max(metrics.ewmaTotal, 0);
  const deduction = Math.max(deductionAmount, 0);
  const recovered = Math.max(recoveredAmount, 0);
  const start = Math.max(metrics.submitted, 0);
  const changes = [
    { label: "BFS-Gebühr netto", amount: -feeNet, detail: "Factoring- und Bearbeitungsgebühr", tone: "negative" as const },
    { label: "MwSt", amount: -feeVat, detail: "Steuer auf BFS-Gebühren", tone: "negative" as const },
    { label: "EWMA / Adressprüfung", amount: -ewmaTotal, detail: "Meldeamt und Adressprüfung", tone: "negative" as const },
    { label: "Brutto Storno/Rückgabe", amount: -deduction, detail: `${metrics.returnCount + metrics.cancellationCount} Fälle`, tone: "negative" as const },
    { label: "Zurückgeholt / bezahlt", amount: recovered, detail: "Neueinreichung oder Zahlung belegt", tone: "positive" as const }
  ];
  let current = start;
  const steps: CashflowWaterfallStep[] = [{
    label: "Umsatz eingereicht",
    amount: start,
    start: 0,
    end: start,
    tone: "start",
    detail: "Aus BFS-Abrechnungsimport"
  }];
  changes.forEach((change) => {
    const next = Math.max(current + change.amount, 0);
    steps.push({
      label: change.label,
      amount: change.amount,
      start: current,
      end: next,
      tone: change.tone,
      detail: change.detail
    });
    current = next;
  });
  steps.push({
    label: "Wirtschaftlich verbleibend",
    amount: current,
    start: 0,
    end: current,
    tone: "final",
    detail: "nach offenen Abzügen"
  });
  return steps;
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
      .filter(isOperationalCaseMovement)
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

function applyInvoiceStatusToCases(cases: BfsCase[], invoiceStatusRows: ParsedInvoiceStatusRow[]) {
  if (!invoiceStatusRows.length) return cases;
  const coveredStandortIds = invoiceStatusCoveredStandortIds(invoiceStatusRows);
  const statusByKey = new Map<string, ParsedInvoiceStatusRow>();
  invoiceStatusRows.forEach((row) => invoiceStatusMatchKeys(row).forEach((key) => statusByKey.set(key, row)));

  return cases
    .flatMap((fall) => {
      if (!coveredStandortIds.has(fall.standortId)) return [fall];
      const statusRow = caseInvoiceMatchKeys(fall).map((key) => statusByKey.get(key)).find(Boolean);
      if (!statusRow) {
        return [{
          ...fall,
          reason: fall.reason.startsWith("Nicht in Saldo-Liste") ? fall.reason : `Nicht in Saldo-Liste gefunden: ${fall.reason}`,
          status: "nicht_in_saldo_liste",
          traffic: fall.traffic === "red" ? "red" : "orange",
          lastComment: "Kein Treffer in bestätigter BFS-Saldo-Liste"
        } satisfies BfsCase];
      }
      if (isNoProtectionReturnCase(fall)) {
        return [{
          ...fall,
          reason: fall.reason.startsWith("Rückgabe ohne Ausfallschutz") ? fall.reason : `Rückgabe ohne Ausfallschutz: ${fall.reason}`,
          status: "ohne_schutz_offen",
          traffic: "red",
          lastComment: `BFS-Saldo: ${money.format(statusRow.saldo)} · Rückgabe ohne Ausfallschutz bleibt Nachfassfall der Praxis`
        } satisfies BfsCase];
      }
      if (isInvoiceStatusAutoResolved(statusRow)) return [];

      const criticalOpen = statusRow.saldo < -0.005 && !statusRow.installmentPlan;
      const noProtection = criticalOpen && !statusRow.protection;
      const reminder = statusRow.reminderLevel > 0 && !statusRow.installmentPlan;
      if (!criticalOpen && !reminder && !noProtection) return [fall];

      const labels = [
        noProtection ? "ohne Ausfallschutz offen" : "",
        reminder ? `Mahnstufe ${statusRow.reminderLevel}` : "",
        criticalOpen ? "kritisch offen ohne RP" : ""
      ].filter(Boolean);

      return [{
        ...fall,
        amount: Math.max(fall.amount, Math.abs(statusRow.saldo)),
        reason: `${labels.join(" · ")}: ${fall.reason}`,
        status: noProtection ? "ohne_schutz_offen" : reminder ? "mahnstufe_kritisch" : "kritisch_offen",
        traffic: noProtection || reminder ? "red" : "orange",
        lastComment: `Bestätigter BFS-Saldo: ${money.format(statusRow.saldo)} · ${invoiceStatusLabel(statusRow)}`
      } satisfies BfsCase];
    })
    .sort(compareOperationalCases);
}

function compareOperationalCases(a: BfsCase, b: BfsCase) {
  return operationalCasePriority(a) - operationalCasePriority(b) || b.amount - a.amount || b.ageDays - a.ageDays;
}

function operationalCasePriority(fall: BfsCase) {
  if (fall.status === "ohne_schutz_offen") return 1;
  if (fall.status === "mahnstufe_kritisch") return 2;
  if (fall.status === "kritisch_offen") return 3;
  if (fall.status === "nicht_in_saldo_liste") return 4;
  return 5;
}

function caseResolutionKey(fall: BfsCase) {
  return fall.resolutionKey ?? caseResolutionKeyFromParts(fall);
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
      .filter(isRelevantDeductionMovement)
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
    || movement.reasonCategory === "direktzahlung_patient"
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
      .filter(isRelevantDeductionMovement)
      .map((movement) => ({
        ...movement,
        file: row.file,
        locationName: row.location,
        standortId: standort?.id ?? row.location,
        statementDate: row.date,
        statementNo: row.statementNo
      }));
  });

  return relevantMovements.flatMap((movement) => {
    const patientKey = normalizePatientName(movement.patientName ?? "");
    if (!patientKey) return [];
    return claims
      .filter((claim) => isResubmissionClaimForMovement(claim, movement, patientKey))
      .slice(0, 3)
      .map((claim) => ({
        patientName: claim.patientName,
        locationName: movement.locationName,
        originalDate: movement.statementDate,
        originalStatementNo: movement.statementNo ?? "-",
        invoiceNo: movement.invoiceNo ?? "-",
        bfsNo: movement.bfsNo ?? "-",
        reason: movement.reason ?? reasonLabel(movement.reasonCategory),
        originalAmount: Math.abs(movement.amount ?? 0),
        newDate: claim.statementDate,
        newStatementNo: claim.statementNo ?? "-",
        newInvoiceNo: claim.invoiceNo,
        newBfsNo: claim.bfsNo,
        newAmount: claim.amount,
        newFile: claim.file
      }));
  });
}

type ResubmissionCandidate = ReturnType<typeof resubmissionCandidatesFromImportRows>[number];

function isResubmissionClaimForMovement(
  claim: ParsedImportClaim & { statementDate: string; statementNo: string },
  movement: ParsedImportMovement & { statementDate: string; statementNo: string },
  patientKey: string
) {
  if (normalizePatientName(claim.patientName) !== patientKey) return false;
  const claimDate = importDateKey(claim.statementDate);
  const movementDate = importDateKey(movement.statementDate);
  if (claimDate < movementDate) return false;

  const sameInvoice = Boolean(movement.invoiceNo && claim.invoiceNo === movement.invoiceNo);
  const sameAmount = Math.abs(claim.amount - Math.abs(movement.amount ?? 0)) < 0.01;
  const differentBfsNo = Boolean(claim.bfsNo && movement.bfsNo && claim.bfsNo !== movement.bfsNo);
  const differentInvoiceNo = Boolean(movement.invoiceNo && claim.invoiceNo && claim.invoiceNo !== movement.invoiceNo);
  const sameStatementDate = claimDate === movementDate;
  const rawMovement = `${movement.type ?? ""} ${movement.reason ?? ""} ${movement.rawText ?? ""}`.toLowerCase();
  const isFaultyInvoiceStorno = rawMovement.includes("storno-fehlerhafte");

  if (movement.reasonCategory === "neue_rechnung") {
    return differentBfsNo && (sameInvoice || sameAmount || differentInvoiceNo);
  }

  if (!isFaultyInvoiceStorno) return false;
  if (sameStatementDate) return differentBfsNo && differentInvoiceNo;
  return differentBfsNo && differentInvoiceNo && sameAmount;
}

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

function matchingCandidateTotals(candidates: ResubmissionCandidate[]) {
  const originals = new Map<string, { originalAmount: number; newClaims: Map<string, number> }>();
  candidates.forEach((candidate) => {
    const originalKey = resubmissionResolutionKey(candidate);
    const current = originals.get(originalKey) ?? { originalAmount: candidate.originalAmount, newClaims: new Map<string, number>() };
    current.originalAmount = Math.max(current.originalAmount, candidate.originalAmount);
    current.newClaims.set(matchingNewClaimKey(candidate), candidate.newAmount);
    originals.set(originalKey, current);
  });

  const rows = [...originals.values()].map((entry) => {
    const newAmount = [...entry.newClaims.values()].reduce((sum, amount) => sum + amount, 0);
    return {
      originalAmount: entry.originalAmount,
      newAmount,
      creditedAmount: Math.min(entry.originalAmount, newAmount)
    };
  });

  const originalAmount = rows.reduce((sum, row) => sum + row.originalAmount, 0);
  const newAmount = rows.reduce((sum, row) => sum + row.newAmount, 0);
  const creditedAmount = rows.reduce((sum, row) => sum + row.creditedAmount, 0);
  return {
    originalAmount,
    newAmount,
    creditedAmount,
    difference: newAmount - originalAmount
  };
}

function matchingNewClaimKey(candidate: ResubmissionCandidate) {
  return [
    resubmissionResolutionKey(candidate),
    candidate.newDate,
    candidate.newStatementNo,
    candidate.newInvoiceNo,
    candidate.newBfsNo,
    Math.round(candidate.newAmount * 100)
  ].join("|");
}

function resubmissionResolutionKey(candidate: ResubmissionCandidate) {
  return resubmissionResolutionKeys(candidate)[0];
}

function resubmissionResolutionKeys(candidate: ResubmissionCandidate) {
  const standort = standorte.find((entry) => entry.name === candidate.locationName);
  return caseResolutionKeys({
    standortId: standort?.id ?? candidate.locationName,
    patientName: candidate.patientName,
    invoiceNo: candidate.invoiceNo,
    bfsNo: candidate.bfsNo,
    amount: candidate.originalAmount,
    reason: candidate.reason
  });
}

function resubmissionCandidateToCase(candidate: ResubmissionCandidate): BfsCase {
  const standort = standorte.find((entry) => entry.name === candidate.locationName);
  return {
    id: `resubmission-${resubmissionResolutionKey(candidate)}`,
    resolutionKey: resubmissionResolutionKey(candidate),
    standortId: standort?.id ?? candidate.locationName,
    locationName: candidate.locationName,
    patientName: candidate.patientName,
    invoiceNo: candidate.invoiceNo,
    bfsNo: candidate.bfsNo,
    amount: candidate.originalAmount,
    reason: candidate.reason,
    sourceDate: candidate.originalDate,
    ageDays: 0,
    traffic: "green",
    status: "neueinreichung_match",
    dueDate: "-",
    lastComment: candidate.originalStatementNo
  };
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
      .filter(isRelevantDeductionMovement)
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

function patientQualityMixLabel(rows: ImportPreviewRow[], standortId?: string) {
  const profiles = patientProfilesFromImportRows(rows, standortId);
  if (!profiles.length) return "A 0 / B 0 / C 0 / D 0";
  const counts = ["A", "B", "C", "D"].map((grade) => `${grade} ${profiles.filter((profile) => profile.grade === grade).length}`);
  return counts.join(" / ");
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
  const share = total ? (count / total) * 100 : 0;
  const base = `Aktueller Wert: ${formatPercent(share)} beziehungsweise ${count} von ${total} Patient(en) im aktuellen Standort- und Zeitraumfilter. Datenquelle: importierte BFS-Forderungen und Kontoauszug-Bewegungen. Berücksichtigt werden Einreichungen, Stornos/Rückgaben/Rückbelastungen, ohne-Ausfallschutz-Marker und Wiederholungen je Patient.`;
  const rules: Record<string, string> = {
    A: "Klasse A bedeutet: keine Storno-, Rückgabe- oder Rückbelastungsereignisse und keine relevante ohne-Ausfallschutz-Auffälligkeit. Diese Patienten gelten im aktuellen Datenstand als unauffällig.",
    B: "Klasse B bedeutet: Beobachtung. Dazu zählen Patienten mit genau einem negativen Ereignis oder Patienten ohne Ausfallschutz, bei denen bisher keine Storno-/Rückgabehistorie erkannt wurde. Ohne Ausfallschutz allein ist hier noch kein harter Klärfall.",
    C: "Klasse C bedeutet: erhöhtes Risiko. Dazu zählen Patienten mit mindestens zwei Storno-/Rückgabe-/Rückbelastungsereignissen oder mindestens 500 Euro erkannter negativer Ereignissumme. Hier sollte der Standort aktiv prüfen.",
    D: "Klasse D bedeutet: stark auffällig. Dazu zählen Patienten mit mindestens fünf negativen Ereignissen oder mindestens zwei negativen Ereignissen bei gleichzeitig mindestens 2.500 Euro Risikosumme. Empfehlung: Sperrhinweis, Vorkasse- oder Praxisprozess prüfen."
  };
  return `${rules[grade] ?? "Patientenklasse aus der bestehenden Klassifizierungslogik."} ${base}`;
}

function patientHistoryFromImportRows(rows: ImportPreviewRow[], standortId?: string) {
  const entries = rows.flatMap((row) => {
    const standort = standorte.find((entry) => entry.name === row.location);
    if (!standort || (standortId && standort.id !== standortId)) return [];

    const claims = (row.parsedClaims ?? []).map((claim) => ({
      date: row.date,
      dateKey: importDateKey(row.date),
      patientName: claim.patientName,
      locationName: row.location,
      type: claim.protectionStatus === "ohne_ausfallschutz" ? "Einreichung ohne Schutz" : "Einreichung",
      invoiceNo: claim.invoiceNo,
      bfsNo: claim.bfsNo,
      amount: claim.amount,
      note: compactPatientHistoryNote(claim.markerReason || claim.markerCategory || claim.protectionStatus.replaceAll("_", " "))
    }));

    const movements = (row.parsedMovements ?? [])
      .filter(isRelevantDeductionMovement)
      .map((movement) => ({
        date: movement.date || row.date,
        dateKey: importDateKey(row.date),
        patientName: movement.patientName ?? "Patient noch nicht gematcht",
        locationName: row.location,
        type: movement.reason || movement.reasonCategory || movement.type,
        invoiceNo: movement.invoiceNo ?? "-",
        bfsNo: movement.bfsNo ?? "-",
        amount: Math.abs(movement.amount ?? 0),
        note: compactPatientHistoryNote(movement.matchStatus === "matched_claim" ? "mit Forderung gematcht" : movement.rawText)
      }));

    return [...claims, ...movements];
  });

  return entries.sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.amount - a.amount);
}

function compactPatientHistoryNote(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 90 ? `${cleaned.slice(0, 87)}...` : cleaned;
}

function outcomeRowsFromImportRows(rows: ImportPreviewRow[], standortId?: string) {
  const candidates = resubmissionCandidatesFromImportRows(rows);
  const candidateKeys = new Set(candidates.map((candidate) => `${normalizePatientName(candidate.patientName)}:${candidate.originalDate}:${candidate.bfsNo}`));
  const rawRows = rows.flatMap((row) => {
    const standort = standorte.find((entry) => entry.name === row.location);
    if (!standort || (standortId && standort.id !== standortId)) return [];

    return (row.parsedMovements ?? [])
      .filter(isRelevantDeductionMovement)
      .map((movement) => {
        const key = `${normalizePatientName(movement.patientName ?? "")}:${row.date}:${movement.bfsNo ?? "-"}`;
        const wasReworked = candidateKeys.has(key) || movement.reasonCategory === "neue_rechnung";
        const reasonText = movement.reason?.toLowerCase() ?? "";
        const wasPaid = movement.reasonCategory === "zahlung_nach_storno" || movement.reasonCategory === "direktzahlung_patient" || reasonText.includes("zahlung nach storno") || reasonText.includes("direktzahlung");
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
      .filter(isRelevantDeductionMovement)
      .flatMap((movement) => {
        const patientName = movement.patientName ?? "Patient noch nicht gematcht";
        const key = `${normalizePatientName(patientName)}:${row.date}:${movement.bfsNo ?? "-"}`;
        const reasonText = movement.reason?.toLowerCase() ?? "";
        const wasReworked = candidateKeys.has(key) || movement.reasonCategory === "neue_rechnung";
        const wasPaid = movement.reasonCategory === "zahlung_nach_storno" || movement.reasonCategory === "direktzahlung_patient" || reasonText.includes("zahlung nach storno") || reasonText.includes("direktzahlung");
        if (wasReworked || wasPaid) return [];

        return [{
          patientName,
          locationName: row.location,
          date: row.date,
          invoiceNo: movement.invoiceNo ?? "-",
          bfsNo: movement.bfsNo ?? "-",
          reason: movement.reason ?? reasonLabel(movement.reasonCategory),
          amount: Math.abs(movement.amount ?? 0),
          statementNo: row.statementNo,
          file: row.file
        }];
      });
  }).sort((a, b) => b.amount - a.amount);
}

function stornoReviewFromImportRows(rows: ImportPreviewRow[], standortId?: string, manualCaseResolutions: ManualCaseResolution[] = []) {
  const candidates = resubmissionCandidatesFromImportRows(rows);
  const manualCancelledKeys = buildCancelledResolutionKeySet(manualCaseResolutions);
  const candidateByOriginalKey = new Map<string, ResubmissionCandidate>();
  uniqueRecoveryCandidates(candidates)
    .filter((candidate) => !resubmissionResolutionKeys(candidate).some((key) => manualCancelledKeys.has(key)))
    .forEach((candidate) => {
      const key = `${normalizePatientName(candidate.patientName)}:${candidate.originalDate}:${candidate.bfsNo}`;
      const current = candidateByOriginalKey.get(key);
      if (!current || importDateKey(candidate.newDate) < importDateKey(current.newDate)) {
        candidateByOriginalKey.set(key, candidate);
      }
    });
  const manualPaidKeys = buildPaidResolutionKeySet(manualCaseResolutions);
  const manualPaidDateByKey = new Map<string, string>();
  manualCaseResolutions
    .filter((resolution) => resolution.status === "paid_manual")
    .forEach((resolution) => {
      const resolvedDate = germanDateFromIsoDate(resolution.resolvedAt);
      caseResolutionKeys(resolution).forEach((key) => manualPaidDateByKey.set(key, resolvedDate));
    });
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
        const manualKeysForMovement = caseResolutionKeys({
          standortId: standort.id,
          patientName,
          invoiceNo: movement.invoiceNo ?? "-",
          bfsNo: movement.bfsNo ?? "-",
          amount: Math.abs(movement.amount ?? 0),
          reason
        });
        const doneByPayment = movement.reasonCategory === "zahlung_nach_storno" || movement.reasonCategory === "direktzahlung_patient" || reasonText.includes("zahlung nach storno") || reasonText.includes("direktzahlung");
        const resubmissionCandidate = candidateByOriginalKey.get(key);
        const doneByResubmission = Boolean(resubmissionCandidate) || movement.reasonCategory === "neue_rechnung";
        const manualPaidDate = manualKeysForMovement.map((manualKey) => manualPaidDateByKey.get(manualKey)).find(Boolean) ?? "";
        const doneByManualResolution = manualKeysForMovement.some((manualKey) => manualPaidKeys.has(manualKey));
        const finalCancelled = manualKeysForMovement.some((manualKey) => manualCancelledKeys.has(manualKey));
        const done = doneByPayment || doneByResubmission || doneByManualResolution;
        const open = !done && !finalCancelled;
        const recoveryDate = done
          ? (doneByPayment
            ? movement.date ?? row.date
            : resubmissionCandidate?.newDate || (doneByManualResolution ? manualPaidDate : "") || row.date)
          : "";
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
          finalCancelled,
          open,
          recoveryDate,
          doneReason: doneByPayment ? "Zahlung nach Storno" : doneByResubmission ? "Neueinreichung erkannt" : doneByManualResolution ? "Manuell als bezahlt markiert" : finalCancelled ? "Endgültig storniert" : "offen"
        };
      });
  });
  const byLocation = orderedStandorte()
    .filter((standort) => !standortId || standort.id === standortId)
    .map((standort) => {
      const locationRows = stornoRows.filter((row) => row.standortId === standort.id);
      const done = locationRows.filter((row) => row.done).length;
      const finalCancelled = locationRows.filter((row) => row.finalCancelled).length;
      const total = locationRows.length;
      return {
        standort,
        total,
        done,
        finalCancelled,
        open: locationRows.filter((row) => row.open).length,
        amount: locationRows.reduce((sum, row) => sum + row.amount, 0),
        doneRate: total ? (done / total) * 100 : 0,
        rows: locationRows
      };
    });
  const done = stornoRows.filter((row) => row.done).length;
  const finalCancelled = stornoRows.filter((row) => row.finalCancelled).length;
  const total = stornoRows.length;

  return {
    total,
    done,
    finalCancelled,
    open: stornoRows.filter((row) => row.open).length,
    amount: stornoRows.reduce((sum, row) => sum + row.amount, 0),
    doneRate: total ? (done / total) * 100 : 0,
    byLocation,
    rows: stornoRows.sort((a, b) => Number(b.open) - Number(a.open) || Number(a.finalCancelled) - Number(b.finalCancelled) || b.amount - a.amount)
  };
}

function isStornoMovement(movement: NonNullable<ImportPreviewRow["parsedMovements"]>[number]) {
  const type = movement.type.toLowerCase();
  const reason = `${movement.reason ?? ""} ${movement.rawText ?? ""}`.toLowerCase();
  return type.includes("storno") || reason.includes("storno");
}

function isStructuralReturnMovement(movement: NonNullable<ImportPreviewRow["parsedMovements"]>[number]) {
  const type = movement.type.toLowerCase();
  return type.includes("rueckgabe") || type.includes("rueckbelastung");
}

function isSettlementMovement(movement: NonNullable<ImportPreviewRow["parsedMovements"]>[number]) {
  return ["regulierung", "abrechnungsumsatz"].includes(movement.reasonCategory ?? "");
}

function isRelevantDeductionMovement(movement: NonNullable<ImportPreviewRow["parsedMovements"]>[number]) {
  if (isSettlementMovement(movement)) return false;
  if (movement.reasonCategory) return true;
  return isStornoMovement(movement) || isStructuralReturnMovement(movement);
}

function isOperationalCaseMovement(movement: NonNullable<ImportPreviewRow["parsedMovements"]>[number]) {
  return isRelevantDeductionMovement(movement) && movement.reasonCategory !== "direktzahlung_patient";
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
  return match ? shortMonthYearLabel(Number(match[3]), Number(match[2]) - 1) : "ohne Datum";
}

function reasonLabel(reasonCategory?: string) {
  const labels: Record<string, string> = {
    unzustellbar: "Unzustellbar",
    factoringvereinbarung: "lt. Factoringvereinbarung",
    nachricht_praxis: "lt. Nachricht / Praxisanweisung",
    neue_rechnung: "Neue Rechnung",
    zahlung_nach_storno: "Zahlung nach Storno",
    direktzahlung_patient: "Direktzahlung Patient",
    ra_liste: "lt. RA-Liste",
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
  const month = monthKeyFromShortDate(value);
  if (!month) return true;
  const metricDate = new Date(`${month}-01T00:00:00`);
  if (!period.start && !period.end) return month >= standort.goLiveDate.slice(0, 7);
  if (period.start && metricDate < new Date(period.start.getFullYear(), period.start.getMonth(), 1)) return false;
  if (period.end && metricDate > new Date(period.end.getFullYear(), period.end.getMonth(), 1)) return false;
  return true;
}

function economicCheckRowInPeriod(row: InvoiceStatusReviewRow, period: PeriodOption, standort: Standort) {
  const month = monthKeyFromShortDate(row.sourceDate);
  if (!month) return !period.start && !period.end;
  return shortDateInPeriod(row.sourceDate, period, standort);
}

function monthKeyFromShortDate(value: string | undefined) {
  const match = value?.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return match ? `${match[3]}-${match[2]}` : "";
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
  const parsedYear = Number(year);
  const parsedMonth = Number(monthNo);
  if (!parsedYear || !parsedMonth) return month;
  return shortMonthYearLabel(parsedYear, parsedMonth - 1);
}

function formatDelta(value: number) {
  if (!value) return "Vergleich startet";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPercent(value)}`;
}

function maxDate(a: Date, b: Date) {
  return a > b ? a : b;
}

function minDate(a: Date, b: Date) {
  return a < b ? a : b;
}

function formatMonth(date: Date) {
  return shortMonthYearLabel(date.getFullYear(), date.getMonth());
}

type KpiCardTuple = [label: string, value: string, hint: string, info?: string, trend?: AnswerSparklineTrend, period?: string];

function KpiGrid({ standort, cards: customCards, importRows = [], className = "" }: { standort?: Standort; cards?: KpiCardTuple[]; importRows?: ImportPreviewRow[]; className?: string }) {
  const cards = useMemo(() => {
    if (customCards) return customCards;
    const importSummary = summarizeImportRows(standort ? importRows.filter((row) => row.location === standort.name) : importRows);
    const defaultMetrics = importSummary.rows ? metricsFromImportSummary(importSummary) : zeroMetrics();
    const defaultInfo = buildKpiDerivationInfo(defaultMetrics, importSummary.rows ? "aktueller Import" : "kein Datenstand");
    return standort
      ? [
          ["Umsatz eingereicht", money.format(defaultMetrics.submitted), importSummary.rows ? "aus aktuellem Import" : "kein Datenstand", defaultInfo.submitted],
          ["Gesamtkosten BFS", money.format(defaultMetrics.fees), importSummary.rows ? `Gebühr ${money.format(importSummary.feeNet)} · MwSt ${money.format(importSummary.feeVat)}` : "kein Datenstand", defaultInfo.fees],
          ["Praxis nachfassen", "0", "kein Datenstand", defaultInfo.openCases],
          ["Laufend ohne Ausfallschutz", money.format(defaultMetrics.noProtectionAmount), importSummary.rows ? "aus aktuellem Import" : "kein Datenstand", defaultInfo.noProtection]
        ] satisfies KpiCardTuple[]
      : [
          ["Anzahl Standorte", `${standorte.filter((entry) => isStandortLive(entry, todayReference)).length} + ${standorte.filter((entry) => !isStandortLive(entry, todayReference)).length}`, "aktive und geplante Standorte", defaultInfo.locations],
          ["Umsatz eingereicht", money.format(defaultMetrics.submitted), importSummary.rows ? "aus aktuellem Import" : "kein Datenstand", defaultInfo.submitted],
          ["Auszahlungsbetrag", money.format(defaultMetrics.payout), importSummary.rows ? "aus aktuellem Import" : "kein Datenstand", defaultInfo.payout],
          ["Gesamtkosten BFS", money.format(defaultMetrics.fees), importSummary.rows ? `Gebühr ${money.format(importSummary.feeNet)} · MwSt ${money.format(importSummary.feeVat)}` : "kein Datenstand", defaultInfo.fees]
        ] satisfies KpiCardTuple[];
  }, [customCards, importRows, standort]);
  return (
    <section className={className ? `kpi-grid ${className}` : "kpi-grid"}>
      {cards.map(([label, value, hint, info, trend, period]) => (
        <article className="kpi-card" key={label}>
          <MetricInfo title={label} text={normalizeProductCopy(info ?? metricExplanation(label, value, normalizeProductCopy(hint), periodLabelFromHint(period ?? hint)))} />
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{normalizeProductCopy(hint)}</small>
          {trend && <AnswerSparkline trend={trend} />}
          <small className="period-note">{periodLabelFromHint(period ?? hint)}</small>
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
    tax: `Herleitung: Steueranteil auf BFS-Gebühren und Zusatzkosten im Zeitraum ${periodLabel}. BFS-MwSt: ${money.format(metrics.feeVat)}, EWMA-/Zusatzkosten-MwSt: ${money.format(metrics.ewmaVat)}, zusammen ${money.format(taxTotal)}. Steuer wird getrennt von Netto-Zusatzkosten und Stornos betrachtet.`,
    noProtection: `Datenquelle: Forderungslisten und Kontoauszug-Bewegungen aus dem Import. Berechnung: Summe aller Positionen, die ohne Ausfallschutz markiert sind oder als Rückgabe ohne Ausfallschutz erkannt wurden. Zeitraum: ${periodLabel}. Aktueller Wert: ${money.format(metrics.noProtectionAmount)}.`,
    openCases: `Datenquelle: aktuell erkannte Import- und Saldo-Falllogik. Berechnung: gezählt werden echte Praxis-Nachfassfälle, vor allem Rückgaben ohne Ausfallschutz. Zahlung/Grund-prüfen-Fälle sind saldogeschlossene Belegfälle und werden getrennt geführt. Zeitraum: aktueller Datenstand. Aktueller Wert: 0.`,
    locations: `Datenquelle: Standortstammdaten der App. Berechnung: zuerst aktive Standorte bis heute, danach geplante Standorte mit künftigem Vertragsstart. Zeitraum: aktueller Datenstand.`
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

  function toggleInfo(event?: React.MouseEvent<HTMLButtonElement>) {
    event?.preventDefault();
    event?.stopPropagation();

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
      {open && typeof document !== "undefined" && createPortal(
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
        </>,
        document.body
      )}
    </div>
  );
}

function metricExplanation(label: string, value: string, hint: string, period = "Zeitraum: aktueller Datenstand") {
  const normalized = label.toLowerCase();
  const base = `Datenquelle: aktueller BFS-Import, Standortstammdaten und interne Bearbeitungsstände der App. Zeitraum/Filter: ${period}; ${hint}. Aktueller Wert: ${value}.`;
  if (normalized.includes("höchstes volumen")) {
    return `Herleitung: Verglichen wird der eingereichte Umsatz aller im aktuellen Standort- und Zeitraumfilter enthaltenen Standorte. Angezeigt wird der Standort mit der höchsten Summe. ${base}`;
  }
  if (normalized.includes("höchste gebührenquote")) {
    return `Herleitung: Gebührenquote je Standort = Gesamtkosten BFS geteilt durch eingereichten Umsatz. Angezeigt wird der Standort mit der höchsten Quote. ${base}`;
  }
  if (normalized.includes("auffälligster standort")) {
    return `Herleitung: Der Standort wird nach Brutto-Storno/Rückgabe, Ohne-Ausfallschutz-Risiko, echten Praxis-Nachfassfällen und Volumen priorisiert. Zahlung/Grund-prüfen-Fälle werden separat geführt. Die Kennzahl ist ein Steuerungshinweis, keine zusätzliche Buchung. ${base}`;
  }
  if (normalized.includes("standorte ohne werte")) {
    return `Herleitung: Gezählt werden Standorte, die im gewählten Zeitraum aktiv oder geplant sind, für die aber keine Importzeilen im Datenstand liegen. ${base}`;
  }
  if (normalized.includes("dateien im lauf")) {
    return `Herleitung: Anzahl der PDF-Dateien, die im aktuellen Upload verarbeitet wurden oder gerade verarbeitet werden. Duplikate können verarbeitet, aber nicht neu gespeichert werden. ${base}`;
  }
  if (normalized.includes("importfähig")) {
    return `Herleitung: Gezählt werden Importzeilen ohne harte Parsing- oder Mapping-Hinweise. Diese Dateien können fachlich grundsätzlich übernommen werden. ${base}`;
  }
  if (normalized.includes("zu prüfen")) {
    return `Herleitung: Anzahl der Importzeilen mit Hinweisen zu Mapping, Mandantennummer, Summenabweichung oder Parsing. Diese Zeilen bleiben sichtbar, damit sie vor Freigabe geprüft werden können. ${base}`;
  }
  if (normalized.includes("unterordner")) {
    return `Herleitung: Anzahl der beim Ordnerupload rekursiv erkannten Unterordner. Diese Zahl dient nur der Upload-Kontrolle, nicht der fachlichen Auswertung. ${base}`;
  }
  if (normalized.includes("grund-klassen")) {
    return `Herleitung: Anzahl unterschiedlicher erkannter Bewegungs- oder Rückgabegründe aus den Kontoauszug-Zeilen. Die Gruppierung basiert auf der bestehenden Parser-Klassifikation. ${base}`;
  }
  if (normalized.includes("historisch offen")) {
    return `Herleitung: Bewegungen ohne sicheren Match auf eine Forderung oder spätere Einreichung im vorhandenen Datenstand. Häufig fehlt dafür eine ältere Abrechnung im Import. ${base}`;
  }
  if (normalized.includes("sofort prüfen")) {
    return `Herleitung: Praxis-Nachfassfälle mit einem Alter über 30 Tagen. Alter wird aus dem erkannten Bewegungsdatum berechnet; saldogeschlossene Zahlung/Grund-Prüfungen zählen hier nicht mit. ${base}`;
  }
  if (normalized.includes("diese woche")) {
    return `Herleitung: Praxis-Nachfassfälle mit einem Alter zwischen 8 und 30 Tagen. Diese Kategorie priorisiert laufende Fälle unterhalb der Eskalationsschwelle. ${base}`;
  }
  if (normalized.includes("wiedervorlage")) {
    return `Herleitung: Fälle mit Status Wiedervorlage oder hinterlegtem Fälligkeitsdatum. Sie bleiben offen, bis sie erledigt oder bezahlt markiert werden. ${base}`;
  }
  if (normalized.includes("nachbearbeitet")) {
    return `Herleitung: Fälle, zu denen eine spätere Neueinreichung, eine erkannte Zahlung oder eine manuelle Maßnahme vorliegt. Diese Zahl ist eine Bearbeitungskennzahl. ${base}`;
  }
  if (normalized.includes("bezahlt") || normalized.includes("erledigt")) {
    return `Herleitung: Bezahlt bedeutet wirtschaftlich belegte Zahlung oder manuelle Zahlungsklärung. Erledigt ist ein Bearbeitungsstatus und kein Beweis, dass BFS-Saldo 0 automatisch Geldzufluss bedeutet. ${base}`;
  }
  if (normalized.includes("neueinreichungen")) {
    return `Herleitung: Gezählt werden Fälle, bei denen nach einer Storno-, Rückgabe- oder Rückbelastungsbewegung derselbe Patient später erneut in einer Forderungsliste erscheint. ${base}`;
  }
  if (normalized.includes("betroffene patienten")) {
    return `Herleitung: Eindeutige Patientennamen innerhalb der erkannten Neueinreichungs- oder Risikoliste. Mehrere Einreichungen desselben Patienten zählen hier nur einmal. ${base}`;
  }
  if (normalized.includes("urspr") || normalized.includes("ursprungsbetrag")) {
    return `Herleitung: Summe der ursprünglichen Storno-, Rückgabe- oder Rückbelastungsbeträge, für die später ein möglicher Gegenlauf erkannt wurde. ${base}`;
  }
  if (normalized.includes("neue summe") || normalized.includes("neue forderungssumme")) {
    return `Herleitung: Summe der später erkannten Forderungen nach einer Storno-/Rückgabehistorie. Die neue Summe kann höher sein als der ursprüngliche Abzug; für Erledigungsquoten wird höchstens der ursprüngliche Abzug angerechnet. ${base}`;
  }
  if (normalized.includes("wiederholer")) {
    return `Herleitung: Eindeutige Patienten, die mehrfach ohne Ausfallschutz eingereicht wurden. Zusätzlich werden Storno-/Rückgabeereignisse berücksichtigt, um kritische Wiederholer höher zu priorisieren. ${base}`;
  }
  if (normalized.includes("maßnahme nötig")) {
    return `Herleitung: Teilmenge der Wiederholer ohne Ausfallschutz mit kritischer Häufung, hohem Risikobetrag oder negativer Bewegung. Diese Fälle sollten vom Standort aktiv geprüft werden. ${base}`;
  }
  if (normalized.includes("risikosumme")) {
    return `Herleitung: Summe der ohne Ausfallschutz eingereichten Beträge bei wiederholt auffälligen Patienten. Diese Summe ist ein Risikohinweis, kein automatisch offener Klärfall. ${base}`;
  }
  if (normalized.includes("letzte sichtung")) {
    return `Herleitung: Neueste Abrechnung oder Bewegung innerhalb der aktuell gefilterten Risikoliste. Sie zeigt, wie aktuell der jüngste Treffer ist. ${base}`;
  }
  if (normalized.includes("reportfälle")) {
    return `Herleitung: Praxis-Nachfassfälle, die im Report-Center für den Standortbericht berücksichtigt werden. Zahlung/Grund-Prüfungen sind saldogeschlossene Belegfälle und werden getrennt betrachtet. ${base}`;
  }
  if (normalized.includes("eingereicht") || normalized.includes("forderungen")) {
    return `Herleitung: Summe der aus den BFS-Abrechnungen erkannten Forderungsbeträge im gewählten Zeitraum. ${base}`;
  }
  if (normalized.includes("mwst")) {
    return `Herleitung: Separat erkannte Mehrwertsteuer auf BFS-Gebühren aus den Abrechnungen. ${base}`;
  }
  if (normalized.includes("gesamtkosten")) {
    return `Herleitung: BFS-Gebühr netto plus erkannte MwSt. ${base}`;
  }
  if (normalized.includes("abzugsquote")) {
    return `Herleitung: Brutto Storno/Rückgabe geteilt durch den eingereichten Umsatz im gewählten Zeitraum. Brutto bedeutet vor Einordnung in zurückgeholt, bezahlt, Zahlung/Grund prüfen, Praxis nachfassen oder endgültig storniert. ${base}`;
  }
  if (normalized.includes("nicht reingeholt") || normalized.includes("offene abzugsquote")) {
    return `Herleitung: Noch nicht durch spätere Neueinreichungen oder manuelle Zahlung erledigter Abzug geteilt durch den eingereichten Umsatz im gewählten Zeitraum. ${base}`;
  }
  if (normalized.includes("stornoquote")) {
    return `Herleitung: Stornobeträge geteilt durch den eingereichten Umsatz im gewählten Zeitraum. ${base}`;
  }
  if (normalized.includes("matchingquote") || normalized.includes("erledigungsquote abzug")) {
    return `Herleitung: Auf den ursprünglichen Brutto-Abzug angerechnete echte Neueinreichungen und wirtschaftlich belegte Zahlungen geteilt durch die gesamte Abzugssumme. Neue Einreichungen werden höchstens bis zur Höhe des ursprünglichen Abzugs angerechnet. ${base}`;
  }
  if (normalized.includes("erledigungsquote") || normalized.includes("wieder erledigt") || normalized.includes("noch nicht erledigt") || normalized.includes("abzug erledigt") || normalized.includes("offener abzug")) {
    return `Herleitung: Als zurückgeholt/bezahlt zählen spätere echte Neueinreichungen sowie wirtschaftlich belegte Zahlungen. Angerechnet wird maximal der ursprüngliche Storno-/Rückgabe-Abzug, auch wenn die spätere Neueinreichung höher ist. Saldo 0 allein ist kein Zahlungsnachweis. ${base}`;
  }
  if (normalized.includes("gebühr")) {
    return `Herleitung: Netto-Gebührenposition der BFS-Abrechnungen; MwSt wird separat ausgewiesen und fließt mit in die Gesamtkosten. ${base}`;
  }
  if (normalized.includes("rückläufer") || normalized.includes("rückgaben")) {
    return `Herleitung: Gezählt werden Kontoauszug-Bewegungen mit Rückgabe, Rückbelastung oder vergleichbarer BFS-Bemerkung. Der Betrag kommt aus der jeweiligen Bewegungszeile und ist Teil der Brutto-Storno/Rückgabe-Grundmenge. ${base}`;
  }
  if (normalized.includes("storno")) {
    return `Herleitung: Gezählt werden Kontoauszug-Zeilen vom Typ Storno Liquidation. Der Originalgrund aus der BFS-Bemerkung bleibt gespeichert; die spätere Einordnung erfolgt getrennt in zurückgeholt, bezahlt, Zahlung/Grund prüfen, Praxis nachfassen oder endgültig storniert. ${base}`;
  }
  if (normalized.includes("ausfallschutz") || normalized.includes("schutz")) {
    return `Herleitung: Summe der Forderungen, die in der Forderungsliste ohne Ausfallschutz markiert sind oder als spätere Rückgabe ohne Ausfallschutz auftauchen. ${base}`;
  }
  if (normalized.includes("zahlung/grund") || normalized.includes("grund prüfen")) {
    return `Herleitung: Saldogeschlossene Fälle, bei denen noch wirtschaftlich belegt werden muss, ob Zahlung, echte Neueinreichung oder Storno-Grund vorliegt. Saldo 0 bei BFS ist kein Zahlungsnachweis. ${base}`;
  }
  if (normalized.includes("praxis nachfassen")) {
    return `Herleitung: Echte Praxis-Aufgaben, vor allem Rückgaben ohne Ausfallschutz. Diese Fälle muss die Praxis selbst nachhalten oder eintreiben; sie bleiben sichtbar, auch wenn der BFS-Saldo geschlossen ist. ${base}`;
  }
  if (normalized.includes("offen") || normalized.includes("klä") || normalized.includes("prüfen")) {
    return `Herleitung: Offene operative Fälle werden nach neuer Logik getrennt: Praxis nachfassen für echte Praxis-Aufgaben und Zahlung/Grund prüfen für saldogeschlossene Belegfälle. ${base}`;
  }
  if (normalized.includes("import")) {
    return `Herleitung: Status aus dem aktuellen Import, inklusive erkannter Dateien, Hash-Dubletten und Parsing-Hinweisen. ${base}`;
  }
  return `Herleitung: Dieser Wert wird aus den aktuell gefilterten BFS-Daten und dem ausgewählten Zeitraum berechnet. ${base}`;
}

function UploadView({
  liveRows,
  onRowsChange,
  statusDocuments,
  onStatusDocumentsChange
}: {
  liveRows: ImportPreviewRow[];
  onRowsChange: (rows: ImportPreviewRow[]) => void;
  statusDocuments: ParsedInvoiceStatusDocument[];
  onStatusDocumentsChange: (rows: ParsedInvoiceStatusDocument[]) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("Bereit für Upload");
  const [selectedFileCount, setSelectedFileCount] = useState(0);
  const [isStatusProcessing, setIsStatusProcessing] = useState(false);
  const [statusUploadStatus, setStatusUploadStatus] = useState("Bereit für Saldo-Listen");
  const [selectedStatusFileCount, setSelectedStatusFileCount] = useState(0);
  const [selectedStatusFileNames, setSelectedStatusFileNames] = useState<string[]>([]);
  const [pendingStatusDocuments, setPendingStatusDocuments] = useState<ParsedInvoiceStatusDocument[] | null>(null);
  const [isStatusConfirming, setIsStatusConfirming] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const previewRows = liveRows;
  const okRows = previewRows.filter((row) => row.status === "OK").length;
  const warningRows = previewRows.length - okRows;
  const importConfirmationMovements = previewRows.flatMap((row) => row.parsedMovements ?? [])
    .filter(isRelevantDeductionMovement);
  const importConfirmationRetainedAmount = importConfirmationMovements.reduce((sum, movement) => sum + Math.abs(movement.amount ?? 0), 0);
  const displayedStatusDocuments = pendingStatusDocuments ?? statusDocuments;
  const hasPendingStatusImport = pendingStatusDocuments !== null;
  const statusRows = displayedStatusDocuments.flatMap((document) => document.rows);
  const statusSummary = summarizeInvoiceStatusRows(statusRows, previewRows);
  const nextStatusUploadMode = displayedStatusDocuments.length ? "append" : "replace";

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

  async function handleStatusFiles(files: FileList | null, mode: "replace" | "append" = "replace") {
    if (!files?.length) return;
    const importableFiles = [...files].filter(isInvoiceStatusPdfUploadFile);
    setSelectedStatusFileCount(importableFiles.length);
    setSelectedStatusFileNames(importableFiles.map(uploadFilePath));
    if (!importableFiles.length) {
      setStatusUploadStatus("Keine PDF-Listen gefunden");
      return;
    }
    setIsStatusProcessing(true);
    setStatusUploadStatus(`${importableFiles.length} Saldo-Listen werden gelesen`);
    try {
      if (mode === "replace") setPendingStatusDocuments([]);
      const parsedDocuments = await parseInvoiceStatusFiles(importableFiles, (processed, total, fileName) => {
        const shortName = fileName.length > 34 ? `${fileName.slice(0, 31)}...` : fileName;
        setStatusUploadStatus(`${processed} von ${total} Listen gelesen (${shortName})`);
      });
      const completeParsedDocuments = await ensureInvoiceStatusDocumentsForFiles(importableFiles, parsedDocuments, (processed, total, fileName) => {
        const shortName = fileName.length > 34 ? `${fileName.slice(0, 31)}...` : fileName;
        setStatusUploadStatus(`${processed} von ${total} Listen vollständig geprüft (${shortName})`);
      });
      const baseDocuments = pendingStatusDocuments ?? statusDocuments;
      const nextDocuments = mode === "append" ? mergeInvoiceStatusDocuments(baseDocuments, completeParsedDocuments) : completeParsedDocuments;
      setPendingStatusDocuments(nextDocuments);
      const nextRows = nextDocuments.flatMap((document) => document.rows);
      const coverage = summarizeInvoiceStatusCoverage(nextRows);
      const coverageNote = `${coverage.coveredStandortCount}/${standorte.length} Standorte erkannt${coverage.unknownMandantCount ? `, ${integerNumber.format(coverage.unknownMandantCount)} Zeilen ohne Standort` : ""}`;
      const readableDocuments = completeParsedDocuments.filter((document) => document.rows.length);
      const failedDocuments = completeParsedDocuments.length - readableDocuments.length;
      setStatusUploadStatus(`${importableFiles.length} Datei(en) ausgewählt, ${readableDocuments.length} Liste(n) gelesen${failedDocuments ? `, ${failedDocuments} Datei(en) zu prüfen` : ""}, ${integerNumber.format(nextRows.length)} Rechnungsstatus-Zeilen erkannt, ${coverageNote}. Bitte bestätigen.`);
    } catch (error) {
      if (mode === "replace") setPendingStatusDocuments(null);
      setStatusUploadStatus(`Saldo-Listen konnten nicht vollständig gelesen werden: ${error instanceof Error ? error.message : "unbekannter Fehler"}`);
    } finally {
      setIsStatusProcessing(false);
    }
  }

  async function confirmStatusImport() {
    if (!pendingStatusDocuments) return;
    setIsStatusConfirming(true);
    setStatusUploadStatus("Saldo-Import wird bestätigt und gespeichert");
    try {
      const savedDocuments = await saveConfirmedInvoiceStatusDocuments(pendingStatusDocuments);
      onStatusDocumentsChange(savedDocuments);
      const confirmedRows = savedDocuments.flatMap((document) => document.rows);
      const coverage = summarizeInvoiceStatusCoverage(confirmedRows);
      setPendingStatusDocuments(null);
      setStatusUploadStatus(`Saldo-Import bestätigt: ${integerNumber.format(confirmedRows.length)} Rechnungsstatus-Zeilen übernommen, ${coverage.coveredStandortCount}/${standorte.length} Standorte erkannt`);
    } catch (error) {
      setStatusUploadStatus(`Saldo-Import konnte nicht bestätigt werden: ${error instanceof Error ? error.message : "unbekannter Fehler"}`);
    } finally {
      setIsStatusConfirming(false);
    }
  }

  async function resetStatusImport() {
    if (hasPendingStatusImport) {
      setPendingStatusDocuments(null);
      setStatusUploadStatus("Saldo-Vorschau verworfen");
      setSelectedStatusFileCount(0);
      setSelectedStatusFileNames([]);
    } else {
      setIsStatusConfirming(true);
      try {
        await clearConfirmedInvoiceStatusDocuments();
        onStatusDocumentsChange([]);
        setSelectedStatusFileNames([]);
        setStatusUploadStatus("Saldo-Import zurückgesetzt");
      } catch (error) {
        setStatusUploadStatus(`Saldo-Import konnte nicht zurückgesetzt werden: ${error instanceof Error ? error.message : "unbekannter Fehler"}`);
      } finally {
        setIsStatusConfirming(false);
      }
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
          <button className="primary-button" disabled={isProcessing || !liveRows.length} onClick={() => setImportConfirmOpen(true)}>
            <CheckCircle2 size={16} />
            Import bestätigen
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
      {importConfirmOpen && (
        <div className="confirmation-overlay" role="dialog" aria-modal="true" aria-label="Import bestätigt">
          <button className="confirmation-backdrop" aria-label="Dialog schließen" onClick={() => setImportConfirmOpen(false)} />
          <section className="confirmation-dialog">
            <div className="confirmation-icon">
              <CheckCircle2 size={24} />
            </div>
            <h2>Import bestätigt</h2>
            <p>Die Import-Vorschau wurde übernommen. Die App wertet diesen Datenstand jetzt in Cockpit, Fällen, Matching, Maßnahmenkontrolle, Patientenklassifizierung und Reports aus.</p>
            <dl>
              <div><dt>Dateien</dt><dd>{previewRows.length}</dd></div>
              <div><dt>Importfähig</dt><dd>{okRows}</dd></div>
              <div><dt>Rückgaben/Stornos</dt><dd>{importConfirmationMovements.length}</dd></div>
              <div><dt>Einbehalten</dt><dd>{money.format(importConfirmationRetainedAmount)}</dd></div>
            </dl>
            <button className="primary-button" onClick={() => setImportConfirmOpen(false)}>Verstanden</button>
          </section>
        </div>
      )}
      <section className="upload-zone">
        <ClipboardList size={28} />
        <div>
          <h2>BFS-Rechnungsstatus- und Saldo-Listen hochladen</h2>
          <p>Diese monatlichen Übersichtslisten ergänzen die Abrechnungsanalyse um Zahlungsstatus, Saldo, Mahnstufe, Ratenplan und Ausfallschutz je BFS-Nr.</p>
          <div className={isStatusProcessing ? "upload-status processing" : statusRows.length ? "upload-status done" : "upload-status"} aria-live="polite">
            <RefreshCw size={14} />
            <span>{isStatusProcessing ? "Wird gelesen" : isStatusConfirming ? "Speichert" : hasPendingStatusImport ? "Vorschau" : statusRows.length ? "Bestätigt" : "Bereit"}</span>
            <strong>{statusUploadStatus}</strong>
          </div>
        </div>
        <div className="upload-actions">
          <label className={isStatusProcessing ? "file-upload-button disabled" : "file-upload-button"}>
            <Upload size={16} />
            {displayedStatusDocuments.length ? "Saldo-Listen ergänzen" : "Saldo-Listen"}
            <input
              disabled={isStatusProcessing || isStatusConfirming}
              type="file"
              multiple
              accept=".pdf,application/pdf"
              onChange={(event) => {
                void handleStatusFiles(event.target.files, nextStatusUploadMode);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <label className={isStatusProcessing ? "file-upload-button secondary-upload disabled" : "file-upload-button secondary-upload"}>
            <FolderUp size={16} />
            Ordner inkl. Unterordner
            <input
              disabled={isStatusProcessing || isStatusConfirming}
              type="file"
              multiple
              accept=".pdf,application/pdf"
              onChange={(event) => {
                void handleStatusFiles(event.target.files, nextStatusUploadMode);
                event.currentTarget.value = "";
              }}
              {...{ webkitdirectory: "", directory: "" }}
            />
          </label>
          <button className="primary-button" disabled={isStatusProcessing || isStatusConfirming || !hasPendingStatusImport} onClick={() => void confirmStatusImport()}>
            <CheckCircle2 size={16} />
            {isStatusConfirming ? "Wird gespeichert" : "Saldo-Import bestätigen"}
          </button>
          <button className="secondary-button reset-upload-button" disabled={isStatusProcessing || isStatusConfirming || (!displayedStatusDocuments.length && !hasPendingStatusImport)} onClick={() => void resetStatusImport()}>
            <X size={16} />
            {hasPendingStatusImport ? "Saldo-Vorschau verwerfen" : "Saldo-Import zurücksetzen"}
          </button>
        </div>
      </section>
      <section className="priority-grid">
        <PriorityCard label="Statuszeilen" value={integerNumber.format(isStatusProcessing ? selectedStatusFileCount : statusRows.length)} hint={isStatusProcessing ? "Listen werden gelesen" : hasPendingStatusImport ? "Vorschau aus Saldo-Listen" : "bestätigte Saldo-Listen"} tone="blue" />
        <PriorityCard label="Standorte erkannt" value={`${statusSummary.coveredStandortCount}/${standorte.length}`} hint={statusSummary.unknownMandantCount ? `${integerNumber.format(statusSummary.unknownMandantCount)} Zeilen ohne Standort` : "über Mandant-Nr. zugeordnet"} tone={statusSummary.coveredStandortCount === standorte.length && !statusSummary.unknownMandantCount ? "green" : "amber"} />
        <PriorityCard label="Brutto-Prüfbasis" value={integerNumber.format(statusSummary.importCaseCount)} hint="Storno/Rückgabe aus Abrechnung" tone="amber" info="Grundmenge aus dem Abrechnungsimport, bevor die Saldo-Liste in BFS offen, BFS geschlossen, Praxis nachfassen oder Zahlung/Grund prüfen trennt." />
        <PriorityCard label="BFS geschlossen" value={integerNumber.format(statusSummary.correctedCaseCount)} hint="Saldo 0 oder RP-Treffer" tone="green" info="Saldo 0 oder Ratenplan heißt: Bei BFS ist der Fall geschlossen oder geregelt. Das ist noch kein Zahlungsnachweis für die Praxis." />
        <PriorityCard label="Zahlung/Grund prüfen" value={integerNumber.format(statusSummary.cancelledCorrectedCaseCount)} hint="Saldo 0 mit Storno-/Rückgabegrund" tone={statusSummary.cancelledCorrectedCaseCount ? "amber" : "green"} info="Diese Fälle sind bei BFS saldobereinigt, aber wirtschaftlich muss noch belegt werden, ob Zahlung, echte Neueinreichung oder korrekter Storno-Grund vorliegt." />
        <PriorityCard label="Status BFS geschlossen" value={integerNumber.format(statusSummary.autoResolvedCount)} hint="bezahlt, storniert oder RP laut Saldo" tone="green" info="Reiner BFS-Zahlungsstatus aus der Saldo-Liste. Diese Kachel bedeutet nicht automatisch: Geld ist bei der Praxis angekommen." />
        <PriorityCard label="BFS kritisch offen" value={integerNumber.format(statusSummary.criticalOpenCount)} hint={money.format(statusSummary.criticalOpenSaldo)} tone="red" info="Saldo in der BFS-Liste ist negativ und es gibt keinen Ratenplan. Das bleibt ein offenes BFS-Zahlungsrisiko." />
        <PriorityCard label="Mahnstufen kritisch" value={integerNumber.format(statusSummary.criticalReminderCount)} hint="MS > 0 ohne RP" tone="amber" />
        <PriorityCard label="Ohne Schutz bei BFS offen" value={integerNumber.format(statusSummary.noProtectionOpenCount)} hint="negativer Saldo ohne RP" tone="red" info="BFS-Saldo ist noch offen und die Rechnung hat keinen Ausfallschutz. Das ist ein besonders priorisierter Risikofall." />
        <PriorityCard label="Nicht zuordenbar" value={integerNumber.format(statusSummary.unmatchedCaseCount)} hint="Abrechnungsfälle ohne Saldo-Treffer" tone="amber" />
      </section>
      <InvoiceStatusFileSummary documents={displayedStatusDocuments} selectedFileNames={selectedStatusFileNames} isPreview={hasPendingStatusImport} />
      <InvoiceStatusReviewBasket rows={statusRows} importRows={previewRows} />
      <InvoiceStatusPreview rows={statusRows} isPreview={hasPendingStatusImport} />
    </div>
  );
}

function InvoiceStatusReviewBasket({ rows, importRows }: { rows: ParsedInvoiceStatusRow[]; importRows: ImportPreviewRow[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const reviewRows = buildInvoiceStatusReviewBasket(rows, importRows);
  const summary = summarizeInvoiceStatusReviewBasket(reviewRows);
  const visibleRows = reviewRows.slice(0, 180);
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Prüfkorb</span>
          <h2>Praxis-Aufgaben aus Rechnungsstatus</h2>
          <p>Diese Liste entsteht aus Abrechnungsimport plus Saldo-Liste. Sie trennt Praxis-Nachfassfälle von Fällen, die bei BFS geschlossen sind, aber wirtschaftlich noch belegt werden müssen.</p>
        </div>
        <button className="collapse-toggle-button" type="button" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
          <ChevronDown size={16} className={isOpen ? "collapse-icon open" : "collapse-icon"} />
          {isOpen ? "Einklappen" : "Ausklappen"}
        </button>
      </div>
      {isOpen && (
        <>
          <div className="status-review-summary">
            <article><span>Kritisch offen ohne RP</span><strong>{integerNumber.format(summary.criticalOpen)}</strong></article>
            <article><span>Mahnstufe vorhanden</span><strong>{integerNumber.format(summary.reminder)}</strong></article>
            <article><span>Ohne Ausfallschutz offen</span><strong>{integerNumber.format(summary.noProtection)}</strong></article>
            <article><span>Nicht in Saldo-Liste</span><strong>{integerNumber.format(summary.missingInSaldo)}</strong></article>
            <article><span>Zahlung/Grund prüfen</span><strong>{integerNumber.format(summary.economicCheck)}</strong></article>
            <article><span>Storniert/Ausgebucht</span><strong>{integerNumber.format(summary.finalCancelled)}</strong></article>
            <article><span>Nr. nicht zuordenbar</span><strong>{integerNumber.format(summary.unmappable)}</strong></article>
          </div>
          <div className="table-wrap compact-table invoice-status-scroll">
            <table>
              <thead>
                <tr>
                  <th>Kategorie</th>
                  <th>Standort</th>
                  <th>Patient</th>
                  <th>Rechnung</th>
                  <th>Betrag</th>
                  <th>Grund / Status</th>
                  <th>Nächster Schritt</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length ? visibleRows.map((row) => (
                  <tr key={row.id}>
                    <td><StatusBadge status={row.categoryLabel} /></td>
                    <td>{row.locationName}</td>
                    <td><strong>{row.patientName}</strong><small>{row.source}</small></td>
                    <td><strong>{row.invoiceNo}</strong><small>{row.bfsNo}</small></td>
                    <td>{money.format(row.amount)}</td>
                    <td>{row.detail}</td>
                    <td>{row.nextStep}</td>
                  </tr>
                )) : <EmptyTableRow colSpan={7} label="Noch kein Prüfkorb. Bitte Saldo-Liste hochladen oder Abrechnungsimport prüfen." />}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function EconomicCheckView({
  rows,
  importRows,
  standort,
  manualCaseResolutions = [],
  onResolvePaid,
  onCancelFinal
}: {
  rows: ParsedInvoiceStatusRow[];
  importRows: ImportPreviewRow[];
  standort?: Standort;
  manualCaseResolutions?: ManualCaseResolution[];
  onResolvePaid?: (fall: BfsCase) => void | Promise<void>;
  onCancelFinal?: (fall: BfsCase) => void | Promise<void>;
}) {
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [standortFilter, setStandortFilter] = useState(standort?.id ?? "alle");
  const [periodId, setPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [searchTerm, setSearchTerm] = useState("");
  const period = useMemo(() => periodOptions.find((entry) => entry.id === periodId) ?? periodOptions[0], [periodOptions, periodId]);
  const closedKeys = useMemo(() => buildClosedResolutionKeySet(manualCaseResolutions), [manualCaseResolutions]);
  const reviewRows = useMemo(() => buildInvoiceStatusReviewBasket(rows, importRows)
    .filter((row) => row.category === "economic_check")
    .filter((row) => !caseResolutionKeys(invoiceStatusReviewRowToCase(row)).some((key) => closedKeys.has(key))),
    [rows, importRows, closedKeys]
  );
  const availableStandorte = useMemo(() => orderedStandorte().filter((entry) => reviewRows.some((row) => row.standortId === entry.id)), [reviewRows]);
  const filteredRows = useMemo(() => {
    const effectiveStandortId = standort?.id ?? standortFilter;
    const query = normalizeSearchQuery(searchTerm);
    const baseRows = reviewRows.filter((row) => {
      const rowStandort = row.standortId ? standorte.find((entry) => entry.id === row.standortId) : undefined;
      const matchesStandort = effectiveStandortId === "alle" || row.standortId === effectiveStandortId;
      const matchesPeriod = rowStandort ? economicCheckRowInPeriod(row, period, rowStandort) : false;
      return matchesStandort && matchesPeriod;
    });
    if (!query) return baseRows;
    return baseRows.filter((row) => matchesInvoiceStatusReviewSearch(row, query));
  }, [reviewRows, standort?.id, standortFilter, period, searchTerm]);
  const totalAmount = useMemo(() => filteredRows.reduce((sum, row) => sum + row.amount, 0), [filteredRows]);
  const highestRow = useMemo(() => filteredRows.reduce<InvoiceStatusReviewRow | undefined>((max, row) => !max || row.amount > max.amount ? row : max, undefined), [filteredRows]);
  const locationCount = useMemo(() => new Set(filteredRows.map((row) => row.standortId ?? row.locationName)).size, [filteredRows]);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Zahlung / Grund prüfen</h2>
          <p>BFS-Saldo ist geschlossen, aber die wirtschaftliche Ursache muss belegt werden: Zahlung, echte Neueinreichung oder nachvollziehbarer Storno-Grund.</p>
        </div>
        <div className="case-list-actions">
          <button className="secondary-button" disabled={!filteredRows.length} onClick={() => printEconomicCheckReport(filteredRows, period.label)}>
            <Printer size={16} /> PDF Export
          </button>
          <div className="search-box"><Search size={16} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Patient, Re.-Nr. oder BFS-Nr." /></div>
        </div>
      </div>
      <div className="period-filter case-table-filter">
        {!standort && (
          <label className="select-label">
            Standort
            <select value={standortFilter} onChange={(event) => setStandortFilter(event.target.value)}>
              <option value="alle">Alle Standorte</option>
              {availableStandorte.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
          </label>
        )}
        {standort && (
          <label className="select-label">
            Standort
            <select value={standort.id} disabled>
              <option value={standort.id}>{standort.name}</option>
            </select>
          </label>
        )}
        <label className="select-label">
          Zeitraum
          <select value={periodId} onChange={(event) => setPeriodId(event.target.value)}>
            {periodOptions.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.label}</option>
            ))}
          </select>
        </label>
        <div>
          <span>Tab-Auswertung</span>
          <strong>{integerNumber.format(filteredRows.length)} Fälle / {exactMoney.format(totalAmount)}</strong>
        </div>
      </div>
      <div className="case-summary-grid" aria-label="Zahlung und Grund prüfen">
        <article>
          <span>Prüfbetrag gesamt</span>
          <strong>{exactMoney.format(totalAmount)}</strong>
        </article>
        <article>
          <span>Prüffälle</span>
          <strong>{integerNumber.format(filteredRows.length)}</strong>
        </article>
        <article>
          <span>Betroffene Standorte</span>
          <strong>{integerNumber.format(locationCount)}</strong>
        </article>
        <article>
          <span>Höchste Einzelposition</span>
          <strong>{exactMoney.format(highestRow?.amount ?? 0)}</strong>
        </article>
      </div>
      <div className="table-wrap case-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Kategorie</th>
              <th>Standort</th>
              <th>Datum</th>
              <th>Patient</th>
              <th>Rechnung</th>
              <th>Betrag</th>
              <th>Grund / Status</th>
              <th>Nächster Schritt</th>
              {(onResolvePaid || onCancelFinal) && <th>Aktion</th>}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length ? filteredRows.map((row) => {
              const fall = invoiceStatusReviewRowToCase(row);
              return (
                <tr key={row.id}>
                  <td><StatusBadge status={row.categoryLabel} /></td>
                  <td>{row.locationName}</td>
                  <td>{row.sourceDate ?? "-"}</td>
                  <td><strong>{row.patientName}</strong><span>{row.source}</span></td>
                  <td><strong>{row.invoiceNo}</strong><span>{row.bfsNo}</span></td>
                  <td>{exactMoney.format(row.amount)}</td>
                  <td>{row.detail}</td>
                  <td>{row.nextStep}</td>
                  {(onResolvePaid || onCancelFinal) && (
                    <td>
                      <div className="case-action-stack">
                        {onResolvePaid && (
                          <button className="secondary-button resolve-case-button" onClick={() => void onResolvePaid(fall)}>
                            <CheckCircle2 size={15} /> Erledigt / bezahlt
                          </button>
                        )}
                        {onCancelFinal && (
                          <button className="secondary-button resolve-case-button" onClick={() => void onCancelFinal(fall)}>
                            <X size={15} /> Endgültig storniert
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            }) : <EmptyTableRow colSpan={onResolvePaid || onCancelFinal ? 9 : 8} label="Keine Fälle für Zahlung/Grund prüfen im aktuellen Filter." />}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InvoiceStatusFileSummary({
  documents,
  selectedFileNames,
  isPreview
}: {
  documents: ParsedInvoiceStatusDocument[];
  selectedFileNames: string[];
  isPreview?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOnly = !documents.length && selectedFileNames.length;
  const visibleFiles = documents.length
    ? documents.map((document) => {
      const rows = document.rows;
      const locations = [...new Set(rows.map((row) => standortFromMandantNo(row.mandantNo)?.name ?? "unbekannt"))].sort();
      return {
        file: document.file,
        rows: rows.length,
        pages: document.pageCount,
        status: document.status,
        locations: locations.join(", "),
        notes: document.parseNotes.join(" ")
      };
    })
    : selectedFileNames.map((file) => ({ file, rows: 0, pages: 0, status: "ausgewählt", locations: "-", notes: "Datei wurde ausgewählt, aber noch nicht gelesen." }));

  if (!visibleFiles.length) return null;

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{isPreview ? "Dateikontrolle Vorschau" : "Dateikontrolle"}</span>
          <h2>Gelesene Saldo-Listen</h2>
          <p>{selectedOnly ? "Diese Dateien wurden vom Browser ausgewählt." : "Diese Dateien wurden tatsächlich eingelesen. Vor der Bestätigung sollten hier alle erwarteten Standortlisten auftauchen."}</p>
        </div>
        <button className="collapse-toggle-button" type="button" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
          <ChevronDown size={16} className={isOpen ? "collapse-icon open" : "collapse-icon"} />
          {isOpen ? "Einklappen" : "Ausklappen"}
        </button>
      </div>
      {isOpen && (
        <div className="table-wrap compact-table invoice-status-scroll">
          <table>
            <thead>
              <tr>
                <th>Datei</th>
                <th>Zeilen</th>
                <th>Seiten</th>
                <th>Standorte</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleFiles.map((file) => (
                <tr key={file.file}>
                  <td><strong>{shortFileName(file.file)}</strong><small>{file.notes}</small></td>
                  <td>{file.rows ? integerNumber.format(file.rows) : "-"}</td>
                  <td>{file.pages || "-"}</td>
                  <td>{file.locations}</td>
                  <td><StatusBadge status={file.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function InvoiceStatusPreview({ rows, isPreview }: { rows: ParsedInvoiceStatusRow[]; isPreview?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const previewRows = [...rows].sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo)).slice(0, 80);
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{isPreview ? "Saldo-Vorschau" : "Saldo-Listen"}</span>
          <h2>Rechnungsstatus nach BFS-Saldo</h2>
          <p>Die Vorschau zeigt die größten offenen Salden zuerst. Saldo 0,00 € schließt nur den BFS-Saldo; bei Storno/Rückgabe bleibt der wirtschaftliche Grund separat prüfbar.</p>
        </div>
        <button className="collapse-toggle-button" type="button" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
          <ChevronDown size={16} className={isOpen ? "collapse-icon open" : "collapse-icon"} />
          {isOpen ? "Einklappen" : "Ausklappen"}
        </button>
      </div>
      {isOpen && (
        <div className="table-wrap compact-table invoice-status-scroll">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Mandant</th>
                <th>BFS-Nr.</th>
                <th>Patient</th>
                <th>Rechnung</th>
                <th>Betrag</th>
                <th>Saldo</th>
                <th>Storniert</th>
                <th>MS</th>
                <th>RP</th>
                <th>Ausfallschutz</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.length ? previewRows.map((row) => (
                <tr key={`${row.bfsNo}-${row.file}-${row.page}`}>
                  <td><StatusBadge status={invoiceStatusLabel(row)} /></td>
                  <td>{row.mandantNo}</td>
                  <td><strong>{row.bfsNo}</strong></td>
                  <td><strong>{row.patientName}</strong><small>Pat.-Nr. {row.externalPatientNo}</small></td>
                  <td><strong>{row.invoiceNo}</strong><small>{row.invoiceDate}</small></td>
                  <td>{money.format(row.amount)}</td>
                  <td>{money.format(row.saldo)}</td>
                  <td>{row.cancelledAmount ? money.format(row.cancelledAmount) : "-"}</td>
                  <td>{row.reminderLevel || "-"}</td>
                  <td>{row.installmentPlan ? `ja${row.installmentMonths ? ` (${row.installmentMonths})` : ""}` : "-"}</td>
                  <td>{row.protection ? "ja" : "nein"}</td>
                </tr>
              )) : <EmptyTableRow colSpan={11} label="Noch keine Saldo-Listen eingelesen." />}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function invoiceStatusLabel(row: ParsedInvoiceStatusRow) {
  if (row.paymentStatus === "storniert") return "storniert";
  if (row.paymentStatus === "bezahlt") return "bezahlt";
  if (row.paymentStatus === "ratenzahlung") return row.installmentMonths ? `Ratenplan ${row.installmentMonths} Monate` : "Ratenplan";
  if (row.paymentStatus === "teilbezahlt") return "teilbezahlt";
  if (row.reminderLevel > 0) return `offen MS ${row.reminderLevel}`;
  return "offen";
}

type InvoiceStatusReviewCategory = "critical_open" | "reminder" | "no_protection" | "missing_in_saldo" | "economic_check" | "final_cancelled" | "unmappable";

type InvoiceStatusReviewRow = {
  id: string;
  category: InvoiceStatusReviewCategory;
  categoryLabel: string;
  standortId?: string;
  locationName: string;
  patientName: string;
  invoiceNo: string;
  bfsNo: string;
  amount: number;
  detail: string;
  source: string;
  sourceDate?: string;
  nextStep: string;
};

function invoiceStatusReviewRowToCase(row: InvoiceStatusReviewRow): BfsCase {
  return {
    id: `economic-check-${row.id}`,
    resolutionKey: caseResolutionKeyFromParts({
      standortId: row.standortId ?? row.locationName,
      patientName: row.patientName,
      invoiceNo: row.invoiceNo,
      bfsNo: row.bfsNo,
      amount: row.amount,
      reason: row.detail
    }),
    standortId: row.standortId ?? row.locationName,
    locationName: row.locationName,
    patientName: row.patientName,
    invoiceNo: row.invoiceNo,
    bfsNo: row.bfsNo,
    amount: row.amount,
    reason: row.detail,
    sourceDate: row.sourceDate,
    ageDays: row.sourceDate ? ageFromShortDate(row.sourceDate) : 0,
    traffic: "orange",
    status: "zahlung_grund_pruefen",
    dueDate: "-",
    lastComment: row.nextStep
  };
}

function buildInvoiceStatusReviewBasket(rows: ParsedInvoiceStatusRow[], importRows: ImportPreviewRow[]) {
  const coveredStandortIds = invoiceStatusCoveredStandortIds(rows);
  const importCases = casesFromImportRows(importRows).filter((fall) => coveredStandortIds.has(fall.standortId));
  const statusKeys = new Set(rows.flatMap((row) => invoiceStatusMatchKeys(row)));
  const statusRowsByKey = new Map<string, ParsedInvoiceStatusRow>();
  rows.forEach((row) => invoiceStatusMatchKeys(row).forEach((key) => statusRowsByKey.set(key, row)));
  const items: InvoiceStatusReviewRow[] = [];

  rows.forEach((row) => {
    const standort = standortFromMandantNo(row.mandantNo);
    const base = {
      standortId: standort?.id,
      locationName: standort?.name ?? "Standort nicht erkannt",
      patientName: row.patientName,
      invoiceNo: row.invoiceNo,
      bfsNo: row.bfsNo,
      amount: Math.abs(row.saldo || row.amount),
      source: "Saldo-Liste"
    };
    if (!standort || !row.bfsNo || !row.invoiceNo) {
      items.push({
        ...base,
        id: `unmappable-${row.file}-${row.page}-${row.bfsNo}-${row.invoiceNo}`,
        category: "unmappable",
        categoryLabel: "Nr. nicht zuordenbar",
        detail: `Mandant ${row.mandantNo || "-"} / BFS ${row.bfsNo || "-"} / RE ${row.invoiceNo || "-"}`,
        nextStep: "Mandant, BFS-Nr. und Rechnungsnummer in BFS/Praxisdaten prüfen."
      });
    }

    const criticalOpen = row.saldo < -0.005 && !row.installmentPlan;
    if (criticalOpen) {
      items.push({
        ...base,
        id: `critical-${row.file}-${row.page}-${row.bfsNo}`,
        category: "critical_open",
        categoryLabel: "kritisch offen",
        detail: `Saldo ${money.format(row.saldo)}, kein Ratenplan`,
        nextStep: "Als offenes Zahlungsrisiko beobachten; bei späterem Storno/Rücklauf Praxis klären."
      });
    }
    if (row.reminderLevel > 0 && !row.installmentPlan) {
      items.push({
        ...base,
        id: `reminder-${row.file}-${row.page}-${row.bfsNo}`,
        category: "reminder",
        categoryLabel: `Mahnstufe ${row.reminderLevel}`,
        detail: `MS ${row.reminderLevel}, Saldo ${money.format(row.saldo)}`,
        nextStep: "Mahnstufe priorisiert beobachten; erhöhtes Rückgabe-/Stornorisiko."
      });
    }
    if (criticalOpen && !row.protection) {
      items.push({
        ...base,
        id: `no-protection-${row.file}-${row.page}-${row.bfsNo}`,
        category: "no_protection",
        categoryLabel: "ohne Schutz offen",
        detail: `kein Ausfallschutz, Saldo ${money.format(row.saldo)}`,
        nextStep: "Praxisrelevantes Risiko prüfen, weil offener Betrag ohne Schutz läuft."
      });
    }
  });

  importCases
    .filter(isNoProtectionReturnCase)
    .forEach((fall) => {
      const statusRow = caseInvoiceMatchKeys(fall).map((key) => statusRowsByKey.get(key)).find(Boolean);
      items.push({
        id: `practice-followup-${fall.id}`,
        category: "no_protection",
        categoryLabel: "Praxis nachfassen",
        standortId: fall.standortId,
        locationName: fall.locationName,
        patientName: fall.patientName,
        invoiceNo: fall.invoiceNo,
        bfsNo: fall.bfsNo,
        amount: fall.amount,
        detail: `${fall.reason}; ${statusRow ? `${invoiceStatusLabel(statusRow)} mit Saldo ${money.format(statusRow.saldo)}` : "kein Saldo-Treffer"}`,
        source: "Abrechnung + Saldo-Liste",
        sourceDate: fall.sourceDate,
        nextStep: "Praxis muss den Betrag selbst klären/eintreiben; Saldo 0 bei BFS ist hier kein Zahlungsnachweis."
      });
    });

  importCases
    .filter((fall) => !caseInvoiceMatchKeys(fall).some((key) => statusKeys.has(key)))
    .forEach((fall) => {
      items.push({
        id: `missing-saldo-${fall.id}`,
        category: "missing_in_saldo",
        categoryLabel: "nicht in Saldo",
        standortId: fall.standortId,
        locationName: fall.locationName,
        patientName: fall.patientName,
        invoiceNo: fall.invoiceNo,
        bfsNo: fall.bfsNo,
        amount: fall.amount,
        detail: fall.reason,
        source: "Abrechnungsimport",
        sourceDate: fall.sourceDate,
        nextStep: "Prüfen, warum der Abrechnungsfall in der aktuellen Saldo-Liste fehlt."
      });
    });

  importCases
    .filter((fall) => isStornoClarificationCase(fall) && !isNoProtectionReturnCase(fall))
    .forEach((fall) => {
      const statusRow = caseInvoiceMatchKeys(fall).map((key) => statusRowsByKey.get(key)).find(Boolean);
      if (!statusRow || !isInvoiceStatusAutoResolved(statusRow)) return;
      items.push({
        id: `saldo-economic-check-${fall.id}`,
        category: "economic_check",
        categoryLabel: "Zahlung/Grund prüfen",
        standortId: fall.standortId,
        locationName: fall.locationName,
        patientName: fall.patientName,
        invoiceNo: fall.invoiceNo,
        bfsNo: fall.bfsNo,
        amount: fall.amount,
        detail: `${fall.reason}; ${invoiceStatusLabel(statusRow)} mit Saldo ${money.format(statusRow.saldo)}`,
        source: "Abrechnung + Saldo-Liste",
        sourceDate: fall.sourceDate,
        nextStep: "BFS ist geschlossen; Zahlung, Neueinreichung oder Storno-Grund wirtschaftlich belegen."
      });
    });

  finalCancelledImportRows(importRows).forEach((row) => items.push(row));

  return dedupeInvoiceStatusReviewRows(items).sort((a, b) => invoiceStatusReviewPriority(a.category) - invoiceStatusReviewPriority(b.category) || b.amount - a.amount);
}

function finalCancelledImportRows(importRows: ImportPreviewRow[]) {
  return importRows.flatMap((importRow) => {
    const standort = standorte.find((entry) => entry.name === importRow.location);
    if (!standort) return [];
    return (importRow.parsedMovements ?? [])
      .filter(isFinalCancellationMovement)
      .map((movement, index) => ({
        id: `final-cancelled-${importRow.fileHash ?? importRow.file}-${movement.bfsNo ?? index}-${movement.invoiceNo ?? index}`,
        category: "final_cancelled" as const,
        categoryLabel: "storniert/ausgebucht",
        standortId: standort.id,
        locationName: standort.name,
        patientName: movement.patientName ?? "Patient noch nicht gematcht",
        invoiceNo: movement.invoiceNo ?? "-",
        bfsNo: movement.bfsNo ?? "-",
        amount: Math.abs(movement.amount ?? 0),
        detail: movement.reason ?? reasonLabel(movement.reasonCategory),
        source: "Abrechnungsimport",
        sourceDate: importRow.date,
        nextStep: "Grund und Betrag dokumentieren; prüfen, ob Praxis aktiv storniert/ausgebucht hat."
      }));
  });
}

function isPracticeFollowupCase(fall: BfsCase) {
  return fall.status === "ohne_schutz_offen" || isNoProtectionReturnCase(fall);
}

function isFinalCancellationMovement(movement: NonNullable<ImportPreviewRow["parsedMovements"]>[number]) {
  const text = `${movement.type} ${movement.reason ?? ""} ${movement.rawText ?? ""}`.toLowerCase();
  return movement.reasonCategory === "storno_praxis" || text.includes("ausbuch") || text.includes("endgültig storniert") || text.includes("endgueltig storniert");
}

function isStornoClarificationCase(fall: BfsCase) {
  const text = `${fall.status} ${fall.reason} ${fall.lastComment ?? ""}`.toLowerCase();
  return text.includes("storno") || text.includes("ausbuch") || text.includes("liquidation");
}

function isNoProtectionReturnCase(fall: BfsCase) {
  const text = `${fall.status} ${fall.reason} ${fall.lastComment ?? ""}`.toLowerCase();
  return text.includes("rückgabe ohne ausfallschutz") || text.includes("rueckgabe ohne ausfallschutz") || text.includes("ohne ausfallschutz");
}

function summarizeInvoiceStatusReviewBasket(rows: InvoiceStatusReviewRow[]) {
  return rows.reduce((summary, row) => {
    if (row.category === "critical_open") summary.criticalOpen += 1;
    if (row.category === "reminder") summary.reminder += 1;
    if (row.category === "no_protection") summary.noProtection += 1;
    if (row.category === "missing_in_saldo") summary.missingInSaldo += 1;
    if (row.category === "economic_check") summary.economicCheck += 1;
    if (row.category === "final_cancelled") summary.finalCancelled += 1;
    if (row.category === "unmappable") summary.unmappable += 1;
    return summary;
  }, { criticalOpen: 0, reminder: 0, noProtection: 0, missingInSaldo: 0, economicCheck: 0, finalCancelled: 0, unmappable: 0 });
}

function dedupeInvoiceStatusReviewRows(rows: InvoiceStatusReviewRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.category}:${normalizeMatchKey(row.locationName)}:${normalizeMatchKey(row.patientName)}:${normalizeMatchKey(row.invoiceNo)}:${normalizeMatchKey(row.bfsNo)}:${Math.round(row.amount * 100)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function invoiceStatusReviewPriority(category: InvoiceStatusReviewCategory) {
  const priorities: Record<InvoiceStatusReviewCategory, number> = {
    no_protection: 1,
    reminder: 2,
    critical_open: 3,
    missing_in_saldo: 4,
    economic_check: 5,
    final_cancelled: 6,
    unmappable: 7
  };
  return priorities[category];
}

function summarizeInvoiceStatusRows(rows: ParsedInvoiceStatusRow[], importRows: ImportPreviewRow[]) {
  const coveredStandortIds = invoiceStatusCoveredStandortIds(rows);
  const unknownMandantCount = rows.filter((row) => !standortFromMandantNo(row.mandantNo)).length;
  const importCases = casesFromImportRows(importRows).filter((fall) => coveredStandortIds.has(fall.standortId));
  const statusKeys = new Set(rows.flatMap((row) => invoiceStatusMatchKeys(row)));
  const statusRowsByKey = new Map<string, ParsedInvoiceStatusRow>();
  rows.forEach((row) => invoiceStatusMatchKeys(row).forEach((key) => statusRowsByKey.set(key, row)));
  const correctedCaseCount = rows.length
    ? importCases.filter((fall) => !isNoProtectionReturnCase(fall) && caseInvoiceMatchKeys(fall).some((key) => {
      const statusRow = statusRowsByKey.get(key);
      return statusRow ? isInvoiceStatusAutoResolved(statusRow) : false;
    })).length
    : 0;
  const cancelledCorrectedCaseCount = rows.length
    ? importCases.filter((fall) => !isNoProtectionReturnCase(fall) && isStornoClarificationCase(fall) && caseInvoiceMatchKeys(fall).some((key) => {
      const statusRow = statusRowsByKey.get(key);
      return statusRow ? isInvoiceStatusAutoResolved(statusRow) : false;
    })).length
    : 0;
  const unmatchedCaseCount = rows.length
    ? importCases.filter((fall) => !caseInvoiceMatchKeys(fall).some((key) => statusKeys.has(key))).length
    : 0;

  return rows.reduce((summary, row) => {
    const autoResolved = isInvoiceStatusAutoResolved(row);
    const criticalOpen = row.saldo < -0.005 && !row.installmentPlan;
    if (autoResolved) {
      summary.autoResolvedCount += 1;
      summary.autoResolvedAmount += row.amount;
    }
    if (criticalOpen) {
      summary.criticalOpenCount += 1;
      summary.criticalOpenSaldo += Math.abs(row.saldo);
    }
    if (criticalOpen && row.reminderLevel > 0) summary.criticalReminderCount += 1;
    if (criticalOpen && !row.protection) summary.noProtectionOpenCount += 1;
    return summary;
  }, {
    coveredStandortCount: coveredStandortIds.size,
    unknownMandantCount,
    importCaseCount: importCases.length,
    correctedCaseCount,
    cancelledCorrectedCaseCount,
    autoResolvedCount: 0,
    autoResolvedAmount: 0,
    criticalOpenCount: 0,
    criticalOpenSaldo: 0,
    criticalReminderCount: 0,
    noProtectionOpenCount: 0,
    unmatchedCaseCount
  });
}

function summarizeInvoiceStatusCoverage(rows: ParsedInvoiceStatusRow[]) {
  return {
    coveredStandortCount: invoiceStatusCoveredStandortIds(rows).size,
    unknownMandantCount: rows.filter((row) => !standortFromMandantNo(row.mandantNo)).length
  };
}

function isInvoiceStatusAutoResolved(row: ParsedInvoiceStatusRow) {
  return row.paymentStatus === "bezahlt" || row.paymentStatus === "storniert" || row.installmentPlan;
}

function invoiceStatusCoveredStandortIds(rows: ParsedInvoiceStatusRow[]) {
  return new Set(rows.map((row) => standortFromMandantNo(row.mandantNo)?.id).filter((id): id is string => Boolean(id)));
}

function invoiceStatusMatchKeys(row: ParsedInvoiceStatusRow) {
  return normalizeMatchKeys([
    row.bfsNo,
    `${row.patientName}|${row.invoiceNo}`,
    `${row.patientName}|${row.bfsNo}`
  ]);
}

function caseInvoiceMatchKeys(fall: BfsCase) {
  return normalizeMatchKeys([
    fall.bfsNo,
    `${fall.patientName}|${fall.invoiceNo}`,
    `${fall.patientName}|${fall.bfsNo}`,
    ...caseResolutionKeys(fall)
  ]);
}

function normalizeMatchKeys(values: string[]) {
  return Array.from(new Set(values.map(normalizeMatchKey).filter(Boolean)));
}

function standortFromMandantNo(mandantNo: string) {
  return standorte.find((standort) => [standort.mandantNo, ...(standort.mandantNos ?? [])].includes(mandantNo));
}

function normalizeMatchKey(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function normalizeSearchQuery(value: string) {
  return normalizeMatchKey(value);
}

function searchHaystack(...values: Array<string | number | undefined | null>) {
  return normalizeSearchQuery(values.filter((value) => value !== undefined && value !== null).join(" "));
}

function matchesCaseSearch(fall: BfsCase, query: string) {
  return searchHaystack(
    fall.patientName,
    fall.locationName,
    fall.invoiceNo,
    fall.bfsNo,
    fall.amount,
    fall.reason,
    fall.status,
    fall.dueDate,
    fall.lastComment,
    fall.sourceDate
  ).includes(query);
}

function matchesInvoiceStatusReviewSearch(row: InvoiceStatusReviewRow, query: string) {
  return searchHaystack(
    row.categoryLabel,
    row.locationName,
    row.patientName,
    row.invoiceNo,
    row.bfsNo,
    row.amount,
    row.detail,
    row.source,
    row.sourceDate,
    row.nextStep
  ).includes(query);
}

function matchesResubmissionCandidateSearch(candidate: ResubmissionCandidate, query: string) {
  return searchHaystack(
    candidate.patientName,
    candidate.locationName,
    candidate.originalDate,
    candidate.originalStatementNo,
    candidate.invoiceNo,
    candidate.bfsNo,
    candidate.reason,
    candidate.originalAmount,
    candidate.newDate,
    candidate.newStatementNo,
    candidate.newInvoiceNo,
    candidate.newBfsNo,
    candidate.newAmount,
    candidate.newFile
  ).includes(query);
}

function InvoiceImportView({ invoiceRows, onRowsChange }: { invoiceRows: ParsedInvoiceDocument[]; onRowsChange: (rows: ParsedInvoiceDocument[]) => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("Bereit für Rechnungsimport");
  const [selectedFileCount, setSelectedFileCount] = useState(0);
  const okRows = invoiceRows.filter((row) => row.status === "OK").length;
  const reviewRows = invoiceRows.length - okRows;
  const serviceCount = invoiceRows.reduce((sum, row) => sum + row.serviceLines.length, 0);
  const labCount = invoiceRows.filter((row) => row.hasEigenlabor || row.hasFremdlabor).length;

  async function handleInvoiceFiles(files: FileList | null, mode: "replace" | "append" = "replace") {
    if (!files?.length) return;
    const importableFiles = [...files].filter(isInvoicePdfUploadFile);
    setSelectedFileCount(importableFiles.length);
    if (!importableFiles.length) {
      setUploadStatus("Keine Rechnungs-PDFs gefunden");
      return;
    }
    setIsProcessing(true);
    setUploadStatus(`${importableFiles.length} Rechnungs-PDFs werden ausgelesen`);
    try {
      if (mode === "replace") onRowsChange([]);
      const parsedRows = await parseInvoiceFiles(importableFiles, (processed, total, fileName) => {
        const shortName = fileName.length > 34 ? `${fileName.slice(0, 31)}...` : fileName;
        setUploadStatus(`${processed} von ${total} Rechnungen gelesen (${shortName})`);
      });
      const nextRows = mergeInvoiceRows(mode === "append" ? invoiceRows : [], parsedRows);
      onRowsChange(nextRows);
      setUploadStatus(`${parsedRows.length} Rechnungen ausgelesen, ${nextRows.length} eindeutige Rechnungen in der Vorschau`);
    } catch (error) {
      if (mode === "replace") onRowsChange([]);
      setUploadStatus(`Rechnungen konnten nicht vollständig gelesen werden: ${error instanceof Error ? error.message : "unbekannter Fehler"}`);
    } finally {
      setIsProcessing(false);
    }
  }

  async function confirmInvoiceImport() {
    if (!invoiceRows.length || isProcessing || isSaving) return;
    setIsSaving(true);
    setUploadStatus(`${invoiceRows.length} Rechnungen werden dauerhaft gespeichert`);
    try {
      const result = await saveConfirmedInvoiceRows(invoiceRows);
      onRowsChange(result.rows);
      const detail = result.persistence
        ? `${result.persistence.imported} neu gespeichert, ${result.persistence.duplicates} Dubletten übersprungen, ${result.persistence.failed} fehlgeschlagen`
        : `${result.rows.length} gespeicherte Rechnungen geladen`;
      setUploadStatus(`Rechnungsimport bestätigt: ${detail}`);
    } catch (error) {
      setUploadStatus(`Rechnungsimport konnte nicht bestätigt werden: ${error instanceof Error ? error.message : "unbekannter Fehler"}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="content-stack">
      <section className="upload-zone">
        <ReceiptText size={28} />
        <div>
          <h2>Patientenrechnungen aus dem BFS-Portal einreichen</h2>
          <p>Die App liest Rechnungs-PDFs auch aus Unterordnern, erkennt den Standort über BFS-Mandant und Anschrift und trennt Rechnungskopf, Leistungspositionen, Eigenlabor und Fremdlabor.</p>
          <div className={isProcessing ? "upload-status processing" : invoiceRows.length ? "upload-status done" : "upload-status"} aria-live="polite">
            <RefreshCw size={14} />
            <span>{isProcessing ? "Wird ausgelesen" : invoiceRows.length ? "Fertig" : "Bereit"}</span>
            <strong>{uploadStatus}</strong>
          </div>
        </div>
        <div className="upload-actions">
          <label className={isProcessing ? "file-upload-button disabled" : "file-upload-button"}>
            <Upload size={16} />
            Rechnungs-PDFs
            <input disabled={isProcessing} type="file" multiple accept=".pdf,application/pdf" onChange={(event) => handleInvoiceFiles(event.target.files, "replace")} />
          </label>
          <label className={isProcessing ? "file-upload-button secondary-upload disabled" : "file-upload-button secondary-upload"}>
            <FolderUp size={16} />
            Ordner inkl. Unterordner
            <input
              disabled={isProcessing}
              type="file"
              multiple
              accept=".pdf,application/pdf"
              onChange={(event) => handleInvoiceFiles(event.target.files, invoiceRows.length ? "append" : "replace")}
              {...{ webkitdirectory: "", directory: "" }}
            />
          </label>
          <button className="secondary-button reset-upload-button" disabled={isProcessing || !invoiceRows.length} onClick={() => {
            onRowsChange([]);
            setSelectedFileCount(0);
            setUploadStatus("Rechnungsvorschau zurückgesetzt");
          }}>
            <X size={16} />
            Vorschau zurücksetzen
          </button>
          <button className="primary-button" disabled={isProcessing || isSaving || !invoiceRows.length} onClick={() => void confirmInvoiceImport()}>
            <CheckCircle2 size={16} />
            {isSaving ? "Speichern..." : "Rechnungsimport bestätigen"}
          </button>
        </div>
      </section>
      <section className="priority-grid">
        <PriorityCard label="Rechnungen" value={String(isProcessing ? selectedFileCount : invoiceRows.length)} hint={isProcessing ? "werden ausgelesen" : "eindeutige PDFs"} tone="blue" />
        <PriorityCard label="Positionen" value={String(serviceCount)} hint="Leistungsnummern mit Faktor" tone="blue" />
        <PriorityCard label="Laborfälle" value={String(labCount)} hint="Eigenlabor oder Fremdlabor" tone="amber" />
        <PriorityCard label="Zu prüfen" value={String(reviewRows)} hint="fehlende Felder oder Zuordnung" tone={reviewRows ? "amber" : "green"} />
      </section>
      <section className="insight-grid">
        <InsightCard title="Mengenfähig vorbereitet" items={["Dateien werden rekursiv aus Ordnern übernommen", "Dubletten laufen über BFS-Nr. und Hash", "PDF-Speicher kann später separat bereinigt werden"]} />
        <InsightCard title="Standortzuordnung" items={["Mandant 18504: Kirchberg", "Mandant 18790: Essen", "Mandant 19260: Ulmet"]} />
        <InsightCard title="Extraktion" items={["Leistungsnummer, Faktor und Betrag", "Eigenlabor und Fremdlabor getrennt", "Behandlungszeitraum für Matching"]} />
      </section>
      <InvoiceImportPreview rows={invoiceRows} />
    </div>
  );
}

function InvoiceServicesView({ invoiceRows }: { invoiceRows: ParsedInvoiceDocument[] }) {
  const periodOptions = useMemo(() => buildCustomChartPeriods(), []);
  const [periodId, setPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [standortId, setStandortId] = useState("gruppe");
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === periodId) ?? periodOptions[0], [periodOptions, periodId]);
  const invoiceStandorte = useMemo(() => orderedStandorte().filter((standort) => invoiceRows.some((row) => row.standortId === standort.id || row.standortName === standort.name)), [invoiceRows]);
  const selectedStandort = standortId === "gruppe" ? undefined : invoiceStandorte.find((standort) => standort.id === standortId);
  const scopedRows = useMemo(() => invoiceRows.filter((row) => invoiceInPeriod(row, selectedPeriod) && (!selectedStandort || row.standortId === selectedStandort.id || row.standortName === selectedStandort.name)), [invoiceRows, selectedPeriod, selectedStandort]);
  const rows = useMemo(() => invoiceServiceSummary(invoiceRows, selectedPeriod, selectedStandort), [invoiceRows, selectedPeriod, selectedStandort]);
  const comparisonLabel = selectedStandort ? `Gruppenschnitt ohne ${selectedStandort.name}` : "Gruppenschnitt";
  return (
    <div className="content-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Leistungsübersicht</span>
            <h2>Leistungsnummern nach Häufigkeit, Faktor und Betrag</h2>
            <p>Leistungspositionen im gewählten Zeitraum. Bei Einzelstandorten wird der reale Standortfaktor gegen den Gruppendurchschnitt ohne diesen Standort verglichen.</p>
          </div>
        </div>
        <div className="period-filter custom-kpi-period">
          <label>
            Zeitraum
            <select value={periodId} onChange={(event) => setPeriodId(event.target.value)}>
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
          </label>
          <label>
            Standort
            <select value={standortId} onChange={(event) => setStandortId(event.target.value)}>
              <option value="gruppe">Alle Standorte</option>
              {invoiceStandorte.map((standort) => (
                <option key={standort.id} value={standort.id}>{standort.name}</option>
              ))}
            </select>
          </label>
          <span>{selectedPeriod.detail} · {integerNumber.format(scopedRows.length)} Rechnungen · {comparisonLabel}</span>
        </div>
        <div className="table-wrap compact-table invoice-services-scroll">
          <table>
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Kurzbeschreibung</th>
                <th>{selectedStandort ? `${selectedStandort.name} Fälle` : "Häufigkeit"}</th>
                <th>Ø Faktor</th>
                <th>{comparisonLabel}</th>
                <th>Delta</th>
                <th>Min / Max</th>
                <th>Summe</th>
                <th>Standorte</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.code}>
                  <td><strong>{row.code}</strong></td>
                  <td>{row.description}</td>
                  <td>{integerNumber.format(row.count)}</td>
                  <td>{row.avgFactor ? feeRateNumber.format(row.avgFactor) : "-"}</td>
                  <td>{row.groupAvgFactor ? feeRateNumber.format(row.groupAvgFactor) : "-"}</td>
                  <td>{row.factorDelta === null ? "-" : formatFactorDelta(row.factorDelta)}</td>
                  <td>{row.minFactor ? `${feeRateNumber.format(row.minFactor)} / ${feeRateNumber.format(row.maxFactor)}` : "-"}</td>
                  <td>{money.format(row.amount)}</td>
                  <td>{row.locations.join(", ")}</td>
                </tr>
              )) : <EmptyTableRow colSpan={9} label="Noch keine Rechnungen im gewählten Filter." />}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function InvoicePotentialView({ invoiceRows }: { invoiceRows: ParsedInvoiceDocument[] }) {
  const periodOptions = useMemo(() => buildCustomChartPeriods(), []);
  const [periodId, setPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const invoiceStandorte = useMemo(() => orderedStandorte().filter((standort) => invoiceRows.some((row) => row.standortId === standort.id || row.standortName === standort.name)), [invoiceRows]);
  const [standortId, setStandortId] = useState(() => invoiceStandorte[0]?.id ?? "");
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === periodId) ?? periodOptions[0], [periodOptions, periodId]);
  const selectedStandort = invoiceStandorte.find((standort) => standort.id === standortId) ?? invoiceStandorte[0];
  const rows = useMemo(() => invoicePotentialSummary(invoiceRows, selectedPeriod, selectedStandort), [invoiceRows, selectedPeriod, selectedStandort]);
  const totalPotential = rows.reduce((sum, row) => sum + row.potential, 0);
  const monthlyPotential = annualizeInvoicePotential(totalPotential, selectedPeriod) / 12;
  const underBenchmarkRows = rows.filter((row) => row.factorDelta !== null && row.factorDelta < 0).length;
  const topLever = rows[0];

  useEffect(() => {
    if (!standortId && invoiceStandorte[0]) setStandortId(invoiceStandorte[0].id);
  }, [invoiceStandorte, standortId]);

  return (
    <div className="content-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Potenzialanalyse</span>
            <h2>Euro-Potenzial aus echten Rechnungspositionen</h2>
            <p>Verglichen wird die ausgewählte Praxis je Leistungsnummer mit dem Gruppendurchschnitt ohne diese Praxis. Potenzial entsteht nur, wenn der eigene Faktor darunter liegt.</p>
          </div>
        </div>
        <div className="period-filter custom-kpi-period">
          <label>
            Zeitraum
            <select value={periodId} onChange={(event) => setPeriodId(event.target.value)}>
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
          </label>
          <label>
            Standort
            <select value={selectedStandort?.id ?? ""} onChange={(event) => setStandortId(event.target.value)}>
              {invoiceStandorte.map((standort) => (
                <option key={standort.id} value={standort.id}>{standort.name}</option>
              ))}
            </select>
          </label>
          <span>{selectedPeriod.detail} · Benchmark ohne {selectedStandort?.name ?? "ausgewählten Standort"}</span>
        </div>
      </section>
      <section className="priority-grid">
        <PriorityCard label="Potenzial Zeitraum" value={money.format(totalPotential)} hint="gegen Gruppenschnitt" tone={totalPotential ? "green" : "blue"} />
        <PriorityCard label="Potenzial p. Monat" value={money.format(monthlyPotential)} hint="hochgerechnet" tone={monthlyPotential ? "green" : "blue"} />
        <PriorityCard label="Unter Benchmark" value={integerNumber.format(underBenchmarkRows)} hint="Leistungsnummern" tone={underBenchmarkRows ? "amber" : "green"} />
        <PriorityCard label="Top-Hebel" value={topLever?.code ?? "-"} hint={topLever ? money.format(topLever.potential) : "kein Potenzial"} tone={topLever?.potential ? "green" : "blue"} />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Top-Hebel</span>
            <h2>Leistungen mit größtem Mehrumsatz</h2>
          </div>
        </div>
        <div className="table-wrap compact-table invoice-services-scroll">
          <table>
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Kurzbeschreibung</th>
                <th>Häufigkeit</th>
                <th>Praxis Ø</th>
                <th>Gruppe ohne Praxis</th>
                <th>Delta</th>
                <th>Ist-Umsatz</th>
                <th>Potenzial</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.code}>
                  <td><strong>{row.code}</strong></td>
                  <td>{row.description}</td>
                  <td>{integerNumber.format(row.count)}</td>
                  <td>{row.avgFactor ? feeRateNumber.format(row.avgFactor) : "-"}</td>
                  <td>{row.groupAvgFactor ? feeRateNumber.format(row.groupAvgFactor) : "-"}</td>
                  <td>{row.factorDelta === null ? "-" : formatFactorDelta(row.factorDelta)}</td>
                  <td>{money.format(row.amount)}</td>
                  <td><strong>{money.format(row.potential)}</strong></td>
                </tr>
              )) : <EmptyTableRow colSpan={8} label="Noch kein Potenzial im gewählten Filter." />}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function InvoiceLocationsView({ invoiceRows }: { invoiceRows: ParsedInvoiceDocument[] }) {
  const periodOptions = useMemo(() => buildCustomChartPeriods(), []);
  const [periodId, setPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === periodId) ?? periodOptions[0], [periodOptions, periodId]);
  const rows = useMemo(() => invoiceLocationSummary(invoiceRows, selectedPeriod), [invoiceRows, selectedPeriod]);
  const totalPotential = rows.reduce((sum, row) => sum + row.potential, 0);
  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
  const topLocation = rows[0];

  return (
    <div className="content-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Standortvergleich</span>
            <h2>Welche Praxis rechnet wie stark ab?</h2>
            <p>Je Standort werden Rechnungsvolumen, Fallwert, Faktor, Laborquote und Potenzial gegen die restliche Gruppe verglichen.</p>
          </div>
        </div>
        <div className="period-filter custom-kpi-period">
          <label>
            Zeitraum
            <select value={periodId} onChange={(event) => setPeriodId(event.target.value)}>
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
          </label>
          <span>{selectedPeriod.detail} · {integerNumber.format(rows.length)} Standorte mit Rechnungsdaten</span>
        </div>
      </section>
      <section className="priority-grid">
        <PriorityCard label="Rechnungsvolumen" value={money.format(totalAmount)} hint="im Filter" tone="green" />
        <PriorityCard label="Standorte" value={integerNumber.format(rows.length)} hint="mit BFS-Rechnungen" tone="blue" />
        <PriorityCard label="Gruppenpotenzial" value={money.format(totalPotential)} hint="gegen Restgruppe" tone={totalPotential ? "green" : "blue"} />
        <PriorityCard label="Größter Hebel" value={topLocation?.standortName ?? "-"} hint={topLocation ? money.format(topLocation.potential) : "kein Potenzial"} tone={topLocation?.potential ? "amber" : "blue"} />
      </section>
      <section className="panel">
        <div className="table-wrap compact-table invoice-services-scroll">
          <table>
            <thead>
              <tr>
                <th>Standort</th>
                <th>Rechnungen</th>
                <th>Positionen</th>
                <th>Umsatz</th>
                <th>Ø Rechnung</th>
                <th>Ø Faktor</th>
                <th>Laborquote</th>
                <th>Unter Benchmark</th>
                <th>Potenzial</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.standortId}>
                  <td><strong>{row.standortName}</strong><small>Benchmark ohne eigenen Standort</small></td>
                  <td>{integerNumber.format(row.invoiceCount)}</td>
                  <td>{integerNumber.format(row.serviceCount)}</td>
                  <td>{money.format(row.amount)}</td>
                  <td>{money.format(row.avgInvoice)}</td>
                  <td>{row.avgFactor ? feeRateNumber.format(row.avgFactor) : "-"}</td>
                  <td>{formatPercent(row.labRate)}</td>
                  <td>{integerNumber.format(row.underBenchmarkCount)}</td>
                  <td><strong>{money.format(row.potential)}</strong></td>
                </tr>
              )) : <EmptyTableRow colSpan={9} label="Noch keine Standortdaten im gewählten Filter." />}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function InvoiceImportPreview({ rows, compact = false }: { rows: ParsedInvoiceDocument[]; compact?: boolean }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Rechnungsvorschau</span>
          <h2>{compact ? "Eingelesene Rechnungen" : "Erkannte Rechnungen und Zuordnung"}</h2>
          <p>Die PDF-Datei dient als Beleg; die ausgelesenen Daten bleiben später getrennt für Auswertungen erhalten.</p>
        </div>
      </div>
      <div className="table-wrap compact-table">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Standort</th>
              <th>BFS-Nr.</th>
              <th>Rechnung</th>
              <th>Patient</th>
              <th>Betrag</th>
              <th>Positionen</th>
              <th>Labor</th>
              <th>Datei</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={row.bfsNo !== "-" ? row.bfsNo : row.file}>
                <td><StatusBadge status={row.status} /></td>
                <td><strong>{row.standortName}</strong><small>Mandant {row.mandantNo}</small></td>
                <td>{row.bfsNo}</td>
                <td><strong>{row.invoiceNo}</strong><small>{row.invoiceDate}</small></td>
                <td><strong>{row.patientName}</strong><small>{row.treatmentPeriod ?? row.integrationDate ?? "kein Zeitraum"}</small></td>
                <td>{money.format(row.totalAmount || row.openAmount)}</td>
                <td>{integerNumber.format(row.serviceLines.length)}</td>
                <td>{row.hasEigenlabor || row.hasFremdlabor ? `${row.hasEigenlabor ? "Eigenlabor" : ""}${row.hasEigenlabor && row.hasFremdlabor ? " + " : ""}${row.hasFremdlabor ? "Fremdlabor" : ""}` : "-"}</td>
                <td><span>{shortFileName(row.file)}</span><small>{integerNumber.format(Math.round(row.fileSizeBytes / 1024))} KB · {row.pageCount} Seiten</small></td>
              </tr>
            )) : <EmptyTableRow colSpan={9} label="Noch keine Rechnungs-PDFs eingelesen." />}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function mergeInvoiceRows(currentRows: ParsedInvoiceDocument[], nextRows: ParsedInvoiceDocument[]) {
  const byKey = new Map<string, ParsedInvoiceDocument>();
  [...currentRows, ...nextRows].forEach((row) => {
    const key = row.bfsNo !== "-" ? row.bfsNo : row.fileHash ?? row.file;
    byKey.set(key, row);
  });
  return [...byKey.values()];
}

function invoiceServiceSummary(invoiceRows: ParsedInvoiceDocument[], period?: PeriodOption, selectedStandort?: Standort) {
  const byCode = new Map<string, {
    code: string;
    description: string;
    count: number;
    amount: number;
    factorSum: number;
    factorCount: number;
    minFactor: number;
    maxFactor: number;
    locations: Set<string>;
    groupFactorSum: number;
    groupFactorCount: number;
  }>();

  invoiceRows.filter((invoice) => !period || invoiceInPeriod(invoice, period)).forEach((invoice) => {
    const isSelectedStandort = selectedStandort
      ? invoice.standortId === selectedStandort.id || invoice.standortName === selectedStandort.name
      : true;
    const isComparisonStandort = selectedStandort
      ? invoice.standortId !== selectedStandort.id && invoice.standortName !== selectedStandort.name
      : true;
    invoice.serviceLines.forEach((line) => {
      const entry = byCode.get(line.code) ?? {
        code: line.code,
        description: line.description,
        count: 0,
        amount: 0,
        factorSum: 0,
        factorCount: 0,
        minFactor: Number.POSITIVE_INFINITY,
        maxFactor: 0,
        locations: new Set<string>(),
        groupFactorSum: 0,
        groupFactorCount: 0
      };
      if (isSelectedStandort) {
        entry.count += 1;
        entry.amount += line.amount;
        entry.locations.add(invoice.standortName);
      }
      if (isSelectedStandort && line.factor) {
        entry.factorSum += line.factor;
        entry.factorCount += 1;
        entry.minFactor = Math.min(entry.minFactor, line.factor);
        entry.maxFactor = Math.max(entry.maxFactor, line.factor);
      }
      if (isComparisonStandort && line.factor) {
        entry.groupFactorSum += line.factor;
        entry.groupFactorCount += 1;
      }
      byCode.set(line.code, entry);
    });
  });

  return [...byCode.values()]
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      ...entry,
      avgFactor: entry.factorCount ? entry.factorSum / entry.factorCount : 0,
      groupAvgFactor: entry.groupFactorCount ? entry.groupFactorSum / entry.groupFactorCount : 0,
      factorDelta: entry.factorCount && entry.groupFactorCount ? (entry.factorSum / entry.factorCount) - (entry.groupFactorSum / entry.groupFactorCount) : null,
      minFactor: Number.isFinite(entry.minFactor) ? entry.minFactor : 0,
      locations: [...entry.locations].sort()
    }))
    .sort((a, b) => b.count - a.count || b.amount - a.amount);
}

function invoicePotentialSummary(invoiceRows: ParsedInvoiceDocument[], period: PeriodOption, selectedStandort?: Standort) {
  if (!selectedStandort) return [];
  return invoiceServiceSummary(invoiceRows, period, selectedStandort)
    .map((row) => {
      const potential = row.avgFactor > 0 && row.groupAvgFactor > row.avgFactor
        ? row.amount * ((row.groupAvgFactor / row.avgFactor) - 1)
        : 0;
      return { ...row, potential };
    })
    .filter((row) => row.groupAvgFactor > 0 && row.potential > 0)
    .sort((a, b) => b.potential - a.potential || b.count - a.count || b.amount - a.amount);
}

function invoiceLocationSummary(invoiceRows: ParsedInvoiceDocument[], period: PeriodOption) {
  return orderedStandorte()
    .map((standort) => {
      const rows = invoiceRows.filter((invoice) => invoiceInPeriod(invoice, period) && (invoice.standortId === standort.id || invoice.standortName === standort.name));
      if (!rows.length) return null;
      const amount = rows.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
      const serviceLines = rows.flatMap((invoice) => invoice.serviceLines);
      const factorLines = serviceLines.filter((line) => line.factor);
      const labAmount = rows.reduce((sum, invoice) => sum + invoice.eigenlaborTotal + (invoice.fremdlaborGross || invoice.fremdlaborNet), 0);
      const potentialRows = invoicePotentialSummary(invoiceRows, period, standort);
      return {
        standortId: standort.id,
        standortName: standort.name,
        invoiceCount: rows.length,
        serviceCount: serviceLines.length,
        amount,
        avgInvoice: rows.length ? amount / rows.length : 0,
        avgFactor: factorLines.length ? factorLines.reduce((sum, line) => sum + (line.factor ?? 0), 0) / factorLines.length : 0,
        labRate: amount ? (labAmount / amount) * 100 : 0,
        underBenchmarkCount: potentialRows.filter((row) => row.factorDelta !== null && row.factorDelta < 0).length,
        potential: potentialRows.reduce((sum, row) => sum + row.potential, 0)
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.potential - a.potential || b.amount - a.amount);
}

function annualizeInvoicePotential(value: number, period?: PeriodOption) {
  if (!period?.start || !period.end) return value;
  const dayCount = Math.max(1, Math.round((period.end.getTime() - period.start.getTime()) / 86400000) + 1);
  return value * (365 / dayCount);
}

function invoiceInPeriod(invoice: ParsedInvoiceDocument, period: PeriodOption) {
  const date = parseGermanDate(invoice.invoiceDate);
  if (Number.isNaN(date.getTime())) return true;
  if (!period.start && !period.end) {
    const standort = standorte.find((entry) => entry.id === invoice.standortId || entry.name === invoice.standortName);
    return standort ? date >= new Date(`${standort.goLiveDate}T00:00:00`) : true;
  }
  if (period.start && date < period.start) return false;
  if (period.end && date > period.end) return false;
  return true;
}

function formatFactorDelta(value: number) {
  const formatted = feeRateNumber.format(Math.abs(value));
  if (Math.abs(value) < 0.005) return "0,00";
  return `${value > 0 ? "+" : "-"}${formatted}`;
}

function EmptyTableRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <span className="muted-table-note">{label}</span>
      </td>
    </tr>
  );
}

function shortFileName(file: string) {
  const name = file.split("/").at(-1) ?? file;
  return name.length > 42 ? `${name.slice(0, 39)}...` : name;
}

async function parseInvoiceFiles(
  files: File[],
  onProgress?: (processed: number, total: number, fileName: string) => void
) {
  const chunks = chunkUploadFiles(files);
  const rows: ParsedInvoiceDocument[] = [];
  let processed = 0;

  for (const [chunkIndex, chunk] of chunks.entries()) {
    const chunkRows = await parseInvoiceFileChunk(chunk, (chunkProcessed, _chunkTotal, fileName) => {
      onProgress?.(processed + chunkProcessed, files.length, `Paket ${chunkIndex + 1}/${chunks.length}: ${fileName}`);
    });
    rows.push(...chunkRows);
    processed += chunk.length;
    onProgress?.(processed, files.length, `Paket ${chunkIndex + 1}/${chunks.length} abgeschlossen`);
  }

  return mergeInvoiceRows([], rows);
}

async function parseInvoiceFileChunk(
  files: File[],
  onProgress?: (processed: number, total: number, fileName: string) => void
) {
  const formData = new FormData();
  files.forEach((file) => {
    const filePath = uploadFilePath(file);
    formData.append("files", file, filePath);
    formData.append("paths", filePath);
  });

  const response = await fetch("/api/invoices/parse", {
    method: "POST",
    body: formData,
    cache: "no-store"
  });

  if (response.ok) {
    const payload = await response.json() as { rows: ParsedInvoiceDocument[] };
    payload.rows.forEach((row, index) => onProgress?.(index + 1, files.length, row.file));
    return payload.rows;
  }

  if (process.env.NODE_ENV !== "production") {
    return parseInvoiceUploadFiles(files, onProgress);
  }

  const errorPayload = await response.json().catch(() => null) as { error?: string } | null;
  throw new Error(errorPayload?.error ?? "Serverseitiger Rechnungsimport fehlgeschlagen.");
}

async function parseInvoiceStatusFiles(
  files: File[],
  onProgress?: (processed: number, total: number, fileName: string) => void
) {
  const documents: ParsedInvoiceStatusDocument[] = [];
  for (const [index, file] of files.entries()) {
    const filePath = uploadFilePath(file);
    onProgress?.(index, files.length, `Starte ${filePath}`);
    try {
      const parsed = typeof window !== "undefined"
        ? await parseInvoiceStatusUploadFiles([file])
        : await parseInvoiceStatusFileChunk([file]);
      if (parsed.length) {
        documents.push(...parsed);
      } else {
        documents.push(unreadableInvoiceStatusDocument(file, "Keine Rechnungsstatus-Liste erkannt."));
      }
    } catch (browserError) {
      try {
        const fallback = await parseInvoiceStatusFileChunk([file]);
        documents.push(...(fallback.length ? fallback : [unreadableInvoiceStatusDocument(file, "Server-Fallback hat keine Liste zurückgegeben.")]));
      } catch (serverError) {
        const message = [
          browserError instanceof Error ? browserError.message : "Browser-Lesung fehlgeschlagen",
          serverError instanceof Error ? serverError.message : "Server-Lesung fehlgeschlagen"
        ].join(" / ");
        documents.push(unreadableInvoiceStatusDocument(file, message));
      }
    }
    onProgress?.(index + 1, files.length, filePath);
  }

  return mergeInvoiceStatusDocuments([], documents);
}

function unreadableInvoiceStatusDocument(file: File, message: string): ParsedInvoiceStatusDocument {
  return {
    file: uploadFilePath(file),
    fileSizeBytes: file.size,
    pageCount: 0,
    rows: [],
    status: "Zu prüfen",
    parseNotes: [message]
  };
}

async function ensureInvoiceStatusDocumentsForFiles(
  files: File[],
  documents: ParsedInvoiceStatusDocument[],
  onProgress?: (processed: number, total: number, fileName: string) => void
) {
  const byFile = new Map(documents.map((document) => [document.file, document]));
  for (const [index, file] of files.entries()) {
    const filePath = uploadFilePath(file);
    if (!byFile.has(filePath)) {
      try {
        const parsed = await parseInvoiceStatusUploadFiles([file]);
        byFile.set(filePath, parsed[0] ?? unreadableInvoiceStatusDocument(file, "Keine Rechnungsstatus-Liste erkannt."));
      } catch (browserError) {
        try {
          const fallback = await parseInvoiceStatusFileChunk([file]);
          byFile.set(filePath, fallback[0] ?? unreadableInvoiceStatusDocument(file, "Server-Fallback hat keine Liste zurückgegeben."));
        } catch (serverError) {
          const message = [
            browserError instanceof Error ? browserError.message : "Browser-Lesung fehlgeschlagen",
            serverError instanceof Error ? serverError.message : "Server-Lesung fehlgeschlagen"
          ].join(" / ");
          byFile.set(filePath, unreadableInvoiceStatusDocument(file, message));
        }
      }
    }
    onProgress?.(index + 1, files.length, filePath);
  }
  return files.map((file) => byFile.get(uploadFilePath(file)) ?? unreadableInvoiceStatusDocument(file, "Datei wurde nicht verarbeitet."));
}

async function parseInvoiceStatusFileChunk(
  files: File[],
  onProgress?: (processed: number, total: number, fileName: string) => void
) {
  const formData = new FormData();
  files.forEach((file) => {
    const filePath = uploadFilePath(file);
    formData.append("files", file, filePath);
    formData.append("paths", filePath);
  });

  const response = await fetch("/api/invoice-status/parse", {
    method: "POST",
    body: formData,
    cache: "no-store"
  });

  if (response.ok) {
    const payload = await response.json() as {
      documents?: ParsedInvoiceStatusDocument[];
      persistence?: { errors?: Array<{ file: string; message: string }> };
    };
    const serverDocuments = payload.documents ?? [];
    serverDocuments.forEach((document, index) => onProgress?.(index + 1, files.length, document.file));
    const parsedFiles = new Set(serverDocuments.map((document) => document.file));
    const missingFiles = files.filter((file) => !parsedFiles.has(uploadFilePath(file)));
    if (!missingFiles.length) return serverDocuments;

    const recoveredDocuments = await parseInvoiceStatusUploadFiles(missingFiles, (processed, total, fileName) => {
      onProgress?.(serverDocuments.length + processed, files.length, `Browser-Nachlesung ${processed}/${total}: ${fileName}`);
    });
    const recoveredFileNames = new Set(recoveredDocuments.map((document) => document.file));
    const stillMissing = missingFiles
      .map(uploadFilePath)
      .filter((fileName) => !recoveredFileNames.has(fileName));
    if (stillMissing.length && !serverDocuments.length && !recoveredDocuments.length) {
      const serverErrors = payload.persistence?.errors?.map((entry) => `${entry.file}: ${entry.message}`).join("; ");
      throw new Error(serverErrors || `Saldo-Listen konnten nicht gelesen werden: ${stillMissing.join(", ")}`);
    }
    return mergeInvoiceStatusDocuments(serverDocuments, recoveredDocuments);
  }

  if (process.env.NODE_ENV !== "production") {
    return parseInvoiceStatusUploadFiles(files, onProgress);
  }

  const errorPayload = await response.json().catch(() => null) as { error?: string } | null;
  throw new Error(errorPayload?.error ?? "Serverseitiger Rechnungsstatus-Import fehlgeschlagen.");
}

function mergeInvoiceStatusDocuments(currentDocuments: ParsedInvoiceStatusDocument[], nextDocuments: ParsedInvoiceStatusDocument[]) {
  const byKey = new Map<string, ParsedInvoiceStatusDocument>();
  [...currentDocuments, ...nextDocuments].forEach((document) => {
    const key = document.fileHash ?? document.file;
    byKey.set(key, document);
  });
  return [...byKey.values()];
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
  const [isOpen, setIsOpen] = useState(false);
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
        <button className="collapse-toggle-button" type="button" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
          <ChevronDown size={16} className={isOpen ? "collapse-icon open" : "collapse-icon"} />
          {isOpen ? "Einklappen" : "Ausklappen"}
        </button>
      </div>
      {isOpen && (
        <>
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
        </>
      )}
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
  const [reasonOpen, setReasonOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const reviewRows = rows.filter(importRowNeedsReview);
  const relevantMovements = rows.flatMap((row) => row.parsedMovements ?? [])
    .filter(isRelevantDeductionMovement);
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
            <button className="collapse-toggle-button" type="button" aria-expanded={reasonOpen} onClick={() => setReasonOpen((current) => !current)}>
              <ChevronDown size={16} className={reasonOpen ? "collapse-icon open" : "collapse-icon"} />
              {reasonOpen ? "Einklappen" : "Ausklappen"}
            </button>
          </div>
          {reasonOpen && (
            <div className="table-wrap compact-table import-reason-scroll">
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
          )}
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
            <button className="collapse-toggle-button" type="button" aria-expanded={detailOpen} onClick={() => setDetailOpen((current) => !current)}>
              <ChevronDown size={16} className={detailOpen ? "collapse-icon open" : "collapse-icon"} />
              {detailOpen ? "Einklappen" : "Ausklappen"}
            </button>
          </div>
        </div>
        {detailOpen && (
          <>
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
                    <th>AbrechnungsNr.</th>
                    <th>Standort</th>
                    <th>Mandant-Nr.</th>
                    <th>Datum</th>
                    <th>Forderungen</th>
                    <th>Summe</th>
                    <th>Kontoauszug</th>
                    <th>Status</th>
                    <th>Hinweise</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const rowReasons = row.parsedMovements?.filter(isRelevantDeductionMovement) ?? [];
                    return (
                      <tr key={`${row.file}-${row.fileHash ?? row.statementNo}`}>
                        <td>
                          <strong>{formatStatementReference(row.statementNo, row.file)}</strong>
                          <span>{row.practice}</span>
                          {!!row.parsedClaims?.length && (
                            <small>{row.parsedClaims.length} Patientenpositionen · {rowNoProtectionCount(row)} ohne Ausfallschutz</small>
                          )}
                        </td>
                        <td>{row.location}</td>
                        <td>{row.mandantNo}</td>
                        <td>{row.date}</td>
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
          </>
        )}
      </section>
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

function printCustomTabPdf(element: HTMLElement | null, title: string, locationExport?: { targetStandortName: string; locationNames: string[] }) {
  if (!element) return;
  const stylesheetLinks = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
    .map((link) => `<link rel="stylesheet" href="${escapeHtml(link.href)}" />`)
    .join("");
  const locationExportScript = locationExport ? customLocationExportScript(locationExport.targetStandortName, locationExport.locationNames) : "";
  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - Orisus BFS Monitor</title>
  ${stylesheetLinks}
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; overflow: visible; background: #061c2a !important; }
    body { color: #f8ffff; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-page { width: 100%; max-width: none; margin: 0; }
    .content-stack { width: 100% !important; max-width: none !important; gap: 12px !important; }
    .panel, .priority-card, .custom-chart-card, .custom-benchmark-panel { box-shadow: none !important; }
    .custom-export-action, .metric-info-button { display: none !important; }
    .custom-kpi-period { grid-template-columns: minmax(160px, 0.18fr) minmax(160px, 0.18fr) minmax(0, 1fr) !important; padding: 12px !important; break-inside: avoid; page-break-inside: avoid; }
    .custom-kpi-slider { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 10px !important; overflow: visible !important; padding: 0 !important; }
    .priority-card { min-height: 154px !important; padding: 12px !important; gap: 6px !important; break-inside: avoid; page-break-inside: avoid; }
    .priority-card strong { font-size: 28px !important; line-height: 1.05 !important; }
    .priority-card small, .priority-card span { font-size: 11px !important; line-height: 1.25 !important; }
    .answer-sparkline svg { height: 28px !important; }
    .custom-chart-grid { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 12px !important; break-before: auto; }
    .custom-chart-card { padding: 12px !important; break-inside: avoid; page-break-inside: avoid; min-height: 285px !important; }
    .custom-combo-chart { height: 198px !important; padding: 9px !important; }
    .custom-chart-head { margin-bottom: 8px !important; }
    .custom-chart-head h2 { font-size: 17px !important; }
    .custom-chart-legend { font-size: 10px !important; }
    .custom-donut-wrap { min-height: 205px !important; gap: 12px !important; grid-template-columns: minmax(150px, 0.48fr) minmax(150px, 1fr) !important; }
    .custom-donut { width: 170px !important; }
    .custom-donut strong { font-size: 22px !important; }
    .custom-benchmark-panel { padding: 12px !important; break-before: page; }
    .panel-heading { margin-bottom: 10px !important; }
    .panel-heading h2 { font-size: 18px !important; }
    .panel-heading p { font-size: 12px !important; }
    .table-wrap { overflow: visible !important; }
    .custom-benchmark-table { min-width: 0 !important; table-layout: fixed; }
    th, td { padding: 6px !important; font-size: 10px !important; line-height: 1.25 !important; }
    .status { padding: 3px 6px !important; font-size: 9px !important; }
    .location-export-note { border: 1px solid rgba(121, 238, 231, 0.32); border-radius: 8px; background: rgba(48, 213, 200, 0.08); padding: 9px 10px; margin-bottom: 10px; font-size: 11px; color: #dffcff; break-inside: avoid; page-break-inside: avoid; }
    @media print {
      html, body { width: auto; height: auto; }
      .print-page { width: 100%; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  <main class="print-page">${element.outerHTML}</main>
  <script>window.addEventListener("load", () => { ${locationExportScript} setTimeout(() => window.print(), 250); });</script>
</body>
</html>`;
  const reportWindow = window.open("", "_blank", "width=1400,height=900");
  if (!reportWindow) {
    downloadTextFile("orisus-bfs-individuell-export.html", html);
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
}

function customLocationExportScript(targetStandortName: string, locationNames: string[]) {
  const payload = JSON.stringify({
    targetStandortName,
    locationNames: locationNames.filter((name) => name !== targetStandortName)
  }).replace(/</g, "\\u003c");

  return `
    (() => {
      const config = ${payload};
      const aliases = new Map(config.locationNames.map((name, index) => [name, "Vergleichsstandort " + String.fromCharCode(65 + index)]));
      const benchmarkRows = Array.from(document.querySelectorAll("[data-benchmark-row]"));
      const targetRow = benchmarkRows.find((row) => row.dataset.locationName === config.targetStandortName);
      const targetValues = new Map();
      if (targetRow) {
        targetRow.querySelectorAll("[data-metric]").forEach((cell) => {
          targetValues.set(cell.dataset.metric, Number(cell.dataset.value || 0));
        });
      }
      const indexLabel = (value, base) => {
        if (!Number.isFinite(value)) value = 0;
        if (!Number.isFinite(base) || base === 0) return value ? "Index >100" : "Index 100";
        return "Index " + Math.round((value / base) * 100);
      };
      benchmarkRows.forEach((row) => {
        const locationName = row.dataset.locationName || "";
        if (locationName === config.targetStandortName) return;
        const alias = aliases.get(locationName) || "Vergleichsstandort";
        const firstCell = row.querySelector("td");
        const strong = firstCell?.querySelector("strong");
        const span = firstCell?.querySelector("span");
        if (strong) strong.textContent = alias;
        if (span) span.textContent = "anonymisiert";
        row.querySelectorAll("[data-metric]").forEach((cell) => {
          const metric = cell.dataset.metric || "";
          const value = Number(cell.dataset.value || 0);
          cell.textContent = indexLabel(value, targetValues.get(metric) || 0);
        });
      });
      document.querySelectorAll(".custom-benchmark-table tfoot [data-metric]").forEach((cell) => {
        cell.textContent = "anonymisiert";
      });
      const totalLabel = document.querySelector(".custom-benchmark-table tfoot td:first-child span");
      if (totalLabel) totalLabel.textContent = "nur intern aggregiert";
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      textNodes.forEach((node) => {
        let text = node.nodeValue || "";
        aliases.forEach((alias, name) => {
          text = text.split(name).join(alias);
        });
        node.nodeValue = text;
      });
      const page = document.querySelector(".print-page");
      const note = document.createElement("div");
      note.className = "location-export-note";
      note.textContent = "Standort-Export fuer " + config.targetStandortName + ": Eigene Werte werden klar angezeigt. Andere Standorte sind anonymisiert und in der Benchmark-Tabelle nur relativ als Index zum eigenen Standort dargestellt.";
      page?.prepend(note);
    })();
  `;
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
        <th class="file">AbrechnungsNr.</th>
        <th>Standort</th>
        <th>Mandant</th>
        <th>Datum</th>
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
    <td class="file"><strong>${escapeHtml(formatStatementReference(row.statementNo, row.file))}</strong><br /><span class="small">${escapeHtml(row.practice)}</span></td>
    <td>${escapeHtml(row.location)}</td>
    <td>${escapeHtml(row.mandantNo)}</td>
    <td>${escapeHtml(row.date)}</td>
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

function printOperationalHtmlReport({
  title,
  description,
  meta,
  summary,
  tableHead,
  tableBody,
  emptyColSpan,
  emptyLabel,
  footer,
  filename
}: {
  title: string;
  description: string;
  meta: string;
  summary: { label: string; value: string }[];
  tableHead: string;
  tableBody: string;
  emptyColSpan: number;
  emptyLabel: string;
  footer: string;
  filename: string;
}) {
  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - Orisus BFS Monitor</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #102a3a; font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; }
    header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; border-bottom: 2px solid #30d5c8; padding-bottom: 9px; margin-bottom: 10px; }
    h1 { margin: 0 0 4px; font-size: 21px; line-height: 1.1; }
    h2 { margin: 13px 0 7px; font-size: 14px; }
    p { margin: 0; color: #48606c; line-height: 1.35; }
    .meta { text-align: right; color: #48606c; min-width: 210px; }
    .summary { display: grid; grid-template-columns: repeat(${Math.min(Math.max(summary.length, 1), 5)}, minmax(0, 1fr)); gap: 7px; margin: 9px 0 11px; }
    .summary div { border: 1px solid #c8d7dc; border-radius: 6px; padding: 7px; min-height: 46px; }
    .summary span { display: block; color: #607783; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0; }
    .summary strong { display: block; margin-top: 4px; font-size: 15px; line-height: 1.15; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; page-break-inside: auto; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td { border: 1px solid #d7e3e7; padding: 4px 5px; vertical-align: top; text-align: left; overflow-wrap: anywhere; }
    th { background: #eaf7f6; color: #0f5360; font-size: 8.5px; text-transform: uppercase; }
    tr:nth-child(even) td { background: #f8fbfc; }
    td strong { display: block; }
    td span { display: block; color: #607783; margin-top: 2px; }
    .amount { text-align: right; white-space: nowrap; }
    .status { display: inline-block; border-radius: 999px; background: #eaf7f6; color: #0f5360; padding: 2px 6px; font-weight: 700; }
    .traffic { display: inline-block; width: 9px; height: 9px; border-radius: 999px; margin-right: 5px; background: #30d5c8; }
    .traffic-red { background: #f04438; }
    .traffic-amber { background: #f59e0b; }
    .traffic-green { background: #12b76a; }
    footer { margin-top: 10px; color: #607783; font-size: 8.5px; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
    </div>
    <div class="meta">
      <strong>${escapeHtml(new Date().toLocaleString("de-DE"))}</strong><br />
      ${escapeHtml(meta)}
    </div>
  </header>
  <section class="summary">
    ${summary.map((entry) => `<div><span>${escapeHtml(entry.label)}</span><strong>${escapeHtml(entry.value)}</strong></div>`).join("")}
  </section>
  <h2>Arbeitsliste</h2>
  <table>
    <thead>${tableHead}</thead>
    <tbody>${tableBody || `<tr><td colspan="${emptyColSpan}">${escapeHtml(emptyLabel)}</td></tr>`}</tbody>
  </table>
  <footer>${escapeHtml(footer)}</footer>
  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 150));</script>
</body>
</html>`;
  const reportWindow = window.open("", "_blank", "width=1200,height=900");
  if (!reportWindow) {
    downloadTextFile(filename, html);
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
}

function printEconomicCheckReport(rows: InvoiceStatusReviewRow[], periodLabel: string) {
  const sortedRows = [...rows].sort((a, b) => b.amount - a.amount || a.patientName.localeCompare(b.patientName, "de"));
  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
  const locations = [...new Set(rows.map((row) => row.locationName).filter(Boolean))].sort(compareLocationNamesByContractStart);
  printOperationalHtmlReport({
    title: "Zahlung / Grund prüfen",
    description: "Saldogeschlossene Fälle, bei denen Zahlung, Neueinreichung oder Storno-Grund wirtschaftlich belegt werden muss.",
    meta: `${locations.join(", ") || "Alle Standorte"} · ${periodLabel}`,
    summary: [
      { label: "Prüffälle", value: integerNumber.format(rows.length) },
      { label: "Prüfbetrag", value: exactMoney.format(totalAmount) },
      { label: "Standorte", value: integerNumber.format(locations.length) },
      { label: "Höchste Position", value: exactMoney.format(sortedRows[0]?.amount ?? 0) }
    ],
    tableHead: `<tr>
      <th style="width: 12%;">Kategorie</th>
      <th style="width: 10%;">Standort</th>
      <th style="width: 18%;">Patient</th>
      <th style="width: 15%;">Rechnung / BFS</th>
      <th style="width: 10%;" class="amount">Betrag</th>
      <th style="width: 23%;">Grund / Status</th>
      <th style="width: 12%;">Nächster Schritt</th>
    </tr>`,
    tableBody: sortedRows.map((row) => `<tr>
      <td><span class="status">${escapeHtml(row.categoryLabel)}</span></td>
      <td>${escapeHtml(row.locationName)}</td>
      <td><strong>${escapeHtml(row.patientName)}</strong><span>${escapeHtml(row.source)}</span></td>
      <td><strong>${escapeHtml(row.invoiceNo)}</strong><span>${escapeHtml(row.bfsNo)}</span></td>
      <td class="amount">${escapeHtml(exactMoney.format(row.amount))}</td>
      <td>${escapeHtml(row.detail)}</td>
      <td>${escapeHtml(row.nextStep)}</td>
    </tr>`).join(""),
    emptyColSpan: 7,
    emptyLabel: "Keine Fälle für Zahlung/Grund prüfen im aktuellen Filter.",
    footer: "Hinweis: Der Export bildet exakt die aktuell gefilterte operative Arbeitsliste ab. Entscheidungen werden in der App gepflegt.",
    filename: "orisus-bfs-zahlung-grund-pruefen.html"
  });
}

function printResubmissionReport(candidates: ResubmissionCandidate[], scopeLabel: string, periodLabel: string) {
  const totals = matchingCandidateTotals(candidates);
  const sortedCandidates = [...candidates].sort((a, b) => b.originalAmount - a.originalAmount || a.patientName.localeCompare(b.patientName, "de"));
  const patientCount = new Set(candidates.map((candidate) => candidate.patientName)).size;
  printOperationalHtmlReport({
    title: "Neueinreichung / Matching",
    description: "Automatisch erkannte Folgeeinreichungen nach Storno oder Rückgabe, zur Prüfung und Entscheidung.",
    meta: `${scopeLabel} · ${periodLabel}`,
    summary: [
      { label: "Vorschläge", value: integerNumber.format(candidates.length) },
      { label: "Patienten", value: integerNumber.format(patientCount) },
      { label: "Urspr. Abzug", value: exactMoney.format(totals.originalAmount) },
      { label: "Neue Forderung", value: exactMoney.format(totals.newAmount) },
      { label: "Angerechnet", value: exactMoney.format(totals.creditedAmount) }
    ],
    tableHead: `<tr>
      <th style="width: 18%;">Patient</th>
      <th style="width: 15%;">Ursprung</th>
      <th style="width: 20%;">Grund</th>
      <th style="width: 16%;">Neue Einreichung</th>
      <th style="width: 11%;" class="amount">Ursprung</th>
      <th style="width: 11%;" class="amount">Neu</th>
      <th style="width: 9%;">Abrechnung</th>
    </tr>`,
    tableBody: sortedCandidates.map((candidate) => `<tr>
      <td><strong>${escapeHtml(candidate.patientName)}</strong><span>${escapeHtml(candidate.locationName)}</span></td>
      <td><strong>${escapeHtml(candidate.originalDate)}</strong><span>${escapeHtml(candidate.invoiceNo)} / ${escapeHtml(candidate.bfsNo)}</span></td>
      <td>${escapeHtml(candidate.reason)}</td>
      <td><strong>${escapeHtml(candidate.newDate)}</strong><span>${escapeHtml(candidate.newInvoiceNo)} / ${escapeHtml(candidate.newBfsNo)}</span></td>
      <td class="amount">${escapeHtml(exactMoney.format(candidate.originalAmount))}</td>
      <td class="amount">${escapeHtml(exactMoney.format(candidate.newAmount))}</td>
      <td>${escapeHtml(formatStatementReference(candidate.newStatementNo, candidate.newFile))}</td>
    </tr>`).join(""),
    emptyColSpan: 7,
    emptyLabel: "Keine Neueinreichungsvorschläge im aktuellen Filter.",
    footer: "Hinweis: Der Export bildet exakt die aktuell gefilterten Matching-Vorschläge ab. Die Entscheidung Stimmt/Abgelehnt erfolgt in der App.",
    filename: "orisus-bfs-neueinreichung-matching.html"
  });
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
    .filter(isRelevantDeductionMovement)
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

async function loadStoredImportRowsFromBrowser() {
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

async function loadConfirmedInvoiceStatusDocuments() {
  if (typeof window === "undefined") return [];
  const response = await fetch("/api/invoice-status/parse", { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error("Bestätigter Rechnungsstatus konnte nicht geladen werden.");
  const payload = await response.json() as { documents?: ParsedInvoiceStatusDocument[] };
  return payload.documents ?? [];
}

async function loadConfirmedInvoiceRows() {
  if (typeof window === "undefined") return [];
  const response = await fetch("/api/invoices/parse", { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error("Bestätigte Rechnungen konnten nicht geladen werden.");
  const payload = await response.json() as { rows?: ParsedInvoiceDocument[] };
  return payload.rows ?? [];
}

async function saveConfirmedInvoiceRows(rows: ParsedInvoiceDocument[]) {
  const response = await fetch("/api/invoices/parse", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rows }),
    cache: "no-store"
  });
  const payload = await response.json().catch(() => null) as {
    rows?: ParsedInvoiceDocument[];
    persistence?: { imported: number; duplicates: number; failed: number; errors?: Array<{ file: string; message: string }> };
    error?: string;
  } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Rechnungsimport konnte nicht gespeichert werden.");
  return {
    rows: payload?.rows ?? [],
    persistence: payload?.persistence
  };
}

async function saveConfirmedInvoiceStatusDocuments(documents: ParsedInvoiceStatusDocument[]) {
  const response = await fetch("/api/invoice-status/parse", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ documents })
  });
  const payload = await response.json().catch(() => null) as { documents?: ParsedInvoiceStatusDocument[]; error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Bestätigter Rechnungsstatus konnte nicht gespeichert werden.");
  return payload?.documents ?? documents;
}

async function clearConfirmedInvoiceStatusDocuments() {
  const response = await fetch("/api/invoice-status/parse", { method: "DELETE", cache: "no-store" });
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Bestätigter Rechnungsstatus konnte nicht zurückgesetzt werden.");
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
      comment: status === "paid_manual"
        ? "Manuell geprüft: bezahlt."
        : status === "cancelled_manual"
          ? "Manuell geprüft: endgültig storniert."
          : "Manuell geprüft: weiterhin offen."
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

function CasesView({
  cases: rows,
  compact = false,
  title,
  description,
  onResolvePaid,
  onKeepOpen,
  onCancelFinal,
  enableFilters = false,
  tableScrollable = false
}: {
  cases: BfsCase[];
  compact?: boolean;
  title?: string;
  description?: string;
  onResolvePaid?: (fall: BfsCase) => void | Promise<void>;
  onKeepOpen?: (fall: BfsCase) => void | Promise<void>;
  onCancelFinal?: (fall: BfsCase) => void | Promise<void>;
  enableFilters?: boolean;
  tableScrollable?: boolean;
}) {
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [caseStandortFilter, setCaseStandortFilter] = useState("alle");
  const [casePeriodId, setCasePeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [caseSearchTerm, setCaseSearchTerm] = useState("");
  const casePeriod = useMemo(() => periodOptions.find((period) => period.id === casePeriodId) ?? periodOptions[0], [periodOptions, casePeriodId]);
  const caseStandorte = useMemo(() => orderedStandorte().filter((entry) => rows.some((fall) => fall.standortId === entry.id)), [rows]);
  const filteredRows = useMemo(() => {
    const query = normalizeSearchQuery(caseSearchTerm);
    const baseRows = compact && !enableFilters ? rows : rows.filter((fall) => {
      const rowStandort = standorte.find((entry) => entry.id === fall.standortId);
      const matchesStandort = caseStandortFilter === "alle" || fall.standortId === caseStandortFilter;
      const matchesPeriod = rowStandort ? shortDateInPeriod(fall.sourceDate, casePeriod, rowStandort) : true;
      return matchesStandort && matchesPeriod;
    });
    if (!query) return baseRows;
    return baseRows.filter((fall) => matchesCaseSearch(fall, query));
  }, [compact, enableFilters, rows, caseStandortFilter, casePeriod, caseSearchTerm]);
  const totalAmount = useMemo(() => filteredRows.reduce((sum, fall) => sum + fall.amount, 0), [filteredRows]);
  const oldestAge = useMemo(() => filteredRows.reduce((max, fall) => Math.max(max, fall.ageDays), 0), [filteredRows]);
  const highestCase = useMemo(() => filteredRows.reduce<BfsCase | undefined>((max, fall) => !max || fall.amount > max.amount ? fall : max, undefined), [filteredRows]);
  const reportTitle = title ?? (compact ? "Praxis nachfassen am Standort" : "Praxis nachfassen");

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{reportTitle}</h2>
          <p>{description ?? "Originaldaten sind read-only; nur interne Bearbeitung und Erledigungsgründe werden gepflegt."}</p>
        </div>
        <div className="case-list-actions">
          <div className="search-box"><Search size={16} /><input value={caseSearchTerm} onChange={(event) => setCaseSearchTerm(event.target.value)} placeholder="Patient, Re.-Nr. oder BFS-Nr." /></div>
        </div>
      </div>
      {(!compact || enableFilters) && (
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
            <span>Tab-Auswertung</span>
            <strong>{integerNumber.format(filteredRows.length)} Fälle / {exactMoney.format(totalAmount)}</strong>
          </div>
        </div>
      )}
      <div className="case-summary-grid" aria-label="Gesamtüberblick offene Fälle">
        <article>
          <span>Offener Betrag gesamt</span>
          <strong>{exactMoney.format(totalAmount)}</strong>
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
          <strong>{exactMoney.format(highestCase?.amount ?? 0)}</strong>
        </article>
      </div>
      <section className="chart-grid visual-first-grid case-chart-grid">
        <div className="visual-panel mini-chart">
          <h2>Offener Betrag je Standort</h2>
          <CaseColumnChart title="Offener Betrag je Standort" values={caseAmountByLocation(filteredRows)} valueKind="money" />
        </div>
        <div className="visual-panel mini-chart">
          <h2>Fallgründe</h2>
          <CaseColumnChart title="Fallgründe" values={caseReasonDistribution(filteredRows)} valueKind="money" />
        </div>
      </section>
      <div className="table-section-heading">
        <div>
          <span className="eyebrow">Arbeitsliste</span>
          <h2>Offene Nachfassfälle</h2>
        </div>
        <button className="secondary-button" disabled={!filteredRows.length} onClick={() => printCasesReport(filteredRows, reportTitle)}>
          <Printer size={16} /> PDF Export
        </button>
      </div>
      <div className={`table-wrap${compact && !tableScrollable ? "" : " case-table-scroll"}`}>
        <table className="case-followup-table">
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
              {(onResolvePaid || onKeepOpen || onCancelFinal) && <th>Aktion</th>}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((fall) => (
              <tr key={fall.id}>
                <td><span className={`traffic traffic-${fall.traffic}`} /></td>
                <td><strong>{fall.patientName}</strong><span>{fall.locationName}</span></td>
                <td>{fall.invoiceNo}</td>
                <td>{fall.bfsNo}</td>
                <td>{exactMoney.format(fall.amount)}</td>
                <td>{fall.reason}</td>
                <td>{fall.ageDays} Tage</td>
                <td><StatusBadge status={fall.status} /></td>
                <td>{fall.dueDate}</td>
                <td>{formatCaseAbrechnungReference(fall.lastComment)}</td>
                {(onResolvePaid || onKeepOpen || onCancelFinal) && (
                  <td>
                    <div className="case-action-stack">
                      {onResolvePaid && (
                        <button className="secondary-button resolve-case-button" onClick={() => void onResolvePaid(fall)}>
                          <CheckCircle2 size={15} /> Erledigt / bezahlt
                        </button>
                      )}
                      {onCancelFinal && (
                        <button className="secondary-button resolve-case-button" onClick={() => void onCancelFinal(fall)}>
                          <X size={15} /> Endgültig storniert
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
                <td colSpan={onResolvePaid || onKeepOpen || onCancelFinal ? 11 : 10}>Keine Praxis-Nachfassfälle für den aktuellen Datenstand.</td>
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
    <div><span>Offener Betrag</span><strong>${escapeHtml(exactMoney.format(totalAmount))}</strong></div>
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

function caseAmountByLocation(rows: BfsCase[]) {
  const grouped = new Map<string, number>();
  rows.forEach((fall) => grouped.set(fall.locationName, (grouped.get(fall.locationName) ?? 0) + fall.amount));
  return [...grouped.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));
}

function caseReasonDistribution(rows: BfsCase[]) {
  const grouped = new Map<string, { amount: number; count: number }>();
  rows.forEach((fall) => {
    const label = caseReasonLabel(fall.reason);
    const current = grouped.get(label) ?? { amount: 0, count: 0 };
    grouped.set(label, { amount: current.amount + fall.amount, count: current.count + 1 });
  });
  return [...grouped.entries()]
    .sort((a, b) => b[1].amount - a[1].amount || b[1].count - a[1].count)
    .slice(0, 6)
    .map(([label, value]) => ({ label, value: value.amount, detailLabel: `${integerNumber.format(value.count)} Fälle` }));
}

function caseReasonLabel(reason: string) {
  const normalized = reason.toLowerCase();
  if (normalized.includes("iportal") || normalized.includes("rechnungsliste")) return "iPortal-Rechnungsliste";
  if (normalized.includes("neue rechnung")) return "Neue Rechnung";
  if (normalized.includes("ohne ausfallschutz")) return "Rückgabe ohne Ausfallschutz";
  if (normalized.includes("rückgabe") || normalized.includes("rückbelastung")) return "Rückgabe/Rückbelastung";
  if (normalized.includes("storno")) return "Storno";
  if (normalized.includes("factoring")) return "Factoringvereinbarung";
  if (normalized.includes("praxis") || normalized.includes("nachricht")) return "Praxisanweisung";
  if (normalized.includes("vertrag")) return "Gemäß Vertrag";
  if (normalized.includes("unstzustell") || normalized.includes("unzustell")) return "Unzustellbar";
  const cleaned = reason
    .replace(/^lt\.?\s*/i, "")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned && cleaned.length > 3 ? cleaned.slice(0, 28) : "Sonstiger Klärgrund";
}

function caseReportRowHtml(fall: BfsCase) {
  return `<tr>
    <td><span class="traffic traffic-${escapeHtml(fall.traffic)}"></span>${escapeHtml(fall.traffic)}</td>
    <td><strong>${escapeHtml(fall.patientName)}</strong><br />${escapeHtml(fall.locationName)}</td>
    <td>${escapeHtml(fall.invoiceNo)}</td>
    <td>${escapeHtml(fall.bfsNo)}</td>
    <td>${escapeHtml(exactMoney.format(fall.amount))}</td>
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

function formatStatementReference(statementNo?: string, fileName?: string) {
  if (statementNo && statementNo !== "-") return statementNo;
  return fileName ? formatCaseAbrechnungReference(fileName) : "-";
}

function RiskView({ standortId, importRows = [], periodOverride }: { standortId?: string; importRows?: ImportPreviewRow[]; periodOverride?: PeriodOption }) {
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [selectedStandortId, setSelectedStandortId] = useState(() => standortId ?? "alle");
  const selectedPeriod = useMemo(() => periodOverride ?? periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0], [periodOptions, periodOverride, selectedPeriodId]);
  const selectableStandorte = useMemo(() => standortId ? orderedStandorte().filter((entry) => entry.id === standortId) : orderedStandorte(), [standortId]);
  const selectedStandorte = useMemo(() => {
    if (standortId) return selectableStandorte;
    if (selectedStandortId === "alle") return selectableStandorte;
    return selectableStandorte.filter((entry) => entry.id === selectedStandortId);
  }, [selectableStandorte, selectedStandortId, standortId]);
  const scopedImportRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = selectedStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedPeriod, rowStandort) : false;
  }), [importRows, selectedPeriod, selectedStandorte]);
  const importedRisks = useMemo(() => riskClaimsFromImportRows(scopedImportRows), [scopedImportRows]);
  const rows = useMemo(() => importedRisks
    .filter((claim) => selectedStandorte.some((entry) => entry.id === claim.standortId))
    .sort((a, b) => riskAssessmentRank(b) - riskAssessmentRank(a) || (b.eventAmount ?? 0) - (a.eventAmount ?? 0) || b.amount - a.amount), [importedRisks, selectedStandorte]);
  const paymentRisk = useMemo(() => summarizeNoProtectionPaymentRisk(rows), [rows]);
  return (
    <div className="content-stack">
      {!periodOverride && (
        <section className="panel period-filter deduction-analysis-filter">
          <label className="select-label">
            Zeitraum ohne Schutz
            <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
          </label>
        <label className="select-label">
          Standort ohne Schutz
          <select value={standortId ?? selectedStandortId} onChange={(event) => setSelectedStandortId(event.target.value)} disabled={Boolean(standortId)}>
            {!standortId && <option value="alle">Alle Standorte</option>}
            {selectableStandorte.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
        </label>
        <div>
          <strong>{selectedStandorte.length === 1 ? selectedStandorte[0].name : "Alle Standorte"}</strong>
          <span>{selectedPeriod.detail}</span>
        </div>
        </section>
      )}
      <section className="priority-grid">
        <PriorityCard
          label="Ohne-Schutz-Patienten"
          value={String(paymentRisk.totalPatients)}
          hint={`${rows.length} Positionen · ${money.format(rows.reduce((sum, claim) => sum + claim.amount, 0))}`}
          period={selectedPeriod.label}
          tone={rows.length ? "amber" : "green"}
          info={paymentRisk.info}
        />
        <PriorityCard
          label="Davon nicht gezahlt"
          value={String(paymentRisk.unpaidPatients)}
          hint="nicht erledigte Storno-/Rückgabe-Bewegung"
          period={selectedPeriod.label}
          tone={paymentRisk.unpaidPatients ? "red" : "green"}
          info={paymentRisk.info}
        />
        <PriorityCard
          label="Nichtzahlungsquote"
          value={formatPercent(paymentRisk.unpaidRate)}
          hint="kritische Patienten ohne Schutz"
          period={selectedPeriod.label}
          tone={paymentRisk.unpaidRate >= 10 ? "red" : paymentRisk.unpaidRate ? "amber" : "green"}
          info={paymentRisk.info}
        />
        <PriorityCard
          label="Bisher unauffällig"
          value={String(paymentRisk.cleanPatients)}
          hint="kein negatives Ereignis erkannt"
          period={selectedPeriod.label}
          tone="green"
          info={paymentRisk.info}
        />
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
    `Nichtzahlungsquote: ${unpaidPatients} / ${totalPatients || 1} = ${formatPercent(unpaidRate)}.`,
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
            {!compact && (
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
            )}
          </>
        ) : (
          <p className="empty-state">Keine mehrfachen Patienten ohne Ausfallschutz im aktuellen Datenstand.</p>
        )}
      </section>
    </div>
  );
}

function PatientClassificationView({ standort, importRows = [] }: { standort?: Standort; importRows?: ImportPreviewRow[] }) {
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [selectedStandortFilterId, setSelectedStandortFilterId] = useState(() => standort?.id ?? "alle");
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0], [periodOptions, selectedPeriodId]);
  const relevantStandorte = useMemo(() => standort ? [standort] : orderedStandorte(), [standort]);
  const selectedStandorte = useMemo(() => {
    if (standort) return [standort];
    if (selectedStandortFilterId === "alle") return relevantStandorte;
    return relevantStandorte.filter((entry) => entry.id === selectedStandortFilterId);
  }, [relevantStandorte, selectedStandortFilterId, standort]);
  const singleStandortId = selectedStandorte.length === 1 ? selectedStandorte[0].id : undefined;
  const scopedRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = selectedStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedPeriod, rowStandort) : false;
  }), [importRows, selectedPeriod, selectedStandorte]);
  const profiles = useMemo(() => patientProfilesFromImportRows(scopedRows, singleStandortId), [scopedRows, singleStandortId]);
  const riskClaims = useMemo(() => riskClaimsFromImportRows(scopedRows), [scopedRows]);
  const recurring = useMemo(() => getRecurringRiskProfiles(singleStandortId, scopedRows), [scopedRows, singleStandortId]);
  const patientHistory = useMemo(() => patientHistoryFromImportRows(scopedRows, singleStandortId), [scopedRows, singleStandortId]);
  const counts = useMemo(() => ["A", "B", "C", "D"].map((grade) => ({
    grade,
    count: profiles.filter((profile) => profile.grade === grade).length
  })), [profiles]);
  const total = profiles.length || 1;
  const noProtectionPatients = profiles.filter((profile) => profile.noProtectionCount > 0);
  const noProtectionActuallyBad = noProtectionPatients.filter((profile) => profile.badEventCount > 0);
  const noProtectionClean = noProtectionPatients.filter((profile) => profile.badEventCount === 0);
  const highRiskHighVolume = profiles.filter((profile) => ["C", "D"].includes(profile.grade) && profile.riskAmount >= 1000);
  const resolvedNoProtection = riskClaims.filter((claim) => claim.assessment === "erledigt").length;
  const suspiciousNoProtection = riskClaims.filter((claim) => claim.assessment === "auffaellig").length;
  const criticalPatients = profiles.filter((profile) => ["C", "D"].includes(profile.grade));

  return (
    <div className="content-stack">
      <section className="panel period-filter deduction-analysis-filter">
        <label className="select-label">
          Zeitraum Patientenklassifizierung
          <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>
            {periodOptions.map((period) => (
              <option key={period.id} value={period.id}>{period.label}</option>
            ))}
          </select>
        </label>
        <label className="select-label">
          Standort Patientenklassifizierung
          <select value={selectedStandortFilterId} onChange={(event) => setSelectedStandortFilterId(event.target.value)} disabled={Boolean(standort)}>
            {!standort && <option value="alle">Alle Standorte</option>}
            {relevantStandorte.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
        </label>
        <div>
          <strong>{selectedStandorte.length === 1 ? selectedStandorte[0].name : "Alle Standorte"}</strong>
          <span>{selectedPeriod.detail}</span>
        </div>
      </section>
      <section className="priority-grid">
        <PriorityCard label="Ohne-Schutz-Anteil" value={formatPercent(noProtectionPatients.length ? (noProtectionPatients.length / total) * 100 : 0)} hint={`${noProtectionPatients.length} Patienten`} tone={noProtectionPatients.length ? "amber" : "green"} />
        <PriorityCard label="Davon auffällig" value={formatPercent(noProtectionPatients.length ? (noProtectionActuallyBad.length / noProtectionPatients.length) * 100 : 0)} hint={`${noProtectionActuallyBad.length} Patienten`} tone={noProtectionActuallyBad.length ? "red" : "green"} />
        <PriorityCard label="Bezahlt / geklärt" value={String(resolvedNoProtection)} hint="Ohne-Schutz-Claims mit Beleg" tone={resolvedNoProtection ? "green" : "blue"} />
        <PriorityCard label="Wiederholer ohne Schutz" value={String(recurring.length)} hint={`${recurring.filter((profile) => profile.tone === "red").length} kritisch`} tone={recurring.some((profile) => profile.tone === "red") ? "red" : recurring.length ? "amber" : "green"} />
        {counts.map(({ grade, count }) => (
          <PriorityCard
            key={grade}
            label={`Klasse ${grade}`}
            value={formatPercent(total ? (count / total) * 100 : 0)}
            hint={`${count} Patienten`}
            tone={grade === "A" ? "green" : grade === "B" ? "blue" : grade === "C" ? "amber" : "red"}
            info={patientClassInfo(grade, count, total)}
          />
        ))}
      </section>
      <section className="chart-grid">
        <div className="panel mini-chart">
          <h2>Patientenklassen</h2>
          <CaseColumnChart
            title="Patientenqualität"
            values={counts.map(({ grade, count }) => ({ label: `Klasse ${grade}`, value: count }))}
            valueKind="count"
          />
        </div>
        <div className="panel mini-chart">
          <h2>Ohne-Schutz-Selektion</h2>
          <CaseColumnChart title="Ohne-Schutz-Selektion" valueKind="count" values={[
            { label: "ohne Schutz", value: noProtectionPatients.length },
            { label: "auffällig", value: noProtectionActuallyBad.length },
            { label: "erledigt", value: resolvedNoProtection },
            { label: "Wiederholer", value: recurring.length }
          ]} />
        </div>
      </section>
      <section className="dashboard-grid">
        <article className="panel command-panel">
          <div>
            <span className="eyebrow">Patientenselektion</span>
            <h2>{noProtectionActuallyBad.length} von {noProtectionPatients.length} Ohne-Schutz-Patienten wurden auffällig</h2>
            <p>Unauffällig ohne Schutz: {noProtectionClean.length}. Auffällige Claims aus Risikoabgleich: {suspiciousNoProtection}. Hohes Risiko mit hohem Volumen: {highRiskHighVolume.length} Patient(en).</p>
          </div>
        </article>
        <article className="panel process-panel">
          <h2>Steuerungslogik</h2>
          <div className="stacked-checks">
            <span>Ohne Ausfallschutz ist Selektion, nicht automatisch Klärfall</span>
            <span>Wiederholer mit negativer Bewegung zuerst mit Standort besprechen</span>
            <span>Klasse C/D mit hohem Volumen für Vorkasse- oder Sperrprozess prüfen</span>
          </div>
        </article>
      </section>
      <section className="risk-profile-grid">
        {recurring.slice(0, 6).map((profile) => (
          <article className={`risk-profile-card ${profile.tone}`} key={`classification-${profile.id}`}>
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
        {!recurring.length && (
          <section className="panel">
            <p className="empty-state">Keine Wiederholer ohne Ausfallschutz im aktuellen Datenstand.</p>
          </section>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{standort ? `Patientenklassifizierung ${standort.name}` : "Patientenklassifizierung Gruppe"}</h2>
            <p>Patienten werden je Standort anhand von Zahlungsverhalten, Stornos/Rückgaben, Ausfallschutz und Wiederholungen klassifiziert. Kritisch aktuell: {criticalPatients.length} Patient(en).</p>
          </div>
        </div>
        <div className="table-wrap case-table-scroll">
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
                  <td>{formatPercent(profile.badRate)}</td>
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
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Historie pro Patient</h2>
            <p>Chronologische Sicht auf erkannte Einreichungen, Stornos, Rückgaben, Rückbelastungen und Ohne-Ausfallschutz-Marker.</p>
          </div>
        </div>
        <div className="table-wrap case-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Patient</th>
                <th>Standort</th>
                <th>Ereignis</th>
                <th>Re.-Nr.</th>
                <th>BFS-Nr.</th>
                <th>Betrag</th>
                <th>Hinweis</th>
              </tr>
            </thead>
            <tbody>
              {patientHistory.slice(0, 200).map((entry) => (
                <tr key={`${entry.date}-${entry.locationName}-${entry.patientName}-${entry.invoiceNo}-${entry.type}-${entry.amount}`}>
                  <td>{entry.date}</td>
                  <td><strong>{entry.patientName}</strong></td>
                  <td>{entry.locationName}</td>
                  <td><StatusBadge status={entry.type} /></td>
                  <td>{entry.invoiceNo}</td>
                  <td>{entry.bfsNo}</td>
                  <td>{money.format(entry.amount)}</td>
                  <td>{entry.note}</td>
                </tr>
              ))}
              {!patientHistory.length && (
                <tr><td colSpan={8}>Keine Patientenhistorie im aktuellen Datenstand.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function OutcomeControlView({ standort, importRows = [], manualCaseResolutions = [] }: { standort?: Standort; importRows?: ImportPreviewRow[]; manualCaseResolutions?: ManualCaseResolution[] }) {
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
  const stornoDoneInfo = [
    `Grundmenge: ${stornoReview.total} erkannte Storno-Zeilen.`,
    `Davon sind ${stornoReview.done} zurückgeholt/bezahlt, ${stornoReview.finalCancelled} endgültig storniert und ${stornoReview.open} weiter zu prüfen.`,
    "Als zurückgeholt/bezahlt gelten echte spätere Neueinreichung oder wirtschaftlich belegte Zahlung. Endgültig storniert ist geklärt, zählt aber nicht als zurückgeholt. Saldo 0 allein ist kein Zahlungsnachweis."
  ].join(" ");

  return (
    <div className="content-stack">
      <section className="priority-grid">
        <PriorityCard label="Fälle im Blick" value={String(totals.total)} hint={standort ? standort.name : "alle Standorte"} tone="blue" />
        <PriorityCard label="Nachbearbeitet" value={String(totals.reworked)} hint="Neueinreichung oder Maßnahme erkannt" tone="amber" />
        <PriorityCard label="Bezahlt" value={String(totals.paid)} hint={`${formatPercent(successRate)} Zahlungsquote`} tone="green" info="Bezahlt zählt nur erkannte oder manuell belegte Zahlung. Es ist nicht gleichzusetzen mit BFS-Saldo 0." />
        <PriorityCard label="Storno-Zeilen geklärt" value={`${stornoReview.done}/${stornoReview.total}`} hint={`${stornoReview.open} Storno-Zeilen prüfen`} tone={stornoReview.open ? "amber" : "green"} info={stornoDoneInfo} />
        <PriorityCard label="Weiter zu prüfen" value={String(openItems.length || totals.open)} hint={money.format(openAmount)} tone={(openItems.length || totals.open) ? "red" : "green"} />
      </section>
      <section className="chart-grid">
        <div className="panel mini-chart">
          <h2>Maßnahmenstatus</h2>
          <InteractiveBars title="Maßnahmenstatus Fälle" values={[
            { label: "Ausgang", value: totals.total },
            { label: "nachbearbeitet", value: totals.reworked },
            { label: "bezahlt", value: totals.paid },
            { label: "prüfen", value: openItems.length || totals.open }
          ]} />
        </div>
        <div className="panel mini-chart">
          <h2>Offen nach Monat</h2>
          <InteractiveBars title="Offene Fälle nach Monat" values={outcomeRows.slice(0, 8).map((row) => ({
            label: row.month,
            value: row.open
          }))} />
        </div>
        <div className="panel mini-chart">
          <h2>Offener Betrag nach Standort</h2>
          <InteractiveBars title="Offener Betrag je Standort" values={aggregateOutcomeAmountByLocation(outcomeRows)} />
        </div>
      </section>
      <StornoReviewSection review={stornoReview} />
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{standort ? `Maßnahmenkontrolle ${standort.name}` : "Maßnahmenkontrolle Gruppe"}</h2>
            <p>Zeigt je Standort und Monat, ob stornierte oder zurückgegebene Fälle nachbearbeitet wurden und ob daraus Neueinreichung, Zahlung oder weiterer Prüfbedarf erkennbar ist.</p>
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
                <th>Bezahlt</th>
                <th>Weiter prüfen</th>
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
              <h2>Weiter prüfen nach Storno/Rückgabe</h2>
              <p>Patienten, bei denen eine Rückgabe oder Stornierung erkannt wurde, aber im hochgeladenen Datenstand keine spätere Neueinreichung oder belegte Zahlung gefunden wurde.</p>
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
                  <th>AbrechnungsNr.</th>
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
                    <td>{formatStatementReference(item.statementNo, item.file)}</td>
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

function aggregateOutcomeAmountByLocation(rows: ReturnType<typeof outcomeRowsFromImportRows>) {
  const grouped = new Map<string, number>();
  rows.forEach((row) => grouped.set(row.locationName, (grouped.get(row.locationName) ?? 0) + row.amount));
  return [...grouped.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));
}

function MatchesView({
  importRows = [],
  standort,
  manualCaseResolutions = [],
  onResolveCandidate
}: {
  importRows?: ImportPreviewRow[];
  standort?: Standort;
  manualCaseResolutions?: ManualCaseResolution[];
  onResolveCandidate?: (candidate: ResubmissionCandidate, status: "paid_manual" | "cancelled_manual") => Promise<void>;
}) {
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [selectedStandortFilterId, setSelectedStandortFilterId] = useState(() => standort?.id ?? "alle");
  const [savingCandidateKey, setSavingCandidateKey] = useState("");
  const [matchActionError, setMatchActionError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0], [periodOptions, selectedPeriodId]);
  const selectableStandorte = useMemo(() => standort ? [standort] : orderedStandorte(), [standort]);
  const filteredStandorte = useMemo(() => {
    if (standort) return [standort];
    if (selectedStandortFilterId === "alle") return selectableStandorte;
    return selectableStandorte.filter((entry) => entry.id === selectedStandortFilterId);
  }, [selectableStandorte, selectedStandortFilterId, standort]);
  const scopedImportRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = filteredStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedPeriod, rowStandort) : false;
  }), [filteredStandorte, importRows, selectedPeriod]);
  const closedKeys = useMemo(() => buildClosedResolutionKeySet(manualCaseResolutions), [manualCaseResolutions]);
  const candidates = useMemo(() => resubmissionCandidatesFromImportRows(scopedImportRows)
    .filter((candidate) => !resubmissionResolutionKeys(candidate).some((key) => closedKeys.has(key))), [closedKeys, scopedImportRows]);
  const filteredCandidates = useMemo(() => {
    const query = normalizeSearchQuery(searchTerm);
    if (!query) return candidates;
    return candidates.filter((candidate) => matchesResubmissionCandidateSearch(candidate, query));
  }, [candidates, searchTerm]);
  const scopeLabel = filteredStandorte.length === 1 ? filteredStandorte[0].name : "Alle Standorte";
  const matchTotals = useMemo(() => matchingCandidateTotals(filteredCandidates), [filteredCandidates]);
  const patientCount = new Set(filteredCandidates.map((candidate) => candidate.patientName)).size;
  async function handleCandidateAction(candidate: ResubmissionCandidate, status: "paid_manual" | "cancelled_manual") {
    if (!onResolveCandidate) return;
    const key = `${resubmissionResolutionKey(candidate)}:${status}`;
    setSavingCandidateKey(key);
    setMatchActionError("");
    try {
      await onResolveCandidate(candidate, status);
    } catch (error) {
      setMatchActionError(error instanceof Error ? error.message : "Neueinreichung konnte nicht gespeichert werden.");
    } finally {
      setSavingCandidateKey("");
    }
  }

  return (
    <div className="content-stack">
      <section className="panel period-filter deduction-analysis-filter">
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
          <select value={standort ? standort.id : selectedStandortFilterId} onChange={(event) => setSelectedStandortFilterId(event.target.value)} disabled={Boolean(standort)}>
            {!standort && <option value="alle">Alle Standorte</option>}
            {selectableStandorte.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
        </label>
        <div>
          <strong>{scopeLabel}</strong>
          <span>{selectedPeriod.detail}</span>
        </div>
      </section>
      <section className="priority-grid">
        <PriorityCard label="Neueinreichungen" value={String(filteredCandidates.length)} hint="nach Storno/Rückgabe erkannt" period={selectedPeriod.label} tone="blue" />
        <PriorityCard label="Betroffene Patienten" value={String(patientCount)} hint="im gewählten Filter" period={selectedPeriod.label} tone="amber" />
        <PriorityCard label="Urspr. Abzugsbetrag" value={exactMoney.format(matchTotals.originalAmount)} hint="ursprünglich negativ belastet" period={selectedPeriod.label} tone={matchTotals.originalAmount ? "red" : "green"} />
        <PriorityCard label="Neue Forderungssumme" value={exactMoney.format(matchTotals.newAmount)} hint={`Differenz ${exactMoney.format(matchTotals.difference)}`} period={selectedPeriod.label} tone={matchTotals.newAmount ? "green" : "blue"} />
        <PriorityCard label="Angerechnete Erledigung" value={exactMoney.format(matchTotals.creditedAmount)} hint="maximal bis Ursprungsbetrag" period={selectedPeriod.label} tone={matchTotals.creditedAmount ? "green" : "blue"} />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Neueinreichungen nach Storno/Rückgabe {scopeLabel}</h2>
            <p>Automatisch erkannte Fälle im gewählten Zeitraum und Standortumfang, bei denen ein Patient nach einer Storno- oder Rückgabe-Bewegung später wieder in einer Forderungsliste auftaucht.</p>
          </div>
          <div className="case-list-actions">
            <button className="secondary-button" disabled={!filteredCandidates.length} onClick={() => printResubmissionReport(filteredCandidates, scopeLabel, selectedPeriod.label)}>
              <Printer size={16} /> PDF Export
            </button>
            <div className="search-box"><Search size={16} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Patient, Re.-Nr. oder BFS-Nr." /></div>
          </div>
        </div>
        {matchActionError && <p className="form-error">{matchActionError}</p>}
        <div className="table-wrap case-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Ursprung</th>
                <th>Grund</th>
                <th>Neue Einreichung</th>
                <th>Beträge</th>
                <th>AbrechnungsNr.</th>
                <th>Entscheidung</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((candidate) => {
                const baseKey = resubmissionResolutionKey(candidate);
                const acceptKey = `${baseKey}:paid_manual`;
                const rejectKey = `${baseKey}:cancelled_manual`;
                const isSaving = savingCandidateKey === acceptKey || savingCandidateKey === rejectKey;
                return (
                  <tr key={`${candidate.patientName}-${candidate.bfsNo}-${candidate.newInvoiceNo}-${candidate.newDate}`}>
                    <td><strong>{candidate.patientName}</strong><span>{candidate.locationName}</span></td>
                    <td>{candidate.originalDate}<span>{candidate.invoiceNo} / {candidate.bfsNo}</span></td>
                    <td>{candidate.reason}</td>
                    <td>{candidate.newDate}<span>{candidate.newInvoiceNo} / {candidate.newBfsNo}</span></td>
                    <td>{exactMoney.format(candidate.originalAmount)}<span>neu {exactMoney.format(candidate.newAmount)}</span></td>
                    <td>{formatStatementReference(candidate.newStatementNo, candidate.newFile)}</td>
                    <td>
                      <div className="case-action-stack">
                        <button className="secondary-button resolve-case-button" disabled={isSaving || !onResolveCandidate} onClick={() => void handleCandidateAction(candidate, "paid_manual")}>
                          <CheckCircle2 size={15} /> Stimmt
                        </button>
                        <button className="secondary-button resolve-case-button" disabled={isSaving || !onResolveCandidate} onClick={() => void handleCandidateAction(candidate, "cancelled_manual")}>
                          <X size={15} /> Abgelehnt
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredCandidates.length && (
                <tr>
                  <td colSpan={7}>Keine Neueinreichungsvorschläge für den gewählten Zeitraum und Standort.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ReportsView({ role, standort, cases, importRows = [], invoiceStatusRows = [], manualCaseResolutions = [] }: { role: AppRole; standort: Standort; cases: BfsCase[]; importRows?: ImportPreviewRow[]; invoiceStatusRows?: ParsedInvoiceStatusRow[]; manualCaseResolutions?: ManualCaseResolution[] }) {
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [selectedReportStandortId, setSelectedReportStandortId] = useState(() => role === "super_admin" ? "alle" : standort.id);
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0], [periodOptions, selectedPeriodId]);
  const selectableStandorte = useMemo(() => role === "super_admin" ? orderedStandorte() : [standort], [role, standort]);
  const selectedReportStandorte = useMemo(() => {
    if (role !== "super_admin") return [standort];
    if (selectedReportStandortId === "alle") return selectableStandorte;
    return selectableStandorte.filter((entry) => entry.id === selectedReportStandortId);
  }, [role, selectableStandorte, selectedReportStandortId, standort]);
  const selectedReportStandortIds = useMemo(() => new Set(selectedReportStandorte.map((entry) => entry.id)), [selectedReportStandorte]);
  const scopeLabel = selectedReportStandorte.length === 1 ? selectedReportStandorte[0].name : "Alle Standorte";
  const scopedImportRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = selectedReportStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedPeriod, rowStandort) : false;
  }), [importRows, selectedPeriod, selectedReportStandorte]);
  const reportCases = useMemo(() => cases
    .filter((fall) => fall.status !== "erledigt_automatisch" && selectedReportStandortIds.has(fall.standortId))
    .filter((fall) => {
      const fallStandort = selectedReportStandorte.find((entry) => entry.id === fall.standortId);
      return fallStandort ? shortDateInPeriod(fall.sourceDate, selectedPeriod, fallStandort) : false;
    }), [cases, selectedPeriod, selectedReportStandortIds, selectedReportStandorte]);
  const comparison = useMemo(() => buildManagementComparison(importRows, selectedReportStandorte, reportCases, selectedPeriod, manualCaseResolutions), [importRows, reportCases, selectedPeriod, selectedReportStandorte, manualCaseResolutions]);
  const riskClaims = useMemo(() => riskClaimsFromImportRows(scopedImportRows), [scopedImportRows]);
  const reportStandortId = selectedReportStandorte.length === 1 ? selectedReportStandorte[0].id : undefined;
  const recurring = useMemo(() => getRecurringRiskProfiles(reportStandortId, scopedImportRows), [reportStandortId, scopedImportRows]);
  const openAmount = reportCases.reduce((sum, fall) => sum + fall.amount, 0);
  const economicCheckRows = useMemo(() => buildInvoiceStatusReviewBasket(invoiceStatusRows, scopedImportRows)
    .filter((row) => row.category === "economic_check"), [invoiceStatusRows, scopedImportRows]);
  const reportComment = buildLocationReportComment(scopeLabel, comparison, reportCases, riskClaims, recurring);
  function exportCsv() {
    downloadTextFile(`offene-bfs-klaerfaelle-${scopeLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`, createCasesCsv(reportCases));
  }
  return (
    <div className="content-stack report-screen">
      <section className="panel period-filter report-period-filter">
        <label className="select-label">
          Report-Zeitraum
          <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>
            {periodOptions.map((period) => (
              <option key={period.id} value={period.id}>{period.label}</option>
            ))}
          </select>
        </label>
        <label className="select-label">
          Standort
          <select value={role === "super_admin" ? selectedReportStandortId : standort.id} onChange={(event) => setSelectedReportStandortId(event.target.value)} disabled={role !== "super_admin"}>
            {role === "super_admin" && <option value="alle">Alle Standorte</option>}
            {selectableStandorte.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
        </label>
        <div>
          <strong>{scopeLabel}</strong>
          <span>{selectedPeriod.detail}</span>
        </div>
      </section>
      <section className="priority-grid report-priority-grid">
        <PriorityCard label="Eingereicht" value={money.format(comparison.currentMetrics.submitted)} hint="Summe Forderungen" period={comparison.currentPeriod.label} tone="blue" />
        <PriorityCard label="Ausgezahlt" value={money.format(comparison.currentMetrics.payout)} hint="BFS-Auszahlungsbetrag" period={comparison.currentPeriod.label} tone="green" />
        <PriorityCard label="Gebührenquote" value={formatFeeRate(comparison.currentMetrics.feeRate)} hint={`Vorjahr ${formatFeeRate(comparison.previousMetrics.feeRate)}`} period={comparison.currentPeriod.label} tone={comparison.currentMetrics.feeRate > comparison.previousMetrics.feeRate && comparison.previousMetrics.feeRate > 0 ? "amber" : "green"} />
        <PriorityCard label="Praxis nachfassen" value={String(reportCases.length)} hint="reportfähige Praxis-Aufgaben" period={comparison.currentPeriod.label} tone={reportCases.length ? "amber" : "green"} info="Enthält echte Praxis-Nachfassfälle, vor allem Rückgaben ohne Ausfallschutz. Saldogeschlossene Zahlung/Grund-Prüfungen werden separat gezählt." />
        <PriorityCard label="Nachfassbetrag" value={money.format(openAmount)} hint={scopeLabel} period={comparison.currentPeriod.label} tone="blue" />
        <PriorityCard label="Zahlung/Grund prüfen" value={String(economicCheckRows.length)} hint="Saldo geschlossen, Beleg offen" period={comparison.currentPeriod.label} tone={economicCheckRows.length ? "amber" : "green"} info="Diese Fälle sind bei BFS geschlossen, aber wirtschaftlich muss noch Zahlung, Neueinreichung oder Storno-Grund belegt werden." />
        <PriorityCard label="Ohne Schutz Risiko" value={String(riskClaims.filter((claim) => claim.assessment === "auffaellig").length)} hint={`${riskClaims.length} Ohne-Schutz-Claims`} period={comparison.currentPeriod.label} tone={riskClaims.some((claim) => claim.assessment === "auffaellig") ? "red" : "green"} />
      </section>
      <section className="panel report-toolbar">
        <div>
          <h2>Report-Center {scopeLabel}</h2>
          <p>{role === "super_admin" ? "Reports werden über den Zeitraum- und Standortfilter erzeugt und können als PDF/Druck oder CSV exportiert werden." : "Standortleitung sieht und exportiert nur den eigenen Standort."}</p>
        </div>
        <button className="secondary-button" onClick={() => window.print()}><Printer size={16} /> Drucken / PDF</button>
        <button className="secondary-button" onClick={exportCsv}><Download size={16} /> CSV</button>
      </section>
      <section className="insight-grid">
        <InsightCard title="Management-Kommentar" items={reportComment} />
        <InsightCard title="Reportinhalte" items={["Monats-/YTD-Kennzahlen", "Praxis-Nachfassfälle", "Zahlung/Grund-Prüfungen und Ohne-Schutz-Risiko"]} />
        <InsightCard title="Operative Maßnahme" items={["Praxis-Nachfassfälle zuerst klären", "Neueinreichungen gegen Brutto-Storno prüfen", "Saldogeschlossene Fälle wirtschaftlich belegen"]} />
      </section>
      <section className="print-report">
        <header>
          <div>
            <span>Orisus BFS Monitor</span>
            <h2>Report: {scopeLabel}</h2>
          </div>
          <p>Erstellt am {formatGermanDate(todayReference.toISOString().slice(0, 10))}</p>
        </header>
        <div className="report-summary">
          <div><strong>{money.format(comparison.currentMetrics.submitted)}</strong><span>{comparison.currentPeriod.label} eingereicht</span></div>
          <div><strong>{money.format(comparison.currentMetrics.payout)}</strong><span>ausgezahlt</span></div>
          <div><strong>{formatFeeRate(comparison.currentMetrics.feeRate)}</strong><span>Gebührenquote</span></div>
          <div><strong>{reportCases.length}</strong><span>Praxis nachfassen</span></div>
          <div><strong>{money.format(openAmount)}</strong><span>Nachfassbetrag</span></div>
        </div>
        <h3>Abschnitt 1: Praxis nachfassen</h3>
        <CasesView cases={reportCases} compact tableScrollable />
        <h3>Abschnitt 2: Laufend ohne Ausfallschutz</h3>
        <RiskView standortId={reportStandortId} importRows={scopedImportRows} periodOverride={selectedPeriod} />
        <h3>Abschnitt 3: Wiederholer ohne Ausfallschutz</h3>
        <RecurringRiskView standortId={reportStandortId} compact importRows={scopedImportRows} />
      </section>
    </div>
  );
}

function buildLocationReportComment(
  scopeLabel: string,
  comparison: ManagementComparison,
  reportCases: BfsCase[],
  riskClaims: RiskClaim[],
  recurring: ReturnType<typeof getRecurringRiskProfiles>
) {
  const suspiciousRisks = riskClaims.filter((claim) => claim.assessment === "auffaellig");
  const oldest = reportCases.reduce((max, fall) => Math.max(max, fall.ageDays), 0);
  const openAmount = reportCases.reduce((sum, fall) => sum + fall.amount, 0);
  return [
    `${scopeLabel}: ${comparison.currentPeriod.label} ${money.format(comparison.currentMetrics.submitted)} eingereicht, Delta Vorjahr ${formatDelta(comparison.submittedDeltaRate)}.`,
    `Gebührenquote ${formatFeeRate(comparison.currentMetrics.feeRate)}, Rückbelastungs-/Stornoquote ${formatPercent(comparison.chargebackRate)}, Wiedereinholung ${formatPercent(comparison.recoveryRate)}.`,
    `${reportCases.length} Praxis-Nachfassfälle mit ${money.format(openAmount)}, ältester Fall ${oldest} Tage.`,
    `${suspiciousRisks.length} auffällige Ohne-Schutz-Claims und ${recurring.length} Wiederholer ohne Schutz für Standortleitung markieren.`
  ];
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
          <button onClick={() => onNavigate("practiceFollowup")}><AlertCircle size={18} /> Praxis nachfassen gruppiert</button>
          <button onClick={() => onNavigate("economicCheck")}><ClipboardCheck size={18} /> Zahlung / Grund prüfen</button>
          <button onClick={() => onNavigate("claims")}><CircleDollarSign size={18} /> Rückbelastungen je Standort</button>
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
    : normalized.includes("warn") || normalized.includes("prüfen") || normalized.includes("vorschlag") || normalized.includes("ohne") || normalized.includes("beobachten")
      ? "amber"
      : normalized.includes("fehler") || normalized.includes("offen") || normalized.includes("sperrhinweis") || normalized.includes("praxisprozess")
        ? "red"
        : "gray";
  return <span className={`status ${tone}`}>{status}</span>;
}

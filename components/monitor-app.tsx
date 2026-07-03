"use client";

import Image from "next/image";
import type { CSSProperties, DependencyList } from "react";
import { startTransition, useEffect, useId, useMemo, useRef, useState } from "react";
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
import type { AppRole, BfsCase, ImportPreviewRow, ParsedImportClaim, ParsedImportMovement, ParsedInvoiceDocument, ParsedInvoiceLine, ParsedInvoiceStatusDocument, ParsedInvoiceStatusRow, RiskClaim, Standort } from "@/lib/types";
import { downloadTextFile } from "@/lib/reporting";
import { enablePasskey, getCurrentSession, getStoredSession, hasSavedPasskey, logout, removePasskey, type DemoSession } from "@/lib/auth";
import { importRowBusinessIdentity, reconcileImportRows } from "@/lib/import-identity";
import { buildCancelledResolutionKeySet, buildClosedResolutionKeySet, buildPaidResolutionKeySet, buildResubmittedResolutionKeySet, caseResolutionIdentityKeys, caseResolutionKeyFromParts, caseResolutionKeys, isAusfallhonorarDescription, normalizeResolutionPart } from "@/lib/case-resolution";
import {
  buildInvoiceQualityProfile,
  buildInvoiceQualityFindingsFromProfiles,
  createInvoiceQualityCsv,
  filterInvoiceQualityFindings,
  invoiceQualityDefaultRecommendation,
  invoiceQualityExportIntro,
  invoiceQualityKpis,
  invoiceQualityTrendLabel,
  type InvoiceQualityFinding,
  type InvoiceQualityProfile
} from "@/lib/invoice-quality-analysis";

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
const payoutShareLabel = (payout: number, submitted: number) => `${formatPercent(submitted ? (payout / submitted) * 100 : 0)} vom Umsatz`;
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
          ["practiceFollowup", "Prüfliste", ClipboardCheck]
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
          ["invoiceBenchmark", "Benchmarking", ClipboardList],
          ["invoicePotential", "Potenzialanalyse", TrendingUp],
          ["invoiceTrends", "Faktor-Trend", TrendingUp],
          ["invoicePatients", "Patientenprofil", Users],
          ["invoiceLocations", "Standortvergleich", Building2]
        ]
      },
      {
        title: "Import & Prüfung",
        items: [
          ["invoiceImport", "Import-Center Rechnungen", FolderUp],
          ["invoiceCatalog", "Katalogprüfung", ClipboardCheck]
        ]
      }
    ]
  },
  {
    title: "Abrechnungsqualität",
    sections: [
      {
        title: "Qualitätssteuerung",
        items: [
          ["billingQualityCockpit", "Qualitätscockpit", LayoutDashboard],
          ["billingQualityChains", "Leistungsketten", ClipboardList],
          ["billingQualityFeedback", "Praxis-Feedback", FileText]
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
          ["practiceFollowup", "Prüfliste", ClipboardCheck]
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
          ["invoiceBenchmark", "Benchmarking", ClipboardList],
          ["invoicePotential", "Potenzialanalyse", TrendingUp],
          ["invoiceTrends", "Faktor-Trend", TrendingUp],
          ["invoicePatients", "Patientenprofil", Users],
          ["invoiceLocations", "Standortvergleich", Building2]
        ]
      },
      {
        title: "Import & Prüfung",
        items: [
          ["invoiceImport", "Import-Center Rechnungen", FolderUp],
          ["invoiceCatalog", "Katalogprüfung", ClipboardCheck]
        ]
      }
    ]
  },
  {
    title: "Abrechnungsqualität",
    sections: [
      {
        title: "Qualitätssteuerung",
        items: [
          ["billingQualityCockpit", "Qualitätscockpit", LayoutDashboard],
          ["billingQualityChains", "Leistungsketten", ClipboardList],
          ["billingQualityFeedback", "Praxis-Feedback", FileText]
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

const billingNavGroups: NavGroup[] = [
  {
    title: "BFS-Rechnungsanalyse",
    sections: [
      {
        title: "Auswertungen",
        items: [
          ["invoiceServices", "Leistungsübersicht", BarChart3],
          ["invoiceBenchmark", "Benchmarking", ClipboardList],
          ["invoicePotential", "Potenzialanalyse", TrendingUp],
          ["invoiceTrends", "Faktor-Trend", TrendingUp],
          ["invoicePatients", "Patientenprofil", Users],
          ["invoiceLocations", "Standortvergleich", Building2]
        ]
      },
      {
        title: "Import & Prüfung",
        items: [
          ["invoiceCatalog", "Katalogprüfung", ClipboardCheck]
        ]
      },
    ]
  },
  {
    title: "Abrechnungsqualität",
    sections: [
      {
        title: "Qualitätssteuerung",
        items: [
          ["billingQualityCockpit", "Qualitätscockpit", LayoutDashboard],
          ["billingQualityChains", "Leistungsketten", ClipboardList],
          ["billingQualityFeedback", "Praxis-Feedback", FileText]
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

type PerfMetric = {
  label: string;
  durationMs: number;
  detail: string;
  at: number;
};

type PerfMetricEventDetail = {
  label: string;
  durationMs: number;
  detail?: string;
};

const perfDiagnosticsStorageKey = "orisus_perf_diagnostics";
const perfDiagnosticsEventName = "orisus:perf-metric";

type ManualCaseResolution = {
  caseKey: string;
  standortId: string;
  patientName: string;
  invoiceNo: string;
  bfsNo: string;
  amount: number;
  reason: string;
  status: "paid_manual" | "resubmitted_manual" | "open_manual" | "cancelled_manual";
  comment: string;
  resolvedAt: string;
  resolvedBy: string;
};

type InvoiceCatalogMapping = {
  sourceCode: string;
  sourceDescription?: string;
  targetCode: string;
  targetDescription: string;
  system: "GOZ" | "GOÄ" | "BEMA" | "Eigen" | "Ignorieren";
  action: "map" | "ignore";
  createdAt?: string;
  createdBy?: string;
};

type ViewHistoryEntry = {
  activeView: string;
  selectedStandortId: string;
};

export default function MonitorApp({ lockedRole, initialView = "custom", requireAuth = true }: MonitorAppProps) {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const appDataLoaded = true;
  const role = lockedRole ?? session?.role ?? "super_admin";
  const [activeView, setActiveView] = useState(() => {
    const storedView = readStoredViewState()?.activeView;
    if (storedView && isKnownViewForRole(storedView, role)) return storedView;
    if (isKnownViewForRole(initialView, role)) return initialView;
    return defaultViewForRole(role);
  });
  const [, setLocationConfigVersion] = useState(0);
  const [selectedStandortId, setSelectedStandortId] = useState(() => {
    const storedStandortId = readStoredViewState()?.selectedStandortId;
    return storedStandortId && isKnownStandortScopeForRole(storedStandortId, role) ? storedStandortId : role === "super_admin" ? "gruppe" : standorte[0].id;
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [viewHistory, setViewHistory] = useState<ViewHistoryEntry[]>([]);
  const [liveImportRows, setLiveImportRows] = useState<ImportPreviewRow[]>([]);
  const [importRowsHydrating, setImportRowsHydrating] = useState(true);
  const [invoiceRows, setInvoiceRows] = useState<ParsedInvoiceDocument[]>([]);
  const [invoiceCatalogMappings, setInvoiceCatalogMappings] = useState<InvoiceCatalogMapping[]>([]);
  const [invoiceStatusDocuments, setInvoiceStatusDocuments] = useState<ParsedInvoiceStatusDocument[]>([]);
  const [manualCaseResolutions, setManualCaseResolutions] = useState<ManualCaseResolution[]>([]);
  const [invoiceRowsLoaded, setInvoiceRowsLoaded] = useState(false);
  const [invoiceStatusLoaded, setInvoiceStatusLoaded] = useState(false);
  const [caseResolutionsLoaded, setCaseResolutionsLoaded] = useState(false);
  const [caseToResolve, setCaseToResolve] = useState<BfsCase | null>(null);
  const [caseResolutionMode, setCaseResolutionMode] = useState<ManualCaseResolution["status"]>("paid_manual");
  const [caseResolveError, setCaseResolveError] = useState("");
  const [caseResolveSaving, setCaseResolveSaving] = useState(false);
  const [perfDiagnosticsEnabled, setPerfDiagnosticsEnabled] = useState(false);
  const [perfMetrics, setPerfMetrics] = useState<PerfMetric[]>([]);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const invoiceRowsLoadRef = useRef<Promise<void> | null>(null);
  const perfDiagnosticsEnabledRef = useRef(false);
  const perfBootStartedAtRef = useRef<number | null>(null);
  const permittedStandorte = useMemo(() => permittedStandorteForRole(role, session), [role, session]);
  const selectedStandort = permittedStandorte.find((standort) => standort.id === selectedStandortId) ?? permittedStandorte[0] ?? standorte[0];
  const isGroupScope = role === "super_admin" && selectedStandortId === "gruppe";
  const privacyScopedImportRows = useMemo(() => scopeImportRowsForRole(liveImportRows, role, permittedStandorte), [liveImportRows, role, permittedStandorte]);
  const hasAssignedStandort = role === "super_admin" || permittedStandorte.length > 0;
  const hasUploadData = privacyScopedImportRows.length > 0;
  const invoiceStatusRows = useMemo(() => invoiceStatusDocuments.flatMap((document) => document.rows), [invoiceStatusDocuments]);
  const emptyDataAllowedViews = ["upload", "preview", "history", "invoiceImport", "invoiceServices", "invoiceCatalog", "invoiceBenchmark", "invoiceTrends", "invoicePatients", "invoicePotential", "invoiceLocations", "billingQualityCockpit", "billingQualityChains", "billingQualityFeedback", "locations", "users", "settings"];
  const groupLevelViews = ["custom", "answers", "benchmark", "claims", "cashflow", "cases", "practiceFollowup", "patientClasses", "locations", "users", "upload", "preview", "history", "invoiceImport", "invoiceServices", "invoiceCatalog", "invoiceBenchmark", "invoiceTrends", "invoicePatients", "invoicePotential", "invoiceLocations", "billingQualityCockpit", "billingQualityChains", "billingQualityFeedback"];
  const pageScopeLabel = role === "abrechnungsmanagement"
    ? "BFS-Rechnungsanalyse"
    : role === "super_admin" && (isGroupScope || groupLevelViews.includes(activeView))
    ? "Alle Standorte"
    : selectedStandort.name;
  const showNoUploadData = !importRowsHydrating && !hasUploadData && !emptyDataAllowedViews.includes(activeView);
  const usesOperationalResolutionMetrics = activeView === "dashboard" || activeView === "custom" || activeView === "answers" || activeView === "benchmark" || activeView === "quality" || activeView === "claims" || activeView === "cashflow" || activeView === "cases" || activeView === "practiceFollowup";
  const needsOperationalCases = activeView === "answers" || activeView === "cases" || activeView === "practiceFollowup";
  const needsInvoiceRowsForAusfallhonorarRule = hasUploadData && usesOperationalResolutionMetrics;
  const effectiveManualCaseResolutions = useMemo(
    () => buildAusfallhonorarAutoCancelledResolutions(privacyScopedImportRows, invoiceRows, invoiceStatusRows, manualCaseResolutions),
    [invoiceRows, invoiceStatusRows, manualCaseResolutions, privacyScopedImportRows]
  );
  const operationalReviewCases = useMeasuredMemo(
    "App operative Fallliste",
    () => needsOperationalCases ? buildUnifiedOperationalReviewCases(privacyScopedImportRows, invoiceStatusRows, effectiveManualCaseResolutions) : [],
    [effectiveManualCaseResolutions, invoiceStatusRows, needsOperationalCases, privacyScopedImportRows],
    (cases) => `${integerNumber.format(cases.length)} Fälle`
  );
  const visibleOperationalReviewCases = useMemo(
    () => needsOperationalCases ? operationalReviewCases.filter((fall) => isGroupScope || fall.standortId === selectedStandort.id) : [],
    [isGroupScope, needsOperationalCases, operationalReviewCases, selectedStandort.id]
  );
  const navGroups = navGroupsForRole(role);
  const nav = flattenNavGroups(navGroups);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const enabled = params.get("perf") === "1";
    perfDiagnosticsEnabledRef.current = enabled;
    setPerfDiagnosticsEnabled(enabled);
    window.localStorage.removeItem(perfDiagnosticsStorageKey);
    if (enabled) {
      perfBootStartedAtRef.current = performance.now();
      recordPerfMetric("Diagnose gestartet", perfBootStartedAtRef.current, "Messmodus aktiv");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePerfMetric = (event: Event) => {
      const detail = (event as CustomEvent<PerfMetricEventDetail>).detail;
      if (!detail) return;
      recordExternalPerfMetric(detail.label, detail.durationMs, detail.detail ?? "");
    };
    window.addEventListener(perfDiagnosticsEventName, handlePerfMetric);
    return () => window.removeEventListener(perfDiagnosticsEventName, handlePerfMetric);
  }, []);

  useEffect(() => {
    let active = true;
    const bootStartedAt = performance.now();
    perfBootStartedAtRef.current = bootStartedAt;
    const syncImportsFromServer = shouldLoadDatasetFromServer(appCacheKeys.importRows);
    const syncCaseResolutionsFromServer = shouldLoadDatasetFromServer(appCacheKeys.caseResolutions);
    const syncInvoiceStatusFromServer = shouldLoadDatasetFromServer(appCacheKeys.invoiceStatusDocuments);
    const storedSession = getStoredSession();
    if (storedSession) {
      setSession(storedSession);
      setSessionChecked(true);
      recordPerfMetric("Lokale Session", bootStartedAt, storedSession.email);
    }
    const sessionStartedAt = performance.now();
    getCurrentSession()
      .then((currentSession) => {
        if (active) setSession(currentSession);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setSessionChecked(true);
        recordPerfMetric("Session geprüft", sessionStartedAt, "Loginstatus");
      });
    applyStoredStandorteConfig();
    setLocationConfigVersion((version) => version + 1);
    const importLoadTimer = window.setTimeout(() => {
      const importStartedAt = performance.now();
      loadStoredImportRowsForStartup(syncImportsFromServer)
        .then((rows) => {
          if (!active) return;
          if (rows.length) setLiveImportRows(rows);
          recordPerfMetric("Importdaten geladen", importStartedAt, `${integerNumber.format(rows.length)} Zeilen · ${syncImportsFromServer ? "Server/Cache-Abgleich" : "Browsercache"}`);
        })
        .catch((error) => {
          recordPerfMetric("Importdaten Fehler", importStartedAt, error instanceof Error ? error.message : "unbekannter Fehler");
        })
        .finally(() => {
          if (active) setImportRowsHydrating(false);
        });
    }, 0);
    const resolutionsStartedAt = performance.now();
    loadManualCaseResolutions({ forceServer: syncCaseResolutionsFromServer })
      .then((resolutions) => {
        if (active) startTransition(() => setManualCaseResolutions(resolutions));
        recordPerfMetric("Manuelle Klärungen", resolutionsStartedAt, `${integerNumber.format(resolutions.length)} Einträge`);
      })
      .catch((error) => {
        recordPerfMetric("Manuelle Klärungen Fehler", resolutionsStartedAt, error instanceof Error ? error.message : "unbekannter Fehler");
      })
      .finally(() => {
        if (active) setCaseResolutionsLoaded(true);
      });
    const statusStartedAt = performance.now();
    loadConfirmedInvoiceStatusDocuments({ forceServer: syncInvoiceStatusFromServer })
      .then((documents) => {
        if (active) startTransition(() => setInvoiceStatusDocuments(documents));
        const rowCount = documents.reduce((sum, document) => sum + document.rows.length, 0);
        recordPerfMetric("Saldo-Status geladen", statusStartedAt, `${integerNumber.format(rowCount)} Zeilen aus ${integerNumber.format(documents.length)} Dokumenten`);
      })
      .catch((error) => {
        recordPerfMetric("Saldo-Status Fehler", statusStartedAt, error instanceof Error ? error.message : "unbekannter Fehler");
      })
      .finally(() => {
        if (active) setInvoiceStatusLoaded(true);
      });
    return () => {
      active = false;
      window.clearTimeout(importLoadTimer);
    };
  }, []);

  useEffect(() => {
    if (!(isInvoiceAnalysisView(activeView) || needsInvoiceRowsForAusfallhonorarRule) || invoiceRowsLoaded || invoiceRowsLoadRef.current) return;
    let active = true;
    const invoiceRowsStartedAt = performance.now();
    const loadPromise = loadConfirmedInvoiceRows({ forceServer: shouldLoadDatasetFromServer(appCacheKeys.invoiceRows) })
      .then((rows) => {
        if (active) startTransition(() => setInvoiceRows(rows));
        recordPerfMetric("Einzelrechnungen geladen", invoiceRowsStartedAt, `${integerNumber.format(rows.length)} Rechnungen`);
      })
      .catch((error) => {
        recordPerfMetric("Einzelrechnungen Fehler", invoiceRowsStartedAt, error instanceof Error ? error.message : "unbekannter Fehler");
      })
      .finally(() => {
        if (active) setInvoiceRowsLoaded(true);
        invoiceRowsLoadRef.current = null;
      });
    invoiceRowsLoadRef.current = loadPromise;
    return () => {
      active = false;
    };
  }, [activeView, invoiceRowsLoaded, needsInvoiceRowsForAusfallhonorarRule]);

  useEffect(() => {
    if (!isInvoiceAnalysisView(activeView)) return;
    let active = true;
    const catalogStartedAt = performance.now();
    loadInvoiceCatalogMappings()
      .then((mappings) => {
        if (active) setInvoiceCatalogMappings(mappings);
        recordPerfMetric("Katalog-Mappings geladen", catalogStartedAt, `${integerNumber.format(mappings.length)} Regeln`);
      })
      .catch((error) => {
        recordPerfMetric("Katalog-Mappings Fehler", catalogStartedAt, error instanceof Error ? error.message : "unbekannter Fehler");
      });
    return () => {
      active = false;
    };
  }, [activeView]);

  useEffect(() => {
    if (!perfDiagnosticsEnabledRef.current || typeof window === "undefined") return;
    const viewStartedAt = performance.now();
    const frameId = window.requestAnimationFrame(() => {
      recordPerfMetric(`Ansicht sichtbar: ${titleFor(activeView)}`, viewStartedAt, `${integerNumber.format(privacyScopedImportRows.length)} Importzeilen · ${integerNumber.format(invoiceRows.length)} Rechnungen`);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [activeView, caseResolutionsLoaded, importRowsHydrating, invoiceRows.length, invoiceRowsLoaded, invoiceStatusLoaded, privacyScopedImportRows.length]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [activeView]);

  useEffect(() => {
    if (!isKnownViewForRole(activeView, role)) {
      setActiveView(defaultViewForRole(role));
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

  if (!appDataLoaded || (importRowsHydrating && !hasUploadData && !emptyDataAllowedViews.includes(activeView)) || (isInvoiceAnalysisView(activeView) && !invoiceRowsLoaded) || (needsOperationalCases && (!caseResolutionsLoaded || !invoiceStatusLoaded))) {
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
    const defaultView = defaultViewForRole(role);
    if (!(activeView === defaultView && (role !== "super_admin" || selectedStandortId === "gruppe"))) pushCurrentViewToHistory();
    if (role === "super_admin") setSelectedStandortId("gruppe");
    setActiveView(defaultView);
    setMobileNavOpen(false);
    openNavSectionForView(defaultView);
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
    setActiveView(isKnownViewForRole(previous.activeView, role) ? previous.activeView : defaultViewForRole(role));
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

  function resolveCaseAsResubmitted(fall: BfsCase) {
    setCaseResolutionMode("resubmitted_manual");
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

  function closeResolveCaseDialog() {
    if (caseResolveSaving) return;
    setCaseToResolve(null);
    setCaseResolveError("");
  }

  function hardReload() {
    writeStoredViewState(activeView, selectedStandortId, role);
    requestHardServerSync();
    window.location.reload();
  }

  const tabFilterStandort = role === "super_admin" ? undefined : selectedStandort;
  const operativeCases = role === "super_admin" ? operationalReviewCases : visibleOperationalReviewCases;

  return (
    <main className={mobileNavOpen ? "app-shell nav-open" : "app-shell"}>
      <button className="mobile-nav-overlay" aria-label="Navigation schließen" onClick={() => setMobileNavOpen(false)} />
      <aside className="sidebar">
        <div className="sidebar-inner">
          <div className="sidebar-top">
            <button type="button" className="brand brand-button" onClick={goToCockpit} aria-label="Zur Zusammenfassung">
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
                <strong>{role === "super_admin" ? "Orisus BFS Monitor" : role === "abrechnungsmanagement" ? "Abrechnungsmanagement" : selectedStandort.name}</strong>
                <span>{session?.email ?? "Nicht angemeldet"}</span>
                <small>{roleLabel(role)} · {isGroupScope || role === "abrechnungsmanagement" ? "Alle Standorte" : selectedStandort.name}</small>
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

      <section className={`workspace${isInvoiceAnalysisView(activeView) ? " invoice-analysis-workspace" : ""}`} ref={workspaceRef}>
        <header className="topbar">
          <button type="button" className="mobile-app-brand" onClick={goToCockpit} aria-label="Zur Zusammenfassung">
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
                ? <GroupDashboard importRows={privacyScopedImportRows} manualCaseResolutions={effectiveManualCaseResolutions} invoiceStatusRows={invoiceStatusRows} />
                : <LocationDashboard standort={selectedStandort} onNavigate={navigateTo} onScopeChange={setSelectedStandortId} importRows={privacyScopedImportRows} peerImportRows={liveImportRows} manualCaseResolutions={effectiveManualCaseResolutions} invoiceStatusRows={invoiceStatusRows} />
            )}
            {activeView === "custom" && <CustomKpiView standort={role === "super_admin" ? undefined : selectedStandort} importRows={privacyScopedImportRows} manualCaseResolutions={effectiveManualCaseResolutions} invoiceStatusRows={invoiceStatusRows} />}
            {activeView === "answers" && <AnswerCockpit scope={role === "super_admin" ? "group" : "location"} standort={tabFilterStandort} cases={operativeCases} onNavigate={navigateTo} importRows={privacyScopedImportRows} manualCaseResolutions={effectiveManualCaseResolutions} invoiceStatusRows={invoiceStatusRows} />}
            {activeView === "benchmark" && role === "super_admin" && <BenchmarkView importRows={privacyScopedImportRows} manualCaseResolutions={effectiveManualCaseResolutions} invoiceStatusRows={invoiceStatusRows} />}
            {activeView === "quality" && <QualityView standort={tabFilterStandort} importRows={privacyScopedImportRows} manualCaseResolutions={effectiveManualCaseResolutions} invoiceStatusRows={invoiceStatusRows} />}
            {activeView === "claims" && <ClaimsFlowView mode="details" standort={tabFilterStandort} importRows={privacyScopedImportRows} manualCaseResolutions={effectiveManualCaseResolutions} invoiceStatusRows={invoiceStatusRows} />}
            {activeView === "cashflow" && <ClaimsFlowView mode="cashflow" standort={tabFilterStandort} importRows={privacyScopedImportRows} manualCaseResolutions={effectiveManualCaseResolutions} invoiceStatusRows={invoiceStatusRows} />}
            {["upload", "preview", "history"].includes(activeView) && <UploadView liveRows={liveImportRows} onRowsChange={setLiveImportRows} statusDocuments={invoiceStatusDocuments} onStatusDocumentsChange={setInvoiceStatusDocuments} />}
            {activeView === "invoiceImport" && <InvoiceImportView invoiceRows={invoiceRows} onRowsChange={setInvoiceRows} />}
            {activeView === "invoiceServices" && <InvoiceServicesView invoiceRows={invoiceRows} catalogMappings={invoiceCatalogMappings} />}
            {activeView === "invoiceCatalog" && <InvoiceCatalogCheckView invoiceRows={invoiceRows} catalogMappings={invoiceCatalogMappings} onMappingsChange={setInvoiceCatalogMappings} />}
            {activeView === "invoiceBenchmark" && <InvoiceBenchmarkView invoiceRows={invoiceRows} />}
            {activeView === "invoiceTrends" && <InvoiceTrendView invoiceRows={invoiceRows} />}
            {activeView === "invoicePatients" && <InvoicePatientValueView invoiceRows={invoiceRows} />}
            {activeView === "invoicePotential" && <InvoicePotentialView invoiceRows={invoiceRows} />}
            {activeView === "invoiceLocations" && <InvoiceLocationsView invoiceRows={invoiceRows} />}
            {activeView === "billingQualityCockpit" && <BillingQualityView invoiceRows={invoiceRows} mode="cockpit" />}
            {activeView === "billingQualityChains" && <BillingQualityView invoiceRows={invoiceRows} mode="chains" />}
            {activeView === "billingQualityFeedback" && <BillingQualityView invoiceRows={invoiceRows} mode="feedback" />}
            {(activeView === "cases" || activeView === "practiceFollowup") && (
              <CasesView
                title="Prüfliste offene Fälle"
                description="Eine gemeinsame Arbeitsliste für alle noch zu prüfenden Abzüge. Die Praxis hakt je Fall ab: bezahlt/geklärt, neu eingereicht oder endgültig storniert."
                cases={role === "super_admin" ? operationalReviewCases : visibleOperationalReviewCases}
                importRows={privacyScopedImportRows}
                invoiceRows={invoiceRows}
                invoiceStatusRows={invoiceStatusRows}
                manualCaseResolutions={effectiveManualCaseResolutions}
                allowedStandortIds={role === "super_admin" ? undefined : [selectedStandort.id]}
                onResolvePaid={resolveCaseAsPaid}
                onResolveResubmitted={resolveCaseAsResubmitted}
                onCancelFinal={cancelCaseFinally}
                enableFilters
                tableScrollable
              />
            )}
            {activeView === "risks" && <RiskView standortId={tabFilterStandort?.id} importRows={privacyScopedImportRows} />}
            {activeView === "repeatRisks" && <RecurringRiskView standortId={tabFilterStandort?.id} importRows={privacyScopedImportRows} />}
            {activeView === "patientClasses" && <PatientClassificationView standort={role === "super_admin" ? undefined : selectedStandort} importRows={privacyScopedImportRows} />}
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
      {perfDiagnosticsEnabled && role === "super_admin" ? (
        <PerformanceDiagnosticsPanel
          metrics={perfMetrics}
          onClose={() => {
            perfDiagnosticsEnabledRef.current = false;
            setPerfDiagnosticsEnabled(false);
            if (typeof window !== "undefined") {
              window.localStorage.removeItem(perfDiagnosticsStorageKey);
              const url = new URL(window.location.href);
              url.searchParams.delete("perf");
              window.history.replaceState(null, "", url.toString());
            }
          }}
        />
      ) : null}
    </main>
  );

  function recordPerfMetric(label: string, startedAt: number, detail = "") {
    if (!perfDiagnosticsEnabledRef.current || typeof performance === "undefined") return;
    const metric: PerfMetric = {
      label,
      durationMs: Math.max(0, performance.now() - startedAt),
      detail,
      at: Date.now()
    };
    setPerfMetrics((current) => [...current.slice(-19), metric]);
    console.info(`[Orisus Performance] ${label}: ${Math.round(metric.durationMs)} ms${detail ? ` · ${detail}` : ""}`);
  }

  function recordExternalPerfMetric(label: string, durationMs: number, detail = "") {
    if (!perfDiagnosticsEnabledRef.current) return;
    const metric: PerfMetric = {
      label,
      durationMs: Math.max(0, durationMs),
      detail,
      at: Date.now()
    };
    setPerfMetrics((current) => [...current.slice(-19), metric]);
    console.info(`[Orisus Performance] ${label}: ${Math.round(metric.durationMs)} ms${detail ? ` · ${detail}` : ""}`);
  }
}

function PerformanceDiagnosticsPanel({ metrics, onClose }: { metrics: PerfMetric[]; onClose: () => void }) {
  const latestMetrics = [...metrics].reverse();
  return (
    <section className="performance-diagnostics" aria-label="Performance Diagnose">
      <div className="performance-diagnostics-head">
        <div>
          <strong>Performance Diagnose</strong>
          <span>nur Admin · Live-Messung</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Performance Diagnose schließen">
          <X size={16} />
        </button>
      </div>
      <div className="performance-diagnostics-list">
        {latestMetrics.length ? latestMetrics.map((metric, index) => (
          <div className="performance-diagnostics-row" key={`${metric.label}-${metric.at}-${index}`}>
            <span>{metric.label}</span>
            <strong>{formatPerformanceDuration(metric.durationMs)}</strong>
            {metric.detail ? <small>{metric.detail}</small> : null}
          </div>
        )) : (
          <p>Noch keine Messpunkte.</p>
        )}
      </div>
    </section>
  );
}

function formatPerformanceDuration(durationMs: number) {
  if (durationMs >= 1000) return `${(durationMs / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} s`;
  return `${Math.round(durationMs)} ms`;
}

function permittedStandorteForRole(role: AppRole, session: DemoSession | null) {
  if (role === "super_admin" || role === "abrechnungsmanagement") return orderedStandorte();
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
        <p>Aktuell sind keine BFS-Abrechnungen im Datenstand. Deshalb werden Cockpit, Auswertungen, Prüfliste, Risiko, Matching und Reports erst wieder befüllt, sobald ein neuer Upload verarbeitet wurde.</p>
      </div>
      <div className="case-summary-grid" aria-label="Leerer Datenstand">
        <article><span>Dateien</span><strong>0</strong></article>
        <article><span>Umsatz eingereicht</span><strong>{money.format(0)}</strong></article>
        <article><span>Prüfliste</span><strong>0</strong></article>
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
  const nav = flattenNavGroups(navGroupsForRole(role));
  return nav.some((section) => section.items.some(([key]) => key === view));
}

function navGroupsForRole(role: AppRole) {
  if (role === "super_admin") return superAdminNavGroups;
  if (role === "abrechnungsmanagement") return billingNavGroups;
  return leadNavGroups;
}

function defaultViewForRole(role: AppRole) {
  return role === "abrechnungsmanagement" ? "invoiceServices" : "custom";
}

function roleLabel(role: AppRole) {
  if (role === "super_admin") return "Super Admin";
  if (role === "abrechnungsmanagement") return "Abrechnungsmanagement";
  return "Standortleitung";
}

function isInvoiceAnalysisView(view: string) {
  return view === "invoiceImport" || view === "invoiceServices" || view === "invoiceCatalog" || view === "invoiceBenchmark" || view === "invoiceTrends" || view === "invoicePatients" || view === "invoicePotential" || view === "invoiceLocations" || view === "billingQualityCockpit" || view === "billingQualityChains" || view === "billingQualityFeedback";
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
    invoiceCatalog: "Katalogprüfung",
    invoiceBenchmark: "Benchmarking",
    invoiceTrends: "Faktor-Trend",
    invoicePatients: "Patientenprofil",
    invoicePotential: "Potenzialanalyse",
    invoiceLocations: "Standortvergleich",
    billingQualityCockpit: "Qualitätscockpit",
    billingQualityChains: "Leistungsketten",
    billingQualityFeedback: "Praxis-Feedback",
    cases: "Prüfliste",
    practiceFollowup: "Prüfliste",
    risks: "Laufend ohne Ausfallschutz",
    repeatRisks: "Wiederholer ohne Ausfallschutz",
    patientClasses: "Patientenklassifizierung",
    locations: "Standorte",
    users: "Nutzerverwaltung",
    settings: "Einstellungen"
  };
  return titles[view] ?? "Orisus BFS Monitor";
}

function useMeasuredMemo<T>(label: string, factory: () => T, deps: DependencyList, detail?: (value: T) => string): T {
  return useMemo(() => {
    const startedAt = typeof performance !== "undefined" ? performance.now() : 0;
    const value = factory();
    if (isPerfDiagnosticsEnabled() && typeof performance !== "undefined") {
      emitPerfMetric(`Berechnung: ${label}`, performance.now() - startedAt, detail?.(value));
    }
    return value;
    // Der Mess-Hook reicht die Dependency-Liste der aufrufenden useMemo-Berechnung bewusst unverändert durch.
    // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps
  }, deps);
}

function isPerfDiagnosticsEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("perf") === "1";
}

function emitPerfMetric(label: string, durationMs: number, detail = "") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PerfMetricEventDetail>(perfDiagnosticsEventName, {
    detail: { label, durationMs, detail }
  }));
}

function caseResolutionDialogTitle(status: ManualCaseResolution["status"]) {
  if (status === "cancelled_manual") return "Fall endgültig stornieren?";
  if (status === "open_manual") return "Fall weiterhin offen lassen?";
  if (status === "resubmitted_manual") return "Fall als neu eingereicht markieren?";
  return "Fall als bezahlt markieren?";
}

function caseResolutionDialogText(status: ManualCaseResolution["status"], patientName: string) {
  if (status === "cancelled_manual") {
    return `${patientName} wird als endgültig storniert gespeichert. Der Vorgang verschwindet aus der Prüfliste, bleibt in der Brutto-Storno-/Rückgabe-Grundmenge enthalten und erhöht endgültig verlorenen Umsatz.`;
  }
  if (status === "open_manual") {
    return `${patientName} wird als geprüft, aber weiterhin offen gespeichert. Der Vorgang bleibt in der Prüfliste sichtbar, wenn Zahlung oder Klärung weiter nachgehalten werden muss.`;
  }
  if (status === "resubmitted_manual") {
    return `${patientName} wird als neu eingereicht gespeichert. Der Vorgang verschwindet aus der Prüfliste und zählt als geklärt durch Ersatzrechnung, aber nicht als bezahlter Geldzufluss.`;
  }
  return `${patientName} wird als wirtschaftlich geklärt/bezahlt gespeichert. Der Vorgang verschwindet aus der Prüfliste und wird als bereits geklärt in den Auswertungen berücksichtigt.`;
}

function caseResolutionDialogAction(status: ManualCaseResolution["status"]) {
  if (status === "cancelled_manual") return "Endgültig stornieren";
  if (status === "open_manual") return "Weiterhin offen speichern";
  if (status === "resubmitted_manual") return "Neu eingereicht speichern";
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
  const scopedRows = useMeasuredMemo("Zusammenfassung Importfilter", () => importRows.filter((row) => {
    if (!relevantStandortNames.has(row.location)) return false;
    const rowStandort = relevantStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedPeriod, rowStandort) : false;
  }), [importRows, relevantStandortNames, relevantStandorte, selectedPeriod], (rows) => `${integerNumber.format(rows.length)} Zeilen`);
  const chartRows = useMeasuredMemo("Zusammenfassung Diagrammfilter", () => importRows.filter((row) => {
    if (!chartStandortNames.has(row.location)) return false;
    const rowStandort = chartStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedChartPeriod, rowStandort) : false;
  }), [chartStandortNames, chartStandorte, importRows, selectedChartPeriod], (rows) => `${integerNumber.format(rows.length)} Zeilen`);
  const summary = useMeasuredMemo("Zusammenfassung Summen", () => summarizeImportRows(scopedRows), [scopedRows], (value) => `${integerNumber.format(value.rows)} Importzeilen`);
  const metrics = useMeasuredMemo("Zusammenfassung KPIs", () => metricsFromImportSummary(summary), [summary], (value) => money.format(value.submitted));
  const stornoReview = useMeasuredMemo("Zusammenfassung Storno-Review", () => stornoReviewFromImportRows(scopedRows, standort?.id, manualCaseResolutions), [scopedRows, standort?.id, manualCaseResolutions], (value) => `${integerNumber.format(value.total)} Fälle`);
  const chartPoints = useMeasuredMemo("Zusammenfassung Diagrammdaten", () => customMonthlyChartPoints(chartRows, manualCaseResolutions, invoiceStatusRows), [chartRows, invoiceStatusRows, manualCaseResolutions], (rows) => `${integerNumber.format(rows.length)} Punkte`);
  const benchmarkRows = useMeasuredMemo("Zusammenfassung Standortvergleich", () => customBenchmarkRows(importRows, selectableStandorte, selectedBenchmarkPeriod, manualCaseResolutions, invoiceStatusRows), [importRows, invoiceStatusRows, manualCaseResolutions, selectableStandorte, selectedBenchmarkPeriod], (rows) => `${integerNumber.format(rows.length)} Standorte`);
  const chartScopeHint = chartStandorte.length === 1 ? chartStandorte[0].name : "alle Standorte";
  const deductionRecovery = useMeasuredMemo("Zusammenfassung Abzugserholung", () => buildDeductionRecovery(importRows, relevantStandorte, selectedPeriod, manualCaseResolutions, invoiceStatusRows), [importRows, invoiceStatusRows, manualCaseResolutions, relevantStandorte, selectedPeriod], (value) => `${money.format(value.grossDeductionAmount)} Brutto-Abzug`);
  const grossDeductionAmount = deductionRecovery.grossDeductionAmount;
  const recoveredStornoAmount = deductionRecovery.recoveredAmount;
  const openStornoAmount = deductionRecovery.openAmount;
  const finalLostAmount = manualCancelledAmountFromRows(scopedRows, manualCaseResolutions);
  const scopeHint = relevantStandorte.length === 1 ? relevantStandorte[0].name : "alle Standorte";
  const locationKpiBreakdown = useMeasuredMemo("Zusammenfassung Standortaufschlüsselung", () => relevantStandorte.map((entry) => {
    const rows = importRows.filter((row) => row.location === entry.name && importRowInPeriod(row, selectedPeriod, entry));
    const locationMetrics = metricsFromImportSummary(summarizeImportRows(rows));
    const locationRecovery = buildDeductionRecovery(importRows, [entry], selectedPeriod, manualCaseResolutions, invoiceStatusRows);
    return {
      name: entry.name,
      metrics: locationMetrics,
      grossDeductionAmount: locationRecovery.grossDeductionAmount,
      recoveredAmount: locationRecovery.recoveredAmount,
      openAmount: locationRecovery.openAmount,
      finalLostAmount: manualCancelledAmountFromRows(rows, manualCaseResolutions)
    };
  }), [importRows, invoiceStatusRows, manualCaseResolutions, relevantStandorte, selectedPeriod], (rows) => `${integerNumber.format(rows.length)} Standorte`);
  const submittedInfo = [
    "Diese Kachel zeigt den eingereichten Forderungsumsatz im gewählten Zeitraum.",
    `Herleitung: Summe aller eingereichten Forderungen für ${scopeHint}: ${money.format(metrics.submitted)}.`,
    formatLocationAmountBreakdown(locationKpiBreakdown.map((entry) => ({ name: entry.name, amount: entry.metrics.submitted })))
  ].join(" ");
  const feeNetInfo = [
    "Diese Kachel zeigt die Netto-BFS-Gebühren ohne Mehrwertsteuer.",
    `Herleitung: Summe der Netto-Gebühren aus dem BFS-Abrechnungsimport für ${scopeHint}: ${money.format(metrics.feeNet)}.`,
    formatLocationAmountBreakdown(locationKpiBreakdown.map((entry) => ({ name: entry.name, amount: entry.metrics.feeNet })))
  ].join(" ");
  const taxInfo = [
    "Diese Kachel zeigt die erkannten Steueranteile auf BFS-Gebühren und EWMA/Adressprüfung.",
    `Herleitung: BFS-MwSt ${money.format(metrics.feeVat)} plus EWMA-MwSt ${money.format(metrics.ewmaVat)} = ${money.format(metrics.feeVat + metrics.ewmaVat)}.`,
    formatLocationAmountBreakdown(locationKpiBreakdown.map((entry) => ({ name: entry.name, amount: entry.metrics.feeVat + entry.metrics.ewmaVat })))
  ].join(" ");
  const ewmaInfo = [
    "Diese Kachel zeigt Zusatzkosten für Meldeamt und Adressprüfung.",
    `Herleitung: EWMA/Adressprüfung netto ${money.format(metrics.ewmaNet)} plus Steuer ${money.format(metrics.ewmaVat)} = ${money.format(metrics.ewmaTotal)}.`,
    formatLocationAmountBreakdown(locationKpiBreakdown.map((entry) => ({ name: entry.name, amount: entry.metrics.ewmaTotal })))
  ].join(" ");
  const payoutInfo = [
    "Diese Kachel zeigt den nach BFS-Abrechnung ausgezahlten Umsatz.",
    `Herleitung: Summe der in den Importdaten ausgewiesenen Auszahlungen für ${scopeHint}: ${money.format(metrics.payout)}.`,
    `Auszahlungsquote: ${payoutShareLabel(metrics.payout, metrics.submitted)}.`,
    formatLocationAmountBreakdown(locationKpiBreakdown.map((entry) => ({ name: entry.name, amount: entry.metrics.payout })))
  ].join(" ");
  const grossDeductionInfo = [
    "Diese Kachel zeigt die Brutto-Grundmenge aus Stornos und Rückgaben.",
    `Herleitung: Rückgaben/Rückbelastungen ${money.format(metrics.returnAmount)} plus Stornos ${money.format(metrics.cancellationAmount)} = ${money.format(grossDeductionAmount)}.`,
    formatLocationAmountBreakdown(locationKpiBreakdown.map((entry) => ({ name: entry.name, amount: entry.grossDeductionAmount })))
  ].join(" ");
  const recoveredInfo = [
    "Diese Kachel zeigt den Teil des Brutto-Abzugs, der bereits wirtschaftlich geklärt ist.",
    `Herleitung: echte Neueinreichungen/Ersatzrechnungen, Ratenpläne laut BFS und manuell geklärte Zahlungen, maximal bis zum Brutto-Abzug angerechnet: ${money.format(recoveredStornoAmount)}. ${recoveryBreakdownText(deductionRecovery)}`,
    formatLocationAmountBreakdown(locationKpiBreakdown.map((entry) => ({ name: entry.name, amount: entry.recoveredAmount })))
  ].join(" ");
  const openDeductionInfo = [
    "Diese Kachel zeigt die noch operative offene Prüfsumme.",
    `Herleitung: Brutto Storno/Rückgabe ${money.format(grossDeductionAmount)} minus bereits geklärt ${money.format(recoveredStornoAmount)} minus endgültig verloren ${money.format(finalLostAmount)} = ${money.format(openStornoAmount)}.`,
    formatLocationAmountBreakdown(locationKpiBreakdown.map((entry) => ({ name: entry.name, amount: entry.openAmount })))
  ].join(" ");
  const finalLostInfo = [
    "Diese Kachel zeigt endgültig als Verlust entschiedene Storno-/Rückgabebeträge.",
    `Herleitung: Summe der manuell als endgültig storniert gespeicherten Fälle im gewählten Zeitraum für ${scopeHint}: ${money.format(finalLostAmount)}.`,
    formatLocationAmountBreakdown(locationKpiBreakdown.map((entry) => ({ name: entry.name, amount: entry.finalLostAmount })))
  ].join(" ");
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

      <section className="custom-kpi-slider" aria-label="Zusammenfassung Geldfluss">
        <PriorityCard
          label="Eingereichter Umsatz"
          value={money.format(metrics.submitted)}
          hint={scopeHint}
          period={selectedPeriod.label}
          tone="blue"
          info={submittedInfo}
        />
        <PriorityCard
          label="BFS-Gebühr netto"
          value={money.format(metrics.feeNet)}
          hint="ohne MwSt"
          period={selectedPeriod.label}
          tone={metrics.feeNet ? "amber" : "green"}
          info={feeNetInfo}
        />
        <PriorityCard
          label="MwSt"
          value={money.format(metrics.feeVat + metrics.ewmaVat)}
          hint={`BFS ${money.format(metrics.feeVat)} · EWMA ${money.format(metrics.ewmaVat)}`}
          period={selectedPeriod.label}
          tone={metrics.feeVat + metrics.ewmaVat ? "amber" : "green"}
          info={taxInfo}
        />
        <PriorityCard
          label="EWMA / Adressprüfung"
          value={money.format(metrics.ewmaTotal)}
          hint={`netto ${money.format(metrics.ewmaNet)}`}
          period={selectedPeriod.label}
          tone={metrics.ewmaTotal ? "amber" : "green"}
          info={ewmaInfo}
        />
        <PriorityCard
          label="Ausgezahlter Umsatz"
          value={money.format(metrics.payout)}
          hint={`${payoutShareLabel(metrics.payout, metrics.submitted)} · nach BFS-Abrechnung`}
          period={selectedPeriod.label}
          tone="green"
          info={payoutInfo}
        />
      </section>

      <section className="custom-kpi-slider custom-kpi-secondary" aria-label="Zusammenfassung offene Prüfsumme">
        <PriorityCard label="Brutto Storno/Rückgabe" value={money.format(grossDeductionAmount)} hint={`${integerNumber.format(stornoReview.total)} Stornos · ${integerNumber.format(metrics.returnCount)} Rückgaben`} period={selectedPeriod.label} tone={grossDeductionAmount ? "amber" : "green"} info={grossDeductionInfo} />
        <PriorityCard label="Bereits geklärt" value={money.format(recoveredStornoAmount)} hint={`${formatPercent(grossDeductionAmount ? (recoveredStornoAmount / grossDeductionAmount) * 100 : 0)} vom Brutto-Abzug`} period={selectedPeriod.label} tone={recoveredStornoAmount ? "green" : grossDeductionAmount ? "amber" : "blue"} info={recoveredInfo} />
        <PriorityCard label="Offene Prüfsumme" value={money.format(openStornoAmount)} hint="Brutto-Abzug minus bereits geklärt" period={selectedPeriod.label} tone={openStornoAmount ? "amber" : "green"} info={openDeductionInfo} />
        <PriorityCard label="Endgültig verloren" value={money.format(finalLostAmount)} hint="manuell endgültig storniert" period={selectedPeriod.label} tone={finalLostAmount ? "red" : "green"} info={finalLostInfo} />
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
          title="Eingereicht vs. Brutto Storno/Rückgabe"
          values={chartPoints}
          barKey="submitted"
          lineKey="grossDeductionAmount"
          barLabel="eingereicht"
          lineLabel="Brutto-Abzug"
          formatBar={money.format}
          formatLine={money.format}
        />
        <CustomDonutChart
          title="Patienten mit Ausfallschutz"
          protectedCount={chartPoints.reduce((sum, point) => sum + point.protectedClaims, 0)}
          unprotectedCount={chartPoints.reduce((sum, point) => sum + point.noProtectionClaims, 0)}
        />
        <CustomDualAxisChart
          title="Brutto-Abzug vs. bereits geklärt"
          values={chartPoints}
          barKey="grossDeductionAmount"
          lineKey="recoveredAmount"
          barLabel="Brutto-Abzug"
          lineLabel="bereits geklärt"
          formatBar={money.format}
          formatLine={money.format}
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
  grossDeductionAmount: number;
  openReviewAmount: number;
  openReviewRate: number;
  recoveredAmount: number;
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
          <p>Zeitraum: {periodLabel}. Umsatz, Forderungsvolumen, Brutto-Abzug, offene Prüfsumme, Schutzquote und Gebührenquote je Standort.</p>
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
              <th>Brutto-Abzug</th>
              <th>Offene Prüfsumme</th>
              <th>bereits geklärt</th>
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
                <td data-metric="grossDeductionAmount" data-value={row.grossDeductionAmount}>{money.format(row.grossDeductionAmount)}</td>
                <td data-metric="openReviewAmount" data-value={row.openReviewAmount}>{money.format(row.openReviewAmount)}<span>{formatPercent(row.openReviewRate)}</span></td>
                <td data-metric="recoveredAmount" data-value={row.recoveredAmount}>{money.format(row.recoveredAmount)}<span>{formatPercent(row.recoveredRate)}</span></td>
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
                <td data-metric="grossDeductionAmount" data-value={totalRow.grossDeductionAmount}>{money.format(totalRow.grossDeductionAmount)}</td>
                <td data-metric="openReviewAmount" data-value={totalRow.openReviewAmount}>{money.format(totalRow.openReviewAmount)}<span>{formatPercent(totalRow.openReviewRate)}</span></td>
                <td data-metric="recoveredAmount" data-value={totalRow.recoveredAmount}>{money.format(totalRow.recoveredAmount)}<span>{formatPercent(totalRow.recoveredRate)}</span></td>
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
  const grossDeductionAmount = rows.reduce((sum, row) => sum + row.grossDeductionAmount, 0);
  const openReviewAmount = rows.reduce((sum, row) => sum + row.openReviewAmount, 0);
  const recoveredAmount = rows.reduce((sum, row) => sum + row.recoveredAmount, 0);
  const noProtectionCount = rows.reduce((sum, row) => sum + row.noProtectionCount, 0);
  const feeAmount = rows.reduce((sum, row) => sum + (row.submitted * row.feeRate) / 100, 0);
  const activeMonths = Math.max(...rows.map((row) => row.activeMonths), 0);
  const averageClaim = claimCount ? submitted / claimCount : 0;
  const monthlyAverage = activeMonths ? submitted / activeMonths : 0;
  const openReviewRate = submitted ? (openReviewAmount / submitted) * 100 : 0;
  const recoveredRate = grossDeductionAmount ? (recoveredAmount / grossDeductionAmount) * 100 : 0;
  const noProtectionRate = claimCount ? (noProtectionCount / claimCount) * 100 : 0;
  const feeRate = submitted ? (feeAmount / submitted) * 100 : 0;

  return {
    submitted,
    monthlyAverage,
    claimCount,
    averageClaim,
    grossDeductionAmount,
    openReviewAmount,
    openReviewRate,
    recoveredAmount,
    recoveredRate,
    noProtectionCount,
    noProtectionRate,
    feeRate,
    signal: customBenchmarkSignal(openReviewRate, recoveredRate, noProtectionRate, feeRate)
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
  grossDeductionAmount: number;
  recoveredAmount: number;
  recoveredStornos: number;
  openStornoAmount: number;
  finalLostAmount: number;
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
  barKey: keyof Pick<CustomChartPoint, "submitted" | "claims" | "cancellations" | "grossDeductionAmount" | "recoveredAmount" | "recoveredStornos" | "openStornoAmount">;
  lineKey: keyof Pick<CustomChartPoint, "submitted" | "claims" | "cancellations" | "grossDeductionAmount" | "recoveredAmount" | "recoveredStornos" | "openStornoAmount">;
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
    grossDeductionAmount: 0,
    recoveredAmount: 0,
    recoveredStornos: 0,
    openStornoAmount: 0,
    finalLostAmount: 0,
    practiceFollowupAmount: 0,
    finalCashflow: 0,
    protectedClaims: 0,
    noProtectionClaims: 0
  };
}

function customBenchmarkRows(importRows: ImportPreviewRow[], benchmarkStandorte: Standort[], period: PeriodOption, manualCaseResolutions: ManualCaseResolution[], invoiceStatusRows: ParsedInvoiceStatusRow[]): CustomBenchmarkRow[] {
  return benchmarkStandorte.map((standort) => {
    const rows = importRows.filter((row) => row.location === standort.name && importRowInPeriod(row, period, standort));
    const summary = summarizeImportRows(rows);
    const metrics = summary.rows ? metricsFromImportSummary(summary) : zeroMetrics();
    const deductionRecovery = buildDeductionRecovery(importRows, [standort], period, manualCaseResolutions, invoiceStatusRows);
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
    const openReviewRate = metrics.submitted ? (deductionRecovery.openAmount / metrics.submitted) * 100 : 0;
    const recoveredRate = deductionRecovery.grossDeductionAmount ? (deductionRecovery.recoveredAmount / deductionRecovery.grossDeductionAmount) * 100 : 0;
    const noProtectionRate = claimCount ? (noProtectionCount / claimCount) * 100 : 0;

    return {
      standort,
      submitted: metrics.submitted,
      monthlyAverage,
      activeMonths,
      claimCount,
      averageClaim,
      grossDeductionAmount: deductionRecovery.grossDeductionAmount,
      openReviewAmount: deductionRecovery.openAmount,
      openReviewRate,
      recoveredAmount: deductionRecovery.recoveredAmount,
      recoveredRate,
      noProtectionCount,
      noProtectionRate,
      feeRate: metrics.feeRate,
      signal: customBenchmarkSignal(openReviewRate, recoveredRate, noProtectionRate, metrics.feeRate)
    };
  }).sort((a, b) => b.submitted - a.submitted);
}

function customBenchmarkSignal(openReviewRate: number, recoveredRate: number, noProtectionRate: number, feeRate: number) {
  if (openReviewRate >= 2 || noProtectionRate >= 10 || feeRate >= 4) return "prüfen";
  if (openReviewRate >= 0.75 || noProtectionRate >= 5 || (openReviewRate > 0 && recoveredRate < 50)) return "beobachten";
  return "ok";
}

function GroupDashboard({ importRows, manualCaseResolutions = [], invoiceStatusRows = [] }: { importRows: ImportPreviewRow[]; manualCaseResolutions?: ManualCaseResolution[]; invoiceStatusRows?: ParsedInvoiceStatusRow[] }) {
  const [groupDetailsReady, setGroupDetailsReady] = useState(false);
  const [groupStandortFilter, setGroupStandortFilter] = useState("alle");
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [cockpitPeriodId, setCockpitPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [chartPeriodId, setChartPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [chartStandortFilter, setChartStandortFilter] = useState("alle");
  const cockpitPeriod = useMemo(() => periodOptions.find((period) => period.id === cockpitPeriodId) ?? periodOptions[0], [periodOptions, cockpitPeriodId]);
  const chartPeriod = useMemo(() => periodOptions.find((period) => period.id === chartPeriodId) ?? cockpitPeriod, [periodOptions, chartPeriodId, cockpitPeriod]);
  const filteredStandorte = useMemo(() => groupStandortFilter === "alle"
    ? orderedStandorte()
    : standorte.filter((standort) => standort.id === groupStandortFilter), [groupStandortFilter]);
  const cockpitScopeLabel = filteredStandorte.length === 1 ? filteredStandorte[0].name : "Alle Standorte";
  const chartStandorte = useMemo(() => chartStandortFilter === "alle"
    ? orderedStandorte()
    : standorte.filter((standort) => standort.id === chartStandortFilter), [chartStandortFilter]);
  const chartScopeLabel = chartStandorte.length === 1 ? chartStandorte[0].name : "Alle Standorte";
  const filteredStandortIds = useMemo(() => new Set(filteredStandorte.map((standort) => standort.id)), [filteredStandorte]);
  const dashboardCases = useMemo(() => groupDetailsReady ? buildUnifiedOperationalReviewCases(importRows, invoiceStatusRows, manualCaseResolutions) : [], [groupDetailsReady, importRows, invoiceStatusRows, manualCaseResolutions]);
  const openCases = useMemo(() => dashboardCases.filter((fall) => {
    if (fall.status.includes("erledigt") || !filteredStandortIds.has(fall.standortId)) return false;
    const fallStandort = filteredStandorte.find((standort) => standort.id === fall.standortId);
    return fallStandort ? shortDateInPeriod(fall.sourceDate, cockpitPeriod, fallStandort) : false;
  }), [cockpitPeriod, dashboardCases, filteredStandortIds, filteredStandorte]);
  const managementComparison = useMemo(
    () => groupDetailsReady
      ? buildManagementComparison(importRows, filteredStandorte, openCases, cockpitPeriod, manualCaseResolutions, invoiceStatusRows)
      : buildLightweightManagementComparison(importRows, filteredStandorte, cockpitPeriod),
    [groupDetailsReady, importRows, filteredStandorte, openCases, cockpitPeriod, manualCaseResolutions, invoiceStatusRows]
  );
  const groupChartSeries = useMemo(() => groupDetailsReady ? buildManagementChartSeries(chartStandorte, importRows, chartPeriod) : [], [chartStandorte, groupDetailsReady, importRows, chartPeriod]);
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
      <CockpitChartFilterBar
        periodOptions={periodOptions}
        selectedPeriodId={chartPeriodId}
        onPeriodChange={setChartPeriodId}
        selectedStandort={chartStandortFilter}
        onStandortChange={setChartStandortFilter}
        scopeLabel={chartScopeLabel}
        detail={chartPeriod.detail}
      />
      {!groupDetailsReady && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Detailauswertung</h2>
              <p>Diagramme, Prüfsummen und Verlauf werden erst bei Bedarf berechnet, damit das Cockpit sofort bedienbar bleibt.</p>
            </div>
            <button className="secondary-button" type="button" onClick={() => setGroupDetailsReady(true)}>
              <BarChart3 size={16} /> Details laden
            </button>
          </div>
        </section>
      )}
      {groupDetailsReady && (
        <>
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
        </>
      )}
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
          <span>Bereits geklärt</span>
          <strong>{integerNumber.format(recoveredCount)}</strong>
        </article>
        <article>
          <span>Offene Prüfsumme</span>
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeValue = activeIndex === null ? undefined : chartValues[Math.min(activeIndex, chartValues.length - 1)];
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
  const activeX = activeIndex === null ? 50 : chartValues.length === 1 ? 50 : (activeIndex / (chartValues.length - 1)) * 100;
  const currentTotal = chartValues.reduce((sum, value) => sum + value.current, 0);
  const previousTotal = chartValues.reduce((sum, value) => sum + value.previous, 0);
  const delta = previousTotal ? ((currentTotal - previousTotal) / previousTotal) * 100 : currentTotal ? 100 : 0;
  const activeCurrentYear = activeValue?.currentYear ?? defaultCurrentYear;
  const activeLabel = activeValue
    ? Number.isInteger(Number(activeValue.label))
      ? monthAxisLabel(activeValue.label, activeCurrentYear)
      : activeValue.label
    : "";
  const normalizedTitle = title.toLowerCase();
  const tone = normalizedTitle.includes("rück") || normalizedTitle.includes("storno")
    ? "risk"
    : normalizedTitle.includes("standort")
      ? "benchmark"
      : "revenue";

  return (
    <div className={`management-combo-chart ${tone}`} aria-label={title} onPointerLeave={() => setActiveIndex(null)}>
      <div className="combo-chart-summary">
        <div className="combo-legend">
          <span><i className="current" /> {defaultCurrentYear}</span>
          <span><i className="previous" /> {defaultPreviousYear}</span>
        </div>
        <strong className={delta >= 0 ? "positive" : "negative"}>{formatDelta(delta)}</strong>
      </div>
      <div className="combo-chart-canvas">
        {activeValue && (
          <div className="combo-chart-tooltip" style={{ left: `${Math.max(16, Math.min(84, activeX))}%` }}>
            <span>{activeValue.context ?? activeLabel}</span>
            <strong>{format(activeValue.current)}</strong>
            <small>{activeLabel} · VJ {format(activeValue.previous)}</small>
          </div>
        )}
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
            <circle key={`${value.label}-previous`} className={index === activeIndex ? "combo-line-point active" : "combo-line-point"} cx={xFor(index)} cy={yFor(value.previous)} r="3.2" />
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

function buildManagementComparison(importRows: ImportPreviewRow[], relevantStandorte: Standort[], openCases: BfsCase[], period?: PeriodOption, manualCaseResolutions: ManualCaseResolution[] = [], invoiceStatusRows: ParsedInvoiceStatusRow[] = []) {
  const currentPeriod = comparableCurrentPeriod(period ?? ytdPeriod(todayReference.getFullYear()));
  const previousPeriod = previousYearPeriod(currentPeriod);
  const currentRows = rowsForSparklinePeriod(importRows, relevantStandorte, currentPeriod);
  const previousRows = rowsForSparklinePeriod(importRows, relevantStandorte, previousPeriod);
  const currentMetrics = metricsFromRows(currentRows);
  const previousMetrics = metricsFromRows(previousRows);
  const deductionRecovery = buildDeductionRecovery(importRows, relevantStandorte, currentPeriod, manualCaseResolutions, invoiceStatusRows);
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
    recoveredByResubmissionAmount: deductionRecovery.recoveredByResubmissionAmount,
    manuallyResubmittedAmount: deductionRecovery.manuallyResubmittedAmount,
    paidByInvoiceStatusAmount: deductionRecovery.paidByInvoiceStatusAmount,
    manuallyPaidAmount: deductionRecovery.manuallyPaidAmount,
    rawRecoveredAmount: deductionRecovery.rawRecoveredAmount,
    finalLostAmount: deductionRecovery.finalLostAmount,
    openDeductionAmount: deductionRecovery.openAmount,
    recoveryRate: deductionAmount ? Math.min(100, (recoveredAmount / deductionAmount) * 100) : 0,
    chargebackRate: currentMetrics.submitted ? (deductionAmount / currentMetrics.submitted) * 100 : 0,
    noProtectionShare: currentMetrics.submitted ? (currentMetrics.noProtectionAmount / currentMetrics.submitted) * 100 : 0,
    openCases: currentOpenCases
  };
}

function buildLightweightManagementComparison(importRows: ImportPreviewRow[], relevantStandorte: Standort[], period?: PeriodOption) {
  const currentPeriod = comparableCurrentPeriod(period ?? ytdPeriod(todayReference.getFullYear()));
  const previousPeriod = previousYearPeriod(currentPeriod);
  const currentMetrics = metricsFromRows(rowsForSparklinePeriod(importRows, relevantStandorte, currentPeriod));
  const previousMetrics = metricsFromRows(rowsForSparklinePeriod(importRows, relevantStandorte, previousPeriod));
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
    deductionAmount: 0,
    recoveredAmount: 0,
    recoveredByResubmissionAmount: 0,
    manuallyResubmittedAmount: 0,
    paidByInvoiceStatusAmount: 0,
    manuallyPaidAmount: 0,
    rawRecoveredAmount: 0,
    finalLostAmount: 0,
    openDeductionAmount: 0,
    recoveryRate: 0,
    chargebackRate: 0,
    noProtectionShare: currentMetrics.submitted ? (currentMetrics.noProtectionAmount / currentMetrics.submitted) * 100 : 0,
    openCases: []
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

function buildLocationSnapshots(
  rowsStandorte: Standort[],
  period: PeriodOption,
  importRows: ImportPreviewRow[],
  openCases: BfsCase[] = [],
  manualCaseResolutions: ManualCaseResolution[] = [],
  invoiceStatusRows: ParsedInvoiceStatusRow[] = []
) {
  return rowsStandorte.map((standort) => {
    const locationRows = importRows.filter((row) => row.location === standort.name && importRowInPeriod(row, period, standort));
    const summary = summarizeImportRows(locationRows);
    const metrics = summary.rows ? metricsFromImportSummary(summary) : zeroMetrics();
    const locationCases = openCases.filter((fall) => fall.standortId === standort.id);
    const openAmount = locationCases.reduce((sum, fall) => sum + fall.amount, 0);
    const oldest = locationCases.reduce((max, fall) => Math.max(max, fall.ageDays), 0);
    const deductionRecovery = buildDeductionRecovery(importRows, [standort], period, manualCaseResolutions, invoiceStatusRows);
    const deductionAmount = deductionRecovery.grossDeductionAmount;
    const recoveredAmount = deductionRecovery.recoveredAmount;
    const openDeductionAmount = deductionRecovery.openAmount;
    const deductionRate = metrics.submitted ? (deductionAmount / metrics.submitted) * 100 : 0;
    const claimCount = locationRows.reduce((sum, row) => sum + (row.parsedClaims?.length ?? 0), 0);
    const noProtectionClaimCount = locationRows.reduce((sum, row) => sum + rowNoProtectionClaims(row).length, 0);
    const noProtectionCaseRate = claimCount ? (noProtectionClaimCount / claimCount) * 100 : 0;
    const riskClaims = riskClaimsFromImportRows(locationRows);
    const suspiciousNoProtectionAmount = riskClaims
      .filter((claim) => claim.assessment === "auffaellig")
      .reduce((sum, claim) => sum + claim.amount, 0);
    const cleanNoProtectionShare = Math.max(metrics.noProtectionAmount - suspiciousNoProtectionAmount, 0) / Math.max(metrics.submitted, 1);
    const suspiciousNoProtectionShare = suspiciousNoProtectionAmount / Math.max(metrics.submitted, 1);
    const riskScore = deductionRate * 2
      + Math.min(35, (openDeductionAmount / Math.max(metrics.submitted, 1)) * 150)
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
      deductionAmount,
      recoveredAmount,
      openDeductionAmount,
      finalLostAmount: deductionRecovery.finalLostAmount,
      recoveryRate: deductionAmount ? Math.min(100, (recoveredAmount / deductionAmount) * 100) : 0,
      deductionRate,
      economicCheckCount: 0,
      economicCheckAmount: 0,
      chargebackRate: deductionRate,
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
              <LocationMetricTile
                label="Auszahlung"
                value={money.format(entry.metrics.payout)}
                current={entry.metrics.payout}
                previous={previous?.metrics.payout ?? 0}
                format={money.format}
                detail={payoutShareLabel(entry.metrics.payout, entry.metrics.submitted)}
              />
              <LocationMetricTile label="Gebühr" value={formatFeeRate(entry.metrics.feeRate)} current={entry.metrics.feeRate} previous={previous?.metrics.feeRate ?? 0} format={formatFeeRate} />
              <span className="location-metric-with-info">
                <MetricInfo title={`Brutto Storno/Rückgabe ${entry.standort.name}`} text={locationChargebackRateInfo(entry)} />
                <LocationMetricTile label="Brutto Storno/Rückgabe" value={money.format(entry.deductionAmount)} current={entry.deductionAmount} previous={previous?.deductionAmount ?? 0} format={money.format} bare />
              </span>
              <LocationMetricTile label="Bereits geklärt" value={money.format(entry.recoveredAmount)} current={entry.recoveredAmount} previous={previous?.recoveredAmount ?? 0} format={money.format} />
              <LocationMetricTile label="Offene Prüfsumme" value={money.format(entry.openDeductionAmount)} current={entry.openDeductionAmount} previous={previous?.openDeductionAmount ?? 0} format={money.format} />
              <LocationMetricTile label="Endgültig verloren" value={money.format(entry.finalLostAmount)} current={entry.finalLostAmount} previous={previous?.finalLostAmount ?? 0} format={money.format} />
              <LocationMetricTile label="Prüfliste" value={String(entry.openCases)} current={entry.openCases} previous={previous?.openCases ?? 0} format={integerNumber.format} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function LocationMetricTile({ label, value, current, previous, format, detail, bare = false }: { label: string; value: string; current: number; previous: number; format: (value: number) => string; detail?: string; bare?: boolean }) {
  const delta = previous ? ((current - previous) / previous) * 100 : current ? 100 : 0;
  const deltaClass = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
  const comparisonLabel = previous
    ? `Vorjahr ${format(previous)} · ${formatDelta(delta)}`
    : `Vorjahr ${format(previous)} · Vergleich startet`;
  const content = (
    <>
      <b>{value}</b>
      {label}
      {detail && <em>{detail}</em>}
      <small className={previous ? deltaClass : "neutral"}>{comparisonLabel}</small>
    </>
  );
  return bare ? content : <span>{content}</span>;
}

function locationChargebackRateInfo(entry: LocationSnapshot) {
  return [
    `Herleitung Brutto Storno/Rückgabe: Rückgaben, Rückläufer und Stornos aus dem BFS-Kontoauszug, bevor die weitere Einordnung erfolgt.`,
    `${money.format(entry.deductionAmount)} / ${money.format(entry.metrics.submitted)} = ${formatPercent(entry.deductionRate)} vom eingereichten Umsatz.`,
    `Bereits geklärt: ${money.format(entry.recoveredAmount)}. Offene Prüfsumme nach Anrechnung: ${money.format(entry.openDeductionAmount)}. Endgültig verloren: ${money.format(entry.finalLostAmount)}.`,
    `Rückgaben/Rückbelastungen: ${entry.metrics.returnCount} Fall/Fälle mit ${money.format(entry.metrics.returnAmount)}. Stornos: ${entry.metrics.cancellationCount} Fall/Fälle mit ${money.format(entry.metrics.cancellationAmount)}.`,
    `Zusatzinfo ohne Ausfallschutz: ${entry.noProtectionClaimCount} von ${entry.claimCount} erkannten Forderungspositionen laufen ohne Schutz, also ${formatPercent(entry.noProtectionCaseRate)}.`
  ].join(" ");
}

function shiftDateYears(date: Date, years: number) {
  return new Date(date.getFullYear() + years, date.getMonth(), date.getDate());
}

function buildComparableLocationGrowth(standort: Standort, importRows: ImportPreviewRow[], period: PeriodOption, manualCaseResolutions: ManualCaseResolution[] = []) {
  const currentPeriod = comparableCurrentPeriod(period);
  const currentPeriodStart = currentPeriod.start ?? new Date(todayReference.getFullYear(), 0, 1);
  const currentPeriodEnd = currentPeriod.end ?? todayReference;
  const firstComparableCurrentDate = shiftDateYears(new Date(`${standort.goLiveDate}T00:00:00`), 1);
  const currentStart = maxDate(currentPeriodStart, firstComparableCurrentDate);
  const currentEnd = currentPeriodEnd;
  if (currentStart > currentEnd) {
    return { comparable: false, delta: 0, currentSubmitted: 0, previousSubmitted: 0 };
  }
  const fairCurrentPeriod: PeriodOption = {
    ...currentPeriod,
    id: `${currentPeriod.id}-${standort.id}-fair-growth`,
    label: `${currentPeriod.label} fair ab ${formatMonth(currentStart)}`,
    start: currentStart,
    end: currentEnd
  };
  const comparablePreviousPeriod: PeriodOption = {
    ...previousYearPeriod(fairCurrentPeriod),
    id: `${fairCurrentPeriod.id}-previous`
  };
  const comparison = buildManagementComparison(importRows, [standort], [], fairCurrentPeriod, manualCaseResolutions);
  const currentSubmitted = comparison.currentMetrics.submitted;
  const previousSubmitted = metricsFromRows(rowsForSparklinePeriod(importRows, [standort], comparablePreviousPeriod)).submitted;
  if (!currentSubmitted || !previousSubmitted) {
    return { comparable: false, delta: 0, currentSubmitted, previousSubmitted };
  }
  return {
    comparable: true,
    delta: ((currentSubmitted - previousSubmitted) / previousSubmitted) * 100,
    currentSubmitted,
    previousSubmitted
  };
}

function buildBenchmarkSignals(snapshots: LocationSnapshot[], importRows: ImportPreviewRow[], period: PeriodOption, manualCaseResolutions: ManualCaseResolution[] = []) {
  const growing = [...snapshots]
    .map((snapshot) => {
      const comparison = buildComparableLocationGrowth(snapshot.standort, importRows, period, manualCaseResolutions);
      return { snapshot, ...comparison };
    })
    .filter((entry) => entry.comparable)
    .sort((a, b) => b.delta - a.delta);
  const expensive = [...snapshots].sort((a, b) => b.metrics.feeRate - a.metrics.feeRate);
  const weakQuality = [...snapshots].sort((a, b) => b.deductionRate - a.deductionRate || b.openDeductionAmount - a.openDeductionAmount || b.noProtectionCaseRate - a.noProtectionCaseRate);
  const goodRecovery = [...snapshots].sort((a, b) => {
    const aComparison = buildManagementComparison(importRows, [a.standort], [], undefined, manualCaseResolutions);
    const bComparison = buildManagementComparison(importRows, [b.standort], [], undefined, manualCaseResolutions);
    return bComparison.recoveryRate - aComparison.recoveryRate;
  });
  return [
    {
      title: "Wer wächst?",
      items: [
        growing[0]
          ? `${growing[0].snapshot.standort.name} führt im fairen Vorjahresvergleich (${formatDelta(growing[0].delta)})`
          : "Noch kein belastbarer Vorjahresvergleich je Standort",
        growing.at(-1)
          ? `${growing.at(-1)?.snapshot.standort.name} ist im vergleichbaren Zeitraum schwächster Punkt`
          : "Neue Standorte werden erst ab vergleichbarem Vorjahresmonat bewertet",
        "Eintrittszeitpunkte sind berücksichtigt; Kehl erst ab April, Ulmet erst ab Juli vergleichbar"
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
        `Brutto-Storno/Rückgabe-Quote dort: ${formatPercent(weakQuality[0]?.deductionRate ?? 0)}`,
        `Ohne-Schutz-Quote dort: ${formatPercent(weakQuality[0]?.noProtectionCaseRate ?? 0)}`
      ]
    },
    {
      title: "Wiedereinholung",
      items: [
        `${goodRecovery[0]?.standort.name ?? "-"} wirkt bei Wiedereinholung am stärksten`,
        "Hoher Brutto-Abzug mit guter Wiedereinholung ist anders zu bewerten als offener Abzug",
        "Niedriger Brutto-Abzug mit schlechter Patientenselektion bleibt Standortthema"
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
  const orderedLocations = useMemo(() => orderedStandorte(), []);
  const scopedRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = standorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedPeriod, rowStandort) : false;
  }), [importRows, selectedPeriod]);
  const openCases = useMemo(() => buildUnifiedOperationalReviewCases(scopedRows, invoiceStatusRows, manualCaseResolutions), [scopedRows, invoiceStatusRows, manualCaseResolutions]);
  const snapshots = useMemo(() => buildLocationSnapshots(orderedLocations, selectedPeriod, importRows, openCases, manualCaseResolutions, invoiceStatusRows), [orderedLocations, selectedPeriod, importRows, openCases, manualCaseResolutions, invoiceStatusRows]);
  const comparisonRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = standorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, comparisonPeriod, rowStandort) : false;
  }), [comparisonPeriod, importRows]);
  const comparisonOpenCases = useMemo(() => buildUnifiedOperationalReviewCases(comparisonRows, invoiceStatusRows, manualCaseResolutions), [comparisonRows, invoiceStatusRows, manualCaseResolutions]);
  const comparisonSnapshots = useMemo(() => buildLocationSnapshots(orderedLocations, comparisonPeriod, importRows, comparisonOpenCases, manualCaseResolutions, invoiceStatusRows), [comparisonOpenCases, comparisonPeriod, importRows, manualCaseResolutions, invoiceStatusRows, orderedLocations]);
  const previousComparisonPeriod = useMemo(() => previousYearPeriod(comparisonPeriod), [comparisonPeriod]);
  const previousComparisonRows = useMemo(() => importRows.filter((row) => {
    const rowStandort = standorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, previousComparisonPeriod, rowStandort) : false;
  }), [importRows, previousComparisonPeriod]);
  const previousComparisonOpenCases = useMemo(() => buildUnifiedOperationalReviewCases(previousComparisonRows, invoiceStatusRows, manualCaseResolutions), [previousComparisonRows, invoiceStatusRows, manualCaseResolutions]);
  const previousComparisonSnapshots = useMemo(() => buildLocationSnapshots(orderedLocations, previousComparisonPeriod, importRows, previousComparisonOpenCases, manualCaseResolutions, invoiceStatusRows), [orderedLocations, previousComparisonOpenCases, previousComparisonPeriod, importRows, manualCaseResolutions, invoiceStatusRows]);
  const highestVolume = useMemo(() => [...snapshots].sort((a, b) => b.metrics.submitted - a.metrics.submitted)[0], [snapshots]);
  const highestFees = useMemo(() => [...snapshots].sort((a, b) => b.metrics.feeRate - a.metrics.feeRate)[0], [snapshots]);
  const highestRisk = useMemo(() => [...snapshots].sort((a, b) => b.riskScore - a.riskScore || b.metrics.submitted - a.metrics.submitted)[0], [snapshots]);
  const benchmarkCharts = useMemo(() => buildGroupDashboardSeries(orderedLocations, selectedPeriod, scopedRows), [orderedLocations, selectedPeriod, scopedRows]);
  const benchmarkSignals = useMemo(() => buildBenchmarkSignals(snapshots, importRows, selectedPeriod, manualCaseResolutions), [snapshots, importRows, manualCaseResolutions, selectedPeriod]);

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
        <PriorityCard label="Auffälligster Standort" value={highestRisk?.standort.name ?? "-"} hint={`${highestRisk?.openCases ?? 0} Prüffälle`} period={selectedPeriod.label} tone={(highestRisk?.riskScore ?? 0) >= 35 ? "red" : "amber"} info="Risikoscore aus Brutto-Storno/Rückgabe, Ohne-Ausfallschutz-Anteil und offener Prüfliste. Eine separate Belegprüf-Liste gibt es nicht mehr." />
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
    `Diese Kachel betrachtet nur erkannte Storno-Zeilen: ${stornoReview.done} von ${stornoReview.total} Storno-Zeilen gelten als bereits geklärt.`,
    `${stornoReview.finalCancelled} Storno-Zeilen sind endgültig storniert und deshalb nicht mehr operativ offen.`,
    "Als bereits geklärt gelten echte Neueinreichung/Ersatzrechnung, wirtschaftlich belegte Zahlung oder eine manuelle Klärentscheidung. Saldo 0 allein reicht nicht.",
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
        <PriorityCard label="Brutto Storno/Rückgabe" value={money.format(grossQualityDeduction)} hint={`${formatPercent(metrics.submitted ? (grossQualityDeduction / metrics.submitted) * 100 : 0)} vom Eingang`} period={selectedPeriod.label} tone={grossQualityDeduction ? "red" : "green"} info="Qualitäts-Grundmenge aus Rückgaben/Rückbelastungen plus Stornos im gewählten Filter. Die wirtschaftliche Restlogik Offene Prüfsumme = Brutto Storno/Rückgabe minus bereits geklärt liegt im Tab Forderungen und Geldfluss bzw. Zusammenfassung." />
        <PriorityCard label="Rückgabe/Rückbelastung" value={money.format(metrics.returnAmount)} hint={`${formatPercent(chargebackShare)} vom Eingang`} period={selectedPeriod.label} tone={chargebackShare ? "red" : "green"} info="Nur Rückgaben/Rückbelastungen aus den BFS-Kontoauszügen. Offene Fälle werden gesammelt in der operativen Prüfliste abgearbeitet." />
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
        <section className="priority-grid storno-review-priority no-protection-risk-grid">
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
            label="Davon geklärt"
            value={String(noProtectionPaymentRisk.resolvedPatients)}
            hint="Zahlung oder Erledigung erkannt"
            period={noProtectionPeriod.label}
            tone={noProtectionPaymentRisk.resolvedPatients ? "green" : "blue"}
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
          <p>Gezählt werden erkannte Storno-Zeilen als Brutto-Grundmenge. Danach wird getrennt: bereits geklärt, endgültig storniert oder weiter zu prüfen.</p>
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
        <PriorityCard
          label="Stornos gesamt"
          value={String(review.total)}
          hint={`${formatPercent(review.stornoRate)} von ${integerNumber.format(review.claimCount)} Gesamtfällen · ${money.format(review.amount)}`}
          period={periodLabel}
          tone={review.total ? "amber" : "green"}
          info={`Stornoquote: ${review.total} erkannte Storno-Zeilen geteilt durch ${integerNumber.format(review.claimCount)} eingereichte Gesamtfälle im Filter.`}
        />
        <PriorityCard label="Bereits geklärt" value={String(review.done)} hint={`${formatPercent(review.doneRate)} der Storno-Grundmenge`} period={periodLabel} tone={review.done ? "green" : "blue"} info="Bereits geklärt meint echte Neueinreichung, belegte Zahlung, Ratenplan laut BFS oder manuelle Zahlungsklärung. Saldo 0 allein reicht dafür nicht." />
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
              <span><b>{formatPercent(entry.stornoRate)}</b> von Gesamtfällen</span>
              <span><b>{entry.done}</b> bereits geklärt</span>
              <span><b>{entry.open}</b> prüfen</span>
              <span><b>{formatPercent(entry.doneRate)}</b> Klärquote</span>
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
  onNavigate,
  onScopeChange,
  importRows,
  peerImportRows,
  manualCaseResolutions = [],
  invoiceStatusRows = []
}: {
  standort: Standort;
  onNavigate: (view: string) => void;
  onScopeChange?: (standortId: string) => void;
  importRows: ImportPreviewRow[];
  peerImportRows: ImportPreviewRow[];
  manualCaseResolutions?: ManualCaseResolution[];
  invoiceStatusRows?: ParsedInvoiceStatusRow[];
}) {
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === selectedPeriodId) ?? periodOptions[0], [periodOptions, selectedPeriodId]);
  const locationStandorte = useMemo(() => [standort], [standort]);
  const locationImportRows = useMeasuredMemo("Standort-Dashboard Importfilter", () => importRows.filter((row) => row.location === standort.name && importRowInPeriod(row, selectedPeriod, standort)), [importRows, selectedPeriod, standort], (rows) => `${integerNumber.format(rows.length)} Zeilen`);
  const importSummary = useMeasuredMemo("Standort-Dashboard Summen", () => summarizeImportRows(locationImportRows), [locationImportRows], (value) => `${integerNumber.format(value.rows)} Importzeilen`);
  const selectedMetrics = useMeasuredMemo("Standort-Dashboard KPIs", () => importSummary.rows ? metricsFromImportSummary(importSummary) : zeroMetrics(), [importSummary], (value) => money.format(value.submitted));
  const periodLabel = importRows.length ? "aktueller Import" : selectedPeriod.label;
  const openCases = useMeasuredMemo(
    "Standort-Dashboard Prüffälle",
    () => buildUnifiedOperationalReviewCases(locationImportRows, invoiceStatusRows, manualCaseResolutions),
    [invoiceStatusRows, locationImportRows, manualCaseResolutions],
    (cases) => `${integerNumber.format(cases.length)} Fälle`
  );
  const managementComparison = useMeasuredMemo("Standort-Dashboard Vergleich", () => buildManagementComparison(importRows, locationStandorte, openCases, undefined, manualCaseResolutions, invoiceStatusRows), [importRows, locationStandorte, openCases, manualCaseResolutions, invoiceStatusRows], (value) => money.format(value.currentMetrics.submitted));
  const peerAverage = useMeasuredMemo("Standort-Dashboard Peer-Schnitt", () => buildAnonymousPeerAverage(peerImportRows), [peerImportRows], (value) => formatFeeRate(value.feeRate));
  const locationKpiInfo = buildKpiDerivationInfo(selectedMetrics, periodLabel);
  const groupChargebackRate = peerAverage.chargebackRate;
  const groupNoProtectionShare = peerAverage.noProtectionShare;
  const locationKpis: KpiCardTuple[] = [
    ["Eingereicht YTD", money.format(managementComparison.currentMetrics.submitted), managementComparison.currentPeriod.label, locationKpiInfo.submitted],
    ["Vorjahr YTD", money.format(managementComparison.previousMetrics.submitted), managementComparison.previousPeriod.label],
    ["Delta Vorjahr", money.format(managementComparison.submittedDelta), formatDelta(managementComparison.submittedDeltaRate), undefined, managementComparison.currentPeriod.label],
    ["Gebührenquote", formatFeeRate(managementComparison.currentMetrics.feeRate), `Ø Gruppe ${formatFeeRate(peerAverage.feeRate)}`],
    ["Rückbelastungsquote", formatPercent(managementComparison.chargebackRate), `Ø Gruppe ${formatPercent(groupChargebackRate)}`],
    ["Ohne-Ausfallschutz-Anteil", formatPercent(managementComparison.noProtectionShare), `Ø Gruppe ${formatPercent(groupNoProtectionShare)}`],
    ["Prüfliste", String(openCases.length), `${openCases.reduce((max, fall) => Math.max(max, fall.ageDays), 0)} Tage ältester Fall`, "Eine operative Liste für offene Fälle. Je Fall wird bezahlt/geklärt oder endgültig storniert markiert."],
    ["Patientenqualität", patientQualityMixLabel(importRows, standort.id), "A/B/C/D-Mix"]
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
      <KpiGrid cards={locationKpis} className="cockpit-kpi-grid" />
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
            <button className="primary-button" onClick={() => onNavigate("practiceFollowup")}><ClipboardCheck size={16} /> Prüfliste</button>
            <button className="secondary-button" onClick={() => onNavigate("risks")}><ShieldCheck size={16} /> Risiko</button>
            <button className="secondary-button" onClick={() => onNavigate("claims")}><ReceiptText size={16} /> Geldfluss</button>
          </div>
        </article>
        <article className="panel process-panel">
          <h2>Bearbeitungslogik</h2>
          <div className="stacked-checks">
            <span>1. Brutto Storno/Rückgabe erkennen</span>
            <span>2. Neueinreichung oder Zahlung belegen</span>
            <span>3. Offene Prüfsumme in der Prüfliste entscheiden</span>
          </div>
        </article>
      </section>
      <section className="panel operative-entry-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Prüfung & Fallarbeit</span>
            <h2>Operative Schnellantworten {standort.name}</h2>
            <p>Konkrete Patienten, offene Prüffälle und Reports werden hier weiterbearbeitet.</p>
          </div>
        </div>
        <AnswerCockpit scope="location" standort={standort} cases={openCases} onNavigate={onNavigate} compact importRows={importRows} hasImportDataset={importRows.length > 0} manualCaseResolutions={manualCaseResolutions} invoiceStatusRows={invoiceStatusRows} />
      </section>
      <CasesView title="Prüfliste offene Fälle" cases={openCases} compact />
    </div>
  );
}

function AnswerCockpit({
  scope,
  standort,
  cases: rows,
  onNavigate,
  compact = false,
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
  const scopedImportRows = useMeasuredMemo("Schnellantworten Importfilter", () => importRows.filter((row) => {
    const rowStandort = relevantStandorte.find((entry) => entry.name === row.location);
    return rowStandort ? importRowInPeriod(row, selectedPeriod, rowStandort) : false;
  }), [importRows, relevantStandorte, selectedPeriod], (rows) => `${integerNumber.format(rows.length)} Zeilen`);
  const scopedRows = useMeasuredMemo("Schnellantworten Fallliste", () => importRows.length
    ? buildUnifiedOperationalReviewCases(scopedImportRows, invoiceStatusRows, manualCaseResolutions)
    : rows.filter((fall) => relevantStandortIds.has(fall.standortId)), [importRows.length, invoiceStatusRows, manualCaseResolutions, scopedImportRows, rows, relevantStandortIds], (cases) => `${integerNumber.format(cases.length)} Fälle`);
  const importSummary = useMeasuredMemo("Schnellantworten Summen", () => summarizeImportRows(scopedImportRows), [scopedImportRows], (value) => `${integerNumber.format(value.rows)} Importzeilen`);
  const selectedMetrics = useMeasuredMemo("Schnellantworten KPIs", () => importSummary.rows ? metricsFromImportSummary(importSummary) : periodMetrics ?? zeroMetrics(), [importSummary, periodMetrics], (value) => money.format(value.submitted));
  const openCases = useMemo(() => scopedRows.filter((fall) => !fall.status.includes("erledigt")), [scopedRows]);
  const openCaseAmount = useMemo(() => openCases.reduce((sum, fall) => sum + fall.amount, 0), [openCases]);
  const chargebacks = useMemo(() => openCases.filter((fall) => fall.reason.includes("Rückgabe") || fall.reason.includes("Rückbelastung")), [openCases]);
  const noProtectionClaims = useMeasuredMemo("Schnellantworten Ohne-Schutz-Risiken", () => riskClaimsFromImportRows(scopedImportRows), [scopedImportRows], (claims) => `${integerNumber.format(claims.length)} Positionen`);
  const noProtectionPaymentRisk = useMeasuredMemo("Schnellantworten Nichtzahler", () => summarizeNoProtectionPaymentRisk(noProtectionClaims), [noProtectionClaims], (value) => money.format(value.unpaidAmount));
  const recurringRisks = useMeasuredMemo("Schnellantworten Wiederholer", () => getRecurringRiskProfiles(
    relevantStandorte.length === 1 ? relevantStandorte[0].id : undefined,
    scopedImportRows,
    hasImportDataset
  ).filter((profile) => relevantStandorte.some((entry) => entry.name === profile.standortName)), [relevantStandorte, scopedImportRows, hasImportDataset], (profiles) => `${integerNumber.format(profiles.length)} Profile`);
  const submitted = selectedMetrics.submitted;
  const claimCount = useMemo(() => importRowsClaimCount(scopedImportRows), [scopedImportRows]);
  const averageInvoiceValue = claimCount ? submitted / claimCount : 0;
  const payout = selectedMetrics.payout;
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
  const resolvedPeriodLabel = selectedPeriod.label;
  const deductionRecovery = useMeasuredMemo("Schnellantworten Abzugserholung", () => buildDeductionRecovery(importRows, relevantStandorte, selectedPeriod, manualCaseResolutions, invoiceStatusRows), [importRows, invoiceStatusRows, manualCaseResolutions, relevantStandorte, selectedPeriod], (value) => money.format(value.openAmount));
  const grossDeductionAmount = deductionRecovery.grossDeductionAmount;
  const recoveredAmount = deductionRecovery.recoveredAmount;
  const openDeductionAmount = deductionRecovery.openAmount;
  const grossDeductionRate = submitted ? (grossDeductionAmount / submitted) * 100 : 0;
  const locationAnswerBreakdown = useMeasuredMemo("Schnellantworten Standortaufschlüsselung", () => relevantStandorte.map((entry) => {
    const rows = importRows.filter((row) => row.location === entry.name && importRowInPeriod(row, selectedPeriod, entry));
    const locationMetrics = metricsFromImportSummary(summarizeImportRows(rows));
    const locationClaimCount = importRowsClaimCount(rows);
    const locationRecovery = buildDeductionRecovery(importRows, [entry], selectedPeriod, manualCaseResolutions, invoiceStatusRows);
    const locationCases = scopedRows.filter((fall) => fall.standortId === entry.id && !fall.status.includes("erledigt"));
    const locationNoProtectionPaymentRisk = summarizeNoProtectionPaymentRisk(riskClaimsFromImportRows(rows));
    const locationRecurring = getRecurringRiskProfiles(entry.id, rows, hasImportDataset)
      .filter((profile) => profile.standortName === entry.name);
    return {
      name: entry.name,
      metrics: locationMetrics,
      claimCount: locationClaimCount,
      averageInvoiceValue: locationClaimCount ? locationMetrics.submitted / locationClaimCount : 0,
      grossDeductionAmount: locationRecovery.grossDeductionAmount,
      recoveredAmount: locationRecovery.recoveredAmount,
      openAmount: locationRecovery.openAmount,
      openCaseCount: locationCases.length,
      noProtectionUnpaidAmount: locationNoProtectionPaymentRisk.unpaidAmount,
      noProtectionUnpaidPatients: locationNoProtectionPaymentRisk.unpaidPatients,
      recurringCount: locationRecurring.length
    };
  }), [hasImportDataset, importRows, invoiceStatusRows, manualCaseResolutions, relevantStandorte, scopedRows, selectedPeriod], (rows) => `${integerNumber.format(rows.length)} Standorte`);
  const answerInfo = useMemo(() => buildAnswerCardInfo({
    periodLabel: resolvedPeriodLabel,
    scopeLabel: selectedStandortLabel,
    metrics: selectedMetrics,
    openCases,
    chargebacks,
    recurringRisks,
    oldest,
    openCaseAmount,
    averageInvoiceValue,
    claimCount,
    deductionRecovery,
    noProtectionPaymentRisk,
    locationBreakdown: locationAnswerBreakdown
  }), [averageInvoiceValue, chargebacks, claimCount, deductionRecovery, locationAnswerBreakdown, noProtectionPaymentRisk, openCaseAmount, openCases, oldest, recurringRisks, resolvedPeriodLabel, selectedMetrics, selectedStandortLabel]);

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
        <AnswerMetricCard title="Umsatz eingereicht" value={money.format(submitted)} hint={resolvedPeriodLabel} periodLabel={resolvedPeriodLabel} info={answerInfo.submitted} onClick={() => onNavigate("claims")} />
        <AnswerMetricCard title="Ø Rechnungswert" value={money.format(averageInvoiceValue)} hint={`${integerNumber.format(claimCount)} Rechnungen`} periodLabel={resolvedPeriodLabel} info={answerInfo.averageInvoiceValue} onClick={() => onNavigate("claims")} />
        <AnswerMetricCard title="BFS-Kosten" value={money.format(fees)} hint={`Gebühr ${money.format(feeNet)} · MwSt ${money.format(feeVat)}${ewmaTotal ? ` · EWMA ${money.format(ewmaTotal)}` : ""}`} periodLabel={resolvedPeriodLabel} info={answerInfo.fees} onClick={() => onNavigate("claims")} />
        <AnswerMetricCard title="Umsatz ausgezahlt" value={money.format(payout)} hint={payoutShareLabel(payout, submitted)} periodLabel={resolvedPeriodLabel} info={answerInfo.payout} onClick={() => onNavigate("claims")} />
        <AnswerMetricCard title="Ohne Ausfallschutz" value={money.format(noProtectionAmount)} hint={resolvedPeriodLabel} periodLabel={resolvedPeriodLabel} info={answerInfo.noProtection} onClick={() => onNavigate("risks")} />
        <AnswerMetricCard title="Ohne Schutz nicht gezahlt" value={money.format(noProtectionPaymentRisk.unpaidAmount)} hint={`${integerNumber.format(noProtectionPaymentRisk.unpaidPatients)} Patienten · ${formatPercent(noProtectionPaymentRisk.unpaidRate)}`} periodLabel={resolvedPeriodLabel} info={answerInfo.noProtectionUnpaid} onClick={() => onNavigate("risks")} />
        <AnswerMetricCard title="Brutto Storno/Rückgabe" value={money.format(grossDeductionAmount)} hint={`${formatPercent(grossDeductionRate)} vom Eingang`} periodLabel={resolvedPeriodLabel} info={answerInfo.stornoTotal} onClick={() => onNavigate("cashflow")} />
        <AnswerMetricCard title="Bereits geklärt" value={money.format(recoveredAmount)} hint={`${formatPercent(deductionRecovery.recoveryRate)} vom Brutto-Abzug`} periodLabel={resolvedPeriodLabel} info={answerInfo.stornoDone} onClick={() => onNavigate("cashflow")} />
        <AnswerMetricCard title="Offene Prüfsumme" value={money.format(openDeductionAmount)} hint={`${integerNumber.format(openCases.length)} Fälle in der Prüfliste`} periodLabel={resolvedPeriodLabel} info={answerInfo.stornoOpen} onClick={() => onNavigate("practiceFollowup")} />
        <AnswerMetricCard title="Wiederholer" value={String(recurringRisks.length)} hint="Patienten mehrfach ohne Schutz" periodLabel={resolvedPeriodLabel} info={answerInfo.recurring} onClick={() => onNavigate("repeatRisks")} />
      </div>
    </section>
  );
}

function AnswerMetricCard({ title, value, hint, trend, periodLabel, info, onClick }: { title: string; value: string; hint: string; trend?: AnswerSparklineTrend; periodLabel: string; info: string; onClick: () => void }) {
  return (
    <article className="answer-card">
      <MetricInfo title={title} text={info} />
      <button className="answer-card-action" onClick={onClick}>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
        {trend && <AnswerSparkline trend={trend} />}
        <small className="period-note">{periodLabelFromHint(periodLabel)}</small>
      </button>
    </article>
  );
}

function buildAnswerCardInfo({ periodLabel, scopeLabel, metrics, openCases, chargebacks, recurringRisks, oldest, openCaseAmount, averageInvoiceValue, claimCount, deductionRecovery, noProtectionPaymentRisk, locationBreakdown }: {
  periodLabel: string;
  scopeLabel: string;
  metrics: BfsMetrics;
  openCases: BfsCase[];
  chargebacks: BfsCase[];
  recurringRisks: ReturnType<typeof getRecurringRiskProfiles>;
  oldest: number;
  openCaseAmount: number;
  averageInvoiceValue: number;
  claimCount: number;
  deductionRecovery: ReturnType<typeof buildDeductionRecovery>;
  noProtectionPaymentRisk: ReturnType<typeof summarizeNoProtectionPaymentRisk>;
  locationBreakdown: {
    name: string;
    metrics: BfsMetrics;
    claimCount: number;
    averageInvoiceValue: number;
    grossDeductionAmount: number;
    recoveredAmount: number;
    openAmount: number;
    openCaseCount: number;
    noProtectionUnpaidAmount: number;
    noProtectionUnpaidPatients: number;
    recurringCount: number;
  }[];
}) {
  const openAmount = openCaseAmount;
  const chargebackAmount = chargebacks.reduce((sum, fall) => sum + fall.amount, 0);
  const feeTotal = metrics.fees;
  const feeNet = metrics.feeNet || feeTotal;
  const taxTotal = metrics.feeVat + metrics.ewmaVat;
  return {
    submitted: [
      "Diese Kachel zeigt den eingereichten Forderungsumsatz im gewählten Zeitraum.",
      `Herleitung: Summe aller erkannten BFS-Forderungsbeträge für ${scopeLabel}: ${money.format(metrics.submitted)}.`,
      formatLocationAmountBreakdown(locationBreakdown.map((entry) => ({ name: entry.name, amount: entry.metrics.submitted })))
    ].join(" "),
    averageInvoiceValue: [
      "Diese Kachel zeigt den durchschnittlichen Wert je erkannter Rechnung/Forderung.",
      `Herleitung: Eingereichter Umsatz ${money.format(metrics.submitted)} geteilt durch ${integerNumber.format(claimCount)} erkannte Rechnungen/Forderungen = ${money.format(averageInvoiceValue)}.`,
      formatLocationAverageInvoiceBreakdown(locationBreakdown)
    ].join(" "),
    payout: [
      "Diese Kachel zeigt den nach BFS-Abrechnung ausgezahlten Umsatz.",
      `Herleitung: Summe der erkannten Auszahlungsbeträge im Zeitraum ${periodLabel} für ${scopeLabel}: ${money.format(metrics.payout)}.`,
      `Auszahlungsquote: ${payoutShareLabel(metrics.payout, metrics.submitted)}.`,
      formatLocationAmountBreakdown(locationBreakdown.map((entry) => ({ name: entry.name, amount: entry.metrics.payout })))
    ].join(" "),
    open: `Herleitung: Summe der Fälle in der gemeinsamen Prüfliste im aktuellen Standortfilter ${scopeLabel}. Zeitraum: ${periodLabel}. Gezählt werden ${openCases.length} Fälle mit zusammen ${money.format(openAmount)}. Je Fall wird nur noch entschieden: bezahlt/geklärt oder endgültig storniert.`,
    chargebacks: `Herleitung: Gezählt werden offene Fälle mit Rückgabe oder Rückbelastung im Zeitraum ${periodLabel} für ${scopeLabel}. Aktuell: ${chargebacks.length} Rückläufer mit ${money.format(chargebackAmount)} offenem Betrag. Stornos werden in den separaten Qualitäts- und Geldflussansichten ausgewertet.`,
    noProtection: [
      "Diese Kachel zeigt den Risikobestand ohne Ausfallschutz.",
      `Herleitung: Summe aller Forderungen und erkannten Bewegungen ohne Ausfallschutz im Zeitraum ${periodLabel} für ${scopeLabel}: ${money.format(metrics.noProtectionAmount)}. Ohne Ausfallschutz ist ein Risikobestand, nicht automatisch ein offener Klärfall.`,
      formatLocationAmountBreakdown(locationBreakdown.map((entry) => ({ name: entry.name, amount: entry.metrics.noProtectionAmount })))
    ].join(" "),
    noProtectionUnpaid: [
      "Diese Kachel zeigt den Teil der Ohne-Ausfallschutz-Patienten mit erkannter Nichtzahlung.",
      `Herleitung: ${integerNumber.format(noProtectionPaymentRisk.unpaidPatients)} von ${integerNumber.format(noProtectionPaymentRisk.totalPatients)} Ohne-Schutz-Patienten haben eine nicht erledigte Storno-, Rückgabe- oder Rückbelastungsbewegung. Nichtzahlungsquote: ${formatPercent(noProtectionPaymentRisk.unpaidRate)}. Erkannte kritische Summe: ${money.format(noProtectionPaymentRisk.unpaidAmount)}.`,
      `${formatLocationAmountBreakdown(locationBreakdown.map((entry) => ({ name: entry.name, amount: entry.noProtectionUnpaidAmount })))} ${formatLocationCountBreakdown(locationBreakdown.map((entry) => ({ name: entry.name, count: entry.noProtectionUnpaidPatients })), "Patienten")}`
    ].join(" "),
    recurring: [
      "Diese Kachel zeigt Patienten mit mehrfacher Ohne-Ausfallschutz-Historie.",
      `Herleitung: Patientenprofile mit mehrfachen Ohne-Ausfallschutz-Ereignissen im Zeitraum ${periodLabel} für ${scopeLabel}: ${integerNumber.format(recurringRisks.length)} Wiederholer.`,
      formatLocationCountBreakdown(locationBreakdown.map((entry) => ({ name: entry.name, count: entry.recurringCount })), "Wiederholer")
    ].join(" "),
    fees: [
      "Diese Kachel zeigt die gesamten erkannten BFS-Kosten inklusive Steuer und EWMA.",
      `Herleitung: angezeigter Kostenwert aus dem BFS-Import ${money.format(feeTotal)}. Darin bzw. daneben ausgewiesen: Gebühr netto ${money.format(feeNet)}, Steuer/Zusatzsteuer ${money.format(taxTotal)} und EWMA/Adressprüfung ${money.format(metrics.ewmaTotal)}.`,
      formatLocationAmountBreakdown(locationBreakdown.map((entry) => ({ name: entry.name, amount: entry.metrics.fees })))
    ].join(" "),
    stornoTotal: [
      "Diese Kachel zeigt die Brutto-Grundmenge aus Stornos und Rückgaben.",
      `Herleitung: alle erkannten Rückgaben, Rückbelastungen und Stornos im Zeitraum ${periodLabel} für ${scopeLabel}: ${money.format(deductionRecovery.grossDeductionAmount)} aus ${metrics.returnCount + metrics.cancellationCount} erkannten Abzugsbewegungen.`,
      formatLocationAmountBreakdown(locationBreakdown.map((entry) => ({ name: entry.name, amount: entry.grossDeductionAmount })))
    ].join(" "),
    stornoDone: [
      "Diese Kachel zeigt den Teil des Brutto-Abzugs, der bereits wirtschaftlich geklärt ist.",
      `Herleitung: Neueinreichung/Ersatzrechnung, Ratenplan laut BFS oder manuell belegte Zahlung/Klärung, maximal bis zum Brutto-Abzug angerechnet: ${money.format(deductionRecovery.recoveredAmount)} bzw. ${formatPercent(deductionRecovery.recoveryRate)} vom Brutto-Abzug.`,
      formatLocationAmountBreakdown(locationBreakdown.map((entry) => ({ name: entry.name, amount: entry.recoveredAmount })))
    ].join(" "),
    stornoOpen: [
      "Diese Kachel zeigt die noch operative offene Prüfsumme.",
      `Herleitung: Offene Prüfsumme = Brutto Storno/Rückgabe ${money.format(deductionRecovery.grossDeductionAmount)} minus bereits geklärt ${money.format(deductionRecovery.recoveredAmount)} minus endgültig verloren ${money.format(deductionRecovery.finalLostAmount)} = ${money.format(deductionRecovery.openAmount)}.`,
      `${formatLocationAmountBreakdown(locationBreakdown.map((entry) => ({ name: entry.name, amount: entry.openAmount })))} ${formatLocationCountBreakdown(locationBreakdown.map((entry) => ({ name: entry.name, count: entry.openCaseCount })), "offene Fälle")}`
    ].join(" "),
    oldest: `Herleitung: Höchstes Alter unter allen Fällen der gemeinsamen Prüfliste im aktuellen Filter ${scopeLabel}. Zeitraum: aktueller Bearbeitungsstand mit fachlicher Einordnung zum Zeitraum ${periodLabel}. Aktueller Wert: ${oldest} Tage.`
  };
}

type AnswerSparklineTrend = {
  points: number[];
  tone: "green" | "amber" | "red";
  label: string;
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
  const standortCache = rowsForPeriodCache.get(importRows);
  const periodCache = standortCache?.get(relevantStandorte);
  const cached = periodCache?.get(period);
  if (cached) return cached;

  const rows = importRows.filter((row) => {
    const standort = relevantStandorte.find((entry) => entry.name === row.location);
    return standort ? importRowInPeriod(row, period, standort) : false;
  });
  let nextStandortCache = standortCache;
  if (!nextStandortCache) {
    nextStandortCache = new WeakMap<Standort[], WeakMap<PeriodOption, ImportPreviewRow[]>>();
    rowsForPeriodCache.set(importRows, nextStandortCache);
  }
  let nextPeriodCache = nextStandortCache.get(relevantStandorte);
  if (!nextPeriodCache) {
    nextPeriodCache = new WeakMap<PeriodOption, ImportPreviewRow[]>();
    nextStandortCache.set(relevantStandorte, nextPeriodCache);
  }
  nextPeriodCache.set(period, rows);
  return rows;
}

function buildDeductionRecovery(importRows: ImportPreviewRow[], relevantStandorte: Standort[], period: PeriodOption, manualCaseResolutions: ManualCaseResolution[] = [], invoiceStatusRows: ParsedInvoiceStatusRow[] = []) {
  const standortCache = deductionRecoveryCache.get(importRows);
  const periodCache = standortCache?.get(relevantStandorte);
  const resolutionCache = periodCache?.get(period);
  const statusCache = resolutionCache?.get(manualCaseResolutions);
  const cached = statusCache?.get(invoiceStatusRows);
  if (cached) return cached;

  const recovery = buildDeductionRecoveryUncached(importRows, relevantStandorte, period, manualCaseResolutions, invoiceStatusRows);
  let nextStandortCache = standortCache;
  if (!nextStandortCache) {
    nextStandortCache = new WeakMap<Standort[], WeakMap<PeriodOption, WeakMap<ManualCaseResolution[], WeakMap<ParsedInvoiceStatusRow[], ReturnType<typeof buildDeductionRecoveryUncached>>>>>();
    deductionRecoveryCache.set(importRows, nextStandortCache);
  }
  let nextPeriodCache = nextStandortCache.get(relevantStandorte);
  if (!nextPeriodCache) {
    nextPeriodCache = new WeakMap<PeriodOption, WeakMap<ManualCaseResolution[], WeakMap<ParsedInvoiceStatusRow[], ReturnType<typeof buildDeductionRecoveryUncached>>>>();
    nextStandortCache.set(relevantStandorte, nextPeriodCache);
  }
  let nextResolutionCache = nextPeriodCache.get(period);
  if (!nextResolutionCache) {
    nextResolutionCache = new WeakMap<ManualCaseResolution[], WeakMap<ParsedInvoiceStatusRow[], ReturnType<typeof buildDeductionRecoveryUncached>>>();
    nextPeriodCache.set(period, nextResolutionCache);
  }
  let nextStatusCache = nextResolutionCache.get(manualCaseResolutions);
  if (!nextStatusCache) {
    nextStatusCache = new WeakMap<ParsedInvoiceStatusRow[], ReturnType<typeof buildDeductionRecoveryUncached>>();
    nextResolutionCache.set(manualCaseResolutions, nextStatusCache);
  }
  nextStatusCache.set(invoiceStatusRows, recovery);
  return recovery;
}

function buildDeductionRecoveryUncached(importRows: ImportPreviewRow[], relevantStandorte: Standort[], period: PeriodOption, manualCaseResolutions: ManualCaseResolution[] = [], invoiceStatusRows: ParsedInvoiceStatusRow[] = []) {
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
  const recoveredByResubmissionKeys = new Set(recoveredByResubmission.flatMap((candidate) => resubmissionResolutionKeys(candidate)));
  const manualResubmittedKeys = buildResubmittedResolutionKeySet(manualCaseResolutions);
  const manuallyResubmittedCases = casesFromImportRows(scopedRows)
    .filter((fall) => caseResolutionKeys(fall).some((key) => manualResubmittedKeys.has(key)) && !caseResolutionKeys(fall).some((key) => recoveredByResubmissionKeys.has(key)));
  const manualPaidKeys = buildPaidResolutionKeySet(manualCaseResolutions);
  const manuallyPaidCases = casesFromImportRows(scopedRows)
    .filter((fall) => caseResolutionKeys(fall).some((key) => manualPaidKeys.has(key)) && !caseResolutionKeys(fall).some((key) => recoveredByResubmissionKeys.has(key) || manualResubmittedKeys.has(key)));
  const paidByInvoiceStatusCases = paidCasesFromInvoiceStatus(scopedRows, invoiceStatusRows)
    .filter((fall) => !caseResolutionKeys(fall).some((key) => recoveredByResubmissionKeys.has(key) || manualResubmittedKeys.has(key) || manualPaidKeys.has(key)));
  const recoveredByResubmissionAmount = recoveredByResubmission.reduce((sum, candidate) => sum + Math.min(candidate.originalAmount, candidate.newAmount), 0);
  const manuallyResubmittedAmount = manuallyResubmittedCases.reduce((sum, fall) => sum + fall.amount, 0);
  const manuallyPaidAmount = manuallyPaidCases.reduce((sum, fall) => sum + fall.amount, 0);
  const paidByInvoiceStatusAmount = paidByInvoiceStatusCases.reduce((sum, fall) => sum + fall.amount, 0);
  const replacementAmount = recoveredByResubmissionAmount + manuallyResubmittedAmount;
  const cashRecoveredAmount = Math.min(grossDeductionAmount, manuallyPaidAmount + paidByInvoiceStatusAmount);
  const rawRecoveredAmount = replacementAmount + manuallyPaidAmount + paidByInvoiceStatusAmount;
  const recoveredAmount = Math.min(grossDeductionAmount, rawRecoveredAmount);
  const finalLostAmount = manualCancelledAmountFromRows(scopedRows, manualCaseResolutions);
  return {
    scopedRows,
    metrics,
    grossDeductionAmount,
    recoveredAmount,
    finalLostAmount,
    openAmount: Math.max(grossDeductionAmount - recoveredAmount - finalLostAmount, 0),
    recoveryRate: grossDeductionAmount ? Math.min(100, (recoveredAmount / grossDeductionAmount) * 100) : 0,
    recoveredByResubmission,
    manuallyResubmittedCases,
    manuallyPaidCases,
    paidByInvoiceStatusCases,
    recoveredByResubmissionAmount,
    manuallyResubmittedAmount,
    replacementAmount,
    cashRecoveredAmount,
    manuallyPaidAmount,
    paidByInvoiceStatusAmount,
    rawRecoveredAmount,
    recoveredCount: recoveredByResubmission.length + manuallyPaidCases.length + paidByInvoiceStatusCases.length,
    matchedNewSubmissionAmount: recoveredByResubmission.reduce((sum, candidate) => sum + candidate.newAmount, 0)
  };
}

function recoveryBreakdownText(recovery: ReturnType<typeof buildDeductionRecovery>) {
  const capNote = recovery.rawRecoveredAmount > recovery.recoveredAmount + 0.01
    ? ` Angerechnet werden maximal ${money.format(recovery.recoveredAmount)}, damit der geklärte Betrag den Brutto-Abzug nicht übersteigt.`
    : "";
  return `Aufschlüsselung bereits geklärt: ${money.format(recovery.recoveredByResubmissionAmount + recovery.manuallyResubmittedAmount)} durch Neueinreichung/Ersatzrechnung ohne zusätzlichen Geldzufluss, ${money.format(recovery.paidByInvoiceStatusAmount)} durch Ratenplan laut BFS, ${money.format(recovery.manuallyPaidAmount)} manuell bezahlt/geklärt.${capNote}`;
}

function paidCasesFromInvoiceStatus(importRows: ImportPreviewRow[], invoiceStatusRows: ParsedInvoiceStatusRow[]) {
  if (!invoiceStatusRows.length) return [];
  const paidStatusRowsByKey = new Map<string, ParsedInvoiceStatusRow>();
  invoiceStatusRows
    .filter(isInvoiceStatusPaidOrSecured)
    .forEach((row) => invoiceStatusMatchKeys(row).forEach((key) => paidStatusRowsByKey.set(key, row)));

  return casesFromImportRows(importRows).filter((fall) => caseInvoiceMatchKeys(fall).some((key) => paidStatusRowsByKey.has(key)));
}

function isInvoiceStatusPaidOrSecured(row: ParsedInvoiceStatusRow) {
  return row.installmentPlan || row.paymentStatus === "ratenzahlung";
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

function ClaimsFlowView({
  mode = "details",
  standort,
  importRows = [],
  manualCaseResolutions = [],
  invoiceStatusRows = []
}: {
  mode?: "details" | "cashflow";
  standort?: Standort;
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
  const quarterRows = useMemo(() => buildQuarterComparison(detailsStandortIds, importRows), [detailsStandortIds, importRows]);
  const deductionRecoverySummary = useMemo(() => buildDeductionRecovery(importRows, deductionStandorte, deductionPeriod, manualCaseResolutions, invoiceStatusRows), [deductionPeriod, deductionStandorte, importRows, invoiceStatusRows, manualCaseResolutions]);
  const recoveryDeductionSummary = useMemo(() => buildDeductionRecovery(importRows, recoveryStandorte, recoveryPeriod, manualCaseResolutions, invoiceStatusRows), [importRows, invoiceStatusRows, manualCaseResolutions, recoveryPeriod, recoveryStandorte]);
  const waterfallDeductionSummary = useMemo(() => buildDeductionRecovery(importRows, waterfallStandorte, waterfallPeriod, manualCaseResolutions, invoiceStatusRows), [importRows, invoiceStatusRows, manualCaseResolutions, waterfallPeriod, waterfallStandorte]);
  const recoveryReviewCases = useMemo(
    () => buildUnifiedOperationalReviewCases(recoveryScopedImportRows, invoiceStatusRows, manualCaseResolutions),
    [invoiceStatusRows, manualCaseResolutions, recoveryScopedImportRows]
  );
  const recoveryReviewCaseAmount = useMemo(() => recoveryReviewCases.reduce((sum, fall) => sum + fall.amount, 0), [recoveryReviewCases]);
  const detailsFinalLostAmount = useMemo(() => manualCancelledAmountFromRows(scopedImportRows, manualCaseResolutions), [manualCaseResolutions, scopedImportRows]);
  const recoveryFinalLostAmount = useMemo(() => manualCancelledAmountFromRows(recoveryScopedImportRows, manualCaseResolutions), [manualCaseResolutions, recoveryScopedImportRows]);
  const deductionAmount = selectedMetrics.returnAmount + selectedMetrics.cancellationAmount;
  const analysisDeductionAmount = deductionMetrics.returnAmount + deductionMetrics.cancellationAmount;
  const analysisRecoveredAmount = deductionRecoverySummary.recoveredAmount;
  const recoveryDeductionAmount = recoveryDeductionSummary.grossDeductionAmount;
  const recoveredAmount = recoveryDeductionSummary.recoveredAmount;
  const stillOpenAmount = recoveryDeductionSummary.openAmount;
  const waterfallDeductionAmount = waterfallDeductionSummary.grossDeductionAmount;
  const waterfallRecoveredAmount = waterfallDeductionSummary.cashRecoveredAmount;
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
      <section className="priority-grid details-kpi-grid">
        <PriorityCard label="Umsatz eingereicht" value={money.format(selectedMetrics.submitted)} hint="Summe aus Abrechnungen" period={selectedPeriod.label} tone="blue" />
        <PriorityCard label="BFS-Gebühr netto" value={money.format(selectedMetrics.feeNet)} hint="ohne MwSt" period={selectedPeriod.label} tone="amber" />
        <PriorityCard label="MwSt auf Gebühren" value={money.format(selectedMetrics.feeVat)} hint="separat erkannt" period={selectedPeriod.label} tone="amber" />
        <PriorityCard label="EWMA / Adressprüfung" value={money.format(selectedMetrics.ewmaTotal)} hint={`netto ${money.format(selectedMetrics.ewmaNet)} · MwSt ${money.format(selectedMetrics.ewmaVat)}`} period={selectedPeriod.label} tone={selectedMetrics.ewmaTotal ? "amber" : "green"} />
        <PriorityCard label="Auszahlungsbetrag" value={money.format(selectedMetrics.payout)} hint={payoutShareLabel(selectedMetrics.payout, selectedMetrics.submitted)} period={selectedPeriod.label} tone="green" />
        <PriorityCard label="Gesamtkosten BFS" value={money.format(selectedMetrics.fees)} hint={`${formatFeeRate(selectedMetrics.feeRate)} vom Eingang`} period={selectedPeriod.label} tone="amber" />
        <PriorityCard label="Gesamtabzug" value={money.format(totalCostAndDeductions)} hint="BFS-Gebühr, MwSt, EWMA und Storno/Rückgabe" period={selectedPeriod.label} tone={totalCostAndDeductions ? "red" : "green"} />
        <PriorityCard label="Rückläufer" value={String(selectedMetrics.returnCount)} hint={money.format(selectedMetrics.returnAmount)} period={selectedPeriod.label} tone={selectedMetrics.returnCount ? "red" : "green"} />
        <PriorityCard label="Stornierungen" value={String(selectedMetrics.cancellationCount)} hint={money.format(selectedMetrics.cancellationAmount)} period={selectedPeriod.label} tone={selectedMetrics.cancellationCount ? "amber" : "green"} />
        <PriorityCard label="Endgültig storniert" value={money.format(detailsFinalLostAmount)} hint="manuell endgültig storniert" period={selectedPeriod.label} tone={detailsFinalLostAmount ? "red" : "green"} info="Betrag, der nach Prüfung endgültig nicht weiterverfolgt wird." />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Abzugsanalyse nach Kostenart</h2>
            <p>Eigenständig gefilterte Sicht auf Kosten, Brutto-Storno/Rückgabe, bereits geklärte Abzüge und offene Prüfsumme.</p>
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
          <PriorityCard label="Brutto Storno/Rückgabe" value={money.format(analysisDeductionAmount)} hint="ursprünglicher Abzug aus Kontoauszug" period={deductionPeriod.label} tone={analysisDeductionAmount ? "red" : "green"} info="Brutto-Grundmenge aus Rückgaben, Rückläufern und Stornos. Danach wird nur noch getrennt in bereits geklärt, offene Prüfsumme und endgültig verloren." />
          <PriorityCard label="Bereits geklärt" value={money.format(analysisRecoveredAmount)} hint={`${deductionRecoverySummary.recoveredCount} Klärungen`} period={deductionPeriod.label} tone={analysisRecoveredAmount ? "green" : analysisDeductionAmount ? "amber" : "blue"} info="Bereits geklärt zählt spätere Neueinreichung/Ersatzrechnung, Ratenplan laut BFS oder wirtschaftlich belegte Zahlung. Neueinreichung ersetzt die alte Forderung und ist kein zusätzlicher Geldzufluss. Saldo 0 allein zählt nicht." />
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
            <p>Gebühren, Steuer, EWMA, Brutto-Storno/Rückgabe und bereits geklärte Beträge werden als Wasserfall zusammengeführt.</p>
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
          openDeduction={waterfallDeductionSummary.openAmount}
          recoveredCount={waterfallDeductionSummary.recoveredCount}
        />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{standort ? `Forderungen und Geldfluss ${standort.name}` : "Forderungen und Geldfluss Gruppe"}</h2>
            <p>Je Standort: eingereichter Umsatz, BFS-Kosten, Auszahlung und offene Prüfsumme nach der neuen Herleitung.</p>
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
            const cardPeriodId = standortPeriodIds[entry.id] ?? selectedPeriodId;
            const cardPeriod = periodOptions.find((period) => period.id === cardPeriodId) ?? selectedPeriod;
            const rowImportSummary = summarizeImportRows(importRows.filter((row) => row.location === entry.name && importRowInPeriod(row, cardPeriod, entry)));
            const periodCashflow = rowImportSummary.rows ? cashflowFromImportSummary(rowImportSummary) : zeroCashflow();
            const cardRecovery = buildDeductionRecovery(importRows, [entry], cardPeriod, manualCaseResolutions, invoiceStatusRows);
            const cardOpenDeduction = cardRecovery.openAmount;
            const cardFinalLost = manualCancelledAmountFromRows(importRows.filter((row) => row.location === entry.name && importRowInPeriod(row, cardPeriod, entry)), manualCaseResolutions);
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
	                  <div><dt>Auszahlungsbetrag</dt><dd>{money.format(periodCashflow.payout)}<small>{payoutShareLabel(periodCashflow.payout, periodCashflow.submitted)}</small></dd></div>
	                  <div><dt>BFS-Gebühr netto</dt><dd>{money.format(periodCashflow.feeNet)}</dd></div>
	                  <div><dt>MwSt</dt><dd>{money.format(periodCashflow.feeVat)}</dd></div>
	                  <div><dt>EWMA / Adressprüfung</dt><dd>{money.format(periodCashflow.ewmaTotal)}</dd></div>
	                  <div><dt>Brutto Storno/Rückgabe</dt><dd>{money.format(cardRecovery.grossDeductionAmount)}</dd></div>
	                  <div><dt>Bereits geklärt</dt><dd>{money.format(cardRecovery.recoveredAmount)}</dd></div>
	                  <div><dt>Offene Prüfsumme</dt><dd>{money.format(cardOpenDeduction)}</dd></div>
	                  <div><dt>Endgültig verloren</dt><dd>{money.format(cardFinalLost)}</dd></div>
	                </dl>
              </article>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Storno/Rückgabe & Klärung</h2>
            <p>Abgezogene Fälle werden gegen echte Neueinreichungen, BFS-Ratenpläne oder manuell belegte Zahlungen geprüft. Ersatzrechnungen schließen den Fall, sind aber kein zusätzlicher Geldzufluss.</p>
          </div>
        </div>
        <div className="period-filter deduction-analysis-filter">
          <label className="select-label">
            Zeitraum Klärung
            <select value={recoveryPeriodId} onChange={(event) => setRecoveryPeriodId(event.target.value)}>
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
          </label>
          <label className="select-label">
            Standort Klärung
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
	          <PriorityCard label="Bereits geklärt" value={money.format(recoveredAmount)} hint={`${recoveryDeductionSummary.recoveredCount} Klärungen · Ersatz ${money.format(recoveryDeductionSummary.replacementAmount)}`} period={recoveryPeriod.label} tone={recoveredAmount ? "green" : "amber"} info={`Angerechnet werden echte Neueinreichungen, manuell bezahlte Fälle und Ratenpläne laut BFS bis maximal zur Höhe des ursprünglichen Abzugs. Neueinreichung reduziert die offene Prüfsumme, zählt aber nicht als zusätzlicher Zahlungseingang. Saldo 0 allein zählt nicht. ${recoveryBreakdownText(recoveryDeductionSummary)}`} />
	          <PriorityCard label="Offene Prüfsumme" value={money.format(stillOpenAmount)} hint="Brutto-Abzug minus bereits geklärt und endgültig verloren" period={recoveryPeriod.label} tone={stillOpenAmount ? "amber" : "green"} info="Diese Summe muss in der operativen Prüfliste abgearbeitet und als bezahlt/geklärt oder endgültig storniert markiert werden." />
	          <PriorityCard label="Offene Abzugsquote" value={formatPercent(notRecoveredRate)} hint="offener Abzug vom eingereichten Umsatz" period={recoveryPeriod.label} tone={notRecoveredRate ? "amber" : "green"} />
	          <PriorityCard label="Erledigungsquote Abzug" value={formatPercent(recoveryRate)} hint="angerechnete Erledigung bezogen auf Abzug" period={recoveryPeriod.label} tone={recoveryRate >= 80 ? "green" : recoveryRate ? "amber" : "blue"} />
	          <PriorityCard label="Prüfliste" value={integerNumber.format(recoveryReviewCases.length)} hint={money.format(recoveryReviewCaseAmount)} period={recoveryPeriod.label} tone={recoveryReviewCases.length ? "amber" : "green"} info="Eine gemeinsame operative Liste. Dort wird je Fall entschieden: bezahlt/geklärt oder endgültig storniert." />
	          <PriorityCard label="Endgültig verloren" value={money.format(recoveryFinalLostAmount)} hint="manuell endgültig storniert" period={recoveryPeriod.label} tone={recoveryFinalLostAmount ? "red" : "green"} info="Betrag, der nach Prüfung endgültig nicht weiterverfolgt wird." />
	        </div>
	      </section>
      <section className="dashboard-grid">
        <article className="panel quarter-comparison-panel">
          <div className="panel-heading">
            <div>
              <h2>Quartalsvergleich</h2>
              <p>Zeitraum: Quartale im Vergleich, inklusive Veränderung zum Vorquartal.</p>
            </div>
          </div>
          <div className="table-wrap compact-table quarter-comparison-table">
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

const rowsForPeriodCache = new WeakMap<ImportPreviewRow[], WeakMap<Standort[], WeakMap<PeriodOption, ImportPreviewRow[]>>>();
const deductionRecoveryCache = new WeakMap<ImportPreviewRow[], WeakMap<Standort[], WeakMap<PeriodOption, WeakMap<ManualCaseResolution[], WeakMap<ParsedInvoiceStatusRow[], ReturnType<typeof buildDeductionRecoveryUncached>>>>>>();

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

function customMonthlyChartPoints(rows: ImportPreviewRow[], manualCaseResolutions: ManualCaseResolution[] = [], invoiceStatusRows: ParsedInvoiceStatusRow[] = []): CustomChartPoint[] {
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
      cancellationPoint.grossDeductionAmount += amount;
      cancellationPoint.openStornoAmount += amount;
      monthDeductionAmount += movementMonth === month || !movementMonth ? amount : 0;
    });
    point.finalCashflow += Math.max(submitted - feeNet - feeVat - ewma - monthDeductionAmount, 0);
  });

  const recoveredByResubmission = uniqueRecoveryCandidates(resubmissionCandidatesFromImportRows(rows));
  const recoveredByResubmissionKeys = new Set(recoveredByResubmission.flatMap((candidate) => resubmissionResolutionKeys(candidate)));
  recoveredByResubmission.forEach((candidate) => {
    const month = monthKeyFromGermanDate(candidate.originalDate);
    if (!month) return;
    const point = ensurePoint(month);
    const recoveredAmount = Math.min(candidate.originalAmount, candidate.newAmount);
    point.openStornoAmount = Math.max(point.openStornoAmount - recoveredAmount, 0);
    point.recoveredAmount += recoveredAmount;
    point.recoveredStornos += 1;
  });

  const manualResubmittedKeys = buildResubmittedResolutionKeySet(manualCaseResolutions);
  casesFromImportRows(rows)
    .filter((fall) => caseResolutionKeys(fall).some((key) => manualResubmittedKeys.has(key)) && !caseResolutionKeys(fall).some((key) => recoveredByResubmissionKeys.has(key)))
    .forEach((fall) => {
      const month = monthKeyFromGermanDate(fall.sourceDate ?? "");
      if (!month) return;
      const point = ensurePoint(month);
      point.openStornoAmount = Math.max(point.openStornoAmount - fall.amount, 0);
      point.recoveredAmount += fall.amount;
      point.recoveredStornos += 1;
  });

  const manualPaidKeys = buildPaidResolutionKeySet(manualCaseResolutions);
  casesFromImportRows(rows)
    .filter((fall) => caseResolutionKeys(fall).some((key) => manualPaidKeys.has(key)) && !caseResolutionKeys(fall).some((key) => recoveredByResubmissionKeys.has(key) || manualResubmittedKeys.has(key)))
    .forEach((fall) => {
      const month = monthKeyFromGermanDate(fall.sourceDate ?? "");
      if (!month) return;
      const point = ensurePoint(month);
      point.openStornoAmount = Math.max(point.openStornoAmount - fall.amount, 0);
      point.recoveredAmount += fall.amount;
      point.recoveredStornos += 1;
      point.finalCashflow += fall.amount;
  });

  const paidByInvoiceStatus = paidCasesFromInvoiceStatus(rows, invoiceStatusRows)
    .filter((fall) => !caseResolutionKeys(fall).some((key) => recoveredByResubmissionKeys.has(key) || manualResubmittedKeys.has(key) || manualPaidKeys.has(key)));
  paidByInvoiceStatus.forEach((fall) => {
    const month = monthKeyFromGermanDate(fall.sourceDate ?? "");
    if (!month) return;
    const point = ensurePoint(month);
    point.openStornoAmount = Math.max(point.openStornoAmount - fall.amount, 0);
    point.recoveredAmount += fall.amount;
    point.recoveredStornos += 1;
    point.finalCashflow += fall.amount;
  });

  const cancelledKeys = buildCancelledResolutionKeySet(manualCaseResolutions);
  casesFromImportRows(rows)
    .filter((fall) => caseResolutionKeys(fall).some((key) => cancelledKeys.has(key)))
    .forEach((fall) => {
      const month = monthKeyFromGermanDate(fall.sourceDate ?? "");
      if (!month) return;
      const point = ensurePoint(month);
      point.openStornoAmount = Math.max(point.openStornoAmount - fall.amount, 0);
      point.finalLostAmount += fall.amount;
    });

  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

function monthKeyFromGermanDate(value: string) {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})$/);
  if (!match) return "";
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[2]}`;
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
type AnonymousPeerAverage = {
  feeRate: number;
  chargebackRate: number;
  noProtectionShare: number;
};

const anonymousPeerAverageCache = new WeakMap<ImportPreviewRow[], AnonymousPeerAverage>();

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

function buildAnonymousPeerAverage(importRows: ImportPreviewRow[]): AnonymousPeerAverage {
  const cached = anonymousPeerAverageCache.get(importRows);
  if (cached) return cached;

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
    const emptyAverage = {
      feeRate: 0,
      chargebackRate: 0,
      noProtectionShare: 0
    };
    anonymousPeerAverageCache.set(importRows, emptyAverage);
    return emptyAverage;
  }

  const averageMetrics = {
    feeRate: average(locationMetrics.map((metrics) => metrics.feeRate)),
    chargebackRate: average(locationMetrics.map((metrics) => metrics.chargebackRate)),
    noProtectionShare: average(locationMetrics.map((metrics) => metrics.noProtectionShare))
  };
  anonymousPeerAverageCache.set(importRows, averageMetrics);
  return averageMetrics;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

type ImportSummary = {
  rows: number;
  submitted: number;
  payout: number;
  fees: number;
  feeNet: number;
  feeVat: number;
  ewmaNet: number;
  ewmaVat: number;
  ewmaTotal: number;
  feeRate: number;
  returnCount: number;
  returnAmount: number;
  cancellationCount: number;
  cancellationAmount: number;
  noProtectionCount: number;
  noProtectionAmount: number;
  activeMonths: number;
  startLabel: string;
};
const importSummaryCache = new WeakMap<ImportPreviewRow[], ImportSummary>();
type ImportPersistenceSummary = {
  batchId: string;
  imported: number;
  duplicates: number;
  failed: number;
  errors?: Array<{ file: string; message: string }>;
};

const uploadChunkMaxFiles = 6;
const uploadChunkMaxBytes = 3.5 * 1024 * 1024;
const invoiceUploadChunkMaxFiles = 40;
const invoiceUploadChunkMaxBytes = 24 * 1024 * 1024;
const invoiceSaveChunkMaxRows = 75;
const invoiceSaveChunkMaxBytes = 2.8 * 1024 * 1024;

type ResubmissionCandidate = {
  patientName: string;
  locationName: string;
  originalDate: string;
  originalStatementNo: string;
  invoiceNo: string;
  bfsNo: string;
  reason: string;
  originalAmount: number;
  newDate: string;
  newStatementNo: string;
  newInvoiceNo: string;
  newBfsNo: string;
  newAmount: number;
  newFile: string;
};

const importCasesCache = new WeakMap<ImportPreviewRow[], BfsCase[]>();
const resubmissionCandidatesCache = new WeakMap<ImportPreviewRow[], ResubmissionCandidate[]>();
const operationalCasesCache = new WeakMap<ImportPreviewRow[], WeakMap<ParsedInvoiceStatusRow[], WeakMap<ManualCaseResolution[], BfsCase[]>>>();

function summarizeImportRows(rows: ImportPreviewRow[]): ImportSummary {
  const cached = importSummaryCache.get(rows);
  if (cached) return cached;

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

  const summary = {
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
  importSummaryCache.set(rows, summary);
  return summary;
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

function importRowsClaimCount(rows: ImportPreviewRow[]) {
  return rows.reduce((sum, row) => {
    const parsedCount = row.parsedClaims?.length ?? 0;
    return sum + (parsedCount || row.claimsExtracted || row.claimsHeader || 0);
  }, 0);
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
    { label: "Zahlung/Ratenplan", amount: recovered, detail: "echter Ausgleich ohne Ersatzrechnung", tone: "positive" as const }
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
  const cached = importCasesCache.get(rows);
  if (cached) return cached;
  const cases = rows.flatMap((row) => {
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
  importCasesCache.set(rows, cases);
  return cases;
}

function buildAusfallhonorarAutoCancelledResolutions(importRows: ImportPreviewRow[], invoiceRows: ParsedInvoiceDocument[], invoiceStatusRows: ParsedInvoiceStatusRow[] = [], manualCaseResolutions: ManualCaseResolution[] = []) {
  if (!invoiceRows.length || !importRows.length) return manualCaseResolutions;
  const statusRowsByKey = new Map<string, ParsedInvoiceStatusRow>();
  invoiceStatusRows.forEach((row) => invoiceStatusMatchKeys(row).forEach((key) => statusRowsByKey.set(key, row)));
  const ausfallhonorarInvoices = invoiceRows
    .filter(invoiceHasAusfallhonorarLine)
    .filter((invoice) => !ausfallhonorarInvoiceHasRecognizedPayment(invoice, statusRowsByKey));
  if (!ausfallhonorarInvoices.length) return manualCaseResolutions;

  const existingCancelledIdentityKeys = buildClosedResolutionKeySet(manualCaseResolutions);
  const autoResolutions = casesFromImportRows(importRows)
    .filter((fall) => !caseOperationalResolutionKeys(fall).some((key) => existingCancelledIdentityKeys.has(key)))
    .filter((fall) => ausfallhonorarInvoices.some((invoice) => caseMatchesAusfallhonorarInvoice(fall, invoice)))
    .map((fall) => ({
      caseKey: caseResolutionKey(fall),
      standortId: fall.standortId,
      patientName: fall.patientName,
      invoiceNo: fall.invoiceNo,
      bfsNo: fall.bfsNo,
      amount: fall.amount,
      reason: fall.reason,
      status: "cancelled_manual" as const,
      comment: "Systemregel: Leistungsbeschreibung enthält Ausfallhonorar.",
      resolvedAt: "system:ausfallhonorar",
      resolvedBy: "Systemregel"
    }));

  return autoResolutions.length ? [...manualCaseResolutions, ...autoResolutions] : manualCaseResolutions;
}

function ausfallhonorarInvoiceHasRecognizedPayment(invoice: ParsedInvoiceDocument, statusRowsByKey: Map<string, ParsedInvoiceStatusRow>) {
  const submittedAmount = ausfallhonorarSubmittedAmount(invoice);
  const statusRow = invoiceDocumentMatchKeys(invoice).map((key) => statusRowsByKey.get(key)).find(Boolean);
  return paidAmountForAusfallhonorarInvoice(submittedAmount, statusRow) > 0.005;
}

function invoiceHasAusfallhonorarLine(invoice: ParsedInvoiceDocument) {
  return invoice.serviceLines.some(isAusfallhonorarLine);
}

function caseMatchesAusfallhonorarInvoice(fall: BfsCase, invoice: ParsedInvoiceDocument) {
  if (sameResolvedField(fall.bfsNo, invoice.bfsNo)) return true;
  if (sameResolvedField(fall.invoiceNo, invoice.invoiceNo) && sameResolvedField(fall.patientName, invoice.patientName)) return true;
  if (sameResolvedField(fall.invoiceNo, invoice.invoiceNo) && (!invoice.standortId || invoice.standortId === fall.standortId)) return true;
  return sameResolvedField(fall.patientName, invoice.patientName)
    && (!invoice.standortId || invoice.standortId === fall.standortId)
    && Math.abs(Math.abs(fall.amount) - Math.abs(invoice.totalAmount)) < 0.01;
}

function sameResolvedField(left: string | undefined, right: string | undefined) {
  const normalizedLeft = normalizeResolutionPart(left ?? "");
  const normalizedRight = normalizeResolutionPart(right ?? "");
  return normalizedLeft !== "-" && normalizedLeft === normalizedRight;
}

function buildUnifiedOperationalReviewCases(importRows: ImportPreviewRow[], invoiceStatusRows: ParsedInvoiceStatusRow[], manualCaseResolutions: ManualCaseResolution[] = []) {
  const statusCache = operationalCasesCache.get(importRows);
  const resolutionCache = statusCache?.get(invoiceStatusRows);
  const cached = resolutionCache?.get(manualCaseResolutions);
  if (cached) return cached;

  const closedKeys = buildClosedResolutionKeySet(manualCaseResolutions);
  const recoveredAmountByKey = recoveredAmountByResolutionKey(uniqueRecoveryCandidates(resubmissionCandidatesFromImportRows(importRows)));
  const coveredStandortIds = invoiceStatusCoveredStandortIds(invoiceStatusRows);
  const statusByKey = new Map<string, ParsedInvoiceStatusRow>();
  invoiceStatusRows.forEach((row) => invoiceStatusMatchKeys(row).forEach((key) => statusByKey.set(key, row)));

  const cases = casesFromImportRows(importRows)
    .flatMap((fall) => {
      const keys = caseOperationalResolutionKeys(fall);
      if (keys.some((key) => closedKeys.has(key))) return [];
      const recoveredAmount = recoveredAmountForCase(fall, recoveredAmountByKey);
      if (recoveredAmount >= fall.amount - 0.005) return [];
      const reviewFall = recoveredAmount > 0.005
        ? {
          ...fall,
          amount: Math.max(fall.amount - recoveredAmount, 0),
          reason: `Restbetrag nach Neueinreichung: ${fall.reason}`,
          lastComment: `${money.format(recoveredAmount)} durch Neueinreichung/Ersatzrechnung erklärt`
        } satisfies BfsCase
        : fall;

      const statusRow = caseInvoiceMatchKeys(reviewFall).map((key) => statusByKey.get(key)).find(Boolean);
      if (statusRow && isInvoiceStatusPaidOrSecured(statusRow)) return [];

      if (isNoProtectionReturnCase(reviewFall)) {
        return [{
          ...reviewFall,
          status: "praxis_nachfassen",
          traffic: "red",
          reason: reviewFall.reason.startsWith("Rückgabe ohne Ausfallschutz") ? reviewFall.reason : `Rückgabe ohne Ausfallschutz: ${reviewFall.reason}`,
          lastComment: statusRow ? `Saldo-Status: ${invoiceStatusLabel(statusRow)}` : "Praxis muss Zahlung selbst nachhalten"
        } satisfies BfsCase];
      }

      if (statusRow?.paymentStatus === "storniert") {
        return [{
          ...reviewFall,
          amount: Math.max(reviewFall.amount, Math.abs(statusRow.cancelledAmount ?? 0)),
          status: "storno_laut_bfs_pruefen",
          traffic: "orange",
          reason: `Storno laut BFS prüfen: ${reviewFall.reason}`,
          lastComment: `BFS storniert ${money.format(statusRow.cancelledAmount ?? 0)} · Saldo ${money.format(statusRow.saldo)}`
        } satisfies BfsCase];
      }

      if (statusRow && statusRow.saldo < -0.005 && !statusRow.installmentPlan) {
        return [{
          ...reviewFall,
          amount: Math.max(reviewFall.amount, Math.abs(statusRow.saldo)),
          status: statusRow.reminderLevel > 0 ? "bfs_offen_mahnstufe" : "bfs_offen_pruefen",
          traffic: statusRow.reminderLevel > 0 || !statusRow.protection ? "red" : "orange",
          reason: `BFS offen prüfen: ${reviewFall.reason}`,
          lastComment: `${invoiceStatusLabel(statusRow)} · Saldo ${money.format(statusRow.saldo)}`
        } satisfies BfsCase];
      }

      if (invoiceStatusRows.length && coveredStandortIds.has(reviewFall.standortId) && !statusRow) {
        return [{
          ...reviewFall,
          status: "nicht_in_saldo_liste",
          traffic: reviewFall.traffic === "red" ? "red" : "orange",
          reason: `Nicht in Saldo-Liste gefunden: ${reviewFall.reason}`,
          lastComment: "Keine eindeutige Zuordnung in bestätigter BFS-Saldo-Liste"
        } satisfies BfsCase];
      }

      return [{
        ...reviewFall,
        status: "offen_pruefen",
        traffic: reviewFall.traffic === "green" ? "orange" : reviewFall.traffic,
        lastComment: statusRow ? `Saldo-Status: ${invoiceStatusLabel(statusRow)}` : "Aus Abrechnung als offener Prüffall übernommen"
      } satisfies BfsCase];
    })
    .sort(compareOperationalCases);

  let nextStatusCache = statusCache;
  if (!nextStatusCache) {
    nextStatusCache = new WeakMap<ParsedInvoiceStatusRow[], WeakMap<ManualCaseResolution[], BfsCase[]>>();
    operationalCasesCache.set(importRows, nextStatusCache);
  }
  let nextResolutionCache = nextStatusCache.get(invoiceStatusRows);
  if (!nextResolutionCache) {
    nextResolutionCache = new WeakMap<ManualCaseResolution[], BfsCase[]>();
    nextStatusCache.set(invoiceStatusRows, nextResolutionCache);
  }
  nextResolutionCache.set(manualCaseResolutions, cases);
  return cases;
}

function recoveredAmountByResolutionKey(candidates: ResubmissionCandidate[]) {
  const recoveredByKey = new Map<string, number>();
  candidates.forEach((candidate) => {
    const amount = Math.min(candidate.originalAmount, candidate.newAmount);
    resubmissionResolutionKeys(candidate).forEach((key) => {
      recoveredByKey.set(key, Math.max(recoveredByKey.get(key) ?? 0, amount));
    });
  });
  return recoveredByKey;
}

function recoveredAmountForCase(fall: BfsCase, recoveredByKey: Map<string, number>) {
  return caseResolutionKeys(fall).reduce((max, key) => Math.max(max, recoveredByKey.get(key) ?? 0), 0);
}

function caseOperationalResolutionKeys(fall: BfsCase) {
  return [...caseResolutionKeys(fall), ...caseResolutionIdentityKeys(fall)];
}

function manualCancelledAmountFromRows(importRows: ImportPreviewRow[], manualCaseResolutions: ManualCaseResolution[] = []) {
  const cancelledKeys = buildCancelledResolutionKeySet(manualCaseResolutions);
  return casesFromImportRows(importRows)
    .filter((fall) => caseResolutionKeys(fall).some((key) => cancelledKeys.has(key)))
    .reduce((sum, fall) => sum + fall.amount, 0);
}

function compareOperationalCases(a: BfsCase, b: BfsCase) {
  return operationalCasePriority(a) - operationalCasePriority(b) || b.amount - a.amount || b.ageDays - a.ageDays;
}

function operationalCasePriority(fall: BfsCase) {
  if (fall.status === "praxis_nachfassen" || fall.status === "ohne_schutz_offen") return 1;
  if (fall.status === "storno_laut_bfs_pruefen") return 2;
  if (fall.status === "bfs_offen_mahnstufe") return 3;
  if (fall.status === "bfs_offen_pruefen") return 4;
  if (fall.status === "nicht_in_saldo_liste") return 5;
  if (fall.status === "offen_pruefen") return 6;
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
  const cached = resubmissionCandidatesCache.get(rows);
  if (cached) return cached;
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

  const candidates = relevantMovements.flatMap((movement) => {
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
  resubmissionCandidatesCache.set(rows, candidates);
  return candidates;
}

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
  const claimRows = rows.flatMap((row) => {
    const standort = standorte.find((entry) => entry.name === row.location);
    if (!standort || (standortId && standort.id !== standortId)) return [];
    const claimCount = row.parsedClaims?.length || row.claimsExtracted || row.claimsHeader || 0;
    return [{ standortId: standort.id, claimCount }];
  });
  const byLocation = orderedStandorte()
    .filter((standort) => !standortId || standort.id === standortId)
    .map((standort) => {
      const locationRows = stornoRows.filter((row) => row.standortId === standort.id);
      const claimCount = claimRows
        .filter((row) => row.standortId === standort.id)
        .reduce((sum, row) => sum + row.claimCount, 0);
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
        claimCount,
        stornoRate: claimCount ? (total / claimCount) * 100 : 0,
        rows: locationRows
      };
    });
  const done = stornoRows.filter((row) => row.done).length;
  const finalCancelled = stornoRows.filter((row) => row.finalCancelled).length;
  const total = stornoRows.length;
  const claimCount = claimRows.reduce((sum, row) => sum + row.claimCount, 0);

  return {
    total,
    claimCount,
    done,
    finalCancelled,
    open: stornoRows.filter((row) => row.open).length,
    amount: stornoRows.reduce((sum, row) => sum + row.amount, 0),
    stornoRate: claimCount ? (total / claimCount) * 100 : 0,
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

function caseInSelectedPeriod(fall: BfsCase, period: PeriodOption, standort: Standort) {
  const month = monthKeyFromShortDate(fall.sourceDate);
  if (!month) return !period.start && !period.end;
  return shortDateInPeriod(fall.sourceDate, period, standort);
}

function caseBeforeOrOnIsoDate(fall: BfsCase, isoDate: string) {
  if (!isoDate) return true;
  const caseTime = caseDateTime(fall.sourceDate);
  if (caseTime === null) return true;
  const cutoff = new Date(`${isoDate}T23:59:59`);
  return caseTime <= cutoff.getTime();
}

function monthKeyFromShortDate(value: string | undefined) {
  const match = value?.match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})$/);
  if (!match) return "";
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[2]}`;
}

function caseDateTime(value: string | undefined) {
  const match = value?.match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})$/);
  if (!match) return null;
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const date = new Date(year, Number(match[2]) - 1, Number(match[1]));
  return Number.isNaN(date.getTime()) ? null : date.getTime();
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

function formatLocationAmountBreakdown(entries: { name: string; amount: number }[]) {
  if (!entries.length) return "Je Standort: kein Standort im aktuellen Filter.";
  const breakdown = entries.map((entry) => `${entry.name}: ${money.format(entry.amount)}`).join("; ");
  if (entries.length === 1) return `Standortwert: ${breakdown}.`;
  return `Je Standort: ${breakdown}.`;
}

function formatLocationAverageInvoiceBreakdown(entries: { name: string; averageInvoiceValue: number; claimCount: number }[]) {
  if (!entries.length) return "Je Standort: kein Standort im aktuellen Filter.";
  const breakdown = entries.map((entry) => `${entry.name}: ${money.format(entry.averageInvoiceValue)} (${integerNumber.format(entry.claimCount)} Rechnungen)`).join("; ");
  if (entries.length === 1) return `Standortwert: ${breakdown}.`;
  return `Je Standort: ${breakdown}.`;
}

function formatLocationCountBreakdown(entries: { name: string; count: number }[], label: string) {
  if (!entries.length) return "Je Standort: kein Standort im aktuellen Filter.";
  const breakdown = entries.map((entry) => `${entry.name}: ${integerNumber.format(entry.count)} ${label}`).join("; ");
  if (entries.length === 1) return `Standortwert: ${breakdown}.`;
  return `Je Standort: ${breakdown}.`;
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

type KpiCardTuple = [label: string, value: string, hint: string, info?: string, period?: string];

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
          ["Prüfliste", "0", "kein Datenstand", defaultInfo.openCases],
          ["Laufend ohne Ausfallschutz", money.format(defaultMetrics.noProtectionAmount), importSummary.rows ? "aus aktuellem Import" : "kein Datenstand", defaultInfo.noProtection]
        ] satisfies KpiCardTuple[]
      : [
          ["Anzahl Standorte", `${standorte.filter((entry) => isStandortLive(entry, todayReference)).length} + ${standorte.filter((entry) => !isStandortLive(entry, todayReference)).length}`, "aktive und geplante Standorte", defaultInfo.locations],
          ["Umsatz eingereicht", money.format(defaultMetrics.submitted), importSummary.rows ? "aus aktuellem Import" : "kein Datenstand", defaultInfo.submitted],
          ["Auszahlungsbetrag", money.format(defaultMetrics.payout), importSummary.rows ? payoutShareLabel(defaultMetrics.payout, defaultMetrics.submitted) : "kein Datenstand", defaultInfo.payout],
          ["Gesamtkosten BFS", money.format(defaultMetrics.fees), importSummary.rows ? `Gebühr ${money.format(importSummary.feeNet)} · MwSt ${money.format(importSummary.feeVat)}` : "kein Datenstand", defaultInfo.fees]
        ] satisfies KpiCardTuple[];
  }, [customCards, importRows, standort]);
  return (
    <section className={className ? `kpi-grid ${className}` : "kpi-grid"}>
      {cards.map(([label, value, hint, info, period]) => (
        <article className="kpi-card" key={label}>
          <MetricInfo title={label} text={normalizeProductCopy(info ?? metricExplanation(label, value, normalizeProductCopy(hint), periodLabelFromHint(period ?? hint)))} />
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{normalizeProductCopy(hint)}</small>
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
      `Auszahlungsquote: ${payoutShareLabel(metrics.payout, metrics.submitted)}.`,
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
    openCases: `Datenquelle: aktuell erkannte Import- und Saldo-Falllogik. Berechnung: gezählt werden alle Fälle der gemeinsamen Prüfliste, nachdem Neueinreichungen, Ratenpläne und manuelle Entscheidungen gegengerechnet wurden. Zeitraum: aktueller Datenstand.`,
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
    return `Herleitung: Der Standort wird nach Brutto-Storno/Rückgabe, offener Prüfsumme, Ohne-Ausfallschutz-Risiko, Prüflistenalter und Volumen priorisiert. Die Kennzahl ist ein Steuerungshinweis, keine zusätzliche Buchung. ${base}`;
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
    return `Herleitung: Prüflistenfälle mit einem Alter über 30 Tagen. Alter wird aus dem erkannten Bewegungsdatum berechnet. ${base}`;
  }
  if (normalized.includes("diese woche")) {
    return `Herleitung: Prüflistenfälle mit einem Alter zwischen 8 und 30 Tagen. Diese Kategorie priorisiert laufende Fälle unterhalb der Eskalationsschwelle. ${base}`;
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
    return `Herleitung: Fälle der gemeinsamen Prüfliste im aktuellen Standort- und Zeitraumfilter. ${base}`;
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
    return `Herleitung: Brutto Storno/Rückgabe geteilt durch den eingereichten Umsatz im gewählten Zeitraum. Brutto bedeutet vor Einordnung in bereits geklärt, offene Prüfsumme oder endgültig verloren. ${base}`;
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
    return `Herleitung: Als bereits geklärt zählen spätere echte Neueinreichungen, Ratenpläne laut BFS sowie wirtschaftlich belegte Zahlungen. Angerechnet wird maximal der ursprüngliche Storno-/Rückgabe-Abzug, auch wenn die spätere Neueinreichung höher ist. Saldo 0 allein ist kein Zahlungsnachweis. ${base}`;
  }
  if (normalized.includes("gebühr")) {
    return `Herleitung: Netto-Gebührenposition der BFS-Abrechnungen; MwSt wird separat ausgewiesen und fließt mit in die Gesamtkosten. ${base}`;
  }
  if (normalized.includes("rückläufer") || normalized.includes("rückgaben")) {
    return `Herleitung: Gezählt werden Kontoauszug-Bewegungen mit Rückgabe, Rückbelastung oder vergleichbarer BFS-Bemerkung. Der Betrag kommt aus der jeweiligen Bewegungszeile und ist Teil der Brutto-Storno/Rückgabe-Grundmenge. ${base}`;
  }
  if (normalized.includes("storno")) {
    return `Herleitung: Gezählt werden Kontoauszug-Zeilen vom Typ Storno Liquidation. Der Originalgrund aus der BFS-Bemerkung bleibt gespeichert; die spätere Einordnung erfolgt in bereits geklärt, offene Prüfsumme oder endgültig verloren. ${base}`;
  }
  if (normalized.includes("ausfallschutz") || normalized.includes("schutz")) {
    return `Herleitung: Summe der Forderungen, die in der Forderungsliste ohne Ausfallschutz markiert sind oder als spätere Rückgabe ohne Ausfallschutz auftauchen. ${base}`;
  }
  if (normalized.includes("offen") || normalized.includes("klä") || normalized.includes("prüfen")) {
    return `Herleitung: Offene operative Fälle werden in einer gemeinsamen Prüfliste abgearbeitet. Je Fall wird entschieden: bezahlt/geklärt oder endgültig storniert. ${base}`;
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
  const [importCompletion, setImportCompletion] = useState<{ title: string; message: string; detail: string } | null>(null);
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
  const nextStatusUploadMode = "append";

  async function handleFiles(files: FileList | null, mode: "replace" | "append" = "append") {
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
      const existingRows = mode === "replace" ? [] : await loadStoredImportRowsFromServer().catch(() => liveRows);
      onRowsChange(mode === "replace" ? [] : existingRows);
      const result = await parseImportFiles(importableFiles, (processed, total, fileName) => {
        const shortName = fileName.length > 34 ? `${fileName.slice(0, 31)}...` : fileName;
        setUploadStatus(`${processed} von ${total} Dateien eingelesen (${shortName})`);
      });
      const parsedRows = result.rows;
      const nextRows = reconcileImportRows(mode === "append" ? mergeImportRows(existingRows, parsedRows) : parsedRows);
      onRowsChange(nextRows);
      try {
        await storeImportRows(nextRows);
        setUploadStatus(importStatusMessage(parsedRows.length, result.persistence, nextRows.length));
      } catch (storageError) {
        setUploadStatus(`${importStatusMessage(parsedRows.length, result.persistence, nextRows.length)} Import-Vorschau konnte nicht im Browser gespeichert werden: ${storageError instanceof Error ? storageError.message : "Browser-Speicher voll"}`);
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
    let serverResetError: unknown = null;
    try {
      await clearStoredImportRowsFromServer();
    } catch (error) {
      serverResetError = error;
    }
    try {
      await clearStoredImportRows();
      onRowsChange([]);
      setSelectedFileCount(0);
      setUploadStatus(serverResetError
        ? `Upload-Vorschau zurückgesetzt. Serverdaten nicht zurückgesetzt: ${serverResetError instanceof Error ? serverResetError.message : "unbekannter Fehler"}`
        : "Importdatenstand zurückgesetzt");
    } catch (error) {
      setUploadStatus(`Upload-Vorschau konnte nicht zurückgesetzt werden: ${error instanceof Error ? error.message : "unbekannter Fehler"}`);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleStatusFiles(files: FileList | null, mode: "replace" | "append" = "append") {
    if (!files?.length) return;
    const importableFiles = [...files].filter(isPdfUploadFile);
    setSelectedStatusFileCount(importableFiles.length);
    setSelectedStatusFileNames(importableFiles.map(uploadFilePath));
    if (!importableFiles.length) {
      setStatusUploadStatus("Keine PDF-Listen gefunden");
      return;
    }
    setIsStatusProcessing(true);
    setStatusUploadStatus(`${importableFiles.length} Saldo-Listen werden gelesen`);
    try {
      const existingDocuments = mode === "replace" ? [] : await loadConfirmedInvoiceStatusDocuments().catch(() => statusDocuments);
      if (mode === "replace") setPendingStatusDocuments([]);
      const parsedDocuments = await parseInvoiceStatusFiles(importableFiles, (processed, total, fileName) => {
        const shortName = fileName.length > 34 ? `${fileName.slice(0, 31)}...` : fileName;
        setStatusUploadStatus(`${processed} von ${total} Listen gelesen (${shortName})`);
      });
      const completeParsedDocuments = await ensureInvoiceStatusDocumentsForFiles(importableFiles, parsedDocuments, (processed, total, fileName) => {
        const shortName = fileName.length > 34 ? `${fileName.slice(0, 31)}...` : fileName;
        setStatusUploadStatus(`${processed} von ${total} Listen vollständig geprüft (${shortName})`);
      });
      const baseDocuments = pendingStatusDocuments ?? existingDocuments;
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
      const existingDocuments = await loadConfirmedInvoiceStatusDocuments().catch(() => statusDocuments);
      const documentsToSave = mergeInvoiceStatusDocuments(existingDocuments, pendingStatusDocuments);
      const savedDocuments = await saveConfirmedInvoiceStatusDocuments(documentsToSave);
      onStatusDocumentsChange(savedDocuments);
      const confirmedRows = savedDocuments.flatMap((document) => document.rows);
      const coverage = summarizeInvoiceStatusCoverage(confirmedRows);
      setPendingStatusDocuments(null);
      setStatusUploadStatus(`Saldo-Import bestätigt: ${integerNumber.format(confirmedRows.length)} Rechnungsstatus-Zeilen übernommen, ${coverage.coveredStandortCount}/${standorte.length} Standorte erkannt`);
      setImportCompletion({
        title: "Saldo-Import fertig eingelesen",
        message: "Alle bestätigten Saldo- und Rechnungsstatusdaten sind gespeichert. Du kannst jetzt sicher wegschauen oder weiterarbeiten.",
        detail: `${integerNumber.format(confirmedRows.length)} Statuszeilen übernommen · ${coverage.coveredStandortCount}/${standorte.length} Standorte erkannt`
      });
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
            <input disabled={isProcessing} type="file" multiple accept=".pdf,application/pdf" onChange={(event) => handleFiles(event.target.files, "append")} />
          </label>
          <label className={isProcessing ? "file-upload-button secondary-upload disabled" : "file-upload-button secondary-upload"}>
            <FolderUp size={16} />
            Ordner inkl. Unterordner
            <input
              disabled={isProcessing}
              type="file"
              multiple
              accept=".pdf,application/pdf"
              onChange={(event) => handleFiles(event.target.files, "append")}
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
            <p>Alles fertig eingelesen. Die Import-Vorschau wurde übernommen und die App wertet diesen Datenstand jetzt in Cockpit, Prüfliste, Matching und Patientenklassifizierung aus.</p>
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
      <ImportCompletionPopup completion={importCompletion} onClose={() => setImportCompletion(null)} />
      <section className="upload-zone practice-upload-zone">
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
          {hasPendingStatusImport && (
            <button className="secondary-button reset-upload-button" disabled={isStatusProcessing || isStatusConfirming} onClick={() => void resetStatusImport()}>
              <X size={16} />
              Saldo-Vorschau verwerfen
            </button>
          )}
        </div>
      </section>
      <section className="priority-grid">
        <PriorityCard label="Statuszeilen" value={integerNumber.format(isStatusProcessing ? selectedStatusFileCount : statusRows.length)} hint={isStatusProcessing ? "Listen werden gelesen" : hasPendingStatusImport ? "Vorschau aus Saldo-Listen" : "bestätigte Saldo-Listen"} tone="blue" />
        <PriorityCard label="Standorte erkannt" value={`${statusSummary.coveredStandortCount}/${standorte.length}`} hint={statusSummary.unknownMandantCount ? `${integerNumber.format(statusSummary.unknownMandantCount)} Zeilen ohne Standort` : "über Mandant-Nr. zugeordnet"} tone={statusSummary.coveredStandortCount === standorte.length && !statusSummary.unknownMandantCount ? "green" : "amber"} />
        <PriorityCard label="Brutto-Prüfbasis" value={integerNumber.format(statusSummary.importCaseCount)} hint="Storno/Rückgabe aus Abrechnung" tone="amber" info="Grundmenge aus dem Abrechnungsimport. Die Saldo-Liste hilft zu erkennen, was bereits geregelt ist und was in die offene Prüfliste wandert." />
        <PriorityCard label="Ratenplan erkannt" value={integerNumber.format(statusSummary.correctedCaseCount)} hint="RP-Treffer in Prüffällen" tone="green" info="Nur Ratenplan gilt in der offenen Abzugslogik automatisch als geregelt. Saldo 0 allein ist kein Zahlungsnachweis." />
        <PriorityCard label="Ratenplan mit Storno-Bezug" value={integerNumber.format(statusSummary.cancelledCorrectedCaseCount)} hint="RP bei Storno-/Rückgabefall" tone={statusSummary.cancelledCorrectedCaseCount ? "amber" : "green"} info="Diese Storno-/Rückgabefälle haben einen Ratenplan und gelten daher als wirtschaftlich geregelt. Saldo 0 ohne Ratenplan bleibt prüfpflichtig." />
        <PriorityCard label="Ratenplan-Status" value={integerNumber.format(statusSummary.autoResolvedCount)} hint="RP laut Saldo-Liste" tone="green" info="Reiner BFS-Status aus der Saldo-Liste: Ratenplan ist geregelt. Saldo 0 wird hier nicht als bezahlt gezählt." />
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
          <h2>Prüfhinweise aus Rechnungsstatus</h2>
          <p>Diese Liste entsteht aus Abrechnungsimport plus Saldo-Liste. Sie erklärt, warum Fälle in die gemeinsame Prüfliste wandern oder bereits als geregelt gelten.</p>
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
            <article><span>Saldo 0, Beleg offen</span><strong>{integerNumber.format(summary.economicCheck)}</strong></article>
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
  if (row.paymentStatus === "bezahlt") return "Saldo 0";
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
        categoryLabel: "Prüfliste",
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
        categoryLabel: "Beleg prüfen",
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
  return row.installmentPlan || row.paymentStatus === "ratenzahlung";
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
  const normalized = values.map(normalizeMatchKey).filter(Boolean);
  const compact = normalized.map((value) => value.replace(/\s+/g, "")).filter(Boolean);
  return Array.from(new Set([...normalized, ...compact]));
}

function standortFromMandantNo(mandantNo: string) {
  return standorte.find((standort) => [standort.mandantNo, ...(standort.mandantNos ?? [])].includes(mandantNo));
}

function normalizeMatchKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

function InvoiceImportView({ invoiceRows, onRowsChange }: { invoiceRows: ParsedInvoiceDocument[]; onRowsChange: (rows: ParsedInvoiceDocument[]) => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("Bereit für Rechnungsimport");
  const [activeUploadSource, setActiveUploadSource] = useState<ParsedInvoiceDocument["importSource"]>("bfs_invoice_pdf");
  const [selectedFileCount, setSelectedFileCount] = useState(0);
  const [pendingInvoiceRows, setPendingInvoiceRows] = useState<ParsedInvoiceDocument[]>([]);
  const [practiceStandortId, setPracticeStandortId] = useState(() => orderedStandorte()[0]?.id ?? "kirchberg");
  const [practiceImportOpen, setPracticeImportOpen] = useState(false);
  const [importCompletion, setImportCompletion] = useState<{ title: string; message: string; detail: string } | null>(null);
  const practiceImportStandorte = orderedStandorte();
  const okRows = invoiceRows.filter((row) => row.status === "OK").length;
  const reviewRows = invoiceRows.length - okRows;
  const serviceCount = invoiceRows.reduce((sum, row) => sum + row.serviceLines.length, 0);
  const labCount = invoiceRows.filter((row) => row.hasEigenlabor || row.hasFremdlabor).length;
  const ocrRequiredRows = invoiceRows.filter((row) => row.ocrStatus === "required").length;
  const canConfirmImport = Boolean(invoiceRows.length) && !ocrRequiredRows;

  async function handleInvoiceFiles(
    files: FileList | null,
    mode: "replace" | "append" = "append",
    importSource: ParsedInvoiceDocument["importSource"] = "bfs_invoice_pdf",
    practiceTargetStandortId?: string
  ) {
    if (!files?.length) return;
    const importableFiles = [...files].filter(isPdfUploadFile);
    const targetStandortId = importSource === "practice_software_pdf"
      ? practiceTargetStandortId ?? practiceStandortId
      : practiceStandortId;
    setSelectedFileCount(importableFiles.length);
    setActiveUploadSource(importSource);
    if (importSource === "practice_software_pdf") setPracticeStandortId(targetStandortId);
    if (!importableFiles.length) {
      setUploadStatus("Keine Rechnungs-PDFs gefunden");
      return;
    }
    setIsProcessing(true);
    setUploadStatus(importSource === "practice_software_pdf"
      ? `0 von ${importableFiles.length} Dateien vorbereitet`
      : `0 von ${importableFiles.length} Dateien ausgelesen`);
    try {
      const existingRows = mode === "replace" ? [] : await loadConfirmedInvoiceRows().catch(() => invoiceRows);
      if (mode === "replace") onRowsChange([]);
      const practiceStandort = orderedStandorte().find((standort) => standort.id === targetStandortId);
      const parsedRows = importSource === "practice_software_pdf" && practiceStandort
        ? await parsePracticeSoftwareOcrFilesLazy(importableFiles, practiceStandort, (progress) => {
          const shortName = progress.fileName.length > 34 ? `${progress.fileName.slice(0, 31)}...` : progress.fileName;
          if (progress.totalPages) {
            setUploadStatus(`${shortName}: ${progress.processedPages} von ${progress.totalPages} Seiten ausgelesen`);
          } else if (typeof progress.progress === "number") {
            setUploadStatus(`${Math.round(progress.progress * 100)} % vorbereitet`);
          }
        })
        : await parseInvoiceFiles(importableFiles, (processed, total, fileName) => {
          const shortName = fileName.length > 34 ? `${fileName.slice(0, 31)}...` : fileName;
          setUploadStatus(`${processed} von ${total} Rechnungen gelesen (${shortName})`);
        }, {
          importSource,
          standortId: importSource === "practice_software_pdf" ? targetStandortId : undefined
        });
      const nextRows = mergeInvoiceRows(existingRows, parsedRows);
      onRowsChange(nextRows);
      setPendingInvoiceRows((current) => mergeInvoiceRows(mode === "append" ? current : [], parsedRows));
      const ocrRequired = parsedRows.filter((row) => row.ocrStatus === "required").length;
      setUploadStatus(ocrRequired
        ? `${ocrRequired} Praxissoftware-PDFs brauchen OCR, ${nextRows.length} Einträge insgesamt in der Vorschau`
        : `${parsedRows.length} Rechnungen ausgelesen, ${nextRows.length} eindeutige Rechnungen insgesamt in der Vorschau`);
    } catch (error) {
      if (mode === "replace") {
        onRowsChange([]);
        setPendingInvoiceRows([]);
      }
      setUploadStatus(`Rechnungen konnten nicht vollständig gelesen werden: ${error instanceof Error ? error.message : "unbekannter Fehler"}`);
    } finally {
      setIsProcessing(false);
    }
  }

  async function confirmInvoiceImport() {
    if (!invoiceRows.length || isProcessing || isSaving || isResetting) return;
    if (ocrRequiredRows) {
      setUploadStatus("Praxissoftware-Bild-PDFs können erst nach OCR bestätigt werden.");
      return;
    }
    setIsSaving(true);
    setUploadStatus(`${invoiceRows.length} Rechnungen werden mit dem bestehenden Datenstand abgeglichen`);
    try {
      const rowsToSave = pendingInvoiceRows.length ? pendingInvoiceRows : invoiceRows;
      const result = await saveConfirmedInvoiceRows(rowsToSave);
      onRowsChange(result.rows);
      setPendingInvoiceRows([]);
      const detail = result.persistence
        ? `${result.persistence.imported} neu gespeichert, ${result.persistence.duplicates} bestehende ersetzt/übersprungen, ${result.persistence.failed} fehlgeschlagen`
        : `${result.rows.length} gespeicherte Rechnungen geladen`;
      setUploadStatus(`Rechnungsimport bestätigt: ${detail}`);
      setImportCompletion({
        title: "Rechnungsimport fertig eingelesen",
        message: "Alle bestätigten Einzelrechnungen sind gespeichert und in der BFS-Rechnungsanalyse verfügbar.",
        detail
      });
    } catch (error) {
      setUploadStatus(`Rechnungsimport konnte nicht bestätigt werden: ${error instanceof Error ? error.message : "unbekannter Fehler"}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmPracticeInvoiceImport(standortId: string) {
    const standort = practiceImportStandorte.find((entry) => entry.id === standortId);
    const practiceRows = invoiceRows.filter((row) => row.importSource === "practice_software_pdf" && row.standortId === standortId);
    if (!practiceRows.length || isProcessing || isSaving || isResetting) return;
    if (practiceRows.some((row) => row.ocrStatus === "required")) {
      setUploadStatus(`${standort?.name ?? "Praxis"}-Upload kann erst nach OCR gespeichert werden.`);
      return;
    }
    setIsSaving(true);
    setActiveUploadSource("practice_software_pdf");
    setPracticeStandortId(standortId);
    setUploadStatus(`${practiceRows.length} ${standort?.name ?? "Praxis"}-Rechnungen werden gespeichert`);
    try {
      const result = await saveConfirmedInvoiceRows(practiceRows);
      const remainingPreviewRows = invoiceRows.filter((row) => !(row.importSource === "practice_software_pdf" && row.standortId === standortId));
      onRowsChange(mergeInvoiceRows(result.rows, remainingPreviewRows));
      setPendingInvoiceRows((current) => current.filter((row) => !(row.importSource === "practice_software_pdf" && row.standortId === standortId)));
      const detail = result.persistence
        ? `${result.persistence.imported} neu gespeichert, ${result.persistence.duplicates} bestehende ersetzt/übersprungen, ${result.persistence.failed} fehlgeschlagen`
        : `${practiceRows.length} Rechnungen gespeichert`;
      setUploadStatus(`${standort?.name ?? "Praxis"}-Upload gespeichert: ${detail}`);
      setImportCompletion({
        title: `${standort?.name ?? "Praxis"}-Upload fertig eingelesen`,
        message: "Alle bestätigten Praxissoftware-Rechnungen sind gespeichert und in der BFS-Rechnungsanalyse verfügbar.",
        detail
      });
    } catch (error) {
      setUploadStatus(`${standort?.name ?? "Praxis"}-Upload konnte nicht gespeichert werden: ${error instanceof Error ? error.message : "unbekannter Fehler"}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function resetInvoiceUpload() {
    if (isProcessing || isSaving || isResetting || !invoiceRows.length) return;
    setIsResetting(true);
    setUploadStatus("Rechnungsupload wird zurückgesetzt");
    try {
      await clearConfirmedInvoiceRows();
      onRowsChange([]);
      setPendingInvoiceRows([]);
      setSelectedFileCount(0);
      setUploadStatus("Rechnungsupload zurückgesetzt");
    } catch (error) {
      setUploadStatus(`Rechnungsupload konnte nicht zurückgesetzt werden: ${error instanceof Error ? error.message : "unbekannter Fehler"}`);
    } finally {
      setIsResetting(false);
    }
  }

  async function resetPracticeInvoiceUpload(standortId = practiceStandortId) {
    const standort = practiceImportStandorte.find((entry) => entry.id === standortId);
    const practiceRowsForStandort = invoiceRows.filter((row) => row.importSource === "practice_software_pdf" && row.standortId === standortId).length;
    if (isProcessing || isSaving || isResetting || !practiceRowsForStandort) return;
    setIsResetting(true);
    setActiveUploadSource("practice_software_pdf");
    setPracticeStandortId(standortId);
    setUploadStatus(`${standort?.name ?? "Praxis"}-Upload wird zurückgesetzt`);
    try {
      const result = await clearConfirmedInvoiceRows({
        source: "practice_software_pdf",
        standortId
      });
      const remainingRows = result.rows?.length
        ? result.rows
        : invoiceRows.filter((row) => !(row.importSource === "practice_software_pdf" && row.standortId === standortId));
      onRowsChange(remainingRows);
      setPendingInvoiceRows((current) => current.filter((row) => !(row.importSource === "practice_software_pdf" && row.standortId === standortId)));
      setSelectedFileCount(0);
      setUploadStatus(`${standort?.name ?? "Praxis"}-Upload zurückgesetzt`);
    } catch (error) {
      setUploadStatus(`Praxissoftware-Upload konnte nicht zurückgesetzt werden: ${error instanceof Error ? error.message : "unbekannter Fehler"}`);
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="content-stack">
      <section className="upload-zone">
        <ReceiptText size={28} />
        <div>
          <h2>Patientenrechnungen aus dem BFS-Portal einreichen</h2>
          <p>Die App liest Rechnungs-PDFs auch aus Unterordnern, erkennt den Standort über BFS-Mandant und Anschrift und trennt Rechnungskopf, Leistungspositionen, Eigenlabor und Fremdlabor.</p>
          <InvoiceUploadStatus
            active={activeUploadSource === "bfs_invoice_pdf"}
            isProcessing={isProcessing}
            hasRows={Boolean(invoiceRows.length)}
            status={uploadStatus}
          />
        </div>
        <div className="upload-actions">
          <label className={isProcessing ? "file-upload-button disabled" : "file-upload-button"}>
            <Upload size={16} />
            Rechnungs-PDFs
            <input disabled={isProcessing} type="file" multiple accept=".pdf,application/pdf" onChange={(event) => handleInvoiceFiles(event.target.files, "append")} />
          </label>
          <label className={isProcessing ? "file-upload-button secondary-upload disabled" : "file-upload-button secondary-upload"}>
            <FolderUp size={16} />
            Ordner inkl. Unterordner
            <input
              disabled={isProcessing}
              type="file"
              multiple
              accept=".pdf,application/pdf"
              onChange={(event) => handleInvoiceFiles(event.target.files, "append")}
              {...{ webkitdirectory: "", directory: "" }}
            />
          </label>
          <button className="secondary-button reset-upload-button" disabled={isProcessing || isSaving || isResetting || !invoiceRows.length} onClick={() => void resetInvoiceUpload()}>
            <X size={16} />
            {isResetting ? "Wird zurückgesetzt..." : "Upload zurücksetzen"}
          </button>
          <button className="primary-button" disabled={isProcessing || isSaving || isResetting || !canConfirmImport} onClick={() => void confirmInvoiceImport()}>
            <CheckCircle2 size={16} />
            {isSaving ? "Speichern..." : "Rechnungsimport bestätigen"}
          </button>
        </div>
      </section>
      <section className="upload-zone">
        <HardDriveUpload size={28} />
        <div>
          <div className="panel-heading compact-heading">
            <div>
              <h2>Praxissoftware-PDF je Praxis prüfen</h2>
              <p>Bleibt vorbereitet, ist aber standardmäßig eingeklappt.</p>
            </div>
            <button className="secondary-button" type="button" onClick={() => setPracticeImportOpen((current) => !current)}>
              <ChevronDown size={16} />
              {practiceImportOpen ? "Einklappen" : "Ausklappen"}
            </button>
          </div>
          {practiceImportOpen && (
            <>
              <p>Jede Praxis hat einen eigenen Uploadplatz, weil Sammeldrucke je Software und Einstellung anders aussehen können. Kallweit ist bereits als Formatprofil vorbereitet; neue Praxisformate bleiben zur Prüfung markiert.</p>
              <div className="practice-import-grid">
                {practiceImportStandorte.map((standort) => {
                  const profile = practiceSoftwareImportProfile(standort);
                  const practiceRowsForStandort = invoiceRows.filter((row) => row.importSource === "practice_software_pdf" && row.standortId === standort.id);
                  const practiceRowsForStandortCount = practiceRowsForStandort.length;
                  const practiceHasOcrRequired = practiceRowsForStandort.some((row) => row.ocrStatus === "required");
                  const isActivePractice = activeUploadSource === "practice_software_pdf" && practiceStandortId === standort.id;
                  return (
                    <article className={isActivePractice ? "practice-import-card active" : "practice-import-card"} key={standort.id}>
                      <div>
                        <span>{standort.name}</span>
                        <strong>{standort.praxisname}</strong>
                        <small>{profile.label} · {practiceRowsForStandortCount ? `${integerNumber.format(practiceRowsForStandortCount)} Rechnungen im Import` : "kein Praxisupload geladen"}</small>
                      </div>
                      <p>{profile.hint}</p>
                      <div className="practice-import-actions">
                        <label className={isProcessing ? "file-upload-button disabled" : "file-upload-button"}>
                          <Upload size={16} />
                          Sammel-PDF
                          <input disabled={isProcessing} type="file" multiple accept=".pdf,application/pdf" onChange={(event) => handleInvoiceFiles(event.target.files, "append", "practice_software_pdf", standort.id)} />
                        </label>
                        <label className={isProcessing ? "file-upload-button secondary-upload disabled" : "file-upload-button secondary-upload"}>
                          <FolderUp size={16} />
                          Praxisordner
                          <input
                            disabled={isProcessing}
                            type="file"
                            multiple
                            accept=".pdf,application/pdf"
                            onChange={(event) => handleInvoiceFiles(event.target.files, "append", "practice_software_pdf", standort.id)}
                            {...{ webkitdirectory: "", directory: "" }}
                          />
                        </label>
                        <button className="primary-button" disabled={isProcessing || isSaving || isResetting || !practiceRowsForStandortCount || practiceHasOcrRequired} onClick={() => void confirmPracticeInvoiceImport(standort.id)}>
                          <CheckCircle2 size={16} />
                          {isSaving && isActivePractice ? "Speichern..." : "Speichern"}
                        </button>
                        <button className="secondary-button reset-upload-button" disabled={isProcessing || isSaving || isResetting || !practiceRowsForStandortCount} onClick={() => void resetPracticeInvoiceUpload(standort.id)}>
                          <X size={16} />
                          Zurücksetzen
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <InvoiceUploadStatus
                active={activeUploadSource === "practice_software_pdf"}
                isProcessing={isProcessing}
                hasRows={Boolean(invoiceRows.length)}
                status={uploadStatus}
              />
            </>
          )}
        </div>
      </section>
      <section className="priority-grid">
        <PriorityCard label="Rechnungen" value={String(isProcessing ? selectedFileCount : invoiceRows.length)} hint={isProcessing ? "werden ausgelesen" : "eindeutige PDFs"} tone="blue" />
        <PriorityCard label="Positionen" value={String(serviceCount)} hint="Leistungsnummern mit Faktor" tone="blue" />
        <PriorityCard label="Laborfälle" value={String(labCount)} hint="Eigenlabor oder Fremdlabor" tone="amber" />
        <PriorityCard label="Zu prüfen" value={String(reviewRows)} hint="fehlende Felder oder Zuordnung" tone={reviewRows ? "amber" : "green"} />
        <PriorityCard label="OCR offen" value={String(ocrRequiredRows)} hint="Praxissoftware-Bild-PDFs" tone={ocrRequiredRows ? "amber" : "green"} />
      </section>
      <section className="insight-grid">
        <InsightCard title="Mengenfähig vorbereitet" items={["Einzeldateien und Ordner werden übernommen", "Sammel-PDFs werden in Rechnungen aufgeteilt", "Dubletten laufen über Rechnungsdaten und Datei-Hash"]} />
        <InsightCard title="Standortzuordnung" items={["BFS-PDFs: über Mandant und Anschrift", "Praxissoftware-PDFs: über die Vorauswahl", "Neue Praxisformate bleiben zur Prüfung markiert"]} />
        <InsightCard title="Extraktion" items={["Rechnungskopf, Betrag und Patient", "Leistungsnummer, Faktor, Anzahl und EUR", "Eigenlabor und Fremdlabor getrennt"]} />
      </section>
      <InvoiceImportPreview rows={invoiceRows} />
      <ImportCompletionPopup completion={importCompletion} onClose={() => setImportCompletion(null)} />
    </div>
  );
}

function InvoiceUploadStatus({ active, isProcessing, hasRows, status }: { active: boolean; isProcessing: boolean; hasRows: boolean; status: string }) {
  if (!active && isProcessing) return null;
  const stateLabel = isProcessing ? "Fortschritt" : hasRows ? "Fertig" : "Bereit";
  return (
    <div className={isProcessing ? "upload-status processing" : hasRows ? "upload-status done" : "upload-status"} aria-live="polite">
      <RefreshCw size={14} />
      <span>{stateLabel}</span>
      <strong>{active ? status : "Bereit für diesen Uploadweg"}</strong>
    </div>
  );
}

function ImportCompletionPopup({ completion, onClose }: { completion: { title: string; message: string; detail: string } | null; onClose: () => void }) {
  if (!completion) return null;
  return (
    <div className="import-completion-popup" role="status" aria-live="assertive">
      <div className="import-completion-icon"><CheckCircle2 size={22} /></div>
      <div>
        <strong>{completion.title}</strong>
        <p>{completion.message}</p>
        <small>{completion.detail}</small>
      </div>
      <button type="button" onClick={onClose} aria-label="Fertigmeldung schließen">OK</button>
    </div>
  );
}

function practiceSoftwareImportProfile(standort?: Standort) {
  if (standort?.id === "kirchberg") {
    return {
      label: "Formatprofil Kallweit geprüft",
      hint: "OCR und Positionsauslesung sind für den Kallweit-Sammeldruck getestet; Prüffälle bleiben markiert."
    };
  }
  return {
    label: "Neues Formatprofil",
    hint: "Upload wird gelesen und der Praxis zugeordnet, bleibt aber bis zur Layout-Prüfung im Status Zu prüfen."
  };
}

type InvoiceServiceSortKey = "code" | "description" | "count" | "avgFactor" | "groupAvgFactor" | "factorDelta" | "factorSpread" | "amount" | "locations";
type InvoiceCatalogStatus = "ok" | "corrected" | "review" | "ignored";

type InvoiceCatalogEntry = {
  system: "GOZ" | "GOÄ" | "BEMA" | "Eigen";
  code: string;
  description: string;
  aliases?: string[];
};

type InvoiceCatalogCheckRow = {
  key: string;
  status: InvoiceCatalogStatus;
  system: InvoiceCatalogEntry["system"] | "Unbekannt" | "Ignorieren";
  originalCode: string;
  catalogCode: string;
  originalDescription: string;
  catalogDescription: string;
  note: string;
  invoiceNo: string;
  invoiceDate: string;
  standortName: string;
  patientName: string;
  factor?: number;
  amount: number;
};

const invoiceCatalogEntries: InvoiceCatalogEntry[] = [
  { system: "GOÄ", code: "Ä1", description: "Beratung, auch mittels Fernsprecher", aliases: ["Ä0001", "A1", "Ae1"] },
  { system: "GOÄ", code: "Ä5", description: "Symptombezogene Untersuchung", aliases: ["Ä0005", "A5", "Ae5"] },
  { system: "GOÄ", code: "Ä70", description: "Kurze Bescheinigung oder kurzes Zeugnis", aliases: ["Ä0070", "A70", "Ae70"] },
  { system: "GOÄ", code: "Ä2428", description: "Eröffnung eines oberflächlich unter der Haut gelegenen Abszesses", aliases: ["A2428", "Ae2428"] },
  { system: "BEMA", code: "100A", description: "Wiederherstellung von Prothesen, kleineren Umfanges", aliases: ["100a"] },
  { system: "BEMA", code: "100B", description: "Wiederherstellung von Prothesen, größeren Umfanges", aliases: ["100b"] },
  { system: "BEMA", code: "100C", description: "Erweiterung einer Prothese", aliases: ["100c"] },
  { system: "BEMA", code: "100D", description: "Wiederherstellung und Erweiterung einer Prothese", aliases: ["100d"] },
  { system: "BEMA", code: "13A0", description: "Füllung, einflächig", aliases: ["13A", "13AO"] },
  { system: "BEMA", code: "13B0", description: "Füllung, zweiflächig", aliases: ["13B", "13BO"] },
  { system: "BEMA", code: "13C0", description: "Füllung, dreiflächig", aliases: ["13C", "13CO"] },
  { system: "BEMA", code: "13D0", description: "Füllung, mehrflächig", aliases: ["13D", "13DO"] },
  { system: "GOZ", code: "0010", description: "Untersuchung zur Feststellung von Zahn-, Mund- und Kiefererkrankungen" },
  { system: "GOZ", code: "0030", description: "Aufstellung eines Heil- und Kostenplans" },
  { system: "GOZ", code: "0040", description: "Aufstellung eines Heil- und Kostenplans bei KFO oder FAL/FTL" },
  { system: "GOZ", code: "0050", description: "Abformung oder Teilabformung eines Kiefers für ein Situationsmodell" },
  { system: "GOZ", code: "0065", description: "Optisch-elektronische Abformung" },
  { system: "GOZ", code: "0070", description: "Vitalitätsprüfung eines Zahnes oder mehrerer Zähne" },
  { system: "GOZ", code: "0080", description: "Intraorale Oberflächenanästhesie" },
  { system: "GOZ", code: "0090", description: "Intraorale Infiltrationsanästhesie" },
  { system: "GOZ", code: "0100", description: "Intraorale Leitungsanästhesie" },
  { system: "GOZ", code: "1000", description: "Erstellen eines Mundhygienestatus und eingehende Unterweisung" },
  { system: "GOZ", code: "1010", description: "Kontrolle des Übungserfolges einschließlich weiterer Unterweisung" },
  { system: "GOZ", code: "1040", description: "Professionelle Zahnreinigung" },
  { system: "GOZ", code: "2000", description: "Versiegelung von kariesfreien Zahnfissuren" },
  { system: "GOZ", code: "2010", description: "Behandlung überempfindlicher Zahnflächen" },
  { system: "GOZ", code: "2020", description: "Temporärer speicheldichter Verschluss einer Kavität" },
  { system: "GOZ", code: "2050", description: "Präparieren einer Kavität und Restauration mit plastischem Füllungsmaterial, einflächig" },
  { system: "GOZ", code: "2060", description: "Kompositfüllung in Adhäsivtechnik, einflächig" },
  { system: "GOZ", code: "2070", description: "Präparieren einer Kavität und Restauration mit plastischem Füllungsmaterial, zweiflächig" },
  { system: "GOZ", code: "2080", description: "Kompositfüllung in Adhäsivtechnik, zweiflächig" },
  { system: "GOZ", code: "2100", description: "Kompositfüllung in Adhäsivtechnik, dreiflächig" },
  { system: "GOZ", code: "2120", description: "Kompositfüllung in Adhäsivtechnik, mehrflächig" },
  { system: "GOZ", code: "2130", description: "Kontrolle, Finieren/Polieren einer Restauration" },
  { system: "GOZ", code: "2170", description: "Einlagefüllung, mehr als zweiflächig" },
  { system: "GOZ", code: "2210", description: "Versorgung eines Zahnes durch eine Vollkrone" },
  { system: "GOZ", code: "2290", description: "Entfernen einer Einlagefüllung, Krone oder Brücke" },
  { system: "GOZ", code: "2310", description: "Wiedereingliederung einer Einlagefüllung" },
  { system: "GOZ", code: "2320", description: "Wiederherstellung einer Krone, Teilkrone oder Brücke" },
  { system: "GOZ", code: "2430", description: "Medikamentöse Einlage" },
  { system: "GOZ", code: "2440", description: "Füllung eines Wurzelkanals" },
  { system: "GOZ", code: "3020", description: "Entfernung eines tief frakturierten oder tief zerstörten Zahnes" },
  { system: "GOZ", code: "3030", description: "Entfernung eines Zahnes oder eines enossalen Implantats" },
  { system: "GOZ", code: "3070", description: "Exzision von Schleimhaut oder Granulationsgewebe" },
  { system: "GOZ", code: "3100", description: "Plastische Deckung im Rahmen einer Wundversorgung" },
  { system: "GOZ", code: "4025", description: "Subgingivale medikamentöse antibakterielle Lokalapplikation" },
  { system: "GOZ", code: "4138", description: "Verwendung einer Membran zur Behandlung eines Knochendefekts" },
  { system: "GOZ", code: "5000", description: "Tangentialpräparation" },
  { system: "GOZ", code: "5010", description: "Hohlkehl- und Stufenpräparation" },
  { system: "GOZ", code: "5120", description: "Provisorische Brücke im direkten Verfahren" },
  { system: "GOZ", code: "5140", description: "Provisorische Brücke im direkten Verfahren" },
  { system: "GOZ", code: "5250", description: "Wiederherstellung/Erweiterung einer Prothese" },
  { system: "GOZ", code: "5270", description: "Teilunterfütterung einer Prothese" },
  { system: "GOZ", code: "6000a", description: "Fotos zur Diagnostik, analog berechnet" },
  { system: "GOZ", code: "6040", description: "Maßnahmen zur Umformung eines Kiefers" },
  { system: "GOZ", code: "6130", description: "Entfernung eines Bandes" },
  { system: "GOZ", code: "6190", description: "Beratendes und belehrendes Gespräch" },
  { system: "GOZ", code: "7000", description: "Eingliedern und Anpassen einer Röntgenschablone" },
  { system: "GOZ", code: "8000", description: "Klinische Funktionsanalyse" },
  { system: "GOZ", code: "8010", description: "Registrieren der gelenkbezüglichen Zentrallage" },
  { system: "GOZ", code: "8020", description: "Arbiträre Scharnierachsenbestimmung" },
  { system: "GOZ", code: "8060", description: "Registrieren von Unterkieferbewegungen" },
  { system: "GOZ", code: "9000", description: "Implantatbezogene Analyse" },
  { system: "GOZ", code: "9003", description: "Verwendung einer Orientierungsschablone/Positionierungsschablone" },
  { system: "GOZ", code: "9040", description: "Freilegen eines Implantats" },
  { system: "GOZ", code: "9050", description: "Entfernen und Wiedereinsetzen/Auswechseln eines Aufbauelements" },
  { system: "GOZ", code: "9110", description: "Geschlossene Sinusbodenelevation" },
  { system: "Eigen", code: "ab400", description: "Präzisionsabdruck / Praxis-Eigenposition" },
  { system: "Eigen", code: "b_selbst", description: "Bracket, hochwertig selbstligierend" }
];

const defaultInvoiceCatalogContext = buildInvoiceCatalogContext([]);

function InvoiceCatalogCheckView({ invoiceRows, catalogMappings, onMappingsChange }: { invoiceRows: ParsedInvoiceDocument[]; catalogMappings: InvoiceCatalogMapping[]; onMappingsChange: (mappings: InvoiceCatalogMapping[]) => void }) {
  const reportRef = useRef<HTMLDivElement | null>(null);
  const periodOptions = useMemo(() => buildCustomChartPeriods(), []);
  const [periodId, setPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [standortId, setStandortId] = useState("gruppe");
  const [statusFilter, setStatusFilter] = useState<"alle" | InvoiceCatalogStatus>("alle");
  const [searchTerm, setSearchTerm] = useState("");
  const [mappingDrafts, setMappingDrafts] = useState<Record<string, { targetCode: string; system: InvoiceCatalogMapping["system"] }>>({});
  const [mappingSavingKey, setMappingSavingKey] = useState("");
  const [mappingMessage, setMappingMessage] = useState("");
  const [mappingError, setMappingError] = useState("");
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === periodId) ?? periodOptions[0], [periodOptions, periodId]);
  const invoiceStandorte = useMemo(() => orderedStandorte().filter((standort) => invoiceRows.some((row) => invoiceReadyForAnalysis(row) && (row.standortId === standort.id || row.standortName === standort.name))), [invoiceRows]);
  const selectedStandort = standortId === "gruppe" ? undefined : invoiceStandorte.find((standort) => standort.id === standortId);
  const catalogContext = useMemo(() => buildInvoiceCatalogContext(catalogMappings), [catalogMappings]);
  const rows = useMemo(() => invoiceCatalogCheckRows(invoiceRows, selectedPeriod, selectedStandort, catalogContext), [catalogContext, invoiceRows, selectedPeriod, selectedStandort]);
  const filteredRows = useMemo(() => filterInvoiceCatalogRows(rows, statusFilter, searchTerm), [rows, searchTerm, statusFilter]);
  const kpis = useMemo(() => invoiceCatalogCheckKpis(rows), [rows]);
  const exportScopeLabel = selectedStandort?.name ?? "Alle Standorte";
  const mappingCount = catalogMappings.length;

  const draftForRow = (row: InvoiceCatalogCheckRow) => mappingDrafts[row.key] ?? {
    targetCode: suggestedInvoiceCatalogTargetCode(row),
    system: suggestedInvoiceCatalogSystem(row)
  };

  const updateDraft = (row: InvoiceCatalogCheckRow, patch: Partial<{ targetCode: string; system: InvoiceCatalogMapping["system"] }>) => {
    setMappingDrafts((current) => ({ ...current, [row.key]: { ...draftForRow(row), ...patch } }));
  };

  const saveMappingForRow = async (row: InvoiceCatalogCheckRow, action: InvoiceCatalogMapping["action"]) => {
    const draft = draftForRow(row);
    const targetCode = action === "ignore" ? row.originalCode : draft.targetCode.trim();
    if (action === "map" && !targetCode) {
      setMappingError("Bitte Zielnummer eintragen.");
      return;
    }
    setMappingSavingKey(`${row.key}:${action}`);
    setMappingError("");
    setMappingMessage("");
    try {
      const targetEntry = action === "map"
        ? catalogContext.lookup.get(normalizeInvoiceCatalogCode(targetCode))
        : undefined;
      const mappings = await saveInvoiceCatalogMapping({
        sourceCode: row.originalCode,
        sourceDescription: row.originalDescription,
        targetCode,
        targetDescription: action === "ignore" ? "Bewusst nicht benchmarkfähig" : targetEntry?.description ?? row.originalDescription,
        system: action === "ignore" ? "Ignorieren" : draft.system,
        action
      });
      onMappingsChange(mappings);
      setMappingMessage(action === "ignore" ? `${row.originalCode} wird künftig ignoriert.` : `${row.originalCode} wird künftig als ${targetCode} geführt.`);
    } catch (error) {
      setMappingError(error instanceof Error ? error.message : "Mapping konnte nicht gespeichert werden.");
    } finally {
      setMappingSavingKey("");
    }
  };

  return (
    <div className="content-stack">
      <section className="panel invoice-catalog-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Katalogprüfung</span>
            <h2>Abgleich der Einzelrechnungen mit GOZ, GOÄ, BEMA und Praxis-Mappings</h2>
            <p>Diese Ansicht verändert keine importierten Originaldaten. Sie zeigt, welche Positionen für Auswertungen eindeutig katalogisiert, automatisch zusammengelegt oder zur Prüfung markiert werden.</p>
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
          <span>{selectedPeriod.detail} · {exportScopeLabel}</span>
          <button
            className="secondary-button custom-export-action"
            type="button"
            onClick={() => printCustomTabPdf(reportRef.current, `Katalogprüfung · ${exportScopeLabel} · ${selectedPeriod.label}`)}
            disabled={!filteredRows.length}
          >
            <Printer size={16} /> PDF Export
          </button>
        </div>
        <section className="priority-grid invoice-service-kpi-grid">
          <PriorityCard label="Katalogisiert" value={formatPercent(kpis.matchRate)} hint={`${integerNumber.format(kpis.known)} von ${integerNumber.format(kpis.total)} Positionen`} tone={kpis.review ? "amber" : "green"} />
          <PriorityCard label="Automatisch korrigiert" value={integerNumber.format(kpis.corrected)} hint="eindeutige Synonyme/OCR-Fälle" tone={kpis.corrected ? "green" : "blue"} />
          <PriorityCard label="Zu prüfen" value={integerNumber.format(kpis.review)} hint="kein eindeutiger Katalogtreffer" tone={kpis.review ? "amber" : "green"} />
          <PriorityCard label="GOZ / GOÄ / BEMA" value={`${integerNumber.format(kpis.goz)} / ${integerNumber.format(kpis.goa)} / ${integerNumber.format(kpis.bema)}`} hint="katalogisierte Leistungsarten" tone="blue" />
        </section>
        <div className="table-filter-bar">
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "alle" | InvoiceCatalogStatus)}>
              <option value="alle">Alle Positionen</option>
              <option value="review">Nur zu prüfen</option>
              <option value="corrected">Nur korrigiert</option>
              <option value="ignored">Nur ignoriert</option>
              <option value="ok">Nur OK</option>
            </select>
          </label>
          <label>
            Suche
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nr., Leistung, Standort, Patient"
            />
          </label>
          <span>{integerNumber.format(filteredRows.length)} von {integerNumber.format(rows.length)} Positionen</span>
        </div>
        <div className="filter-status-note">
          {mappingMessage || mappingError || `${integerNumber.format(mappingCount)} gespeicherte Katalogregel${mappingCount === 1 ? "" : "n"} aktiv`}
        </div>
      </section>
      <section className="panel" ref={reportRef}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Prüfliste</span>
            <h2>Katalogabgleich je Leistungszeile</h2>
          </div>
        </div>
        <div className="table-wrap compact-table invoice-services-scroll">
          <table className="invoice-catalog-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Original aus Rechnung</th>
                <th>Verwendet als</th>
                <th>Katalogart</th>
                <th>Katalogtext</th>
                <th>Standort</th>
                <th>Rechnung</th>
                <th>Faktor</th>
                <th>Hinweis</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? filteredRows.map((row) => (
                <tr key={row.key}>
                  <td><StatusBadge status={invoiceCatalogStatusLabel(row.status)} /></td>
                  <td><strong>{row.originalCode}</strong><br /><small>{row.originalDescription}</small></td>
                  <td><strong>{row.catalogCode}</strong></td>
                  <td>{row.system}</td>
                  <td>{row.catalogDescription}</td>
                  <td>{row.standortName}</td>
                  <td>{row.invoiceNo}<br /><small>{row.invoiceDate}</small></td>
                  <td>{row.factor ? feeRateNumber.format(row.factor) : "-"}</td>
                  <td>{row.note}</td>
                  <td>
                    {row.status === "review" ? (
                      <div className="catalog-mapping-actions">
                        <input
                          value={draftForRow(row).targetCode}
                          onChange={(event) => updateDraft(row, { targetCode: event.target.value })}
                          aria-label={`Zielnummer für ${row.originalCode}`}
                        />
                        <select
                          value={draftForRow(row).system}
                          onChange={(event) => updateDraft(row, { system: event.target.value as InvoiceCatalogMapping["system"] })}
                          aria-label={`Katalogart für ${row.originalCode}`}
                        >
                          <option value="GOZ">GOZ</option>
                          <option value="GOÄ">GOÄ</option>
                          <option value="BEMA">BEMA</option>
                          <option value="Eigen">Eigen</option>
                        </select>
                        <button type="button" className="secondary-button" disabled={Boolean(mappingSavingKey)} onClick={() => void saveMappingForRow(row, "map")}>
                          {mappingSavingKey === `${row.key}:map` ? "Speichern..." : "Mapping speichern"}
                        </button>
                        <button type="button" className="secondary-button" disabled={Boolean(mappingSavingKey)} onClick={() => void saveMappingForRow(row, "ignore")}>
                          {mappingSavingKey === `${row.key}:ignore` ? "Speichern..." : "Ignorieren"}
                        </button>
                      </div>
                    ) : (
                      <span className="muted-table-note">keine Aktion nötig</span>
                    )}
                  </td>
                </tr>
              )) : <EmptyTableRow colSpan={10} label="Keine Positionen im gewählten Filter." />}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function InvoiceServicesView({ invoiceRows, catalogMappings }: { invoiceRows: ParsedInvoiceDocument[]; catalogMappings: InvoiceCatalogMapping[] }) {
  const tableExportRef = useRef<HTMLDivElement | null>(null);
  const periodOptions = useMemo(() => buildCustomChartPeriods(), []);
  const [periodId, setPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [standortId, setStandortId] = useState("gruppe");
  const [sort, setSort] = useState<{ key: InvoiceServiceSortKey; direction: SortDirection }>({ key: "count", direction: "desc" });
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === periodId) ?? periodOptions[0], [periodOptions, periodId]);
  const invoiceStandorte = useMemo(() => orderedStandorte().filter((standort) => invoiceRows.some((row) => invoiceReadyForAnalysis(row) && (row.standortId === standort.id || row.standortName === standort.name))), [invoiceRows]);
  const selectedStandort = standortId === "gruppe" ? undefined : invoiceStandorte.find((standort) => standort.id === standortId);
  const catalogContext = useMemo(() => buildInvoiceCatalogContext(catalogMappings), [catalogMappings]);
  const rows = useMeasuredMemo("Leistungsübersicht Zusammenfassung", () => invoiceServiceSummary(invoiceRows, selectedPeriod, selectedStandort, catalogContext), [catalogContext, invoiceRows, selectedPeriod, selectedStandort], (value) => `${integerNumber.format(value.length)} Leistungen`);
  const filteredRows = useMeasuredMemo("Leistungsübersicht Filter", () => filterInvoiceServiceRows(rows, descriptionFilter), [rows, descriptionFilter], (value) => `${integerNumber.format(value.length)} Treffer`);
  const sortedRows = useMeasuredMemo("Leistungsübersicht Sortierung", () => sortInvoiceServiceRows(filteredRows, sort.key, sort.direction), [filteredRows, sort], (value) => `${integerNumber.format(value.length)} Zeilen`);
  const kpis = useMeasuredMemo("Leistungsübersicht KPIs", () => invoiceServicesKpis(invoiceRows, selectedPeriod, selectedStandort, rows), [invoiceRows, rows, selectedPeriod, selectedStandort], (value) => `${integerNumber.format(value.serviceCodeCount)} Leistungen`);
  const hasLocationFactorComparison = kpis.locationFactorCount > 1;
  const comparisonLabel = selectedStandort ? `Gruppenschnitt ohne ${selectedStandort.name}` : "Gruppenschnitt";
  const exportScopeLabel = selectedStandort?.name ?? "Alle Standorte";
  const toggleSort = (key: InvoiceServiceSortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key ? (current.direction === "asc" ? "desc" : "asc") : defaultInvoiceServiceSortDirection(key)
    }));
  };
  return (
    <div className="content-stack">
      <section className="panel invoice-services-panel">
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
          <span>{selectedPeriod.detail} · {integerNumber.format(kpis.invoiceCount)} Rechnungen mit Leistungsdaten · {comparisonLabel}</span>
          <button
            className="secondary-button custom-export-action"
            type="button"
            onClick={() => printCustomTabPdf(tableExportRef.current, `Leistungsübersicht · ${exportScopeLabel} · ${selectedPeriod.label}`)}
            disabled={!sortedRows.length}
          >
            <Printer size={16} /> PDF Export
          </button>
        </div>
        <section className="priority-grid invoice-service-kpi-grid">
          <PriorityCard label="Häufigste Position" value={kpis.mostFrequent?.code ?? "-"} hint={kpis.mostFrequent ? `${integerNumber.format(kpis.mostFrequent.count)}x · Ø Faktor ${feeRateNumber.format(kpis.mostFrequent.avgFactor)}` : "keine Leistungsdaten"} tone="blue" info={kpis.mostFrequent ? kpis.mostFrequent.description : undefined} />
          <PriorityCard label={hasLocationFactorComparison ? "Höchster Standortfaktor" : "Ø Standortfaktor"} value={(hasLocationFactorComparison ? kpis.highestFactorLocation : kpis.singleFactorLocation)?.standortName ?? "-"} hint={(hasLocationFactorComparison ? kpis.highestFactorLocation : kpis.singleFactorLocation) ? `Ø Faktor ${feeRateNumber.format((hasLocationFactorComparison ? kpis.highestFactorLocation : kpis.singleFactorLocation)?.avgFactor ?? 0)} · ${integerNumber.format((hasLocationFactorComparison ? kpis.highestFactorLocation : kpis.singleFactorLocation)?.serviceCount ?? 0)} Positionen` : "keine Faktorwerte"} tone="green" />
          <PriorityCard label={hasLocationFactorComparison ? "Niedrigster Standortfaktor" : "Standortvergleich"} value={hasLocationFactorComparison ? kpis.lowestFactorLocation?.standortName ?? "-" : "Noch offen"} hint={hasLocationFactorComparison && kpis.lowestFactorLocation ? `Ø Faktor ${feeRateNumber.format(kpis.lowestFactorLocation.avgFactor)} · ${integerNumber.format(kpis.lowestFactorLocation.serviceCount)} Positionen` : "erst ab 2 Standorten sinnvoll"} tone="amber" />
          <PriorityCard label="Umsatzstärkste Position" value={kpis.topAmount?.code ?? "-"} hint={kpis.topAmount ? `${money.format(kpis.topAmount.amount)} · ${integerNumber.format(kpis.topAmount.count)}x` : "keine Leistungsdaten"} tone="green" info={kpis.topAmount ? kpis.topAmount.description : undefined} />
          <PriorityCard label="Größte Faktorstreuung" value={kpis.widestFactorRange?.code ?? "-"} hint={kpis.widestFactorRange ? `${feeRateNumber.format(kpis.widestFactorRange.minFactor)} bis ${feeRateNumber.format(kpis.widestFactorRange.maxFactor)}` : "keine Faktorwerte"} tone={kpis.widestFactorRange ? "amber" : "blue"} info={kpis.widestFactorRange ? kpis.widestFactorRange.description : undefined} />
          <PriorityCard label="Katalogprüfung" value={integerNumber.format(kpis.catalogReviewCount)} hint={`${integerNumber.format(kpis.catalogCorrectionCount)} automatisch korrigiert`} tone={kpis.catalogReviewCount ? "amber" : "green"} />
        </section>
        <div className="table-filter-bar">
          <label>
            Leistung suchen
            <input
              type="search"
              value={descriptionFilter}
              onChange={(event) => setDescriptionFilter(event.target.value)}
              placeholder="z. B. Füllung, Mundhygiene, Implantat"
            />
          </label>
          <label>
            Sortieren
            <select
              value={`${sort.key}:${sort.direction}`}
              onChange={(event) => {
                const [key, direction] = event.target.value.split(":") as [InvoiceServiceSortKey, SortDirection];
                setSort({ key, direction });
              }}
            >
              <option value="count:desc">Häufigkeit absteigend</option>
              <option value="count:asc">Häufigkeit aufsteigend</option>
              <option value="avgFactor:desc">Ø Faktor absteigend</option>
              <option value="avgFactor:asc">Ø Faktor aufsteigend</option>
              <option value="amount:desc">Summe absteigend</option>
              <option value="amount:asc">Summe aufsteigend</option>
              <option value="factorSpread:desc">Min/Max-Spanne absteigend</option>
              <option value="factorDelta:desc">Delta absteigend</option>
              <option value="description:asc">Leistung A-Z</option>
              <option value="code:asc">Nr. aufsteigend</option>
            </select>
          </label>
          <span>{integerNumber.format(sortedRows.length)} von {integerNumber.format(rows.length)} Leistungen</span>
        </div>
        <div className="table-wrap compact-table invoice-services-scroll invoice-services-table-wrap" ref={tableExportRef}>
          <table className="invoice-services-table">
            <thead>
              <tr>
                <th><InvoiceServiceSortButton label="Nr." sortKey="code" activeSort={sort} onSort={toggleSort} /></th>
                <th>Katalog</th>
                <th><InvoiceServiceSortButton label="Kurzbeschreibung" sortKey="description" activeSort={sort} onSort={toggleSort} /></th>
                <th><InvoiceServiceSortButton label={selectedStandort ? `${selectedStandort.name} Fälle` : "Häufigkeit"} sortKey="count" activeSort={sort} onSort={toggleSort} /></th>
                <th><InvoiceServiceSortButton label="Ø Faktor" sortKey="avgFactor" activeSort={sort} onSort={toggleSort} /></th>
                <th><InvoiceServiceSortButton label={selectedStandort ? "Gruppenschnitt" : "Gruppen-Ø"} sortKey="groupAvgFactor" activeSort={sort} onSort={toggleSort} /></th>
                <th><InvoiceServiceSortButton label="Delta" sortKey="factorDelta" activeSort={sort} onSort={toggleSort} /></th>
                <th><InvoiceServiceSortButton label="Min / Max" sortKey="factorSpread" activeSort={sort} onSort={toggleSort} /></th>
                <th><InvoiceServiceSortButton label="Summe" sortKey="amount" activeSort={sort} onSort={toggleSort} /></th>
                <th><InvoiceServiceSortButton label="Standorte" sortKey="locations" activeSort={sort} onSort={toggleSort} /></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length ? sortedRows.map((row) => (
                <tr key={row.code}>
                  <td><strong>{row.code}</strong></td>
                  <td>
                    <StatusBadge status={invoiceCatalogServiceStatusLabel(row)} />
                    {row.catalogSystems.length > 0 && <><br /><small>{row.catalogSystems.join(", ")}</small></>}
                  </td>
                  <td>{row.description}</td>
                  <td>{integerNumber.format(row.count)}</td>
                  <td>{row.avgFactor ? feeRateNumber.format(row.avgFactor) : "-"}</td>
                  <td>{row.groupAvgFactor ? feeRateNumber.format(row.groupAvgFactor) : "-"}</td>
                  <td>{row.factorDelta === null ? "-" : formatFactorDelta(row.factorDelta)}</td>
                  <td>{row.minFactor ? `${feeRateNumber.format(row.minFactor)} / ${feeRateNumber.format(row.maxFactor)}` : "-"}</td>
                  <td>{money.format(row.amount)}</td>
                  <td>{row.locations.join(", ")}</td>
                </tr>
              )) : <EmptyTableRow colSpan={10} label="Noch keine Rechnungen im gewählten Filter." />}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function InvoiceBenchmarkView({ invoiceRows }: { invoiceRows: ParsedInvoiceDocument[] }) {
  const managementExportRef = useRef<HTMLDivElement | null>(null);
  const practiceExportRef = useRef<HTMLDivElement | null>(null);
  const periodOptions = useMemo(() => buildCustomChartPeriods(), []);
  const [periodId, setPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const invoiceStandorte = useMemo(() => orderedStandorte().filter((standort) => invoiceRows.some((row) => invoiceReadyForAnalysis(row) && (row.standortId === standort.id || row.standortName === standort.name))), [invoiceRows]);
  const [standortId, setStandortId] = useState(() => invoiceStandorte[0]?.id ?? "");
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === periodId) ?? periodOptions[0], [periodOptions, periodId]);
  const benchmarkRows = useMeasuredMemo("Benchmarking Standortzeilen", () => invoiceBenchmarkRows(invoiceRows, selectedPeriod), [invoiceRows, selectedPeriod], (rows) => `${integerNumber.format(rows.length)} Standorte`);
  const selectedStandort = invoiceStandorte.find((standort) => standort.id === standortId) ?? invoiceStandorte[0];
  const selectedBenchmark = benchmarkRows.find((row) => row.standortId === selectedStandort?.id);
  const selectedServiceRows = useMeasuredMemo("Benchmarking Praxisleistungen", () => invoiceBenchmarkServiceRows(invoiceRows, selectedPeriod, selectedStandort), [invoiceRows, selectedPeriod, selectedStandort], (rows) => `${integerNumber.format(rows.length)} Leistungen`);
  const kpis = useMeasuredMemo("Benchmarking KPIs", () => invoiceBenchmarkKpis(benchmarkRows), [benchmarkRows], (value) => `${integerNumber.format(value.serviceLineCount)} Faktorzeilen`);
  const topServiceRows = selectedServiceRows.slice(0, 12);
  const groupTopServices = useMeasuredMemo("Benchmarking Gruppenleistungen", () => invoiceServiceSummary(invoiceRows, selectedPeriod).slice(0, 10), [invoiceRows, selectedPeriod], (rows) => `${integerNumber.format(rows.length)} Top-Leistungen`);

  useEffect(() => {
    if (!standortId && invoiceStandorte[0]) setStandortId(invoiceStandorte[0].id);
  }, [invoiceStandorte, standortId]);

  return (
    <div className="content-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">BFS-Rechnungsanalyse</span>
            <h2>Klassisches Faktor-Benchmarking</h2>
            <p>Relativer Vergleich je Praxis auf Basis echter Einzelrechnungspositionen. Entscheidend ist nicht die absolute Menge, sondern der Durchschnittsfaktor je Leistung gegen den Gruppenschnitt ohne die betrachtete Praxis.</p>
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
            Praxis-Report
            <select value={selectedStandort?.id ?? ""} onChange={(event) => setStandortId(event.target.value)}>
              {invoiceStandorte.map((standort) => (
                <option key={standort.id} value={standort.id}>{standort.name}</option>
              ))}
            </select>
          </label>
          <span>{selectedPeriod.detail} · Benchmark je Leistung gegen Orisus-Gruppe ohne eigene Praxis</span>
          <button
            className="secondary-button custom-export-action"
            type="button"
            onClick={() => printCustomTabPdf(managementExportRef.current, `Benchmarking Management · ${selectedPeriod.label}`)}
            disabled={!benchmarkRows.length}
          >
            <Printer size={16} /> Management PDF
          </button>
          <button
            className="secondary-button custom-export-action"
            type="button"
            onClick={() => printCustomTabPdf(practiceExportRef.current, `Benchmarking Praxis · ${selectedStandort?.name ?? "Standort"} · ${selectedPeriod.label}`)}
            disabled={!selectedBenchmark}
          >
            <Printer size={16} /> Praxis PDF
          </button>
        </div>
      </section>

      <section className="priority-grid">
        <PriorityCard
          label="Gruppen-Ø Faktor"
          value={feeRateNumber.format(kpis.groupAvgFactor)}
          hint="gewichteter Faktorvergleich"
          tone="blue"
          info={`Durchschnittlicher Faktor aller benchmarkfähigen Einzelrechnungs-Positionen im gewählten Zeitraum. Herleitung: je Standort wird der eigene Ø-Faktor aus allen plausiblen Leistungszeilen mit Faktor gebildet; dieser Gruppenwert ist daraus gewichtet nach Anzahl der Faktorzeilen berechnet. Aktuelle Grundmenge: ${integerNumber.format(kpis.serviceLineCount)} Leistungszeilen.`}
        />
        <PriorityCard
          label="Größter Hebel"
          value={kpis.topPotential?.standortName ?? "-"}
          hint={kpis.topPotential ? benchmarkPriorityLabel(kpis.topPotential.potential) : "kein Hebel"}
          tone={kpis.topPotential?.potential ? "amber" : "blue"}
          info={kpis.topPotential ? `Standort mit dem höchsten rechnerischen Benchmark-Hebel im gewählten Zeitraum. Herleitung: pro Leistung wird der Ø-Faktor der Praxis mit dem anonymisierten Gruppen-Ø ohne diese Praxis verglichen. Nur wenn der Praxisfaktor darunter liegt, entsteht ein Hebel. Die Hebel der Leistungen werden je Standort addiert; höchster Summenwert gewinnt.` : "Kein Standort liegt im aktuellen Filter unter dem anonymisierten Peer-Benchmark."}
        />
        <PriorityCard
          label="Beste Faktorquote"
          value={kpis.bestRelative?.standortName ?? "-"}
          hint={kpis.bestRelative ? `${integerNumber.format(kpis.bestRelative.relativeIndex)} % vom Benchmark` : "keine Daten"}
          tone="green"
          info={kpis.bestRelative ? `Standort mit der höchsten relativen Faktorquote. Herleitung: eigener Ø-Faktor des Standorts geteilt durch den anonymisierten Gruppen-Ø ohne diesen Standort, mal 100. ${integerNumber.format(kpis.bestRelative.relativeIndex)} % bedeutet: der Standort liegt relativ zum Peer-Benchmark bei ${integerNumber.format(kpis.bestRelative.relativeIndex)} %. Werte über 100 % liegen über dem Benchmark.` : "Keine ausreichend vergleichbaren Faktorzeilen im aktuellen Filter."}
        />
        <PriorityCard
          label="Aufholbedarf"
          value={kpis.lowestRelative?.standortName ?? "-"}
          hint={kpis.lowestRelative ? `${integerNumber.format(kpis.lowestRelative.relativeIndex)} % vom Benchmark` : "keine Daten"}
          tone="amber"
          info={kpis.lowestRelative ? `Standort mit der niedrigsten relativen Faktorquote. Herleitung: eigener Ø-Faktor geteilt durch den anonymisierten Gruppen-Ø ohne diesen Standort, mal 100. ${integerNumber.format(kpis.lowestRelative.relativeIndex)} % bedeutet: der Standort liegt im Durchschnitt unter dem Peer-Benchmark; je niedriger der Wert, desto größer der relative Aufholbedarf.` : "Keine ausreichend vergleichbaren Faktorzeilen im aktuellen Filter."}
        />
        <PriorityCard
          label="Benchmark-Hebel"
          value={benchmarkPriorityLabel(kpis.totalPotential)}
          hint="relative Priorität"
          tone={kpis.totalPotential ? "green" : "blue"}
          info={`Management-Priorität aus der Summe aller negativen Faktorabweichungen im Benchmark. Herleitung: alle Leistungen, bei denen eine Praxis unter dem anonymisierten Gruppen-Ø liegt, werden zu einem Gesamt-Hebel verdichtet und in Klassen übersetzt: niedrig, mittel oder hoch. Die Kachel ist eine Priorisierung, kein zusätzlicher Importwert.`}
        />
        <PriorityCard
          label="Vergleichslogik"
          value="Peer-Set"
          hint="anonym je Praxis gerechnet"
          tone="blue"
          info="Jede Praxis wird gegen ein anonymisiertes Peer-Set verglichen. Herleitung: Für Standort A wird der Gruppenbenchmark aus allen anderen Standorten ohne Standort A berechnet; für Standort B entsprechend ohne Standort B. Dadurch vergleicht sich keine Praxis mit sich selbst, und andere Standorte werden im Praxisreport nicht namentlich genannt."
        />
      </section>

      <section className="panel" ref={managementExportRef}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Management-Sicht</span>
            <h2>Standort-Benchmark nach Faktor, Relativindex und Hebelklasse</h2>
            <p>Der Relativindex zeigt, wie nah der durchschnittliche Standortfaktor am jeweiligen Benchmark liegt. 100 % bedeutet: Standort entspricht dem Vergleichsschnitt der Gruppe ohne diesen Standort.</p>
          </div>
        </div>
        <div className="table-wrap compact-table invoice-services-scroll">
          <table className="invoice-benchmark-table">
            <thead>
              <tr>
                <th>Standort</th>
                <th>Relativindex</th>
                <th>Ø Faktor</th>
                <th>Benchmark</th>
                <th>Delta</th>
                <th>Hebelklasse</th>
              </tr>
            </thead>
            <tbody>
              {benchmarkRows.length ? benchmarkRows.map((row) => (
                <tr key={row.standortId}>
                  <td><strong>{row.standortName}</strong><small>{row.praxisname}</small></td>
                  <td><strong>{row.groupAvgFactor ? `${integerNumber.format(row.relativeIndex)} %` : "-"}</strong></td>
                  <td>{row.avgFactor ? feeRateNumber.format(row.avgFactor) : "-"}</td>
                  <td>{row.groupAvgFactor ? feeRateNumber.format(row.groupAvgFactor) : "-"}</td>
                  <td>{row.factorDelta === null ? "-" : formatFactorDelta(row.factorDelta)}</td>
                  <td><strong>{benchmarkPriorityLabel(row.potential)}</strong></td>
                </tr>
              )) : <EmptyTableRow colSpan={6} label="Noch keine benchmarkfähigen Einzelrechnungen im gewählten Zeitraum." />}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel invoice-practice-benchmark-report" ref={practiceExportRef}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Praxis-Report</span>
            <h2>{selectedStandort ? `Benchmark ${selectedStandort.praxisname}` : "Benchmark Praxis"}</h2>
            <p>Für den Ausdruck wird bewusst kein anderer Standort genannt. Vergleichsgröße ist ausschließlich der anonymisierte Durchschnitt der Orisus-Gruppe ohne diese Praxis.</p>
          </div>
        </div>
        <section className="priority-grid">
          <PriorityCard
            label="Ihr Ø Faktor"
            value={selectedBenchmark ? feeRateNumber.format(selectedBenchmark.avgFactor) : "-"}
            hint="gewichteter Praxiswert"
            tone="blue"
            info={selectedBenchmark ? `Durchschnittlicher Faktor dieser Praxis im gewählten Zeitraum. Herleitung: alle plausiblen Leistungszeilen mit Faktor aus den importierten Einzelrechnungen dieser Praxis werden addiert und durch die Anzahl dieser Faktorzeilen geteilt. Aktuelle Grundmenge: ${integerNumber.format(selectedBenchmark.factorCount)} Faktorzeilen.` : "Für diese Praxis liegen im aktuellen Filter keine benchmarkfähigen Faktorzeilen vor."}
          />
          <PriorityCard
            label="Orisus-Gruppe Ø"
            value={selectedBenchmark ? feeRateNumber.format(selectedBenchmark.groupAvgFactor) : "-"}
            hint="ohne diese Praxis"
            tone="blue"
            info={selectedBenchmark ? "Anonymisierter Peer-Benchmark. Herleitung: alle plausiblen Faktorzeilen der übrigen Orisus-Standorte im gleichen Zeitraum werden gemittelt. Die ausgewählte Praxis wird aus dieser Vergleichsgruppe herausgerechnet, damit sie sich nicht mit sich selbst vergleicht." : "Für diesen Zeitraum gibt es keine ausreichende Peer-Grundlage."}
          />
          <PriorityCard
            label="Relativindex"
            value={selectedBenchmark ? `${integerNumber.format(selectedBenchmark.relativeIndex)} %` : "-"}
            hint="Praxisfaktor / Benchmark"
            tone={selectedBenchmark && selectedBenchmark.relativeIndex >= 100 ? "green" : "amber"}
            info={selectedBenchmark ? `Relative Faktorposition dieser Praxis. Formel: Ihr Ø Faktor geteilt durch Orisus-Gruppe Ø ohne diese Praxis, mal 100. ${integerNumber.format(selectedBenchmark.relativeIndex)} % bedeutet: die Praxis erreicht ${integerNumber.format(selectedBenchmark.relativeIndex)} % des anonymisierten Benchmarks. 100 % entspricht Benchmark, über 100 % liegt darüber, unter 100 % darunter.` : "Kein Relativindex berechenbar, weil Praxis- oder Peer-Faktor im aktuellen Filter fehlt."}
          />
          <PriorityCard
            label="Hebelklasse"
            value={selectedBenchmark ? benchmarkPriorityLabel(selectedBenchmark.potential) : "-"}
            hint={selectedPeriod.label}
            tone={selectedBenchmark?.potential ? "green" : "blue"}
            info={selectedBenchmark ? `Einordnung des rechnerischen Faktor-Hebels dieser Praxis. Herleitung: pro Leistung wird geprüft, ob der Praxis-Ø-Faktor unter dem anonymisierten Gruppen-Ø ohne diese Praxis liegt. Nur diese negativen Abweichungen werden je Leistung verdichtet und zur Hebelklasse niedrig, mittel oder hoch zusammengefasst. Die Kachel ist eine Priorisierung, keine Aussage über vollständigen Monatsumsatz.` : "Keine Hebelklasse berechenbar, weil im aktuellen Filter keine benchmarkfähigen Abweichungen vorliegen."}
          />
        </section>
        <div className="table-export-bar">
          <span>{selectedStandort?.name ?? "Praxis"} · {selectedPeriod.label} · anonymisierter Gruppenbenchmark</span>
        </div>
        <div className="table-wrap compact-table invoice-services-scroll">
          <table className="invoice-benchmark-detail-table">
            <thead>
              <tr>
                <th>Leistung</th>
                <th>Kurzbeschreibung</th>
                <th>Ihr Ø Faktor</th>
                <th>Orisus-Gruppe Ø</th>
                <th>Lücke</th>
                <th>Relativindex</th>
                <th>Priorität</th>
              </tr>
            </thead>
            <tbody>
              {topServiceRows.length ? topServiceRows.map((row) => (
                <tr key={row.code}>
                  <td><strong>{row.code}</strong></td>
                  <td>{row.description}</td>
                  <td>{feeRateNumber.format(row.avgFactor)}</td>
                  <td>{feeRateNumber.format(row.groupAvgFactor)}</td>
                  <td>{row.factorDelta === null ? "-" : formatFactorDelta(row.factorDelta)}</td>
                  <td>{integerNumber.format(row.relativeIndex)} %</td>
                  <td><strong>{benchmarkPriorityLabel(row.potential)}</strong></td>
                </tr>
              )) : <EmptyTableRow colSpan={7} label="Diese Praxis liegt im gewählten Zeitraum bei keiner Leistung unter dem anonymisierten Gruppenbenchmark." />}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Gruppenprofil</span>
            <h2>Leistungen, die den Gruppenbenchmark prägen</h2>
          </div>
        </div>
        <div className="table-wrap compact-table invoice-services-scroll">
          <table className="invoice-benchmark-group-table">
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Kurzbeschreibung</th>
                <th>Gruppen-Ø Faktor</th>
                <th>Min / Max</th>
                <th>Streuung</th>
              </tr>
            </thead>
            <tbody>
              {groupTopServices.length ? groupTopServices.map((row) => (
                <tr key={row.code}>
                  <td><strong>{row.code}</strong></td>
                  <td>{row.description}</td>
                  <td>{feeRateNumber.format(row.avgFactor)}</td>
                  <td>{row.minFactor ? `${feeRateNumber.format(row.minFactor)} / ${feeRateNumber.format(row.maxFactor)}` : "-"}</td>
                  <td>{row.minFactor ? feeRateNumber.format(row.maxFactor - row.minFactor) : "-"}</td>
                </tr>
              )) : <EmptyTableRow colSpan={5} label="Noch keine Gruppenwerte im gewählten Zeitraum." />}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function InvoiceTrendView({ invoiceRows }: { invoiceRows: ParsedInvoiceDocument[] }) {
  const tableExportRef = useRef<HTMLDivElement | null>(null);
  const periodOptions = useMemo(() => buildCustomChartPeriods(), []);
  const [periodId, setPeriodId] = useState(() => "since-start");
  const [standortId, setStandortId] = useState("gruppe");
  const [serviceCode, setServiceCode] = useState("alle");
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === periodId) ?? periodOptions[0], [periodOptions, periodId]);
  const invoiceStandorte = useMemo(() => orderedStandorte().filter((standort) => invoiceRows.some((row) => invoiceReadyForAnalysis(row) && (row.standortId === standort.id || row.standortName === standort.name))), [invoiceRows]);
  const selectedStandort = standortId === "gruppe" ? undefined : invoiceStandorte.find((standort) => standort.id === standortId);
  const serviceOptions = useMemo(() => invoiceTrendServiceOptions(invoiceRows, selectedStandort, descriptionFilter), [descriptionFilter, invoiceRows, selectedStandort]);
  const selectedService = serviceOptions.find((service) => service.code === serviceCode);
  const yearRows = useMemo(() => invoiceFactorTrendByYear(invoiceRows, selectedPeriod, selectedStandort, serviceCode), [invoiceRows, selectedPeriod, selectedStandort, serviceCode]);
  const monthRows = useMemo(() => invoiceFactorTrendByMonth(invoiceRows, selectedPeriod, selectedStandort, serviceCode), [invoiceRows, selectedPeriod, selectedStandort, serviceCode]);
  const kpis = useMemo(() => invoiceFactorTrendKpis(yearRows, monthRows), [monthRows, yearRows]);

  useEffect(() => {
    if (serviceCode !== "alle" && !serviceOptions.some((service) => service.code === serviceCode)) setServiceCode("alle");
  }, [serviceCode, serviceOptions]);

  const exportScopeLabel = selectedStandort?.name ?? "Alle Standorte";
  const exportServiceLabel = selectedService ? selectedService.code : "Alle Leistungen";

  return (
    <div className="content-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Faktor-Trend</span>
            <h2>Entwicklung der Durchschnittsfaktoren je Praxis und Leistung</h2>
            <p>Zeigt, ob sich eine Praxis bei konkreten Leistungsnummern im Jahres- oder Monatsverlauf verändert hat. Grundlage sind bestätigte BFS-Einzelrechnungspositionen mit Faktor.</p>
          </div>
        </div>
        <div className="period-filter custom-kpi-period">
          <label>
            Zeitraum
            <select value={periodId} onChange={(event) => setPeriodId(event.target.value)}>
              <option value="since-start">ab Standortstart</option>
              {periodOptions.filter((period) => period.id !== "since-start").map((period) => (
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
          <label>
            Leistung suchen
            <input
              type="search"
              value={descriptionFilter}
              onChange={(event) => setDescriptionFilter(event.target.value)}
              placeholder="z. B. Ä1, 1040, Füllung"
            />
          </label>
          <label>
            Leistung
            <select value={serviceCode} onChange={(event) => setServiceCode(event.target.value)}>
              <option value="alle">Alle Leistungen</option>
              {serviceOptions.slice(0, 250).map((service) => (
                <option key={service.code} value={service.code}>{service.code} · {service.description}</option>
              ))}
            </select>
          </label>
          <span>{selectedPeriod.detail} · {exportScopeLabel} · {exportServiceLabel}</span>
          <button
            className="secondary-button custom-export-action"
            type="button"
            onClick={() => printCustomTabPdf(tableExportRef.current, `Faktor-Trend · ${exportScopeLabel} · ${exportServiceLabel} · ${selectedPeriod.label}`)}
            disabled={!yearRows.length && !monthRows.length}
          >
            <Printer size={16} /> PDF Export
          </button>
        </div>
        <section className="priority-grid invoice-service-kpi-grid">
          <PriorityCard label="Aktueller Ø Faktor" value={kpis.latest ? feeRateNumber.format(kpis.latest.avgFactor) : "-"} hint={kpis.latest ? `${kpis.latest.label} · ${integerNumber.format(kpis.latest.count)} Faktorpositionen` : "keine Faktorwerte"} tone="blue" />
          <PriorityCard label="Vorjahr / Vorperiode" value={kpis.previous ? feeRateNumber.format(kpis.previous.avgFactor) : "-"} hint={kpis.previous ? `${kpis.previous.label} · ${integerNumber.format(kpis.previous.count)} Faktorpositionen` : "kein Vergleichswert"} tone="blue" />
          <PriorityCard label="Veränderung" value={kpis.delta === null ? "-" : formatFactorDelta(kpis.delta)} hint={kpis.deltaPercent === null ? "kein Vergleich möglich" : `${formatPercent(kpis.deltaPercent)} relativ`} tone={kpis.delta === null ? "blue" : kpis.delta >= 0 ? "green" : "amber"} />
          <PriorityCard label="Stärkster Anstieg" value={kpis.bestYearIncrease ? formatFactorDelta(kpis.bestYearIncrease.delta) : "-"} hint={kpis.bestYearIncrease ? `${kpis.bestYearIncrease.fromLabel} zu ${kpis.bestYearIncrease.toLabel}` : "keine Jahresänderung"} tone="green" />
          <PriorityCard label="Stärkster Rückgang" value={kpis.biggestYearDrop ? formatFactorDelta(kpis.biggestYearDrop.delta) : "-"} hint={kpis.biggestYearDrop ? `${kpis.biggestYearDrop.fromLabel} zu ${kpis.biggestYearDrop.toLabel}` : "keine Jahresänderung"} tone="amber" />
          <PriorityCard label="Trendbasis" value={integerNumber.format(kpis.totalCount)} hint="Faktorpositionen im Filter" tone="blue" />
        </section>
      </section>

      <section className="panel" ref={tableExportRef}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Jahresvergleich</span>
            <h2>{selectedService ? `${selectedService.code} · ${selectedService.description}` : "Alle Leistungen"}</h2>
            <p>Jahreswerte sind nach Rechnungsdatum aggregiert. Bei „Alle Leistungen“ wird der faktorbasierte Durchschnitt über alle auswertbaren Positionen gebildet.</p>
          </div>
        </div>
        <div className="table-wrap compact-table invoice-services-scroll">
          <table className="invoice-trend-table">
            <thead>
              <tr>
                <th>Jahr</th>
                <th>Ø Faktor</th>
                <th>Min / Max</th>
                <th>Veränderung ggü. Vorjahr</th>
                <th>Positionen</th>
                <th>Umsatz</th>
              </tr>
            </thead>
            <tbody>
              {yearRows.length ? yearRows.map((row) => (
                <tr key={row.key}>
                  <td><strong>{row.label}</strong></td>
                  <td>{feeRateNumber.format(row.avgFactor)}</td>
                  <td>{feeRateNumber.format(row.minFactor)} / {feeRateNumber.format(row.maxFactor)}</td>
                  <td>{row.deltaToPrevious === null ? "-" : formatFactorDelta(row.deltaToPrevious)}</td>
                  <td>{integerNumber.format(row.count)}</td>
                  <td>{money.format(row.amount)}</td>
                </tr>
              )) : <EmptyTableRow colSpan={6} label="Noch keine Faktorwerte im gewählten Filter." />}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Monatsverlauf</span>
            <h2>Unterjähriger Faktortrend</h2>
          </div>
        </div>
        <div className="table-wrap compact-table invoice-services-scroll">
          <table className="invoice-trend-table">
            <thead>
              <tr>
                <th>Monat</th>
                <th>Ø Faktor</th>
                <th>Min / Max</th>
                <th>Veränderung ggü. Vormonat</th>
                <th>Positionen</th>
              </tr>
            </thead>
            <tbody>
              {monthRows.length ? monthRows.map((row) => (
                <tr key={row.key}>
                  <td><strong>{row.label}</strong></td>
                  <td>{feeRateNumber.format(row.avgFactor)}</td>
                  <td>{feeRateNumber.format(row.minFactor)} / {feeRateNumber.format(row.maxFactor)}</td>
                  <td>{row.deltaToPrevious === null ? "-" : formatFactorDelta(row.deltaToPrevious)}</td>
                  <td>{integerNumber.format(row.count)}</td>
                </tr>
              )) : <EmptyTableRow colSpan={5} label="Noch kein Monatsverlauf im gewählten Filter." />}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type InvoicePatientSortKey = "amount" | "invoiceCount" | "avgInvoice" | "avgFactor" | "serviceCount" | "labShare" | "lastDate";

function InvoicePatientValueView({ invoiceRows }: { invoiceRows: ParsedInvoiceDocument[] }) {
  const tableExportRef = useRef<HTMLDivElement | null>(null);
  const periodOptions = useMemo(() => buildCustomChartPeriods(), []);
  const [periodId, setPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [standortId, setStandortId] = useState("gruppe");
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<{ key: InvoicePatientSortKey; direction: SortDirection }>({ key: "amount", direction: "desc" });
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === periodId) ?? periodOptions[0], [periodOptions, periodId]);
  const invoiceStandorte = useMemo(() => orderedStandorte().filter((standort) => invoiceRows.some((row) => invoiceReadyForAnalysis(row) && (row.standortId === standort.id || row.standortName === standort.name))), [invoiceRows]);
  const selectedStandort = standortId === "gruppe" ? undefined : invoiceStandorte.find((standort) => standort.id === standortId);
  const rows = useMemo(() => invoicePatientValueRows(invoiceRows, selectedPeriod, selectedStandort), [invoiceRows, selectedPeriod, selectedStandort]);
  const filteredRows = useMemo(() => filterInvoicePatientRows(rows, searchTerm), [rows, searchTerm]);
  const sortedRows = useMemo(() => sortInvoicePatientRows(filteredRows, sort.key, sort.direction), [filteredRows, sort]);
  const kpis = useMemo(() => invoicePatientValueKpis(rows), [rows]);
  const exportScopeLabel = selectedStandort?.name ?? "Alle Standorte";

  const toggleSort = (key: InvoicePatientSortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key ? current.direction === "asc" ? "desc" : "asc" : key === "lastDate" ? "desc" : "desc"
    }));
  };

  return (
    <div className="content-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Patientenprofil</span>
            <h2>Patientenwert und wirtschaftliche Auffälligkeiten</h2>
            <p>Diese Sicht nutzt echte Einzelrechnungen und zeigt Patientengruppen nach Rechnungswert, Faktorprofil und Labor-/Aufwandsanteil. Sie ersetzt keine medizinische Bewertung.</p>
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
          <label>
            Patient suchen
            <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Name, Standort, Rechnungsnr." />
          </label>
          <span>{selectedPeriod.detail} · {exportScopeLabel}</span>
        </div>
        <section className="priority-grid invoice-service-kpi-grid">
          <PriorityCard label="Höchster Patientenwert" value={kpis.topValue?.patientName ?? "-"} hint={kpis.topValue ? `${patientLocationLabel(kpis.topValue)} · ${money.format(kpis.topValue.amount)} · Ø Faktor ${feeRateNumber.format(kpis.topValue.avgFactor)}` : "keine Daten"} tone="green" />
          <PriorityCard label="Höchster Fallwert" value={kpis.highestAvgInvoice?.patientName ?? "-"} hint={kpis.highestAvgInvoice ? `${patientLocationLabel(kpis.highestAvgInvoice)} · ${money.format(kpis.highestAvgInvoice.avgInvoice)} Ø Rechnung` : "keine Daten"} tone="blue" />
          <PriorityCard label="Niedriges Faktorprofil" value={kpis.lowFactorHighValue?.patientName ?? "-"} hint={kpis.lowFactorHighValue ? `${patientLocationLabel(kpis.lowFactorHighValue)} · Ø Faktor ${feeRateNumber.format(kpis.lowFactorHighValue.avgFactor)} · ${money.format(kpis.lowFactorHighValue.amount)}` : "keine Daten"} tone="amber" />
          <PriorityCard label="Hoher Labor-/Aufwandanteil" value={kpis.highLabShare?.patientName ?? "-"} hint={kpis.highLabShare ? `${patientLocationLabel(kpis.highLabShare)} · ${formatPercent(kpis.highLabShare.labShare)} · ${money.format(kpis.highLabShare.labAmount)}` : "keine Daten"} tone="amber" />
        </section>
      </section>

      <section className="panel" ref={tableExportRef}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Auswertung</span>
            <h2>Patienten nach Wert, Faktor und Aufwand</h2>
          </div>
        </div>
        <div className="table-wrap compact-table invoice-services-scroll">
          <table className="invoice-patient-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Standorte</th>
                <th><InvoicePatientSortButton label="Wert" sortKey="amount" activeSort={sort} onSort={toggleSort} /></th>
                <th><InvoicePatientSortButton label="Rechnungen" sortKey="invoiceCount" activeSort={sort} onSort={toggleSort} /></th>
                <th><InvoicePatientSortButton label="Ø Rechnung" sortKey="avgInvoice" activeSort={sort} onSort={toggleSort} /></th>
                <th><InvoicePatientSortButton label="Ø Faktor" sortKey="avgFactor" activeSort={sort} onSort={toggleSort} /></th>
                <th><InvoicePatientSortButton label="Positionen" sortKey="serviceCount" activeSort={sort} onSort={toggleSort} /></th>
                <th><InvoicePatientSortButton label="Laboranteil" sortKey="labShare" activeSort={sort} onSort={toggleSort} /></th>
                <th><InvoicePatientSortButton label="Letzte Rechnung" sortKey="lastDate" activeSort={sort} onSort={toggleSort} /></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length ? sortedRows.slice(0, 250).map((row) => (
                <tr key={row.key}>
                  <td><strong>{row.patientName}</strong><small>{row.invoiceNos.slice(0, 3).join(", ")}{row.invoiceNos.length > 3 ? " ..." : ""}</small></td>
                  <td>{row.locations.join(", ")}</td>
                  <td>{money.format(row.amount)}</td>
                  <td>{integerNumber.format(row.invoiceCount)}</td>
                  <td>{money.format(row.avgInvoice)}</td>
                  <td>{row.avgFactor ? feeRateNumber.format(row.avgFactor) : "-"}</td>
                  <td>{integerNumber.format(row.serviceCount)}</td>
                  <td>{formatPercent(row.labShare)}</td>
                  <td>{row.lastInvoiceDate}</td>
                </tr>
              )) : <EmptyTableRow colSpan={9} label="Noch keine Patientenwerte im gewählten Filter." />}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function InvoicePotentialView({ invoiceRows }: { invoiceRows: ParsedInvoiceDocument[] }) {
  const reportExportRef = useRef<HTMLDivElement | null>(null);
  const periodOptions = useMemo(() => buildCustomChartPeriods(), []);
  const [periodId, setPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const invoiceStandorte = useMemo(() => orderedStandorte().filter((standort) => invoiceRows.some((row) => invoiceReadyForAnalysis(row) && (row.standortId === standort.id || row.standortName === standort.name))), [invoiceRows]);
  const [standortId, setStandortId] = useState(() => invoiceStandorte[0]?.id ?? "");
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === periodId) ?? periodOptions[0], [periodOptions, periodId]);
  const selectedStandort = invoiceStandorte.find((standort) => standort.id === standortId) ?? invoiceStandorte[0];
  const rows = useMemo(() => invoicePotentialSummary(invoiceRows, selectedPeriod, selectedStandort), [invoiceRows, selectedPeriod, selectedStandort]);
  const topPotentialRows = rows.slice(0, 20);
  const totalPotential = rows.reduce((sum, row) => sum + row.potential, 0);
  const monthlyPotential = annualizeInvoicePotential(totalPotential, selectedPeriod) / 12;
  const annualPotential = annualizeInvoicePotential(totalPotential, selectedPeriod);
  const underBenchmarkRows = rows.filter((row) => row.factorDelta !== null && row.factorDelta < 0).length;
  const topLever = rows[0];
  const biggestFactorGap = [...rows].sort((a, b) => Math.abs(a.factorDelta ?? 0) - Math.abs(b.factorDelta ?? 0))[rows.length - 1];

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
          <button
            className="secondary-button custom-export-action"
            type="button"
            onClick={() => printCustomTabPdf(reportExportRef.current, `Potenzialanalyse · ${selectedStandort?.name ?? "Standort"} · ${selectedPeriod.label}`)}
            disabled={!selectedStandort || !rows.length}
          >
            <Printer size={16} /> PDF Export
          </button>
        </div>
      </section>
      <div className="content-stack invoice-potential-report" ref={reportExportRef}>
        <section className="priority-grid">
          <PriorityCard label="Potenzial Zeitraum" value={money.format(totalPotential)} hint="gegen Gruppenschnitt" tone={totalPotential ? "green" : "blue"} />
          <PriorityCard label="Potenzial p. Monat" value={money.format(monthlyPotential)} hint="hochgerechnet" tone={monthlyPotential ? "green" : "blue"} />
          <PriorityCard label="Potenzial p. Jahr" value={money.format(annualPotential)} hint="aus Zeitraum hochgerechnet" tone={annualPotential ? "green" : "blue"} info="Jahreswert aus dem aktuellen Zeitraum. Bei Jahresauswahl entspricht er im Wesentlichen dem Zeitraumwert." />
          <PriorityCard label="Unter Benchmark" value={integerNumber.format(underBenchmarkRows)} hint="Leistungsnummern" tone={underBenchmarkRows ? "amber" : "green"} />
          <PriorityCard
            label="Top-Hebel"
            value={topLever?.code ?? "-"}
            hint={topLever ? `Potenzial ${money.format(topLever.potential)} · Ø ${feeRateNumber.format(topLever.avgFactor)} statt ${feeRateNumber.format(topLever.groupAvgFactor)}` : "kein Potenzial"}
            tone={topLever?.potential ? "green" : "blue"}
            info={topLever ? `${topLever.code}: ${topLever.description}. Das Potenzial beschreibt den geschätzten Mehrumsatz im gewählten Zeitraum, wenn der eigene Durchschnittsfaktor dieser Position den Gruppenschnitt ohne diesen Standort erreichen würde.` : undefined}
          />
          <PriorityCard
            label="Größte Faktor-Lücke"
            value={biggestFactorGap?.code ?? "-"}
            hint={biggestFactorGap ? `${formatFactorDelta(biggestFactorGap.factorDelta ?? 0)} · Ø ${feeRateNumber.format(biggestFactorGap.avgFactor)} statt ${feeRateNumber.format(biggestFactorGap.groupAvgFactor)}` : "keine Abweichung"}
            tone={biggestFactorGap ? "amber" : "blue"}
            info={biggestFactorGap ? `${biggestFactorGap.code}: ${biggestFactorGap.description}. Zeigt die Position mit der größten negativen Faktorabweichung zum Gruppenschnitt, unabhängig vom Euro-Potenzial.` : undefined}
          />
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Top-Hebel</span>
              <h2>Top 20 Leistungen mit größtem Mehrumsatz</h2>
            </div>
          </div>
          <div className="table-export-bar">
            <span>{selectedStandort?.name ?? "Standort"} · {selectedPeriod.label} · Top 20 nach Potenzial</span>
          </div>
          <div className="table-wrap compact-table invoice-services-scroll">
            <table className="invoice-potential-table">
              <thead>
                <tr>
                  <th>Nr.</th>
                  <th>Kurzbeschreibung</th>
                  <th>Praxis Ø</th>
                  <th>Gruppe ohne Praxis</th>
                  <th>Delta</th>
                  <th>Potenzial</th>
                </tr>
              </thead>
              <tbody>
                {topPotentialRows.length ? topPotentialRows.map((row) => (
                  <tr key={row.code}>
                    <td><strong>{row.code}</strong></td>
                    <td>{row.description}</td>
                    <td>{row.avgFactor ? feeRateNumber.format(row.avgFactor) : "-"}</td>
                    <td>{row.groupAvgFactor ? feeRateNumber.format(row.groupAvgFactor) : "-"}</td>
                    <td>{row.factorDelta === null ? "-" : formatFactorDelta(row.factorDelta)}</td>
                    <td><strong>{money.format(row.potential)}</strong></td>
                  </tr>
                )) : <EmptyTableRow colSpan={6} label="Noch kein Potenzial im gewählten Filter." />}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function InvoiceLocationsView({ invoiceRows }: { invoiceRows: ParsedInvoiceDocument[] }) {
  const periodOptions = useMemo(() => buildCustomChartPeriods(), []);
  const [periodId, setPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === periodId) ?? periodOptions[0], [periodOptions, periodId]);
  const rows = useMemo(() => invoiceLocationSummary(invoiceRows, selectedPeriod), [invoiceRows, selectedPeriod]);
  const factorRows = rows.filter((row) => row.avgFactor > 0);
  const groupAvgFactor = factorRows.length
    ? factorRows.reduce((sum, row) => sum + row.avgFactor * row.factorCount, 0) / factorRows.reduce((sum, row) => sum + row.factorCount, 0)
    : 0;
  const bestRelative = [...rows].filter((row) => row.relativeIndex > 0).sort((a, b) => b.relativeIndex - a.relativeIndex)[0];
  const lowestRelative = [...rows].filter((row) => row.relativeIndex > 0).sort((a, b) => a.relativeIndex - b.relativeIndex)[0];
  const widestSpread = [...rows].filter((row) => row.maxFactor > 0).sort((a, b) => (b.maxFactor - b.minFactor) - (a.maxFactor - a.minFactor))[0];

  return (
    <div className="content-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Standortvergleich</span>
            <h2>Faktorvergleich je Standort</h2>
            <p>Verglichen werden ausschließlich Durchschnittsfaktoren und Faktorabweichungen. Mengen, Umsatz und Rechnungsvolumen werden hier bewusst nicht als Benchmark verwendet.</p>
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
          <span>{selectedPeriod.detail} · Faktorbenchmark ohne Mengenwertung</span>
        </div>
      </section>
      <section className="priority-grid">
        <PriorityCard label="Gruppen-Ø Faktor" value={groupAvgFactor ? feeRateNumber.format(groupAvgFactor) : "-"} hint="gewichteter Faktorwert" tone="blue" />
        <PriorityCard label="Beste Faktorquote" value={bestRelative?.standortName ?? "-"} hint={bestRelative ? `${integerNumber.format(bestRelative.relativeIndex)} % vom Peer-Benchmark` : "keine Daten"} tone="green" />
        <PriorityCard label="Aufholbedarf" value={lowestRelative?.standortName ?? "-"} hint={lowestRelative ? `${integerNumber.format(lowestRelative.relativeIndex)} % vom Peer-Benchmark` : "keine Daten"} tone="amber" />
        <PriorityCard label="Größte Faktorstreuung" value={widestSpread?.standortName ?? "-"} hint={widestSpread ? `${feeRateNumber.format(widestSpread.minFactor)} bis ${feeRateNumber.format(widestSpread.maxFactor)}` : "keine Faktorwerte"} tone="amber" />
      </section>
      <section className="panel">
        <div className="table-wrap compact-table invoice-services-scroll">
          <table className="invoice-location-table">
            <thead>
              <tr>
                <th>Standort</th>
                <th>Ø Faktor</th>
                <th>Peer-Ø ohne Standort</th>
                <th>Delta</th>
                <th>Relativindex</th>
                <th>Min / Max</th>
                <th>Leistungen unter Benchmark</th>
                <th>Datenbasis</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.standortId}>
                  <td><strong>{row.standortName}</strong><small>Peer-Benchmark ohne eigenen Standort</small></td>
                  <td>{row.avgFactor ? feeRateNumber.format(row.avgFactor) : "-"}</td>
                  <td>{row.groupAvgFactor ? feeRateNumber.format(row.groupAvgFactor) : "-"}</td>
                  <td>{row.factorDelta === null ? "-" : formatFactorDelta(row.factorDelta)}</td>
                  <td>{row.relativeIndex ? `${integerNumber.format(row.relativeIndex)} %` : "-"}</td>
                  <td>{row.minFactor ? `${feeRateNumber.format(row.minFactor)} / ${feeRateNumber.format(row.maxFactor)}` : "-"}</td>
                  <td>{integerNumber.format(row.underBenchmarkCount)}</td>
                  <td>{integerNumber.format(row.factorCount)} Faktorpositionen</td>
                </tr>
              )) : <EmptyTableRow colSpan={8} label="Noch keine Standortdaten im gewählten Filter." />}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type BillingQualityMode = "cockpit" | "chains" | "feedback";

const invoiceQualityProfileCache = new WeakMap<ParsedInvoiceDocument, InvoiceQualityProfile>();

function BillingQualityView({ invoiceRows, mode }: { invoiceRows: ParsedInvoiceDocument[]; mode: BillingQualityMode }) {
  const exportRef = useRef<HTMLDivElement | null>(null);
  const periodOptions = useMemo(() => buildCustomChartPeriods(), []);
  const [periodId, setPeriodId] = useState(() => defaultPeriodId(periodOptions));
  const [standortId, setStandortId] = useState("gruppe");
  const [caseType, setCaseType] = useState("alle");
  const [searchTerm, setSearchTerm] = useState("");
  const [basisFilter, setBasisFilter] = useState<"regeln" | "alle">(() => mode === "feedback" ? "regeln" : "alle");
  const [minGroupRate, setMinGroupRate] = useState(70);
  const [minCaseCount, setMinCaseCount] = useState(8);
  const [minPotential, setMinPotential] = useState(0);
  const selectedPeriod = useMemo(() => periodOptions.find((period) => period.id === periodId) ?? periodOptions[0], [periodOptions, periodId]);
  const previousPeriod = useMemo(() => previousComparablePeriod(selectedPeriod), [selectedPeriod]);
  const invoiceStandorte = useMeasuredMemo("Qualitätscockpit Standortliste", () => orderedStandorte().filter((standort) => invoiceRows.some((row) => invoiceReadyForAnalysis(row) && (row.standortId === standort.id || row.standortName === standort.name))), [invoiceRows], (rows) => `${integerNumber.format(rows.length)} Standorte`);
  const selectedStandort = standortId === "gruppe" ? undefined : invoiceStandorte.find((standort) => standort.id === standortId);
  const findings = useMeasuredMemo(
    "Qualitätscockpit Hinweise",
    () => buildInvoiceQualityFindings(invoiceRows, selectedPeriod, selectedStandort, { minGroupRate: minGroupRate / 100, minCaseCount, minPotential }),
    [invoiceRows, minCaseCount, minGroupRate, minPotential, selectedPeriod, selectedStandort],
    (rows) => `${integerNumber.format(rows.length)} Hinweise`
  );
  const previousFindingsByKey = useMeasuredMemo("Qualitätscockpit Vorperiode", () => {
    if (!previousPeriod) return new Map<string, InvoiceQualityFinding>();
    return new Map(buildInvoiceQualityFindings(invoiceRows, previousPeriod, selectedStandort, { minGroupRate: 0.4, minCaseCount: 3, minPotential: 0 }).map((row) => [row.key, row]));
  }, [invoiceRows, previousPeriod, selectedStandort], (rows) => `${integerNumber.format(rows.size)} Hinweise`);
  const caseTypes = useMemo(() => ["alle", ...Array.from(new Set(findings.map((row) => row.caseType))).sort((a, b) => a.localeCompare(b, "de"))], [findings]);
  const visibleFindings = useMeasuredMemo("Qualitätscockpit Filter", () => filterInvoiceQualityFindings(findings, caseType, searchTerm, basisFilter), [basisFilter, caseType, findings, searchTerm], (rows) => `${integerNumber.format(rows.length)} Treffer`);
  const kpis = useMeasuredMemo("Qualitätscockpit KPIs", () => invoiceQualityKpis(visibleFindings), [visibleFindings], (value) => `${integerNumber.format(value.count)} Hinweise`);
  const reportRows = mode === "feedback" ? visibleFindings.slice(0, 18) : visibleFindings.slice(0, 80);
  const scopeLabel = selectedStandort?.name ?? "Alle Standorte";
  const modeTitle = mode === "chains" ? "Leistungsketten" : mode === "feedback" ? "Praxis-Feedback" : "Qualitätscockpit";
  const exportIntro = invoiceQualityExportIntro(scopeLabel);
  const modeDescription = mode === "chains"
    ? "Katalog- und plausibilitätsorientierte Leistungsketten aus vorhandenen Einzelrechnungen. Die Quote zeigt, wie häufig eine mögliche Begleitleistung bei gleicher Hauptleistung in der anonymisierten Gruppe mitläuft."
    : mode === "feedback"
      ? "Exportfähiger Praxisblick mit verständlichen Katalog-, Plausibilitäts- und Gruppenvergleichshinweisen. Andere Standorte bleiben anonym."
      : "Informationscockpit für Abrechnungsqualität: Kataloglogik, Plausibilität, Gruppenvergleich und mögliche Leistungsketten als fachliche Orientierung.";

  useEffect(() => {
    if (mode === "feedback" && standortId === "gruppe" && invoiceStandorte[0]) {
      setStandortId(invoiceStandorte[0].id);
    }
  }, [invoiceStandorte, mode, standortId]);

  return (
    <div className="content-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Abrechnungsqualität</span>
            <h2>{modeTitle}</h2>
            <p>{modeDescription}</p>
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
              {mode !== "feedback" && <option value="gruppe">Alle Standorte</option>}
              {invoiceStandorte.map((standort) => (
                <option key={standort.id} value={standort.id}>{standort.name}</option>
              ))}
            </select>
          </label>
          <label>
            Falltyp
            <select value={caseType} onChange={(event) => setCaseType(event.target.value)}>
              {caseTypes.map((type) => (
                <option key={type} value={type}>{type === "alle" ? "Alle Falltypen" : type}</option>
              ))}
            </select>
          </label>
          <label>
            Basis
            <select value={basisFilter} onChange={(event) => setBasisFilter(event.target.value as "regeln" | "alle")}>
              <option value="regeln">Nur kuratierte Regeln</option>
              <option value="alle">Regeln + Datenmuster</option>
            </select>
          </label>
          <label>
            Suchen
            <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Leistung, Standort, Falltyp" />
          </label>
          <label>
            Gruppenquote ab %
            <input type="number" min={40} max={95} step={5} value={minGroupRate} onChange={(event) => setMinGroupRate(Number(event.target.value) || 70)} />
          </label>
          <label>
            Mindestfälle
            <input type="number" min={3} max={100} step={1} value={minCaseCount} onChange={(event) => setMinCaseCount(Number(event.target.value) || 8)} />
          </label>
          <label>
            Orientierungswert ab EUR
            <input type="number" min={0} step={50} value={minPotential} onChange={(event) => setMinPotential(Number(event.target.value) || 0)} />
          </label>
          <span>{selectedPeriod.detail} · {scopeLabel} · Norm-/Katalogbezug und Anwendbarkeit fachlich einordnen</span>
          <button
            className="secondary-button custom-export-action"
            type="button"
            onClick={() => printCustomTabPdf(exportRef.current, `${modeTitle} · ${scopeLabel} · ${selectedPeriod.label}`)}
            disabled={!visibleFindings.length}
          >
            <Printer size={16} /> PDF Export
          </button>
          <button
            className="secondary-button custom-export-action"
            type="button"
            onClick={() => downloadTextFile(`abrechnungsqualitaet-${fileSlug(scopeLabel)}-${fileSlug(selectedPeriod.label)}.csv`, createInvoiceQualityCsv(visibleFindings, selectedPeriod, previousFindingsByKey, exportIntro))}
            disabled={!visibleFindings.length}
          >
            <Download size={16} /> CSV
          </button>
        </div>
      </section>

      <section className="priority-grid invoice-service-kpi-grid">
        <PriorityCard label="Info-Hinweise" value={integerNumber.format(kpis.count)} hint={`${integerNumber.format(kpis.affectedInvoices)} betroffene Rechnungen`} tone={kpis.count ? "amber" : "green"} info="Katalog-, Plausibilitäts- und Gruppenvergleichshinweise aus wiederkehrenden Leistungsketten. Ein Hinweis ist eine Informationsgrundlage, keine automatische Fehlerbewertung." />
        <PriorityCard label="Orientierungswert" value={money.format(kpis.potential)} hint="aus erwarteter Lücke" tone={kpis.potential ? "green" : "blue"} info="Orientierung: erwartete Lücke nach Gruppenquote mal durchschnittlichem Betrag der möglichen Begleitleistung. Der Wert ist kein gesicherter Nachberechnungsbetrag." />
        <PriorityCard label="Stärkste Leistungskette" value={kpis.topFinding ? `${kpis.topFinding.anchorCode} -> ${kpis.topFinding.companionCode}` : "-"} hint={kpis.topFinding ? `${kpis.topFinding.standortName} · ${money.format(kpis.topFinding.potential)}` : "keine Auffälligkeit"} tone={kpis.topFinding ? "amber" : "blue"} />
        <PriorityCard label="Höchste Abweichung" value={kpis.biggestGap ? `${integerNumber.format(kpis.biggestGap.confidenceGap * 100)} %-Punkte` : "-"} hint={kpis.biggestGap ? `${kpis.biggestGap.standortName}: ${kpis.biggestGap.companionCode}` : "keine Abweichung"} tone={kpis.biggestGap ? "amber" : "green"} />
        <PriorityCard label="Export" value="PDF / CSV" hint="für Praxisgespräch" tone="blue" info="Die Liste ist als Informationsgrundlage gedacht: bitte vor Ort anhand Katalog, Dokumentation und Behandlung fachlich einordnen, ob ein Hinweis anwendbar ist." />
      </section>

      <div className="content-stack invoice-quality-report" ref={exportRef}>
        <section className="panel invoice-quality-export-summary">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Exportübersicht</span>
              <h2>{modeTitle} · {scopeLabel}</h2>
              <p>Schlichte Tabellenübersicht der Hinweise im gewählten Filter.</p>
            </div>
          </div>
          <div className="table-wrap compact-table invoice-quality-summary-table-wrap">
            <table>
              <tbody>
                <tr><th>Zeitraum</th><td>{selectedPeriod.label}</td><th>Scope</th><td>{scopeLabel}</td></tr>
                <tr><th>Hinweise</th><td>{integerNumber.format(kpis.count)}</td><th>Betroffene Rechnungen</th><td>{integerNumber.format(kpis.affectedInvoices)}</td></tr>
                <tr><th>Orientierungswert</th><td>{money.format(kpis.potential)}</td><th>Basis</th><td>{basisFilter === "regeln" ? "kuratiert" : "Regeln + Datenmuster"}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel invoice-quality-export-note">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Einordnung</span>
              <h2>Wie dieser Report zu lesen ist</h2>
              {exportIntro.map((line) => <p key={line}>{line}</p>)}
            </div>
          </div>
        </section>

        {mode === "feedback" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Praxisbericht</span>
                <h2>{scopeLabel}: Abrechnungsqualität fachlich einordnen</h2>
                <p>Die folgenden Hinweise verbinden Katalog-/Kommentarbezug, Plausibilitätslogik und anonymisierten Gruppenvergleich. Bitte vor Ort einordnen, ob sie zur Dokumentation und zum konkreten Behandlungsablauf passen.</p>
              </div>
            </div>
          </section>
        )}

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{mode === "feedback" ? "Praxis-Feedback" : mode === "chains" ? "Leistungsketten" : "Katalog-/Plausibilitätsinfos"}</span>
              <h2>{mode === "chains" ? "Wenn-dann-Muster mit auffälliger Praxislücke" : "Informationsliste je Standort"}</h2>
            </div>
          </div>
          <div className="table-export-bar">
            <span>{scopeLabel} · {selectedPeriod.label} · {integerNumber.format(visibleFindings.length)} Hinweise</span>
          </div>
          <div className="table-wrap compact-table invoice-quality-print-table-wrap">
            <table className="invoice-quality-print-table">
              <thead>
                <tr>
                  <th>Standort</th>
                  <th>Falltyp</th>
                  <th>Auslöser</th>
                  <th>Begleitleistung</th>
                  <th>Gruppe</th>
                  <th>Praxis</th>
                  <th>Lücke</th>
                  <th>Wert</th>
                  <th>Einordnung</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.length ? reportRows.map((row) => (
                  <tr key={`print-${row.key}`}>
                    <td><strong>{row.standortName}</strong></td>
                    <td>{row.caseType}</td>
                    <td><strong>{row.anchorCode}</strong><small>{row.anchorDescription}</small></td>
                    <td><strong>{row.companionCode}</strong><small>{row.companionDescription}</small></td>
                    <td>{formatPercent(row.groupRate * 100)}<small>{integerNumber.format(row.groupTogetherCount)} / {integerNumber.format(row.groupAnchorCount)}</small></td>
                    <td>{formatPercent(row.targetRate * 100)}<small>{integerNumber.format(row.targetTogetherCount)} / {integerNumber.format(row.targetAnchorCount)}</small></td>
                    <td>{integerNumber.format(row.missingEstimate)}</td>
                    <td><strong>{money.format(row.potential)}</strong></td>
                    <td>{row.rule ? row.rule.title : "Datenmuster"}<small>{row.rule?.rationale ?? invoiceQualityDefaultRecommendation(row)}</small></td>
                  </tr>
                )) : <EmptyTableRow colSpan={9} label="Keine Hinweise im gewählten Filter. Schwellenwerte ggf. senken oder Zeitraum erweitern." />}
              </tbody>
            </table>
          </div>
          <div className="table-wrap compact-table invoice-services-scroll invoice-quality-table-wrap">
            <table className="invoice-quality-table">
              <thead>
                <tr>
                  <th>Standort</th>
                  <th>Falltyp</th>
                  <th>Wenn abgerechnet</th>
                  <th>Häufige Begleitleistung</th>
                  <th>Gruppe</th>
                  <th>Praxis</th>
                  <th>Lücke</th>
                  <th>Entwicklung</th>
                  <th>Basis</th>
                  <th>Orientierungswert</th>
                  <th>Einordnung</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.length ? reportRows.map((row) => {
                  const previous = previousFindingsByKey.get(row.key);
                  return (
                    <tr key={row.key}>
                      <td><strong>{row.standortName}</strong></td>
                      <td>{row.caseType}</td>
                      <td><strong>{row.anchorCode}</strong><small>{row.anchorDescription}</small></td>
                      <td><strong>{row.companionCode}</strong><small>{row.companionDescription}</small></td>
                      <td>{formatPercent(row.groupRate * 100)}<small>{integerNumber.format(row.groupTogetherCount)} von {integerNumber.format(row.groupAnchorCount)}</small></td>
                      <td>{formatPercent(row.targetRate * 100)}<small>{integerNumber.format(row.targetTogetherCount)} von {integerNumber.format(row.targetAnchorCount)}</small></td>
                      <td>{integerNumber.format(row.missingEstimate)} Fälle</td>
                      <td>{invoiceQualityTrendLabel(row, previous)}<small>{previousPeriod ? `gegen ${previousPeriod.label}` : "keine Vorperiode"}</small></td>
                      <td><strong>{row.rule ? row.rule.title : "Datenmuster"}</strong><small>{row.rule ? `${row.rule.confidence} · ${row.rule.source}` : "statistisch, fachlich einordnen"}</small></td>
                      <td><strong>{money.format(row.potential)}</strong></td>
                      <td>{row.rule?.rationale ?? invoiceQualityDefaultRecommendation(row)}</td>
                    </tr>
                  );
                }) : <EmptyTableRow colSpan={11} label="Keine Hinweise im gewählten Filter. Schwellenwerte ggf. senken oder Zeitraum erweitern." />}
              </tbody>
            </table>
          </div>
          <div className="invoice-quality-card-list">
            {reportRows.length ? reportRows.map((row) => {
              const previous = previousFindingsByKey.get(row.key);
              return (
                <article className="invoice-quality-card" key={row.key}>
                  <div className="invoice-quality-card-head">
                    <div>
                      <span>{row.standortName}</span>
                      <strong>{row.anchorCode} {"->"} {row.companionCode}</strong>
                    </div>
                  </div>
                  <div className="invoice-quality-card-services">
                    <div>
                      <span>Wenn abgerechnet</span>
                      <strong>{row.anchorCode}</strong>
                      <small>{row.anchorDescription}</small>
                    </div>
                    <div>
                      <span>Häufige Begleitleistung</span>
                      <strong>{row.companionCode}</strong>
                      <small>{row.companionDescription}</small>
                    </div>
                  </div>
                  <div className="invoice-quality-card-metrics">
                    <div><span>Gruppe</span><strong>{formatPercent(row.groupRate * 100)}</strong><small>{integerNumber.format(row.groupTogetherCount)} von {integerNumber.format(row.groupAnchorCount)}</small></div>
                    <div><span>Praxis</span><strong>{formatPercent(row.targetRate * 100)}</strong><small>{integerNumber.format(row.targetTogetherCount)} von {integerNumber.format(row.targetAnchorCount)}</small></div>
                    <div><span>Lücke</span><strong>{integerNumber.format(row.missingEstimate)}</strong><small>Fälle</small></div>
                    <div><span>Orientierungswert</span><strong>{money.format(row.potential)}</strong><small>{invoiceQualityTrendLabel(row, previous)}</small></div>
                  </div>
                  <div className="invoice-quality-card-basis">
                    <span>{row.caseType}</span>
                    <strong>{row.rule ? row.rule.title : "Datenmuster"}</strong>
                    <small>{row.rule ? `${row.rule.confidence} · ${row.rule.source}` : "statistisch, fachlich einordnen"}</small>
                  </div>
                  <div className="invoice-quality-card-recommendation">
                    <span>Einordnung</span>
                    <p>{row.rule?.rationale ?? invoiceQualityDefaultRecommendation(row)}</p>
                  </div>
                </article>
              );
            }) : (
              <div className="invoice-quality-empty">Keine Hinweise im gewählten Filter. Schwellenwerte ggf. senken oder Zeitraum erweitern.</div>
            )}
          </div>
        </section>

        {mode !== "cockpit" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Rechnungsbeispiele</span>
                <h2>Betroffene Rechnungen aus den stärksten Hinweisen</h2>
              </div>
            </div>
            <div className="table-wrap compact-table invoice-services-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Hinweis</th>
                    <th>Rechnung</th>
                    <th>Datum</th>
                    <th>Patient</th>
                    <th>Betrag</th>
                    <th>Abgerechnet</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.flatMap((finding) => finding.affectedInvoices.slice(0, mode === "feedback" ? 8 : 4).map((invoice) => ({ finding, invoice }))).slice(0, 120).map(({ finding, invoice }) => (
                    <tr key={`${finding.key}-${invoice.key}`}>
                      <td><strong>{finding.anchorCode} {"->"} {finding.companionCode}</strong><small>{finding.standortName}</small></td>
                      <td><strong>{invoice.invoiceNo}</strong><small>{invoice.bfsNo}</small></td>
                      <td>{invoice.invoiceDate}</td>
                      <td>{invoice.patientName}</td>
                      <td>{money.format(invoice.amount)}</td>
                      <td>{invoice.presentCodes.slice(0, 8).join(", ")}{invoice.presentCodes.length > 8 ? " ..." : ""}</td>
                    </tr>
                  ))}
                  {!reportRows.some((finding) => finding.affectedInvoices.length) && <EmptyTableRow colSpan={6} label="Keine betroffenen Rechnungen im gewählten Filter." />}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
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
      <div className="table-wrap compact-table invoice-preview-scroll">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Standort</th>
              <th>Quelle / BFS-Nr.</th>
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
              <tr key={invoiceRowKey(row)}>
                <td><StatusBadge status={row.status} /></td>
                <td><strong>{row.standortName}</strong><small>Mandant {row.mandantNo}</small></td>
                <td><strong>{invoiceSourceLabel(row)}</strong><small>{row.ocrStatus === "required" ? "OCR erforderlich" : row.bfsNo}</small></td>
                <td><strong>{row.invoiceNo}</strong><small>{row.invoiceDate}</small></td>
                <td><strong>{row.patientName}</strong><small>{row.treatmentPeriod ?? row.integrationDate ?? "kein Zeitraum"}</small></td>
                <td>{money.format(row.totalAmount || row.openAmount)}</td>
                <td>{invoicePreviewPositionLabel(row)}</td>
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
    byKey.set(invoiceRowKey(row), row);
  });
  return [...byKey.values()];
}

function invoiceRowKey(row: ParsedInvoiceDocument) {
  if (row.bfsNo !== "-") return row.bfsNo;
  if (row.fileHash) return row.fileHash;
  return [
    row.importSource ?? "invoice",
    row.standortId ?? row.standortName,
    row.invoiceNo,
    row.invoiceDate,
    row.patientName,
    row.file
  ].join("|");
}

function invoicePreviewPositionLabel(row: ParsedInvoiceDocument) {
  if (row.serviceLines.length) return integerNumber.format(row.serviceLines.length);
  if (row.honorarBema > 0 && (row.eigenlaborTotal > 0 || row.labLines.length > 0)) return "BEMA + Labor";
  if (row.honorarBema > 0) return "BEMA";
  if (row.eigenlaborTotal > 0 || row.labLines.length > 0) return "Labor";
  return "0";
}

function invoiceSourceLabel(row: ParsedInvoiceDocument) {
  return row.importSource === "practice_software_pdf" ? "Praxissoftware" : "BFS";
}

type InvoiceCatalogContext = {
  lookup: Map<string, InvoiceCatalogEntry>;
  ignoredCodes: Set<string>;
};

function buildInvoiceCatalogLookup(entries: InvoiceCatalogEntry[]) {
  const lookup = new Map<string, InvoiceCatalogEntry>();
  entries.forEach((entry) => {
    [entry.code, ...(entry.aliases ?? [])].forEach((code) => lookup.set(normalizeInvoiceCatalogCode(code), entry));
  });
  return lookup;
}

function buildInvoiceCatalogContext(mappings: InvoiceCatalogMapping[]): InvoiceCatalogContext {
  const lookup = buildInvoiceCatalogLookup(invoiceCatalogEntries);
  const ignoredCodes = new Set<string>();
  mappings.forEach((mapping) => {
    const sourceKey = normalizeInvoiceCatalogCode(mapping.sourceCode);
    if (!sourceKey) return;
    if (mapping.action === "ignore" || mapping.system === "Ignorieren") {
      ignoredCodes.add(sourceKey);
      return;
    }
    lookup.set(sourceKey, {
      system: mapping.system,
      code: normalizeInvoiceCatalogCode(mapping.targetCode),
      description: mapping.targetDescription || mapping.sourceDescription || mapping.targetCode,
      aliases: [mapping.sourceCode]
    });
  });
  return { lookup, ignoredCodes };
}

function invoiceCatalogStatusLabel(status: InvoiceCatalogStatus) {
  if (status === "ok") return "OK";
  if (status === "corrected") return "automatisch korrigiert";
  if (status === "ignored") return "ignoriert";
  return "prüfen";
}

function invoiceCatalogCheckRows(invoiceRows: ParsedInvoiceDocument[], period: PeriodOption, selectedStandort?: Standort, catalogContext = defaultInvoiceCatalogContext): InvoiceCatalogCheckRow[] {
  return invoiceRows
    .filter((invoice) => invoiceReadyForAnalysis(invoice) && invoiceInPeriod(invoice, period) && (!selectedStandort || invoice.standortId === selectedStandort.id || invoice.standortName === selectedStandort.name))
    .flatMap((invoice, invoiceIndex) => invoice.serviceLines
      .filter((line) => line.category === "leistung" && !isZeroOnlyInvoiceCode(line.code))
      .map((line, lineIndex) => {
        const check = invoiceCatalogCheckLine(line, catalogContext);
        return {
          key: `${invoice.invoiceNo}-${invoiceIndex}-${lineIndex}-${line.code}-${line.amount}`,
          ...check,
          invoiceNo: invoice.invoiceNo || "-",
          invoiceDate: invoice.invoiceDate || "-",
          standortName: invoice.standortName || "-",
          patientName: invoice.patientName || "-",
          factor: line.factor,
          amount: line.amount
        };
      }))
    .sort((a, b) => invoiceCatalogStatusPriority(a.status) - invoiceCatalogStatusPriority(b.status)
      || a.catalogCode.localeCompare(b.catalogCode, "de", { numeric: true })
      || a.standortName.localeCompare(b.standortName, "de"));
}

function invoiceCatalogCheckLine(line: ParsedInvoiceLine, catalogContext = defaultInvoiceCatalogContext): Omit<InvoiceCatalogCheckRow, "key" | "invoiceNo" | "invoiceDate" | "standortName" | "patientName" | "factor" | "amount"> {
  const originalCode = line.code.trim();
  const originalDescription = line.description.trim();
  const catalogCode = canonicalInvoiceServiceCode(originalCode, originalDescription);
  const sourceKey = normalizeInvoiceCatalogCode(catalogCode);
  const entry = catalogContext.lookup.get(sourceKey);
  const changed = catalogCode !== originalCode;
  const factorNote = line.factor && line.factor > 3.5 ? " Faktor über 3,5 prüfen." : line.factor && line.factor > 2.3 ? " Faktor über 2,3 ggf. begründen." : "";

  if (catalogContext.ignoredCodes.has(sourceKey)) {
    return {
      status: "ignored",
      system: "Ignorieren",
      originalCode,
      catalogCode,
      originalDescription,
      catalogDescription: "Bewusst nicht benchmarkfähig",
      note: "Diese Position wurde als nicht benchmarkfähig markiert."
    };
  }

  const paddedGozCode = /^\d{3}$/.test(sourceKey) ? `${sourceKey}0` : "";
  const paddedEntry = paddedGozCode ? catalogContext.lookup.get(paddedGozCode) : undefined;
  if (paddedEntry) {
    return {
      status: "corrected",
      system: paddedEntry.system,
      originalCode,
      catalogCode: paddedEntry.code,
      originalDescription,
      catalogDescription: paddedEntry.description,
      note: `Eindeutig als ${paddedEntry.code} erkannt.${factorNote}`
    };
  }

  if (entry) {
    return {
      status: changed ? "corrected" : "ok",
      system: entry.system,
      originalCode,
      catalogCode: entry.code,
      originalDescription,
      catalogDescription: entry.description,
      note: changed ? `Eindeutig als ${entry.code} erkannt.${factorNote}` : `Katalogtreffer.${factorNote}`
    };
  }

  const plausible = isPlausibleInvoiceServiceCode(catalogCode);
  const suspiciousReason = suspiciousInvoiceLineReason({ ...line, code: catalogCode });
  const inferredEntry = plausible && suspiciousReason === null
    ? inferredInvoiceCatalogEntry(catalogCode, originalDescription)
    : null;
  if (inferredEntry) {
    return {
      status: changed ? "corrected" : "ok",
      system: inferredEntry.system,
      originalCode,
      catalogCode: inferredEntry.code,
      originalDescription,
      catalogDescription: inferredEntry.description,
      note: changed
        ? `Plausible Leistungsnummer automatisch als ${inferredEntry.code} verwendet.${factorNote}`
        : `Plausible Leistungsnummer mit eindeutiger Rechnungsbeschreibung.${factorNote}`
    };
  }

  return {
    status: "review",
    system: "Unbekannt",
    originalCode,
    catalogCode: plausible ? catalogCode : "-",
    originalDescription,
    catalogDescription: originalDescription || "-",
    note: plausible
      ? `Gebührennummer plausibel, aber noch nicht im lokalen Katalog hinterlegt.${factorNote}`
      : suspiciousReason ?? `Kein eindeutiger Katalogtreffer.${factorNote}`
  };
}

function invoiceCatalogStatusPriority(status: InvoiceCatalogStatus) {
  if (status === "review") return 0;
  if (status === "corrected") return 1;
  if (status === "ignored") return 3;
  return 2;
}

function filterInvoiceCatalogRows(rows: InvoiceCatalogCheckRow[], statusFilter: "alle" | InvoiceCatalogStatus, searchTerm: string) {
  const terms = normalizeTableSearch(searchTerm).split(" ").filter(Boolean);
  return rows.filter((row) => {
    if (statusFilter !== "alle" && row.status !== statusFilter) return false;
    if (!terms.length) return true;
    const haystack = normalizeTableSearch([
      row.originalCode,
      row.catalogCode,
      row.originalDescription,
      row.catalogDescription,
      row.system,
      row.standortName,
      row.patientName,
      row.invoiceNo,
      row.note
    ].join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

function invoiceCatalogCheckKpis(rows: InvoiceCatalogCheckRow[]) {
  const total = rows.length;
  const corrected = rows.filter((row) => row.status === "corrected").length;
  const review = rows.filter((row) => row.status === "review").length;
  const ignored = rows.filter((row) => row.status === "ignored").length;
  const known = total - review - ignored;
  return {
    total,
    known,
    corrected,
    review,
    ignored,
    matchRate: total ? (known / total) * 100 : 0,
    goz: rows.filter((row) => row.system === "GOZ").length,
    goa: rows.filter((row) => row.system === "GOÄ").length,
    bema: rows.filter((row) => row.system === "BEMA").length
  };
}

function suggestedInvoiceCatalogTargetCode(row: InvoiceCatalogCheckRow) {
  if (row.catalogCode && row.catalogCode !== "-") return row.catalogCode;
  const original = normalizeInvoiceCatalogCode(row.originalCode);
  if (/^\d{3}$/.test(original)) return `${original}0`;
  return original;
}

function suggestedInvoiceCatalogSystem(row: InvoiceCatalogCheckRow): InvoiceCatalogMapping["system"] {
  if (row.catalogCode.startsWith("Ä")) return "GOÄ";
  if (/^13[A-D]0$/i.test(row.catalogCode)) return "BEMA";
  return "GOZ";
}

function normalizeInvoiceCatalogCode(code: string) {
  return code
    .trim()
    .replace(/^A(?=\d)/i, "Ä")
    .replace(/^AE(?=\d)/i, "Ä")
    .replace(/^Ä0*(\d+[a-z]?)$/i, "Ä$1")
    .replace(/^13([A-D])O$/i, (_match, letter: string) => `13${letter}0`)
    .toUpperCase();
}

function inferredInvoiceCatalogEntry(code: string, description: string): InvoiceCatalogEntry | null {
  const normalizedCode = normalizeInvoiceCatalogCode(code);
  const normalizedDescription = description.trim().replace(/\s+/g, " ");
  if (!normalizedDescription || !isPlausibleInvoiceServiceCode(normalizedCode)) return null;
  if (normalizedCode.startsWith("Ä")) {
    return { system: "GOÄ", code: normalizedCode, description: normalizedDescription };
  }
  if (/^(?:13[A-D]0|100[A-Z])$/i.test(normalizedCode)) {
    return { system: "BEMA", code: normalizedCode, description: normalizedDescription };
  }
  if (/^\d{4}[A-Z]?$/.test(normalizedCode)) {
    return { system: "GOZ", code: normalizedCode, description: normalizedDescription };
  }
  if (/^\d{3}[A-Z]$/.test(normalizedCode)) {
    return { system: "BEMA", code: normalizedCode, description: normalizedDescription };
  }
  return { system: "Eigen", code: normalizedCode, description: normalizedDescription };
}

const invoiceBenchmarkMinLocationCount = 3;

function invoiceServiceSummary(invoiceRows: ParsedInvoiceDocument[], period?: PeriodOption, selectedStandort?: Standort, catalogContext = defaultInvoiceCatalogContext) {
  const byCode = new Map<string, {
    code: string;
    description: string;
    catalogStatus: InvoiceCatalogStatus;
    catalogSystems: Set<string>;
    catalogReviewCount: number;
    catalogCorrectionCount: number;
    count: number;
    amount: number;
    factorSum: number;
    factorCount: number;
    minFactor: number;
    maxFactor: number;
    locations: Set<string>;
    benchmarkLocations: Set<string>;
    groupFactorSum: number;
    groupFactorCount: number;
  }>();

  invoiceRows.filter((invoice) => invoiceReadyForAnalysis(invoice) && (!period || invoiceInPeriod(invoice, period))).forEach((invoice) => {
    const isSelectedStandort = selectedStandort
      ? invoice.standortId === selectedStandort.id || invoice.standortName === selectedStandort.name
      : true;
    const isComparisonStandort = selectedStandort
      ? invoice.standortId !== selectedStandort.id && invoice.standortName !== selectedStandort.name
      : true;
    invoice.serviceLines.forEach((line) => {
      const catalogCheck = invoiceCatalogCheckLine(line, catalogContext);
      if (catalogCheck.status === "ignored") return;
      const canonicalLine = canonicalInvoiceServiceLine(line, catalogContext);
      const canonicalCode = canonicalLine.code;
      if (!invoiceLineReadyForAnalysis(canonicalLine)) return;
      const entry = byCode.get(canonicalCode) ?? {
        code: canonicalCode,
        description: canonicalLine.description,
        catalogStatus: "ok",
        catalogSystems: new Set<string>(),
        catalogReviewCount: 0,
        catalogCorrectionCount: 0,
        count: 0,
        amount: 0,
        factorSum: 0,
        factorCount: 0,
        minFactor: Number.POSITIVE_INFINITY,
        maxFactor: 0,
        locations: new Set<string>(),
        benchmarkLocations: new Set<string>(),
        groupFactorSum: 0,
        groupFactorCount: 0
      };
      if (canonicalLine.factor && invoice.standortName) {
        entry.benchmarkLocations.add(invoice.standortName);
      }
      if (isSelectedStandort) {
        entry.count += 1;
        entry.amount += canonicalLine.amount;
        entry.locations.add(invoice.standortName);
        entry.catalogSystems.add(catalogCheck.system);
        if (catalogCheck.status === "review") entry.catalogReviewCount += 1;
        if (catalogCheck.status === "corrected") entry.catalogCorrectionCount += 1;
        entry.catalogStatus = invoiceCatalogStatusPriority(catalogCheck.status) < invoiceCatalogStatusPriority(entry.catalogStatus)
          ? catalogCheck.status
          : entry.catalogStatus;
      }
      if (isSelectedStandort && canonicalLine.factor) {
        entry.factorSum += canonicalLine.factor;
        entry.factorCount += 1;
        entry.minFactor = Math.min(entry.minFactor, canonicalLine.factor);
        entry.maxFactor = Math.max(entry.maxFactor, canonicalLine.factor);
      }
      if (isComparisonStandort && canonicalLine.factor) {
        entry.groupFactorSum += canonicalLine.factor;
        entry.groupFactorCount += 1;
      }
      if (entry.description === line.code || (canonicalCode !== line.code && canonicalLine.description.length < entry.description.length)) {
        entry.description = canonicalLine.description;
      }
      byCode.set(canonicalCode, entry);
    });
  });

  return [...byCode.values()]
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      ...entry,
      catalogSystems: [...entry.catalogSystems].filter((system) => system !== "Unbekannt").sort(),
      avgFactor: entry.factorCount ? entry.factorSum / entry.factorCount : 0,
      groupAvgFactor: entry.groupFactorCount ? entry.groupFactorSum / entry.groupFactorCount : 0,
      factorDelta: entry.factorCount && entry.groupFactorCount ? (entry.factorSum / entry.factorCount) - (entry.groupFactorSum / entry.groupFactorCount) : null,
      minFactor: Number.isFinite(entry.minFactor) ? entry.minFactor : 0,
      locations: [...entry.locations].sort(),
      benchmarkLocationCount: entry.benchmarkLocations.size
    }))
    .sort((a, b) => b.count - a.count || b.amount - a.amount);
}

function canonicalInvoiceServiceCode(code: string, description = "") {
  const normalizedDescription = description.replace(/\b13([A-D])O\b/gi, (_match, letter: string) => `13${letter}0`);
  const bemaCode = normalizedDescription.match(/\b(13[A-D]0)\b/i)?.[1];
  if (bemaCode) return bemaCode.toUpperCase();
  return normalizeInvoiceCatalogCode(code);
}

function InvoiceServiceSortButton({ label, sortKey, activeSort, onSort }: { label: string; sortKey: InvoiceServiceSortKey; activeSort: { key: InvoiceServiceSortKey; direction: SortDirection }; onSort: (key: InvoiceServiceSortKey) => void }) {
  const active = activeSort.key === sortKey;
  return (
    <button type="button" className={active ? "case-sort-header invoice-sort-header active" : "case-sort-header invoice-sort-header"} onClick={() => onSort(sortKey)} aria-label={`${label} sortieren`}>
      <span>{label}</span>
      <span aria-hidden="true">{active ? activeSort.direction === "asc" ? "↑" : "↓" : "↕"}</span>
    </button>
  );
}

function defaultInvoiceServiceSortDirection(key: InvoiceServiceSortKey): SortDirection {
  return key === "code" || key === "description" || key === "locations" ? "asc" : "desc";
}

function filterInvoiceServiceRows(rows: ReturnType<typeof invoiceServiceSummary>, filter: string) {
  const terms = normalizeTableSearch(filter).split(" ").filter(Boolean);
  if (!terms.length) return rows;
  return rows.filter((row) => {
    const haystack = normalizeTableSearch([row.code, row.description, row.locations.join(" ")].join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

function sortInvoiceServiceRows(rows: ReturnType<typeof invoiceServiceSummary>, key: InvoiceServiceSortKey, direction: SortDirection) {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const result = compareInvoiceServiceRow(a, b, key);
    return result ? result * multiplier : b.count - a.count || b.amount - a.amount || a.code.localeCompare(b.code, "de", { numeric: true });
  });
}

function compareInvoiceServiceRow(
  a: ReturnType<typeof invoiceServiceSummary>[number],
  b: ReturnType<typeof invoiceServiceSummary>[number],
  key: InvoiceServiceSortKey
) {
  if (key === "code") return a.code.localeCompare(b.code, "de", { numeric: true });
  if (key === "description") return a.description.localeCompare(b.description, "de", { numeric: true });
  if (key === "count") return a.count - b.count;
  if (key === "avgFactor") return a.avgFactor - b.avgFactor;
  if (key === "groupAvgFactor") return a.groupAvgFactor - b.groupAvgFactor;
  if (key === "factorDelta") return (a.factorDelta ?? Number.NEGATIVE_INFINITY) - (b.factorDelta ?? Number.NEGATIVE_INFINITY);
  if (key === "factorSpread") return (a.maxFactor - a.minFactor) - (b.maxFactor - b.minFactor);
  if (key === "amount") return a.amount - b.amount;
  if (key === "locations") return a.locations.join(", ").localeCompare(b.locations.join(", "), "de", { numeric: true });
  return 0;
}

function normalizeTableSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9äöüß]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function invoiceServicesKpis(
  invoiceRows: ParsedInvoiceDocument[],
  period: PeriodOption,
  selectedStandort: Standort | undefined,
  serviceRows: ReturnType<typeof invoiceServiceSummary>
) {
  const scopedInvoices = invoiceRows.filter((invoice) => invoiceReadyForAnalysis(invoice) && invoiceInPeriod(invoice, period) && (!selectedStandort || invoice.standortId === selectedStandort.id || invoice.standortName === selectedStandort.name));
  const scopedAnalysisLines = scopedInvoices.map((invoice) => invoice.serviceLines.map((line) => canonicalInvoiceServiceLine(line)).filter(invoiceLineReadyForAnalysis));
  const analysisInvoices = scopedInvoices.filter((_, index) => (scopedAnalysisLines[index]?.length ?? 0) > 0);
  const serviceLineCount = scopedAnalysisLines.reduce((sum, lines) => sum + lines.length, 0);
  const serviceCodeCount = serviceRows.length;
  const topAmount = [...serviceRows].sort((a, b) => b.amount - a.amount || b.count - a.count)[0];
  const widestFactorRange = [...serviceRows]
    .filter((row) => row.maxFactor > 0 && row.minFactor > 0)
    .sort((a, b) => (b.maxFactor - b.minFactor) - (a.maxFactor - a.minFactor) || b.count - a.count)[0];
  const locationFactors = orderedStandorte()
    .map((standort) => {
      const rows = invoiceRows.filter((invoice) => invoiceReadyForAnalysis(invoice) && invoiceInPeriod(invoice, period) && (invoice.standortId === standort.id || invoice.standortName === standort.name));
      const factorLines = rows.flatMap((invoice) => invoice.serviceLines.map((line) => canonicalInvoiceServiceLine(line))).filter((line) => invoiceLineReadyForAnalysis(line) && line.factor);
      if (!factorLines.length) return null;
      return {
        standortId: standort.id,
        standortName: standort.name,
        serviceCount: factorLines.length,
        avgFactor: factorLines.reduce((sum, line) => sum + (line.factor ?? 0), 0) / factorLines.length
      };
    })
    .filter((row): row is { standortId: string; standortName: string; serviceCount: number; avgFactor: number } => Boolean(row));
  const visibleLocationFactors = selectedStandort
    ? locationFactors.filter((row) => row.standortId === selectedStandort.id)
    : locationFactors;

  return {
    mostFrequent: serviceRows[0],
    topAmount,
    widestFactorRange,
    invoiceCount: analysisInvoices.length,
    serviceLineCount,
    serviceCodeCount,
    catalogReviewCount: serviceRows.reduce((sum, row) => sum + row.catalogReviewCount, 0),
    catalogCorrectionCount: serviceRows.reduce((sum, row) => sum + row.catalogCorrectionCount, 0),
    locationFactorCount: visibleLocationFactors.length,
    singleFactorLocation: visibleLocationFactors[0],
    highestFactorLocation: visibleLocationFactors.length > 1 ? [...visibleLocationFactors].sort((a, b) => b.avgFactor - a.avgFactor || b.serviceCount - a.serviceCount)[0] : undefined,
    lowestFactorLocation: visibleLocationFactors.length > 1 ? [...visibleLocationFactors].sort((a, b) => a.avgFactor - b.avgFactor || b.serviceCount - a.serviceCount)[0] : undefined
  };
}

function invoiceCatalogServiceStatusLabel(row: ReturnType<typeof invoiceServiceSummary>[number]) {
  if (row.catalogReviewCount > 0) return `${row.catalogReviewCount} prüfen`;
  if (row.catalogCorrectionCount > 0) return "korrigiert";
  return "OK";
}

function invoiceBenchmarkRows(invoiceRows: ParsedInvoiceDocument[], period: PeriodOption) {
  const eligibleCodes = invoiceBenchmarkEligibleServiceCodes(invoiceRows, period);
  return orderedStandorte()
    .map((standort) => {
      const rows = invoiceRows.filter((invoice) => invoiceReadyForAnalysis(invoice) && invoiceInPeriod(invoice, period) && (invoice.standortId === standort.id || invoice.standortName === standort.name));
      if (!rows.length) return null;
      const serviceLines = rows
        .flatMap((invoice) => invoice.serviceLines.map((line) => canonicalInvoiceServiceLine(line)))
        .filter((line) => invoiceLineReadyForAnalysis(line) && eligibleCodes.has(line.code));
      const factorLines = serviceLines.filter((line) => line.factor);
      const comparisonLines = invoiceRows
        .filter((invoice) => invoiceReadyForAnalysis(invoice) && invoiceInPeriod(invoice, period) && invoice.standortId !== standort.id && invoice.standortName !== standort.name)
        .flatMap((invoice) => invoice.serviceLines.map((line) => canonicalInvoiceServiceLine(line)))
        .filter((line) => invoiceLineReadyForAnalysis(line) && eligibleCodes.has(line.code) && line.factor);
      const avgFactor = factorLines.length ? factorLines.reduce((sum, line) => sum + (line.factor ?? 0), 0) / factorLines.length : 0;
      const groupAvgFactor = comparisonLines.length ? comparisonLines.reduce((sum, line) => sum + (line.factor ?? 0), 0) / comparisonLines.length : 0;
      const potentialRows = invoicePotentialSummary(invoiceRows, period, standort);
      const amount = rows.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
      const factorDelta = avgFactor && groupAvgFactor ? avgFactor - groupAvgFactor : null;
      return {
        standortId: standort.id,
        standortName: standort.name,
        praxisname: standort.praxisname,
        invoiceCount: rows.length,
        serviceCount: serviceLines.length,
        factorCount: factorLines.length,
        amount,
        avgFactor,
        groupAvgFactor,
        factorDelta,
        relativeIndex: groupAvgFactor ? (avgFactor / groupAvgFactor) * 100 : 0,
        underBenchmarkCount: potentialRows.length,
        potential: potentialRows.reduce((sum, row) => sum + row.potential, 0)
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null && row.factorCount > 0)
    .sort((a, b) => b.potential - a.potential || a.relativeIndex - b.relativeIndex || b.amount - a.amount);
}

function invoiceBenchmarkEligibleServiceCodes(invoiceRows: ParsedInvoiceDocument[], period: PeriodOption) {
  const locationsByCode = new Map<string, Set<string>>();
  invoiceRows
    .filter((invoice) => invoiceReadyForAnalysis(invoice) && invoiceInPeriod(invoice, period))
    .forEach((invoice) => {
      if (!invoice.standortName) return;
      invoice.serviceLines
        .map((line) => canonicalInvoiceServiceLine(line))
        .filter((line) => invoiceLineReadyForAnalysis(line) && line.factor)
        .forEach((line) => {
          const locations = locationsByCode.get(line.code) ?? new Set<string>();
          locations.add(invoice.standortName);
          locationsByCode.set(line.code, locations);
        });
    });
  return new Set([...locationsByCode.entries()]
    .filter(([, locations]) => locations.size >= invoiceBenchmarkMinLocationCount)
    .map(([code]) => code));
}

function invoiceBenchmarkServiceRows(invoiceRows: ParsedInvoiceDocument[], period: PeriodOption, selectedStandort?: Standort) {
  if (!selectedStandort) return [];
  return invoicePotentialSummary(invoiceRows, period, selectedStandort)
    .map((row) => ({
      ...row,
      relativeIndex: row.groupAvgFactor ? (row.avgFactor / row.groupAvgFactor) * 100 : 0
    }))
    .sort(compareInvoicePotentialRows);
}

function invoiceBenchmarkKpis(rows: ReturnType<typeof invoiceBenchmarkRows>) {
  const totalFactorCount = rows.reduce((sum, row) => sum + row.factorCount, 0);
  const groupAvgFactor = totalFactorCount
    ? rows.reduce((sum, row) => sum + row.avgFactor * row.factorCount, 0) / totalFactorCount
    : 0;
  const withBenchmark = rows.filter((row) => row.groupAvgFactor > 0);
  return {
    groupAvgFactor,
    serviceLineCount: rows.reduce((sum, row) => sum + row.serviceCount, 0),
    totalPotential: rows.reduce((sum, row) => sum + row.potential, 0),
    topPotential: [...rows].sort((a, b) => b.potential - a.potential)[0],
    bestRelative: [...withBenchmark].sort((a, b) => b.relativeIndex - a.relativeIndex)[0],
    lowestRelative: [...withBenchmark].sort((a, b) => a.relativeIndex - b.relativeIndex)[0]
  };
}

type InvoiceTrendRow = {
  key: string;
  label: string;
  sortValue: number;
  count: number;
  amount: number;
  avgFactor: number;
  minFactor: number;
  maxFactor: number;
  deltaToPrevious: number | null;
};

function invoiceTrendServiceOptions(invoiceRows: ParsedInvoiceDocument[], selectedStandort?: Standort, filter = "") {
  const byCode = new Map<string, { code: string; description: string; count: number }>();
  invoiceRows
    .filter((invoice) => invoiceReadyForAnalysis(invoice) && (!selectedStandort || invoice.standortId === selectedStandort.id || invoice.standortName === selectedStandort.name))
    .forEach((invoice) => {
      invoice.serviceLines
        .map((line) => canonicalInvoiceServiceLine(line))
        .filter((line) => invoiceLineReadyForAnalysis(line) && line.factor)
        .forEach((line) => {
          const current = byCode.get(line.code) ?? { code: line.code, description: line.description, count: 0 };
          current.count += 1;
          if (current.description === line.code || line.description.length < current.description.length) current.description = line.description;
          byCode.set(line.code, current);
        });
    });
  const terms = normalizeTableSearch(filter).split(" ").filter(Boolean);
  return [...byCode.values()]
    .filter((row) => {
      if (!terms.length) return true;
      const haystack = normalizeTableSearch(`${row.code} ${row.description}`);
      return terms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code, "de", { numeric: true }));
}

function invoiceFactorTrendByYear(invoiceRows: ParsedInvoiceDocument[], period: PeriodOption, selectedStandort: Standort | undefined, serviceCode: string) {
  return invoiceFactorTrendRows(invoiceRows, period, selectedStandort, serviceCode, "year");
}

function invoiceFactorTrendByMonth(invoiceRows: ParsedInvoiceDocument[], period: PeriodOption, selectedStandort: Standort | undefined, serviceCode: string) {
  return invoiceFactorTrendRows(invoiceRows, period, selectedStandort, serviceCode, "month");
}

function invoiceFactorTrendRows(
  invoiceRows: ParsedInvoiceDocument[],
  period: PeriodOption,
  selectedStandort: Standort | undefined,
  serviceCode: string,
  granularity: "year" | "month"
): InvoiceTrendRow[] {
  const byPeriod = new Map<string, { key: string; label: string; sortValue: number; count: number; amount: number; factorSum: number; minFactor: number; maxFactor: number }>();
  invoiceRows
    .filter((invoice) => invoiceReadyForAnalysis(invoice) && invoiceInPeriod(invoice, period) && (!selectedStandort || invoice.standortId === selectedStandort.id || invoice.standortName === selectedStandort.name))
    .forEach((invoice) => {
      const date = parseGermanDate(invoice.invoiceDate);
      if (Number.isNaN(date.getTime())) return;
      const key = granularity === "year"
        ? String(date.getFullYear())
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = granularity === "year" ? key : shortMonthYearLabel(date.getFullYear(), date.getMonth());
      const sortValue = granularity === "year" ? date.getFullYear() : date.getFullYear() * 100 + date.getMonth() + 1;
      const entry = byPeriod.get(key) ?? {
        key,
        label,
        sortValue,
        count: 0,
        amount: 0,
        factorSum: 0,
        minFactor: Number.POSITIVE_INFINITY,
        maxFactor: 0
      };
      invoice.serviceLines
        .map((line) => canonicalInvoiceServiceLine(line))
        .filter((line) => invoiceLineReadyForAnalysis(line) && line.factor && (serviceCode === "alle" || line.code === serviceCode))
        .forEach((line) => {
          const factor = line.factor ?? 0;
          entry.count += 1;
          entry.amount += line.amount;
          entry.factorSum += factor;
          entry.minFactor = Math.min(entry.minFactor, factor);
          entry.maxFactor = Math.max(entry.maxFactor, factor);
        });
      if (entry.count) byPeriod.set(key, entry);
    });

  const rows = [...byPeriod.values()]
    .sort((a, b) => a.sortValue - b.sortValue)
    .map((entry): InvoiceTrendRow => ({
      key: entry.key,
      label: entry.label,
      sortValue: entry.sortValue,
      count: entry.count,
      amount: entry.amount,
      avgFactor: entry.count ? entry.factorSum / entry.count : 0,
      minFactor: Number.isFinite(entry.minFactor) ? entry.minFactor : 0,
      maxFactor: entry.maxFactor,
      deltaToPrevious: null
    }));

  return rows.map((row, index) => ({
    ...row,
    deltaToPrevious: index > 0 ? row.avgFactor - rows[index - 1].avgFactor : null
  })).sort((a, b) => b.sortValue - a.sortValue);
}

function invoiceFactorTrendKpis(yearRows: InvoiceTrendRow[], monthRows: InvoiceTrendRow[]) {
  const chronologicalYears = [...yearRows].sort((a, b) => a.sortValue - b.sortValue);
  const latest = chronologicalYears[chronologicalYears.length - 1] ?? null;
  const previous = chronologicalYears[chronologicalYears.length - 2] ?? null;
  const changes = chronologicalYears.slice(1).map((row, index) => ({
    fromLabel: chronologicalYears[index].label,
    toLabel: row.label,
    delta: row.avgFactor - chronologicalYears[index].avgFactor
  }));
  const delta = latest && previous ? latest.avgFactor - previous.avgFactor : null;
  return {
    latest,
    previous,
    delta,
    deltaPercent: latest && previous && previous.avgFactor ? (delta ?? 0) / previous.avgFactor * 100 : null,
    bestYearIncrease: [...changes].sort((a, b) => b.delta - a.delta)[0],
    biggestYearDrop: [...changes].sort((a, b) => a.delta - b.delta)[0],
    totalCount: yearRows.reduce((sum, row) => sum + row.count, 0) || monthRows.reduce((sum, row) => sum + row.count, 0)
  };
}

type InvoicePatientValueRow = {
  key: string;
  patientName: string;
  locations: string[];
  invoiceNos: string[];
  invoiceCount: number;
  amount: number;
  avgInvoice: number;
  serviceCount: number;
  factorCount: number;
  avgFactor: number;
  labAmount: number;
  labShare: number;
  lastInvoiceDate: string;
  lastDateValue: number;
};

function InvoicePatientSortButton({ label, sortKey, activeSort, onSort }: { label: string; sortKey: InvoicePatientSortKey; activeSort: { key: InvoicePatientSortKey; direction: SortDirection }; onSort: (key: InvoicePatientSortKey) => void }) {
  const active = activeSort.key === sortKey;
  return (
    <button type="button" className={active ? "case-sort-header invoice-sort-header active" : "case-sort-header invoice-sort-header"} onClick={() => onSort(sortKey)} aria-label={`${label} sortieren`}>
      <span>{label}</span>
      <span aria-hidden="true">{active ? activeSort.direction === "asc" ? "↑" : "↓" : "↕"}</span>
    </button>
  );
}

function invoicePatientValueRows(invoiceRows: ParsedInvoiceDocument[], period: PeriodOption, selectedStandort?: Standort): InvoicePatientValueRow[] {
  const byPatient = new Map<string, {
    key: string;
    patientName: string;
    locations: Set<string>;
    invoiceNos: Set<string>;
    invoiceCount: number;
    amount: number;
    serviceCount: number;
    factorCount: number;
    factorSum: number;
    labAmount: number;
    lastInvoiceDate: string;
    lastDateValue: number;
  }>();

  invoiceRows
    .filter((invoice) =>
      invoiceReadyForAnalysis(invoice) &&
      invoiceInPeriod(invoice, period) &&
      (!selectedStandort || invoice.standortId === selectedStandort.id || invoice.standortName === selectedStandort.name)
    )
    .forEach((invoice) => {
      const patientName = invoice.patientName || invoice.treatedPerson || "-";
      const standortKey = selectedStandort ? selectedStandort.id : invoice.standortId || invoice.standortName || "gruppe";
      const key = `${standortKey}:${normalizeTableSearch(patientName)}`;
      const serviceLines = invoice.serviceLines.map((line) => canonicalInvoiceServiceLine(line)).filter(invoiceLineReadyForAnalysis);
      const factorLines = serviceLines.filter((line) => line.factor);
      const labAmount = invoice.eigenlaborTotal + (invoice.fremdlaborGross || invoice.fremdlaborNet || 0);
      const invoiceDate = parseGermanDate(invoice.invoiceDate);
      const dateValue = Number.isNaN(invoiceDate.getTime()) ? 0 : invoiceDate.getTime();
      const current = byPatient.get(key) ?? {
        key,
        patientName,
        locations: new Set<string>(),
        invoiceNos: new Set<string>(),
        invoiceCount: 0,
        amount: 0,
        serviceCount: 0,
        factorCount: 0,
        factorSum: 0,
        labAmount: 0,
        lastInvoiceDate: "",
        lastDateValue: 0
      };

      current.invoiceCount += 1;
      current.amount += invoice.totalAmount;
      current.serviceCount += serviceLines.length;
      current.factorCount += factorLines.length;
      current.factorSum += factorLines.reduce((sum, line) => sum + (line.factor ?? 0), 0);
      current.labAmount += labAmount;
      if (invoice.standortName) current.locations.add(invoice.standortName);
      if (invoice.invoiceNo) current.invoiceNos.add(invoice.invoiceNo);
      if (dateValue >= current.lastDateValue) {
        current.lastDateValue = dateValue;
        current.lastInvoiceDate = invoice.invoiceDate;
      }
      byPatient.set(key, current);
    });

  return [...byPatient.values()]
    .map((row) => ({
      key: row.key,
      patientName: row.patientName,
      locations: [...row.locations].sort((a, b) => a.localeCompare(b, "de")),
      invoiceNos: [...row.invoiceNos].filter(Boolean).sort((a, b) => a.localeCompare(b, "de", { numeric: true })),
      invoiceCount: row.invoiceCount,
      amount: row.amount,
      avgInvoice: row.invoiceCount ? row.amount / row.invoiceCount : 0,
      serviceCount: row.serviceCount,
      factorCount: row.factorCount,
      avgFactor: row.factorCount ? row.factorSum / row.factorCount : 0,
      labAmount: row.labAmount,
      labShare: row.amount ? (row.labAmount / row.amount) * 100 : 0,
      lastInvoiceDate: row.lastInvoiceDate || "-",
      lastDateValue: row.lastDateValue
    }))
    .sort((a, b) => b.amount - a.amount || b.invoiceCount - a.invoiceCount || a.patientName.localeCompare(b.patientName, "de", { numeric: true }));
}

function filterInvoicePatientRows(rows: InvoicePatientValueRow[], searchTerm: string) {
  const terms = normalizeTableSearch(searchTerm).split(" ").filter(Boolean);
  if (!terms.length) return rows;
  return rows.filter((row) => {
    const haystack = normalizeTableSearch([row.patientName, row.locations.join(" "), row.invoiceNos.join(" ")].join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

function sortInvoicePatientRows(rows: InvoicePatientValueRow[], key: InvoicePatientSortKey, direction: SortDirection) {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const result = compareInvoicePatientRows(a, b, key);
    return result ? result * multiplier : b.amount - a.amount || a.patientName.localeCompare(b.patientName, "de", { numeric: true });
  });
}

function compareInvoicePatientRows(a: InvoicePatientValueRow, b: InvoicePatientValueRow, key: InvoicePatientSortKey) {
  if (key === "amount") return a.amount - b.amount;
  if (key === "invoiceCount") return a.invoiceCount - b.invoiceCount;
  if (key === "avgInvoice") return a.avgInvoice - b.avgInvoice;
  if (key === "avgFactor") return a.avgFactor - b.avgFactor;
  if (key === "serviceCount") return a.serviceCount - b.serviceCount;
  if (key === "labShare") return a.labShare - b.labShare;
  if (key === "lastDate") return a.lastDateValue - b.lastDateValue;
  return 0;
}

function invoicePatientValueKpis(rows: InvoicePatientValueRow[]) {
  const meaningful = rows.filter((row) => row.invoiceCount > 0);
  const valueSorted = [...meaningful].sort((a, b) => b.amount - a.amount);
  const highValueThreshold = valueSorted[Math.min(valueSorted.length - 1, Math.floor(valueSorted.length * 0.25))]?.amount ?? 0;
  return {
    topValue: valueSorted[0],
    highestAvgInvoice: [...meaningful].sort((a, b) => b.avgInvoice - a.avgInvoice || b.amount - a.amount)[0],
    lowFactorHighValue: [...meaningful]
      .filter((row) => row.amount >= highValueThreshold && row.factorCount >= 3 && row.avgFactor > 0)
      .sort((a, b) => a.avgFactor - b.avgFactor || b.amount - a.amount)[0],
    highLabShare: [...meaningful]
      .filter((row) => row.labAmount > 0)
      .sort((a, b) => b.labShare - a.labShare || b.labAmount - a.labAmount)[0]
  };
}

function patientLocationLabel(row: Pick<InvoicePatientValueRow, "locations">) {
  if (!row.locations.length) return "Standort unbekannt";
  return row.locations.join(", ");
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
    .filter((row) => row.benchmarkLocationCount >= invoiceBenchmarkMinLocationCount && row.groupAvgFactor > 0 && row.potential > 0)
    .sort(compareInvoicePotentialRows);
}

function compareInvoicePotentialRows(
  a: ReturnType<typeof invoiceServiceSummary>[number] & { potential: number },
  b: ReturnType<typeof invoiceServiceSummary>[number] & { potential: number }
) {
  return b.potential - a.potential
    || b.count - a.count
    || b.amount - a.amount
    || a.code.localeCompare(b.code, "de", { numeric: true });
}

function buildInvoiceQualityFindings(
  invoiceRows: ParsedInvoiceDocument[],
  period: PeriodOption,
  selectedStandort: Standort | undefined,
  options: { minGroupRate: number; minCaseCount: number; minPotential: number }
): InvoiceQualityFinding[] {
  const analysisInvoices = invoiceRows
    .filter((invoice) => invoiceReadyForAnalysis(invoice) && invoiceInPeriod(invoice, period))
    .map((invoice) => invoiceQualityInvoiceProfile(invoice))
    .filter((invoice) => invoice.codes.length >= 2);
  const targetStandorte = selectedStandort
    ? [selectedStandort]
    : orderedStandorte().filter((standort) => analysisInvoices.some((invoice) => invoice.standortId === standort.id || invoice.standortName === standort.name));
  return buildInvoiceQualityFindingsFromProfiles(analysisInvoices, targetStandorte, options);
}

function invoiceQualityInvoiceProfile(invoice: ParsedInvoiceDocument) {
  const cached = invoiceQualityProfileCache.get(invoice);
  if (cached) return cached;
  const profile = buildInvoiceQualityProfile(invoice, canonicalInvoiceServiceLine, invoiceLineReadyForAnalysis);
  invoiceQualityProfileCache.set(invoice, profile);
  return profile;
}

function previousComparablePeriod(period: PeriodOption): PeriodOption | null {
  if (!period.start || !period.end) return null;
  const dayCount = Math.max(1, Math.round((period.end.getTime() - period.start.getTime()) / 86400000) + 1);
  const previousEnd = new Date(period.start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - dayCount + 1);
  return {
    id: `previous-${period.id}`,
    label: `Vorperiode ${period.label}`,
    detail: `${previousStart.toLocaleDateString("de-DE")} bis ${previousEnd.toLocaleDateString("de-DE")}`,
    start: previousStart,
    end: previousEnd
  };
}

function benchmarkPriorityLabel(value: number) {
  if (value <= 0) return "kein Hebel";
  if (value >= 5000) return "hoch";
  if (value >= 1500) return "mittel";
  return "niedrig";
}

function invoiceLocationSummary(invoiceRows: ParsedInvoiceDocument[], period: PeriodOption) {
  return orderedStandorte()
    .map((standort) => {
      const rows = invoiceRows.filter((invoice) => invoiceReadyForAnalysis(invoice) && invoiceInPeriod(invoice, period) && (invoice.standortId === standort.id || invoice.standortName === standort.name));
      if (!rows.length) return null;
      const serviceLines = rows.flatMap((invoice) => invoice.serviceLines.map((line) => canonicalInvoiceServiceLine(line))).filter(invoiceLineReadyForAnalysis);
      const factorLines = serviceLines.filter((line) => line.factor);
      const comparisonFactorLines = invoiceRows
        .filter((invoice) => invoiceReadyForAnalysis(invoice) && invoiceInPeriod(invoice, period) && invoice.standortId !== standort.id && invoice.standortName !== standort.name)
        .flatMap((invoice) => invoice.serviceLines.map((line) => canonicalInvoiceServiceLine(line)))
        .filter((line) => invoiceLineReadyForAnalysis(line) && line.factor);
      const potentialRows = invoicePotentialSummary(invoiceRows, period, standort);
      const avgFactor = factorLines.length ? factorLines.reduce((sum, line) => sum + (line.factor ?? 0), 0) / factorLines.length : 0;
      const groupAvgFactor = comparisonFactorLines.length ? comparisonFactorLines.reduce((sum, line) => sum + (line.factor ?? 0), 0) / comparisonFactorLines.length : 0;
      const minFactor = factorLines.length ? Math.min(...factorLines.map((line) => line.factor ?? 0)) : 0;
      const maxFactor = factorLines.length ? Math.max(...factorLines.map((line) => line.factor ?? 0)) : 0;
      const factorDelta = avgFactor && groupAvgFactor ? avgFactor - groupAvgFactor : null;
      return {
        standortId: standort.id,
        standortName: standort.name,
        invoiceCount: rows.length,
        serviceCount: serviceLines.length,
        factorCount: factorLines.length,
        avgFactor,
        groupAvgFactor,
        factorDelta,
        relativeIndex: groupAvgFactor ? (avgFactor / groupAvgFactor) * 100 : 0,
        minFactor,
        maxFactor,
        underBenchmarkCount: potentialRows.filter((row) => row.factorDelta !== null && row.factorDelta < 0).length,
        potential: potentialRows.reduce((sum, row) => sum + row.potential, 0)
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => (a.relativeIndex || Number.POSITIVE_INFINITY) - (b.relativeIndex || Number.POSITIVE_INFINITY) || b.underBenchmarkCount - a.underBenchmarkCount || a.standortName.localeCompare(b.standortName, "de"));
}

function annualizeInvoicePotential(value: number, period?: PeriodOption) {
  if (!period?.start || !period.end) return value;
  const dayCount = Math.max(1, Math.round((period.end.getTime() - period.start.getTime()) / 86400000) + 1);
  return value * (365 / dayCount);
}

function invoiceReadyForAnalysis(invoice: ParsedInvoiceDocument) {
  if (invoice.ocrStatus === "required") return false;
  return !invoice.parseNotes.some((note) => note.startsWith("Neues Praxissoftware-Format:"));
}

function invoiceLineReadyForAnalysis(line: ParsedInvoiceLine) {
  return suspiciousInvoiceLineReason(line) === null;
}

function canonicalInvoiceServiceLine(line: ParsedInvoiceLine, catalogContext = defaultInvoiceCatalogContext) {
  const baseCode = canonicalInvoiceServiceCode(line.code, line.description);
  const baseKey = normalizeInvoiceCatalogCode(baseCode);
  const canonicalCode = catalogContext.lookup.has(baseKey)
    ? baseKey
    : /^\d{3}$/.test(baseKey) && catalogContext.lookup.has(`${baseKey}0`)
      ? `${baseKey}0`
      : baseKey;
  const catalogEntry = catalogContext.lookup.get(normalizeInvoiceCatalogCode(canonicalCode));
  return {
    ...line,
    code: catalogEntry?.code ?? canonicalCode,
    description: catalogEntry?.description ?? line.description
  };
}

function suspiciousInvoiceLineReason(line: ParsedInvoiceLine) {
  const code = line.code.trim();
  const description = line.description.trim();
  const descriptionWithoutPrefix = description.replace(/^\([a-z0-9]{1,3}\)\s*/i, "").trim();
  if (line.category !== "leistung") return "Keine Gebührenposition.";
  if (!isPlausibleInvoiceServiceCode(code)) return "Gebührennummer nicht plausibel.";
  if (line.factor && line.factor > 15) return "Faktor liegt außerhalb des plausiblen Gebührenrahmens.";
  if (/^(?:0+|1|5|88)$/.test(code)) return "Gebührennummer wirkt wie OCR-Rest.";
  if (/^[\d\s,.;:()/-]+$/.test(description)) return "Beschreibung besteht fast nur aus Zahlen/Satzzeichen.";
  if (/^\([a-z0-9]{1,3}\)\s/i.test(description) && descriptionWithoutPrefix.length < 8) return "Beschreibung beginnt mit OCR-/Zahnrest.";
  if (/\b(?:ode\d|nalch)\b/i.test(description)) return "Beschreibung enthält typischen OCR-Lesefehler.";
  if (/\b\d{3}\s+\d\b/.test(description)) return "Faktor/Begründung scheint in die Beschreibung gerutscht.";
  if (/\b(?:Präparieren|Kiefer|Implantat|Sinusbodenelevation|Krone|Teilkrone)\b.*\b\d\s+\d\b/i.test(description)) {
    return "Zahn-/Begründungsangaben scheinen an die Beschreibung angehängt.";
  }
  if (description.length < 3) return "Beschreibung ist zu kurz.";
  return null;
}

function isPlausibleInvoiceServiceCode(code: string) {
  const normalizedCode = code.trim();
  if (isZeroOnlyInvoiceCode(normalizedCode)) return false;
  return /^(?:\d{3,4}[a-z]?|13[A-Z]0|Ä\d{1,4}[a-z]?)$/i.test(normalizedCode);
}

function isZeroOnlyInvoiceCode(code: string) {
  return /^0+$/.test(code.trim());
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

function fileSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "export";
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
  onProgress?: (processed: number, total: number, fileName: string) => void,
  options: { importSource?: ParsedInvoiceDocument["importSource"]; standortId?: string } = {}
) {
  const chunks = chunkUploadFiles(files, {
    maxFiles: invoiceUploadChunkMaxFiles,
    maxBytes: invoiceUploadChunkMaxBytes
  });
  const rows: ParsedInvoiceDocument[] = [];
  let processed = 0;

  for (const [chunkIndex, chunk] of chunks.entries()) {
    const chunkRows = await parseInvoiceFileChunkWithRetry(chunk, (chunkProcessed, _chunkTotal, fileName) => {
      onProgress?.(processed + chunkProcessed, files.length, `Paket ${chunkIndex + 1}/${chunks.length}: ${fileName}`);
    }, options);
    rows.push(...chunkRows);
    processed += chunk.length;
    onProgress?.(processed, files.length, `Paket ${chunkIndex + 1}/${chunks.length} abgeschlossen`);
  }

  return mergeInvoiceRows([], rows);
}

async function parseInvoiceFileChunkWithRetry(
  files: File[],
  onProgress?: (processed: number, total: number, fileName: string) => void,
  options: { importSource?: ParsedInvoiceDocument["importSource"]; standortId?: string } = {}
): Promise<ParsedInvoiceDocument[]> {
  try {
    return await parseInvoiceFileChunk(files, onProgress, options);
  } catch (error) {
    if (files.length <= 1) throw error;
    const midpoint = Math.ceil(files.length / 2);
    const left = await parseInvoiceFileChunkWithRetry(files.slice(0, midpoint), onProgress, options);
    const right = await parseInvoiceFileChunkWithRetry(files.slice(midpoint), onProgress, options);
    return [...left, ...right];
  }
}

async function parseInvoiceFileChunk(
  files: File[],
  onProgress?: (processed: number, total: number, fileName: string) => void,
  options: { importSource?: ParsedInvoiceDocument["importSource"]; standortId?: string } = {}
) {
  const formData = new FormData();
  formData.append("importSource", options.importSource ?? "bfs_invoice_pdf");
  if (options.standortId) formData.append("standortId", options.standortId);
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

  if (process.env.NODE_ENV !== "production" && options.importSource !== "practice_software_pdf") {
    return parseInvoiceUploadFilesLazy(files, onProgress);
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
        ? await parseInvoiceStatusUploadFilesLazy([file])
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
        const parsed = await parseInvoiceStatusUploadFilesLazy([file]);
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

    const recoveredDocuments = await parseInvoiceStatusUploadFilesLazy(missingFiles, (processed, total, fileName) => {
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
    return parseInvoiceStatusUploadFilesLazy(files, onProgress);
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
    return { rows: await parseDemoImportFilesLazy(files, onProgress), persistence: undefined };
  }

  const errorPayload = await response.json().catch(() => null) as { error?: string } | null;
  throw new ImportChunkError(response.status, errorPayload?.error ?? "Serverseitiger Import fehlgeschlagen.");
}

function uploadFilePath(file: File) {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

function chunkUploadFiles(files: File[], options: { maxFiles?: number; maxBytes?: number } = {}) {
  const maxFiles = options.maxFiles ?? uploadChunkMaxFiles;
  const maxBytes = options.maxBytes ?? uploadChunkMaxBytes;
  const chunks: File[][] = [];
  let current: File[] = [];
  let currentBytes = 0;

  files.forEach((file) => {
    const wouldExceedSize = current.length > 0 && currentBytes + file.size > maxBytes;
    const wouldExceedCount = current.length >= maxFiles;
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

function importStatusMessage(parsedCount: number, persistence?: ImportPersistenceSummary, totalRows?: number) {
  if (!persistence) return `${parsedCount} PDF-Dateien fertig eingelesen`;
  const totalNote = typeof totalRows === "number" ? `, ${totalRows} Abrechnungen insgesamt im Datenstand` : "";
  const base = `${parsedCount} PDF-Dateien verarbeitet: ${persistence.imported} neu gespeichert, ${persistence.duplicates} bestehende aktualisiert/ersetzt${totalNote}`;
  if (!persistence.failed) return `${base}. Kacheln und Auswertungen wurden aktualisiert.`;
  const firstError = persistence.errors?.[0];
  return `${base}, ${persistence.failed} fehlgeschlagen${firstError ? ` (${firstError.file}: ${firstError.message})` : ""}.`;
}

function printWindowControlStyles() {
  return `
    .print-window-toolbar {
      position: sticky;
      top: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border-bottom: 1px solid rgba(121, 238, 231, 0.28);
      background: #061c2a;
      color: #f8ffff;
      font: 13px Arial, Helvetica, sans-serif;
    }
    .print-window-toolbar strong { font-size: 13px; }
    .print-window-toolbar button {
      border: 1px solid rgba(121, 238, 231, 0.45);
      border-radius: 8px;
      background: rgba(48, 213, 200, 0.14);
      color: #f8ffff;
      padding: 8px 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .print-window-hint { display: none; color: #b8cbd4; font-size: 12px; }
    .print-close-blocked .print-window-hint { display: inline; }
    @media print {
      .print-window-toolbar { display: none !important; }
    }
  `;
}

function printWindowToolbarHtml() {
  return `<div class="print-window-toolbar">
    <div><strong>PDF-/Druckexport</strong> <span class="print-window-hint">Falls das Fenster offen bleibt, bitte hier schließen.</span></div>
    <button type="button" onclick="orisusClosePrintWindow()">Fenster schließen</button>
  </div>`;
}

function printWindowAutoCloseScript(onLoadExtra = "", printDelayMs = 150) {
  return `<script>
    function orisusClosePrintWindow() {
      window.close();
      window.setTimeout(function () {
        document.body.classList.add("print-close-blocked");
      }, 250);
    }
    window.addEventListener("afterprint", function () {
      window.setTimeout(orisusClosePrintWindow, 120);
    });
    window.addEventListener("load", function () {
      ${onLoadExtra}
      window.setTimeout(function () {
        window.print();
        window.setTimeout(orisusClosePrintWindow, 500);
      }, ${printDelayMs});
    });
  </script>`;
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
  return isPdfUploadFile(file);
}

function isPdfUploadFile(file: File) {
  return /\.pdf$/i.test(file.name) || file.type === "application/pdf";
}

async function parseDemoImportFilesLazy(files: File[], onProgress?: (processed: number, total: number, fileName: string) => void) {
  const { parseDemoImportFiles } = await import("@/lib/demo-import");
  return parseDemoImportFiles(files, onProgress);
}

async function parseInvoiceUploadFilesLazy(
  files: File[],
  onProgress?: (processed: number, total: number, fileName: string) => void
) {
  const { parseInvoiceUploadFiles } = await import("@/lib/invoice-parser");
  return parseInvoiceUploadFiles(files, onProgress);
}

async function parseInvoiceStatusUploadFilesLazy(
  files: File[],
  onProgress?: (processed: number, total: number, fileName: string) => void
) {
  const { parseInvoiceStatusUploadFiles } = await import("@/lib/invoice-status-parser");
  return parseInvoiceStatusUploadFiles(files, onProgress);
}

async function parsePracticeSoftwareOcrFilesLazy(
  files: File[],
  standort: Standort,
  onProgress?: Parameters<typeof import("@/lib/practice-invoice-ocr")["parsePracticeSoftwareOcrFiles"]>[2]
) {
  const { parsePracticeSoftwareOcrFiles } = await import("@/lib/practice-invoice-ocr");
  return parsePracticeSoftwareOcrFiles(files, standort, onProgress);
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
              <small>{payoutShareLabel(totalPayout, totalSubmitted)}</small>
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
    ${printWindowControlStyles()}
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
    .table-wrap, .invoice-services-scroll, .invoice-services-table-wrap { overflow: visible !important; max-height: none !important; border-radius: 6px !important; }
    .invoice-services-table { min-width: 0 !important; width: 100% !important; table-layout: fixed !important; }
    .invoice-services-table th:nth-child(1), .invoice-services-table td:nth-child(1) { width: 8% !important; }
    .invoice-services-table th:nth-child(2), .invoice-services-table td:nth-child(2) { width: 28% !important; }
    .invoice-services-table th:nth-child(3), .invoice-services-table td:nth-child(3) { width: 9% !important; }
    .invoice-services-table th:nth-child(4), .invoice-services-table td:nth-child(4) { width: 8% !important; }
    .invoice-services-table th:nth-child(5), .invoice-services-table td:nth-child(5) { width: 10% !important; }
    .invoice-services-table th:nth-child(6), .invoice-services-table td:nth-child(6) { width: 8% !important; }
    .invoice-services-table th:nth-child(7), .invoice-services-table td:nth-child(7) { width: 9% !important; }
    .invoice-services-table th:nth-child(8), .invoice-services-table td:nth-child(8) { width: 9% !important; }
    .invoice-services-table th:nth-child(9), .invoice-services-table td:nth-child(9) { width: 11% !important; }
    .invoice-services-table th, .invoice-services-table td { white-space: normal !important; overflow-wrap: anywhere !important; hyphens: auto !important; }
    .invoice-services-scroll thead th { position: static !important; }
    .custom-benchmark-table { min-width: 0 !important; table-layout: fixed; }
    th, td { padding: 6px !important; font-size: 10px !important; line-height: 1.25 !important; }
    .status { padding: 3px 6px !important; font-size: 9px !important; }
    .location-export-note { border: 1px solid rgba(121, 238, 231, 0.32); border-radius: 8px; background: rgba(48, 213, 200, 0.08); padding: 9px 10px; margin-bottom: 10px; font-size: 11px; color: #dffcff; break-inside: avoid; page-break-inside: avoid; }
    @media print {
      html, body { width: auto; height: auto; background: #ffffff !important; color: #111827 !important; }
      .print-page { width: 100%; }
      .content-stack,
      .panel,
      .table-wrap,
      .invoice-services-scroll,
      .invoice-services-table-wrap { background: #ffffff !important; color: #111827 !important; }
      .panel {
        border: 1px solid #d7e3ea !important;
        border-radius: 8px !important;
        padding: 14px !important;
        overflow: hidden !important;
      }
      .panel-heading {
        align-items: flex-start !important;
        gap: 18px !important;
        margin-bottom: 12px !important;
        padding-bottom: 10px !important;
        border-bottom: 1px solid #e2e8f0 !important;
      }
      .panel-heading .eyebrow {
        color: #64748b !important;
        font-size: 10px !important;
        font-weight: 800 !important;
        letter-spacing: 0.04em !important;
      }
      .panel-heading h2 {
        color: #0f172a !important;
        font-size: 20px !important;
        line-height: 1.18 !important;
        margin: 4px 0 5px !important;
      }
      .panel-heading p {
        max-width: 100% !important;
        color: #475569 !important;
        font-size: 11px !important;
        line-height: 1.35 !important;
      }
      .invoice-benchmark-table,
      .invoice-benchmark-group-table,
      .invoice-benchmark-detail-table,
      .invoice-potential-table {
        width: 100% !important;
        min-width: 0 !important;
        table-layout: fixed !important;
        border-collapse: collapse !important;
        background: #ffffff !important;
      }
      .invoice-benchmark-table th,
      .invoice-benchmark-table td,
      .invoice-benchmark-group-table th,
      .invoice-benchmark-group-table td,
      .invoice-benchmark-detail-table th,
      .invoice-benchmark-detail-table td,
      .invoice-potential-table th,
      .invoice-potential-table td {
        color: #111827 !important;
        border-bottom: 1px solid #e2e8f0 !important;
        padding: 9px 8px !important;
        font-size: 11px !important;
        line-height: 1.3 !important;
        vertical-align: top !important;
      }
      .invoice-benchmark-table th,
      .invoice-benchmark-group-table th,
      .invoice-benchmark-detail-table th,
      .invoice-potential-table th {
        background: #f1f5f9 !important;
        color: #334155 !important;
        font-size: 10px !important;
        font-weight: 800 !important;
        text-transform: uppercase !important;
      }
      .invoice-benchmark-table td strong,
      .invoice-benchmark-group-table td strong,
      .invoice-benchmark-detail-table td strong,
      .invoice-potential-table td strong {
        color: #0f172a !important;
        font-weight: 800 !important;
      }
      .invoice-benchmark-table td small,
      .invoice-benchmark-group-table td small,
      .invoice-benchmark-detail-table td small,
      .invoice-potential-table td small {
        display: block !important;
        margin-top: 3px !important;
        color: #64748b !important;
        font-size: 10px !important;
        line-height: 1.25 !important;
      }
      .invoice-benchmark-table th:nth-child(1),
      .invoice-benchmark-table td:nth-child(1) { width: 19% !important; }
      .invoice-benchmark-table th:nth-child(2),
      .invoice-benchmark-table td:nth-child(2) { width: 13% !important; }
      .invoice-benchmark-table th:nth-child(3),
      .invoice-benchmark-table td:nth-child(3),
      .invoice-benchmark-table th:nth-child(4),
      .invoice-benchmark-table td:nth-child(4),
      .invoice-benchmark-table th:nth-child(5),
      .invoice-benchmark-table td:nth-child(5) { width: 15% !important; }
      .invoice-benchmark-table th:nth-child(6),
      .invoice-benchmark-table td:nth-child(6) { width: 23% !important; }
      .invoice-practice-benchmark-report .priority-grid {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: 8px !important;
        margin: 0 0 10px !important;
      }
      .invoice-practice-benchmark-report .priority-card {
        min-height: 96px !important;
        padding: 10px !important;
        gap: 5px !important;
        border: 1px solid #cbdff8 !important;
        background: #f8fbff !important;
        color: #111827 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .invoice-practice-benchmark-report .priority-card.green {
        border-color: #9bdcc9 !important;
        background: #f1fcf8 !important;
      }
      .invoice-practice-benchmark-report .priority-card.amber {
        border-color: #f0cc83 !important;
        background: #fffaf0 !important;
      }
      .invoice-practice-benchmark-report .priority-card > span {
        color: #64748b !important;
        font-size: 10px !important;
        line-height: 1.2 !important;
        font-weight: 800 !important;
      }
      .invoice-practice-benchmark-report .priority-card strong {
        color: #0f172a !important;
        font-size: 24px !important;
        line-height: 1.05 !important;
      }
      .invoice-practice-benchmark-report .priority-card small {
        color: #64748b !important;
        font-size: 10px !important;
        line-height: 1.2 !important;
      }
      .invoice-practice-benchmark-report .priority-card .period-note {
        margin-top: 4px !important;
        color: #94a3b8 !important;
        font-weight: 700 !important;
      }
      .invoice-practice-benchmark-report .table-export-bar {
        min-height: 0 !important;
        margin: 8px 0 10px !important;
        padding: 8px 10px !important;
        border: 1px solid #d7e3ea !important;
        border-radius: 7px !important;
        background: #f8fafc !important;
        color: #334155 !important;
        font-size: 11px !important;
        font-weight: 800 !important;
      }
      .invoice-practice-benchmark-report .invoice-benchmark-detail-table th:nth-child(1),
      .invoice-practice-benchmark-report .invoice-benchmark-detail-table td:nth-child(1) { width: 9% !important; }
      .invoice-practice-benchmark-report .invoice-benchmark-detail-table th:nth-child(2),
      .invoice-practice-benchmark-report .invoice-benchmark-detail-table td:nth-child(2) { width: 30% !important; }
      .invoice-practice-benchmark-report .invoice-benchmark-detail-table th:nth-child(3),
      .invoice-practice-benchmark-report .invoice-benchmark-detail-table td:nth-child(3) { width: 12% !important; }
      .invoice-practice-benchmark-report .invoice-benchmark-detail-table th:nth-child(4),
      .invoice-practice-benchmark-report .invoice-benchmark-detail-table td:nth-child(4) { width: 14% !important; }
      .invoice-practice-benchmark-report .invoice-benchmark-detail-table th:nth-child(5),
      .invoice-practice-benchmark-report .invoice-benchmark-detail-table td:nth-child(5) { width: 10% !important; }
      .invoice-practice-benchmark-report .invoice-benchmark-detail-table th:nth-child(6),
      .invoice-practice-benchmark-report .invoice-benchmark-detail-table td:nth-child(6) { width: 13% !important; }
      .invoice-practice-benchmark-report .invoice-benchmark-detail-table th:nth-child(7),
      .invoice-practice-benchmark-report .invoice-benchmark-detail-table td:nth-child(7) { width: 12% !important; }
      .invoice-potential-report .priority-grid {
        display: grid !important;
        grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
        gap: 7px !important;
        margin: 0 0 10px !important;
      }
      .invoice-potential-report .priority-card {
        min-height: 82px !important;
        padding: 8px 9px !important;
        gap: 4px !important;
        border: 1px solid #cbdff8 !important;
        background: #f8fbff !important;
        color: #111827 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .invoice-potential-report .priority-card.green {
        border-color: #9bdcc9 !important;
        background: #f1fcf8 !important;
      }
      .invoice-potential-report .priority-card.amber {
        border-color: #f0cc83 !important;
        background: #fffaf0 !important;
      }
      .invoice-potential-report .priority-card > span {
        color: #64748b !important;
        font-size: 9px !important;
        line-height: 1.15 !important;
        font-weight: 800 !important;
      }
      .invoice-potential-report .priority-card strong {
        color: #0f172a !important;
        font-size: 19px !important;
        line-height: 1.05 !important;
        overflow-wrap: anywhere !important;
      }
      .invoice-potential-report .priority-card small {
        color: #64748b !important;
        font-size: 8.5px !important;
        line-height: 1.16 !important;
      }
      .invoice-potential-report .priority-card .period-note {
        margin-top: 2px !important;
        color: #94a3b8 !important;
        font-weight: 700 !important;
      }
      .invoice-potential-report .table-export-bar {
        min-height: 0 !important;
        margin: 8px 0 10px !important;
        padding: 8px 10px !important;
        border: 1px solid #d7e3ea !important;
        border-radius: 7px !important;
        background: #f8fafc !important;
        color: #334155 !important;
        font-size: 11px !important;
        font-weight: 800 !important;
      }
      .invoice-potential-report .invoice-potential-table th:nth-child(1),
      .invoice-potential-report .invoice-potential-table td:nth-child(1) { width: 8% !important; }
      .invoice-potential-report .invoice-potential-table th:nth-child(2),
      .invoice-potential-report .invoice-potential-table td:nth-child(2) { width: 34% !important; }
      .invoice-potential-report .invoice-potential-table th:nth-child(3),
      .invoice-potential-report .invoice-potential-table td:nth-child(3) { width: 13% !important; }
      .invoice-potential-report .invoice-potential-table th:nth-child(4),
      .invoice-potential-report .invoice-potential-table td:nth-child(4) { width: 18% !important; }
      .invoice-potential-report .invoice-potential-table th:nth-child(5),
      .invoice-potential-report .invoice-potential-table td:nth-child(5) { width: 12% !important; }
      .invoice-potential-report .invoice-potential-table th:nth-child(6),
      .invoice-potential-report .invoice-potential-table td:nth-child(6) { width: 15% !important; }
      .invoice-quality-report {
        gap: 9px !important;
      }
      .invoice-quality-report .invoice-quality-export-note,
      .invoice-quality-report .invoice-quality-card-list,
      .invoice-quality-report .invoice-quality-table-wrap {
        display: none !important;
      }
      .invoice-quality-report .invoice-quality-print-table-wrap,
      .invoice-quality-report .invoice-quality-summary-table-wrap {
        display: block !important;
        overflow: visible !important;
        max-height: none !important;
      }
      .invoice-quality-report .panel {
        padding: 10px !important;
        border-color: #d9e4ea !important;
        border-radius: 6px !important;
      }
      .invoice-quality-report .panel-heading {
        margin-bottom: 8px !important;
        padding-bottom: 7px !important;
      }
      .invoice-quality-report .panel-heading h2 {
        font-size: 17px !important;
        margin: 2px 0 !important;
      }
      .invoice-quality-report .panel-heading p {
        font-size: 10px !important;
        margin: 0 !important;
      }
      .invoice-quality-report .table-export-bar {
        min-height: 0 !important;
        margin: 0 0 8px !important;
        padding: 7px 8px !important;
        border: 1px solid #d9e4ea !important;
        border-radius: 6px !important;
        background: #f8fafc !important;
        color: #334155 !important;
        font-size: 10px !important;
        font-weight: 800 !important;
      }
      .invoice-quality-summary-table-wrap table,
      .invoice-quality-print-table {
        width: 100% !important;
        min-width: 0 !important;
        table-layout: fixed !important;
        border-collapse: collapse !important;
        background: #ffffff !important;
      }
      .invoice-quality-summary-table-wrap th,
      .invoice-quality-summary-table-wrap td,
      .invoice-quality-print-table th,
      .invoice-quality-print-table td {
        color: #111827 !important;
        border: 1px solid #e2e8f0 !important;
        padding: 6px 6px !important;
        font-size: 9.5px !important;
        line-height: 1.22 !important;
        vertical-align: top !important;
        overflow-wrap: anywhere !important;
        hyphens: auto !important;
      }
      .invoice-quality-summary-table-wrap th,
      .invoice-quality-print-table th {
        background: #f1f5f9 !important;
        color: #334155 !important;
        font-size: 8.5px !important;
        font-weight: 900 !important;
        text-transform: uppercase !important;
      }
      .invoice-quality-summary-table-wrap th {
        width: 18% !important;
      }
      .invoice-quality-summary-table-wrap td {
        width: 32% !important;
        font-weight: 800 !important;
      }
      .invoice-quality-print-table td strong {
        display: block !important;
        color: #0f172a !important;
        font-weight: 900 !important;
        margin-bottom: 2px !important;
      }
      .invoice-quality-print-table td small {
        display: block !important;
        color: #64748b !important;
        font-size: 8.5px !important;
        line-height: 1.2 !important;
        margin-top: 2px !important;
      }
      .invoice-quality-print-table th:nth-child(1),
      .invoice-quality-print-table td:nth-child(1) { width: 10% !important; }
      .invoice-quality-print-table th:nth-child(2),
      .invoice-quality-print-table td:nth-child(2) { width: 10% !important; }
      .invoice-quality-print-table th:nth-child(3),
      .invoice-quality-print-table td:nth-child(3) { width: 13% !important; }
      .invoice-quality-print-table th:nth-child(4),
      .invoice-quality-print-table td:nth-child(4) { width: 13% !important; }
      .invoice-quality-print-table th:nth-child(5),
      .invoice-quality-print-table td:nth-child(5),
      .invoice-quality-print-table th:nth-child(6),
      .invoice-quality-print-table td:nth-child(6) { width: 7% !important; }
      .invoice-quality-print-table th:nth-child(7),
      .invoice-quality-print-table td:nth-child(7) { width: 6% !important; }
      .invoice-quality-print-table th:nth-child(8),
      .invoice-quality-print-table td:nth-child(8) { width: 9% !important; }
      .invoice-quality-print-table th:nth-child(9),
      .invoice-quality-print-table td:nth-child(9) { width: 25% !important; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  ${printWindowToolbarHtml()}
  <main class="print-page">${element.outerHTML}</main>
  ${printWindowAutoCloseScript(locationExportScript, 250)}
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
    ${printWindowControlStyles()}
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
  ${printWindowToolbarHtml()}
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
  ${printWindowAutoCloseScript("", 150)}
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
const appCacheForceServerSyncKey = "orisus_bfs_monitor_force_server_sync_v1";
const appCacheDatasetSyncPrefix = "orisus_bfs_monitor_dataset_synced_v1:";
const appCacheKeys = {
  importRows: importStorageRowsKey,
  caseResolutions: "case-resolutions",
  invoiceStatusDocuments: "invoice-status-documents",
  invoiceRows: "invoice-rows",
  invoiceCatalogMappings: "invoice-catalog-mappings"
} as const;

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

async function loadStoredImportRowsForStartup(syncFromServer: boolean) {
  const forceServer = isHardServerSyncRequested();
  if (forceServer) {
    const serverRows = await loadStoredImportRowsFromServer();
    markDatasetSynced(appCacheKeys.importRows);
    if (serverRows.length) void storeImportRows(serverRows).catch(() => undefined);
    return serverRows;
  }

  const browserRowsPromise = loadStoredImportRowsFromBrowser().catch(() => []);
  if (!syncFromServer) {
    const browserRows = await browserRowsPromise;
    if (browserRows.length) markDatasetSynced(appCacheKeys.importRows);
    return browserRows;
  }

  const serverRowsPromise = loadStoredImportRowsFromServer()
    .then((serverRows) => {
      if (serverRows.length) void storeImportRows(serverRows).catch(() => undefined);
      return serverRows;
    })
    .catch(() => []);
  const rows = await firstNonEmptyImportRows([browserRowsPromise, serverRowsPromise]);
  if (rows.length) {
    markDatasetSynced(appCacheKeys.importRows);
  }
  return rows;
}

function firstNonEmptyImportRows(promises: Array<Promise<ImportPreviewRow[]>>) {
  return new Promise<ImportPreviewRow[]>((resolve) => {
    let pending = promises.length;
    let fallback: ImportPreviewRow[] = [];
    let resolved = false;
    promises.forEach((promise) => {
      promise
        .then((rows) => {
          fallback = rows.length ? rows : fallback;
          if (!resolved && rows.length) {
            resolved = true;
            resolve(rows);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          pending -= 1;
          if (!pending && !resolved) resolve(fallback);
        });
    });
  });
}

async function loadStoredImportRowsFromServer() {
  if (typeof window === "undefined") return [];
  const response = await fetch("/api/imports/parse", { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error("Server-Importdaten konnten nicht geladen werden.");
  const payload = await response.json() as { rows?: ImportPreviewRow[] };
  return reconcileImportRows(payload.rows ?? []);
}

async function loadManualCaseResolutions(options?: { forceServer?: boolean }) {
  if (typeof window === "undefined") return [];
  if (!options?.forceServer) {
    const cached = await loadCachedJson<ManualCaseResolution[]>(appCacheKeys.caseResolutions).catch(() => null);
    if (cached) return cached;
  }
  const response = await fetch("/api/cases/resolutions", { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error("Manuelle Erledigungen konnten nicht geladen werden.");
  const payload = await response.json() as { resolutions?: ManualCaseResolution[] };
  const resolutions = payload.resolutions ?? [];
  await storeCachedJson(appCacheKeys.caseResolutions, resolutions).catch(() => undefined);
  markDatasetSynced(appCacheKeys.caseResolutions);
  return resolutions;
}

async function loadConfirmedInvoiceStatusDocuments(options?: { forceServer?: boolean }) {
  if (typeof window === "undefined") return [];
  if (!options?.forceServer) {
    const cached = await loadCachedJson<ParsedInvoiceStatusDocument[]>(appCacheKeys.invoiceStatusDocuments).catch(() => null);
    if (cached) return cached;
  }
  const response = await fetch("/api/invoice-status/parse", { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error("Bestätigter Rechnungsstatus konnte nicht geladen werden.");
  const payload = await response.json() as { documents?: ParsedInvoiceStatusDocument[] };
  const documents = payload.documents ?? [];
  await storeCachedJson(appCacheKeys.invoiceStatusDocuments, documents).catch(() => undefined);
  markDatasetSynced(appCacheKeys.invoiceStatusDocuments);
  return documents;
}

async function loadConfirmedInvoiceRows(options?: { forceServer?: boolean }) {
  if (typeof window === "undefined") return [];
  if (!options?.forceServer) {
    const cached = await loadCachedJson<ParsedInvoiceDocument[]>(appCacheKeys.invoiceRows).catch(() => null);
    if (cached) return cached;
  }
  const response = await fetch("/api/invoices/parse", { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error("Bestätigte Rechnungen konnten nicht geladen werden.");
  const payload = await response.json() as { rows?: ParsedInvoiceDocument[] };
  const rows = payload.rows ?? [];
  await storeCachedJson(appCacheKeys.invoiceRows, rows).catch(() => undefined);
  markDatasetSynced(appCacheKeys.invoiceRows);
  return rows;
}

async function loadInvoiceCatalogMappings() {
  if (typeof window === "undefined") return [];
  const response = await fetch("/api/invoices/catalog-mappings", { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error("Katalog-Mappings konnten nicht geladen werden.");
  const payload = await response.json() as { mappings?: InvoiceCatalogMapping[] };
  const mappings = payload.mappings ?? [];
  await storeCachedJson(appCacheKeys.invoiceCatalogMappings, mappings).catch(() => undefined);
  return mappings;
}

async function saveInvoiceCatalogMapping(mapping: InvoiceCatalogMapping) {
  const response = await fetch("/api/invoices/catalog-mappings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(mapping)
  });
  const payload = await response.json().catch(() => null) as { mapping?: InvoiceCatalogMapping; mappings?: InvoiceCatalogMapping[]; error?: string } | null;
  if (!response.ok || !payload?.mapping) throw new Error(payload?.error ?? "Mapping konnte nicht gespeichert werden.");
  const mappings = payload.mappings ?? await loadInvoiceCatalogMappings();
  await storeCachedJson(appCacheKeys.invoiceCatalogMappings, mappings).catch(() => undefined);
  return mappings;
}

async function saveConfirmedInvoiceRows(rows: ParsedInvoiceDocument[]) {
  const chunks = chunkInvoiceRowsForSave(rows);
  if (chunks.length > 1) {
    const persistence: NonNullable<Awaited<ReturnType<typeof saveConfirmedInvoiceRowsChunk>>["persistence"]> = { imported: 0, duplicates: 0, failed: 0, errors: [] };
    for (const chunk of chunks) {
      const result = await saveConfirmedInvoiceRowsChunk(chunk, false);
      if (result.persistence) {
        persistence.imported += result.persistence.imported;
        persistence.duplicates += result.persistence.duplicates;
        persistence.failed += result.persistence.failed;
        persistence.errors = [...(persistence.errors ?? []), ...(result.persistence.errors ?? [])];
      }
    }
    const savedRows = await loadConfirmedInvoiceRows({ forceServer: true });
    await storeCachedJson(appCacheKeys.invoiceRows, savedRows).catch(() => undefined);
    markDatasetSynced(appCacheKeys.invoiceRows);
    return {
      rows: savedRows,
      persistence
    };
  }
  const result = await saveConfirmedInvoiceRowsChunk(rows, true);
  await storeCachedJson(appCacheKeys.invoiceRows, result.rows).catch(() => undefined);
  markDatasetSynced(appCacheKeys.invoiceRows);
  return result;
}

async function saveConfirmedInvoiceRowsChunk(rows: ParsedInvoiceDocument[], returnRows: boolean) {
  const response = await fetch("/api/invoices/parse", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rows, returnRows }),
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

function chunkInvoiceRowsForSave(rows: ParsedInvoiceDocument[]) {
  const chunks: ParsedInvoiceDocument[][] = [];
  let current: ParsedInvoiceDocument[] = [];
  let currentBytes = 0;
  rows.forEach((row) => {
    const rowBytes = estimateJsonBytes(row);
    const wouldExceedRows = current.length >= invoiceSaveChunkMaxRows;
    const wouldExceedBytes = current.length > 0 && currentBytes + rowBytes > invoiceSaveChunkMaxBytes;
    if (wouldExceedRows || wouldExceedBytes) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(row);
    currentBytes += rowBytes;
  });
  if (current.length) chunks.push(current);
  return chunks;
}

function estimateJsonBytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

async function clearConfirmedInvoiceRows(options?: { source?: ParsedInvoiceDocument["importSource"]; standortId?: string }) {
  const params = new URLSearchParams();
  if (options?.source) params.set("source", options.source);
  if (options?.standortId) params.set("standortId", options.standortId);
  const url = params.size ? `/api/invoices/parse?${params.toString()}` : "/api/invoices/parse";
  const response = await fetch(url, { method: "DELETE", cache: "no-store" });
  const payload = await response.json().catch(() => null) as { rows?: ParsedInvoiceDocument[]; error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Rechnungsupload konnte nicht zurückgesetzt werden.");
  if (payload?.rows) {
    await storeCachedJson(appCacheKeys.invoiceRows, payload.rows).catch(() => undefined);
  } else {
    await clearCachedJson(appCacheKeys.invoiceRows).catch(() => undefined);
  }
  markDatasetSynced(appCacheKeys.invoiceRows);
  return {
    rows: payload?.rows
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
  const savedDocuments = payload?.documents ?? documents;
  await storeCachedJson(appCacheKeys.invoiceStatusDocuments, savedDocuments).catch(() => undefined);
  markDatasetSynced(appCacheKeys.invoiceStatusDocuments);
  return savedDocuments;
}

async function clearConfirmedInvoiceStatusDocuments() {
  const response = await fetch("/api/invoice-status/parse", { method: "DELETE", cache: "no-store" });
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Bestätigter Rechnungsstatus konnte nicht zurückgesetzt werden.");
  await clearCachedJson(appCacheKeys.invoiceStatusDocuments).catch(() => undefined);
  markDatasetSynced(appCacheKeys.invoiceStatusDocuments);
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
        : status === "resubmitted_manual"
          ? "Manuell geprüft: neu eingereicht."
        : status === "cancelled_manual"
          ? "Manuell geprüft: endgültig storniert."
          : "Manuell geprüft: weiterhin offen."
    })
  });
  const payload = await response.json().catch(() => null) as { resolution?: ManualCaseResolution; error?: string } | null;
  if (!response.ok || !payload?.resolution) throw new Error(payload?.error ?? "Klärfall konnte nicht erledigt werden.");
  const cached = await loadCachedJson<ManualCaseResolution[]>(appCacheKeys.caseResolutions).catch(() => null);
  if (cached) {
    const next = [payload.resolution, ...cached.filter((entry) => entry.caseKey !== payload.resolution?.caseKey)];
    await storeCachedJson(appCacheKeys.caseResolutions, next).catch(() => undefined);
  }
  markDatasetSynced(appCacheKeys.caseResolutions);
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
    markDatasetSynced(appCacheKeys.importRows);
    return;
  } catch (dbError) {
    try {
      window.localStorage.setItem(importStorageLegacyKey, JSON.stringify(rows));
      markDatasetSynced(appCacheKeys.importRows);
    } catch {
      throw new Error(dbError instanceof Error ? dbError.message : "Browser-Speicher voll");
    }
  }
}

async function loadCachedJson<T>(key: string): Promise<T | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return null;
  const db = await openImportDb();
  return new Promise<T | null>((resolve, reject) => {
    const transaction = db.transaction(importStorageStoreName, "readonly");
    const request = transaction.objectStore(importStorageStoreName).get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function storeCachedJson(key: string, value: unknown) {
  if (typeof window === "undefined" || !("indexedDB" in window)) return;
  const db = await openImportDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(importStorageStoreName, "readwrite");
    transaction.objectStore(importStorageStoreName).put(value, key);
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

async function clearCachedJson(key: string) {
  if (typeof window === "undefined" || !("indexedDB" in window)) return;
  const db = await openImportDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(importStorageStoreName, "readwrite");
    transaction.objectStore(importStorageStoreName).delete(key);
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

function shouldLoadDatasetFromServer(key: string) {
  if (typeof window === "undefined") return true;
  return window.sessionStorage.getItem(appCacheForceServerSyncKey) === "1"
    || window.sessionStorage.getItem(datasetSyncStorageKey(key)) !== "1";
}

function isHardServerSyncRequested() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(appCacheForceServerSyncKey) === "1";
}

function markDatasetSynced(key: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(datasetSyncStorageKey(key), "1");
  window.sessionStorage.removeItem(appCacheForceServerSyncKey);
}

function requestHardServerSync() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(appCacheForceServerSyncKey, "1");
  Object.values(appCacheKeys).forEach((key) => window.sessionStorage.removeItem(datasetSyncStorageKey(key)));
}

function datasetSyncStorageKey(key: string) {
  return `${appCacheDatasetSyncPrefix}${key}`;
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
  importRows = [],
  invoiceRows = [],
  invoiceStatusRows = [],
  manualCaseResolutions = [],
  allowedStandortIds,
  compact = false,
  title,
  description,
  onResolvePaid,
  onResolveResubmitted,
  onKeepOpen,
  onCancelFinal,
  enableFilters = false,
  tableScrollable = false
}: {
  cases: BfsCase[];
  importRows?: ImportPreviewRow[];
  invoiceRows?: ParsedInvoiceDocument[];
  invoiceStatusRows?: ParsedInvoiceStatusRow[];
  manualCaseResolutions?: ManualCaseResolution[];
  allowedStandortIds?: string[];
  compact?: boolean;
  title?: string;
  description?: string;
  onResolvePaid?: (fall: BfsCase) => void | Promise<void>;
  onResolveResubmitted?: (fall: BfsCase) => void | Promise<void>;
  onKeepOpen?: (fall: BfsCase) => void | Promise<void>;
  onCancelFinal?: (fall: BfsCase) => void | Promise<void>;
  enableFilters?: boolean;
  tableScrollable?: boolean;
}) {
  const periodOptions = useMemo(() => buildCashflowPeriods(), []);
  const [caseStandortFilter, setCaseStandortFilter] = useState("alle");
  const [casePeriodId, setCasePeriodId] = useState("since-start");
  const [caseOpenUntilDate, setCaseOpenUntilDate] = useState("");
  const [caseSearchTerm, setCaseSearchTerm] = useState("");
  const [caseSort, setCaseSort] = useState<{ key: CaseSortKey; direction: SortDirection }>({ key: "priority", direction: "asc" });
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const isSyncingScroll = useRef(false);
  const [tableScrollWidth, setTableScrollWidth] = useState(1540);
  const casePeriod = useMemo(() => periodOptions.find((period) => period.id === casePeriodId) ?? periodOptions[0], [periodOptions, casePeriodId]);
  const caseStandorte = useMemo(() => orderedStandorte().filter((entry) =>
    rows.some((fall) => fall.standortId === entry.id)
    || importRows.some((row) => row.location === entry.name && (row.parsedClaims ?? []).some((claim) => claim.protectionStatus === "ohne_ausfallschutz"))
    || invoiceRows.some((invoice) => (invoice.standortId === entry.id || invoice.standortName === entry.name) && invoiceHasAusfallhonorarLine(invoice))
  ), [importRows, invoiceRows, rows]);
  const caseOpenUntilLabel = useMemo(() => germanDateFromIsoDate(caseOpenUntilDate), [caseOpenUntilDate]);
  const filteredRows = useMemo(() => {
    const query = normalizeSearchQuery(caseSearchTerm);
    const baseRows = compact && !enableFilters ? rows : rows.filter((fall) => {
      const rowStandort = standorte.find((entry) => entry.id === fall.standortId);
      const matchesStandort = caseStandortFilter === "alle" || fall.standortId === caseStandortFilter;
      const matchesPeriod = rowStandort ? caseInSelectedPeriod(fall, casePeriod, rowStandort) : false;
      const matchesOpenUntil = caseBeforeOrOnIsoDate(fall, caseOpenUntilDate);
      return matchesStandort && matchesPeriod && matchesOpenUntil;
    });
    if (!query) return baseRows;
    return baseRows.filter((fall) => matchesCaseSearch(fall, query));
  }, [compact, enableFilters, rows, caseStandortFilter, casePeriod, caseOpenUntilDate, caseSearchTerm]);
  const sortedRows = useMemo(() => sortCaseRows(filteredRows, caseSort.key, caseSort.direction), [filteredRows, caseSort]);
  const caseKpis = useMemo(() => buildCaseListKpis(filteredRows), [filteredRows]);
  const ausfallhonorarSummary = useMemo(() => buildAusfallhonorarPaymentSummary(invoiceRows, invoiceStatusRows, {
    allowedStandortIds,
    period: casePeriod,
    searchTerm: caseSearchTerm,
    standortId: caseStandortFilter
  }), [allowedStandortIds, casePeriod, caseSearchTerm, caseStandortFilter, invoiceRows, invoiceStatusRows]);
  const showAusfallhonorarSummary = ausfallhonorarSummary.invoiceCount > 0;
  const noProtectionSummary = useMemo(() => buildNoProtectionPatientSummary(importRows, invoiceStatusRows, manualCaseResolutions, {
    allowedStandortIds,
    period: casePeriod,
    searchTerm: caseSearchTerm,
    standortId: caseStandortFilter
  }), [allowedStandortIds, casePeriod, caseSearchTerm, caseStandortFilter, importRows, invoiceStatusRows, manualCaseResolutions]);
  const reportTitle = title ?? (compact ? "Prüfliste am Standort" : "Prüfliste");
  const hasCaseActions = Boolean(onResolvePaid || onResolveResubmitted || onKeepOpen || onCancelFinal);
  useEffect(() => {
    const tableScroll = tableScrollRef.current;
    if (!tableScroll) return;
    const updateWidth = () => setTableScrollWidth(tableScroll.scrollWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(tableScroll);
    return () => observer.disconnect();
  }, [sortedRows.length, hasCaseActions]);

  const syncCaseTableScroll = (source: "top" | "table") => {
    if (isSyncingScroll.current) return;
    const sourceElement = source === "top" ? topScrollRef.current : tableScrollRef.current;
    const targetElement = source === "top" ? tableScrollRef.current : topScrollRef.current;
    if (!sourceElement || !targetElement) return;
    isSyncingScroll.current = true;
    targetElement.scrollLeft = sourceElement.scrollLeft;
    window.requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const toggleSort = (key: CaseSortKey) => {
    setCaseSort((current) => ({
      key,
      direction: current.key === key ? current.direction === "asc" ? "desc" : "asc" : defaultCaseSortDirection(key)
    }));
  };
  const sortLabel = caseSortOptions.find((option) => option.value === `${caseSort.key}:${caseSort.direction}`)?.label ?? "Standard";
  const renderCaseActions = (fall: BfsCase) => hasCaseActions ? (
    <div className="case-action-stack">
      {onResolvePaid && (
        <button className="secondary-button resolve-case-button" onClick={() => void onResolvePaid(fall)}>
          <CheckCircle2 size={15} /> Bezahlt / geklärt
        </button>
      )}
      {onResolveResubmitted && (
        <button className="secondary-button resolve-case-button" onClick={() => void onResolveResubmitted(fall)}>
          <RefreshCw size={15} /> Neu eingereicht
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
  ) : null;

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
          <label className="select-label">
            Offen bis
            <input type="date" value={caseOpenUntilDate} onChange={(event) => setCaseOpenUntilDate(event.target.value)} />
          </label>
          <div className="filter-status-note">
            {caseOpenUntilLabel ? `Stichtag: ${caseOpenUntilLabel}` : "Kein Stichtag gesetzt"}
          </div>
        </div>
      )}
      <div className="case-kpi-grid" aria-label="Prüflisten Kennzahlen">
        <article className="case-kpi-card">
          <span>Anzahl Prüffälle</span>
          <strong>{integerNumber.format(caseKpis.count)}</strong>
          <small>im aktuellen Filter</small>
        </article>
        <article className="case-kpi-card">
          <span>Wert Prüffälle</span>
          <strong>{money.format(caseKpis.amount)}</strong>
          <small>offene Prüfsumme</small>
        </article>
        <article className="case-kpi-card">
          <span>Meiste Prüffälle</span>
          <strong>{caseKpis.topLocationName}</strong>
          <small>{caseKpis.topLocationCount ? `${integerNumber.format(caseKpis.topLocationCount)} Fälle · ${money.format(caseKpis.topLocationAmount)}` : "keine Fälle im Filter"}</small>
        </article>
        {showAusfallhonorarSummary && (
          <>
            <article className="case-kpi-card">
              <span>Ausfallhonorar eingereicht</span>
              <strong>{money.format(ausfallhonorarSummary.submittedAmount)}</strong>
              <small>{integerNumber.format(ausfallhonorarSummary.invoiceCount)} Rechnungen im Filter</small>
            </article>
            <article className="case-kpi-card">
              <span>Ausfallhonorar bezahlt</span>
              <strong>{money.format(ausfallhonorarSummary.paidAmount)}</strong>
              <small>{integerNumber.format(ausfallhonorarSummary.paidInvoiceCount)} bezahlt/gesichert</small>
            </article>
            <article className="case-kpi-card">
              <span>Ausfallhonorar-Quote</span>
              <strong>{formatPercent(ausfallhonorarSummary.paymentRate)}</strong>
              <small>bezahlt von eingereicht</small>
            </article>
          </>
        )}
        <article className="case-kpi-card">
          <span>Ohne Schutz Patienten</span>
          <strong>{integerNumber.format(noProtectionSummary.patientCount)}</strong>
          <small>{integerNumber.format(noProtectionSummary.claimCount)} Forderungen · {money.format(noProtectionSummary.amount)}</small>
        </article>
        <article className="case-kpi-card">
          <span>Zahlen regelmäßig</span>
          <strong>{integerNumber.format(noProtectionSummary.regularPaidPatients)}</strong>
          <small>{formatPercent(noProtectionSummary.regularPaidRate)} der Ohne-Schutz-Patienten</small>
        </article>
        <article className="case-kpi-card">
          <span>Endgültig storniert</span>
          <strong>{integerNumber.format(noProtectionSummary.finalCancelledPatients)}</strong>
          <small>{money.format(noProtectionSummary.finalCancelledAmount)} ohne Schutz</small>
        </article>
      </div>
      <div className="table-section-heading">
        <div>
          <span className="eyebrow">Arbeitsliste</span>
          <h2>Offene Nachfassfälle</h2>
          <small>{sortedRows.length} Fälle · sortiert nach {sortLabel}</small>
        </div>
        <button className="secondary-button" disabled={!sortedRows.length && !showAusfallhonorarSummary && !noProtectionSummary.patientCount} onClick={() => printCasesReport(sortedRows, reportTitle, showAusfallhonorarSummary ? ausfallhonorarSummary : undefined, noProtectionSummary)}>
          <Printer size={16} /> PDF Export
        </button>
      </div>
      <div className="case-sort-toolbar" aria-label="Sortierung der Prüfliste">
        <label className="select-label">
          Sortieren
          <select
            value={`${caseSort.key}:${caseSort.direction}`}
            onChange={(event) => {
              const [key, direction] = event.target.value.split(":") as [CaseSortKey, SortDirection];
              setCaseSort({ key, direction });
            }}
          >
            {caseSortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="case-table-top-scroll" ref={topScrollRef} onScroll={() => syncCaseTableScroll("top")} aria-label="Tabelle horizontal verschieben">
        <div style={{ width: tableScrollWidth }} />
      </div>
      <div className={`table-wrap${compact && !tableScrollable ? "" : " case-table-scroll"}`} ref={tableScrollRef} onScroll={() => syncCaseTableScroll("table")}>
        <table className="case-followup-table">
          <thead>
            <tr>
              <th><CaseSortButton label="Ampel" sortKey="priority" activeSort={caseSort} onSort={toggleSort} /></th>
              <th><CaseSortButton label="Datum" sortKey="date" activeSort={caseSort} onSort={toggleSort} /></th>
              <th><CaseSortButton label="Patient" sortKey="patient" activeSort={caseSort} onSort={toggleSort} /></th>
              <th><CaseSortButton label="Re.-Nr." sortKey="invoice" activeSort={caseSort} onSort={toggleSort} /></th>
              <th><CaseSortButton label="BFS-Nr." sortKey="bfs" activeSort={caseSort} onSort={toggleSort} /></th>
              <th><CaseSortButton label="Betrag" sortKey="amount" activeSort={caseSort} onSort={toggleSort} /></th>
              <th>Grund</th>
              <th><CaseSortButton label="Alter" sortKey="age" activeSort={caseSort} onSort={toggleSort} /></th>
              <th>Status</th>
              <th><CaseSortButton label="Wiedervorlage" sortKey="dueDate" activeSort={caseSort} onSort={toggleSort} /></th>
              <th>AbrechnungsNr</th>
              {hasCaseActions && <th>Aktion</th>}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((fall) => (
              <tr key={fall.id}>
                <td><span className={`traffic traffic-${fall.traffic}`} /></td>
                <td>{fall.sourceDate ?? "-"}</td>
                <td><strong>{fall.patientName}</strong><span>{fall.locationName}</span></td>
                <td>{fall.invoiceNo}</td>
                <td>{fall.bfsNo}</td>
                <td>{exactMoney.format(fall.amount)}</td>
                <td>{fall.reason}</td>
                <td>{fall.ageDays} Tage</td>
                <td><StatusBadge status={fall.status} /></td>
                <td>{fall.dueDate}</td>
                <td>{formatCaseAbrechnungReference(fall.lastComment)}</td>
                {hasCaseActions && (
                  <td>
                    {renderCaseActions(fall)}
                  </td>
                )}
              </tr>
            ))}
            {!sortedRows.length && (
              <tr>
                <td colSpan={hasCaseActions ? 12 : 11}>Keine Prüflistenfälle für den aktuellen Datenstand.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="case-mobile-list" aria-label="Mobile Prüfliste">
        {sortedRows.map((fall) => (
          <article className="case-mobile-card" key={fall.id}>
            <div className="case-mobile-card-head">
              <span className={`traffic traffic-${fall.traffic}`} />
              <div>
                <strong>{fall.patientName}</strong>
                <span>{fall.locationName}</span>
              </div>
              <b>{fall.sourceDate ?? "-"}</b>
            </div>
            <dl className="case-mobile-meta">
              <div><dt>Betrag</dt><dd>{exactMoney.format(fall.amount)}</dd></div>
              <div><dt>Alter</dt><dd>{fall.ageDays} Tage</dd></div>
              <div><dt>Re.-Nr.</dt><dd>{fall.invoiceNo}</dd></div>
              <div><dt>BFS-Nr.</dt><dd>{fall.bfsNo}</dd></div>
              <div><dt>Grund</dt><dd>{fall.reason}</dd></div>
              <div><dt>Status</dt><dd><StatusBadge status={fall.status} /></dd></div>
            </dl>
            {hasCaseActions && <div className="case-mobile-actions">{renderCaseActions(fall)}</div>}
          </article>
        ))}
        {!sortedRows.length && <p className="muted-table-note">Keine Prüflistenfälle für den aktuellen Datenstand.</p>}
      </div>
    </section>
  );
}

function buildCaseListKpis(rows: BfsCase[]) {
  const byLocation = new Map<string, { name: string; count: number; amount: number }>();
  rows.forEach((fall) => {
    const current = byLocation.get(fall.standortId) ?? { name: fall.locationName, count: 0, amount: 0 };
    current.count += 1;
    current.amount += fall.amount;
    byLocation.set(fall.standortId, current);
  });
  const topLocation = [...byLocation.values()].sort((a, b) => b.count - a.count || b.amount - a.amount || a.name.localeCompare(b.name, "de"))[0];
  return {
    count: rows.length,
    amount: rows.reduce((sum, fall) => sum + fall.amount, 0),
    topLocationName: topLocation?.name ?? "-",
    topLocationCount: topLocation?.count ?? 0,
    topLocationAmount: topLocation?.amount ?? 0
  };
}

type AusfallhonorarPaymentSummary = {
  invoiceCount: number;
  paidInvoiceCount: number;
  submittedAmount: number;
  paidAmount: number;
  openAmount: number;
  paymentRate: number;
};

function buildAusfallhonorarPaymentSummary(
  invoiceRows: ParsedInvoiceDocument[],
  invoiceStatusRows: ParsedInvoiceStatusRow[],
  options: {
    allowedStandortIds?: string[];
    period: PeriodOption;
    searchTerm?: string;
    standortId?: string;
  }
): AusfallhonorarPaymentSummary {
  const allowedStandortIds = options.allowedStandortIds?.length ? new Set(options.allowedStandortIds) : null;
  const query = normalizeSearchQuery(options.searchTerm ?? "");
  const statusRowsByKey = new Map<string, ParsedInvoiceStatusRow>();
  invoiceStatusRows.forEach((row) => invoiceStatusMatchKeys(row).forEach((key) => statusRowsByKey.set(key, row)));

  const summary = invoiceRows
    .filter(invoiceReadyForAnalysis)
    .filter(invoiceHasAusfallhonorarLine)
    .filter((invoice) => invoiceInPeriod(invoice, options.period))
    .filter((invoice) => !allowedStandortIds || allowedStandortIds.has(invoice.standortId ?? ""))
    .filter((invoice) => !options.standortId || options.standortId === "alle" || invoice.standortId === options.standortId || invoice.standortName === standorte.find((standort) => standort.id === options.standortId)?.name)
    .filter((invoice) => !query || matchesAusfallhonorarInvoiceSearch(invoice, query))
    .reduce((current, invoice) => {
      const submittedAmount = ausfallhonorarSubmittedAmount(invoice);
      const statusRow = invoiceDocumentMatchKeys(invoice).map((key) => statusRowsByKey.get(key)).find(Boolean);
      const paidAmount = paidAmountForAusfallhonorarInvoice(submittedAmount, statusRow);
      current.invoiceCount += 1;
      current.paidInvoiceCount += paidAmount > 0.005 ? 1 : 0;
      current.submittedAmount += submittedAmount;
      current.paidAmount += paidAmount;
      return current;
    }, {
      invoiceCount: 0,
      paidInvoiceCount: 0,
      submittedAmount: 0,
      paidAmount: 0,
      openAmount: 0,
      paymentRate: 0
    });

  summary.openAmount = Math.max(summary.submittedAmount - summary.paidAmount, 0);
  summary.paymentRate = summary.submittedAmount ? (summary.paidAmount / summary.submittedAmount) * 100 : 0;
  return summary;
}

function ausfallhonorarSubmittedAmount(invoice: ParsedInvoiceDocument) {
  const lineAmount = invoice.serviceLines
    .filter(isAusfallhonorarLine)
    .reduce((sum, line) => sum + Math.abs(line.amount), 0);
  return lineAmount > 0.005 ? lineAmount : Math.abs(invoice.totalAmount);
}

function paidAmountForAusfallhonorarInvoice(submittedAmount: number, statusRow?: ParsedInvoiceStatusRow) {
  if (!statusRow) return 0;
  if (statusRow.paymentStatus === "bezahlt" || statusRow.paymentStatus === "ratenzahlung" || statusRow.installmentPlan) return submittedAmount;
  if (statusRow.paymentStatus !== "teilbezahlt") return 0;
  const paidEstimate = Math.max(0, Math.abs(statusRow.amount) - Math.abs(statusRow.saldo));
  return Math.min(submittedAmount, paidEstimate);
}

function invoiceDocumentMatchKeys(invoice: ParsedInvoiceDocument) {
  return normalizeMatchKeys([
    invoice.bfsNo,
    `${invoice.patientName}|${invoice.invoiceNo}`,
    `${invoice.patientName}|${invoice.bfsNo}`
  ]);
}

function matchesAusfallhonorarInvoiceSearch(invoice: ParsedInvoiceDocument, query: string) {
  return [
    invoice.patientName,
    invoice.invoiceNo,
    invoice.bfsNo,
    invoice.standortName,
    ...invoice.serviceLines.filter(isAusfallhonorarLine).flatMap((line) => [line.code, line.description])
  ].some((value) => normalizeSearchQuery(value).includes(query));
}

function isAusfallhonorarLine(line: ParsedInvoiceLine) {
  return isAusfallhonorarDescription(`${line.code} ${line.description}`);
}

type NoProtectionPatientSummary = {
  patientCount: number;
  claimCount: number;
  amount: number;
  regularPaidPatients: number;
  regularPaidAmount: number;
  finalCancelledPatients: number;
  finalCancelledAmount: number;
  openRiskPatients: number;
  openRiskAmount: number;
  regularPaidRate: number;
  finalCancelledRate: number;
};

function buildNoProtectionPatientSummary(
  importRows: ImportPreviewRow[],
  invoiceStatusRows: ParsedInvoiceStatusRow[],
  manualCaseResolutions: ManualCaseResolution[],
  options: {
    allowedStandortIds?: string[];
    period: PeriodOption;
    searchTerm?: string;
    standortId?: string;
  }
): NoProtectionPatientSummary {
  const allowedStandortIds = options.allowedStandortIds?.length ? new Set(options.allowedStandortIds) : null;
  const selectedStandort = options.standortId && options.standortId !== "alle" ? standorte.find((standort) => standort.id === options.standortId) : undefined;
  const query = normalizeSearchQuery(options.searchTerm ?? "");
  const scopedRows = importRows.filter((row) => {
    const rowStandort = standorte.find((standort) => standort.name === row.location);
    if (!rowStandort) return false;
    if (allowedStandortIds && !allowedStandortIds.has(rowStandort.id)) return false;
    if (selectedStandort && rowStandort.id !== selectedStandort.id) return false;
    return importRowInPeriod(row, options.period, rowStandort);
  });
  const statusRowsByKey = new Map<string, ParsedInvoiceStatusRow>();
  invoiceStatusRows.forEach((row) => invoiceStatusMatchKeys(row).forEach((key) => statusRowsByKey.set(key, row)));
  const cancelledKeys = buildCancelledResolutionKeySet(manualCaseResolutions);
  const finalCancelledCases = casesFromImportRows(scopedRows)
    .filter(isNoProtectionReturnCase)
    .filter((fall) => caseOperationalResolutionKeys(fall).some((key) => cancelledKeys.has(key)));
  const finalCancelledCaseKeys = new Set(finalCancelledCases.flatMap((fall) => riskActivityKeys(fall.standortId, fall.patientName, fall.invoiceNo, fall.bfsNo)));

  const claims = riskClaimsFromImportRows(scopedRows)
    .filter((claim) => !query || matchesNoProtectionClaimSearch(claim, query));
  const patients = new Map<string, {
    claims: RiskClaim[];
    regularPaid: boolean;
    finalCancelled: boolean;
    openRisk: boolean;
    regularPaidAmount: number;
    finalCancelledAmount: number;
    openRiskAmount: number;
  }>();

  claims.forEach((claim) => {
    const key = noProtectionPatientKey(claim);
    const current = patients.get(key) ?? {
      claims: [],
      regularPaid: false,
      finalCancelled: false,
      openRisk: false,
      regularPaidAmount: 0,
      finalCancelledAmount: 0,
      openRiskAmount: 0
    };
    const statusRow = riskClaimMatchKeys(claim).map((matchKey) => statusRowsByKey.get(matchKey)).find(Boolean);
    const paidAmount = paidAmountForNoProtectionClaim(claim, statusRow);
    const finalCancelled = riskActivityKeys(claim.standortId, claim.patientName, claim.invoiceNo, claim.bfsNo).some((matchKey) => finalCancelledCaseKeys.has(matchKey)) || statusRow?.paymentStatus === "storniert";
    const openRisk = !paidAmount && !finalCancelled && claim.assessment === "auffaellig";
    current.claims.push(claim);
    current.regularPaid ||= paidAmount > 0.005 || claim.assessment === "erledigt";
    current.finalCancelled ||= finalCancelled;
    current.openRisk ||= openRisk;
    current.regularPaidAmount += paidAmount;
    if (finalCancelled) current.finalCancelledAmount += claim.amount;
    if (openRisk) current.openRiskAmount += claim.eventAmount ?? claim.amount;
    patients.set(key, current);
  });

  const patientRows = [...patients.values()];
  const patientCount = patientRows.length;
  const regularPaidPatients = patientRows.filter((row) => row.regularPaid && !row.finalCancelled).length;
  const finalCancelledPatients = patientRows.filter((row) => row.finalCancelled).length;
  const openRiskPatients = patientRows.filter((row) => row.openRisk && !row.finalCancelled && !row.regularPaid).length;
  const amount = claims.reduce((sum, claim) => sum + claim.amount, 0);
  const regularPaidAmount = patientRows.reduce((sum, row) => sum + row.regularPaidAmount, 0);
  const finalCancelledAmount = patientRows.reduce((sum, row) => sum + row.finalCancelledAmount, 0);
  const openRiskAmount = patientRows.reduce((sum, row) => sum + row.openRiskAmount, 0);

  return {
    patientCount,
    claimCount: claims.length,
    amount,
    regularPaidPatients,
    regularPaidAmount,
    finalCancelledPatients,
    finalCancelledAmount,
    openRiskPatients,
    openRiskAmount,
    regularPaidRate: patientCount ? (regularPaidPatients / patientCount) * 100 : 0,
    finalCancelledRate: patientCount ? (finalCancelledPatients / patientCount) * 100 : 0
  };
}

function paidAmountForNoProtectionClaim(claim: RiskClaim, statusRow?: ParsedInvoiceStatusRow) {
  if (!statusRow) return claim.assessment === "erledigt" ? claim.amount : 0;
  if (statusRow.paymentStatus === "bezahlt" || statusRow.paymentStatus === "ratenzahlung" || statusRow.installmentPlan) return claim.amount;
  if (statusRow.paymentStatus !== "teilbezahlt") return 0;
  const paidEstimate = Math.max(0, Math.abs(statusRow.amount) - Math.abs(statusRow.saldo));
  return Math.min(claim.amount, paidEstimate);
}

function riskClaimMatchKeys(claim: RiskClaim) {
  return normalizeMatchKeys([
    claim.bfsNo,
    `${claim.patientName}|${claim.invoiceNo}`,
    `${claim.patientName}|${claim.bfsNo}`
  ]);
}

function noProtectionPatientKey(claim: RiskClaim) {
  return `${claim.standortId}:${normalizePatientName(claim.patientName)}`;
}

function matchesNoProtectionClaimSearch(claim: RiskClaim, query: string) {
  return searchHaystack(claim.patientName, claim.invoiceNo, claim.bfsNo, claim.amount, claim.markerReason, claim.assessmentLabel).includes(query);
}

type CaseSortKey = "priority" | "date" | "patient" | "location" | "invoice" | "bfs" | "amount" | "age" | "dueDate";
type SortDirection = "asc" | "desc";

const caseSortOptions: { value: `${CaseSortKey}:${SortDirection}`; label: string }[] = [
  { value: "priority:asc", label: "Ampel kritisch zuerst" },
  { value: "patient:asc", label: "Name A-Z" },
  { value: "patient:desc", label: "Name Z-A" },
  { value: "location:asc", label: "Standort A-Z" },
  { value: "location:desc", label: "Standort Z-A" },
  { value: "date:desc", label: "Datum neueste zuerst" },
  { value: "date:asc", label: "Datum älteste zuerst" },
  { value: "amount:desc", label: "Betrag höchster zuerst" },
  { value: "amount:asc", label: "Betrag niedrigster zuerst" },
  { value: "age:desc", label: "Alter höchste zuerst" },
  { value: "age:asc", label: "Alter niedrigste zuerst" },
  { value: "dueDate:asc", label: "Wiedervorlage älteste zuerst" },
  { value: "dueDate:desc", label: "Wiedervorlage neueste zuerst" }
];

function CaseSortButton({ label, sortKey, activeSort, onSort }: { label: string; sortKey: CaseSortKey; activeSort: { key: CaseSortKey; direction: SortDirection }; onSort: (key: CaseSortKey) => void }) {
  const active = activeSort.key === sortKey;
  return (
    <button type="button" className={active ? "case-sort-header active" : "case-sort-header"} onClick={() => onSort(sortKey)} aria-label={`${label} sortieren`}>
      <span>{label}</span>
      <span aria-hidden="true">{active ? activeSort.direction === "asc" ? "↑" : "↓" : "↕"}</span>
    </button>
  );
}

function sortCaseRows(rows: BfsCase[], key: CaseSortKey, direction: SortDirection) {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const result = compareCaseByKey(a, b, key);
    return result ? result * multiplier : compareOperationalCases(a, b);
  });
}

function defaultCaseSortDirection(key: CaseSortKey): SortDirection {
  if (key === "patient" || key === "location" || key === "invoice" || key === "bfs") return "asc";
  if (key === "priority") return "asc";
  return "desc";
}

function compareCaseByKey(a: BfsCase, b: BfsCase, key: CaseSortKey) {
  if (key === "priority") return operationalCasePriority(a) - operationalCasePriority(b) || trafficSortValue(a.traffic) - trafficSortValue(b.traffic);
  if (key === "date") return caseDateSortValue(a.sourceDate) - caseDateSortValue(b.sourceDate);
  if (key === "patient") return a.patientName.localeCompare(b.patientName, "de");
  if (key === "location") return a.locationName.localeCompare(b.locationName, "de");
  if (key === "invoice") return a.invoiceNo.localeCompare(b.invoiceNo, "de", { numeric: true });
  if (key === "bfs") return a.bfsNo.localeCompare(b.bfsNo, "de", { numeric: true });
  if (key === "amount") return a.amount - b.amount;
  if (key === "age") return a.ageDays - b.ageDays;
  if (key === "dueDate") return a.dueDate.localeCompare(b.dueDate, "de", { numeric: true });
  return 0;
}

function trafficSortValue(value: BfsCase["traffic"]) {
  if (value === "red") return 1;
  if (value === "orange") return 2;
  if (value === "yellow") return 3;
  return 4;
}

function caseDateSortValue(value: string | undefined) {
  const match = value?.match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})$/);
  if (!match) return 0;
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  return Number(`${year}${match[2]}${match[1]}`);
}

function printCasesReport(rows: BfsCase[], title: string, ausfallhonorarSummary?: AusfallhonorarPaymentSummary, noProtectionSummary?: NoProtectionPatientSummary) {
  const totalAmount = rows.reduce((sum, fall) => sum + fall.amount, 0);
  const oldestAge = rows.reduce((max, fall) => Math.max(max, fall.ageDays), 0);
  const locations = [...new Set(rows.map((fall) => fall.locationName).filter(Boolean))].sort(compareLocationNamesByContractStart);
  const visibleRows = [...rows];
  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - Orisus BFS Monitor</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #102a3a; font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
    ${printWindowControlStyles()}
    header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; border-bottom: 2px solid #30d5c8; padding-bottom: 10px; margin-bottom: 12px; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    h2 { margin: 16px 0 8px; font-size: 15px; }
    p { margin: 0; color: #48606c; line-height: 1.35; }
    .meta { text-align: right; color: #48606c; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0 12px; }
    .summary div { border: 1px solid #c8d7dc; border-radius: 6px; padding: 8px; }
    .summary span { display: block; color: #607783; font-size: 9px; font-weight: 700; text-transform: uppercase; }
    .summary strong { display: block; margin-top: 4px; font-size: 17px; }
    .ausfallhonorar-summary { margin-top: 4px; }
    .ausfallhonorar-summary div { border-color: #94d8d1; background: #f2fbfa; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #d7e3e7; padding: 5px; vertical-align: top; text-align: left; overflow-wrap: anywhere; }
    th { background: #eaf7f6; color: #0f5360; font-size: 9px; text-transform: uppercase; }
    tr:nth-child(even) td { background: #f8fbfc; }
    .patient { width: 16%; }
    .reason { width: 18%; }
    .comment { width: 16%; }
    .practice-check { width: 15%; }
    .status { display: inline-block; border-radius: 999px; background: #eaf7f6; color: #0f5360; padding: 2px 6px; font-weight: 700; }
    .traffic { display: inline-block; width: 9px; height: 9px; border-radius: 999px; margin-right: 5px; background: #30d5c8; }
    .traffic-red { background: #f04438; }
    .traffic-amber { background: #f59e0b; }
    .traffic-green { background: #12b76a; }
    footer { margin-top: 12px; color: #607783; font-size: 9px; }
  </style>
</head>
<body>
  ${printWindowToolbarHtml()}
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
  ${ausfallhonorarSummary ? `
  <h2>Ausfallhonorar</h2>
  <section class="summary ausfallhonorar-summary">
    <div><span>Eingereicht</span><strong>${escapeHtml(money.format(ausfallhonorarSummary.submittedAmount))}</strong></div>
    <div><span>Bezahlt</span><strong>${escapeHtml(money.format(ausfallhonorarSummary.paidAmount))}</strong></div>
    <div><span>Quote</span><strong>${escapeHtml(formatPercent(ausfallhonorarSummary.paymentRate))}</strong></div>
    <div><span>Rechnungen</span><strong>${ausfallhonorarSummary.paidInvoiceCount}/${ausfallhonorarSummary.invoiceCount}</strong></div>
  </section>` : ""}
  ${noProtectionSummary ? `
  <h2>Ohne Ausfallschutz</h2>
  <section class="summary ausfallhonorar-summary">
    <div><span>Patienten</span><strong>${integerNumber.format(noProtectionSummary.patientCount)}</strong></div>
    <div><span>Zahlen regelmäßig</span><strong>${integerNumber.format(noProtectionSummary.regularPaidPatients)}</strong></div>
    <div><span>Regelmäßig-Quote</span><strong>${escapeHtml(formatPercent(noProtectionSummary.regularPaidRate))}</strong></div>
    <div><span>Endgültig storniert</span><strong>${integerNumber.format(noProtectionSummary.finalCancelledPatients)}</strong></div>
  </section>
  <section class="summary ausfallhonorar-summary">
    <div><span>Forderungen</span><strong>${integerNumber.format(noProtectionSummary.claimCount)}</strong></div>
    <div><span>Ohne-Schutz-Betrag</span><strong>${escapeHtml(money.format(noProtectionSummary.amount))}</strong></div>
    <div><span>Bezahlt/Gesichert</span><strong>${escapeHtml(money.format(noProtectionSummary.regularPaidAmount))}</strong></div>
    <div><span>Storniert Betrag</span><strong>${escapeHtml(money.format(noProtectionSummary.finalCancelledAmount))}</strong></div>
  </section>` : ""}
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
        <th class="comment">Kommentar</th>
        <th class="practice-check">Wenn storniert: in der Praxissoftware ausgebucht?</th>
      </tr>
    </thead>
    <tbody>
      ${visibleRows.length ? visibleRows.map(caseReportRowHtml).join("") : `<tr><td colspan="10">Keine offenen Fälle im aktuellen Datenstand.</td></tr>`}
    </tbody>
  </table>
  <footer>Hinweis: Der Bericht bildet die aktuell in der Ansicht gefilterten offenen Fälle ab. Originaldaten bleiben unverändert; interne Erledigungen werden separat in der App gepflegt.</footer>
  ${printWindowAutoCloseScript("", 150)}
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
    <td>${escapeHtml(exactMoney.format(fall.amount))}</td>
    <td>${escapeHtml(fall.reason)}</td>
    <td>${fall.ageDays} Tage</td>
    <td><span class="status">${escapeHtml(fall.status)}</span></td>
    <td></td>
    <td></td>
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
      <section className="priority-grid no-protection-risk-grid">
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
          label="Davon geklärt"
          value={String(paymentRisk.resolvedPatients)}
          hint="Zahlung oder Erledigung erkannt"
          period={selectedPeriod.label}
          tone={paymentRisk.resolvedPatients ? "green" : "blue"}
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
    `Aufteilung: ${unpaidPatients} kritisch, ${resolvedPatients} geklärt/erledigt und ${cleanPatients} bisher unauffällig. Erkannte kritische Summe: ${money.format(unpaidAmount)}.`
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
  lastLoginAt?: string | null;
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
            <option value="abrechnungsmanagement">Abrechnungsmanagement</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </label>
        <label>
          Standort
          <select value={standortId} onChange={(event) => setStandortId(event.target.value)} disabled={role !== "standortleitung"}>
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
          <thead><tr><th>Name</th><th>E-Mail</th><th>Rolle</th><th>Standort</th><th>Status</th><th>Letzter Login</th><th>Aktion</th></tr></thead>
          <tbody>
            {managedUsers.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.fullName || "-"}</strong></td>
                <td>{user.email}</td>
                <td>{roleLabel(user.role)}</td>
                <td>{user.role === "super_admin" || user.role === "abrechnungsmanagement" ? "alle Einzelrechnungen" : user.standortIds.map(locationNameForId).join(", ") || "-"}</td>
                <td>
                  <div className="status-stack">
                    <StatusBadge status={user.active ? "aktiv" : "inaktiv"} />
                    {user.mustChangePassword && <StatusBadge status="Passwortwechsel offen" />}
                  </div>
                </td>
                <td>{formatLastLogin(user.lastLoginAt)}</td>
                <td>
                  <button className="secondary-button" onClick={() => toggleActive(user)} type="button">
                    {user.active ? "Deaktivieren" : "Aktivieren"}
                  </button>
                </td>
              </tr>
            ))}
            {!managedUsers.length && !loading && (
              <tr><td colSpan={7}>Noch keine Nutzer vorhanden.</td></tr>
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

function formatLastLogin(value?: string | null) {
  if (!value) return "noch nie";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
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

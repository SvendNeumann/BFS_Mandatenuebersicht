import type { ParsedInvoiceDocument, ParsedInvoiceLine, Standort } from "@/lib/types";

export type InvoiceQualityAffectedInvoice = {
  key: string;
  invoiceNo: string;
  bfsNo: string;
  invoiceDate: string;
  patientName: string;
  amount: number;
  presentCodes: string[];
};

export type InvoiceQualityRule = {
  ruleId?: string;
  analysisType?: InvoiceQualityAnalysisType;
  anchorCodes: string[];
  companionCode: string;
  companionDescription?: string;
  caseType?: string;
  serviceArea?: string;
  positionGroup?: string;
  factor?: number;
  groupAverageFactor?: number;
  practiceAverageFactor?: number;
  factorDeviation?: number;
  amountAverageGroup?: number;
  amountAveragePractice?: number;
  amountDeviation?: number;
  analogBasis?: string;
  materialLabType?: string;
  metricName?: string;
  metricValueGroup?: number;
  metricValuePractice?: number;
  metricDeviation?: number;
  topicCluster?: InvoiceQualityTopicCluster;
  hintType?: InvoiceQualityHintType;
  precheckStatus?: InvoiceQualityPrecheckStatus;
  orientationLevel?: InvoiceQualityOrientationLevel;
  title: string;
  rationale: string;
  source: string;
  sources?: InvoiceQualityRuleSource[];
  requiredContext?: string[];
  documentationHints?: string[];
  cautionNotes?: string[];
  active?: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  confidence: "hoch" | "mittel";
};

export type InvoiceQualityAnalysisType =
  | "position_combination"
  | "factor_deviation"
  | "service_area_pattern"
  | "analog_position_pattern"
  | "material_lab_pattern"
  | "amount_pattern"
  | "other";

export type InvoiceQualityHintType =
  | "Kataloghinweis"
  | "Plausibilitätshinweis"
  | "Datenmuster"
  | "Behandlungsverlauf"
  | "Überschneidungsrisiko"
  | "Faktorhinweis"
  | "Leistungsbereichshinweis"
  | "Analoghinweis"
  | "Material-/Labor-Hinweis";

export type InvoiceQualityPrecheckStatus =
  | "Regel hinterlegt"
  | "Nur Datenmuster"
  | "Keine Regel vorhanden"
  | "Vorsichtig einordnen";

export type InvoiceQualityOrientationLevel =
  | "naheliegend"
  | "einzelfallabhängig"
  | "vorsichtig einordnen";

export type InvoiceQualityStatus =
  | "offen"
  | "angeschaut"
  | "fachlich relevant"
  | "fachlich nicht relevant"
  | "später prüfen"
  | "erledigt";

export type InvoiceQualityTopicCluster =
  | "Adhäsive Befestigung"
  | "ZE/FAL-Zentrallage"
  | "Endodontie"
  | "Implantat-Fallverlauf"
  | "Prophylaxe/PZR"
  | "Beratung/Diagnostik"
  | "Chirurgie/Nachbehandlung"
  | "Faktoren / Steigerungssätze"
  | "Analogpositionen"
  | "Material / Labor / Fremdlabor"
  | "Sonstige / ungeklärt";

export type InvoiceQualityPatternContext =
  | "implantology"
  | "fal_cmd"
  | "endo"
  | "restorative"
  | "prosthetics"
  | "paro"
  | "surgery"
  | "diagnostics"
  | "anesthesia"
  | "unknown";

export type InvoiceQualityPatternClassification =
  | "fachlich_naheliegend"
  | "kontextabhaengig"
  | "schwach_statistisch"
  | "unklassifiziert";

export type InvoiceQualityPatternPriority = "hoch" | "mittel" | "niedrig";

export type BillingPatternRule = {
  id: string;
  triggerCodes: string[];
  companionCodes: string[];
  context: InvoiceQualityPatternContext;
  plausibility: "strong" | "contextual" | "weak";
  requiresContextCodes?: string[];
  suppressIfOnlyTrigger?: boolean;
  minLocationCases?: number;
  minGroupUsageRate?: number;
  minDeltaRate?: number;
  minComparisonValue?: number;
  priorityBoost?: number;
  priorityPenalty?: number;
  disclaimer?: string;
};

export type InvoiceQualityRuleSource = {
  title: string;
  sourceType: "GOZ" | "GOÄ" | "BEMA" | "BZÄK-Kommentar" | "KZV-Hinweis" | "Kammerhinweis" | "Interne Leitlinie" | "Rechtsprechung" | "Sonstige";
  url?: string;
  checkedAt?: string;
  note?: string;
};

export type InvoiceQualityFinding = {
  key: string;
  analysisType: InvoiceQualityAnalysisType;
  standortId: string;
  standortName: string;
  caseType: string;
  serviceArea: string;
  topicCluster: InvoiceQualityTopicCluster;
  anchorCode: string;
  anchorDescription: string;
  companionCode: string;
  companionDescription: string;
  hintArea: string;
  anomalyLabel: string;
  factor?: number;
  groupAverageFactor?: number;
  practiceAverageFactor?: number;
  factorDeviation?: number;
  amountAverageGroup?: number;
  amountAveragePractice?: number;
  amountDeviation?: number;
  analogBasis?: string;
  materialLabType?: string;
  metricName?: string;
  metricValueGroup?: number;
  metricValuePractice?: number;
  metricDeviation?: number;
  groupAnchorCount: number;
  groupTogetherCount: number;
  groupRate: number;
  targetAnchorCount: number;
  targetTogetherCount: number;
  targetRate: number;
  confidenceGap: number;
  missingEstimate: number;
  avgCompanionAmount: number;
  potential: number;
  score: number;
  priority: InvoiceQualityPatternPriority;
  classification: InvoiceQualityPatternClassification;
  context: InvoiceQualityPatternContext;
  contextLabel: string;
  lowCaseCount: boolean;
  comparisonBasis: string;
  hintType: InvoiceQualityHintType;
  precheckStatus: InvoiceQualityPrecheckStatus;
  orientationLevel: InvoiceQualityOrientationLevel;
  status: InvoiceQualityStatus;
  shortTitle: string;
  explanation: string;
  requiredContext: string[];
  documentationHints: string[];
  cautionNotes: string[];
  sources: InvoiceQualityRuleSource[];
  leaderQuestion: string;
  rule?: InvoiceQualityRule;
  affectedInvoices: InvoiceQualityAffectedInvoice[];
};

export type InvoiceQualityChainCompanion = {
  code: string;
  description: string;
  topic: InvoiceQualityChainTopic;
  groupRate: number;
  targetRate: number;
  confidenceGap: number;
  missingEstimate: number;
  avgAmount: number;
  potential: number;
  rule?: InvoiceQualityRule;
};

export type InvoiceQualityChainRiskLevel = "green" | "yellow" | "red";
export type InvoiceQualityChainReviewStatus = "seed_ungeprüft" | "ungeprüft" | "validiert" | "review_erforderlich";
export type InvoiceQualityChainSourceStatus = "keine_quelle" | "ungeprüft" | "validiert" | "review_erforderlich" | "widersprüchlich";
export type InvoiceQualityChainClassification = "naheliegend" | "einzelfallabhängig" | "vorsichtig einordnen" | "nur Datenmuster" | "Regel hinterlegt";
export type InvoiceQualityChainHintType = "Begleitposition" | "Behandlungsverlauf" | "Überschneidungsrisiko" | "Datenmuster";
export type InvoiceQualityChainRuleStatus = "Regel hinterlegt" | "Nur Datenmuster" | "Keine Regel vorhanden" | "Vorsichtig einordnen";
export type InvoiceQualityChainTopic =
  | "Prophylaxe / PZR"
  | "Beratung / Diagnostik"
  | "Endodontie"
  | "Füllungstherapie"
  | "ZE / Implantat / Labor"
  | "FAL / Funktion"
  | "Chirurgie / Nachbehandlung"
  | "Implantat-Fallverlauf"
  | "Anästhesie"
  | "Adhäsive Befestigung"
  | "Digitale Abformung"
  | "Okklusion"
  | "Sonstige";

export type InvoiceQualityChainSource = {
  title: string;
  url?: string;
  publisher: string;
  checkedAt?: string;
  checkedBy?: string;
  summary: string;
  relevance: string;
  status: "validiert" | "ungeprüft" | "veraltet" | "widersprüchlich";
};

export type InvoiceQualityChainRule = {
  chainId: string;
  mainCode: string;
  companionCodes: string[];
  codeSystem: "GOZ" | "GOÄ" | "BEMA" | "Sonstige";
  fallType?: string;
  riskLevel: InvoiceQualityChainRiskLevel;
  reviewStatus: InvoiceQualityChainReviewStatus;
  sourceStatus?: InvoiceQualityChainSourceStatus;
  legalStatus: "seed_regel" | "fachlich_geprüft" | "ungeprüft";
  summary: string;
  requiredDocumentation: string[];
  warnings: string[];
  exclusions: string[];
  sources: InvoiceQualityChainSource[];
  checkedAt?: string;
  checkedBy?: string;
  reviewedBy?: string;
  internalNotes?: string;
};

export type InvoiceQualityCatalogPlausibilityLevel = "A" | "B" | "C" | "D" | "E";
export type InvoiceQualityCatalogPlausibilityStatus = "regel_hinterlegt" | "keine_regel";
export type InvoiceQualityCatalogPlausibilityMatchType =
  | "exact_chain"
  | "trigger_companion"
  | "trigger_only"
  | "companion_only"
  | "falltype_context"
  | "cluster_context";

export type InvoiceQualityCatalogPlausibilityRule = {
  ruleId: string;
  active: boolean;
  matchType: InvoiceQualityCatalogPlausibilityMatchType;
  triggerCode?: string;
  companionCodes?: string[];
  companionCode?: string;
  fallType?: string;
  topicCluster?: InvoiceQualityChainTopic;
  catalogPlausibilityLevel: InvoiceQualityCatalogPlausibilityLevel;
  label: string;
  explanation: string;
  requiredContext: string[];
  documentationHints: string[];
  cautionNotes: string[];
  sources: InvoiceQualityRuleSource[];
};

export type InvoiceQualityChainFinding = {
  key: string;
  standortId: string;
  standortName: string;
  caseType: string;
  anchorCode: string;
  anchorDescription: string;
  groupAnchorCount: number;
  targetAnchorCount: number;
  companions: InvoiceQualityChainCompanion[];
  potential: number;
  affectedInvoices: InvoiceQualityAffectedInvoice[];
  codeSystem: InvoiceQualityChainRule["codeSystem"];
  riskLevel: InvoiceQualityChainRiskLevel;
  reviewStatus: InvoiceQualityChainReviewStatus;
  sourceStatus: InvoiceQualityChainSourceStatus;
  classification: InvoiceQualityChainClassification;
  hintType: InvoiceQualityChainHintType;
  ruleStatus: InvoiceQualityChainRuleStatus;
  topic: InvoiceQualityChainTopic;
  catalogPlausibilityLevel: InvoiceQualityCatalogPlausibilityLevel;
  catalogPlausibilityLabel: string;
  catalogPlausibilityExplanation: string;
  catalogPlausibilitySources: InvoiceQualityRuleSource[];
  catalogPlausibilityRuleId?: string;
  catalogPlausibilityStatus: InvoiceQualityCatalogPlausibilityStatus;
  catalogRequiredContext: string[];
  catalogDocumentationHints: string[];
  catalogCautionNotes: string[];
  ruleSummary: string;
  shortHint: string;
  detailHint: string;
  leaderQuestion: string;
  requiredDocumentation: string[];
  warnings: string[];
  exclusions: string[];
  sources: InvoiceQualityChainSource[];
  matchedRule?: InvoiceQualityChainRule;
};

export type InvoiceQualityProfile = {
  invoice: ParsedInvoiceDocument;
  standortId?: string;
  standortName: string;
  invoiceNo: string;
  bfsNo: string;
  invoiceDate: string;
  patientName: string;
  amount: number;
  codes: string[];
  codeSet: Set<string>;
  lineByCode: Map<string, ParsedInvoiceLine>;
  caseType: string;
};

export type InvoiceQualityPeriod = {
  label: string;
};

export const invoiceQualityChainRules: InvoiceQualityChainRule[] = [
  {
    chainId: "seed-0010-2010-ae1",
    mainCode: "0010",
    companionCodes: ["2010", "Ä1"],
    codeSystem: "GOZ",
    fallType: "Prophylaxe/PZR",
    riskLevel: "yellow",
    reviewStatus: "seed_ungeprüft",
    legalStatus: "seed_regel",
    summary: "Grundsätzlich prüffähig. 2010 nur bei tatsächlicher Behandlung überempfindlicher Zahnflächen. Ä1 nur bei eigenständiger Beratung.",
    requiredDocumentation: ["Untersuchungsanlass/Befund", "Hypersensibilität", "durchgeführte Behandlung", "Beratungsinhalt"],
    warnings: ["Keine automatische Abrechnungsempfehlung.", "Gruppenquote ist kein rechtlicher Maßstab."],
    exclusions: ["gleiche Sitzung, gleicher Zahn und gleicher Leistungsinhalt im Einzelfall prüfen"],
    sources: [],
    internalNotes: "Seed-Regel aus Kirchberg-Beispiel; fachliche Quellenprüfung noch nachziehen."
  },
  {
    chainId: "seed-ae1-0010-2010",
    mainCode: "Ä1",
    companionCodes: ["0010", "2010"],
    codeSystem: "GOÄ",
    fallType: "Prophylaxe/PZR",
    riskLevel: "yellow",
    reviewStatus: "seed_ungeprüft",
    legalStatus: "seed_regel",
    summary: "Nicht als Standardberatung verwenden. Nur bei eigenständiger Beratung, Untersuchung und dokumentierter Behandlung überempfindlicher Zahnflächen.",
    requiredDocumentation: ["eigenständiger Beratungsinhalt", "Untersuchungsbefund", "Hypersensibilität", "Behandlungsdokumentation"],
    warnings: ["Keine pauschale Aussage möglich.", "Einzelfallprüfung erforderlich."],
    exclusions: ["Überschneidung mit Untersuchungs- und Beratungsinhalt prüfen"],
    sources: [],
    internalNotes: "Seed-Regel aus Kirchberg-Beispiel; fachliche Quellenprüfung noch nachziehen."
  },
  {
    chainId: "seed-5040-8010-2197",
    mainCode: "5040",
    companionCodes: ["8010", "2197"],
    codeSystem: "GOZ",
    fallType: "ZE/Implantat/Labor",
    riskLevel: "yellow",
    reviewStatus: "seed_ungeprüft",
    legalStatus: "seed_regel",
    summary: "Bei ZE-/Teleskopfällen prüffähig. 8010 nur bei tatsächlicher Registrierung der gelenkbezüglichen Zentrallage. 2197 nur bei tatsächlicher adhäsiver Befestigung.",
    requiredDocumentation: ["ZE-/Teleskop-Bezug", "Registrierung der gelenkbezüglichen Zentrallage", "adhäsive Befestigung", "Behandlungsablauf"],
    warnings: ["Nur prüfen, wenn Leistung tatsächlich erbracht und dokumentiert wurde."],
    exclusions: ["Leistungsinhalt und Sitzungskontext prüfen"],
    sources: [],
    internalNotes: "Seed-Regel aus Kirchberg-Beispiel; fachliche Quellenprüfung noch nachziehen."
  },
  {
    chainId: "seed-4020-2010-ae1-0010",
    mainCode: "4020",
    companionCodes: ["2010", "Ä1", "0010"],
    codeSystem: "GOZ",
    riskLevel: "yellow",
    reviewStatus: "seed_ungeprüft",
    legalStatus: "seed_regel",
    summary: "Nur Orientierung. 4020 setzt lokale Mundschleimhautbehandlung voraus. Weitere Positionen nur bei eigenständiger Leistung und Dokumentation.",
    requiredDocumentation: ["lokale Mundschleimhautbehandlung", "eigenständige Untersuchungs-/Beratungsleistung", "Hypersensibilität bei 2010 fachlich einordnen"],
    warnings: ["Keine automatische Abrechnungsempfehlung."],
    exclusions: ["gleiche Sitzung und Leistungsüberschneidung fachlich einordnen"],
    sources: [],
    internalNotes: "Seed-Regel aus Kirchberg-Beispiel; fachliche Quellenprüfung noch nachziehen."
  },
  {
    chainId: "seed-4005-2010-ae1",
    mainCode: "4005",
    companionCodes: ["2010", "Ä1"],
    codeSystem: "GOZ",
    riskLevel: "yellow",
    reviewStatus: "seed_ungeprüft",
    legalStatus: "seed_regel",
    summary: "Nur prüffähig, wenn Indexerhebung, Hypersensibilitätsbehandlung und Beratung eigenständig dokumentiert sind.",
    requiredDocumentation: ["Indexerhebung", "Hypersensibilitätsbehandlung", "eigenständige Beratung"],
    warnings: ["Einzelfallprüfung erforderlich."],
    exclusions: ["Doppelerfassung und Leistungsüberschneidung prüfen"],
    sources: [],
    internalNotes: "Seed-Regel aus Kirchberg-Beispiel; fachliche Quellenprüfung noch nachziehen."
  },
  {
    chainId: "seed-4055-0010-1020-4050",
    mainCode: "4055",
    companionCodes: ["0010", "1020", "4050"],
    codeSystem: "GOZ",
    riskLevel: "red",
    reviewStatus: "seed_ungeprüft",
    legalStatus: "seed_regel",
    summary: "Erhöhtes Risiko wegen möglicher Überschneidungen bei Belagentfernung, Fluoridierung, PZR, Sitzung und Zahnbezug. Nicht als Abrechnungsempfehlung verwenden.",
    requiredDocumentation: ["Zahnbezug", "Sitzung", "konkrete Leistungserbringung", "Abgrenzung zu PZR/Belagentfernung/Fluoridierung"],
    warnings: ["Erhöhtes Ausschlussrisiko.", "Nicht als wirtschaftlicher Call-to-Action verwenden."],
    exclusions: ["Belagentfernung", "Fluoridierung", "PZR", "gleiche Sitzung", "gleicher Zahn"],
    sources: [],
    internalNotes: "Seed-Regel aus Kirchberg-Beispiel; fachliche Quellenprüfung noch nachziehen."
  }
];

const sourceBzaek = (title: string, note?: string): InvoiceQualityRuleSource => ({
  title,
  sourceType: "BZÄK-Kommentar",
  note
});

export const invoiceQualityCatalogPlausibilityRules: InvoiceQualityCatalogPlausibilityRule[] = [
  {
    ruleId: "catalog-a-2360-2410",
    active: true,
    matchType: "trigger_companion",
    triggerCode: "2360",
    companionCode: "2410",
    topicCluster: "Endodontie",
    catalogPlausibilityLevel: "A",
    label: "regelmäßig naheliegend",
    explanation: "Nach Exstirpation der vitalen Pulpa ist die Wurzelkanalaufbereitung bei fortgesetzter Endobehandlung fachlich häufig naheliegend.",
    requiredContext: ["fortgesetzte Endobehandlung", "tatsächliche Kanalaufbereitung"],
    documentationHints: ["Kanalbezug", "Behandlungsablauf", "durchgeführte Aufbereitung"],
    cautionNotes: ["Nur wenn die Kanalaufbereitung tatsächlich erbracht und dokumentiert wurde."],
    sources: [sourceBzaek("BZÄK GOZ-Kommentar 2360/2410")]
  },
  {
    ruleId: "catalog-a-2410-2420",
    active: true,
    matchType: "trigger_companion",
    triggerCode: "2410",
    companionCode: "2420",
    topicCluster: "Endodontie",
    catalogPlausibilityLevel: "A",
    label: "regelmäßig naheliegend",
    explanation: "Elektrophysikalisch-chemische Maßnahmen können bei mechanisch aufbereitetem Wurzelkanal fachlich naheliegend sein.",
    requiredContext: ["mechanisch aufbereiteter Wurzelkanal", "zusätzliche Maßnahme"],
    documentationHints: ["Art der zusätzlichen Maßnahme", "Kanalbezug", "Sitzung"],
    cautionNotes: ["Nur wenn die zusätzliche Maßnahme tatsächlich erbracht wurde."],
    sources: [sourceBzaek("BZÄK GOZ-Kommentar 2410/2420")]
  },
  ...["8010", "8020", "8050"].map((code): InvoiceQualityCatalogPlausibilityRule => ({
    ruleId: `catalog-a-8000-${code}`,
    active: true,
    matchType: "trigger_companion",
    triggerCode: "8000",
    companionCode: code,
    topicCluster: "FAL / Funktion",
    catalogPlausibilityLevel: "A",
    label: "regelmäßig naheliegend",
    explanation: "Bei klinischer Funktionsanalyse können weitere funktionsanalytische Leistungen wie Zentrallage, Scharnierachsenbestimmung oder Bewegungsregistrierung fachlich naheliegend sein.",
    requiredContext: ["klinische Funktionsanalyse", "tatsächliche funktionsanalytische Begleitleistung"],
    documentationHints: ["durchgeführte Registrierung/Bestimmung", "Befund", "Behandlungsablauf"],
    cautionNotes: ["Nur bei tatsächlicher Durchführung und Dokumentation."],
    sources: [sourceBzaek(`BZÄK GOZ-Kommentar 8000/${code}`)]
  })),
  ...["2200", "2210", "2270", "2310", "5010", "5040"].map((code): InvoiceQualityCatalogPlausibilityRule => ({
    ruleId: `catalog-a-${code}-2197`,
    active: true,
    matchType: "trigger_companion",
    triggerCode: code,
    companionCode: "2197",
    topicCluster: "Adhäsive Befestigung",
    catalogPlausibilityLevel: "A",
    label: "regelmäßig naheliegend",
    explanation: "2197 ist fachlich naheliegend, wenn tatsächlich adhäsiv befestigt wurde.",
    requiredContext: ["tatsächliche adhäsive Befestigung"],
    documentationHints: ["Befestigungsart", "Material/Technik", "Zahn-/Werkstückbezug"],
    cautionNotes: ["Nicht bei konventioneller Zementierung."],
    sources: [sourceBzaek("BZÄK GOZ-Kommentar 2197")]
  })),
  {
    ruleId: "catalog-a-digital-0065",
    active: true,
    matchType: "companion_only",
    companionCode: "0065",
    topicCluster: "Digitale Abformung",
    catalogPlausibilityLevel: "A",
    label: "regelmäßig naheliegend",
    explanation: "0065 ist naheliegend, wenn tatsächlich optisch-elektronisch abgeformt oder gescannt wurde.",
    requiredContext: ["optisch-elektronische Abformung", "tatsächlicher Scan"],
    documentationHints: ["Scan/Abformung", "Indikation", "Datum/Sitzung"],
    cautionNotes: ["Nicht automatisch bei jedem ZE- oder Implantatfall."],
    sources: [sourceBzaek("BZÄK GOZ-Kommentar 0065")]
  },
  {
    ruleId: "catalog-b-0010-2010-ae1",
    active: true,
    matchType: "exact_chain",
    triggerCode: "0010",
    companionCodes: ["2010", "Ä1"],
    fallType: "Prophylaxe/PZR",
    topicCluster: "Prophylaxe / PZR",
    catalogPlausibilityLevel: "B",
    label: "einzelfallabhängig",
    explanation: "2010 kann bei tatsächlicher Behandlung überempfindlicher Zahnflächen relevant sein. Ä1 nur bei eigenständiger Beratung.",
    requiredContext: ["Hypersensibilität", "eigenständige Beratung", "Untersuchungsanlass"],
    documentationHints: ["Befund", "Beratungsinhalt", "durchgeführte Behandlung"],
    cautionNotes: ["Nicht als Standardberatung verwenden."],
    sources: [sourceBzaek("BZÄK GOZ-/GOÄ-Kommentar 0010/2010/Ä1")]
  },
  {
    ruleId: "catalog-b-ae1-0010-2010",
    active: true,
    matchType: "exact_chain",
    triggerCode: "Ä1",
    companionCodes: ["0010", "2010"],
    fallType: "Prophylaxe/PZR",
    topicCluster: "Beratung / Diagnostik",
    catalogPlausibilityLevel: "B",
    label: "einzelfallabhängig",
    explanation: "Untersuchung und Behandlung überempfindlicher Zahnflächen können im Zusammenhang mit Beratung vorkommen, sind aber nicht automatisch Begleitpositionen.",
    requiredContext: ["eigenständige Beratung", "Untersuchung", "Hypersensibilität"],
    documentationHints: ["Beratungsinhalt", "Befund", "Behandlungsdokumentation"],
    cautionNotes: ["Nicht als Standardberatung verwenden."],
    sources: [sourceBzaek("BZÄK GOZ-/GOÄ-Kommentar Ä1/0010/2010")]
  },
  {
    ruleId: "catalog-b-4005-2010-ae1-0010",
    active: true,
    matchType: "exact_chain",
    triggerCode: "4005",
    companionCodes: ["2010", "Ä1", "0010"],
    topicCluster: "Prophylaxe / PZR",
    catalogPlausibilityLevel: "B",
    label: "einzelfallabhängig",
    explanation: "Kann bei Befund-/Indexerhebung, Beratung und Hypersensibilität vorkommen.",
    requiredContext: ["Indexerhebung", "eigenständige Beratung", "Hypersensibilität"],
    documentationHints: ["Index/Befund", "Beratungsinhalt", "Zahn-/Sitzungsbezug"],
    cautionNotes: ["Eigenständige Leistung und Dokumentation erforderlich."],
    sources: [sourceBzaek("BZÄK GOZ-/GOÄ-Kommentar 4005/2010/Ä1/0010")]
  },
  {
    ruleId: "catalog-b-2020-endo-context",
    active: true,
    matchType: "trigger_companion",
    triggerCode: "2020",
    companionCodes: ["2410", "0070", "Ä5000"],
    topicCluster: "Endodontie",
    catalogPlausibilityLevel: "B",
    label: "einzelfallabhängig",
    explanation: "Temporärer speicheldichter Verschluss kann im Endo-Ablauf mit Kanalaufbereitung, Vitalitätsprüfung oder Röntgen vorkommen.",
    requiredContext: ["Endo-Ablauf", "temporärer Verschluss", "konkrete Begleitleistung"],
    documentationHints: ["Sitzung", "Zahn-/Kanalbezug", "Behandlungsablauf"],
    cautionNotes: ["Sitzung und tatsächlichen Behandlungsablauf prüfen."],
    sources: [sourceBzaek("BZÄK GOZ-/GOÄ-Kommentar 2020/2410/0070/Ä5000")]
  },
  ...["3290", "3300"].map((code): InvoiceQualityCatalogPlausibilityRule => ({
    ruleId: `catalog-c-${code}-implant-flow`,
    active: true,
    matchType: "trigger_companion",
    triggerCode: code,
    companionCodes: ["9010", "0530", "Ä5004"],
    topicCluster: "Implantat-Fallverlauf",
    catalogPlausibilityLevel: "C",
    label: "Behandlungsverlauf",
    explanation: `${code} ist Kontrolle oder Nachbehandlung. Implantatinsertion, Zuschläge oder OPG können zeitlich getrennt sein.`,
    requiredContext: ["zeitlicher Behandlungsverlauf", "Kontrolle/Nachbehandlung", "separate Hauptleistung"],
    documentationHints: ["Datum", "Sitzung", "OP-/Kontrollbezug"],
    cautionNotes: ["Nicht als automatisch zu berücksichtigende Begleitleistung darstellen."],
    sources: [sourceBzaek(`BZÄK GOZ-/GOÄ-Kommentar ${code}/Implantologie`)]
  })),
  {
    ruleId: "catalog-c-9000-9010",
    active: true,
    matchType: "trigger_companion",
    triggerCode: "9000",
    companionCode: "9010",
    topicCluster: "Implantat-Fallverlauf",
    catalogPlausibilityLevel: "C",
    label: "Behandlungsverlauf",
    explanation: "Implantatbezogene Analyse kann der Implantation vorausgehen, ersetzt aber nicht die Prüfung, ob 9010 tatsächlich erbracht wurde.",
    requiredContext: ["Implantatplanung", "zeitlicher Verlauf"],
    documentationHints: ["Planungsdatum", "OP-Datum", "Leistungsinhalt"],
    cautionNotes: ["Fallverlauf prüfen."],
    sources: [sourceBzaek("BZÄK GOZ-Kommentar 9000/9010")]
  },
  {
    ruleId: "catalog-c-ae5004-9010",
    active: true,
    matchType: "trigger_companion",
    triggerCode: "Ä5004",
    companionCode: "9010",
    topicCluster: "Implantat-Fallverlauf",
    catalogPlausibilityLevel: "C",
    label: "Behandlungsverlauf",
    explanation: "OPG kann vor, nach oder unabhängig von Implantation vorkommen.",
    requiredContext: ["bildgebende Diagnostik", "Implantatverlauf"],
    documentationHints: ["Aufnahmedatum", "Indikation", "OP-Bezug"],
    cautionNotes: ["Nicht automatisch auf Implantatinsertion schließen."],
    sources: [sourceBzaek("BZÄK GOÄ-/GOZ-Kommentar Ä5004/9010")]
  },
  {
    ruleId: "catalog-c-9110-flow",
    active: true,
    matchType: "trigger_companion",
    triggerCode: "9110",
    companionCodes: ["9000", "0090P", "0100", "Ä6", "Ä1"],
    topicCluster: "Implantat-Fallverlauf",
    catalogPlausibilityLevel: "C",
    label: "Behandlungsverlauf",
    explanation: "Bei Sinusbodenelevation können Planung, Anästhesie und Beratung relevant sein, aber die Kette ist zeitlich und fachlich stark einzelfallabhängig.",
    requiredContext: ["Sinusbodenelevation", "Planung", "Anästhesie", "Beratung"],
    documentationHints: ["Untercluster Planung", "Untercluster Anästhesie", "Untercluster Beratung"],
    cautionNotes: ["Untergruppen in der Detailansicht einzeln bewerten."],
    sources: [sourceBzaek("BZÄK GOZ-/GOÄ-Kommentar 9110")]
  },
  {
    ruleId: "catalog-d-pzr-1020",
    active: true,
    matchType: "falltype_context",
    companionCode: "1020",
    fallType: "Prophylaxe/PZR",
    topicCluster: "Prophylaxe / PZR",
    catalogPlausibilityLevel: "D",
    label: "vorsichtig einordnen",
    explanation: "Bei PZR-nahen Fällen kann Fluoridierung bereits Leistungsinhalt sein.",
    requiredContext: ["PZR-/Prophylaxe-Kontext", "Fluoridierung", "Sitzung/Zahnbezug"],
    documentationHints: ["gleiche Sitzung", "gleiche Zähne", "Leistungsinhalt"],
    cautionNotes: ["1040/PZR-Kontext, gleiche Sitzung und gleiche Zähne besonders prüfen."],
    sources: [sourceBzaek("BZÄK GOZ-Kommentar 1040/1020")]
  },
  ...["4050", "4055"].map((code): InvoiceQualityCatalogPlausibilityRule => ({
    ruleId: `catalog-d-pzr-${code}`,
    active: true,
    matchType: "falltype_context",
    companionCode: code,
    fallType: "Prophylaxe/PZR",
    topicCluster: "Prophylaxe / PZR",
    catalogPlausibilityLevel: "D",
    label: "vorsichtig einordnen",
    explanation: "Belagentfernung kann im PZR-Kontext überschneiden.",
    requiredContext: ["PZR-/Prophylaxe-Kontext", "Belagentfernung", "Sitzung/Zahnbezug"],
    documentationHints: ["gleiche Sitzung", "gleicher Zahn", "30-Tage-Bezug"],
    cautionNotes: ["1040/PZR-Kontext, gleiche Sitzung, gleicher Zahn und 30-Tage-Regeln prüfen."],
    sources: [sourceBzaek(`BZÄK GOZ-Kommentar 1040/${code}`)]
  })),
  {
    ruleId: "catalog-d-4080-wide-chain",
    active: true,
    matchType: "exact_chain",
    triggerCode: "4080",
    companionCodes: ["0065", "2197", "2030", "2010", "4040"],
    catalogPlausibilityLevel: "D",
    label: "vorsichtig einordnen",
    explanation: "Diese Kette ist sehr breit und enthält unterschiedliche Leistungsarten. Als Gesamtkette ist sie zu unscharf.",
    requiredContext: ["breite Mischkette", "unterschiedliche Leistungsarten", "Einzelbewertung"],
    documentationHints: ["Untercluster digitale Abformung", "Untercluster Befestigung", "Untercluster Begleitbehandlung"],
    cautionNotes: ["In der Detailansicht in Untercluster aufsplitten und einzeln bewerten."],
    sources: [sourceBzaek("Interne Plausibilitätsregel 4080-Sammelkette")]
  }
];

export const invoiceQualityRules: InvoiceQualityRule[] = [
  {
    anchorCodes: ["8000"],
    companionCode: "8010",
    caseType: "Allgemein",
    title: "FAL-Zentrallage einordnen",
    rationale: "Bei klinischer Funktionsanalyse kann eine Registrierung der gelenkbezüglichen Zentrallage relevant sein. Bitte anhand Dokumentation, Behandlungsablauf und Abrechnungsvoraussetzungen fachlich einordnen.",
    source: "BZÄK GOZ-Kommentar Abschnitt J",
    confidence: "hoch"
  },
  {
    anchorCodes: ["8000"],
    companionCode: "8020",
    caseType: "Allgemein",
    title: "FAL-Scharnierachse einordnen",
    rationale: "Bei funktionsanalytischen Fällen kann die arbiträre Scharnierachsenbestimmung relevant sein. Bitte fachlich einordnen, ob sie erbracht, dokumentiert und anwendbar ist.",
    source: "BZÄK GOZ-Kommentar Abschnitt J",
    confidence: "hoch"
  },
  {
    anchorCodes: ["8000"],
    companionCode: "8050",
    caseType: "Allgemein",
    title: "FAL-Unterkieferbewegung einordnen",
    rationale: "Bei umfangreicher Funktionsanalyse können registrierte Unterkieferbewegungen relevant sein. Bitte fachlich einordnen, ob die Leistung im konkreten Fall anwendbar ist.",
    source: "BZÄK GOZ-Kommentar Abschnitt J",
    confidence: "mittel"
  },
  {
    anchorCodes: ["2400"],
    companionCode: "2420",
    caseType: "Endodontie",
    title: "Endo-Spülung/Aktivierung einordnen",
    rationale: "Bei elektrometrischer Längenbestimmung im Endo-Fall kann eine elektrophysikalisch-chemische Kanalbehandlung relevant sein. Bitte fachlich einordnen, ob sie erbracht und passend dokumentiert ist.",
    source: "BZÄK GOZ-Kommentar Abschnitt C",
    confidence: "mittel"
  },
  {
    anchorCodes: ["2410"],
    companionCode: "2430",
    caseType: "Endodontie",
    title: "Endo-medikamentöse Einlage einordnen",
    rationale: "Bei Wurzelkanalaufbereitung kann eine medikamentöse Einlage relevant sein. Bitte anhand Dokumentation und Abrechnungsvoraussetzungen fachlich einordnen.",
    source: "BZÄK GOZ-Kommentar Abschnitt C",
    confidence: "mittel"
  },
  {
    anchorCodes: ["2200", "2210", "2270", "2310", "5010", "5040"],
    companionCode: "2197",
    title: "Adhäsive Befestigung einordnen",
    rationale: "Bei Kronen-, Provisorien- oder Wiedereingliederungsfällen kann eine adhäsive Befestigung separat relevant sein. Bitte fachlich einordnen, ob sie dokumentiert und anwendbar ist.",
    source: "BZÄK GOZ-Kommentar Abschnitte C/F",
    confidence: "hoch"
  },
  {
    anchorCodes: ["5040", "5180"],
    companionCode: "8010",
    title: "ZE/FAL-Zentrallage einordnen",
    rationale: "Bei komplexeren prothetischen Fällen kann eine funktionsanalytische Zentrallage-Registrierung relevant sein. Bitte fachlich einordnen, ob sie erbracht und dokumentiert wurde.",
    source: "BZÄK GOZ-Kommentar Abschnitte F/J",
    confidence: "mittel"
  },
  {
    anchorCodes: ["5040", "5180"],
    companionCode: "8020",
    title: "ZE/FAL-Scharnierachse einordnen",
    rationale: "Bei komplexeren prothetischen Fällen kann eine Scharnierachsenbestimmung als funktionsanalytische Begleitleistung relevant sein. Bitte fachlich einordnen.",
    source: "BZÄK GOZ-Kommentar Abschnitte F/J",
    confidence: "mittel"
  },
  {
    anchorCodes: ["0530", "9100", "Ä2382"],
    companionCode: "9010",
    title: "Implantatfall vollständig einordnen",
    rationale: "Bei chirurgisch-implantologischen Begleitpositionen kann die Implantatinsertion im selben Behandlungszusammenhang relevant sein. Bitte fachlich einordnen, ob Dokumentation und Abrechnung zusammenpassen.",
    source: "BZÄK GOZ-Kommentar Abschnitt K/L",
    confidence: "mittel"
  },
  {
    anchorCodes: ["9100"],
    companionCode: "Ä5004",
    title: "Implantatdiagnostik einordnen",
    rationale: "Bei augmentativen Implantatfällen kann bildgebende Diagnostik relevant sein. Bitte fachlich einordnen, ob sie erbracht, dokumentiert und in der Rechnung berücksichtigt ist.",
    source: "BZÄK GOZ-Kommentar Abschnitte K und GOÄ",
    confidence: "mittel"
  }
];

export const billingPatternRules: BillingPatternRule[] = [
  {
    id: "implantology-9000-9010",
    triggerCodes: ["9000", "9010", "9100", "9050", "Ä2382"],
    companionCodes: ["9010", "Ä5004"],
    context: "implantology",
    plausibility: "contextual",
    minLocationCases: 8,
    minGroupUsageRate: 0.62,
    minDeltaRate: 0.18,
    priorityBoost: 4,
    disclaimer: "Implantologische Planung, Diagnostik, Implantation und Augmentation sind kontextabhängig und können zeitlich getrennt sein. Als Prüfhinweis einordnen, nicht als automatische Auffälligkeit."
  },
  {
    id: "implantology-augmentation-contextual",
    triggerCodes: ["9010", "9000", "9050"],
    companionCodes: ["9100"],
    context: "implantology",
    plausibility: "contextual",
    minLocationCases: 8,
    minGroupUsageRate: 0.48,
    minDeltaRate: 0.2,
    priorityPenalty: 4,
    disclaimer: "Augmentation ist nicht automatisch bei jeder Implantation erforderlich. Nur bei passendem Befund, Behandlungsablauf und Dokumentation fachlich prüfen."
  },
  {
    id: "op-surcharge-not-trigger",
    triggerCodes: ["0530"],
    companionCodes: ["9000", "9010", "9100", "Ä5004"],
    context: "surgery",
    plausibility: "weak",
    suppressIfOnlyTrigger: true,
    minLocationCases: 10,
    minGroupUsageRate: 0.6,
    minDeltaRate: 0.3,
    priorityPenalty: 34,
    disclaimer: "0530 ist ein Zuschlag im OP-Kontext und kein eigenständiger fachlicher Trigger."
  },
  {
    id: "fal-cmd-8000",
    triggerCodes: ["8000", "8010", "8020", "8050", "8060"],
    companionCodes: ["8010", "8020", "8050", "8060"],
    context: "fal_cmd",
    plausibility: "strong",
    minLocationCases: 6,
    minGroupUsageRate: 0.55,
    minDeltaRate: 0.18,
    priorityBoost: 8
  },
  {
    id: "endo-core",
    triggerCodes: ["2360", "2380", "2400", "2410", "2420", "2430", "2440"],
    companionCodes: ["2360", "2380", "2400", "2410", "2420", "2430", "2440"],
    context: "endo",
    plausibility: "contextual",
    requiresContextCodes: ["2360", "2380", "2400", "2410", "2420", "2430", "2440"],
    minLocationCases: 6,
    minGroupUsageRate: 0.5,
    minDeltaRate: 0.2,
    priorityBoost: 2
  },
  {
    id: "endo-unspecific-diagnostics",
    triggerCodes: ["0070", "0080", "0090", "0100", "0010", "Ä1", "Ä5"],
    companionCodes: ["2360", "2380", "2400", "2410", "2420", "2430", "2440", "Ä1", "Ä5", "2010"],
    context: "diagnostics",
    plausibility: "weak",
    suppressIfOnlyTrigger: true,
    priorityPenalty: 34,
    disclaimer: "Diagnostik, Beratung oder Anästhesie allein ist kein starker fachlicher Trigger."
  },
  {
    id: "anesthesia-companion-weak",
    triggerCodes: ["9000", "9010", "9050", "3010", "3290", "3300", "0100", "0010", "Ä1", "Ä5"],
    companionCodes: ["0080", "0090", "0100", "Ä1", "Ä5"],
    context: "anesthesia",
    plausibility: "weak",
    suppressIfOnlyTrigger: true,
    minLocationCases: 10,
    minGroupUsageRate: 0.65,
    minDeltaRate: 0.28,
    priorityPenalty: 34,
    disclaimer: "Anästhesie- und Beratungsziffern erzeugen ohne weitere fachliche Kontextziffern keine hohe Prüfpriorität."
  },
  {
    id: "restorative-adhesive",
    triggerCodes: ["0065", "2030", "2050", "2070", "2080", "2090", "2100", "2110", "2120", "2150", "2160", "2170", "2180", "2197", "2200", "2210", "2270", "2310", "5010", "5040"],
    companionCodes: ["0065", "2197", "2030", "2010"],
    context: "restorative",
    plausibility: "contextual",
    requiresContextCodes: ["2030", "2050", "2070", "2080", "2090", "2100", "2110", "2120", "2150", "2160", "2170", "2180", "2200", "2210", "2270", "2310", "5010", "5040"],
    minLocationCases: 8,
    minGroupUsageRate: 0.5,
    minDeltaRate: 0.22,
    priorityPenalty: 6
  },
  {
    id: "prosthetics-functional",
    triggerCodes: ["5010", "5040", "5170", "5180", "5200", "5210", "5220", "5230"],
    companionCodes: ["8010", "8020", "8050", "0065", "2197"],
    context: "prosthetics",
    plausibility: "contextual",
    minLocationCases: 6,
    minGroupUsageRate: 0.45,
    minDeltaRate: 0.2,
    disclaimer: "Prothetische und funktionsanalytische Begleitleistungen sind kontextabhängig. Hohe Prüfpriorität bedeutet Benchmark-Auffälligkeit, nicht Abrechnungssicherheit."
  },
  {
    id: "paro-surgery",
    triggerCodes: ["3010", "4070", "4075", "4080", "4090", "4100", "4130", "4133", "4150", "3030", "3040", "3050", "3060", "3070", "3080", "3090", "3100", "3190", "3200", "3230", "3250", "3290", "3300"],
    companionCodes: ["0080", "0090", "2030", "2197", "Ä5004", "0530", "3300", "3290"],
    context: "surgery",
    plausibility: "contextual",
    minLocationCases: 6,
    minGroupUsageRate: 0.45,
    minDeltaRate: 0.2
  },
  {
    id: "diagnostics-anesthesia-weak",
    triggerCodes: ["0010", "0070", "0080", "0090", "0100", "Ä1", "Ä5", "Ä5000", "Ä5004"],
    companionCodes: ["0010", "0070", "0080", "0090", "0100", "Ä1", "Ä5", "Ä5000", "Ä5004", "2010"],
    context: "diagnostics",
    plausibility: "weak",
    suppressIfOnlyTrigger: true,
    priorityPenalty: 34,
    disclaimer: "Diagnostik- und Anästhesieziffern sind häufig unspezifisch und werden vorsichtig priorisiert."
  }
];

const contextLabels: Record<InvoiceQualityPatternContext, string> = {
  implantology: "Implantologie",
  fal_cmd: "FAL/CMD",
  endo: "Endodontie",
  restorative: "Restaurativ",
  prosthetics: "Prothetik",
  paro: "Paro",
  surgery: "Chirurgie",
  diagnostics: "Diagnostik",
  anesthesia: "Anästhesie",
  unknown: "Unklassifiziert"
};

function matchingBillingPatternRule(anchorCode: string, companionCode: string) {
  return billingPatternRules.find((rule) =>
    rule.triggerCodes.includes(anchorCode) &&
    rule.companionCodes.includes(companionCode)
  );
}

const implantologyCodes = new Set(["9000", "9010", "9050", "9100"]);
const falCmdCodes = new Set(["8000", "8010", "8020", "8050", "8060"]);
const endoCodes = new Set(["2360", "2380", "2400", "2410", "2420", "2430", "2440"]);
const surgeryCodes = new Set(["3010", "3030", "3040", "3050", "3060", "3070", "3080", "3090", "3100", "3190", "3200", "3230", "3250", "3290", "3300", "4040", "0530"]);
const prostheticsCodes = new Set(["0050", "0065", "2200", "2210", "2270", "2310", "2320", "5010", "5040", "5170", "5180", "5200", "5210", "5220", "5230"]);
const restorativeCodes = new Set(["0065", "2030", "2050", "2060", "2070", "2080", "2090", "2100", "2110", "2120", "2150", "2160", "2170", "2180", "2197", "2200", "2210", "2270", "2310", "2320"]);
const diagnosticsCodes = new Set(["0010", "Ä1", "Ä5", "Ä5000", "Ä5004"]);
const anesthesiaCodes = new Set(["0080", "0090", "0100"]);

function inferPatternContext(anchorCode: string, companionCode: string, anchorDescription: string, companionDescription: string, caseType: string): InvoiceQualityPatternContext {
  const codes = [anchorCode, companionCode];
  const onlyWeakCodes = codes.every((code) => diagnosticsCodes.has(code) || anesthesiaCodes.has(code) || code === "0070");
  if (onlyWeakCodes) return diagnosticsCodes.has(anchorCode) || diagnosticsCodes.has(companionCode) ? "diagnostics" : "anesthesia";
  if (surgeryCodes.has(anchorCode) && !implantologyCodes.has(anchorCode)) return "surgery";
  if (prostheticsCodes.has(anchorCode) && !implantologyCodes.has(anchorCode)) return "prosthetics";
  if (restorativeCodes.has(anchorCode) && !implantologyCodes.has(anchorCode)) return "restorative";
  if (codes.some((code) => falCmdCodes.has(code))) return "fal_cmd";
  if (codes.some((code) => endoCodes.has(code)) && codes.some((code) => endoCodes.has(code) || !anesthesiaCodes.has(code))) return "endo";
  if (implantologyCodes.has(anchorCode) || codes.every((code) => implantologyCodes.has(code))) return "implantology";
  if (codes.some((code) => prostheticsCodes.has(code)) && codes.some((code) => falCmdCodes.has(code) || prostheticsCodes.has(code))) return "prosthetics";
  if (codes.some((code) => restorativeCodes.has(code))) return "restorative";
  if (codes.some((code) => surgeryCodes.has(code))) return "surgery";
  if (codes.some((code) => diagnosticsCodes.has(code))) return "diagnostics";
  if (codes.some((code) => anesthesiaCodes.has(code))) return "anesthesia";
  const text = normalizeTableSearch(`${anchorCode} ${companionCode} ${anchorDescription} ${companionDescription} ${caseType}`);
  if (/implant|9000|9010|9100/.test(text)) return "implantology";
  if (/\b(?:fal|cmd|funktion)\b|8000|8010|8020|8050|8060/.test(text)) return "fal_cmd";
  if (/endo|wurzel|kanal|2360|2400|2410|2420|2430|2440/.test(text)) return "endo";
  if (/paro|parodont|4070|4075|4080|4090|4100/.test(text)) return "paro";
  if (/chirurg|extraktion|ost|wund|naht|3010|3030|3040|3050|3060|3290|3300|4040|0530/.test(text)) return "surgery";
  if (/krone|bruecke|prothese|prothetik|2200|2210|2270|2310|5010|5040|5180/.test(text)) return "prosthetics";
  if (/fuellung|komposit|adhäsiv|adhesiv|0065|2030|2050|2060|2070|2080|2090|2100|2110|2120|2197/.test(text)) return "restorative";
  if (/anaesth|anästh|0080|0090|0100/.test(text)) return "anesthesia";
  if (/diagnost|beratung|0010|0070|a1|a5|ä1|ä5/.test(text)) return "diagnostics";
  return "unknown";
}

function hasRequiredContextCode(rule: BillingPatternRule | undefined, presentCodes: string[]) {
  if (!rule?.requiresContextCodes?.length) return true;
  const present = new Set(presentCodes);
  return rule.requiresContextCodes.some((code) => present.has(code));
}

function evaluateInvoiceQualityPattern(input: {
  rule?: BillingPatternRule;
  anchorCode: string;
  companionCode: string;
  anchorDescription: string;
  companionDescription: string;
  caseType: string;
  groupAnchorCount: number;
  groupRate: number;
  targetAnchorCount: number;
  targetRate: number;
  confidenceGap: number;
  potential: number;
  affectedInvoices: InvoiceQualityAffectedInvoice[];
  comparisonBasis: string;
}) {
  const presentCodes = [...new Set(input.affectedInvoices.flatMap((invoice) => invoice.presentCodes))];
  const rule = input.rule;
  const context = rule?.context ?? inferPatternContext(input.anchorCode, input.companionCode, input.anchorDescription, input.companionDescription, input.caseType);
  const contextMatch = hasRequiredContextCode(rule, presentCodes);
  const lowCaseCount = input.targetAnchorCount < Math.max(8, rule?.minLocationCases ?? 0) || input.groupAnchorCount < 18;
  const veryLowCaseCount = input.targetAnchorCount < 5 || input.groupAnchorCount < 10;
  const weakByThreshold = input.groupRate < (rule?.minGroupUsageRate ?? 0.45)
    || input.confidenceGap < (rule?.minDeltaRate ?? 0.18)
    || input.potential < (rule?.minComparisonValue ?? 0);

  let classification: InvoiceQualityPatternClassification;
  if (!rule) classification = "unklassifiziert";
  else if (rule.plausibility === "weak" || !contextMatch || rule.suppressIfOnlyTrigger || weakByThreshold || lowCaseCount) classification = "schwach_statistisch";
  else if (rule.plausibility === "strong") classification = "fachlich_naheliegend";
  else classification = "kontextabhaengig";

  const deltaRateScore = Math.min(28, Math.max(0, input.confidenceGap) * 100 * 0.42);
  const comparisonValueScore = Math.min(18, Math.log10(Math.max(1, input.potential)) * 4.2);
  const caseCountScore = Math.min(16, Math.sqrt(Math.max(0, input.targetAnchorCount)) * 3.1 + Math.sqrt(Math.max(0, input.groupAnchorCount)) * 0.55);
  const groupRateScore = Math.min(10, input.groupRate * 12);
  const targetRatePenalty = Math.min(8, input.targetRate * 8);
  const plausibilityScore = rule?.plausibility === "strong" ? 18 : rule?.plausibility === "contextual" ? 10 : rule?.plausibility === "weak" ? 2 : -8;
  const contextMatchScore = contextMatch ? 8 : -12;
  const lowSamplePenalty = veryLowCaseCount ? 32 : lowCaseCount ? 22 : 0;
  const unclassifiedPenalty = classification === "unklassifiziert" ? 24 : classification === "schwach_statistisch" ? 12 : 0;
  const score = Math.max(0, Math.min(100, Math.round(
    deltaRateScore
    + comparisonValueScore
    + caseCountScore
    + groupRateScore
    + plausibilityScore
    + contextMatchScore
    + (rule?.priorityBoost ?? 0)
    - (rule?.priorityPenalty ?? 0)
    - targetRatePenalty
    - lowSamplePenalty
    - unclassifiedPenalty
  )));
  const cappedScore = veryLowCaseCount
    ? Math.min(score, 39)
    : lowCaseCount
      ? Math.min(score, 54)
      : classification === "unklassifiziert"
        ? Math.min(score, input.potential >= 2500 && input.confidenceGap >= 0.45 ? 62 : 44)
        : classification === "schwach_statistisch"
          ? Math.min(score, 54)
          : score;
  const priority: InvoiceQualityPatternPriority = cappedScore >= 75 ? "hoch" : cappedScore >= 45 ? "mittel" : "niedrig";

  return {
    score: cappedScore,
    priority,
    classification,
    context,
    contextLabel: contextLabels[context],
    lowCaseCount,
    comparisonBasis: input.comparisonBasis
  };
}

export function matchingInvoiceQualityRule(anchorCode: string, companionCode: string, caseType: string) {
  return invoiceQualityRules.find((rule) =>
    rule.active !== false &&
    rule.anchorCodes.includes(anchorCode) &&
    rule.companionCode === companionCode &&
    (!rule.caseType || rule.caseType === caseType)
  );
}

export function invoiceQualityFindingMeta(
  rule: InvoiceQualityRule | undefined,
  anchorCode: string,
  anchorDescription: string,
  companionCode: string,
  companionDescription: string,
  caseType: string
) {
  const serviceArea = caseType || "Allgemein";
  const topicCluster = rule?.topicCluster ?? invoiceQualityTopicCluster(companionCode, companionDescription, serviceArea);
  const flowHint = isQualityTreatmentFlowHint(anchorCode, companionCode, anchorDescription, companionDescription, serviceArea);
  const overlapHint = isQualityOverlapHint(rule, anchorDescription, companionDescription);
  const hintType: InvoiceQualityHintType = rule?.hintType
    ?? (flowHint ? "Behandlungsverlauf" : overlapHint ? "Überschneidungsrisiko" : rule ? "Kataloghinweis" : "Datenmuster");
  const precheckStatus: InvoiceQualityPrecheckStatus = rule?.precheckStatus
    ?? (flowHint || overlapHint ? "Vorsichtig einordnen" : rule ? "Regel hinterlegt" : "Keine Regel vorhanden");
  const orientationLevel: InvoiceQualityOrientationLevel = rule?.orientationLevel
    ?? (flowHint || overlapHint ? "vorsichtig einordnen" : rule?.confidence === "hoch" ? "naheliegend" : "einzelfallabhängig");
  const explanation = rule?.rationale ?? "Dieser Hinweis wurde aus dem Standortvergleich erkannt. Für diese Kombination, diesen Leistungsbereich oder diese Auswertungsart ist noch keine fachlich hinterlegte Regel vorhanden. Bitte vor Ort einordnen, ob dies fachlich relevant sein kann.";

  return {
    analysisType: rule?.analysisType ?? "position_combination" as InvoiceQualityAnalysisType,
    serviceArea,
    topicCluster,
    hintArea: `${serviceArea} · ${topicCluster}`,
    anomalyLabel: `${anchorCode} -> ${companionCode}`,
    hintType,
    precheckStatus,
    orientationLevel,
    status: "offen" as InvoiceQualityStatus,
    shortTitle: rule?.title ?? "Datenmuster aus Standortvergleich",
    explanation: sanitizeLeaderChainText(explanation),
    requiredContext: rule?.requiredContext ?? ["vergleichbare Fälle", "Behandlungsablauf", "Leistungsinhalt", "Dokumentation"],
    documentationHints: rule?.documentationHints ?? ["tatsächliche Leistungserbringung", "Befund/Anlass", "Sitzung und Zahn-/Regionbezug", "Faktorbegründung, falls relevant"],
    cautionNotes: rule?.cautionNotes ?? ["Keine automatische Fehlerbewertung.", "Kein Auftrag zur Rechnungsänderung.", "Bitte vor Ort fachlich einordnen."],
    sources: rule?.sources ?? (rule?.source ? [{ title: rule.source, sourceType: "Sonstige" as const, note: "Interne Orientierung; bitte bei Bedarf fachlich verifizieren." }] : []),
    leaderQuestion: hintType === "Faktorhinweis"
      ? "Ist der verwendete Faktor fachlich begründet und dokumentiert, oder weicht die Routine vom Gruppenmuster ab?"
      : hintType === "Leistungsbereichshinweis"
        ? "Ist die Abweichung durch den Behandlungsablauf erklärbar oder besteht ein Dokumentations-/Routinepotenzial?"
        : "Kommt diese Begleitleistung fachlich in Betracht und wird sie in passenden Fällen nachvollziehbar dokumentiert?"
  };
}

function invoiceQualityTopicCluster(code: string, description = "", caseType = ""): InvoiceQualityTopicCluster {
  const topic = invoiceQualityCompanionTopic(code, description, caseType);
  if (topic === "Adhäsive Befestigung") return "Adhäsive Befestigung";
  if (topic === "FAL / Funktion") return "ZE/FAL-Zentrallage";
  if (topic === "Endodontie") return "Endodontie";
  if (topic === "Implantat-Fallverlauf") return "Implantat-Fallverlauf";
  if (topic === "Prophylaxe / PZR") return "Prophylaxe/PZR";
  if (topic === "Beratung / Diagnostik") return "Beratung/Diagnostik";
  if (topic === "Chirurgie / Nachbehandlung" || topic === "Anästhesie") return "Chirurgie/Nachbehandlung";
  if (topic === "ZE / Implantat / Labor") return "Material / Labor / Fremdlabor";
  const text = normalizeChainText(`${code} ${description} ${caseType}`);
  if (text.includes("analog") || text.includes("§ 6") || text.includes("paragraph 6")) return "Analogpositionen";
  if (text.includes("faktor") || text.includes("steigerung")) return "Faktoren / Steigerungssätze";
  return "Sonstige / ungeklärt";
}

function isQualityTreatmentFlowHint(anchorCode: string, companionCode: string, anchorDescription: string, companionDescription: string, caseType: string) {
  const text = normalizeChainText(`${anchorCode} ${companionCode} ${anchorDescription} ${companionDescription} ${caseType}`);
  return text.includes("implantat-fallverlauf") || text.includes("behandlungsverlauf") || treatmentFlowAnchorPatterns.some((pattern) => pattern.test(anchorCode)) && treatmentFlowCompanionPatterns.some((pattern) => pattern.test(companionCode));
}

function isQualityOverlapHint(rule: InvoiceQualityRule | undefined, anchorDescription: string, companionDescription: string) {
  const text = normalizeChainText(`${rule?.rationale ?? ""} ${(rule?.cautionNotes ?? []).join(" ")} ${anchorDescription} ${companionDescription}`);
  return text.includes("uberschneidung") || text.includes("gleiche sitzung") || text.includes("gleicher zahn") || text.includes("ausschluss");
}

export function buildInvoiceQualityFindingsFromProfiles(
  analysisInvoices: InvoiceQualityProfile[],
  targetStandorte: Standort[],
  options: { minGroupRate: number; minCaseCount: number; minPotential: number }
): InvoiceQualityFinding[] {
  const findings: InvoiceQualityFinding[] = [];

  targetStandorte.forEach((standort) => {
    const targetInvoices = analysisInvoices.filter((invoice) => invoice.standortId === standort.id || invoice.standortName === standort.name);
    if (!targetInvoices.length) return;
    const targetInvoicesByAnchor = indexInvoiceQualityProfilesByAnchor(targetInvoices);
    const comparisonInvoices = analysisInvoices.filter((invoice) => invoice.standortId !== standort.id && invoice.standortName !== standort.name);
    const groupStats = invoiceQualityGroupStats(comparisonInvoices.length ? comparisonInvoices : analysisInvoices);
    const comparisonBasis = comparisonInvoices.length
      ? "übrige Gruppe ohne ausgewählten Standort"
      : "Gruppe inkl. ausgewähltem Standort";

    groupStats.forEach((groupStat, pairKey) => {
      if (groupStat.anchorCount < options.minCaseCount) return;
      const groupRate = groupStat.anchorCount ? groupStat.togetherCount / groupStat.anchorCount : 0;
      if (groupRate < options.minGroupRate) return;

      const targetWithAnchor = targetInvoicesByAnchor.get(`${groupStat.caseType}|${groupStat.anchorCode}`) ?? [];
      if (targetWithAnchor.length < Math.max(3, Math.ceil(options.minCaseCount / 2))) return;
      const targetTogether = targetWithAnchor.filter((invoice) => invoice.codeSet.has(groupStat.companionCode));
      const targetRate = targetWithAnchor.length ? targetTogether.length / targetWithAnchor.length : 0;
      const confidenceGap = groupRate - targetRate;
      if (confidenceGap < 0.18) return;

      const affectedInvoices = targetWithAnchor
        .filter((invoice) => !invoice.codeSet.has(groupStat.companionCode))
        .map((invoice): InvoiceQualityAffectedInvoice => ({
          key: `${invoice.invoiceNo}-${invoice.bfsNo}-${pairKey}`,
          invoiceNo: invoice.invoiceNo || "-",
          bfsNo: invoice.bfsNo || "-",
          invoiceDate: invoice.invoiceDate || "-",
          patientName: invoice.patientName || "-",
          amount: invoice.amount,
          presentCodes: invoice.codes
        }));
      if (!affectedInvoices.length) return;

      const expectedMissing = Math.max(0, targetWithAnchor.length * groupRate - targetTogether.length);
      const missingEstimate = Math.min(affectedInvoices.length, Math.round(expectedMissing));
      const avgCompanionAmount = groupStat.companionAmountCount ? groupStat.companionAmountSum / groupStat.companionAmountCount : 0;
      const potential = missingEstimate * avgCompanionAmount;
      if (potential < options.minPotential) return;
      const rule = matchingInvoiceQualityRule(groupStat.anchorCode, groupStat.companionCode, groupStat.caseType);
      const patternRule = matchingBillingPatternRule(groupStat.anchorCode, groupStat.companionCode);
      const meta = invoiceQualityFindingMeta(
        rule,
        groupStat.anchorCode,
        groupStat.anchorDescription,
        groupStat.companionCode,
        groupStat.companionDescription,
        groupStat.caseType
      );
      const patternAssessment = evaluateInvoiceQualityPattern({
        rule: patternRule,
        anchorCode: groupStat.anchorCode,
        companionCode: groupStat.companionCode,
        anchorDescription: groupStat.anchorDescription,
        companionDescription: groupStat.companionDescription,
        caseType: groupStat.caseType,
        groupAnchorCount: groupStat.anchorCount,
        groupRate,
        targetAnchorCount: targetWithAnchor.length,
        targetRate,
        confidenceGap,
        potential,
        affectedInvoices,
        comparisonBasis
      });

      findings.push({
        key: `${standort.id}-${pairKey}`,
        ...meta,
        ...patternAssessment,
        standortId: standort.id,
        standortName: standort.name,
        caseType: groupStat.caseType,
        anchorCode: groupStat.anchorCode,
        anchorDescription: groupStat.anchorDescription,
        companionCode: groupStat.companionCode,
        companionDescription: groupStat.companionDescription,
        groupAnchorCount: groupStat.anchorCount,
        groupTogetherCount: groupStat.togetherCount,
        groupRate,
        targetAnchorCount: targetWithAnchor.length,
        targetTogetherCount: targetTogether.length,
        targetRate,
        confidenceGap,
        missingEstimate,
        avgCompanionAmount,
        potential,
        rule,
        affectedInvoices
      });
    });
  });

  return findings.sort((a, b) => Number(Boolean(b.rule)) - Number(Boolean(a.rule))
    || b.score - a.score
    || b.potential - a.potential
    || b.confidenceGap - a.confidenceGap
    || b.targetAnchorCount - a.targetAnchorCount
    || a.standortName.localeCompare(b.standortName, "de")
    || a.anchorCode.localeCompare(b.anchorCode, "de", { numeric: true }));
}

export function buildInvoiceQualityFactorDeviationFindingsFromProfiles(
  analysisInvoices: InvoiceQualityProfile[],
  targetStandorte: Standort[],
  options: { minCaseCount: number; minPotential: number; minFactorDeviation?: number }
): InvoiceQualityFinding[] {
  const groupByCode = new Map<string, {
    code: string;
    description: string;
    caseType: string;
    factorSum: number;
    amountSum: number;
    count: number;
  }>();

  analysisInvoices.forEach((invoice) => {
    invoice.lineByCode.forEach((line, code) => {
      if (!Number.isFinite(line.factor) || !line.factor) return;
      const key = `${invoice.caseType}|${code}`;
      const current = groupByCode.get(key) ?? {
        code,
        description: line.description || code,
        caseType: invoice.caseType,
        factorSum: 0,
        amountSum: 0,
        count: 0
      };
      current.factorSum += line.factor;
      current.amountSum += Math.max(0, line.amount);
      current.count += 1;
      if ((line.description?.length ?? 0) < current.description.length) current.description = line.description || current.description;
      groupByCode.set(key, current);
    });
  });

  const findings: InvoiceQualityFinding[] = [];
  targetStandorte.forEach((standort) => {
    const targetInvoices = analysisInvoices.filter((invoice) => invoice.standortId === standort.id || invoice.standortName === standort.name);
    if (!targetInvoices.length) return;
    const targetFactorLinesByCode = indexInvoiceQualityFactorLines(targetInvoices);

    groupByCode.forEach((groupStat) => {
      if (groupStat.count < options.minCaseCount) return;
      const targetLines = targetFactorLinesByCode.get(`${groupStat.caseType}|${groupStat.code}`) ?? [];
      if (targetLines.length < Math.max(3, Math.ceil(options.minCaseCount / 2))) return;

      const groupAverageFactor = groupStat.factorSum / groupStat.count;
      const amountAverageGroup = groupStat.amountSum / groupStat.count;
      const practiceAverageFactor = targetLines.reduce((sum, entry) => sum + (entry.line.factor ?? 0), 0) / targetLines.length;
      const amountAveragePractice = targetLines.reduce((sum, entry) => sum + Math.max(0, entry.line.amount), 0) / targetLines.length;
      const factorDeviation = practiceAverageFactor - groupAverageFactor;
      const minDeviation = options.minFactorDeviation ?? 0.35;
      if (Math.abs(factorDeviation) < minDeviation) return;

      const affectedInvoices = targetLines.map(({ invoice }): InvoiceQualityAffectedInvoice => ({
        key: `${invoice.invoiceNo}-${invoice.bfsNo}-factor-${groupStat.caseType}-${groupStat.code}`,
        invoiceNo: invoice.invoiceNo || "-",
        bfsNo: invoice.bfsNo || "-",
        invoiceDate: invoice.invoiceDate || "-",
        patientName: invoice.patientName || "-",
        amount: invoice.amount,
        presentCodes: invoice.codes
      }));
      const confidenceGap = Math.min(1, Math.abs(factorDeviation) / Math.max(groupAverageFactor, 1));
      const potential = factorDeviation < 0
        ? Math.max(0, (amountAverageGroup - amountAveragePractice) * targetLines.length)
        : 0;
      if (potential < options.minPotential) return;
      const meta = invoiceQualityFindingMeta(undefined, groupStat.code, groupStat.description, "Faktor", "Abweichender Gebührenfaktor / Steigerungssatz", groupStat.caseType);
      const factorLowCaseCount = targetLines.length < 8 || groupStat.count < 12;
      const factorScore = Math.max(0, Math.min(factorLowCaseCount ? 64 : 100, Math.round(
        Math.min(30, confidenceGap * 100 * 0.6)
        + Math.min(18, Math.log10(Math.max(1, potential)) * 4.2)
        + Math.min(18, Math.sqrt(targetLines.length) * 3.2)
        + 8
        - (factorLowCaseCount ? 18 : 0)
      )));
      const factorPriority: InvoiceQualityPatternPriority = factorScore >= 75 ? "hoch" : factorScore >= 45 ? "mittel" : "niedrig";

      findings.push({
        key: `${standort.id}-${groupStat.caseType}-${groupStat.code}-factor-deviation`,
        ...meta,
        analysisType: "factor_deviation",
        topicCluster: "Faktoren / Steigerungssätze",
        hintArea: `${groupStat.caseType} · Faktoren / Steigerungssätze`,
        anomalyLabel: `${groupStat.code}: Ø Faktor ${roundOneDecimal(practiceAverageFactor)} statt Gruppe ${roundOneDecimal(groupAverageFactor)}`,
        companionCode: "Faktor",
        companionDescription: "Abweichender Gebührenfaktor / Steigerungssatz",
        hintType: "Faktorhinweis",
        precheckStatus: "Keine Regel vorhanden",
        orientationLevel: "einzelfallabhängig",
        shortTitle: "Faktorabweichung aus Standortvergleich",
        explanation: "Bei dieser Position oder diesem Leistungsbereich weicht der verwendete Faktor vom Gruppenmuster ab. Bitte schauen Sie, ob der Faktor fachlich begründet, dokumentiert und konsistent angewendet wird.",
        requiredContext: ["Leistungsinhalt", "Schwierigkeit/Zeitaufwand", "Dokumentation der Faktorbegründung", "interne Abrechnungsroutine"],
        documentationHints: ["Faktorbegründung", "Behandlungsaufwand", "einheitliche Anwendung vergleichbarer Fälle"],
        cautionNotes: ["Faktorabweichung ist kein Fehlernachweis.", "Bitte vor Ort anhand Behandlungsablauf und Dokumentation einordnen."],
        leaderQuestion: "Ist der bei euch verwendete Faktor fachlich begründet und dokumentiert, oder weicht eure Routine hier vom Gruppenstandard ab?",
        factor: practiceAverageFactor,
        groupAverageFactor,
        practiceAverageFactor,
        factorDeviation,
        amountAverageGroup,
        amountAveragePractice,
        amountDeviation: amountAveragePractice - amountAverageGroup,
        metricName: "Durchschnittlicher Faktor",
        metricValueGroup: groupAverageFactor,
        metricValuePractice: practiceAverageFactor,
        metricDeviation: factorDeviation,
        standortId: standort.id,
        standortName: standort.name,
        caseType: groupStat.caseType,
        serviceArea: groupStat.caseType,
        anchorCode: groupStat.code,
        anchorDescription: groupStat.description,
        groupAnchorCount: groupStat.count,
        groupTogetherCount: groupStat.count,
        groupRate: groupAverageFactor,
        targetAnchorCount: targetLines.length,
        targetTogetherCount: targetLines.length,
        targetRate: practiceAverageFactor,
        confidenceGap,
        missingEstimate: targetLines.length,
        avgCompanionAmount: Math.max(0, amountAverageGroup - amountAveragePractice),
        potential,
        score: factorScore,
        priority: factorPriority,
        classification: factorLowCaseCount ? "schwach_statistisch" : "kontextabhaengig",
        context: "unknown",
        contextLabel: "Faktoren / Steigerungssätze",
        lowCaseCount: factorLowCaseCount,
        comparisonBasis: "Gruppe inkl. ausgewähltem Standort",
        affectedInvoices
      });
    });
  });

  return findings.sort((a, b) =>
    b.confidenceGap - a.confidenceGap
    || b.targetAnchorCount - a.targetAnchorCount
    || a.standortName.localeCompare(b.standortName, "de")
    || a.anchorCode.localeCompare(b.anchorCode, "de", { numeric: true })
  );
}

function indexInvoiceQualityProfilesByAnchor(invoices: InvoiceQualityProfile[]) {
  const byAnchor = new Map<string, InvoiceQualityProfile[]>();
  invoices.forEach((invoice) => {
    invoice.codes.forEach((code) => {
      const key = `${invoice.caseType}|${code}`;
      const rows = byAnchor.get(key);
      if (rows) rows.push(invoice);
      else byAnchor.set(key, [invoice]);
    });
  });
  return byAnchor;
}

function indexInvoiceQualityFactorLines(invoices: InvoiceQualityProfile[]) {
  const byCode = new Map<string, Array<{ invoice: InvoiceQualityProfile; line: ParsedInvoiceLine }>>();
  invoices.forEach((invoice) => {
    invoice.lineByCode.forEach((line, code) => {
      if (!Number.isFinite(line.factor) || !line.factor) return;
      const key = `${invoice.caseType}|${code}`;
      const rows = byCode.get(key);
      const entry = { invoice, line };
      if (rows) rows.push(entry);
      else byCode.set(key, [entry]);
    });
  });
  return byCode;
}

export function buildInvoiceQualityProfile(
  invoice: ParsedInvoiceDocument,
  canonicalizeLine: (line: ParsedInvoiceLine) => ParsedInvoiceLine,
  lineReadyForAnalysis: (line: ParsedInvoiceLine) => boolean
): InvoiceQualityProfile {
  const lineByCode = new Map<string, ParsedInvoiceLine>();
  invoice.serviceLines
    .map((line) => canonicalizeLine(line))
    .filter(lineReadyForAnalysis)
    .forEach((line) => {
      const current = lineByCode.get(line.code);
      if (!current || Math.abs(line.amount) > Math.abs(current.amount)) lineByCode.set(line.code, line);
    });
  const codes = [...lineByCode.keys()].sort((a, b) => a.localeCompare(b, "de", { numeric: true }));
  return {
    invoice,
    standortId: invoice.standortId,
    standortName: invoice.standortName,
    invoiceNo: invoice.invoiceNo,
    bfsNo: invoice.bfsNo,
    invoiceDate: invoice.invoiceDate,
    patientName: invoice.patientName,
    amount: invoice.totalAmount || invoice.openAmount,
    codes,
    codeSet: new Set(codes),
    lineByCode,
    caseType: invoiceQualityCaseType([...lineByCode.values()], invoice)
  };
}

export function filterInvoiceQualityFindings(
  rows: InvoiceQualityFinding[],
  caseType: string,
  searchTerm: string,
  basisFilter: "regeln" | "alle" = "alle"
) {
  const terms = normalizeTableSearch(searchTerm).split(" ").filter(Boolean);
  return rows.filter((row) => {
    if (caseType !== "alle" && row.caseType !== caseType) return false;
    if (basisFilter === "regeln" && !row.rule) return false;
    if (!terms.length) return true;
    const haystack = normalizeTableSearch([
      row.standortName,
      row.caseType,
      row.anchorCode,
      row.anchorDescription,
      row.companionCode,
      row.companionDescription,
      row.serviceArea,
      row.topicCluster,
      row.hintType,
      row.precheckStatus,
      row.orientationLevel,
      row.status
    ].join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

export function invoiceQualityKpis(rows: InvoiceQualityFinding[]) {
  const affectedInvoiceKeys = new Set<string>();
  rows.forEach((row) => row.affectedInvoices.forEach((invoice) => affectedInvoiceKeys.add(invoice.key)));
  return {
    count: rows.length,
    potential: rows.reduce((sum, row) => sum + row.potential, 0),
    affectedInvoices: affectedInvoiceKeys.size,
    highPriority: rows.filter((row) => row.priority === "hoch").length,
    mediumPriority: rows.filter((row) => row.priority === "mittel").length,
    lowPriority: rows.filter((row) => row.priority === "niedrig").length,
    unclassified: rows.filter((row) => row.classification === "unklassifiziert").length,
    topFinding: rows[0],
    biggestGap: [...rows].sort((a, b) => b.confidenceGap - a.confidenceGap || b.score - a.score || b.potential - a.potential)[0],
    caseTypeCount: new Set(rows.map((row) => row.caseType)).size
  };
}

export function matchInvoiceQualityChainRule(anchorCode: string, companionCodes: string[], caseType: string, rules = invoiceQualityChainRules) {
  const companionSet = new Set(companionCodes);
  return rules
    .filter((rule) => rule.mainCode === anchorCode && (!rule.fallType || rule.fallType === caseType))
    .filter((rule) => rule.companionCodes.every((code) => companionSet.has(code)))
    .sort((a, b) => b.companionCodes.length - a.companionCodes.length)[0];
}

export function matchInvoiceQualityCatalogPlausibility(
  anchorCode: string,
  companionCodes: string[],
  caseType: string,
  topic: InvoiceQualityChainTopic,
  rules = invoiceQualityCatalogPlausibilityRules
) {
  const activeMatches = rules
    .filter((rule) => rule.active)
    .filter((rule) => catalogPlausibilityRuleMatches(rule, anchorCode, companionCodes, caseType, topic));
  const matchedRule = activeMatches.sort((a, b) =>
    catalogPlausibilityMatchRank(a.matchType) - catalogPlausibilityMatchRank(b.matchType)
    || catalogPlausibilityWarningRank(b.catalogPlausibilityLevel) - catalogPlausibilityWarningRank(a.catalogPlausibilityLevel)
    || (b.companionCodes?.length ?? Number(Boolean(b.companionCode))) - (a.companionCodes?.length ?? Number(Boolean(a.companionCode)))
  )[0];
  if (matchedRule) return catalogPlausibilityFromRule(matchedRule);
  return {
    catalogPlausibilityLevel: "E" as const,
    catalogPlausibilityLabel: "nur Datenmuster",
    catalogPlausibilityExplanation: "Andere Standorte rechnen diese Begleitpositionen bei ähnlichen Fällen häufiger mit. Für diese Kette ist noch keine fachliche Regel hinterlegt. Bitte bei passenden Fällen fachlich einordnen.",
    catalogPlausibilitySources: [],
    catalogPlausibilityRuleId: undefined,
    catalogPlausibilityStatus: "keine_regel" as const,
    catalogRequiredContext: ["vergleichbare Fälle", "Behandlungsablauf", "Dokumentation"],
    catalogDocumentationHints: ["tatsächliche Leistungserbringung", "Sitzung/Zahn-/Kanalbezug", "interne Abrechnungsroutine"],
    catalogCautionNotes: ["Nur Datenmuster ohne fachlich hinterlegte Regel.", "Keine automatische Abrechnungsempfehlung."]
  };
}

function catalogPlausibilityFromRule(rule: InvoiceQualityCatalogPlausibilityRule) {
  return {
    catalogPlausibilityLevel: rule.catalogPlausibilityLevel,
    catalogPlausibilityLabel: rule.label,
    catalogPlausibilityExplanation: rule.explanation,
    catalogPlausibilitySources: rule.sources,
    catalogPlausibilityRuleId: rule.ruleId,
    catalogPlausibilityStatus: "regel_hinterlegt" as const,
    catalogRequiredContext: rule.requiredContext,
    catalogDocumentationHints: rule.documentationHints,
    catalogCautionNotes: rule.cautionNotes
  };
}

function catalogPlausibilityRuleMatches(
  rule: InvoiceQualityCatalogPlausibilityRule,
  anchorCode: string,
  companionCodes: string[],
  caseType: string,
  topic: InvoiceQualityChainTopic
) {
  const companions = new Set(companionCodes);
  const fallTypeMatches = !rule.fallType || rule.fallType === caseType;
  const topicMatches = !rule.topicCluster || rule.topicCluster === topic || (rule.topicCluster === "Prophylaxe / PZR" && caseType === "Prophylaxe/PZR");
  const companionMatches = rule.companionCodes?.some((code) => companions.has(code)) ?? (rule.companionCode ? companions.has(rule.companionCode) : true);
  switch (rule.matchType) {
    case "exact_chain":
      return rule.triggerCode === anchorCode && fallTypeMatches && (rule.companionCodes?.every((code) => companions.has(code)) ?? companionMatches);
    case "trigger_companion":
      return rule.triggerCode === anchorCode && fallTypeMatches && companionMatches;
    case "trigger_only":
      return rule.triggerCode === anchorCode && fallTypeMatches;
    case "falltype_context":
      return fallTypeMatches && companionMatches;
    case "cluster_context":
      return topicMatches && companionMatches;
    case "companion_only":
      return companionMatches;
  }
}

function catalogPlausibilityMatchRank(matchType: InvoiceQualityCatalogPlausibilityMatchType) {
  const order: Record<InvoiceQualityCatalogPlausibilityMatchType, number> = {
    exact_chain: 1,
    trigger_companion: 2,
    falltype_context: 3,
    cluster_context: 4,
    companion_only: 5,
    trigger_only: 6
  };
  return order[matchType];
}

function catalogPlausibilityWarningRank(level: InvoiceQualityCatalogPlausibilityLevel) {
  const order: Record<InvoiceQualityCatalogPlausibilityLevel, number> = { D: 5, C: 4, B: 2, A: 3, E: 0 };
  return order[level];
}

export function invoiceQualityChainSourceStatus(rule?: InvoiceQualityChainRule, now = new Date()) : InvoiceQualityChainSourceStatus {
  if (!rule || !rule.sources.length) return "keine_quelle";
  if (rule.sources.some((source) => source.status === "widersprüchlich")) return "widersprüchlich";
  if (rule.sources.some((source) => source.status === "veraltet")) return "review_erforderlich";
  if (rule.sources.some((source) => source.status === "ungeprüft")) return "ungeprüft";
  if (rule.sources.some((source) => source.checkedAt && monthsBetween(source.checkedAt, now) > 12)) return "review_erforderlich";
  return "validiert";
}

export function invoiceQualityChainRiskLevel(rule?: InvoiceQualityChainRule, sourceStatus: InvoiceQualityChainSourceStatus = "keine_quelle"): InvoiceQualityChainRiskLevel {
  if (!rule) return "yellow";
  if (sourceStatus === "widersprüchlich") return rule.riskLevel === "red" ? "red" : "yellow";
  return rule.riskLevel;
}

const treatmentFlowAnchorPatterns = [/^32\d\d/, /^33\d\d/, /^90\d\d/, /^91\d\d/, /^Ä?5004$/, /^Ä?537[07]$/i];
const treatmentFlowCompanionPatterns = [/^90\d\d/, /^91\d\d/, /^00?90P$/i, /^33\d\d/, /^Ä?5004$/, /^Ä?537[07]$/i];

function normalizeChainText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function invoiceQualityCompanionTopic(code: string, description = "", caseType = ""): InvoiceQualityChainTopic {
  const text = normalizeChainText(`${code} ${description} ${caseType}`);
  if (text.includes("prophylaxe") || text.includes("pzr") || text.includes("zahnreinigung") || text.includes("mundhygiene")) return "Prophylaxe / PZR";
  if (text.includes("beratung") || text.includes("diagnost") || text.includes("untersuchung") || code.startsWith("Ä1") || code.startsWith("Ä6")) return "Beratung / Diagnostik";
  if (text.includes("endo") || text.includes("wurzel") || text.includes("kanal")) return "Endodontie";
  if (text.includes("fullung") || text.includes("komposit") || text.includes("adhasi")) return text.includes("befest") ? "Adhäsive Befestigung" : "Füllungstherapie";
  if (text.includes("implant") || text.includes("implantat") || /^9\d{3}/.test(code)) return /^9\d{3}/.test(code) ? "Implantat-Fallverlauf" : "ZE / Implantat / Labor";
  if (text.includes("labor") || text.includes("teleskop") || text.includes("krone") || text.includes("brucke") || text.includes("zahnersatz") || text.includes("ze/")) return "ZE / Implantat / Labor";
  if (text.includes("funktion") || text.includes("zentrallage") || text.includes("fal") || /^80\d\d/.test(code)) return "FAL / Funktion";
  if (text.includes("chirurg") || text.includes("wund") || text.includes("nachbehandlung") || text.includes("exzision") || /^3[23]\d\d/.test(code)) return "Chirurgie / Nachbehandlung";
  if (text.includes("anasth") || text.includes("anaesth") || text.includes("injektion") || /^00?90P$/i.test(code)) return "Anästhesie";
  if (text.includes("abform") || text.includes("scan") || text.includes("digital")) return "Digitale Abformung";
  if (text.includes("okklusion") || text.includes("biss") || text.includes("einschleif")) return "Okklusion";
  return "Sonstige";
}

function isTreatmentFlowChain(anchorCode: string, companions: InvoiceQualityChainCompanion[], caseType: string) {
  const text = normalizeChainText(`${anchorCode} ${caseType} ${companions.map((companion) => `${companion.code} ${companion.description}`).join(" ")}`);
  if (text.includes("implantat-fallverlauf") || text.includes("chirurgie") || text.includes("nachbehandlung")) return true;
  return treatmentFlowAnchorPatterns.some((pattern) => pattern.test(anchorCode))
    && companions.some((companion) => treatmentFlowCompanionPatterns.some((pattern) => pattern.test(companion.code)));
}

function hasOverlapRisk(rule?: InvoiceQualityChainRule, companions: InvoiceQualityChainCompanion[] = []) {
  const text = normalizeChainText(`${rule?.summary ?? ""} ${(rule?.warnings ?? []).join(" ")} ${(rule?.exclusions ?? []).join(" ")} ${companions.map((companion) => companion.description).join(" ")}`);
  return text.includes("uberschneidung") || text.includes("gleiche sitzung") || text.includes("gleicher zahn") || text.includes("leistungsinhalt") || text.includes("zeitbegrenz");
}

function chainRuleStatus(rule: InvoiceQualityChainRule | undefined, isTreatmentFlow: boolean, overlapRisk: boolean): InvoiceQualityChainRuleStatus {
  if (isTreatmentFlow || overlapRisk || rule?.riskLevel === "red") return "Vorsichtig einordnen";
  if (rule) return "Regel hinterlegt";
  return "Nur Datenmuster";
}

function chainClassification(rule: InvoiceQualityChainRule | undefined, isTreatmentFlow: boolean, overlapRisk: boolean, sourceStatus: InvoiceQualityChainSourceStatus): InvoiceQualityChainClassification {
  if (isTreatmentFlow || overlapRisk || rule?.riskLevel === "red") return "vorsichtig einordnen";
  if (!rule) return "nur Datenmuster";
  if (sourceStatus === "validiert" || rule.legalStatus === "fachlich_geprüft") return "naheliegend";
  if (rule.reviewStatus === "seed_ungeprüft" || rule.reviewStatus === "ungeprüft") return "Regel hinterlegt";
  return "einzelfallabhängig";
}

function chainHintType(rule: InvoiceQualityChainRule | undefined, isTreatmentFlow: boolean, overlapRisk: boolean): InvoiceQualityChainHintType {
  if (isTreatmentFlow) return "Behandlungsverlauf";
  if (overlapRisk) return "Überschneidungsrisiko";
  if (!rule) return "Datenmuster";
  return "Begleitposition";
}

function chainShortHint(classification: InvoiceQualityChainClassification, hintType: InvoiceQualityChainHintType, rule?: InvoiceQualityChainRule) {
  if (hintType === "Behandlungsverlauf") return "Behandlungsverlauf - zeitliche Zuordnung beachten.";
  if (hintType === "Überschneidungsrisiko") return "Vorsichtig einordnen - mögliche Überschneidung beachten.";
  if (!rule || classification === "nur Datenmuster") return "Nur Datenmuster - bitte bei passenden Fällen fachlich einordnen.";
  return "Regel hinterlegt - bitte bei passenden Fällen auf Leistung und Dokumentation achten.";
}

function chainDetailHint(hintType: InvoiceQualityChainHintType, rule?: InvoiceQualityChainRule) {
  if (hintType === "Behandlungsverlauf") {
    return "Diese Kette betrifft eher den Behandlungsverlauf. Andere Standorte zeigen diese Positionen bei ähnlichen Fällen häufiger gemeinsam. Bitte schauen Sie, ob die Begleitposition bei Ihnen zeitlich getrennt, bereits anderweitig abgerechnet, noch geplant oder fachlich nicht einschlägig ist.";
  }
  if (hintType === "Überschneidungsrisiko") {
    return "Diese Kette kann fachlich passen, sollte aber vorsichtig eingeordnet werden, weil Sitzung, Zahnbezug, Leistungsinhalt oder zeitliche Zuordnung eine Rolle spielen können.";
  }
  if (!rule) {
    return "Andere Standorte rechnen diese Begleitpositionen bei ähnlichen Fällen häufiger mit. Bitte schauen Sie, ob das bei passenden Fällen auch bei Ihnen fachlich zutrifft und dokumentiert ist.";
  }
  return sanitizeLeaderChainText(rule.summary);
}

function chainLeaderQuestion(hintType: InvoiceQualityChainHintType) {
  if (hintType === "Behandlungsverlauf") return "Sind diese Leistungen bei Ihnen zeitlich getrennt, bereits anderweitig abgerechnet, noch geplant oder fachlich nicht einschlägig?";
  return "Passen diese Begleitpositionen bei Ihren Fällen fachlich, werden aber bisher seltener dokumentiert oder abgerechnet?";
}

function sanitizeLeaderChainText(value: string) {
  return value
    .replace(/prüffähig/gi, "als Orientierung geeignet")
    .replace(/Nur Prüfhinweis\.?/gi, "Nur Orientierung.")
    .replace(/Einzelfallprüfung erforderlich\.?/gi, "Bitte bei passenden Fällen fachlich einordnen.")
    .replace(/Keine Nachberechnung aus Statistik ableiten\.?/gi, "Keine automatische Abrechnungsempfehlung.")
    .replace(/rechtlich zulässig/gi, "fachlich passend")
    .replace(/rechtlich geprüft/gi, "fachlich eingeordnet")
    .replace(/abrechenbar/gi, "fachlich passend");
}

export function buildInvoiceQualityChainFindings(rows: InvoiceQualityFinding[], minCompanions = 2, rules = invoiceQualityChainRules): InvoiceQualityChainFinding[] {
  const byAnchor = new Map<string, InvoiceQualityFinding[]>();
  rows.forEach((row) => {
    const key = `${row.standortId}|${row.caseType}|${row.anchorCode}`;
    byAnchor.set(key, [...(byAnchor.get(key) ?? []), row]);
  });

  const chains: InvoiceQualityChainFinding[] = [];
  byAnchor.forEach((anchorRows) => {
    const sortedCompanions = [...anchorRows].sort((a, b) =>
      b.potential - a.potential
      || b.confidenceGap - a.confidenceGap
      || b.groupRate - a.groupRate
      || a.companionCode.localeCompare(b.companionCode, "de", { numeric: true })
    );
    if (sortedCompanions.length < minCompanions) return;

    const representative = sortedCompanions[0];
    const affectedByKey = new Map<string, InvoiceQualityAffectedInvoice>();
    sortedCompanions.forEach((row) => row.affectedInvoices.forEach((invoice) => affectedByKey.set(invoice.key, invoice)));
    const companions = sortedCompanions.slice(0, 5).map((row): InvoiceQualityChainCompanion => ({
      code: row.companionCode,
      description: row.companionDescription,
      topic: invoiceQualityCompanionTopic(row.companionCode, row.companionDescription, row.caseType),
      groupRate: row.groupRate,
      targetRate: row.targetRate,
      confidenceGap: row.confidenceGap,
      missingEstimate: row.missingEstimate,
      avgAmount: row.avgCompanionAmount,
      potential: row.potential,
      rule: row.rule
    }));
    const matchedRule = matchInvoiceQualityChainRule(representative.anchorCode, companions.map((companion) => companion.code), representative.caseType, rules);
    const sourceStatus = invoiceQualityChainSourceStatus(matchedRule);
    const riskLevel = invoiceQualityChainRiskLevel(matchedRule, sourceStatus);
    const treatmentFlow = isTreatmentFlowChain(representative.anchorCode, companions, representative.caseType);
    const overlapRisk = hasOverlapRisk(matchedRule, companions);
    const classification = chainClassification(matchedRule, treatmentFlow, overlapRisk, sourceStatus);
    const hintType = chainHintType(matchedRule, treatmentFlow, overlapRisk);
    const ruleStatus = chainRuleStatus(matchedRule, treatmentFlow, overlapRisk);
    const topic = representative.caseType && representative.caseType !== "Unkategorisiert"
      ? invoiceQualityCompanionTopic(representative.anchorCode, representative.anchorDescription, representative.caseType)
      : companions[0]?.topic ?? "Sonstige";
    const catalogPlausibility = matchInvoiceQualityCatalogPlausibility(representative.anchorCode, companions.map((companion) => companion.code), representative.caseType, topic);
    const unknownWarnings = ["Bitte bei passenden Fällen fachlich einordnen.", "Keine automatische Abrechnungsempfehlung."];
    const detailHint = chainDetailHint(hintType, matchedRule);

    chains.push({
      key: `${representative.standortId}-${representative.caseType}-${representative.anchorCode}`,
      standortId: representative.standortId,
      standortName: representative.standortName,
      caseType: representative.caseType,
      anchorCode: representative.anchorCode,
      anchorDescription: representative.anchorDescription,
      groupAnchorCount: representative.groupAnchorCount,
      targetAnchorCount: representative.targetAnchorCount,
      companions,
      potential: companions.reduce((sum, companion) => sum + companion.potential, 0),
      affectedInvoices: [...affectedByKey.values()],
      codeSystem: matchedRule?.codeSystem ?? inferCodeSystem([representative.anchorCode, ...companions.map((companion) => companion.code)]),
      riskLevel,
      reviewStatus: matchedRule?.reviewStatus ?? "ungeprüft",
      sourceStatus,
      classification,
      hintType,
      ruleStatus,
      topic,
      ...catalogPlausibility,
      ruleSummary: matchedRule ? sanitizeLeaderChainText(matchedRule.summary) : "Andere Standorte rechnen diese Begleitpositionen bei ähnlichen Fällen häufiger mit. Bitte schauen Sie, ob das bei passenden Fällen auch bei Ihnen fachlich zutrifft und dokumentiert ist.",
      shortHint: chainShortHint(classification, hintType, matchedRule),
      detailHint,
      leaderQuestion: chainLeaderQuestion(hintType),
      requiredDocumentation: [...new Set([...(matchedRule?.requiredDocumentation ?? []), ...catalogPlausibility.catalogRequiredContext, ...catalogPlausibility.catalogDocumentationHints])].slice(0, 10),
      warnings: matchedRule?.warnings.length ? [...new Set([...matchedRule.warnings, ...catalogPlausibility.catalogCautionNotes])] : [...new Set([...unknownWarnings, ...catalogPlausibility.catalogCautionNotes])],
      exclusions: matchedRule?.exclusions ?? ["Sitzung, Zahnbezug, Leistungsinhalt und Zeitbezug fachlich einordnen"],
      sources: matchedRule?.sources ?? [],
      matchedRule
    });
  });

  return chains.sort((a, b) =>
    b.potential - a.potential
    || b.companions.length - a.companions.length
    || b.targetAnchorCount - a.targetAnchorCount
    || a.standortName.localeCompare(b.standortName, "de")
    || a.anchorCode.localeCompare(b.anchorCode, "de", { numeric: true })
  );
}

function inferCodeSystem(codes: string[]): InvoiceQualityChainRule["codeSystem"] {
  if (codes.some((code) => code.startsWith("Ä"))) return "GOÄ";
  if (codes.some((code) => /^[A-Z]/i.test(code))) return "Sonstige";
  return "GOZ";
}

function monthsBetween(dateIso: string, now: Date) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return 999;
  return (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth();
}

export function invoiceQualityChainKpis(rows: InvoiceQualityChainFinding[]) {
  const affectedInvoiceKeys = new Set<string>();
  rows.forEach((row) => row.affectedInvoices.forEach((invoice) => affectedInvoiceKeys.add(invoice.key)));
  return {
    count: rows.length,
    companionCount: rows.reduce((sum, row) => sum + row.companions.length, 0),
    potential: rows.reduce((sum, row) => sum + row.potential, 0),
    affectedInvoices: affectedInvoiceKeys.size,
    topChain: rows[0],
    strongestChain: [...rows].sort((a, b) => b.companions.length - a.companions.length || b.potential - a.potential)[0]
  };
}

export function createInvoiceQualityCsv(
  rows: InvoiceQualityFinding[],
  period: InvoiceQualityPeriod,
  previousFindingsByKey = new Map<string, InvoiceQualityFinding>(),
  introLines: string[] = []
) {
  const header = [
    "Zeitraum",
    "Standort",
    "Falltyp",
    "Auslöser-Ziffer",
    "Auslöser Beschreibung",
    "Auffällige Begleitziffer",
    "Begleitziffer Beschreibung",
    "Priorität",
    "Score",
    "Klassifikation",
    "Kontext",
    "Vergleichsbasis",
    "Fallzahlhinweis",
    "Gruppenquote",
    "Standortquote",
    "Entwicklung",
    "Hinweisart",
    "Einordnung",
    "Fachliche Vorprüfung",
    "Status",
    "Titel",
    "Quelle",
    "Betroffene Rechnungen",
    "Orientierungswert",
    "Kurztext"
  ];
  const body = rows.length ? rows.map((row) => [
    period.label,
    row.standortName,
    row.caseType,
    row.anchorCode,
    row.anchorDescription,
    row.companionCode,
    row.companionDescription,
    row.priority,
    String(row.score),
    invoiceQualityClassificationLabel(row.classification),
    row.contextLabel,
    row.comparisonBasis,
    row.lowCaseCount ? "Geringe Fallzahl - vorsichtig interpretieren" : "statistische Basis ausreichend",
    decimalCsv(row.groupRate * 100),
    decimalCsv(row.targetRate * 100),
    invoiceQualityTrendLabel(row, previousFindingsByKey.get(row.key)),
    row.hintType,
    row.orientationLevel,
    row.precheckStatus,
    row.status,
    row.shortTitle,
    row.rule?.source ?? "interne Musteranalyse",
    String(row.affectedInvoices.length),
    decimalCsv(row.potential),
    row.explanation
  ]) : [[period.label, "", "", "", "", "", "", "", "", "", "", "", "", "", "Keine Hinweise im Filter."]];
  const intro = introLines.length
    ? [
      ["Einordnung", "Wie dieser Report zu lesen ist"],
      ...introLines.map((line) => ["Einordnung", line]),
      []
    ]
    : [];
  return [...intro, header, ...body].map((row) => row.map(escapeTableCsv).join(";")).join("\n");
}

export function invoiceQualityClassificationLabel(classification: InvoiceQualityPatternClassification) {
  const labels: Record<InvoiceQualityPatternClassification, string> = {
    fachlich_naheliegend: "Fachlich naheliegender Prüfhinweis",
    kontextabhaengig: "Kontextabhängiger Prüfhinweis",
    schwach_statistisch: "Schwache statistische Auffälligkeit",
    unklassifiziert: "Unklassifizierte statistische Auffälligkeit - fachliche Regel noch nicht hinterlegt"
  };
  return labels[classification];
}

export function createInvoiceQualityChainCsv(
  rows: InvoiceQualityChainFinding[],
  period: InvoiceQualityPeriod,
  introLines: string[] = []
) {
  const header = [
    "Zeitraum",
    "Standort",
    "Falltyp",
    "Wenn Leistung",
    "Wenn Beschreibung",
    "Häufige Kombination",
    "Gruppenquoten",
    "Praxisquoten",
    "Abweichung",
    "Betroffene Rechnungen",
    "Orientierungswert",
    "Katalog-Plausibilität",
    "Katalog-Regelstatus",
    "Einordnung",
    "Prüfstatus",
    "Quellenstatus",
    "Notwendige Dokumentation",
    "Ausschlüsse/Warnungen",
    "Einordnung"
  ];
  const body = rows.length ? rows.map((row) => [
    period.label,
    row.standortName,
    row.caseType,
    row.anchorCode,
    row.anchorDescription,
    row.companions.map((companion) => `${companion.code} ${companion.description}`).join(" + "),
    row.companions.map((companion) => `${companion.code}: ${decimalCsv(companion.groupRate * 100)} %`).join(" | "),
    row.companions.map((companion) => `${companion.code}: ${decimalCsv(companion.targetRate * 100)} %`).join(" | "),
    String(row.companions.reduce((sum, companion) => sum + companion.missingEstimate, 0)),
    String(row.affectedInvoices.length),
    decimalCsv(row.potential),
    `${row.catalogPlausibilityLevel} · ${row.catalogPlausibilityLabel}`,
    row.catalogPlausibilityStatus,
    row.riskLevel,
    row.reviewStatus,
    row.sourceStatus,
    row.requiredDocumentation.join(" | "),
    [...row.warnings, ...row.exclusions].join(" | "),
    row.ruleSummary
  ]) : [[period.label, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Keine Mehrfachketten im Filter."]];
  const intro = introLines.length
    ? [
      ["Einordnung", "Wie dieser Report zu lesen ist"],
      ...introLines.map((line) => ["Einordnung", line]),
      []
    ]
    : [];
  return [...intro, header, ...body].map((row) => row.map(escapeTableCsv).join(";")).join("\n");
}

export function invoiceQualityExportIntro(scopeLabel: string) {
  return [
    "Die Hinweise leiten sich aus vorhandenen Einzelrechnungen, hinterlegten Abrechnungskatalog-/Kommentarlogiken und dem anonymisierten Standortvergleich ab.",
    `Gezeigt wird, welche Begleitleistungen, Faktoren oder Abrechnungsmuster bei ähnlichen Fällen in der Gruppe häufig sichtbar sind und bei ${scopeLabel} seltener oder abweichend vorkommen.`,
    "Das ist keine automatische Fehlerbewertung und kein Auftrag zur Rechnungsänderung, sondern eine fachliche Informationsgrundlage.",
    "Bitte ordnen Sie vor Ort anhand Behandlungsablauf, Dokumentation und Abrechnungsvorgaben ein, ob ein Hinweis im konkreten Fall fachlich passt."
  ];
}

export function invoiceQualityDefaultRecommendation(row: InvoiceQualityFinding) {
  return `Bei vergleichbaren Rechnungen läuft ${row.companionCode} häufig mit. Bitte anhand Katalog, Dokumentation und konkretem Behandlungsablauf fachlich einordnen, ob diese Begleitleistung anwendbar ist.`;
}

export function invoiceQualityTrendLabel(current: InvoiceQualityFinding, previous?: InvoiceQualityFinding) {
  if (!previous) return "neu / keine Basis";
  const rateDelta = current.targetRate - previous.targetRate;
  const gapDelta = current.confidenceGap - previous.confidenceGap;
  if (rateDelta >= 0.08 || gapDelta <= -0.08) return `verbessert ${formatPercent(Math.abs(rateDelta) * 100)}`;
  if (rateDelta <= -0.08 || gapDelta >= 0.08) return `verschlechtert ${formatPercent(Math.abs(rateDelta) * 100)}`;
  return "stabil";
}

export function invoiceQualityCaseType(lines: ParsedInvoiceLine[], invoice: ParsedInvoiceDocument) {
  const text = normalizeTableSearch(lines.map((line) => `${line.code} ${line.description}`).join(" "));
  const codes = new Set(lines.map((line) => line.code));
  if (text.includes("professionelle zahnreinigung") || codes.has("1040")) return "Prophylaxe/PZR";
  if (/\b(?:endo|wurzel|trepan|kanal|vitale?x|devital)\b/.test(text) || ["2360", "2380", "2390", "2400", "2410"].some((code) => codes.has(code))) return "Endodontie";
  if (/\b(?:krone|teilkrone|bruecke|prothese|implantat|abutment|zirkon|veneers?)\b/.test(text) || invoice.hasEigenlabor || invoice.hasFremdlabor) return "ZE/Implantat/Labor";
  if (/\b(?:fuellung|fllg|komposit|adhäsiv|adhesiv)\b/.test(text) || ["2050", "2060", "2070", "2080", "2090", "2100", "2110", "2120", "13A0", "13B0", "13C0", "13D0"].some((code) => codes.has(code))) return "Füllungstherapie";
  if (/\b(?:chirurg|extraktion|ost|zyst|wund|naht)\b/.test(text) || ["3000", "3010", "3020", "3030", "3040", "3050", "3060"].some((code) => codes.has(code))) return "Chirurgie";
  if (/\b(?:parodont|pa-|scaling|wurzelglättung)\b/.test(text) || ["4000", "4005", "4070", "4075"].some((code) => codes.has(code))) return "PAR";
  if ([...codes].some((code) => code.startsWith("Ä"))) return "Beratung/Diagnostik";
  return "Allgemein";
}

export function invoiceQualityGroupStats(invoices: InvoiceQualityProfile[]) {
  const byPair = new Map<string, {
    anchorCode: string;
    companionCode: string;
    anchorDescription: string;
    companionDescription: string;
    caseType: string;
    anchorCount: number;
    togetherCount: number;
    companionAmountSum: number;
    companionAmountCount: number;
  }>();
  const anchorCounts = new Map<string, number>();

  invoices.forEach((invoice) => {
    invoice.codes.forEach((anchorCode) => {
      const anchorKey = `${invoice.caseType}|${anchorCode}`;
      anchorCounts.set(anchorKey, (anchorCounts.get(anchorKey) ?? 0) + 1);
      invoice.codes.forEach((companionCode) => {
        if (anchorCode === companionCode) return;
        const pairKey = `${invoice.caseType}|${anchorCode}|${companionCode}`;
        const anchorLine = invoice.lineByCode.get(anchorCode);
        const companionLine = invoice.lineByCode.get(companionCode);
        const current = byPair.get(pairKey) ?? {
          anchorCode,
          companionCode,
          anchorDescription: anchorLine?.description ?? anchorCode,
          companionDescription: companionLine?.description ?? companionCode,
          caseType: invoice.caseType,
          anchorCount: 0,
          togetherCount: 0,
          companionAmountSum: 0,
          companionAmountCount: 0
        };
        current.togetherCount += 1;
        if (companionLine && companionLine.amount > 0) {
          current.companionAmountSum += companionLine.amount;
          current.companionAmountCount += 1;
        }
        if ((anchorLine?.description.length ?? 0) < current.anchorDescription.length) current.anchorDescription = anchorLine?.description ?? current.anchorDescription;
        if ((companionLine?.description.length ?? 0) < current.companionDescription.length) current.companionDescription = companionLine?.description ?? current.companionDescription;
        byPair.set(pairKey, current);
      });
    });
  });

  byPair.forEach((entry) => {
    entry.anchorCount = anchorCounts.get(`${entry.caseType}|${entry.anchorCode}`) ?? 0;
  });
  return byPair;
}

export function normalizeTableSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9äöüß]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decimalCsv(value: number) {
  return Number.isFinite(value) ? String(Math.round(value * 100) / 100).replace(".", ",") : "";
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function escapeTableCsv(value: string) {
  if (/[;"\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

const percentNumber = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

function formatPercent(value: number) {
  return `${percentNumber.format(Number.isFinite(value) ? value : 0)} %`;
}

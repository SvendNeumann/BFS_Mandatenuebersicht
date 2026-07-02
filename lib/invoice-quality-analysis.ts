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
  anchorCodes: string[];
  companionCode: string;
  caseType?: string;
  title: string;
  rationale: string;
  source: string;
  confidence: "hoch" | "mittel";
};

export type InvoiceQualityFinding = {
  key: string;
  standortId: string;
  standortName: string;
  caseType: string;
  anchorCode: string;
  anchorDescription: string;
  companionCode: string;
  companionDescription: string;
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
  rule?: InvoiceQualityRule;
  affectedInvoices: InvoiceQualityAffectedInvoice[];
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
    rationale: "Bei elektrometrischer Längenbestimmung im Endo-Fall kann eine elektrophysikalisch-chemische Kanalbehandlung relevant sein. Bitte fachlich einordnen, ob sie erbracht und abrechenbar ist.",
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

export function matchingInvoiceQualityRule(anchorCode: string, companionCode: string, caseType: string) {
  return invoiceQualityRules.find((rule) =>
    rule.anchorCodes.includes(anchorCode) &&
    rule.companionCode === companionCode &&
    (!rule.caseType || rule.caseType === caseType)
  );
}

export function buildInvoiceQualityFindingsFromProfiles(
  analysisInvoices: InvoiceQualityProfile[],
  targetStandorte: Standort[],
  options: { minGroupRate: number; minCaseCount: number; minPotential: number }
): InvoiceQualityFinding[] {
  const groupStats = invoiceQualityGroupStats(analysisInvoices);
  const findings: InvoiceQualityFinding[] = [];

  targetStandorte.forEach((standort) => {
    const targetInvoices = analysisInvoices.filter((invoice) => invoice.standortId === standort.id || invoice.standortName === standort.name);
    if (!targetInvoices.length) return;

    groupStats.forEach((groupStat, pairKey) => {
      if (groupStat.anchorCount < options.minCaseCount) return;
      const groupRate = groupStat.anchorCount ? groupStat.togetherCount / groupStat.anchorCount : 0;
      if (groupRate < options.minGroupRate) return;

      const targetWithAnchor = targetInvoices.filter((invoice) => invoice.caseType === groupStat.caseType && invoice.codeSet.has(groupStat.anchorCode));
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

      findings.push({
        key: `${standort.id}-${pairKey}`,
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
    || b.potential - a.potential
    || b.confidenceGap - a.confidenceGap
    || b.targetAnchorCount - a.targetAnchorCount
    || a.standortName.localeCompare(b.standortName, "de")
    || a.anchorCode.localeCompare(b.anchorCode, "de", { numeric: true }));
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
      row.companionDescription
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
    topFinding: rows[0],
    biggestGap: [...rows].sort((a, b) => b.confidenceGap - a.confidenceGap || b.potential - a.potential)[0],
    caseTypeCount: new Set(rows.map((row) => row.caseType)).size
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
    "Wenn Leistung",
    "Wenn Beschreibung",
    "Begleitleistung",
    "Begleitleistung Beschreibung",
    "Gruppenquote",
    "Praxisquote",
    "Entwicklung",
    "Basis",
    "Quelle",
    "Betroffene Rechnungen",
    "Orientierungswert",
    "Einordnung"
  ];
  const body = rows.length ? rows.map((row) => [
    period.label,
    row.standortName,
    row.caseType,
    row.anchorCode,
    row.anchorDescription,
    row.companionCode,
    row.companionDescription,
    decimalCsv(row.groupRate * 100),
    decimalCsv(row.targetRate * 100),
    invoiceQualityTrendLabel(row, previousFindingsByKey.get(row.key)),
    row.rule ? `${row.rule.title} (${row.rule.confidence})` : "Datenmuster",
    row.rule?.source ?? "interne Musteranalyse",
    String(row.affectedInvoices.length),
    decimalCsv(row.potential),
    row.rule?.rationale ?? invoiceQualityDefaultRecommendation(row)
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

export function invoiceQualityExportIntro(scopeLabel: string) {
  return [
    "Die Hinweise leiten sich aus vorhandenen Einzelrechnungen, hinterlegten Abrechnungskatalog-/Kommentarlogiken und dem anonymisierten Standortvergleich ab.",
    `Gezeigt wird, welche Begleitleistungen bei ähnlichen Leistungsketten in der Gruppe häufig gemeinsam auftreten und bei ${scopeLabel} seltener sichtbar sind.`,
    "Das ist keine automatische Fehlerbewertung und kein Nachberechnungsauftrag, sondern eine fachliche Informationsgrundlage.",
    "Bitte ordnen Sie vor Ort anhand gesetzlicher Vorgaben, GOZ/BEMA-/GOÄ-Katalog, Dokumentation und Behandlungsablauf ein, ob ein Hinweis anwendbar ist."
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

import { NextResponse } from "next/server";
import { getRequestProfile } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlausibilityRequest = {
  kind?: "quality_finding" | "service_chain";
  context?: Record<string, unknown>;
};

const resultSchema = {
  type: "object",
  properties: {
    plausibility: { type: "string", enum: ["hoch", "mittel", "niedrig", "unklar"] },
    fundamentalPlausibility: { type: "string", enum: ["ja", "eher_ja", "kontextabhaengig", "eher_nein", "unklar"] },
    missingProbability: { type: "string", enum: ["hoch", "mittel", "niedrig", "unklar"] },
    missingProbabilityPercent: { type: "number" },
    summary: { type: "string" },
    reasons: { type: "array", items: { type: "string" } },
    checkQuestions: { type: "array", items: { type: "string" } },
    documentationHints: { type: "array", items: { type: "string" } },
    cautions: { type: "array", items: { type: "string" } },
    disclaimer: { type: "string" }
  },
  required: ["plausibility", "fundamentalPlausibility", "missingProbability", "missingProbabilityPercent", "summary", "reasons", "checkQuestions", "documentationHints", "cautions", "disclaimer"]
};

export async function POST(request: Request) {
  const auth = await getRequestProfile();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini ist noch nicht aktiviert. In Vercel fehlt die geschützte Variable GEMINI_API_KEY." }, { status: 500 });
  }

  const body = await request.json().catch(() => null) as PlausibilityRequest | null;
  if (!body?.kind || !["quality_finding", "service_chain"].includes(body.kind)) {
    return NextResponse.json({ error: "Bitte einen gültigen Prüfkontext übergeben." }, { status: 400 });
  }

  const context = sanitizeContext(body.context ?? {});
  if (!Object.keys(context).length) return NextResponse.json({ error: "Der Prüfkontext ist leer." }, { status: 400 });

  const modelCandidates = geminiModelCandidates(process.env.GEMINI_MODEL);
  const prompt = buildPrompt(body.kind, context);

  try {
    const geminiResult = await requestGeminiWithFallback(apiKey, modelCandidates, prompt);
    if (!geminiResult.ok) return NextResponse.json({ error: friendlyGeminiError(geminiResult.message) }, { status: geminiResult.status });

    const text = extractGeminiText(geminiResult.payload);
    const result = normalizeAiResult(JSON.parse(text));
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? friendlyGeminiError(error.message) : "Gemini-Prüfung fehlgeschlagen." }, { status: 502 });
  }
}

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

type GeminiError = {
  error: { message: string };
};

type GeminiRequestResult =
  | { ok: true; payload: GeminiResponse; model: string }
  | { ok: false; message: string; status: number };

async function requestGeminiWithFallback(apiKey: string, models: string[], prompt: string): Promise<GeminiRequestResult> {
  let lastMessage = "Gemini konnte die Anfrage nicht verarbeiten.";
  let lastStatus = 502;

  for (const model of models) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: resultSchema
        }
      })
    });

    const payload = await response.json().catch(() => null) as GeminiResponse | GeminiError | null;
    if (response.ok) return { ok: true, payload: payload as GeminiResponse, model };

    lastMessage = "error" in (payload ?? {}) ? (payload as GeminiError).error.message : lastMessage;
    lastStatus = response.status === 429 ? 429 : 502;
    if (!shouldTryNextGeminiModel(lastMessage, response.status)) break;
  }

  return { ok: false, message: lastMessage, status: lastStatus };
}

function geminiModelCandidates(rawModel: string | undefined) {
  const preferred = normalizeGeminiModelName(rawModel);
  return Array.from(new Set([
    preferred,
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash",
    "gemini-1.5-flash"
  ].filter(Boolean))) as string[];
}

function normalizeGeminiModelName(rawModel: string | undefined) {
  const trimmed = rawModel?.trim();
  if (!trimmed) return "";
  return trimmed
    .replace(/^https:\/\/generativelanguage\.googleapis\.com\/[^/]+\/models\//i, "")
    .replace(/^models\//i, "")
    .replace(/:generateContent.*$/i, "")
    .trim();
}

function shouldTryNextGeminiModel(message: string, status: number) {
  const lower = message.toLowerCase();
  return lower.includes("not found")
    || lower.includes("not supported")
    || lower.includes("no longer available")
    || lower.includes("model")
    || status === 503;
}

function buildPrompt(kind: "quality_finding" | "service_chain", context: Record<string, unknown>) {
  const label = kind === "service_chain" ? "Leistungskette" : "Qualitätshinweis";
  return [
    "Du bist ein fachlicher Plausibilitätsassistent für zahnmedizinische Abrechnungshinweise.",
    "Bewerte ausschließlich den anonymisierten Daten- und Regelkontext.",
    "Ziel der Prüfung: Beantworte zuerst, ob die genannte Begleitleistung zur Basisleistung fachlich grundsätzlich Sinn machen kann. Beantworte danach, wie wahrscheinlich es anhand der Vergleichswerte ist, dass diese Begleitleistung in den markierten Fällen tatsächlich fachlich prüfrelevant ist.",
    "Unterscheide streng zwischen fachlicher Sinnhaftigkeit und tatsächlicher Prüfrelevanz: Eine Leistung kann grundsätzlich sinnvoll sein, aber im Einzelfall trotzdem nicht erbracht, nicht indiziert oder nicht dokumentiert sein.",
    "Nutze die Gruppenquote, Standortquote, Abweichung, Fallzahl, Katalog-Plausibilität, Regelstatus und Prüfhints zur Einordnung. Bei nicht hinterlegter fachlicher Regel oder niedriger Fallzahl muss die Wahrscheinlichkeit vorsichtig reduziert werden.",
    "Gib missingProbabilityPercent als vorsichtige Schätzung von 0 bis 100 zurück. Nutze keine Scheingenauigkeit: 10er-Schritte bevorzugen.",
    "Gib keine automatische Abrechnungsempfehlung, keine Rechtsberatung und keine abschließende medizinische Bewertung.",
    "Formuliere knapp, sachlich und so, dass der Text direkt intern weitergegeben werden kann.",
    "Nenne keine Patientendaten, Rechnungsnummern oder personenbezogene Daten.",
    `Prüfart: ${label}`,
    `Kontext als JSON: ${JSON.stringify(context)}`,
    "Antworte ausschließlich als JSON mit plausibility, fundamentalPlausibility, missingProbability, missingProbabilityPercent, summary, reasons, checkQuestions, documentationHints, cautions und disclaimer.",
    "summary muss in einem Satz sagen: ob die Begleitleistung grundsätzlich plausibel ist und ob eine tatsächliche fachliche Prüfrelevanz eher hoch/mittel/niedrig wahrscheinlich ist.",
    "reasons sollen die Abwägung erklären: fachlicher Zusammenhang, Gruppen-/Standortdifferenz, Fallzahl, Regel-/Kataloglage.",
    "checkQuestions sollen auf konkrete Einzelfallprüfung zielen: wurde die Begleitleistung fachlich erbracht/indiziert/dokumentiert oder ist sie wegen Behandlungsablauf/Region/Zeitpunkt nicht einschlägig?"
  ].join("\n\n");
}

function sanitizeContext(value: Record<string, unknown>) {
  const allowed = JSON.stringify(value, (_key, entry) => {
    if (typeof entry === "string") return entry.slice(0, 900);
    if (typeof entry === "number" && Number.isFinite(entry)) return entry;
    if (typeof entry === "boolean" || entry === null) return entry;
    if (Array.isArray(entry)) return entry.slice(0, 12);
    if (typeof entry === "object") return entry;
    return undefined;
  });
  return JSON.parse(allowed) as Record<string, unknown>;
}

function extractGeminiText(payload: GeminiResponse) {
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini hat keine auswertbare Antwort geliefert.");
  return text;
}

function normalizeAiResult(value: unknown) {
  const entry = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    plausibility: oneOf(entry.plausibility, ["hoch", "mittel", "niedrig", "unklar"], "unklar"),
    fundamentalPlausibility: oneOf(entry.fundamentalPlausibility, ["ja", "eher_ja", "kontextabhaengig", "eher_nein", "unklar"], "unklar"),
    missingProbability: oneOf(entry.missingProbability, ["hoch", "mittel", "niedrig", "unklar"], "unklar"),
    missingProbabilityPercent: numberValue(entry.missingProbabilityPercent, 0, 100, 0),
    summary: stringValue(entry.summary, "Keine Zusammenfassung geliefert."),
    reasons: stringList(entry.reasons),
    checkQuestions: stringList(entry.checkQuestions),
    documentationHints: stringList(entry.documentationHints),
    cautions: stringList(entry.cautions),
    disclaimer: stringValue(entry.disclaimer, "KI-Hinweis: fachlich anhand Behandlung, Dokumentation und Abrechnungsvorgaben prüfen.")
  };
}

function oneOf<T extends string>(value: unknown, allowed: T[], fallback: T) {
  return allowed.includes(value as T) ? value as T : fallback;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim())).map((entry) => entry.trim()).slice(0, 8);
}

function friendlyGeminiError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("quota") || lower.includes("rate") || lower.includes("429")) return "Gemini-Limit erreicht. Bitte später erneut versuchen oder das Google-Kontingent prüfen.";
  if (lower.includes("api key") || lower.includes("permission") || lower.includes("unauthorized")) return "Gemini-Key ist ungültig oder nicht freigeschaltet. Bitte den API-Key in Vercel prüfen.";
  if (lower.includes("not found") || lower.includes("model")) return "Das hinterlegte Gemini-Modell ist nicht verfügbar. Bitte GEMINI_MODEL in Vercel prüfen oder leer lassen.";
  return message || "Gemini-Prüfung fehlgeschlagen.";
}

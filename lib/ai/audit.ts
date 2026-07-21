import { chat, type TokenUsage } from "@/lib/ai/extract";
import { computeMetrics } from "@/lib/metrics";
import type { AIModelConfig, TransactionWithAccount } from "@/lib/types";

export interface AuditResult {
  summary: string;
  flags: string[];
  recommendations: string[];
  usage: TokenUsage;
}

const SYSTEM =
  "You are a meticulous accounting auditor and bookkeeper. You review a ledger of " +
  "extracted bank transactions and produce a concise, professional audit.";

// Keep the prompt bounded — send the computed metrics (cheap, exact) plus a
// capped sample of transactions for context.
const MAX_TXNS = 250;

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean).slice(0, 20) : [];

// Pull a single string field out of a (possibly truncated) JSON blob without
// parsing the whole thing. Handles escaped quotes inside the value.
function salvageString(text: string, key: string): string {
  const m = text.match(
    new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`)
  );
  if (!m) return "";
  try {
    return JSON.parse(`"${m[1]}"`);
  } catch {
    return m[1];
  }
}

// Pull an array-of-strings field, tolerating a truncated final element (a
// trailing item with no closing quote is simply dropped).
function salvageArray(text: string, key: string): string[] {
  const start = text.indexOf(`"${key}"`);
  if (start < 0) return [];
  const bracket = text.indexOf("[", start);
  if (bracket < 0) return [];
  let region = text.slice(bracket + 1);
  const close = region.indexOf("]");
  if (close >= 0) region = region.slice(0, close);
  const items: string[] = [];
  const re = /"((?:[^"\\]|\\.)*)"/g;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(region)) !== null) {
    try {
      items.push(JSON.parse(`"${mm[1]}"`));
    } catch {
      items.push(mm[1]);
    }
  }
  return items.filter(Boolean).slice(0, 20);
}

function parseAudit(raw: string): Omit<AuditResult, "usage"> {
  let text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  if (!text.startsWith("{")) {
    const s = text.indexOf("{");
    const e = text.lastIndexOf("}");
    if (s >= 0 && e > s) text = text.slice(s, e + 1);
  }
  // Fast path: a complete, valid JSON object.
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      summary: String(parsed.summary ?? "").slice(0, 4000),
      flags: arr(parsed.flags),
      recommendations: arr(parsed.recommendations),
    };
  } catch {
    // Truncated or slightly malformed JSON (e.g. the reply was cut off mid
    // array). Salvage the fields field-by-field so the user still gets a
    // readable audit instead of a raw JSON dump.
    const summary = salvageString(text, "summary").slice(0, 4000);
    const flags = salvageArray(text, "flags");
    const recommendations = salvageArray(text, "recommendations");
    if (summary || flags.length || recommendations.length) {
      return { summary, flags, recommendations };
    }
    // Nothing recognizable — last-resort: show the raw text.
    return { summary: raw.trim().slice(0, 2000), flags: [], recommendations: [] };
  }
}

export async function auditTransactions(
  config: AIModelConfig,
  txns: TransactionWithAccount[]
): Promise<AuditResult> {
  const metrics = computeMetrics(txns);

  const sample = txns.slice(0, MAX_TXNS).map((t) => ({
    date: t.txn_date,
    desc: t.description ?? t.raw_description ?? "",
    amount: (t.direction === "credit" ? "+" : "-") + Math.abs(t.amount).toFixed(2),
    category: t.category ?? "Uncategorized",
    account: t.bank_account?.account_name ?? "",
  }));

  const user = `Audit this book's transactions. All amounts are in ${metrics.currency}.

Computed metrics:
${JSON.stringify(metrics, null, 0)}

Transactions (${sample.length}${txns.length > MAX_TXNS ? ` of ${txns.length}, truncated` : ""}):
${JSON.stringify(sample, null, 0)}

Return ONLY a JSON object of this exact shape and nothing else. Keep it
concise: at most 7 flags and 6 recommendations, each one sentence. Do not add
any text before or after the JSON.
{
  "summary": "3-6 sentence plain-English audit: overall health, income vs spend, notable patterns.",
  "flags": ["specific audit concerns: anomalies, likely-miscategorized rows, duplicates, unusually large or round amounts, uncategorized spend, gaps"],
  "recommendations": ["concrete, actionable bookkeeping recommendations"]
}`;

  // Audits can be long (multi-item flags + recommendations). Give the model
  // enough room that the JSON isn't cut off mid-array.
  const { text, usage } = await chat(config, SYSTEM, user, 4000);
  return { ...parseAudit(text), usage };
}

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

function parseAudit(raw: string): Omit<AuditResult, "usage"> {
  let text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  if (!text.startsWith("{")) {
    const s = text.indexOf("{");
    const e = text.lastIndexOf("}");
    if (s >= 0 && e > s) text = text.slice(s, e + 1);
  }
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    // Fall back to using the whole reply as the summary.
    return { summary: raw.trim().slice(0, 2000), flags: [], recommendations: [] };
  }
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean).slice(0, 20) : [];
  return {
    summary: String(parsed.summary ?? "").slice(0, 4000),
    flags: arr(parsed.flags),
    recommendations: arr(parsed.recommendations),
  };
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

Return ONLY a JSON object of this exact shape and nothing else:
{
  "summary": "3-6 sentence plain-English audit: overall health, income vs spend, notable patterns.",
  "flags": ["specific audit concerns: anomalies, likely-miscategorized rows, duplicates, unusually large or round amounts, uncategorized spend, gaps"],
  "recommendations": ["concrete, actionable bookkeeping recommendations"]
}`;

  const { text, usage } = await chat(config, SYSTEM, user, 2000);
  return { ...parseAudit(text), usage };
}

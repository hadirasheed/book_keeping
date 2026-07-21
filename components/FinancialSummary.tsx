"use client";

import { useState } from "react";
import { Loader2, Sparkles, AlertTriangle, Lightbulb } from "lucide-react";
import { computeMetrics } from "@/lib/metrics";
import { currencyLabel } from "@/lib/utils";
import type { TransactionWithAccount } from "@/lib/types";

interface AuditResult {
  summary: string;
  flags: string[];
  recommendations: string[];
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  return (
    <div className="rounded-[12px] border border-[#e6e9ec] bg-white px-4 py-3">
      <div className="text-[11.5px] font-semibold text-[#6c7378]">{label}</div>
      <div
        className="mt-1 text-[18px] font-bold tabular-nums"
        style={{
          color: tone === "pos" ? "#1a7f4b" : tone === "neg" ? "#c0392b" : "#001c64",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function FinancialSummary({
  transactions,
  bookId,
}: {
  transactions: TransactionWithAccount[];
  bookId: string;
}) {
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const m = computeMetrics(transactions);
  const cur = currencyLabel(m.currency);
  const money = (n: number) =>
    `${cur} ${n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const pct = (n: number | null) =>
    n === null ? "—" : `${(n * 100).toFixed(1)}%`;

  async function runAudit() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/audit`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Audit failed");
      setAudit({
        summary: json.summary,
        flags: json.flags ?? [],
        recommendations: json.recommendations ?? [],
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  if (transactions.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold text-[#001c64]">
          AI Audit &amp; Financial Summary
        </h2>
        <button
          onClick={runAudit}
          disabled={running}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0070e0] px-3.5 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-[#005ecb] disabled:opacity-60"
        >
          {running ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Auditing…
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" /> {audit ? "Re-run AI audit" : "Run AI audit"}
            </>
          )}
        </button>
      </div>

      {/* Basic metrics */}
      <div className="grid grid-cols-2 gap-3 min-[821px]:grid-cols-4">
        <Metric label="Total income" value={money(m.income)} tone="pos" />
        <Metric label="Total expenses" value={money(m.expense)} tone="neg" />
        <Metric
          label="Net position"
          value={money(m.net)}
          tone={m.net >= 0 ? "pos" : "neg"}
        />
        <Metric label="Transactions" value={m.count.toLocaleString()} />
      </div>

      {/* Advanced metrics */}
      <div className="mt-3 grid grid-cols-2 gap-3 min-[821px]:grid-cols-4">
        <Metric label="Savings rate" value={pct(m.savingsRate)} />
        <Metric label="Expense / income" value={pct(m.expenseToIncome)} />
        <Metric label="Avg income txn" value={money(m.avgIncome)} />
        <Metric label="Avg expense txn" value={money(m.avgExpense)} />
        <Metric label="Largest income" value={money(m.largestIncome)} tone="pos" />
        <Metric label="Largest expense" value={money(m.largestExpense)} tone="neg" />
        <Metric
          label="Categorized"
          value={`${m.categorized} / ${m.count}`}
        />
        <Metric
          label="Date range"
          value={m.dateFrom ? `${m.dateFrom} → ${m.dateTo}` : "—"}
        />
      </div>

      {/* Category breakdown + monthly */}
      <div className="mt-3 grid gap-3 min-[821px]:grid-cols-2">
        <div className="rounded-[14px] border border-[#e6e9ec] bg-white p-5">
          <div className="mb-3 text-[13px] font-bold text-[#001c64]">
            Spend by category
          </div>
          {m.categories.length === 0 ? (
            <div className="text-[13px] text-[#8b9198]">No expenses yet.</div>
          ) : (
            <div className="space-y-2.5">
              {m.categories.slice(0, 8).map((c) => (
                <div key={c.category}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#2c2e2f]">{c.category}</span>
                    <span className="tabular-nums text-[#6c7378]">
                      {money(c.total)} · {(c.share * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#eef1f4]">
                    <div
                      className="h-full rounded-full bg-[#0070e0]"
                      style={{ width: `${Math.max(2, c.share * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[14px] border border-[#e6e9ec] bg-white p-5">
          <div className="mb-3 text-[13px] font-bold text-[#001c64]">
            Monthly cash flow
          </div>
          {m.months.length === 0 ? (
            <div className="text-[13px] text-[#8b9198]">No data yet.</div>
          ) : (
            <div className="space-y-1.5">
              {m.months.slice(-6).map((mo) => (
                <div
                  key={mo.month}
                  className="grid grid-cols-[auto_1fr_1fr_1fr] items-center gap-2 text-[12.5px]"
                >
                  <span className="font-semibold text-[#2c2e2f]">{mo.month}</span>
                  <span className="text-right tabular-nums text-[#1a7f4b]">
                    +{mo.income.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-right tabular-nums text-[#c0392b]">
                    -{mo.expense.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                  <span
                    className="text-right font-bold tabular-nums"
                    style={{ color: mo.net >= 0 ? "#1a7f4b" : "#c0392b" }}
                  >
                    {mo.net >= 0 ? "+" : ""}
                    {mo.net.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI audit result */}
      {error && (
        <p className="mt-3 whitespace-pre-wrap break-words rounded-[10px] bg-[#fbeae8] px-4 py-2.5 text-[13px] text-[#c0392b]">
          {error}
        </p>
      )}
      {audit && (
        <div className="mt-3 rounded-[14px] border-[1.5px] border-[#0070e0]/30 bg-[#f7fbff] p-5">
          <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-[#001c64]">
            <Sparkles className="size-4 text-[#0070e0]" /> AI audit
          </div>
          <p className="text-[13.5px] leading-relaxed text-[#2c2e2f]">
            {audit.summary}
          </p>
          {audit.flags.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold text-[#9a6a00]">
                <AlertTriangle className="size-4" /> Flags
              </div>
              <ul className="list-disc space-y-1 pl-5 text-[13px] text-[#2c2e2f]">
                {audit.flags.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}
          {audit.recommendations.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold text-[#1a7f4b]">
                <Lightbulb className="size-4" /> Recommendations
              </div>
              <ul className="list-disc space-y-1 pl-5 text-[13px] text-[#2c2e2f]">
                {audit.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

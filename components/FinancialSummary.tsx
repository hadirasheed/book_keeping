"use client";

import { useState } from "react";
import { Loader2, Sparkles, AlertTriangle, Lightbulb } from "lucide-react";
import { computeMetrics } from "@/lib/metrics";
import { currencyLabel } from "@/lib/utils";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuditLogs } from "@/components/AuditLogs";
import { DateRangeFilter } from "@/components/DateRangeFilter";
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
  rangeFrom,
  rangeTo,
  onRangeChange,
  hasTransactions,
}: {
  /** Transactions already filtered to the selected date range. */
  transactions: TransactionWithAccount[];
  bookId: string;
  rangeFrom: string;
  rangeTo: string;
  onRangeChange: (next: { from: string; to: string }) => void;
  /** Whether the book has any transactions at all (ignoring the range). */
  hasTransactions: boolean;
}) {
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // The audit's own from/to, seeded from the page's active range on open.
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [logsKey, setLogsKey] = useState(0);

  const m = computeMetrics(transactions);
  const cur = currencyLabel(m.currency);
  const money = (n: number) =>
    `${cur} ${n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const pct = (n: number | null) =>
    n === null ? "—" : `${(n * 100).toFixed(1)}%`;

  function openConfirm() {
    // Seed the dialog with the page's active range (falling back to the data's
    // actual span) so the user only tweaks it when they want a narrower audit.
    setAuditFrom(rangeFrom || m.dateFrom || "");
    setAuditTo(rangeTo || m.dateTo || "");
    setConfirmOpen(true);
  }

  async function runAudit() {
    setConfirmOpen(false);
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: auditFrom, to: auditTo }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Audit failed");
      setAudit({
        summary: json.summary,
        flags: json.flags ?? [],
        recommendations: json.recommendations ?? [],
      });
      setLogsKey((k) => k + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  // Only fully hidden when the book has no transactions at all. When the book
  // has data but the current range excludes everything, we still show the
  // header (with the range selector) plus the saved audit logs.
  if (!hasTransactions) return null;

  const inRange = transactions.length > 0;

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-[17px] font-bold text-[#001c64]">
          AI Audit &amp; Financial Summary
        </h2>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={openConfirm}
            disabled={running || !inRange}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0070e0] px-3.5 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-[#005ecb] disabled:opacity-60"
          >
            {running ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Auditing…
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />{" "}
                {audit ? "Re-run AI audit" : "Run AI audit"}
              </>
            )}
          </button>
          <p className="max-w-[240px] text-right text-[11px] leading-snug text-[#8b9198]">
            Sends your transactions to the AI to produce a plain-English summary,
            audit flags and recommendations. You&apos;ll pick a date range first.
          </p>
        </div>
      </div>

      {/* Date range selector — scopes the metrics below and the transaction
          list, and seeds the audit's default range. */}
      <div className="mb-3">
        <DateRangeFilter from={rangeFrom} to={rangeTo} onChange={onRangeChange} />
      </div>

      {!inRange && (
        <p className="rounded-[12px] border border-[#e6e9ec] bg-white px-4 py-6 text-center text-[13px] text-[#8b9198]">
          No transactions in the selected date range. Adjust or clear the dates
          above.
        </p>
      )}

      {inRange && (
        <>
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
        </>
      )}

      {/* Saved audits */}
      <AuditLogs bookId={bookId} refreshKey={logsKey} />

      {/* Date-range confirmation before running the audit */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogHeader>
          <DialogTitle>Run AI audit</DialogTitle>
        </DialogHeader>
        <p className="text-[13.5px] leading-relaxed text-[#6c7378]">
          Choose the date range to audit. The AI will review only the
          transactions dated in this range and return a summary, flags and
          recommendations. Leave a field blank for “no bound”. This uses AI
          tokens.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#6c7378]">
            From
            <input
              type="date"
              value={auditFrom}
              max={auditTo || undefined}
              onChange={(e) => setAuditFrom(e.target.value)}
              className="rounded-[9px] border border-[#d7dde2] bg-white px-2.5 py-2 text-[13px] font-normal text-[#2c2e2f] outline-none focus:border-[#0070e0]"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#6c7378]">
            To
            <input
              type="date"
              value={auditTo}
              min={auditFrom || undefined}
              onChange={(e) => setAuditTo(e.target.value)}
              className="rounded-[9px] border border-[#d7dde2] bg-white px-2.5 py-2 text-[13px] font-normal text-[#2c2e2f] outline-none focus:border-[#0070e0]"
            />
          </label>
        </div>
        <DialogFooter>
          <button
            onClick={() => setConfirmOpen(false)}
            className="rounded-full border-[1.5px] border-[#c3cbd3] bg-white px-5 py-2.5 text-[14px] font-bold text-[#001c64] transition-colors hover:border-[#0070e0]"
          >
            Cancel
          </button>
          <button
            onClick={runAudit}
            className="inline-flex items-center gap-2 rounded-full bg-[#0070e0] px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#005ecb]"
          >
            <Sparkles className="size-4" /> Run audit
          </button>
        </DialogFooter>
      </Dialog>
    </section>
  );
}

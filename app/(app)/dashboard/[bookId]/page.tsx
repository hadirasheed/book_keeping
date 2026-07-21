"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { ProcessButton, type ActionMessage } from "@/components/ProcessButton";
import { DeleteStatementButton } from "@/components/DeleteStatementButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/Pagination";
import { FinancialSummary } from "@/components/FinancialSummary";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { initials, formatSigned, currencyLabel, fullDate } from "@/lib/utils";

const TXN_PAGE_SIZE = 50;
import type {
  BankAccount,
  Book,
  StatementWithAccount,
  TransactionWithAccount,
} from "@/lib/types";

function fileExt(name: string) {
  const parts = name.split(".");
  return (parts.length > 1 ? parts.pop() : "")?.toUpperCase() || "DOC";
}

function period(s: StatementWithAccount) {
  if (s.period_start && s.period_end) {
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    return fmt(s.period_start) === fmt(s.period_end)
      ? fmt(s.period_start)
      : `${fmt(s.period_start)} – ${fmt(s.period_end)}`;
  }
  return "—";
}

export default function BookOverviewPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = use(params);
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [statements, setStatements] = useState<StatementWithAccount[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [txnPage, setTxnPage] = useState(0);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");

  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [banner, setBanner] = useState<ActionMessage | null>(null);
  const [dedupeOpen, setDedupeOpen] = useState(false);
  const [dedupeCount, setDedupeCount] = useState(0);
  const [dedupeBusy, setDedupeBusy] = useState(false);

  // Apply the shared date range whenever it changes; reset to page 1.
  function applyRange(next: { from: string; to: string }) {
    setRangeFrom(next.from);
    setRangeTo(next.to);
    setTxnPage(0);
  }

  // File names that already have a processed (done) statement — used to warn
  // before re-processing a same-named upload (the duplicate-data path).
  const doneFileNames = new Set(
    statements.filter((s) => s.status === "done").map((s) => s.file_name)
  );

  // Check for duplicate transactions and, if any, open a confirmation to remove.
  async function checkDuplicates() {
    setBanner(null);
    try {
      const res = await fetch(`/api/transactions/dedupe?bookId=${bookId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.duplicates === 0) {
        setBanner({ ok: true, text: "No duplicate transactions found." });
      } else {
        setDedupeCount(json.duplicates);
        setDedupeOpen(true);
      }
    } catch (err) {
      setBanner({ ok: false, text: (err as Error).message });
    }
  }

  async function runDedupe() {
    setDedupeBusy(true);
    try {
      const res = await fetch(`/api/transactions/dedupe?bookId=${bookId}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setBanner({
        ok: true,
        text: `Removed ${json.removed} duplicate transaction${
          json.removed === 1 ? "" : "s"
        }.`,
      });
      await refresh();
    } catch (err) {
      setBanner({ ok: false, text: (err as Error).message });
    } finally {
      setDedupeBusy(false);
      setDedupeOpen(false);
    }
  }

  // Process every pending/failed statement in sequence with the active model.
  async function runPending() {
    setBulkConfirmOpen(false);
    const targets = statements.filter(
      (s) => s.status === "pending" || s.status === "failed"
    );
    if (targets.length === 0) return;
    setBulkRunning(true);
    setBanner(null);
    let done = 0;
    const failures: string[] = [];
    try {
      for (const s of targets) {
        try {
          const res = await fetch(`/api/statements/${s.id}/process`, {
            method: "POST",
          });
          const json = await res.json();
          if (!res.ok || json.status === "failed") {
            failures.push(`• ${s.file_name}: ${json.error || "failed"}`);
          } else {
            done += 1;
          }
        } catch (err) {
          failures.push(`• ${s.file_name}: ${(err as Error).message}`);
        }
        await refresh();
      }
      setBanner(
        failures.length
          ? {
              ok: false,
              text: `Processed ${done} of ${targets.length}. ${failures.length} failed:\n${failures.join("\n")}`,
            }
          : { ok: true, text: `Processed ${done} statement${done === 1 ? "" : "s"}.` }
      );
    } finally {
      setBulkRunning(false);
    }
  }

  // Re-fetch statements + transactions (used after AI processing).
  async function refresh() {
    const [statementsRes, txnsRes] = await Promise.all([
      fetch(`/api/statements?bookId=${bookId}`),
      fetch(`/api/transactions?bookId=${bookId}`),
    ]);
    const statementsJson = await statementsRes.json();
    const txnsJson = await txnsRes.json();
    if (statementsRes.ok) setStatements(statementsJson.statements);
    if (txnsRes.ok) setTransactions(txnsJson.transactions);
  }

  useEffect(() => {
    (async () => {
      try {
        const [booksRes, accountsRes, statementsRes, txnsRes] =
          await Promise.all([
            fetch("/api/books"),
            fetch(`/api/bank-accounts?bookId=${bookId}`),
            fetch(`/api/statements?bookId=${bookId}`),
            fetch(`/api/transactions?bookId=${bookId}`),
          ]);
        const booksJson = await booksRes.json();
        const accountsJson = await accountsRes.json();
        const statementsJson = await statementsRes.json();
        const txnsJson = await txnsRes.json();
        if (!booksRes.ok) throw new Error(booksJson.error);
        if (!accountsRes.ok) throw new Error(accountsJson.error);
        if (!statementsRes.ok) throw new Error(statementsJson.error);
        if (!txnsRes.ok) throw new Error(txnsJson.error);
        setBook(
          (booksJson.books as Book[]).find((b) => b.id === bookId) ?? null
        );
        setAccounts(accountsJson.bankAccounts);
        setStatements(statementsJson.statements);
        setTransactions(txnsJson.transactions);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookId]);

  // Scope by the shared date range first (drives both the summary + the list).
  const rangeTxns = transactions.filter(
    (t) =>
      (!rangeFrom || t.txn_date >= rangeFrom) &&
      (!rangeTo || t.txn_date <= rangeTo)
  );

  const q = search.trim().toLowerCase();
  const filteredTxns = q
    ? rangeTxns.filter((t) =>
        `${t.description ?? ""} ${t.category ?? ""} ${
          t.bank_account?.account_name ?? ""
        }`
          .toLowerCase()
          .includes(q)
      )
    : rangeTxns;

  const pendingCount = statements.filter(
    (s) => s.status === "pending" || s.status === "failed"
  ).length;

  // Paginate (20 per page). Clamp the page when the result set shrinks.
  const txnPageCount = Math.max(
    1,
    Math.ceil(filteredTxns.length / TXN_PAGE_SIZE)
  );
  const currentTxnPage = Math.min(txnPage, txnPageCount - 1);
  const pagedTxns = filteredTxns.slice(
    currentTxnPage * TXN_PAGE_SIZE,
    currentTxnPage * TXN_PAGE_SIZE + TXN_PAGE_SIZE
  );

  // Combined balance across loaded transactions (credit +, debit -).
  const balance = transactions.reduce(
    (sum, t) =>
      sum + (t.direction === "credit" ? Math.abs(t.amount) : -Math.abs(t.amount)),
    0
  );
  const balCurrency = transactions[0]?.bank_account?.currency ?? "KWD";

  if (loading) {
    return (
      <div className="px-10 py-8 text-[#6c7378]">
        <span className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="px-10 py-8">
        <p className="rounded-[10px] border border-[#c0392b]/30 bg-[#fbeae8] p-3 text-sm text-[#c0392b]">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="mz-fade">
      {/* Book header */}
      <div className="px-10 pt-7 max-[820px]:px-4">
        <div className="mb-3 flex items-center gap-2 text-[13px] text-[#6c7378]">
          <Link href="/dashboard" className="font-semibold hover:text-[#0070e0]">
            Dashboard
          </Link>
          <span>›</span>
          <span className="font-semibold text-[#2c2e2f]">{book?.name}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <div className="flex size-[52px] items-center justify-center rounded-[13px] bg-[#e6f0fc] text-[21px] font-bold text-[#0070e0]">
              {initials(book?.name ?? "")}
            </div>
            <div>
              <h1 className="text-[25px] font-bold tracking-[-.5px] text-[#001c64]">
                {book?.name}
              </h1>
              <div className="mt-0.5 text-[13px] text-[#6c7378]">
                {book?.description || "General"}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => router.push(`/dashboard/${bookId}/upload`)}
          >
            Upload statement
          </Button>
        </div>
      </div>

      <div className="px-10 pb-10 pt-[26px] max-[820px]:px-4">
        {/* Stat row */}
        <div className="mb-[26px] grid grid-cols-2 gap-4 min-[821px]:grid-cols-4">
          <div className="rounded-[14px] bg-[#001c64] px-5 py-[18px] text-white">
            <div className="text-[12.5px] font-semibold text-[#9fbdea]">
              Combined balance
            </div>
            <div className="mt-1.5 text-[24px] font-bold">
              {transactions.length
                ? `${currencyLabel(balCurrency)} ${balance.toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )}`
                : "—"}
            </div>
          </div>
          {[
            ["Bank accounts", accounts.length],
            ["Statements", statements.length],
            ["Transactions", transactions.length],
          ].map(([l, v]) => (
            <div
              key={l}
              className="rounded-[14px] border border-[#e6e9ec] bg-white px-5 py-[18px]"
            >
              <div className="text-[12.5px] font-semibold text-[#6c7378]">
                {l}
              </div>
              <div className="mt-1.5 text-[24px] font-bold text-[#001c64]">
                {v}
              </div>
            </div>
          ))}
        </div>

        {/* AI audit + accounting metrics (scoped by the shared date range) */}
        <FinancialSummary
          transactions={rangeTxns}
          bookId={bookId}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          onRangeChange={applyRange}
          hasTransactions={transactions.length > 0}
        />

        {/* AI run result / error banner (full text) */}
        {banner && (
          <div
            className="mb-4 flex items-start justify-between gap-4 rounded-[12px] px-4 py-3 text-[13px]"
            style={
              banner.ok
                ? { background: "#e7f4ec", color: "#1a7f4b" }
                : { background: "#fbeae8", color: "#c0392b" }
            }
          >
            <p className="whitespace-pre-wrap break-words">{banner.text}</p>
            <button
              onClick={() => setBanner(null)}
              className="shrink-0 text-[16px] leading-none opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* Uploaded statements */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-[#001c64]">
            Uploaded statements
          </h2>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
              {pendingCount > 0 && (
                <button
                  onClick={() => setBulkConfirmOpen(true)}
                  disabled={bulkRunning}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0070e0] px-3.5 py-1.5 text-[12.5px] font-bold text-white transition-colors hover:bg-[#005ecb] disabled:opacity-60"
                >
                  {bulkRunning ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Running…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" /> Run pending
                    </>
                  )}
                </button>
              )}
              <Link
                href={`/dashboard/${bookId}/upload`}
                className="text-[13.5px] font-semibold text-[#0070e0]"
              >
                Upload new →
              </Link>
            </div>
            {pendingCount > 0 && (
              <p className="max-w-[280px] text-right text-[11px] leading-snug text-[#8b9198]">
                Reads every pending statement with AI and adds the extracted
                transactions to this book. Uses AI tokens.
              </p>
            )}
          </div>
        </div>
        <div className="mb-[30px] overflow-hidden rounded-[14px] border border-[#e6e9ec] bg-white max-[820px]:overflow-x-auto">
          <div className="grid grid-cols-[2.2fr_1.4fr_1.1fr_0.6fr_0.9fr_1.4fr] border-b border-[#eef1f4] bg-[#f7f9fb] px-5 py-3 text-[11.5px] font-bold uppercase tracking-[.5px] text-[#8b9198] max-[820px]:min-w-[760px]">
            <div>File</div>
            <div>Account</div>
            <div>Period</div>
            <div>Txns</div>
            <div>Status</div>
            <div>AI</div>
          </div>
          {statements.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[#8b9198]">
              No statements uploaded yet.
            </div>
          ) : (
            statements.map((s) => {
              const txnCount = transactions.filter(
                (t) => t.statement_id === s.id
              ).length;
              return (
                <div
                  key={s.id}
                  className="grid grid-cols-[2.2fr_1.4fr_1.1fr_0.6fr_0.9fr_1.4fr] items-center border-b border-[#f2f4f7] px-5 py-3.5 text-[13.5px] last:border-0 max-[820px]:min-w-[760px]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex size-[30px] flex-none items-center justify-center rounded-[7px] bg-[#fbeae8] text-[10px] font-bold text-[#c0392b]">
                      {fileExt(s.file_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[#2c2e2f]">
                        {s.file_name}
                      </div>
                      {s.status === "done" && (
                        <div className="truncate text-[11px] text-[#1a7f4b]">
                          Read by AI · {txnCount} added
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="truncate text-[#6c7378]">
                    {s.bank_account?.account_name ?? "—"}
                  </div>
                  <div className="text-[#6c7378]">{period(s)}</div>
                  <div className="font-semibold text-[#2c2e2f]">
                    {s.status === "done" ? txnCount : "—"}
                  </div>
                  <div>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <ProcessButton
                      statementId={s.id}
                      fileName={s.file_name}
                      status={s.status}
                      warnDuplicate={
                        // another *different* statement with the same name is done
                        doneFileNames.has(s.file_name) && s.status !== "done"
                      }
                      onDone={refresh}
                      onMessage={setBanner}
                    />
                    <DeleteStatementButton
                      statementId={s.id}
                      fileName={s.file_name}
                      onDone={refresh}
                      onMessage={setBanner}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Transaction Intelligence */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-bold text-[#001c64]">
            Transaction Intelligence
          </h2>
          <div className="flex flex-wrap items-center gap-3 max-[820px]:w-full">
            {transactions.length > 0 && (
              <DateRangeFilter
                from={rangeFrom}
                to={rangeTo}
                onChange={applyRange}
              />
            )}
            {transactions.length > 0 && (
              <button
                onClick={checkDuplicates}
                className="whitespace-nowrap rounded-full border-[1.5px] border-[#c3cbd3] bg-white px-3.5 py-2 text-[12.5px] font-bold text-[#001c64] transition-colors hover:border-[#0070e0]"
              >
                Remove duplicates
              </button>
            )}
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setTxnPage(0);
              }}
              placeholder="Search transactions…"
              className="h-10 w-[260px] rounded-full max-[820px]:w-full"
            />
          </div>
        </div>

        {/* Top pager */}
        <Pagination
          page={currentTxnPage}
          pageCount={txnPageCount}
          total={filteredTxns.length}
          pageSize={TXN_PAGE_SIZE}
          onChange={setTxnPage}
        />

        <div className="mt-2 overflow-hidden rounded-[14px] border border-[#e6e9ec] bg-white max-[820px]:overflow-x-auto">
          <div className="grid grid-cols-[1.5fr_2.6fr_1.4fr_1.3fr_1.3fr] border-b border-[#eef1f4] bg-[#f7f9fb] px-5 py-3 text-[11.5px] font-bold uppercase tracking-[.5px] text-[#8b9198] max-[820px]:min-w-[720px]">
            <div>Date &amp; time</div>
            <div>Description</div>
            <div>Account</div>
            <div>Category</div>
            <div className="text-right">Amount</div>
          </div>
          {filteredTxns.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[#8b9198]">
              {transactions.length === 0
                ? "No transactions yet. They appear here once statements are parsed."
                : q
                  ? `No transactions match “${search}”.`
                  : "No transactions in the selected date range."}
            </div>
          ) : (
            pagedTxns.map((t) => {
              const amt = formatSigned(
                t.amount,
                t.direction,
                t.bank_account?.currency ?? "KWD"
              );
              return (
                <div
                  key={t.id}
                  className="grid grid-cols-[1.5fr_2.6fr_1.4fr_1.3fr_1.3fr] items-center border-b border-[#f2f4f7] px-5 py-3 text-[13.5px] last:border-0 max-[820px]:min-w-[720px]"
                >
                  <div>
                    <div className="font-semibold text-[#2c2e2f]">
                      {fullDate(t.txn_date)}
                    </div>
                    {t.txn_time && (
                      <div className="text-[11px] text-[#8b9198]">
                        {t.txn_time}
                      </div>
                    )}
                  </div>
                  <div className="font-semibold text-[#2c2e2f]">
                    {t.description || t.raw_description || "—"}
                  </div>
                  <div className="text-[#6c7378]">
                    {t.bank_account?.account_name ?? "—"}
                  </div>
                  <div>
                    {t.category ? (
                      <span className="rounded-[6px] bg-[#eef1f4] px-2.5 py-1 text-[12px] font-semibold text-[#4a5056]">
                        {t.category}
                      </span>
                    ) : (
                      <span className="text-[#8b9198]">—</span>
                    )}
                  </div>
                  <div
                    className="text-right font-bold"
                    style={{ color: amt.positive ? "#1a7f4b" : "#2c2e2f" }}
                  >
                    {amt.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom pager */}
        <div className="mt-2">
          <Pagination
            page={currentTxnPage}
            pageCount={txnPageCount}
            total={filteredTxns.length}
            pageSize={TXN_PAGE_SIZE}
            onChange={setTxnPage}
          />
        </div>
      </div>

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title="Run AI on all pending statements?"
        description={`The AI will read ${pendingCount} pending statement${
          pendingCount === 1 ? "" : "s"
        } and add the extracted transactions to this book. This runs the active model on each one and uses AI tokens.\n\nContinue?`}
        confirmLabel={`Run ${pendingCount}`}
        loading={bulkRunning}
        onConfirm={runPending}
      />

      <ConfirmDialog
        open={dedupeOpen}
        onOpenChange={setDedupeOpen}
        title="Remove duplicate transactions?"
        description={`Found ${dedupeCount} duplicate transaction${
          dedupeCount === 1 ? "" : "s"
        } (identical account, date, amount, direction and description). The earliest copy of each is kept and the rest are deleted. Continue?`}
        confirmLabel={`Remove ${dedupeCount}`}
        destructive
        loading={dedupeBusy}
        onConfirm={runDedupe}
      />
    </div>
  );
}

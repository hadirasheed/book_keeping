"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Landmark, Loader2, Plus, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BankAccountCard } from "@/components/BankAccountCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAmount } from "@/lib/utils";
import type {
  BankAccount,
  Book,
  StatementWithAccount,
  TransactionWithAccount,
} from "@/lib/types";

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = use(params);

  const [book, setBook] = useState<Book | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [statements, setStatements] = useState<StatementWithAccount[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transaction filters.
  const [filterAccount, setFilterAccount] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const loadTransactions = useCallback(async () => {
    const qs = new URLSearchParams({ bookId });
    if (filterAccount) qs.set("bankAccountId", filterAccount);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const res = await fetch(`/api/transactions?${qs.toString()}`);
    const json = await res.json();
    if (res.ok) setTransactions(json.transactions);
  }, [bookId, filterAccount, from, to]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [booksRes, accountsRes, statementsRes] = await Promise.all([
          fetch("/api/books"),
          fetch(`/api/bank-accounts?bookId=${bookId}`),
          fetch(`/api/statements?bookId=${bookId}`),
        ]);
        const booksJson = await booksRes.json();
        const accountsJson = await accountsRes.json();
        const statementsJson = await statementsRes.json();
        if (!booksRes.ok) throw new Error(booksJson.error);
        if (!accountsRes.ok) throw new Error(accountsJson.error);
        if (!statementsRes.ok) throw new Error(statementsJson.error);

        setBook(
          (booksJson.books as Book[]).find((b) => b.id === bookId) ?? null
        );
        setAccounts(accountsJson.bankAccounts);
        setStatements(statementsJson.statements);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Books
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">
            {book?.name ?? "Book"}
          </h1>
          {book?.description && (
            <p className="text-sm text-muted-foreground">{book.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/${bookId}/accounts`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Landmark className="size-4" /> Manage accounts
          </Link>
          <Link
            href={`/dashboard/${bookId}/upload`}
            className={buttonVariants()}
          >
            <Upload className="size-4" /> Upload Statement
          </Link>
        </div>
      </div>

      {/* Bank accounts */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Bank accounts</h2>
          <Link
            href={`/dashboard/${bookId}/accounts`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <Plus className="size-4" /> Add
          </Link>
        </div>
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No bank accounts yet.{" "}
              <Link
                href={`/dashboard/${bookId}/accounts`}
                className="font-medium text-foreground underline"
              >
                Add one
              </Link>{" "}
              to start uploading statements.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {accounts.map((a) => (
              <BankAccountCard key={a.id} account={a} />
            ))}
          </div>
        )}
      </section>

      {/* Recent statements */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent statements</h2>
        {statements.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No statements uploaded yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.file_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.bank_account
                        ? `${s.bank_account.account_name} · ${s.bank_account.bank_name}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(s.uploaded_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>

      {/* Transactions */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-medium">Transactions</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Account</Label>
              <Select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="w-48"
              >
                <option value="">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
            {(filterAccount || from || to) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterAccount("");
                  setFrom("");
                  setTo("");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {transactions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No transactions yet. They will appear here once statements are
              parsed (AI extraction is a follow-up step).
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {t.txn_date}
                    </TableCell>
                    <TableCell className="font-medium">
                      {t.description || t.raw_description || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.bank_account?.account_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.category || "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        t.direction === "credit"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : ""
                      }`}
                    >
                      {formatAmount(
                        t.amount,
                        t.bank_account ? undefined : "USD"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>
    </div>
  );
}

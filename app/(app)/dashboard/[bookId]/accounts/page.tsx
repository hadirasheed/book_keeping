"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { BankAccountCard } from "@/components/BankAccountCard";
import type { BankAccount } from "@/lib/types";

const CURRENCIES = ["USD", "EUR", "GBP", "PKR", "CAD", "AUD", "INR"];

const EMPTY = {
  bank_name: "",
  account_name: "",
  account_number_last4: "",
  currency: "USD",
};

export default function AccountsPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = use(params);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/bank-accounts?bookId=${bookId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setAccounts(json.bankAccounts);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  function resetForm() {
    setForm({ ...EMPTY });
    setEditingId(null);
  }

  async function submit() {
    if (!form.bank_name.trim() || !form.account_name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/bank-accounts", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId ? { id: editingId, ...form } : { book_id: bookId, ...form }
        ),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      resetForm();
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(a: BankAccount) {
    setEditingId(a.id);
    setForm({
      bank_name: a.bank_name,
      account_name: a.account_name,
      account_number_last4: a.account_number_last4 ?? "",
      currency: a.currency,
    });
  }

  async function remove(a: BankAccount) {
    if (
      !confirm(
        `Delete "${a.account_name}"? This also deletes its statements and transactions.`
      )
    )
      return;
    setError(null);
    try {
      const res = await fetch(`/api/bank-accounts?id=${a.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (editingId === a.id) resetForm();
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/${bookId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to book
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Bank accounts</h1>
        <p className="text-sm text-muted-foreground">
          Add, edit, or remove the accounts in this book.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        {/* Form */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>
              {editingId ? "Edit account" : "Add bank account"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bank_name">Bank name</Label>
              <Input
                id="bank_name"
                value={form.bank_name}
                onChange={(e) =>
                  setForm({ ...form, bank_name: e.target.value })
                }
                placeholder="e.g. Chase"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account_name">Account nickname</Label>
              <Input
                id="account_name"
                value={form.account_name}
                onChange={(e) =>
                  setForm({ ...form, account_name: e.target.value })
                }
                placeholder="e.g. Business Checking"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="last4">Last 4 digits</Label>
                <Input
                  id="last4"
                  value={form.account_number_last4}
                  maxLength={4}
                  inputMode="numeric"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      account_number_last4: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  placeholder="1234"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  id="currency"
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value })
                  }
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={submit}
                disabled={
                  saving ||
                  !form.bank_name.trim() ||
                  !form.account_name.trim()
                }
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving…
                  </>
                ) : editingId ? (
                  "Save changes"
                ) : (
                  "Add account"
                )}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : accounts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No accounts yet. Add your first one on the left.
              </CardContent>
            </Card>
          ) : (
            accounts.map((a) => (
              <BankAccountCard
                key={a.id}
                account={a}
                onEdit={startEdit}
                onDelete={remove}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

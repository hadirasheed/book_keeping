"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { bankCode, TINTS } from "@/lib/utils";
import type { BankAccount } from "@/lib/types";

const CURRENCIES = ["KWD", "USD", "EUR", "GBP", "SAR", "AED"];
const EMPTY = { bank_name: "", account_name: "", account_number_last4: "", currency: "KWD" };

export default function AccountsPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = use(params);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/bank-accounts?bookId=${bookId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setAccounts(json.bankAccounts);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY });
    setOpen(true);
  }

  function openEdit(a: BankAccount) {
    setEditingId(a.id);
    setForm({
      bank_name: a.bank_name,
      account_name: a.account_name,
      account_number_last4: a.account_number_last4 ?? "",
      currency: a.currency,
    });
    setOpen(true);
  }

  async function save() {
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
      setOpen(false);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
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
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="mz-fade px-10 pb-10 pt-[26px] max-[820px]:px-4">
      <div className="mb-3">
        <Link
          href={`/dashboard/${bookId}`}
          className="text-[13px] font-semibold text-[#6c7378] hover:text-[#0070e0]"
        >
          ← Back to book
        </Link>
      </div>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[19px] font-bold text-[#001c64]">Bank accounts</h2>
          <div className="mt-0.5 text-[13.5px] text-[#6c7378]">
            Each statement upload is tied to one of these accounts.
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          + Add account
        </Button>
      </div>

      {error && (
        <p className="mb-4 rounded-[10px] border border-[#c0392b]/30 bg-[#fbeae8] p-3 text-sm text-[#c0392b]">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[#6c7378]">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[#c3cbd3] p-12 text-center text-sm text-[#6c7378]">
          No accounts yet. Add your first one to start uploading statements.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 max-[820px]:grid-cols-1">
          {accounts.map((a, i) => {
            const t = TINTS[i % TINTS.length];
            return (
              <div
                key={a.id}
                className="rounded-[14px] border border-[#e6e9ec] bg-white p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-11 items-center justify-center rounded-[10px] text-[13px] font-bold"
                      style={{ background: t.bg, color: t.color }}
                    >
                      {bankCode(a.bank_name)}
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-[#001c64]">
                        {a.account_name}
                      </div>
                      <div className="mt-0.5 text-[13px] text-[#6c7378]">
                        {a.bank_name}
                      </div>
                    </div>
                  </div>
                  <span className="rounded-[6px] bg-[#eef1f4] px-2.5 py-1 text-[11px] font-bold text-[#4a5056]">
                    {a.currency}
                  </span>
                </div>
                <div className="mt-[18px] flex items-center justify-between border-t border-[#eef1f4] pt-3.5">
                  <div className="text-[14px] tracking-[1px] text-[#8b9198]">
                    •••• {a.account_number_last4 || "0000"}
                  </div>
                  <div className="flex gap-3.5">
                    <button
                      onClick={() => openEdit(a)}
                      className="text-[13px] font-semibold text-[#0070e0] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(a)}
                      className="text-[13px] font-semibold text-[#c0392b] hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Account modal */}
      <Dialog open={open} onOpenChange={setOpen} className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Edit account" : "Add bank account"}
          </DialogTitle>
          <DialogDescription>
            Details help match uploaded statements to the right account.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3.5 max-[820px]:grid-cols-1">
          <div className="col-span-2 space-y-2 max-[820px]:col-span-1">
            <Label htmlFor="bank_name">Bank name</Label>
            <Input
              id="bank_name"
              value={form.bank_name}
              onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
              placeholder="e.g. Emirates NBD"
              autoFocus
            />
          </div>
          <div className="col-span-2 space-y-2 max-[820px]:col-span-1">
            <Label htmlFor="account_name">Nickname</Label>
            <Input
              id="account_name"
              value={form.account_name}
              onChange={(e) =>
                setForm({ ...form, account_name: e.target.value })
              }
              placeholder="e.g. Operating"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last4">Last 4 digits</Label>
            <Input
              id="last4"
              value={form.account_number_last4}
              maxLength={4}
              inputMode="numeric"
              onChange={(e) =>
                setForm({
                  ...form,
                  account_number_last4: e.target.value.replace(/\D/g, "").slice(0, 4),
                })
              }
              placeholder="1234"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              id="currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={
              saving || !form.bank_name.trim() || !form.account_name.trim()
            }
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />{" "}
                {editingId ? "Saving…" : "Adding…"}
              </>
            ) : editingId ? (
              "Save changes"
            ) : (
              "Add account"
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

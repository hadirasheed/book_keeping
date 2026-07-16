"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { StatementUploader } from "@/components/StatementUploader";
import type { BankAccount } from "@/lib/types";

export default function UploadPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = use(params);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/bank-accounts?bookId=${bookId}`);
      const json = await res.json();
      if (res.ok) {
        setAccounts(json.bankAccounts);
        if (json.bankAccounts.length === 1)
          setSelected(json.bankAccounts[0].id);
      }
      setLoading(false);
    })();
  }, [bookId]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/dashboard/${bookId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to book
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Upload statement</h1>
        <p className="text-sm text-muted-foreground">
          Choose the account this statement belongs to, then upload the file.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading accounts…
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-6 text-sm">
            <p className="text-muted-foreground">
              You need a bank account before uploading a statement.
            </p>
            <Link
              href={`/dashboard/${bookId}/accounts`}
              className={buttonVariants()}
            >
              Add a bank account
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Step 1: select account */}
          <div className="space-y-1.5">
            <Label htmlFor="account">Step 1 — Bank account</Label>
            <Select
              id="account"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Select an account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name} · {a.bank_name}
                  {a.account_number_last4
                    ? ` (••${a.account_number_last4})`
                    : ""}
                </option>
              ))}
            </Select>
          </div>

          {/* Step 2: upload file */}
          <div className="space-y-1.5">
            <Label>Step 2 — Statement file</Label>
            {selected ? (
              <StatementUploader bookId={bookId} bankAccountId={selected} />
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Select a bank account above to enable the upload.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

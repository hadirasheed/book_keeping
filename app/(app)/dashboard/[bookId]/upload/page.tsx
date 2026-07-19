"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StatementUploader } from "@/components/StatementUploader";
import { StatusBadge } from "@/components/StatusBadge";
import { ProcessButton } from "@/components/ProcessButton";
import type { BankAccount, StatementWithAccount } from "@/lib/types";

function fileExt(name: string) {
  const parts = name.split(".");
  return (parts.length > 1 ? parts.pop() : "")?.toUpperCase() || "DOC";
}

export default function UploadPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = use(params);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [statements, setStatements] = useState<StatementWithAccount[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadStatements() {
    const res = await fetch(`/api/statements?bookId=${bookId}`);
    const json = await res.json();
    if (res.ok) setStatements(json.statements);
  }

  useEffect(() => {
    (async () => {
      const [accRes] = await Promise.all([
        fetch(`/api/bank-accounts?bookId=${bookId}`),
        loadStatements(),
      ]);
      const accJson = await accRes.json();
      if (accRes.ok) setAccounts(accJson.bankAccounts);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  function onUploaded() {
    void loadStatements();
  }

  return (
    <div className="mz-fade max-w-[760px] px-10 pb-10 pt-[26px] max-[820px]:px-4">
      <div className="mb-3">
        <Link
          href={`/dashboard/${bookId}`}
          className="text-[13px] font-semibold text-[#6c7378] hover:text-[#0070e0]"
        >
          ← Back to book
        </Link>
      </div>
      <h2 className="text-[19px] font-bold text-[#001c64]">Upload a statement</h2>
      <div className="mb-[22px] mt-0.5 text-[13.5px] text-[#6c7378]">
        Select the account this statement belongs to, then add a PDF or CSV.
        Mizan AI will extract and categorize the transactions.
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[#6c7378]">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-[14px] border border-[#e6e9ec] bg-white p-6">
          <p className="text-sm text-[#6c7378]">
            You need a bank account before uploading a statement.
          </p>
          <Link
            href={`/dashboard/${bookId}/accounts`}
            className={`${buttonVariants({ size: "sm" })} mt-4`}
          >
            Add a bank account
          </Link>
        </div>
      ) : (
        <StatementUploader
          bookId={bookId}
          accounts={accounts}
          onUploaded={onUploaded}
        />
      )}

      {/* Recent uploads */}
      <h3 className="mb-3 mt-7 text-[15px] font-bold text-[#001c64]">
        Recent uploads
      </h3>
      <div className="overflow-hidden rounded-[14px] border border-[#e6e9ec] bg-white">
        {statements.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#8b9198]">
            No uploads yet.
          </div>
        ) : (
          statements.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between border-b border-[#f2f4f7] px-5 py-3.5 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-[30px] items-center justify-center rounded-[7px] bg-[#fbeae8] text-[10px] font-bold text-[#c0392b]">
                  {fileExt(s.file_name)}
                </div>
                <div>
                  <div className="text-[13.5px] font-semibold text-[#2c2e2f]">
                    {s.file_name}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[#8b9198]">
                    {s.bank_account?.account_name ?? "—"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={s.status} />
                <ProcessButton
                  statementId={s.id}
                  status={s.status}
                  onDone={loadStatements}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

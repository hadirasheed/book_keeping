"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { BankAccount, Statement } from "@/lib/types";

interface Props {
  bookId: string;
  accounts: BankAccount[];
  onUploaded: (statement: Statement) => void;
}

// Upload icon chip contents.
function UploadArrow() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path d="M11 15V4M11 4L6.5 8.5M11 4L15.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 14v3a1 1 0 001 1h14a1 1 0 001-1v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Card matching the design: account select + dropzone + "Upload & process".
export function StatementUploader({ bookId, accounts, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [accountId, setAccountId] = useState(
    accounts.length === 1 ? accounts[0].id : ""
  );
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!accountId) {
      setError("Choose a bank account first.");
      return;
    }
    if (!file) {
      setError("Choose a statement file.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("bookId", bookId);
      form.append("bankAccountId", accountId);
      const res = await fetch("/api/statements", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onUploaded(json.statement);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-[#e6e9ec] bg-white p-6">
      <Label className="mb-2">Bank account</Label>
      <Select
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        className="mb-5"
      >
        <option value="">Select an account…</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.account_name} — {a.bank_name}
            {a.account_number_last4 ? ` •••• ${a.account_number_last4}` : ""} (
            {a.currency})
          </option>
        ))}
      </Select>

      <Label className="mb-2">Statement file</Label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) {
            setFile(f);
            setError(null);
          }
        }}
        className={`cursor-pointer rounded-xl border-[1.5px] border-dashed p-9 text-center transition-colors ${
          dragOver
            ? "border-[#0070e0] bg-[#f7fbff]"
            : "border-[#c3cbd3] hover:border-[#0070e0] hover:bg-[#f7fbff]"
        }`}
      >
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-[12px] bg-[#e6f0fc] text-[#0070e0]">
          <UploadArrow />
        </div>
        <div className="text-[14.5px] font-bold text-[#2c2e2f]">
          {file ? file.name : "Click to choose a file"}
        </div>
        <div className="mt-1 text-[12.5px] text-[#8b9198]">
          PDF or CSV up to 20 MB
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.csv,application/pdf,text/csv"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError(null);
          }}
        />
      </div>

      {error && (
        <p className="mt-3 whitespace-pre-wrap break-words rounded-[10px] bg-[#fbeae8] px-4 py-2.5 text-[13px] text-[#c0392b]">
          Upload failed: {error}
        </p>
      )}

      <Button
        onClick={upload}
        disabled={uploading}
        className="mt-5 w-full"
        size="lg"
      >
        {uploading ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Uploading…
          </>
        ) : (
          "Upload & process"
        )}
      </Button>
    </div>
  );
}

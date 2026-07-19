"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { StatementStatus } from "@/lib/types";

interface Props {
  statementId: string;
  status: StatementStatus;
  onDone: () => void;
}

// "Run AI" trigger for a single statement. Kicks off server-side extraction
// with the active provider and refreshes the caller on completion.
export function ProcessButton({ statementId, status, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const running = busy || status === "processing";

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/statements/${statementId}/process`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Processing failed");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const label =
    status === "failed" ? "Retry AI" : status === "done" ? "Re-run" : "Run AI";

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={run}
        disabled={running}
        title={error ?? undefined}
        className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#0070e0] bg-[#e6f0fc] px-3 py-1 text-[12px] font-bold text-[#0070e0] transition-colors hover:bg-[#d6e6fb] disabled:opacity-60"
      >
        {running ? (
          <>
            <Loader2 className="size-3.5 animate-spin" /> Processing…
          </>
        ) : (
          <>
            <Sparkles className="size-3.5" /> {label}
          </>
        )}
      </button>
      {error && (
        <span className="max-w-[220px] truncate text-[11px] text-[#c0392b]" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { StatementStatus } from "@/lib/types";

export interface ActionMessage {
  ok: boolean;
  text: string;
}

interface Props {
  statementId: string;
  fileName?: string;
  status: StatementStatus;
  onDone: () => void;
  onMessage: (m: ActionMessage) => void;
}

// "Run AI" trigger for a single statement. Extraction runs server-side; the
// full result/error text is reported to the parent via onMessage so it can be
// shown in a prominent, untruncated banner.
export function ProcessButton({
  statementId,
  fileName,
  status,
  onDone,
  onMessage,
}: Props) {
  const [busy, setBusy] = useState(false);
  const running = busy || status === "processing";
  const who = fileName ? ` for “${fileName}”` : "";

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/api/statements/${statementId}/process`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Processing failed (HTTP ${res.status}).`);
      }
      const u = json.usage;
      const tokens = u
        ? ` Tokens: ${Number(u.input_tokens).toLocaleString()} in / ${Number(
            u.output_tokens
          ).toLocaleString()} out.`
        : "";
      onMessage({
        ok: true,
        text: `AI run complete${who} — ${json.inserted} transaction${
          json.inserted === 1 ? "" : "s"
        } extracted.${tokens}`,
      });
    } catch (err) {
      onMessage({ ok: false, text: `AI run failed${who}: ${(err as Error).message}` });
    } finally {
      setBusy(false);
      onDone();
    }
  }

  const label =
    status === "failed" ? "Retry AI" : status === "done" ? "Re-run" : "Run AI";

  return (
    <button
      onClick={run}
      disabled={running}
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
  );
}

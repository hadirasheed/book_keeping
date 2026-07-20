"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { StatementStatus } from "@/lib/types";

export interface ActionMessage {
  ok: boolean;
  text: string;
}

interface Props {
  statementId: string;
  fileName?: string;
  status: StatementStatus;
  /** True when another already-processed statement shares this file name. */
  warnDuplicate?: boolean;
  onDone: () => void;
  onMessage: (m: ActionMessage) => void;
}

// "Run AI" trigger. Re-running a processed statement (or one whose file name
// matches an already-processed sibling) asks for confirmation first, since that
// is where duplicate data can creep in.
export function ProcessButton({
  statementId,
  fileName,
  status,
  warnDuplicate,
  onDone,
  onMessage,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const running = busy || status === "processing";
  const who = fileName ? ` for “${fileName}”` : "";

  async function run() {
    setConfirmOpen(false);
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
        } read and added.${tokens}`,
      });
    } catch (err) {
      onMessage({ ok: false, text: `AI run failed${who}: ${(err as Error).message}` });
    } finally {
      setBusy(false);
      onDone();
    }
  }

  const needsConfirm = status === "done" || Boolean(warnDuplicate);

  function onClick() {
    if (needsConfirm) setConfirmOpen(true);
    else void run();
  }

  const label =
    status === "failed" ? "Retry AI" : status === "done" ? "Re-run" : "Run AI";

  const confirmDescription = warnDuplicate
    ? `Another statement named “${fileName}” in this book has already been read by AI. Running this one ADDS its transactions on top of the existing ones, which can create duplicates.\n\nYou can clean these up afterward with “Remove duplicates” in the Combined transactions section. Continue?`
    : `“${fileName}” was already processed. Re-running replaces this statement's existing transactions with a fresh extraction — it will not double them.\n\nContinue?`;

  return (
    <>
      <button
        onClick={onClick}
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

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={warnDuplicate ? "Possible duplicate data" : "Re-run AI?"}
        description={confirmDescription}
        confirmLabel="Run AI"
        onConfirm={run}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ActionMessage } from "@/components/ProcessButton";

interface Props {
  statementId: string;
  fileName: string;
  onDone: () => void;
  onMessage: (m: ActionMessage) => void;
}

// Delete an uploaded statement (file + its transactions) behind a confirmation.
export function DeleteStatementButton({
  statementId,
  fileName,
  onDone,
  onMessage,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/statements?id=${statementId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      onMessage({ ok: true, text: `Deleted “${fileName}” and its transactions.` });
    } catch (err) {
      onMessage({
        ok: false,
        text: `Could not delete “${fileName}”: ${(err as Error).message}`,
      });
    } finally {
      setBusy(false);
      setOpen(false);
      onDone();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={busy}
        aria-label={`Delete ${fileName}`}
        title="Delete statement"
        className="inline-flex size-7 items-center justify-center rounded-full text-[#c0392b] transition-colors hover:bg-[#fbeae8] disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Trash2 className="size-3.5" />
        )}
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete statement?"
        description={`This permanently deletes “${fileName}”, its uploaded file, and every transaction extracted from it. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={busy}
        onConfirm={remove}
      />
    </>
  );
}

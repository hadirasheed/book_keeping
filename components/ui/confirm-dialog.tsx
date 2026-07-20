"use client";

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

// Controlled yes/no confirmation modal built on the Mizan Dialog.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  loading,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-[460px]">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="whitespace-pre-wrap">
          {description}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <button
          onClick={() => onOpenChange(false)}
          disabled={loading}
          className="rounded-full border-[1.5px] border-[#c3cbd3] bg-white px-5 py-2.5 text-[14px] font-bold text-[#001c64] transition-colors hover:border-[#0070e0] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-bold text-white transition-colors disabled:opacity-60"
          style={{ background: destructive ? "#c0392b" : "#0070e0" }}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {confirmLabel}
        </button>
      </DialogFooter>
    </Dialog>
  );
}

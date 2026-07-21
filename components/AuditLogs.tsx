"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  ScrollText,
  Loader2,
} from "lucide-react";
import { relativeTime } from "@/lib/utils";
import type { AuditLog } from "@/lib/types";

// Lists a book's saved AI audits as cards that expand on click to reveal the
// full summary, flags and recommendations. Exposes an imperative refresh via
// the `refreshKey` prop (bump it after running a new audit).
export function AuditLogs({
  bookId,
  refreshKey,
}: {
  bookId: string;
  refreshKey: number;
}) {
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/books/${bookId}/audit`);
      const json = await res.json();
      if (res.ok) setAudits(json.audits ?? []);
    } catch {
      // Non-fatal: the panel just stays empty.
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const rangeLabel = (a: AuditLog) => {
    if (a.range_from && a.range_to) return `${a.range_from} → ${a.range_to}`;
    if (a.range_from) return `From ${a.range_from}`;
    if (a.range_to) return `Until ${a.range_to}`;
    return "All dates";
  };

  if (loading) {
    return (
      <div className="mt-6 flex items-center gap-2 text-[13px] text-[#8b9198]">
        <Loader2 className="size-4 animate-spin" /> Loading audit logs…
      </div>
    );
  }

  if (audits.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-1.5 text-[14px] font-bold text-[#001c64]">
        <ScrollText className="size-4 text-[#0070e0]" /> Audit logs
        <span className="ml-1 rounded-full bg-[#eef1f4] px-2 py-0.5 text-[11px] font-semibold text-[#6c7378]">
          {audits.length}
        </span>
      </div>

      <div className="space-y-2.5">
        {audits.map((a) => {
          const open = openId === a.id;
          return (
            <div
              key={a.id}
              className="overflow-hidden rounded-[12px] border border-[#e6e9ec] bg-white"
            >
              <button
                onClick={() => setOpenId(open ? null : a.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f7fbff]"
              >
                {open ? (
                  <ChevronDown className="size-4 shrink-0 text-[#0070e0]" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-[#8b9198]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-[13px] font-bold text-[#001c64]">
                      {rangeLabel(a)}
                    </span>
                    <span className="text-[12px] text-[#8b9198]">
                      · {a.txn_count} txn{a.txn_count === 1 ? "" : "s"}
                    </span>
                    {(a.flags?.length ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf3e3] px-2 py-0.5 text-[11px] font-semibold text-[#9a6a00]">
                        <AlertTriangle className="size-3" /> {a.flags.length}
                      </span>
                    )}
                  </div>
                  {!open && a.summary && (
                    <p className="mt-0.5 truncate text-[12.5px] text-[#6c7378]">
                      {a.summary}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[11.5px] text-[#8b9198]">
                  {relativeTime(a.created_at)}
                </span>
              </button>

              {open && (
                <div className="border-t border-[#eef1f4] px-4 py-3.5">
                  {a.summary && (
                    <p className="text-[13.5px] leading-relaxed text-[#2c2e2f]">
                      {a.summary}
                    </p>
                  )}
                  {(a.flags?.length ?? 0) > 0 && (
                    <div className="mt-3.5">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold text-[#9a6a00]">
                        <AlertTriangle className="size-4" /> Flags
                      </div>
                      <ul className="list-disc space-y-1 pl-5 text-[13px] text-[#2c2e2f]">
                        {a.flags.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(a.recommendations?.length ?? 0) > 0 && (
                    <div className="mt-3.5">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold text-[#1a7f4b]">
                        <Lightbulb className="size-4" /> Recommendations
                      </div>
                      <ul className="list-disc space-y-1 pl-5 text-[13px] text-[#2c2e2f]">
                        {a.recommendations.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-3.5 text-[11.5px] text-[#8b9198]">
                    Tokens: {a.input_tokens.toLocaleString()} in /{" "}
                    {a.output_tokens.toLocaleString()} out
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { X } from "lucide-react";

// A compact from/to date range filter. Used both above the Financial Summary
// and above the transaction list to scope what is shown/audited.
export function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
}) {
  const active = Boolean(from || to);
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <span className="text-[12px] font-semibold text-[#6c7378]">Dates</span>
      <input
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => onChange({ from: e.target.value, to })}
        className="rounded-[9px] border border-[#d7dde2] bg-white px-2.5 py-1.5 text-[12.5px] text-[#2c2e2f] outline-none focus:border-[#0070e0]"
        aria-label="From date"
      />
      <span className="text-[12px] text-[#8b9198]">→</span>
      <input
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => onChange({ from, to: e.target.value })}
        className="rounded-[9px] border border-[#d7dde2] bg-white px-2.5 py-1.5 text-[12.5px] text-[#2c2e2f] outline-none focus:border-[#0070e0]"
        aria-label="To date"
      />
      {active && (
        <button
          onClick={() => onChange({ from: "", to: "" })}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-semibold text-[#6c7378] transition-colors hover:bg-[#eef1f4] hover:text-[#2c2e2f]"
        >
          <X className="size-3.5" /> Clear
        </button>
      )}
    </div>
  );
}

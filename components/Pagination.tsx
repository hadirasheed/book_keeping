"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number; // 0-indexed
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

// Windowed page numbers: first, last, current ±1, with gaps as -1.
function pageWindow(page: number, pageCount: number): number[] {
  const pages = new Set<number>([0, pageCount - 1, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 0 && p < pageCount).sort((a, b) => a - b);
  const out: number[] = [];
  let prev = -2;
  for (const p of sorted) {
    if (p - prev > 1) out.push(-1); // gap marker
    out.push(p);
    prev = p;
  }
  return out;
}

// Pager for the transactions table — shown above and below the list.
export function Pagination({ page, pageCount, total, pageSize, onChange }: Props) {
  if (pageCount <= 1) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, from + pageSize - 1);

  const btn =
    "flex h-8 min-w-8 items-center justify-center rounded-[8px] border border-[#e6e9ec] bg-white px-2 text-[13px] font-semibold text-[#2c2e2f] transition-colors hover:border-[#0070e0] disabled:opacity-40 disabled:hover:border-[#e6e9ec]";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-1">
      <span className="text-[12.5px] text-[#6c7378]">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          className={btn}
          onClick={() => onChange(page - 1)}
          disabled={page === 0}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>

        {pageWindow(page, pageCount).map((p, i) =>
          p === -1 ? (
            <span key={`gap-${i}`} className="px-1 text-[13px] text-[#8b9198]">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={
                p === page
                  ? "flex h-8 min-w-8 items-center justify-center rounded-[8px] bg-[#0070e0] px-2 text-[13px] font-bold text-white"
                  : btn
              }
            >
              {p + 1}
            </button>
          )
        )}

        <button
          className={btn}
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount - 1}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>

        {/* Jump-to-page select */}
        <div className="relative ml-1">
          <select
            value={page}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-8 appearance-none rounded-[8px] border border-[#e6e9ec] bg-white pl-2.5 pr-7 text-[13px] font-semibold text-[#2c2e2f] outline-none focus-visible:border-[#0070e0]"
            aria-label="Go to page"
          >
            {Array.from({ length: pageCount }, (_, i) => (
              <option key={i} value={i}>
                Page {i + 1} of {pageCount}
              </option>
            ))}
          </select>
          <ChevronRight className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 rotate-90 text-[#8b9198]" />
        </div>
      </div>
    </div>
  );
}

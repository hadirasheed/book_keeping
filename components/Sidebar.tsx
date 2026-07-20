"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, ShieldCheck } from "lucide-react";
import { MizanLogo } from "@/components/MizanLogo";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Me {
  email: string;
  name: string | null;
  isAdmin: boolean;
}

// Grid icon for Dashboard.
function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="1" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="10" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="1" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="10" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

const navItem =
  "flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[14.5px] font-semibold transition-colors text-left";
const subItem =
  "rounded-[9px] px-3.5 py-2.5 text-[13.5px] font-semibold text-left transition-colors";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  // Off-canvas drawer state (only relevant below the 820px breakpoint).
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Detect the current book from the URL (/dashboard/{id}[/...]).
  const bookMatch = pathname.match(/^\/dashboard\/([^/]+)(\/(accounts|upload))?/);
  const bookId = bookMatch?.[1];
  const bookSub = bookMatch?.[3]; // "accounts" | "upload" | undefined (overview)

  useEffect(() => {
    if (!bookId) return;
    fetch("/api/books")
      .then((r) => r.json())
      .then((j) => setBooks(j.books ?? []))
      .catch(() => {});
  }, [bookId]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((j) => setMe(j?.email ? j : null))
      .catch(() => {});
  }, []);

  // Auto-close the drawer on any navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const currentBook = books.find((b) => b.id === bookId);

  const onDashboard = pathname === "/dashboard";
  const onAdmin = pathname.startsWith("/admin");

  const active = "bg-white/[.14] text-white";
  const inactive = "text-[#a9c2e8] hover:bg-white/[.06]";

  const displayName = me?.name || me?.email?.split("@")[0] || "Account";
  const avatarInitial = (me?.name || me?.email || "?").charAt(0).toUpperCase();

  async function logout() {
    setLoggingOut(true);
    try {
      await createBrowserSupabase().auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      {/* Mobile top bar (below 820px): hamburger + wordmark opens the drawer. */}
      <div
        onClick={() => setDrawerOpen(true)}
        className="fixed inset-x-0 top-0 z-[55] hidden h-[52px] cursor-pointer items-center gap-3 bg-[#001c64] px-4 text-white max-[820px]:flex"
      >
        <Menu className="size-[22px]" />
        <span className="text-[17px] font-bold tracking-[-.3px]">Mizan</span>
      </div>

      {/* Scrim behind the open drawer. */}
      <div
        data-open={drawerOpen}
        onClick={() => setDrawerOpen(false)}
        className="fixed inset-0 z-[58] hidden bg-[rgba(0,28,100,.4)] max-[820px]:data-[open=true]:block"
      />

      <aside
        data-open={drawerOpen}
        className={cn(
          "flex w-[250px] flex-none flex-col bg-[#001c64] px-[18px] py-[26px] text-white",
          // Off-canvas drawer below 820px.
          "max-[820px]:fixed max-[820px]:inset-y-0 max-[820px]:left-0 max-[820px]:z-[60] max-[820px]:w-[260px]",
          "max-[820px]:-translate-x-full max-[820px]:transition-transform max-[820px]:duration-[260ms] max-[820px]:ease-out",
          "max-[820px]:data-[open=true]:translate-x-0 max-[820px]:data-[open=true]:shadow-[0_0_60px_rgba(0,0,0,.4)]"
        )}
      >
      {/* Brand */}
      <div className="flex items-center gap-[11px] px-2 pb-1">
        <MizanLogo />
        <div>
          <div className="text-[21px] font-bold leading-none tracking-[-.3px]">
            Mizan
          </div>
          <div className="mt-[3px] text-[12px] text-[#8fb4e8]" dir="rtl">
            ميزان · balance
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="mt-[34px] flex flex-col gap-1">
        <Link
          href="/dashboard"
          className={cn(navItem, onDashboard ? active : inactive)}
        >
          <GridIcon />
          Dashboard
        </Link>
        {me?.isAdmin && (
          <Link
            href="/admin"
            className={cn(navItem, onAdmin ? active : inactive)}
          >
            <ShieldCheck className="size-[18px]" />
            Admin
          </Link>
        )}
      </nav>

      {/* Book sub-nav */}
      {bookId && (
        <div className="mt-[26px] border-t border-white/[.12] pt-[22px]">
          <div className="px-3.5 pb-2.5 text-[11px] font-bold uppercase tracking-[.9px] text-[#7e9fd6]">
            Book
          </div>
          <div className="px-3.5 pb-3.5 text-[15px] font-bold text-white">
            {currentBook?.name ?? "…"}
          </div>
          <div className="flex flex-col gap-[3px]">
            <Link
              href={`/dashboard/${bookId}`}
              className={cn(subItem, !bookSub ? active : inactive)}
            >
              Overview
            </Link>
            <Link
              href={`/dashboard/${bookId}/accounts`}
              className={cn(subItem, bookSub === "accounts" ? active : inactive)}
            >
              Bank accounts
            </Link>
            <Link
              href={`/dashboard/${bookId}/upload`}
              className={cn(subItem, bookSub === "upload" ? active : inactive)}
            >
              Upload statement
            </Link>
          </div>
        </div>
      )}

      {/* User + logout */}
      <div className="mt-auto border-t border-white/[.12] pt-3">
        <div className="flex items-center gap-[11px] px-2.5 pt-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-[#009cde] text-[14px] font-bold text-[#001c64]">
            {avatarInitial}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold">
              {displayName}
            </div>
            <div className="truncate text-[12px] text-[#8fb4e8]">
              {me?.email ?? ""}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          disabled={loggingOut}
          className="mt-2 flex w-full items-center gap-2 rounded-[9px] px-2.5 py-2 text-[13px] font-semibold text-[#a9c2e8] transition-colors hover:bg-white/[.06] hover:text-white disabled:opacity-50"
        >
          <LogOut className="size-4" />
          Log out
        </button>
      </div>
      </aside>
    </>
  );
}

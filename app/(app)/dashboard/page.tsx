"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { initials, relativeTime } from "@/lib/utils";
import type { BookWithStats } from "@/lib/types";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[14px] border border-[#e6e9ec] bg-white px-[22px] py-5">
      <div className="text-[13px] font-semibold text-[#6c7378]">{label}</div>
      <div className="mt-1.5 text-[30px] font-bold text-[#001c64]">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [books, setBooks] = useState<BookWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadBooks() {
    try {
      const res = await fetch("/api/books");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load books");
      setBooks(json.books);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBooks();
  }, []);

  async function createBook() {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: kind }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create book");
      router.push(`/dashboard/${json.book.id}`);
    } catch (err) {
      setError((err as Error).message);
      setCreating(false);
    }
  }

  const totals = books.reduce(
    (acc, b) => {
      acc.statements += b.statement_count;
      acc.transactions += b.transaction_count;
      return acc;
    },
    { statements: 0, transactions: 0 }
  );

  return (
    <div className="mz-fade px-10 py-8">
      {/* Header */}
      <div className="mb-7 flex items-end justify-between gap-5">
        <div>
          <div className="mb-1.5 text-[13px] font-semibold text-[#6c7378]">
            Welcome back
          </div>
          <h1 className="text-[28px] font-bold tracking-[-.5px] text-[#001c64]">
            Your books
          </h1>
        </div>
        <Button onClick={() => setOpen(true)}>+ New book</Button>
      </div>

      {error && !open && (
        <p className="mb-6 rounded-[10px] border border-[#c0392b]/30 bg-[#fbeae8] p-3 text-sm text-[#c0392b]">
          {error}
        </p>
      )}

      {/* Stats */}
      <div className="mb-[30px] grid grid-cols-1 gap-[18px] sm:grid-cols-3">
        <StatCard label="Active books" value={books.length} />
        <StatCard
          label="Statements processed"
          value={totals.statements.toLocaleString()}
        />
        <StatCard
          label="Transactions categorized"
          value={totals.transactions.toLocaleString()}
        />
      </div>

      {/* Books grid */}
      {loading ? (
        <div className="flex items-center gap-2 text-[#6c7378]">
          <Loader2 className="size-4 animate-spin" /> Loading books…
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-[18px]">
          {books.map((book) => (
            <button
              key={book.id}
              onClick={() => router.push(`/dashboard/${book.id}`)}
              className="group rounded-[14px] border border-[#e6e9ec] bg-white p-[22px] text-left transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,28,100,.1)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-[11px] bg-[#e6f0fc] text-[18px] font-bold text-[#0070e0]">
                  {initials(book.name)}
                </div>
                <div className="text-[12px] text-[#8b9198]">
                  Updated {relativeTime(book.created_at)}
                </div>
              </div>
              <div className="mt-4 text-[17px] font-bold text-[#001c64]">
                {book.name}
              </div>
              <div className="mt-0.5 text-[13px] text-[#6c7378]">
                {book.description || "General"}
              </div>
              <div className="mt-[18px] flex gap-5 border-t border-[#eef1f4] pt-4">
                {([
                  ["Accounts", book.account_count],
                  ["Statements", book.statement_count],
                  ["Transactions", book.transaction_count],
                ] as const).map(([l, v]) => (
                  <div key={l}>
                    <div className="text-[11px] font-semibold text-[#8b9198]">
                      {l}
                    </div>
                    <div className="mt-0.5 text-[15px] font-bold text-[#2c2e2f]">
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </button>
          ))}

          {/* Create tile */}
          <button
            onClick={() => setOpen(true)}
            className="group flex min-h-[190px] flex-col items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-[#c3cbd3] p-[22px] text-[#6c7378] transition-colors hover:border-[#0070e0] hover:text-[#0070e0]"
          >
            <div className="text-[34px] font-light leading-none">+</div>
            <div className="mt-2 text-[14px] font-semibold">
              Create a new book
            </div>
          </button>
        </div>
      )}

      {/* New Book modal */}
      <Dialog open={open} onOpenChange={setOpen} className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Create a new book</DialogTitle>
          <DialogDescription>
            A book groups the bank accounts and statements for one entity.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="book-name">Book name</Label>
            <Input
              id="book-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nour Consulting FZ-LLC"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="book-kind">Type</Label>
            <Input
              id="book-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              placeholder="e.g. Consulting"
            />
          </div>
          {error && open && <p className="text-sm text-[#c0392b]">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={createBook} disabled={creating || !name.trim()}>
            {creating ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Creating…
              </>
            ) : (
              "Create book"
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

interface Row {
  id: string;
  bank_account_id: string;
  txn_date: string;
  amount: number;
  direction: string | null;
  description: string | null;
  created_at: string;
}

// Two transactions are "the same" when account, date, signed amount and
// description match — regardless of which statement they came from.
function dupKey(r: Row): string {
  const desc = (r.description ?? "").trim().toLowerCase();
  return `${r.bank_account_id}|${r.txn_date}|${Number(r.amount).toFixed(2)}|${r.direction ?? ""}|${desc}`;
}

// Return the ids to delete: every duplicate beyond the first (earliest) in each
// group of identical transactions within a book.
async function findDuplicateIds(bookId: string): Promise<string[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, bank_account_id, txn_date, amount, direction, description, created_at, bank_account:bank_accounts!inner(book_id)"
    )
    .eq("bank_account.book_id", bookId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const seen = new Set<string>();
  const toDelete: string[] = [];
  for (const r of (data ?? []) as unknown as Row[]) {
    const key = dupKey(r);
    if (seen.has(key)) toDelete.push(r.id);
    else seen.add(key);
  }
  return toDelete;
}

// GET /api/transactions/dedupe?bookId= — count how many duplicates exist.
export async function GET(req: NextRequest) {
  try {
    const bookId = req.nextUrl.searchParams.get("bookId");
    if (!bookId) {
      return NextResponse.json({ error: "bookId is required" }, { status: 400 });
    }
    const ids = await findDuplicateIds(bookId);
    return NextResponse.json({ duplicates: ids.length });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/transactions/dedupe?bookId= — remove the duplicate rows.
export async function POST(req: NextRequest) {
  try {
    const bookId = req.nextUrl.searchParams.get("bookId");
    if (!bookId) {
      return NextResponse.json({ error: "bookId is required" }, { status: 400 });
    }
    const ids = await findDuplicateIds(bookId);
    if (ids.length > 0) {
      const supabase = getServiceClient();
      const { error } = await supabase.from("transactions").delete().in("id", ids);
      if (error) throw error;
    }
    return NextResponse.json({ removed: ids.length });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

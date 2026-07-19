import { NextRequest, NextResponse } from "next/server";
import { getServiceClient, getDefaultUserId } from "@/lib/supabase-server";

// GET /api/books — list all books for the default user, each with derived
// counts (accounts / statements / transactions) for the dashboard cards.
export async function GET() {
  try {
    const supabase = getServiceClient();
    const userId = await getDefaultUserId();

    const { data: books, error } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const bookIds = (books ?? []).map((b) => b.id);
    // account id -> book id, so statements/transactions (which reference
    // bank_account_id) can be rolled up to their book.
    const accountToBook = new Map<string, string>();
    const accountCount = new Map<string, number>();
    const statementCount = new Map<string, number>();
    const transactionCount = new Map<string, number>();

    if (bookIds.length) {
      const { data: accounts } = await supabase
        .from("bank_accounts")
        .select("id, book_id")
        .in("book_id", bookIds);
      for (const a of accounts ?? []) {
        accountToBook.set(a.id, a.book_id);
        accountCount.set(a.book_id, (accountCount.get(a.book_id) ?? 0) + 1);
      }

      const accountIds = Array.from(accountToBook.keys());
      if (accountIds.length) {
        const [{ data: statements }, { data: transactions }] = await Promise.all([
          supabase
            .from("statements")
            .select("bank_account_id")
            .in("bank_account_id", accountIds),
          supabase
            .from("transactions")
            .select("bank_account_id")
            .in("bank_account_id", accountIds),
        ]);
        for (const s of statements ?? []) {
          const bId = accountToBook.get(s.bank_account_id);
          if (bId) statementCount.set(bId, (statementCount.get(bId) ?? 0) + 1);
        }
        for (const t of transactions ?? []) {
          const bId = accountToBook.get(t.bank_account_id);
          if (bId)
            transactionCount.set(bId, (transactionCount.get(bId) ?? 0) + 1);
        }
      }
    }

    const withStats = (books ?? []).map((b) => ({
      ...b,
      account_count: accountCount.get(b.id) ?? 0,
      statement_count: statementCount.get(b.id) ?? 0,
      transaction_count: transactionCount.get(b.id) ?? 0,
    }));

    return NextResponse.json({ books: withStats });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/books — create a book { name, description? }.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const userId = await getDefaultUserId();
    const { data, error } = await supabase
      .from("books")
      .insert({
        user_id: userId,
        name,
        description: body.description?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ book: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

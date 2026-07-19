import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

// GET /api/transactions?bookId=&bankAccountId=&from=&to=
// Lists transactions across all accounts in a book, with optional filters:
//   - bankAccountId: only this account
//   - from / to: txn_date range (inclusive, YYYY-MM-DD)
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const bookId = params.get("bookId");
    if (!bookId) {
      return NextResponse.json({ error: "bookId is required" }, { status: 400 });
    }
    const bankAccountId = params.get("bankAccountId");
    const from = params.get("from");
    const to = params.get("to");

    const supabase = getServiceClient();
    let query = supabase
      .from("transactions")
      .select(
        "*, bank_account:bank_accounts!inner(id, bank_name, account_name, currency, book_id)"
      )
      .eq("bank_account.book_id", bookId)
      .order("txn_date", { ascending: false });

    if (bankAccountId) query = query.eq("bank_account_id", bankAccountId);
    if (from) query = query.gte("txn_date", from);
    if (to) query = query.lte("txn_date", to);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ transactions: data });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

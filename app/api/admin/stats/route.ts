import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-user";

// GET /api/admin/stats — platform totals for the admin dashboard.
export async function GET() {
  try {
    await requireAdmin();
    const supabase = getServiceClient();

    const count = async (table: string) =>
      (await supabase.from(table).select("*", { count: "exact", head: true }))
        .count ?? 0;

    const [users, books, statements, transactions] = await Promise.all([
      count("users"),
      count("books"),
      count("statements"),
      count("transactions"),
    ]);

    const { data: tokenRows } = await supabase
      .from("users")
      .select("input_tokens, output_tokens");
    const tokens = (tokenRows ?? []).reduce(
      (acc, r) => {
        acc.input += r.input_tokens ?? 0;
        acc.output += r.output_tokens ?? 0;
        return acc;
      },
      { input: 0, output: 0 }
    );

    return NextResponse.json({
      users,
      books,
      statements,
      transactions,
      input_tokens: tokens.input,
      output_tokens: tokens.output,
    });
  } catch (err) {
    const msg = (err as Error).message;
    const status = msg.includes("Admin") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

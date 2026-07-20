import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAdmin, adminEmail } from "@/lib/auth-user";

// GET /api/admin/users — all users with book counts + token usage.
export async function GET() {
  try {
    await requireAdmin();
    const supabase = getServiceClient();

    const { data: users, error } = await supabase
      .from("users")
      .select(
        "id, email, name, input_tokens, output_tokens, last_login_at, created_at"
      )
      .order("created_at", { ascending: true });
    if (error) throw error;

    // Book counts per user.
    const { data: books } = await supabase.from("books").select("user_id");
    const bookCount = new Map<string, number>();
    for (const b of books ?? []) {
      bookCount.set(b.user_id, (bookCount.get(b.user_id) ?? 0) + 1);
    }

    const admin = adminEmail();
    const rows = (users ?? []).map((u) => ({
      ...u,
      book_count: bookCount.get(u.id) ?? 0,
      is_admin: u.email?.toLowerCase() === admin,
    }));

    return NextResponse.json({ users: rows });
  } catch (err) {
    const msg = (err as Error).message;
    const status = msg.includes("Admin") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

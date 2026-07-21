import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getCurrentUserId } from "@/lib/auth-user";
import { userOwnsBook } from "@/lib/ownership";
import { auditTransactions } from "@/lib/ai/audit";
import type { AIModelConfig, TransactionWithAccount } from "@/lib/types";

// GET /api/books/:id/audit — list this book's saved audit logs (newest first).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    const userId = await getCurrentUserId();
    if (!(await userOwnsBook(bookId, userId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ audits: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST /api/books/:id/audit — run the active model over the book's transactions
// (optionally limited to a { from, to } date range) and return an accounting
// audit (summary + flags + recommendations). The result is persisted to
// audit_logs so users can review past audits.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    const userId = await getCurrentUserId();
    if (!(await userOwnsBook(bookId, userId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Optional date range from the request body (YYYY-MM-DD strings).
    let from: string | null = null;
    let to: string | null = null;
    try {
      const body = await req.json();
      if (body && typeof body.from === "string" && body.from) from = body.from;
      if (body && typeof body.to === "string" && body.to) to = body.to;
    } catch {
      // No/invalid body — audit the whole book.
    }

    const supabase = getServiceClient();
    let query = supabase
      .from("transactions")
      .select(
        "*, bank_account:bank_accounts!inner(id, bank_name, account_name, currency, book_id)"
      )
      .eq("bank_account.book_id", bookId);
    if (from) query = query.gte("txn_date", from);
    if (to) query = query.lte("txn_date", to);
    const { data: txns, error } = await query.order("txn_date", {
      ascending: false,
    });
    if (error) throw error;
    if (!txns || txns.length === 0) {
      return NextResponse.json(
        {
          error:
            from || to
              ? "No transactions in that date range. Adjust the range and try again."
              : "No transactions to audit yet. Run AI on a statement first.",
        },
        { status: 400 }
      );
    }

    const { data: config } = await supabase
      .from("ai_model_configs")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    if (!config) {
      return NextResponse.json(
        { error: "No active AI model. Ask an admin to set one active." },
        { status: 400 }
      );
    }
    const cfg = config as AIModelConfig;

    const result = await auditTransactions(
      cfg,
      txns as unknown as TransactionWithAccount[]
    );

    // Attribute token usage (provider config + user).
    await supabase
      .from("ai_model_configs")
      .update({
        input_tokens: cfg.input_tokens + result.usage.input_tokens,
        output_tokens: cfg.output_tokens + result.usage.output_tokens,
      })
      .eq("id", cfg.id);
    const { data: usr } = await supabase
      .from("users")
      .select("input_tokens, output_tokens")
      .eq("id", userId)
      .single();
    if (usr) {
      await supabase
        .from("users")
        .update({
          input_tokens: (usr.input_tokens ?? 0) + result.usage.input_tokens,
          output_tokens: (usr.output_tokens ?? 0) + result.usage.output_tokens,
        })
        .eq("id", userId);
    }

    // Persist the audit so it shows up in the book's Audit Logs.
    const { data: saved } = await supabase
      .from("audit_logs")
      .insert({
        book_id: bookId,
        user_id: userId,
        range_from: from,
        range_to: to,
        txn_count: txns.length,
        summary: result.summary,
        flags: result.flags,
        recommendations: result.recommendations,
        input_tokens: result.usage.input_tokens,
        output_tokens: result.usage.output_tokens,
      })
      .select("*")
      .single();

    return NextResponse.json({ ...result, audit: saved ?? null });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

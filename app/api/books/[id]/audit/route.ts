import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getCurrentUserId } from "@/lib/auth-user";
import { userOwnsBook } from "@/lib/ownership";
import { auditTransactions } from "@/lib/ai/audit";
import type { AIModelConfig, TransactionWithAccount } from "@/lib/types";

// POST /api/books/:id/audit — run the active model over the book's transactions
// and return an accounting audit (summary + flags + recommendations).
export async function POST(
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
    const { data: txns, error } = await supabase
      .from("transactions")
      .select(
        "*, bank_account:bank_accounts!inner(id, bank_name, account_name, currency, book_id)"
      )
      .eq("bank_account.book_id", bookId)
      .order("txn_date", { ascending: false });
    if (error) throw error;
    if (!txns || txns.length === 0) {
      return NextResponse.json(
        { error: "No transactions to audit yet. Run AI on a statement first." },
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

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

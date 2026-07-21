import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getCurrentUserId } from "@/lib/auth-user";
import { userOwnsStatement } from "@/lib/ownership";
import { extractTransactions } from "@/lib/ai/extract";
import type { AIModelConfig } from "@/lib/types";

const BUCKET = "statements";

// POST /api/statements/:id/process
// Runs the active AI model on the (already-uploaded) statement file, extracts
// transactions into the `transactions` table, and moves the statement
// pending/failed -> processing -> done (or -> failed on error).
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();

  // Must own the statement.
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await userOwnsStatement(id, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Load the statement (need bank_account_id + storage path).
  const { data: statement, error: stErr } = await supabase
    .from("statements")
    .select("id, bank_account_id, file_url, file_name, status")
    .eq("id", id)
    .single();
  if (stErr || !statement) {
    return NextResponse.json({ error: "Statement not found" }, { status: 404 });
  }

  // Require an active provider.
  const { data: config } = await supabase
    .from("ai_model_configs")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  if (!config) {
    return NextResponse.json(
      { error: "No active AI model. Ask an admin to set one active in the admin panel." },
      { status: 400 }
    );
  }

  // Mark processing.
  await supabase
    .from("statements")
    .update({ status: "processing" })
    .eq("id", id);

  try {
    // Download the file bytes from Storage.
    const { data: blob, error: dlErr } = await supabase.storage
      .from(BUCKET)
      .download(statement.file_url);
    if (dlErr || !blob) throw new Error("Could not download the statement file.");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const isPdf = /\.pdf$/i.test(statement.file_name);

    const cfg = config as AIModelConfig;
    const { transactions: txns, usage } = await extractTransactions(cfg, {
      bytes,
      fileName: statement.file_name,
      isPdf,
    });

    // Idempotent re-processing: clear any prior rows for this statement first.
    await supabase.from("transactions").delete().eq("statement_id", id);

    if (txns.length > 0) {
      const rows = txns.map((t) => ({
        statement_id: id,
        bank_account_id: statement.bank_account_id,
        txn_date: t.txn_date,
        txn_time: t.txn_time,
        description: t.description,
        raw_description: t.description,
        amount: t.amount,
        direction: t.direction,
        category: t.category,
      }));
      const { error: insErr } = await supabase.from("transactions").insert(rows);
      if (insErr) throw insErr;
    }

    // Accumulate token usage on the provider config and on the user.
    await supabase
      .from("ai_model_configs")
      .update({
        input_tokens: cfg.input_tokens + usage.input_tokens,
        output_tokens: cfg.output_tokens + usage.output_tokens,
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
          input_tokens: (usr.input_tokens ?? 0) + usage.input_tokens,
          output_tokens: (usr.output_tokens ?? 0) + usage.output_tokens,
        })
        .eq("id", userId);
    }

    await supabase
      .from("statements")
      .update({ status: "done", processed_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ status: "done", inserted: txns.length, usage });
  } catch (err) {
    await supabase.from("statements").update({ status: "failed" }).eq("id", id);
    return NextResponse.json(
      { error: (err as Error).message, status: "failed" },
      { status: 500 }
    );
  }
}

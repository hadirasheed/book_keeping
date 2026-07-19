import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { pingProvider } from "@/lib/ai/extract";
import type { AIModelConfig } from "@/lib/types";

// POST /api/ai-models/:id/ping — send a minimal request to the provider to
// verify the key + model work. Records token usage + last_tested_at.
// Always returns HTTP 200 with an `ok` flag so the UI can render the full
// message either way.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();

  const { data: config, error } = await supabase
    .from("ai_model_configs")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !config) {
    return NextResponse.json(
      { ok: false, error: "Provider config not found." },
      { status: 404 }
    );
  }

  const cfg = config as AIModelConfig;
  try {
    const { reply, usage } = await pingProvider(cfg);
    await supabase
      .from("ai_model_configs")
      .update({
        last_tested_at: new Date().toISOString(),
        input_tokens: cfg.input_tokens + usage.input_tokens,
        output_tokens: cfg.output_tokens + usage.output_tokens,
      })
      .eq("id", id);
    return NextResponse.json({ ok: true, reply, usage });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message });
  }
}

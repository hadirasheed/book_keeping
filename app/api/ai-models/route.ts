import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { maskApiKey } from "@/lib/utils";
import type { AIModelConfig, AIModelConfigMasked, AIProvider } from "@/lib/types";

const PROVIDERS: AIProvider[] = ["claude", "openai", "openrouter"];

function toMasked(row: AIModelConfig): AIModelConfigMasked {
  const { api_key, ...rest } = row;
  return {
    ...rest,
    has_key: Boolean(api_key),
    api_key_masked: api_key ? maskApiKey(api_key) : null,
  };
}

// GET /api/ai-models — list all configs with API keys masked.
export async function GET() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("ai_model_configs")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    const configs = (data as AIModelConfig[]).map(toMasked);
    return NextResponse.json({ configs });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/ai-models — upsert a provider config { provider, model_name, api_key? }.
// If a config for the provider already exists and no api_key is supplied, the
// stored key is kept (so users can update the model name without re-entering it).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const provider = body.provider as AIProvider;
    const modelName = (body.model_name ?? "").trim();
    const apiKey = (body.api_key ?? "").trim();

    if (!PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    if (!modelName) {
      return NextResponse.json(
        { error: "model_name is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const { data: existing } = await supabase
      .from("ai_model_configs")
      .select("*")
      .eq("provider", provider)
      .maybeSingle();

    if (!existing && !apiKey) {
      return NextResponse.json(
        { error: "api_key is required for a new provider" },
        { status: 400 }
      );
    }

    // TODO: encrypt api_key before storing. Stored in plain text for the MVP.
    const payload: Record<string, unknown> = {
      provider,
      model_name: modelName,
    };
    if (apiKey) payload.api_key = apiKey;
    else if (existing) payload.api_key = existing.api_key;

    const { data, error } = await supabase
      .from("ai_model_configs")
      .upsert(payload, { onConflict: "provider" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ config: toMasked(data as AIModelConfig) });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ModelConfigCard, type ProviderMeta } from "@/components/ModelConfigCard";
import type { AIModelConfigMasked, AIProvider } from "@/lib/types";

const PROVIDERS: ProviderMeta[] = [
  {
    provider: "claude",
    label: "Claude (Anthropic)",
    placeholderModel: "claude-sonnet-5",
    keyHint: "Anthropic API key, e.g. sk-ant-…",
  },
  {
    provider: "openai",
    label: "OpenAI",
    placeholderModel: "gpt-4.1",
    keyHint: "OpenAI API key, e.g. sk-…",
  },
  {
    provider: "openrouter",
    label: "OpenRouter",
    placeholderModel: "anthropic/claude-sonnet-5",
    keyHint: "OpenRouter key, plus any model string it supports.",
  },
];

export default function ModelsSettingsPage() {
  const [configs, setConfigs] = useState<AIModelConfigMasked[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/ai-models");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setConfigs(json.configs);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const byProvider = (p: AIProvider) => configs.find((c) => c.provider === p);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Models</h1>
        <p className="text-sm text-muted-foreground">
          Configure the provider used to parse statements. Only one can be active
          at a time.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading providers…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.map((meta) => (
            <ModelConfigCard
              key={meta.provider}
              meta={meta}
              config={byProvider(meta.provider)}
              onSaved={load}
              onActivated={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

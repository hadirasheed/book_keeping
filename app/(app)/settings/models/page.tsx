"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ModelConfigCard, type ProviderMeta } from "@/components/ModelConfigCard";
import type { AIModelConfigMasked, AIProvider } from "@/lib/types";

const PROVIDERS: ProviderMeta[] = [
  {
    provider: "claude",
    name: "Anthropic Claude",
    mark: "C",
    tintBg: "#f2ede4",
    tintColor: "#c96442",
    placeholderModel: "claude-sonnet-5",
  },
  {
    provider: "openai",
    name: "OpenAI",
    mark: "AI",
    tintBg: "#e6f4ef",
    tintColor: "#0f8a63",
    placeholderModel: "gpt-4o",
  },
  {
    provider: "openrouter",
    name: "OpenRouter",
    mark: "OR",
    tintBg: "#eceafc",
    tintColor: "#5b3fd6",
    placeholderModel: "anthropic/claude-3.5-sonnet",
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
    <div className="mz-fade max-w-[820px] px-10 pb-10 pt-8">
      <div className="mb-1.5 text-[13px] font-semibold text-[#6c7378]">
        Settings
      </div>
      <h1 className="text-[26px] font-bold tracking-[-.5px] text-[#001c64]">
        AI models
      </h1>
      <div className="mb-[26px] mt-1.5 text-[14px] text-[#6c7378]">
        Connect an AI provider and choose which model reads your statements. The
        active provider is used to extract and categorize every new upload.
      </div>

      {error && (
        <p className="mb-4 rounded-[10px] border border-[#c0392b]/30 bg-[#fbeae8] p-3 text-sm text-[#c0392b]">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[#6c7378]">
          <Loader2 className="size-4 animate-spin" /> Loading providers…
        </div>
      ) : (
        <div className="flex flex-col gap-4">
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

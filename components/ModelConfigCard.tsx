"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AIModelConfigMasked, AIProvider } from "@/lib/types";

interface ProviderMeta {
  provider: AIProvider;
  name: string;
  mark: string;
  tintBg: string;
  tintColor: string;
  placeholderModel: string;
}

interface Props {
  meta: ProviderMeta;
  config: AIModelConfigMasked | undefined;
  onSaved: () => void;
  onActivated: () => void;
}

export function ModelConfigCard({ meta, config, onSaved, onActivated }: Props) {
  const [model, setModel] = useState(config?.model_name ?? "");
  const [apiKey, setApiKey] = useState("");
  const [editingKey, setEditingKey] = useState(!config?.has_key);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = Boolean(config?.is_active);

  const stateLabel = active
    ? "Active — processing statements"
    : config?.has_key
      ? "Connected"
      : "Not connected";
  const stateColor = active ? "#0070e0" : config?.has_key ? "#1a7f4b" : "#8b9198";

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: meta.provider,
          model_name: model,
          api_key: apiKey, // empty keeps stored key
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setApiKey("");
      setEditingKey(false);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function activate() {
    if (!config || active) return;
    setActivating(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai-models/${config.id}/activate`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Activation failed");
      onActivated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActivating(false);
    }
  }

  return (
    <div
      className="rounded-[14px] border-[1.5px] bg-white p-6"
      style={{ borderColor: active ? "#0070e0" : "#e6e9ec" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex size-[42px] items-center justify-center rounded-[10px] text-[16px] font-bold"
            style={{ background: meta.tintBg, color: meta.tintColor }}
          >
            {meta.mark}
          </div>
          <div>
            <div className="text-[16px] font-bold text-[#001c64]">
              {meta.name}
            </div>
            <div
              className="mt-0.5 text-[12.5px] font-semibold"
              style={{ color: stateColor }}
            >
              {stateLabel}
            </div>
          </div>
        </div>
        <button
          onClick={activate}
          disabled={!config || active || activating}
          className="rounded-full border-[1.5px] px-[18px] py-2 text-[13.5px] font-bold transition-colors disabled:cursor-default"
          style={
            active
              ? { background: "#0070e0", color: "#fff", borderColor: "#0070e0" }
              : { background: "#fff", color: "#001c64", borderColor: "#c3cbd3" }
          }
        >
          {activating ? "…" : active ? "Active" : "Set active"}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[12px] text-[#6c7378]">API key</Label>
          {config?.has_key && !editingKey ? (
            <div className="flex h-11 items-center justify-between rounded-[9px] border border-[#d7dde3] bg-[#f7f9fb] px-3.5">
              <code className="text-[13px] text-[#2c2e2f]">
                {config.api_key_masked}
              </code>
              <button
                onClick={() => setEditingKey(true)}
                className="text-[12px] font-semibold text-[#0070e0] hover:underline"
              >
                Update
              </button>
            </div>
          ) : (
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
              className="h-11 rounded-[9px]"
            />
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] text-[#6c7378]">Model name</Label>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={meta.placeholderModel}
            className="h-11 rounded-[9px]"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {error ? (
          <p className="text-[12.5px] text-[#c0392b]">{error}</p>
        ) : (
          <span />
        )}
        <button
          onClick={save}
          disabled={saving || !model.trim()}
          className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#c3cbd3] bg-white px-4 py-2 text-[13px] font-bold text-[#001c64] transition-colors hover:border-[#0070e0] disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save
        </button>
      </div>
    </div>
  );
}

export type { ProviderMeta };

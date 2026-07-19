"use client";

import { useState } from "react";
import { Loader2, Plug } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  reload: () => void;
}

export function ModelConfigCard({ meta, config, reload }: Props) {
  const [model, setModel] = useState(config?.model_name ?? "");
  const [apiKey, setApiKey] = useState("");
  const [editingKey, setEditingKey] = useState(!config?.has_key);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"activate" | "toggle" | "ping" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ping, setPing] = useState<{ ok: boolean; text: string } | null>(null);

  const active = Boolean(config?.is_active);
  const enabled = config?.enabled ?? true;

  const stateLabel = !enabled
    ? "Disabled"
    : active
      ? "Active — processing statements"
      : config?.has_key
        ? "Connected"
        : "Not connected";
  const stateColor = !enabled
    ? "#8b9198"
    : active
      ? "#0070e0"
      : config?.has_key
        ? "#1a7f4b"
        : "#8b9198";

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
      reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function activate() {
    if (!config || active) return;
    setBusy("activate");
    setError(null);
    try {
      const res = await fetch(`/api/ai-models/${config.id}/activate`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Activation failed");
      reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function toggleEnabled(next: boolean) {
    if (!config) return;
    setBusy("toggle");
    setError(null);
    try {
      const res = await fetch(`/api/ai-models/${config.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function testConnection() {
    if (!config) return;
    setBusy("ping");
    setError(null);
    setPing(null);
    try {
      const res = await fetch(`/api/ai-models/${config.id}/ping`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.ok) {
        const u = json.usage;
        setPing({
          ok: true,
          text: `Connection OK — model replied “${json.reply}”. Tokens: ${u.input_tokens.toLocaleString()} in / ${u.output_tokens.toLocaleString()} out.`,
        });
      } else {
        setPing({ ok: false, text: json.error || "Test failed." });
      }
      reload();
    } catch (err) {
      setPing({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="rounded-[14px] border-[1.5px] bg-white p-6"
      style={{ borderColor: active ? "#0070e0" : "#e6e9ec" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
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

        <div className="flex items-center gap-4">
          {/* Enable / disable */}
          <div className="flex items-center gap-2">
            <Switch
              checked={enabled}
              disabled={!config || busy === "toggle"}
              onCheckedChange={toggleEnabled}
            />
            <span className="text-[12.5px] font-semibold text-[#6c7378]">
              {enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <button
            onClick={activate}
            disabled={!config || !enabled || active || busy === "activate"}
            className="rounded-full border-[1.5px] px-[18px] py-2 text-[13.5px] font-bold transition-colors disabled:cursor-default disabled:opacity-60"
            style={
              active
                ? { background: "#0070e0", color: "#fff", borderColor: "#0070e0" }
                : { background: "#fff", color: "#001c64", borderColor: "#c3cbd3" }
            }
          >
            {busy === "activate" ? "…" : active ? "Active" : "Set active"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 min-[821px]:grid-cols-2">
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

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={testConnection}
          disabled={!config || !config.has_key || busy === "ping"}
          className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#c3cbd3] bg-white px-4 py-2 text-[13px] font-bold text-[#001c64] transition-colors hover:border-[#0070e0] disabled:opacity-50"
        >
          {busy === "ping" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plug className="size-4" />
          )}
          Test connection
        </button>
        <button
          onClick={save}
          disabled={saving || !model.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-[#0070e0] px-5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#005ecb] disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save
        </button>
      </div>

      {/* Token usage */}
      {config && (config.input_tokens > 0 || config.output_tokens > 0) && (
        <div className="mt-4 rounded-[10px] bg-[#f7f9fb] px-4 py-2.5 text-[12.5px] text-[#6c7378]">
          <span className="font-semibold text-[#2c2e2f]">Token usage</span> ·{" "}
          {config.input_tokens.toLocaleString()} in /{" "}
          {config.output_tokens.toLocaleString()} out
          {config.last_tested_at
            ? ` · last tested ${new Date(config.last_tested_at).toLocaleString()}`
            : ""}
        </div>
      )}

      {/* Full-text results */}
      {ping && (
        <p
          className="mt-3 whitespace-pre-wrap break-words rounded-[10px] px-4 py-2.5 text-[13px]"
          style={
            ping.ok
              ? { background: "#e7f4ec", color: "#1a7f4b" }
              : { background: "#fbeae8", color: "#c0392b" }
          }
        >
          {ping.text}
        </p>
      )}
      {error && (
        <p className="mt-3 whitespace-pre-wrap break-words rounded-[10px] bg-[#fbeae8] px-4 py-2.5 text-[13px] text-[#c0392b]">
          {error}
        </p>
      )}
    </div>
  );
}

export type { ProviderMeta };

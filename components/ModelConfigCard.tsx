"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { AIModelConfigMasked, AIProvider } from "@/lib/types";

interface ProviderMeta {
  provider: AIProvider;
  label: string;
  placeholderModel: string;
  keyHint: string;
}

interface Props {
  meta: ProviderMeta;
  config: AIModelConfigMasked | undefined;
  onSaved: () => void;
  onActivated: () => void;
}

// One provider card: model name, API key (masked once stored), active toggle.
export function ModelConfigCard({ meta, config, onSaved, onActivated }: Props) {
  const [modelName, setModelName] = useState(config?.model_name ?? "");
  const [apiKey, setApiKey] = useState("");
  const [editingKey, setEditingKey] = useState(!config?.has_key);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: meta.provider,
          model_name: modelName,
          // Empty api_key on an existing provider keeps the stored key.
          api_key: apiKey,
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

  async function activate(next: boolean) {
    if (!config || !next) return; // only "activate" is meaningful (one active at a time)
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>{meta.label}</span>
          {config?.is_active && <Badge variant="done">Active</Badge>}
        </CardTitle>
        <CardDescription>{meta.keyHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${meta.provider}-model`}>Model name</Label>
          <Input
            id={`${meta.provider}-model`}
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder={meta.placeholderModel}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${meta.provider}-key`}>API key</Label>
          {config?.has_key && !editingKey ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-input bg-muted/40 px-3 py-2">
              <code className="text-sm">{config.api_key_masked}</code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingKey(true)}
              >
                Update key
              </Button>
            </div>
          ) : (
            <Input
              id={`${meta.provider}-key`}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste API key"
              autoComplete="off"
            />
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Switch
              id={`${meta.provider}-active`}
              checked={Boolean(config?.is_active)}
              disabled={!config || activating}
              onCheckedChange={activate}
            />
            <Label
              htmlFor={`${meta.provider}-active`}
              className="text-muted-foreground"
            >
              {config
                ? config.is_active
                  ? "Active"
                  : "Set active"
                : "Save to enable"}
            </Label>
          </div>
          <Button onClick={save} disabled={saving || !modelName.trim()} size="sm">
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export type { ProviderMeta };

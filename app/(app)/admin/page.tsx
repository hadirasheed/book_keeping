"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ModelConfigCard, type ProviderMeta } from "@/components/ModelConfigCard";
import type { AIModelConfigMasked, AIProvider } from "@/lib/types";

const PROVIDERS: ProviderMeta[] = [
  { provider: "claude", name: "Anthropic Claude", mark: "C", tintBg: "#f2ede4", tintColor: "#c96442", placeholderModel: "claude-sonnet-5" },
  { provider: "openai", name: "OpenAI", mark: "AI", tintBg: "#e6f4ef", tintColor: "#0f8a63", placeholderModel: "gpt-4o" },
  { provider: "openrouter", name: "OpenRouter", mark: "OR", tintBg: "#eceafc", tintColor: "#5b3fd6", placeholderModel: "anthropic/claude-3.5-sonnet" },
];

interface Stats {
  users: number;
  books: number;
  statements: number;
  transactions: number;
  input_tokens: number;
  output_tokens: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  input_tokens: number;
  output_tokens: number;
  last_login_at: string | null;
  book_count: number;
  is_admin: boolean;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[14px] border border-[#e6e9ec] bg-white px-[22px] py-5">
      <div className="text-[13px] font-semibold text-[#6c7378]">{label}</div>
      <div className="mt-1.5 text-[26px] font-bold text-[#001c64]">{value}</div>
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [configs, setConfigs] = useState<AIModelConfigMasked[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadModels() {
    const res = await fetch("/api/ai-models");
    const json = await res.json();
    if (res.ok) setConfigs(json.configs);
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/users"),
        loadModels(),
      ]);
      const statsJson = await statsRes.json();
      const usersJson = await usersRes.json();
      if (!statsRes.ok) throw new Error(statsJson.error);
      if (!usersRes.ok) throw new Error(usersJson.error);
      setStats(statsJson);
      setUsers(usersJson.users);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byProvider = (p: AIProvider) => configs.find((c) => c.provider === p);

  return (
    <div className="mz-fade px-10 py-8 max-[820px]:px-4">
      <div className="mb-1.5 text-[13px] font-semibold text-[#6c7378]">Admin</div>
      <h1 className="text-[28px] font-bold tracking-[-.5px] text-[#001c64]">
        Control panel
      </h1>
      <p className="mb-6 mt-1.5 text-[14px] text-[#6c7378]">
        Manage users, AI models, and see platform-wide usage.
      </p>

      {error && (
        <p className="mb-4 rounded-[10px] border border-[#c0392b]/30 bg-[#fbeae8] p-3 text-sm text-[#c0392b]">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[#6c7378]">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-10">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 min-[821px]:grid-cols-4">
            <StatCard label="Users" value={stats?.users ?? 0} />
            <StatCard label="Books" value={stats?.books ?? 0} />
            <StatCard label="Statements" value={stats?.statements ?? 0} />
            <StatCard label="Transactions" value={stats?.transactions ?? 0} />
            <StatCard
              label="AI input tokens"
              value={(stats?.input_tokens ?? 0).toLocaleString()}
            />
            <StatCard
              label="AI output tokens"
              value={(stats?.output_tokens ?? 0).toLocaleString()}
            />
          </div>

          {/* Users */}
          <section>
            <h2 className="mb-3 text-[17px] font-bold text-[#001c64]">Users</h2>
            <div className="overflow-hidden rounded-[14px] border border-[#e6e9ec] bg-white max-[820px]:overflow-x-auto">
              <div className="grid grid-cols-[2fr_1.4fr_0.7fr_1.2fr_1.2fr_1.2fr] border-b border-[#eef1f4] bg-[#f7f9fb] px-5 py-3 text-[11.5px] font-bold uppercase tracking-[.5px] text-[#8b9198] max-[820px]:min-w-[760px]">
                <div>User</div>
                <div>Name</div>
                <div>Books</div>
                <div>Tokens in</div>
                <div>Tokens out</div>
                <div>Last login</div>
              </div>
              {users.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[#8b9198]">
                  No users yet.
                </div>
              ) : (
                users.map((u) => (
                  <div
                    key={u.id}
                    className="grid grid-cols-[2fr_1.4fr_0.7fr_1.2fr_1.2fr_1.2fr] items-center border-b border-[#f2f4f7] px-5 py-3.5 text-[13.5px] last:border-0 max-[820px]:min-w-[760px]"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-semibold text-[#2c2e2f]">
                        {u.email}
                      </span>
                      {u.is_admin && (
                        <span className="shrink-0 rounded-full bg-[#e6f0fc] px-2 py-0.5 text-[10px] font-bold text-[#0070e0]">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[#6c7378]">{u.name ?? "—"}</div>
                    <div className="text-[#2c2e2f]">{u.book_count}</div>
                    <div className="tabular-nums text-[#2c2e2f]">
                      {u.input_tokens.toLocaleString()}
                    </div>
                    <div className="tabular-nums text-[#2c2e2f]">
                      {u.output_tokens.toLocaleString()}
                    </div>
                    <div className="text-[#6c7378]">
                      {u.last_login_at
                        ? new Date(u.last_login_at).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* AI models */}
          <section>
            <h2 className="mb-1 text-[17px] font-bold text-[#001c64]">
              AI models
            </h2>
            <p className="mb-3 text-[13.5px] text-[#6c7378]">
              Configured centrally. The active provider is used for every user&apos;s
              statement extraction.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {PROVIDERS.map((meta) => (
                <ModelConfigCard
                  key={meta.provider}
                  meta={meta}
                  config={byProvider(meta.provider)}
                  reload={loadModels}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

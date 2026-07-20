"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase-browser";

export default function OnboardingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((j) => {
        setEmail(j.email ?? "");
        setName(j.name ?? "");
      })
      .catch(() => {});
  }, []);

  async function finish() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save your name");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  async function useDifferentAccount() {
    await createBrowserSupabase().auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-6 py-10">
      <div className="mz-fade w-full max-w-[400px]">
        <div className="mb-6 flex items-center gap-3 rounded-[12px] border border-[#e6e9ec] bg-white px-3.5 py-2.5">
          <div className="flex size-9 flex-none items-center justify-center rounded-full bg-[#e6f0fc] text-[14px] font-bold text-[#0070e0]">
            {(email || "M").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-bold text-[#2c2e2f]">
              {email || "…"}
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1a7f4b]">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="#1a7f4b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Connected with Google
            </div>
          </div>
        </div>

        <h2 className="text-[26px] font-bold tracking-[-.5px] text-[#001c64]">
          What should we call you?
        </h2>
        <p className="mt-[7px] text-[14.5px] text-[#6c7378]">
          One last step — this name appears across your books.
        </p>

        <label className="mb-[7px] mt-6 block text-[13px] font-bold text-[#2c2e2f]">
          Full name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoFocus
          className="w-full rounded-[10px] border border-[#d7dde3] bg-white px-3.5 py-3 text-[14.5px] text-[#2c2e2f] outline-none transition-colors focus-visible:border-[#0070e0]"
        />

        {error && (
          <p className="mt-3 rounded-[10px] bg-[#fbeae8] px-4 py-2.5 text-[13px] text-[#c0392b]">
            {error}
          </p>
        )}

        <button
          onClick={finish}
          disabled={!name.trim() || saving}
          className="mt-[22px] flex w-full items-center justify-center gap-2 rounded-[28px] py-3.5 text-[15px] font-bold text-white shadow-[0_1px_2px_rgba(0,28,100,.2)] transition-colors"
          style={{ background: name.trim() ? "#0070e0" : "#9dc4f2" }}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Finish &amp; enter Mizan
        </button>

        <div className="mt-5 text-center">
          <button
            onClick={useDifferentAccount}
            className="text-[13.5px] font-semibold text-[#6c7378] hover:text-[#0070e0]"
          >
            ← Use a different account
          </button>
        </div>
      </div>
    </div>
  );
}

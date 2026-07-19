"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MizanLogo } from "@/components/MizanLogo";

const PIN_LENGTH = 4;

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";

  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const pin = digits.join("");

  function setDigit(i: number, val: string) {
    const clean = val.replace(/\D/g, "");
    setError(null);
    setDigits((prev) => {
      const nextDigits = [...prev];
      nextDigits[i] = clean.slice(-1);
      return nextDigits;
    });
    if (clean && i < PIN_LENGTH - 1) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, PIN_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(PIN_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputs.current[Math.min(pasted.length, PIN_LENGTH - 1)]?.focus();
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (pin.length !== PIN_LENGTH || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Incorrect PIN");
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setDigits(Array(PIN_LENGTH).fill(""));
      inputs.current[0]?.focus();
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-2xl border border-[#e6e9ec] bg-white p-8 shadow-[0_8px_24px_rgba(0,28,100,.08)]"
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-[13px] bg-[#001c64]">
          <MizanLogo size={26} />
        </div>
        <h1 className="mt-4 text-[21px] font-bold tracking-[-.3px] text-[#001c64]">
          Mizan
        </h1>
        <p className="mt-1 text-[13.5px] text-[#6c7378]">
          Enter your 4-digit PIN to continue
        </p>
      </div>

      <div className="mt-6 flex justify-center gap-3" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            inputMode="numeric"
            autoComplete="off"
            type="password"
            aria-label={`PIN digit ${i + 1}`}
            autoFocus={i === 0}
            className="size-14 rounded-[10px] border border-[#d7dde3] bg-white text-center text-2xl font-bold text-[#001c64] outline-none transition-colors focus-visible:border-[#0070e0] focus-visible:ring-2 focus-visible:ring-[#0070e0]/20"
          />
        ))}
      </div>

      {error && (
        <p className="mt-4 text-center text-sm text-[#c0392b]">{error}</p>
      )}

      <Button
        type="submit"
        className="mt-6 w-full"
        disabled={pin.length !== PIN_LENGTH || submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Checking…
          </>
        ) : (
          "Unlock"
        )}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

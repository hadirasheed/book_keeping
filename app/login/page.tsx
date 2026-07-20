"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";

const PERKS = [
  "AI extracts every transaction from PDF or CSV",
  "Auto-categorized, multi-currency ledgers",
  "One workspace per client or entity",
];

function ScaleLogo({ size = 34, stroke = "#ffffff" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <line x1="20" y1="6" x2="20" y2="30" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="8" y1="13" x2="32" y2="13" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="8" cy="21" r="5.5" stroke="#009cde" strokeWidth="2.4" fill="none" />
      <circle cx="32" cy="21" r="5.5" stroke="#009cde" strokeWidth="2.4" fill="none" />
      <line x1="10" y1="32" x2="30" y2="32" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg width="19" height="19" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 010-3.44V4.95H.96a9 9 0 000 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 00.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function LoginForm() {
  const search = useSearchParams();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(search.get("error"));

  const isSignup = mode === "signup";

  async function googleAuth() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      // On success the browser is redirected to Google; nothing more to do.
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div
      className="grid min-h-screen w-full"
      style={{ gridTemplateColumns: "1.05fr 1fr" }}
    >
      {/* Brand side */}
      <div className="relative hidden flex-col overflow-hidden bg-[#001c64] px-[60px] py-14 text-white min-[861px]:flex">
        <div className="pointer-events-none absolute -right-[140px] -top-[120px] size-[420px] rounded-full border border-[#009cde]/[.18]" />
        <div className="pointer-events-none absolute -bottom-[90px] -left-[90px] size-[280px] rounded-full border border-[#009cde]/[.14]" />
        <div className="relative flex items-center gap-3">
          <ScaleLogo />
          <div>
            <div className="text-[23px] font-bold leading-none tracking-[-.3px]">
              Mizan
            </div>
            <div className="mt-[3px] text-[12.5px] text-[#8fb4e8]" dir="rtl">
              ميزان · balance
            </div>
          </div>
        </div>
        <div className="relative mt-auto">
          <h1 className="max-w-[9em] text-[36px] font-bold leading-[1.15] tracking-[-.8px]">
            Books that balance themselves.
          </h1>
          <p className="mt-[18px] max-w-[26em] text-[16px] leading-[1.6] text-[#b9cdec]">
            Upload a bank statement and Mizan&apos;s AI extracts, categorizes,
            and organizes every transaction — so your books stay reconciled
            without the busywork.
          </p>
          <div className="mt-[34px] flex flex-col gap-3.5">
            {PERKS.map((perk) => (
              <div key={perk} className="flex items-center gap-3">
                <span className="flex size-[26px] flex-none items-center justify-center rounded-full bg-[#009cde]/20">
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="#4db8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-[14.5px] text-[#dbe7f8]">{perk}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative mt-11 text-[12.5px] text-[#6f8fc4]">
          Trusted by small businesses across the region.
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center bg-[#f5f7fa] p-14 max-[860px]:px-6 max-[860px]:py-10">
        <div className="mz-fade w-full max-w-[400px]">
          <div className="mb-[34px] flex items-center gap-2.5">
            <ScaleLogo size={26} stroke="#001c64" />
            <span className="text-[19px] font-bold text-[#001c64]">Mizan</span>
          </div>

          <h2 className="text-[26px] font-bold tracking-[-.5px] text-[#001c64]">
            {isSignup ? "Create your account" : "Welcome back"}
          </h2>
          <p className="mt-[7px] text-[14.5px] text-[#6c7378]">
            {isSignup
              ? "Sign up with Google to start balancing your books."
              : "Sign in with Google to pick up where you left off."}
          </p>

          <button
            onClick={googleAuth}
            disabled={loading}
            className="mt-7 flex w-full items-center justify-center gap-3 rounded-[28px] border-[1.5px] border-[#d7dde3] bg-white px-5 py-3.5 text-[15px] font-bold text-[#2c2e2f] transition-[border-color,box-shadow] hover:border-[#0070e0] hover:shadow-[0_2px_10px_rgba(0,28,100,.08)] disabled:opacity-70"
          >
            {loading ? (
              <span className="size-[18px] animate-spin rounded-full border-2 border-[#c3cbd3] border-t-[#0070e0]" />
            ) : (
              <GoogleGlyph />
            )}
            <span>
              {loading
                ? "Connecting…"
                : isSignup
                  ? "Sign up with Google"
                  : "Continue with Google"}
            </span>
          </button>

          <div className="mt-[18px] flex items-center justify-center gap-2">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#8b9198" strokeWidth="1.5" />
              <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="#8b9198" strokeWidth="1.5" />
            </svg>
            <span className="text-[12.5px] text-[#8b9198]">
              Secure sign-in with your Google account
            </span>
          </div>

          {error && (
            <p className="mt-4 whitespace-pre-wrap break-words rounded-[10px] bg-[#fbeae8] px-4 py-2.5 text-[13px] text-[#c0392b]">
              {error}
            </p>
          )}

          <div className="mt-[26px] text-center text-[14px] text-[#6c7378]">
            {isSignup ? "Already have an account?" : "New to Mizan?"}
            <button
              onClick={() => {
                setMode(isSignup ? "login" : "signup");
                setError(null);
              }}
              className="ml-1 font-bold text-[#0070e0] hover:underline"
            >
              {isSignup ? "Sign in" : "Create an account"}
            </button>
          </div>

          {isSignup && (
            <p className="mt-[22px] text-center text-[12px] leading-[1.6] text-[#8b9198]">
              By continuing you agree to Mizan&apos;s Terms and Privacy Policy.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Mask an API key for display, e.g. "sk-ant-****1234". */
export function maskApiKey(key: string): string {
  if (!key) return "";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "****";
  const prefix = trimmed.slice(0, 6);
  const suffix = trimmed.slice(-4);
  return `${prefix}****${suffix}`;
}

/** Format a numeric amount as currency for display. */
export function formatAmount(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** Up-to-2-letter initials from a name, e.g. "Café Levant" -> "CL". */
export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/** Compact relative time, e.g. "2h ago", "yesterday", "3d ago". */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.floor((Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString();
}

// Short display symbols for currencies (default ledger currency is KWD → "K.D").
const CURRENCY_LABELS: Record<string, string> = { KWD: "K.D" };

/** Display label for a currency code, e.g. "KWD" -> "K.D". */
export function currencyLabel(code: string): string {
  return CURRENCY_LABELS[code] ?? code;
}

/** Group a signed amount for display: sign, currency, absolute value. */
export function formatSigned(
  amount: number,
  direction: "debit" | "credit" | null,
  currency = "KWD"
): { text: string; positive: boolean } {
  const positive = direction ? direction === "credit" : amount >= 0;
  const abs = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return {
    text: `${positive ? "+" : "-"}${currencyLabel(currency)} ${abs}`,
    positive,
  };
}

/** Two-letter code from a bank name, e.g. "Emirates NBD" -> "EM". */
export function bankCode(bank: string): string {
  return (bank.replace(/\s+/g, "").slice(0, 2) || "BK").toUpperCase();
}

/** Rotating tint palette for account/book avatar chips. */
export const TINTS = [
  { bg: "#e6f0fc", color: "#0070e0" },
  { bg: "#e7f4ec", color: "#1a7f4b" },
  { bg: "#efeafc", color: "#5b3fd6" },
  { bg: "#fdf0e6", color: "#c25e00" },
] as const;

// Session helpers for the PIN gate.
//
// The session cookie holds NO secret — only `${expiry}.${hmac(expiry)}` signed
// with AUTH_SECRET. This module uses Web Crypto only (no Node Buffer), so it is
// safe to import from both Edge middleware and Node route handlers.

export const AUTH_COOKIE = "bk_auth";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Add it to your environment.");
  }
  return secret;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toHex(sig);
}

/** Length-safe, constant-time string comparison. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Create a signed session token that expires SESSION_TTL_SECONDS from now. */
export async function createSessionToken(): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const sig = await hmacHex(String(exp), getSecret());
  return `${exp}.${sig}`;
}

/** Verify a session token: signature valid and not expired. */
export async function verifySessionToken(
  token: string | undefined | null
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const expPart = token.slice(0, dot);
  const sigPart = token.slice(dot + 1);
  const exp = Number(expPart);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;

  let expected: string;
  try {
    expected = await hmacHex(expPart, getSecret());
  } catch {
    return false;
  }
  return timingSafeEqual(sigPart, expected);
}

/** Compare a submitted PIN against the stored PIN in constant time. */
export function pinsMatch(submitted: string, stored: string): boolean {
  return timingSafeEqual(submitted, stored);
}

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import {
  AUTH_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  pinsMatch,
} from "@/lib/auth";

// POST /api/auth/login { pin } — verify the PIN server-side against the
// locked-down app_auth table, then set a signed, httpOnly session cookie.
// The PIN itself is never returned to the client.
export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "Enter a 4-digit PIN" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("app_auth")
      .select("pin")
      .eq("id", 1)
      .single();

    if (error || !data) {
      throw new Error(
        "PIN is not configured. Did you run supabase/migrations/0002_auth.sql?"
      );
    }

    // Small constant delay to take the edge off brute-forcing a 4-digit PIN.
    await new Promise((r) => setTimeout(r, 350));

    if (!pinsMatch(pin, String(data.pin))) {
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
    }

    const token = await createSessionToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

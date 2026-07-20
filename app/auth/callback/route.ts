import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-ssr";
import { getServiceClient } from "@/lib/supabase-server";

// OAuth callback. Exchanges the Google code for a session, ensures an app
// `users` profile exists, and routes: brand-new accounts → /onboarding
// (name step), returning accounts → /dashboard.
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const err = req.nextUrl.searchParams.get("error_description");
  if (err) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(err)}`
    );
  }
  if (!code) return NextResponse.redirect(`${origin}/login`);

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.redirect(`${origin}/login`);

  const svc = getServiceClient();
  const { data: existing } = await svc
    .from("users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  const googleName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    "";

  let isNew = false;
  if (!existing) {
    isNew = true;
    await svc.from("users").insert({
      email: user.email,
      name: googleName || null,
      last_login_at: new Date().toISOString(),
    });
  } else {
    await svc
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", existing.id);
  }

  return NextResponse.redirect(`${origin}${isNew ? "/onboarding" : "/dashboard"}`);
}

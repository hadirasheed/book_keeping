import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client for auth actions (Google OAuth sign-in, sign-out).
// Shares the cookie-based session with the server.
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}

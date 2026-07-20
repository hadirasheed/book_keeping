import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client using the SERVICE ROLE key. This bypasses RLS,
// so it must ONLY ever be imported from server code (route handlers / server
// actions) — never from a Client Component.
//
// There is no auth yet: all data operations run as the service role against a
// single seeded "demo" user (see getDefaultUserId).

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

let cached: SupabaseClient | null = null;

/** Lazily create the service-role client so a missing env var throws only when used. */
export function getServiceClient(): SupabaseClient {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }
  if (!cached) {
    cached = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cached;
}

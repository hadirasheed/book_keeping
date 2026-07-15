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

const DEFAULT_USER_EMAIL = "demo@local.dev";
let cachedUserId: string | null = null;

/**
 * Resolve the id of the single seeded default user. The schema is auth-ready,
 * but for the MVP every write is attributed to this one user.
 */
export async function getDefaultUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  const client = getServiceClient();
  const { data, error } = await client
    .from("users")
    .select("id")
    .eq("email", DEFAULT_USER_EMAIL)
    .single();

  if (error || !data) {
    throw new Error(
      `Default user (${DEFAULT_USER_EMAIL}) not found. Did you run the migration in supabase/migrations/0001_init.sql?`
    );
  }
  cachedUserId = data.id as string;
  return cachedUserId;
}

import { createClient } from "@supabase/supabase-js";

// Browser (client-side) Supabase client. Uses the public anon key only.
// Safe to import in Client Components. Do NOT use the service role key here.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

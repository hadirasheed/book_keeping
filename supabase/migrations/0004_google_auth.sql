-- Real auth via Google (Supabase Auth). The existing `users` table becomes the
-- app profile, keyed by email; identity + sessions are handled by Supabase Auth.
-- (The old 4-digit PIN gate is replaced — app_auth is no longer used.)
--
-- Enable the Google provider in your Supabase project:
--   Authentication → Providers → Google (add your Google OAuth client id/secret),
--   and add your site URL + `<site>/auth/callback` to the allowed redirect URLs.

alter table users
  add column if not exists input_tokens bigint not null default 0,
  add column if not exists output_tokens bigint not null default 0,
  add column if not exists last_login_at timestamptz;

-- Books already reference users(id); real users get their own rows on first
-- Google sign-in, so no data-model change is needed beyond the columns above.

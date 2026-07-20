# Supabase setup

This app uses Supabase for Postgres + Storage. There is **no auth** yet — every
record is attributed to a single seeded default user (`demo@local.dev`).

## 1. Create a project

Create a project at [supabase.com](https://supabase.com). Then copy the values
from **Project Settings → API** into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...     # "anon public" key
SUPABASE_SERVICE_ROLE_KEY=...          # "service_role" key (server-only, keep secret)
AUTH_SECRET=...                        # openssl rand -hex 32 (signs the PIN session cookie)
```

## 2. Run the migrations

Run both migration files, **in order**:

1. `migrations/0001_init.sql` — all tables, indexes, the seeded default user,
   **and** the private `statements` Storage bucket.
2. `migrations/0002_auth.sql` — the `app_auth` table that holds the 4-digit PIN
   (default `1234`, RLS-locked so it's not exposed via the public API).
3. `migrations/0003_model_toggle_usage.sql` — adds `enabled`, `input_tokens`,
   `output_tokens`, and `last_tested_at` to `ai_model_configs`.
4. `migrations/0004_google_auth.sql` — adds per-user `input_tokens`,
   `output_tokens`, and `last_login_at` to `users` (Google auth).

## Enable Google sign-in

Auth is Google OAuth via Supabase Auth. In the dashboard:

- **Authentication → Providers → Google**: enable it and paste your Google OAuth
  **client id + secret** (from Google Cloud Console → Credentials → OAuth client).
- **Authentication → URL Configuration**: set the Site URL and add
  `<site>/auth/callback` (and `http://localhost:3000/auth/callback` for local dev)
  to the **Redirect URLs**.
- In Google Cloud, add the same callback plus the Supabase-provided
  `https://<project>.supabase.co/auth/v1/callback` as authorized redirect URIs.

Set `ADMIN_EMAIL` in the app env to the Google address that should own `/admin`.

### Option A — SQL editor (fastest)

1. Open your project → **SQL Editor** → **New query**.
2. Paste the contents of [`migrations/0001_init.sql`](./migrations/0001_init.sql),
   click **Run**.
3. New query again, paste [`migrations/0002_auth.sql`](./migrations/0002_auth.sql),
   click **Run**.

### Option B — Supabase CLI

```bash
# from the repo root
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

## 3. Verify the Storage bucket

The migration inserts a private bucket named `statements`. Confirm it exists
under **Storage** in the dashboard. If your project restricts inserting into
`storage.buckets` from SQL, create it manually instead:

- **Storage → New bucket** → name `statements`, **Public: off**.

Uploaded files are stored under `statements/{bookId}/{bankAccountId}/{filename}`.

## Notes

- The `api_key` column in `ai_model_configs` stores keys in **plain text** for
  the MVP. **TODO:** encrypt before any real launch.
- The service-role key bypasses Row Level Security. It is only used from server
  code (`lib/supabase-server.ts`) and never shipped to the browser.
- The `app_auth.pin` is stored in plain text so it can be changed directly in
  the database, but RLS-with-no-policies keeps it off the public API and it is
  only ever read server-side. Change it with:
  `update app_auth set pin = '4271', updated_at = now() where id = 1;`

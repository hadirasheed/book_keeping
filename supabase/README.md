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
```

## 2. Run the migration

The migration creates all tables, indexes, the seeded default user, **and** the
private `statements` Storage bucket.

### Option A — SQL editor (fastest)

1. Open your project → **SQL Editor** → **New query**.
2. Paste the contents of [`migrations/0001_init.sql`](./migrations/0001_init.sql).
3. Click **Run**.

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

# Mizan — AI Bookkeeping Dashboard (MVP)

Upload bank statements organized under **Books** (ledgers/projects), each holding
one or more **Bank Accounts**. Statements are uploaded against a specific bank
account. A **Settings → Models** page manages AI providers (Claude, OpenAI,
OpenRouter) used later for statement parsing.

The UI follows the **Mizan** design handoff — a navy + bright-blue fintech shell
with a fixed left sidebar (see `Mizan.dc.html` reference). Components are
recreated with the codebase's own Tailwind primitives.

Access is gated by a simple **4-digit PIN** (see "PIN login" below). Beyond the
gate there are no per-user accounts yet — all data is attributed to a single
seeded default user (`demo@local.dev`), so the schema stays auth-ready.

## PIN login

A single shared 4-digit PIN protects the whole app.

- The PIN lives in the `app_auth` table (created by
  `supabase/migrations/0002_auth.sql`). That table has **RLS enabled with no
  policies**, so it is *not* readable through the public/anon API — only
  server code using the service-role key can read it. The PIN is verified
  server-side and is **never sent to the browser**.
- On success the server sets a signed, httpOnly cookie (an HMAC of the expiry
  using `AUTH_SECRET` — the PIN is not in the cookie). `middleware.ts` checks
  this cookie on every request and redirects to `/login` when it's missing,
  invalid, or expired (7-day sessions).
- **Default PIN is `1234`.** Change it any time directly in the database:

  ```sql
  update app_auth set pin = '4271', updated_at = now() where id = 1;
  ```

- Set `AUTH_SECRET` in your environment (`openssl rand -hex 32`). Changing it
  invalidates existing sessions.

> A 4-digit PIN is low-entropy by design (10,000 combinations); the login route
> adds a small delay per attempt but this is meant as a lightweight gate, not
> hardened auth. Swap in real per-user auth before handling anything sensitive.

## Tech stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4 + shadcn-style UI components (`components/ui/*`)
- Supabase (Postgres + Storage) via `@supabase/supabase-js`

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure Supabase

Copy `.env.example` to `.env.local` and fill in your project values
(**Supabase → Project Settings → API**):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_SECRET=          # openssl rand -hex 32
```

### 3. Run the database migrations

Run both files in the Supabase SQL editor (or via the CLI), in order:

1. [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) —
   tables, indexes, seeded default user, private `statements` Storage bucket.
2. [`supabase/migrations/0002_auth.sql`](./supabase/migrations/0002_auth.sql) —
   the `app_auth` PIN table (default PIN `1234`).

Full instructions: [`supabase/README.md`](./supabase/README.md).

### 4. Start the app

```bash
npm run dev
# open http://localhost:3000  (redirects to /dashboard)
```

## Deploy to Vercel

This is a standard Next.js app — Vercel auto-detects the framework, build
command (`next build`), and output. No `vercel.json` is required.

1. Push this repo to GitHub (already done for the working branch).
2. At [vercel.com/new](https://vercel.com/new), **Import** the
   `hadirasheed/book_keeping` repository.
3. Under **Environment Variables**, add the three Supabase values (same as
   `.env.local`) for the Production (and Preview) environments:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — do **not** prefix with `NEXT_PUBLIC_`)
   - `AUTH_SECRET` (server-only; `openssl rand -hex 32`)
4. Click **Deploy**. Subsequent pushes to the connected branch auto-deploy.

Make sure the Supabase migration (`supabase/migrations/0001_init.sql`) has been
run against the project those keys point to, otherwise API calls return a
"default user not found" error.

## What you can do

1. **Create a Book** from the dashboard.
2. **Add Bank Accounts** to the book (`/dashboard/[bookId]/accounts`).
3. **Upload a statement** against a chosen account
   (`/dashboard/[bookId]/upload`) → file lands in Storage under
   `statements/{bookId}/{bankAccountId}/{filename}` and a `statements` row is
   created with status `pending`.
4. **Settings → Models**: save API keys/model names for Claude/OpenAI/OpenRouter
   and toggle which one is active (only one active at a time).

## Project structure

```
middleware.ts                    PIN gate: protects all routes, redirects to /login
app/
  login/                         4-digit PIN entry screen
  (app)/                         authenticated area (route group, no URL segment)
    layout.tsx                   header + nav + log out
    dashboard/                   Books list + New Book
      [bookId]/                  Book detail: accounts, statements, transactions
        accounts/                Manage bank accounts (add/edit/delete)
        upload/                  Upload a statement (pick account → drop file)
    settings/models/             AI provider management
  api/
    auth/login, auth/logout      PIN check → signed cookie; clear cookie
    books/                       GET (list) / POST (create)
    bank-accounts/               GET / POST / PATCH / DELETE
    statements/                  GET (list, joined) / POST (upload)
    transactions/                GET (filters: account, date range)
    ai-models/                   GET (masked) / POST (upsert by provider)
    ai-models/[id]/activate/     PATCH (activate one, deactivate others)
components/
  ui/                            shadcn-style primitives
  BookCard, BankAccountCard, StatementUploader, ModelConfigCard, StatusBadge,
  LogoutButton
lib/
  supabase.ts                    browser client (anon key)
  supabase-server.ts             server client (service role) + default user
  auth.ts                        session cookie sign/verify (Web Crypto)
  types.ts                       DB-mirrored TypeScript types
  utils.ts                       cn(), maskApiKey(), formatAmount()
supabase/migrations/0001_init.sql, 0002_auth.sql
```

## Non-goals (not built yet)

- Only a single shared PIN — no per-user accounts, signup, or password reset.
- **No AI extraction** of transactions from files yet — the upload → Storage →
  DB record flow works end-to-end; parsing into `transactions` is a follow-up.
  Statements stay `pending` after upload.
- No charts/insights.
- **API keys are stored in plain text** (`ai_model_configs.api_key`). This is
  flagged with a `TODO` in the API route and SQL — encrypt before any real launch.

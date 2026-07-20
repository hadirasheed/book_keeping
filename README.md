# Mizan — AI Bookkeeping Dashboard (MVP)

Upload bank statements organized under **Books** (ledgers/projects), each holding
one or more **Bank Accounts**. Statements are uploaded against a specific bank
account and parsed by AI. AI providers (Claude, OpenAI, OpenRouter) are managed
centrally in the **admin panel**. Ledger amounts default to **KWD** (shown as
"K.D") and otherwise follow each account's currency.

The UI follows the **Mizan** design handoff — a navy + bright-blue fintech shell
with a fixed left sidebar (see `Mizan.dc.html` reference). Components are
recreated with the codebase's own Tailwind primitives. It is responsive at a
single **820px** breakpoint: below it the sidebar becomes an off-canvas drawer
(hamburger top bar + scrim), grids collapse to one column, tables scroll
horizontally, and header rows wrap.

Access is **per-user via Google sign-in** (Supabase Auth). Each user's Books,
accounts, statements and transactions are private to them. A single **admin**
(the `ADMIN_EMAIL` Google account) gets an extra `/admin` panel.

## Authentication (Google OAuth)

- Sign-up and sign-in both go through **Google OAuth**, handled by **Supabase
  Auth**. The only extra field is the user's **name** (collected once, on
  `/onboarding`, after the first Google sign-in).
- `middleware.ts` refreshes the session on every request and redirects
  unauthenticated visitors to `/login`. Route handlers resolve the current user
  from the session and enforce **per-user ownership** (a user can't read another
  user's books/accounts/statements/transactions).
- The **admin panel** (`/admin`) is restricted to the `ADMIN_EMAIL` account —
  enforced in middleware *and* re-checked in the admin API routes.
- Sign-out clears the Supabase session.

**Setup:** in your Supabase project, **Authentication → Providers → Google**,
add your Google OAuth client id/secret, and add your site URL plus
`<site>/auth/callback` to the allowed redirect URLs. Set `ADMIN_EMAIL` to the
Google address that should own the admin panel. (The old PIN gate is gone;
`AUTH_SECRET` is no longer used.)

## Admin panel (`/admin`)

Visible only to `ADMIN_EMAIL`. It shows platform **stats** (users, books,
statements, transactions, total AI tokens), a **users** table with **per-user AI
token usage** and last-login, and central **AI model management** (the provider
cards moved here — regular users no longer configure models; everyone's
extraction uses the single active provider set by the admin).

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
ADMIN_EMAIL=          # the Google account allowed into /admin
```

Also enable the **Google provider** in Supabase (Authentication → Providers →
Google) with your Google OAuth client, and add `<site>/auth/callback` to the
allowed redirect URLs.

### 3. Run the database migrations

Run both files in the Supabase SQL editor (or via the CLI), in order:

1. [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) —
   tables, indexes, seeded default user, private `statements` Storage bucket.
2. [`supabase/migrations/0002_auth.sql`](./supabase/migrations/0002_auth.sql) —
   the `app_auth` PIN table (default PIN `1234`).
3. [`supabase/migrations/0003_model_toggle_usage.sql`](./supabase/migrations/0003_model_toggle_usage.sql)
   — adds `enabled` + token-usage columns to `ai_model_configs`.
4. [`supabase/migrations/0004_google_auth.sql`](./supabase/migrations/0004_google_auth.sql)
   — adds per-user token-usage + last-login columns to `users` (Google auth).

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
   created with status `pending`. Nothing is extracted yet.
4. **Run the AI** on a statement (the **Run AI** button on the book overview or
   upload page, or **Run pending** to process them all). This calls the active
   provider to extract transactions into the combined transactions table and
   moves the statement `pending → processing → done`.
5. **Admin → AI models** (admin only): save API keys/model names for
   Claude/OpenAI/OpenRouter, **enable/disable** each provider, **Test connection**
   (a live ping that reports the reply + token usage), see **cumulative token
   usage**, and toggle which one is **active** (one active at a time; a disabled
   provider can't be active). Regular users don't see model settings — everyone's
   extraction uses the active provider.

## AI statement processing

Uploading only stores the file. Extraction is a separate, explicit step so you
control when (and with which model) statements are parsed.

- **Trigger:** `POST /api/statements/:id/process`. It requires an **active**
  provider (Settings → Models), downloads the file from Storage, runs the model,
  writes the extracted rows into `transactions`, and sets the statement `done`
  (or `failed`). Done statements show a **"Read by AI · N added"** indicator.
- **No accidental doubling:** re-running a statement first **deletes that
  statement's existing rows**, then re-inserts — so re-processing one statement
  never doubles it. The UI still asks for confirmation before a re-run.
- **Duplicate-upload guard:** if you upload the *same file again* as a separate
  statement and try to run it, the UI warns that it will add duplicate data.
- **Remove duplicates:** the Combined-transactions section has a **Remove
  duplicates** action (`/api/transactions/dedupe`) that finds rows identical in
  account + date + amount + direction + description, keeps the earliest of each,
  and deletes the rest — after a confirmation showing the count.
- **Delete a statement:** the trash button removes the statement, its Storage
  file, and its transactions (behind a confirmation).
- **Providers:** **Claude** (via the official `@anthropic-ai/sdk`) handles both
  **PDF and CSV** natively. **OpenAI / OpenRouter** handle **CSV** (their chat
  endpoints); PDF with those providers returns a clear error — use Claude for PDFs.
- **Keys:** the provider API keys come from the `ai_model_configs` table (set in
  the admin panel), not from environment variables — no extra Vercel env for keys.
- **Per-user token usage** is recorded on the `users` table each run and shown in
  the admin panel.
- The model is prompted to return strict JSON; the parser is defensive (strips
  fences, skips unparseable rows, normalizes sign/`direction`).

## Project structure

```
middleware.ts                    Supabase Auth gate + admin-email gate
app/
  login/                         Google OAuth split-screen login
  onboarding/                    name step after first Google sign-in
  auth/callback/                 OAuth code exchange → create profile → route
  (app)/                         authenticated area (route group, sidebar shell)
    dashboard/                   Books list + New Book
      [bookId]/                  Book detail: accounts, statements, transactions
        accounts/                Manage bank accounts (add/edit/delete)
        upload/                  Upload a statement (pick account → drop file)
    admin/                       Admin panel (stats, users, AI models) — admin only
  api/
    me/                          GET/PATCH current user (name, isAdmin)
    admin/stats, admin/users     Platform stats + per-user token usage (admin)
    books/                       GET (list) / POST (create)
    bank-accounts/               GET / POST / PATCH / DELETE
    statements/                  GET (list) / POST (upload) / DELETE (file + rows)
    statements/[id]/process/     POST (run active model → extract transactions)
    transactions/                GET (filters: account, date range)
    transactions/dedupe/         GET (count) / POST (remove duplicate rows)
    ai-models/ (+/[id], activate, ping)  Provider config — admin only
components/
  ui/                            shadcn-style primitives (Dialog, ConfirmDialog…)
  Sidebar, StatementUploader, ModelConfigCard, ProcessButton,
  DeleteStatementButton, StatusBadge, MizanLogo
lib/
  supabase-ssr.ts                cookie-bound server auth client (@supabase/ssr)
  supabase-browser.ts            browser auth client (OAuth sign-in / sign-out)
  supabase-server.ts             service-role client (privileged data ops)
  auth-user.ts                   current user + admin resolution
  ownership.ts                   per-user book/account/statement guards
  ai/extract.ts                  provider adapters + JSON parser for extraction
  types.ts / utils.ts            DB types; cn(), currencyLabel(), formatSigned()…
supabase/migrations/0001…0004.sql
```

## Non-goals (not built yet)

- No org/team accounts or roles beyond a single `ADMIN_EMAIL`; no invitations.
- AI extraction runs **synchronously** inside the request (fine for MVP-sized
  statements); there's no background queue or streaming progress yet, and
  per-provider PDF support varies (Claude only).
- No charts/insights.
- **API keys are stored in plain text** (`ai_model_configs.api_key`). This is
  flagged with a `TODO` in the API route and SQL — encrypt before any real launch.

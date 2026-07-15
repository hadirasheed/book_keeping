# AI Bookkeeping Dashboard (MVP)

Upload bank statements organized under **Books** (ledgers/projects), each holding
one or more **Bank Accounts**. Statements are uploaded against a specific bank
account. A **Settings → Models** page manages AI providers (Claude, OpenAI,
OpenRouter) used later for statement parsing.

There is **no authentication** — the app loads straight into the dashboard and
attributes all data to a single seeded default user (`demo@local.dev`), so the
schema is auth-ready for later.

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
```

### 3. Run the database migration

Run [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql)
in the Supabase SQL editor (or via the CLI). It creates all tables, indexes, the
seeded default user, and the private `statements` Storage bucket. Full
instructions: [`supabase/README.md`](./supabase/README.md).

### 4. Start the app

```bash
npm run dev
# open http://localhost:3000  (redirects to /dashboard)
```

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
app/
  dashboard/                     Books list + New Book
    [bookId]/                    Book detail: accounts, statements, transactions
      accounts/                  Manage bank accounts (add/edit/delete)
      upload/                    Upload a statement (pick account → drop file)
  settings/models/               AI provider management
  api/
    books/                       GET (list) / POST (create)
    bank-accounts/               GET / POST / PATCH / DELETE
    statements/                  GET (list, joined) / POST (upload)
    transactions/                GET (filters: account, date range)
    ai-models/                   GET (masked) / POST (upsert by provider)
    ai-models/[id]/activate/     PATCH (activate one, deactivate others)
components/
  ui/                            shadcn-style primitives
  BookCard, BankAccountCard, StatementUploader, ModelConfigCard, StatusBadge
lib/
  supabase.ts                    browser client (anon key)
  supabase-server.ts             server client (service role) + default user
  types.ts                       DB-mirrored TypeScript types
  utils.ts                       cn(), maskApiKey(), formatAmount()
supabase/migrations/0001_init.sql
```

## Non-goals (not built yet)

- No login/signup UI or sessions.
- **No AI extraction** of transactions from files yet — the upload → Storage →
  DB record flow works end-to-end; parsing into `transactions` is a follow-up.
  Statements stay `pending` after upload.
- No charts/insights.
- **API keys are stored in plain text** (`ai_model_configs.api_key`). This is
  flagged with a `TODO` in the API route and SQL — encrypt before any real launch.

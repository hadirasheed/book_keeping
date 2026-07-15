-- AI Bookkeeping Dashboard — initial schema
-- Run this in the Supabase SQL editor, or via the Supabase CLI (see supabase/README.md).

-- Default user (no auth yet, but schema is auth-ready)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  created_at timestamptz default now()
);

-- Books = top-level ledgers/projects
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- Bank accounts belong to a book
create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books(id) on delete cascade not null,
  bank_name text not null,
  account_name text not null, -- nickname, e.g. "Business Checking"
  account_number_last4 text,
  currency text default 'USD',
  created_at timestamptz default now()
);

-- Statements are uploaded against a specific bank account
create table if not exists statements (
  id uuid primary key default gen_random_uuid(),
  bank_account_id uuid references bank_accounts(id) on delete cascade not null,
  file_url text not null,
  file_name text not null,
  status text default 'pending' check (status in ('pending','processing','done','failed')),
  period_start date,
  period_end date,
  uploaded_at timestamptz default now(),
  processed_at timestamptz
);

-- Transactions extracted from statements
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid references statements(id) on delete cascade not null,
  bank_account_id uuid references bank_accounts(id) on delete cascade not null,
  txn_date date not null,
  description text,
  raw_description text,
  amount numeric(14,2) not null,
  direction text check (direction in ('debit','credit')),
  category text,
  is_verified boolean default false,
  confidence_score numeric,
  created_at timestamptz default now()
);

-- AI model provider configs
create table if not exists ai_model_configs (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('claude','openai','openrouter')),
  model_name text not null,
  api_key text not null, -- plain for MVP; NOTE: encrypt this before real launch
  is_active boolean default false,
  created_at timestamptz default now()
);

-- One config row per provider (needed for upsert-by-provider in the API).
create unique index if not exists ai_model_configs_provider_key
  on ai_model_configs (provider);

-- Helpful indexes for the dashboard queries.
create index if not exists books_user_id_idx on books (user_id);
create index if not exists bank_accounts_book_id_idx on bank_accounts (book_id);
create index if not exists statements_bank_account_id_idx on statements (bank_account_id);
create index if not exists transactions_bank_account_id_idx on transactions (bank_account_id);
create index if not exists transactions_statement_id_idx on transactions (statement_id);

-- Seed a default user (idempotent)
insert into users (email, name)
values ('demo@local.dev', 'Demo User')
on conflict (email) do nothing;

-- Private Storage bucket for uploaded statement files.
insert into storage.buckets (id, name, public)
values ('statements', 'statements', false)
on conflict (id) do nothing;

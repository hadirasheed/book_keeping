-- Persist every AI audit so users can review past audits.
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books(id) on delete cascade not null,
  user_id uuid references users(id) on delete set null,
  range_from date,
  range_to date,
  txn_count int not null default 0,
  summary text,
  flags jsonb not null default '[]',
  recommendations jsonb not null default '[]',
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  created_at timestamptz default now()
);

create index if not exists audit_logs_book_id_idx on audit_logs (book_id);

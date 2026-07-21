-- Store the transaction's own time-of-day as printed on the statement (if any).
-- Kept as text to preserve whatever the statement shows (e.g. "14:32").
alter table transactions
  add column if not exists txn_time text;

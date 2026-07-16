-- Simple PIN gate for the app.
--
-- The PIN is stored here so it can be changed directly in the database. Row
-- Level Security is enabled with NO policies, which means the PIN is NOT
-- readable through the public/anon PostgREST API — only server code using the
-- service-role key (which bypasses RLS) can read it. The PIN is never sent to
-- the browser; login is verified server-side and the client only ever receives
-- a signed session cookie.
--
-- To change the PIN later, just update the row, e.g.:
--   update app_auth set pin = '4271', updated_at = now() where id = 1;

create table if not exists app_auth (
  id int primary key default 1,
  pin text not null,
  updated_at timestamptz default now(),
  constraint app_auth_singleton check (id = 1)
);

-- Lock the table down: RLS on, and (deliberately) no policies => the anon key
-- cannot select/insert/update it. Service role bypasses RLS.
alter table app_auth enable row level security;

-- Seed a default PIN of 1234. Change this after first login.
insert into app_auth (id, pin) values (1, '1234')
on conflict (id) do nothing;

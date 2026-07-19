-- AI model providers: enable/disable toggle + cumulative token usage.

alter table ai_model_configs
  add column if not exists enabled boolean not null default true,
  add column if not exists input_tokens bigint not null default 0,
  add column if not exists output_tokens bigint not null default 0,
  add column if not exists last_tested_at timestamptz;

-- A disabled provider must not remain the active one.
update ai_model_configs set is_active = false where enabled = false and is_active = true;

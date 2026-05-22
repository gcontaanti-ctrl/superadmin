create table if not exists public.erp_db_config (
  id text primary key,
  config jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.erp_db_config enable row level security;

comment on table public.erp_db_config is
  'Stores ERP DB2 connection configuration. Access this table only from trusted server code using the Supabase service role key.';

comment on column public.erp_db_config.config is
  'JSON configuration for the ERP DB2 connection. May contain sensitive values such as database passwords.';

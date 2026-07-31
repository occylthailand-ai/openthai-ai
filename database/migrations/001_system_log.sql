-- Audit trail table — stores critical system events (logins, payments, orders).
-- Append-only: no UPDATE or DELETE should ever run on this table.
-- Run once in Supabase Dashboard › SQL Editor.

create table if not exists system_log (
  id         bigserial primary key,
  actor      text        not null,          -- user email or 'system'
  event      text        not null,          -- e.g. 'user_login', 'payment_created'
  meta       jsonb       default '{}'::jsonb,
  req_id     text,                          -- X-Request-ID from HTTP layer
  created_at timestamptz not null default now()
);

-- Index for actor lookups (user audit history)
create index if not exists system_log_actor_idx on system_log (actor);
-- Index for event lookups (e.g. "all payment events")
create index if not exists system_log_event_idx on system_log (event);
-- Partition-friendly time index
create index if not exists system_log_created_idx on system_log (created_at desc);

-- Row-level security: only service role can insert/select (anon cannot)
alter table system_log enable row level security;
create policy "service_role_all" on system_log
  using (true)
  with check (true);

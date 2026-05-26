-- client_logs — buffered diagnostic events from the mobile app.
-- Used to triage flows that fail silently on-device (biometric, app lock,
-- AppLockService init, secure-storage writes). Bounded per user via a
-- nightly retention sweep; no PII intentionally stored.

create table if not exists public.client_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at  timestamptz not null default now(),
  client_ts   timestamptz,
  session_id  text,
  platform    text,          -- 'android' | 'ios' | 'web'
  app_version text,
  level       text not null default 'info',
  tag         text,
  message     text not null,
  meta        jsonb
);

alter table public.client_logs enable row level security;

do $$ begin
  create policy "users own client_logs"
    on public.client_logs for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

create index if not exists client_logs_user_created_idx
  on public.client_logs (user_id, created_at desc);

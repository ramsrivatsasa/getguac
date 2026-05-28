-- ============================================================================
-- GetGuac Migration 043 — idempotency_keys
-- ============================================================================
-- Backs the Idempotency-Key header on POST /api/receipts/save. When an
-- offline outbox replays a save after network returns, the server looks
-- up the key here and returns the original receipt_id instead of
-- re-running the pipeline.
--
-- Without this, a flaky-network retry would either:
--   (a) Be caught by saveReceipt's dedup (same store/date/total ±1¢) →
--       returns merged=true but a SECOND user might race in between,
--       or
--   (b) Slip past dedup if the user edited the parsed values in the
--       outbox JSON before retrying.
-- The idempotency key removes the race + the edit ambiguity entirely.
--
-- TTL: 7 days. Past that, the outbox should have given up (we'll set
-- max retry to ~3 days). A nightly cleanup keeps the table small.
-- ============================================================================

create table if not exists public.idempotency_keys (
  key         text        not null,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  receipt_id  uuid        not null references public.receipts(id) on delete cascade,
  merged      boolean     not null default false,
  created_at  timestamptz not null default now(),
  primary key (user_id, key)
);

create index if not exists idx_idempotency_keys_user_created
  on public.idempotency_keys(user_id, created_at desc);

-- TTL cleanup. Anything older than 7 days is dead — the outbox has given
-- up by then. Run this from the existing daily cron or manually; it's
-- idempotent and cheap.
create or replace function public.purge_old_idempotency_keys()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  delete from public.idempotency_keys
   where created_at < now() - interval '7 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.purge_old_idempotency_keys() from public;
grant execute on function public.purge_old_idempotency_keys() to service_role;

-- RLS — a user can only see + insert their own keys. The route writes
-- via the user-bound client so auth.uid() will match.
alter table public.idempotency_keys enable row level security;

drop policy if exists "users read own idempotency keys"   on public.idempotency_keys;
drop policy if exists "users insert own idempotency keys" on public.idempotency_keys;

create policy "users read own idempotency keys"
  on public.idempotency_keys for select
  using (auth.uid() = user_id);

create policy "users insert own idempotency keys"
  on public.idempotency_keys for insert
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';

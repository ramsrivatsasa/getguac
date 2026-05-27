-- ============================================================================
-- GetGuac Migration 036 — Jobs table + active_user_ids RPC (scale seam)
-- ============================================================================
-- A generic job queue stored in Postgres. At low user counts (< 1K), it's
-- unused infrastructure — the cron sweeps everyone serially. At higher user
-- counts, the cron stops doing work directly and instead enqueues one row
-- per user into `jobs`; lightweight workers drain the queue. This lets the
-- single-tenant cron pattern survive the jump to sharded execution without
-- a rewrite.
--
-- The RPC `active_user_ids` returns user_ids paginated by user_id cursor,
-- replacing the .limit(10000) pattern that silently breaks at scale.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.jobs (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,         -- 'predict_smashlist' | 'embed_items' | ...
  user_id      uuid references auth.users(id) on delete cascade,
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'pending'
               check (status in ('pending','running','done','failed')),
  attempts     int not null default 0,
  last_error   text,
  scheduled_at timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_jobs_pending
  on public.jobs(kind, scheduled_at)
  where status = 'pending';

create index if not exists idx_jobs_user
  on public.jobs(user_id);

-- RLS on, but no public policies — only service_role touches this table.
alter table public.jobs enable row level security;

-- ── Cursor-based "active users" RPC ─────────────────────────────────────────
-- Returns up to `page_size` distinct user_ids that have a receipt dated on
-- or after `since_date`, with user_id > `after_user_id` (cursor). Callers
-- loop until the result is empty / shorter than page_size.
--
-- This replaces:   .from('receipts').select('user_id').gte('date', since).limit(10000)
-- which silently caps the user pool at 10K rows of `receipts` (not 10K users).
create or replace function public.active_user_ids(
  since_date    date,
  after_user_id uuid default null,
  page_size     int  default 500
)
returns table (user_id uuid)
language sql
security definer
set search_path = public
as $$
  select distinct r.user_id
  from public.receipts r
  where r.date >= since_date
    and (after_user_id is null or r.user_id > after_user_id)
  order by r.user_id
  limit greatest(1, least(page_size, 5000));
$$;

revoke all on function public.active_user_ids(date, uuid, int) from public;
grant execute on function public.active_user_ids(date, uuid, int) to service_role;

notify pgrst, 'reload schema';

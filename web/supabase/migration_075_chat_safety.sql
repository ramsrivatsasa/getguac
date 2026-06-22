-- ============================================================================
-- GetGuac Migration 075 — Chat safety (block + report)
-- ============================================================================
-- Required for Google Play's User-Generated Content / social policy: an app
-- with 1:1 chat (dm_threads / dm_messages, migration 048) must let users
-- BLOCK and REPORT other users. This adds:
--
--   dm_blocks   (blocker, blocked)  — one row per "blocker has blocked blocked"
--   dm_reports  (reporter, reported_user, thread_id, message_id, reason, …)
--
-- Enforcement:
--   • is_blocked_between(a,b) helper.
--   • A BEFORE INSERT trigger on dm_messages rejects a message when the
--     thread peer has blocked the sender — so a blocked user can no longer
--     reach the person who blocked them. (The blocker also hides the thread +
--     existing messages client-side.)
--
-- Reports are write-only for users (reporter = auth.uid()); only service_role
-- can read them (you review dm_reports and act — that's the moderation loop).
--
-- Idempotent. Safe to re-run.
-- ============================================================================

-- ─── Blocks ─────────────────────────────────────────────────────────────
create table if not exists public.dm_blocks (
  id          uuid        primary key default gen_random_uuid(),
  blocker     uuid        not null references auth.users(id) on delete cascade,
  blocked     uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  check (blocker <> blocked),
  unique (blocker, blocked)
);

create index if not exists idx_dm_blocks_blocker on public.dm_blocks(blocker);
create index if not exists idx_dm_blocks_blocked on public.dm_blocks(blocked);

alter table public.dm_blocks enable row level security;

drop policy if exists "dm_blocks: owner read"   on public.dm_blocks;
drop policy if exists "dm_blocks: owner insert" on public.dm_blocks;
drop policy if exists "dm_blocks: owner delete" on public.dm_blocks;

-- A user manages only their OWN block list.
create policy "dm_blocks: owner read"
  on public.dm_blocks for select
  using (blocker = auth.uid());

create policy "dm_blocks: owner insert"
  on public.dm_blocks for insert
  with check (blocker = auth.uid());

create policy "dm_blocks: owner delete"
  on public.dm_blocks for delete
  using (blocker = auth.uid());

-- ─── Reports ────────────────────────────────────────────────────────────
create table if not exists public.dm_reports (
  id             uuid        primary key default gen_random_uuid(),
  reporter       uuid        not null references auth.users(id) on delete cascade,
  reported_user  uuid        not null references auth.users(id) on delete cascade,
  thread_id      uuid        references public.dm_threads(id) on delete set null,
  message_id     uuid        references public.dm_messages(id) on delete set null,
  reason         text        not null check (reason in ('spam','harassment','inappropriate','scam','other')),
  details        text        check (details is null or char_length(details) <= 1000),
  status         text        not null default 'open' check (status in ('open','reviewed','actioned','dismissed')),
  created_at     timestamptz not null default now(),
  check (reporter <> reported_user)
);

create index if not exists idx_dm_reports_status on public.dm_reports(status, created_at desc);
create index if not exists idx_dm_reports_reported on public.dm_reports(reported_user);

alter table public.dm_reports enable row level security;

drop policy if exists "dm_reports: reporter insert" on public.dm_reports;

-- Users can FILE a report (their own); nobody but service_role can read them
-- (no select policy = no read for authenticated). You review via the dashboard.
create policy "dm_reports: reporter insert"
  on public.dm_reports for insert
  with check (reporter = auth.uid());

-- ─── Helper: is there a block between these two (either direction)? ──────
create or replace function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dm_blocks
     where (blocker = p_a and blocked = p_b)
        or (blocker = p_b and blocked = p_a)
  );
$$;

revoke all on function public.is_blocked_between(uuid, uuid) from public;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated, service_role;

-- ─── Enforce: blocked users can't message the person who blocked them ────
create or replace function public.dm_messages_block_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_peer uuid;
begin
  -- The OTHER participant of this thread.
  select case when t.user_a = NEW.user_id then t.user_b else t.user_a end
    into v_peer
    from public.dm_threads t
   where t.id = NEW.thread_id;

  if v_peer is not null and exists (
    select 1 from public.dm_blocks
     where blocker = v_peer and blocked = NEW.user_id
  ) then
    raise exception 'You can no longer message this person.'
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$$;

drop trigger if exists dm_messages_block_guard_trg on public.dm_messages;
create trigger dm_messages_block_guard_trg
  before insert on public.dm_messages
  for each row execute function public.dm_messages_block_guard();

notify pgrst, 'reload schema';

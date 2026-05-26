-- ============================================================================
-- GetGuac Migration 027 — Rewards-balance tracking from email
-- ============================================================================
-- Most loyalty programs (CVS ExtraCare, Walgreens Balance Rewards, Target
-- Circle, Best Buy Rewards, Macy's, Amazon Prime, etc.) periodically email
-- users their current balance ("Your CVS ExtraCare balance: $4.50"). Today
-- we ingest those emails but throw the data away.
--
-- This migration adds the storage. The IMAP poller's AI extraction will
-- detect balance-update emails and write a row here per detection.
--
-- One row per (user, store, program, fetched_at) — we keep the history so
-- the rewards page can show "balance over time" for users who want it.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.rewards_balances (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  store_id        uuid references public.stores(id) on delete set null,
  store_name      text,                          -- snapshot at fetch time (in case store row is later renamed)
  program_name    text,                          -- 'CVS ExtraCare', 'BJ's Easy Renewal', 'My Best Buy Plus'
  balance_amount  numeric(12,2),                 -- the numeric balance value
  balance_unit    text default '$',              -- '$' / 'pts' / 'miles' / 'stars'
  expires_at      date,                          -- if the email said when the balance expires
  source_email_id uuid references public.email_messages(id) on delete set null,
  fetched_at      timestamptz not null default now()
);

create index if not exists idx_rewards_balances_user_program
  on public.rewards_balances(user_id, program_name, fetched_at desc);

create index if not exists idx_rewards_balances_user_store
  on public.rewards_balances(user_id, store_id, fetched_at desc);

alter table public.rewards_balances enable row level security;

do $$ begin
  drop policy if exists "rb: select own" on public.rewards_balances;
  drop policy if exists "rb: insert own" on public.rewards_balances;
  drop policy if exists "rb: update own" on public.rewards_balances;
  drop policy if exists "rb: delete own" on public.rewards_balances;

  create policy "rb: select own" on public.rewards_balances
    for select using (auth.uid() = user_id);
  create policy "rb: insert own" on public.rewards_balances
    for insert with check (auth.uid() = user_id);
  create policy "rb: update own" on public.rewards_balances
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "rb: delete own" on public.rewards_balances
    for delete using (auth.uid() = user_id);
end $$;

-- ── Convenience view: latest balance per (user, program) ──────────────────
-- The /rewards page reads from this so it doesn't need to do per-program
-- LIMIT 1 queries in the client.
create or replace view public.rewards_balance_latest as
  select distinct on (user_id, coalesce(program_name, ''), coalesce(store_id::text, ''))
    user_id, store_id, store_name, program_name,
    balance_amount, balance_unit, expires_at, source_email_id, fetched_at
  from public.rewards_balances
  order by user_id, coalesce(program_name, ''), coalesce(store_id::text, ''), fetched_at desc;

notify pgrst, 'reload schema';

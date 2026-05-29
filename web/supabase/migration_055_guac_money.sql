-- ============================================================================
-- GetGuac Migration 055 — guac_money_events (the savings tracker)
-- ============================================================================
-- Each row records a moment the app saved the user real money: routing
-- them to a cheaper store, finding a lower web price, catching a
-- predicted item before they overspent, etc. Sum-by-user gives the
-- "GuacMoney" balance rendered on the dashboard and on public share
-- landing pages as social proof.
--
-- This is NOT a cashback ledger — we don't pay anything out. It's an
-- accounting feature: dollars NOT spent because the user used GetGuac.
--
-- Source taxonomy (the `source` column):
--   'auto_add_cheapest' — Auto-Add → Cheapest routed an item to the
--                         user's cheapest historical store. Savings =
--                         (avg_other_stores_price - chosen_price) × qty.
--   'pick_cheapest'     — User picked a non-default store from the
--                         Compare Stores panel and it was cheaper than
--                         their last buy at the default.
--   'web_beat'          — "Hunt best price" returned a price below the
--                         user's last paid price for that item.
--   'predicted_save'    — (future) The predictor surfaced an item right
--                         before a stockout-driven panic buy at a more
--                         expensive store.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

create table if not exists public.guac_money_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  source       text not null,                  -- one of the taxonomy values above
  amount       numeric(10,2) not null,         -- USD saved on this event (positive)
  item_name    text,                            -- the item the save was on (when applicable)
  store_name   text,                            -- the store routed to / from
  metadata     jsonb,                           -- free-form context (avg_other_stores, chosen_price, etc.)
  created_at   timestamptz not null default now()
);

create index if not exists idx_guac_money_events_user_created
  on public.guac_money_events(user_id, created_at desc);

-- Per-user sum for the dashboard tile. Postgres aggregate function so
-- we don't pull every row to compute the total client-side.
create or replace function public.guac_money_total(target_user_id uuid)
returns numeric language sql stable as $$
  select coalesce(sum(amount), 0)::numeric(10,2)
  from public.guac_money_events
  where user_id = target_user_id
$$;

alter table public.guac_money_events enable row level security;

-- Users can read their OWN events only.
drop policy if exists "guac_money_events: owner read" on public.guac_money_events;
create policy "guac_money_events: owner read"
  on public.guac_money_events for select
  to authenticated
  using (user_id = auth.uid());

-- Users can insert their OWN events. The web/mobile clients write
-- directly when a save happens (Auto-Add Cheapest, etc.) so we don't
-- need a service-role-only path. amount must be positive — RLS check
-- enforces it so a malicious client can't credit a user with negative
-- "savings" or absurd numbers.
drop policy if exists "guac_money_events: owner insert" on public.guac_money_events;
create policy "guac_money_events: owner insert"
  on public.guac_money_events for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and amount > 0
    and amount < 10000  -- single event cap; sanity bound against runaway client logic
  );

notify pgrst, 'reload schema';

-- ============================================================================
-- GetGuac Migration 058 — stash_inventory (per-user "what's on the shelf")
-- ============================================================================
-- Closes the loop between buying and consuming: the user can mark how
-- many of an item they have on hand right now, and we cross-reference
-- with the predictor's cadence to flag "running low" before they hit
-- a stockout.
--
-- Keyed by (user_id, item_key) — item_key is the normalized item name
-- the same way the predictor keys product_aliases. This means
-- inventory survives item-name variants ("KS Whole Milk" vs "GV 2%
-- Milk") whenever the predictor merges them.
--
-- Why on_hand_qty as int (not numeric):
--   - Inventory is conceptually discrete: 2 bottles of olive oil,
--     1 bag of rice, 0 paper-towel rolls. Fractional inventory is
--     unusual outside fluid measurements and not worth the storage
--     complexity for v1.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

create table if not exists public.stash_inventory (
  user_id      uuid not null references auth.users(id) on delete cascade,
  item_key     text not null,                          -- normalized item name
  on_hand_qty  int  not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, item_key)
);

create index if not exists idx_stash_inventory_updated
  on public.stash_inventory(user_id, updated_at desc);

alter table public.stash_inventory enable row level security;

-- Owner-only read.
drop policy if exists "stash_inventory: owner read" on public.stash_inventory;
create policy "stash_inventory: owner read"
  on public.stash_inventory for select
  to authenticated
  using (user_id = auth.uid());

-- Owner-only insert + update + delete. Bounds the qty so a malicious
-- client can't credit themselves with 999 million paper-towel rolls.
drop policy if exists "stash_inventory: owner write" on public.stash_inventory;
create policy "stash_inventory: owner write"
  on public.stash_inventory for all
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and on_hand_qty >= 0
    and on_hand_qty <= 9999
  );

notify pgrst, 'reload schema';

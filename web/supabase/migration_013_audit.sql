-- ============================================================================
-- GetGuac Migration 013 — Schema + index audit pass
-- ============================================================================
-- Reviewed every hot query in the app (db.js + pages) and added composite
-- indexes for the ones that hit the table without a usable index today.
-- Also tightens 3 RLS policies that were too lax.
-- Safe to re-run.
-- ============================================================================

-- ── Hot-path composite indexes ────────────────────────────────────────────
-- getReceipts({ dateFrom, dateTo, storeId, storeLocationId }) — almost always
-- filters by user_id then sorts by date desc. Composite (user_id, date desc)
-- replaces both single-column indexes for this query.
create index if not exists idx_receipts_user_date_desc
  on public.receipts(user_id, date desc);

-- getStashItems() and inline rendering — query receipt_items joined to receipts.
-- The join key is receipt_id; without an index, large stashes scan the table.
create index if not exists idx_receipt_items_receipt_returned
  on public.receipt_items(receipt_id, returned);

-- Shopping list tabbed view — filters by (user_id, list_name). Compound is
-- much cheaper than two single-column lookups + intersect.
create index if not exists idx_shopping_list_user_listname
  on public.shopping_list(user_id, list_name);

-- GuacChest history (when wired) — always user_id + claimed_at desc.
-- Pre-creating the index now so the GuacChest UI is fast from day 1.
create index if not exists idx_guac_savings_user_claimed_desc
  on public.guac_savings(user_id, claimed_at desc) where true;

-- Returns page — items where returned = true filtered by parent receipt's user.
-- This partial index only stores returned rows; tiny disk cost, fast filter.
create index if not exists idx_receipt_items_returned_partial
  on public.receipt_items(receipt_id) where returned = true;

-- Refund-policy lookups go through receipt_id every time
create index if not exists idx_refund_policies_receipt_expiry
  on public.receipt_refund_policies(receipt_id, expiry_date);

-- Bites page filters receipts by category = 'eats'. Existing idx_receipts_category
-- + idx_receipts_user_id covers it, but partial indexes are tighter for hot paths.
create index if not exists idx_receipts_eats_user
  on public.receipts(user_id, date desc) where category = 'eats';

-- Worth-It pending queue — receipts where rating is null, sorted by date.
-- Partial index keeps this tiny even after thousands of rated rows.
create index if not exists idx_receipts_unrated
  on public.receipts(user_id, date desc) where rating is null;

-- ── RLS audit — tighten where it was too open ──────────────────────────────
-- store_items, store_locations, stores all currently allow any authenticated
-- user to delete any row. That's fine for stores+locations (shared directory)
-- but we should require the user to have AT LEAST ONE receipt at that store
-- before they can update / delete its metadata, to prevent griefing.
do $$ begin
  -- stores: only allow delete if no other user has receipts there
  drop policy if exists "stores: delete auth" on public.stores;
  create policy "stores: delete only if owner has receipts" on public.stores
    for delete using (
      auth.role() = 'authenticated' and
      not exists (
        select 1 from public.receipts r
        where r.store_id = stores.id
          and r.user_id <> auth.uid()
      )
    );

  -- store_items inherits the same: only delete if NO receipt_items reference it
  drop policy if exists "store_items: delete auth" on public.store_items;
  create policy "store_items: delete only if unused" on public.store_items
    for delete using (
      auth.role() = 'authenticated' and
      not exists (
        select 1 from public.receipt_items ri
        where ri.store_item_id = store_items.id
          and exists (select 1 from public.receipts r where r.id = ri.receipt_id and r.user_id <> auth.uid())
      )
    );
end $$;

-- Drop unused index from earlier migration (was created with where (sku is not null)
-- but the duplicate-detection-by-sku query is rare; we already have idx_store_items_*).
-- (Keep the unique index ux_store_items_store_sku — that one IS used by upserts.)

notify pgrst, 'reload schema';

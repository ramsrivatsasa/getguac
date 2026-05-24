-- GetGuac Migration 006 — Link receipt items to the store catalog
-- - receipt_items.store_item_id: optional FK pointing to the per-store catalog row
-- - store_items: unique on (store_id, sku) so upserts find existing rows
-- Safe to re-run.

create unique index if not exists ux_store_items_store_sku
  on public.store_items(store_id, lower(coalesce(sku, '')))
  where sku is not null;

alter table public.receipt_items
  add column if not exists store_item_id uuid references public.store_items(id) on delete set null;

create index if not exists idx_receipt_items_store_item_id on public.receipt_items(store_item_id);

notify pgrst, 'reload schema';

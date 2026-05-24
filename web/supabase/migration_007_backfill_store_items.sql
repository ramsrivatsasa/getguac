-- GetGuac Migration 007 — Backfill store_items catalog from existing receipt_items
-- One-time pass over historical data. New receipts already populate the catalog
-- automatically via useAddReceipt. Safe to run multiple times.
-- (Also re-applies migration 006's columns/indexes in case they were missed.)

-- 0. Schema prereqs from migration 006 — applied here so this file is self-sufficient
create unique index if not exists ux_store_items_store_sku
  on public.store_items(store_id, lower(coalesce(sku, '')))
  where sku is not null;
alter table public.receipt_items
  add column if not exists store_item_id uuid references public.store_items(id) on delete set null;
create index if not exists idx_receipt_items_store_item_id on public.receipt_items(store_item_id);

-- 1. Insert catalog rows for every distinct (store_id, sku-or-name) we haven't seen yet
with src as (
  select
    r.store_id,
    ri.sku,
    ri.item_name,
    ri.price,
    ri.warranty_info,
    ri.item_manual,
    ri.purchase_date,
    row_number() over (
      partition by r.store_id, lower(coalesce(ri.sku, ri.item_name))
      order by ri.purchase_date desc nulls last, ri.created_at desc
    ) as rn
  from public.receipt_items ri
  join public.receipts r on r.id = ri.receipt_id
  where r.store_id is not null
    and (ri.item_name is not null and length(trim(ri.item_name)) > 0)
)
insert into public.store_items (store_id, sku, item_name, price, warranty_info, item_manual)
select s.store_id, s.sku, s.item_name, s.price, s.warranty_info, s.item_manual
from src s
where s.rn = 1
  and not exists (
    select 1 from public.store_items si
    where si.store_id = s.store_id
      and (
        (s.sku is not null and lower(si.sku) = lower(s.sku)) or
        (s.sku is null     and lower(si.item_name) = lower(s.item_name))
      )
  );

-- 2. Link existing receipt_items back to their catalog row
update public.receipt_items ri
set store_item_id = si.id
from public.receipts r, public.store_items si
where ri.store_item_id is null
  and ri.receipt_id = r.id
  and r.store_id = si.store_id
  and (
    (ri.sku is not null and lower(ri.sku) = lower(si.sku)) or
    (ri.sku is null and lower(ri.item_name) = lower(si.item_name))
  );

notify pgrst, 'reload schema';

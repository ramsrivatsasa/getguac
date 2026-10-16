-- Permanent retailer identity; retry/outbox keys are temporary and may expire.
begin;
alter table public.receipts add column if not exists retailer_order_key text;

-- Keep the original receipt duplicate protection for unidentified purchases.
drop index if exists public.receipts_user_dedup_key_uidx;
create unique index receipts_user_dedup_key_uidx
  on public.receipts (user_id, dedup_key)
  where store_name is not null and date is not null and total_amount is not null
    and retailer_order_key is null;
create unique index if not exists receipts_user_retailer_order_uidx
  on public.receipts (user_id, retailer_order_key)
  where retailer_order_key is not null;

-- Backfill only unambiguous legacy mappings. Multiple order IDs attached to
-- one receipt are evidence of the old merge bug, not permission to split data.
with identities as (
  select user_id, receipt_id, min(key) as key
  from public.idempotency_keys
  where key like 'retailer\_%' escape '\'
  group by user_id, receipt_id having count(distinct key) = 1
)
update public.receipts r set retailer_order_key = i.key
from identities i
where r.id = i.receipt_id and r.user_id = i.user_id
  and r.retailer_order_key is null
  and r.validation_comment like '%order ' || regexp_replace(i.key, '^retailer_(amazon|walmart|costco|instacart|home_depot)_', '') || ';%';
notify pgrst, 'reload schema';
commit;

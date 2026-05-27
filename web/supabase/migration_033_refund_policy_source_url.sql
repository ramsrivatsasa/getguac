-- GetGuac Migration 033 — Source URL on per-receipt refund policies
--
-- Why: store_return_policies (migration 026) already carries source_url for
-- every seeded merchant ("https://www.costco.com/return-policy", etc.) but
-- when we copy a default into receipt_refund_policies the URL was dropped
-- on the floor. Without it the UI can't render a clickable "View Costco's
-- policy ↗" link, which is the whole point of seeding the table.
--
-- Safe to re-run.

alter table public.receipt_refund_policies
  add column if not exists source_url text;

notify pgrst, 'reload schema';

-- ============================================================================
-- GetGuac Migration 052 — Backfill receipt_items.purchase_date
-- ============================================================================
-- save-receipt.js (the central pipeline that web + mobile + email-poller
-- + statement importer all funnel through) never wrote
-- receipt_items.purchase_date. That column starts NULL on every existing
-- row.
--
-- The smashlist predictor (lib/predict-smashlist.js#aggregate) does:
--     if (!r.item_name || !r.purchase_date) continue
-- so every NULL purchase_date row got silently filtered out — which is why
-- "no predictions" was the universal experience for every user, regardless
-- of how many receipts or embeddings they had.
--
-- Fix has two parts:
--   1. save-receipt.js now writes purchase_date = parent receipt's date
--      (commit accompanying this migration). New rows get it for free.
--   2. THIS MIGRATION backfills existing rows by copying receipts.date.
--      Joins on receipt_id; only touches rows where purchase_date IS NULL
--      so it's safe to re-run.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

update public.receipt_items ri
   set purchase_date = r.date
  from public.receipts r
 where ri.receipt_id = r.id
   and ri.purchase_date is null
   and r.date is not null;

-- Sanity-check after backfill — how many rows are still null?
-- (Should only be receipt_items where the parent receipt also has no date,
-- which would be a separate data-integrity issue worth investigating.)
do $$
declare
  remaining int;
begin
  select count(*) into remaining
    from public.receipt_items
   where purchase_date is null;
  if remaining > 0 then
    raise notice 'Backfill complete. % rows still have null purchase_date (parent receipt date was also null).', remaining;
  else
    raise notice 'Backfill complete. All receipt_items now have purchase_date set.';
  end if;
end $$;

notify pgrst, 'reload schema';

-- ============================================================================
-- GetGuac Migration 038 — Bank Fees category backfill (2026-05-27)
-- ============================================================================
-- Adds the new `bank-fees` category. Previously, statement-imported fee and
-- interest rows were stuffed into 'misc' which dragged the Misc bar on the
-- donut chart up and made it impossible to tell "real misc" from
-- "money-paid-to-the-bank."
--
-- This migration backfills existing statement rows. The categorisation
-- decision is driven by `receipt_link` content (set by parse-statement at
-- import time, in the format "Statement row — kind: fee · ...") AND by
-- the legacy store_name prefix pattern ("[Fee] ...", "[Interest] ...",
-- "[Annual Fee] ...", etc.) used by the importer.
--
-- Card-payment rows STAY in 'misc' — they're audit-only ledger entries
-- (the customer paying the bank, not the bank charging the customer), so
-- they shouldn't show up as bank-fee expenses.
--
-- Safe to re-run — idempotent. Only matches rows still in 'misc' or with
-- NULL category.
-- ============================================================================

update public.receipts
   set category = 'bank-fees'
 where from_statement = true
   and (category = 'misc' or category is null)
   and (
        receipt_link ilike 'Statement row — kind: fee%'
     or receipt_link ilike 'Statement row — kind: interest%'
     or receipt_link ilike '%kind: fee%'
     or receipt_link ilike '%kind: interest%'
     or store_name ilike '[Fee]%'
     or store_name ilike '[Interest]%'
     or store_name ilike '[Annual Fee]%'
     or store_name ilike '[Late Fee]%'
     or store_name ilike '[Late Payment%]%'
     or store_name ilike '[Purchase Interest]%'
     or store_name ilike '[Balance Transfer%]%'
     or store_name ilike '[Cash Advance%]%'
     or store_name ilike '[Foreign Transaction%]%'
     or store_name ilike '[Overdraft%]%'
     or store_name ilike '[ATM%]%'
     or store_name ilike '[Finance Charge%]%'
     or store_name ilike '[Returned Payment%]%'
   );

-- Mirror onto receipt_items so the item-level category aggregations
-- (Stash, Worth It, Bites, Spending-by-category-detail) stay consistent.
update public.receipt_items
   set category = 'bank-fees'
 where (category = 'misc' or category is null)
   and receipt_id in (
     select id from public.receipts
      where category = 'bank-fees'
   );

notify pgrst, 'reload schema';

-- migration_088_mixed_basket_misc.sql
--
-- Mixed baskets are Misc at the receipt level.
--
-- A receipt whose line items belong to SEVERAL categories (a Target run that
-- is nappies + groceries + a lightbulb) is not "groceries". Storing one of
-- those categories on the receipt hands the entire basket total to one slice
-- of every by-receipt chart. The real breakdown lives on the items and is
-- read by the by-item lens (web/src/lib/category-spend.js).
--
-- The save path applies this rule to NEW receipts
-- (web/src/lib/auto-categorize.js → MIXED_BASKET_CATEGORY) and
-- /api/receipts/categorize-batch stops the bulk categorizer from undoing it.
-- This migration applies the same rule to rows saved BEFORE that shipped.
--
-- Never touches a receipt the user categorized themselves
-- (category_source = 'user'). Returned line items don't count toward the
-- "several categories" test, matching the runtime rule. Re-running is a
-- no-op — rows already on 'misc' are excluded.
--
-- PREVIEW (run this first if applying by hand):
--
--   SELECT r.id, r.store_name, r.date, r.category, r.category_source,
--          count(DISTINCT i.category) AS item_categories
--     FROM public.receipts r
--     JOIN public.receipt_items i ON i.receipt_id = r.id
--    WHERE i.category IS NOT NULL
--      AND COALESCE(i.returned, false) = false
--      AND COALESCE(r.category_source, '') <> 'user'
--      AND COALESCE(r.category, '') <> 'misc'
--    GROUP BY r.id
--   HAVING count(DISTINCT i.category) > 1
--    ORDER BY r.date DESC;

UPDATE public.receipts r
   SET category = 'misc',
       category_source = 'rule'
 WHERE COALESCE(r.category_source, '') <> 'user'
   AND COALESCE(r.category, '') <> 'misc'
   AND (
     SELECT count(DISTINCT i.category)
       FROM public.receipt_items i
      WHERE i.receipt_id = r.id
        AND i.category IS NOT NULL
        AND COALESCE(i.returned, false) = false
   ) > 1;

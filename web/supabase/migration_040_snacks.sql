-- ============================================================================
-- GetGuac Migration 040 — Snacks category backfill (2026-05-27)
-- ============================================================================
-- New 'snacks' category captures chips, crackers, granola bars, popcorn,
-- trail mix, packaged candy — the Snack Stack bucket has no other source.
-- Previously these items lived under generic 'grub' (groceries) or 'misc'.
--
-- This migration moves existing receipt_items whose name unambiguously
-- matches a snack brand or kind. Conservative: only touches items still
-- on 'grub' or 'misc' (or NULL) so user-curated categories aren't
-- overwritten. Receipt-level category is left alone — a grocery receipt
-- stays 'grub' even if some lines become 'snacks'.
--
-- Safe to re-run — idempotent.
-- ============================================================================

update public.receipt_items
   set category = 'snacks'
 where (category in ('grub', 'misc') or category is null)
   and (
        item_name ilike '%doritos%'    or item_name ilike '%cheetos%'
     or item_name ilike '%fritos%'     or item_name ilike '%pringles%'
     or item_name ilike '%ruffles%'    or item_name ilike '%takis%'
     or item_name ilike '%lay''s%'     or item_name ilike '%lays %'
     or item_name ilike '%sun chips%'  or item_name ilike '%tortilla chips%'
     or item_name ilike '%potato chips%' or item_name ilike '% chips %'
     or item_name ilike 'chips %'      or item_name ilike '% chips'
     or item_name ilike '%popcorn%'    or item_name ilike '%pop-corn%'
     or item_name ilike '%pretzel%'    or item_name ilike '%crackers%'
     or item_name ilike '%goldfish%'   or item_name ilike '%cheez-it%'
     or item_name ilike '%cheez it%'
     or item_name ilike '%granola bar%' or item_name ilike '%protein bar%'
     or item_name ilike '%kind bar%'   or item_name ilike '%clif bar%'
     or item_name ilike '%trail mix%'  or item_name ilike '%mixed nuts%'
     or item_name ilike '%cashews%'    or item_name ilike '%almonds%'
     or item_name ilike '%pistachios%' or item_name ilike '%peanuts%'
     or item_name ilike '%beef jerky%' or item_name ilike '% jerky%'
     or item_name ilike '%oreo%'       or item_name ilike '%chips ahoy%'
     or item_name ilike '%kit kat%'    or item_name ilike '%snickers%'
     or item_name ilike '%reese''s%'   or item_name ilike '%reeses%'
     or item_name ilike '%m&m%'        or item_name ilike '%hershey%'
     or item_name ilike '%gummy bear%' or item_name ilike '%gummies%'
     or item_name ilike '%fruit snack%'
   );

notify pgrst, 'reload schema';

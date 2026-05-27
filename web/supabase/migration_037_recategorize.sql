-- ============================================================================
-- GetGuac Migration 037 — Category taxonomy overhaul (2026-05-27)
-- ============================================================================
-- Re-shapes the receipt category taxonomy:
--
--   RENAMES:
--     wellness   → pharmacy   (pharmacy items only; vitamins move to 'health')
--
--   MERGES (5 old slugs → 1 new):
--     coffee, coke, pepsi, juice, milkshake → drinks
--
--   NEW (no rows yet, callers will populate going forward):
--     health         — vitamins, supplements, protein, sports nutrition
--     personal-care  — toothpaste, soap, shampoo, deodorant, skincare
--     household      — bath tissue, paper towels, dish soap, cleaning supplies
--
-- This migration only backfills the slugs that already exist in the data.
-- New rows will be classified by the updated auto-categorize rules and
-- Gemini system prompt (deployed in the same release).
--
-- Touches BOTH `receipts.category` (receipt-level) and
-- `receipt_items.category` (line-item level).
--
-- Safe to re-run — idempotent (each UPDATE only matches rows still on the
-- old slugs).
-- ============================================================================

-- ── receipts.category ───────────────────────────────────────────────────────
update public.receipts set category = 'pharmacy' where category = 'wellness';
update public.receipts set category = 'drinks'   where category in ('coffee','coke','pepsi','juice','milkshake');

-- ── receipt_items.category ──────────────────────────────────────────────────
update public.receipt_items set category = 'pharmacy' where category = 'wellness';
update public.receipt_items set category = 'drinks'   where category in ('coffee','coke','pepsi','juice','milkshake');

-- ── shopping_list.category (predictive smashlist tags) ──────────────────────
-- The predictor stores the source category on each predicted row for
-- explainability. Keep them in sync so the badge in /shopping still renders.
update public.shopping_list set category = 'pharmacy' where category = 'wellness';
update public.shopping_list set category = 'drinks'   where category in ('coffee','coke','pepsi','juice','milkshake');

-- ── user_categories: drop any obsolete custom slugs ─────────────────────────
-- If a user happened to create a custom category with one of the obsolete
-- slugs, the new preset wins. Convert to the new slug so their existing
-- usage doesn't orphan. (Custom rows with unrelated slugs are untouched.)
update public.user_categories set slug = 'pharmacy' where slug = 'wellness';
update public.user_categories set slug = 'drinks'   where slug in ('coffee','coke','pepsi','juice','milkshake');

notify pgrst, 'reload schema';

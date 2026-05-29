-- ============================================================================
-- GetGuac Migration 057 — community_rating_for_item
-- ============================================================================
-- SQL function that returns the cross-user average rating + rating
-- count for a given item name. Powers the "How GetGuac customers
-- rate this" chip on the share landing page so a recipient sees
-- aggregate community signal before deciding to sign up.
--
-- The aggregate is on item_name (case-insensitive). It explicitly does
-- NOT key on user_id, store_id, or anything that could identify the
-- raters — only the rating values are summed/counted. Returning the
-- count alongside the average lets the consumer hide the chip below a
-- minimum sample size (we'd rather show nothing than mislead with a
-- single-rater "5.0 stars" badge).
--
-- Why a function and not a direct SELECT from the route:
--   - The /share/[token] route runs as anon and can't read
--     receipt_items directly (RLS forbids cross-user reads). A
--     SECURITY DEFINER function bypasses RLS for this specific
--     aggregate query while still keeping individual rows
--     inaccessible.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

create or replace function public.community_rating_for_item(target_item_name text)
returns table(avg_rating numeric, rating_count int)
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce(round(avg(rating)::numeric, 2), 0) as avg_rating,
    count(*)::int as rating_count
  from public.receipt_items
  where rating is not null
    and rating between 1 and 5
    and lower(trim(item_name)) = lower(trim(target_item_name))
$$;

-- Grant execute to anon so the public share landing can call it.
grant execute on function public.community_rating_for_item(text) to anon, authenticated;

notify pgrst, 'reload schema';

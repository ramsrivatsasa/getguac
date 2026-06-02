-- migration_062_product_likes.sql
--
-- Adds `product_likes` — a many-to-many between users and product
-- keys (an item's normalized sku-or-name slug). Powers the "♥ N
-- users like this" badge in the item card.
--
-- Privacy model: anyone can read the AGGREGATE count of likes per
-- product, but no row exposes who liked what. This is enforced by:
--   1. RLS allowing SELECT only on rows belonging to auth.uid()
--      (so a user can see their own likes for the heart-toggle state)
--   2. A SECURITY DEFINER RPC `product_like_counts(item_keys text[])`
--      that returns total like counts per key, bypassing RLS, so the
--      UI can show "22k likes" without leaking identities.
--
-- The item_key column is the same normalization as the stash engine:
-- lowercased + non-alphanum→space + collapsed-whitespace + trim. See
-- web/src/lib/stashEngine.js#normalizeKey and the Dart mirror.

CREATE TABLE IF NOT EXISTS public.product_likes (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_product_likes_item_key
  ON public.product_likes(item_key);

ALTER TABLE public.product_likes ENABLE ROW LEVEL SECURITY;

-- A user can only see their own like rows (used to decide whether
-- the heart icon should render filled). Counts come through the RPC.
DROP POLICY IF EXISTS "users see their own likes" ON public.product_likes;
CREATE POLICY "users see their own likes" ON public.product_likes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users like their own products" ON public.product_likes;
CREATE POLICY "users like their own products" ON public.product_likes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users unlike their own products" ON public.product_likes;
CREATE POLICY "users unlike their own products" ON public.product_likes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RPC: aggregate like counts for a batch of item keys, plus a flag
-- showing whether the calling user has liked each one. Returns one
-- row per requested key (count=0 when no one has liked it).
--
-- SECURITY DEFINER so the SELECT count(*) runs unrestricted; the
-- function still scopes liked_by_me to the caller's auth.uid().
CREATE OR REPLACE FUNCTION public.product_like_counts(item_keys text[])
RETURNS TABLE (item_key text, total_likes int, liked_by_me boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH keys AS (
    SELECT unnest(item_keys) AS k
  ),
  totals AS (
    SELECT pl.item_key, count(*)::int AS n
    FROM public.product_likes pl
    WHERE pl.item_key = ANY(item_keys)
    GROUP BY pl.item_key
  ),
  mine AS (
    SELECT pl.item_key
    FROM public.product_likes pl
    WHERE pl.user_id = auth.uid()
      AND pl.item_key = ANY(item_keys)
  )
  SELECT
    k.k AS item_key,
    COALESCE(totals.n, 0) AS total_likes,
    (mine.item_key IS NOT NULL) AS liked_by_me
  FROM keys k
  LEFT JOIN totals ON totals.item_key = k.k
  LEFT JOIN mine   ON mine.item_key   = k.k;
END;
$$;

GRANT EXECUTE ON FUNCTION public.product_like_counts(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.product_like_counts(text[]) TO anon;

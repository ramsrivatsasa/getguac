-- migration_071_shopping_cache.sql
-- Shared, CROSS-USER cache for Steals product searches (/api/best-prices).
-- Keyed by normalized query only (no user_id) so every signed-in user shares
-- the same cache — one SerpApi call serves everyone who searches the same
-- product. Reads are open to any authenticated user; writes happen only
-- server-side via the service role (so users can't poison the cache).
--
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS public.shopping_cache (
  cache_key  text PRIMARY KEY,                       -- normalized query
  payload    jsonb NOT NULL,                         -- full /api/best-prices response
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()      -- TTL / refresh marker
);

CREATE INDEX IF NOT EXISTS idx_shopping_cache_updated
  ON public.shopping_cache(updated_at DESC);

ALTER TABLE public.shopping_cache ENABLE ROW LEVEL SECURITY;

-- Any signed-in user may READ the shared cache.
DROP POLICY IF EXISTS "shopping_cache: read" ON public.shopping_cache;
CREATE POLICY "shopping_cache: read" ON public.shopping_cache
  FOR SELECT TO authenticated USING (true);

-- No INSERT/UPDATE/DELETE policy on purpose → only the service-role server
-- writes (it bypasses RLS), so end users can't tamper with cached results.

NOTIFY pgrst, 'reload schema';

-- migration_070_saved_searches.sql
-- Steals "saved searches": a user configures a product search (a category +
-- spec dropdowns like brand / cpu / memory / storage) and saves it to re-run
-- later. We store the refined query + the raw spec selections so the saved
-- search can be both re-run live (prices change) and re-opened for editing.
--
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       text NOT NULL,                          -- human label, e.g. "Dell laptop · 16 GB"
  query       text NOT NULL,                          -- refined query sent to /api/best-prices
  category    text,                                   -- 'laptop' | 'phone' | ... | NULL (freeform)
  specs       jsonb NOT NULL DEFAULT '{}'::jsonb,      -- { brand, cpu, memory, storage, ... }
  last_run_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user
  ON public.saved_searches(user_id, created_at DESC);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_searches: own rows" ON public.saved_searches;
CREATE POLICY "saved_searches: own rows" ON public.saved_searches
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';

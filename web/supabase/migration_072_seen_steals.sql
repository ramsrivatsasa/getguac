-- migration_072_seen_steals.sql
-- Persisted "Steals feed": the on-sale deals we've found for each user across
-- their saved searches, so the /steals page can show a date-sorted list and the
-- daily push can count how many are UNCHECKED (found since the user last looked)
-- — not a strict since-yesterday diff.
--
-- seen_steals  : one row per (user, deal). Carries enough to render a card.
-- steals_state : one row per user holding checked_at (when they last opened the
--                feed). unread = deals with first_seen_at > checked_at.
--
-- seen_steals is written server-side via the service role (the notify cron);
-- users may read their own rows. steals_state is read+written by the user
-- (their own row only) so the page can stamp checked_at on visit.
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS public.seen_steals (
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_key       text NOT NULL,                 -- normalized "<title>|<store>"
  title          text,
  store          text,
  price          numeric,
  original_price numeric,
  url            text,
  image          text,
  rating         numeric,
  query          text,                          -- saved search it surfaced from
  first_seen_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, deal_key)
);

CREATE INDEX IF NOT EXISTS idx_seen_steals_user_seen
  ON public.seen_steals(user_id, first_seen_at DESC);

ALTER TABLE public.seen_steals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "seen_steals: own read" ON public.seen_steals;
CREATE POLICY "seen_steals: own read" ON public.seen_steals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- INSERT/UPDATE/DELETE happen server-side via the service role only.

CREATE TABLE IF NOT EXISTS public.steals_state (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.steals_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "steals_state: own all" ON public.steals_state;
CREATE POLICY "steals_state: own all" ON public.steals_state
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';

-- migration_063_user_connections.sql
--
-- Per-user retailer "connection" state. Powers the Connections
-- screen where users mark which retailers they've configured to
-- forward receipts to their GetGuac alias.
--
-- Status values:
--   'pending'   — user opened the setup but hasn't confirmed
--   'active'    — user marked it as configured (we trust them); the
--                 status auto-promotes to 'verified' once we see
--                 receipts from this retailer's domain
--   'verified'  — we've seen at least one receipt that originated from
--                 this retailer's email domain (set by a trigger or by
--                 the parse pipeline)
--   'dismissed' — user explicitly turned the setup off
--
-- Catalog of retailers + their setup steps lives in
-- web/src/lib/retailers.js (client-side data, no DB table needed —
-- the list changes too fast for migrations). This table just tracks
-- per-user state against those retailer IDs.

CREATE TABLE IF NOT EXISTS public.user_connections (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  retailer_id  text NOT NULL,
  status       text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'verified', 'dismissed')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  verified_at  timestamptz,
  receipts_seen int NOT NULL DEFAULT 0,
  notes        text,
  PRIMARY KEY (user_id, retailer_id)
);

CREATE INDEX IF NOT EXISTS idx_user_connections_user
  ON public.user_connections(user_id);

ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see their own connections" ON public.user_connections;
CREATE POLICY "users see their own connections" ON public.user_connections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users manage their own connections" ON public.user_connections;
CREATE POLICY "users manage their own connections" ON public.user_connections
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

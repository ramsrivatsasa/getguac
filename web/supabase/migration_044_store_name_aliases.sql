-- ============================================================================
-- GetGuac Migration 044 — store_name_aliases (AI-learned canonical brands)
-- ============================================================================
-- Backs /api/cron/normalize-stores. The cron periodically scans receipts
-- with store_names that aren't in our hardcoded alias map (lib/store-
-- name-normalize.js#ALIASES) and asks Gemini whether each is a variant of
-- a known merchant. Results land here so we never re-ask about the same
-- unknown merchant twice (and so future receipts can be canonicalized
-- against learned aliases, not just hardcoded ones).
--
-- Lifecycle:
--   - key (text)         : the NORMALIZED store name (output of
--                          normalizeStoreName). Primary key.
--   - display_name (text): the canonical brand Gemini identified
--                          ("Costco", "Shell", etc.). NULL when Gemini
--                          said this is NOT a recognizable known brand.
--   - source (text)      : 'ai' | 'manual' | 'seed'. Manual edits via the
--                          admin UI win over ai.
--   - confidence (numeric|null): Gemini's self-reported confidence (0-1).
--   - attempts (int)     : we tried Gemini N times. Cap at 3 for keys
--                          that consistently resolve to null — don't
--                          burn tokens on the same unknowns nightly.
--   - last_attempt (timestamptz)
--   - created_at (timestamptz)
--
-- The cron uses an admin client (service_role) so RLS doesn't block
-- the cross-user scan. Reads from this table use admin too — the alias
-- map is global, not per-user.
-- ============================================================================

create table if not exists public.store_name_aliases (
  key           text         primary key,
  display_name  text,
  source        text         not null default 'ai'
                check (source in ('ai', 'manual', 'seed')),
  confidence    numeric,
  attempts      int          not null default 1,
  last_attempt  timestamptz  not null default now(),
  created_at    timestamptz  not null default now()
);

-- Lookup by display_name when reverse-mapping (e.g. "show me every
-- normalized form that points at Costco").
create index if not exists idx_store_name_aliases_display
  on public.store_name_aliases(display_name)
  where display_name is not null;

-- For cron skipping: pull keys we've tried >= 3 times to avoid re-asking.
create index if not exists idx_store_name_aliases_attempts
  on public.store_name_aliases(attempts);

-- Strictly admin/service-role. Clients never read or write this table
-- directly — they go through canonicalStoreName() which queries via the
-- server-side helper. Default RLS posture (no policies) blocks all
-- non-service-role access.
alter table public.store_name_aliases enable row level security;

notify pgrst, 'reload schema';

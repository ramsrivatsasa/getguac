-- ============================================================================
-- GetGuac Migration 053 — price_lookups cache
-- ============================================================================
-- Caches results of /api/best-price calls so repeat lookups of the same item
-- at the same approximate location don't burn Gemini API quota.
--
-- Key shape: (cache_key, geo_bucket) — cache_key is the normalized item
-- name (lowercase + collapsed whitespace), geo_bucket is a coarsened
-- "lat,lng" string at ~1km precision (3 decimals) so users in the same
-- neighbourhood share cache entries.
--
-- TTL is enforced at read time by the API (24h default). Old rows are not
-- automatically purged — a small cost (a few hundred KB) for keeping
-- historical lookups around. Future migration can add a TTL sweeper.
--
-- The table is GLOBAL (not per-user). This is the whole point: one user's
-- "Costco · $5.49 milk" lookup near Bellevue benefits every other user
-- looking up milk in the same area. Reads are open to authenticated;
-- writes go through service-role (the API route).
--
-- Idempotent. Safe to re-run.
-- ============================================================================

create table if not exists public.price_lookups (
  id           uuid primary key default gen_random_uuid(),
  cache_key    text not null,                   -- normalized item name
  geo_bucket   text not null,                   -- 'lat,lng' rounded to 3 decimals (~111m)
  store_name   text,                            -- e.g. 'Costco Issaquah'
  price        numeric(10,2),                   -- best price found (USD)
  url          text,                            -- direct product URL when Gemini returns one
  raw_response text,                            -- the full grounded text (for debugging / future re-parse)
  source       text not null default 'gemini-2.5-flash',
  checked_at   timestamptz not null default now(),
  hit_count    int not null default 0,
  unique (cache_key, geo_bucket)
);

create index if not exists idx_price_lookups_freshness
  on public.price_lookups(cache_key, geo_bucket, checked_at desc);

alter table public.price_lookups enable row level security;

-- Reads open to any signed-in user — vectors aren't PII and sharing the
-- cache across users is the whole point.
drop policy if exists "price_lookups: authenticated read" on public.price_lookups;
create policy "price_lookups: authenticated read"
  on public.price_lookups for select
  to authenticated
  using (true);

-- Writes go through the service-role server endpoint, never directly
-- from the browser, so no client-write policy needed. The service role
-- bypasses RLS entirely.

notify pgrst, 'reload schema';

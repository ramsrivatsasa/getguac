-- ============================================================================
-- GetGuac Migration 056 — product_images cache
-- ============================================================================
-- Caches product image URLs by normalized item name so we don't burn
-- Google Custom Search quota (100 free queries / day, then ~$5 per 1k)
-- on every share-link creation. Keyed on the cache_key alone — the
-- same item across users / stores gets the same image, which is
-- intended: a shared product image is a feature, not a leak.
--
-- The query layer (lib/product-image.js) returns whatever's here OR
-- triggers a Custom Search lookup, stores the result, and returns it.
-- Cache lifetime is effectively forever — product photos don't change
-- materially. If a stored image goes 404, the consumer falls back to
-- the brand logo / emoji and a future migration could add a TTL
-- sweep.
--
-- The table is GLOBAL (not per-user). Same rationale as price_lookups
-- (migration 053): the cache value isn't PII and sharing it across
-- users is the whole point of caching at all.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

create table if not exists public.product_images (
  cache_key   text primary key,                       -- normalized item name
  image_url   text,                                    -- best image URL we found
  source      text not null default 'google_cse',     -- which lookup engine produced it
  raw         jsonb,                                   -- full provider response, for future re-parse
  checked_at  timestamptz not null default now(),
  hit_count   int not null default 0
);

create index if not exists idx_product_images_checked_at
  on public.product_images(checked_at desc);

alter table public.product_images enable row level security;

-- Reads open to anyone (incl. anon on /share/[token] which needs to
-- render the image without auth). Like price_lookups, the cache
-- isn't PII and the whole point is cross-user sharing.
drop policy if exists "product_images: open read" on public.product_images;
create policy "product_images: open read"
  on public.product_images for select
  to anon, authenticated
  using (true);

-- Writes go through the service-role API route, never directly from
-- the browser, so no client-write policy needed.

notify pgrst, 'reload schema';

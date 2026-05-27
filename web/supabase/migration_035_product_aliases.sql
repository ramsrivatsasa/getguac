-- ============================================================================
-- GetGuac Migration 035 — Product aliases (item-name merge persistence)
-- ============================================================================
-- The smashlist predictor groups receipt_items by normalized name. With only
-- string matching, "Coke 12pk" / "Coca-Cola 12 Pack" / "Coke 12-pack" become
-- three groups — each below MIN_PRIORS, so no prediction fires.
--
-- This table persists merge decisions made via embedding-centroid similarity
-- so that:
--   1. Subsequent predict runs honor prior merges deterministically (no need
--      to recompute centroids on every cron tick).
--   2. A future UI can let users override merges (status='confirmed') or
--      reject false merges (status='rejected') and have those decisions
--      respected forever.
--
-- Keyed by (user_id, alias_key). alias_key is the normalized form of the
-- name to be merged FROM; canonical_key is what it merges INTO.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.product_aliases (
  user_id                uuid not null references auth.users(id) on delete cascade,
  alias_key              text not null,
  canonical_key          text not null,
  canonical_display_name text,
  similarity             numeric,
  status                 text not null default 'auto'
                         check (status in ('auto','confirmed','rejected')),
  source                 text not null default 'embedding'
                         check (source in ('embedding','manual')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  primary key (user_id, alias_key)
);

create index if not exists idx_product_aliases_canonical
  on public.product_aliases(user_id, canonical_key);

alter table public.product_aliases enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'product_aliases' and policyname = 'product_aliases: own rows'
  ) then
    create policy "product_aliases: own rows" on public.product_aliases
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

notify pgrst, 'reload schema';

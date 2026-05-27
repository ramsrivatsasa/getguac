-- GetGuac Migration 031 — Health tier on categories + items
-- Foundation for the future Guac Health Score. Each user category and each
-- individual receipt item can carry a healthiness tier. Item-level value, when
-- present, overrides the category default at the analytics layer.
-- Tiers: 'healthy' | 'neutral' | 'treat' | 'harmful'.
-- Safe to re-run.

alter table public.user_categories
  add column if not exists health_tier text not null default 'neutral';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_categories_health_tier_chk'
  ) then
    alter table public.user_categories
      add constraint user_categories_health_tier_chk
      check (health_tier in ('healthy','neutral','treat','harmful'));
  end if;
end $$;

alter table public.receipt_items
  add column if not exists health_tier text;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'receipt_items_health_tier_chk'
  ) then
    alter table public.receipt_items
      add constraint receipt_items_health_tier_chk
      check (health_tier is null or health_tier in ('healthy','neutral','treat','harmful'));
  end if;
end $$;

notify pgrst, 'reload schema';

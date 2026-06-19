-- Premium entitlement for ad removal (Tier-2 ads hidden for premium users).
-- Bought via in-app purchase (Google Play / Apple) — validated server-side.
--
-- Security model: entitlement lives in its OWN table that users can only READ.
-- There are no insert/update/delete policies, so ONLY the service role (the
-- /api/iap/verify route, after validating the store receipt) can grant premium.
-- A user can never make themselves premium by writing to their profile.

create table if not exists public.premium_entitlements (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  premium_until  timestamptz,                 -- active premium when > now()
  platform       text,                        -- 'android' | 'ios' | 'web'
  product_id     text,
  updated_at     timestamptz not null default now()
);

alter table public.premium_entitlements enable row level security;

-- Users may read their own entitlement (so the app can gate Tier-2 ads).
drop policy if exists "premium own read" on public.premium_entitlements;
create policy "premium own read"
  on public.premium_entitlements for select
  using (auth.uid() = user_id);
-- (No write policies on purpose — service role only.)

-- Append-only log of validated store purchases, for reconciliation/debugging.
create table if not exists public.iap_purchases (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  platform       text not null,               -- 'android' | 'ios'
  product_id     text not null,
  purchase_token text not null,
  expires_at     timestamptz,
  raw            jsonb,
  created_at     timestamptz not null default now(),
  unique (platform, purchase_token)
);

alter table public.iap_purchases enable row level security;

drop policy if exists "iap own read" on public.iap_purchases;
create policy "iap own read"
  on public.iap_purchases for select
  using (auth.uid() = user_id);
-- (No write policies — service role only.)

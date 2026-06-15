-- Marketplace listings — peer-to-peer "Sell" tab (FB-Marketplace style).
-- GetGuac account holders list items for sale; anyone can browse active ones.
--
-- Photos reuse the existing public `receipts` storage bucket (path
-- `<user_id>/mkt_*`), so no new bucket/policies are required.
--
-- Apply in Supabase SQL editor, then: NOTIFY pgrst, 'reload schema';

create extension if not exists pgcrypto;

create table if not exists public.marketplace_listings (
  id            uuid primary key default gen_random_uuid(),
  seller_id     uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  description   text,
  price         numeric(10,2) not null default 0,
  category      text,
  condition     text,                                   -- New / Like new / Good / Fair
  location      text,
  images        jsonb not null default '[]'::jsonb,     -- array of public image URLs
  contact_email text,                                   -- optional; how buyers reach the seller
  status        text not null default 'active',         -- active / sold / removed
  receipt_id    uuid references public.receipts(id) on delete set null,  -- optional proof-of-purchase
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.marketplace_listings enable row level security;

-- READ: anyone (incl. anonymous) sees active listings; sellers also see their own non-active ones.
drop policy if exists "ml read active or own" on public.marketplace_listings;
create policy "ml read active or own" on public.marketplace_listings
  for select using (status = 'active' or seller_id = auth.uid());

-- WRITE: a user can only create/edit/delete their OWN listings.
drop policy if exists "ml insert own" on public.marketplace_listings;
create policy "ml insert own" on public.marketplace_listings
  for insert with check (seller_id = auth.uid());

drop policy if exists "ml update own" on public.marketplace_listings;
create policy "ml update own" on public.marketplace_listings
  for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());

drop policy if exists "ml delete own" on public.marketplace_listings;
create policy "ml delete own" on public.marketplace_listings
  for delete using (seller_id = auth.uid());

create index if not exists ml_browse_idx on public.marketplace_listings (status, created_at desc);
create index if not exists ml_seller_idx on public.marketplace_listings (seller_id);
create index if not exists ml_category_idx on public.marketplace_listings (category);

NOTIFY pgrst, 'reload schema';

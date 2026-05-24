-- GetGuac Migration 001 — AI parser support
-- Adds: store_locations (multi-location stores), receipt_refund_policies,
--       store_location_id + payment fields on receipts.
-- Safe to re-run (idempotent). Run after schema.sql.

-- ============================================================
-- STORE LOCATIONS (one store → many physical locations)
-- ============================================================
create table if not exists public.store_locations (
  id            uuid primary key default uuid_generate_v4(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  location_name text,
  address       text,
  city          text,
  state         text,
  zip           text,
  phone_no      text,
  store_no      text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_store_locations_store_id on public.store_locations(store_id);
create unique index if not exists ux_store_locations_store_addr
  on public.store_locations(store_id, coalesce(address, ''));

alter table public.store_locations enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'store_locations' and policyname = 'store_locations: read all'
  ) then
    create policy "store_locations: read all" on public.store_locations
      for select using (auth.role() = 'authenticated');
    create policy "store_locations: insert auth" on public.store_locations
      for insert with check (auth.role() = 'authenticated');
    create policy "store_locations: update auth" on public.store_locations
      for update using (auth.role() = 'authenticated');
  end if;
end $$;

-- ============================================================
-- RECEIPTS — extra columns for location + payment
-- ============================================================
alter table public.receipts
  add column if not exists store_location_id uuid references public.store_locations(id),
  add column if not exists payment_method    text,
  add column if not exists payment_last4     text;

create index if not exists idx_receipts_store_id on public.receipts(store_id);
create index if not exists idx_receipts_store_loc on public.receipts(store_location_id);

-- ============================================================
-- RECEIPT REFUND POLICIES (one receipt → many policies, e.g. Home Depot A/B/C)
-- ============================================================
create table if not exists public.receipt_refund_policies (
  id          uuid primary key default uuid_generate_v4(),
  receipt_id  uuid not null references public.receipts(id) on delete cascade,
  policy_id   text,
  days        integer,
  expiry_date date,
  eligible    boolean not null default true,
  details     text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_refund_policies_receipt on public.receipt_refund_policies(receipt_id);

alter table public.receipt_refund_policies enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'receipt_refund_policies' and policyname = 'refund_policies: own receipts'
  ) then
    create policy "refund_policies: own receipts" on public.receipt_refund_policies
      for all using (
        exists (
          select 1 from public.receipts r
          where r.id = receipt_id and (
            r.user_id = auth.uid() or
            exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
          )
        )
      );
  end if;
end $$;

-- ============================================================
-- RECEIPT ITEMS — link an item to its policy bucket (Home Depot prints "<A>" per line)
-- ============================================================
alter table public.receipt_items
  add column if not exists refund_policy_id text;

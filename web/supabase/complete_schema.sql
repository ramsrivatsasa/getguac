-- ============================================================================
-- GetGuac — Complete Schema (as of 2026-05-23)
-- ============================================================================
-- Combines: schema.sql + migration_001..005
-- Run this ONCE in Supabase Dashboard → SQL Editor → New Query → Run.
-- Safe to re-run: every statement is `if not exists` / guarded.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  first_name        text,
  last_name         text,
  birth_date        date,
  age               integer,
  alternative_email text,
  mobile_no         text,
  is_admin          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name, birth_date, age, alternative_email, mobile_no)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    (new.raw_user_meta_data->>'birth_date')::date,
    (new.raw_user_meta_data->>'age')::integer,
    new.raw_user_meta_data->>'alternative_email',
    new.raw_user_meta_data->>'mobile_no'
  );
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- STORES
-- ============================================================
create table if not exists public.stores (
  id         uuid primary key default uuid_generate_v4(),
  store_name text not null,
  address    text,
  phone_no   text,
  website    text,
  created_at timestamptz not null default now()
);

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

-- ============================================================
-- RECEIPTS  (+ migration 001 location/payment, 003 validation, 005 category)
-- ============================================================
create table if not exists public.receipts (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  store_name        text not null,
  store_id          uuid references public.stores(id),
  date              date not null,
  total_amount      numeric(12, 2) not null default 0,
  tax_paid          numeric(12, 2) not null default 0,
  reward_no         text,
  receipt_link      text,
  business_purchase boolean not null default false,
  processed         boolean not null default false,
  created_at        timestamptz not null default now()
);
alter table public.receipts
  add column if not exists store_location_id  uuid references public.store_locations(id),
  add column if not exists payment_method     text,
  add column if not exists payment_last4      text,
  add column if not exists rating             integer check (rating is null or rating between 1 and 5),
  add column if not exists validation_tags    text[] default '{}',
  add column if not exists validation_comment text,
  add column if not exists validated_at       timestamptz,
  add column if not exists category           text;

create index if not exists idx_receipts_user_id      on public.receipts(user_id);
create index if not exists idx_receipts_date         on public.receipts(date desc);
create index if not exists idx_receipts_user_date    on public.receipts(user_id, date desc);
create index if not exists idx_receipts_store_id     on public.receipts(store_id);
create index if not exists idx_receipts_store_loc    on public.receipts(store_location_id);
create index if not exists idx_receipts_rating       on public.receipts(rating);
create index if not exists idx_receipts_validated_at on public.receipts(validated_at desc);
create index if not exists idx_receipts_category     on public.receipts(category);

-- ============================================================
-- RECEIPT ITEMS  (+ migration 001 refund_policy_id, 004 validation, 005 category)
-- ============================================================
create table if not exists public.receipt_items (
  id              uuid primary key default uuid_generate_v4(),
  receipt_id      uuid not null references public.receipts(id) on delete cascade,
  sku             text,
  model           text,
  item_name       text not null,
  purchase_date   date,
  qty             integer not null default 1,
  price           numeric(12, 2) not null default 0,
  store_name_id   text,
  warranty_info   text,
  item_manual     text,
  return_date     date,
  returned        boolean not null default false,
  created_at      timestamptz not null default now()
);
alter table public.receipt_items
  add column if not exists refund_policy_id   text,
  add column if not exists rating             integer check (rating is null or rating between 1 and 5),
  add column if not exists validation_tags    text[] default '{}',
  add column if not exists validation_comment text,
  add column if not exists validated_at       timestamptz,
  add column if not exists category           text;

create index if not exists idx_receipt_items_receipt_id on public.receipt_items(receipt_id);
create index if not exists idx_receipt_items_rating     on public.receipt_items(rating);
create index if not exists idx_receipt_items_category   on public.receipt_items(category);

-- ============================================================
-- RECEIPT REFUND POLICIES (one receipt → many policies, eg HD A/B/C)
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

-- ============================================================
-- REWARDS
-- ============================================================
create table if not exists public.rewards (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  reward_no     text not null,
  expiry_date   date not null,
  reward_type   text not null,
  reward_title  text not null,
  description   text,
  store_name    text not null,
  rewards_link  text,
  reward_points integer default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_rewards_user_id on public.rewards(user_id);
create index if not exists idx_rewards_expiry  on public.rewards(expiry_date asc);

-- ============================================================
-- SHOPPING LIST
-- ============================================================
create table if not exists public.shopping_list (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  sku           text,
  item_name     text not null,
  order_date    date,
  qty           integer default 1,
  price         numeric(12, 2),
  store_name_id text,
  comments      text,
  frequency     text not null default 'Monthly' check (frequency in ('Monthly','Weekly','Biweekly')),
  approved      boolean not null default false,
  sent_to_store boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists idx_shopping_user_id on public.shopping_list(user_id);

-- ============================================================
-- CAR TRIPS
-- ============================================================
create table if not exists public.car_trips (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  start_date  date not null,
  end_date    date not null,
  total_miles numeric(10, 1) not null,
  description text,
  category    text not null default 'Personal' check (category in ('Business','Personal')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_car_trips_user_id on public.car_trips(user_id);

-- ============================================================
-- PAYMENT OPTIONS
-- ============================================================
create table if not exists public.payment_options (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  payment_type  text not null,
  card_last4    char(4) not null,
  card_type     text not null check (card_type in ('Visa','MC','Amex','Discover')),
  business_card boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- STORE ITEMS (catalog)
-- ============================================================
create table if not exists public.store_items (
  id            uuid primary key default uuid_generate_v4(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  sku           text,
  item_name     text not null,
  price         numeric(12, 2),
  return_policy text,
  warranty_info text,
  item_manual   text,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- SPENDING SUMMARY RPC
-- ============================================================
create or replace function public.spending_summary(period_type text default 'month')
returns table(period text, total_spend numeric, total_tax numeric, transaction_count bigint)
language sql security definer as $$
  select
    to_char(date_trunc(period_type, r.date), 'YYYY-MM') as period,
    sum(r.total_amount)     as total_spend,
    sum(r.tax_paid)         as total_tax,
    count(*)                as transaction_count
  from public.receipts r
  where r.user_id = auth.uid()
    and r.date >= (now() - interval '12 months')
  group by date_trunc(period_type, r.date)
  order by date_trunc(period_type, r.date) desc;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles                enable row level security;
alter table public.receipts                enable row level security;
alter table public.receipt_items           enable row level security;
alter table public.receipt_refund_policies enable row level security;
alter table public.rewards                 enable row level security;
alter table public.shopping_list           enable row level security;
alter table public.car_trips               enable row level security;
alter table public.payment_options         enable row level security;
alter table public.stores                  enable row level security;
alter table public.store_locations         enable row level security;
alter table public.store_items             enable row level security;

-- Drop + recreate so this script can be re-run to update policies.
do $$ declare r record; begin
  for r in
    select schemaname, tablename, policyname from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Profiles
create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Receipts
create policy "receipts: own rows" on public.receipts
  for all using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Receipt items
create policy "receipt_items: own receipts" on public.receipt_items
  for all using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and (
        r.user_id = auth.uid() or
        exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
      )
    )
  );

-- Refund policies
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

-- Rewards
create policy "rewards: own rows" on public.rewards
  for all using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Shopping list / Car trips / Payment options — owner only
create policy "shopping_list: own rows" on public.shopping_list
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "car_trips: own rows" on public.car_trips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "payment_options: own rows" on public.payment_options
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Shared directories: stores + store_locations + store_items
-- read/write open to all authenticated users
create policy "stores: read all"        on public.stores         for select using (auth.role() = 'authenticated');
create policy "stores: insert auth"     on public.stores         for insert with check (auth.role() = 'authenticated');
create policy "stores: update auth"     on public.stores         for update using (auth.role() = 'authenticated');
create policy "stores: delete auth"     on public.stores         for delete using (auth.role() = 'authenticated');

create policy "store_locations: read all"    on public.store_locations for select using (auth.role() = 'authenticated');
create policy "store_locations: insert auth" on public.store_locations for insert with check (auth.role() = 'authenticated');
create policy "store_locations: update auth" on public.store_locations for update using (auth.role() = 'authenticated');
create policy "store_locations: delete auth" on public.store_locations for delete using (auth.role() = 'authenticated');

create policy "store_items: read all"    on public.store_items for select using (auth.role() = 'authenticated');
create policy "store_items: insert auth" on public.store_items for insert with check (auth.role() = 'authenticated');
create policy "store_items: update auth" on public.store_items for update using (auth.role() = 'authenticated');
create policy "store_items: delete auth" on public.store_items for delete using (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKET — run separately if not done
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('receipts', 'receipts', true)
--   on conflict (id) do nothing;
-- create policy "receipts storage: own folder" on storage.objects
--   for all using (auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- Tell PostgREST to reload its schema cache so the API picks
-- everything up immediately (otherwise queries to new columns
-- return "could not find the X column" errors).
-- ============================================================
notify pgrst, 'reload schema';

-- GetGuac Database Schema
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query → Paste & Run

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users — auto-created via trigger)
-- ============================================================
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  first_name      text,
  last_name       text,
  birth_date      date,
  age             integer,
  alternative_email text,
  mobile_no       text,
  is_admin        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-create profile on signup
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
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- STORES
-- ============================================================
create table public.stores (
  id          uuid primary key default uuid_generate_v4(),
  store_name  text not null,
  address     text,
  phone_no    text,
  website     text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- RECEIPTS
-- ============================================================
create table public.receipts (
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

create index idx_receipts_user_id on public.receipts(user_id);
create index idx_receipts_date on public.receipts(date desc);
create index idx_receipts_user_date on public.receipts(user_id, date desc);

-- ============================================================
-- RECEIPT ITEMS
-- ============================================================
create table public.receipt_items (
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

create index idx_receipt_items_receipt_id on public.receipt_items(receipt_id);

-- ============================================================
-- REWARDS
-- ============================================================
create table public.rewards (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  reward_no       text not null,
  expiry_date     date not null,
  reward_type     text not null,
  reward_title    text not null,
  description     text,
  store_name      text not null,
  rewards_link    text,
  reward_points   integer default 0,
  created_at      timestamptz not null default now()
);

create index idx_rewards_user_id on public.rewards(user_id);
create index idx_rewards_expiry on public.rewards(expiry_date asc);

-- ============================================================
-- SHOPPING LIST
-- ============================================================
create table public.shopping_list (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  sku             text,
  item_name       text not null,
  order_date      date,
  qty             integer default 1,
  price           numeric(12, 2),
  store_name_id   text,
  comments        text,
  frequency       text not null default 'Monthly' check (frequency in ('Monthly','Weekly','Biweekly')),
  approved        boolean not null default false,
  sent_to_store   boolean not null default false,
  created_at      timestamptz not null default now()
);

create index idx_shopping_user_id on public.shopping_list(user_id);

-- ============================================================
-- CAR TRIPS (Mileage)
-- ============================================================
create table public.car_trips (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  start_date    date not null,
  end_date      date not null,
  total_miles   numeric(10, 1) not null,
  description   text,
  category      text not null default 'Personal' check (category in ('Business','Personal')),
  created_at    timestamptz not null default now()
);

create index idx_car_trips_user_id on public.car_trips(user_id);

-- ============================================================
-- PAYMENT OPTIONS
-- ============================================================
create table public.payment_options (
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
create table public.store_items (
  id                uuid primary key default uuid_generate_v4(),
  store_id          uuid not null references public.stores(id) on delete cascade,
  sku               text,
  item_name         text not null,
  price             numeric(12, 2),
  return_policy     text,
  warranty_info     text,
  item_manual       text,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- ANALYTICS: Spending Summary RPC
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
-- ROW LEVEL SECURITY (critical for multi-tenant finance app)
-- ============================================================
alter table public.profiles       enable row level security;
alter table public.receipts       enable row level security;
alter table public.receipt_items  enable row level security;
alter table public.rewards        enable row level security;
alter table public.shopping_list  enable row level security;
alter table public.car_trips      enable row level security;
alter table public.payment_options enable row level security;
alter table public.stores          enable row level security;
alter table public.store_items     enable row level security;

-- Profiles: own row only
create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Receipts: own rows + admin
create policy "receipts: own rows" on public.receipts
  for all using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Receipt items: via receipt ownership
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

-- Rewards: own rows + admin
create policy "rewards: own rows" on public.rewards
  for all using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Shopping list: own rows
create policy "shopping_list: own rows" on public.shopping_list
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Car trips: own rows
create policy "car_trips: own rows" on public.car_trips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Payment options: own rows
create policy "payment_options: own rows" on public.payment_options
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Stores: read-only for all auth users
create policy "stores: read all" on public.stores for select using (auth.role() = 'authenticated');
create policy "store_items: read all" on public.store_items for select using (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKET (run in Supabase Dashboard → Storage)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('receipts', 'receipts', true);
-- create policy "receipts storage: own folder" on storage.objects
--   for all using (auth.uid()::text = (storage.foldername(name))[1]);

-- GetGuac Migration 011 — User-defined categories
-- Users can create their own categories on top of the 12 built-in presets.
-- The receipts.category / receipt_items.category columns just hold the slug —
-- they reference either a preset (in lib/categories.js) or a row here.
-- Safe to re-run.

create table if not exists public.user_categories (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  slug        text not null,
  label       text not null,
  emoji       text not null default '📦',
  color       text not null default 'gray',
  created_at  timestamptz not null default now()
);

create unique index if not exists ux_user_categories_user_slug
  on public.user_categories(user_id, lower(slug));
create index if not exists idx_user_categories_user on public.user_categories(user_id);

alter table public.user_categories enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'user_categories' and policyname = 'user_categories: own rows') then
    create policy "user_categories: own rows" on public.user_categories
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

notify pgrst, 'reload schema';

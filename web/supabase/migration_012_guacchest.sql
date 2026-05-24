-- GetGuac Migration 012 — GuacChest savings log
-- Every time a user claims a deal from Steals, the savings (old_price - new_price)
-- get logged here so we can show their total stash of money saved.
-- Safe to re-run.

create table if not exists public.guac_savings (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  item_name       text not null,
  sku             text,
  old_price       numeric(12, 2) not null,
  new_price       numeric(12, 2) not null,
  savings_amount  numeric(12, 2) generated always as (old_price - new_price) stored,
  source_store    text,
  source_url      text,
  claimed_at      timestamptz not null default now()
);

create index if not exists idx_guac_savings_user      on public.guac_savings(user_id);
create index if not exists idx_guac_savings_claimed   on public.guac_savings(user_id, claimed_at desc);

alter table public.guac_savings enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'guac_savings' and policyname = 'guac_savings: own rows') then
    create policy "guac_savings: own rows" on public.guac_savings
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

notify pgrst, 'reload schema';

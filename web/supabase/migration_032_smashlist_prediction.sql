-- GetGuac Migration 032 — Predictive Smashlist
-- Adds columns to shopping_list so the GuacWizard predictor can drop
-- "you're about to run out" suggestions into the user's existing list
-- with enough context for the UI to badge them and the user to
-- approve / snooze / dismiss.
--
-- Also adds a per-user dismissed table so a "no, I never buy that" stays
-- gone instead of getting re-predicted every cron run.
--
-- Safe to re-run.

alter table public.shopping_list
  add column if not exists predicted boolean not null default false;

alter table public.shopping_list
  add column if not exists predicted_reason text;

alter table public.shopping_list
  add column if not exists predicted_at timestamptz;

alter table public.shopping_list
  add column if not exists predicted_avg_cadence_days numeric;

alter table public.shopping_list
  add column if not exists predicted_last_purchase_date date;

alter table public.shopping_list
  add column if not exists category text;

alter table public.shopping_list
  add column if not exists health_tier text
  check (health_tier is null or health_tier in ('healthy','neutral','treat','harmful'));

create index if not exists idx_shopping_list_predicted on public.shopping_list(user_id, predicted, approved);

create table if not exists public.smashlist_predict_dismissed (
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_key    text not null,                  -- lower(normalize(item_name))
  dismissed_at timestamptz not null default now(),
  primary key (user_id, item_key)
);
alter table public.smashlist_predict_dismissed enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'smashlist_predict_dismissed' and policyname = 'smashlist_predict_dismissed: own rows') then
    create policy "smashlist_predict_dismissed: own rows" on public.smashlist_predict_dismissed
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

notify pgrst, 'reload schema';

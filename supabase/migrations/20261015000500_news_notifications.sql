create table if not exists public.news_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  title text not null,
  stories jsonb not null default '[]'::jsonb check (jsonb_typeof(stories) = 'array'),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(user_id,event_key)
);
create index if not exists news_notifications_user_time on public.news_notifications(user_id,created_at desc);
alter table public.news_notifications enable row level security;
revoke all on public.news_notifications from public,anon,authenticated;
grant select on public.news_notifications to authenticated;
grant update(read_at) on public.news_notifications to authenticated;
grant all on public.news_notifications to service_role;
create policy news_notifications_read_own on public.news_notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy news_notifications_mark_own on public.news_notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

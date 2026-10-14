create table if not exists public.site_statistics_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  visitor_hash text check (visitor_hash is null or visitor_hash ~ '^[0-9a-f]{64}$'),
  path text not null check (length(path) <= 200),
  event text not null check (event in ('page_view','signup_start','signup_submit','signup_error','account_created','email_confirmed','store_click')),
  country text not null default 'Unknown', region text not null default 'Unknown', city text not null default 'Unknown',
  device text not null default 'Unknown', source text not null default 'Direct / unknown'
);
create index if not exists site_statistics_events_time_idx on public.site_statistics_events (occurred_at,id);
alter table public.site_statistics_events enable row level security;
revoke all on public.site_statistics_events from public,anon,authenticated;
grant select,insert,delete on public.site_statistics_events to service_role;
revoke all on sequence public.site_statistics_events_id_seq from public,anon,authenticated;
grant usage,select on sequence public.site_statistics_events_id_seq to service_role;
-- Service-only writes trigger bounded retention, without granting browser access.
create or replace function public.expire_site_statistics_events() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.site_statistics_events where occurred_at < now() - interval '30 days';
  return null;
end;
$$;
revoke all on function public.expire_site_statistics_events() from public,anon,authenticated;
grant execute on function public.expire_site_statistics_events() to service_role;
drop trigger if exists expire_site_statistics_events on public.site_statistics_events;
create trigger expire_site_statistics_events after insert on public.site_statistics_events
for each statement execute function public.expire_site_statistics_events();

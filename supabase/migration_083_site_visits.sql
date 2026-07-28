-- migration_083 — first-party visitor counting
--
-- The site had NO working analytics: PostHog is wired but its key was never
-- set, and there was no way to tell whether ad traffic ever arrived. This is a
-- counter we own: no dashboard toggle, no third-party account, no monthly event
-- cap, and the numbers are queryable straight out of the database.
--
-- PRIVACY: no IP address, no user agent and no user id is ever stored. A
-- visitor is identified only by a salted hash, and the salt rotates daily, so
-- the same person on two days produces two unrelated hashes and cannot be
-- followed across days. There is nothing here to de-anonymise.

-- Pageviews, aggregated. One row per (day, path) — never one row per hit, so
-- this stays small no matter how much traffic arrives.
create table if not exists public.site_visits (
  day    date   not null,
  path   text   not null,
  views  bigint not null default 0,
  primary key (day, path)
);

-- Unique-visitor markers. Existence of the row is the entire signal; there is
-- no column here that identifies anybody.
create table if not exists public.site_visitor_days (
  day          date not null,
  visitor_hash text not null,
  primary key (day, visitor_hash)
);

alter table public.site_visits       enable row level security;
alter table public.site_visitor_days enable row level security;

-- No policies at all: nothing may read or write these tables through the API.
-- Writes happen only via the SECURITY DEFINER function below, called from a
-- server route; reads happen via site_traffic(). Leaving RLS on with zero
-- policies is what makes the raw tables unreachable from the anon key.

-- Record one pageview. SECURITY DEFINER so the server route can write without
-- the tables being exposed. Returns nothing — tracking must never be able to
-- leak data back to the caller.
create or replace function public.record_visit(p_path text, p_visitor_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Bound the key so a crafted request can't write huge rows.
  insert into public.site_visits (day, path, views)
  values (current_date, left(coalesce(p_path, '/'), 200), 1)
  on conflict (day, path) do update set views = public.site_visits.views + 1;

  if p_visitor_hash is not null and length(p_visitor_hash) between 16 and 128 then
    insert into public.site_visitor_days (day, visitor_hash)
    values (current_date, p_visitor_hash)
    on conflict do nothing;   -- second visit same day = same visitor, not a new one
  end if;
end
$$;

revoke all on function public.record_visit(text, text) from public, anon, authenticated;
-- service_role only: this is called from the server route, never the browser.
grant execute on function public.record_visit(text, text) to service_role;

-- Daily totals for the last N days. Aggregate only — no hashes, no paths of
-- individual people — so it is safe to expose.
create or replace function public.site_traffic(p_days int default 30)
returns table (day date, views bigint, visitors bigint)
language sql
stable
security definer
set search_path = public
as $$
  select d.day,
         coalesce(v.views, 0)   as views,
         coalesce(u.visitors, 0) as visitors
  from (
    select generate_series(current_date - (greatest(p_days, 1) - 1), current_date, '1 day')::date as day
  ) d
  left join (
    select day, sum(views)::bigint as views from public.site_visits group by day
  ) v on v.day = d.day
  left join (
    select day, count(*)::bigint as visitors from public.site_visitor_days group by day
  ) u on u.day = d.day
  order by d.day desc
$$;

grant execute on function public.site_traffic(int) to service_role, authenticated;

-- Top paths for a period, for "which page did the ad traffic land on".
create or replace function public.site_top_paths(p_days int default 7, p_limit int default 20)
returns table (path text, views bigint)
language sql
stable
security definer
set search_path = public
as $$
  select path, sum(views)::bigint as views
  from public.site_visits
  where day > current_date - greatest(p_days, 1)
  group by path
  order by views desc
  limit greatest(p_limit, 1)
$$;

grant execute on function public.site_top_paths(int, int) to service_role, authenticated;

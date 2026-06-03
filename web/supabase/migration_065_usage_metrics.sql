-- Cost monitoring — a tiny tally of per-day usage so the /admin/cost
-- page can answer "how close are we to the Supabase / Vercel / Google
-- CSE / OpenAI free-tier ceilings today?"
--
-- One row per (day, metric). Metrics are append-only counters — the
-- recorder uses an UPSERT-with-increment pattern so multiple writers
-- on the same day stack. Backfill / correction is a manual UPDATE.
--
-- This is intentionally a SINGLE-TABLE solution. Anything more
-- elaborate (per-user breakdowns, hourly granularity) is a Grafana /
-- Sentry / PostHog job, not a Postgres job.

create table if not exists usage_metrics (
  day date not null,
  metric text not null,
  value bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, metric)
);

-- RLS — only the service role + admin users can read this table.
-- A regular user has no business seeing aggregate platform usage.
alter table usage_metrics enable row level security;

drop policy if exists "usage_metrics_admin_only_select" on usage_metrics;
create policy "usage_metrics_admin_only_select"
  on usage_metrics for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and coalesce(profiles.is_admin, false) = true
    )
  );

-- profiles.is_admin — defensively add the column if it doesn't exist.
-- Admin-flag rollout is intentionally manual: flip the bit in the
-- Supabase dashboard. No UI for promoting users.
alter table profiles add column if not exists is_admin boolean default false;

-- Recorder RPC. Callable from any signed-in user OR via service role
-- from a cron route. Increments today's counter for the given metric.
--
-- Examples:
--   select record_usage('cse_search', 1);
--   select record_usage('receipts_parsed', 4);
--   select record_usage('llm_tokens_in', 1234);
create or replace function record_usage(p_metric text, p_delta bigint default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_metric is null or length(p_metric) = 0 or length(p_metric) > 64 then
    raise exception 'metric name required, max 64 chars';
  end if;
  insert into usage_metrics (day, metric, value, updated_at)
    values (current_date, p_metric, greatest(p_delta, 0), now())
  on conflict (day, metric) do update
    set value = usage_metrics.value + excluded.value,
        updated_at = now();
end
$$;

grant execute on function record_usage(text, bigint) to authenticated, service_role;

-- Read RPC for the admin dashboard. Returns the last N days, every
-- metric, latest-first. Limit small so the page loads fast.
create or replace function read_usage(p_days int default 14)
returns table (day date, metric text, value bigint, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select day, metric, value, updated_at
    from usage_metrics
    where day >= current_date - greatest(p_days, 1)
    order by day desc, metric asc;
$$;

grant execute on function read_usage(int) to authenticated, service_role;

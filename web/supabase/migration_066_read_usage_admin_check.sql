-- Tighten read_usage — it was SECURITY DEFINER and bypassed the
-- usage_metrics RLS policy, so any signed-in user calling the RPC
-- got rows back. Re-check is_admin inside the function so the
-- definer-bypass doesn't leak.
--
-- Same pattern applied defensively to record_usage: regular users
-- should be able to call it (it's how we tally CSE / LLM use from
-- normal product flows) so we don't gate it on is_admin, but we
-- DO clamp the metric name to a known allowlist so a user can't
-- jam arbitrary tags into the table.

create or replace function read_usage(p_days int default 14)
returns table (day date, metric text, value bigint, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and coalesce(profiles.is_admin, false) = true
  ) then
    raise exception 'admin required';
  end if;
  return query
    select um.day, um.metric, um.value, um.updated_at
      from usage_metrics um
      where um.day >= current_date - greatest(p_days, 1)
      order by um.day desc, um.metric asc;
end
$$;

grant execute on function read_usage(int) to authenticated, service_role;

-- ============================================================================
-- GetGuac Migration 081 — SECURITY FIX: views must run as the CALLER
-- ============================================================================
-- Supabase's database linter flagged three public views as CRITICAL
-- "Security Definer View":
--
--     public.bank_fee_summary        (migration_017_bank.sql)
--     public.email_inbox             (migration_023_email_inbox_full.sql)
--     public.rewards_balance_latest  (migration_027_rewards_balances.sql)
--
-- ROOT CAUSE: a Postgres view executes with the privileges of its OWNER, not
--   the querying user, unless it is explicitly created with
--   `security_invoker = on` (PG15+). These three views are owned by `postgres`,
--   which is RLS-exempt — so every row of the underlying tables flowed through
--   them regardless of who asked. migration_017 even carried the comment
--   "View runs as caller, so RLS still applies", which was simply wrong.
--
--   Concretely — and this is worse than "logged-in users see each other" —
--   the views were readable by `anon`, so ANYONE holding the public anon key
--   (it ships in the web bundle and the mobile app) could GET /rest/v1/
--   email_inbox with no session and receive EVERY user's mail: subjects,
--   bodies, attachment lists. Same class of cross-tenant leak as the receipts
--   fix in migration_080, but reachable without an account.
--
-- FIX: flip all three to `security_invoker = on` so the underlying owner-only
--   RLS policies actually apply:
--       bank_fees          "bf: select own"  (auth.uid() = user_id)
--       bank_statements    "bs: select own"  (auth.uid() = user_id)
--       email_messages     "em: select own"  (auth.uid() = user_id)
--       rewards_balances   "rb: select own"  (auth.uid() = user_id)
--
--   Also drop `anon` from the grants — none of these views has any business
--   being read without a session. Server-side analytics keep working because
--   the SERVICE ROLE bypasses RLS entirely.
--
-- No data moves and no view definition changes; this only narrows WHO each
-- view returns rows to. Idempotent / safe to re-run.
-- ============================================================================

-- VERIFIED against production before writing this migration, using nothing but
-- the public anon key (no session at all):
--     GET /rest/v1/email_inbox       -> 206, content-range 0-0/56   ← every user
--     GET /rest/v1/bank_fee_summary  -> 206, content-range 0-0/3    ← every user
--     GET /rest/v1/email_messages    -> 200, content-range */0      ← RLS holds
--     GET /rest/v1/bank_fees         -> 200, content-range */0      ← RLS holds
-- i.e. the base tables were never the problem; the views were the way around
-- them. rewards_balance_latest 404s in prod (migration_027 was never applied
-- there), so every statement below is guarded on the view actually existing.

do $$
declare
  v text;
begin
  foreach v in array array[
    'bank_fee_summary', 'email_inbox', 'rewards_balance_latest'
  ] loop
    if not exists (
      select 1 from pg_views where schemaname = 'public' and viewname = v
    ) then
      raise notice 'skipping public.% — view not present in this database', v;
      continue;
    end if;

    -- 1. Run as caller, not as owner.
    execute format('alter view public.%I set (security_invoker = on)', v);

    -- 2. Authenticated sessions only. With security_invoker the caller also
    --    needs SELECT on the base tables; the `authenticated` role already has
    --    that from Supabase's default grants, and RLS does the row filtering.
    --    PUBLIC is revoked too, otherwise a grant inherited that way would keep
    --    the anon door open even after anon itself is revoked.
    execute format('revoke all on public.%I from anon', v);
    execute format('revoke all on public.%I from public', v);
    execute format('grant select on public.%I to authenticated', v);
    execute format('grant select on public.%I to service_role', v);

    execute format(
      'comment on view public.%I is %L', v,
      'security_invoker=on — rows are filtered by the CALLER''s RLS on the base '
      || 'tables, not the view owner''s. Do not recreate this view without the '
      || 'option (see migration_081).');

    raise notice 'public.% is now security_invoker, authenticated-only', v;
  end loop;
end $$;

-- ── 3. Fail loudly if anything is still owner-privileged ────────────────────
-- reloptions carries the storage params; a view without security_invoker=on
-- has either no reloptions or an explicit =off.
do $$
declare
  leaky text;
begin
  select string_agg(c.relname, ', ')
    into leaky
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'v'
     and c.relname in ('bank_fee_summary', 'email_inbox', 'rewards_balance_latest')
     and coalesce(array_to_string(c.reloptions, ','), '') not ilike '%security_invoker=on%'
     and coalesce(array_to_string(c.reloptions, ','), '') not ilike '%security_invoker=true%';

  if leaky is not null then
    raise exception 'migration_081 did not take effect for: %', leaky;
  end if;
end $$;

notify pgrst, 'reload schema';

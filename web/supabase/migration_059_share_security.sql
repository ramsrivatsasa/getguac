-- ============================================================================
-- GetGuac Migration 059 — share security hardening
-- ============================================================================
-- Closes two security holes the migration_054 RLS surface left open:
--
--   1. Anon `update` policy on shared_items had NO column whitelist.
--      Anyone holding a token could PATCH the row's `payload` (rewrite
--      the share content), `expires_at` (extend forever), or
--      `shared_by_user_id` (steal referral attribution). The policy
--      existed only to let /share/[token] bump view_count from the
--      anon client — we should never have exposed full UPDATE for that.
--
--   2. Anon `select` was unfiltered. With the anon key anyone could
--      `select * from shared_items where expires_at > now()` and dump
--      every live share's full payload, including the sharer's
--      user_id. Tokens are short opaque slugs; nothing actually
--      depended on a guess-the-token requirement.
--
-- Both fixed by:
--   - Dropping the broad anon policies.
--   - Adding two SECURITY DEFINER RPCs that expose the EXACT behavior
--     we needed (read-by-token + increment-view-count) without
--     handing the underlying table to anonymous callers.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

-- ── Drop the over-permissive policies from migration_054 ─────────────────
drop policy if exists "shared_items: public read live tokens" on public.shared_items;
drop policy if exists "shared_items: anon bump view_count" on public.shared_items;

-- ── New: token-keyed read RPC ────────────────────────────────────────────
-- Returns exactly the fields the public landing page needs. Caller
-- MUST know the token. RLS still applies inside the function (we run
-- as SECURITY DEFINER so we can bypass the now-stricter table policy)
-- but the where-clause on token does the actual gating.
create or replace function public.get_share_by_token(target_token text)
returns table(
  token text,
  payload jsonb,
  shared_by_user_id uuid,
  created_at timestamptz,
  view_count int,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select s.token, s.payload, s.shared_by_user_id, s.created_at, s.view_count, s.expires_at
  from public.shared_items s
  where s.token = target_token
    and (s.expires_at is null or s.expires_at > now())
$$;
grant execute on function public.get_share_by_token(text) to anon, authenticated;

-- ── New: atomic view-count bump RPC ──────────────────────────────────────
-- Single SQL update so concurrent visitors don't lost-update each other.
-- Returns nothing — anon doesn't need the new count, just a confirmation.
create or replace function public.bump_share_view_count(target_token text)
returns void
language sql
security definer
set search_path = public
volatile
as $$
  update public.shared_items
     set view_count = view_count + 1
   where token = target_token
     and (expires_at is null or expires_at > now())
$$;
grant execute on function public.bump_share_view_count(text) to anon, authenticated;

-- Writes (insert) still go through the service-role API route (see
-- /api/share/create). The table itself stays locked down — no anon
-- SELECT / UPDATE / DELETE / INSERT policies remain.

notify pgrst, 'reload schema';

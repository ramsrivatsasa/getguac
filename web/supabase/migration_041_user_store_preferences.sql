-- ============================================================================
-- GetGuac Migration 041 — Tier 2 learning: per-store category preferences
-- ============================================================================
-- Tracks whether each receipt's category was AI-set vs user-confirmed, so
-- we can learn "this user always categorizes IONOS as cloud" and apply
-- that on the next receipt without bothering the user again.
--
-- WHAT THIS ENABLES
-- After a user manually re-categorizes N (default 3) receipts from a
-- given store the SAME way, the next receipt from that store will be
-- auto-categorized to the user's preferred slug, overriding Gemini's
-- initial call. The user never has to re-categorize the same merchant
-- more than ~3 times.
--
-- WHAT THIS DOES NOT DO
-- - Does NOT retroactively change existing receipts. Only applies at
--   new-insert time.
-- - Does NOT cross users (privacy + bias landmine). Each user's
--   learning stays scoped to their own row history.
-- - Does NOT touch return-policy learning (Tier 3, separate migration).
-- ============================================================================

-- Track where each receipt's category came from. Default 'ai' for legacy
-- and freshly-parsed rows; 'user' when the user changes it in the UI;
-- 'rule' for keyword-based fallbacks; 'statement' for bank-statement
-- imports (always auto-tagged misc / bank-fees / etc).
alter table public.receipts
  add column if not exists category_source text not null default 'ai'
  check (category_source in ('ai','user','rule','statement','inferred'));

-- Existing statement rows are inherently non-user — mark them so the
-- learning RPC doesn't count them as user signal.
update public.receipts
   set category_source = 'statement'
 where from_statement = true and category_source = 'ai';

-- Lookup index for the inference RPC: count categories per (user, store).
create index if not exists idx_receipts_user_store_category_source
  on public.receipts(user_id, store_id, category_source, category)
  where category is not null;

-- ── Inference RPC ──────────────────────────────────────────────────────────
-- Returns the user's preferred category for a given store IF they have at
-- least `p_min_count` USER-confirmed receipts at that store with the same
-- category. Returns null when the user hasn't built enough signal yet.
--
-- Match prefers store_id (exact FK match) and falls back to a normalized
-- store_name comparison so we still match on receipts that didn't resolve
-- to a stores-table row.
create or replace function public.infer_user_store_category(
  p_user_id    uuid,
  p_store_id   uuid default null,
  p_store_name text default null,
  p_min_count  int  default 3
) returns text
language sql
stable
security definer
set search_path = public
as $$
  with cands as (
    select r.category, count(*) as c
      from public.receipts r
     where r.user_id = p_user_id
       and r.category is not null
       and r.category_source = 'user'
       and (
         (p_store_id is not null and r.store_id = p_store_id)
         or (p_store_id is null and p_store_name is not null
             and lower(regexp_replace(coalesce(r.store_name,''), '[^a-z0-9]', '', 'g'))
                 = lower(regexp_replace(p_store_name, '[^a-z0-9]', '', 'g')))
       )
     group by r.category
  )
  select category from cands
   where c >= p_min_count
   order by c desc
   limit 1;
$$;

revoke all on function public.infer_user_store_category(uuid, uuid, text, int) from public;
grant execute on function public.infer_user_store_category(uuid, uuid, text, int) to authenticated, service_role;

notify pgrst, 'reload schema';

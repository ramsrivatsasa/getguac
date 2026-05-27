-- GetGuac Migration 034 — One-shot backfill of refund-policy expiry dates
-- and missing store-default rows.
--
-- After migration 033 the new save path computes expiry_date = receipt.date +
-- days and falls back to store_return_policies when the AI returned nothing.
-- This migration brings EXISTING rows up to that standard without requiring a
-- re-parse:
--
--   1. For every receipt_refund_policies row where days IS NOT NULL but
--      expiry_date IS NULL, compute expiry from the parent receipt's date.
--   2. For every receipt that has NO refund_policies row at all, look up
--      a curated default in store_return_policies by normalized store name
--      and insert it with source='store-default' + the citation URL intact.
--
-- Both passes are idempotent — re-running this migration after additional
-- receipts arrive will pick up new ones without touching already-filled rows.
--
-- Safe to re-run.

-- ── 1. Backfill expiry_date for rows that only have `days` ──────────────────
update public.receipt_refund_policies p
  set expiry_date = (r.date::date + (p.days || ' days')::interval)::date
  from public.receipts r
 where p.receipt_id = r.id
   and p.days is not null
   and p.expiry_date is null
   and r.date is not null;

-- ── 2. Same normalizer as web/src/lib/store-name-normalize.js, in SQL ──────
-- Lower-cases, strips URL TLDs, drops a tail of "inc/llc/ltd/corp/...",
-- removes apostrophes/periods/commas/quotes, turns hyphens/slashes into spaces,
-- drops a leading "the ", collapses whitespace. Mirrors the JS behaviour.
create or replace function public._normalize_store_name(name text)
returns text language sql immutable as $$
  select case when name is null or btrim(name) = '' then ''
    else
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    lower(btrim(name)),
                    '\.(com|net|org|co|io|us|app)\b', '', 'g'
                  ),
                  '[,\s]+(inc|llc|ltd|l\.l\.c|corp|company|corporation|holdings|gmbh|s\.a|ag)\.?\s*$', '', 'g'
                ),
                '[\.,''`"]', '', 'g'
              ),
              '[-/_]+', ' ', 'g'
            ),
            '^the\s+', '', 'g'
          ),
          '\s+', ' ', 'g'
        ),
        '^\s+|\s+$', '', 'g'
      )
  end
$$;

-- ── 3. Insert store-default policies for receipts that have none ──────────
-- Pick the catch-all (category IS NULL) row from store_return_policies for
-- each receipt's normalized store name. We deliberately don't try to match a
-- per-category row in SQL — the in-app path can do that next time the user
-- opens the receipt; this migration is the "no policy at all" rescue.
insert into public.receipt_refund_policies
  (receipt_id, policy_id, days, expiry_date, eligible, details, source, source_url)
select
  r.id,
  srp.policy_id,
  srp.days,
  case
    when srp.days is null then null
    else (r.date::date + (srp.days || ' days')::interval)::date
  end,
  srp.eligible,
  srp.details,
  'store-default',
  srp.source_url
from public.receipts r
join public.store_return_policies srp
  on srp.store_name_normalized = public._normalize_store_name(r.store_name)
 and srp.category is null
where r.date is not null
  and r.store_name is not null
  and btrim(r.store_name) <> ''
  and not exists (
    select 1 from public.receipt_refund_policies p where p.receipt_id = r.id
  );

notify pgrst, 'reload schema';

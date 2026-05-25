# Supabase schema — migration order

This directory uses **numbered migrations**, not a Supabase CLI workflow.
That means there is **no automatic dependency resolution**. To set up a fresh
Supabase project (or to bring a stale one current), run files in this order:

1. **`complete_schema.sql`** — initial baseline. Defines the original 11 tables
   (profiles, stores, store_locations, receipts, receipt_items,
   receipt_refund_policies, rewards, shopping_list, car_trips, payment_options,
   store_items) and their RLS policies. Captures the state of the schema as of
   roughly mid-2025.
2. **`migration_001_ai_parser.sql`** through **`migration_NNN_*.sql`** — applied
   in numeric order. Each is idempotent (`alter table ... add column if not exists`,
   `create table if not exists`, etc.) so re-running is safe.

## Why this matters (the bug that motivated this doc)

The receipts list page selected `is_return` from the `receipts` table, but no
migration ever added that column. PostgREST returned an error for the whole
SELECT, so the page silently showed empty while the narrower dashboard query
(which didn't reference `is_return`) kept working. The fix landed in
`migration_024_is_return.sql`.

**Before adding a column reference to code, add the corresponding migration.**
Before deploying, verify every column referenced in `src/lib/db.js` and every
mobile `select(...)` call exists in either `complete_schema.sql` or a numbered
migration that has been run against the live DB.

## Production-environment checklist

For each Supabase project (dev, staging, prod):

```sql
-- Quick sanity check: confirm the receipts table has every column the code expects.
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'receipts'
 order by ordinal_position;
```

Compare against `RECEIPTS_LIST_COLS` in `web/src/lib/db.js` and
`_kReceiptListCols` in `mobile/lib/providers/receipt_provider.dart`.
Anything in code but not in the DB is a hidden outage waiting for a deploy.

## Numbering convention

- One migration per atomic schema concern (one feature = one migration).
- Numbers are unique and monotonic — **never reuse a number**. If two devs
  pick the same number, the later commit renames to the next available.
- File name: `migration_NNN_short_name.sql` (snake_case, lowercase).
- Top of file: a comment block explaining *why* the migration exists and
  what tables/columns it touches. Tag `-- Safe to re-run.` if idempotent.

## Future work (not P0)

`complete_schema.sql` is currently a frozen baseline. It does **not** include
migrations 011-024, which means a fresh Supabase project has 11 tables but
the code expects ~20+. Two paths to fix:

- **Option A (low effort):** Document that fresh deploys must run baseline +
  all migrations in order. This README is that documentation.
- **Option B (better):** Adopt the Supabase CLI's migration workflow
  (`supabase/migrations/`) so `supabase db push` handles ordering and
  `supabase db diff` catches drift automatically. Worth doing before
  multiplying environments.

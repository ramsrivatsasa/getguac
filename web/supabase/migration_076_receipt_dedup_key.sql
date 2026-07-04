-- migration_076_receipt_dedup_key.sql
--
-- DB-level duplicate backstop, part 1 of 2 (SAFE — no data change).
--
-- Context: duplicate receipts leak in even though the save pipeline
-- (lib/save-receipt.js → findExistingReceipt.js) dedups pre-insert, because
-- two concurrent forwards of the SAME purchase both pass the "does one exist?"
-- check before either has committed, then both INSERT. That race produced the
-- reported "4 identical Costco $1,218.99" rows. A pre-insert check in app code
-- can never close this window; only a DB constraint can.
--
-- This migration adds a deterministic `dedup_key` generated column. It is a
-- STORED, IMMUTABLE expression so it can back a UNIQUE index (added in
-- migration_077, after existing dupes are cleaned — see that file).
--
-- Key shape:  <store>|<date>|<sign>|<cents>|<source>
--   store  = store_name lowercased, trimmed, non-alphanumerics stripped
--            (so "LOTTE Market" and "LOTTEmarket" collapse — same trick the
--             /api/receipts/dedup route uses). NOTE: this is intentionally a
--            SIMPLER normalization than the app's alias-aware normalizeStoreName
--            — the DB key only needs to catch EXACT-string races; alias variants
--            ("Amazon Mktp" vs "amazon") are still merged at the app layer by
--            findExistingReceipt before insert.
--   date   = purchase date (text)
--   sign   = '+' purchase / '-' refund, so a refund never collides with the
--            matching charge.
--   cents  = abs(total) in integer cents (rounds AI floating-point wobble).
--   source = 'r' receipt / 's' statement. Statement rows and scanned receipts
--            of the same purchase are kept SEPARATE at the DB level so the
--            statement-import + reconciliation flow (migration_016) still works;
--            cross-source merging stays a deliberate app/UI decision, not a hard
--            DB constraint that would block statement imports.
--
-- Safe to apply anytime: adding a generated column doesn't touch existing data
-- semantics, and nothing enforces uniqueness yet.

alter table public.receipts
  add column if not exists dedup_key text
  generated always as (
    regexp_replace(lower(btrim(coalesce(store_name, ''))), '[^a-z0-9]', '', 'g')
      || '|' || coalesce(date::text, '')
      || '|' || (case when coalesce(total_amount, 0) < 0 then '-' else '+' end)
      || '|' || (round(abs(coalesce(total_amount, 0)) * 100))::bigint::text
      || '|' || (case when from_statement then 's' else 'r' end)
  ) stored;

comment on column public.receipts.dedup_key is
  'Deterministic duplicate key: <store>|<date>|<sign>|<cents>|<source>. '
  'Backs the partial unique index in migration_077. See save-receipt.js for '
  'the app-layer merge that recovers from the 23505 this index raises.';

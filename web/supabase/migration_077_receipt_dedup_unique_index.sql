-- migration_077_receipt_dedup_unique_index.sql
--
-- DB-level duplicate backstop, part 2 of 2 (⚠️ DESTRUCTIVE — deletes rows).
--
-- Depends on migration_076 (the dedup_key generated column).
--
-- A UNIQUE index can't be created while duplicates exist, so this file first
-- PRE-CLEANS existing duplicate rows using the SAME keeper logic as the
-- /api/receipts/dedup route, then creates the partial unique index that makes
-- future duplicate inserts fail with 23505 (which save-receipt.js catches and
-- turns into a merge).
--
-- ────────────────────────────────────────────────────────────────────────────
-- BEFORE YOU RUN THIS:
--   • This DELETES receipt rows (the non-keeper copies of each duplicate group).
--     receipt_items + refund_policies cascade via their FKs; email_messages are
--     RELINKED to the keeper first so inbox→receipt navigation survives.
--   • Safer alternative to the DELETE block: run "Find duplicates" in the app
--     (web /receipts, or the new mobile Receipts ⋮ → Find duplicates) with
--     confirm FIRST — that clears dupes through the reviewed path — then run
--     ONLY the CREATE UNIQUE INDEX statement at the bottom.
--   • Take a backup / run inside the transaction below so you can ROLLBACK if
--     the row counts look wrong.
-- ────────────────────────────────────────────────────────────────────────────

begin;

-- Rank rows within each (user_id, dedup_key) group by keeper preference:
--   1. non-statement rows win (they carry items / store FK / tax)
--   2. then rows with tax_paid > 0 (parsed receipts vs raw $0-tax camera shots)
--   3. then rows with a receipt_link (had a photo / email body)
--   4. tiebreaker: newest created_at
-- Everything ranked > 1 in its group is a duplicate to remove.
with ranked as (
  select
    id,
    first_value(id) over w as keeper_id,
    row_number()    over w as rn
  from public.receipts
  where dedup_key is not null
    and store_name is not null
    and date is not null
    and total_amount is not null
  window w as (
    partition by user_id, dedup_key
    order by
      (from_statement is not true) desc,
      (coalesce(tax_paid, 0) > 0) desc,
      (receipt_link is not null and receipt_link <> '') desc,
      created_at desc
  )
),
losers as (
  select id, keeper_id from ranked where rn > 1
),
-- 1. Relink emails from each doomed row to its keeper.
relinked as (
  update public.email_messages em
     set receipt_id = l.keeper_id
    from losers l
   where em.receipt_id = l.id
  returning em.id
)
-- 2. Delete the duplicate receipts (items/policies cascade).
delete from public.receipts r
 using losers l
 where r.id = l.id;

-- 3. Now that every (user_id, dedup_key) is unique, enforce it. Partial so rows
--    missing any key field (which produce a degenerate key) don't collide.
create unique index if not exists receipts_user_dedup_key_uidx
  on public.receipts (user_id, dedup_key)
  where store_name is not null and date is not null and total_amount is not null;

commit;

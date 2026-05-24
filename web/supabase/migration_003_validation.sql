-- GetGuac Migration 003 — Purchase Validation ("Worth It?")
-- Lets the user rate each receipt 1-5 (1 = regret/adhoc, 5 = must-have/essential),
-- attach predefined tags, and add a free-text comment.
-- Safe to re-run (idempotent).

alter table public.receipts
  add column if not exists rating              integer check (rating is null or rating between 1 and 5),
  add column if not exists validation_tags     text[] default '{}',
  add column if not exists validation_comment  text,
  add column if not exists validated_at        timestamptz;

create index if not exists idx_receipts_rating on public.receipts(rating);
create index if not exists idx_receipts_validated_at on public.receipts(validated_at desc);

-- Refresh PostgREST so the new columns are queryable immediately
notify pgrst, 'reload schema';

-- GetGuac Migration 004 — Per-item Worth It? rating
-- Each receipt line item gets its own rating, tags, and comment. Lets users
-- separate "the receipt was worth it overall" from "this one line was a regret."
-- Safe to re-run (idempotent).

alter table public.receipt_items
  add column if not exists rating              integer check (rating is null or rating between 1 and 5),
  add column if not exists validation_tags     text[] default '{}',
  add column if not exists validation_comment  text,
  add column if not exists validated_at        timestamptz;

create index if not exists idx_receipt_items_rating on public.receipt_items(rating);

-- Refresh PostgREST so the new columns are queryable immediately
notify pgrst, 'reload schema';

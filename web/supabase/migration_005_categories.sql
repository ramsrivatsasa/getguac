-- GetGuac Migration 005 — Purchase Categories
-- Adds a `category` slug to receipts AND receipt_items so spending can be grouped
-- by major buckets (Grub, Tech, Fix-It, etc). Items inherit the receipt's category
-- by default but can be overridden per line (e.g. a Home Depot trip might be
-- Fix-It overall but include one Outdoors plant).
-- Safe to re-run (idempotent).

alter table public.receipts
  add column if not exists category text;

alter table public.receipt_items
  add column if not exists category text;

create index if not exists idx_receipts_category on public.receipts(category);
create index if not exists idx_receipt_items_category on public.receipt_items(category);

notify pgrst, 'reload schema';

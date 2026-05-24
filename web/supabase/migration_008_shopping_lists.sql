-- GetGuac Migration 008 — Themed shopping lists
-- Splits the single Smashlist into themed buckets users can flip between:
-- Pantry, Cravings, Snack Stack, Grub & Grab. Default = Pantry.
-- Safe to re-run (idempotent).

alter table public.shopping_list
  add column if not exists list_name text not null default 'Pantry';

create index if not exists idx_shopping_list_name on public.shopping_list(list_name);

notify pgrst, 'reload schema';

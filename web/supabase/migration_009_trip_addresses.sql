-- GetGuac Migration 009 — From/To addresses on car trips
-- Lets users enter origin + destination and have miles auto-calculated.
-- Safe to re-run.

alter table public.car_trips
  add column if not exists from_address text,
  add column if not exists to_address   text;

notify pgrst, 'reload schema';

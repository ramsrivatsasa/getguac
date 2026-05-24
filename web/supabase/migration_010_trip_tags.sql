-- GetGuac Migration 010 — Trip tags
-- Quick-tag chips for trips (Work, Commute, Errand, etc.) so users on mobile
-- can categorize without typing a full description.
-- Safe to re-run.

alter table public.car_trips
  add column if not exists tags text[] default '{}';

create index if not exists idx_car_trips_tags on public.car_trips using gin(tags);

notify pgrst, 'reload schema';

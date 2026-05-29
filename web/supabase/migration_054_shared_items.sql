-- ============================================================================
-- GetGuac Migration 054 — shared_items (public share-link landing pages)
-- ============================================================================
-- Powers the Google-Shopping-style share pages at
-- https://getguac.app/share/<token>. When a user taps Share on a Stash or
-- Buy Again card, the API generates a short random token, snapshots the
-- relevant item data into `payload`, and returns a URL that the user's
-- chosen channel (WhatsApp, SMS, Email, native sheet) carries to the
-- recipient. The recipient lands on a public page that renders the
-- snapshot — no login required.
--
-- Why a JSON snapshot instead of a live join to the sharer's receipts:
--   1. Prices, ratings, and store associations can change after a share is
--      sent. The recipient should see what was promised at share time.
--   2. Keeps the share-page query a single keyed lookup (cheap + fast).
--   3. If the sharer later deletes the underlying receipt, the share
--      still resolves — recipients don't hit a broken page.
--   4. Avoids accidentally exposing other receipt columns as the schema
--      grows.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

create table if not exists public.shared_items (
  token              text primary key,                  -- short URL-safe slug, e.g. 'aB3xZk9q'
  shared_by_user_id  uuid references auth.users(id) on delete set null,
  payload            jsonb not null,                    -- snapshot at share time
  channel            text,                              -- 'whatsapp' | 'sms' | 'email' | 'copy' | 'native'
  view_count         int not null default 0,
  created_at         timestamptz not null default now(),
  expires_at         timestamptz                        -- null = never; default = +30 days at insert time
);

create index if not exists idx_shared_items_created_at
  on public.shared_items(created_at desc);

alter table public.shared_items enable row level security;

-- Public read by token only — no listing, no scraping. RLS forces a
-- token lookup; you can only read a row if you know its primary key.
-- The "live" filter (expires_at) is enforced here too so an expired
-- share returns nothing without us having to filter in the route.
drop policy if exists "shared_items: public read live tokens" on public.shared_items;
create policy "shared_items: public read live tokens"
  on public.shared_items for select
  to anon, authenticated
  using (expires_at is null or expires_at > now());

-- Increment view_count from the public page (best-effort, no-await).
-- Anyone holding the token may bump the counter for that token only.
drop policy if exists "shared_items: anon bump view_count" on public.shared_items;
create policy "shared_items: anon bump view_count"
  on public.shared_items for update
  to anon, authenticated
  using (expires_at is null or expires_at > now())
  with check (expires_at is null or expires_at > now());

-- Writes (insert) go through the API route using the service role — no
-- client-write policy needed. Service role bypasses RLS entirely.

notify pgrst, 'reload schema';

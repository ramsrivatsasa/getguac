-- Push-notification infrastructure.
--
-- 1. `push_tokens` — one row per (user, device). The mobile app
--    writes its FCM token here on login + on token-refresh. The
--    server-side dispatcher (web/api/notify/...) reads from this
--    table when sending. Stale tokens get pruned when FCM returns
--    UNREGISTERED.
--
-- 2. `notification_prefs` on `profiles` — JSON blob of per-category
--    user opt-ins. Defaults are "all categories on" so users see
--    value immediately; they can mute categories in the in-app
--    settings screen.
--
-- 3. `notification_log` — last-sent-at per (user, category, key)
--    so the dispatcher never double-sends the same alert. The
--    `key` column is the unique-id for the underlying event
--    (e.g. `reward:abc-123:expires-in-7d`).

create table if not exists public.push_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  token        text not null,
  platform     text not null check (platform in ('ios', 'android', 'web')),
  device_label text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists push_tokens_user_idx on public.push_tokens(user_id);
create index if not exists push_tokens_token_idx on public.push_tokens(token);

alter table public.push_tokens enable row level security;

-- RLS: each user reads + writes only their own tokens. The
-- dispatcher runs with the service-role key and bypasses RLS, so
-- no policy needed for the server side.
drop policy if exists push_tokens_self_select on public.push_tokens;
create policy push_tokens_self_select on public.push_tokens
  for select using (auth.uid() = user_id);

drop policy if exists push_tokens_self_insert on public.push_tokens;
create policy push_tokens_self_insert on public.push_tokens
  for insert with check (auth.uid() = user_id);

drop policy if exists push_tokens_self_update on public.push_tokens;
create policy push_tokens_self_update on public.push_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists push_tokens_self_delete on public.push_tokens;
create policy push_tokens_self_delete on public.push_tokens
  for delete using (auth.uid() = user_id);

-- ── Notification preferences (per-user, per-category) ────────────────
alter table public.profiles
  add column if not exists notification_prefs jsonb not null default jsonb_build_object(
    'rewards_expiring',  true,
    'return_window',     true,
    'bank_bite_digest',  true,
    'anomaly_alert',     true,
    'smashlist_day',     true,
    -- Quiet hours — when true, dispatcher skips sends between
    -- quiet_start (UTC hour) and quiet_end (UTC hour). Default off.
    'quiet_hours',       false,
    'quiet_start',       22,
    'quiet_end',         8
  );

-- ── Send log (de-dupe protection) ────────────────────────────────────
create table if not exists public.notification_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  category     text not null,
  -- Stable event id — e.g. `reward:abc-123:expires-2026-06-05`. The
  -- dispatcher hashes a payload-derived key in here so re-running
  -- the cron doesn't re-send the same alert.
  event_key    text not null,
  sent_at      timestamptz not null default now(),
  unique (user_id, category, event_key)
);

create index if not exists notification_log_user_idx on public.notification_log(user_id);
create index if not exists notification_log_sent_idx on public.notification_log(sent_at desc);

alter table public.notification_log enable row level security;
drop policy if exists notification_log_self_select on public.notification_log;
create policy notification_log_self_select on public.notification_log
  for select using (auth.uid() = user_id);
-- Inserts only happen via the service-role dispatcher, no client policy.

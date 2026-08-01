-- ============================================================================
-- GetGuac Migration 082 — PER-MAILBOX email-pull health tracking
-- ============================================================================
-- WHY THIS EXISTS (verified against production 2026-08-01):
--
--   rdasaradi@getguac.app stopped pulling mail on 2026-07-15 and stayed broken
--   for 18 DAYS with nobody being told. 284 rows in audit_log, all for that one
--   user_id (493e544f), ~15/day, every single day since.
--
--   It went unnoticed because the watchdog in /api/email/health asked
--
--       MAX(email_last_poll_at) across ALL provisioned mailboxes
--
--   and the other 8 mailboxes were polling fine every 10 minutes. One healthy
--   mailbox is therefore enough to report the whole fleet "healthy" forever.
--   That is not a tuning problem — the metric simply cannot see a single-user
--   failure, no matter what threshold you put on it.
--
--   Worse, the failure was self-perpetuating but not self-limiting. The auto
--   re-auth in lib/mailbox-reauth.js fires on an IMAP auth error, rotates the
--   Migadu password and retries. For this mailbox Migadu returns 500 both on
--   the password PUT *and* on IMAP login, so the rotation can never succeed —
--   yet it kept rotating every 6h. 26 rotations, 0 recoveries.
--
-- WHAT THIS ADDS: a health record per mailbox, so the pipeline can answer
--   "is THIS user's mail pulling?" instead of only "is ANY user's mail pulling?"
--
--     email_consecutive_failures  reset to 0 on every successful poll,
--                                 incremented on every failed one
--     email_last_error            the real error text (describeImapError), so
--                                 the admin dashboard shows a cause not a count
--     email_last_error_at         when that error happened
--     email_quarantined_at        set once consecutive_failures crosses the
--                                 threshold; cleared automatically on the next
--                                 success
--     email_quarantine_reason     the error that tripped it
--
--   Quarantine deliberately does NOT stop polling — polling is cheap and it is
--   how a mailbox auto-recovers the moment the underlying problem is fixed. It
--   stops the *password rotation* (the 26x pointless loop above) and it stops a
--   known-broken mailbox from holding the health check red forever, which would
--   train everyone to ignore the alarm — the exact failure mode we are fixing.
--
--   Note profiles.email_last_poll_at already means "last SUCCESSFUL poll": the
--   poll route only stamps it after pollMailbox resolves. So it is reused as-is
--   for the per-mailbox freshness check and no new success column is needed.
--
-- Additive only. No data moves, no policy changes, no view changes.
-- Idempotent / safe to re-run.
-- ============================================================================

alter table public.profiles
  add column if not exists email_consecutive_failures integer not null default 0,
  add column if not exists email_last_error           text,
  add column if not exists email_last_error_at        timestamptz,
  add column if not exists email_quarantined_at       timestamptz,
  add column if not exists email_quarantine_reason    text;

comment on column public.profiles.email_consecutive_failures is
  'Consecutive failed email polls for this mailbox. Reset to 0 by a successful poll. Drives quarantine.';
comment on column public.profiles.email_last_error is
  'Last email-poll error text for this mailbox (describeImapError output), for /admin/crashes and the health payload.';
comment on column public.profiles.email_quarantined_at is
  'Set when consecutive failures cross the threshold. Suppresses password rotation and repeat alerts; cleared on the next successful poll.';

-- The watchdog now scans every eligible mailbox each run rather than taking a
-- single MAX(), so give it an index for the exact predicate it filters on.
create index if not exists profiles_email_pull_health_idx
  on public.profiles (email_last_poll_at)
  where email_inbox_provisioned = true
    and email_processing_enabled = true;

-- ---------------------------------------------------------------------------
-- Backfill: mailboxes that are provisioned + enabled but have NEVER been
-- polled, or whose last poll is already ancient, start with a truthful failure
-- count instead of a misleading 0. Without this the first health run after
-- deploy would report the 18-day-dead mailbox as "0 failures".
-- ---------------------------------------------------------------------------
update public.profiles
   set email_consecutive_failures = greatest(email_consecutive_failures, 1)
 where email_inbox_provisioned = true
   and email_processing_enabled = true
   and email_alias is not null
   and (email_last_poll_at is null or email_last_poll_at < now() - interval '6 hours');

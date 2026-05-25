-- ============================================================================
-- GetGuac Migration 025 — Per-folder IMAP poll cursors
-- ============================================================================
-- The IMAP poller in lib/imap-poll.js only ever locked INBOX. Migadu's
-- plus-addressing auto-files mail to matching folders by default:
--   ram+g@getguac.app        -> mailbox folder `g`
--   ram+receipts@getguac.app -> mailbox folder `receipts`
-- Result: receipt mail forwarded to the +g hook never reached our app.
--
-- Fix: poll every non-system folder, dedupe per (user, folder, uid). UIDs are
-- unique only WITHIN a folder in IMAP, so the previous unique(user_id, uid)
-- would have caused false-positive duplicate-key errors as soon as we polled
-- more than one folder.
--
-- Safe to re-run.
-- ============================================================================

-- Add the column. Default 'INBOX' so existing rows backfill into the most
-- common case automatically.
alter table public.email_messages
  add column if not exists imap_folder text not null default 'INBOX';

-- Drop the old constraint if it's still around under either of the names
-- Postgres might have auto-assigned to it.
do $$ begin
  alter table public.email_messages drop constraint if exists email_messages_user_id_uid_key;
exception when undefined_object then null;
end $$;

-- New uniqueness: same UID in different folders is legitimately a different
-- message. The combination of user + folder + uid is what dedupes the poller.
-- Catch both `duplicate_object` (constraint name reused) and
-- `duplicate_table` (the underlying unique index name already exists) — the
-- latter is what Postgres actually throws when this migration is re-run on a
-- DB where the constraint already landed.
do $$ begin
  alter table public.email_messages
    add constraint email_messages_user_folder_uid_key unique (user_id, imap_folder, uid);
exception
  when duplicate_object then null;
  when duplicate_table  then null;
end $$;

-- Index for the per-folder "highest UID seen" lookup the poller does on every
-- cron tick. Without it, that becomes a sequential scan over a user's mail.
create index if not exists idx_email_messages_user_folder_uid
  on public.email_messages(user_id, imap_folder, uid desc);

notify pgrst, 'reload schema';

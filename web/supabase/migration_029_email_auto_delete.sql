-- GetGuac Migration 029 — Auto-delete from upstream mailbox after import
--
-- When enabled, the IMAP poller deletes each message from the user's
-- mailbox the moment it's successfully stored in email_messages. Tradeoff:
-- single source of truth (privacy win) vs. no upstream backup if the DB row
-- ever gets lost. Defaults to FALSE so existing users see no behaviour
-- change — they have to opt in from Profile.
--
-- When this flag is FALSE (the default), the poller MOVES messages to a
-- "Guacked" folder on the mail server instead — still retrievable via
-- webmail, just out of the user's main inbox.
--
-- Safe to re-run.

alter table public.profiles
  add column if not exists email_auto_delete_after_import boolean not null default false;

comment on column public.profiles.email_auto_delete_after_import is
  'When true, /api/email/poll deletes each message from the upstream IMAP mailbox after a successful insert into email_messages. When false (default), messages are moved to the Guacked archive folder instead.';

notify pgrst, 'reload schema';

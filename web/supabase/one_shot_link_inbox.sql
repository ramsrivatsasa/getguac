-- ============================================================================
-- One-shot: link the existing rdasaradi@getguac.app mailbox to your GetGuac
-- profile so the IMAP poller can fetch its mail.
--
-- PRE-REQUISITE: run migration_021_email_inbox.sql AND migration_023_email_inbox_full.sql
-- in the Supabase SQL editor FIRST. They're idempotent — safe to re-run.
-- ============================================================================

-- Make sure you're signed up at getguac.app first. Then this finds your
-- profile via the auth.users.email = your signup email.
update public.profiles p
set
  email_alias                = 'rdasaradi',
  email_inbox_provisioned    = true,
  email_processing_enabled   = true,
  email_inbox_password_enc   = 'RQ1AaAF+OrKrXk/P:Kex9hb9MXAwtRs+5getCLEl8lbK5JX6b:PdXdaZWq4HDd2dUN2d37IA==',
  alias_set_at               = coalesce(alias_set_at, now())
from auth.users u
where p.id = u.id
  and u.email = 'rdasaradi@gmail.com';   -- <-- the email you signed up to GetGuac with

-- Verify (should return 1 row):
select id, email_alias, email_inbox_provisioned, email_processing_enabled, alias_set_at
from public.profiles
where email_alias = 'rdasaradi';

-- ============================================================================
-- GetGuac Migration 023 — Full-inbox support
-- ============================================================================
-- Previously the poller only fetched +receipts mail and stored a 200-char
-- preview. We're expanding to a full in-app inbox: poller fetches every
-- message and persists the body so the UI can render it without round-tripping
-- to IMAP on every click.
--
-- Privacy: each user gets a kill-switch (`email_processing_enabled`). When
-- false the poller skips their mailbox entirely. Default = true at signup;
-- users can flip it in Profile → Email settings at any time.
--
-- Bodies are stored encrypted-at-rest by Postgres (Supabase default). For
-- additional defense-in-depth, application-layer AES-GCM on the body columns
-- is on the roadmap (see SECURITY_REVIEW.md).
--
-- Safe to re-run.
-- ============================================================================

-- ── profiles: per-user opt-out for inbox processing ───────────────────────
alter table public.profiles
  add column if not exists email_processing_enabled boolean default true;

-- ── email_messages: body + attachments + read state ───────────────────────
alter table public.email_messages
  add column if not exists body_text          text,
  add column if not exists body_html          text,
  add column if not exists has_attachments    boolean default false,
  add column if not exists attachments_summary jsonb,    -- [{ filename, contentType, size }]
  add column if not exists folder             text default 'inbox',   -- 'inbox' | 'sent' | 'junk' | 'trash'
  add column if not exists read_at            timestamptz,
  add column if not exists is_receipts_hook   boolean default false,  -- was this sent to +receipts?
  add column if not exists starred            boolean default false;

create index if not exists idx_email_messages_user_folder
  on public.email_messages(user_id, folder, received_at desc nulls last);

create index if not exists idx_email_messages_unread
  on public.email_messages(user_id, received_at desc) where read_at is null;

-- A view of "everything still in the inbox", excluding trash + sent.
-- Useful for the list UI which doesn't want to write that filter every time.
create or replace view public.email_inbox as
  select * from public.email_messages
  where folder = 'inbox';

notify pgrst, 'reload schema';

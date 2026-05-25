-- ============================================================================
-- GetGuac Migration 021 — Email inbox + processed-message log
-- ============================================================================
-- Each user who claims a @getguac.app alias also gets a real Migadu mailbox
-- (e.g. ram@getguac.app). The mailbox password is generated server-side, sent
-- to the user's real email once, and stored encrypted so the IMAP poller can
-- log in later to fetch new messages.
--
-- Receipt-ingest path: anything sent to <alias>+receipts@getguac.app lands in
-- the same mailbox (Migadu plus-addressing), the poller filters by
-- Delivered-To header, parses, and inserts a row into `receipts`.
--
-- Safe to re-run.
-- ============================================================================

-- ── 1. profiles: provisioning state + encrypted mailbox password ──────────
alter table public.profiles
  add column if not exists email_inbox_provisioned boolean default false,
  add column if not exists email_inbox_password_enc text,  -- AES-GCM ciphertext (base64)
  add column if not exists email_last_poll_at timestamptz;

-- ── 2. email_messages: every message the poller has seen ──────────────────
create table if not exists public.email_messages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  uid             bigint not null,                          -- IMAP UID on Migadu
  message_id      text,                                     -- RFC822 Message-Id
  from_addr       text,
  to_addr         text,                                     -- raw To
  delivered_to    text,                                     -- Delivered-To header (used for +receipts detection)
  subject         text,
  received_at     timestamptz,
  preview         text,                                     -- first 200 chars of plain body, for UI list
  processed       boolean not null default false,           -- has the parser run?
  receipt_id      uuid references public.receipts(id) on delete set null,
  parse_error     text,                                     -- last error if processed = false but attempted
  created_at      timestamptz not null default now(),
  unique(user_id, uid)
);

create index if not exists idx_email_messages_user_received
  on public.email_messages(user_id, received_at desc nulls last);
create index if not exists idx_email_messages_unprocessed
  on public.email_messages(user_id) where processed = false;

alter table public.email_messages enable row level security;

do $$ begin
  drop policy if exists "em: select own" on public.email_messages;
  drop policy if exists "em: insert own" on public.email_messages;
  drop policy if exists "em: update own" on public.email_messages;
  drop policy if exists "em: delete own" on public.email_messages;

  create policy "em: select own" on public.email_messages
    for select using (auth.uid() = user_id);
  create policy "em: insert own" on public.email_messages
    for insert with check (auth.uid() = user_id);
  create policy "em: update own" on public.email_messages
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "em: delete own" on public.email_messages
    for delete using (auth.uid() = user_id);
end $$;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- migration_085_signups.sql
--
-- A queryable record of every account creation.
--
-- WHY THIS EXISTS
-- Until now a signup's details were split across two places you cannot join:
--   * auth.users            — holds the EMAIL, but it is in the `auth` schema.
--                             Reading it needs the Supabase Admin API or a
--                             service-role client. You cannot select it from
--                             SQL alongside your own tables, so no report,
--                             export or dashboard could ever show who signed up.
--   * public.profiles       — populated by a trigger from user_metadata, so it
--                             has first_name / last_name / birth_date / age —
--                             but it has NO email column at all, and
--                             `email_alias` (the handle they actually chose)
--                             stays NULL until they click the confirmation
--                             link. Before that it lives only in
--                             user_metadata->>'pending_username'.
--
-- Net effect, measured 2026-08-03: 14 accounts existed and there was no single
-- table that could answer "who signed up, with what email, and did they ever
-- come back". Every such question required an Admin API call.
--
-- This table is the answer to that question, written at the moment the account
-- is created — INCLUDING accounts that never confirm, which are exactly the
-- ones you most need to follow up.
--
-- 🔒 PII. Real names, birth dates, phone numbers and email addresses.
-- RLS is enabled with NO policies, so anon and authenticated cannot read a
-- single row; only the service-role key (which bypasses RLS) can.
-- Deliberately NO `is_admin` policy: migration_080 had to undo exactly that
-- pattern on receipts, where an is_admin bypass exposed every user's data.
-- ---------------------------------------------------------------------------

create table if not exists public.signups (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  email               text        not null,
  requested_username  text,
  first_name          text,
  last_name           text,
  birth_date          date,
  age                 integer,
  mobile_no           text,
  -- 'email' for the form, or the OAuth provider once social login ships.
  signup_method       text        not null default 'email',
  created_at          timestamptz not null default now(),
  -- The funnel. Each is set once, by the step that actually happened, so the
  -- drop-off between them is readable straight off this table.
  confirmed_at        timestamptz,
  first_receipt_at    timestamptz,
  -- Confirmation-reminder state. Counting the sends in the SAME row we check
  -- confirmed_at against is what makes the reminder job safe to re-run: it can
  -- never send twice for one nudge, even if the cron double-fires or a deploy
  -- replays it.
  reminder_count      integer     not null default 0,
  last_reminder_at    timestamptz
);

comment on table public.signups is
  'One row per account creation, written at signup — including accounts that never confirm. The only place email, chosen username and signup-time details sit together in a queryable table. PII: service-role only.';
comment on column public.signups.requested_username is
  'The handle they asked for. Lives in user_metadata->>pending_username until confirmation claims it onto profiles.email_alias, so it is captured here immediately.';
comment on column public.signups.confirmed_at is
  'Set by /api/auth/finish-signup when the confirmation link is clicked. NULL means the email never landed or was never opened.';
comment on column public.signups.first_receipt_at is
  'First receipt ever saved. NULL means the account was created but the core action was never performed — the drop-off that matters most.';
comment on column public.signups.reminder_count is
  'How many confirmation reminders have been sent. Capped in /api/cron/signup-reminders; this is a real person''s inbox, not a retry queue.';
comment on column public.signups.last_reminder_at is
  'When the last reminder went out. Enforces the gap between nudges.';

alter table public.signups enable row level security;
-- No policies on purpose. See the PII note above.

create index if not exists signups_created_at_idx    on public.signups (created_at desc);
create index if not exists signups_unconfirmed_idx   on public.signups (created_at desc) where confirmed_at is null;
create index if not exists signups_never_active_idx  on public.signups (created_at desc) where first_receipt_at is null;

-- ---------------------------------------------------------------------------
-- Keep first_receipt_at true without the app having to remember.
--
-- The backfill below fills this in once, but nothing would maintain it. A
-- trigger means the activation column stays correct no matter which path
-- creates the receipt — the scanner, the email importer, or a statement
-- import — instead of only the one route someone remembered to instrument.
--
-- `is null` in the WHERE makes it first-write-wins, so re-scanning never moves
-- the date, and the update is skipped entirely once it is set.
-- ---------------------------------------------------------------------------
create or replace function public.mark_first_receipt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.signups
     set first_receipt_at = coalesce(new.created_at, now())
   where user_id = new.user_id
     and first_receipt_at is null;
  return new;
end;
$$;

drop trigger if exists receipts_mark_first_receipt on public.receipts;
create trigger receipts_mark_first_receipt
  after insert on public.receipts
  for each row
  execute function public.mark_first_receipt();

-- ---------------------------------------------------------------------------
-- Backfill every existing account, so the table is complete from day one
-- rather than only describing signups from this deploy onward.
--
-- `email` is taken from auth.users because that is the only place it exists.
-- `requested_username` prefers the claimed alias and falls back to the pending
-- one, which is what an unconfirmed account still has.
-- ---------------------------------------------------------------------------
insert into public.signups (
  user_id, email, requested_username, first_name, last_name,
  birth_date, age, mobile_no, created_at, confirmed_at, first_receipt_at
)
select
  u.id,
  u.email,
  coalesce(p.email_alias, u.raw_user_meta_data ->> 'pending_username'),
  p.first_name,
  p.last_name,
  p.birth_date,
  p.age,
  p.mobile_no,
  u.created_at,
  u.email_confirmed_at,
  (select min(r.created_at) from public.receipts r where r.user_id = u.id)
from auth.users u
left join public.profiles p on p.id = u.id
on conflict (user_id) do nothing;

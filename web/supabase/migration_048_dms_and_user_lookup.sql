-- ============================================================================
-- GetGuac Migration 048 — Direct messages + safe user lookup
-- ============================================================================
-- Adds two things, both built on the same RLS+SECURITY DEFINER pattern that
-- migration 047 introduced for households:
--
-- 1. DIRECT MESSAGES (1:1 chat between any two GetGuac users)
--      dm_threads      (user_a, user_b) — deterministic pair, user_a<user_b
--      dm_messages     id, thread_id, user_id, body, created_at
--      RLS: only the two participants can read/write their thread.
--
-- 2. SAFE USER LOOKUP
--    The existing `profiles: own row` policy locks reads to your own row, so
--    `select id from profiles where email = ?` returns 0 for anyone else's
--    email — which silently broke addMemberByEmail() in households.js (a
--    user couldn't actually invite anyone). The fix is two SECURITY DEFINER
--    RPCs that expose a narrow, safe surface:
--
--      lookup_user_id_by_email(text) → uuid
--          Returns the auth user-id for an email. Used by:
--            - Household invite ("add this person to my household")
--            - DM open ("start a chat with this email")
--          Returns NULL if no profile exists. No PII leaks beyond
--          confirming an account exists for an email — which is the
--          same surface as Supabase's password-reset flow already.
--
--      get_display_names(uuid[]) → table(id uuid, display_name text)
--          Returns first+last name for each user_id. Used by:
--            - Household chat roster ("show member names instead of
--              truncated UUIDs")
--            - DM thread list ("show who you're chatting with")
--          Email is intentionally NOT returned. Display name only.
--          Callers see {first_name} {last_name} or, if both null,
--          a short hash of the user id as a fallback.
--
-- Both RPCs are read-only, parameterized, and revoked from public + granted
-- only to `authenticated` + `service_role`. They cannot be used to enumerate
-- the user base — caller must already know the email / id.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

-- ─── DM tables ──────────────────────────────────────────────────────────

-- Threads are deterministic by participant pair. user_a < user_b enforces
-- a canonical ordering so the same pair never produces two rows.
create table if not exists public.dm_threads (
  id               uuid         primary key default gen_random_uuid(),
  user_a           uuid         not null references auth.users(id) on delete cascade,
  user_b           uuid         not null references auth.users(id) on delete cascade,
  last_message_at  timestamptz  not null default now(),
  created_at       timestamptz  not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create index if not exists idx_dm_threads_user_a on public.dm_threads(user_a, last_message_at desc);
create index if not exists idx_dm_threads_user_b on public.dm_threads(user_b, last_message_at desc);

create table if not exists public.dm_messages (
  id          uuid         primary key default gen_random_uuid(),
  thread_id   uuid         not null references public.dm_threads(id) on delete cascade,
  user_id     uuid         not null references auth.users(id) on delete cascade,
  body        text         not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz  not null default now()
);

create index if not exists idx_dm_messages_thread_created
  on public.dm_messages(thread_id, created_at desc);

alter table public.dm_threads  enable row level security;
alter table public.dm_messages enable row level security;

-- ─── Helper: am I a participant of this thread? ─────────────────────────
-- SECURITY DEFINER bypasses RLS in the inner select so we don't re-enter
-- the dm_threads policy (same trick as migration 047).

create or replace function public.is_dm_participant(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dm_threads
     where id = p_thread_id
       and auth.uid() in (user_a, user_b)
  );
$$;

revoke all on function public.is_dm_participant(uuid) from public;
grant execute on function public.is_dm_participant(uuid) to authenticated, service_role;

-- ─── dm_threads RLS ─────────────────────────────────────────────────────

drop policy if exists "dm_threads: participants read"  on public.dm_threads;
drop policy if exists "dm_threads: participant insert" on public.dm_threads;
drop policy if exists "dm_threads: participant update" on public.dm_threads;

create policy "dm_threads: participants read"
  on public.dm_threads for select
  using (auth.uid() in (user_a, user_b));

-- Insert: caller must be one of the two participants. Both must be
-- non-null. user_a < user_b enforced by the table CHECK constraint.
create policy "dm_threads: participant insert"
  on public.dm_threads for insert
  with check (auth.uid() in (user_a, user_b));

-- Update: participants can touch last_message_at (the postMessage path
-- bumps it so thread lists order by recency).
create policy "dm_threads: participant update"
  on public.dm_threads for update
  using (auth.uid() in (user_a, user_b));

-- ─── dm_messages RLS ────────────────────────────────────────────────────

drop policy if exists "dm_messages: participants read"  on public.dm_messages;
drop policy if exists "dm_messages: participants write" on public.dm_messages;

create policy "dm_messages: participants read"
  on public.dm_messages for select
  using (public.is_dm_participant(thread_id));

create policy "dm_messages: participants write"
  on public.dm_messages for insert
  with check (
    user_id = auth.uid()
    and public.is_dm_participant(thread_id)
  );

-- ─── User lookup RPCs ───────────────────────────────────────────────────

-- Look up a user-id by email. Returns NULL if no profile for that email.
-- Used by:
--   - addMemberByEmail() (households invite)
--   - openThreadByEmail() (start a DM)
-- This is the same disclosure surface as the password-reset flow already
-- offers (you can already discover whether an email has an account by
-- attempting a password reset), so no new information leak.
create or replace function public.lookup_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
    from public.profiles
   where lower(email) = lower(trim(p_email))
   limit 1;
$$;

revoke all on function public.lookup_user_id_by_email(text) from public;
grant execute on function public.lookup_user_id_by_email(text) to authenticated, service_role;

-- Batch display-name lookup. Returns first+last name (or null when not
-- set; the caller falls back to a short hash of the id for display).
-- Email is NEVER returned by this function.
create or replace function public.get_display_names(p_ids uuid[])
returns table (id uuid, first_name text, last_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.first_name, p.last_name
    from public.profiles p
   where p.id = any(p_ids);
$$;

revoke all on function public.get_display_names(uuid[]) from public;
grant execute on function public.get_display_names(uuid[]) to authenticated, service_role;

notify pgrst, 'reload schema';

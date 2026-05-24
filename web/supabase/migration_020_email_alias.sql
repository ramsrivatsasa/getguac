-- ============================================================================
-- GetGuac Migration 020 — User-claimable email aliases (vanity addresses)
-- ============================================================================
-- Goal: every user gets a getguac.app forwarding address they can pick
-- themselves. If they want `ram@getguac.app`, they claim `ram`. If taken,
-- the API suggests alternatives.
--
-- - profiles.email_alias    text       unique, lowercase, 3..32 chars
-- - profiles.alias_set_at   timestamptz
-- - reserved_email_aliases  table      one row per reserved word
-- - claim_email_alias(text) RPC        atomic claim with validation
-- - check_alias_available(text) RPC    used by the picker UI for live checks
--
-- Safe to re-run.
-- ============================================================================

-- ── 1. Column + index ──────────────────────────────────────────────────
alter table public.profiles
  add column if not exists email_alias  text,
  add column if not exists alias_set_at timestamptz;

-- Case-insensitive uniqueness (Ram and ram and RAM are the same)
create unique index if not exists ux_profiles_email_alias_lower
  on public.profiles(lower(email_alias)) where email_alias is not null;

-- Validation: 3..32 chars, [a-z0-9._-], must start + end with alphanumeric
do $$ begin
  alter table public.profiles
    add constraint chk_email_alias_format
    check (email_alias is null or email_alias ~ '^[a-z0-9]([a-z0-9._-]{1,30}[a-z0-9])?$');
exception when duplicate_object then null;
end $$;

-- ── 2. Reserved aliases (admin, support, etc.) ─────────────────────────
create table if not exists public.reserved_email_aliases (
  alias text primary key,
  reason text
);

insert into public.reserved_email_aliases (alias, reason) values
  ('admin',         'system'),
  ('administrator', 'system'),
  ('root',          'system'),
  ('support',       'reserved for product team'),
  ('help',          'reserved for product team'),
  ('contact',       'reserved for product team'),
  ('info',          'reserved for product team'),
  ('hello',         'reserved for product team'),
  ('hi',            'reserved for product team'),
  ('team',          'reserved for product team'),
  ('founder',       'reserved for product team'),
  ('founders',      'reserved for product team'),
  ('press',         'reserved for product team'),
  ('media',         'reserved for product team'),
  ('marketing',     'reserved for product team'),
  ('sales',         'reserved for product team'),
  ('billing',       'reserved for product team'),
  ('legal',         'reserved for product team'),
  ('privacy',       'reserved for product team'),
  ('security',      'reserved for product team'),
  ('abuse',         'rfc-required'),
  ('postmaster',    'rfc-required'),
  ('webmaster',     'rfc-required'),
  ('hostmaster',    'rfc-required'),
  ('noreply',       'rfc-required'),
  ('no-reply',      'rfc-required'),
  ('mailer-daemon', 'rfc-required'),
  ('staff',         'reserved'),
  ('moderator',     'reserved'),
  ('mod',           'reserved'),
  ('api',           'reserved'),
  ('app',           'reserved'),
  ('www',           'reserved'),
  ('mail',          'reserved'),
  ('email',         'reserved'),
  ('null',          'reserved'),
  ('undefined',     'reserved'),
  ('test',          'reserved'),
  ('testing',       'reserved'),
  ('demo',          'reserved'),
  ('guac',          'brand'),
  ('getguac',       'brand'),
  ('guacwizard',    'brand'),
  ('guacscore',     'brand'),
  ('guacanomics',   'brand'),
  ('smashlist',     'brand'),
  ('stash',         'brand'),
  ('bites',         'brand'),
  ('steals',        'brand'),
  ('bank',          'brand'),
  ('returns',       'brand'),
  ('rewards',       'brand')
on conflict (alias) do nothing;

-- ── 3. Helper: check availability ──────────────────────────────────────
-- Returns one of: 'available', 'taken', 'reserved', 'invalid'
create or replace function public.check_alias_available(p_alias text)
returns text
language plpgsql stable security definer
as $$
declare a text;
begin
  if p_alias is null then return 'invalid'; end if;
  a := lower(trim(p_alias));
  if a !~ '^[a-z0-9]([a-z0-9._-]{1,30}[a-z0-9])?$' then return 'invalid'; end if;
  if exists (select 1 from public.reserved_email_aliases where alias = a) then return 'reserved'; end if;
  if exists (select 1 from public.profiles where lower(email_alias) = a) then return 'taken'; end if;
  return 'available';
end $$;

-- ── 4. Claim RPC ───────────────────────────────────────────────────────
-- Atomic claim — the unique index makes this race-safe, this RPC just gives
-- a nice "taken" error instead of letting Postgres throw 23505.
create or replace function public.claim_email_alias(p_alias text)
returns table (alias text, status text)
language plpgsql security definer
as $$
declare
  uid uuid := auth.uid();
  a text;
  status_code text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  a := lower(trim(p_alias));

  status_code := public.check_alias_available(a);
  if status_code <> 'available' then
    alias := a;
    status := status_code;
    return next;
    return;
  end if;

  -- Profile may or may not exist; upsert. We assume the trigger from earlier
  -- migrations creates a profiles row on signup. If not, this insert handles it.
  update public.profiles
     set email_alias = a, alias_set_at = now()
   where id = uid;

  if not found then
    insert into public.profiles (id, email_alias, alias_set_at)
    values (uid, a, now())
    on conflict (id) do update set email_alias = excluded.email_alias, alias_set_at = excluded.alias_set_at;
  end if;

  alias := a;
  status := 'claimed';
  return next;
end $$;

revoke all on function public.check_alias_available(text) from public;
revoke all on function public.claim_email_alias(text)     from public;
grant execute on function public.check_alias_available(text) to authenticated;
grant execute on function public.claim_email_alias(text)     to authenticated;

-- Make the reserved table readable (so the picker UI can show why something is blocked)
alter table public.reserved_email_aliases enable row level security;
do $$ begin
  drop policy if exists "reserved: read all" on public.reserved_email_aliases;
  create policy "reserved: read all" on public.reserved_email_aliases
    for select using (true);
end $$;

notify pgrst, 'reload schema';

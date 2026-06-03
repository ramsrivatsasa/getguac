-- ============================================================================
-- GetGuac Migration 064 — referrals (invite-a-friend, credit Smash days)
-- ============================================================================
-- Each user gets one 6-char alphanum referral code. Sharing
--   https://getguac.app/?ref=<CODE>
-- carries that code into the new user's localStorage; once the new user
-- finishes sign-up, the dashboard calls apply_referral_code() which
-- credits 3 Smash days to BOTH the referrer and the referee.
--
-- Smash days are normally derived from receipt activity (see
-- web/src/lib/smashDays.js + mobile/lib/services/smash_days_service.dart)
-- so there's no "smash_days" column to bump. We add a small
-- profiles.smash_days_bonus integer that the derived count adds on top
-- of, so referral credit shows up in the existing 🔥 N-days chip
-- without needing a parallel storage table.
--
-- All writes go through SECURITY DEFINER RPCs guarded by auth.uid().
-- Idempotent. Safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tables
-- ----------------------------------------------------------------------------

create table if not exists public.referral_codes (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  code       text not null unique
             check (code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now()
);

create index if not exists idx_referral_codes_code
  on public.referral_codes(code);

create table if not exists public.referrals (
  id                  bigserial primary key,
  referrer_id         uuid not null references auth.users(id) on delete cascade,
  referee_id          uuid not null references auth.users(id) on delete cascade,
  code                text not null references public.referral_codes(code) on delete cascade,
  created_at          timestamptz not null default now(),
  credited_at         timestamptz,
  reward_smash_days   int not null default 3,
  -- A given referee can only be referred once. (Referrer can have many.)
  constraint referrals_referee_unique unique (referee_id),
  -- Self-referrals are not allowed.
  constraint referrals_no_self check (referrer_id <> referee_id)
);

create index if not exists idx_referrals_referrer
  on public.referrals(referrer_id);

-- Smash-days bonus column on profiles. Read by the dashboard tile +
-- mobile dashboard alongside the derived consecutive-day count.
alter table public.profiles
  add column if not exists smash_days_bonus int not null default 0;

-- ----------------------------------------------------------------------------
-- 2) RLS
-- ----------------------------------------------------------------------------

alter table public.referral_codes enable row level security;
alter table public.referrals      enable row level security;

drop policy if exists "referral_codes: owner read"      on public.referral_codes;
create policy "referral_codes: owner read"
  on public.referral_codes for select
  to authenticated
  using (auth.uid() = user_id);

-- Reading by code (no auth row leakage — just resolves code → referrer
-- so the recipient's client can show "X invited you" copy). We do NOT
-- expose user_id through this path; the apply_referral_code RPC does
-- the lookup server-side under SECURITY DEFINER instead, so no anon
-- policy is needed here.

drop policy if exists "referrals: involved users read" on public.referrals;
create policy "referrals: involved users read"
  on public.referrals for select
  to authenticated
  using (auth.uid() = referrer_id or auth.uid() = referee_id);

-- Inserts go through the RPCs only — no client INSERT/UPDATE/DELETE
-- policy. SECURITY DEFINER bypasses RLS for the privileged writes.

-- ----------------------------------------------------------------------------
-- 3) RPC: ensure_referral_code()
-- ----------------------------------------------------------------------------
-- Returns the caller's 6-char alphanum code, generating + persisting
-- one on first call. Retries on the (vanishingly unlikely) collision.

create or replace function public.ensure_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_code   text;
  v_try    text;
  v_chars  constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i        int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Already have one?
  select code into v_code from public.referral_codes where user_id = v_uid;
  if v_code is not null then
    return v_code;
  end if;

  -- Try up to 8 times before giving up. With 36^6 ≈ 2.1B keyspace and
  -- a realistic user count, the loop almost never iterates twice.
  for i in 1..8 loop
    v_try := '';
    for _i in 1..6 loop
      v_try := v_try || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    end loop;

    begin
      insert into public.referral_codes(user_id, code)
      values (v_uid, v_try);
      return v_try;
    exception when unique_violation then
      -- Either user_id race (another tx beat us — read + return) or
      -- code collision (retry).
      select code into v_code from public.referral_codes where user_id = v_uid;
      if v_code is not null then
        return v_code;
      end if;
      -- else: code collision, loop and retry with a fresh code
    end;
  end loop;

  raise exception 'could not allocate a referral code after 8 tries';
end;
$$;

grant execute on function public.ensure_referral_code() to authenticated;

-- ----------------------------------------------------------------------------
-- 4) RPC: apply_referral_code(p_code text)
-- ----------------------------------------------------------------------------
-- Called once from the post-signup hook. Returns a small JSON envelope
-- so the client can render a toast without a second roundtrip.

create or replace function public.apply_referral_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_code         text;
  v_referrer     uuid;
  v_reward       int  := 3;
begin
  if v_uid is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Not signed in.',
      'smash_days_credited', 0
    );
  end if;

  v_code := upper(trim(coalesce(p_code, '')));
  if v_code !~ '^[A-Z0-9]{6}$' then
    return jsonb_build_object(
      'success', false,
      'message', 'Invalid referral code.',
      'smash_days_credited', 0
    );
  end if;

  -- Resolve referrer
  select user_id into v_referrer
    from public.referral_codes
   where code = v_code;

  if v_referrer is null then
    return jsonb_build_object(
      'success', false,
      'message', 'That code doesn''t exist.',
      'smash_days_credited', 0
    );
  end if;

  if v_referrer = v_uid then
    return jsonb_build_object(
      'success', false,
      'message', 'You can''t refer yourself.',
      'smash_days_credited', 0
    );
  end if;

  -- Already referred? (referee_id is UNIQUE)
  if exists (select 1 from public.referrals where referee_id = v_uid) then
    return jsonb_build_object(
      'success', false,
      'message', 'You''ve already used a referral code.',
      'smash_days_credited', 0
    );
  end if;

  -- Record the referral + credit both sides atomically.
  insert into public.referrals(referrer_id, referee_id, code, credited_at, reward_smash_days)
  values (v_referrer, v_uid, v_code, now(), v_reward);

  update public.profiles
     set smash_days_bonus = coalesce(smash_days_bonus, 0) + v_reward
   where id in (v_referrer, v_uid);

  return jsonb_build_object(
    'success', true,
    'message', 'Referral applied — 3 Smash days for each of you.',
    'smash_days_credited', v_reward
  );
end;
$$;

grant execute on function public.apply_referral_code(text) to authenticated;

notify pgrst, 'reload schema';

-- ============================================================================
-- GetGuac Migration 050 — Extend user lookup to handle @getguac.app aliases
-- ============================================================================
-- migration 048 added `lookup_user_id_by_email(text)` which searches
-- `profiles.email` (the user's real signup address). That's incomplete:
-- every user also has a `profiles.email_alias` (the handle picked at
-- signup; the local part of their free @getguac.app address). So a
-- search for `alex@getguac.app` should resolve to user "alex" via the
-- alias column — but today it returns null because that address is NOT
-- in `profiles.email`.
--
-- The fix replaces the lookup with one that tries multiple forms:
--   1. Plain handle (`alex`)                 → email_alias = 'alex'
--   2. @getguac.app address (`alex@getguac.app`) → split, then handle path
--   3. Anything else                          → email column (original behavior)
--
-- That way the same RPC powers all three entry shapes the UI accepts:
-- a real email, a GetGuac handle, or a handle@getguac.app.
--
-- This is additive: the `lookup_user_id_by_email` signature stays the
-- same, so existing callers (households invite + chat open-by-email)
-- keep working.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

create or replace function public.lookup_user_id_by_email(p_email text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s text := lower(trim(coalesce(p_email, '')));
  local_part text;
  match uuid;
begin
  if s = '' then
    return null;
  end if;

  -- Case A: looks like an @getguac.app address — strip the suffix and
  -- look the local part up in email_alias. We do this BEFORE the plain
  -- email match so getguac.app addresses always resolve via the alias
  -- column (which is what they really are; the user never has their
  -- @getguac.app as their auth email).
  if s like '%@getguac.app' then
    local_part := split_part(s, '@', 1);
    select id into match
      from public.profiles
     where email_alias = local_part
     limit 1;
    if match is not null then
      return match;
    end if;
  end if;

  -- Case B: no '@' in the input — treat the whole thing as a handle.
  -- Lets the chat UI accept either "alex" or "alex@getguac.app".
  if position('@' in s) = 0 then
    select id into match
      from public.profiles
     where email_alias = s
     limit 1;
    return match;
  end if;

  -- Case C: real email address — original behavior.
  select id into match
    from public.profiles
   where lower(email) = s
   limit 1;
  return match;
end;
$$;

revoke all on function public.lookup_user_id_by_email(text) from public;
grant execute on function public.lookup_user_id_by_email(text) to authenticated, service_role;

notify pgrst, 'reload schema';

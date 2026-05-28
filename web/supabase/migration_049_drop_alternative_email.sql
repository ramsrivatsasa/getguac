-- ============================================================================
-- GetGuac Migration 049 — Drop profiles.alternative_email
-- ============================================================================
-- The sign-up form no longer collects an alternative email; the field was
-- unused and added clutter to the form. The DB column + the new-user
-- trigger that filled it are removed together.
--
-- ORDER MATTERS: the trigger function `handle_new_user()` references
-- `alternative_email` in its INSERT, so we have to update the function
-- FIRST. Dropping the column before updating the trigger would break every
-- subsequent signup with "column does not exist" until the trigger was
-- patched separately.
--
-- Both steps run in one transaction so a failure leaves the DB consistent.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

begin;

-- 1. Recreate the new-user trigger function without the alternative_email
-- column. Behaviour identical otherwise.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, birth_date, age, mobile_no)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    (new.raw_user_meta_data->>'birth_date')::date,
    (new.raw_user_meta_data->>'age')::integer,
    new.raw_user_meta_data->>'mobile_no'
  );
  return new;
end;
$$;

-- The trigger itself doesn't need to be re-created — `create or replace
-- function` updates the body in place and the existing trigger points at
-- the same function name.

-- 2. Now safe to drop the column. Anything reading it (e.g. an old sign-up
-- API deploy still in transit) will see the column vanish; the API route
-- in this same release no longer references it.
alter table public.profiles
  drop column if exists alternative_email;

commit;

notify pgrst, 'reload schema';

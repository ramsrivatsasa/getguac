-- ============================================================================
-- GetGuac Migration 047 — Households RLS recursion fix
-- ============================================================================
-- The policies in migration 046 referenced household_members from within
-- household_members's own policy:
--
--   using ( user_id = auth.uid()
--           or exists (select 1 from household_members me where ...))
--
-- Postgres evaluates the inner select under RLS too, which re-enters
-- the same policy, which evaluates its inner select, ... → "infinite
-- recursion detected in policy for relation household_members".
--
-- The fix is the standard one: route the membership check through a
-- SECURITY DEFINER function so the inner select runs with the table
-- owner's privileges (RLS bypassed). The function itself is read-only
-- and only checks auth.uid() against the membership table — safe.
--
-- This migration:
--   1. Creates is_household_member() + is_household_owner() helpers.
--   2. Drops every recursive policy migration 046 created.
--   3. Re-creates each policy using the helper functions.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

-- ─── Helper functions ───────────────────────────────────────────────────

create or replace function public.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
     where household_id = p_household_id
       and user_id = auth.uid()
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated, service_role;

create or replace function public.is_household_owner(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
     where household_id = p_household_id
       and user_id = auth.uid()
       and role = 'owner'
  );
$$;

revoke all on function public.is_household_owner(uuid) from public;
grant execute on function public.is_household_owner(uuid) to authenticated, service_role;

-- ─── households ─────────────────────────────────────────────────────────

drop policy if exists "households: members read"     on public.households;
drop policy if exists "households: signed-in create" on public.households;
drop policy if exists "households: owner update"     on public.households;
drop policy if exists "households: owner delete"     on public.households;

create policy "households: members read"
  on public.households for select
  using (auth.uid() = created_by or public.is_household_member(id));

create policy "households: signed-in create"
  on public.households for insert
  with check (auth.uid() is not null and created_by = auth.uid());

create policy "households: owner update"
  on public.households for update
  using (public.is_household_owner(id));

create policy "households: owner delete"
  on public.households for delete
  using (public.is_household_owner(id));

-- ─── household_members ──────────────────────────────────────────────────

drop policy if exists "household_members: visible to members" on public.household_members;
drop policy if exists "household_members: self insert"        on public.household_members;
drop policy if exists "household_members: owner insert"       on public.household_members;
drop policy if exists "household_members: self leave"         on public.household_members;
drop policy if exists "household_members: owner remove"       on public.household_members;

-- Members can read every member row in households they belong to.
-- The function call here doesn't recurse — it runs as table owner.
create policy "household_members: visible to members"
  on public.household_members for select
  using (user_id = auth.uid() or public.is_household_member(household_id));

-- Self-insert: caller can add themselves (used when a user creates a
-- household and seeds themselves as owner via the API).
create policy "household_members: self insert"
  on public.household_members for insert
  with check (user_id = auth.uid());

-- Owner-insert: the household's owner can add anyone.
create policy "household_members: owner insert"
  on public.household_members for insert
  with check (public.is_household_owner(household_id));

-- Self-leave: anyone can remove themselves.
create policy "household_members: self leave"
  on public.household_members for delete
  using (user_id = auth.uid());

-- Owner-remove: owner can remove others.
create policy "household_members: owner remove"
  on public.household_members for delete
  using (public.is_household_owner(household_id));

-- ─── household_messages ─────────────────────────────────────────────────

drop policy if exists "household_messages: members read"  on public.household_messages;
drop policy if exists "household_messages: members write" on public.household_messages;

create policy "household_messages: members read"
  on public.household_messages for select
  using (public.is_household_member(household_id));

create policy "household_messages: members write"
  on public.household_messages for insert
  with check (user_id = auth.uid() and public.is_household_member(household_id));

-- ─── shopping_list (extension policies) ─────────────────────────────────

drop policy if exists "shopping_list: household members read"   on public.shopping_list;
drop policy if exists "shopping_list: household members write"  on public.shopping_list;
drop policy if exists "shopping_list: household members update" on public.shopping_list;
drop policy if exists "shopping_list: household members delete" on public.shopping_list;

create policy "shopping_list: household members read"
  on public.shopping_list for select
  using (
    household_id is not null
    and public.is_household_member(household_id)
  );

create policy "shopping_list: household members write"
  on public.shopping_list for insert
  with check (
    household_id is null
    or public.is_household_member(household_id)
  );

create policy "shopping_list: household members update"
  on public.shopping_list for update
  using (
    household_id is not null
    and public.is_household_member(household_id)
  );

create policy "shopping_list: household members delete"
  on public.shopping_list for delete
  using (
    household_id is not null
    and public.is_household_member(household_id)
  );

notify pgrst, 'reload schema';

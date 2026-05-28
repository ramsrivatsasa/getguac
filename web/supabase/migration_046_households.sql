-- ============================================================================
-- GetGuac Migration 046 — Households (shared shopping list + family chat)
-- ============================================================================
-- Turns GetGuac from a single-user app into a small-group one. Scoped
-- deliberately: a household is a tight set (typically 2-4 people) who
-- share day-to-day errand coordination, NOT a general social network.
-- Receipts + analytics stay PER USER; only the shopping list + a
-- household-scoped chat surface are shared.
--
-- Three new tables + one column on shopping_list:
--
--   households            Group identity. Name, owner, created_at.
--   household_members     Who's in. Role = owner|member.
--   household_messages    Tiny chat thread, ONE per household. Text only,
--                         no attachments, no edit/delete (yet) to keep
--                         the abuse surface narrow.
--   shopping_list.household_id  Optional FK. When set, every member of
--                                that household sees + can mutate the row.
--                                NULL = personal-only (unchanged behavior).
--
-- RLS posture: members can read all rows tied to households they belong
-- to. Writes require membership. The auth.uid() check is the same shape
-- as every other GetGuac table.
-- ============================================================================

create table if not exists public.households (
  id          uuid         primary key default gen_random_uuid(),
  name        text         not null,
  created_by  uuid         not null references auth.users(id) on delete cascade,
  created_at  timestamptz  not null default now()
);

create table if not exists public.household_members (
  household_id  uuid         not null references public.households(id) on delete cascade,
  user_id       uuid         not null references auth.users(id) on delete cascade,
  role          text         not null default 'member'
                check (role in ('owner', 'member')),
  joined_at     timestamptz  not null default now(),
  primary key (household_id, user_id)
);

create index if not exists idx_household_members_user
  on public.household_members(user_id);

-- Add household_id to shopping_list. Optional; NULL = personal (legacy
-- + intentional behavior). When non-null, every member of the household
-- has read + write access via RLS below.
alter table public.shopping_list
  add column if not exists household_id uuid references public.households(id) on delete set null;

create index if not exists idx_shopping_list_household
  on public.shopping_list(household_id)
  where household_id is not null;

-- Household-scoped chat. One thread per household; messages are tied to
-- the household, not to a pair of users. Keeps the schema + abuse
-- surface tiny (no DMs, no 1:1).
create table if not exists public.household_messages (
  id            uuid         primary key default gen_random_uuid(),
  household_id  uuid         not null references public.households(id) on delete cascade,
  user_id       uuid         not null references auth.users(id) on delete cascade,
  body          text         not null check (char_length(body) between 1 and 2000),
  created_at    timestamptz  not null default now()
);

create index if not exists idx_household_messages_household_created
  on public.household_messages(household_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────────────────

alter table public.households         enable row level security;
alter table public.household_members  enable row level security;
alter table public.household_messages enable row level security;

-- Reusable predicate: am I a member of this household?
-- Inline as a subquery; we don't bother with a function/security definer
-- here because the household_members read policy itself is permissive
-- to members (the subquery resolves cleanly under RLS).
drop policy if exists "households: members read"   on public.households;
drop policy if exists "households: owner update"   on public.households;
drop policy if exists "households: owner delete"   on public.households;
drop policy if exists "households: signed-in create" on public.households;

create policy "households: members read"
  on public.households for select
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.household_members hm
       where hm.household_id = households.id
         and hm.user_id = auth.uid()
    )
  );

create policy "households: signed-in create"
  on public.households for insert
  with check (auth.uid() is not null and created_by = auth.uid());

create policy "households: owner update"
  on public.households for update
  using (
    exists (
      select 1 from public.household_members hm
       where hm.household_id = households.id
         and hm.user_id = auth.uid()
         and hm.role = 'owner'
    )
  );

create policy "households: owner delete"
  on public.households for delete
  using (
    exists (
      select 1 from public.household_members hm
       where hm.household_id = households.id
         and hm.user_id = auth.uid()
         and hm.role = 'owner'
    )
  );

drop policy if exists "household_members: visible to members" on public.household_members;
drop policy if exists "household_members: self insert"        on public.household_members;
drop policy if exists "household_members: owner insert"       on public.household_members;
drop policy if exists "household_members: self leave"         on public.household_members;
drop policy if exists "household_members: owner remove"       on public.household_members;

create policy "household_members: visible to members"
  on public.household_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.household_members me
       where me.household_id = household_members.household_id
         and me.user_id = auth.uid()
    )
  );

-- Two insert paths:
--   1. The household creator inserts themselves on create (server-side
--      flow via the create-household endpoint).
--   2. The owner can add anyone (by user_id) to their household.
create policy "household_members: self insert"
  on public.household_members for insert
  with check (user_id = auth.uid());

create policy "household_members: owner insert"
  on public.household_members for insert
  with check (
    exists (
      select 1 from public.household_members me
       where me.household_id = household_members.household_id
         and me.user_id = auth.uid()
         and me.role = 'owner'
    )
  );

create policy "household_members: self leave"
  on public.household_members for delete
  using (user_id = auth.uid());

create policy "household_members: owner remove"
  on public.household_members for delete
  using (
    exists (
      select 1 from public.household_members me
       where me.household_id = household_members.household_id
         and me.user_id = auth.uid()
         and me.role = 'owner'
    )
  );

-- household_messages: members can read all messages in their household;
-- members can post messages as themselves.
drop policy if exists "household_messages: members read"  on public.household_messages;
drop policy if exists "household_messages: members write" on public.household_messages;

create policy "household_messages: members read"
  on public.household_messages for select
  using (
    exists (
      select 1 from public.household_members hm
       where hm.household_id = household_messages.household_id
         and hm.user_id = auth.uid()
    )
  );

create policy "household_messages: members write"
  on public.household_messages for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.household_members hm
       where hm.household_id = household_messages.household_id
         and hm.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────
-- shopping_list RLS extension
-- ────────────────────────────────────────────────────────────────────────
-- Existing policy keys off user_id = auth.uid(). With household sharing,
-- members of the same household also need read + write on household-
-- linked rows. Add new permissive policies alongside the existing one
-- (Postgres OR-combines permissive policies, so both grants are active).

drop policy if exists "shopping_list: household members read"   on public.shopping_list;
drop policy if exists "shopping_list: household members write"  on public.shopping_list;
drop policy if exists "shopping_list: household members update" on public.shopping_list;
drop policy if exists "shopping_list: household members delete" on public.shopping_list;

create policy "shopping_list: household members read"
  on public.shopping_list for select
  using (
    household_id is not null
    and exists (
      select 1 from public.household_members hm
       where hm.household_id = shopping_list.household_id
         and hm.user_id = auth.uid()
    )
  );

create policy "shopping_list: household members write"
  on public.shopping_list for insert
  with check (
    household_id is null
    or exists (
      select 1 from public.household_members hm
       where hm.household_id = shopping_list.household_id
         and hm.user_id = auth.uid()
    )
  );

create policy "shopping_list: household members update"
  on public.shopping_list for update
  using (
    household_id is not null
    and exists (
      select 1 from public.household_members hm
       where hm.household_id = shopping_list.household_id
         and hm.user_id = auth.uid()
    )
  );

create policy "shopping_list: household members delete"
  on public.shopping_list for delete
  using (
    household_id is not null
    and exists (
      select 1 from public.household_members hm
       where hm.household_id = shopping_list.household_id
         and hm.user_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';

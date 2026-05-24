-- GetGuac Migration 002 — RLS policies for stores
-- Original schema.sql only added a SELECT policy on stores, so INSERT/UPDATE/DELETE
-- are blocked by RLS. This silently breaks store creation during receipt save AND
-- prevents users from deleting stores. This migration opens those actions to all
-- authenticated users (stores are a shared directory).
--
-- Safe to re-run (idempotent).

do $$ begin
  -- INSERT
  if not exists (select 1 from pg_policies where tablename = 'stores' and policyname = 'stores: insert auth') then
    create policy "stores: insert auth" on public.stores
      for insert with check (auth.role() = 'authenticated');
  end if;

  -- UPDATE
  if not exists (select 1 from pg_policies where tablename = 'stores' and policyname = 'stores: update auth') then
    create policy "stores: update auth" on public.stores
      for update using (auth.role() = 'authenticated');
  end if;

  -- DELETE
  if not exists (select 1 from pg_policies where tablename = 'stores' and policyname = 'stores: delete auth') then
    create policy "stores: delete auth" on public.stores
      for delete using (auth.role() = 'authenticated');
  end if;

  -- store_locations DELETE policy was missing from migration 001
  if not exists (select 1 from pg_policies where tablename = 'store_locations' and policyname = 'store_locations: delete auth') then
    create policy "store_locations: delete auth" on public.store_locations
      for delete using (auth.role() = 'authenticated');
  end if;

  -- store_items INSERT/UPDATE/DELETE (also was only SELECT)
  if not exists (select 1 from pg_policies where tablename = 'store_items' and policyname = 'store_items: insert auth') then
    create policy "store_items: insert auth" on public.store_items
      for insert with check (auth.role() = 'authenticated');
    create policy "store_items: update auth" on public.store_items
      for update using (auth.role() = 'authenticated');
    create policy "store_items: delete auth" on public.store_items
      for delete using (auth.role() = 'authenticated');
  end if;
end $$;

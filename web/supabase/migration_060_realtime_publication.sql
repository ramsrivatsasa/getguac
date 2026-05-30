-- Enable realtime on the tables that the web/mobile clients subscribe to.
--
-- Without these in the publication, @supabase/realtime-js 2.106.1 fails
-- inside transportConnect() with a confusing `Map.get is not a function`
-- — the underlying cause is the server having no row to broadcast, not
-- anything wrong with the client. Production tester hit this on every
-- dashboard load because HouseholdPanel auto-subscribes.
--
-- Idempotent: each ADD is wrapped so re-running this against an env that
-- already has some/all of the tables published doesn't error out.

do $$
declare
  t text;
  pub_exists boolean;
begin
  -- Ensure the supabase_realtime publication exists (it does in every
  -- managed Supabase project, but guard for self-hosted clones).
  select exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    into pub_exists;
  if not pub_exists then
    create publication supabase_realtime;
  end if;

  foreach t in array array[
    'dm_messages',
    'dm_threads',
    'household_members',
    'household_invites',
    'shopping_list'
  ]
  loop
    -- Skip if already in publication. pg_publication_tables is the
    -- safest catalog view for this check.
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end$$;

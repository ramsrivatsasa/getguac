// Saved-search (search-criteria) data access for the Steals page.
// Backed by public.saved_searches (migration_070). User-scoped via RLS.
import { createClient } from './supabase/client'

export async function getSavedSearches() {
  const sb = createClient()
  const { data, error } = await sb
    .from('saved_searches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

export async function addSavedSearch({ label, query, category = null, specs = {} }) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not signed in')
  const { data, error } = await sb
    .from('saved_searches')
    .insert({ user_id: user.id, label, query, category, specs })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSavedSearch(id) {
  const sb = createClient()
  const { error } = await sb.from('saved_searches').delete().eq('id', id)
  if (error) throw error
  return true
}

// Fire-and-forget bump of last_run_at when a saved search is re-run.
export async function touchSavedSearch(id) {
  const sb = createClient()
  await sb.from('saved_searches').update({ last_run_at: new Date().toISOString() }).eq('id', id)
}

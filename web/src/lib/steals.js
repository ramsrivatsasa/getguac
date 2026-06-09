// Persisted Steals feed — the on-sale deals the overnight cron found across
// the user's saved searches (see migration_072 + /api/notify/dispatch).
// All reads/writes go through RLS (own rows only) via the browser client.
import { createClient } from './supabase/client'

// The user's found steals, newest-first, plus how many are unread (found
// since they last opened the feed). Tolerates the tables not existing yet.
export async function getStealsFeed() {
  const sb = createClient()
  try {
    const [{ data: deals }, { data: state }] = await Promise.all([
      sb.from('seen_steals')
        .select('deal_key, title, store, price, original_price, url, image, rating, query, first_seen_at')
        .order('first_seen_at', { ascending: false })
        .limit(60),
      sb.from('steals_state').select('checked_at').maybeSingle(),
    ])
    const checkedAt = state?.checked_at ? new Date(state.checked_at).getTime() : 0
    const steals = deals || []
    const unread = steals.filter(d => new Date(d.first_seen_at).getTime() > checkedAt).length
    return { steals, unread, checkedAt }
  } catch {
    return { steals: [], unread: 0, checkedAt: 0 }
  }
}

// Stamp checked_at = now for the current user, clearing the unread badge.
// (RLS WITH CHECK enforces auth.uid() = user_id.)
export async function markStealsChecked() {
  const sb = createClient()
  try {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    await sb.from('steals_state').upsert(
      { user_id: user.id, checked_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  } catch {
    /* best-effort — a failed stamp just means the badge lingers */
  }
}

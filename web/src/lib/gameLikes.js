// Arcade likes — the one engagement number that can cover every game.
//
// Plays and scores only exist for games we host: partner games run in a
// cross-origin iframe, so we never see a round finish. A like is about the
// card, not the engine, so it works identically for all of them.
//
// Every count shown anywhere on the site comes from this table. Nothing is
// seeded or estimated — a game nobody has liked shows no number at all.
// Backed by migration_082 (public.game_likes + game_like_counts).
import { createClient } from './supabase/client'

// Likes require an account: without one there's no way to stop the same person
// voting endlessly, and an inflatable counter is worse than no counter.
export async function toggleLike(game) {
  const sb = createClient()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return { signedIn: false, liked: false }

  const { data: existing } = await sb
    .from('game_likes').select('game').eq('game', game).eq('user_id', uid).maybeSingle()

  if (existing) {
    await sb.from('game_likes').delete().eq('game', game).eq('user_id', uid)
    return { signedIn: true, liked: false }
  }
  // The (game, user_id) primary key makes a double-press a no-op rather than a
  // second row, so a race can't inflate the count.
  const { error } = await sb.from('game_likes').insert({ game, user_id: uid })
  if (error && error.code !== '23505') return { signedIn: true, liked: false, error }
  return { signedIn: true, liked: true }
}

// Has THIS user liked it? Owner-only RLS means this only ever sees their row.
export async function hasLiked(game) {
  try {
    const sb = createClient()
    const { data: auth } = await sb.auth.getUser()
    if (!auth?.user?.id) return false
    const { data } = await sb
      .from('game_likes').select('game').eq('game', game).eq('user_id', auth.user.id).maybeSingle()
    return Boolean(data)
  } catch { return false }
}

// All counts in one call, for the hub's tile wall. Returns {} on any failure
// (including before the migration is applied) so tiles simply render without a
// number rather than the grid erroring out.
export async function fetchLikeCounts() {
  try {
    const { data, error } = await createClient().rpc('game_like_counts')
    if (error || !Array.isArray(data)) return {}
    return Object.fromEntries(data.map((r) => [r.game, Number(r.likes) || 0]))
  } catch { return {} }
}

export async function fetchLikeCount(game) {
  try {
    const { data, error } = await createClient().rpc('game_like_count', { p_game: game })
    if (error) return 0
    return Number(data) || 0
  } catch { return 0 }
}

// 1200 -> "1.2K". Only ever formats a real count.
export const formatLikes = (n) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  : String(n)

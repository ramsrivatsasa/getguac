// Arcade score persistence — best-effort, never blocks the game.
// Games live on public marketing pages, so there may be no session at all:
//   • signed out → { signedIn: false } (UI nudges "sign in to keep scores")
//   • signed in  → insert into game_scores (migration_078), report success
//
// GuacMoney: the FIRST finished round of each game each day earns
// GM_PER_FIRST_PLAY GuacMoney (engagement points, like scanning a receipt).
// Later rounds the same day save the score but earn 0 — farm-proof by design.
// The balance side of this lives in guacMoney.js (arcade_gm_days RPC).
import { createClient } from './supabase/client'

export const GM_PER_FIRST_PLAY = 50

export async function saveGameScore(game, score, level = null) {
  try {
    const sb = createClient()
    const { data } = await sb.auth.getUser()
    const uid = data?.user?.id
    if (!uid) return { signedIn: false, saved: false, gm: 0 }
    if (!Number.isFinite(score) || score <= 0) return { signedIn: true, saved: false, gm: 0 }
    // First play of this game today (UTC — matches created_at::date in the
    // arcade_gm_days aggregate) earns GuacMoney; later plays just save.
    const dayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00Z'
    const { data: prior } = await sb
      .from('game_scores')
      .select('id')
      .eq('user_id', uid)
      .eq('game', game)
      .gte('created_at', dayStart)
      .limit(1)
    const first = !prior || prior.length === 0
    const { error } = await sb.from('game_scores').insert({
      user_id: uid, game, score: Math.round(score), level,
    })
    if (error) throw error
    return { signedIn: true, saved: true, gm: first ? GM_PER_FIRST_PLAY : 0 }
  } catch (e) {
    console.warn('[gameScores] save failed:', e?.message)
    return { signedIn: true, saved: false, gm: 0 }
  }
}

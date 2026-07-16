'use client'
// Daily-bonus card for a game page's sidebar. Replaces the old static block
// that ALWAYS showed "Sign in so it counts →" and "0 / 1 round finished today"
// even for signed-in players (a signed-in mobile/web user was nagged to sign in
// again). Mirrors Leaderboard.jsx's auth check: reads the session, then asks
// game_scores whether the FIRST round of THIS game today is already banked
// (UTC day boundary — matches gameScores.js / the arcade_gm_days aggregate).
//
// Three states:
//   signedOut → keep the "Sign in so it counts →" CTA
//   pending   → signed in, hasn't finished a round today: "Finish one round…"
//   done      → today's +50 already earned: progress full + "✓ Claimed today"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'

const AMBER = '#fbbf24'

export default function DailyBonusCard({ name, gameId }) {
  // 'loading' until the auth + score check resolves so SSR and first client
  // render match (both render 'loading') — no hydration mismatch.
  const [status, setStatus] = useState('loading') // loading | signedOut | pending | done

  useEffect(() => {
    let dead = false
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      const uid = data?.user?.id
      if (dead) return
      if (!uid) { setStatus('signedOut'); return }
      const dayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00Z'
      const { data: rows } = await sb
        .from('game_scores').select('id')
        .eq('user_id', uid).eq('game', gameId)
        .gte('created_at', dayStart).limit(1)
      if (dead) return
      setStatus(rows && rows.length ? 'done' : 'pending')
    }).catch(() => { if (!dead) setStatus('signedOut') })
    return () => { dead = true }
  }, [gameId])

  const done = status === 'done'

  return (
    <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #14532d, #166534)' }}>
      <div className="font-display font-extrabold text-base mb-1.5">🥑 Daily bonus</div>
      <p className="m-0 text-sm leading-relaxed" style={{ color: '#bbf7d0' }}>
        {done
          ? <>Today&apos;s <b className="text-white">+50 GuacMoney</b> for {name} is in the bank — come back tomorrow for more.</>
          : <>Finish one round of {name} today to earn <b className="text-white">+50 GuacMoney</b>.</>}
      </p>
      <div className="mt-3 rounded-full overflow-hidden" style={{ height: 9, background: 'rgba(255,255,255,0.15)' }}>
        <div style={{ width: done ? '100%' : '0%', height: '100%', background: '#22c55e', transition: 'width .4s ease' }} />
      </div>
      <div className="mt-2 text-xs" style={{ color: '#86a893' }}>
        {status === 'loading' ? ' ' : `${done ? 1 : 0} / 1 round finished today`}
      </div>
      {status === 'signedOut' && (
        <Link href="/login" className="inline-block mt-3 text-xs font-extrabold px-3.5 py-1.5 rounded-full no-underline" style={{ background: AMBER, color: '#3F3206' }}>Sign in so it counts →</Link>
      )}
      {done && (
        <div className="inline-block mt-3 text-xs font-extrabold px-3.5 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.16)', color: '#dcfce7' }}>✓ Claimed today</div>
      )}
    </div>
  )
}

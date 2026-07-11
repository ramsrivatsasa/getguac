'use client'
// Arcade leaderboard card — top scores for one game via the public
// arcade_leaderboard() RPC (migration_079, security definer over the
// RLS-locked game_scores). Shows logged-out too; signed-in players also get
// their own best under the list. Renders nothing if the RPC isn't deployed
// yet, so game pages never break on a missing migration.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'

const INK = '#15281C'
const MUTED = '#5C6B60'
const FAINT = '#8a978d'
const GREEN = '#65A30D'
const MEDALS = ['🥇', '🥈', '🥉']

const fmt = (n) => Number(n || 0).toLocaleString()

export default function Leaderboard({ game, className = '' }) {
  const [rows, setRows] = useState(null)      // null loading · false unavailable · []
  const [mine, setMine] = useState(null)      // my best score (signed-in only)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    let dead = false
    const sb = createClient()
    sb.rpc('arcade_leaderboard', { p_game: game, p_limit: 10 }).then(({ data, error }) => {
      if (dead) return
      setRows(error ? false : Array.isArray(data) ? data : [])
    })
    sb.auth.getUser().then(async ({ data }) => {
      const uid = data?.user?.id
      if (!uid || dead) return
      setSignedIn(true)
      const { data: best } = await sb
        .from('game_scores').select('score')
        .eq('game', game).order('score', { ascending: false }).limit(1)
      if (!dead && best?.length) setMine(best[0].score)
    })
    return () => { dead = true }
  }, [game])

  if (rows === null || rows === false) return null // loading or RPC not deployed

  return (
    <div className={`rounded-2xl bg-white p-4 ${className}`} style={{ border: '1px solid rgba(20,83,45,0.10)' }}>
      <div className="font-display font-extrabold text-base mb-2" style={{ color: INK }}>🏆 Leaderboard</div>
      {rows.length === 0 ? (
        <p className="text-xs" style={{ color: MUTED }}>No scores on the board yet — finish a round and claim the top spot.</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={`${r.handle}-${i}`} className="flex items-center gap-2 text-sm">
              <span className="w-6 text-center shrink-0">{MEDALS[i] || <span className="text-[11px] font-bold" style={{ color: FAINT }}>{i + 1}</span>}</span>
              <span className="flex-1 min-w-0 truncate font-semibold" style={{ color: INK }}>{r.handle}</span>
              <span className="font-display font-extrabold shrink-0" style={{ color: GREEN }}>${fmt(r.best)}</span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-3 pt-2 text-xs" style={{ borderTop: '1px solid rgba(20,83,45,0.08)', color: MUTED }}>
        {mine != null ? (
          <>Your best: <b className="font-display" style={{ color: INK }}>${fmt(mine)}</b></>
        ) : signedIn ? (
          <>Finish a round to get on the board.</>
        ) : (
          <><Link href="/login" className="font-bold" style={{ color: '#065f46' }}>Sign in</Link> to save scores and join the board.</>
        )}
      </div>
    </div>
  )
}

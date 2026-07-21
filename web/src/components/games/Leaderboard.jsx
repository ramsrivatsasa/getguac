'use client'
// Arcade leaderboard card — top scores for one game via the public
// arcade_leaderboard() RPC (migration_079, security definer over the
// RLS-locked game_scores). Shows logged-out too; signed-in players also get
// their own best under the list. Renders nothing if the RPC isn't deployed
// yet, so game pages never break on a missing migration.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'

const INK = '#15201a'
const MUTED = '#5a6a60'
const FAINT = '#8a988f'
const GREEN = '#166534'
const AV_BG = ['#dcfce7', '#fef3c7', '#dbeafe', '#ecfdf5', '#fee2e2', '#f3e8ff']

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
    <div className={`rounded-2xl bg-white p-4 ${className}`} style={{ border: '1px solid #e4ebe2' }}>
      <div className="font-display font-extrabold text-base mb-3" style={{ color: INK }}>🏆 This week&apos;s top players</div>
      {rows.length === 0 ? (
        <p className="text-xs" style={{ color: MUTED }}>No scores on the board yet — finish a round and claim the top spot.</p>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((r, i) => (
            <li key={`${r.handle}-${i}`} className="flex items-center gap-3 text-sm">
              <span className="w-4 text-center text-[11px] font-bold shrink-0" style={{ color: FAINT }}>{i + 1}</span>
              <span className="flex items-center justify-center rounded-full font-extrabold text-xs shrink-0" style={{ width: 30, height: 30, background: AV_BG[i % AV_BG.length], color: GREEN }}>{(r.handle || '?').trim().slice(0, 1).toUpperCase()}</span>
              <span className="flex-1 min-w-0 truncate font-bold" style={{ color: INK }}>{r.handle}</span>
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

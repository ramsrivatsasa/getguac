'use client'
// "🔥 N-day streak" pill for the daily-challenge banner (Game.html mockup).
// A real, local streak: counts consecutive days the player has opened this game.
// Stored per-game in localStorage as { last: 'YYYY-MM-DD', n }. Bumps on mount:
// same day → unchanged, yesterday → +1, older/first → reset to 1. Renders
// nothing until the streak resolves so SSR and first client paint match.
import { useEffect, useState } from 'react'

const dayStr = (d) => d.toISOString().slice(0, 10)

export default function GameStreak({ slug }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    try {
      const key = 'gg-streak-' + slug
      const today = dayStr(new Date())
      const yday = dayStr(new Date(Date.now() - 86400000))
      let rec = {}
      try { rec = JSON.parse(localStorage.getItem(key) || '{}') } catch {}
      let next
      if (rec.last === today) next = rec.n || 1
      else if (rec.last === yday) next = (rec.n || 0) + 1
      else next = 1
      if (rec.last !== today) localStorage.setItem(key, JSON.stringify({ last: today, n: next }))
      setN(next)
    } catch {}
  }, [slug])

  if (n < 1) return null
  return (
    <span className="flex items-center gap-1.5 text-sm font-extrabold shrink-0" style={{ color: '#ea580c' }}>
      <span aria-hidden>🔥</span>{n}-day streak
    </span>
  )
}

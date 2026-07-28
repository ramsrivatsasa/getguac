'use client'
// Floating Guac Arcade launcher — a persistent 🎮 button in the dashboard's
// bottom-right FAB stack (above the Guac AI popup + QuickAdd FAB) that pops open
// a mini arcade: the daily-GuacMoney nudge, a grid of featured games to jump
// straight into, and a link to the full hub. Keeps games one tap from any page.
import { useState } from 'react'
import Link from 'next/link'
import { Gamepad2, X } from 'lucide-react'
import { trackClick } from '../lib/track-click'
// OWN_GAMES, not GAMES: this component renders in the dashboard LAYOUT, so it
// is in the client bundle of every signed-in page. Importing the merged catalog
// pulled externalGames.json (~416 KB of partner listings) along with it — for
// six hand-picked games that are all ours. Same data, same source of truth.
import { OWN_GAMES, gameIdFor } from './games/ownGames'

const FEATURED = ['/games/splurge', '/games/nitro', '/games/bubbles', '/games/climb', '/games/muncher', '/games/penalty']
  .map((h) => OWN_GAMES.find((g) => g.href === h))
  .filter(Boolean)

const RAINBOW = 'linear-gradient(120deg,#f43f5e 0%,#fb923c 22%,#facc15 42%,#4ade80 62%,#38bdf8 82%,#a78bfa 100%)'

export default function GuacGamesPopup() {
  const [open, setOpen] = useState(false)

  // Opening the menu is the one arcade interaction that leaves NO other trace:
  // it pops a panel without navigating, so the visit counter never sees it.
  // Everything downstream of it (a game page, the hub) is already a real
  // pageview in site_visits, so those are deliberately not double-counted here
  // — except which game was launched FROM the menu, which the pageview alone
  // can't attribute back to the launcher.
  const toggle = () => setOpen((o) => {
    if (!o) trackClick('games-menu')
    return !o
  })

  return (
    <>
      {open && (
        <div className="fixed z-[60] right-4 sm:right-5 bottom-40 w-[min(320px,calc(100vw-2rem))] rounded-2xl overflow-hidden bg-white shadow-2xl ring-1 ring-guac-700/15">
          <div className="flex items-center justify-between px-3 py-2.5 text-white" style={{ background: '#166534' }}>
            <span className="flex items-center gap-2 text-sm font-extrabold"><Gamepad2 size={18} /> Guac Arcade</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-1 rounded-full hover:bg-white/15"><X size={16} /></button>
          </div>
          <div className="p-3">
            <p className="text-[11px] font-bold mb-2 inline-block px-2 py-1 rounded-full" style={{ background: '#f2fbf3', color: '#065f46' }}>🥑 +50 GuacMoney for your first game each day</p>
            <div className="grid grid-cols-2 gap-2">
              {FEATURED.map((g) => (
                <Link
                  key={g.href}
                  href={g.href}
                  onClick={() => { trackClick(`games-menu-${gameIdFor(g.href)}`); setOpen(false) }}
                  className="relative rounded-xl overflow-hidden no-underline h-16 flex items-end"
                  style={{ background: `radial-gradient(120% 120% at 20% 0%, ${g.g1} 0%, ${g.g2} 100%)` }}
                >
                  <span aria-hidden className="absolute right-1 top-0 text-2xl opacity-30 select-none">{g.emoji}</span>
                  <span className="relative w-full px-2 py-1 text-[11px] font-bold text-white truncate" style={{ background: 'rgba(0,0,0,0.3)' }}>{g.name}</span>
                </Link>
              ))}
            </div>
            <Link href="/games" onClick={() => { trackClick('games-menu-all'); setOpen(false) }} className="block mt-2.5 text-center text-xs font-extrabold no-underline hover:underline" style={{ color: '#166534' }}>See all 30+ games →</Link>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? 'Close Guac Arcade' : 'Open Guac Arcade'}
        className="fixed z-[60] right-4 sm:right-5 bottom-40 h-11 items-center gap-2 rounded-full text-white shadow-lg ring-1 ring-black/5 pl-3.5 pr-4 hover:-translate-y-0.5 transition-transform"
        style={{ display: open ? 'none' : 'flex', background: RAINBOW, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
      >
        <Gamepad2 size={22} />
        <span className="text-sm font-extrabold">Games</span>
      </button>
    </>
  )
}

'use client'
// Guac Arcade hub — game-portal layout modelled on the Guac Arcade Site mockup:
// a featured hero band, sticky category chips, a ranked "Trending" strip, a
// localStorage "Pick up where you left off" row, then one cover grid per
// category. Rendered inside the regular MarketingShell header by
// app/games/page.jsx. Brand fonts (Bricolage display via .font-display +
// Jakarta body) are kept per the locked typography — the mockup's look, our type.
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import GameCover from './GameCover'
import { GAMES, CATEGORIES, FEATURED_HREF, POPULAR_HREFS, shotFor, gameIdFor } from './gamesList'
import { createClient } from '../../lib/supabase/client'
import { fetchLikeCounts } from '../../lib/gameLikes'

const INK = '#15201a'
const BODY = '#3d4a42'
const FAINT = '#8a988f'
const GREEN = '#166534'
const GREEN_D = '#0d4a24'
const AMBER = '#fbbf24'
const BORDER = '1px solid #e4ebe2'
const CARD = { background: '#fff', border: BORDER }

const CHIPS = [
  { id: 'all', label: 'All games', emoji: '🎮' },
  { id: 'new', label: 'New', emoji: '✨' },
  ...CATEGORIES.map((c) => ({ id: c.id, label: c.title, emoji: c.emoji })),
]

const countFor = (id) =>
  id === 'all' ? GAMES.length
  : id === 'new' ? GAMES.filter((g) => g.isNew).length
  : GAMES.filter((g) => g.cat === id).length

function SearchBox({ value, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-full px-4 py-2.5 shrink-0" style={{ ...CARD, width: 210 }}>
      <span aria-hidden className="text-sm" style={{ color: FAINT }}>🔍</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search games"
        className="w-full bg-transparent outline-none text-sm font-semibold"
        style={{ color: INK }}
        aria-label="Search games"
      />
    </label>
  )
}

function Chip({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full text-sm font-bold px-4 py-2 transition-colors"
      style={active
        ? { background: GREEN, color: '#fff', border: '1px solid transparent' }
        : { background: '#fff', color: BODY, border: '1px solid #dbe5d8' }}
    >
      {item.emoji} {item.label}{' '}
      <span className="font-semibold" style={{ opacity: 0.55 }}>{countFor(item.id)}</span>
    </button>
  )
}

// Vertical category rail (lg+), the way MSN Play and Poki navigate a catalog
// this size: search on top, then every category as its own row with a live
// count. A horizontal chip strip can't show 9 categories at once — it scrolls
// sideways and hides most of them. The active row gets a left accent bar so
// the selection reads at a glance while scrolling a long tile wall.
//
// It collapses to an icon-only rail (MSN's pattern), which hands ~180px back to
// the tile wall — enough for another column at common widths. The choice is
// remembered, because someone who collapses it wants it collapsed next visit,
// not reset on every navigation.
const NAV_W = 236
const NAV_W_COLLAPSED = 60
const NAV_KEY = 'gg-arcade-nav-collapsed-v1'

function SideNav({ cat, query, onPick, collapsed, onToggle }) {
  return (
    <nav aria-label="Game categories" className="flex flex-col gap-0.5">
      {CHIPS.map((m) => {
        const active = cat === m.id && !query
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m.id)}
            // The label is gone when collapsed, so the accessible name has to
            // come from somewhere — title covers the pointer hover, aria-label
            // covers screen readers.
            title={collapsed ? `${m.label} (${countFor(m.id)})` : undefined}
            aria-label={collapsed ? m.label : undefined}
            aria-current={active ? 'true' : undefined}
            className={`relative flex items-center rounded-xl py-2.5 transition-colors ${collapsed ? 'justify-center px-0' : 'gap-2.5 pl-3.5 pr-3 text-left'}`}
            style={{
              background: active ? '#e9f5ec' : 'transparent',
              color: active ? GREEN_D : BODY,
              fontWeight: active ? 800 : 600,
            }}
          >
            {active && (
              <span aria-hidden className="absolute left-0 rounded-full" style={{ top: 8, bottom: 8, width: 3, background: GREEN }} />
            )}
            <span aria-hidden style={{ fontSize: collapsed ? 19 : 16, lineHeight: 1 }}>{m.emoji}</span>
            {!collapsed && (
              <>
                <span className="text-sm truncate">{m.label}</span>
                <span className="ml-auto text-xs font-bold tabular-nums" style={{ color: active ? GREEN : FAINT }}>
                  {countFor(m.id)}
                </span>
              </>
            )}
          </button>
        )
      })}

      <button
        type="button"
        onClick={onToggle}
        title={collapsed ? 'Expand menu' : 'Collapse menu'}
        aria-label={collapsed ? 'Expand category menu' : 'Collapse category menu'}
        aria-expanded={!collapsed}
        className={`mt-1.5 flex items-center rounded-xl py-2 ${collapsed ? 'justify-center' : 'gap-2.5 pl-3.5 pr-3'}`}
        style={{ color: FAINT, borderTop: BORDER, borderRadius: 0, paddingTop: 12 }}
      >
        <span aria-hidden className="inline-block transition-transform" style={{ fontSize: 13, transform: collapsed ? 'rotate(-90deg)' : 'rotate(90deg)' }}>❯</span>
        {!collapsed && <span className="text-xs font-bold">Collapse</span>}
      </button>
    </nav>
  )
}

// Big featured tile — screenshot cover, bottom scrim, animated shine, Play pill.
function FeaturedCard({ game }) {
  const shot = shotFor(game.href)
  return (
    <Link
      href={game.href}
      className="group relative flex flex-col justify-end overflow-hidden rounded-3xl no-underline text-white"
      style={{ minHeight: 320, background: `radial-gradient(130% 140% at 15% 0%, ${game.g1} 0%, ${game.g2} 100%)`, boxShadow: '0 20px 40px -20px rgba(5,46,22,0.5)' }}
    >
      {shot && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot} alt={`${game.name} gameplay`} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(8,12,10,0.9) 8%, rgba(8,12,10,0.4) 45%, rgba(8,12,10,0) 72%)' }} />
        </>
      )}
      {/* sweep of shine */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{ position: 'absolute', inset: '-40% 0', background: 'linear-gradient(105deg, transparent 44%, rgba(255,255,255,0.12) 50%, transparent 56%)', animation: 'gg-shine 5.5s ease-in-out infinite' }} />
      </div>
      <div className="relative p-6 sm:p-7">
        <span className="inline-block text-[11px] font-extrabold tracking-widest px-3 py-1 rounded-full" style={{ background: AMBER, color: '#052e16' }}>⭐ FEATURED</span>
        <div className="mt-2 flex items-center gap-3">
          <span className="select-none" style={{ fontSize: 40, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))' }}>{game.emoji}</span>
          <span className="font-display font-extrabold" style={{ fontSize: 'clamp(24px, 3vw, 34px)', lineHeight: 1.03 }}>{game.name}</span>
        </div>
        <p className="mt-2 text-sm" style={{ color: 'rgba(216,229,218,0.95)', maxWidth: 460 }}>{game.desc}</p>
        <span className="inline-block mt-4 font-display font-extrabold text-sm px-6 py-2.5 rounded-full transition-transform duration-200 group-hover:scale-105" style={{ background: '#22c55e', color: '#052e16' }}>▶ Play now</span>
      </div>
    </Link>
  )
}

// Smaller companion tile beside the featured card.
function SideCard({ game }) {
  const shot = shotFor(game.href)
  return (
    <Link
      href={game.href}
      className="group relative flex-1 flex flex-col justify-end overflow-hidden rounded-2xl no-underline text-white"
      style={{ minHeight: 150, background: `radial-gradient(120% 130% at 15% 0%, ${game.g1} 0%, ${game.g2} 100%)` }}
    >
      {shot && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot} alt={`${game.name} gameplay`} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(8,12,10,0.88) 10%, rgba(8,12,10,0) 70%)' }} />
        </>
      )}
      <div className="relative p-4">
        <div className="font-display font-extrabold" style={{ fontSize: 18 }}>{game.name}</div>
        <div className="text-[12px]" style={{ color: 'rgba(207,220,210,0.95)' }}>{game.tag}</div>
      </div>
    </Link>
  )
}

// Ranked card for the horizontal "Trending" strip.
function TrendCard({ game, rank }) {
  const shot = shotFor(game.href)
  return (
    <Link
      href={game.href}
      className="group relative shrink-0 overflow-hidden rounded-2xl no-underline"
      style={{ width: 230, ...CARD, color: INK }}
    >
      <div className="relative" style={{ height: 128, background: `radial-gradient(120% 120% at 20% 0%, ${game.g1} 0%, ${game.g2} 100%)` }}>
        {shot ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot} alt={`${game.name} gameplay`} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          </>
        ) : (
          <span aria-hidden className="absolute right-2 bottom-1 opacity-25 select-none" style={{ fontSize: 84, transform: 'rotate(-12deg)' }}>{game.emoji}</span>
        )}
        <span className="absolute left-3 font-display font-extrabold" style={{ bottom: 4, fontSize: 44, color: '#fff', textShadow: '0 4px 16px rgba(0,0,0,0.8)' }}>{rank}</span>
      </div>
      <div className="px-3.5 py-3">
        <div className="font-display font-extrabold text-sm">{game.name}</div>
        <div className="text-[12px] mt-0.5" style={{ color: FAINT }}>{game.tag}</div>
      </div>
    </Link>
  )
}

// Compact wide tile for the continue-playing row — cover colours + your best.
function ResumeTile({ game }) {
  return (
    <Link
      href={game.href}
      className="group flex items-center gap-3 rounded-xl px-3.5 py-3 no-underline transition-transform duration-200 hover:-translate-y-0.5 text-white"
      style={{ background: `radial-gradient(120% 140% at 15% 0%, ${game.g1} 0%, ${game.g2} 100%)`, boxShadow: '0 5px 14px rgba(21,40,28,0.18)' }}
    >
      <span className="select-none transition-transform duration-200 group-hover:scale-110" style={{ fontSize: 30, filter: 'drop-shadow(0 4px 7px rgba(0,0,0,0.35))' }}>{game.emoji}</span>
      <span className="min-w-0">
        <span className="block truncate font-display font-extrabold text-sm">{game.name}</span>
        <span className="block text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.78)' }}>
          {game.best != null ? `Best: $${game.best.toLocaleString()}` : 'Continue playing'}
        </span>
      </span>
    </Link>
  )
}

function Row({ title, blurb, games, size }) {
  if (!games.length) return null
  return (
    <section className="mt-11">
      <div className="flex items-baseline gap-2.5 mb-3.5">
        <h2 className="font-display font-extrabold text-xl" style={{ color: INK }}>{title}</h2>
        <span className="text-sm font-semibold" style={{ color: FAINT }}>{games.length} games</span>
        {blurb && <span className="text-xs hidden md:block ml-auto" style={{ color: FAINT }}>{blurb}</span>}
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size === 'lg' ? 220 : 200}px, 1fr))` }}>
        {games.map((g) => <GameCover key={g.href} game={g} size={size} />)}
      </div>
    </section>
  )
}

export default function GamesHub() {
  const [cat, setCat] = useState('all')
  const [query, setQuery] = useState('')
  const [resume, setResume] = useState([])
  // Starts expanded and is corrected after mount from localStorage. Reading
  // storage during render would desync SSR html from the client and throw a
  // hydration error — the arcade has been bitten by exactly that before.
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [likes, setLikes] = useState({})   // slug -> real like count
  // null = unknown (still checking) → render neither copy until we know, so a
  // signed-in player never flashes "Sign in". Set once auth resolves.
  const [signedIn, setSignedIn] = useState(null)

  useEffect(() => {
    let dead = false
    createClient().auth.getUser()
      .then(({ data }) => { if (!dead) setSignedIn(!!data?.user?.id) })
      .catch(() => { if (!dead) setSignedIn(false) })
    return () => { dead = true }
  }, [])

  useEffect(() => {
    try { setNavCollapsed(localStorage.getItem(NAV_KEY) === '1') } catch { /* private mode */ }
  }, [])

  // Real like counts for every game, in one RPC. Resolves to {} if the call
  // fails or migration_082 isn't applied yet, in which case tiles just render
  // without a number instead of the grid breaking.
  useEffect(() => {
    let dead = false
    fetchLikeCounts().then((m) => { if (!dead) setLikes(m) })
    return () => { dead = true }
  }, [])
  const toggleNav = () => setNavCollapsed((v) => {
    try { localStorage.setItem(NAV_KEY, v ? '0' : '1') } catch { /* private mode */ }
    return !v
  })

  // Games this browser has actually played, via each game's own save key.
  // localStorage is client-only, so this row appears after hydration.
  useEffect(() => {
    try {
      setResume(GAMES.filter((g) => g.bestKey && localStorage.getItem(g.bestKey) != null).map((g) => {
        const raw = localStorage.getItem(g.bestKey)
        return { ...g, best: /^\d+$/.test(raw) ? Number(raw) : null }
      }))
    } catch { /* private mode */ }
  }, [])

  const featured = GAMES.find((g) => g.href === FEATURED_HREF) || GAMES[0]
  const popular = useMemo(() => POPULAR_HREFS.map((h) => GAMES.find((g) => g.href === h)).filter(Boolean), [])
  const heroSide = popular.slice(0, 2)

  // Typing searches the whole catalog regardless of the selected category;
  // picking a category clears the query (and vice versa via the active state).
  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => GAMES.filter((g) => {
    if (q) return `${g.name} ${g.tag} ${g.desc}`.toLowerCase().includes(q)
    if (cat === 'new') return !!g.isNew
    if (cat !== 'all') return g.cat === cat
    return true
  }), [cat, q])
  const browsing = q !== '' || cat !== 'all'

  const pick = (id) => { setCat(id); setQuery('') }

  return (
    <div className="mx-auto px-4 sm:px-6 pt-5 pb-20" style={{ maxWidth: 1440 }}>
      <style>{'@keyframes gg-shine{0%{transform:translateX(-120%) rotate(12deg)}100%{transform:translateX(240%) rotate(12deg)}}'}</style>

      {/* Chips are the NARROW-screen control only. A vertical rail doesn't fit
          under lg, and a sticky sidebar on a phone would eat the whole screen. */}
      <div className="lg:hidden sticky z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 mb-6" style={{ top: 60, background: 'rgba(246,248,244,0.92)', backdropFilter: 'blur(6px)', borderBottom: BORDER }}>
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar">
          <SearchBox value={query} onChange={setQuery} />
          {CHIPS.map((m) => (
            <Chip key={m.id} item={m} active={cat === m.id && !q} onClick={() => pick(m.id)} />
          ))}
        </div>
      </div>

      <div className="lg:grid lg:gap-7 lg:items-start" style={{ gridTemplateColumns: `${navCollapsed ? NAV_W_COLLAPSED : NAV_W}px minmax(0, 1fr)` }}>
        {/* ── Category rail (lg+) ── */}
        <aside className="hidden lg:block" style={{ position: 'sticky', top: 72 }}>
          {navCollapsed ? (
            <button
              type="button"
              onClick={toggleNav}
              title="Search games"
              aria-label="Search games"
              className="w-full flex items-center justify-center rounded-xl py-2.5 mb-1.5"
              style={{ ...CARD, color: FAINT }}
            >
              <span aria-hidden style={{ fontSize: 15 }}>🔍</span>
            </button>
          ) : (
            <div className="mb-2.5">
              <label className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ ...CARD }}>
                <span aria-hidden className="text-sm" style={{ color: FAINT }}>🔍</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search games"
                  className="w-full min-w-0 bg-transparent outline-none text-sm font-semibold"
                  style={{ color: INK }}
                  aria-label="Search games"
                />
              </label>
            </div>
          )}
          <SideNav cat={cat} query={q} onPick={pick} collapsed={navCollapsed} onToggle={toggleNav} />
        </aside>

        {/* ── Content ── */}
        <div className="min-w-0">

      {browsing ? (
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h1 className="font-display font-extrabold text-2xl" style={{ color: INK }}>
              {q ? `Results for “${query.trim()}”` : (CHIPS.find((m) => m.id === cat)?.label || 'Games')}
            </h1>
            {!q && <span className="text-sm hidden md:block" style={{ color: FAINT }}>{CATEGORIES.find((c) => c.id === cat)?.blurb}</span>}
          </div>
          {filtered.length ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(144px, 1fr))' }}>
              {filtered.map((g) => <GameCover key={g.href} game={g} size="sm" likes={likes[gameIdFor(g.href)]} />)}
            </div>
          ) : (
            <p className="text-sm" style={{ color: BODY }}>
              No games match “{query.trim()}” — try another word, or{' '}
              <button type="button" className="font-bold underline" style={{ color: GREEN }} onClick={() => { setQuery(''); setCat('all') }}>browse all {GAMES.length} games</button>.
            </p>
          )}
        </section>
      ) : (
        <>
          {/* Featured band: hero + two companions */}
          <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
            <FeaturedCard game={featured} />
            <div className="flex flex-col gap-4">
              {heroSide.map((g) => <SideCard key={g.href} game={g} />)}
            </div>
          </section>

          {/* GuacMoney + Guac AI strips */}
          <div className="mt-5 grid gap-3 lg:grid-cols-[1.7fr_1fr]">
            <div className="rounded-2xl px-5 py-4 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ background: '#ecfdf5', border: '1px solid #bbf7d0' }}>
              <span style={{ fontSize: 24 }}>🥑</span>
              <span className="text-sm font-bold" style={{ color: GREEN }}>Playing earns GuacMoney:</span>
              <span className="text-sm" style={{ color: BODY }}>
                your first finished round of each game every day adds <b>+50 GuacMoney</b>.{' '}
                {signedIn === false && (
                  <><Link href="/login" style={{ color: GREEN, fontWeight: 700 }}>Sign in</Link> so it counts.</>
                )}
                {signedIn === true && (
                  <span style={{ color: GREEN, fontWeight: 700 }}>You&apos;re signed in — rounds count. 🥑</span>
                )}
              </span>
            </div>
            <Link href="/chat" className="rounded-2xl px-5 py-4 flex items-center gap-3 no-underline" style={{ background: 'linear-gradient(135deg, #0d3b2e, #15281C)' }}>
              <span style={{ fontSize: 24 }}>💬</span>
              <span className="min-w-0 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                <b className="text-white">Guac AI is ready</b> — ask about your spending.
              </span>
              <span className="ml-auto shrink-0 text-xs font-extrabold px-3 py-1.5 rounded-full" style={{ background: AMBER, color: '#3F3206' }}>Chat →</span>
            </Link>
          </div>

          {/* Trending — hand-ordered popular set, ranked */}
          <section className="mt-11">
            <h2 className="font-display font-extrabold text-xl mb-3.5" style={{ color: INK }}>🔥 Trending now</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
              {popular.map((g, i) => <TrendCard key={g.href} game={g} rank={i + 1} />)}
            </div>
          </section>

          {/* Continue playing — only for browsers with saved games */}
          {resume.length > 0 && (
            <section className="mt-11">
              <h2 className="font-display font-extrabold text-xl mb-3.5" style={{ color: INK }}>Pick up where you left off</h2>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
                {resume.map((g) => <ResumeTile key={g.href} game={g} />)}
              </div>
            </section>
          )}

          <Row title="✨ New this week" games={GAMES.filter((g) => g.isNew)} />
          {CATEGORIES.map((c) => (
            <Row key={c.id} title={`${c.emoji} ${c.title}`} blurb={c.blurb} games={GAMES.filter((g) => g.cat === c.id)} />
          ))}

          {/* All games — the dense tile wall, the way MSN Play and Poki present
              a catalog this size. The curated rows above answer "what should I
              play"; this answers "show me everything" without making anyone
              page through categories. Deliberately last: it's a browse surface,
              not the first thing to look at. */}
          <section className="mt-12">
            <div className="flex items-baseline gap-2.5 mb-3.5">
              <h2 className="font-display font-extrabold text-xl" style={{ color: INK }}>🎮 All games</h2>
              <span className="text-sm font-semibold" style={{ color: FAINT }}>{GAMES.length} games</span>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(144px, 1fr))' }}>
              {GAMES.map((g) => <GameCover key={g.href} game={g} size="sm" likes={likes[gameIdFor(g.href)]} />)}
            </div>
          </section>

          <div className="mt-12 rounded-2xl px-6 py-5 text-center text-sm" style={{ ...CARD, color: '#5a6a60' }}>
            Like beating games? Beating your own grocery bill feels better —{' '}
            <Link href="/how-it-works" style={{ color: GREEN, fontWeight: 700 }}>see how GetGuac works</Link>.
          </div>
        </>
      )}
        </div>
      </div>
    </div>
  )
}

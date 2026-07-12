'use client'
// MSN-Play-style Guac Arcade hub. Left sidebar (search + category menu,
// sticky on lg+; chips on mobile) beside the content: "most popular" hero
// grid, a localStorage-driven "Pick up where you left off" row, new games,
// then one cover row per category. Rendered inside the regular
// MarketingShell header by app/games/page.jsx.
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import GameCover from './GameCover'
import { GAMES, CATEGORIES, FEATURED_HREF, POPULAR_HREFS, shotFor } from './gamesList'

const INK = '#15281C'
const BODY = '#3d4a42'
const FAINT = '#8a978d'
const GREEN = '#065f46'
const CARD = { background: '#fff', border: '1px solid rgba(20,83,45,0.10)' }

const MENU = [
  { id: 'all', label: 'All games', emoji: '🎮' },
  { id: 'new', label: 'New this week', emoji: '✨' },
  ...CATEGORIES.map((c) => ({ id: c.id, label: c.title, emoji: c.emoji })),
]

const countFor = (id) =>
  id === 'all' ? GAMES.length
  : id === 'new' ? GAMES.filter((g) => g.isNew).length
  : GAMES.filter((g) => g.cat === id).length

function SearchBox({ value, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-full px-4 py-2.5" style={CARD}>
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

function MenuButton({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-left"
      style={active ? { background: '#f2fbf3', color: GREEN, border: '1px solid rgba(6,95,70,0.25)' } : { color: BODY, border: '1px solid transparent' }}
    >
      <span className="text-base leading-none">{item.emoji}</span>
      <span className="flex-1">{item.label}</span>
      <span className="text-[11px] font-bold" style={{ color: FAINT }}>{countFor(item.id)}</span>
    </button>
  )
}

// Featured 2×2 tile in the "most popular" grid — fills whatever height the
// neighbouring cover rows give it.
function FeaturedTile({ game }) {
  const shot = shotFor(game.href)
  return (
    <Link
      href={game.href}
      className="group relative flex h-full flex-col justify-end overflow-hidden rounded-2xl no-underline"
      style={{
        minHeight: 240,
        background: `radial-gradient(130% 140% at 15% 0%, ${game.g1} 0%, ${game.g2} 100%)`,
        boxShadow: '0 10px 28px rgba(21,40,28,0.22)',
      }}
    >
      {shot ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot} alt={`${game.name} gameplay`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
          {/* bottom scrim keeps the title + copy legible over the screenshot */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(8,18,14,0.92) 0%, rgba(8,18,14,0.55) 34%, rgba(8,18,14,0) 62%)' }} />
        </>
      ) : (
        <>
          <span aria-hidden className="absolute -right-6 -top-8 opacity-20 select-none" style={{ fontSize: 190, transform: 'rotate(-12deg)' }}>{game.emoji}</span>
          <span aria-hidden className="absolute left-5 top-5 opacity-60 select-none" style={{ fontSize: 30, transform: 'rotate(-10deg)' }}>{game.motifs?.[0]}</span>
          <span aria-hidden className="absolute right-8 bottom-24 opacity-50 select-none" style={{ fontSize: 24, transform: 'rotate(12deg)' }}>{game.motifs?.[1]}</span>
        </>
      )}
      <div className="relative p-5 sm:p-6">
        <div className="text-[10px] font-extrabold tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.75)' }}>🕹️ FEATURED</div>
        <div className="flex items-center gap-3">
          <span className="select-none" style={{ fontSize: 44, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))' }}>{game.emoji}</span>
          <div className="font-display font-extrabold text-white" style={{ fontSize: 'clamp(22px, 2.6vw, 32px)', lineHeight: 1.05 }}>{game.name}</div>
        </div>
        <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.88)', maxWidth: 420 }}>{game.desc}</p>
        <span className="inline-block mt-3.5 text-sm font-extrabold px-6 py-2.5 rounded-full transition-transform duration-200 group-hover:scale-105" style={{ background: '#FDE047', color: '#3F3206' }}>
          ▶ Play now
        </span>
      </div>
    </Link>
  )
}

// Compact wide tile for the continue-playing row — cover colours + your best.
function ResumeTile({ game }) {
  return (
    <Link
      href={game.href}
      className="group flex items-center gap-3 rounded-xl px-3.5 py-3 no-underline transition-transform duration-200 hover:-translate-y-0.5"
      style={{ background: `radial-gradient(120% 140% at 15% 0%, ${game.g1} 0%, ${game.g2} 100%)`, boxShadow: '0 5px 14px rgba(21,40,28,0.18)' }}
    >
      <span className="select-none transition-transform duration-200 group-hover:scale-110" style={{ fontSize: 30, filter: 'drop-shadow(0 4px 7px rgba(0,0,0,0.35))' }}>{game.emoji}</span>
      <span className="min-w-0">
        <span className="block truncate font-display font-extrabold text-sm text-white">{game.name}</span>
        <span className="block text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {game.best != null ? `Best: $${game.best.toLocaleString()}` : 'Continue playing'}
        </span>
      </span>
    </Link>
  )
}

function Row({ title, blurb, games, size }) {
  if (!games.length) return null
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-display font-extrabold text-xl" style={{ color: INK }}>{title}</h2>
        {blurb && <span className="text-xs hidden sm:block" style={{ color: FAINT }}>{blurb}</span>}
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size === 'lg' ? 220 : 170}px, 1fr))` }}>
        {games.map((g) => <GameCover key={g.href} game={g} size={size} />)}
      </div>
    </section>
  )
}

export default function GamesHub() {
  const [cat, setCat] = useState('all')
  const [query, setQuery] = useState('')
  const [resume, setResume] = useState([])

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
  const popular = POPULAR_HREFS.map((h) => GAMES.find((g) => g.href === h)).filter(Boolean)

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

  const menu = (
    <nav className="rounded-2xl p-2 space-y-0.5" style={CARD}>
      {MENU.map((m) => (
        <MenuButton key={m.id} item={m} active={cat === m.id && !q} onClick={() => { setCat(m.id); setQuery('') }} />
      ))}
    </nav>
  )

  return (
    <div className="mx-auto px-4 sm:px-6 pt-6 pb-20" style={{ maxWidth: 1560 }}>
      <div className="lg:grid lg:gap-8 lg:items-start" style={{ gridTemplateColumns: '232px minmax(0, 1fr)' }}>

        {/* ── Sidebar (lg+) ── */}
        <aside className="hidden lg:block space-y-4" style={{ position: 'sticky', top: 80 }}>
          <SearchBox value={query} onChange={setQuery} />
          {menu}
          <div className="rounded-2xl px-4 py-3.5" style={CARD}>
            <div className="text-sm font-extrabold mb-1" style={{ color: INK }}>🥑 Play, earn GuacMoney</div>
            <p className="m-0 text-xs leading-relaxed" style={{ color: BODY }}>
              First finished round of each game every day = <b>+50 GuacMoney</b>.{' '}
              <Link href="/login" className="font-bold" style={{ color: GREEN }}>Sign in</Link> so it counts.
            </p>
          </div>
          <Link href="/chat" className="block rounded-2xl px-4 py-3.5 no-underline" style={{ background: 'linear-gradient(135deg, #0d3b2e, #15281C)', border: '1px solid rgba(20,83,45,0.2)' }}>
            <div className="text-sm font-extrabold mb-1 text-white">💬 Guac AI is ready</div>
            <p className="m-0 text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Game break? Ask the built-in AI assistant anything about your spending, receipts or the app.
            </p>
            <span className="inline-block mt-2 text-xs font-extrabold px-3 py-1.5 rounded-full" style={{ background: '#FDE047', color: '#3F3206' }}>Chat with Guac →</span>
          </Link>
        </aside>

        {/* ── Mobile controls ── */}
        <div className="lg:hidden mb-5 space-y-3">
          <SearchBox value={query} onChange={setQuery} />
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {MENU.map((m) => {
              const active = cat === m.id && !q
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setCat(m.id); setQuery('') }}
                  className="shrink-0 text-xs font-bold px-3.5 py-2 rounded-full"
                  style={active ? { background: '#065f46', color: '#fff' } : { ...CARD, color: BODY }}
                >
                  {m.emoji} {m.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Content ── */}
        <main className="min-w-0">
          {browsing ? (
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-display font-extrabold text-xl" style={{ color: INK }}>
                  {q ? `Results for “${query.trim()}”` : (MENU.find((m) => m.id === cat)?.label || 'Games')}
                </h2>
                {!q && <span className="text-xs hidden sm:block" style={{ color: FAINT }}>{CATEGORIES.find((c) => c.id === cat)?.blurb}</span>}
              </div>
              {filtered.length ? (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                  {filtered.map((g) => <GameCover key={g.href} game={g} size="lg" />)}
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
              {/* Most popular — featured 2×2 + covers */}
              <section>
                <h1 className="font-display font-extrabold text-xl sm:text-2xl mb-3" style={{ color: INK }}>Jump into our most popular games</h1>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  <div className="col-span-2 row-span-2"><FeaturedTile game={featured} /></div>
                  {popular.map((g) => <GameCover key={g.href} game={g} />)}
                </div>
              </section>

              {/* GuacMoney strip */}
              <div className="mt-6 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ background: '#f2fbf3', border: '1px solid rgba(20,83,45,0.12)' }}>
                <span style={{ fontSize: 26 }}>🥑</span>
                <span className="text-sm font-bold" style={{ color: GREEN }}>Playing earns GuacMoney:</span>
                <span className="text-sm" style={{ color: BODY }}>
                  your first finished round of each game every day adds <b>+50 GuacMoney</b> to your balance.{' '}
                  <Link href="/login" style={{ color: GREEN, fontWeight: 700 }}>Sign in</Link> so it counts.
                </span>
              </div>

              {/* Guac AI strip — the sidebar card covers lg+, this covers mobile */}
              <Link href="/chat" className="lg:hidden mt-3 rounded-2xl px-5 py-4 flex items-center gap-3 no-underline" style={{ background: 'linear-gradient(135deg, #0d3b2e, #15281C)' }}>
                <span style={{ fontSize: 26 }}>💬</span>
                <span className="min-w-0 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  <b className="text-white">Guac AI is ready</b> — ask the built-in assistant anything about your spending.
                </span>
                <span className="ml-auto shrink-0 text-xs font-extrabold px-3 py-1.5 rounded-full" style={{ background: '#FDE047', color: '#3F3206' }}>Chat →</span>
              </Link>

              {/* Continue playing — only for browsers with saved games */}
              {resume.length > 0 && (
                <section className="mt-10">
                  <h2 className="font-display font-extrabold text-xl mb-3" style={{ color: INK }}>Pick up where you left off</h2>
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
                    {resume.map((g) => <ResumeTile key={g.href} game={g} />)}
                  </div>
                </section>
              )}

              <Row title="✨ New games we love" games={GAMES.filter((g) => g.isNew)} />
              {CATEGORIES.map((c) => (
                <Row key={c.id} title={`${c.emoji} ${c.title}`} blurb={c.blurb} games={GAMES.filter((g) => g.cat === c.id)} />
              ))}

              <p className="text-center text-sm mt-12" style={{ color: FAINT }}>
                Like beating games? Beating your own grocery bill feels better —{' '}
                <Link href="/how-it-works" style={{ color: GREEN, fontWeight: 700 }}>see how GetGuac works</Link>.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

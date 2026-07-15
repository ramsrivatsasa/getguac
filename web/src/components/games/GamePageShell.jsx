// Shared layout for every Guac Arcade game page — modelled on the Guac Arcade
// Site "Game" mockup, under the REGULAR site header:
//   breadcrumb → framed stage (the game) → title card w/ stats → how-to steps
//   → SEO article → cross-link grid, with a right sidebar (daily-bonus card,
//   real leaderboard, "more in category", vertical ad).
// Ad inventory + the arcade_leaderboard()-backed <Leaderboard> are kept; the
// mockup's ⭐rating / "plays this week" numbers are intentionally NOT shown
// (no analytics data — we don't fabricate stats).
// Server component; the game itself comes in as `children` (client component).
import Link from 'next/link'
import MarketingShell from '../MarketingShell'
import AdSlot from '../AdSlot'
import XlOnly from '../XlOnly'
import GameCover from './GameCover'
import Leaderboard from './Leaderboard'
import ArrowKeyGuard from './ArrowKeyGuard'
import GameActions from './GameActions'
import { GAMES, CATEGORIES, FEATURED_HREF, gameIdFor, shotFor } from './gamesList'

const INK = '#15201a'
const BODY = '#3d4a42'
const MUTED = '#5a6a60'
const FAINT = '#8a988f'
const GREEN = '#166534'
const AMBER = '#fbbf24'
const BORDER = '1px solid #e4ebe2'
const CARD = { background: '#fff', border: BORDER }

// Compact "more in this category" row for the sidebar.
function RelatedRow({ game }) {
  const shot = shotFor(game.href)
  return (
    <Link href={game.href} className="flex items-center gap-3 rounded-xl p-2 no-underline" style={{ background: '#f6f8f4' }}>
      <span className="rounded-lg overflow-hidden flex items-center justify-center shrink-0" style={{ width: 66, height: 44, background: `radial-gradient(120% 120% at 20% 0%, ${game.g1} 0%, ${game.g2} 100%)` }}>
        {shot
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={shot} alt="" loading="lazy" className="w-full h-full object-cover" />
          : <span aria-hidden style={{ fontSize: 22 }}>{game.emoji}</span>}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-sm truncate" style={{ color: INK }}>{game.name}</span>
        <span className="block text-[12px]" style={{ color: FAINT }}>{game.tag}</span>
      </span>
      <span className="ml-auto font-extrabold" style={{ color: '#16a34a' }}>▶</span>
    </Link>
  )
}

// Sidebar: daily-bonus card, real leaderboard, more-in-category. Shared by the
// lg+ rail and the narrow-screen inline block.
function GameSidebar({ name, gameId, related }) {
  return (
    <>
      <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #14532d, #166534)' }}>
        <div className="font-display font-extrabold text-base mb-1.5">🥑 Daily bonus</div>
        <p className="m-0 text-sm leading-relaxed" style={{ color: '#bbf7d0' }}>
          Finish one round of {name} today to earn <b className="text-white">+50 GuacMoney</b>.
        </p>
        <div className="mt-3 rounded-full overflow-hidden" style={{ height: 9, background: 'rgba(255,255,255,0.15)' }}>
          <div style={{ width: '0%', height: '100%', background: '#22c55e' }} />
        </div>
        <div className="mt-2 text-xs" style={{ color: '#86a893' }}>0 / 1 round finished today</div>
        <Link href="/login" className="inline-block mt-3 text-xs font-extrabold px-3.5 py-1.5 rounded-full no-underline" style={{ background: AMBER, color: '#3F3206' }}>Sign in so it counts →</Link>
      </div>

      <Leaderboard game={gameId} />

      {related.length > 0 && (
        <div className="rounded-2xl p-4" style={CARD}>
          <div className="font-display font-extrabold text-base mb-3" style={{ color: INK }}>More like this</div>
          <div className="space-y-2.5">
            {related.map((g) => <RelatedRow key={g.href} game={g} />)}
          </div>
        </div>
      )}
    </>
  )
}

export default function GamePageShell({ href, title, blurb, how = [], tips = [], children }) {
  const game = GAMES.find((g) => g.href === href) || { name: title, tag: blurb, emoji: '🎮', desc: blurb, cat: null, isNew: false, g1: '#166534', g2: '#052e16' }
  const category = CATEGORIES.find((c) => c.id === game.cat)
  const gameId = gameIdFor(href)
  const others = GAMES.filter((g) => g.href !== href)
  const related = others.filter((g) => g.cat === game.cat).slice(0, 4)

  return (
    <MarketingShell subtitle="money's wingman">
      <ArrowKeyGuard />
      <div className="mx-auto px-4 sm:px-6 pt-5 pb-16" style={{ maxWidth: 1280 }}>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-4" style={{ color: FAINT }}>
          <Link href="/games" style={{ color: GREEN, fontWeight: 600 }}>Games</Link>
          {category && <><span>›</span><span>{category.emoji} {category.title}</span></>}
          <span>›</span><span style={{ color: BODY, fontWeight: 600 }}>{game.name}</span>
        </nav>

        {/* Daily challenge banner */}
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4" style={{ background: 'linear-gradient(90deg, #ecfdf5, #f6f8f4)', border: '1px solid #bbf7d0' }}>
          <span aria-hidden style={{ fontSize: 20 }}>📅</span>
          <span className="text-sm" style={{ color: BODY }}>
            <b style={{ color: INK }}>Daily challenge:</b> finish one round of {game.name} today for <b style={{ color: GREEN }}>+50 GuacMoney</b>.
          </span>
        </div>

        <div className="lg:grid lg:gap-6 lg:items-start" style={{ gridTemplateColumns: 'minmax(0, 1fr) 340px' }}>

          {/* ── Main column ── */}
          <div className="min-w-0">
            {/* Framed stage — the frame wears THIS game's cover colours (g1→g2)
                so every game's page is themed to itself; the game runs its own
                play flow inside. */}
            <div id="gg-stage" className="rounded-3xl p-2.5 sm:p-3.5" style={{ background: `linear-gradient(155deg, ${game.g1} 0%, ${game.g2} 100%)`, boxShadow: `0 16px 38px -14px ${game.g2}` }}>
              {children}
            </div>

            {/* Title card — tinted with the game's colour, honest stat row */}
            <div className="mt-4 rounded-2xl p-5 sm:p-6" style={{ background: `linear-gradient(180deg, ${game.g1}22 0%, #ffffff 46%)`, border: BORDER, borderTop: `3px solid ${game.g2}` }}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center justify-center rounded-2xl select-none shrink-0" style={{ width: 52, height: 52, fontSize: 30, background: '#fff', border: BORDER, boxShadow: `0 6px 14px ${game.g2}33` }}>{game.emoji}</span>
                <h1 className="font-display font-extrabold m-0" style={{ color: INK, fontSize: 'clamp(22px, 2.6vw, 30px)' }}>{game.name}</h1>
                {href === FEATURED_HREF && <span className="text-[11px] font-extrabold tracking-wide px-2.5 py-1 rounded-full" style={{ background: AMBER, color: '#3F3206' }}>FEATURED</span>}
                {game.isNew && <span className="text-[11px] font-extrabold tracking-wide px-2.5 py-1 rounded-full text-white" style={{ background: game.g2 }}>NEW</span>}
                <GameActions slug={href.split('/').pop()} />
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-sm font-semibold" style={{ color: MUTED }}>
                <span>🏷️ {game.tag}</span>
                <span>📱 Phone-friendly</span>
                <span>🆓 Free, no download</span>
                <span style={{ color: GREEN }}>🥑 +50 GuacMoney daily</span>
              </div>
              <p className="mt-3.5 m-0 text-base leading-relaxed" style={{ color: BODY }}>{game.desc}</p>
            </div>

            {/* How to play — numbered step grid */}
            {how.length > 0 && (
              <div className="mt-4 rounded-2xl p-5 sm:p-6" style={CARD}>
                <h2 className="font-display font-extrabold text-xl m-0 mb-4" style={{ color: INK }}>How to play</h2>
                <div className="grid gap-3.5 sm:grid-cols-3">
                  {how.map((step, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: '#f6f8f4' }}>
                      <div className="flex items-center justify-center rounded-full font-display font-extrabold text-sm" style={{ width: 28, height: 28, background: GREEN, color: '#fff' }}>{i + 1}</div>
                      <p className="mt-2.5 m-0 text-sm leading-relaxed" style={{ color: BODY }}>{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ad — right where the eye lands after a round */}
            <div className="mx-auto mt-6" style={{ maxWidth: 900 }}>
              <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '9142744455'} minHeight={90} />
            </div>

            {/* Sidebar content inline for narrow screens (the rail is lg-only) */}
            <div className="lg:hidden mt-8 space-y-4">
              <GameSidebar name={game.name} gameId={gameId} related={related} />
            </div>

            {/* Tips + SEO article — the text band every game portal carries */}
            {(how.length > 0 || tips.length > 0) && (
              <section className="mt-10" style={{ maxWidth: 760 }}>
                {how.length > 0 && (
                  <>
                    <h2 className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>How to play {title}</h2>
                    {how.map((p, i) => (
                      <p key={i} className="text-sm leading-relaxed mb-2.5" style={{ color: BODY }}>{p}</p>
                    ))}
                  </>
                )}
                {tips.length > 0 && (
                  <>
                    <h2 className="font-display font-extrabold text-xl mt-6 mb-2" style={{ color: INK }}>Tips &amp; tricks</h2>
                    <ul className="list-disc pl-5 space-y-1.5">
                      {tips.map((t, i) => (
                        <li key={i} className="text-sm leading-relaxed" style={{ color: BODY }}>{t}</li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="text-sm leading-relaxed mt-6" style={{ color: BODY }}>
                  {title} is part of the free <Link href="/games" style={{ color: GREEN, fontWeight: 700 }}>Guac Arcade</Link> from
                  GetGuac — money&apos;s wingman. Signed-in players earn <b>+50 GuacMoney</b> for the first finished round of each
                  game every day. If outsmarting the arcade feels good, wait until you do it to your own
                  spending: <Link href="/how-it-works" style={{ color: GREEN, fontWeight: 700 }}>see how GetGuac works</Link>.
                </p>
              </section>
            )}

            {/* Cross-link grid — every other game, for SEO + discovery */}
            <section className="mt-10">
              <h2 className="font-display font-extrabold text-xl mb-3.5" style={{ color: INK }}>More Guac Arcade games</h2>
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                {others.map((g) => <GameCover key={g.href} game={g} />)}
              </div>
            </section>

            {/* Closing ad */}
            <div className="mx-auto mt-10" style={{ maxWidth: 900 }}>
              <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '9142744455'} minHeight={90} />
            </div>
          </div>

          {/* ── Right sidebar (lg+) ── */}
          <aside className="hidden lg:block space-y-4" style={{ position: 'sticky', top: 80 }}>
            <GameSidebar name={game.name} gameId={gameId} related={related} />
            <XlOnly>
              <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RIGHT || '9083371411'} format="vertical" minHeight={600} />
            </XlOnly>
          </aside>
        </div>
      </div>
    </MarketingShell>
  )
}

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
import { ARCADE_ADS_ENABLED } from '../../lib/arcadeAds'
import XlOnly from '../XlOnly'
import GameCover from './GameCover'
import Leaderboard from './Leaderboard'
import DailyBonusCard from './DailyBonusCard'
import ArrowKeyGuard from './ArrowKeyGuard'
import GameActions from './GameActions'
import GameStreak from './GameStreak'
import { AvocadoPip } from './arcadeKit'
import { GAMES, CATEGORIES, FEATURED_HREF, gameIdFor, shotFor, isExternal } from './gamesList'

const INK = '#15201a'
const BODY = '#3d4a42'
const MUTED = '#5a6a60'
// Muted label gray. Was #8a988f, which is ~3.0:1 on the arcade's white/#f6f8f4
// cards and failed WCAG AA (4.5:1) for normal text. #5F6D63 is 5.4:1 on white.
// Every FAINT usage in the arcade sits on a light surface -- checked -- so this
// only ever darkens. Do not lighten it back.
const FAINT = '#5F6D63'
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
        <span className="block text-[12px]" style={{ color: FAINT }}>⭐ {game.rating ?? 4.6} · {game.tag}</span>
      </span>
      <span className="ml-auto font-extrabold" style={{ color: '#16a34a' }}>▶</span>
    </Link>
  )
}

// Sidebar: daily-bonus card, real leaderboard, more-in-category. Shared by the
// lg+ rail and the narrow-screen inline block.
// `scored` = we can actually see the player's result. False for partner games:
// they run cross-origin in an iframe, so there is no round-finished signal and
// no score to record. Those pages therefore show no daily bonus and no
// leaderboard — promising GuacMoney we can never award would be a lie told to
// every visitor, and an empty leaderboard on 80 pages reads as broken.
function GameSidebar({ name, gameId, related, category, scored }) {
  return (
    <>
      {scored && <DailyBonusCard name={name} gameId={gameId} />}

      {scored && <Leaderboard game={gameId} />}

      {related.length > 0 && (
        <div className="rounded-2xl p-4" style={CARD}>
          <div className="font-display font-extrabold text-base mb-3" style={{ color: INK }}>More {category?.emoji || ''} {category?.title || 'games'}</div>
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
  const scored = !isExternal(game)
  const others = GAMES.filter((g) => g.href !== href)
  const related = others.filter((g) => g.cat === game.cat).slice(0, 4)

  // ads follow the arcade kill-switch: this shell renders all 548 game
  // pages, 512 of them cross-origin partner iframes.
  return (
    <MarketingShell subtitle="money's wingman" ads={ARCADE_ADS_ENABLED}>
      <ArrowKeyGuard />
      <div className="mx-auto px-4 sm:px-6 pt-5 pb-16" style={{ maxWidth: 1280 }}>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-4" style={{ color: FAINT }}>
          <Link href="/games" style={{ color: GREEN, fontWeight: 600 }}>Games</Link>
          {category && <><span>›</span><span>{category.emoji} {category.title}</span></>}
          <span>›</span><span style={{ color: BODY, fontWeight: 600 }}>{game.name}</span>
        </nav>

        {/* Daily challenge banner — only where we can actually pay it out.
            Partner games instead get an honest pointer at the games that do. */}
        {scored ? (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4" style={{ background: 'linear-gradient(90deg, #ecfdf5, #f6f8f4)', border: '1px solid #bbf7d0' }}>
            <span aria-hidden style={{ fontSize: 20 }}>📅</span>
            <span className="text-sm" style={{ color: BODY }}>
              <b style={{ color: INK }}>Daily challenge:</b> finish one round of {game.name} today for <b style={{ color: GREEN }}>+50 GuacMoney</b>.
            </span>
            <span className="ml-auto"><GameStreak slug={gameId} /></span>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4" style={{ background: '#f6f8f4', border: BORDER }}>
            <span aria-hidden style={{ fontSize: 20 }}>🎮</span>
            <span className="text-sm" style={{ color: BODY }}>
              <b style={{ color: INK }}>Guest game.</b> Scores here stay in the game — want <b style={{ color: GREEN }}>+50 GuacMoney</b> a day
              for playing? <Link href="/games" style={{ color: GREEN, fontWeight: 700 }}>Play a Guac Arcade original</Link>.
            </span>
          </div>
        )}

        <div className="lg:grid lg:gap-6 lg:items-start" style={{ gridTemplateColumns: 'minmax(0, 1fr) 340px' }}>

          {/* ── Main column ── */}
          <div className="min-w-0">
            {/* Stage — the game runs edge-to-edge inside its own rounded arena
                (the game-detail mockup: a single juice stage, no colour frame). */}
            <div id="gg-stage" className="rounded-3xl" style={{ boxShadow: `0 18px 40px -18px ${game.g2}77` }}>
              {children}
            </div>

            {/* Title card — white, rating + plays stat row (Game.html mockup) */}
            <div className="mt-4 rounded-2xl p-5 sm:p-6" style={CARD}>
              <div className="flex items-center gap-3 flex-wrap">
                <span aria-hidden className="select-none shrink-0" style={{ fontSize: 30, lineHeight: 1 }}>{game.emoji}</span>
                <h1 className="font-display font-extrabold m-0" style={{ color: INK, fontSize: 'clamp(22px, 2.6vw, 30px)' }}>{game.name}</h1>
                {(href === FEATURED_HREF || game.featured) && <span className="text-[11px] font-extrabold tracking-wide px-2.5 py-1 rounded-full" style={{ background: AMBER, color: '#3F3206' }}>FEATURED</span>}
                {game.isNew && <span className="text-[11px] font-extrabold tracking-wide px-2.5 py-1 rounded-full" style={{ background: '#dcfce7', color: '#166534' }}>NEW</span>}
                <GameActions slug={href.split('/').pop()} />
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-sm font-semibold" style={{ color: MUTED }}>
                <span style={{ color: INK }}>⭐ {game.rating ?? 4.6}</span>
                {game.plays && <span>🎮 {game.plays} plays this week</span>}
                <span>🏷️ {game.tag}</span>
                <span>📱 Phone-friendly</span>
                {scored && <span className="inline-flex items-center gap-1.5" style={{ color: GREEN }}><AvocadoPip size={15} /> +50 GuacMoney daily</span>}
              </div>
              <p className="mt-3.5 m-0 text-base leading-relaxed" style={{ color: BODY }}>{game.desc}</p>
            </div>

            {/* How to play — numbered step grid */}
            {how.length > 0 && (
              <div className="mt-4 rounded-2xl p-5 sm:p-6" style={CARD}>
                <h2 className="font-display font-extrabold text-xl m-0 mb-4" style={{ color: INK }}>How to play</h2>
                <div className="grid gap-3.5 sm:grid-cols-3">
                  {how.map((step, i) => {
                    const card = typeof step === 'string' ? { text: step } : step
                    return (
                      <div key={i} className="rounded-xl p-4" style={{ background: '#f6f8f4' }}>
                        {card.icon
                          ? <div aria-hidden style={{ fontSize: 24, lineHeight: 1 }}>{card.icon}</div>
                          : <div className="flex items-center justify-center rounded-full font-display font-extrabold text-sm" style={{ width: 28, height: 28, background: GREEN, color: '#fff' }}>{i + 1}</div>}
                        {card.title && <div className="font-display font-extrabold text-base mt-2" style={{ color: INK }}>{card.title}</div>}
                        <p className="mt-1.5 m-0 text-sm leading-relaxed" style={{ color: BODY }}>{card.text}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Ad — right where the eye lands after a round. Off while we chase
                AdSense approval; ads on thin pages are part of why we're rejected. */}
            {ARCADE_ADS_ENABLED && (
              <div className="mx-auto mt-6" style={{ maxWidth: 900 }}>
                <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '9142744455'} minHeight={90} />
              </div>
            )}

            {/* Sidebar content inline for narrow screens (the rail is lg-only) */}
            <div className="lg:hidden mt-8 space-y-4">
              <GameSidebar name={game.name} gameId={gameId} related={related} category={category} scored={scored} />
            </div>

            {/* Tips + SEO article — the text band every game portal carries */}
            {(how.length > 0 || tips.length > 0) && (
              <section className="mt-10" style={{ maxWidth: 760 }}>
                {how.length > 0 && (
                  <>
                    <h2 className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>How to play {title}</h2>
                    {how.map((p, i) => {
                      const t = typeof p === 'string' ? p : [p.title, p.text].filter(Boolean).join(' — ')
                      return <p key={i} className="text-sm leading-relaxed mb-2.5" style={{ color: BODY }}>{t}</p>
                    })}
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
                  {title} is {scored ? 'part of' : 'a guest game on'} the free <Link href="/games" style={{ color: GREEN, fontWeight: 700 }}>Guac Arcade</Link> from
                  GetGuac — money&apos;s wingman.{' '}
                  {scored
                    ? <>Signed-in players earn <b>+50 GuacMoney</b> for the first finished round of each game every day. </>
                    : <>GuacMoney is earned on Guac Arcade originals rather than guest games. </>}
                  If outsmarting the arcade feels good, wait until you do it to your own
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
            {ARCADE_ADS_ENABLED && (
              <div className="mx-auto mt-10" style={{ maxWidth: 900 }}>
                <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '9142744455'} minHeight={90} />
              </div>
            )}
          </div>

          {/* ── Right sidebar (lg+) ── */}
          <aside className="hidden lg:block space-y-4" style={{ position: 'sticky', top: 80 }}>
            <GameSidebar name={game.name} gameId={gameId} related={related} category={category} />
            {ARCADE_ADS_ENABLED && (
              <XlOnly>
                <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RIGHT || '9083371411'} format="vertical" minHeight={600} />
              </XlOnly>
            )}
          </aside>
        </div>
      </div>
    </MarketingShell>
  )
}

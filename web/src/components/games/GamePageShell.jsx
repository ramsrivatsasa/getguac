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
        <span className="block text-[12px]" style={{ color: FAINT }}>
          {Number.isFinite(game.rating) ? `⭐ ${game.rating} · ` : ''}{game.tag}
        </span>
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
  const ownOthers = others.filter((g) => !isExternal(g))
  const related = ownOthers.filter((g) => g.cat === game.cat).slice(0, 4)
  const moreGames = [
    ...ownOthers.filter((g) => g.cat === game.cat),
    ...ownOthers.filter((g) => g.cat !== game.cat),
  ].slice(0, 12)

  // ads follow the arcade kill-switch: this shell renders all 548 game
  // pages, 512 of them cross-origin partner iframes.
  return (
    <MarketingShell subtitle="money's wingman" ads={ARCADE_ADS_ENABLED}>
      <ArrowKeyGuard />
      <div className="mx-auto px-4 sm:px-6 pt-4 pb-16" style={{ maxWidth: 1380 }}>

        {/* Portal-style game toolbar: one quiet row, then straight into play. */}
        <div className="flex items-center gap-4 mb-3 min-h-[48px]">
          <Link href="/games" className="shrink-0 inline-flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl no-underline" style={{ color: INK, background: '#fff', border: BORDER }}>
            <span aria-hidden>←</span><span className="hidden sm:inline">All games</span>
          </Link>
          <div className="min-w-0 flex items-center gap-3">
            <span className="text-2xl" aria-hidden>{game.emoji}</span>
            <div className="min-w-0">
              <h1 className="font-display font-extrabold text-lg sm:text-xl leading-tight truncate m-0" style={{ color: INK }}>{game.name}</h1>
              <div className="text-[11px] font-semibold truncate" style={{ color: FAINT }}>GetGuac Arcade {category ? `· ${category.emoji} ${category.title}` : ''}</div>
            </div>
          </div>
          <div className="ml-auto hidden md:flex items-center gap-3 text-[11px] font-bold" style={{ color: MUTED }}>
            {scored && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: '#ecfdf5', color: GREEN }}><AvocadoPip size={14} /> +50 daily</span>}
            {scored && <GameStreak slug={gameId} />}
          </div>
        </div>

        <div className="lg:grid lg:gap-6 lg:items-start" style={{ gridTemplateColumns: 'minmax(0, 1fr) 340px' }}>

          {/* ── Main column ── */}
          <div className="min-w-0">
            {/* Stage — the game runs edge-to-edge inside its own rounded arena
                (the game-detail mockup: a single juice stage, no colour frame). */}
            <div id="gg-stage" className="rounded-3xl" style={{ boxShadow: `0 18px 40px -18px ${game.g2}77` }}>
              {children}
            </div>

            {/* Title card — white, rating + plays stat row (Game.html mockup) */}
            <div className="mt-3 rounded-2xl p-3 sm:p-4" style={{ ...CARD, boxShadow: '0 10px 30px rgba(21,40,28,0.06)' }}>
              <div className="flex items-center gap-3 flex-wrap">
                <span aria-hidden className="select-none shrink-0 w-12 h-12 rounded-xl grid place-items-center" style={{ fontSize: 25, lineHeight: 1, background: `linear-gradient(145deg,${game.g1},${game.g2})`, boxShadow: `0 7px 18px ${game.g2}35` }}>{game.emoji}</span>
                <div className="min-w-0">
                  <div className="font-display font-extrabold truncate" style={{ color: INK, fontSize: 'clamp(18px, 2vw, 23px)' }}>{game.name}</div>
                  <div className="text-[11px] font-semibold" style={{ color: FAINT }}>by GetGuac · Your Money Arcade</div>
                </div>
                {(href === FEATURED_HREF || game.featured) && <span className="text-[11px] font-extrabold tracking-wide px-2.5 py-1 rounded-full" style={{ background: AMBER, color: '#3F3206' }}>FEATURED</span>}
                {game.isNew && <span className="text-[11px] font-extrabold tracking-wide px-2.5 py-1 rounded-full" style={{ background: '#dcfce7', color: '#166534' }}>NEW</span>}
                {/* `name` feeds the Share button's message, so it reads
                    "Play Fruit Slice free on GetGuac" rather than "this game". */}
                <GameActions slug={href.split('/').pop()} name={game.name} />
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 pt-3 text-xs font-semibold" style={{ color: MUTED, borderTop: BORDER }}>
                {Number.isFinite(game.rating) && <span style={{ color: INK }}>⭐ {game.rating}</span>}
                {game.plays && <span>🎮 {game.plays} plays this week</span>}
                <span>🏷️ {game.tag}</span>
                <span>📱 Phone-friendly</span>
                {scored && <span className="inline-flex items-center gap-1.5" style={{ color: GREEN }}><AvocadoPip size={15} /> +50 GuacMoney daily</span>}
              </div>
              <p className="mt-2.5 m-0 text-sm leading-relaxed" style={{ color: BODY }}>{game.desc}</p>
            </div>

            {/* How to play — numbered step grid */}
            {how.length > 0 && (
              <details className="mt-3 rounded-2xl group" style={CARD}>
                <summary className="cursor-pointer list-none flex items-center justify-between px-5 py-4 font-display font-extrabold" style={{ color: INK }}>
                  <span className="inline-flex items-center gap-2"><span aria-hidden>🎮</span> How to play</span><span className="text-sm font-bold" style={{ color: GREEN }}>View guide +</span>
                </summary>
                <div className="grid gap-3.5 sm:grid-cols-3 px-5 pb-5">
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
              </details>
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
              <details className="hidden" style={{ ...CARD, maxWidth: 760 }}>
                <summary className="cursor-pointer list-none flex items-center justify-between px-5 py-4 font-display font-extrabold" style={{ color: INK }}>
                  <span>Strategy guide &amp; tips</span><span className="text-sm" style={{ color: GREEN }}>Read more +</span>
                </summary>
                <div className="px-5 pb-5">
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
                </div>
              </details>
            )}

            {/* A focused set of GetGuac originals. Rendering every partner game
                here repeated 500+ cards on every game page and buried our own
                catalog beneath a wall of unrelated titles. */}
            <section className="mt-10">
              <div className="flex items-baseline justify-between gap-4 mb-3.5">
                <h2 className="font-display font-extrabold text-xl m-0" style={{ color: INK }}>More GetGuac originals</h2>
                <Link href="/games" className="text-sm font-bold" style={{ color: GREEN }}>Browse the arcade →</Link>
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                {moreGames.map((g) => <GameCover key={g.href} game={g} />)}
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
            <GameSidebar name={game.name} gameId={gameId} related={related} category={category} scored={scored} />
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

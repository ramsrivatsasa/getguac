// Shared layout for every Guac Arcade game page — game-portal style
// (bubbleshooter.com / MSN Play), under the REGULAR site header. Three
// columns on xl:
//   left  — a stack of cover tiles for the other arcade games
//   center — how-to strip, the game, ad below the game, article, closing ad
//   right — vertical ad + leaderboard + more covers + a second ad
// Below xl the rails unmount (XlOnly — a CSS-hidden AdSlot still pushes at
// zero width and throws TagError) and a cover strip replaces them; that
// strip is also the SSR/SEO home of the cross-links, since XlOnly renders
// nothing on the server.
// Server component; the game itself comes in as `children` (client component).
import Link from 'next/link'
import MarketingShell from '../MarketingShell'
import AdSlot from '../AdSlot'
import XlOnly from '../XlOnly'
import GameCover from './GameCover'
import Leaderboard from './Leaderboard'
import { GAMES, gameIdFor } from './gamesList'

const INK = '#15281C'
const BODY = '#3d4a42'
const FAINT = '#8a978d'

function CoverStack({ games }) {
  return (
    <div className="space-y-3">
      {games.map((g) => <GameCover key={g.href} game={g} />)}
    </div>
  )
}

export default function GamePageShell({ href, title, blurb, how = [], tips = [], children }) {
  const others = GAMES.filter((g) => g.href !== href)
  const gameId = gameIdFor(href)
  return (
    <MarketingShell subtitle="money's wingman">
      <div className="pb-16 pt-4">
        <div className="mx-auto px-4 mb-2 flex items-baseline justify-between" style={{ maxWidth: 1560 }}>
          <Link href="/games" className="text-sm font-bold no-underline" style={{ color: '#065f46' }}>← All games</Link>
          <span className="text-xs hidden sm:block" style={{ color: FAINT }}>{blurb}</span>
        </div>

        <div className="mx-auto px-4 xl:grid xl:gap-6 xl:items-start" style={{ maxWidth: 1560, gridTemplateColumns: '220px minmax(0, 1fr) 336px' }}>
          {/* Left rail — cover tiles, bubbleshooter-style */}
          <aside className="hidden xl:block">
            <XlOnly>
              <div className="text-[11px] font-extrabold uppercase tracking-wider mb-2 px-1" style={{ color: FAINT }}>🕹️ More games</div>
              <CoverStack games={others.slice(0, 8)} />
            </XlOnly>
          </aside>

          {/* Center — everything aligned to the game column */}
          <div className="min-w-0">
            {/* Compact how-to right above the game — the full article stays below */}
            {how.length > 0 && (
              <div className="mb-3 rounded-2xl px-4 py-3 flex items-start gap-2.5" style={{ background: '#f2fbf3', border: '1px solid rgba(20,83,45,0.10)' }}>
                <span aria-hidden className="text-base leading-5">🎮</span>
                <p className="m-0 text-sm leading-relaxed" style={{ color: BODY }}>
                  <b style={{ color: INK }}>How to play:</b> {how[0]}
                </p>
              </div>
            )}
            {children}

            {/* Ad: right below the game, where the eye lands after a round */}
            <div className="mx-auto mt-6" style={{ maxWidth: 900 }}>
              <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '9142744455'} minHeight={90} />
            </div>

            {/* Leaderboard for narrow screens (the right rail is xl-only) */}
            <div className="xl:hidden mx-auto mt-8" style={{ maxWidth: 560 }}>
              <Leaderboard game={gameId} />
            </div>

            {/* Cover strip for narrow screens (the rails are xl-only) */}
            <section className="xl:hidden mt-10">
              <h2 className="font-display font-extrabold text-lg mb-3" style={{ color: INK }}>More Guac Arcade games</h2>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                {others.map((g) => <GameCover key={g.href} game={g} />)}
              </div>
            </section>

            {/* How to play — the SEO/text band every game portal carries */}
            {(how.length > 0 || tips.length > 0) && (
              <section className="mx-auto mt-10" style={{ maxWidth: 760 }}>
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
                  {title} is part of the free <Link href="/games" style={{ color: '#065f46', fontWeight: 700 }}>Guac Arcade</Link> from
                  GetGuac — money&apos;s wingman. Signed-in players earn <b>+50 GuacMoney</b> for the first finished round of each
                  game every day. If outsmarting the arcade feels good, wait until you do it to your own
                  spending: <Link href="/how-it-works" style={{ color: '#065f46', fontWeight: 700 }}>see how GetGuac works</Link>.
                </p>
              </section>
            )}

            {/* Closing ad */}
            <div className="mx-auto mt-10" style={{ maxWidth: 900 }}>
              <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '9142744455'} minHeight={90} />
            </div>
          </div>

          {/* Right rail — ads + leaderboard + more covers */}
          <aside className="hidden xl:block">
            <XlOnly>
              <div className="space-y-4">
                <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RIGHT || '9083371411'} format="vertical" minHeight={250} />
                <Leaderboard game={gameId} />
                <CoverStack games={others.slice(8, 12)} />
                <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RIGHT || '9083371411'} format="vertical" minHeight={600} />
              </div>
            </XlOnly>
          </aside>
        </div>
      </div>
    </MarketingShell>
  )
}

// Shared layout for every Guac Arcade game page — game-portal style
// (bubbleshooter.com / MSN Play): a boxed game column with a sticky right
// rail (ad + leaderboard) on wide screens, an ad below the game, a "More
// games" cover strip, a short how-to-play article, and a closing ad.
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

export default function GamePageShell({ href, headerTitle, title, blurb, how = [], tips = [], children }) {
  const others = GAMES.filter((g) => g.href !== href)
  const gameId = gameIdFor(href)
  return (
    <MarketingShell subtitle="money's wingman" hideSearch headerTitle={headerTitle}>
      <div className="pb-16 pt-4">
        <div className="mx-auto px-4 mb-2 flex items-baseline justify-between" style={{ maxWidth: 1440 }}>
          <Link href="/games" className="text-sm font-bold no-underline" style={{ color: '#065f46' }}>← All games</Link>
          <span className="text-xs hidden sm:block" style={{ color: FAINT }}>{blurb}</span>
        </div>

        {/* Boxed game column + sticky right rail (ad + leaderboard) on xl.
            Below xl the rail hides and the leaderboard reflows under the game. */}
        <div className="mx-auto px-4 xl:grid xl:gap-6 xl:items-start" style={{ maxWidth: 1440, gridTemplateColumns: 'minmax(0, 1fr) 336px' }}>
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

            {/* Ad: right under the game, where the eye lands after a round */}
            <div className="mx-auto mt-8" style={{ maxWidth: 900 }}>
              <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '9142744455'} minHeight={90} />
            </div>

            {/* Leaderboard for narrow screens (the rail is xl-only) */}
            <div className="xl:hidden mx-auto mt-8" style={{ maxWidth: 560 }}>
              <Leaderboard game={gameId} />
            </div>
          </div>

          <aside className="hidden xl:block">
            <XlOnly>
              <div className="sticky top-20 space-y-4">
                <Leaderboard game={gameId} />
                <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RIGHT || '9083371411'} format="vertical" minHeight={600} />
              </div>
            </XlOnly>
          </aside>
        </div>

        {/* More games — portal-style cover strip */}
        <section className="mx-auto px-4 mt-10" style={{ maxWidth: 1200 }}>
          <h2 className="font-display font-extrabold text-lg mb-3" style={{ color: INK }}>More Guac Arcade games</h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {others.map((g) => <GameCover key={g.href} game={g} />)}
          </div>
        </section>

        {/* How to play — the SEO/text band every game portal carries */}
        {(how.length > 0 || tips.length > 0) && (
          <section className="mx-auto px-4 mt-10" style={{ maxWidth: 760 }}>
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
        <div className="mx-auto px-4 mt-10" style={{ maxWidth: 900 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '9142744455'} minHeight={90} />
        </div>
      </div>
    </MarketingShell>
  )
}

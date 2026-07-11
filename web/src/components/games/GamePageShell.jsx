// Shared layout for every Guac Arcade game page — game-portal style
// (bubbleshooter.com / MSN Play): the game front and center, an ad below it,
// a "More games" strip, a short how-to-play article, and a closing ad.
// Server component; the game itself comes in as `children` (client component).
import Link from 'next/link'
import MarketingShell from '../MarketingShell'
import AdSlot from '../AdSlot'
import GameCover from './GameCover'
import { GAMES } from './gamesList'

const INK = '#15281C'
const BODY = '#3d4a42'
const FAINT = '#8a978d'

export default function GamePageShell({ href, headerTitle, title, blurb, how = [], tips = [], children }) {
  const others = GAMES.filter((g) => g.href !== href)
  return (
    <MarketingShell subtitle="money's wingman" hideSearch headerTitle={headerTitle}>
      <div className="pb-16 pt-4">
        <div className="mx-auto px-4 mb-2 flex items-baseline justify-between" style={{ maxWidth: 1200 }}>
          <Link href="/games" className="text-sm font-bold no-underline" style={{ color: '#065f46' }}>← All games</Link>
          <span className="text-xs hidden sm:block" style={{ color: FAINT }}>{blurb}</span>
        </div>

        {/* The game — full width of the screen */}
        {children}

        {/* Ad: right under the game, where the eye lands after a round */}
        <div className="mx-auto px-4 mt-8" style={{ maxWidth: 900 }}>
          <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '9142744455'} minHeight={90} />
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

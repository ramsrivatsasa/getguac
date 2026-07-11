import Link from 'next/link'
import MarketingShell from '../../components/MarketingShell'
import GameCover from '../../components/games/GameCover'
import { GAMES, CATEGORIES, FEATURED_HREF } from '../../components/games/gamesList'

export const metadata = {
  title: 'Guac Arcade — 15 free games: maze muncher, asteroids, darts & more',
  description:
    'Free browser games from GetGuac: a coin-chomping maze classic, asteroids, darts, brick-breaker, invaders, tower stacking, daily word puzzles and more. No download, phone-friendly — and playing earns GuacMoney.',
  alternates: { canonical: '/games' },
}

const INK = '#15281C'

function Row({ title, blurb, games }) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-display font-extrabold text-xl" style={{ color: INK }}>{title}</h2>
        {blurb && <span className="text-xs hidden sm:block" style={{ color: '#8a978d' }}>{blurb}</span>}
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        {games.map((g) => <GameCover key={g.href} game={g} />)}
      </div>
    </section>
  )
}

export default function GamesPage() {
  const featured = GAMES.find((g) => g.href === FEATURED_HREF) || GAMES[0]
  const fresh = GAMES.filter((g) => g.isNew && g.href !== featured.href)

  return (
    <MarketingShell subtitle="money's wingman">
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '36px 24px 72px' }}>
        {/* Hero — featured game, MSN-Play style */}
        <Link
          href={featured.href}
          className="group relative block overflow-hidden rounded-3xl no-underline"
          style={{
            background: `radial-gradient(130% 140% at 15% 0%, ${featured.g1} 0%, ${featured.g2} 100%)`,
            boxShadow: '0 14px 40px rgba(21,40,28,0.25)',
          }}
        >
          <span aria-hidden className="absolute -right-8 -bottom-12 opacity-20 select-none" style={{ fontSize: 240, transform: 'rotate(-12deg)' }}>{featured.emoji}</span>
          <span aria-hidden className="absolute right-[22%] top-6 opacity-60 select-none hidden sm:block" style={{ fontSize: 40, transform: 'rotate(10deg)' }}>{featured.motifs?.[0]}</span>
          <span aria-hidden className="absolute right-[38%] bottom-8 opacity-50 select-none hidden sm:block" style={{ fontSize: 30, transform: 'rotate(-14deg)' }}>{featured.motifs?.[1]}</span>
          <div className="relative px-6 py-10 sm:px-10 sm:py-14" style={{ maxWidth: 640 }}>
            <div className="text-[11px] font-extrabold tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>🕹️ GUAC ARCADE · FEATURED</div>
            <div className="flex items-center gap-4">
              <span className="select-none" style={{ fontSize: 64, filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.35))' }}>{featured.emoji}</span>
              <h1 className="font-display font-extrabold text-white" style={{ fontSize: 'clamp(28px, 4.5vw, 44px)', lineHeight: 1.05 }}>{featured.name}</h1>
            </div>
            <p className="mt-3 text-sm sm:text-base" style={{ color: 'rgba(255,255,255,0.88)', maxWidth: 460 }}>{featured.desc}</p>
            <span className="inline-block mt-5 text-sm font-extrabold px-7 py-3 rounded-full transition-transform duration-200 group-hover:scale-105" style={{ background: '#FDE047', color: '#3F3206' }}>
              ▶ Play now — free
            </span>
          </div>
        </Link>

        {/* GuacMoney strip */}
        <div className="mt-5 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ background: '#f2fbf3', border: '1px solid rgba(20,83,45,0.12)' }}>
          <span style={{ fontSize: 26 }}>🥑</span>
          <span className="text-sm font-bold" style={{ color: '#065f46' }}>Playing earns GuacMoney:</span>
          <span className="text-sm" style={{ color: '#3d4a42' }}>
            your first finished round of each game every day adds <b>+50 GuacMoney</b> to your balance.{' '}
            <Link href="/login" style={{ color: '#065f46', fontWeight: 700 }}>Sign in</Link> so it counts.
          </span>
        </div>

        {fresh.length > 0 && <Row title="✨ New this week" games={fresh} />}
        {CATEGORIES.map((c) => (
          <Row key={c.id} title={c.title} blurb={c.blurb} games={GAMES.filter((g) => g.cat === c.id)} />
        ))}

        <p className="text-center text-sm mt-12" style={{ color: '#8a978d' }}>
          Like beating games? Beating your own grocery bill feels better —{' '}
          <Link href="/how-it-works" style={{ color: '#065f46', fontWeight: 700 }}>see how GetGuac works</Link>.
        </p>
      </section>
    </MarketingShell>
  )
}

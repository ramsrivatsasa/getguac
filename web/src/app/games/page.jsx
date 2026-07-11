import Link from 'next/link'
import MarketingShell from '../../components/MarketingShell'

export const metadata = {
  title: 'Guac Arcade — free money games: Guacdle, Receipt Stacker & more',
  description:
    'Eight free money mini-games from GetGuac: a daily money-word puzzle, price guessing, expense Tetris, bubble-popping budgets, chess vs the Spenders and more. No account needed.',
  alternates: { canonical: '/games' },
}

const GAMES = [
  { href: '/games/guacdle', emoji: '🟩', name: 'Guacdle', tag: 'Daily word', desc: 'Guess the 5-letter money word in 6 tries. One new word every day.' },
  { href: '/games/price-check', emoji: '🏷️', name: 'Price Check', tag: 'Quick play', desc: 'Higher or lower? Call the typical price of everyday stuff and keep the run alive.' },
  { href: '/games/merge', emoji: '💰', name: 'Money Merge', tag: 'Puzzle', desc: 'Equal dollars merge and double. Compound a single $1 into $2,048.' },
  { href: '/games/bubbles', emoji: '🫧', name: 'Bubble Pop', tag: 'Arcade', desc: 'Aim, shoot, match three — pop the spending bubbles before the wall reaches your wallet.' },
  { href: '/games/slicer', emoji: '🥷', name: 'Waste Slicer', tag: 'Arcade', desc: 'Fees and impulse buys fly — slice them mid-air. Spare the essentials.' },
  { href: '/games/stacker', emoji: '🧾', name: 'Receipt Stacker', tag: 'Arcade', desc: 'Falling expenses, classic stacking rules. Balance the receipt line by line.' },
  { href: '/games/rope', emoji: '🪢', name: 'Guac Drop', tag: 'Physics puzzle', desc: 'Cut the ropes at the right moment and swing the avocado into the savings jar.' },
  { href: '/games/chess', emoji: '♟️', name: 'Guac Chess', tag: 'Strategy', desc: 'Savers vs. Spenders. Full chess, three difficulties — every capture has a price tag.' },
]

export default function GamesPage() {
  return (
    <MarketingShell subtitle="money's wingman">
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 28px 72px' }}>
        <div className="text-center mb-10">
          <div style={{ fontSize: 52 }}>🕹️</div>
          <h1 className="gg-h1" style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>The Guac Arcade</h1>
          <p className="mt-3 text-base" style={{ color: '#3d4a42', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            Free mini-games that sharpen your savings instincts — spot the waste, know the
            price, let the money compound. No account, no download, phone-friendly.
          </p>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {GAMES.map((g) => (
            <Link key={g.href} href={g.href} className="group rounded-2xl p-5 no-underline transition-shadow" style={{
              border: '1px solid rgba(20,83,45,0.10)', background: '#fff', color: 'inherit',
              boxShadow: '0 2px 8px rgba(21,40,28,0.04)',
            }}>
              <div className="flex items-start justify-between">
                <span style={{ fontSize: 40 }}>{g.emoji}</span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#f2fbf3', color: '#065f46' }}>{g.tag}</span>
              </div>
              <h2 className="font-display font-extrabold text-lg mt-3 group-hover:underline" style={{ color: '#15281C' }}>{g.name}</h2>
              <p className="text-sm mt-1" style={{ color: '#5C6B60' }}>{g.desc}</p>
              <div className="text-sm font-bold mt-3" style={{ color: '#65A30D' }}>Play →</div>
            </Link>
          ))}
        </div>

        <p className="text-center text-sm mt-10" style={{ color: '#8a978d' }}>
          Like beating games? Beating your own grocery bill feels better —{' '}
          <Link href="/how-it-works" style={{ color: '#065f46', fontWeight: 700 }}>see how GetGuac works</Link>.
        </p>
      </section>
    </MarketingShell>
  )
}

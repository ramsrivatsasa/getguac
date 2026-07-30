// The benefit mockup card, lifted out of GoalsShowcase so the paid-ad landing
// page can repeat it between sections without re-implementing it. (It used to
// answer an "I want to…" prompt; that framing is retired and the copy on every
// card now addresses the reader as "you".)
//
// ⚠️ `g.goal` is the card's action line here and `g.cta` is never rendered — so
// a card's `goal` has to work as a link AND as the showcase heading it becomes
// back in GoalsShowcase. Keep both readings in mind when editing one.
//
// Presentational only — no selection state, no marquee. GoalsShowcase keeps its
// own interactive copy because there the card doubles as a tab control; here it
// is just a card that links somewhere.
//
// Every number on it is illustrative product UI, exactly as on the homepage.
import Link from 'next/link'

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }

export default function GoalCard({ card: g, href }) {
  return (
    <Link
      href={href || g.href}
      style={{
        display: 'block', textDecoration: 'none', textAlign: 'left',
        background: '#fff', borderRadius: 24, padding: 16,
        border: '1px solid rgba(20,83,45,0.10)',
        boxShadow: '0 10px 26px -20px rgba(20,40,28,0.25)',
      }}
    >
      {/* `gap` + a non-shrinking tag so the two halves never overlap; the tag
          itself is hidden under 560px (see .gc-tag in globals.css) because the
          benefit-phrase titles need the whole row on a phone. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10, padding: '0 2px' }}>
        <span style={{ ...DISPLAY, fontWeight: 800, fontSize: 15, color: '#15281C' }}>{g.e} {g.name}</span>
        <span className="gc-tag" style={{ fontSize: 11, color: '#8A988E', flex: '0 0 auto', whiteSpace: 'nowrap' }}>{g.tag}</span>
      </div>
      <div style={{ textAlign: 'center', margin: '4px 0 12px' }}>
        <div style={{ ...DISPLAY, fontWeight: 800, fontSize: 30, letterSpacing: '-0.02em', color: '#15281C', lineHeight: 1.1 }}>{g.big}</div>
        <div style={{ fontSize: 12, color: '#65A30D', fontWeight: 700, marginTop: 3 }}>{g.sub}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {g.rows.map((r) => (
          <div key={r.t} style={{ display: 'flex', alignItems: 'center', gap: 9, background: r.neg ? '#FBF3EC' : '#F7FAF2', borderRadius: 12, padding: '8px 11px' }}>
            <span style={{ fontSize: 15 }}>{r.i}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: '#16241C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.t}</div>
              <div style={{ fontSize: 10.5, color: '#8A988E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.s}</div>
            </div>
            <span style={{ fontWeight: 800, fontSize: 12.5, color: r.neg ? '#C2410C' : '#16241C', whiteSpace: 'nowrap' }}>{r.r}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 700, color: '#4D7C0F', padding: '0 2px' }}>{g.goal} →</div>
    </Link>
  )
}

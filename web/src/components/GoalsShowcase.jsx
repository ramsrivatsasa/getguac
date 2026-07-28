'use client'

// Homepage "I want to…" section: a scroll-snap strip of illustrative product
// mockup cards (one per option, GuacScore-card style) + a showcase panel that
// shows the REAL web + phone screens for whichever card is selected.
// All numbers on the mockup cards are illustrative product UI (same as the
// hero GuacScore card) — the screenshots are the real app on demo data.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import GuacAIBanner from './GuacAIBanner'

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }

// Exported so the paid-ad landing page (/join) can render the same cards
// without duplicating the copy — one source of truth for what GetGuac claims
// it does. Keep this array the only place these cards are defined.
export const CARDS = [
  {
    // Lead card — selected by default, so the showcase opens on the Guac AI
    // banner instead of app screenshots (see the `banner` branch below).
    slug: 'meet-guac-ai', e: '🥑', name: 'Guac AI', tag: 'reads every receipt', big: '3-in-1', sub: 'refunds · prices · Worth-It',
    rows: [
      { i: '📸', t: 'Receipts in', s: 'photo + email', r: '✓' },
      { i: '⭐', t: 'Worth-It out', s: 'scored per buy', r: '88' },
    ],
    goal: 'Put a brain on my money',
    blurb: 'Snap a receipt or forward an email and Guac AI reads the fine print — finding refunds, watching prices, and scoring whether each buy was actually worth it.',
    href: '/register', cta: 'Meet your sidekick',
    banner: true,
  },
  {
    slug: 'organized', e: '🗂️', name: 'Dashboard', tag: 'This month', big: '$2,291', sub: '62 receipts · all in one place',
    rows: [
      { i: '🛒', t: 'Whole Foods', s: 'Grub · 18 items', r: '$94.20' },
      { i: '📈', t: 'GuacScore', s: 'Steady Guac', r: '74/100' },
    ],
    goal: 'Feel organized about my finances',
    blurb: 'Every receipt, score and anomaly lands on one dashboard — photo scans, email pulls and bank statements included.',
    href: '/how-it-works', cta: 'See how it works',
  },
  {
    slug: 'receipts', e: '🧾', name: 'Receipts', tag: 'photo + email', big: '2 ways', sub: 'to capture every receipt',
    rows: [
      { i: '📸', t: 'Photo scan', s: 'Costco · 12 items', r: '$35.00' },
      { i: '📬', t: 'Email pull', s: 'Netflix · auto-filed', r: '$17.99' },
    ],
    goal: 'Never lose a receipt again',
    blurb: 'Snap it, or let GetGuac pull it straight from your inbox — every receipt filed, itemized and searchable.',
    href: '/how-email-works', cta: 'Photo + email capture',
  },
  {
    slug: 'bank', e: '🏦', name: 'Bank Bite', tag: 'statement scan', big: '$60.00', sub: 'found hiding in one statement',
    rows: [
      { i: '💳', t: 'Interest charged', s: 'most expensive card', r: '−$40', neg: true },
      { i: '⚠️', t: 'Monthly fee', s: 'flagged · avoidable', r: '−$20', neg: true },
    ],
    goal: 'Know what my bank statements hide',
    blurb: 'Drop in a PDF statement and GetGuac highlights the interest, fees and charges your bank hopes you skim past.',
    href: '/features', cta: 'Import a statement',
  },
  {
    slug: 'subs', e: '🔁', name: 'Subscriptions', tag: 'last 12 months', big: '$111/mo', sub: '7 recurring charges found',
    rows: [
      { i: '🎬', t: 'Netflix', s: 'monthly · priced up', r: '+16%', neg: true },
      { i: '📺', t: 'Hulu', s: 'unused 3 months', r: 'Cancel?' },
    ],
    goal: 'Cancel subscriptions I forgot about',
    blurb: 'GetGuac spots every recurring charge, flags the price hikes, and nudges you about the ones you stopped using.',
    href: '/features', cta: 'Round them up',
  },
  {
    slug: 'fees', e: '🕵️', name: 'Anomalies', tag: 'this period', big: '3 caught', sub: 'before they became habits',
    rows: [
      { i: '📈', t: 'Charity 2.2× usual', s: '$108 vs $50 average', r: '⚠', neg: true },
      { i: '🍎', t: 'Apple.com/Bill', s: 'missing 46 days', r: 'autopay?' },
    ],
    goal: 'Catch hidden fees before they bite',
    blurb: 'Weird charges, silent price creep, payments that vanished — GetGuac watches your patterns and taps you on the shoulder.',
    href: '/features', cta: 'Sniff out sneaky charges',
  },
  {
    slug: 'worth-it', e: '⭐', name: 'Worth It?', tag: '31 of 60 rated', big: '4.4★', sub: 'average across your buys',
    rows: [
      { i: '✅', t: 'Essential', s: '13 purchases', r: '$593' },
      { i: '🔪', t: 'Splurge', s: '1 purchase', r: '$9', neg: true },
    ],
    goal: 'Stop buying stuff that isn’t worth it',
    blurb: 'Rate every purchase — high = must-have, low = ad-hoc — and watch where the regret actually lives in your spending.',
    href: '/features', cta: 'Rate every purchase',
  },
  {
    slug: 'returns', e: '💸', name: 'Returns', tag: 'windows open', big: '$192', sub: 'refundable right now',
    rows: [
      { i: '🎯', t: 'Target', s: '44 days left', r: '$24.00' },
      { i: '🏔️', t: 'REI', s: '311 days left', r: '$89.00' },
    ],
    goal: 'Get back the refunds I’m owed',
    blurb: 'Every purchase gets its return window tracked — GetGuac reminds you before the deadline slams shut.',
    href: '/features', cta: 'Track returns & deadlines',
  },
  {
    slug: 'smashlist', e: '🛒', name: 'Smashlist', tag: 'shared with family', big: '15 items', sub: 'routed to 3 stores',
    rows: [
      { i: '🥛', t: 'Greek yogurt', s: 'Costco · cheapest', r: '$5.99' },
      { i: '📤', t: 'Sent to family', s: 'one tap', r: '✓' },
    ],
    goal: 'Plan shopping the whole family sees',
    blurb: 'One smart list, auto-routed to the cheapest store — smash items as you grab them, share it with the family in a tap.',
    href: '/features', cta: 'Build & share a Smashlist',
  },
  {
    slug: 'predictions', e: '🔮', name: 'Predictions', tag: 'from your receipts', big: '~3 days', sub: 'until you run out of milk',
    rows: [
      { i: '🧻', t: 'Paper towels', s: 'every 2 weeks', r: '5 days' },
      { i: '🐶', t: 'Dog food', s: 'every month', r: '1 week' },
    ],
    goal: 'Know what I need before I run out',
    blurb: 'GetGuac learns your buying rhythm from receipts and predicts what belongs on the list before the fridge is empty.',
    href: '/features', cta: 'See your predictions',
  },
  {
    slug: 'steals', e: '🏷️', name: 'Steals', tag: 'watching 2 searches', big: '−$38', sub: 'off what you already want',
    rows: [
      { i: '🎧', t: 'AirPods Pro', s: 'live web scan', r: 'SALE' },
      { i: '🎵', t: 'Sony XM5', s: 'price drop', r: '$248' },
    ],
    goal: 'Pay less for what I already buy',
    blurb: 'Tell GetGuac what you’re after and it scans the live web for the best price — fresh steals on your saved searches.',
    href: '/steals', cta: 'Scout the Steals',
  },
  {
    slug: 'marketplace', e: '🎟️', name: 'Marketplace', tag: 'public · no login', big: '20+ stores', sub: 'coupons, deals & directories',
    rows: [
      { i: '🏬', t: 'Home Depot', s: 'coupon', r: '15% off' },
      { i: '📍', t: 'Local deal', s: 'near you', r: '$10 off' },
    ],
    goal: 'Find coupons and local deals',
    blurb: 'A public marketplace of store deals, coupons and local finds — browse it before you buy anything.',
    href: '/marketplace', cta: 'Browse the Marketplace',
  },
  {
    slug: 'stash', e: '📦', name: 'Stash', tag: '39 unique items', big: '$2,116', sub: 'of stuff you own, tracked',
    rows: [
      { i: '🔌', t: 'USB-C Hub', s: 'first buy · Jun 9', r: '$45.50' },
      { i: '🥑', t: 'Chips & Guac', s: 'rated 5★', r: '$4.60' },
    ],
    goal: 'Keep track of everything I own',
    blurb: 'Everything you’ve ever bought, deduped into one stash — rate it, re-find it, and see what it really cost you.',
    href: '/features', cta: 'Stock your Stash',
  },
  {
    slug: 'car-miles', e: '🚗', name: 'Car Miles', tag: 'year to date', big: '358.5 mi', sub: 'logged for tax time',
    rows: [
      { i: '💼', t: 'Business', s: '5 trips', r: '331 mi' },
      { i: '❤️', t: 'Charity 5K', s: 'City Park', r: '31 mi' },
    ],
    goal: 'Log my miles for tax time',
    blurb: 'Business, charity and personal trips logged with one tap — deductible miles ready when your accountant asks.',
    href: '/features', cta: 'Track Car Miles',
  },
  {
    slug: 'tax', e: '🧮', name: 'Tax-ready', tag: 'this year', big: '$313.28', sub: 'business · tax-deductible',
    rows: [
      { i: '🧾', t: 'Sales tax paid', s: 'across 38 receipts', r: '$148.37' },
      { i: '📊', t: 'Export', s: 'CSV for your accountant', r: '→' },
    ],
    goal: 'Be ready when tax season comes',
    blurb: 'Business purchases, charity, sales tax — tagged all year and exportable in one click when the season hits.',
    href: '/features', cta: 'Business, tax & exports',
  },
  {
    slug: 'bills', e: '📅', name: 'Bills', tag: 'next 30 days', big: '3 bills', sub: 'on the calendar, no surprises',
    rows: [
      { i: '🏠', t: 'Rent', s: 'due Aug 1', r: '$1,800' },
      { i: '📶', t: 'Internet', s: 'due Aug 8', r: '$49' },
    ],
    goal: 'See bills coming before they hit',
    blurb: 'A bills calendar plus plan-ahead calculators, so the first of the month never sneaks up on you again.',
    href: '/features', cta: 'Plan ahead',
  },
  {
    slug: 'guacmoney', e: '🪙', name: 'GuacMoney', tag: 'rewards', big: '12,400', sub: 'GM earned so far',
    rows: [
      { i: '🧾', t: 'Receipt scanned', s: 'daily habit', r: '+100' },
      { i: '💸', t: 'Refund caught', s: 'nice save', r: '+1,000' },
    ],
    goal: 'Earn rewards for smart habits',
    blurb: 'Scanning receipts, catching refunds, rating purchases — the good habits earn GuacMoney as you go.',
    href: '/features', cta: 'Meet GuacMoney',
  },
  {
    slug: 'guac-ai', e: '💬', name: 'Guac-AI', tag: 'knows your receipts', big: 'Ask away', sub: '“what did groceries cost me?”',
    rows: [
      { i: '🥑', t: '$325.50', s: 'across 13 trips', r: '✓' },
      { i: '📊', t: 'Open your reports', s: 'one tap', r: '→' },
    ],
    goal: 'Ask my money anything',
    blurb: 'A chat assistant grounded in your receipts — ask about spending, subscriptions or returns and get a straight answer.',
    href: '/login?demo=1', cta: 'Meet Guac-AI',
  },
  {
    slug: 'games', e: '🎮', name: 'Guac Arcade', tag: '32 games', big: '32 games', sub: 'some play with your real data',
    rows: [
      { i: '🔪', t: 'Splurge Slicer', s: 'daily challenge', r: '+50 GM' },
      { i: '👾', t: 'Expense Invaders', s: 'your spending', r: 'Play' },
    ],
    goal: 'Make saving actually fun',
    blurb: 'A whole arcade of money games — a few of them powered by your own spending, all of them earning GuacMoney.',
    href: '/games', cta: 'Play the Arcade',
  },
]

export default function GoalsShowcase() {
  // The strip drifts sideways slowly (marquee) but stays hand-scrollable and
  // clickable: cards are rendered twice for a seamless loop, a rAF loop nudges
  // scrollLeft, and the drift pauses while the pointer is over the strip.
  // Selection only ever changes on click.
  const [sel, setSel] = useState(0)
  const rowRef = useRef(null)
  const hoverRef = useRef(false)
  const dirRef = useRef(0) // -1 left · 0 hold · +1 right, from cursor position
  const c = CARDS[sel]

  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let raf
    let last = performance.now()
    const DRIFT = 0.03 // ambient drift ≈ 30px/s
    const EDGE = 0.14  // edge-hover scroll ≈ 140px/s
    const step = (now) => {
      const dt = Math.min(now - last, 100)
      last = now
      const half = row.scrollWidth / 2
      if (half > row.clientWidth) {
        let next = row.scrollLeft + (hoverRef.current ? dt * EDGE * dirRef.current : dt * DRIFT)
        if (next >= half) next -= half
        if (next < 0) next += half
        row.scrollLeft = next
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <section style={{ padding: '32px 0 24px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px', textAlign: 'center' }}>
        <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 38, letterSpacing: '-0.03em', margin: '0 0 10px', color: '#15281C' }}>What will you get done with GetGuac?</h2>
        <p style={{ fontStyle: 'italic', fontSize: 16, color: '#56655B', margin: '0 0 26px' }}>I want to… <span style={{ fontStyle: 'normal', opacity: 0.7 }}>(tap a card)</span></p>
      </div>

      {/* mockup-card strip — doubled card list for a seamless slow drift */}
      <div
        ref={rowRef} className="gg-goals-row"
        onPointerEnter={() => { hoverRef.current = true }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const f = (e.clientX - r.left) / r.width
          dirRef.current = f > 0.72 ? 1 : f < 0.28 ? -1 : 0
        }}
        onPointerLeave={() => { hoverRef.current = false; dirRef.current = 0 }}
        style={{ display: 'flex', gap: 16, overflowX: 'auto', maxWidth: 1180, margin: '0 auto', padding: '6px 28px 20px' }}
      >
        {[...CARDS, ...CARDS].map((g, idx) => {
          const i = idx % CARDS.length
          return (
          <button
            key={`${g.slug}-${idx}`} type="button" onClick={() => setSel(i)} aria-pressed={i === sel}
            style={{
              flex: '0 0 262px', cursor: 'pointer', textAlign: 'left',
              background: '#fff', borderRadius: 24, padding: 16, fontFamily: 'inherit',
              border: i === sel ? '2px solid #65A30D' : '1px solid rgba(20,83,45,0.10)',
              boxShadow: i === sel ? '0 18px 40px -18px rgba(101,163,13,0.45)' : '0 10px 26px -20px rgba(20,40,28,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '0 2px' }}>
              <span style={{ ...DISPLAY, fontWeight: 800, fontSize: 15, color: '#15281C' }}>{g.e} {g.name}</span>
              <span style={{ fontSize: 11, color: '#8A988E' }}>{g.tag}</span>
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
          </button>
          )
        })}
      </div>

      {/* showcase — the real app screens for the selected option */}
      <div style={{ maxWidth: 1180, margin: '18px auto 0', padding: '0 28px' }}>
        {c.banner ? <GuacAIBanner /> : (
        <div className="gg-showcase" style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 44, alignItems: 'center', background: '#fff', border: '1px solid rgba(20,83,45,0.10)', borderRadius: 28, padding: '38px 40px', boxShadow: '0 24px 60px -32px rgba(20,40,28,0.3)' }}>
          <div>
            <div style={{ fontSize: 40, marginBottom: 10 }}>{c.e}</div>
            <h3 style={{ ...DISPLAY, fontWeight: 800, fontSize: 30, letterSpacing: '-0.02em', margin: '0 0 12px', color: '#15281C' }}>{c.goal}</h3>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: '#56655B', margin: '0 0 22px' }}>{c.blurb}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <Link href={c.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#65A30D', color: '#fff', fontWeight: 700, fontSize: 15, padding: '12px 22px', borderRadius: 999, textDecoration: 'none' }}>{c.cta} →</Link>
              <Link href="/login?demo=1" style={{ fontSize: 14, fontWeight: 700, color: '#4D7C0F', textDecoration: 'none' }}>Try it in the demo →</Link>
            </div>
            <p style={{ fontSize: 12, color: '#8A988E', margin: '18px 0 0' }}>Real screens from the live app (demo data) — web and mobile.</p>
          </div>
          <div style={{ position: 'relative', paddingBottom: 26 }}>
            {/* web screen */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={`w-${c.slug}`} src={`/home/goals/web-${c.slug}.webp`} alt={`${c.name} on the web`} loading="lazy" style={{ width: '100%', display: 'block', borderRadius: 16, border: '1px solid rgba(20,83,45,0.12)', boxShadow: '0 20px 50px -24px rgba(20,40,28,0.4)' }} />
            {/* phone screen overlapping */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={`p-${c.slug}`} src={`/home/goals/phone-${c.slug}.webp`} alt={`${c.name} on iPhone`} loading="lazy" style={{ position: 'absolute', right: -6, bottom: 0, width: 148, filter: 'drop-shadow(0 22px 34px rgba(20,40,28,0.4))' }} />
          </div>
        </div>
        )}
      </div>
    </section>
  )
}

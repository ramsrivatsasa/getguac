'use client'

// Homepage benefit section: a scroll-snap strip of illustrative product
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
    // Card titles rewritten 2026-07-29: `name` was the FEATURE ("Guac AI",
    // "Dashboard", "Bank Bite") and is now the BENEFIT. The figures in `big`
    // are untouched — they were already here, and the new `sub` lines are
    // written to read as a sentence continuing out of `big` rather than
    // repeating it ("$2,291" + "62 receipts analyzed automatically").
    // tag shortened from "reads every receipt": this card has the longest
    // title of the six, and the two together overflowed the header row at
    // desktop card width (~330px). Keeps the verb, loses ~32px.
    slug: 'meet-guac-ai', e: '🥑', name: 'Find Money You’re Missing', tag: 'reads receipts', big: '3-in-1', sub: 'Refunds • Better prices • Smarter purchases',
    rows: [
      { i: '📸', t: 'Receipts in', s: 'photo + email', r: '✓' },
      { i: '⭐', t: 'Worth-It out', s: 'scored per buy', r: '88' },
    ],
    goal: 'Put a brain on your money',
    blurb: 'Snap a receipt or forward an email and Guac AI reads the fine print — finding refunds, watching prices, and scoring whether each buy was actually worth it.',
    href: '/register', cta: 'Meet your sidekick',
    banner: true,
  },
  {
    slug: 'organized', e: '💰', name: 'See Where Your Money Goes', tag: 'This month', big: '$2,291', sub: '62 receipts analyzed automatically',
    rows: [
      { i: '🛒', t: 'Whole Foods', s: 'Grub · 18 items', r: '$94.20' },
      { i: '📈', t: 'GuacScore', s: 'Steady Guac', r: '74/100' },
    ],
    goal: 'Feel organized about your money',
    blurb: 'Every receipt, score and anomaly lands on one dashboard — photo scans, email pulls and bank statements included.',
    href: '/how-it-works', cta: 'See how it works',
  },
  {
    slug: 'receipts', e: '🧾', name: 'Every Receipt, Organized', tag: 'photo + email', big: '2 ways', sub: 'Photo scans + email receipts in one place',
    rows: [
      { i: '📸', t: 'Photo scan', s: 'Costco · 12 items', r: '$35.00' },
      { i: '📬', t: 'Email pull', s: 'Netflix · auto-filed', r: '$17.99' },
    ],
    goal: 'Never lose a receipt again',
    blurb: 'Snap it, or let GetGuac pull it straight from your inbox — every receipt filed, itemized and searchable.',
    href: '/how-email-works', cta: 'Photo + email capture',
  },
  {
    slug: 'bank', e: '🏦', name: 'Recover Hidden Money', tag: 'statement scan', big: '$60.00', sub: 'uncovered from fees and unnecessary charges',
    rows: [
      { i: '💳', t: 'Interest charged', s: 'most expensive card', r: '−$40', neg: true },
      { i: '⚠️', t: 'Monthly fee', s: 'flagged · avoidable', r: '−$20', neg: true },
    ],
    goal: 'Know what your bank statements hide',
    blurb: 'Drop in a PDF statement and GetGuac highlights the interest, fees and charges your bank hopes you skim past.',
    href: '/features', cta: 'Import a statement',
  },
  {
    slug: 'subs', e: '🔄', name: 'Cut Forgotten Subscriptions', tag: 'last 12 months', big: '$111/mo', sub: 'discovered in recurring charges',
    rows: [
      { i: '🎬', t: 'Netflix', s: 'monthly · priced up', r: '+16%', neg: true },
      { i: '📺', t: 'Hulu', s: 'unused 3 months', r: 'Cancel?' },
    ],
    goal: 'Cancel subscriptions you forgot about',
    blurb: 'GetGuac spots every recurring charge, flags the price hikes, and nudges you about the ones you stopped using.',
    href: '/features', cta: 'Round them up',
  },
  {
    slug: 'fees', e: '🚨', name: 'Catch Spending Surprises', tag: 'this period', big: '3 caught', sub: 'unusual charges, before they become habits',
    rows: [
      { i: '📈', t: 'Charity 2.2× usual', s: '$108 vs $50 average', r: '⚠', neg: true },
      { i: '🍎', t: 'Apple.com/Bill', s: 'missing 46 days', r: 'autopay?' },
    ],
    goal: 'Catch hidden fees before they bite',
    blurb: 'Weird charges, silent price creep, payments that vanished — GetGuac watches your patterns and taps you on the shoulder.',
    href: '/features', cta: 'Sniff out sneaky charges',
  },
  {
    slug: 'worth-it', e: '⭐', name: 'Was It Worth the Money?', tag: '31 of 60 rated', big: '4.4★', sub: 'how essential your buys really were',
    rows: [
      { i: '💎', t: 'Essential', s: '13 buys · your biggest slice', r: '$593' },
      { i: '🙈', t: 'Regret', s: 'flagged to skip next time', r: '$9', neg: true },
    ],
    goal: 'Spend smarter',
    blurb: 'Rate your purchases, learn your spending habits, and avoid buyer’s remorse.',
    href: '/features', cta: 'Review your purchases',
  },
  {
    slug: 'returns', e: '💸', name: 'Money Waiting to Be Reclaimed', tag: 'open now', big: '$192', sub: 'refundable — 1 window shuts in 5 days',
    rows: [
      { i: '🎯', t: 'Target', s: '5 days left · claim it now', r: '$24.00', neg: true },
      { i: '🏔️', t: 'REI', s: '311 days left · no rush', r: '$89.00' },
    ],
    goal: 'Get your money back',
    blurb: 'Keep track of returns and price adjustments before the deadlines expire.',
    href: '/features', cta: 'Claim your refunds',
  },
  {
    slug: 'smashlist', e: '🛒', name: 'Every Shopping Trip, Optimized', tag: 'family list', big: '15 items', sub: 'routed to the 3 cheapest stores',
    rows: [
      { i: '🥛', t: 'Greek yogurt', s: 'Costco · cheapest nearby', r: '$5.99' },
      { i: '💸', t: 'Saved this trip', s: 'vs your usual stores', r: '$8.40' },
    ],
    goal: 'Save on your next trip',
    blurb: 'Compare prices, share lists, and spend less every time you shop.',
    href: '/features', cta: 'Optimize your list',
  },
  {
    // 🔮 kept over a milk emoji — the card forecasts paper towels and dog food
    // too, so a dairy icon would clash with its own rows. The row `s` field keeps
    // the cadence ("every 2 weeks") because that is what makes the prediction
    // explainable; a bare "5 days left" would drop the reason.
    slug: 'predictions', e: '🔮', name: 'Never Run Out Again', tag: 'from your receipts', big: '~3 days', sub: 'until you run out of milk',
    rows: [
      { i: '🧻', t: 'Paper towels', s: 'every 2 weeks', r: '5 days left' },
      { i: '🐶', t: 'Dog food', s: 'every month', r: '1 week left' },
    ],
    goal: 'Stay stocked',
    blurb: 'GetGuac learns your buying rhythm from receipts and predicts what belongs on the list before the fridge is empty.',
    href: '/features', cta: 'See upcoming refills',
  },
  {
    slug: 'steals', e: '🏷️', name: 'Price Drops', tag: 'watching 2 searches', big: '−$38', sub: 'off items you’re already watching',
    rows: [
      { i: '🎧', t: 'AirPods Pro', s: 'live price tracking', r: 'SALE' },
      { i: '🎵', t: 'Sony XM5', s: 'price dropped', r: '$248' },
    ],
    goal: 'Pay less for what you already buy',
    blurb: 'Tell GetGuac what you’re after and it scans the live web for the best price — fresh steals on your saved searches.',
    href: '/steals', cta: 'View price drops',
  },
  {
    // Title is the benefit, but `cta` still says "Browse the Marketplace" — the
    // button names the destination, so the card can read plainly while the nav
    // item and /marketplace keep their real name. NOT "Cashback": the site's own
    // metadata promises "no cashback gimmicks", and we don't do it.
    slug: 'marketplace', e: '🎟️', name: 'Deals Near You', tag: 'public · no login', big: '20+ stores', sub: 'coupons, local deals & directories',
    rows: [
      { i: '🏬', t: 'Home Depot', s: 'coupon', r: '15% off' },
      { i: '📍', t: 'Local deal', s: 'near you', r: '$10 off' },
    ],
    goal: 'Find coupons and local deals',
    blurb: 'A public marketplace of store deals, coupons and local finds — browse it before you buy anything.',
    href: '/marketplace', cta: 'Browse the Marketplace',
  },
  {
    // Title is the benefit, `cta` keeps the real feature name — same split as
    // the marketplace card above. "Stash" is a shipped page (/stash, sidebar
    // nav, stashEngine.js), so it survives on the button, not in the title.
    slug: 'stash', e: '📦', name: 'Everything You Own', tag: '39 unique items', big: '$2,116', sub: 'of stuff you own, tracked',
    rows: [
      { i: '🔌', t: 'USB-C Hub', s: 'first buy · Jun 9', r: '$45.50' },
      { i: '🥑', t: 'Chips & Guac', s: 'rated 5★', r: '$4.60' },
    ],
    goal: 'Browse your purchases',
    blurb: 'Everything you’ve ever bought, deduped into one stash — rate it, re-find it, and see what it really cost you.',
    href: '/features', cta: 'Stock your Stash',
  },
  {
    // ⚠️ NOT "Mileage Tracker" / "automatic mileage tracking" (both were
    // suggested): /car-miles is a manual "Add Trip" form — there is no GPS or
    // odometer capture, so "automatic" would be a false claim. The title states
    // what you end up with instead of implying how it gets there.
    //
    // Title length matters here: these three cards are rail 4 on /join, where
    // GoalCard gives the title ~26 chars before it wraps to a second line and
    // knocks its big figure out of line with its neighbours'. 21 chars fits.
    slug: 'car-miles', e: '🚗', name: 'Every Deductible Mile', tag: 'year to date', big: '358.5 mi', sub: 'logged for tax time',
    rows: [
      { i: '💼', t: 'Business', s: '5 trips', r: '331 mi' },
      { i: '❤️', t: 'Charity 5K', s: 'City Park', r: '31 mi' },
    ],
    goal: 'Track every mile',
    blurb: 'Business, charity and personal trips logged with one tap — deductible miles ready when your accountant asks.',
    href: '/features', cta: 'Open Car Miles',
  },
  {
    slug: 'tax', e: '🧮', name: 'Ready for Tax Season', tag: 'this year', big: '$313.28', sub: 'business · tax-deductible',
    rows: [
      { i: '🧾', t: 'Sales tax paid', s: 'across 38 receipts', r: '$148.37' },
      { i: '📊', t: 'Export', s: 'CSV for your accountant', r: '→' },
    ],
    goal: 'Export for taxes',
    blurb: 'Business purchases, charity, sales tax — tagged all year and exportable in one click when the season hits.',
    href: '/features', cta: 'Business, tax & exports',
  },
  {
    // NOT "Upcoming Bills" (suggested): that is a feature label, and `name` is
    // the benefit slot everywhere else in this list. The label survives in `goal`.
    slug: 'bills', e: '📅', name: 'Never Miss a Due Date', tag: 'next 30 days', big: '3 bills', sub: 'on the calendar, no surprises',
    rows: [
      { i: '🏠', t: 'Rent', s: 'due Aug 1', r: '$1,800' },
      { i: '📶', t: 'Internet', s: 'due Aug 8', r: '$49' },
    ],
    goal: 'View upcoming bills',
    blurb: 'A bills calendar plus plan-ahead calculators, so the first of the month never sneaks up on you again.',
    href: '/features', cta: 'Plan ahead',
  },
  {
    // 🔒 HONESTY LOCK — GuacMoney is a SAVINGS TRACKER, not a redeemable currency.
    // `grep -ri "redeem|redemption|payout|cash out"` over web/src returns NOTHING
    // outside the finance articles: there is no redemption path in the product.
    // /features states the real behaviour — it "tracks the real money you keep —
    // refunds claimed, better prices found, regrets skipped".
    // ❌ So these suggested lines were REJECTED as promises we don't keep:
    // "Get rewarded for everyday purchases" · "See all rewards →" · "Start earning
    // today →" · "Every receipt brings you closer to rewards". They read as cashback,
    // and layout.jsx's own site description promises "no cashback gimmicks".
    // "Earn While You Save" is safe: GM genuinely accrues as you save.
    slug: 'guacmoney', e: '🪙', name: 'Earn While You Save', tag: 'rewards', big: '12,400', sub: 'GM earned so far',
    rows: [
      { i: '🧾', t: 'Receipt scanned', s: 'daily habit', r: '+100' },
      { i: '💸', t: 'Refund caught', s: 'nice save', r: '+1,000' },
    ],
    goal: 'Watch your savings add up',
    blurb: 'Scanning receipts, catching refunds, rating purchases — the good habits earn GuacMoney as you go.',
    href: '/features', cta: 'Meet GuacMoney',
  },
  {
    // ❌ NOT "Ask Guac Anything" (suggested): bare "Guac" would be a THIRD variant
    // next to Guac-AI (63×) and Guac AI (25×), and the homepage h1 uses "Guac" to
    // mean MONEY ("Keep More Guac in Your Pocket") — so on that page it would read
    // as asking the guacamole. Real name stays on the button (`cta`).
    //
    // 🔴 `sub` keeps "cost ME", not the suggested "did WE spend": there is no
    // family/household account in the product — no shared-list table, no invite or
    // member flow, nothing multi-user in (dashboard)/shopping. "We" would assert a
    // shared-data feature that doesn't exist. Item sharing is per-item tokens only.
    slug: 'guac-ai', e: '💬', name: 'Your AI Money Assistant', tag: 'your receipts', big: 'Ask away', sub: '“what did groceries cost me?”',
    rows: [
      { i: '🥑', t: '$325.50', s: 'across 13 trips', r: '✓' },
      { i: '📊', t: 'Open your reports', s: 'one tap', r: '→' },
    ],
    goal: 'Ask your money anything',
    blurb: 'A chat assistant grounded in your receipts — ask about spending, subscriptions or returns and get a straight answer.',
    href: '/login?demo=1', cta: 'Meet Guac-AI',
  },
  {
    // 🐞 Fixed 2026-07-29: `tag` and `big` were BOTH the literal string "32 games",
    // so the card printed the same words twice — and the number was STALE. The hub
    // renders `GAMES.length` ("browse all 548 games", GamesHub.jsx:389) = 36 ours +
    // 512 partner. Using "500+" so the next externalGames.json sync can't re-stale it.
    slug: 'games', e: '🎮', name: 'Turn Saving Into a Game', tag: 'arcade', big: '500+ games', sub: 'a few play with your real spending',
    rows: [
      { i: '🔪', t: 'Splurge Slicer', s: 'daily challenge', r: '+50 GM' },
      { i: '👾', t: 'Expense Invaders', s: 'your spending', r: 'Play' },
    ],
    goal: 'Play the money games',
    // ⚠️ Was "all of them earning GuacMoney" — FALSE. gamesList.js:10 is explicit
    // that partner games are cross-origin, so "there is no GuacMoney award and no
    // leaderboard for them". Only our 36 pay out.
    blurb: 'A whole arcade of money games — a few powered by your own spending, and our own games earn GuacMoney as you play.',
    href: '/games', cta: 'Open the Arcade',
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
        {/* The question is the HEADING, not a lede under one. It replaced
            "What will you get done with GetGuac?", which asked the same thing —
            two stacked near-identical questions read as an editing mistake. This
            also matches /join, where the same line is the first rail title. */}
        <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 38, letterSpacing: '-0.03em', margin: '0 0 10px', color: '#15281C' }}>How can Guac-AI help today?</h2>
        <p style={{ fontStyle: 'italic', fontSize: 16, color: '#56655B', margin: '0 0 26px' }}><span style={{ fontStyle: 'normal', opacity: 0.7 }}>(tap a card)</span></p>
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
            {/* These strip cards are 262px wide whatever the viewport, so a
                benefit-phrase title cannot share one line with the tag — it wraps
                to two. `minHeight` reserves both lines on EVERY card so the big
                figure below sits at the same height right across a drifting
                strip; the tag never wraps, only the title does. */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10, padding: '0 2px' }}>
              <span style={{ ...DISPLAY, fontWeight: 800, fontSize: 15, lineHeight: 1.25, minHeight: 38, color: '#15281C' }}>{g.e} {g.name}</span>
              <span style={{ fontSize: 11, color: '#5F6D63', flex: '0 0 auto', whiteSpace: 'nowrap' }}>{g.tag}</span>
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
                    <div style={{ fontSize: 10.5, color: '#5F6D63', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.s}</div>
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
            <p style={{ fontSize: 12, color: '#5F6D63', margin: '18px 0 0' }}>Real screens from the live app (demo data) — web and mobile.</p>
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

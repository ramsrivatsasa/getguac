'use client'
// The GetGuac loop — eight stages on a rail, driving ONE big card underneath.
//
// The default big card renders the homepage card's content from CARDS. The
// optional `story` variant is a deliberate /join_demo concept: it keeps each
// CARDS slug, CTA and real screen asset, but adds stage-specific emotional copy
// so the eight buttons tell one connected human story. /join stays on the
// default card until the concept is approved.
//
// The eight stages map onto cards that already have both screenshots:
//   capture→receipts  understand→guac-ai  remember→stash    prepare→smashlist
//   shop→steals       protect→returns     learn→worth-it    next→predictions
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CARDS } from './GoalsShowcase'
import GoalCard from './GoalCard'
import './ReceiptFlow.css'

const GREEN = '#1B8A4B'
const INK   = '#12261B'
const MUTED = '#5F6D63'

// Line-art icons, verbatim from public/home-loop-preview.js.
const ICONS = {
  capture: "<svg viewBox=\"0 0 24 24\"><path d=\"M14.5 4 16 6h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2z\"/><circle cx=\"12\" cy=\"13\" r=\"3.5\"/></svg>",
  understand: "<svg viewBox=\"0 0 24 24\"><path d=\"M6 2h9l4 4v16H6z\"/><path d=\"M14 2v5h5M9 11h6M9 15h6\"/><path d=\"m3 7 1 2 2 1-2 1-1 2-1-2-2-1 2-1z\"/></svg>",
  remember: "<svg viewBox=\"0 0 24 24\"><path d=\"M9.5 4.5A3 3 0 0 0 5 7a3 3 0 0 0 0 6 3 3 0 0 0 4.5 2.5M14.5 4.5A3 3 0 0 1 19 7a3 3 0 0 1 0 6 3 3 0 0 1-4.5 2.5M9.5 4.5v15M14.5 4.5v15M9.5 9h5M9.5 15h5\"/></svg>",
  prepare: "<svg viewBox=\"0 0 24 24\"><path d=\"M7 3h10v3H7zM5 5h14v17H5zM8 11l2 2 4-4M8 17h8\"/></svg>",
  shop: "<svg viewBox=\"0 0 24 24\"><path d=\"M20 13 13 20l-9-9V4h7z\"/><circle cx=\"8.5\" cy=\"8.5\" r=\"1\"/><path d=\"m14 8 3 3M17 8l-3 3\"/></svg>",
  protect: "<svg viewBox=\"0 0 24 24\"><path d=\"M12 2 20 5v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z\"/><path d=\"m9 12 2 2 4-5\"/></svg>",
  learn: "<svg viewBox=\"0 0 24 24\"><path d=\"m12 2 3 6 6 .9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 8.9 9 8z\"/></svg>",
  next: "<svg viewBox=\"0 0 24 24\"><path d=\"M20 11a8 8 0 1 0-2.3 5.7\"/><path d=\"M20 4v7h-7\"/></svg>",
}

// `name` is the rail label; `slug` points at the CARDS entry that supplies the
// CTA and both real app images. The remaining fields drive the story variant.
const STAGES = [
  {
    key: 'capture', name: 'Capture', slug: 'receipts', accent: '#168A4B', soft: '#EAF6ED',
    kicker: 'Less to remember', headline: 'One photo. Nothing lost.',
    story: 'Receipts disappear in pockets, bags and inboxes. GetGuac gives every purchase one dependable home before life moves on.',
    metric: '2 ways in', metricLabel: 'Photo scans and email receipts',
    points: ['Paper and digital receipts together', 'Searchable items instead of mystery totals'],
    proofTitle: 'Receipt memory', proofValue: 'Saved', proofNote: 'Ready whenever you need it',
    image: '/home/story-people/capture-phone.webp', imageAlt: 'A smiling shopper holding a receipt and displaying the GetGuac receipt screen', imagePosition: 'center center',
    momentIcon: '📸', momentEyebrow: 'One quick snap', momentLine: 'Today’s receipt is already safe',
  },
  {
    key: 'understand', name: 'Understand', slug: 'guac-ai', accent: '#2563A8', soft: '#EDF5FF',
    kicker: 'See the full story', headline: 'Know what the total cannot tell you.',
    story: 'A bank sees one charge. Guac-AI sees the groceries, fees, subscriptions and choices hiding inside it.',
    metric: 'Every line', metricLabel: 'Items, stores and spending understood',
    points: ['Ask questions grounded in your receipts', 'Spot patterns a transaction list misses'],
    proofTitle: 'Guac-AI found', proofValue: 'The why', proofNote: 'Behind where the money went',
    image: '/home/story-people/protect.webp', imageAlt: 'A customer reviewing a purchase on her phone', imagePosition: 'center center',
    momentIcon: '✨', momentEyebrow: 'The total becomes a story', momentLine: 'Every item finally makes sense',
  },
  {
    key: 'remember', name: 'Remember', slug: 'stash', accent: '#6D4BC3', soft: '#F3EFFF',
    kicker: 'A lighter mental load', headline: 'Your shopping memory, without the work.',
    story: 'GetGuac remembers what came home, what you liked and what you already own—so the household does not have to.',
    metric: '39 items', metricLabel: 'Remembered and easy to find',
    points: ['Re-find a purchase in seconds', 'Avoid buying what is already at home'],
    proofTitle: 'Before you rebuy', proofValue: 'Already owned', proofNote: 'Stash remembered it for you',
    image: '/home/story-people/prepare.webp', imageAlt: 'A couple planning their shopping together at home', imagePosition: 'center center',
    momentIcon: '🧠', momentEyebrow: 'Already at home', momentLine: 'No duplicate buy this time',
  },
  {
    key: 'prepare', name: 'Prepare', slug: 'smashlist', accent: '#A16207', soft: '#FFF7E6',
    kicker: 'Leave home ready', headline: 'Walk in with a plan, not a guess.',
    story: 'Your real buying rhythm becomes a useful Smashlist—what may be running low, what can wait and what you already have.',
    metric: '15 items', metricLabel: 'Ready for the next trip',
    points: ['Running-low suggestions from purchase history', 'One focused list instead of forgotten notes'],
    proofTitle: 'Next trip', proofValue: 'Ready', proofNote: 'Less guessing in every aisle',
    image: '/home/story-people/family-tablet.webp', imageAlt: 'A laughing family planning together on a tablet displaying the GetGuac app', imagePosition: 'center center',
    momentIcon: '🛒', momentEyebrow: 'Family trip ready', momentLine: 'A calmer list before the aisle',
  },
  {
    key: 'shop', name: 'Shop smart', slug: 'steals', accent: '#C25D13', soft: '#FFF1E7',
    kicker: 'Keep more at checkout', headline: 'Pause before you overpay.',
    story: 'Price context and fresh Steals help you compare, wait or buy with confidence—without turning shopping into homework.',
    metric: '$38 less', metricLabel: 'On an item already being watched',
    points: ['Useful price drops for saved searches', 'Better context before the purchase'],
    proofTitle: 'Price changed', proofValue: 'Worth the wait', proofNote: 'A smarter moment to buy',
    image: '/home/story-people/shop.webp', imageAlt: 'A father and daughter looking at GetGuac together while shopping', imagePosition: 'center center',
    momentIcon: '💬', momentEyebrow: 'Shopping together', momentLine: '“GetGuac found the better price — let’s get this one.”',
  },
  {
    key: 'protect', name: 'Protect', slug: 'returns', accent: '#0F766E', soft: '#E9F8F5',
    kicker: 'After checkout', headline: 'Money owed to you should come back.',
    story: 'GetGuac keeps watching return windows, pending refunds and price changes after the shopping bag reaches home.',
    metric: '$192 open', metricLabel: 'Refundable purchases still in range',
    points: ['Deadlines before they quietly expire', 'Refunds followed until the money returns'],
    proofTitle: 'Return window', proofValue: '5 days left', proofNote: 'Still enough time to act',
    image: '/home/story-people/protect.webp', imageAlt: 'A customer happily finding money to reclaim', imagePosition: 'center center',
    momentIcon: '🛡️', momentEyebrow: 'Money still yours', momentLine: 'Five days left to bring it back',
  },
  {
    key: 'learn', name: 'Worth it', slug: 'worth-it', accent: '#A17300', soft: '#FFF9DD',
    kicker: 'Buy with intention', headline: 'Turn regret into a better next choice.',
    story: 'A quick Worth-It rating teaches GetGuac what truly improved your life—and what does not deserve another dollar.',
    metric: '4.4★', metricLabel: 'Your purchases, judged by real value',
    points: ['Remember the buys you genuinely loved', 'Let a regret become useful guidance'],
    proofTitle: 'Worth-It verdict', proofValue: 'Keep buying', proofNote: 'A choice that earned its place',
    image: '/home/story-people/capture-phone.webp', imageAlt: 'A delighted shopper holding a receipt and displaying the GetGuac result', imagePosition: 'center center',
    momentIcon: '⭐', momentEyebrow: 'Worth it remembered', momentLine: 'More joy, less buyer’s remorse',
  },
  {
    key: 'next', name: 'Next trip', slug: 'predictions', accent: '#168A4B', soft: '#ECF8EE',
    kicker: 'The circle closes', headline: 'The next trip starts smarter.',
    story: 'What happened this time becomes less waste, less stress and better timing next time. Then one new receipt teaches the loop again.',
    metric: '~3 days', metricLabel: 'Until milk may run out',
    points: ['Purchase rhythm becomes a useful forecast', 'Every trip improves the one after it'],
    proofTitle: 'Shopping rhythm', proofValue: 'Learned', proofNote: 'The next list starts itself',
    image: '/home/story-people/family-tablet.webp', imageAlt: 'Parents, a child and a baby laughing around a tablet displaying the GetGuac app', imagePosition: 'center center',
    momentIcon: '🥑', momentEyebrow: 'One less thing to remember', momentLine: 'The next list starts itself',
  },
]

// Click-to-zoom for the app screenshots. They are 900x563 and 360x757 but get
// rendered at roughly half that, so the UI they are meant to prove is not
// actually legible until you can open one.
//
// A plain <img> is not focusable or keyboard-operable, so each screenshot is
// wrapped in a real <button>. That gets Enter/Space and focus rings for free
// rather than bolting tabIndex + onKeyDown onto a div.
function Shot({ className, src, alt, onZoom, ...rest }) {
  return (
    <button type="button" className={'gg-shot-btn ' + className + '-btn'}
            onClick={() => onZoom({ src, alt })}
            aria-label={`Enlarge: ${alt}`}>
      <img className={className} loading="lazy" src={src} alt={alt} {...rest} />
    </button>
  )
}

function Glyph({ k, size }) {
  return (
    <span className="gg-flow-glyph" style={{ width: size, height: size }} aria-hidden
          dangerouslySetInnerHTML={{ __html: ICONS[k] }} />
  )
}

export default function ReceiptFlow({
  heading = 'Every receipt makes the next trip smarter.',
  blurb = 'GetGuac remembers the shopping so you do not have to.',
  href = '/how-it-works',
  linkLabel = 'See how GetGuac works',
  demoHref = '/login?demo=1',
  variant = 'default',
}) {
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState(null)

  // Esc closes the lightbox, and the body scroll-lock stops the page drifting
  // underneath it. Both are cleaned up on unmount so a stage change mid-zoom
  // cannot leave the page permanently unscrollable.
  useEffect(() => {
    if (!zoom) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setZoom(null) }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [zoom])
  const stage = STAGES[active]
  // Fall back to the first card if a slug is ever renamed in CARDS, so a typo
  // degrades to the wrong card rather than crashing the page.
  const card = CARDS.find((c) => c.slug === stage.slug) || CARDS[0]
  const storyMode = variant === 'story'

  return (
    <section className="gg-flow" aria-label="How GetGuac works">

      <div className="gg-flow-grid">
        <div className="gg-flow-left">
          <h2 className="gg-flow-h">{heading}</h2>
          <p className="gg-flow-blurb">{blurb}</p>
          <Link href={href} className="gg-flow-link">{linkLabel} &rarr;</Link>
        </div>

        <div className="gg-flow-rail">
          <div className="gg-flow-row" role="tablist" aria-label="Loop stages">
            {STAGES.map((st, i) => (
              <button key={st.key} type="button" role="tab"
                      aria-selected={i === active} aria-controls="gg-flow-card"
                      className={'gg-flow-step' + (i === active ? ' is-active' : '')}
                      onClick={() => setActive(i)}>
                <span className="gg-flow-puck"><Glyph k={st.key} size={30} /></span>
                <span className="gg-flow-label">{st.name}</span>
              </button>
            ))}
          </div>
          <div className="gg-flow-loop" aria-hidden>
            <div className="gg-flow-loop-line"><span className="gg-flow-loop-head" /></div>
          </div>
          <p className="gg-flow-loop-text">Learns from every trip.</p>
        </div>
      </div>

      {/* The story variant is isolated to /join_demo while the concept is being
          reviewed. /join keeps the proven product-card layout until approval. */}
      {storyMode ? (
      <div className="gg-flow-story" id="gg-flow-card" role="tabpanel" aria-live="polite"
           style={{ '--gg-accent': stage.accent, '--gg-soft': stage.soft }}>
        <div className="gg-flow-storycopy">
          <span className="gg-flow-storykicker"><Glyph k={stage.key} size={17} />{stage.kicker}</span>
          <h3 className="gg-flow-storyh">{stage.headline}</h3>
          <div className="gg-flow-storytalk" aria-label={`${stage.momentEyebrow}: ${stage.momentLine}`}>
            <div className="gg-flow-storytalkmoment">
              <span className="gg-flow-storytalkicon" aria-hidden>{stage.momentIcon}</span>
              <span><small>{stage.momentEyebrow}</small><strong>{stage.momentLine}</strong></span>
            </div>
          <div className="gg-flow-storypoints">
            {stage.points.map((point) => (
              <div className="gg-flow-storypoint" key={point}><span className="gg-flow-storycheck">✓</span>{point}</div>
            ))}
          </div>
          </div>
          <div className="gg-flow-storyphoto">
            <img key={stage.image} className="gg-flow-storypeople" src={stage.image} alt={stage.imageAlt}
                 style={{ objectPosition: stage.imagePosition }} />
            <span className="gg-flow-storyphototag">Real life · less money stress</span>
          </div>
          <div className="gg-flow-storyactions">
            <Link className="gg-flow-storycta" href={card.href}>{card.cta} &rarr;</Link>
            <Link className="gg-flow-storydemo" href={demoHref}>Try the live demo &rarr;</Link>
          </div>
        </div>
        <div key={`story-visual-${stage.key}`} className={'gg-flow-storyvisual' + (stage.image.includes('/family') ? ' is-family' : '')}>
          <div className="gg-flow-storymetric">
            <strong>{stage.metric}</strong><span>{stage.metricLabel}</span>
          </div>
          <p className="gg-flow-storyp">{stage.story}</p>
          <div className="gg-flow-storyapp">
            <span className="gg-flow-storystage">0{active + 1} / 08&nbsp;&nbsp;{stage.name.toUpperCase()}</span>
            <span className="gg-flow-storyapplabel">Inside the GetGuac app</span>
            <div className="gg-flow-storyshots">
              <Shot key={`story-w-${card.slug}`} className="gg-flow-storyweb" onZoom={setZoom}
                    src={`/home/goals/web-${card.slug}.webp`} alt={`${card.name} on the web`} />
              <Shot key={`story-p-${card.slug}`} className="gg-flow-storyphone" onZoom={setZoom}
                    src={`/home/goals/phone-${card.slug}.webp`} alt={`${card.name} on iPhone`} />
              <div className="gg-flow-storyproof">
                <span>{stage.proofTitle}</span><strong>{stage.proofValue}</strong><small>{stage.proofNote}</small>
              </div>
            </div>
          </div>
          <div className="gg-flow-storyfine">Real app screens with demo data</div>
        </div>
      </div>
      ) : (
      <div className="gg-flow-card" id="gg-flow-card" role="tabpanel" aria-live="polite">
        <div className="gg-flow-cardtext">
          <span className="gg-flow-cardicon" aria-hidden>{card.e}</span>
          <h3 className="gg-flow-cardh">{card.goal}</h3>
          <p className="gg-flow-cardp">{card.blurb}</p>
          {/* The same small card the homepage row renders — reused, not rebuilt. */}
          <div className="gg-flow-mini"><GoalCard card={card} /></div>
        </div>

        <div className="gg-flow-right">
          <div className="gg-flow-shots">
            {/* key forces a real swap instead of a stale decode when slug changes */}
            <Shot key={`w-${card.slug}`} className="gg-flow-web" onZoom={setZoom}
                  src={`/home/goals/web-${card.slug}.webp`} alt={`${card.name} on the web`} />
            <Shot key={`p-${card.slug}`} className="gg-flow-phone" onZoom={setZoom}
                  src={`/home/goals/phone-${card.slug}.webp`} alt={`${card.name} on iPhone`} />
          </div>
          <div className="gg-flow-actions">
            <Link className="gg-flow-cta" href={card.href}>{card.cta} &rarr;</Link>
            <Link className="gg-flow-demo" href={demoHref}>Try it in the demo &rarr;</Link>
          </div>
          {/* 🔒 Honesty line: these ARE real app screens, populated with demo
              data. Keep it — it is the difference between a screenshot and a
              claim about someone's results. */}
          <p className="gg-flow-fine">Real screens from the live app (demo data) — web and mobile.</p>
        </div>
      </div>
      )}
      {zoom && (
        <div className="gg-zoom" role="dialog" aria-modal="true" aria-label={zoom.alt}
             onClick={() => setZoom(null)}>
          <img className="gg-zoom-img" src={zoom.src} alt={zoom.alt} />
          <button type="button" className="gg-zoom-close" onClick={() => setZoom(null)}
                  aria-label="Close">Close</button>
        </div>
      )}
    </section>
  )
}

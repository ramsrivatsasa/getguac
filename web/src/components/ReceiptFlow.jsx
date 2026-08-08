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
      {/* 🔒 NO ANGLE BRACKETS, AMPERSANDS OR QUOTES IN THIS CSS.
          React escapes text children of style tags, so any of those characters
          ships HTML-escaped, is never decoded inside a stylesheet, and produces
          an invalid rule PLUS a text-content hydration error. Both variants of
          that bug shipped today — a quoted attribute selector, and a child
          combinator. Flat class selectors only. */}
      <style>{`
        .gg-flow { background: #EEF4EA; border-radius: 18px; padding: 32px 30px 28px; }
        .gg-flow-grid { display: flex; gap: 38px; align-items: center; max-width: 1120px; margin: 0 auto; }
        .gg-flow-left { flex: 0 0 244px; }
        .gg-flow-h { font-family: var(--font-bricolage), sans-serif; font-weight: 800; font-size: 29px;
                     line-height: 1.14; letter-spacing: -0.02em; color: ${INK}; margin: 0 0 12px; }
        .gg-flow-blurb { font-size: 14.5px; line-height: 1.55; color: ${MUTED}; margin: 0 0 20px; }
        .gg-flow-link { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px;
                        font-weight: 700; color: ${GREEN}; text-decoration: none; }
        .gg-flow-link:hover { text-decoration: underline; }
        .gg-flow-rail { flex: 1 1 auto; min-width: 0; }
        .gg-flow-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 2px; }
        .gg-flow-step { flex: 1 1 0; min-width: 0; background: none; border: 0; padding: 0 2px;
                        cursor: pointer; text-align: center; font: inherit; }
        .gg-flow-puck { width: 62px; height: 62px; border-radius: 999px; background: #fff; margin: 0 auto 9px;
                        display: flex; align-items: center; justify-content: center; color: ${INK};
                        transition: transform .15s ease, box-shadow .15s ease, background .15s ease; }
        .gg-flow-step:hover .gg-flow-puck { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(21,40,28,.13); }
        .gg-flow-step.is-active .gg-flow-puck { background: ${GREEN}; color: #fff;
                        box-shadow: 0 8px 20px rgba(27,138,75,.30); }
        .gg-flow-label { display: block; font-size: 10.5px; font-weight: 800; letter-spacing: 0.05em;
                         text-transform: uppercase; color: ${MUTED}; }
        .gg-flow-step.is-active .gg-flow-label { color: ${INK}; }
        .gg-flow-glyph { display: block; }
        .gg-flow-glyph svg { width: 100%; height: 100%; fill: none; stroke: currentColor;
                             stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
        .gg-flow-loop { margin: 12px 6.25% 0; }
        .gg-flow-loop-line { position: relative; height: 22px; border-left: 2.2px solid ${GREEN};
                             border-right: 2.2px solid ${GREEN}; border-bottom: 2.2px solid ${GREEN};
                             border-radius: 0 0 12px 12px; }
        .gg-flow-loop-head { position: absolute; left: -6.4px; top: -1px; width: 0; height: 0;
                             border-left: 5.5px solid transparent; border-right: 5.5px solid transparent;
                             border-bottom: 8px solid ${GREEN}; }
        .gg-flow-loop-text { text-align: center; font-size: 12.5px; color: ${INK}; margin: 8px 0 0; }

        .gg-flow-card { max-width: 1140px; margin: 26px auto 0; background: #fff; border-radius: 22px;
                        padding: 34px; display: flex; gap: 34px; align-items: flex-start;
                        box-shadow: 0 12px 34px rgba(21,40,28,.08); }
        .gg-flow-cardtext { flex: 0 0 40%; min-width: 0; }
        .gg-flow-cardicon { font-size: 30px; display: block; margin-bottom: 14px; }
        .gg-flow-cardh { font-family: var(--font-bricolage), sans-serif; font-weight: 800; font-size: 30px;
                         letter-spacing: -0.02em; color: ${INK}; margin: 0 0 12px; line-height: 1.15; }
        .gg-flow-cardp { font-size: 15.5px; line-height: 1.6; color: #56655B; margin: 0 0 22px; }
        .gg-flow-mini { max-width: 300px; }

        .gg-flow-right { flex: 1 1 60%; min-width: 0; }
        .gg-shot-btn { display: block; padding: 0; border: 0; background: none; cursor: zoom-in;
                       width: 100%; border-radius: 16px; }
        .gg-shot-btn:focus-visible { outline: 3px solid #1B8A4B; outline-offset: 3px; }
        .gg-flow-phone-btn { position: absolute; right: -8px; bottom: -26px; width: 146px; }
        .gg-flow-storyphone-btn { position: absolute; right: 0; bottom: -18px; width: 150px; }
        .gg-zoom { position: fixed; inset: 0; z-index: 120; background: rgba(10,20,14,.86);
                   display: flex; align-items: center; justify-content: center; padding: 4vh 4vw;
                   cursor: zoom-out; }
        .gg-zoom-img { max-width: 100%; max-height: 92vh; border-radius: 12px;
                       box-shadow: 0 30px 80px rgba(0,0,0,.5); }
        .gg-zoom-close { position: fixed; top: 18px; right: 20px; background: #fff; color: #12261B;
                         border: 0; border-radius: 999px; padding: 9px 18px; font-weight: 700;
                         font-size: 13px; cursor: pointer; }
        .gg-flow-shots { position: relative; }
        .gg-flow-web { width: 100%; display: block; border-radius: 16px;
                       border: 1px solid rgba(20,83,45,0.12); box-shadow: 0 20px 50px -24px rgba(20,40,28,0.4); }
        .gg-flow-phone { width: 100%; display: block;
                         filter: drop-shadow(0 22px 34px rgba(20,40,28,0.4)); }
        .gg-flow-actions { display: flex; align-items: center; justify-content: center; gap: 22px;
                           flex-wrap: wrap; margin-top: 52px; }
        .gg-flow-cta { display: inline-flex; align-items: center; gap: 8px; background: #4D9A2A; color: #fff;
                       font-weight: 700; font-size: 15px; padding: 13px 26px; border-radius: 999px;
                       text-decoration: none; }
        .gg-flow-cta:hover { background: #438723; }
        .gg-flow-demo { font-size: 14.5px; font-weight: 700; color: ${INK}; text-decoration: none; }
        .gg-flow-demo:hover { text-decoration: underline; }
        .gg-flow-fine { text-align: center; font-size: 12.5px; color: #8A978D; margin: 12px 0 0; }

        .gg-flow-story { max-width: 1140px; margin: 26px auto 0; border-radius: 26px; overflow: hidden;
                         display: grid; grid-template-columns: 0.92fr 1.08fr; min-height: 620px;
                         background: #fff; border: 1px solid rgba(20,83,45,.10);
                         box-shadow: 0 24px 64px -40px rgba(21,40,28,.45); }
        .gg-flow-storycopy { position: relative; z-index: 2; min-width: 0; padding: 30px 30px 26px; display: flex;
                             flex-direction: column; background: linear-gradient(145deg, var(--gg-soft), #fff 68%); }
        .gg-flow-storykicker { display: inline-flex; align-items: center; gap: 8px; width: fit-content;
                               padding: 7px 11px; border-radius: 999px; background: #fff;
                               color: var(--gg-accent); font-size: 11px; line-height: 1; font-weight: 850;
                               letter-spacing: .10em; text-transform: uppercase; border: 1px solid rgba(20,83,45,.10); }
        .gg-flow-storykicker .gg-flow-glyph { width: 17px !important; height: 17px !important; }
        .gg-flow-storyh { position: relative; width: fit-content; font-family: var(--font-bricolage), sans-serif;
                          font-weight: 800; font-size: 36px; line-height: 1.04; letter-spacing: -.04em; color: ${INK};
                          margin: 17px 0 19px; }
        .gg-flow-storyh:after { content: ''; position: absolute; left: 0; bottom: -9px; width: 62px; height: 4px;
                                border-radius: 999px; background: linear-gradient(90deg, var(--gg-accent), #8BD72D); }
        .gg-flow-storyp { position: static; width: 100%; box-sizing: border-box; white-space: normal;
                          font-size: 14.5px; line-height: 1.55; color: #56655B; margin: 0 0 18px;
                          padding: 0; border: 0; border-radius: 0; background: none; box-shadow: none; }
        .gg-flow-storyp:after { content: none; }
        .gg-flow-storytalk { position: relative; padding: 17px 18px 19px; border-radius: 26px 26px 26px 8px;
                             background: linear-gradient(145deg, #fff 36%, var(--gg-soft));
                             border: 1px solid color-mix(in srgb, var(--gg-accent) 20%, transparent);
                             box-shadow: 0 22px 46px -34px rgba(14,45,25,.55); }
        .gg-flow-storytalk:before { content: '“'; position: absolute; z-index: 0; right: 18px; top: 4px;
                                    color: var(--gg-accent); opacity: .11; font-family: Georgia, serif;
                                    font-size: 68px; line-height: 1; pointer-events: none; }
        .gg-flow-storytalk:after { content: ''; position: absolute; left: 42%; bottom: -13px; width: 24px; height: 24px;
                                   background: color-mix(in srgb, #fff 78%, var(--gg-soft));
                                   border-right: 1px solid color-mix(in srgb, var(--gg-accent) 20%, transparent);
                                   border-bottom: 1px solid color-mix(in srgb, var(--gg-accent) 20%, transparent);
                                   transform: rotate(45deg); border-radius: 0 0 5px 0; }
        .gg-flow-storytalkmoment { display: flex; align-items: center; gap: 10px; margin-bottom: 13px; }
        .gg-flow-storytalkicon { width: 34px; height: 34px; flex: 0 0 34px; display: grid; place-items: center;
                                 border-radius: 11px; color: #fff; background: var(--gg-accent); font-size: 17px; }
        .gg-flow-storytalkmoment small { display: block; color: var(--gg-accent); font-size: 8.5px; font-weight: 900;
                                         letter-spacing: .11em; text-transform: uppercase; }
        .gg-flow-storytalkmoment strong { display: block; color: ${INK}; margin-top: 2px; font-size: 13px; line-height: 1.28; }
        .gg-flow-storymetric { display: flex; align-items: center; gap: 15px; padding: 15px 17px;
                               border-radius: 19px; background: rgba(255,255,255,.94);
                               border: 1px solid rgba(20,83,45,.12); box-shadow: 0 16px 34px -30px rgba(5,18,10,.55); }
        .gg-flow-storymetric strong { flex: 0 0 auto; color: var(--gg-accent); font-family: var(--font-bricolage), sans-serif;
                                      font-size: 30px; font-weight: 850; line-height: 1; letter-spacing: -.04em; }
        .gg-flow-storymetric span { color: ${INK}; font-size: 12.5px; font-weight: 750; line-height: 1.35; }
        .gg-flow-storypoints { display: grid; gap: 8px; margin: 14px 0 0; }
        .gg-flow-storypoint { display: flex; align-items: flex-start; gap: 9px; color: #45564A;
                              font-size: 13px; line-height: 1.4; }
        .gg-flow-storycheck { width: 19px; height: 19px; flex: 0 0 19px; display: grid; place-items: center;
                              border-radius: 999px; background: var(--gg-soft); color: var(--gg-accent);
                              font-size: 12px; font-weight: 900; }
        .gg-flow-storyactions { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-top: 0; }
        .gg-flow-storycta { display: inline-flex; align-items: center; padding: 12px 19px; border-radius: 999px;
                            background: var(--gg-accent); color: #fff; font-size: 13.5px; font-weight: 800;
                            text-decoration: none; box-shadow: 0 12px 24px -17px var(--gg-accent); }
        .gg-flow-storydemo { color: ${INK}; font-size: 13px; font-weight: 800; text-decoration: none; }
        .gg-flow-storyvisual { position: relative; min-width: 0; min-height: 620px; padding: 26px 22px 14px;
                               display: flex; flex-direction: column; justify-content: flex-start; gap: 10px;
                               background: radial-gradient(circle at 88% 10%, #fff 0, transparent 28%), var(--gg-soft); }
        .gg-flow-storyvisual > .gg-flow-storymetric { width: min(84%, 480px); margin: 0 auto 3px; }
        .gg-flow-storyvisual > .gg-flow-storyp { position: relative; width: min(86%, 500px); margin: 0 auto 13px;
                                                padding: 13px 17px; border: 1px solid rgba(20,83,45,.13);
                                                border-radius: 19px 19px 19px 7px; background: rgba(255,255,255,.94);
                                                color: #405247; box-shadow: 0 18px 36px -31px rgba(5,18,10,.55); }
        .gg-flow-storyvisual > .gg-flow-storyp:after { content: ''; position: absolute; left: 34px; bottom: -9px;
                                                       width: 17px; height: 17px; background: #fff;
                                                       border-right: 1px solid rgba(20,83,45,.13);
                                                       border-bottom: 1px solid rgba(20,83,45,.13);
                                                       transform: rotate(45deg); border-radius: 0 0 4px 0; }
        .gg-flow-storyapp { position: relative; flex: 0 0 auto; padding: 48px 14px 14px; border-radius: 20px;
                            background: rgba(255,255,255,.92); border: 1px solid rgba(20,83,45,.11);
                            box-shadow: 0 22px 48px -35px rgba(5,18,10,.55); overflow: hidden; }
        .gg-flow-storyapp:after { content: ''; position: absolute; right: -48px; top: -58px; width: 160px;
                                  height: 160px; border-radius: 999px;
                                  background: color-mix(in srgb, var(--gg-accent) 12%, transparent); pointer-events: none; }
        .gg-flow-storyapplabel { position: absolute; z-index: 3; right: 15px; top: 16px; color: var(--gg-accent);
                                 font-size: 9.5px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
        .gg-flow-storyphoto { position: relative; flex: 0 0 auto; height: 220px; margin-top: -2px;
                              overflow: hidden; border-radius: 20px; background: #fff;
                              border: 1px solid rgba(20,83,45,.10); box-shadow: 0 22px 44px -32px rgba(5,18,10,.58); }
        .gg-flow-storycopy .gg-flow-storyphoto { height: auto; aspect-ratio: 3 / 2; margin: 17px 0 19px; }
        .gg-flow-storypeople { display: block; width: 100%; height: 100%; object-fit: cover;
                               transition: opacity .28s ease, transform .55s ease; }
        .gg-flow-storyphoto:hover .gg-flow-storypeople { transform: scale(1.015); }
        .gg-flow-storystage { position: absolute; z-index: 4; left: 14px; top: 14px; color: var(--gg-accent);
                              font-size: 10.5px; font-weight: 900; letter-spacing: .13em; padding: 8px 11px;
                              border-radius: 999px; background: var(--gg-soft);
                              border: 1px solid color-mix(in srgb, var(--gg-accent) 18%, transparent); }
        .gg-flow-storyphototag { position: absolute; z-index: 3; right: 12px; bottom: 11px; padding: 7px 10px;
                                 border-radius: 999px; color: #fff; background: rgba(9,35,20,.67);
                                 backdrop-filter: blur(9px); border: 1px solid rgba(255,255,255,.26);
                                 font-size: 9px; font-weight: 850; letter-spacing: .10em; text-transform: uppercase; }
        .gg-flow-storyshots { width: 100%; margin: 0; position: relative; z-index: 1; }
        .gg-flow-storyshots > .gg-flow-storyweb-btn { width: 94%; margin-left: auto; }
        .gg-flow-storyweb { width: 100%; display: block; border-radius: 14px; border: 1px solid rgba(255,255,255,.72);
                            box-shadow: 0 24px 44px -28px rgba(5,18,10,.60); }
        .gg-flow-storyshots > .gg-flow-storyphone-btn { width: 94px; right: 0; bottom: -7px; }
        .gg-flow-storyphone { position: static; width: 100%; display: block;
                              filter: drop-shadow(0 18px 22px rgba(5,18,10,.34)); }
        .gg-flow-storyproof { position: absolute; z-index: 3; left: 0; bottom: 8px; width: 178px;
                              padding: 13px 15px; border-radius: 15px; background: rgba(255,255,255,.94);
                              border: 1px solid rgba(20,83,45,.10); box-shadow: 0 18px 34px -22px rgba(20,40,28,.55);
                              backdrop-filter: blur(10px); }
        .gg-flow-storyproof span { display: block; color: #718077; font-size: 10px; font-weight: 800;
                                   letter-spacing: .08em; text-transform: uppercase; }
        .gg-flow-storyproof strong { display: block; color: var(--gg-accent); font-size: 18px;
                                     line-height: 1.1; margin: 5px 0 3px; }
        .gg-flow-storyproof small { display: block; color: #5F6D63; font-size: 10.5px; line-height: 1.35; }
        .gg-flow-storythought { position: relative; z-index: 5; align-self: flex-start; max-width: 285px;
                                display: flex; align-items: center; gap: 10px; margin: -3px 0 -25px 24px;
                                padding: 11px 15px 12px 12px; border-radius: 18px 18px 18px 5px;
                                background: var(--gg-accent); color: #fff;
                                box-shadow: 0 18px 34px -22px var(--gg-accent); }
        .gg-flow-storythought:after { content: ''; position: absolute; left: 22px; bottom: -10px;
                                     border-top: 12px solid var(--gg-accent); border-right: 12px solid transparent; }
        .gg-flow-storythoughticon { width: 32px; height: 32px; flex: 0 0 32px; display: grid; place-items: center;
                                    border-radius: 11px; background: rgba(255,255,255,.18); font-size: 17px; }
        .gg-flow-storythought small { display: block; margin-bottom: 2px; font-size: 8.5px; font-weight: 850;
                                      letter-spacing: .11em; text-transform: uppercase; opacity: .76; }
        .gg-flow-storythought strong { display: block; font-size: 13px; line-height: 1.25; }
        .gg-flow-storyfine { flex: 0 0 auto; text-align: right; color: #728077; font-size: 9.5px; }
        @keyframes gg-story-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .gg-flow-storyapp, .gg-flow-storythought, .gg-flow-storyphoto { animation: gg-story-rise .38s ease both; }
        .gg-flow-storythought { animation-delay: .06s; }
        .gg-flow-storyphoto { animation-delay: .11s; }
        @media (prefers-reduced-motion: reduce) {
          .gg-flow-storyapp, .gg-flow-storythought, .gg-flow-storyphoto { animation: none; }
          .gg-flow-storypeople { transition: none; }
        }

        @media (max-width: 980px) {
          .gg-flow-grid { flex-direction: column; align-items: stretch; gap: 24px; }
          .gg-flow-left { flex: none; }
          .gg-flow-row { flex-wrap: wrap; justify-content: center; gap: 16px 4px; }
          .gg-flow-step { flex: 0 0 88px; }
          .gg-flow-loop { display: none; }
          .gg-flow-card { flex-direction: column; padding: 26px 22px; gap: 26px; }
          .gg-flow-cardtext { flex: none; }
          .gg-flow-mini { max-width: none; }
          .gg-flow-actions { margin-top: 44px; }
          .gg-flow-story { grid-template-columns: 1fr; }
          .gg-flow-storycopy { padding: 32px 28px; }
          .gg-flow-storyp { width: 100%; white-space: normal; overflow: visible; text-overflow: clip; }
          .gg-flow-storyvisual { min-height: 560px; }
          .gg-flow-storyvisual > .gg-flow-storymetric,
          .gg-flow-storyvisual > .gg-flow-storyp { width: 100%; }
          .gg-flow-storycopy .gg-flow-storyphoto { height: auto; }
        }
        @media (max-width: 560px) {
          .gg-flow { padding: 24px 16px 22px; }
          .gg-flow-h { font-size: 25px; }
          .gg-flow-step { flex: 0 0 76px; }
          .gg-flow-puck { width: 54px; height: 54px; }
          .gg-flow-cardh { font-size: 25px; }
          .gg-flow-phone { width: 96px; bottom: -18px; }
          .gg-flow-actions { margin-top: 34px; gap: 14px; }
          .gg-flow-storyh { font-size: 30px; }
          .gg-flow-storycopy { padding: 28px 21px; }
          .gg-flow-storyvisual { min-height: 480px; padding: 12px 12px 9px; }
          .gg-flow-storyapp { padding: 46px 10px 12px; border-radius: 16px; }
          .gg-flow-storyphoto { height: 225px; border-radius: 16px; }
          .gg-flow-storycopy .gg-flow-storyphoto { height: auto; margin-top: 17px; }
          .gg-flow-storytalk { padding: 14px 14px 16px; border-radius: 21px; }
          .gg-flow-storystage { left: 10px; top: 10px; }
          .gg-flow-storyapplabel { right: 11px; top: 14px; }
          .gg-flow-storyshots > .gg-flow-storyweb-btn { width: 90%; }
          .gg-flow-storyshots > .gg-flow-storyphone-btn { width: 72px; right: -1px; bottom: -5px; }
          .gg-flow-storyproof { left: 0; bottom: 5px; width: 145px; padding: 10px 11px; }
          .gg-flow-storythought { max-width: 245px; margin-left: 14px; }
        }
      `}</style>

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

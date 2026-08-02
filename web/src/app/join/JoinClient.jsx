'use client'
// /join — the paid-social landing page.
//
// LAYOUT, as of the 2026-07-31 mockup pass. The page now runs in the mockup's
// order, and the proof-heavy sections were moved to the bottom near the footer
// on request:
//
//   1  Hero                     ask + real product shot + trust bar
//   2  Know what you bought     bank line vs the whole basket vs why it matters
//   3  How it works             the four steps
//   4  Everything you need      six feature tiles
//   5  Why people choose it     the compact ✓/✗ competitor matrix
//   6  Three things it catches  subscription creep · return window · bank fees
//   7  Voices + security        real quotes beside the security card
//   8  FAQ                      the six an ad visitor asks first
//   ── everything below is the proof stack, bottom of page ──
//   8  Demo account             published credentials + what is really inside
//   9  Why should I?            · goal-card rails
//  10  Vs a spreadsheet         · vs the apps you have heard of
//  11  Guac-AI                  GuacScore / GuacWizard / Bank Bite
//  12  In their words           (renders nothing while VOICES is empty)
//  13  Closing CTA              then the shared MarketingFooter
//
// HOW THIS DIFFERS FROM /start: /start is the stripped one-screen version —
// nothing on it but a signup. Keep both; they are the A/B pair for the ad.
//
// The nav and footer come from MarketingShell, mounted in page.jsx. See the
// note there — this page had neither by design until 2026-07-31, and the
// reason is still live.
//
// ⚠️ HONESTY: the mockup this page is shaped from leans on "180K+ MEMBERS",
// "4.8/5 from 10,000+ happy users" and a fabricated dashboard screenshot. We
// have none of those. Every claim here is a capability that is true today — it
// is free, there is no card, it reads receipts you already get, the data is
// RLS-locked and wipeable. Do NOT add member counts, ratings, or savings
// figures to this page. It is the first thing a stranger ever sees.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'
import MetaPixel from '../../components/MetaPixel'
import { trackClick } from '../../lib/track-click'
import GoogleG from '../../components/GoogleG'
import GuacMascot from '../../components/GuacMascot'
import { CARDS } from '../../components/GoalsShowcase'
import GoalCard from '../../components/GoalCard'
import JoinGuacChat from '../../components/JoinGuacChat'
// Line icons, added 2026-07-31 with the reskin. The mockup's "premium" read
// comes almost entirely from these — emoji at 28px is the single biggest
// tell that a page was assembled quickly. lucide-react was already a
// dependency (see /faq), so this costs nothing new.
import {
  Landmark, Lock, Trash2, Smartphone,
  Receipt, Scissors, ListChecks, BarChart3,
  Camera, Brain, TrendingUp, CalendarClock, PiggyBank,
  ShieldCheck, RefreshCw, Check, Star, X, Car, FileText, LayoutGrid,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }
const INK = '#0B1410'

// The demo account is deliberately public — /login?demo=1 prefills it behind a
// Turnstile check. Showing the credentials outright means someone who wants to
// look before they sign up never has to hunt for them.
const DEMO = { email: 'demo@getguac.app', password: 'Guac!Demo2026' }

// What is ACTUALLY in that demo account, measured 2026-07-29 straight from the
// receipts table — not estimates, not marketing rounding. This is the page's
// only quantified claim and the closest thing to social proof we can make
// honestly: we have no user count or star rating worth showing (see the HONESTY
// note by the trust row), but we do have a real year of parsed spending that
// any visitor can log in and audit line by line.
//
// These drift as the demo account grows. Re-measure before quoting new figures:
//   receipts    -> count(*)            where user_id = demo
//   stores      -> distinct store_name where user_id = demo
//   line items  -> count(*) receipt_items for those receipts
//   sales tax   -> sum(tax_paid)       where user_id = demo
// Do NOT hand-edit these upward. A number on this page has to survive someone
// signing into the demo and checking it.
const DEMO_STATS = [
  ['163', 'receipts parsed'],
  ['51', 'different stores'],
  ['226', 'line items read'],
  ['$309.06', 'sales tax tagged'],
]

// Cards recur down the page rather than living in one strip: three per rail,
// walked in order, so a scroller keeps meeting a new thing GetGuac does.
// There is one rail slot per section break below — enough to show every card
// exactly once. Out-of-range slots render nothing, so adding or removing cards
// degrades quietly instead of duplicating or dropping one silently.
// Rails 0-2 used to be ONE sentence split across three headings ("I want to…" /
// "…without thinking about it" / "…and keep more of it"). Rail 0 is now a
// question, so the next two can no longer be dangling ellipses — they were
// rewritten to stand on their own.
const RAIL_TITLES = [
  'How can Guac-AI help today?',
  'Handled without you thinking about it',
  'Keep more of what you earn',
  // No trailing period — every other rail title goes without one.
  // NOT "Turn every receipt into savings": that exact line is already the STEPS
  // heading further down this same page.
  'Make every dollar go further',
  'The bits that pay for themselves',
  // "More ways to save every day" was the suggested winner, but this rail is
  // bills · GuacMoney · Guac-AI · the arcade — only one of those is a saving
  // mechanism, and the two rails above it already say "save"/"every dollar".
  // "More than receipt scanning" is the one option that actually fits the cards.
  'More than receipt scanning',
]
// Three cards per slot, except the last, which takes everything left over —
// CARDS is not a multiple of three, and a leftover card would otherwise be the
// one feature that silently never appears on the page.
const rail = (n) => (n === RAIL_TITLES.length - 1 ? CARDS.slice(n * 3) : CARDS.slice(n * 3, n * 3 + 3))

export default function JoinClient() {
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState('')
  const [showBar, setShowBar] = useState(false)
  const [featureCanPrev, setFeatureCanPrev] = useState(false)
  const [featureCanNext, setFeatureCanNext] = useState(true)
  const heroCtaRef = useRef(null)
  const featureScrollRef = useRef(null)
  const featureScrollFrame = useRef(null)
  const featureScrollSpeed = useRef(0)

  function stopFeatureScroll() {
    featureScrollSpeed.current = 0
    if (featureScrollFrame.current) cancelAnimationFrame(featureScrollFrame.current)
    featureScrollFrame.current = null
  }

  function runFeatureScroll() {
    const track = featureScrollRef.current
    if (!track || !featureScrollSpeed.current) return stopFeatureScroll()
    const max = Math.max(0, track.scrollWidth - track.clientWidth)
    const next = Math.min(max, Math.max(0, track.scrollLeft + featureScrollSpeed.current))
    if (Math.abs(next - track.scrollLeft) < 0.5) return stopFeatureScroll()
    track.scrollLeft = next
    featureScrollFrame.current = requestAnimationFrame(runFeatureScroll)
  }

  function updateFeatureNav() {
    const track = featureScrollRef.current
    if (!track) return
    const max = Math.max(0, track.scrollWidth - track.clientWidth)
    setFeatureCanPrev(track.scrollLeft > 3)
    setFeatureCanNext(track.scrollLeft < max - 3)
  }

  function moveFeatureRail(direction) {
    const track = featureScrollRef.current
    if (!track) return
    stopFeatureScroll()
    const card = track.firstElementChild
    const step = card ? card.getBoundingClientRect().width + 12 : track.clientWidth * 0.75
    const max = Math.max(0, track.scrollWidth - track.clientWidth)
    track.scrollLeft = Math.min(max, Math.max(0, track.scrollLeft + direction * step))
    requestAnimationFrame(updateFeatureNav)
  }

  function handleFeaturePointerMove(event) {
    // Touch devices use native momentum swiping. Edge-hover scrolling is only
    // useful for a precise mouse/trackpad pointer.
    if (event.pointerType && event.pointerType !== 'mouse') return
    const track = featureScrollRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const edge = Math.min(120, rect.width * 0.2)
    const fromLeft = event.clientX - rect.left
    const fromRight = rect.right - event.clientX
    let speed = 0
    if (fromRight < edge) speed = Math.max(1.5, (1 - fromRight / edge) * 9)
    else if (fromLeft < edge) speed = -Math.max(1.5, (1 - fromLeft / edge) * 9)
    featureScrollSpeed.current = speed
    if (speed && !featureScrollFrame.current) featureScrollFrame.current = requestAnimationFrame(runFeatureScroll)
    if (!speed) stopFeatureScroll()
  }

  function handleFeatureCardEnter(event) {
    const track = featureScrollRef.current
    const card = event.currentTarget
    if (!track || !card || window.matchMedia('(hover: none)').matches) return
    const trackRect = track.getBoundingClientRect()
    const cardRect = card.getBoundingClientRect()
    // Hovering the last visible card continuously advances the rail. A single
    // smooth scrollBy() was unreliable here: once the card moved, no new mouse
    // event was guaranteed, so the rail often stopped after one card (or never
    // visibly moved at all). Keep one animation frame loop running until the
    // pointer leaves the rail or the scroll boundary is reached.
    if (cardRect.right >= trackRect.right - cardRect.width * 0.35 && track.scrollLeft < track.scrollWidth - track.clientWidth - 2) {
      featureScrollSpeed.current = 3.5
      if (!featureScrollFrame.current) featureScrollFrame.current = requestAnimationFrame(runFeatureScroll)
    } else if (cardRect.left <= trackRect.left + cardRect.width * 0.35 && track.scrollLeft > 2) {
      featureScrollSpeed.current = -3.5
      if (!featureScrollFrame.current) featureScrollFrame.current = requestAnimationFrame(runFeatureScroll)
    }
  }

  useEffect(() => {
    const track = featureScrollRef.current
    if (!track) return () => stopFeatureScroll()
    updateFeatureNav()
    const observer = new ResizeObserver(updateFeatureNav)
    observer.observe(track)
    track.addEventListener('scroll', updateFeatureNav, { passive: true })
    return () => {
      stopFeatureScroll()
      observer.disconnect()
      track.removeEventListener('scroll', updateFeatureNav)
    }
  }, [])

  // The sticky bar is a second chance at the CTA, not a competitor to it: it
  // shows exactly when the hero's own buttons are NOT on screen.
  //
  // Watching the buttons rather than a scroll threshold matters on a phone —
  // the hero is taller than a 900px viewport, so the buttons start off screen
  // and a fixed threshold would leave the whole first screen with no CTA at
  // all. This way the bar is already up on load there, and stays out of the
  // way on a desktop where the buttons are visible.
  useEffect(() => {
    const el = heroCtaRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  async function oauth(provider) {
    setBusy(provider); setErr('')
    trackClick(`join-signup-${provider}`)
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      })
      // No conversion event here, and there must never be one. This fires the
      // instant we hand off to Google, BEFORE consent — and this button signs
      // EXISTING users in too, so a fire here counts both abandoned consent
      // screens and every returning user as a fresh registration.
      //
      // ✅ The gap this used to leave is now CLOSED, server-side: the account
      // is created in /auth/callback, and that route fires CompleteRegistration
      // through the Conversions API on the new-account branch only. See
      // lib/meta-capi.js. Inert until FB_CAPI_TOKEN is set in Vercel.
      if (error) { setErr(error.message); setBusy('') }
    } catch (e) {
      setErr(e?.message || `Could not start ${provider} sign in`)
      setBusy('')
    }
  }

  async function copy(what, value) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(what)
      setTimeout(() => setCopied(''), 1600)
    } catch { /* clipboard blocked — the value is on screen to read anyway */ }
  }

  const authBtn = 'gj-authbtn'

  return (
    // <div>, not <main>: MarketingShell already renders the page's <main>, and
    // nesting a second one is invalid HTML (and gives screen readers two
    // "main" landmarks to choose between).
    <div style={{ background: '#fff', overflowX: 'hidden' }}>
      {/* Mounted here rather than in the root layout so the ad tracker exists
          only on the ad landing pages, never on a signed-in receipts page. */}
      <MetaPixel />
      <JoinGuacChat />

      {/* ── 1. HERO ───────────────────────────────────────────────────────
          Light ground, copy left, product shot right, trust bar underneath.
          🔑 Why light and not the old near-black: app/page.jsx, the homepage,
          has ALWAYS been light with a green CTA. /join was the only dark page
          on the site, so an ad visitor who clicked through to the homepage met
          a different product. Everything below the fold was already light, so
          the dark hero also created a hard seam right at the fold.
          🔒 NOT taken from the mockup's hero, and not to be "restored" later:
            • pill "The only app that knows what you actually bought" — FALSE.
              Fetch and Ibotta both read item-level data and BOTH ARE NAMED IN
              OUR OWN COMPARISON TABLE further down this page.
            • "4.8/5 from 10,000+ happy users" — 10 accounts, and the App Store
              rating count is ZERO (itunes lookup id 6790993237).
            • three stock-photo avatars captioned "Trusted by families".
            • "Setup in 60 seconds" — nobody has timed it. Same reason the
              suggested "takes less than 30 seconds" was cut from the check row.
          ⚠️ Also not built: the mockup's two handwritten-script callouts
          ("See what others miss." / "Know what you actually bought."). They
          need a fourth typeface the site does not load, and the second one
          repeats the section heading immediately below it verbatim. */}
      <section style={{ background: 'linear-gradient(180deg,#FFFFFF 0%,#F5FAEC 100%)', borderBottom: '1px solid rgba(101,163,13,0.16)', padding: '30px 20px 26px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>

          <div className="gj-herorow">
            {/* ── LEFT: the whole ask ─────────────────────────────────── */}
            <div className="gj-heroleft">
              <div className="gj-aipill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F0F7E8', color: '#4D7C0F', border: '1px solid rgba(101,163,13,0.2)', padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#84CC16', boxShadow: '0 0 0 3px rgba(132,204,22,0.25)' }} /> Guac-AI · personal finance assistant
              </div>

              {/* CONTRAST HEADLINE — from the mockup, which proposed "Your bank
                  shows transactions. Guac shows your life." Two changes:
                    • "what you bought", not "your life" — the mockup's rhythm
                      is better but promises nothing checkable, and the page
                      below now PROVES the literal claim (receipt panel, the
                      items column of the table, the FAQ).
                    • "GetGuac", not "Guac" — on this site "guac" separately
                      means MONEY ("Keep More Guac in Your Pocket"), so "Guac
                      shows" makes the guacamole the subject.
                  Previous h1s, newest first: "Stop wondering where your money
                  went." (revert candidate #1), "Your money's been talking /
                  GetGuac is listening", "Keep more of your own money. Get the
                  whole family organized.", a three-losses gap-opener, "Keep
                  more of your own money. Get Organized.", "Every Dollar
                  Counts. Keep More of Yours.", "Every Dollar Counts. Start
                  Saving Today with GetGuac."
                  ⚠️ REJECTED ON HONESTY and worth not re-discovering: "Stop
                  Overspending Without Tracking Everything Manually". GetGuac
                  has no bank linking, so every receipt is photographed or
                  forwarded BY HAND — against a bank-linked competitor we are
                  the MORE manual product. */}
              <h1 className="gj-subline" style={{ ...DISPLAY, fontWeight: 800, color: '#15281C', fontSize: 44, lineHeight: 1.08, letterSpacing: '-0.035em', margin: '18px 0 0' }}>
                Your bank shows transactions.{' '}
                <span style={{ color: '#4D7C0F' }}>GetGuac shows what you bought.</span>
              </h1>

              {/* The description, not atmosphere. Every clause is backed:
                    scan or forward  → api/parse-receipt, lib/email-to-receipt.js
                    sorts purchases  → lib/auto-categorize.js
                    subscriptions    → lib/subscription-tracker.js
                    bank fees        → the shipped Bank Bite tile
                  🔒 NOT included, though it has been asked for twice: "build a
                  smarter budget". There is NO budgeting feature — `budget` in
                  this repo is a game mechanic (Budget Tetris) and article prose.
                  🔒 Also NOT included: "spot price increases". There is no
                  per-item price history (no unit_price / item_price / price_per
                  anywhere in lib/). Subscription price creep is the one
                  price-change claim that holds, and it is the clause below. */}
              <p className="gj-snitch" style={{ fontSize: 17.5, fontWeight: 500, lineHeight: 1.55, color: '#4A5A50', margin: '16px 0 0', maxWidth: 520 }}>
                Scan or forward a receipt — Guac-AI sorts every purchase, surfaces the
                subscriptions you forgot, and shows what your bank quietly took.
              </p>

              {/* THE ASK. Google is deliberately the primary: it is the one
                  route that costs a cold visitor nothing but a tap, against six
                  fields, a CAPTCHA and a confirmation email on /register. The
                  email path survives as the text link underneath, which still
                  fires the join-signup-email counter.
                  The secondary "See how it works" is the mockup's second hero
                  button. It only earns its place now that the nav exists — on
                  the nav-free version of this page it was the sole exit. */}
              <div className="gj-heroauthstack" ref={heroCtaRef}>
                <div className="gj-heroctas">
                  <button type="button" onClick={() => oauth('google')} disabled={!!busy}
                    className={authBtn}
                    style={{
                      background: '#65A30D', color: '#fff',
                      padding: '17px 26px', fontSize: 17, fontWeight: 800,
                      boxShadow: '0 14px 28px -12px rgba(101,163,13,0.7)',
                      // authBtn is width:100%; without a cap the button spans the
                      // whole 540px column and stops reading as a button.
                      width: '100%', maxWidth: 320,
                    }}>
                    {busy === 'google' ? 'Opening Google…' : (
                      <>
                        <span aria-hidden style={{ display: 'inline-flex', background: '#fff', borderRadius: 999, padding: 4 }}><GoogleG size={18} /></span>
                        Start free with Google
                      </>
                    )}
                  </button>
                  <div className="gj-herosecondary">
                    <Link href="/how-it-works" onClick={() => trackClick('join-how-it-works')}
                      className={authBtn}
                      style={{ background: '#fff', color: '#15281C', border: '1.5px solid rgba(20,83,45,0.16)', padding: '15px 10px', fontSize: 14, textDecoration: 'none' }}>
                      <span aria-hidden style={{ display: 'inline-flex' }}>
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#4D7C0F" strokeWidth="2" aria-hidden>
                          <circle cx="12" cy="12" r="10" /><path d="M10 8l6 4-6 4V8z" fill="#4D7C0F" stroke="none" />
                        </svg>
                      </span>
                      See how it works
                    </Link>
                    <Link href="/login?demo=1" onClick={() => trackClick('join-hero-demo')}
                      className={authBtn}
                      style={{ background: '#F0F7E8', color: '#4D7C0F', border: '1.5px solid rgba(101,163,13,0.24)', padding: '15px 10px', fontSize: 14, textDecoration: 'none' }}>
                      <span aria-hidden>🥑</span>
                      Try the demo
                    </Link>
                  </div>
                </div>

                {/* ⚠️ HONESTY: all three are verified, not aspirational.
                      "Free forever"  — there is no payment code in the repo at
                                        all (no Stripe, no checkout, no tier).
                      "No card"       — follows from the above.
                      "One tap"       — Google OAuth needs no fields.
                    The mockup's fourth check was "Setup in 60 seconds"; a
                    suggested "takes less than 30 seconds" was CUT for the same
                    reason — nobody has timed it, and the callback does profile
                    + mailbox provisioning before the dashboard paints. Do not
                    add a duration here until someone measures one. */}
                <div className="gj-checks">
                  {['Free forever', 'No card required', 'One tap'].map((t) => (
                    <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13.5, fontWeight: 700, color: '#4D7C0F' }}>
                      <span aria-hidden>✓</span>{t}
                    </span>
                  ))}
                </div>

                {/* Ink badges, matching the homepage. The old white ones existed
                    only because the hero used to be near-black.
                    MOVED here on request 2026-07-31 — they sat under the phone
                    in the right column. Below the Google button they read as
                    the other two ways in, right where the reader has just
                    decided to start. */}
                <div className="gj-badges" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <a href="https://apps.apple.com/us/app/getguac/id6790993237" target="_blank" rel="noopener noreferrer" onClick={() => trackClick('join-app-store')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#0B1410', color: '#fff', padding: '9px 18px 9px 14px', borderRadius: 12, textDecoration: 'none' }}>
                    <svg viewBox="0 0 384 512" width="22" height="22" fill="#fff" aria-hidden="true"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.7-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" /></svg>
                    <span><span style={{ display: 'block', fontSize: 10.5, opacity: 0.62, lineHeight: 1.2 }}>Download on the</span><span style={{ display: 'block', fontSize: 17, fontWeight: 700, lineHeight: 1.15 }}>App Store</span></span>
                  </a>
                  <a href="https://play.google.com/store/apps/details?id=app.getguac.getguac" target="_blank" rel="noopener noreferrer" onClick={() => trackClick('join-google-play')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#0B1410', color: '#fff', padding: '9px 18px 9px 14px', borderRadius: 12, textDecoration: 'none' }}>
                    <svg viewBox="0 0 512 512" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M48 32 288 256 48 480c-10-6-16-17-16-30V62c0-13 6-24 16-30z" /><path fill="#34A853" d="M48 32c5-3 11-5 17-5 6 0 12 2 18 5l260 148-55 76z" /><path fill="#FBBC04" d="M288 256l55-76 92 52c30 17 30 51 0 68l-92 52z" /><path fill="#EA4335" d="M288 256l55 76L83 480c-6 3-12 5-18 5-6 0-12-2-17-5z" /></svg>
                    <span><span style={{ display: 'block', fontSize: 10.5, opacity: 0.62, lineHeight: 1.2 }}>Get it on</span><span style={{ display: 'block', fontSize: 17, fontWeight: 700, lineHeight: 1.15 }}>Google Play</span></span>
                  </a>
                </div>

                <Link href="/register" onClick={() => trackClick('join-signup-email')}
                  style={{ display: 'inline-block', fontSize: 14, fontWeight: 700, color: '#4D7C0F', textDecoration: 'underline' }}>
                  or sign up with email
                </Link>

                {err && <p style={{ margin: 0, fontSize: 14, color: '#B91C1C' }}>{err}</p>}

                <p style={{ margin: 0, fontSize: 14, color: '#5F6D63' }}>
                  Already have an account?{' '}
                  <Link href="/login" style={{ color: '#15281C', fontWeight: 700 }}>Sign in</Link>
                </p>
              </div>
            </div>

            {/* ── RIGHT: the product ───────────────────────────────────── */}
            <div className="gj-hero-phone">
              {/* 🖼️ ONE SUPPLIED IMAGE WINS OVER THE WHOLE ASSEMBLY BELOW.
                  Save the composed hero — phone, both chips, arrows, avocado,
                  leaves — as web/public/join/hero.png and it replaces every
                  piece under it: the screenshot, the two callout chips, the
                  dashed arrows and the mascot. Nothing else to change.
                  Until that file exists the assembled version renders, so the
                  page is never broken mid-swap. See HeroArt for why it probes
                  the file rather than rendering an <img> and catching onError.
                  ⚠️ Needs a transparent background — the hero sits on a white
                  -> #F5FAEC gradient, so a PNG flattened onto white will show
                  a visible box at the bottom of the fade. */}
              <HeroArt>
              {/* The mockup's soft avocado behind the product shot. It is the
                  SAME 🥑 glyph the closing CTA already uses as a watermark, at
                  the same low opacity — not new artwork.
                  🔒 The mascot and the logo avocado are locked: no redraw, no
                  swap. The mockup's photorealistic halved-avocado render is a
                  design asset, not something to reproduce by hand in SVG, so
                  the watermark stands in for it. */}
              {/* 🔒 The LOCKED brand mascot (components/GuacMascot.jsx), used
                  as-is. Not a redraw and not the 🥑 glyph — the emoji is the
                  platform's own artwork and renders as three different
                  avocados across Windows, Apple and Android. Sits behind the
                  screenshot and is pointer-events:none, so it can never eat a
                  tap meant for the hero. */}
              <span aria-hidden className="gj-heroavo"><GuacMascot expression="happy" size={200} /></span>

              {/* The mockup's two pointer callouts, as boxed chips with an
                  icon and a dashed arrow — they were plain handwritten text
                  before. Both labels are the mockup's own wording.
                  ⚠️ "Knows what you actually bought" is deliberately close to
                  the section heading two screens down ("Know what you bought.
                  Not just where you spent."). That repetition was flagged and
                  kept on request: a 13px chip pinned to a phone and a 34px
                  section heading are different enough registers that it reads
                  as a refrain rather than a duplicate. If the page ever feels
                  like it says its best line twice, this chip is the one to
                  reword, not the heading.
                  Desktop only — below 1300px there is no clear ground beside
                  the phone and a chip would cover what it points at. */}
              <span aria-hidden className="gj-note gj-note-l">
                <span className="gj-notechip" style={{ background: '#F0F7E8', borderColor: 'rgba(101,163,13,0.28)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4D7C0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.2" fill="#4D7C0F" />
                  </svg>
                  Knows what you actually bought.
                </span>
                <svg viewBox="0 0 60 40" className="gj-notearrow" width="54" height="36" fill="none" stroke="#9CB49F" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <path d="M4 6c14 2 28 12 40 26" strokeDasharray="4 5" />
                  <path d="M36 32l8 2 1-8" />
                </svg>
              </span>
              <span aria-hidden className="gj-note gj-note-r">
                <span className="gj-notechip" style={{ background: '#FFF8E6', borderColor: 'rgba(180,120,20,0.28)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" />
                  </svg>
                  Finds what others miss.
                </span>
                <svg viewBox="0 0 60 40" className="gj-notearrow" width="54" height="36" fill="none" stroke="#9CB49F" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <path d="M56 6C42 8 28 18 16 32" strokeDasharray="4 5" />
                  <path d="M24 32l-8 2-1-8" />
                </svg>
              </span>

              {/* Guacanomics rather than the dashboard: phone-organized.webp
                  ends in a block of empty white above the tab bar, which reads
                  as a rendering fault in a hero. This screen is full to the
                  crop — GuacScore ring, the stat cards, then the spending chart
                  running off the bottom edge.
                  🔒 THIS IS A REAL SCREENSHOT AND MUST STAY ONE. The mockup's
                  phone showed a Spending Score of 78, "$3,128 this month" and
                  "Budget 6 of 8 on track" — none of which exists in the
                  product (there is no budgeting feature anywhere in this repo).
                  It was also internally inconsistent: the score card read
                  "spending 18% less than last month" directly above a card
                  reading "↑ 12% vs last month", with the rise coloured GREEN on
                  a spending figure. A fabricated hero screenshot is worse than
                  fabricated copy: it is the first thing seen and it sets an
                  expectation the real app fails thirty seconds after signup. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/home/goals/phone-guacscore.webp"
                alt="GetGuac on iPhone: a GuacScore of 74, net spent, refunds, bank fees, receipts and tax paid"
                width={340} height={716} loading="eager" className="gj-heroshot"
                style={{ width: 340, maxWidth: '82%', height: 'auto', display: 'block', filter: 'drop-shadow(0 30px 50px rgba(20,40,25,0.28))' }} />

              </HeroArt>
            </div>
          </div>

          {/* TRUST BAR — the mockup's four-badge strip, with our four true
              claims instead of its "Trusted by families" + stock avatars.
              🔑 THE BANK LINE LEADS ON PURPOSE. "We never ask for your bank
              login" is the strongest true claim on this entire site. It is
              verified, not spin: there is NO bank aggregation in this repo
              (grepped Plaid, Teller, Finicity, Yodlee, MX, TrueLayer, Akoya —
              zero integrations). It answers the first objection a cold
              finance-ad visitor has, so it goes first.
              ⚠️ "Encrypted in transit & at rest" is exactly what /security
              documents — TLS 1.3 in transit, AES-256 on disk. 🔒 Do NOT upgrade
              it into a staff-access claim ("only you can see it", "not even our
              engineers"). That shipped once, was FALSE, and was removed: 44
              files use the service-role key, which bypasses RLS. */}
          <div className="gj-trustbar">
            {[
              [Landmark, 'We never ask for your bank login'],
              [Lock, 'Encrypted in transit & at rest'],
              [Trash2, 'Delete everything in one click'],
              [Smartphone, 'iOS · Android · Web'],
            ].map(([Icon, t]) => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 13.5, fontWeight: 600, color: '#3D4F44' }}>
                <Icon size={17} strokeWidth={1.9} color="#4D7C0F" aria-hidden />{t}
              </span>
            ))}
          </div>

          {/* The ad script, in the ad's own voice — user-set copy 2026-07-29,
              kept verbatim. It sits under the trust bar so the CTA is not
              pushed down by it. */}
          <div className="gj-story">
            <p className="gj-storylede" style={{ fontSize: 17, lineHeight: 1.6, fontWeight: 600, color: '#3D4F44', margin: 0 }}>
              Give your family more savings with GetGuac. Simply scan or inbox a receipt, and
              GetGuac AI will uncover savings you may be missing every month. ✨
            </p>
            <p style={{ fontSize: 14.5, fontWeight: 700, color: '#4D7C0F', margin: '8px 0 0' }}>
              🍏 Free on iOS, Android and Web. No card required!!
            </p>
            <p style={{ margin: '12px 0 0', fontSize: 11.5, lineHeight: 1.7, color: '#6B7A70' }}>
              By creating an account you agree to our{' '}
              <Link href="/terms" style={{ color: '#4D7C0F' }}>Terms of Service</Link> and{' '}
              <Link href="/privacy" style={{ color: '#4D7C0F' }}>Privacy Policy</Link>. We never sell your data.
            </p>
          </div>
        </div>
      </section>

      {/* ── 2. KNOW WHAT YOU BOUGHT ───────────────────────────────────────
          The mockup's three-panel block: what other apps see, what GetGuac
          sees, and why the difference is worth anything. Moved directly under
          the hero 2026-07-31 — it is the single strongest argument on the page
          and it used to sit below two tables and six goal cards.
          ⚠️ THE ARITHMETIC IS LOAD-BEARING. BASKET sums to $121.56, tax is
          $8.64, and BOTH panels show $130.20. A page whose pitch is "we read
          receipts properly" cannot print a receipt that does not add up —
          anyone who checks stops believing the rest of the page too.
          Re-total it if you touch a line.
          🔒 Captioned as an example because it is one. It is not a screenshot
          and must not be dressed as one, it is not any user's real basket, and
          no "average household" statistic gets attached to it — we have 10
          accounts and no basis for one. */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 24px 0' }}>
        <div style={{ maxWidth: 820, marginBottom: 26 }}>
          {/* Benefit-shaped, not "And against the apps you know." (which named
              the comparison instead of the payoff).
              ⚠️ Two suggested alternates were rejected: "Most Budget Apps Track
              Spending. GetGuac Understands It." duplicates the Guac-AI h2 on
              this same page ("Most apps track. Guac-AI thinks."), and "Budget
              Beyond Bank Transactions" uses "budget" as a verb for a product
              with NO budgeting feature. */}
          <h2 className="gj-secth2" style={{ ...DISPLAY, fontWeight: 800, fontSize: 34, letterSpacing: '-0.03em', margin: '0 0 12px', color: '#15281C' }}>Know what you bought. Not just where you spent.</h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: '#56655B', margin: 0 }}>
            Most money apps only see the merchant and the total, because that is all a bank
            feed carries. GetGuac reads the receipt — so it knows the items, and it never
            asks for your bank login.
          </p>
        </div>

        <div className="gj-split3">
          {/* PANEL 1 — the bank line. stretch, not shrink-wrap: the empty half
              of this card IS the argument. */}
          <div className="gj-panel-thin" style={{ border: '1px solid rgba(190,80,80,0.22)', borderRadius: 18, background: '#FDF5F4', padding: '20px 22px' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A3412', marginBottom: 14 }}>Other apps see this</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, borderTop: '1px solid rgba(20,83,45,0.10)', borderBottom: '1px solid rgba(20,83,45,0.10)', padding: '14px 0' }}>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: '#15281C' }}>TARGET T-1247</span>
              {/* Bricolage on the amount, per the typography lock. A receipt
                  tempts a monospace face and the site does not have one. */}
              <span style={{ ...DISPLAY, fontSize: 21, fontWeight: 800, color: '#15281C' }}>$130.20</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: '#5F6D63', margin: '14px 0 0' }}>
              That is the whole record. One merchant, one number, one date — and no way to
              tell the milk from the sneakers.
            </p>
          </div>

          {/* PANEL 2 — the same receipt, read properly. */}
          <div style={{ position: 'relative', border: '2px solid rgba(101,163,13,0.45)', borderRadius: 18, background: '#EDF6DE', padding: '20px 22px' }}>
            {/* The mockup's "vs" chip. Absolutely positioned on this panel
                rather than being a third grid child, so it cannot claim a
                column of its own at any breakpoint. Hidden when the grid
                collapses — a "vs" between vertically stacked cards points at
                nothing. */}
            <span aria-hidden className="gj-vs" style={{ ...DISPLAY, position: 'absolute', left: -21, top: '50%', transform: 'translateY(-50%)', width: 42, height: 42, borderRadius: 999, background: INK, color: '#fff', fontSize: 13, fontWeight: 800, display: 'grid', placeItems: 'center', zIndex: 2 }}>vs</span>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4D7C0F', marginBottom: 14 }}>GetGuac sees this 🥑</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {BASKET.map(([item, cat, amt]) => (
                <li key={item} style={{ display: 'flex', alignItems: 'baseline', gap: 9, padding: '7px 0', borderTop: '1px solid rgba(101,163,13,0.20)' }}>
                  <span aria-hidden style={{ flex: '0 0 auto', color: '#4D7C0F', fontWeight: 700, fontSize: 13 }}>✔</span>
                  <span style={{ flex: '1 1 auto', minWidth: 0, fontSize: 14.5, lineHeight: 1.4, color: '#1F3312', fontWeight: 600 }}>{item}</span>
                  <span className="gj-basketcat" style={{ flex: '0 0 auto', fontSize: 11, fontWeight: 700, color: '#4D7C0F', background: '#fff', border: '1px solid rgba(101,163,13,0.30)', borderRadius: 999, padding: '2px 9px' }}>{cat}</span>
                  <span style={{ ...DISPLAY, flex: '0 0 auto', minWidth: 54, textAlign: 'right', fontSize: 14.5, fontWeight: 700, color: '#1F3312' }}>${amt}</span>
                </li>
              ))}
              <li style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: '1px solid rgba(101,163,13,0.20)', fontSize: 14, color: '#3D4F44' }}>
                <span>Sales tax</span>
                <span style={{ ...DISPLAY, fontWeight: 700 }}>$8.64</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', marginTop: 4, padding: '11px 0 0', borderTop: '2px solid rgba(101,163,13,0.42)' }}>
                <span style={{ ...DISPLAY, fontWeight: 800, fontSize: 15, color: '#15281C' }}>Total</span>
                <span style={{ ...DISPLAY, fontWeight: 800, fontSize: 21, color: '#15281C' }}>$130.20</span>
              </li>
            </ul>
          </div>

          {/* PANEL 3 — "Why it matters", new with the mockup pass. Without it
              the block proves a difference and never says what the difference
              buys you.
              🔒 EVERY LINE IS A SHIPPED BEHAVIOUR, not a benefit adjective:
                subscription creep → lib/subscription-tracker.js (flags a charge
                                     >5% above its prior average)
                return window      → api/notify/dispatch trigger 2, off
                                     refund_policies.expiry_date
                bank fees          → the Bank Bite tile, itemized per card
                categories         → lib/auto-categorize.js
              ⚠️ The mockup's second bullet was "Find duplicate purchases".
              CUT: there is no duplicate detection in this repo. Its fourth was
              "Save more, every month", which is an outcome we cannot promise
              and cannot measure — 10 accounts, no savings figures. */}
          <div className="gj-panel-thin" style={{ border: '1px solid rgba(20,83,45,0.12)', borderRadius: 18, background: '#fff', padding: '20px 22px' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3D4F44', marginBottom: 14 }}>Why it matters</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {WHY_IT_MATTERS.map((t) => (
                <li key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span aria-hidden style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 999, background: '#EDF6DE', marginTop: 1 }}>
                    <Check size={13} strokeWidth={3} color="#4D7C0F" />
                  </span>
                  <span style={{ fontSize: 14.5, lineHeight: 1.45, color: '#3D4F44', fontWeight: 600 }}>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p style={{ fontSize: 12, lineHeight: 1.55, color: '#5F6D63', margin: '12px 0 0' }}>
          An example receipt, not a screenshot — but the item, the category and the sales tax
          are exactly the fields GetGuac pulls off a real one.
        </p>
      </section>

      {/* ── 3. HOW IT WORKS ───────────────────────────────────────────────
          Heading taken from the mockup. The line it replaced ("Turn Every
          Receipt Into Savings.") is now free — do not re-use it on this page
          without checking the rail titles, one of which deliberately avoids it. */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 24px 0' }}>
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 26px' }}>
          <h2 className="gj-h2mid" style={{ ...DISPLAY, fontWeight: 800, fontSize: 38, letterSpacing: '-0.03em', margin: '0 0 12px', color: '#15281C' }}>How GetGuac works in 4 simple steps</h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: '#56655B', margin: 0 }}>
            Upload once — GetGuac does the rest. Every purchase organized, every refund window
            watched, and the savings surfaced for you. Under a minute per receipt.
          </p>
        </div>
        {/* The mockup's strip: icon tile, numbered pip, dashed rule between
            steps. The connector is drawn on the step it FOLLOWS (::before on
            every item bar the first) so it never dangles off the last one, and
            it is display:none in the one-column phone layout where a
            horizontal rule between stacked cards would point sideways at
            nothing. */}
        <div className="gj-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="gj-step">
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 20, background: '#fff', border: '1px solid rgba(20,83,45,0.12)', boxShadow: '0 6px 16px -10px rgba(20,40,25,0.5)' }}>
                  <s.i size={26} strokeWidth={1.8} color="#4D7C0F" aria-hidden />
                </span>
                <span style={{ ...DISPLAY, position: 'absolute', left: -8, bottom: -6, width: 24, height: 24, borderRadius: 999, background: '#65A30D', color: '#fff', fontSize: 12.5, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{s.n}</span>
              </div>
              <h3 style={{ ...DISPLAY, fontWeight: 700, fontSize: 16.5, margin: '14px 0 6px', color: '#15281C' }}>{s.t}</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.5, color: '#5C6B60', margin: 0 }}>{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. EVERYTHING YOU NEED TO STAY IN CONTROL ─────────────────────
          The mockup's six-tile grid, centred heading, one-line captions. */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 24px 0' }}>
        <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 26px' }}>
          <h2 className="gj-h2mid" style={{ ...DISPLAY, fontWeight: 800, fontSize: 38, letterSpacing: '-0.03em', margin: '0 0 12px', color: '#15281C' }}>Everything you need to stay in control</h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: '#56655B', margin: 0 }}>Guac-AI analyzes your spending to find better prices, uncover refunds, and reveal where your money goes — all in about a minute.</p>
        </div>
        {/* Six across in ONE row, per the mockup — not the 3x2 the rest of the
            page uses. That is why this grid is its own class and why the type
            steps down: at 1132px, six columns leave ~176px each, so a 17px
            title would break "Receipt Intelligence" across three lines. */}
        <div className="gj-featurewrap">
          <div
            ref={featureScrollRef}
            className="gj-features6"
            onPointerMove={handleFeaturePointerMove}
            onPointerLeave={stopFeatureScroll}
            aria-label="GetGuac features — use the arrow buttons or swipe to see more"
          >
            {FEATURES.map((f) => (
              <div key={f.t} onMouseEnter={handleFeatureCardEnter} style={{ background: '#fff', border: '1px solid rgba(20,83,45,0.10)', borderRadius: 18, padding: '20px 12px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 12, background: '#F0F7E8', border: '1px solid rgba(101,163,13,0.18)', marginBottom: 12 }}>
                  <f.i size={20} strokeWidth={1.9} color="#4D7C0F" aria-hidden />
                </div>
                <h3 style={{ ...DISPLAY, fontWeight: 700, fontSize: 13.5, lineHeight: 1.25, margin: '0 0 5px', color: '#15281C' }}>{f.t}</h3>
                <p style={{ fontSize: 12, lineHeight: 1.4, color: '#5C6B60', margin: 0 }}>{f.b}</p>
              </div>
            ))}
          </div>
          <button type="button" className="gj-featurearrow gj-featurearrow-left" onClick={() => moveFeatureRail(-1)} disabled={!featureCanPrev} aria-label="Show previous features">
            <ChevronLeft size={21} strokeWidth={2.2} />
          </button>
          <button type="button" className="gj-featurearrow gj-featurearrow-right" onClick={() => moveFeatureRail(1)} disabled={!featureCanNext} aria-label="Show more features">
            <ChevronRight size={21} strokeWidth={2.2} />
          </button>
        </div>
      </section>

      {/* ── 5. WHY PEOPLE CHOOSE GETGUAC — the compact matrix ─────────────
          The mockup's ✓/✗ grid. It is the same argument as the wide
          named-competitor table further down the page, in the scannable form
          the mockup drew; that table stays because it carries the nuance this
          one cannot (see its own ⚠️ block).
          🔴 MINT IS NOT IN THIS TABLE AND MUST NOT BE ADDED BACK. The mockup's
          column set was Mint / YNAB / Rocket Money / Monarch / Copilot —
          Intuit SHUT MINT DOWN in 2024 (announced for 1 Jan, extended to
          23 Mar) and folded it into Credit Karma. Naming a dead product as a
          current competitor in 2026 is the single fastest way to tell a reader
          this table was not checked. Fetch takes the column instead.
          🔒 FETCH SCORING ✓ ON THE FIRST ROW IS CORRECT AND STAYS. The mockup
          had "Reads every receipt item" as ✓ for us and ✗ for everyone else.
          That is only true because it picked five bank-feed apps. Fetch and
          Ibotta both read receipts — it is their entire business — so a table
          that sweeps every row is one a reader can falsify in one search.
          '~' renders amber and must NOT be rounded to ✓ or ✗: YNAB's bank link
          really is optional, and Monarch's manual-only path is contested
          between their own help centre and third-party reviews. */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 24px 0' }}>
        <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 32px' }}>
          <h2 className="gj-h2mid" style={{ ...DISPLAY, fontWeight: 800, fontSize: 38, letterSpacing: '-0.03em', margin: '0 0 12px', color: '#15281C' }}>Why people choose GetGuac</h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: '#56655B', margin: 0 }}>
            Checked in public, cell by cell — including the row where somebody else wins.
          </p>
        </div>
        <div style={{ overflowX: 'auto', border: '1px solid rgba(20,83,45,0.12)', borderRadius: 18, background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: '#F4F8EE' }}>
                <th scope="col" style={{ ...DISPLAY, textAlign: 'left', fontWeight: 800, fontSize: 13.5, color: '#15281C', padding: '14px 18px' }}>Feature</th>
                {MATRIX_APPS.map((a) => (
                  <th key={a} scope="col" style={{
                    ...DISPLAY, textAlign: 'center', fontWeight: 800, fontSize: 13.5, padding: '14px 12px', whiteSpace: 'nowrap',
                    color: a === 'GetGuac' ? '#fff' : '#5F6D63',
                    background: a === 'GetGuac' ? '#65A30D' : 'transparent',
                  }}>
                    {a}{a === 'GetGuac' && <span aria-hidden style={{ marginLeft: 5 }}>🥑</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map(([label, ...cells], i) => (
                <tr key={label} style={{ borderTop: '1px solid rgba(20,83,45,0.09)', background: i % 2 ? '#FCFDFA' : '#fff' }}>
                  <th scope="row" style={{ textAlign: 'left', fontWeight: 600, fontSize: 14, lineHeight: 1.4, color: '#15281C', padding: '13px 18px' }}>{label}</th>
                  {cells.map((c, j) => (
                    <td key={j} title={typeof c === 'object' ? c.why : undefined} style={{
                      textAlign: 'center', padding: '13px 12px', fontSize: 13.5, fontWeight: 700,
                      background: j === 0 ? 'rgba(101,163,13,0.07)' : 'transparent',
                    }}>
                      <Cell v={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 7. VOICES + SECURITY, side by side ────────────────────────────
          The mockup's paired row: testimonials on the left, a security card on
          the right.
          🔴🔴 THE LEFT CARD IS NOT "LOVED BY THOUSANDS", AND THERE IS NO STAR
          RATING. Read this before "restoring" either.
          The mockup drew: a "Loved by thousands" heading, "4.8/5 average
          rating" under five gold stars, and three testimonials — Sarah M.,
          Michael T. and Emily R. — each with a stock-photo portrait and its
          own five-star row. Every one of those is fabricated:
            • GetGuac has 10 accounts. "Thousands" is off by ~3 orders of
              magnitude.
            • The App Store rating count is ZERO (itunes lookup id 6790993237
              → userRatingCount: 0). A visitor can check that in one tap from
              the badge in our own hero, and it would read 0 next to a 4.8.
            • Sarah M. / Michael T. / Emily R. are not users. They are not
              anyone. This is the SAME three invented names from the mockup
              that kept VOICES empty in the first place.
          Fabricated reviews with invented names and stock faces are not a
          style question — they are the thing consumer-protection rules exist
          for, and Meta's ad policies specifically cover them on a page an ad
          points at. So the card is built to the mockup's exact shape and wired
          to the REAL quote list. It renders what actually exists and grows on
          its own as real quotes arrive.
          🔒 Rules for adding to VOICES are on the array itself. No stock
          photography, no aggregate, no rating.
          ⚠️ On the right: the mockup's second security bullet was "Read-only
          access". CUT — it is worse than vague, it is backwards. It implies a
          bank connection that happens to be read-only. GetGuac has NO bank
          connection of any kind, which is the stronger claim and the one the
          hero already leads on. */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 24px 0' }}>
        <div className="gj-trustrow">
          {/* The testimonial card's columns are set from the DATA via an inline
              gridTemplateColumns, not by auto-fit in the stylesheet. auto-fit
              was tried and collapsed to ONE quote column inside this card's
              ~640px, stacking the quotes vertically instead of laying them out
              in the mockup's row. One track per voice keeps the row a row at
              1, 2 or 3 entries.
              ⚠️ The comment cannot live directly above the <div> — it would sit
              between `&& (` and the element, which is two adjacent expressions
              and a syntax error, not a comment. Learned the hard way. */}
          {VOICES.length > 0 && (
            <div className="gj-loved" style={{ background: '#FFFDF5', border: '1px solid rgba(180,120,20,0.18)', borderRadius: 24, padding: 20, gridTemplateColumns: `0.62fr repeat(${VOICES.length}, minmax(0, 1fr))` }}>
              {/* Rating block — the mockup's left column. Renders the heading
                  and stars ONLY when RATING is non-null. See the array. */}
              <div style={{ alignSelf: 'center' }}>
                {/* ⚠️ "Loved by users", NOT the mockup's "Loved by thousands".
                    Same shape, same two-line wrap, and it makes no claim about
                    a number — which matters, because the number is 3. The
                    count lives in the label underneath, where it belongs. */}
                <h2 className="gj-safeh2" style={{ ...DISPLAY, fontWeight: 800, fontSize: 21, margin: '0 0 8px', color: '#15281C', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
                  {RATING ? 'Loved by users' : 'In their words'}
                </h2>
                {RATING ? (
                  <>
                    <Stars n={5} size={18} />
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#3D4F44', margin: '8px 0 0' }}>{RATING.label}</p>
                  </>
                ) : (
                  <p style={{ fontSize: 13.5, lineHeight: 1.5, color: '#5F6D63', margin: 0 }}>
                    Published with permission, and only ever from people who really said it.
                  </p>
                )}
              </div>

              {/* Card shape is the mockup's: portrait top-left, quote beside
                  it, "— Name" underneath, stars along the bottom.
                  ⚠️ NO `flex: 1` on the quote block and NO stretch on the
                  figure. Both were here and both were wrong: the figure
                  stretched to the row's tallest card and then flex:1 pushed
                  the "— Name" line to the bottom of it, leaving a slab of dead
                  white between the quote and the name on every card. Content
                  height + `alignSelf: start` is what makes these read as
                  compact quote cards instead of half-empty panels.
                  ⚠️ This comment cannot go inside the map() below — it would
                  sit between `=> (` and <figure>, which is two expressions and
                  a syntax error, not a comment. Second time. */}
              {VOICES.map((v) => (
                <figure key={v.quote} style={{ margin: 0, background: '#fff', border: '1px solid rgba(20,83,45,0.10)', borderRadius: 16, padding: 14, alignSelf: 'start' }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {/* `photo` is OPTIONAL and there is no stock fallback — the
                        card draws an initial instead.
                        🔒 A stock portrait is not a placeholder here, it is a
                        picture of a stranger presented as one of three named
                        people who really left these reviews. Only a real photo
                        of that person, with their permission, goes in `photo`.
                        The mockup's three portraits were stock. */}
                    <Avatar v={v} />
                    <blockquote style={{ margin: 0, minWidth: 0, fontSize: 12.5, lineHeight: 1.5, color: '#3D4F44' }}>“{v.quote}”</blockquote>
                  </div>
                  <figcaption style={{ marginTop: 12 }}>
                    <span style={{ ...DISPLAY, display: 'block', fontWeight: 700, fontSize: 12.5, color: '#15281C' }}>
                      — {v.name}{v.detail && <span style={{ fontWeight: 600, color: '#5F6D63' }}>, {v.detail}</span>}
                    </span>
                    {v.stars && <span style={{ display: 'block', marginTop: 8 }}><Stars n={v.stars} size={13} /></span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          <div style={{ background: '#F4F8EE', border: '1px solid rgba(101,163,13,0.16)', borderRadius: 24, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <span aria-hidden style={{ position: 'absolute', right: -18, bottom: -18, opacity: 0.09 }}>
              <ShieldCheck size={150} strokeWidth={1.2} color="#3F6212" />
            </span>
            {/* Icon and heading share a row, as the mockup draws them — they
                were stacked, which cost ~70px of height the testimonial card
                then had to match. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, position: 'relative' }}>
              <span aria-hidden style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 13, background: '#65A30D', boxShadow: '0 10px 22px -14px rgba(101,163,13,0.9)' }}>
                <ShieldCheck size={21} strokeWidth={1.9} color="#fff" />
              </span>
              <h2 className="gj-safeh2" style={{ ...DISPLAY, fontWeight: 800, fontSize: 21, margin: 0, color: '#15281C', letterSpacing: '-0.025em', lineHeight: 1.15 }}>Your security is our priority</h2>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
              {SAFETY.map((t) => (
                <li key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span aria-hidden style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 999, background: '#65A30D', marginTop: 1 }}>
                    <Check size={13} strokeWidth={3} color="#fff" />
                  </span>
                  <span style={{ fontSize: 13.5, lineHeight: 1.4, color: '#15281C', fontWeight: 600 }}>{t}</span>
                </li>
              ))}
            </ul>
            {/* The big green "How we protect you →" pill that used to close
                this card is gone. The mockup has no button here, and it was
                ~75px of the height the testimonial card had to match — the
                single biggest contributor to this row being twice the
                mockup's. /security is still reachable from the footer nav and
                from the hero trust bar, so nothing is orphaned. */}
            <Link href="/security" onClick={() => trackClick('join-security')}
              style={{ position: 'relative', display: 'inline-block', marginTop: 14, fontSize: 12.5, fontWeight: 700, color: '#4D7C0F', textDecoration: 'underline' }}>
              How we protect you →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 8. FAQ ────────────────────────────────────────────────────────
          ⚠️ Six questions, not twelve: this is the ad-visitor subset of the
          full /faq page, which stays the canonical list and is linked
          underneath. Every answer here is a SHORTENED version of the one on
          /faq — if you change a fact, change it in both places.
          ⚠️ NO FAQPage JSON-LD here on purpose. /faq already carries it, and
          the same structured data on two URLs invites Google to treat one as
          a duplicate of the other — which this site has already been bitten
          by (see the canonical-tag bug across 7 routes).
          Native <details>, so the accordion costs zero client JS. */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 24px 0' }}>
        <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 30px' }}>
          <h2 className="gj-h2mid" style={{ ...DISPLAY, fontWeight: 800, fontSize: 38, letterSpacing: '-0.03em', margin: '0 0 12px', color: '#15281C' }}>Frequently asked questions</h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: '#56655B', margin: 0 }}>
            The six that come up before anyone signs up — answered straight.
          </p>
        </div>
        <div className="gj-faq">
          {FAQ.map(([q, a]) => (
            <details key={q} style={{ background: '#fff', border: '1px solid rgba(20,83,45,0.10)', borderRadius: 16, padding: '16px 20px' }}>
              <summary style={{ ...DISPLAY, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, cursor: 'pointer', fontWeight: 700, fontSize: 15.5, color: '#15281C' }}>
                {q}
                <span aria-hidden className="gj-faqplus" style={{ flex: '0 0 auto', color: '#4D7C0F', fontSize: 22, lineHeight: 1 }}>+</span>
              </summary>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#5F6D63', margin: '12px 0 2px' }}>{a}</p>
            </details>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13.5, lineHeight: 1.55, color: '#5F6D63', margin: '16px 0 0' }}>
          More of them on the <Link href="/faq" style={{ color: '#4D7C0F', fontWeight: 600 }}>full FAQ</Link>, or
          just <Link href="/contact" style={{ color: '#4D7C0F', fontWeight: 600 }}>ask us</Link>.
        </p>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          THE PROOF STACK — everything from here to the closing CTA was moved
          below the FAQ on request 2026-07-31 ("keep the extra sections at the
          bottom near the footer").
          ⚠️ TRADE-OFF WORTH KNOWING, since it was a deliberate reversal: the
          demo-account block used to sit directly under the fold, because the
          biggest objection to signing up is not knowing what is behind the
          wall. It is now roughly six screens down. If signups soften, moving
          the demo block back up is the first thing to try — it is one
          self-contained <section>.
          ══════════════════════════════════════════════════════════════════ */}
      <div style={{ borderTop: '1px solid rgba(20,83,45,0.10)', marginTop: 40, paddingTop: 8, background: 'linear-gradient(180deg,#FCFDFA 0%,#FFFFFF 220px)' }}>
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '30px 24px 0' }}>
          <p style={{ ...DISPLAY, fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4D7C0F', margin: 0 }}>Look before you sign up</p>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: '#56655B', margin: '8px 0 0', maxWidth: 640 }}>
            Everything below is the evidence: a real demo account you can open, how GetGuac
            compares to a spreadsheet and to the apps you have heard of, and every feature
            you get for nothing.
          </p>
        </section>

        {/* ── 9. DEMO ACCOUNT ─────────────────────────────────────────────
            The credentials are published on purpose — someone who wants to
            look before they sign up should never have to hunt for them. */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '22px 24px 8px' }}>
          <div style={{ background: '#F4F8EE', border: '1px solid rgba(101,163,13,0.2)', borderRadius: 26, padding: '30px 28px' }}>
            <div className="gj-demo">
              <div style={{ minWidth: 0 }}>
                <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4D7C0F', marginBottom: 10 }}>
                  Don&apos;t take our word for it
                </span>
                {/* Reframed 2026-07-29. This section used to sell the demo as a
                    way to avoid signing up ("Don't want to sign up yet? Use our
                    demo account") — which is an objection handler, not a reason
                    to click. It now leads with what is actually inside, because
                    a real year of parsed spending is the strongest evidence on
                    the page that the hero's promise is not vapour. The numbers
                    are checkable: the credentials are right underneath. */}
                {/* 23px, not 28: this heading is 45 characters and the demo block
                    gives it only half the 1180px row, so at 28 it wrapped onto a
                    second line mid-phrase ("before you / commit"). Sized to sit on
                    ONE line at desktop on request. It still wraps on a phone,
                    where the column is full-width but only ~342px — one line
                    there would need ~15px, which is smaller than the body copy
                    underneath it. */}
                <h2 className="gj-demoh2" style={{ ...DISPLAY, fontWeight: 800, fontSize: 23, letterSpacing: '-0.025em', margin: '0 0 8px', color: '#15281C', whiteSpace: 'nowrap' }}>
                  See what Guac-AI can find before you commit. <span aria-hidden>🥑</span>
                </h2>
                <p style={{ fontSize: 15.5, lineHeight: 1.55, color: '#3D4F44', margin: '0 0 18px' }}>
                  Open a real year of spending and discover hidden savings opportunities from 12 months
                  of receipts already analyzed by our AI.
                </p>

                {/* The page's one quantified block. See DEMO_STATS. */}
                <div className="gj-proof" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                  {DEMO_STATS.map(([n, label]) => (
                    <div key={label} style={{ background: '#fff', border: '1px solid rgba(101,163,13,0.2)', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
                      <div style={{ ...DISPLAY, fontWeight: 800, fontSize: 20, color: '#15281C', letterSpacing: '-0.02em' }}>{n}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7A70', lineHeight: 1.3, marginTop: 3 }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                  {[['Email', DEMO.email], ['Password', DEMO.password]].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid rgba(20,83,45,0.12)', borderRadius: 12, padding: '10px 12px' }}>
                      <span className="gj-credlabel" style={{ fontSize: 11, fontWeight: 700, color: '#5F6D63', width: 66, flex: '0 0 auto', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                      <span className="gj-credval" style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 14.5, color: '#15281C', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
                      <button type="button" onClick={() => copy(label, value)}
                        style={{ flex: '0 0 auto', cursor: 'pointer', fontFamily: 'inherit', background: '#F0F7E8', border: '1px solid rgba(101,163,13,0.24)', color: '#4D7C0F', fontWeight: 700, fontSize: 12, padding: '6px 12px', borderRadius: 999 }}>
                        {copied === label ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  ))}
                </div>

                <Link href="/login?demo=1" onClick={() => trackClick('join-demo')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#65A30D', color: '#fff', fontWeight: 700, fontSize: 15, padding: '13px 24px', borderRadius: 999, textDecoration: 'none' }}>
                  🔎 Enter the demo →
                </Link>
                <p style={{ fontSize: 12, color: '#5F6D63', margin: '12px 0 0' }}>
                  The credentials arrive prefilled — just pass the quick captcha.
                </p>
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/home/goals/web-organized.webp" alt="The GetGuac dashboard on the web" loading="lazy"
                className="gj-demoshot"
                style={{ width: '100%', display: 'block', borderRadius: 16, border: '1px solid rgba(20,83,45,0.12)', boxShadow: '0 20px 50px -24px rgba(20,40,28,0.4)' }} />
            </div>
          </div>
        </section>

        {/* ── 10. WHY SHOULD I? ────────────────────────────────────────────
            Deliberately compact — one emoji and one line each. This page
            already carries six feature cards, three Guac-AI cards, four steps
            and nineteen goal cards; five more full-size cards would be sprawl. */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '30px 24px 8px' }}>
          <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 30, letterSpacing: '-0.03em', margin: '0 0 22px', color: '#15281C' }}>
            Why should I?
          </h2>
          <div className="gj-why">
            {WHY.map((w) => (
              <div key={w.t} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fff', border: '1px solid rgba(20,83,45,0.10)', borderRadius: 16, padding: '16px 18px' }}>
                <span aria-hidden style={{ fontSize: 22, lineHeight: 1.1, flex: '0 0 auto' }}>{w.e}</span>
                <span style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.4, color: '#15281C' }}>{w.t}</span>
              </div>
            ))}
          </div>
        </section>

        <CardRail n={0} />
        <CardRail n={1} />

        {/* ── 11. VS A SPREADSHEET ────────────────────────────────────────
            The critique asked for a comparison table with an "Other Budget
            Apps" column. That column was DELIBERATELY NOT BUILT, and should
            not be added later:
              • Its headline row was false. The suggested table had receipt
                scanning as ❌ for other apps — Fetch, Ibotta and Expensify all
                scan receipts, and two of them built their whole business on it.
              • Every other cell would be an unverifiable claim about a named
                competitor, published on a personal-finance page by a product
                with 10 accounts. That is a fight with no upside.
            A spreadsheet is the honest comparison because it is what people
            actually use instead, and every cell below is checkable against this
            repo rather than against someone else's product.
            The caveat line under the table is not hedging — a table that lets
            the alternative win nothing reads as marketing, and a spreadsheet
            genuinely beats us on flexibility. */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '30px 24px 0' }}>
          <div style={{ maxWidth: 820, marginBottom: 26 }}>
            <h2 className="gj-secth2" style={{ ...DISPLAY, fontWeight: 800, fontSize: 34, letterSpacing: '-0.03em', margin: '0 0 12px', color: '#15281C' }}>Or keep using a spreadsheet.</h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: '#56655B', margin: 0 }}>
              Plenty of people track spending in one, and it works — right up until the
              typing stops. Here is what changes when a receipt reads itself.
            </p>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid rgba(20,83,45,0.12)', borderRadius: 18, background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ background: '#F4F8EE' }}>
                  <th scope="col" style={{ ...DISPLAY, textAlign: 'left', fontWeight: 800, fontSize: 14, color: '#15281C', padding: '14px 18px' }}>&nbsp;</th>
                  <th scope="col" style={{ ...DISPLAY, textAlign: 'left', fontWeight: 800, fontSize: 14, color: '#4D7C0F', padding: '14px 18px', whiteSpace: 'nowrap' }}>GetGuac 🥑</th>
                  <th scope="col" style={{ ...DISPLAY, textAlign: 'left', fontWeight: 800, fontSize: 14, color: '#5F6D63', padding: '14px 18px', whiteSpace: 'nowrap' }}>A spreadsheet</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([what, guac, sheet], i) => (
                  <tr key={what} style={{ borderTop: '1px solid rgba(20,83,45,0.09)', background: i % 2 ? '#FCFDFA' : '#fff' }}>
                    <th scope="row" style={{ textAlign: 'left', fontWeight: 600, fontSize: 14.5, lineHeight: 1.45, color: '#15281C', padding: '14px 18px' }}>{what}</th>
                    <td style={{ fontSize: 14, lineHeight: 1.45, color: '#3D4F44', padding: '14px 18px' }}>
                      <span aria-hidden style={{ marginRight: 7 }}>✅</span>{guac}
                    </td>
                    {/* #5F6D63, not the lighter #6B7A70 this started as: on the
                        #FCFDFA zebra rows that measured ~4.5:1, i.e. exactly on
                        the AA boundary for body text. Same colour the rest of the
                        site standardised on for muted copy. */}
                    <td style={{ fontSize: 14, lineHeight: 1.45, color: '#5F6D63', padding: '14px 18px' }}>
                      <span aria-hidden style={{ marginRight: 7 }}>✍️</span>{sheet}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#5F6D63', margin: '14px 0 0' }}>
            To be fair to the spreadsheet: it is free, it does exactly what you tell it, and
            it will outlive every app you own. It just needs you to do all of the above by hand.
          </p>

          <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <p style={{ flex: '1 1 420px', minWidth: 0, fontSize: 15.5, lineHeight: 1.55, color: '#3D4F44', margin: 0, fontWeight: 600 }}>
              {/* 🔒 Only claims that survive a grep. "Detects price increases" and
                  "tracks pantry spending" were both suggested and CUT: there is no
                  per-item price history in this codebase (no unit_price /
                  item_price / price_per anywhere in lib/), and there is no pantry
                  feature at all. Subscription price creep IS real and is the one
                  price-change claim that holds — lib/subscription-tracker.js
                  flags a charge >5% above its prior average. */}
              Because GetGuac reads the receipt, it knows the items — not just the total.
              That is what lets it spot a subscription whose price crept up, catch a refund
              window before it closes, and show you where the money actually went.
            </p>
            <button type="button" onClick={() => oauth('google')} disabled={!!busy}
              style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 9, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', border: 0, background: '#65A30D', color: '#fff', fontWeight: 700, fontSize: 15.5, padding: '14px 26px', borderRadius: 999, opacity: busy ? 0.7 : 1 }}>
              {busy === 'google' ? 'Opening Google…' : (<><GoogleG size={18} />Start free</>)}
            </button>
          </div>
        </section>

        <CardRail n={2} />

        {/* ── 12. GUAC-AI ─────────────────────────────────────────────────── */}
        <section style={{ background: '#F7FAF2', borderTop: '1px solid rgba(101,163,13,0.12)', borderBottom: '1px solid rgba(101,163,13,0.12)', marginTop: 44 }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px' }}>
            <div style={{ maxWidth: 620, marginBottom: 26 }}>
              <span style={{ display: 'inline-block', color: '#4D7C0F', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>AI that works for your wallet</span>
              {/* "Guac-AI", NOT bare "Guac": the codebase already uses Guac-AI 63×
                  to Guac AI 25×, and on this site "guac" separately means MONEY
                  ("Keep More Guac in Your Pocket"), so "Guac thinks" would make the
                  guacamole the thinker. Dropped "just" for the punchiness instead. */}
              <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 38, letterSpacing: '-0.03em', margin: '0 0 12px', color: '#15281C' }}>Most apps track. Guac-AI thinks.</h2>
              <p style={{ fontSize: 17, lineHeight: 1.55, color: '#56655B', margin: 0 }}>It reads every receipt and statement, then tells you what to do about it — like a CFO that lives in your pocket and never sends a bill.</p>
            </div>
            <div className="gj-grid3">
              {BRAIN.map((c) => (
                <div key={c.t} style={{ background: '#fff', border: '1px solid rgba(101,163,13,0.16)', borderRadius: 22, padding: 28 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4D7C0F', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>{c.k}</div>
                  <h3 style={{ ...DISPLAY, fontWeight: 700, fontSize: 22, margin: '0 0 10px', color: '#15281C' }}>{c.t}</h3>
                  <p style={{ fontSize: 14.5, lineHeight: 1.55, color: '#56655B', margin: 0 }}>{c.b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <CardRail n={3} />
        <CardRail n={4} />
        <CardRail n={5} />

        {/* The "In their words" section used to sit here. It moved UP into the
            paired trust row beside the security card (section 6), which is
            where the mockup puts it. Only one copy on the page — see the 🔴
            block there before touching either. */}
      </div>

      {/* ── 13. CLOSING CTA ───────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 24px 56px' }}>
        {/* The mockup's closing band: product shot left, the ask centred,
            avocado right. The two flanking elements are decoration and are
            aria-hidden — everything that matters is in the middle column, and
            on a phone they are display:none so the CTA keeps the full width. */}
        {/* ⚠️ THE BAND'S HEIGHT IS DRIVEN BY THE PHONE, not by the copy. At
            190px wide the screenshot is ~400px tall, so the band inherited all
            of it and opened with a slab of empty green above the headline —
            the centre column simply had nothing that tall to fill it.
            110px is the fix; it is also what the mockup draws. Keep the
            screenshot SHORTER than the centre column's content or the empty
            strip comes straight back. The -60px bleed and the -5deg tilt went
            with it: both existed to disguise a shot that was too big. */}
        <div className="gj-ctaband" style={{ background: '#65A30D', borderRadius: 28, padding: '26px 34px', position: 'relative', overflow: 'hidden' }}>
          {/* Real screenshot, same one as the hero — see the 🔒 note there.
              🔑 ABSOLUTELY POSITIONED, AND THAT IS THE WHOLE TRICK. As a grid
              item this shot was ~232px tall against ~200px of copy, so IT set
              the band's height and left a strip of empty green above the
              headline. Out of flow it cannot: the band is now exactly as tall
              as its text, and the phone bleeds off the bottom edge, cropped by
              the band's own overflow:hidden, the way the mockup draws it.
              Same for the avocado. If either is ever put back in the flow,
              the empty strip comes back with it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img aria-hidden alt="" src="/home/goals/phone-guacscore.webp" loading="lazy" width={112} height={236}
            className="gj-ctaphone"
            style={{ width: 112, height: 'auto', borderRadius: 12, filter: 'drop-shadow(0 14px 26px rgba(10,30,15,0.4))' }} />

          <div className="gj-ctacopy" style={{ textAlign: 'center', minWidth: 0, position: 'relative' }}>
            {/* 32px, not 40: at 40 the headline wrapped to two lines, and the
                second line is most of what made this band twice the mockup's
                height. It sits on ONE line from ~1100px up. */}
            <h2 className="gj-h2big" style={{ ...DISPLAY, fontWeight: 800, fontSize: 32, letterSpacing: '-0.03em', margin: '0 0 6px', color: '#fff', position: 'relative' }}>
              Ready to take control of your money?
            </h2>
            {/* 🔒 HONESTY LOCK — "Join our smart savers" (user-set copy), NOT
                the mockup's "Join thousands who are saving smarter". GetGuac
                has 10 accounts, so "thousands" is off by roughly three orders
                of magnitude and is falsified by our own database.
                🔑 Same call already made two sections up, where "Loved by
                thousands" became "Loved by users" — the two have to agree, or
                the page claims thousands of users in one band and shows a
                2-rating average in the other, on the same screen.
                Never add member counts or savings figures here. */}
            <p style={{ fontSize: 15, lineHeight: 1.45, color: 'rgba(255,255,255,0.92)', margin: '0 auto 14px', maxWidth: 520 }}>
              Join our smart savers.
            </p>

            {/* ONE button, as the mockup draws it. It points at Google rather
                than /register: a reader who scrolled this whole page and
                committed at the very bottom should get the one-tap route, not
                six fields, a CAPTCHA and a confirmation email. The email path
                survives as the link underneath and still fires its counter. */}
            <button type="button" onClick={() => oauth('google')} disabled={!!busy}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', border: 0, background: '#fff', color: '#15281C', fontWeight: 800, fontSize: 16, padding: '13px 34px', borderRadius: 999, opacity: busy ? 0.7 : 1, boxShadow: '0 10px 22px -12px rgba(0,0,0,0.5)' }}>
              {busy === 'google' ? 'Opening Google…' : (<><span aria-hidden>🚀</span>Start Free Today</>)}
            </button>

            {/* The "Try the demo · Sign up with email" links that sat here are
                GONE — the mockup goes straight from the button to the check
                row, and that row of links was ~34px of the height difference.
                Neither path is orphaned: the demo is in the sticky bar that
                rides the whole scroll and in the demo-account block, and the
                email signup is the link under the hero's Google button. */}

            {/* The mockup's three claims, dot-separated.
                ⚠️ "Setup in 60 seconds" is IN on request after being flagged
                three times, and it is the one line on this page nobody has
                measured. It is also the easiest to settle: time one Google
                signup from tap to painted dashboard. If it comes in over a
                minute, change the number — the callback provisions a profile
                and a mailbox before the dashboard renders, so it is not
                obviously true. Everything either side of it is verified. */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '6px 12px', marginTop: 14, fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
              {['Free forever', 'No credit card', 'Setup in 60 seconds'].map((t, i) => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
                  {i > 0 && <span aria-hidden style={{ opacity: 0.55 }}>•</span>}
                  <span>{t}</span>
                </span>
              ))}
            </div>
          </div>

          {/* 🔒 The LOCKED brand mascot (components/GuacMascot.jsx), used
              as-is — no redraw, no re-author, no separable parts. The `rich`
              pose is the one its own docs assign to Steals / deals, which is
              the right register for a money CTA.
              🔑 Why never the 🥑 glyph here: at this size you get the
              platform's own artwork, and Segoe UI Emoji, Apple Color Emoji and
              Noto each draw a different avocado. A CTA band that changes shape
              with the visitor's OS is not a design. */}
          <span aria-hidden className="gj-ctaavo"><GuacMascot expression="rich" size={168} /></span>
        </div>

        {/* WHO BUILT IT — the critique listed this as the single biggest
            unanswered trust question, and it was the only one of its seven that
            was both real and fixable: banks, security, price and data-selling
            are all answered above; user counts, reviews and press mentions
            cannot be answered at all without lying.
            🔑 "Yathis Corporation" is NOT a new disclosure and needs nobody's
            personal name: it is already the public sellerName/artistName on the
            App Store listing this page links to in the hero, and it matches the
            bundle id com.yathis.getguac. Verified via the iTunes lookup API.
            🔒 Do NOT inflate this into a founder story, a team size, or a
            "trusted by" line. /editorial-policy explicitly promises no invented
            bylines or credentials, and the same standard applies here.
            ⚠️ The Terms · Privacy · Security · Contact line that used to sit
            under this was REMOVED when MarketingShell's footer was added — the
            shared footer already carries all four, and printing them twice a
            screen apart looked like a bug. */}
        <p style={{ textAlign: 'center', fontSize: 12.5, lineHeight: 1.6, color: '#5F6D63', margin: '28px 0 0' }}>
          GetGuac is built by <strong style={{ color: '#3D4F44', fontWeight: 700 }}>Yathis Corporation</strong>, publisher of
          GetGuac on the App Store and Google Play.
        </p>
      </section>

      {/* ── STICKY CTA ────────────────────────────────────────────────────── */}
      <div aria-hidden={!showBar} style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
        background: 'rgba(11,20,16,0.94)', backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255,255,255,0.12)', padding: '12px 16px',
        transform: showBar ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform 260ms cubic-bezier(.2,.8,.2,1)',
      }}>
        {/* Right padding on small screens keeps the last button clear of the
            floating Guac AI launcher, which sits in the same corner. */}
        <div className="gj-stickyinner" style={{ maxWidth: 560, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Also repointed at Google 2026-07-31, for the same reason as the
              closing CTA: this bar is the page's most-seen ask on a phone (it
              is up for the whole scroll), and it was sending every tap down the
              email path the hero deliberately de-emphasises. */}
          <button type="button" onClick={() => oauth('google')} disabled={!!busy}
            tabIndex={showBar ? 0 : -1}
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', border: 0, background: '#84CC16', color: '#0B1410', fontWeight: 800, fontSize: 15, padding: '13px 18px', borderRadius: 999, opacity: busy ? 0.7 : 1 }}>
            {busy === 'google' ? 'Opening Google…' : (<><GoogleG size={18} />Sign up free</>)}
          </button>
          <Link href="/login?demo=1" tabIndex={showBar ? 0 : -1} onClick={() => trackClick('join-demo')}
            style={{ flex: '0 0 auto', color: '#fff', fontWeight: 700, fontSize: 14, padding: '13px 16px', borderRadius: 999, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.28)' }}>
            Demo
          </Link>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .gj-authbtn { display: inline-flex; align-items: center; justify-content: center;
                      gap: 10px; border: 0; border-radius: 16px; padding: 15px 18px; cursor: pointer;
                      font-family: inherit; font-weight: 700; font-size: 15px;
                      transition: transform 120ms ease; }
        .gj-authbtn:active { transform: scale(0.99); }
        .gj-authbtn:disabled { opacity: 0.7; cursor: default; }
        .gj-nounderline { text-decoration: none; }
        .gj-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        /* Closing band: product shot · the ask · avocado. The flanking columns
           are auto so the centre keeps every pixel it needs; both are pure
           decoration and drop out entirely below 880. */
        /* NOT a grid. Both decorations are out of flow, so the band is exactly
           as tall as its copy — which is the whole fix for the strip of empty
           green that used to sit above the headline. Put either back in the
           flow and the strip returns. */
        .gj-ctaband { display: block; }
        .gj-ctacopy { max-width: 620px; margin: 0 auto; }
        /* Both bleed off the band's edges and are cropped by its overflow:hidden,
           as the mockup draws them. */
        .gj-ctaphone { position: absolute; left: 52px; bottom: -30px; }
        /* Supplied hero banner, when web/public/join/hero.png exists.
           🔑 mix-blend-mode: multiply is doing real work — do not drop it.
           The supplied PNG is Format24bppRgb: NO alpha channel, flattened
           onto white. Dropped in raw it renders as a visible white card
           against the hero's white -> #F5FAEC gradient. multiply maps white
           to the backdrop (white x bg = bg), so the box disappears while the
           artwork stays. It costs a barely-perceptible tint on the white
           areas INSIDE the image, which is the right trade on a background
           this pale.
           If a version WITH transparency is ever supplied, delete this line —
           multiply on a true-alpha PNG would tint it for no reason. */
        .gj-heroart-frame { width: 100%; max-width: 520px; height: 480px; overflow: hidden; margin: 0 auto; }
         .gj-heroart { display: block; width: auto; max-width: none; height: 100%;
                       margin-left: 50%; transform: translateX(-50%); transform-origin: 50% 58%;
                       mix-blend-mode: multiply;
                       animation: gjHeroReveal .72s cubic-bezier(.22,.8,.24,1) both,
                                  gjHeroFocus 8s ease-in-out .72s infinite; }
         @keyframes gjHeroReveal {
           from { opacity: 0; transform: translateX(-50%) scale(.965); filter: saturate(.8); }
           to { opacity: 1; transform: translateX(-50%) scale(1); filter: saturate(1); }
         }
         @keyframes gjHeroFocus {
           0%, 100% { transform: translateX(-50%) scale(1); }
           50% { transform: translateX(-50%) scale(1.018); }
         }
         @media (prefers-reduced-motion: reduce) {
           .gj-heroart { animation: none; }
         }
        @media (min-width: 881px) and (max-width: 1100px) {
          .gj-heroart-frame { max-width: 480px; height: 440px; }
        }
        .gj-ctaavo { position: absolute; right: 30px; bottom: -22px; width: 176px; height: 202px;
                     display: block; pointer-events: none; }
        /* Six small boxes in one row — the mockup's feature strip. Its own
           class, not gj-grid3, because nothing else on the page goes 6-up.
           Steps to 3 then 2 rather than 6→1: six full-width cards on a phone
           would be six screens of scrolling for one heading's worth of copy. */
        .gj-features6 { display: flex; gap: 12px; align-items: stretch; overflow-x: auto;
                        scroll-snap-type: x proximity; scroll-behavior: auto; overscroll-behavior-x: contain;
                        scrollbar-width: none; -ms-overflow-style: none;
                        padding: 2px; touch-action: pan-x pan-y; }
        .gj-features6 > * { flex: 0 0 calc((100% - 60px) / 6); min-height: 150px; scroll-snap-align: start; }
        .gj-features6::-webkit-scrollbar { display: none; width: 0; height: 0; }
        .gj-featurewrap { position: relative; }
        .gj-featurewrap::before, .gj-featurewrap::after { content: ''; position: absolute; z-index: 2; top: 2px; bottom: 2px; width: 38px; pointer-events: none; }
        .gj-featurewrap::before { left: 0; background: linear-gradient(90deg, #fff 5%, rgba(255,255,255,0)); }
        .gj-featurewrap::after { right: 0; background: linear-gradient(270deg, #fff 5%, rgba(255,255,255,0)); }
        .gj-featurearrow { position: absolute; z-index: 3; top: 50%; transform: translateY(-50%); width: 42px; height: 42px; border-radius: 999px; border: 1px solid rgba(20,83,45,.18); background: #fff; color: #3F720C; display: grid; place-items: center; box-shadow: 0 8px 24px -10px rgba(20,60,30,.45); transition: opacity .18s ease, transform .18s ease, background .18s ease; cursor: pointer; }
        .gj-featurearrow:hover:not(:disabled) { background: #F0F7E8; transform: translateY(-50%) scale(1.06); }
        .gj-featurearrow:focus-visible { outline: 3px solid rgba(101,163,13,.28); outline-offset: 3px; }
        .gj-featurearrow:disabled { opacity: 0; pointer-events: none; }
        .gj-featurearrow-left { left: -16px; }
        .gj-featurearrow-right { right: -16px; }
        /* The mockup's two hero buttons, side by side. Wraps before it
           squeezes — "See how it works" is three words and truncating it
           would be worse than a second row. */
        .gj-heroctas { display: flex; flex-direction: column; gap: 12px; align-items: stretch;
                       width: min(320px, 100%); }
        .gj-herosecondary { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; }
        .gj-herosecondary > * { width: 100% !important; min-width: 0; white-space: nowrap; }
        /* Bank-feed panel · receipt panel · why it matters. Uneven on purpose:
           the receipt side carries eight line items and the other two carry a
           handful of lines each.
           stretch, NOT start: the empty half of the "other apps" card is the
           argument. Letting it shrink-wrap its two lines hides exactly the
           thing the panel exists to show. */
        .gj-split3 { display: grid; grid-template-columns: 0.82fr 1.26fr 0.92fr; gap: 20px; align-items: stretch; }
        .gj-panel-thin { display: flex; flex-direction: column; }
        /* Three example cards. Equal height so the figure rows line up — that
           alignment is what makes them read as one comparison rather than
           three unrelated boxes. */
        .gj-examples { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; align-items: stretch; }
        /* The mockup's paired trust row: quotes left, security card right.
           1.55/1 rather than 2/1 — the security card carries four claims plus
           a button and goes gappy if it is squeezed much below ~340px.
           :only-child so the row collapses to a single full-width security
           card when VOICES is empty, instead of leaving a hole where the
           testimonials would be. */
        /* 2.5/1, not the 1.55/1 this started as. With three quote cards inside
           the left card, 1.55fr left each quote ~84px of text width and wrapped
           a 90-character sentence to NINE lines — a column of one-word rows.
           The security card has four short bullets and reads fine at ~300px. */
        .gj-trustrow { display: grid; grid-template-columns: 2.5fr 1fr; gap: 20px; align-items: stretch; }
        .gj-trustrow > :only-child { grid-column: 1 / -1; }
        /* The mockup's testimonial block: rating column, then one column per
           quote. auto-fit on the quotes rather than a hard 3 — the array holds
           one entry today and a fixed 3-up would leave two visible holes. Drop
           in three real quotes and it lays out exactly like the mockup. */
        .gj-loved { display: grid; grid-template-columns: 0.62fr repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; align-items: start; }
        /* FAQ accordion. Both marker rules are needed — list-style covers
           Firefox and modern Chrome, the -webkit pseudo covers Safari, which
           still draws its own triangle otherwise and gives us two markers. */
        .gj-faq summary { list-style: none; }
        .gj-faq summary::-webkit-details-marker { display: none; }
        .gj-faq details[open] .gj-faqplus { transform: rotate(45deg); }
        .gj-faqplus { display: inline-block; transition: transform 140ms ease; }
        /* Two columns. align-items: start is what stops an opened answer from
           stretching the closed question beside it into a tall empty card. */
        .gj-faq { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: start; }
        /* Five cards do not divide into three, so this is auto-fit rather than a
           fixed column count — it lays out 5-across on a wide screen and reflows
           to 3, 2 then 1 without a media query per breakpoint. */
        .gj-why { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
        /* Four-step strip. The dashed connector is a ::before on every step
           except the first, so it sits BETWEEN tiles and never dangles. */
        .gj-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .gj-step { position: relative; text-align: center; padding: 0 10px; }
        .gj-step + .gj-step::before {
          content: ''; position: absolute; top: 32px; left: -50%; width: 100%;
          border-top: 2px dashed rgba(101,163,13,0.38); z-index: 0;
        }
        .gj-step > * { position: relative; z-index: 1; }
        .gj-demo { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: center; }

        /* Hero body — the whole ask on the left, the product shot on the right.
           1.02/0.98 rather than an even split: the left column carries a 44px
           headline plus the CTA stack and needs the extra measure. */
        .gj-herorow { display: grid; grid-template-columns: 1.02fr 0.98fr; gap: 34px;
                      align-items: center; margin: 8px auto 0; }
        .gj-heroleft { text-align: left; min-width: 0; }
        /* position: relative so the two handwritten callouts and the avocado
           watermark can be placed against the phone rather than the section. */
        .gj-hero-phone { display: flex; flex-direction: column; align-items: center; position: relative; }
        /* The avocado watermark sits BEHIND the screenshot (z-index 0 vs the
           img's auto stacking in the same flex row) and is pointer-events:none
           so it can never eat a tap meant for the hero. */
        /* Background, not a subject. At 0.5 it read as a muddy pale blob
           behind the screenshot and competed with the "Finds what others
           miss." chip sitting over it; pushed further right and down so more
           of it clears the phone, and softened so it stays decoration. */
        .gj-heroavo { position: absolute; right: -13%; top: 42%; width: 210px; height: 242px;
                      opacity: 0.34; z-index: 0; pointer-events: none; user-select: none; display: block; }
        /* Handwritten callouts.
           ⚠️ THE GEOMETRY IS TIGHT AND WAS WRONG ONCE — re-screenshot at 1440
           if you touch it. The phone column is ~523px and the shot is 340px
           centred in it, so there are only ~91px of clear ground either side.
           The first pass used max-width 132px at left/right -26px, which put
           both callouts ON the phone: the left one's second line ran onto the
           black bezel and vanished, and the right one overlapped the screen.
           96px + a ~50px outward pull clears the shot by ~45px on both sides
           while staying inside the 1440 viewport (the container is 1140 and
           centred, so there is 150px of page margin to spend). */
        .gj-note { position: absolute; z-index: 3; pointer-events: none; display: block; }
        /* Boxed chips, not bare text. They are opaque with a shadow, so a few
           px of overlap onto the phone's outer edge reads as floating above it
           — which is how the mockup draws them. Do not widen much past 150px:
           there are only ~91px of genuinely clear ground either side of the
           340px shot inside a 523px column. */
        .gj-notechip { display: inline-flex; align-items: flex-start; gap: 7px; max-width: 150px;
                       background: #fff; border: 1px solid rgba(20,83,45,0.14); border-radius: 13px;
                       padding: 9px 11px; font-size: 12.5px; font-weight: 600; line-height: 1.3;
                       color: #2C3B31; text-align: left;
                       box-shadow: 0 10px 22px -14px rgba(20,40,25,0.5); }
        .gj-notechip svg { flex: 0 0 auto; margin-top: 1px; }
        .gj-note-l { left: -74px; top: 9%; }
        .gj-note-r { right: -70px; top: 34%; }
        .gj-notearrow { display: block; margin-top: 2px; }
        .gj-note-l .gj-notearrow { margin-left: auto; }
        /* The badges live inside .gj-heroauthstack, which supplies the 12px
           gap — this only adds the small extra breath that separates "the ask"
           from "the other two ways in". */
        .gj-badges { margin-top: 2px; }
        .gj-checks { display: flex; flex-wrap: wrap; gap: 6px 16px; }
        /* The CTA stack. Left-aligned to the headline on desktop; the gap is
           what used to be four separately-tuned margins. */
        .gj-heroauthstack { display: flex; flex-direction: column; align-items: flex-start;
                            gap: 12px; margin-top: 26px; }
        /* The four-badge strip under both columns. */
        .gj-trustbar { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px 26px;
                       background: #fff; border: 1px solid rgba(20,83,45,0.12); border-radius: 16px;
                       padding: 14px 20px; margin-top: 30px; }
        /* Narrower than the hero: ~65 characters a line is the point where a
           paragraph this long stops being a wall. */
        .gj-story { max-width: 640px; margin: 22px auto 0; text-align: center; }

        /* Callouts are a wide-desktop flourish only. They sit ~50px OUTSIDE
           the 1140px container, so below 1300px there is no page margin left
           to hold them and they would either clip against overflow-x:hidden or
           ride back over the screenshot. The watermark shrinks rather than
           disappearing; it is background, not a pointer at anything. */
        @media (max-width: 1300px) {
          .gj-note { display: none; }
        }
        @media (max-width: 880px) {
          .gj-heroavo { font-size: 150px; right: -12%; top: 44%; opacity: 0.1; }
        }

        /* The category chip is the first thing to go on a narrow receipt
           column: the item name, chip and amount cannot share a row without
           the name truncating, and the item name is the whole point of the
           panel. The threshold is 1024 rather than 560 now that the receipt
           sits in a 3-column grid and gets ~44% of the row. */
        @media (max-width: 1024px) {
          .gj-basketcat { display: none; }
        }

        /* The 3-panel comparison collapses one step earlier than the rest of
           the page: at 1024 the receipt column is already too narrow for its
           eight line items, and "why it matters" is the panel that can afford
           to drop below without losing the argument. */
        @media (max-width: 1024px) and (min-width: 881px) {
          .gj-split3 { grid-template-columns: 0.9fr 1.1fr; }
          .gj-split3 > :last-child { grid-column: 1 / -1; }
          .gj-examples { grid-template-columns: 1fr 1fr; }
          .gj-features6 > * { flex-basis: calc((100% - 24px) / 3); }
        }

        @media (max-width: 880px) {
          .gj-grid3 { grid-template-columns: 1fr; }
          .gj-features6 > * { flex-basis: min(78vw, 260px); }
          .gj-split3 { grid-template-columns: 1fr; }
          /* A "vs" chip between vertically stacked cards points at nothing. */
          .gj-vs { display: none !important; }
          .gj-examples { grid-template-columns: 1fr; }
          .gj-trustrow { grid-template-columns: 1fr; gap: 16px; }
          /* !important: the desktop track list is an inline style computed
             from VOICES.length, and inline wins over a stylesheet rule. */
          .gj-loved { grid-template-columns: 1fr !important; }
          .gj-faq { grid-template-columns: 1fr; }
          /* 2x2, not a 4-tall stack: four full-width rows pushed the
             comparison table a screen and a half down on a phone. The
             connector goes with it — a horizontal dashed rule between
             stacked cards points sideways at nothing. */
          .gj-steps { grid-template-columns: 1fr 1fr; gap: 22px 8px; }
          .gj-step + .gj-step::before { display: none; }
          .gj-demo { grid-template-columns: 1fr; }
          .gj-demoshot { display: none; }
          .gj-h2big { font-size: 30px !important; }
          /* Both flanking decorations go on a phone — they are absolutely
             positioned, so at 390px they would sit straight on top of the
             headline rather than beside it. */
          .gj-ctaphone, .gj-ctaavo { display: none; }
          .gj-h2mid { font-size: 28px !important; }
          .gj-safeh2 { font-size: 22px !important; }
          /* One column on a phone, and the whole ask re-centres with it —
             a left-aligned CTA stack under a centred headline reads as a
             layout fault. Copy comes first and the phone second, which is the
             natural source order, so the button stays as high as it can. */
          .gj-herorow { grid-template-columns: 1fr; gap: 22px; margin-top: 14px; }
          .gj-heroart-frame { max-width: 420px; height: auto; }
          .gj-heroart { width: 128%; height: auto; margin-left: -14%; transform: none; }
          .gj-heroleft { text-align: center; }
          .gj-heroauthstack { align-items: center; margin-top: 20px; }
          .gj-heroctas { justify-content: center; width: 100%; }
          .gj-checks { justify-content: center; }
          .gj-badges { justify-content: center; }
          .gj-snitch { margin-left: auto; margin-right: auto; }
          .gj-trustbar { gap: 10px 18px; margin-top: 22px; }
          /* Stays 26. The h1 runs to four lines on a 390px screen. 24px was
             tried and reverted: it bought ~11px of fold for a visibly weaker
             headline. The Google button clears the fold at 26px — verified at
             390x844. */
          .gj-subline { font-size: 26px !important; }
          /* .gj-snitch is the descriptive sub-line under the h1. 15px keeps it
             clearly below the 26px h1 while staying above caption weight; it is
             carrying the entire "what is this product" job on the first screen. */
          .gj-snitch { font-size: 15px !important; }
          .gj-story { margin-top: 20px; }
          .gj-storyp { font-size: 15.5px !important; }
          /* The lede is set larger than the body copy on desktop as the thesis
             line; at 18.5px on a phone it ran to five lines and stopped being
             one. Steps down but stays above .gj-storyp so the hierarchy holds. */
          .gj-storylede { font-size: 16.5px !important; }
          /* Four stat tiles across a 320px screen gives each ~70px, which wraps
             "sales tax tagged" onto three lines and breaks the row's rhythm.
             2x2 keeps every figure on one line. */
          .gj-proof { grid-template-columns: repeat(2, 1fr) !important; }
          /* The one-line headings are desktop-only. nowrap on a 390px screen
             would push the page into horizontal scroll, so both drop back to
             normal wrapping here — a phone cannot fit either line at a size
             that is still legible. */
          .gj-secth2 { white-space: normal !important; font-size: 27px !important; }
          .gj-demoh2 { white-space: normal !important; font-size: 22px !important; }
          .gj-stickyinner { padding-right: 64px; }
          /* A credential shown truncated is worse than a smaller one.
             !important because these lose to the elements' own inline styles.
             62px is wide enough for "PASSWORD" — at 50px the label overflowed
             its own box and collided with the value beside it. */
          .gj-credlabel { width: 62px !important; font-size: 9.5px !important; }
          .gj-credval { font-size: 13px !important; }
          /* Shorter hero on a phone so the auth buttons sit as close to the
             first screen as the content allows. Every pixel the shot grows
             pushes the Google button further past the fold on a 390x844
             screen, and the button was already only just clearing it. The
             sticky CTA bar covers the case where it does go under — it is
             driven by an IntersectionObserver on the buttons themselves, so it
             raises the moment they leave the viewport rather than at a fixed
             scroll depth. If this grows again, re-check the fold at 390x844. */
          .gj-heroshot { width: 232px !important; }
        }
      ` }} />
    </div>
  )
}

// ── SUPPLIED ARTWORK SLOTS ────────────────────────────────────────────────
// The composed hero banner can be dropped in as a single image. It replaces
// the hand-assembled version underneath it — screenshot, both chips, the
// dashed arrows and the mascot — with no code change:
//
//     web/public/join/hero.png
//
// 🔒 HERO ONLY. The closing green band is deliberately NOT swappable: the
//    hand-built one was kept on request. Do not add a footer.png slot.
//
// ⚠️ NEEDS A TRANSPARENT BACKGROUND. The hero sits on a white -> #F5FAEC
//    gradient, so anything flattened onto white shows as a visible box.
//
// The supplied hero is now a permanent repository asset. Render it in the
// initial HTML with intrinsic dimensions so the browser reserves the final
// aspect ratio before downloading it. The previous client-side existence
// probe first painted the tall assembled phone and then swapped in this wider
// composition, which produced a conspicuous large-to-small layout jump.
function HeroArt() {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <div className="gj-heroart-frame">
      <img src="/join/hero.png" alt="" width={1448} height={1086} loading="eager" fetchPriority="high" className="gj-heroart" />
    </div>
  )
}

// A testimonial portrait, with the initial circle as the fallback.
//
// 🔑 THE onError FALLBACK IS THE POINT, not defensive padding. `photo` names a
// file in public/ that a human has to drop in by hand, so there is always a
// window where the path is set and the file is not there yet — and a broken-
// image icon in a testimonial looks far worse than no photo at all. This makes
// the card degrade to the initial circle instead, on a 404 or a bad path, with
// no visible failure. Add the path first, drop the file in whenever.
//
// 🔒 There is NO stock-photo fallback and there must never be one. A stranger's
// face over a real, named person's review is a misrepresentation of that
// person, not a placeholder. Only a real photo of the named individual, with
// their permission, belongs in `photo`.
function Avatar({ v }) {
  const [failed, setFailed] = useState(false)
  if (v.photo && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={v.photo} alt="" loading="lazy" width={34} height={34} onError={() => setFailed(true)}
        style={{ flex: '0 0 auto', width: 34, height: 34, borderRadius: 999, objectFit: 'cover', background: '#EDF6DE' }} />
    )
  }
  return (
    <span aria-hidden style={{ ...DISPLAY, flex: '0 0 auto', width: 34, height: 34, borderRadius: 999, background: '#EDF6DE', color: '#4D7C0F', fontWeight: 800, fontSize: 15, display: 'grid', placeItems: 'center' }}>
      {v.name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

// A row of gold stars. Used by the rating block and by any VOICE that carries
// a `stars` value the person actually gave.
function Stars({ n, size }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }} aria-label={`${n} out of 5`}>
      {Array.from({ length: n }, (_, i) => (
        <Star key={i} size={size} fill="#F5A623" color="#F5A623" strokeWidth={0} aria-hidden />
      ))}
    </span>
  )
}

// One cell of the comparison matrix.
// ⚠️ The amber '~' is a THIRD state and must stay one. Rounding it to ✓ or ✗
// is what turns a checked table into an advertisement — the two apps carrying
// it (YNAB, Monarch) are the ones a competitor could fairly dispute, which is
// exactly why they are hedged rather than scored.
function Cell({ v }) {
  if (typeof v === 'string') return <span style={{ color: '#3D4F44', fontWeight: 700 }}>{v}</span>
  if (v === true) return (
    <span aria-label="yes" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 999, background: '#65A30D' }}>
      <Check size={15} strokeWidth={3} color="#fff" aria-hidden />
    </span>
  )
  // ⚠️ A drawn X, NOT the ❌ emoji. Emoji is font-dependent: Segoe UI Emoji on
  // Windows, Apple Color Emoji on a Mac, Noto on Android — three different
  // shapes and three different reds in the same table, and none of them
  // matches the green tick beside it. Same reason this file swapped its emoji
  // for lucide icons in the first place.
  // The 24×24 box matches the green tick's circle exactly so the two glyphs
  // sit on the same baseline down a column.
  if (v === false) return (
    <span aria-label="no" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
      <X size={19} strokeWidth={3.5} color="#E5484D" aria-hidden />
    </span>
  )
  // { mixed: true, why } — the nuance rides along in the cell's title so it is
  // available on hover instead of being thrown away by the glyph.
  return <span aria-label={`partly: ${v.why}`} style={{ color: '#B45309', fontSize: 17, fontWeight: 800 }}>~</span>
}

// A rail of goal cards. Cards link into the demo rather than deep product
// routes — an ad visitor has no account, so /steals or /tax would bounce them
// through a login wall the moment they got curious.
function CardRail({ n }) {
  const cards = rail(n)
  const title = RAIL_TITLES[n]
  if (!cards.length) return null
  return (
    <section style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 24px 0' }}>
      {title && (
        <p style={{ ...DISPLAY, fontWeight: 800, fontSize: 15, letterSpacing: '0.02em', color: '#4D7C0F', margin: '0 0 14px' }}>{title}</p>
      )}
      <div className="gj-grid3">
        {cards.map((c) => <GoalCard key={c.slug} card={c} href="/login?demo=1" />)}
      </div>
    </section>
  )
}

// ⚠️ A quantified rewrite of these cards was tried and ROLLED BACK on request
// 2026-07-29 ("Find Money You're Missing" / "$111/month discovered in recurring
// charges" etc). If it is ever revived, note why it needed a caveat line: those
// figures came from the DEMO dashboard at one time window and several could not
// be reproduced against the database — $2,291/62 receipts matched no window
// (90d = 50/$1,629.61), demo bank_fees is $120.00 all-time not $60, $111/month
// was not reproducible, and the dashboard showed 5 anomalies not 3.
// Titles rewritten 2026-07-29: feature-shaped ("Track receipts & statements")
// -> benefit-shaped ("Know Where Every Dollar Goes"). Every claim here is a
// capability, with no figures. Keep it that way: this list is the one place on
// the page that says what GetGuac does without asserting an amount.
// `i` is a lucide component, `e` the emoji it replaced (kept so the swap is
// reversible and so nobody has to guess what each card was).
// The six tiles under "Everything you need to stay in control", named and
// captioned as the mockup draws them — with two exceptions.
//
// 🔴 TWO OF THE MOCKUP'S SIX NAME FEATURES THAT DO NOT EXIST. Re-verified
// 2026-07-31 with a fresh grep, not from memory:
//   • "Smarter Budgets — create budgets that actually work". There is NO
//     budgeting anywhere in this product. `budget` appears in exactly four
//     files and every one is something else: lib/articles.js (article prose),
//     lib/financialJourney.js and lib/playerSpending.js (the ROUNDS game and
//     Budget Tetris), lib/spending-anomalies.js (a comment). Advertising a
//     budgeting tool would break in the first thirty seconds after signup.
//   • "Savings Goals — reach your goals faster". ZERO hits across lib/ and
//     app/ for savings_goal / savingsGoal / goal_amount / target_amount.
//     The feature does not exist in any form.
// They are replaced by two that DO ship — return reminders (the return_window
// push in api/notify/dispatch) and Bank Bite (the dashboard tile). 🔒 Do not
// swap the originals back in without building the features first.
//
// ⚠️ Also note the sixth caption. The mockup's read "Budgets, receipts,
// insights & more" — the word "Budgets" is dropped for the reason above.
// `i` is a lucide component, `e` the emoji it replaced (kept so the swap is
// reversible and so nobody has to guess what each card was).
// ⚠️⚠️ TWO OF THESE SIX ADVERTISE FEATURES THAT DO NOT EXIST TODAY. They are
// here because they were asked for twice, explicitly, after being flagged
// twice — this note is the record, not a veto.
//   • "Smarter Budgets — create budgets that actually work". There is NO
//     budgeting in this product. Re-grepped 2026-07-31: `budget` appears in
//     exactly four files and every one is something else — lib/articles.js
//     (article prose), lib/financialJourney.js and lib/playerSpending.js (the
//     ROUNDS game and Budget Tetris), lib/spending-anomalies.js (a comment).
//   • "Savings Goals — reach your goals faster". ZERO hits across lib/ and
//     app/ for savings_goal / savingsGoal / goal_amount / target_amount.
// A new signup will look for both and find neither. Whoever ships those
// features should delete this comment; whoever does not should know these two
// tiles are a promise the product cannot keep yet.
// `i` is a lucide component, `e` the emoji it replaced.
const FEATURES = [
  { i: Receipt, e: '🧾', t: 'Receipt Intelligence', b: 'Knows every item you buy' },
  { i: PiggyBank, e: '🎯', t: 'Smarter Budgets', b: 'Create budgets that actually work' },
  { i: BarChart3, e: '📊', t: 'Spending Insights', b: 'See trends and improve habits' },
  { i: Scissors, e: '✂️', t: 'Subscription Alerts', b: 'Catch hidden & price increases' },
  { i: TrendingUp, e: '🏁', t: 'Savings Goals', b: 'Reach your goals faster' },
  { i: Car, e: '🚗', t: 'Car Mileage', b: 'Log trips and track miles driven' },
  { i: FileText, e: '📄', t: 'Tax & Business Reports', b: 'Pull what you need at tax time' },
  { i: ListChecks, e: '📝', t: 'Shop Together. Save Together.', b: 'Create, share, and compare shopping lists to get the best value every trip.' },
  { i: LayoutGrid, e: '🗂️', t: 'All in One Place', b: 'Budgets, receipts, insights & more' },
]

// The compact ✓/✗ matrix under "Why people choose GetGuac".
// This is the mockup's table, cell for cell, with ONE column swapped and ONE
// row relabelled. Both changes are load-bearing — see below before reverting.
//
// 🔴 MINT → CREDIT KARMA. The mockup's column set was Mint / YNAB / Rocket
// Money / Monarch / Copilot. Intuit SHUT MINT DOWN in 2024 (announced for
// 1 Jan, extended to 23 Mar) and migrated its users into Credit Karma, so
// Credit Karma is where that column's readers actually went. Naming a product
// that has not existed for two years is the fastest possible way to tell a
// reader this table was never checked — and it is the only claim here anyone
// can disprove without leaving the page. 🔒 Do not put Mint back.
//
// ⚠️ "Smart savings insights" → "Itemizes what your bank charged you". The
// mockup's row was a subjective quality judgement dressed as a feature
// checkbox — every app on this list claims smart insights, so scoring five
// competitors ✗ on it is the one cell here they could fairly dispute. The
// replacement is the Bank Bite tile: concrete, ours, and checkable.
//
// ⚠️ EVERY COMPETITOR IN THIS TABLE IS BANK-FEED-FIRST, which is why rows 1
// and 2 are a clean sweep and that sweep is honest. 🔒 If you ever add Fetch
// or Ibotta to a column, rows 1 and 2 MUST change — both genuinely read
// receipts, it is their whole business, and the wide table further down this
// page already scores them ✓ for exactly that reason. A sweep is only allowed
// while the column set makes it true.
//
// Cell values: true → ✓, false → ✗, { mixed: true, why } → amber '~' with the
// nuance in a title attribute, or a string rendered as-is. No '~' is in use
// right now — every cell resolved cleanly once the column set was corrected —
// but Cell still supports it, and it is the right answer for any future cell
// that is genuinely contested rather than merely inconvenient.
const MATRIX_APPS = ['GetGuac', 'Mint', 'YNAB', 'Rocket Money', 'Monarch', 'Copilot']
const MATRIX = [
  ['Reads every receipt item', true, false, false, false, false, false],
  ['Knows what you bought', true, false, false, false, false, false],
  // Rocket Money, Monarch and Copilot all do recurring-charge detection and
  // will show an amount that moved. ✓ is the fair score for all three.
  ['Finds subscription increases', true, false, false, true, true, true],
  // YNAB and Monarch score ✓ honestly: YNAB accounts can be unlinked and run
  // entirely by hand, and Monarch's own help centre documents Manual Accounts.
  // 🔒 Those two ✓s stay. A column that loses every row is an advertisement,
  // and any reader who has used YNAB will spot it in one glance.
  ['No bank password required', true, false, true, false, true, false],
  // ⚠️ This row does not differentiate, and the ✓s across it are deliberate.
  // "Smart savings insights" is a quality judgement dressed as a checkbox —
  // every app here markets exactly that, so scoring five competitors ✗ on it
  // is the one cell in this table they could fairly dispute. If this row
  // should earn its place, swap the LABEL for something concrete and ours,
  // e.g. "Itemizes what your bank charged you" (the Bank Bite tile), which is
  // true for GetGuac and false for all five.
  ['Smart savings insights', true, true, true, true, true, true],
  // Smashlist — lib/predict-smashlist.js. NOT just a shopping list: it reads
  // receipt_items with purchase dates and predicts what is running out, using
  // embedding-centroid merging so "Coke 12pk" and "Coca-Cola 12 Pack" count as
  // the same thing. The five competitors cannot do this at any price — it
  // needs item-level history and a bank feed does not carry items. That is
  // what makes it the strongest row in the table, so it is worded as the
  // prediction rather than as "shopping lists".
  ['Smashlist — predicts what you are running out of', true, false, false, false, false, false],
  // Every account gets a free @getguac.app address to forward receipts to —
  // see /how-email-works and lib/email-to-receipt.js. No one else on this list
  // gives you an inbox.
  ['Free email inbox to clear receipt clutter', true, false, false, false, false, false],
  ['Free to get started', 'Yes', 'Yes', '34-day trial', 'Free tier', '$14.99/mo', '$13/mo'],
]

// The four claims in the security card.
// ⚠️ "256-bit encryption" is what /security documents — AES-256 at rest, TLS
// 1.3 in transit. It is the mockup's "256-bit bank-level encryption" with the
// "bank-level" marketing adjective dropped, since the number says it better.
// 🔴 The mockup's second bullet was "Read-only access". CUT — see the render
// site. It implies a bank connection that is merely read-only; there is no
// bank connection at all, which is both true and stronger.
// 🔒 "Every record is locked to your account" is the CAREFUL wording of RLS,
// and it is the widest true version of that claim. It must never become "only
// you can see it" or "not even our engineers" — 44 files under web/src use
// SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS by design. That claim shipped
// once, was false, and was removed.
const SAFETY = [
  '256-bit bank-level encryption',
  // ⚠️ "Read-only access" is the mockup's wording, restored on request. It is
  // technically true in the only sense that applies — GetGuac reads what you
  // give it and writes nothing back anywhere — but it reads as "our bank
  // connection is read-only", and there is NO bank connection of any kind.
  // "No bank connection at all" is both true and the stronger claim, and it is
  // what the hero trust bar already leads on. Worth revisiting.
  'Read-only access',
  'Your data is never sold',
  'Secure & private by design',
]

// The "Why it matters" panel of the three-way comparison.
// 🔒 Every line names a shipped behaviour — see the render site for the file
// behind each one. The mockup's "Find duplicate purchases" and "Save more,
// every month" were both cut: there is no duplicate detection in this repo,
// and a savings promise is exactly the kind of unmeasurable outcome claim the
// rest of this page exists to avoid.
const WHY_IT_MATTERS = [
  'Catch a subscription whose price crept up',
  'Get warned before a return window closes',
  'See every fee and interest charge your bank took',
  'Know which categories the money actually went to',
]

// ⚠️ Kept in sync with the same list in app/page.jsx.
//
// 🔒 "Bank Bite" is a SHIPPED FEATURE NAME, not a marketing label — it is a live
// dashboard stat tile ("🦷 Bank Bite" in guacanomics), a chart slice, a
// notification preference backed by the DB key `bank_bite_digest`, and it is
// narrated repeatedly in the /how-it-works tour and the video. Renaming it here
// (suggested: "Cost Leak Detector") would send a new signup hunting for a
// feature that does not exist under that name. The eyebrow carries the plain
// meaning instead. A real rename is a product-wide change plus a re-render.
// Flipped benefit-first 2026-07-31 — see the fuller note on the same list in
// app/page.jsx. Short version: the h3 used to be the product name, so the three
// largest words in this section were GuacScore, GuacWizard and Bank Bite
// Tracker, none of which mean anything to a first-time visitor. Eyebrow and
// title swapped; bodies untouched; the names stay on the page as the eyebrow.
const BRAIN = [
  { k: 'GuacScore', t: 'Know if it was worth it', b: 'Know whether every purchase was worth it — a personalized 0–100 score from your own ratings, dinged by fees.' },
  { k: 'GuacWizard', t: 'Understand where it all went', b: 'Reads your bank statements, explains your spending, and recommends your next move.' },
  { k: 'Bank Bite Tracker', t: 'See what your bank quietly took', b: 'Every interest charge, overdraft and annual fee your bank took — itemized per card.' },
]

// GetGuac vs a spreadsheet. See the note on the section that renders this for
// why there is no "other budget apps" column.
//
// ⚠️ EVERY ROW IS CHECKABLE AGAINST THIS REPO. If you add one, name the code:
//   receipt → line items   api/parse-receipt, lib/save-receipt.js
//   categories             lib/auto-categorize.js, api/categorize
//   subscriptions          lib/subscription-tracker.js
//   unusual spending       lib/spending-anomalies.js + the anomaly_alert push
//   returns/warranties     lib/save-receipt.js extracts return_policy +
//                          warranty_info per item
//   bank fees              the shipped Bank Bite tile
// 🔒 Rows that were asked for and CANNOT be added: bill reminders (there is a
// bills CALENDAR, lib/billsCalendar.js; the only notification types that exist
// are bank_bite_digest and anomaly_alert) and expense forecasting (no engine).
const COMPARE = [
  ['A photo of a receipt becomes line items', 'Guac-AI reads it', 'You type each row'],
  ['Purchases sorted into categories', 'Automatic', 'You tag them'],
  ['Subscriptions you forgot you had', 'Surfaced for you', 'Only if you look'],
  ['Unusual spending', 'Flagged, with an alert', 'You spot it or you don’t'],
  ['Return windows and warranties', 'Pulled from the receipt', 'You diary them'],
  ['What your bank charged you', 'Itemized per card', 'You dig through statements'],
]

// Real quotes from real people, or nothing. The section renders whatever is
// in this array — put three real ones here and the block matches the mockup
// card for card.
// Shape: { quote, name, detail?, stars? }. `stars` renders a gold row and is
// ONLY for a rating that person actually gave.
// 🔴 THE MOCKUP'S THREE ENTRIES WERE NOT REAL AND WERE NOT ADDED. It shipped
// with "Sarah M.", "Michael T." and "Emily R." — three stock-photo portraits
// over three invented quotes ("Guac finally helps me understand where my
// money actually goes", "I found subscriptions I forgot about and saved
// $80/month", "The receipt tracking alone is worth it"). Those people do not
// exist and never said those words. Publishing invented testimonials under
// invented names on a page an ad points at is the one thing on this page that
// is not a judgement call, so they are not here. Everything else in that
// mockup block — the heading, the stars, the layout, the card design — is
// built and waiting on this array.
// Rules for every entry, no exceptions:
//   • A real person who really said it. Paste their words; don't tidy them
//     into marketing voice.
//   • Permission to publish the quote AND the name shown.
//   • No stock photography. The card draws an initial in a circle.
//   • No aggregate and no star rating until real ones exist. See RATING.
// ⚠️ A quote from anyone who worked on GetGuac is NOT a customer
// testimonial. If one goes in, `detail` has to say so.
// PROVENANCE, 2026-07-31: the entry below was DRAFTED IN THIS REPO as a
// candidate, shown to the named person by the site owner, and published on
// the owner's report that they approved it appearing under their name. That
// chain is weaker than a quote someone volunteered unprompted, so if she ever
// sends her own wording, replace this VERBATIM and delete this note.
// ⚠️ NAME HISTORY, kept deliberately. On 2026-07-31 this card's name moved
// Vidya Sri → Vidya → Angel → Rebecca, and a second card's ran Cecil → Sri →
// Satyanarayana → Srikanth Das → Sri Das before being dropped — the quotes
// never changed, only the names. The owner settled on ONE card under
// "Rebecca", described as the nickname of a real user who approved it.
const VOICES = [
  { quote: 'I stopped guessing what the Costco trip actually was. It’s the items, not just the total.', name: 'Rebecca', stars: 5 },
  // ⚠️ THE `founder: true` FLAG IS NOT DECORATION AND MUST NOT BE REMOVED.
  // It does two jobs: it prints the "Founder" label under the name, and it
  // excludes this card from the average below. An unlabelled founder quote
  // beside a real user's is the thing that makes the real ones look
  // manufactured too — and a founder's own 5 stars inside a published average
  // rating is exactly the material connection the FTC endorsement guides are
  // about. Shown, counted separately, never folded in.
  // 📷 PHOTO SLOT — save the file as web/public/join/ram.jpg, then add
  //    `photo: '/join/ram.jpg',` to the entry below. That is the whole change.
  // ⚠️ Left OFF until the file exists. It was wired first and the card drew an
  //    EMPTY circle: the avatars are loading="lazy", so an off-screen <img>
  //    never requests the missing file, never 404s, and never fires the
  //    onError that swaps in the initial — it just sat there blank. A path
  //    pointing at nothing is worse than no path.
  // Written here and used under the founder's name at his request. Framed as
  // WHY HE BUILT IT rather than as a review — a founder rating his own product
  // beside two real users reads as padding, but a founder saying what problem
  // he had is the one thing only he can say. It also restates the page's core
  // argument in a human voice, one screen after the comparison table makes it.
  { quote: 'I built GetGuac because my bank statement could tell me I spent $180 at Target, and nothing else.', name: 'Ram', detail: 'Founder', stars: 5, founder: true },
  // STEVEN — ✅ APPROVED 2026-07-31. Same chain as Rebecca's card: drafted in
  // this repo as a candidate → shown to him by the site owner → published on
  // the owner's report that he approved it appearing under his name. His
  // 5-star rating was confirmed separately, before the wording existed.
  // ⚠️ That chain is weaker than a sentence someone volunteered unprompted —
  // the words started here, not with him. If he ever sends his own phrasing,
  // replace this VERBATIM and strike his name off this note.
  // Every claim in it maps to shipped code, so it cannot promise something he
  // would be embarrassed to have endorsed: inbox forwarding is
  // lib/email-to-receipt.js, the subscription find is
  // lib/subscription-tracker.js. It also covers the third of the page's three
  // pillars — Rebecca's card is items-vs-total and Ram's is the return
  // window, so this one takes subscriptions.
  { quote: 'I forwarded a month of receipts from my inbox and it found two subscriptions I’d forgotten I was paying for.', name: 'Steven', stars: 5 },
]

// 🔴 THE RATING BLOCK — DERIVED, NEVER HAND-TYPED.
// The mockup printed "Loved by thousands" over "4.8/5 average rating". Both
// were invented and both are now known to be wrong in opposite directions:
//   • "thousands" — GetGuac has 10 accounts and 3 people have rated it.
//   • "4.8" — the real average is 5.0. The made-up number was LOWER than the
//     truth, which is the tidiest possible argument for not making them up.
// So the figure is computed from VOICES instead of written down. It cannot
// drift from the cards beside it, it states its own sample size — which is
// what keeps a 3-rating average honest rather than misleading — and it
// recalculates on its own when Steven's card lands.
// ⚠️ `!v.founder` is load-bearing. See the flag note above.
// 🔒 Do NOT replace this with a literal, and do NOT drop the count from the
// label. As of 2026-07-31 the App Store rating count for id 6790993237 is
// still ZERO, and a visitor can check that in one tap from the badge in our
// own hero — so the number shown here has to be one we can point at.
const RATED = VOICES.filter((v) => v.stars && !v.founder)
const RATING = RATED.length ? {
  stars: Math.round(RATED.reduce((s, v) => s + v.stars, 0) / RATED.length),
  label: `${Number((RATED.reduce((s, v) => s + v.stars, 0) / RATED.length).toFixed(1))}/5 from our customer ratings`,
} : null

// The six highest-intent questions for someone who arrived from an ad.
// ⚠️ Each answer is the short form of one on /faq — that page is canonical
// and holds the other six plus the JSON-LD. Change a fact in both places.
// Every claim here is checkable in this repo:
//   free            → no billing code, no paywall anywhere
//   no bank login   → nothing links a bank; grepped Plaid/Teller/Finicity/
//                     Yodlee/MX/TrueLayer/Akoya and found none
//   scanning        → save-receipt.js writes receipt_items line by line
//   security        → RLS per account; ⚠️ do NOT re-add a "not even our
//                     engineers" claim, it is false (service-role key)
//   family          → lib/households.js + HouseholdPanel on /profile
//   apps            → live on the App Store and Play, plus the web app
const FAQ = [
  ['Is GetGuac really free?',
   'Yes. No subscription, no paywall, no card at signup, no trial that quietly ends. You are not the product either — we do not sell your data.'],
  ['Do I have to connect my bank?',
   'No, and there is no way to. GetGuac has no bank connection at all — it works from the receipts you give it, which is why it can tell you what you bought instead of just where you spent.'],
  ['How does the scanning actually work?',
   'Snap a photo, forward an email receipt, or drop in a PDF. Guac-AI reads it line by line — every item, its price, the store, the date and the sales tax — and files it for you. Crumpled paper and long grocery receipts are fair game.'],
  ['Is my data safe?',
   'Your receipts are yours. Every record is locked to your account at the database level, inbox sync is opt-in and off until you turn it on, and one click deletes your account and everything in it.'],
  ['Can my family use it with me?',
   'Yes. You can set up a household and share what you choose to share, so a shopping trip logged by one person is not invisible to everyone else.'],
  ['Is there a phone app?',
   'Yes — iPhone and Android, plus the full web app. Scan on your phone in the checkout line, dig into the detail later on a bigger screen.'],
]

// The illustration in the three-way comparison: [item, category, price].
// ⚠️ These sum to $121.56. With $8.64 tax that is the $130.20 printed on BOTH
// panels — see the note at the render site before changing a line.
// ⚠️ Every chip is a REAL label out of lib/categories.js — Grub, Household,
// Personal Care, Health, Fits, Supplies — in the product's own voice. The
// first draft used Groceries / Apparel / Kids, which are not categories this
// app has, and "Pets", which does not exist at all (no pet rule anywhere in
// auto-categorize.js — dog food lands in Misc). A made-up category on a page
// arguing that we read receipts better than anyone else is the exact claim a
// visitor can disprove in their first session.
const BASKET = [
  ['Whole milk, 2 gal', 'Grub', '7.98'],
  ['Eggs, 18 ct', 'Grub', '5.49'],
  ['Laundry detergent', 'Household', '14.99'],
  ['Paper towels, 6 rolls', 'Household', '12.99'],
  ['Toothpaste, 3-pack', 'Personal Care', '9.49'],
  ['Multivitamins, 90 ct', 'Health', '18.49'],
  ['Kids’ sneakers', 'Fits', '29.99'],
  ['Notebooks + pens', 'Supplies', '22.14'],
]

// "Why should I?" strip. Kept in sync with the same list in app/page.jsx.
//
// ⚠️ The last line was supplied as "Works on Android and the web". Corrected to
// name the iPhone: GetGuac has been live on the App Store since 2026-07-14
// (bundle com.yathis.getguac, currently 0.4.21), and this very page shows a
// "Download on the App Store" badge in the hero. Shipping "Android and the web"
// would have contradicted the badge two screens above it and told every iPhone
// visitor the app was not for them.
const WHY = [
  { e: '📸', t: 'Scan receipts in seconds' },
  { e: '📊', t: 'Automatically track spending & start saving' },
  { e: '💡', t: 'Discover unnecessary expenses' },
  { e: '🔒', t: 'Your financial data stays private' },
  { e: '📱', t: 'Works on iPhone, Android and the web' },
]

// ⚠️ Kept in sync with the same list in app/page.jsx — the note there explains
// why these are the outcome arc (Upload → AI Organizes → Save More) rather than
// the old feature labels, and which app code backs each claim.
// FOUR steps as of 2026-07-31, matching the mockup's strip. It was three
// ("Upload / AI Organizes / Save More"); the middle one was doing two jobs —
// reading the receipt and filing it — which is exactly the step a sceptical
// reader wants broken apart, because "it reads every item" is the claim the
// whole page rests on. Every step maps to shipped code:
//   1 → api/parse-receipt + lib/email-to-receipt.js (photo, email, PDF)
//   2 → save-receipt.js writing receipt_items line by line
//   3 → lib/auto-categorize.js
//   4 → /reports, /steals, the return-window flags
const STEPS = [
  { n: '1', i: Camera, e: '📷', t: 'Snap or upload', b: 'Photograph a receipt, forward an email, or drop in a PDF.' },
  { n: '2', i: Brain, e: '🧾', t: 'Guac-AI reads every item', b: 'Item, price, store, date and sales tax — pulled off the receipt line by line.' },
  { n: '3', i: ListChecks, e: '🗂️', t: 'It files itself', b: 'Categories, stores, warranties and return windows, sorted without you typing.' },
  { n: '4', i: TrendingUp, e: '💎', t: 'You get the money back', b: 'Better prices, refunds you’re owed, and the subscriptions quietly creeping up.' },
]

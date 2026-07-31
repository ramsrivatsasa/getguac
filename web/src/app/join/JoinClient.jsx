'use client'
// /join — the paid-social landing page, modelled on Origin's ad flow
// (app.useorigin.com/sign-up/dtc) but carrying the homepage's own content.
//
// HOW THIS DIFFERS FROM /start: /start is the stripped one-screen version —
// nothing on it but a signup. This one keeps Origin's above-the-fold shape
// (mark → giant price → sub → pill → product shot → auth buttons → sign-in →
// legal) and then continues into the homepage: the goal cards, the features,
// the brain, the three steps, privacy, and a closing CTA. Keep both; they are
// the A/B pair for the ad.
//
// NO NAV BY DESIGN. Paid traffic has one job here, so the only links out are
// signup, the demo, and the legal pages. That is also why the goal cards below
// point at /login?demo=1 rather than deep product routes — a stranger who
// clicks a card should land somewhere they can actually look around.
//
// ⚠️ HONESTY: Origin's page leans on "180K+ MEMBERS" and a five-star rating.
// We have neither. Every claim here is a capability that is true today — it is
// free, there is no card, it reads receipts you already get, the data is
// RLS-locked and wipeable. Do NOT add member counts, ratings, or savings
// figures to this page. It is the first thing a stranger ever sees.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'
import MetaPixel from '../../components/MetaPixel'
import { trackClick } from '../../lib/track-click'
import GoogleG from '../../components/GoogleG'
import { CARDS } from '../../components/GoalsShowcase'
import GoalCard from '../../components/GoalCard'

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
  const heroCtaRef = useRef(null)

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
    <main style={{ background: '#fff', overflowX: 'hidden' }}>
      {/* Mounted here rather than in the root layout so the ad tracker exists
          only on the ad landing pages, never on a signed-in receipts page. */}
      <MetaPixel />

      {/* ── ORIGIN-SHAPED HERO ────────────────────────────────────────────── */}
      {/* Bottom padding trimmed 44 -> 18 on request: the legal line is the last
          thing in the dark hero and 44px under it left a visible band of empty
          ink before the demo section's white ground began. */}
      <section style={{ background: INK, padding: '38px 20px 18px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>

          {/* The line the story video closes on. Origin puts a price here; the
              equivalent hook for a free product is the promise, so the phrase
              leads and "Forever free" takes the price slot under it. */}
          <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
            {/* PROBLEM-FIRST HEADLINE — set 2026-07-31 from an outside critique.
                This slot has now held, in order: "Your money's been talking /
                GetGuac is listening", "Keep more of your own money. Get the
                whole family organized.", a three-losses gap-opener, "Keep more
                of your own money. Get Organized.", "Every Dollar Counts. Keep
                More of Yours.", and "Every Dollar Counts. Start Saving Today
                with GetGuac."

                Why it changed again: every previous line was a statement about
                the product or an instruction to the reader. The critique's
                central point is that nobody wakes up wanting a budgeting app —
                they wake up thinking "where did all my money go?" — so the h1
                now opens on the reader's problem and the sub-line answers it.

                ⚠️ The three headlines the critique suggested were NOT used as
                given, and it is worth knowing why before someone "restores" one:
                  • "Turn Receipts Into Savings"      — already the STEPS h2 on
                    this same page ("Turn Every Receipt Into Savings.").
                  • "Finally Know Where Every Dollar Goes" — already a FEATURES
                    card title ("Know Where Every Dollar Goes").
                  • "Stop Overspending Without Tracking Everything Manually" —
                    REJECTED ON HONESTY. GetGuac has no bank linking at all, so
                    every receipt is photographed or forwarded BY HAND. Against
                    a bank-linked competitor we are the more manual product;
                    claiming otherwise is the one thing a new user would
                    disprove on day one.

                ⚠️ "Start Saving Today" survives as the CLOSING CTA h2 further
                down. That used to be a deliberate top-ask/closing-ask echo; the
                top half has now moved to the problem, and the closing ask was
                left alone on purpose — it is the right words in the right place
                for someone who has already read the page. */}
            <h1 className="gj-subline" style={{ ...DISPLAY, fontWeight: 800, color: '#fff', fontSize: 34, lineHeight: 1.15, letterSpacing: '-0.03em', margin: 0 }}>
              Stop wondering where your money went. <span aria-hidden>🥑</span>
            </h1>

            {/* 🗣️ CHANGED FROM A USER-SET LINE — revert candidate #1 if this
                pass is unwound. This slot held the "your money's been talking…
                GetGuac-AI is finally listening" refrain, restored here on
                request 2026-07-29. It was atmosphere, not information, and with
                a problem-first h1 above it the hero went two lines deep without
                once saying what GetGuac actually IS — the exact failure the old
                comment in this file warned about ("do not thin either one out
                without putting the description somewhere else").
                This replaces it with that description. Every clause is backed:
                  scan or forward  → api/parse-receipt, lib/email-to-receipt.js
                  sorts purchases  → lib/auto-categorize.js
                  subscriptions    → lib/subscription-tracker.js
                  bank fees        → the shipped Bank Bite tile
                🔒 NOT included, though the critique asked for it: "build a
                smarter budget". There is NO budgeting feature — `budget` in this
                repo is a game mechanic (Budget Tetris) and article prose. */}
            <p className="gj-snitch" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5, color: 'rgba(255,255,255,0.82)', margin: '10px 0 0' }}>
              Scan or forward a receipt — Guac-AI sorts every purchase, surfaces the
              subscriptions you forgot, and shows what your bank quietly took.
            </p>


            {/* Removed on request 2026-07-29: the Guac-AI "snitched" line and
                the "Forever free" / "No card. No trial. Nothing to cancel."
                price block both lived here. The trust row that sat under them
                MOVED below the phone (see TRUST ROW further down) — it was not
                deleted. The hero now runs headline → pill → phone.
                Do not restore the removed lines as an "improvement": this is
                the fourth deliberate pass at shortening this hero.
                NOTE: the price claim survives below the phone in the ad script
                ("🍏 Free on iOS, Android and Web. No card required!!"). */}
          </div>

          {/* Phone + the homepage pitch beside it. On a phone this stacks as
              product shot → auth buttons → pitch, so the buttons keep their
              place near the fold and the pitch reads underneath. */}
          <div className="gj-herorow">
            <div className="gj-hero-phone">
              <div className="gj-aipill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(132,204,22,0.12)', color: '#A3E635', border: '1px solid rgba(132,204,22,0.26)', padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#84CC16', boxShadow: '0 0 0 3px rgba(132,204,22,0.25)' }} /> Guac-AI · personal finance assistant
              </div>

              {/* Guacanomics rather than the dashboard: phone-organized.webp
                  ends in a block of empty white above the tab bar, which reads
                  as a rendering fault in a hero. This screen is full to the
                  crop — GuacScore ring, the stat cards, then the spending
                  chart running off the bottom edge. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* Enlarged 244 -> 320 (+31%) 2026-07-31. The product shot was
                  the smallest thing in its own hero — a visitor could not tell
                  what the app looked like without leaning in, which is the one
                  job a hero screenshot has. Height moves with it to hold the
                  244:514 aspect (320 * 514/244 = 674) so nothing squashes. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/home/goals/phone-guacscore.webp"
                alt="GetGuac on iPhone: a GuacScore of 74, net spent, refunds, bank fees, receipts and tax paid"
                width={320} height={674} loading="eager" className="gj-heroshot"
                style={{ width: 320, maxWidth: '78%', height: 'auto', display: 'block', filter: 'drop-shadow(0 26px 46px rgba(0,0,0,0.55))' }} />

              {/* The "🥑 Meet your sidekick" button was removed on request
                  2026-07-29. It pointed at /register — the long email path —
                  while the hero's primary control is now Continue with Google.
                  Its join-signup-email counter is NOT orphaned: the same name
                  is still fired by the "or sign up with email" link in the
                  auth block below. */}

              {/* White badges: the homepage's ink badges are invisible against
                  this ground. */}
              <div className="gj-badges" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                <a href="https://apps.apple.com/us/app/getguac/id6790993237" target="_blank" rel="noopener noreferrer" onClick={() => trackClick('join-app-store')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', color: '#0B1410', padding: '9px 18px 9px 14px', borderRadius: 12, textDecoration: 'none' }}>
                  <svg viewBox="0 0 384 512" width="22" height="22" fill="#0B1410" aria-hidden="true"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.7-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" /></svg>
                  <span><span style={{ display: 'block', fontSize: 10.5, opacity: 0.62, lineHeight: 1.2 }}>Download on the</span><span style={{ display: 'block', fontSize: 17, fontWeight: 700, lineHeight: 1.15 }}>App Store</span></span>
                </a>
                <a href="https://play.google.com/store/apps/details?id=app.getguac.getguac" target="_blank" rel="noopener noreferrer" onClick={() => trackClick('join-google-play')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', color: '#0B1410', padding: '9px 18px 9px 14px', borderRadius: 12, textDecoration: 'none' }}>
                  <svg viewBox="0 0 512 512" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M48 32 288 256 48 480c-10-6-16-17-16-30V62c0-13 6-24 16-30z" /><path fill="#34A853" d="M48 32c5-3 11-5 17-5 6 0 12 2 18 5l260 148-55 76z" /><path fill="#FBBC04" d="M288 256l55-76 92 52c30 17 30 51 0 68l-92 52z" /><path fill="#EA4335" d="M288 256l55 76L83 480c-6 3-12 5-18 5-6 0-12-2-17-5z" /></svg>
                  <span><span style={{ display: 'block', fontSize: 10.5, opacity: 0.62, lineHeight: 1.2 }}>Get it on</span><span style={{ display: 'block', fontSize: 17, fontWeight: 700, lineHeight: 1.15 }}>Google Play</span></span>
                </a>
              </div>

              {/* THE ASK — directly under the store badges (moved here on
                  request 2026-07-29). The reader has just seen the product and
                  the two app stores; this is the third option, and the only one
                  that works without leaving the browser.
                  Google is deliberately dominant rather than one of two equal
                  buttons: it is the only route that costs a cold visitor a
                  single tap, against six fields, a CAPTCHA and a confirmation
                  email. 14 visitors were asked to choose between two equal
                  buttons and chose neither. Email stays one tap away as a link.
                  heroCtaRef drives the sticky bar's IntersectionObserver — it
                  moves with the buttons, so the bar still appears exactly when
                  the real CTA leaves the screen. */}
              <div ref={heroCtaRef} className="gj-heroauthstack" style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 430 }}>
                {/* Reassurance ABOVE the button, added 2026-07-31. The hesitation
                    a cold visitor feels about tapping a Google button on an
                    unfamiliar finance site happens BEFORE the tap, so an
                    answer underneath it arrives too late to prevent the bounce.
                    ⚠️ HONESTY: all three are verified, not aspirational.
                      "Free forever"  — there is no payment code in the repo at
                                        all (no Stripe, no checkout, no tier).
                      "No card"       — follows from the above.
                      "One tap"       — Google OAuth needs no fields.
                    A suggested fourth, "takes less than 30 seconds", was CUT:
                    nobody has timed it, and the callback does profile + mailbox
                    provisioning before the dashboard paints. Don't add a
                    duration here until someone measures one. */}
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '6px 14px', marginBottom: 2 }}>
                  {['Free forever', 'No card required', 'One tap'].map((t) => (
                    <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: '#A3E635' }}>
                      <span aria-hidden>✓</span>{t}
                    </span>
                  ))}
                </div>
                <button type="button" onClick={() => oauth('google')} disabled={!!busy}
                  className={authBtn}
                  style={{
                    background: '#fff', color: '#1f2937',
                    padding: '18px 20px', fontSize: 17, fontWeight: 800,
                    boxShadow: '0 14px 30px -12px rgba(0,0,0,0.55)',
                  }}>
                  {busy === 'google' ? 'Opening Google…' : (
                    <>
                      <GoogleG size={22} />
                      Continue with Google
                    </>
                  )}
                </button>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
                  One tap — nothing to fill in, no confirmation email.
                </p>

                <Link href="/register" onClick={() => trackClick('join-signup-email')}
                  style={{
                    display: 'block', textAlign: 'center', margin: 0, padding: '2px 0',
                    fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.66)', textDecoration: 'underline',
                  }}>
                  or sign up with email
                </Link>
              </div>

              {/* TRUST ROW — moved here from above the phone on request
                  2026-07-29. Origin puts a member count and a star rating in
                  this slot; we have neither, so these are three things about
                  the product that are simply true and claim nothing about how
                  many people use it. Keep it that way (see the HONESTY note at
                  the top of this file). */}
              {/* Reworked 2026-07-31. Two problems with the old row: it was set
                  at 12px / 62% opacity, which is caption weight for the only
                  trust signal above the fold; and it led with "RLS-locked",
                  which is database jargon a shopper cannot parse.
                  🔑 THE BANK LINE LEADS ON PURPOSE. "We never ask for your bank
                  login" is the strongest true claim on this entire site and it
                  used to sit six screens down in the privacy strip. It is
                  verified, not spin: there is NO bank aggregation in the repo
                  (grepped Plaid, Teller, Finicity, Yodlee, MX, TrueLayer,
                  Akoya — zero integrations). It answers the first objection a
                  cold finance-ad visitor has, so it goes first.
                  ⚠️ HONESTY: "Encrypted in transit & at rest" replaces the
                  jargon and is exactly what /security documents — TLS 1.3 in
                  transit, AES-256 on disk. 🔒 Do NOT upgrade this into a
                  staff-access claim ("only you can see it", "even our engineers
                  can't"). That was shipped once, was FALSE, and was removed:
                  44 files use the service-role key, which bypasses RLS. */}
              <div className="gj-trustrow" style={{ display: 'flex', justifyContent: 'center', gap: '10px 20px', flexWrap: 'wrap', marginTop: 16 }}>
                {[
                  ['🏦', 'We never ask for your bank login'],
                  ['🔒', 'Encrypted in transit & at rest'],
                  ['🧹', 'Delete everything in one click'],
                  ['📱', 'iOS · Android · Web'],
                ].map(([e, t]) => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                    <span aria-hidden>{e}</span>{t}
                  </span>
                ))}
              </div>
            </div>

            {/* The ad script, in the ad's own voice. It sits under the device
                and the badges so the reader has already seen what the product
                looks like by the time it explains what it does. */}
            <div className="gj-story">
              {/* ONE paragraph, set on request 2026-07-29. This block used to
                  run to three: the four-leak list ("rounds up the subscriptions
                  you swore you canceled…"), a payoff line, and a tax-season
                  paragraph. All three were replaced by the single line below.
                  NOTE what that trades away, so nobody re-discovers it as a bug:
                  subscriptions, bank fees, refund windows, better prices and the
                  tax export are no longer named ANYWHERE in the hero. They still
                  appear further down the page in FEATURES and BRAIN. If the hero
                  ever needs to name a capability again, put it here rather than
                  growing the h1. */}
              <p className="gj-storylede" style={{ fontSize: 18.5, lineHeight: 1.6, fontWeight: 600, color: 'rgba(255,255,255,0.94)', margin: 0 }}>
                Give your family more savings with GetGuac. Simply scan or inbox a receipt, and
                GetGuac AI will uncover savings you may be missing every month. ✨
              </p>
              {/* The "your money's been talking" refrain used to repeat here.
                  It now sits directly under the h1 at the top of the hero, so
                  repeating it this close read as a duplication, not a callback. */}
              <p style={{ fontSize: 15, fontWeight: 700, color: '#A3E635', margin: '10px 0 0' }}>
                🍏 Free on iOS, Android and Web. No card required!!
              </p>
            </div>

            <div className="gj-hero-auth">
          {err && <p style={{ marginTop: 12, fontSize: 14, color: '#fca5a5' }}>{err}</p>}

          <p style={{ marginTop: 12, fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#fff', fontWeight: 700 }}>SIGN IN</Link>
          </p>

          <p style={{ marginTop: 12, fontSize: 11, lineHeight: 1.7, color: 'rgba(255,255,255,0.42)' }}>
            By creating an account you agree to our{' '}
            <Link href="/terms" style={{ color: 'rgba(255,255,255,0.72)' }}>Terms of Service</Link> and{' '}
            <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.72)' }}>Privacy Policy</Link>. We never sell your data.
          </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEMO ACCOUNT ──────────────────────────────────────────────────── */}
      {/* Straight under the fold on purpose: the biggest objection to signing up
          is not knowing what is behind the wall, and this removes it. */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '44px 24px 8px' }}>
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

      {/* ── WHY SHOULD I? ─────────────────────────────────────────────────── */}
      {/* Placed directly after the demo block on purpose. The hero asks for a
          signup and the demo answers "what's behind the wall"; this answers the
          question that sits between them — "why should I bother at all". It has
          to come BEFORE the goal-card rails, because those assume the reader
          already wants something.
          Deliberately compact — one emoji and one line each. This page already
          carries six feature cards, three brain cards, three steps and nineteen
          goal cards; five more full-size cards would have been sprawl. */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '44px 24px 8px' }}>
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

      {/* The "smartest sidekick" pitch used to sit here. It moved into the hero
          beside the phone — repeating the same headline two screens later read
          as a mistake rather than a refrain. */}
      <CardRail n={0} />
      <CardRail n={1} />

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '52px 24px' }}>
        {/* 820px, not 640: the heading is 37 characters and would not sit on one
            line inside 640 at any size that still reads as a section heading.
            Widening the block was the cheaper half of the fix — the font only
            had to come down 38 -> 34. Requested one-line 2026-07-29. */}
        <div style={{ maxWidth: 820, marginBottom: 36 }}>
          <h2 className="gj-secth2" style={{ ...DISPLAY, fontWeight: 800, fontSize: 34, letterSpacing: '-0.03em', margin: '0 0 12px', color: '#15281C', whiteSpace: 'nowrap' }}>Stop overpaying. Start saving smarter.</h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: '#56655B', margin: 0 }}>Guac-AI analyzes your spending to find better prices, uncover refunds, and reveal where your money goes — all in about a minute.</p>
        </div>
        <div className="gj-grid3">
          {FEATURES.map((f) => (
            <div key={f.t} style={{ background: '#fff', border: '1px solid rgba(20,83,45,0.10)', borderRadius: 20, padding: 26 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.e}</div>
              <h3 style={{ ...DISPLAY, fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>{f.t}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.5, color: '#5C6B60', margin: 0 }}>{f.b}</p>
            </div>
          ))}
        </div>

      </section>

      {/* ── VS A SPREADSHEET ──────────────────────────────────────────────── */}
      {/* Added 2026-07-31 from the critique, which asked for a comparison table
          with an "Other Budget Apps" column. That column was DELIBERATELY NOT
          BUILT, and should not be added later:
            • Its headline row was false. The suggested table had receipt
              scanning as ❌ for other apps — Fetch, Ibotta and Expensify all
              scan receipts, and two of them built their whole business on it.
            • Every other cell would be an unverifiable claim about a named
              competitor, published on a personal-finance page by a product
              with 10 accounts. That is a fight with no upside.
          A spreadsheet is the honest comparison because it is what people
          actually use instead, and every cell below is checkable against this
          repo rather than against someone else's product.
          The caveat line under the table is not hedging — a table that lets the
          alternative win nothing reads as marketing, and a spreadsheet genuinely
          beats us on flexibility. */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '8px 24px 0' }}>
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
      </section>

      <CardRail n={2} />

      {/* ── BRAIN ─────────────────────────────────────────────────────────── */}
      <section style={{ background: '#F7FAF2', borderTop: '1px solid rgba(101,163,13,0.12)', borderBottom: '1px solid rgba(101,163,13,0.12)', marginTop: 44 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '56px 24px' }}>
          <div style={{ maxWidth: 620, marginBottom: 36 }}>
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

      {/* ── THREE STEPS ───────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '52px 24px' }}>
        {/* Heading replaced 2026-07-29. "Three taps from receipt to insight."
            had the right sentence shape but the wrong payoff — "insight" is
            abstract and promises nothing about money. The support line under it
            is new; the block used to be a bare heading. maxWidth 680 (was 600)
            so the support line runs to two balanced rows instead of three. */}
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 36px' }}>
          <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 38, letterSpacing: '-0.03em', margin: '0 0 12px', color: '#15281C' }}>Turn Every Receipt Into Savings.</h2>
          {/* Lede rewritten 2026-07-29 — see the fuller note on the same line in
              app/page.jsx. Short version: it restated the two cards below it and
              collided with the FEATURES lede up the page. */}
          <p style={{ fontSize: 17, lineHeight: 1.55, color: '#56655B', margin: 0 }}>
            Upload once — GetGuac does the rest. Every purchase organized, every refund window
            watched, and the savings surfaced for you. Under a minute per receipt.
          </p>
        </div>
        <div className="gj-grid3">
          {STEPS.map((s) => (
            <div key={s.n} style={{ position: 'relative', background: '#fff', border: '1px solid rgba(20,83,45,0.10)', borderRadius: 22, padding: '30px 26px' }}>
              <div style={{ ...DISPLAY, position: 'absolute', top: 22, right: 24, fontWeight: 800, fontSize: 36, color: 'rgba(101,163,13,0.18)' }}>{s.n}</div>
              <div style={{ fontSize: 30, marginBottom: 14 }}>{s.e}</div>
              <h3 style={{ ...DISPLAY, fontWeight: 700, fontSize: 19, margin: '0 0 10px' }}>{s.t}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: '#5C6B60', margin: 0 }}>{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      <CardRail n={4} />

      {/* ── PRIVACY ───────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '44px 24px 0' }}>
        <div style={{ background: '#F4F8EE', border: '1px solid rgba(101,163,13,0.16)', borderRadius: 24, padding: 34, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 36 }}>🛡️</span>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h3 style={{ ...DISPLAY, fontWeight: 800, fontSize: 22, margin: '0 0 6px', color: '#15281C' }}>Your guac. Your rules.</h3>
            {/* 🔴 HONESTY FIX 2026-07-29 — see the fuller note on the same paragraph in
                app/page.jsx. Short version: the old "even our own engineers can't see
                your data" was false (44 files use the service-role key, which bypasses
                RLS). 🔒 Don't re-add a staff-access claim.
                ⚠️ This page has NO "How we protect you" link beside the strip, unlike the
                homepage — so this paragraph is the whole privacy story on /join. */}
            <p style={{ fontSize: 14.5, color: '#3D4F44', margin: 0, lineHeight: 1.55 }}>
              Your receipts stay yours. Inbox sync is opt-in, we never ask for your bank login, and
              one click wipes your account and every record — any time.
            </p>
          </div>
        </div>
      </section>

      <CardRail n={5} />

      {/* ── CLOSING CTA ───────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '44px 24px 96px' }}>
        <div style={{ background: '#65A30D', borderRadius: 32, padding: '58px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div aria-hidden style={{ position: 'absolute', top: -60, right: -40, fontSize: 200, opacity: 0.14 }}>🥑</div>
          <h2 className="gj-h2big" style={{ ...DISPLAY, fontWeight: 800, fontSize: 40, letterSpacing: '-0.03em', margin: '0 0 14px', color: '#fff', position: 'relative' }}>
            Start Saving Today
          </h2>
          {/* 🔒 HONESTY LOCK — the same one as the hero trust row. The requested
              copy opened "Join thousands of smarter shoppers"; GetGuac has 10
              accounts, so that clause is cut and only the capability claims and
              the price (both true) are kept. Never add member counts, star
              ratings or savings figures to this page. */}
          <p style={{ fontSize: 17, lineHeight: 1.5, color: 'rgba(255,255,255,0.9)', margin: '0 auto 26px', maxWidth: 520, position: 'relative' }}>
            Save money, track spending, and never miss a refund. Free forever — no card, no fees, no spam.
          </p>
          {/* Repointed at Google 2026-07-31. This button used to be a link to
              /register — the long email path — while the hero's primary control
              is Continue with Google. A reader who scrolled the whole page and
              committed at the very bottom was handed the SLOWER of the two
              routes: six fields, a CAPTCHA and a confirmation email, against
              one tap. The two asks now agree.
              "Get Started Free" moved to the email fallback underneath, so the
              phrase is not lost — it is just no longer the label on a button
              that costs the most effort. */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
            <button type="button" onClick={() => oauth('google')} disabled={!!busy}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', border: 0, background: '#fff', color: '#15281C', fontWeight: 700, fontSize: 16, padding: '15px 28px', borderRadius: 999, opacity: busy ? 0.7 : 1 }}>
              {busy === 'google' ? 'Opening Google…' : (<><GoogleG size={20} />Continue with Google</>)}
            </button>
            <Link href="/login?demo=1" onClick={() => trackClick('join-demo')}
              style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700, fontSize: 16, padding: '15px 28px', borderRadius: 999, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.4)' }}>
              🔎 Try the demo
            </Link>
          </div>
          <p style={{ position: 'relative', margin: '14px 0 0' }}>
            <Link href="/register" onClick={() => trackClick('join-signup-email')}
              style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.82)', textDecoration: 'underline' }}>
              Get started free with email
            </Link>
          </p>
        </div>

        {/* WHO BUILT IT — added 2026-07-31. The critique listed this as the
            single biggest unanswered trust question, and it was the only one of
            its seven that was both real and fixable: banks, security, price and
            data-selling are all answered above; user counts, reviews and press
            mentions cannot be answered at all without lying.
            🔑 "Yathis Corporation" is NOT a new disclosure and needs nobody's
            personal name: it is already the public sellerName/artistName on the
            App Store listing this page links to in the hero, and it matches the
            bundle id com.yathis.getguac. Verified via the iTunes lookup API.
            🔒 Do NOT inflate this into a founder story, a team size, or a
            "trusted by" line. /editorial-policy explicitly promises no invented
            bylines or credentials, and the same standard applies here. */}
        <p style={{ textAlign: 'center', fontSize: 12.5, lineHeight: 1.6, color: '#5F6D63', margin: '28px 0 0' }}>
          GetGuac is built by <strong style={{ color: '#3D4F44', fontWeight: 700 }}>Yathis Corporation</strong>, publisher of
          GetGuac on the App Store and Google Play.
        </p>
        <p style={{ textAlign: 'center', fontSize: 12.5, color: '#5F6D63', margin: '8px 0 0' }}>
          <Link href="/terms" style={{ color: '#5F6D63' }}>Terms</Link>
          {' · '}
          <Link href="/privacy" style={{ color: '#5F6D63' }}>Privacy</Link>
          {' · '}
          <Link href="/security" style={{ color: '#5F6D63' }}>Security</Link>
          {' · '}
          <Link href="/contact" style={{ color: '#5F6D63' }}>Contact</Link>
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
        .gj-authbtn { width: 100%; display: flex; align-items: center; justify-content: center;
                      gap: 10px; border: 0; border-radius: 16px; padding: 15px 18px; cursor: pointer;
                      font-family: inherit; font-weight: 700; font-size: 15px;
                      transition: transform 120ms ease; }
        .gj-authbtn:active { transform: scale(0.99); }
        .gj-authbtn:disabled { opacity: 0.7; cursor: default; }
        .gj-nounderline { text-decoration: none; }
        .gj-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        /* Five cards do not divide into three, so this is auto-fit rather than a
           fixed column count — it lays out 5-across on a wide screen and reflows
           to 3, 2 then 1 without a media query per breakpoint. */
        .gj-why { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
        .gj-demo { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: center; }

        /* Hero body — one centred stack, the way Origin's page runs: Guac-AI
           pill, device, primary CTA, store badges, then the auth buttons. */
        /* Vertical rhythm tightened 2026-07-29 on request — the hero was
           carrying ~60px of dead air across four seams (headline→pill,
           trust row→story, story→sign-in, and the legal footer). Each of
           these was cut roughly in half. */
        .gj-herorow { display: flex; flex-direction: column; align-items: center;
                      max-width: 980px; margin: 20px auto 0; }
        .gj-hero-phone { display: flex; flex-direction: column; align-items: center; }
        .gj-aipill { margin-bottom: 14px; }
        .gj-badges { margin-top: 14px; }
        /* The auth stack sits under the store badges. Tight above (it belongs
           with the badges as one block of ways-in) and tight below, so the
           trust row reads as a caption to it rather than a separate section. */
        .gj-heroauthstack { margin-top: 16px; }
        /* Narrower than the hero: ~65 characters a line is the point where a
           paragraph this long stops being a wall. */
        .gj-story { max-width: 640px; margin: 24px auto 0; text-align: center; }
        /* 6px, not 18: the first child inside this block already carries its
           own 12px margin-top, so anything here stacks on top of that. */
        .gj-hero-auth  { width: 100%; max-width: 430px; margin-top: 6px; text-align: center; }

        @media (max-width: 880px) {
          .gj-grid3 { grid-template-columns: 1fr; }
          .gj-demo { grid-template-columns: 1fr; }
          .gj-demoshot { display: none; }
          .gj-h2big { font-size: 34px !important; }
          .gj-herorow { margin-top: 16px; }
          .gj-hero-auth { margin-top: 6px; }
          /* .gj-lede went with the removed heading. .gj-subline is the h1 now,
             so its mobile size steps up instead of sitting at sub-line size. */
          /* Stays 26. The h1 now carries three named losses plus the payoff
             line and runs to five lines on a 390px screen. 24px was tried and
             reverted: it still wrapped to five lines (measured 138px tall vs
             149px), so it bought ~11px of fold for a visibly weaker headline.
             The Google button clears the fold at 26px — verified at 390x844. */
          .gj-subline { font-size: 26px !important; }
          /* .gj-price went with the "Forever free" block, removed 2026-07-29.
             .gj-snitch is BACK IN USE as of 2026-07-31 — it is the descriptive
             sub-line under the problem-first h1 now, not the old refrain, so it
             needs a mobile size again. 15px keeps it clearly below the 26px h1
             while staying above caption weight; it is carrying the entire "what
             is this product" job on the first screen. */
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
             !important because these lose to the elements' own inline styles. */
          /* Wide enough for "PASSWORD" — at 50px the label overflowed its own
             box and collided with the value beside it. */
          .gj-credlabel { width: 62px !important; font-size: 9.5px !important; }
          .gj-credval { font-size: 13px !important; }
          /* Shorter hero on a phone so the auth buttons sit as close to the
             first screen as the content allows.
             196 -> 232 (+18%) 2026-07-31, alongside the desktop 244 -> 320.
             Held back from the desktop's +31% deliberately: every pixel the
             shot grows pushes the Google button further past the fold on a
             390x844 screen, and the button was already only just clearing it.
             The sticky CTA bar covers the case where it does go under — it is
             driven by an IntersectionObserver on the buttons themselves, so it
             raises the moment they leave the viewport rather than at a fixed
             scroll depth. If this grows again, re-check the fold at 390x844. */
          .gj-heroshot { width: 232px !important; }
        }
      ` }} />
    </main>
  )
}

// A rail of goal cards. Cards link into the demo rather than deep product
// routes — an ad visitor has no account, so /steals or /tax would bounce them
// through a login wall the moment they got curious.
function CardRail({ n }) {
  const cards = rail(n)
  const title = RAIL_TITLES[n]
  if (!cards.length) return null
  return (
    <section style={{ maxWidth: 1180, margin: '0 auto', padding: '38px 24px 0' }}>
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
// capability, with no figures — unlike the quantified version of these cards
// that was tried and rolled back earlier the same day (see git history / the
// note that used to sit here). Keep it that way: this list is the one place on
// the page that says what GetGuac does without asserting an amount.
const FEATURES = [
  { e: '🧾', t: 'Know Where Every Dollar Goes', b: 'Every receipt, purchase, fee, and statement — automatically organized in one place.' },
  { e: '🏷️', t: 'Never Overpay Again', b: 'We’ll help you find better prices on the things you buy, so your money goes further.' },
  { e: '↩️', t: 'Claim Every Dollar You’re Owed', b: 'Stay ahead of return deadlines and price drops so you never miss a refund.' },
  { e: '✂️', t: 'Stop Paying for What You Don’t Use', b: 'Spot forgotten subscriptions and recurring charges before they drain your wallet.' },
  { e: '📝', t: 'Shop Together. Save Together.', b: 'Create, share, and compare shopping lists to get the best value every trip.' },
  { e: '📊', t: 'Spend With Confidence', b: 'Get personalized insights that help you make smarter spending decisions every day.' },
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

// "Why should I?" strip. Kept in sync with the same list in app/page.jsx.
//
// ⚠️ The last line was supplied as "Works on Android and the web". Corrected to
// name the iPhone: GetGuac has been live on the App Store since 2026-07-14
// (bundle com.yathis.getguac, currently 0.4.21), and this very page shows a
// "Download on the App Store" badge in the hero. Shipping "Android and the web"
// would have contradicted the badge two screens above it and told every iPhone
// visitor the app was not for them.
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
const STEPS = [
  { n: '1', e: '📷', t: 'Upload', b: 'Snap a photo, forward an email, or drop a PDF.' },
  { n: '2', e: '🧾', t: 'AI Organizes', b: 'Items, categories, stores, warranties and return windows — pulled out for you.' },
  { n: '3', e: '💎', t: 'Save More', b: 'Better prices, refunds you’re owed, and a Worth It? score on every buy.' },
]

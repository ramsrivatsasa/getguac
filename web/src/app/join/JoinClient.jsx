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
import { CARDS } from '../../components/GoalsShowcase'
import GoalCard from '../../components/GoalCard'

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }
const INK = '#0B1410'

// The demo account is deliberately public — /login?demo=1 prefills it behind a
// Turnstile check. Showing the credentials outright means someone who wants to
// look before they sign up never has to hunt for them.
const DEMO = { email: 'demo@getguac.app', password: 'Guac!Demo2026' }

// Cards recur down the page rather than living in one strip: three per rail,
// walked in order, so a scroller keeps meeting a new thing GetGuac does.
// There is one rail slot per section break below — enough to show every card
// exactly once. Out-of-range slots render nothing, so adding or removing cards
// degrades quietly instead of duplicating or dropping one silently.
const RAIL_TITLES = [
  'I want to…',
  '…without thinking about it',
  '…and keep more of it',
  'Every dollar, accounted for',
  'The bits that pay for themselves',
  'There’s more in here',
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
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      })
      // No conversion event here. This fires the instant we hand off to Google,
      // before consent — and this button signs EXISTING users in too, so it
      // counted every returning user as a fresh registration. OAuth signups are
      // therefore untracked for now: the account is created in
      // /auth/callback, a server route, which lands on /dashboard where we
      // deliberately no longer run a pixel. Closing that gap means the
      // Conversions API, not a tracker on a signed-in page.
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
      <section style={{ background: INK, padding: '38px 20px 44px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>

          {/* The line the story video closes on. Origin puts a price here; the
              equivalent hook for a free product is the promise, so the phrase
              leads and "Forever free" takes the price slot under it. */}
          <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
            <div aria-hidden style={{ fontSize: 40, lineHeight: 1 }}>🥑</div>

            {/* The "Your money's been talking / GetGuac is listening" lede was
                removed on request. This line is now the h1 — the page still
                needs exactly one, and dropping the old heading without
                promoting anything would leave the hero headless. */}
            <h1 className="gj-subline" style={{ ...DISPLAY, fontWeight: 800, color: '#fff', fontSize: 34, lineHeight: 1.15, letterSpacing: '-0.03em', margin: '16px 0 0' }}>
              💰 Keep more of your own money. 🗂️ Get Organized.
            </h1>

            <p className="gj-snitch" style={{ fontSize: 16.5, lineHeight: 1.5, color: '#A3E635', fontWeight: 600, margin: '20px auto 0', maxWidth: 620 }}>
              🥑 GetGuac AI — your receipts already snitched. We just translated. 🕵️
            </p>

            <p className="gj-price" style={{ ...DISPLAY, fontWeight: 800, color: '#A3E635', fontSize: 40, lineHeight: 1, letterSpacing: '-0.03em', margin: '28px 0 0' }}>
              Forever free
            </p>
            <p style={{ margin: '10px 0 0', fontSize: 14.5, color: 'rgba(255,255,255,0.6)' }}>
              No card. No trial. Nothing to cancel.
            </p>

            {/* Origin puts a member count and a star rating here. We have neither,
                so this row states three things about the product that are just
                true, and claims nothing about how many people use it. */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 22, flexWrap: 'wrap', marginTop: 22 }}>
              {[['🔒', 'RLS-locked'], ['📱', 'iOS · Android · Web'], ['🧹', 'One-click wipe']].map(([e, t]) => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.62)' }}>
                  <span aria-hidden>{e}</span>{t}
                </span>
              ))}
            </div>
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
              <img src="/home/goals/phone-guacscore.webp"
                alt="GetGuac on iPhone: a GuacScore of 74, net spent, refunds, bank fees, receipts and tax paid"
                width={244} height={514} loading="eager" className="gj-heroshot"
                style={{ width: 244, maxWidth: '72%', height: 'auto', display: 'block', filter: 'drop-shadow(0 26px 46px rgba(0,0,0,0.55))' }} />

              {/* No "Try the demo" pill beside this — the demo has its own
                  block with the credentials further down, and a second button
                  next to the primary one splits the click. */}
              <div className="gj-ctarow" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                <Link href="/register"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#65A30D', color: '#fff', fontWeight: 700, fontSize: 16, padding: '15px 26px', borderRadius: 999, textDecoration: 'none', boxShadow: '0 10px 24px -10px rgba(101,163,13,0.8)' }}>
                  🥑 Meet your sidekick
                </Link>
              </div>

              {/* White badges: the homepage's ink badges are invisible against
                  this ground. */}
              <div className="gj-badges" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                <a href="https://apps.apple.com/us/app/getguac/id6790993237" target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', color: '#0B1410', padding: '9px 18px 9px 14px', borderRadius: 12, textDecoration: 'none' }}>
                  <svg viewBox="0 0 384 512" width="22" height="22" fill="#0B1410" aria-hidden="true"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.7-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" /></svg>
                  <span><span style={{ display: 'block', fontSize: 10.5, opacity: 0.62, lineHeight: 1.2 }}>Download on the</span><span style={{ display: 'block', fontSize: 17, fontWeight: 700, lineHeight: 1.15 }}>App Store</span></span>
                </a>
                <a href="https://play.google.com/store/apps/details?id=app.getguac.getguac" target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', color: '#0B1410', padding: '9px 18px 9px 14px', borderRadius: 12, textDecoration: 'none' }}>
                  <svg viewBox="0 0 512 512" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M48 32 288 256 48 480c-10-6-16-17-16-30V62c0-13 6-24 16-30z" /><path fill="#34A853" d="M48 32c5-3 11-5 17-5 6 0 12 2 18 5l260 148-55 76z" /><path fill="#FBBC04" d="M288 256l55-76 92 52c30 17 30 51 0 68l-92 52z" /><path fill="#EA4335" d="M288 256l55 76L83 480c-6 3-12 5-18 5-6 0-12-2-17-5z" /></svg>
                  <span><span style={{ display: 'block', fontSize: 10.5, opacity: 0.62, lineHeight: 1.2 }}>Get it on</span><span style={{ display: 'block', fontSize: 17, fontWeight: 700, lineHeight: 1.15 }}>Google Play</span></span>
                </a>
              </div>
            </div>

            {/* The ad script, in the ad's own voice. It sits under the device
                and the badges so the reader has already seen what the product
                looks like by the time it explains what it does. */}
            <div className="gj-story">
              <p className="gj-storyp" style={{ fontSize: 16.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.72)', margin: 0 }}>
                📬 Point it at your inbox and it goes to work: 🔁 rounds up the subscriptions you swore
                you canceled, 🕵️ drags out the fees your bank buried in the fine print, 💸 flags the
                refunds still ticking inside their return window, and 🏷️ quietly finds a better price
                on the thing you were one click from buying anyway.
              </p>
              <p className="gj-storyp" style={{ fontSize: 16.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.72)', margin: '18px 0 0' }}>
                🧮 Then tax season rolls around and — surprise 🎉 — you&rsquo;re already done. Business,
                charity, and sales tax tagged all year long, exported in one click. 📤
              </p>
              {/* The "your money's been talking" refrain used to repeat here.
                  It is the page's own H1 a screen and a half above, so saying
                  it again this close read as a duplication, not a callback. */}
              <p style={{ fontSize: 15, fontWeight: 700, color: '#A3E635', margin: '22px 0 0' }}>
                🍏 Free on iOS, Android and Web. No card required!!
              </p>
            </div>

            <div className="gj-hero-auth">
          <div ref={heroCtaRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button type="button" onClick={() => oauth('google')} disabled={!!busy}
              className={authBtn} style={{ background: '#fff', color: '#1f2937' }}>
              {busy === 'google' ? 'Opening Google…' : (
                <>
                  <svg viewBox="0 0 48 48" width="19" height="19" aria-hidden="true">
                    <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.3z" />
                    <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.2l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.2 15.5 46 24 46z" />
                    <path fill="#FBBC05" d="M11.8 28.4c-.4-1.3-.7-2.7-.7-4.4s.3-3.1.7-4.4v-5.7H4.5A22 22 0 0 0 2 24c0 3.5.8 6.9 2.5 9.9l7.3-5.5z" />
                    <path fill="#EA4335" d="M24 10.6c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.5 2 8.1 6.8 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9.2 12.2-9.2z" />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <Link href="/register"
              className={`${authBtn} gj-nounderline`} style={{ background: 'rgba(255,255,255,0.10)', color: '#fff' }}>
              Continue with email
            </Link>
          </div>

          {err && <p style={{ marginTop: 12, fontSize: 14, color: '#fca5a5' }}>{err}</p>}

          <p style={{ marginTop: 20, fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#fff', fontWeight: 700 }}>SIGN IN</Link>
          </p>

          <p style={{ marginTop: 22, fontSize: 11, lineHeight: 1.7, color: 'rgba(255,255,255,0.42)' }}>
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
                Don&apos;t want to sign up yet?
              </span>
              <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 28, letterSpacing: '-0.025em', margin: '0 0 8px', color: '#15281C' }}>
                Use our demo account.
              </h2>
              <p style={{ fontSize: 15.5, lineHeight: 1.55, color: '#3D4F44', margin: '0 0 18px' }}>
                A shared account pre-loaded with real receipts, scores and reports. Look around the whole
                app first — nothing to create, nothing to cancel.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {[['Email', DEMO.email], ['Password', DEMO.password]].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid rgba(20,83,45,0.12)', borderRadius: 12, padding: '10px 12px' }}>
                    <span className="gj-credlabel" style={{ fontSize: 11, fontWeight: 700, color: '#8A988E', width: 66, flex: '0 0 auto', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                    <span className="gj-credval" style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 14.5, color: '#15281C', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
                    <button type="button" onClick={() => copy(label, value)}
                      style={{ flex: '0 0 auto', cursor: 'pointer', fontFamily: 'inherit', background: '#F0F7E8', border: '1px solid rgba(101,163,13,0.24)', color: '#4D7C0F', fontWeight: 700, fontSize: 12, padding: '6px 12px', borderRadius: 999 }}>
                      {copied === label ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>

              <Link href="/login?demo=1"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#65A30D', color: '#fff', fontWeight: 700, fontSize: 15, padding: '13px 24px', borderRadius: 999, textDecoration: 'none' }}>
                🔎 Enter the demo →
              </Link>
              <p style={{ fontSize: 12, color: '#8A988E', margin: '12px 0 0' }}>
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

      {/* The "smartest sidekick" pitch used to sit here. It moved into the hero
          beside the phone — repeating the same headline two screens later read
          as a mistake rather than a refrain. */}
      <CardRail n={0} />
      <CardRail n={1} />

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '52px 24px' }}>
        <div style={{ maxWidth: 640, marginBottom: 36 }}>
          <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 38, letterSpacing: '-0.03em', margin: '0 0 12px', color: '#15281C' }}>Take control of your money.</h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: '#56655B', margin: 0 }}>Better prices, the refunds you&apos;re owed, and exactly where your money goes — in about a minute.</p>
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

      <CardRail n={2} />

      {/* ── BRAIN ─────────────────────────────────────────────────────────── */}
      <section style={{ background: '#F7FAF2', borderTop: '1px solid rgba(101,163,13,0.12)', borderBottom: '1px solid rgba(101,163,13,0.12)', marginTop: 44 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '56px 24px' }}>
          <div style={{ maxWidth: 620, marginBottom: 36 }}>
            <span style={{ display: 'inline-block', color: '#4D7C0F', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>The brain behind the guac</span>
            <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 38, letterSpacing: '-0.03em', margin: '0 0 12px', color: '#15281C' }}>Most apps just track. Guac-AI thinks.</h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: '#56655B', margin: 0 }}>It tags, scores, spots patterns, and nudges you — like a CFO that lives in your pocket and never sends a bill.</p>
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
        <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 36px' }}>
          <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 38, letterSpacing: '-0.03em', margin: 0, color: '#15281C' }}>Three taps from receipt to insight.</h2>
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
            <p style={{ fontSize: 14.5, color: '#3D4F44', margin: 0, lineHeight: 1.55 }}>
              Inbox sync is opt-in, auto-parse is limited to your +g address, and row-level security means
              even our own engineers can&apos;t see your data. One-click account + data wipe, any time.
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
            Ready to put a brain on your money?
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.5, color: 'rgba(255,255,255,0.9)', margin: '0 auto 26px', maxWidth: 520, position: 'relative' }}>
            Free, private, and on your side. No fees, no card, no spam.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
            <Link href="/register"
              style={{ background: '#fff', color: '#15281C', fontWeight: 700, fontSize: 16, padding: '15px 28px', borderRadius: 999, textDecoration: 'none' }}>
              🥑 Create my free account
            </Link>
            <Link href="/login?demo=1"
              style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700, fontSize: 16, padding: '15px 28px', borderRadius: 999, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.4)' }}>
              🔎 Try the demo
            </Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12.5, color: '#8A988E', margin: '28px 0 0' }}>
          <Link href="/terms" style={{ color: '#8A988E' }}>Terms</Link>
          {' · '}
          <Link href="/privacy" style={{ color: '#8A988E' }}>Privacy</Link>
          {' · '}
          <Link href="/security" style={{ color: '#8A988E' }}>Security</Link>
          {' · '}
          <Link href="/contact" style={{ color: '#8A988E' }}>Contact</Link>
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
          <Link href="/register"
            tabIndex={showBar ? 0 : -1}
            style={{ flex: 1, textAlign: 'center', background: '#84CC16', color: '#0B1410', fontWeight: 800, fontSize: 15, padding: '13px 18px', borderRadius: 999, textDecoration: 'none' }}>
            Get GetGuac — free
          </Link>
          <Link href="/login?demo=1" tabIndex={showBar ? 0 : -1}
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
        .gj-demo { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: center; }

        /* Hero body — one centred stack, the way Origin's page runs: Guac-AI
           pill, device, primary CTA, store badges, then the auth buttons. */
        .gj-herorow { display: flex; flex-direction: column; align-items: center;
                      max-width: 980px; margin: 32px auto 0; }
        .gj-hero-phone { display: flex; flex-direction: column; align-items: center; }
        .gj-aipill { margin-bottom: 20px; }
        .gj-ctarow { margin-top: 28px; }
        .gj-badges { margin-top: 14px; }
        /* Narrower than the hero: ~65 characters a line is the point where a
           paragraph this long stops being a wall. */
        .gj-story { max-width: 640px; margin: 38px auto 0; text-align: center; }
        .gj-hero-auth  { width: 100%; max-width: 430px; margin-top: 34px; text-align: center; }

        @media (max-width: 880px) {
          .gj-grid3 { grid-template-columns: 1fr; }
          .gj-demo { grid-template-columns: 1fr; }
          .gj-demoshot { display: none; }
          .gj-h2big { font-size: 34px !important; }
          .gj-herorow { margin-top: 24px; }
          .gj-hero-auth { margin-top: 24px; }
          /* .gj-lede went with the removed heading. .gj-subline is the h1 now,
             so its mobile size steps up instead of sitting at sub-line size. */
          .gj-subline { font-size: 26px !important; }
          .gj-price { font-size: 32px !important; }
          .gj-snitch { font-size: 15px !important; }
          .gj-story { margin-top: 32px; }
          .gj-storyp { font-size: 15.5px !important; }
          .gj-stickyinner { padding-right: 64px; }
          /* A credential shown truncated is worse than a smaller one.
             !important because these lose to the elements' own inline styles. */
          /* Wide enough for "PASSWORD" — at 50px the label overflowed its own
             box and collided with the value beside it. */
          .gj-credlabel { width: 62px !important; font-size: 9.5px !important; }
          .gj-credval { font-size: 13px !important; }
          /* Shorter hero on a phone so the auth buttons sit as close to the
             first screen as the content allows. */
          .gj-heroshot { width: 196px !important; }
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

const FEATURES = [
  { e: '🧾', t: 'Track receipts & statements', b: 'Every purchase, fee, and charge, organized in one place.' },
  { e: '🏷️', t: 'Get better deals', b: 'Steals finds a cheaper price on the things you rebuy.' },
  { e: '↩️', t: 'Never miss a refund', b: 'Money back on price drops and returns, before deadlines pass.' },
  { e: '✂️', t: 'Cut hidden subscriptions', b: 'Find and cancel the monthly bills you forgot about.' },
  { e: '📝', t: 'Share a shopping list', b: 'Build one on the fly and send it to family in one tap.' },
  { e: '📊', t: 'See it all & plan ahead', b: 'GuacScore + GuacWizard guide every spending call.' },
]

const BRAIN = [
  { k: 'Your spending IQ', t: 'GuacScore', b: 'A 0–100 grade for every dollar you spent. Weighted by amount, rated by your taste, dinged by fees.' },
  { k: 'AI insights', t: 'GuacWizard', b: 'Bank statements in, insights out. Interest, fees, regret-spend, hidden subscriptions — with a "do this next" nudge.' },
  { k: 'Hidden cost killer', t: 'Bank Bite Tracker', b: 'Every interest charge, overdraft, and annual fee — itemized per card, scored against your spend.' },
]

const STEPS = [
  { n: '1', e: '📷', t: 'Drop or snap', b: 'Drag a PDF, forward an email, or snap a photo.' },
  { n: '2', e: '🧾', t: 'Auto-organized', b: 'Items, categories, locations, refund policies — extracted.' },
  { n: '3', e: '💎', t: 'Rate & learn', b: 'Worth It? rating + Guacanomics charts surface what you need.' },
]

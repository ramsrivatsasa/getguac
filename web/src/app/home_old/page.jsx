// BACKUP of the live homepage (src/app/page.jsx) taken 2026-08-05.
// Byte-for-byte apart from two things: every '../' import is now '../../'
// because this sits one directory deeper, and the noindex below stops a backup
// route from competing with the real homepage in search.
export const metadata = { robots: { index: false, follow: false } }

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import ReferralCapture from '../../components/ReferralCapture'
import MarketingShell from '../../components/MarketingShell'
import GoalsShowcase from '../../components/GoalsShowcase'
import HeroScoreCard from '../../components/HeroScoreCard'

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }

export default async function Home() {
  // Logged-in users skip the landing page.
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <MarketingShell>
      <div style={{ overflowX: 'hidden' }}>
        {/* Invited-friend welcome strip — visible only when the visitor
            arrived via a ?ref=<CODE> referral link. Tells them exactly
            what to do next (Get started) + links /how-it-works. */}
        <ReferralCapture banner />
        {/* HERO */}
        <section className="gg-hero" style={{ maxWidth: 1180, margin: '0 auto', padding: '72px 28px 56px', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F0F7E8', color: '#4D7C0F', border: '1px solid rgba(101,163,13,0.2)', padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#84CC16', boxShadow: '0 0 0 3px rgba(132,204,22,0.25)' }} /> Guac-AI · personal finance assistant
            </div>
            <h1 className="gg-h1" style={{ ...DISPLAY, fontWeight: 800, fontSize: 58, lineHeight: 1.02, letterSpacing: '-0.035em', margin: '0 0 22px', color: '#15281C' }}>
              Keep More <span style={{ color: '#65A30D' }}>Guac</span><br />in Your Pocket <span aria-hidden>🥑</span>
            </h1>
            <p style={{ fontSize: 19, lineHeight: 1.55, color: '#56655B', margin: '0 0 30px', maxWidth: 520 }}>
              GetGuac reads your receipts and bank statements, scores every purchase, sniffs out hidden fees, and shows you exactly where your money gets eaten. Money&apos;s wingman. Keep your guac.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
              <Link href="/join?try=receipt&from=home" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#65A30D', color: '#fff', fontWeight: 700, fontSize: 16, padding: '15px 26px', borderRadius: 999, textDecoration: 'none', boxShadow: '0 10px 24px -10px rgba(101,163,13,0.6)' }}>📸 Try 1 receipt</Link>
              <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#1A2E22', fontWeight: 700, fontSize: 16, padding: '15px 26px', borderRadius: 999, textDecoration: 'none', border: '1.5px solid rgba(20,83,45,0.16)' }}>🥑 Meet your sidekick</Link>
            </div>
            <div style={{ margin: '-2px 0 22px', fontSize: 14, color: '#56655B' }}>
              No account needed. We read it, show the result, and let you delete the trial data. <Link href="/login?demo=1" style={{ color: '#4D7C0F', fontWeight: 700, textDecoration: 'none' }}>Or explore the full dashboard →</Link>
            </div>
            {/* Store badges — both live. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
              <a href="https://apps.apple.com/us/app/getguac/id6790993237" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#0B1410', color: '#fff', padding: '9px 18px 9px 14px', borderRadius: 12, textDecoration: 'none' }}>
                <svg viewBox="0 0 384 512" width="22" height="22" fill="#fff" aria-hidden="true"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.7-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                <span><span style={{ display: 'block', fontSize: 10.5, opacity: 0.8, lineHeight: 1.2 }}>Download on the</span><span style={{ display: 'block', fontSize: 17, fontWeight: 700, lineHeight: 1.15 }}>App Store</span></span>
              </a>
              <a href="https://play.google.com/store/apps/details?id=app.getguac.getguac" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#0B1410', color: '#fff', padding: '9px 18px 9px 14px', borderRadius: 12, textDecoration: 'none' }}>
                <svg viewBox="0 0 512 512" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M48 32 288 256 48 480c-10-6-16-17-16-30V62c0-13 6-24 16-30z"/><path fill="#34A853" d="M48 32c5-3 11-5 17-5 6 0 12 2 18 5l260 148-55 76z"/><path fill="#FBBC04" d="M288 256l55-76 92 52c30 17 30 51 0 68l-92 52z"/><path fill="#EA4335" d="M288 256l55 76L83 480c-6 3-12 5-18 5-6 0-12-2-17-5z"/></svg>
                <span><span style={{ display: 'block', fontSize: 10.5, opacity: 0.8, lineHeight: 1.2 }}>Get it on</span><span style={{ display: 'block', fontSize: 17, fontWeight: 700, lineHeight: 1.15 }}>Google Play</span></span>
              </a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', fontSize: 14, color: '#56655B', fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>🔒 Private — RLS-locked, yours to wipe</span>
              <span style={{ width: 1, height: 16, background: 'rgba(20,83,45,0.15)' }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>🥑 Free. No card. No catch.</span>
            </div>
          </div>
          <div className="gg-hero-visual" style={{ position: 'relative', display: 'flex', justifyContent: 'center', animation: 'guacRise 0.8s cubic-bezier(0.22,1,0.36,1) both' }}>
            <div style={{ position: 'absolute', inset: '20px 30px', background: 'radial-gradient(circle at 60% 40%, rgba(132,204,22,0.16), transparent 65%)', borderRadius: '50%' }} />
            {/* Animated mockup card — cycles GuacScore → GuacWizard → Returns. */}
            <HeroScoreCard />
          </div>
        </section>

        {/* GOALS — benefit mockup cards + click-a-card showcase of the real web
            + phone screens for each option (client component). */}
        <GoalsShowcase />

        {/* FEATURES */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '72px 28px' }}>
          {/* 860 + 36px + nowrap so the heading holds one line — see the same
              treatment on /join. `.gg-secth2` drops back to normal wrapping
              under 880px; nowrap on a phone would cause horizontal scroll. */}
          <div style={{ maxWidth: 860, marginBottom: 44 }}>
            <h2 className="gg-secth2" style={{ ...DISPLAY, fontWeight: 800, fontSize: 36, letterSpacing: '-0.03em', margin: '0 0 14px', color: '#15281C', whiteSpace: 'nowrap' }}>Stop overpaying. Start saving smarter.</h2>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: '#56655B', margin: 0 }}>Guac-AI analyzes your spending to find better prices, uncover refunds, and reveal where your money goes — all in about a minute.</p>
          </div>
          <div className="gg-grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.t} style={{ background: '#fff', border: '1px solid rgba(20,83,45,0.10)', borderRadius: 20, padding: 28 }}>
                <div style={{ fontSize: 30, marginBottom: 14 }}>{f.e}</div>
                <h3 style={{ ...DISPLAY, fontWeight: 700, fontSize: 19, margin: '0 0 8px' }}>{f.t}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.5, color: '#5C6B60', margin: 0 }}>{f.b}</p>
              </div>
            ))}
          </div>

        </section>

        {/* BRAIN */}
        <section style={{ background: '#F7FAF2', borderTop: '1px solid rgba(101,163,13,0.12)', borderBottom: '1px solid rgba(101,163,13,0.12)' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '76px 28px' }}>
            <div style={{ maxWidth: 620, marginBottom: 44 }}>
              <span style={{ display: 'inline-block', color: '#4D7C0F', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>AI that works for your wallet</span>
              {/* "Guac-AI", not bare "Guac" — see the note in join/JoinClient.jsx.
                  On this page in particular the h1 uses "Guac" to mean money. */}
              <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 40, letterSpacing: '-0.03em', margin: '0 0 14px', color: '#15281C' }}>Most apps track. Guac-AI thinks.</h2>
              <p style={{ fontSize: 18, lineHeight: 1.55, color: '#56655B', margin: 0 }}>It reads every receipt and statement, then tells you what to do about it — like a CFO that lives in your pocket and never sends a bill.</p>
            </div>
            <div className="gg-grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {BRAIN.map((c) => (
                <div key={c.t} style={{ background: '#fff', border: '1px solid rgba(101,163,13,0.16)', borderRadius: 22, padding: 30 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4D7C0F', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 18 }}>{c.k}</div>
                  <h3 style={{ ...DISPLAY, fontWeight: 700, fontSize: 23, margin: '0 0 10px', color: '#15281C' }}>{c.t}</h3>
                  <p style={{ fontSize: 15, lineHeight: 1.55, color: '#56655B', margin: 0 }}>{c.b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHY SHOULD I? — see the note on the same block in join/JoinClient.jsx.
            Sits after the features grid here rather than after a demo block,
            because this page has no demo section: features make the claims, and
            this strip answers "why bother" before the how-it-works steps. */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px 8px' }}>
          <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 32, letterSpacing: '-0.03em', margin: '0 0 22px', color: '#15281C' }}>
            Why should I?
          </h2>
          <div className="gg-why">
            {WHY.map((w) => (
              <div key={w.t} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fff', border: '1px solid rgba(20,83,45,0.10)', borderRadius: 16, padding: '16px 18px' }}>
                <span aria-hidden style={{ fontSize: 22, lineHeight: 1.1, flex: '0 0 auto' }}>{w.e}</span>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: '#15281C' }}>{w.t}</span>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '76px 28px' }}>
          {/* See the note on the same block in join/JoinClient.jsx. The support
              line goes ABOVE the "See how it works" link so the link stays the
              last thing in the block, where it reads as the next action. */}
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 44px' }}>
            <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 40, letterSpacing: '-0.03em', margin: '0 0 14px', color: '#15281C' }}>Turn Every Receipt Into Savings.</h2>
            {/* Lede rewritten 2026-07-29. The old one ("Scan receipts, automatically
                categorize purchases, and discover where your money really goes — all
                in under a minute") had two problems: it restated steps 1 and 2 of the
                three cards directly below it, and it collided with the FEATURES lede
                further up this same page, which already ends "reveal where your money
                goes — all in about a minute". This one hands the mechanics to the
                cards and keeps the payoff for itself. */}
            <p style={{ fontSize: 18, lineHeight: 1.55, color: '#56655B', margin: '0 0 14px' }}>
              Upload once — GetGuac does the rest. Every purchase organized, every refund window
              watched, and the savings surfaced for you. Under a minute per receipt.
            </p>
            <Link href="/how-it-works" style={{ color: '#4D7C0F', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>See how it works in detail →</Link>
          </div>
          <div className="gg-grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ position: 'relative', background: '#fff', border: '1px solid rgba(20,83,45,0.10)', borderRadius: 22, padding: '32px 28px' }}>
                <div style={{ ...DISPLAY, position: 'absolute', top: 24, right: 26, fontWeight: 800, fontSize: 38, color: 'rgba(101,163,13,0.18)' }}>{s.n}</div>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{s.e}</div>
                <h3 style={{ ...DISPLAY, fontWeight: 700, fontSize: 20, margin: '0 0 10px' }}>{s.t}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: '#5C6B60', margin: 0 }}>{s.b}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link href="/how-email-works" style={{ color: '#4D7C0F', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>Plus — every account gets a free @getguac.app email · See how it works →</Link>
          </div>
        </section>

        {/* PRIVACY STRIP */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px 76px' }}>
          <div style={{ background: '#F4F8EE', border: '1px solid rgba(101,163,13,0.16)', borderRadius: 24, padding: 40, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 40 }}>🛡️</span>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h3 style={{ ...DISPLAY, fontWeight: 800, fontSize: 24, margin: '0 0 6px', color: '#15281C' }}>Your guac. Your rules.</h3>
              {/* 🔴 HONESTY FIX 2026-07-29 — the old line claimed "row-level security
                  means even our own engineers can't see your data". That is FALSE:
                  44 files under web/src use SUPABASE_SERVICE_ROLE_KEY, which bypasses
                  RLS by design, including (dashboard)/admin/page.jsx. RLS is what stops
                  one signed-in USER reading another's rows — it is not a promise about
                  staff access, and marketing must not sell it as one. Same defect class
                  as the false privacy-policy §8 fixed in acc0283.
                  Every clause below is verifiable: inbox sync is opt-in, statements are
                  PDF uploads (/features: "No bank login required"), and the wipe is
                  self-serve via /delete-account → api/account/delete.
                  🔒 Do not re-add a staff-access claim here. /security carries the
                  detail, and the button beside this paragraph links to it. */}
              <p style={{ fontSize: 15, color: '#3D4F44', margin: 0, lineHeight: 1.55 }}>Your receipts stay yours. Inbox sync is opt-in, we never ask for your bank login, and one click wipes your account and every record — any time.</p>
            </div>
            <Link href="/security" style={{ background: '#65A30D', color: '#fff', fontWeight: 700, fontSize: 15, padding: '13px 22px', borderRadius: 999, textDecoration: 'none' }}>How we protect you →</Link>
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px 76px' }}>
          <div style={{ background: '#65A30D', borderRadius: 32, padding: '68px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -60, right: -40, fontSize: 200, opacity: 0.14, animation: 'guacFloatSlow 8s ease-in-out infinite' }}>🥑</div>
            <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 44, letterSpacing: '-0.03em', margin: '0 0 16px', color: '#fff', position: 'relative' }}>Start Saving Today</h2>
            {/* 🔒 HONESTY LOCK — requested copy opened "Join thousands of smarter
                shoppers"; GetGuac has 10 accounts, so that clause is cut and only
                the capability claims and the price are kept. No member counts,
                star ratings or savings figures on this page. */}
            <p style={{ fontSize: 18, lineHeight: 1.5, color: 'rgba(255,255,255,0.9)', margin: '0 auto 30px', maxWidth: 520, position: 'relative' }}>Save money, track spending, and never miss a refund. Free forever — no card, no fees, no spam.</p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
              <Link href="/join?try=receipt&from=home" style={{ background: '#fff', color: '#15281C', fontWeight: 700, fontSize: 16, padding: '16px 30px', borderRadius: 999, textDecoration: 'none' }}>📸 Try 1 receipt</Link>
              <Link href="/register" style={{ background: '#fff', color: '#15281C', fontWeight: 700, fontSize: 16, padding: '16px 30px', borderRadius: 999, textDecoration: 'none' }}>Get Started Free</Link>
              <Link href="/login?demo=1" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700, fontSize: 16, padding: '16px 30px', borderRadius: 999, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.4)' }}>🔎 Try the demo</Link>
              <Link href="/login" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700, fontSize: 16, padding: '16px 30px', borderRadius: 999, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.4)' }}>Sign in</Link>
            </div>
          </div>
        </section>
      </div>

      {/* Hero float animations + responsive: stack grids, hide nav on small screens.
          Rendered via dangerouslySetInnerHTML so React doesn't HTML-escape the
          `syntax: '<angle>'` chars (< > ') — escaping them as a text child causes a
          server/client hydration mismatch. */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes guacFloat { 0%,100% { transform: translateY(-9px); } 50% { transform: translateY(9px); } }
        @keyframes guacFloatB { 0%,100% { transform: translateY(-11px); } 50% { transform: translateY(11px); } }
        @keyframes guacFloatSlow { 0%,100% { transform: translateY(-11px) rotate(-3deg); } 50% { transform: translateY(11px) rotate(-3deg); } }
        @property --gg-deg { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes guacRing { from { --gg-deg: 0deg; } to { --gg-deg: 313deg; } }
        @keyframes guacRise { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .gg-hero-visual { animation: none !important; opacity: 1 !important; transform: none !important; }
          .gg-ring { animation: none !important; --gg-deg: 313deg; }
        }
        @media (max-width: 880px) {
          .gg-hero { grid-template-columns: 1fr !important; }
          .gg-grid3 { grid-template-columns: 1fr !important; }
          .gg-navlinks { display: none !important; }
          .gg-h1 { font-size: 40px !important; }
          /* Desktop-only one-liner — see the h2 it targets. */
          .gg-secth2 { white-space: normal !important; font-size: 30px !important; }
        }
      ` }} />
    </MarketingShell>
  )
}

// ⚠️ Kept in sync with the same list in app/join/JoinClient.jsx — see the note
// there. A quantified rewrite of these cards was tried and rolled back on
// request 2026-07-29.
const FEATURES = [
  { e: '🧾', t: 'Know Where Every Dollar Goes', b: 'Every receipt, purchase, fee, and statement — automatically organized in one place.' },
  { e: '🏷️', t: 'Never Overpay Again', b: 'We’ll help you find better prices on the things you buy, so your money goes further.' },
  { e: '↩️', t: 'Claim Every Dollar You’re Owed', b: 'Stay ahead of return deadlines and price drops so you never miss a refund.' },
  { e: '✂️', t: 'Stop Paying for What You Don’t Use', b: 'Spot forgotten subscriptions and recurring charges before they drain your wallet.' },
  { e: '📝', t: 'Shop Together. Save Together.', b: 'Create, share, and compare shopping lists to get the best value every trip.' },
  { e: '📊', t: 'Spend With Confidence', b: 'Get personalized insights that help you make smarter spending decisions every day.' },
]

// 🔒 "Bank Bite" stays — it is a shipped feature name (dashboard tile, chart
// slice, `bank_bite_digest` notification key, tour + video narration), not a
// marketing label. See the fuller note in app/join/JoinClient.jsx.
// Flipped benefit-first 2026-07-31. These cards used to put the PRODUCT NAME in
// the h3 and the benefit in the small eyebrow above it — so the three biggest
// words in the section were GuacScore, GuacWizard and Bank Bite Tracker, none
// of which mean anything to someone who has never used GetGuac. The eyebrow and
// the title swapped places; the bodies are untouched.
// 🔒 The names stay on the page (now as the eyebrow) rather than being dropped:
// all three are shipped feature names a new user has to be able to find again.
const BRAIN = [
  { k: 'GuacScore', t: 'Know if it was worth it', b: 'Know whether every purchase was worth it — a personalized 0–100 score from your own ratings, dinged by fees.' },
  { k: 'GuacWizard', t: 'Understand where it all went', b: 'Reads your bank statements, explains your spending, and recommends your next move.' },
  { k: 'Bank Bite Tracker', t: 'See what your bank quietly took', b: 'Every interest charge, overdraft and annual fee your bank took — itemized per card.' },
]

// ⚠️ Kept in sync with the same list in app/join/JoinClient.jsx — the note
// there explains why the last line names the iPhone.
const WHY = [
  { e: '📸', t: 'Scan receipts in seconds' },
  { e: '📊', t: 'Automatically track spending & start saving' },
  { e: '💡', t: 'Discover unnecessary expenses' },
  { e: '🔒', t: 'Your financial data stays private' },
  { e: '📱', t: 'Works on iPhone, Android and the web' },
]

// ⚠️ Kept in sync with the same list in app/join/JoinClient.jsx.
//
// Rewritten 2026-07-29 from feature labels to the outcome arc: the old titles
// ("Drop or snap" / "Auto-organized" / "Rate & learn") named the mechanic, and
// step 3 spent its whole line on two product names (Worth It?, Guacanomics)
// instead of saying what the reader gets. Upload → AI Organizes → Save More
// makes the third card the payoff, which is the only reason to read the first.
//
// Every claim here is verified against the app: parsing is AI (api/parse-receipt),
// and warranty_info + return_policy are really extracted per item (lib/save-receipt.js).
// "Worth It?" stays — it is the shipped name of the rating, not a label.
const STEPS = [
  { n: '1', e: '📷', t: 'Upload', b: 'Snap a photo, forward an email, or drop a PDF.' },
  { n: '2', e: '🧾', t: 'AI Organizes', b: 'Items, categories, stores, warranties and return windows — pulled out for you.' },
  { n: '3', e: '💎', t: 'Save More', b: 'Better prices, refunds you’re owed, and a Worth It? score on every buy.' },
]

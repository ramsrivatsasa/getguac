import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import ReferralCapture from '../components/ReferralCapture'
import MarketingShell from '../components/MarketingShell'
import GoalsShowcase from '../components/GoalsShowcase'
import HeroScoreCard from '../components/HeroScoreCard'

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
              Meet your money&apos;s<br />smartest <span style={{ color: '#65A30D' }}>sidekick.</span>
            </h1>
            <p style={{ fontSize: 19, lineHeight: 1.55, color: '#56655B', margin: '0 0 30px', maxWidth: 520 }}>
              GetGuac reads your receipts and bank statements, scores every purchase, sniffs out hidden fees, and shows you exactly where your money gets eaten. Money&apos;s wingman. Keep your guac.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
              <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#65A30D', color: '#fff', fontWeight: 700, fontSize: 16, padding: '15px 26px', borderRadius: 999, textDecoration: 'none', boxShadow: '0 10px 24px -10px rgba(101,163,13,0.6)' }}>🥑 Meet your sidekick</Link>
              {/* Try-before-you-register: /login?demo=1 prefills the shared
                  demo account (captcha-gated) so the curious can poke around
                  real pre-loaded data without creating anything. */}
              <Link href="/login?demo=1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#1A2E22', fontWeight: 700, fontSize: 16, padding: '15px 26px', borderRadius: 999, textDecoration: 'none', border: '1.5px solid rgba(20,83,45,0.16)' }}>🔎 Try the demo</Link>
            </div>
            {/* Store badges. iOS: swap href to https://apps.apple.com/app/id6790993237
                once the App Store listing is approved & live — until then /download. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
              <Link href="/download" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#0B1410', color: '#fff', padding: '9px 18px 9px 14px', borderRadius: 12, textDecoration: 'none' }}>
                <svg viewBox="0 0 384 512" width="22" height="22" fill="#fff" aria-hidden="true"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.7-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                <span><span style={{ display: 'block', fontSize: 10.5, opacity: 0.8, lineHeight: 1.2 }}>Coming soon on the</span><span style={{ display: 'block', fontSize: 17, fontWeight: 700, lineHeight: 1.15 }}>App Store</span></span>
              </Link>
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

        {/* GOALS — "I want to…" mockup cards + click-a-card showcase of the
            real web + phone screens for each option (client component). */}
        <GoalsShowcase />

        {/* FEATURES */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '72px 28px' }}>
          <div style={{ maxWidth: 640, marginBottom: 44 }}>
            <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 40, letterSpacing: '-0.03em', margin: '0 0 14px', color: '#15281C' }}>Take control of your money.</h2>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: '#56655B', margin: 0 }}>Better prices, the refunds you&apos;re owed, and exactly where your money goes — in about a minute.</p>
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
              <span style={{ display: 'inline-block', color: '#4D7C0F', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>The brain behind the guac</span>
              <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 40, letterSpacing: '-0.03em', margin: '0 0 14px', color: '#15281C' }}>Most apps just track. Guac-AI thinks.</h2>
              <p style={{ fontSize: 18, lineHeight: 1.55, color: '#56655B', margin: 0 }}>It tags, scores, spots patterns, and nudges you — like a CFO that lives in your pocket and never sends a bill.</p>
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

        {/* HOW IT WORKS */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '76px 28px' }}>
          <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 44px' }}>
            <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 40, letterSpacing: '-0.03em', margin: '0 0 14px', color: '#15281C' }}>Three taps from receipt to insight.</h2>
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
              <p style={{ fontSize: 15, color: '#3D4F44', margin: 0, lineHeight: 1.55 }}>Inbox sync is opt-in, auto-parse is limited to your +g address, and row-level security means even our own engineers can&apos;t see your data. One-click account + data wipe, any time.</p>
            </div>
            <Link href="/security" style={{ background: '#65A30D', color: '#fff', fontWeight: 700, fontSize: 15, padding: '13px 22px', borderRadius: 999, textDecoration: 'none' }}>How we protect you →</Link>
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px 76px' }}>
          <div style={{ background: '#65A30D', borderRadius: 32, padding: '68px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -60, right: -40, fontSize: 200, opacity: 0.14, animation: 'guacFloatSlow 8s ease-in-out infinite' }}>🥑</div>
            <h2 style={{ ...DISPLAY, fontWeight: 800, fontSize: 44, letterSpacing: '-0.03em', margin: '0 0 16px', color: '#fff', position: 'relative' }}>Ready to put a brain on your money?</h2>
            <p style={{ fontSize: 18, lineHeight: 1.5, color: 'rgba(255,255,255,0.9)', margin: '0 auto 30px', maxWidth: 520, position: 'relative' }}>Free, private, and on your side. No fees, no card, no spam.</p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
              <Link href="/register" style={{ background: '#fff', color: '#15281C', fontWeight: 700, fontSize: 16, padding: '16px 30px', borderRadius: 999, textDecoration: 'none' }}>🥑 Hire your sidekick</Link>
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
        @keyframes guacFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes guacFloatB { 0%,100% { transform: translateY(0); } 50% { transform: translateY(10px); } }
        @keyframes guacFloatSlow { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-16px) rotate(-3deg); } }
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
        }
      ` }} />
    </MarketingShell>
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

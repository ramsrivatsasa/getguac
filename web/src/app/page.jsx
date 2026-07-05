import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ReferralCapture from '../components/ReferralCapture'
import MarketingFooter from '../components/MarketingFooter'

// Real, live aggregate numbers for the landing page — pulled from the database
// with the service-role client (server-only). No fabricated "as seen in" /
// 250k members / $2.1B figures: every tile here is a true count, and any tile
// with no data yet is simply not rendered. Never throws — degrades to null so
// the page still renders if the DB is unreachable.
async function getStats() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    const a = createAdminClient(url, key, { auth: { persistSession: false } })
    const [rc, members, amounts, ratings] = await Promise.all([
      a.from('receipts').select('id', { count: 'exact', head: true }),
      a.from('profiles').select('id', { count: 'exact', head: true }),
      a.from('receipts').select('total_amount, is_return'),
      a.from('receipts').select('rating').not('rating', 'is', null),
    ])
    const receipts = rc.count || 0
    const memberCount = members.count || 0
    const spend = (amounts.data || []).reduce((s, r) => s + (r.is_return ? 0 : Number(r.total_amount) || 0), 0)
    const rated = (ratings.data || []).map((r) => Number(r.rating)).filter((n) => n > 0)
    const avgRating = rated.length ? rated.reduce((x, y) => x + y, 0) / rated.length : null
    return { receipts, members: memberCount, spend, avgRating, ratingCount: rated.length }
  } catch {
    return null
  }
}

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0) + 'M'
  if (n >= 10_000) return (n / 1000).toFixed(0) + 'k'
  return n.toLocaleString('en-US')
}
function fmtMoney(n) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 10_000) return '$' + (n / 1000).toFixed(0) + 'k'
  return '$' + Math.round(n).toLocaleString('en-US')
}

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }

export default async function Home() {
  // Logged-in users skip the landing page.
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (user) redirect('/dashboard')

  const stats = await getStats()
  const tiles = []
  if (stats) {
    if (stats.spend > 0) tiles.push({ v: fmtMoney(stats.spend), l: 'spending tracked' })
    if (stats.receipts > 0) tiles.push({ v: fmtNum(stats.receipts), l: 'receipts scanned' })
    if (stats.members > 0) tiles.push({ v: fmtNum(stats.members), l: 'members' })
    if (stats.avgRating) tiles.push({ v: stats.avgRating.toFixed(1) + '★', l: 'avg Worth-It rating' })
  }

  return (
    <div style={{ fontFamily: 'var(--font-jakarta), system-ui, sans-serif', color: '#1A2E22', background: '#fff', overflowX: 'hidden' }}>

      {/* NAV */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.88)', borderBottom: '1px solid rgba(20,83,45,0.08)' }}>
        <nav style={{ maxWidth: 1180, margin: '0 auto', padding: '15px 28px', display: 'flex', alignItems: 'center', gap: 26 }}>
          <Link href="/" style={{ ...DISPLAY, display: 'flex', alignItems: 'center', gap: 9, color: '#1A2E22', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', textDecoration: 'none' }}>
            <span style={{ fontSize: 22 }}>🥑</span> GetGuac
          </Link>
          <div className="gg-navlinks" style={{ display: 'flex', gap: 22, marginLeft: 12 }}>
            <Link href="/marketplace" style={{ color: '#5C6B60', fontWeight: 500, fontSize: 15, textDecoration: 'none' }}>🛒 Marketplace</Link>
            <Link href="/coupons" style={{ color: '#5C6B60', fontWeight: 500, fontSize: 15, textDecoration: 'none' }}>Coupons</Link>
            <Link href="/resources" style={{ color: '#5C6B60', fontWeight: 500, fontSize: 15, textDecoration: 'none' }}>Resources</Link>
            <Link href="/plan" style={{ color: '#5C6B60', fontWeight: 500, fontSize: 15, textDecoration: 'none' }}>Plan</Link>
            <Link href="/how-it-works" style={{ color: '#5C6B60', fontWeight: 500, fontSize: 15, textDecoration: 'none' }}>How it works</Link>
            <Link href="/features" style={{ color: '#5C6B60', fontWeight: 500, fontSize: 15, textDecoration: 'none' }}>Features</Link>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link href="/login" style={{ color: '#1A2E22', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Sign in</Link>
            <Link href="/register" style={{ background: '#65A30D', color: '#fff', fontWeight: 700, fontSize: 15, padding: '11px 20px', borderRadius: 999, textDecoration: 'none' }}>Get started</Link>
          </div>
        </nav>
      </header>

      <main>
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
              <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#65A30D', color: '#fff', fontWeight: 700, fontSize: 16, padding: '15px 26px', borderRadius: 999, textDecoration: 'none', boxShadow: '0 10px 24px -10px rgba(101,163,13,0.6)' }}>🥑 Meet your sidekick</Link>
              <Link href="/download" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#1A2E22', fontWeight: 700, fontSize: 16, padding: '15px 26px', borderRadius: 999, textDecoration: 'none', border: '1.5px solid rgba(20,83,45,0.16)' }}>📱 Get the app</Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', fontSize: 14, color: '#56655B', fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>🔒 Private — RLS-locked, yours to wipe</span>
              <span style={{ width: 1, height: 16, background: 'rgba(20,83,45,0.15)' }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>🥑 Free. No card. No catch.</span>
            </div>
          </div>
          <div className="gg-hero-visual" style={{ position: 'relative', display: 'flex', justifyContent: 'center', animation: 'guacRise 0.8s cubic-bezier(0.22,1,0.36,1) both' }}>
            <div style={{ position: 'absolute', inset: '20px 30px', background: 'radial-gradient(circle at 60% 40%, rgba(132,204,22,0.16), transparent 65%)', borderRadius: '50%' }} />
            <div style={{ position: 'relative', width: 290, background: '#fff', borderRadius: 34, padding: 18, boxShadow: '0 40px 80px -30px rgba(20,40,28,0.32)', border: '1px solid rgba(20,83,45,0.08)', animation: 'guacFloat 6s ease-in-out infinite' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 4px' }}>
                <span style={{ ...DISPLAY, fontWeight: 800, color: '#15281C' }}>🥑 GuacScore</span>
                <span style={{ fontSize: 12, color: '#8A988E' }}>This month</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div className="gg-ring" style={{ position: 'relative', width: 150, height: 150, borderRadius: '50%', background: 'conic-gradient(#65A30D var(--gg-deg, 313deg), rgba(101,163,13,0.12) 0deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'guacRing 1.3s 0.35s cubic-bezier(0.22,1,0.36,1) both' }}>
                  <div style={{ width: 118, height: 118, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ ...DISPLAY, fontWeight: 800, fontSize: 42, lineHeight: 1, color: '#15281C' }}>87</span>
                    <span style={{ fontSize: 11, color: '#65A30D', fontWeight: 700, letterSpacing: '0.04em' }}>SOLID GUAC</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#F7FAF2', borderRadius: 13, padding: '11px 13px' }}>
                  <span style={{ fontSize: 18 }}>🛒</span>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13.5, color: '#16241C' }}>Whole Foods</div><div style={{ fontSize: 11.5, color: '#8A988E' }}>Grub · 18 items</div></div>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#16241C' }}>$94.20</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#FBF3EC', borderRadius: 13, padding: '11px 13px' }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13.5, color: '#16241C' }}>Hidden fee found</div><div style={{ fontSize: 11.5, color: '#8A988E' }}>$12 / mo · Cancel?</div></div>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#C2410C' }}>−$12</span>
                </div>
              </div>
            </div>
            {/* Floating callout — illustrative product UI, animated. */}
            <div style={{ position: 'absolute', top: 24, left: -6, background: '#fff', borderRadius: 16, padding: '12px 15px', boxShadow: '0 18px 40px -16px rgba(20,40,28,0.35)', border: '1px solid rgba(20,83,45,0.08)', display: 'flex', alignItems: 'center', gap: 10, animation: 'guacFloatB 5s ease-in-out infinite' }}>
              <span style={{ width: 32, height: 32, borderRadius: 10, background: '#F0F7E8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💰</span>
              <div><div style={{ fontSize: 11, color: '#8A988E', fontWeight: 600 }}>Refund caught</div><div style={{ ...DISPLAY, fontWeight: 800, fontSize: 16, color: '#4D7C0F' }}>before the deadline</div></div>
            </div>
          </div>
        </section>

        {/* REAL STATS — only rendered when there's actual data */}
        {tiles.length > 0 && (
          <section style={{ maxWidth: 1180, margin: '0 auto', padding: '8px 28px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tiles.length}, 1fr)`, gap: 20, textAlign: 'center' }}>
              {tiles.map((t) => (
                <div key={t.l}>
                  <div style={{ ...DISPLAY, fontWeight: 800, fontSize: 42, letterSpacing: '-0.03em', color: '#15281C' }}>{t.v}</div>
                  <div style={{ fontSize: 14, color: '#5C6B60', fontWeight: 500 }}>{t.l}</div>
                </div>
              ))}
            </div>
          </section>
        )}

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
              <Link href="/login" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700, fontSize: 16, padding: '16px 30px', borderRadius: 999, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.4)' }}>Sign in</Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <MarketingFooter />

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
    </div>
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

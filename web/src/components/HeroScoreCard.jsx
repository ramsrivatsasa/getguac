'use client'

// The hero mockup card, animated: one card visible at a time, cycling through
// the flagship views — GuacScore, GuacWizard, Returns — with the floating
// callout swapping to match. Illustrative UI numbers, same style as the static
// card it replaces. Respects prefers-reduced-motion (stays on GuacScore).
import { useEffect, useState } from 'react'

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }

const SCENES = [
  {
    title: '🥑 GuacScore', tag: 'This month',
    ring: { score: 87, label: 'SOLID GUAC' },
    rows: [
      { i: '🛒', t: 'Whole Foods', s: 'Grub · 18 items', r: '$94.20' },
      { i: '⚠️', t: 'Hidden fee found', s: '$12 / mo · Cancel?', r: '−$12', neg: true },
    ],
    co: { i: '📈', k: 'Score trend', v: 'up 4 points this month' },
  },
  {
    title: '🪄 GuacWizard', tag: 'health score',
    ring: { score: 92, label: 'WIZARD SCORE' },
    rows: [
      { i: '💳', t: 'Interest paid', s: 'most expensive card', r: '−$40', neg: true },
      { i: '🚩', t: 'Fees flagged', s: 'avoidable · this month', r: '−$20', neg: true },
    ],
    co: { i: '🕵️', k: 'Hidden fee found', v: '$12 / mo — cancel it' },
  },
  {
    title: '💸 Returns', tag: 'windows open',
    stat: { big: '$192', sub: 'refundable right now' },
    rows: [
      { i: '🎯', t: 'Target', s: '44 days left', r: '$24.00' },
      { i: '🏔️', t: 'REI', s: '311 days left', r: '$89.00' },
    ],
    co: { i: '💰', k: 'Refund caught', v: 'before the deadline' },
  },
]

export default function HeroScoreCard() {
  const [i, setI] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setI((s) => (s + 1) % SCENES.length), 6000)
    return () => clearInterval(id)
  }, [])

  const sc = SCENES[i]

  return (
    <>
      <div style={{ position: 'relative', width: 290, background: '#fff', borderRadius: 34, padding: 18, boxShadow: '0 40px 80px -30px rgba(20,40,28,0.32)', border: '1px solid rgba(20,83,45,0.08)', animation: 'guacFloat 6s ease-in-out infinite' }}>
        {/* key swap re-mounts the whole card face per scene */}
        <div key={i} className="gg-swap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 4px' }}>
            <span style={{ ...DISPLAY, fontWeight: 800, color: '#15281C' }}>{sc.title}</span>
            <span style={{ fontSize: 12, color: '#5F6D63' }}>{sc.tag}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 16, height: 150 }}>
            {sc.ring ? (
              <div className="gg-ring" style={{ '--gg-deg': `${Math.round(sc.ring.score * 3.6)}deg`, position: 'relative', width: 150, height: 150, borderRadius: '50%', background: 'conic-gradient(#65A30D var(--gg-deg, 313deg), rgba(101,163,13,0.12) 0deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'guacRing 1.3s 0.2s cubic-bezier(0.22,1,0.36,1) both' }}>
                <div style={{ width: 118, height: 118, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ ...DISPLAY, fontWeight: 800, fontSize: 42, lineHeight: 1, color: '#15281C' }}>{sc.ring.score}</span>
                  <span style={{ fontSize: 11, color: '#65A30D', fontWeight: 700, letterSpacing: '0.04em' }}>{sc.ring.label}</span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...DISPLAY, fontWeight: 800, fontSize: 52, lineHeight: 1, letterSpacing: '-0.02em', color: '#15281C' }}>{sc.stat.big}</div>
                <div style={{ fontSize: 13, color: '#65A30D', fontWeight: 700, marginTop: 8 }}>{sc.stat.sub}</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {sc.rows.map((r, ri) => (
              <div key={r.t} className="gg-swap" style={{ animationDelay: `${120 + ri * 90}ms`, display: 'flex', alignItems: 'center', gap: 11, background: r.neg ? '#FBF3EC' : '#F7FAF2', borderRadius: 13, padding: '11px 13px' }}>
                <span style={{ fontSize: 18 }}>{r.i}</span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 13.5, color: '#16241C' }}>{r.t}</div><div style={{ fontSize: 11.5, color: '#5F6D63' }}>{r.s}</div></div>
                <span style={{ fontWeight: 800, fontSize: 14, color: r.neg ? '#C2410C' : '#16241C' }}>{r.r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Floating callout — swaps with each scene. */}
      <div style={{ position: 'absolute', top: 44, left: -54, background: '#fff', borderRadius: 16, padding: '12px 15px', boxShadow: '0 18px 40px -16px rgba(20,40,28,0.35)', border: '1px solid rgba(20,83,45,0.08)', display: 'flex', alignItems: 'center', gap: 10, animation: 'guacFloatB 4.5s ease-in-out infinite' }}>
        <div key={i} className="gg-swap" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, background: '#F0F7E8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{sc.co.i}</span>
          <div><div style={{ fontSize: 11, color: '#5F6D63', fontWeight: 600 }}>{sc.co.k}</div><div style={{ ...DISPLAY, fontWeight: 800, fontSize: 16, color: '#4D7C0F' }}>{sc.co.v}</div></div>
        </div>
      </div>
    </>
  )
}

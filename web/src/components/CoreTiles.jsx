'use client'
// Four-tile brand block at the top of the dashboard.
//
// These are the reasons to use GetGuac — they have to dominate the
// reference dashboard before any Fetch-style engagement chrome. Each
// tile has its own signature animation that fires on mount + on
// value change:
//
//   GuacoScore  — animated gauge needle sweep
//   GuacMoney   — tabular count-up + coin sparkle
//   GuacWizard  — card-flip reveal + sparkle
//   Worth It    — pulsing heart + count-to-rate
//
// Layout: 2x2 grid on mobile, 1x4 row on desktop. Tiles are tappable;
// each routes to its own detail surface.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, TrendingUp, ArrowRight } from 'lucide-react'
import { fetchTotal as fetchGuacMoneyTotal } from '../lib/guacMoney'

// Count-up tween — animates a number from 0 to `target` over `ms` ms
// using requestAnimationFrame. Reduced-motion users land on `target`
// immediately.
function useCountUp(target, ms = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const reduce = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setValue(target); return }
    const start = performance.now()
    let raf
    function step(now) {
      const t = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return value
}

export default function CoreTiles({ guacoScore, guacMoneyTotal, guacMoneyThisMonth, wizardInsight, worthItPending, smashDays = 0 }) {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <ScoreTile  value={guacoScore}                                          />
      <MoneyTile  total={guacMoneyTotal}        delta={guacMoneyThisMonth}    />
      <WizardTile insight={wizardInsight}                                     />
      <WorthItTile pending={worthItPending}     smashDays={smashDays}         />
    </section>
  )
}

/* ────── GuacoScore ────── */

function ScoreTile({ value = 0 }) {
  const animated = useCountUp(value)
  const pct = Math.max(0, Math.min(100, value)) / 100
  // SVG gauge — semi-circle from -90° to +90°. Stroke-dashoffset
  // animates as the value changes (CSS transition handles the tween).
  const R = 42
  const C = Math.PI * R       // half-circumference (we draw a semicircle)
  return (
    <Link href="/guacanomics" className="core-tile group bg-white rounded-2xl border border-emerald-100 p-4 hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">GuacoScore</span>
        <ArrowRight size={14} className="text-emerald-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
      </div>
      <div className="relative flex items-end justify-center">
        <svg width="120" height="68" viewBox="0 0 120 68" aria-hidden>
          {/* Track */}
          <path
            d={`M 8 60 A ${R} ${R} 0 0 1 112 60`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <path
            d={`M 8 60 A ${R} ${R} 0 0 1 112 60`}
            fill="none"
            stroke="url(#score-gradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
          <defs>
            <linearGradient id="score-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b"/>
              <stop offset="50%" stopColor="#10b981"/>
              <stop offset="100%" stopColor="#059669"/>
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute bottom-0 text-center">
          <p className="text-3xl font-black text-gray-900 tabular-nums leading-none">{Math.round(animated)}</p>
          <p className="text-[10px] font-semibold text-gray-500">of 100</p>
        </div>
      </div>
    </Link>
  )
}

/* ────── GuacMoney ────── */

function MoneyTile({ total = null, delta = 0 }) {
  // Load lifetime GuacMoney total in-tile so the dashboard doesn't
  // have to thread it through. Falls back to whatever the parent
  // passed when the live query is still loading.
  const { data: liveTotal } = useQuery({
    queryKey: ['guac-money-total'],
    queryFn: fetchGuacMoneyTotal,
    staleTime: 60_000,
  })
  const effective = liveTotal ?? total ?? 0
  const animated = useCountUp(Number(effective) || 0)
  return (
    <Link href="/activity" className="core-tile group bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 text-white rounded-2xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all relative overflow-hidden">
      {/* Coin sparkle background */}
      <span aria-hidden className="absolute -top-2 -right-2 text-5xl opacity-20 select-none">🥑</span>
      <div className="flex items-center justify-between mb-2 relative">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-50">GuacMoney</span>
        <ArrowRight size={14} className="text-emerald-100 group-hover:translate-x-0.5 transition" />
      </div>
      <p className="text-3xl font-black tabular-nums leading-none relative">
        ${animated.toFixed(animated < 100 ? 2 : 0)}
      </p>
      <p className="text-[11px] font-semibold text-emerald-50 mt-2 flex items-center gap-1 relative">
        {delta > 0 ? (
          <>
            <TrendingUp size={12} /> +${Number(delta).toFixed(2)} this month
          </>
        ) : (
          'Lifetime saved'
        )}
      </p>
    </Link>
  )
}

/* ────── GuacWizard ────── */

function WizardTile({ insight }) {
  // insight: { title, body } or null/undefined when there's nothing
  // to surface yet. Card-flip reveal animation on mount.
  return (
    <Link href="/guacanomics" className="core-tile group bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white rounded-2xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all relative overflow-hidden wizard-flip-in">
      <span aria-hidden className="absolute -bottom-3 -right-3 text-5xl opacity-25 select-none">🔮</span>
      <div className="flex items-center justify-between mb-2 relative">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-50">GuacWizard</span>
        <Sparkles size={14} className="text-violet-100 wizard-sparkle" />
      </div>
      {insight ? (
        <>
          <p className="text-base font-extrabold leading-tight line-clamp-2 relative">{insight.title}</p>
          {insight.body && (
            <p className="text-[11px] text-violet-50 mt-1 line-clamp-2 relative">{insight.body}</p>
          )}
        </>
      ) : (
        <>
          <p className="text-base font-extrabold leading-tight relative">No insight yet</p>
          <p className="text-[11px] text-violet-50 mt-1 relative">Log a few receipts and the wizard wakes up</p>
        </>
      )}
      <style jsx>{`
        .wizard-flip-in { animation: wizard-flip 600ms cubic-bezier(0.16, 1, 0.3, 1) both; transform-origin: top center; perspective: 600px; }
        .wizard-sparkle { animation: wizard-sparkle 2.4s ease-in-out infinite; transform-origin: center; }
        @keyframes wizard-flip {
          0% { opacity: 0; transform: rotateX(-90deg); }
          100% { opacity: 1; transform: rotateX(0); }
        }
        @keyframes wizard-sparkle {
          0%, 100% { transform: scale(1) rotate(0); opacity: 1; }
          50%      { transform: scale(1.3) rotate(20deg); opacity: 0.7; }
        }
        @media (prefers-reduced-motion: reduce) {
          .wizard-flip-in, .wizard-sparkle { animation: none; }
        }
      `}</style>
    </Link>
  )
}

/* ────── Worth It? ────── */

function WorthItTile({ pending = 0, smashDays = 0 }) {
  return (
    <Link href="/validate" className="core-tile group bg-gradient-to-br from-amber-400 via-amber-500 to-rose-500 text-white rounded-2xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all relative overflow-hidden">
      <span aria-hidden className="absolute -bottom-3 -right-3 text-5xl opacity-25 select-none worthit-heartbeat">💚</span>
      <div className="flex items-center justify-between mb-2 relative">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-50">Worth It?</span>
        <ArrowRight size={14} className="text-amber-100 group-hover:translate-x-0.5 transition" />
      </div>
      <p className="text-3xl font-black tabular-nums leading-none relative">{pending}</p>
      <p className="text-[11px] font-semibold text-amber-50 mt-2 relative">
        {pending > 0 ? `to rate · ${smashDays} 🔥 days` : `you're caught up · ${smashDays} 🔥 days`}
      </p>
      <style jsx>{`
        .worthit-heartbeat { animation: worthit-heartbeat 1.6s ease-in-out infinite; transform-origin: center; }
        @keyframes worthit-heartbeat {
          0%, 100% { transform: scale(1); }
          15%      { transform: scale(1.18); }
          30%      { transform: scale(1); }
          45%      { transform: scale(1.12); }
          60%      { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .worthit-heartbeat { animation: none; }
        }
      `}</style>
    </Link>
  )
}

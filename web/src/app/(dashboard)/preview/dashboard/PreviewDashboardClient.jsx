'use client'
// Preview redesign of the dashboard, mounted at /preview/dashboard.
//
// Same data as production /dashboard, rendered through the new card
// aesthetic so we can compare side-by-side without touching the live
// page. Once the user signs off this layout, it can be promoted into
// DashboardClient.jsx.
//
// Layout (top → bottom):
//   1. Greeting strip
//   2. Core tiles — GuacScore (gauge) · GuacMoney · GuacWizard · Worth It
//   3. Recent activity — vertical list of ItemRowCards for the
//      last 5 receipts
//   4. Payments Made — horizontal scroll of stat tiles

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DollarSign, Receipt, TrendingUp, ArrowRight, Sparkles, Heart } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { calculateGuacoScore } from '../../../../lib/guacoscore'
import { fetchTotal as fetchGuacMoneyTotal } from '../../../../lib/guacMoney'
import { displayStoreName } from '../../../../lib/store-name-normalize'
import { tintForCategory } from '../../../../components/ProductCard'
import ItemRowCard from '../../../../components/ItemRowCard'
import { formatDateShort } from '../../../../lib/dateFormat'
import '../../../../components/emoji-floats.css'

const CATEGORY_EMOJI = {
  grocery: '🥦', beverages: '🧃', alcohol: '🍷', pet: '🐶',
  household: '🧴', health: '💊', restaurant: '🍴', clothing: '👕',
  electronics: '📱', toys: '🧸', baby: '👶', fuel: '⛽', auto: '🚗',
  fastfood: '🍔', coffee: '☕',
}

function emojiForReceipt(r) {
  return CATEGORY_EMOJI[r.category] || '🛒'
}

export default function PreviewDashboardClient({ receipts, rewards, firstName }) {
  const router = useRouter()
  const totalSpend = receipts.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0)
  const totalTax   = receipts.reduce((s, r) => s + parseFloat(r.tax_paid || 0), 0)
  const bankFees   = receipts.filter(r => r.category === 'bank-fees').reduce((s, r) => s + parseFloat(r.total_amount || 0), 0)
  const score      = useMemo(() => calculateGuacoScore(receipts), [receipts])
  const worthItPending = receipts.filter(r => r.worthit_score == null).length

  const { data: gmTotal = 0 } = useQuery({
    queryKey: ['guac-money-total'],
    queryFn: fetchGuacMoneyTotal,
    staleTime: 60_000,
  })

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Disclaimer */}
      <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2 text-[12px] text-amber-900">
        <strong>Preview</strong> — your real data through the redesigned cards. The production dashboard at <code className="bg-white px-1 rounded">/dashboard</code> is unchanged.
      </div>

      {/* 1. Greeting strip */}
      <div className="flex items-center gap-3">
        <span className="emoji-floats text-4xl">🥑</span>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-gray-900 leading-tight">Hi {firstName}</h1>
          <p className="text-sm text-gray-500">
            {receipts.length} receipts · ${totalSpend.toFixed(0)} tracked
          </p>
        </div>
      </div>

      {/* 2. Core tiles — Score / Money / Wizard / Worth It */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ScoreTile score={score?.score ?? 0} grade={score?.grade} />
        <MoneyTile total={gmTotal} />
        <WizardTile />
        <WorthItTile pending={worthItPending} />
      </div>

      {/* 3. Recent activity — ItemRowCards from the last 5 receipts */}
      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-base font-extrabold text-gray-900">Recent activity</h2>
          <Link href="/receipts" className="text-xs font-bold text-emerald-700 hover:text-emerald-900">See all</Link>
        </div>
        {receipts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-500">
            No receipts yet. <Link href="/receipts" className="text-emerald-700 font-bold hover:underline">Capture your first →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.slice(0, 5).map(r => (
              <ItemRowCard
                key={r.id}
                tint={tintForCategory(r.category)}
                emoji={emojiForReceipt(r)}
                title={displayStoreName(r.store_name) || 'Receipt'}
                subtitle={`${formatDateShort(r.date)} · ${r.category ? r.category.replace('-', ' ') : 'uncategorized'}`}
                guacMoney={Number(r.total_amount || 0).toFixed(2)}
                social={null}
                onClick={() => router.push(`/receipts/${r.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Payments Made — horizontal scroll, lifetime numbers */}
      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-base font-extrabold text-gray-900">Payments Made</h2>
          <span className="text-xs text-gray-500">Lifetime</span>
        </div>
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar">
          <PaymentTile
            emoji="🧾"
            gradient="linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #6366f1 100%)"
            haloColor="#7dd3fc"
            label="Transactions"
            value={receipts.length}
            logoPos={{ top: '-12px', left: '-10px', rotate: '-18deg', size: '110px' }}
          />
          <PaymentTile
            emoji="💸"
            gradient="linear-gradient(135deg, #fb923c 0%, #f87171 50%, #f472b6 100%)"
            haloColor="#fdba74"
            label="Total Spent"
            value={`$${totalSpend.toFixed(2)}`}
            logoPos={{ top: '40px', right: '-22px', rotate: '24deg', size: '100px' }}
          />
          <PaymentTile
            emoji="📈"
            gradient="linear-gradient(135deg, #fcd34d 0%, #fbbf24 50%, #f59e0b 100%)"
            haloColor="#fde68a"
            label="Tax Paid"
            value={`$${totalTax.toFixed(2)}`}
            logoPos={{ bottom: '-18px', left: '60px', rotate: '12deg', size: '120px' }}
          />
          <PaymentTile
            emoji="🏦"
            gradient="linear-gradient(135deg, #fb7185 0%, #ec4899 50%, #db2777 100%)"
            haloColor="#fda4af"
            label="Bank Fees"
            value={`$${bankFees.toFixed(2)}`}
            logoPos={{ top: '-8px', right: '70px', rotate: '-32deg', size: '95px' }}
          />
        </div>
        <style jsx>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </section>

      <div className="h-6" />
    </div>
  )
}

/* ────── Core tiles ────── */

function ScoreTile({ score = 0, grade }) {
  const pct = Math.max(0, Math.min(100, score)) / 100
  const R = 42
  const C = Math.PI * R
  const label = grade?.label || 'Fresh start'
  return (
    <Link href="/guacanomics" className="group relative overflow-hidden bg-gradient-to-br from-lime-100 via-emerald-100 to-teal-100 rounded-2xl border-2 border-white p-4 h-44 hover:shadow-xl hover:-translate-y-1 hover:rotate-[0.5deg] transition-all flex flex-col shadow-lg ring-1 ring-emerald-200/50">
      <span aria-hidden className="emoji-floats absolute -bottom-4 -right-3 text-6xl opacity-15 select-none">🥑</span>
      <span aria-hidden className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-emerald-300/30 blur-2xl pointer-events-none" />
      <div className="flex items-center justify-between mb-1 relative">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">GuacScore</span>
        <ArrowRight size={14} className="text-emerald-600 group-hover:translate-x-0.5 transition" />
      </div>
      <div className="relative flex items-end justify-center flex-1">
        <svg width="120" height="68" viewBox="0 0 120 68" aria-hidden>
          <path d={`M 8 60 A ${R} ${R} 0 0 1 112 60`} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="10" strokeLinecap="round" />
          <path d={`M 8 60 A ${R} ${R} 0 0 1 112 60`}
            fill="none" stroke="url(#preview-score-gradient)" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)' }} />
          <defs>
            <linearGradient id="preview-score-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b"/>
              <stop offset="50%" stopColor="#10b981"/>
              <stop offset="100%" stopColor="#059669"/>
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute bottom-0 text-center">
          <p className="text-4xl font-black text-emerald-900 tabular-nums leading-none drop-shadow-sm">{Math.round(score)}</p>
          <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wide mt-0.5">{label}</p>
        </div>
      </div>
    </Link>
  )
}

function MoneyTile({ total = 0 }) {
  return (
    <Link href="/receipts" className="group relative overflow-hidden rounded-2xl p-4 h-44 hover:shadow-xl hover:-translate-y-1 hover:-rotate-[0.5deg] transition-all border-2 border-white shadow-lg ring-1 ring-emerald-300/40"
      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' }}>
      <span aria-hidden className="emoji-floats absolute -bottom-4 -right-4 text-7xl opacity-30 select-none">🥑</span>
      <span aria-hidden className="absolute top-1 left-1 w-20 h-20 rounded-full bg-lime-300/30 blur-2xl pointer-events-none" />
      <span aria-hidden className="absolute -bottom-6 right-12 text-2xl opacity-50">✨</span>
      <span aria-hidden className="absolute top-6 right-2 text-base opacity-50">✨</span>
      <div className="flex items-center justify-between mb-2 relative">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-50 drop-shadow">GuacMoney</span>
        <ArrowRight size={14} className="text-white group-hover:translate-x-0.5 transition" />
      </div>
      <p className="text-4xl font-black tabular-nums leading-none relative text-white drop-shadow">
        ${Number(total || 0).toFixed(total >= 100 ? 0 : 2)}
      </p>
      <p className="text-[11px] font-bold text-emerald-50 mt-2 relative uppercase tracking-wide">Lifetime saved 🌱</p>
    </Link>
  )
}

function WizardTile() {
  return (
    <Link href="/guacwizard" className="group relative overflow-hidden rounded-2xl p-4 h-44 hover:shadow-xl hover:-translate-y-1 hover:rotate-[0.5deg] transition-all border-2 border-white shadow-lg ring-1 ring-violet-300/40"
      style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #d946ef 100%)' }}>
      <span aria-hidden className="emoji-floats absolute -bottom-3 -right-3 text-7xl opacity-30 select-none">🔮</span>
      <span aria-hidden className="absolute top-2 left-2 w-20 h-20 rounded-full bg-fuchsia-300/40 blur-2xl pointer-events-none" />
      <span aria-hidden className="absolute top-8 right-3 text-lg opacity-70 wizard-twinkle">✨</span>
      <span aria-hidden className="absolute bottom-4 left-3 text-sm opacity-50 wizard-twinkle-2">⭐</span>
      <div className="flex items-center justify-between mb-2 relative">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-50 drop-shadow">GuacWizard</span>
        <Sparkles size={14} className="text-white wizard-twinkle" />
      </div>
      <p className="text-lg font-black leading-tight relative text-white drop-shadow">Daily insight</p>
      <p className="text-[11px] font-bold text-violet-50 mt-1 relative uppercase tracking-wide">Tap to peek 🪄</p>
      <style jsx>{`
        .wizard-twinkle   { animation: twinkle 2.6s ease-in-out infinite; }
        .wizard-twinkle-2 { animation: twinkle 2.6s ease-in-out infinite 1.3s; }
        @keyframes twinkle {
          0%, 100% { transform: scale(1)   rotate(0);    opacity: 0.7; }
          50%      { transform: scale(1.4) rotate(180deg); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .wizard-twinkle, .wizard-twinkle-2 { animation: none; }
        }
      `}</style>
    </Link>
  )
}

function WorthItTile({ pending = 0 }) {
  return (
    <Link href="/validate" className="group relative overflow-hidden rounded-2xl p-4 h-44 hover:shadow-xl hover:-translate-y-1 hover:-rotate-[0.5deg] transition-all border-2 border-white shadow-lg ring-1 ring-rose-300/40"
      style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 35%, #ef4444 70%, #ec4899 100%)' }}>
      <span aria-hidden className="emoji-floats absolute -bottom-4 -right-3 text-7xl opacity-30 select-none">💚</span>
      <span aria-hidden className="absolute top-2 left-2 w-20 h-20 rounded-full bg-yellow-200/40 blur-2xl pointer-events-none" />
      <span aria-hidden className="absolute top-7 right-3 text-base opacity-60">💕</span>
      <div className="flex items-center justify-between mb-2 relative">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-yellow-50 drop-shadow">Worth It?</span>
        <Heart size={14} className="text-white fill-white worth-heartbeat" />
      </div>
      <p className="text-4xl font-black tabular-nums leading-none relative text-white drop-shadow">{pending}</p>
      <p className="text-[11px] font-bold text-yellow-50 mt-2 relative uppercase tracking-wide">
        {pending > 0 ? 'to rate ❤️' : "you're caught up ✨"}
      </p>
      <style jsx>{`
        .worth-heartbeat { animation: worth-beat 1.4s ease-in-out infinite; transform-origin: center; }
        @keyframes worth-beat {
          0%, 100% { transform: scale(1); }
          15%      { transform: scale(1.22); }
          30%      { transform: scale(1); }
          45%      { transform: scale(1.14); }
          60%      { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .worth-heartbeat { animation: none; }
        }
      `}</style>
    </Link>
  )
}

function PaymentTile({ emoji, gradient, haloColor, label, value, logoPos }) {
  // GetGuac avocado logo as a watermark behind everything. Each tile
  // gets its own position + rotation (via logoPos prop) so the
  // logos don't all sit in the same spot — adds organic variety
  // without changing any other layout dimension.
  return (
    <div
      className="snap-start shrink-0 w-60 h-44 relative overflow-hidden rounded-2xl border-2 border-white shadow-lg p-4 hover:shadow-xl hover:-translate-y-1 hover:rotate-[0.5deg] transition-all text-white"
      style={{ background: gradient }}
    >
      {/* Logo watermark — sits behind everything (z-0) with low
          opacity. Position/rotation per logoPos so each tile feels
          unique. */}
      {logoPos && (
        <span
          aria-hidden
          className="absolute select-none pointer-events-none leading-none"
          style={{
            top: logoPos.top,
            right: logoPos.right,
            bottom: logoPos.bottom,
            left: logoPos.left,
            transform: `rotate(${logoPos.rotate || '0deg'})`,
            fontSize: logoPos.size || '100px',
            opacity: 0.18,
            filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.3))',
          }}
        >
          🥑
        </span>
      )}
      <span aria-hidden className="absolute -bottom-4 -right-2 select-none pointer-events-none z-10">
        <span className="emoji-floats text-7xl opacity-95">{emoji}</span>
      </span>
      <span aria-hidden className="absolute -top-6 -left-6 w-24 h-24 rounded-full opacity-50 blur-2xl pointer-events-none" style={{ backgroundColor: haloColor }} />
      <p className="text-sm font-extrabold uppercase tracking-wider text-white drop-shadow relative z-10">{label}</p>
      <p className="text-4xl font-black tabular-nums mt-1 relative drop-shadow leading-none z-10">{value}</p>
    </div>
  )
}

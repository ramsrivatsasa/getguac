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
          <PaymentTile tint="#dcfce7" icon={Receipt}     iconColor="text-emerald-700"  label="Transactions" value={receipts.length} />
          <PaymentTile tint="#fee2e2" icon={DollarSign}  iconColor="text-rose-700"     label="Total Spent"  value={`$${totalSpend.toFixed(2)}`} />
          <PaymentTile tint="#fef3c7" icon={TrendingUp}  iconColor="text-amber-700"    label="Tax Paid"     value={`$${totalTax.toFixed(2)}`} />
          <PaymentTile tint="#fce7f3" icon={TrendingUp}  iconColor="text-rose-700"     label="Bank Fees"    value={`$${bankFees.toFixed(2)}`} />
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
    <Link href="/guacanomics" className="group bg-white rounded-2xl border border-emerald-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">GuacScore</span>
        <ArrowRight size={14} className="text-emerald-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
      </div>
      <div className="relative flex items-end justify-center flex-1">
        <svg width="120" height="68" viewBox="0 0 120 68" aria-hidden>
          <path d={`M 8 60 A ${R} ${R} 0 0 1 112 60`} fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round" />
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
          <p className="text-3xl font-black text-gray-900 tabular-nums leading-none">{Math.round(score)}</p>
          <p className="text-[10px] font-semibold text-gray-500">{label}</p>
        </div>
      </div>
    </Link>
  )
}

function MoneyTile({ total = 0 }) {
  return (
    <Link href="/receipts" className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 text-white rounded-2xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <span aria-hidden className="emoji-floats absolute -top-2 -right-2 text-5xl opacity-25 select-none">🥑</span>
      <div className="flex items-center justify-between mb-2 relative">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-50">GuacMoney</span>
        <ArrowRight size={14} className="text-emerald-100 group-hover:translate-x-0.5 transition" />
      </div>
      <p className="text-3xl font-black tabular-nums leading-none relative">
        ${Number(total || 0).toFixed(total >= 100 ? 0 : 2)}
      </p>
      <p className="text-[11px] font-semibold text-emerald-50 mt-2 relative">Lifetime saved</p>
    </Link>
  )
}

function WizardTile() {
  return (
    <Link href="/guacwizard" className="group relative overflow-hidden bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white rounded-2xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <span aria-hidden className="emoji-floats absolute -bottom-3 -right-3 text-5xl opacity-25 select-none">🔮</span>
      <div className="flex items-center justify-between mb-2 relative">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-50">GuacWizard</span>
        <Sparkles size={14} className="text-violet-100" />
      </div>
      <p className="text-base font-extrabold leading-tight relative">Daily insight</p>
      <p className="text-[11px] text-violet-50 mt-1 relative">Tap to open the wizard</p>
    </Link>
  )
}

function WorthItTile({ pending = 0 }) {
  return (
    <Link href="/validate" className="group relative overflow-hidden bg-gradient-to-br from-amber-400 via-amber-500 to-rose-500 text-white rounded-2xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <span aria-hidden className="emoji-floats absolute -bottom-3 -right-3 text-5xl opacity-25 select-none">💚</span>
      <div className="flex items-center justify-between mb-2 relative">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-50">Worth It?</span>
        <Heart size={14} className="text-amber-100" />
      </div>
      <p className="text-3xl font-black tabular-nums leading-none relative">{pending}</p>
      <p className="text-[11px] font-semibold text-amber-50 mt-2 relative">
        {pending > 0 ? 'to rate' : 'caught up'}
      </p>
    </Link>
  )
}

function PaymentTile({ tint, icon: Icon, iconColor, label, value }) {
  return (
    <div className="snap-start shrink-0 w-44 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: tint }}>
        <Icon size={18} className={iconColor} />
      </div>
      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-lg font-extrabold text-gray-900 tabular-nums mt-0.5">{value}</p>
    </div>
  )
}

'use client'
// Regular stat-card style — white background, pastel icon block,
// gray label, dark value. Matches the dashboard's existing
// stat-card pattern. Same component API as before so the existing
// AllPaymentsScroll mount in DashboardClient keeps working — only
// the visual style changed (no gradients, no halo, no watermark).

import './emoji-floats.css'

// Pastel icon-block tones — used for the emoji chip on the left of
// each tile. Each tone is bg-X-100 + text-X-700, matching the rest
// of the dashboard's stat-card icon blocks.
const TONE = {
  sky:     'bg-sky-100 text-sky-700',
  rose:    'bg-rose-100 text-rose-700',
  amber:   'bg-amber-100 text-amber-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  violet:  'bg-violet-100 text-violet-700',
  orange:  'bg-orange-100 text-orange-700',
  teal:    'bg-teal-100 text-teal-700',
  pink:    'bg-pink-100 text-pink-700',
}

export default function PaymentTile({ emoji, tone, label, value }) {
  return (
    <div className="snap-start shrink-0 w-52 flex items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm p-3 hover:shadow-md transition-all">
      <div className={`shrink-0 w-11 h-11 rounded-lg flex items-center justify-center ${TONE[tone] || TONE.sky}`}>
        <span className="text-2xl leading-none">{emoji}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider leading-tight">{label}</p>
        <p className="text-base font-bold text-gray-900 tabular-nums mt-0.5 truncate">{value}</p>
      </div>
    </div>
  )
}

// Same eight keys as before so AllPaymentsScroll keeps working.
export const PAYMENT_TILE_CONFIGS = {
  transactions: { emoji: '🧾', tone: 'sky',     label: 'Transactions' },
  totalSpent:   { emoji: '💸', tone: 'rose',    label: 'Total Spent' },
  taxPaid:      { emoji: '📈', tone: 'amber',   label: 'Tax Paid' },
  purchases:    { emoji: '🛒', tone: 'emerald', label: 'Purchases' },
  payments:     { emoji: '💳', tone: 'violet',  label: 'Payments' },
  interestPaid: { emoji: '📊', tone: 'orange',  label: 'Interest Paid' },
  feesPaid:     { emoji: '💰', tone: 'teal',    label: 'Fees Paid' },
  bankFees:     { emoji: '🏦', tone: 'pink',    label: 'Bank Fees' },
}

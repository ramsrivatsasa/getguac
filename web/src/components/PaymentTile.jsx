'use client'
// Compact stat tile with a decorative SVG vector backdrop. Each
// tile picks a different shape (dots, wave, rings, stripes, blob,
// hexes, plus signs, zigzag) so the row feels varied instead of
// eight identical pills. The vector sits behind the content at low
// opacity so it's decoration, not chrome.

import './emoji-floats.css'

// Pastel icon-block tones — used for the emoji chip and as the
// stroke color for the per-tile SVG pattern. Each tone is bg-X-100
// + text-X-700, matching the dashboard's stat-card icon blocks.
const TONE = {
  sky:     { chip: 'bg-sky-100 text-sky-700',         stroke: '#0ea5e9' },
  rose:    { chip: 'bg-rose-100 text-rose-700',       stroke: '#f43f5e' },
  amber:   { chip: 'bg-amber-100 text-amber-700',     stroke: '#f59e0b' },
  emerald: { chip: 'bg-emerald-100 text-emerald-700', stroke: '#10b981' },
  violet:  { chip: 'bg-violet-100 text-violet-700',   stroke: '#8b5cf6' },
  orange:  { chip: 'bg-orange-100 text-orange-700',   stroke: '#f97316' },
  teal:    { chip: 'bg-teal-100 text-teal-700',       stroke: '#14b8a6' },
  pink:    { chip: 'bg-pink-100 text-pink-700',       stroke: '#ec4899' },
}

// Eight distinct SVG vectors — kept tiny, all positioned in the
// bottom-right corner of the tile. Color comes from currentColor so
// each tile inherits the tone stroke without a duplicate definition.
function VectorBackdrop({ pattern, stroke }) {
  const common = {
    style: { color: stroke },
    className: 'absolute -bottom-2 -right-2 opacity-25 pointer-events-none',
  }
  switch (pattern) {
    case 'dots':
      return (
        <svg {...common} width="64" height="64" viewBox="0 0 64 64" fill="currentColor">
          {[...Array(16)].map((_, i) => (
            <circle key={i} cx={(i % 4) * 16 + 6} cy={Math.floor(i / 4) * 16 + 6} r="2.2" />
          ))}
        </svg>
      )
    case 'wave':
      return (
        <svg {...common} width="80" height="48" viewBox="0 0 80 48" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M0 14 Q 10 4, 20 14 T 40 14 T 60 14 T 80 14" />
          <path d="M0 28 Q 10 18, 20 28 T 40 28 T 60 28 T 80 28" />
          <path d="M0 42 Q 10 32, 20 42 T 40 42 T 60 42 T 80 42" />
        </svg>
      )
    case 'rings':
      return (
        <svg {...common} width="72" height="72" viewBox="0 0 72 72" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="50" cy="50" r="8" />
          <circle cx="50" cy="50" r="18" />
          <circle cx="50" cy="50" r="28" />
        </svg>
      )
    case 'stripes':
      return (
        <svg {...common} width="72" height="72" viewBox="0 0 72 72" fill="none" stroke="currentColor" strokeWidth="2">
          {[...Array(7)].map((_, i) => (
            <line key={i} x1={i * 12} y1="72" x2={72 + i * 12} y2="0" />
          ))}
        </svg>
      )
    case 'blob':
      return (
        <svg {...common} width="80" height="80" viewBox="0 0 80 80" fill="currentColor">
          <path d="M62 14c12 8 16 26 8 38s-26 18-40 12S6 42 12 28 50 6 62 14z" />
        </svg>
      )
    case 'hex':
      return (
        <svg {...common} width="72" height="64" viewBox="0 0 72 64" fill="none" stroke="currentColor" strokeWidth="2">
          {[[10, 16], [34, 16], [58, 16], [22, 36], [46, 36], [10, 56], [34, 56], [58, 56]].map(([cx, cy], i) => {
            const r = 8
            const pts = [0, 1, 2, 3, 4, 5].map(k => {
              const a = (Math.PI / 3) * k - Math.PI / 6
              return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
            }).join(' ')
            return <polygon key={i} points={pts} />
          })}
        </svg>
      )
    case 'plus':
      return (
        <svg {...common} width="72" height="72" viewBox="0 0 72 72" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          {[[12, 12], [36, 12], [60, 12], [12, 36], [36, 36], [60, 36], [12, 60], [36, 60], [60, 60]].map(([cx, cy], i) => (
            <g key={i}>
              <line x1={cx - 4} y1={cy} x2={cx + 4} y2={cy} />
              <line x1={cx} y1={cy - 4} x2={cx} y2={cy + 4} />
            </g>
          ))}
        </svg>
      )
    case 'zigzag':
      return (
        <svg {...common} width="80" height="56" viewBox="0 0 80 56" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          <polyline points="0,8 10,2 20,8 30,2 40,8 50,2 60,8 70,2 80,8" />
          <polyline points="0,28 10,22 20,28 30,22 40,28 50,22 60,28 70,22 80,28" />
          <polyline points="0,48 10,42 20,48 30,42 40,48 50,42 60,48 70,42 80,48" />
        </svg>
      )
    default:
      return null
  }
}

// Delta chip tone — green when the number went down (good for cost
// metrics like fees / interest), rose when it went up. The caller
// decides direction via `deltaGoodWhen` ('down' | 'up'); for
// neutral metrics like Transactions, pass 'neutral' and the chip
// stays gray regardless of direction.
function deltaChipClass(deltaArrow, deltaGoodWhen) {
  if (!deltaArrow || deltaArrow === '→') return 'bg-gray-100 text-gray-500'
  if (deltaGoodWhen === 'neutral') return 'bg-gray-100 text-gray-600'
  const goingUp = deltaArrow === '↑'
  const good = (deltaGoodWhen === 'up' && goingUp) || (deltaGoodWhen === 'down' && !goingUp)
  return good ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
}

export default function PaymentTile({ emoji, tone, label, value, pattern, deltaLabel, deltaArrow, deltaGoodWhen = 'neutral' }) {
  const t = TONE[tone] || TONE.sky
  return (
    <div className="snap-start shrink-0 w-40 relative overflow-hidden flex items-center gap-2.5 bg-white rounded-xl border border-gray-200 shadow-sm p-2.5 hover:shadow-md transition-all">
      <VectorBackdrop pattern={pattern} stroke={t.stroke} />
      <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center relative z-10 ${t.chip}`}>
        <span className="text-xl leading-none">{emoji}</span>
      </div>
      <div className="min-w-0 flex-1 relative z-10">
        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider leading-tight">{label}</p>
        <p className="text-sm font-bold text-gray-900 tabular-nums mt-0.5 truncate">{value}</p>
        {deltaLabel && (
          <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-[1px] rounded-full ${deltaChipClass(deltaArrow, deltaGoodWhen)}`}>
            {deltaLabel}
          </span>
        )}
      </div>
    </div>
  )
}

// Same eight keys as before so AllPaymentsScroll keeps working —
// each tile now also picks a vector pattern for its backdrop.
export const PAYMENT_TILE_CONFIGS = {
  transactions: { emoji: '🧾', tone: 'sky',     label: 'Transactions',  pattern: 'dots' },
  totalSpent:   { emoji: '💸', tone: 'rose',    label: 'Total Spent',   pattern: 'wave' },
  taxPaid:      { emoji: '📈', tone: 'amber',   label: 'Tax Paid',      pattern: 'rings' },
  purchases:    { emoji: '🛒', tone: 'emerald', label: 'Purchases',     pattern: 'stripes' },
  payments:     { emoji: '💳', tone: 'violet',  label: 'Payments',      pattern: 'blob' },
  interestPaid: { emoji: '📊', tone: 'orange',  label: 'Interest Paid', pattern: 'hex' },
  feesPaid:     { emoji: '💰', tone: 'teal',    label: 'Fees Paid',     pattern: 'plus' },
  bankFees:     { emoji: '🏦', tone: 'pink',    label: 'Bank Fees',     pattern: 'zigzag' },
}

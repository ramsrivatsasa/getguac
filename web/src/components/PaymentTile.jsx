'use client'
// Compact stat tile, redesigned to match the "Net Spent (out)"
// reference: a large gradient-filled icon chip on the left, then a
// label / big value / small subtext stack on the right. Decorative
// backdrop kept from earlier — geometric SVG pattern + 🥑 avocado
// watermark + a theme-relevant emoji, all at very low opacity so
// the foreground content stays readable.

import './emoji-floats.css'
import CountUp from './animated/CountUp'

// Each tone is a Tailwind gradient class for the chip (warm reds
// through brand greens) plus a matching stroke color used by the
// per-tile SVG pattern. The strong gradient gives the chip the
// presence the reference card needed.
const TONE = {
  red:     { chip: 'bg-gradient-to-br from-red-500 to-rose-600',         stroke: '#ef4444' },
  orange:  { chip: 'bg-gradient-to-br from-orange-500 to-amber-600',     stroke: '#f97316' },
  amber:   { chip: 'bg-gradient-to-br from-amber-400 to-orange-500',     stroke: '#f59e0b' },
  yellow:  { chip: 'bg-gradient-to-br from-yellow-400 to-amber-500',     stroke: '#eab308' },
  lime:    { chip: 'bg-gradient-to-br from-lime-500 to-emerald-600',     stroke: '#84cc16' },
  emerald: { chip: 'bg-gradient-to-br from-emerald-500 to-teal-600',     stroke: '#10b981' },
  teal:    { chip: 'bg-gradient-to-br from-teal-500 to-emerald-600',     stroke: '#14b8a6' },
  green:   { chip: 'bg-gradient-to-br from-green-500 to-emerald-600',    stroke: '#22c55e' },
}

function EmojiMark({ emoji, pos, kind }) {
  if (!emoji || !pos) return null
  // The watermark's base rotation is passed as a CSS variable so the
  // keyframe drift can compose with it (`rotate(calc(var(--wm-rot) +
  // 6deg))`) instead of overwriting it. `kind` picks the avocado vs.
  // theme animation curve so the two marks don't move in lockstep.
  return (
    <span
      aria-hidden
      className={`absolute select-none pointer-events-none leading-none ${kind === 'avocado' ? 'tile-watermark-avocado' : 'tile-watermark-theme'}`}
      style={{
        top: pos.top, right: pos.right, bottom: pos.bottom, left: pos.left,
        fontSize: pos.size || '28px',
        opacity: pos.opacity ?? 0.18,
        '--wm-rot': pos.rotate || '0deg',
      }}
    >
      {emoji}
    </span>
  )
}

function VectorPattern({ pattern, stroke, pos }) {
  if (!pattern || !pos) return null
  const common = {
    style: {
      color: stroke,
      top: pos.top, right: pos.right, bottom: pos.bottom, left: pos.left,
      transform: pos.rotate ? `rotate(${pos.rotate})` : undefined,
    },
    className: 'absolute opacity-[0.22] pointer-events-none',
  }
  switch (pattern) {
    case 'dots':
      return (
        <svg {...common} width="64" height="64" viewBox="0 0 56 56" fill="currentColor">
          {[...Array(16)].map((_, i) => (
            <circle key={i} cx={(i % 4) * 14 + 6} cy={Math.floor(i / 4) * 14 + 6} r="2.4" />
          ))}
        </svg>
      )
    case 'wave':
      return (
        <svg {...common} width="80" height="44" viewBox="0 0 72 40" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M0 10 Q 9 2, 18 10 T 36 10 T 54 10 T 72 10" />
          <path d="M0 22 Q 9 14, 18 22 T 36 22 T 54 22 T 72 22" />
          <path d="M0 34 Q 9 26, 18 34 T 36 34 T 54 34 T 72 34" />
        </svg>
      )
    case 'rings':
      return (
        <svg {...common} width="68" height="68" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.4">
          <circle cx="44" cy="44" r="7" />
          <circle cx="44" cy="44" r="16" />
          <circle cx="44" cy="44" r="25" />
        </svg>
      )
    case 'stripes':
      return (
        <svg {...common} width="68" height="68" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.4">
          {[...Array(6)].map((_, i) => (
            <line key={i} x1={i * 12} y1="64" x2={64 + i * 12} y2="0" />
          ))}
        </svg>
      )
    case 'blob':
      return (
        <svg {...common} width="76" height="76" viewBox="0 0 80 80" fill="currentColor">
          <path d="M62 14c12 8 16 26 8 38s-26 18-40 12S6 42 12 28 50 6 62 14z" />
        </svg>
      )
    case 'hex':
      return (
        <svg {...common} width="68" height="60" viewBox="0 0 72 64" fill="none" stroke="currentColor" strokeWidth="2.4">
          {[[10, 16], [34, 16], [58, 16], [22, 36], [46, 36], [10, 56], [34, 56], [58, 56]].map(([cx, cy], i) => {
            const r = 7
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
        <svg {...common} width="64" height="64" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
          {[[10, 10], [30, 10], [50, 10], [10, 30], [30, 30], [50, 30], [10, 50], [30, 50], [50, 50]].map(([cx, cy], i) => (
            <g key={i}>
              <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} />
              <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 3} />
            </g>
          ))}
        </svg>
      )
    case 'zigzag':
      return (
        <svg {...common} width="80" height="48" viewBox="0 0 72 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
          <polyline points="0,8 9,2 18,8 27,2 36,8 45,2 54,8 63,2 72,8" />
          <polyline points="0,24 9,18 18,24 27,18 36,24 45,18 54,24 63,18 72,24" />
          <polyline points="0,40 9,34 18,40 27,34 36,40 45,34 54,40 63,34 72,40" />
        </svg>
      )
    default:
      return null
  }
}

// Subtext under the value. Used for the delta line — same shape as
// the "Gross $7709.20" subtext on the reference card. Color tinted
// by the metric's good-direction: green when a cost went down or
// income went up, rose when the reverse, gray for neutral metrics.
function deltaSubtextClass(deltaArrow, deltaGoodWhen) {
  if (!deltaArrow || deltaArrow === '→') return 'text-gray-500'
  if (deltaGoodWhen === 'neutral') return 'text-gray-500'
  const goingUp = deltaArrow === '↑'
  const good = (deltaGoodWhen === 'up' && goingUp) || (deltaGoodWhen === 'down' && !goingUp)
  return good ? 'text-emerald-700' : 'text-rose-700'
}

export default function PaymentTile({
  emoji, tone, label, value, pattern, decor,
  deltaLabel, deltaArrow, deltaGoodWhen = 'neutral',
  // Optional animated-number mode. When `numericValue` is supplied,
  // we tween it through CountUp (sync'd 350ms by default) and use
  // `value` as the format template (e.g. '$' prefix). If absent, we
  // fall back to rendering `value` verbatim like before — keeps the
  // simple consumer call sites working unchanged.
  numericValue, prefix = '', decimals,
}) {
  const t = TONE[tone] || TONE.red
  const d = decor || {}
  const animated = numericValue != null && Number.isFinite(Number(numericValue))
  return (
    <div className="payment-tile-card snap-start shrink-0 w-56 relative overflow-hidden flex items-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-3 hover:shadow-md transition-all">
      {/* Decorative pattern + emoji watermarks removed — plain, calm tiles. */}
      <div className={`tile-chip-host shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center relative z-10 shadow-md ${t.chip}`} style={{ color: t.stroke }}>
        <span className="tile-chip-icon text-2xl drop-shadow-sm">{emoji}</span>
      </div>
      <div className="min-w-0 flex-1 relative z-10">
        <p className="text-[11px] text-gray-500 font-medium leading-tight truncate">{label}</p>
        {animated ? (
          <CountUp
            value={Number(numericValue)}
            duration={350}
            prefix={prefix}
            decimals={decimals ?? (prefix === '$' ? 2 : 0)}
            as="p"
            className="text-lg font-black text-gray-900 leading-tight mt-0.5 truncate block"
          />
        ) : (
          <p className="text-lg font-black text-gray-900 tabular-nums leading-tight mt-0.5 truncate">{value}</p>
        )}
        {deltaLabel && deltaLabel !== '—' && (
          <p className={`text-[11px] font-semibold mt-0.5 ${deltaSubtextClass(deltaArrow, deltaGoodWhen)}`}>
            {deltaLabel} vs prior
          </p>
        )}
      </div>
    </div>
  )
}

// Eight tile configs. Decor positions tightened to keep the
// foreground (gradient chip + label + value + delta subtext) clear
// of the avocado / theme emoji / geometric pattern watermarks.
export const PAYMENT_TILE_CONFIGS = {
  transactions: {
    emoji: '🧾', tone: 'red', label: 'Transactions', pattern: 'dots',
    decor: {
      patternPos:  { bottom: '-6px', right: '-6px' },
      avocadoPos:  { top: '-4px', right: '4px', rotate: '-18deg', size: '32px', opacity: 0.22 },
      themeEmoji: '📝',
      themePos:    { bottom: '4px', left: '60px', rotate: '8deg', size: '20px', opacity: 0.28 },
    },
  },
  totalSpent: {
    emoji: '💸', tone: 'orange', label: 'Total Spent', pattern: 'wave',
    decor: {
      patternPos:  { bottom: '-6px', left: '-4px' },
      avocadoPos:  { top: '-4px', left: '64px', rotate: '14deg', size: '30px', opacity: 0.22 },
      themeEmoji: '💵',
      themePos:    { top: '2px', right: '4px', rotate: '-10deg', size: '22px', opacity: 0.28 },
    },
  },
  taxPaid: {
    emoji: '📈', tone: 'amber', label: 'Tax Paid', pattern: 'rings',
    decor: {
      patternPos:  { top: '-4px', right: '-4px' },
      avocadoPos:  { bottom: '-4px', left: '64px', rotate: '-12deg', size: '30px', opacity: 0.22 },
      themeEmoji: '🧮',
      themePos:    { top: '2px', right: '6px', rotate: '6deg', size: '20px', opacity: 0.28 },
    },
  },
  purchases: {
    emoji: '🛒', tone: 'yellow', label: 'Purchases', pattern: 'stripes',
    decor: {
      patternPos:  { bottom: '-4px', right: '-4px' },
      avocadoPos:  { top: '-4px', left: '58px', rotate: '20deg', size: '32px', opacity: 0.22 },
      themeEmoji: '🛍️',
      themePos:    { top: '2px', right: '4px', rotate: '-8deg', size: '20px', opacity: 0.28 },
    },
  },
  payments: {
    emoji: '💳', tone: 'lime', label: 'Payments', pattern: 'blob',
    decor: {
      patternPos:  { top: '-6px', right: '-6px' },
      avocadoPos:  { bottom: '-4px', right: '6px', rotate: '-15deg', size: '32px', opacity: 0.22 },
      themeEmoji: '💹',
      themePos:    { top: '2px', left: '66px', rotate: '10deg', size: '20px', opacity: 0.28 },
    },
  },
  interestPaid: {
    emoji: '📊', tone: 'emerald', label: 'Interest Paid', pattern: 'hex',
    decor: {
      patternPos:  { top: '-4px', left: '-4px' },
      avocadoPos:  { bottom: '-4px', right: '4px', rotate: '18deg', size: '30px', opacity: 0.22 },
      themeEmoji: '📉',
      themePos:    { top: '2px', right: '4px', rotate: '4deg', size: '20px', opacity: 0.28 },
    },
  },
  feesPaid: {
    emoji: '💰', tone: 'teal', label: 'Fees Paid', pattern: 'plus',
    decor: {
      patternPos:  { bottom: '-4px', right: '-4px' },
      avocadoPos:  { top: '-4px', left: '60px', rotate: '-6deg', size: '32px', opacity: 0.22 },
      themeEmoji: '🪙',
      themePos:    { top: '2px', right: '4px', rotate: '12deg', size: '20px', opacity: 0.28 },
    },
  },
  bankFees: {
    emoji: '🏦', tone: 'green', label: 'Bank Fees', pattern: 'zigzag',
    decor: {
      patternPos:  { top: '-4px', right: '-4px' },
      avocadoPos:  { bottom: '-4px', left: '66px', rotate: '-25deg', size: '32px', opacity: 0.22 },
      themeEmoji: '🏧',
      themePos:    { bottom: '2px', right: '4px', rotate: '8deg', size: '20px', opacity: 0.28 },
    },
  },
}

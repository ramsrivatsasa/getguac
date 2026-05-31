'use client'
// Compact stat tile with a layered decorative backdrop. Each tile
// composes THREE faint elements behind the content so the row reads
// as varied instead of eight near-identical pills:
//
//   1. A geometric SVG vector pattern (dots/wave/rings/stripes/
//      blob/hexes/plus/zigzag), tone-coloured.
//   2. A 🥑 avocado watermark — our brand mark, present on every
//      tile but placed at a different corner + rotation per tile.
//   3. A theme-relevant emoji (receipt/money/cart/card/etc.) at a
//      third position, reinforcing what each metric represents.
//
// All three sit at low opacity behind the content so they're
// decoration, never chrome.

import './emoji-floats.css'

// Brand-coherent palette: warm → cool spectrum that starts at red
// (per the user's "start with red" / "include red" direction) and
// resolves to green — the avocado / Guacamole brand colour. Eight
// stops, one per metric. No sky/violet/pink off-brand tones.
const TONE = {
  red:     { chip: 'bg-red-100 text-red-700',         stroke: '#ef4444' },
  orange:  { chip: 'bg-orange-100 text-orange-700',   stroke: '#f97316' },
  amber:   { chip: 'bg-amber-100 text-amber-700',     stroke: '#f59e0b' },
  yellow:  { chip: 'bg-yellow-100 text-yellow-700',   stroke: '#eab308' },
  lime:    { chip: 'bg-lime-100 text-lime-700',       stroke: '#84cc16' },
  emerald: { chip: 'bg-emerald-100 text-emerald-700', stroke: '#10b981' },
  teal:    { chip: 'bg-teal-100 text-teal-700',       stroke: '#14b8a6' },
  green:   { chip: 'bg-green-100 text-green-700',     stroke: '#22c55e' },
}

// Emoji watermark — used for both the 🥑 brand mark and the theme
// emoji. `pos.{top|bottom|left|right}` accept Tailwind-friendly CSS
// strings ('-4px', '8px', etc.); rotate is a deg string. size is the
// fontSize. opacity defaults to 0.18 for a subtle imprint.
function EmojiMark({ emoji, pos }) {
  if (!emoji || !pos) return null
  return (
    <span
      aria-hidden
      className="absolute select-none pointer-events-none leading-none"
      style={{
        top: pos.top,
        right: pos.right,
        bottom: pos.bottom,
        left: pos.left,
        transform: `rotate(${pos.rotate || '0deg'})`,
        fontSize: pos.size || '28px',
        opacity: pos.opacity ?? 0.18,
      }}
    >
      {emoji}
    </span>
  )
}

// Geometric SVG backdrops — kept tiny, positioned via `pos`
// (top/bottom/left/right). Color comes from currentColor so each
// tile inherits the tone stroke.
function VectorPattern({ pattern, stroke, pos }) {
  if (!pattern || !pos) return null
  const common = {
    style: {
      color: stroke,
      top: pos.top,
      right: pos.right,
      bottom: pos.bottom,
      left: pos.left,
      transform: pos.rotate ? `rotate(${pos.rotate})` : undefined,
    },
    className: 'absolute opacity-25 pointer-events-none',
  }
  switch (pattern) {
    case 'dots':
      return (
        <svg {...common} width="56" height="56" viewBox="0 0 56 56" fill="currentColor">
          {[...Array(16)].map((_, i) => (
            <circle key={i} cx={(i % 4) * 14 + 6} cy={Math.floor(i / 4) * 14 + 6} r="2" />
          ))}
        </svg>
      )
    case 'wave':
      return (
        <svg {...common} width="72" height="40" viewBox="0 0 72 40" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M0 10 Q 9 2, 18 10 T 36 10 T 54 10 T 72 10" />
          <path d="M0 22 Q 9 14, 18 22 T 36 22 T 54 22 T 72 22" />
          <path d="M0 34 Q 9 26, 18 34 T 36 34 T 54 34 T 72 34" />
        </svg>
      )
    case 'rings':
      return (
        <svg {...common} width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="44" cy="44" r="7" />
          <circle cx="44" cy="44" r="16" />
          <circle cx="44" cy="44" r="25" />
        </svg>
      )
    case 'stripes':
      return (
        <svg {...common} width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
          {[...Array(6)].map((_, i) => (
            <line key={i} x1={i * 12} y1="64" x2={64 + i * 12} y2="0" />
          ))}
        </svg>
      )
    case 'blob':
      return (
        <svg {...common} width="72" height="72" viewBox="0 0 80 80" fill="currentColor">
          <path d="M62 14c12 8 16 26 8 38s-26 18-40 12S6 42 12 28 50 6 62 14z" />
        </svg>
      )
    case 'hex':
      return (
        <svg {...common} width="64" height="56" viewBox="0 0 72 64" fill="none" stroke="currentColor" strokeWidth="2">
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
        <svg {...common} width="60" height="60" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
        <svg {...common} width="72" height="48" viewBox="0 0 72 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          <polyline points="0,8 9,2 18,8 27,2 36,8 45,2 54,8 63,2 72,8" />
          <polyline points="0,24 9,18 18,24 27,18 36,24 45,18 54,24 63,18 72,24" />
          <polyline points="0,40 9,34 18,40 27,34 36,40 45,34 54,40 63,34 72,40" />
        </svg>
      )
    default:
      return null
  }
}

function deltaChipClass(deltaArrow, deltaGoodWhen) {
  if (!deltaArrow || deltaArrow === '→') return 'bg-gray-100 text-gray-500'
  if (deltaGoodWhen === 'neutral') return 'bg-gray-100 text-gray-600'
  const goingUp = deltaArrow === '↑'
  const good = (deltaGoodWhen === 'up' && goingUp) || (deltaGoodWhen === 'down' && !goingUp)
  return good ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
}

export default function PaymentTile({
  emoji, tone, label, value, pattern, decor,
  deltaLabel, deltaArrow, deltaGoodWhen = 'neutral',
}) {
  const t = TONE[tone] || TONE.sky
  const d = decor || {}
  return (
    <div className="group snap-start shrink-0 w-40 relative overflow-hidden flex items-center gap-2.5 bg-white rounded-xl border border-gray-200 shadow-sm p-2.5 hover:shadow-md transition-all">
      <VectorPattern pattern={pattern} stroke={t.stroke} pos={d.patternPos} />
      <EmojiMark emoji="🥑" pos={d.avocadoPos} />
      <EmojiMark emoji={d.themeEmoji} pos={d.themePos} />
      <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center relative z-10 ${t.chip}`}>
        <span className="tile-chip-icon text-xl">{emoji}</span>
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

// Eight tile configs. Each carries:
//   - emoji        — primary glyph (rendered in the colored chip)
//   - tone         — pastel-palette key
//   - label        — caption above the value
//   - pattern      — geometric SVG backdrop key
//   - decor        — { patternPos, avocadoPos, themeEmoji, themePos }
//
// Positions are bespoke per-tile so no two tiles have the avocado /
// theme mark in the same place — the row feels designed, not
// templated.
export const PAYMENT_TILE_CONFIGS = {
  transactions: {
    emoji: '🧾', tone: 'red', label: 'Transactions', pattern: 'dots',
    decor: {
      patternPos:  { bottom: '-4px', right: '-4px' },
      avocadoPos:  { top: '-6px', right: '-2px', rotate: '-18deg', size: '34px', opacity: 0.16 },
      themeEmoji: '📝',
      themePos:    { bottom: '2px', left: '46px', rotate: '8deg', size: '18px', opacity: 0.22 },
    },
  },
  totalSpent: {
    emoji: '💸', tone: 'orange', label: 'Total Spent', pattern: 'wave',
    decor: {
      patternPos:  { bottom: '-4px', left: '-4px' },
      avocadoPos:  { top: '-8px', left: '46px', rotate: '14deg', size: '32px', opacity: 0.15 },
      themeEmoji: '💵',
      themePos:    { bottom: '-2px', right: '2px', rotate: '-10deg', size: '22px', opacity: 0.22 },
    },
  },
  taxPaid: {
    emoji: '📈', tone: 'amber', label: 'Tax Paid', pattern: 'rings',
    decor: {
      patternPos:  { top: '-6px', right: '-6px' },
      avocadoPos:  { bottom: '-6px', left: '40px', rotate: '-12deg', size: '30px', opacity: 0.16 },
      themeEmoji: '🧮',
      themePos:    { top: '4px', right: '6px', rotate: '6deg', size: '18px', opacity: 0.22 },
    },
  },
  purchases: {
    emoji: '🛒', tone: 'yellow', label: 'Purchases', pattern: 'stripes',
    decor: {
      patternPos:  { bottom: '-4px', right: '-4px' },
      avocadoPos:  { top: '-6px', left: '36px', rotate: '20deg', size: '32px', opacity: 0.15 },
      themeEmoji: '🛍️',
      themePos:    { top: '2px', right: '4px', rotate: '-8deg', size: '20px', opacity: 0.22 },
    },
  },
  payments: {
    emoji: '💳', tone: 'lime', label: 'Payments', pattern: 'blob',
    decor: {
      patternPos:  { top: '-10px', right: '-12px' },
      avocadoPos:  { bottom: '-6px', right: '4px', rotate: '-15deg', size: '34px', opacity: 0.16 },
      themeEmoji: '💹',
      themePos:    { top: '4px', left: '50px', rotate: '10deg', size: '18px', opacity: 0.22 },
    },
  },
  interestPaid: {
    emoji: '📊', tone: 'emerald', label: 'Interest Paid', pattern: 'hex',
    decor: {
      patternPos:  { top: '-4px', left: '-4px' },
      avocadoPos:  { bottom: '-4px', right: '-2px', rotate: '18deg', size: '32px', opacity: 0.16 },
      themeEmoji: '📉',
      themePos:    { top: '4px', right: '4px', rotate: '4deg', size: '18px', opacity: 0.22 },
    },
  },
  feesPaid: {
    emoji: '💰', tone: 'teal', label: 'Fees Paid', pattern: 'plus',
    decor: {
      patternPos:  { bottom: '-4px', right: '-4px' },
      avocadoPos:  { top: '-6px', left: '38px', rotate: '-6deg', size: '32px', opacity: 0.15 },
      themeEmoji: '🪙',
      themePos:    { top: '2px', right: '4px', rotate: '12deg', size: '20px', opacity: 0.22 },
    },
  },
  bankFees: {
    emoji: '🏦', tone: 'green', label: 'Bank Fees', pattern: 'zigzag',
    decor: {
      patternPos:  { top: '-4px', right: '-4px' },
      avocadoPos:  { bottom: '-6px', left: '44px', rotate: '-25deg', size: '34px', opacity: 0.15 },
      themeEmoji: '🏧',
      themePos:    { bottom: '-2px', right: '4px', rotate: '8deg', size: '20px', opacity: 0.22 },
    },
  },
}

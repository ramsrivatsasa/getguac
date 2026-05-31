'use client'
// Vibrant-gradient stat tile. Used by the dashboard's Payments Made
// row (and the preview at /preview/dashboard). Same shape as the
// reference screenshot:
//   width  240px (w-60)
//   height 176px (h-44)
//   body   full-bleed multi-stop gradient
//   label  text-sm extrabold uppercase, drop-shadowed white
//   value  text-4xl black tabular-nums, drop-shadowed white
//   emoji  text-7xl floating bottom-right
//   halo   blurred color blob behind the emoji
//   logo   optional avocado watermark, position + rotation per tile

import './emoji-floats.css'

export default function PaymentTile({ emoji, gradient, haloColor, label, value, logoPos }) {
  return (
    <div
      className="snap-start shrink-0 w-60 h-24 relative overflow-hidden rounded-2xl border-2 border-white shadow-lg p-4 hover:shadow-xl hover:-translate-y-1 hover:rotate-[0.5deg] transition-all text-white"
      style={{ background: gradient }}
    >
      {/* Watermark logo — sits behind everything (z-0) at low opacity.
          logoPos.{top|bottom|left|right|rotate|size} drives placement. */}
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

// Standard 4-tile gradient + halo + logoPos config. Used by the
// dashboard's Payments Made row and the preview page. Keep these in
// sync so refining one updates both.
export const PAYMENT_TILE_CONFIGS = {
  transactions: {
    emoji: '🧾',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #4f46e5 100%)',
    haloColor: '#7dd3fc',
    label: 'Transactions',
    logoPos: { top: '-12px', left: '-10px', rotate: '-18deg', size: '110px' },
  },
  totalSpent: {
    emoji: '💸',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 50%, #ec4899 100%)',
    haloColor: '#fdba74',
    label: 'Total Spent',
    logoPos: { top: '40px', right: '-22px', rotate: '24deg', size: '100px' },
  },
  taxPaid: {
    emoji: '📈',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
    haloColor: '#fde68a',
    label: 'Tax Paid',
    logoPos: { bottom: '-18px', left: '60px', rotate: '12deg', size: '120px' },
  },
  bankFees: {
    emoji: '🏦',
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #be185d 50%, #9d174d 100%)',
    haloColor: '#fda4af',
    label: 'Bank Fees',
    logoPos: { top: '-8px', right: '70px', rotate: '-32deg', size: '95px' },
  },
}

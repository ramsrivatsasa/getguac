'use client'
// Page-themed header banners for the feature pages (Reports, Guacanomics,
// Steals, GuacWizard). These use the REAL locked brand mascot (GuacMascot)
// as-is — NO redraw — with a per-page prop layered on top in the mascot's
// own coordinate space (viewBox 0 0 220 290) so the hat / cap / glasses line
// up with the avocado's head and eyes. Steals uses the existing on-brand
// `rich` pose (shades + cash). The favicon / 🥑 emoji stay untouched.
//
// One banner renders identically on the website and inside the mobile
// WebView, so embedded pages no longer show an orphaned, oversized mascot
// with the title hidden underneath.
import GuacMascot from './GuacMascot'

// Base mascot pose per page (props are layered on top in PROP_OVERLAY).
const THEME_EXPR = {
  wizard:  'happy',
  econ:    'happy',
  reports: 'happy',
  steals:  'rich',
}

// A 5-point star, translated + scaled, for the sorcerer hat.
const Star = ({ x, y, s = 1, fill = '#fde047' }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 -5 L1.12 -1.55 4.76 -1.55 1.82 0.59 2.94 4.05 0 1.9 -2.94 4.05 -1.82 0.59 -4.76 -1.55 -1.12 -1.55 Z"
    fill={fill}
  />
)

// Props drawn in the mascot's viewBox (0 0 220 290): head-top ≈ y40–52,
// eyes ≈ (96,96)/(124,96). null = no overlay (the pose already fits).
const PROP_OVERLAY = {
  // Blue sorcerer: starry hat + crescent moon, popped cape collar, star wand.
  // (The cape itself is drawn BEHIND the mascot — see BEHIND_OVERLAY.)
  wizard: (
    <>
      {/* cape collar */}
      <path d="M86 90 C 74 96, 68 112, 72 126 L98 118 C 92 104, 90 96, 88 90 Z" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="2" />
      <path d="M134 90 C 146 96, 152 112, 148 126 L122 118 C 128 104, 130 96, 132 90 Z" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="2" />
      {/* hat */}
      <ellipse cx="110" cy="56" rx="54" ry="11" fill="#1e3a8a" />
      <ellipse cx="110" cy="53" rx="54" ry="9" fill="#1e40af" />
      <path d="M74 55 C 80 26, 94 6, 114 3 C 132 0, 150 5, 158 16 C 167 27, 160 35, 151 34 C 144 33, 141 27, 141 22 C 140 38, 142 49, 147 55 Z" fill="#1d4ed8" />
      <path d="M76 54 C 82 27, 95 9, 113 5 C 100 14, 90 30, 84 46 C 81 50, 78 53, 76 54 Z" fill="#3b82f6" opacity="0.5" />
      <path d="M128 14 a8 8 0 1 0 1 15 a6 6 0 1 1 -1 -15 Z" fill="#fde68a" />
      <Star x={99} y={40} s={1.1} fill="#ffffff" />
      <Star x={116} y={24} s={0.9} fill="#ffffff" />
      <Star x={108} y={46} s={0.7} fill="#ffffff" />
      {/* wand */}
      <line x1="150" y1="176" x2="206" y2="120" stroke="#6b4226" strokeWidth="7" strokeLinecap="round" />
      <Star x={210} y={114} s={1.5} fill="#fde047" />
      <line x1="198" y1="104" x2="194" y2="98" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
      <line x1="222" y1="112" x2="228" y2="110" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  econ: (
    <>
      <polygon points="110,12 186,40 110,68 34,40" fill="#0f172a" />
      <polygon points="110,12 186,40 110,60 34,40" fill="#1f2937" />
      <path d="M72 48 Q 110 64 148 48 L148 66 Q 110 80 72 66 Z" fill="#111827" />
      <circle cx="110" cy="40" r="4.2" fill="#facc15" />
      <line x1="110" y1="40" x2="172" y2="40" stroke="#facc15" strokeWidth="3" />
      <line x1="172" y1="40" x2="172" y2="68" stroke="#facc15" strokeWidth="3" />
      <circle cx="172" cy="72" r="5.2" fill="#f59e0b" />
    </>
  ),
  reports: (
    <>
      <circle cx="96" cy="96" r="14" fill="rgba(255,255,255,0.10)" stroke="#1f2937" strokeWidth="4" />
      <circle cx="124" cy="96" r="14" fill="rgba(255,255,255,0.10)" stroke="#1f2937" strokeWidth="4" />
      <path d="M111 93 Q 110 90 109 93" stroke="#1f2937" strokeWidth="3.5" fill="none" />
      <line x1="82" y1="92" x2="66" y2="85" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
      <line x1="138" y1="92" x2="154" y2="85" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  steals: null,
}

// Layers drawn BEHIND the mascot (e.g. a cape draping out past the body).
const BEHIND_OVERLAY = {
  wizard: (
    <>
      <path d="M110 92 C 82 92, 64 98, 50 112 C 28 134, 18 192, 26 236 C 28 246, 40 248, 50 242 C 62 250, 78 252, 92 246 C 100 243, 105 240, 110 240 C 115 240, 120 243, 128 246 C 142 252, 158 250, 170 242 C 180 248, 192 246, 194 236 C 202 192, 192 134, 170 112 C 156 98, 138 92, 110 92 Z" fill="#1d4ed8" />
      <path d="M110 92 C 82 92, 64 98, 50 112 C 36 126, 28 156, 26 192 C 40 188, 52 150, 64 126 C 76 104, 96 96, 110 94 Z" fill="#3b82f6" opacity="0.45" />
    </>
  ),
}

export function ThemedAvocado({ theme = 'reports', size = 64, className = '' }) {
  const expr = THEME_EXPR[theme] || 'happy'
  const h = size * (290 / 220)
  return (
    <div className={`relative ${className}`} style={{ width: size, height: h }}>
      {BEHIND_OVERLAY[theme] && (
        <svg viewBox="0 0 220 290" width={size} height={h} className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
          {BEHIND_OVERLAY[theme]}
        </svg>
      )}
      <GuacMascot expression={expr} size={size} className="relative z-10" />
      {PROP_OVERLAY[theme] && (
        <svg viewBox="0 0 220 290" width={size} height={h} className="absolute inset-0 z-20 pointer-events-none" aria-hidden="true">
          {PROP_OVERLAY[theme]}
        </svg>
      )}
    </div>
  )
}

// Plain header (no background): themed mascot + dark title + subtitle, with
// optional controls pushed to the right. Sits on the page's own background.
export default function FeatureHeader({ theme = 'reports', title, subtitle, badge, action }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
      <ThemedAvocado theme={theme} size={60} className="shrink-0" />
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-none tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-1.5">{subtitle}</p>}
      </div>
      {badge && (
        <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full shrink-0">
          {badge}
        </span>
      )}
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  )
}

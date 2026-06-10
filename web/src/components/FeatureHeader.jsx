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
  // Floppy-tip purple wizard hat with a red band + gold buckle (+ a wand).
  wizard: (
    <>
      <line x1="150" y1="176" x2="206" y2="120" stroke="#3f2d0b" strokeWidth="7" strokeLinecap="round" />
      <Star x={210} y={114} s={1.4} fill="#fde047" />
      <ellipse cx="110" cy="57" rx="60" ry="13" fill="#7e22ce" />
      <ellipse cx="110" cy="54" rx="60" ry="11" fill="#9333ea" />
      <path d="M68 56 C 72 30, 90 16, 116 14 C 140 12, 156 14, 168 22 C 178 29, 174 38, 163 39 C 155 40, 149 35, 147 29 C 146 41, 146 50, 150 56 Z" fill="#a21caf" />
      <path d="M70 55 C 74 31, 90 18, 114 15 C 100 22, 88 34, 82 47 C 79 51, 75 54, 72 55 Z" fill="#c026d3" opacity="0.55" />
      <path d="M72 45 Q 110 53 148 45 L148 53 Q 110 61 72 53 Z" fill="#dc2626" />
      <rect x="103" y="44" width="15" height="12" rx="2.5" fill="#facc15" stroke="#a16207" strokeWidth="1.5" />
      <rect x="107" y="47" width="7" height="6" rx="1" fill="#dc2626" stroke="#a16207" strokeWidth="1" />
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

export function ThemedAvocado({ theme = 'reports', size = 64, className = '' }) {
  const expr = THEME_EXPR[theme] || 'happy'
  const h = size * (290 / 220)
  return (
    <div className={`relative ${className}`} style={{ width: size, height: h }}>
      <GuacMascot expression={expr} size={size} />
      {PROP_OVERLAY[theme] && (
        <svg viewBox="0 0 220 290" width={size} height={h} className="absolute inset-0 pointer-events-none" aria-hidden="true">
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

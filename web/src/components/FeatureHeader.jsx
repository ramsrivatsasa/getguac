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

// Props drawn in the mascot's viewBox (0 0 220 290): head-top ≈ y40–52,
// eyes ≈ (96,96)/(124,96). null = no overlay (the pose already fits).
const PROP_OVERLAY = {
  wizard: (
    <>
      <line x1="150" y1="176" x2="206" y2="120" stroke="#3f2d0b" strokeWidth="7" strokeLinecap="round" />
      <path d="M208 110 l3.5 8.6 9.3 .8 -7 6.2 2 9 -8-4.7 -8 4.7 2-9 -7-6.2 9.3-.8 Z" fill="#fde047" stroke="#eab308" strokeWidth="1.5" />
      <ellipse cx="110" cy="53" rx="57" ry="13" fill="#4c1d95" />
      <path d="M55 53 Q 100 2 132 9 Q 146 12 165 53 Z" fill="#6d28d9" />
      <path d="M55 53 Q 100 2 132 9 Q 146 12 165 53 Z" fill="#7c3aed" opacity="0.5" />
      <rect x="60" y="45" width="100" height="11" rx="5" fill="#4c1d95" />
      <path d="M118 24 l2.7 5.8 6.4 .5 -4.8 4.2 1.4 6.2 -5.7-3.3 -5.7 3.3 1.4-6.2 -4.8-4.2 6.4-.5 Z" fill="#fde047" />
      <circle cx="90" cy="32" r="2.3" fill="#fff" />
      <circle cx="142" cy="18" r="2.3" fill="#fde047" />
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

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
const Star = ({ x, y, s = 1, fill = '#fde047', stroke, strokeWidth }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 -5 L1.12 -1.55 4.76 -1.55 1.82 0.59 2.94 4.05 0 1.9 -2.94 4.05 -1.82 0.59 -4.76 -1.55 -1.12 -1.55 Z"
    fill={fill}
    stroke={stroke}
    strokeWidth={strokeWidth}
  />
)

// Props drawn in the mascot's viewBox (0 0 220 290): head-top ≈ y40–52,
// eyes ≈ (96,96)/(124,96). null = no overlay (the pose already fits).
const PROP_OVERLAY = {
  wizard: null, // wizard has its own composition (small mascot + big hat) — see WizardAvocado
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
const BEHIND_OVERLAY = {}

// The wizard hat alone (in the mascot's 0 0 220 290 coords), drawn into a
// cropped svg so it can be sized big over a small mascot.
const WIZARD_HAT = (
  <>
    <ellipse cx="110" cy="57" rx="60" ry="12" fill="#581c87" />
    <ellipse cx="110" cy="54" rx="60" ry="10" fill="#7e22ce" />
    <path d="M74 55 C 80 26, 94 6, 114 3 C 132 0, 150 5, 158 16 C 167 27, 160 35, 151 34 C 144 33, 141 27, 141 22 C 140 38, 142 49, 147 55 Z" fill="#7c3aed" />
    <path d="M76 54 C 82 27, 95 9, 113 5 C 100 14, 90 30, 84 46 C 81 50, 78 53, 76 54 Z" fill="#a855f7" opacity="0.45" />
    <Star x={95} y={37} s={1.4} fill="#f59e0b" stroke="#b45309" strokeWidth={0.8} />
    <Star x={118} y={20} s={1.1} fill="#f59e0b" stroke="#b45309" strokeWidth={0.8} />
    <Star x={135} y={30} s={0.95} fill="#f59e0b" stroke="#b45309" strokeWidth={0.8} />
    <Star x={108} y={11} s={0.85} fill="#f59e0b" stroke="#b45309" strokeWidth={0.8} />
    <Star x={123} y={44} s={0.75} fill="#f59e0b" stroke="#b45309" strokeWidth={0.8} />
    <path d="M74 46 Q 110 53 146 46 L146 54 Q 110 61 74 54 Z" fill="#92400e" />
    <path d="M74 46 Q 110 53 146 46" stroke="#b45309" strokeWidth="1.4" fill="none" />
    <ellipse cx="110" cy="50" rx="11" ry="9" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />
    <ellipse cx="110" cy="50" rx="6.5" ry="7" fill="#2563eb" stroke="#1e40af" strokeWidth="1" />
    <ellipse cx="107.5" cy="47" rx="2" ry="2.5" fill="#bfdbfe" opacity="0.85" />
  </>
)

// Wizard = small mascot at the bottom with a BIG hat overlaid on top, so the
// hat reads large without shrinking the brand mascot's proportions. `size`
// is the overall width budget. Ratios are tuned so the brim rests on the
// head just above the eyes.
function WizardAvocado({ size, className = '' }) {
  const avoW = size * (150 / 220)
  const hatW = size * (188 / 220)
  const hatH = hatW * (74 / 132)
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size * (262 / 220) }}>
      <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: size * (6 / 220) }}>
        <GuacMascot expression="happy" size={avoW} />
      </div>
      <svg viewBox="44 -2 132 74" width={hatW} height={hatH} aria-hidden="true"
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{ top: size * (12 / 220) }}>
        {WIZARD_HAT}
      </svg>
    </div>
  )
}

export function ThemedAvocado({ theme = 'reports', size = 64, className = '' }) {
  if (theme === 'wizard') return <WizardAvocado size={size} className={className} />
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

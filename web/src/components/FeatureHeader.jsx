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

// The wizard hat (in the mascot's 0 0 220 290 coords). Split into brim + cone
// so they can be slimmed independently: the cone is narrowed more than the
// (wide) brim for a classic witch-hat silhouette.
const WIZARD_HAT_BRIM = (
  <>
    <ellipse cx="110" cy="57" rx="49" ry="11" fill="#581c87" />
    <ellipse cx="110" cy="54" rx="49" ry="9" fill="#7e22ce" />
  </>
)
const WIZARD_HAT_CONE = (
  <>
    <path d="M74 55 C 76 22, 86 -6, 106 -16 C 120 -24, 138 -20, 146 -6 C 156 8, 154 22, 144 24 C 137 25, 133 19, 134 12 C 132 30, 136 46, 144 55 Z" fill="#7c3aed" />
    <path d="M76 54 C 78 24, 88 -2, 106 -12 C 94 -2, 86 18, 82 44 C 80 49, 77 53, 76 54 Z" fill="#a855f7" opacity="0.45" />
    <Star x={97} y={28} s={1.4} fill="#f59e0b" stroke="#b45309" strokeWidth={0.8} />
    <Star x={116} y={4} s={1.1} fill="#f59e0b" stroke="#b45309" strokeWidth={0.8} />
    <Star x={132} y={18} s={0.95} fill="#f59e0b" stroke="#b45309" strokeWidth={0.8} />
    <Star x={106} y={-10} s={0.85} fill="#f59e0b" stroke="#b45309" strokeWidth={0.8} />
    <Star x={122} y={40} s={0.75} fill="#f59e0b" stroke="#b45309" strokeWidth={0.8} />
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
// A green arm + hand gripping a white-tipped wand, with sparkles at the tip.
// Drawn in the mascot's 0 0 220 290 frame (overflow visible so the wand + stars
// can reach past the body) so it reads as the avocado holding the wand.
// A white cartoon glove (no arm) on the LEFT holding the white-tipped wand,
// with sparkles at the tip — drawn in the mascot's 0 0 220 290 frame.
const HAND_WAND = (
  <>
    {/* wand emerging from the top of the fist, up-left */}
    <line x1="38" y1="122" x2="11" y2="83" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
    <line x1="22" y1="100" x2="9" y2="81" stroke="#9aa4b2" strokeWidth="8" strokeLinecap="round" />
    <line x1="23" y1="99" x2="10" y2="82" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
    {/* clean white glove fist */}
    <path d="M30 116 Q 22 124 26 134 Q 32 143 45 142 Q 56 140 57 129 Q 57 119 49 114 Q 39 110 30 116 Z" fill="#f8fafc" stroke="#6b7280" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M48 113 Q 58 112 59 121 Q 59 130 50 130 Q 45 126 46 119 Q 47 115 48 113 Z" fill="#fff" stroke="#6b7280" strokeWidth="1.5" />
    <g stroke="#9ca3af" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeOpacity="0.9">
      <path d="M33 122 q 8 -3 16 0" />
      <path d="M32 129 q 8 -3 15 0" />
    </g>
    {/* sparkles at the tip */}
    <Star x={4} y={73} s={1.6} fill="#fde047" stroke="#eab308" strokeWidth={0.8} />
    <Star x={19} y={65} s={1.0} fill="#fde047" stroke="#eab308" strokeWidth={0.8} />
    <Star x={0} y={91} s={0.9} fill="#fde047" stroke="#eab308" strokeWidth={0.8} />
  </>
)

function WizardAvocado({ size, className = '' }) {
  const avoW = size * (150 / 220)
  const avoH = avoW * (290 / 220)
  const hatW = size * (188 / 220)
  const hatH = hatW * (100 / 132)
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size * (290 / 220) }}>
      <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: size * (6 / 220) }}>
        <div className="relative" style={{ width: avoW, height: avoH }}>
          <GuacMascot expression="happy" size={avoW} />
          <svg viewBox="0 0 220 290" width={avoW} height={avoH} aria-hidden="true"
            className="absolute inset-0 pointer-events-none overflow-visible">
            {HAND_WAND}
          </svg>
        </div>
      </div>
      <svg viewBox="44 -28 132 100" width={hatW} height={hatH} aria-hidden="true"
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{ top: size * (10 / 220) }}>
        {/* brim stays wide; the cone is slimmed more → witch-hat silhouette */}
        <g transform="matrix(0.9 0 0 1 11 0)">{WIZARD_HAT_BRIM}</g>
        <g transform="matrix(0.66 0 0 1 37.4 0)">{WIZARD_HAT_CONE}</g>
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

const THEMED = new Set(['wizard', 'econ', 'reports', 'steals'])

// The standard page header (no background): a mascot + dark title + subtitle,
// with optional controls pushed to the right. Pass `theme` for a page-themed
// avocado (econ/reports/steals), or `expression` for a plain brand mascot
// (any GuacMascot pose) on every other page.
export default function FeatureHeader({ theme, expression = 'happy', title, subtitle, badge, action }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
      {THEMED.has(theme)
        ? <ThemedAvocado theme={theme} size={theme === 'wizard' ? 92 : 60} className="shrink-0" />
        : <GuacMascot expression={expression} size={60} className="shrink-0" />}
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

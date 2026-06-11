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
import LottieAnimation from './LottieAnimation'
import halloweenHat from '../lottie/halloween-hat.json'

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

// Wizard = small mascot at the bottom with a BIG hat overlaid on top, so the
// hat reads large without shrinking the brand mascot's proportions. `size`
// is the overall width budget. Ratios are tuned so the brim rests on the
// head just above the eyes.
// A green arm + hand gripping a white-tipped wand, with sparkles at the tip.
// Drawn in the mascot's 0 0 220 290 frame (overflow visible so the wand + stars
// can reach past the body) so it reads as the avocado holding the wand.
// A yellow emoji fist (DETACHED from the body — floats to the right with a
// gap) holding a long white-tipped wand with sparkles. Drawn in the mascot's
// 0 0 220 290 frame; the overlay svg is overflow-visible so it can sit to the
// right of the avocado.
// A bigger magic wand (no hand) floating to the right of the avocado: black
// shaft + a big gold star topper + sparkles. Drawn in the mascot's 0 0 220 290
// frame, overflow-visible, so it reaches past the body and clears the hat.
const WAND = (
  <>
    <line x1="180" y1="195" x2="262" y2="118" stroke="#1f2937" strokeWidth="7" strokeLinecap="round" />
    <Star x={269} y={110} s={3.4} fill="#fde047" stroke="#eab308" strokeWidth={1} />
    <Star x={289} y={103} s={1.1} fill="#fde047" stroke="#eab308" strokeWidth={0.7} />
    <Star x={253} y={95} s={0.95} fill="#fde047" stroke="#eab308" strokeWidth={0.7} />
    <Star x={285} y={128} s={0.8} fill="#fde047" stroke="#eab308" strokeWidth={0.7} />
  </>
)

// Wizard = a small brand mascot at the bottom with the ANIMATED Lottie witch
// hat seated on its head, plus a big floating wand. `size` ≈ the overall width
// budget; ratios tuned in web/src/lottie/_compose.html against the real hat.
function WizardAvocado({ size, className = '' }) {
  const avoW = size * (150 / 220)
  const avoH = avoW * (290 / 220)
  const L = avoW * 2.04        // animated hat box (square)
  const H = avoW * 2.68        // container: hat tip → avocado bottom
  return (
    <div className={`relative ${className}`} style={{ width: L, height: H }}>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <div className="relative" style={{ width: avoW, height: avoH }}>
          <GuacMascot expression="happy" size={avoW} />
          <svg viewBox="0 0 220 290" width={avoW} height={avoH} aria-hidden="true"
            className="absolute inset-0 pointer-events-none overflow-visible">
            {WAND}
          </svg>
        </div>
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: L, height: L }}>
        <LottieAnimation data={halloweenHat} size={L} loop label="wizard hat" />
      </div>
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
        ? <ThemedAvocado theme={theme} size={theme === 'wizard' ? 72 : 60} className="shrink-0" />
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

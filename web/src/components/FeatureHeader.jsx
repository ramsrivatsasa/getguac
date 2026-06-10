// Page-themed avocado header banners for the feature pages (Reports,
// Guacanomics, Steals, GuacWizard). This is FRESH, page-specific art — it
// deliberately does NOT use the locked brand mascot (GuacMascot.jsx), the
// locked favicon, or the locked 🥑 emoji. Each page gets its own avocado
// wearing a themed prop (wizard hat, grad cap, analyst glasses, deal mask).
//
// One banner renders identically on the website and inside the mobile
// WebView, so embedded pages no longer show an orphaned, oversized mascot
// with the title hidden underneath it.

const THEMES = {
  wizard:  { grad: 'from-[#a78bfa] to-[#6d28d9]' },
  econ:    { grad: 'from-[#34d399] to-[#15803d]' },
  reports: { grad: 'from-[#60a5fa] to-[#1d4ed8]' },
  steals:  { grad: 'from-[#f472b6] to-[#db2777]' },
}

function AvoBody() {
  return (
    <g>
      <path d="M50 8 C 71 8, 82 32, 82 62 C 82 96, 68 113, 50 113 C 32 113, 18 96, 18 62 C 18 32, 29 8, 50 8 Z" fill="#4d7c0f" />
      <path d="M50 18 C 66 18, 74 38, 74 62 C 74 91, 63 104, 50 104 C 37 104, 26 91, 26 62 C 26 38, 34 18, 50 18 Z" fill="#dcfce7" />
      <path d="M50 18 C 66 18, 74 38, 74 62 C 74 91, 63 104, 50 104 C 37 104, 26 91, 26 62 C 26 38, 34 18, 50 18 Z" fill="#bbf7d0" opacity="0.55" />
      <circle cx="50" cy="82" r="13" fill="#b45309" />
      <ellipse cx="46" cy="78" rx="5" ry="6" fill="#f59e0b" opacity="0.5" />
      <circle cx="40" cy="52" r="6.5" fill="#fff" />
      <circle cx="60" cy="52" r="6.5" fill="#fff" />
      <circle cx="41.5" cy="53" r="3.2" fill="#1f2937" />
      <circle cx="61.5" cy="53" r="3.2" fill="#1f2937" />
      <path d="M41 64 Q 50 71 59 64" stroke="#3f3f46" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="33" cy="62" r="3.5" fill="#fb7185" opacity="0.55" />
      <circle cx="67" cy="62" r="3.5" fill="#fb7185" opacity="0.55" />
    </g>
  )
}

const PROPS = {
  wizard: (
    <>
      <line x1="74" y1="74" x2="100" y2="44" stroke="#3f2d0b" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M102 40 l2.6 5.6 6.1 .6 -4.6 4.1 1.3 6 -5.4-3.1 -5.4 3.1 1.3-6 -4.6-4.1 6.1-.6 Z" fill="#fde047" stroke="#eab308" strokeWidth="1" />
      <ellipse cx="50" cy="8" rx="33" ry="8" fill="#4c1d95" />
      <path d="M24 8 Q 46 -44 60 -42 Q 70 -41 76 8 Z" fill="#6d28d9" />
      <path d="M24 8 Q 46 -44 60 -42 Q 70 -41 76 8 Z" fill="#7c3aed" opacity="0.5" />
      <rect x="26" y="2" width="48" height="7" rx="3" fill="#4c1d95" />
      <path d="M52 -18 l1.8 4 4.4 .4 -3.3 3 .9 4.3 -3.8-2.2 -3.8 2.2 .9-4.3 -3.3-3 4.4-.4 Z" fill="#fde047" />
      <circle cx="40" cy="-8" r="1.6" fill="#fff" />
      <circle cx="66" cy="-20" r="1.6" fill="#fff" />
      <circle cx="34" cy="-26" r="1.3" fill="#fde047" />
    </>
  ),
  econ: (
    <>
      <g transform="translate(70,60)">
        <rect x="0" y="0" width="30" height="26" rx="5" fill="#fff" />
        <polyline points="4,20 11,13 16,17 26,5" fill="none" stroke="#15803d" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M26 5 l-5 .3 .3 4.6 Z" fill="#15803d" />
      </g>
      <polygon points="50,-22 84,-4 50,14 16,-4" fill="#111827" />
      <polygon points="50,-22 84,-4 50,8 16,-4" fill="#1f2937" />
      <path d="M30 4 Q 50 14 70 4 L70 16 Q 50 24 30 16 Z" fill="#0f172a" />
      <circle cx="50" cy="-4" r="3" fill="#facc15" />
      <line x1="50" y1="-4" x2="80" y2="-4" stroke="#facc15" strokeWidth="2" />
      <line x1="80" y1="-4" x2="80" y2="14" stroke="#facc15" strokeWidth="2" />
      <circle cx="80" cy="17" r="3.4" fill="#f59e0b" />
    </>
  ),
  reports: (
    <>
      <circle cx="40" cy="52" r="11" fill="rgba(255,255,255,0.18)" stroke="#1f2937" strokeWidth="3" />
      <circle cx="60" cy="52" r="11" fill="rgba(255,255,255,0.18)" stroke="#1f2937" strokeWidth="3" />
      <line x1="51" y1="52" x2="49" y2="52" stroke="#1f2937" strokeWidth="3" />
      <line x1="29" y1="50" x2="22" y2="46" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
      <line x1="71" y1="50" x2="78" y2="46" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
      <g transform="translate(66,30) rotate(8)">
        <rect x="0" y="0" width="30" height="40" rx="4" fill="#fff" />
        <rect x="10" y="-4" width="10" height="7" rx="2" fill="#cbd5e1" />
        <line x1="6" y1="12" x2="24" y2="12" stroke="#1d4ed8" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="6" y1="19" x2="24" y2="19" stroke="#93c5fd" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="6" y1="26" x2="18" y2="26" stroke="#93c5fd" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </>
  ),
  steals: (
    <>
      <path fillRule="evenodd" d="M22 44 Q 50 38 78 44 L78 54 Q 64 62 50 62 Q 36 62 22 54 Z M40 52 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 M60 52 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0" fill="#111827" />
      <g transform="translate(60,-30) rotate(-12)">
        <path d="M0 6 L22 0 L40 16 L18 36 L0 30 Z" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
        <circle cx="9" cy="13" r="3.4" fill="#fff" stroke="#ca8a04" strokeWidth="1.4" />
        <text x="24" y="22" fontSize="13" fontWeight="900" fill="#be123c" textAnchor="middle">%</text>
        <line x1="6" y1="9" x2="-16" y2="30" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </g>
    </>
  ),
}

export function ThemedAvocado({ theme = 'reports', size = 84, className = '' }) {
  return (
    <svg viewBox="-28 -52 156 184" width={size} height={size * (184 / 156)} className={className} aria-hidden="true">
      <AvoBody />
      {PROPS[theme]}
    </svg>
  )
}

export default function FeatureHeader({ theme = 'reports', title, subtitle, badge, action }) {
  const grad = (THEMES[theme] || THEMES.reports).grad
  return (
    <div className={`relative overflow-hidden rounded-3xl px-4 py-4 sm:px-6 sm:py-5 text-white shadow-lg bg-gradient-to-br ${grad}`}>
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        <ThemedAvocado theme={theme} size={78} className="shrink-0 drop-shadow-md" />
        <div className="min-w-[150px]">
          <h1 className="text-2xl sm:text-3xl font-black leading-none tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm font-medium opacity-90 mt-1.5">{subtitle}</p>}
        </div>
        {badge && (
          <span className="text-[10px] uppercase tracking-wider font-bold bg-white/20 px-2.5 py-1 rounded-full">
            {badge}
          </span>
        )}
        {action && <div className="ml-auto">{action}</div>}
      </div>
    </div>
  )
}

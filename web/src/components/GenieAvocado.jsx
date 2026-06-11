'use client'
// The avocado as a "genie" rising out of a laptop on a smoke-swirl tail.
// Used on the landing hero and the GuacWizard header. Fresh on-brand art (not
// the locked GuacMascot). The genie (body + arms + tail + sparkles) gently
// floats via CSS (.genie-float / .genie-twinkle in globals.css); the laptop
// stays put. `size` is the width; height follows the 440x560 art ratio.
const STAR = 'M0 -5 L1.12 -1.55 4.76 -1.55 1.82 0.59 2.94 4.05 0 1.9 -2.94 4.05 -1.82 0.59 -4.76 -1.55 -1.12 -1.55 Z'

export default function GenieAvocado({ size = 300, className = '' }) {
  return (
    <svg width={size} height={size * (560 / 440)} viewBox="0 0 440 560"
      className={className} role="img" aria-label="Avocado genie rising from a laptop">
      <defs>
        <radialGradient id="gnBody" cx="35%" cy="28%" r="80%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#064e3b" /></radialGradient>
        <radialGradient id="gnFlesh" cx="50%" cy="42%" r="68%"><stop offset="0%" stopColor="#f6ed8a" /><stop offset="40%" stopColor="#e7ec8e" /><stop offset="74%" stopColor="#b4d35f" /><stop offset="100%" stopColor="#84cc16" /></radialGradient>
        <radialGradient id="gnPit" cx="38%" cy="34%" r="78%"><stop offset="0%" stopColor="#dca838" /><stop offset="48%" stopColor="#a8590a" /><stop offset="100%" stopColor="#54260c" /></radialGradient>
        <linearGradient id="gnSwirl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#10b981" stopOpacity="0.25" /></linearGradient>
        <linearGradient id="gnScreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#cfe8ff" /><stop offset="100%" stopColor="#8ec5ff" /></linearGradient>
      </defs>

      {/* LAPTOP (static) */}
      <ellipse cx="220" cy="528" rx="120" ry="14" fill="#0f172a" opacity="0.08" />
      <path d="M150 470 L290 470 L312 524 L128 524 Z" fill="#1f2937" />
      <path d="M160 478 L280 478 L298 518 L142 518 Z" fill="url(#gnScreen)" />
      <path d="M168 482 L210 482 L196 512 L150 512 Z" fill="#ffffff" opacity="0.25" />
      <path d="M120 524 L320 524 L338 538 L102 538 Z" fill="#cbd5e1" />
      <path d="M102 538 L338 538 L338 542 L102 542 Z" fill="#94a3b8" />

      {/* GENIE (floats) */}
      <g className="genie-float">
        {/* smoke-swirl tail */}
        <path d="M196 398 C 172 426, 238 442, 214 468 C 198 486, 230 498, 219 508 C 240 496, 258 472, 236 450 C 260 430, 214 416, 246 398 Z" fill="url(#gnSwirl)" />
        <path d="M210 410 C 196 430, 232 444, 218 462 C 208 476, 226 486, 219 496 C 230 484, 240 470, 228 456 C 242 442, 214 432, 230 412 Z" fill="#ecfdf5" opacity="0.5" />
        {/* arms (raised) */}
        <path d="M168 250 C 140 232, 124 196, 120 166" stroke="#10b981" strokeWidth="20" fill="none" strokeLinecap="round" />
        <path d="M272 250 C 300 232, 316 196, 320 166" stroke="#10b981" strokeWidth="20" fill="none" strokeLinecap="round" />
        <circle cx="118" cy="160" r="15" fill="#fde68a" stroke="#cf9b3c" strokeWidth="2" />
        <circle cx="322" cy="160" r="15" fill="#fde68a" stroke="#cf9b3c" strokeWidth="2" />
        {/* body */}
        <path d="M220 150 C 185 150, 174 172, 171 204 C 168 232, 154 252, 140 284 C 122 324, 124 372, 170 402 C 194 422, 246 422, 270 402 C 316 372, 318 324, 300 284 C 286 252, 272 232, 269 204 C 266 172, 255 150, 220 150 Z" fill="url(#gnBody)" />
        <path d="M220 164 C 190 164, 181 184, 179 212 C 177 236, 163 254, 152 284 C 135 320, 138 366, 178 393 C 200 411, 240 411, 262 393 C 302 366, 305 320, 288 284 C 277 254, 263 236, 261 212 C 259 184, 250 164, 220 164 Z" fill="url(#gnFlesh)" />
        <ellipse cx="220" cy="330" rx="50" ry="52" fill="url(#gnPit)" />
        {/* face */}
        <circle cx="200" cy="232" r="11" fill="#fff" stroke="#1f2937" strokeWidth="2" /><circle cx="240" cy="232" r="11" fill="#fff" stroke="#1f2937" strokeWidth="2" />
        <circle cx="201" cy="233" r="5.5" fill="#1f2937" /><circle cx="241" cy="233" r="5.5" fill="#1f2937" />
        <circle cx="173" cy="246" r="7" fill="#fb7185" opacity="0.5" /><circle cx="267" cy="246" r="7" fill="#fb7185" opacity="0.5" />
        <path d="M198 256 Q 220 280 242 256 Z" fill="#1f2937" />
        <path d="M203 258 L237 258 L233 266 Q 220 272 207 266 Z" fill="#fff" />
        {/* sparkles */}
        <g fill="#fde047" stroke="#eab308" strokeWidth="1.2">
          <path className="genie-twinkle" transform="translate(96 130) scale(2)" d={STAR} />
          <path className="genie-twinkle" style={{ animationDelay: '0.6s' }} transform="translate(348 132) scale(1.6)" d={STAR} />
          <path className="genie-twinkle" style={{ animationDelay: '1.1s' }} transform="translate(330 96) scale(1.2)" d={STAR} />
        </g>
      </g>
    </svg>
  )
}

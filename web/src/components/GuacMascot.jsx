'use client'

// On-brand SVG avocado mascot. Expressions and poses for every moment.
//
//   <GuacMascot expression="happy" />        // default cheerful avocado
//   <GuacMascot expression="sleepy" />       // closed eyes + Zzz
//   <GuacMascot expression="surprised" />    // wide eyes + small "o" mouth
//   <GuacMascot expression="celebrating" />  // big grin + sparkles around
//   <GuacMascot expression="thumbsup" />     // happy + thumbs-up arm
//   <GuacMascot expression="angel" />        // halo + wings — brand/logo mode
//   <GuacMascot expression="sleeping" />     // lying down, snoozing
//   <GuacMascot expression="sitting" />      // seated with little feet poking out
//   <GuacMascot expression="eating" />       // happy + fork in hand, ready to feast
//   <GuacMascot expression="relaxing" />     // sunglasses + cool drink — for empty states
//   <GuacMascot expression="rich" />         // shades + cash in hand — for Steals / deals
export default function GuacMascot({ expression = 'happy', size = 140, className = '' }) {
  // Sleeping = laying horizontal. We rotate the whole avocado group 90° below.
  const isLaying = expression === 'sleeping'
  const ratio = isLaying ? (220 / 280) : (280 / 220)

  return (
    <svg
      viewBox={isLaying ? '0 -10 280 220' : '0 0 220 280'}
      width={size}
      height={size * ratio}
      className={`select-none ${className}`}
      aria-hidden="true"
    >
      <g transform={isLaying ? 'rotate(-90 130 130) translate(-20 20)' : ''}>
      <defs>
        <radialGradient id="guacBody" cx="35%" cy="30%" r="80%">
          <stop offset="0%"   stopColor="#10b981" />
          <stop offset="100%" stopColor="#064e3b" />
        </radialGradient>
        <radialGradient id="guacFlesh" cx="50%" cy="40%" r="70%">
          <stop offset="0%"   stopColor="#d9f99d" />
          <stop offset="100%" stopColor="#84cc16" />
        </radialGradient>
        <radialGradient id="guacPit" cx="38%" cy="32%" r="75%">
          <stop offset="0%"   stopColor="#fcd34d" />
          <stop offset="50%"  stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
      </defs>

      {/* Leaf */}
      <g transform="translate(120 14) rotate(-22)">
        <ellipse cx="0" cy="0" rx="9" ry="20" fill="#65a30d" />
        <path d="M 0 -16 Q 4 0 0 16" stroke="#3f6212" strokeWidth="1.4" fill="none" />
      </g>
      <rect x="106" y="22" width="3" height="14" rx="1.5" fill="#3f6212" />

      {/* Body — proper avocado silhouette: narrow neck up top, round bulb at bottom */}
      <path d="M 110 32
               C 92 34, 82 48, 80 72
               C 80 92, 70 108, 60 130
               C 46 162, 44 200, 70 226
               C 88 244, 132 244, 150 226
               C 176 200, 174 162, 160 130
               C 150 108, 140 92, 140 72
               C 138 48, 128 34, 110 32 Z"
            fill="url(#guacBody)" />

      {/* Subtle skin highlight along the upper-left */}
      <path d="M 86 60
               C 78 80, 70 110, 64 140"
            stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.18" />

      {/* Flesh (lighter green inset) — same silhouette, scaled in */}
      <path d="M 110 50
               C 96 52, 89 62, 88 80
               C 88 96, 80 110, 72 130
               C 60 158, 60 192, 82 214
               C 96 226, 124 226, 138 214
               C 160 192, 160 158, 148 130
               C 140 110, 132 96, 132 80
               C 131 62, 124 52, 110 50 Z"
            fill="url(#guacFlesh)" />

      {/* Pit — sits in the wide bulb at the bottom. Warmer tan tone matching the logo. */}
      <ellipse cx="110" cy="172" rx="38" ry="40" fill="url(#guacPit)" />
      {/* Bright highlight glint */}
      <ellipse cx="96" cy="158" rx="11" ry="6" fill="#fef3c7" opacity="0.55" />

      {/* Cheeks */}
      <circle cx="80"  cy="190" r="6" fill="#fb7185" opacity="0.55" />
      <circle cx="140" cy="190" r="6" fill="#fb7185" opacity="0.55" />

      {/* Expression: eyes + mouth */}
      <Eyes expression={expression} />
      <Mouth expression={expression} />

      {/* Celebrating: sparkles around the head */}
      {expression === 'celebrating' && (
        <g fill="#facc15">
          <Sparkle x={30}  y={50}  scale={0.9} />
          <Sparkle x={190} y={60}  scale={1.1} />
          <Sparkle x={20}  y={140} scale={0.75} />
          <Sparkle x={200} y={140} scale={0.95} />
          <Sparkle x={110} y={18}  scale={1.0} />
        </g>
      )}

      {/* Sleepy or Sleeping: little Zzz */}
      {(expression === 'sleepy' || expression === 'sleeping') && (
        <g fill="#9ca3af">
          <text x="155" y="100" fontSize="22" fontWeight="bold" fontFamily="sans-serif">Z</text>
          <text x="175" y="80"  fontSize="16" fontWeight="bold" fontFamily="sans-serif">z</text>
          <text x="190" y="64"  fontSize="12" fontWeight="bold" fontFamily="sans-serif">z</text>
        </g>
      )}

      {/* Relaxing: sunglasses + a fancy drink on the side */}
      {expression === 'relaxing' && (
        <g>
          {/* Sunglasses — covers the eye region */}
          <g>
            {/* Bridge */}
            <line x1="100" y1="166" x2="120" y2="166" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
            {/* Left lens */}
            <rect x="78"  y="158" width="26" height="18" rx="5" fill="#1f2937" />
            <rect x="82"  y="161" width="8"  height="5"  rx="1.5" fill="#374151" opacity="0.8" />
            {/* Right lens */}
            <rect x="116" y="158" width="26" height="18" rx="5" fill="#1f2937" />
            <rect x="120" y="161" width="8"  height="5"  rx="1.5" fill="#374151" opacity="0.8" />
          </g>
          {/* Drink — pink cocktail with a straw, sitting next to the avocado */}
          <g transform="translate(186 168)">
            {/* Glass body — triangle martini-style */}
            <path d="M -16 0 L 16 0 L 0 22 Z" fill="#fda4af" stroke="#be123c" strokeWidth="1.5" />
            {/* Drink surface highlight */}
            <ellipse cx="0" cy="2" rx="14" ry="2" fill="#fecdd3" />
            {/* Stem */}
            <line x1="0" y1="22" x2="0" y2="38" stroke="#1f2937" strokeWidth="1.8" />
            {/* Base */}
            <ellipse cx="0" cy="40" rx="10" ry="2.5" fill="#1f2937" />
            {/* Straw */}
            <line x1="-6" y1="-4" x2="-2" y2="-22" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
            {/* Cherry on top */}
            <circle cx="6" cy="-3" r="3.5" fill="#dc2626" />
            <line x1="6" y1="-6" x2="8" y2="-12" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </g>
      )}

      </g>
      {/* Angel: golden halo + white wings — brand/logo mode */}
      {expression === 'angel' && (
        <g>
          {/* Halo */}
          <ellipse cx="110" cy="20" rx="46" ry="9" fill="none" stroke="#fbbf24" strokeWidth="5" opacity="0.9" />
          <ellipse cx="110" cy="20" rx="42" ry="6" fill="none" stroke="#fde68a" strokeWidth="2" />
          {/* Left wing */}
          <path d="M 40 110
                   C 8 88, -6 130, 8 162
                   C 22 174, 38 168, 44 152
                   C 44 130, 44 120, 40 110 Z"
                fill="white" stroke="#cbd5e1" strokeWidth="1.4" />
          <path d="M 14 122 Q 22 138, 30 148" stroke="#e2e8f0" fill="none" strokeWidth="1.2" />
          <path d="M 14 138 Q 22 148, 32 156" stroke="#e2e8f0" fill="none" strokeWidth="1.2" />
          {/* Right wing */}
          <path d="M 180 110
                   C 212 88, 226 130, 212 162
                   C 198 174, 182 168, 176 152
                   C 176 130, 176 120, 180 110 Z"
                fill="white" stroke="#cbd5e1" strokeWidth="1.4" />
          <path d="M 206 122 Q 198 138, 190 148" stroke="#e2e8f0" fill="none" strokeWidth="1.2" />
          <path d="M 206 138 Q 198 148, 188 156" stroke="#e2e8f0" fill="none" strokeWidth="1.2" />
        </g>
      )}

      {/* Sitting: two little feet sticking out at the bottom */}
      {expression === 'sitting' && (
        <g>
          <ellipse cx="88"  cy="252" rx="20" ry="9" fill="#064e3b" />
          <ellipse cx="132" cy="252" rx="20" ry="9" fill="#064e3b" />
          {/* Toes */}
          <g fill="#3f6212">
            <circle cx="76"  cy="250" r="2.5" />
            <circle cx="82"  cy="247" r="2.5" />
            <circle cx="88"  cy="246" r="2.5" />
            <circle cx="95"  cy="247" r="2.5" />
            <circle cx="101" cy="250" r="2.5" />
            <circle cx="120" cy="250" r="2.5" />
            <circle cx="126" cy="247" r="2.5" />
            <circle cx="132" cy="246" r="2.5" />
            <circle cx="139" cy="247" r="2.5" />
            <circle cx="145" cy="250" r="2.5" />
          </g>
        </g>
      )}

      {/* Eating: a green arm holding a fork with food */}
      {expression === 'eating' && (
        <g>
          {/* Arm — green */}
          <path d="M 168 168
                   C 192 158, 210 130, 214 108
                   C 215 100, 207 96, 202 102
                   C 196 112, 188 130, 175 156 Z"
                fill="#047857" />
          {/* Hand (light) */}
          <circle cx="208" cy="100" r="9" fill="#fde68a" stroke="#b45309" strokeWidth="1" opacity="0.9" />
          {/* Fork handle */}
          <line x1="208" y1="92" x2="208" y2="50" stroke="#9ca3af" strokeWidth="3.5" strokeLinecap="round" />
          {/* Fork tines */}
          <g stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round">
            <line x1="202" y1="60" x2="202" y2="44" />
            <line x1="208" y1="58" x2="208" y2="40" />
            <line x1="214" y1="60" x2="214" y2="44" />
          </g>
          {/* Speared bite of food on the fork */}
          <ellipse cx="208" cy="44" rx="8" ry="6" fill="#84cc16" stroke="#3f6212" strokeWidth="1" />
          {/* Tiny droplet near mouth = drool 😋 */}
          <ellipse cx="128" cy="208" rx="2.5" ry="4" fill="#0ea5e9" opacity="0.7" />
        </g>
      )}

      {/* Rich: gold-frame aviators (lenses transparent so the eyes show through) +
          green arm holding a wad of cash. Whole rig is tilted for swag. */}
      {expression === 'rich' && (
        <g transform="rotate(-6 110 170)">
          {/* Gold aviator frames — frames only, lenses see-through */}
          <g>
            {/* Bridge */}
            <path d="M 100 165 Q 110 170, 120 165" stroke="#facc15" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Left lens — fill is the lime flesh color (tinted glass) so eyes are still visible */}
            <ellipse cx="92" cy="168" rx="15" ry="11" fill="#a3e635" fillOpacity="0.25" stroke="#facc15" strokeWidth="2.2" />
            {/* Right lens */}
            <ellipse cx="128" cy="168" rx="15" ry="11" fill="#a3e635" fillOpacity="0.25" stroke="#facc15" strokeWidth="2.2" />
            {/* Subtle highlight glint on each lens */}
            <path d="M 84 162 Q 88 158, 94 158" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.85" />
            <path d="M 120 162 Q 124 158, 130 158" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.85" />
            {/* Gold temple piece */}
            <line x1="143" y1="168" x2="150" y2="170" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
            <line x1="77" y1="168" x2="70" y2="170" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Arm — same green as body, reaching out to the right */}
          <path d="M 168 168
                   C 188 158, 206 142, 214 122
                   C 217 112, 209 106, 204 112
                   C 198 122, 192 130, 175 156 Z"
                fill="#047857" />

          {/* Stack of cash — multiple green bills offset for depth */}
          <g transform="translate(214 110) rotate(-12)">
            {/* Back bill (shadow) */}
            <rect x="-22" y="-12" width="44" height="22" rx="2" fill="#166534" />
            {/* Middle bill */}
            <rect x="-24" y="-14" width="44" height="22" rx="2" fill="#16a34a" stroke="#14532d" strokeWidth="1" />
            {/* Front bill */}
            <rect x="-26" y="-16" width="44" height="22" rx="2" fill="#22c55e" stroke="#14532d" strokeWidth="1" />
            {/* $ sign on front bill */}
            <text x="-4" y="-1" fontSize="14" fontWeight="900" fontFamily="sans-serif" fill="#14532d" textAnchor="middle">$</text>
            {/* Tiny corner ornaments */}
            <circle cx="-21" cy="-12" r="2" fill="none" stroke="#14532d" strokeWidth="0.8" />
            <circle cx="14"  cy="2"   r="2" fill="none" stroke="#14532d" strokeWidth="0.8" />
          </g>

          {/* Sparkle bling around the cash */}
          <g fill="#facc15">
            <Sparkle x={232} y={92}  scale={0.55} />
            <Sparkle x={196} y={86}  scale={0.5} />
            <Sparkle x={228} y={132} scale={0.45} />
          </g>
        </g>
      )}

      {/* Thumbs-up: tiny green arm sticking out the right side with a yellow thumb */}
      {expression === 'thumbsup' && (
        <g>
          {/* Arm — same green as body */}
          <path d="M 168 168
                   C 188 158, 200 130, 198 112
                   C 197 102, 187 98, 182 106
                   C 178 112, 176 120, 172 130
                   C 170 140, 168 152, 165 160 Z"
                fill="#047857" />
          {/* Hand (fist) — peach/yellow */}
          <circle cx="200" cy="92" r="14" fill="#fde68a" />
          <circle cx="200" cy="92" r="14" fill="none" stroke="#b45309" strokeWidth="1.2" opacity="0.4" />
          {/* Thumb pointing up */}
          <path d="M 196 88
                   C 196 76, 200 70, 204 70
                   C 208 70, 210 78, 208 86
                   C 207 90, 204 92, 200 92 Z"
                fill="#fde68a" stroke="#b45309" strokeWidth="1.2" strokeOpacity="0.4" />
          {/* Finger knuckle lines */}
          <line x1="194" y1="96" x2="206" y2="96" stroke="#b45309" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
          <line x1="194" y1="100" x2="206" y2="100" stroke="#b45309" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
          {/* Tiny sparkles around the thumb to amplify the energy */}
          <g fill="#facc15">
            <Sparkle x={222} y={70}  scale={0.55} />
            <Sparkle x={186} y={56}  scale={0.5} />
            <Sparkle x={224} y={108} scale={0.4} />
          </g>
        </g>
      )}
    </svg>
  )
}

function Eyes({ expression }) {
  const cx1 = 94, cx2 = 126, cy = 168
  switch (expression) {
    case 'sleeping':
    case 'sleepy':
      return (
        <g stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d={`M ${cx1 - 8} ${cy} Q ${cx1} ${cy - 6}, ${cx1 + 8} ${cy}`} />
          <path d={`M ${cx2 - 8} ${cy} Q ${cx2} ${cy - 6}, ${cx2 + 8} ${cy}`} />
        </g>
      )
    case 'surprised':
      return (
        <g>
          <circle cx={cx1} cy={cy} r="10" fill="white" />
          <circle cx={cx2} cy={cy} r="10" fill="white" />
          <circle cx={cx1} cy={cy + 1} r="5" fill="#1f2937" />
          <circle cx={cx2} cy={cy + 1} r="5" fill="#1f2937" />
          <circle cx={cx1 - 2} cy={cy - 2} r="1.6" fill="white" />
          <circle cx={cx2 - 2} cy={cy - 2} r="1.6" fill="white" />
        </g>
      )
    case 'celebrating':
      return (
        <g stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d={`M ${cx1 - 8} ${cy + 4} Q ${cx1} ${cy - 6}, ${cx1 + 8} ${cy + 4}`} />
          <path d={`M ${cx2 - 8} ${cy + 4} Q ${cx2} ${cy - 6}, ${cx2 + 8} ${cy + 4}`} />
        </g>
      )
    default: // happy — bigger eyes with white sclera + dark pupil + sparkle highlight
      return (
        <g>
          <circle cx={cx1} cy={cy} r="8" fill="white" stroke="#1f2937" strokeWidth="1" />
          <circle cx={cx2} cy={cy} r="8" fill="white" stroke="#1f2937" strokeWidth="1" />
          <circle cx={cx1 + 1} cy={cy + 1} r="4" fill="#1f2937" />
          <circle cx={cx2 + 1} cy={cy + 1} r="4" fill="#1f2937" />
          <circle cx={cx1 - 1} cy={cy - 1.5} r="1.6" fill="white" />
          <circle cx={cx2 - 1} cy={cy - 1.5} r="1.6" fill="white" />
        </g>
      )
  }
}

function Mouth({ expression }) {
  const cx = 110, cy = 196
  switch (expression) {
    case 'sleeping':
    case 'sleepy':
      return <ellipse cx={cx} cy={cy + 2} rx="4" ry="3" fill="#1f2937" />
    case 'eating':
      // Open happy mouth — ready to chomp
      return (
        <g>
          <ellipse cx={cx} cy={cy + 4} rx="10" ry="7" fill="#1f2937" />
          <ellipse cx={cx} cy={cy + 6} rx="6" ry="3" fill="#be123c" />
        </g>
      )
    case 'surprised':
      return (
        <g>
          <ellipse cx={cx} cy={cy + 4} rx="6" ry="8" fill="#1f2937" />
          <ellipse cx={cx} cy={cy + 7} rx="4" ry="3" fill="#be123c" />
        </g>
      )
    case 'celebrating':
      return (
        <g>
          <path d={`M ${cx - 14} ${cy - 2} Q ${cx} ${cy + 16}, ${cx + 14} ${cy - 2}`}
                fill="#1f2937" />
          <path d={`M ${cx - 11} ${cy + 4} Q ${cx} ${cy + 12}, ${cx + 11} ${cy + 4}`}
                fill="#fda4af" />
        </g>
      )
    default: // happy
      return (
        <path d={`M ${cx - 10} ${cy - 2} Q ${cx} ${cy + 8}, ${cx + 10} ${cy - 2}`}
              stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      )
  }
}

function Sparkle({ x, y, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M 0 -10 L 2.5 -2.5 L 10 0 L 2.5 2.5 L 0 10 L -2.5 2.5 L -10 0 L -2.5 -2.5 Z" />
    </g>
  )
}

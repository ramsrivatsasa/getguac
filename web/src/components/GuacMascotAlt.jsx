'use client'

// GuacMascotAlt — an ALTERNATE avocado mascot (a NEW, separate character;
// it does NOT replace the locked brand mascot in GuacMascot.jsx).
// 🔒 FINALIZED 2026-06-04 (user-approved). Design is locked — ASK FIRST.
//
// Difference vs the brand mascot: the eyes + mouth sit UP TOP on a widened
// neck, and the pit is a darker, low-reflection avocado SEED down below —
// the friendlier, "conventional" avocado-character layout the user asked
// for. Body: broader, rounder top + fuller round bottom, thin green rim,
// buttery-yellow ripe flesh centre, pointed leaf + curved stem.
//
//   <GuacMascotAlt expression="happy" size={140} />
//
// Expressions: happy (default) · sleepy · surprised · celebrating
export default function GuacMascotAlt({ expression = 'happy', size = 140, className = '' }) {
  return (
    <svg
      viewBox="0 0 220 280"
      width={size}
      height={size * (280 / 220)}
      className={`select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="gmaBody" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#064e3b" />
        </radialGradient>
        <radialGradient id="gmaFlesh" cx="50%" cy="44%" r="68%">
          <stop offset="0%"   stopColor="#f6ed8a" />
          <stop offset="38%"  stopColor="#e7ec8e" />
          <stop offset="72%"  stopColor="#b4d35f" />
          <stop offset="100%" stopColor="#84cc16" />
        </radialGradient>
        <radialGradient id="gmaPit" cx="38%" cy="34%" r="78%">
          <stop offset="0%"   stopColor="#dca838" />
          <stop offset="48%"  stopColor="#a8590a" />
          <stop offset="100%" stopColor="#54260c" />
        </radialGradient>
      </defs>

      {/* Stem — small curved sprout */}
      <path d="M 110 45 C 110 36, 114 29, 121 27"
            stroke="#6b4226" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      {/* Leaf — pointed, with a centre vein */}
      <path d="M 109 41 C 99 27, 80 24, 71 33 C 78 45, 98 47, 109 41 Z" fill="#5cbf6f" />
      <path d="M 105 41 Q 88 38, 73 33" stroke="#3f9a52" strokeWidth="1.4" fill="none" opacity="0.7" />

      {/* Body — wider top + neck so the face fits up there; fuller round bottom */}
      <path d="M 110 42
               C 84 42, 76 58, 74 82
               C 72 103, 62 118, 52 142.2
               C 38 172.6, 40 208.7, 74 231.5
               C 92 246.7, 128 246.7, 146 231.5
               C 180 208.7, 182 172.6, 168 142.2
               C 158 118, 148 103, 146 82
               C 144 58, 136 42, 110 42 Z"
            fill="url(#gmaBody)" />

      {/* Skin highlight */}
      <path d="M 78 70 C 70 96, 62 124, 58 152"
            stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.16" />

      {/* Flesh — thin rim, buttery-yellow ripe centre */}
      <path d="M 110 52
               C 87 52, 80 66, 78 88
               C 76 107, 66 120.5, 57.8 142.7
               C 45.2 170.1, 47 202.6, 77.6 223.3
               C 93.8 236.9, 126.2 236.9, 142.4 223.3
               C 173 202.6, 174.8 170.1, 162.2 142.7
               C 154 120.5, 144 107, 142 88
               C 140 66, 133 52, 110 52 Z"
            fill="url(#gmaFlesh)" />

      {/* Pit/seed — identical to the current mascot's pit (gradient + glint) */}
      <ellipse cx="110" cy="178" rx="38" ry="40" fill="url(#gmaPit)" />
      <ellipse cx="96" cy="166" rx="9" ry="5" fill="#f3e0ad" opacity="0.32" />

      {/* Cheeks — flank the upper face */}
      <circle cx="75"  cy="106" r="5.5" fill="#fb7185" opacity="0.5" />
      <circle cx="145" cy="106" r="5.5" fill="#fb7185" opacity="0.5" />

      {/* Face — eyes + mouth UP TOP on the upper flesh */}
      <AltEyes expression={expression} />
      <AltMouth expression={expression} />

      {expression === 'celebrating' && (
        <g fill="#facc15">
          <Sparkle x={40} y={70} scale={0.8} />
          <Sparkle x={182} y={78} scale={0.95} />
          <Sparkle x={110} y={34} scale={0.85} />
        </g>
      )}
      {expression === 'sleepy' && (
        <g fill="#9ca3af">
          <text x="150" y="96" fontSize="20" fontWeight="bold" fontFamily="sans-serif">Z</text>
          <text x="168" y="78" fontSize="14" fontWeight="bold" fontFamily="sans-serif">z</text>
        </g>
      )}
    </svg>
  )
}

function AltEyes({ expression }) {
  const cx1 = 95, cx2 = 125, cy = 94
  switch (expression) {
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
          <circle cx={cx1} cy={cy} r="9.5" fill="white" stroke="#1f2937" strokeWidth="1" />
          <circle cx={cx2} cy={cy} r="9.5" fill="white" stroke="#1f2937" strokeWidth="1" />
          <circle cx={cx1} cy={cy + 1} r="5" fill="#1f2937" />
          <circle cx={cx2} cy={cy + 1} r="5" fill="#1f2937" />
        </g>
      )
    case 'celebrating':
      return (
        <g stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d={`M ${cx1 - 8} ${cy + 4} Q ${cx1} ${cy - 6}, ${cx1 + 8} ${cy + 4}`} />
          <path d={`M ${cx2 - 8} ${cy + 4} Q ${cx2} ${cy - 6}, ${cx2 + 8} ${cy + 4}`} />
        </g>
      )
    default: // happy
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

function AltMouth({ expression }) {
  const cx = 110, cy = 114
  switch (expression) {
    case 'sleepy':
      return <ellipse cx={cx} cy={cy + 2} rx="4" ry="3" fill="#1f2937" />
    case 'surprised':
      return (
        <g>
          <ellipse cx={cx} cy={cy + 3} rx="5" ry="7" fill="#1f2937" />
          <ellipse cx={cx} cy={cy + 5} rx="3" ry="2.5" fill="#be123c" />
        </g>
      )
    case 'celebrating':
      return (
        <g>
          <path d={`M ${cx - 13} ${cy - 2} Q ${cx} ${cy + 15}, ${cx + 13} ${cy - 2}`} fill="#1f2937" />
          <path d={`M ${cx - 10} ${cy + 3} Q ${cx} ${cy + 11}, ${cx + 10} ${cy + 3}`} fill="#fda4af" />
        </g>
      )
    default: // happy
      return (
        <path d={`M ${cx - 9} ${cy - 1} Q ${cx} ${cy + 9}, ${cx + 9} ${cy - 1}`}
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

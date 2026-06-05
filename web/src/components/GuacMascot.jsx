'use client'

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🔒 DO NOT CHANGE — the GetGuac brand mascot SVG.                ║
// ║  The avocado character, its shape, eyes, pit, expressions, and   ║
// ║  poses are LOCKED by the user (2026-06-04). No SVG redraw, no    ║
// ║  swap to Lottie, no separable-parts re-author, no body          ║
// ║  redesign. If you think it needs a refresh — ASK FIRST.          ║
// ║                                                                  ║
// ║  Animation of the mascot via the AnimatedMascot wrapper          ║
// ║  (bounce/wiggle/pulse/celebrate/idle) is still OK — that         ║
// ║  applies transforms to the whole mascot, not its internals.      ║
// ╚══════════════════════════════════════════════════════════════════╝
//
// 2026-06-04 update (user-approved): body silhouette reshaped — broader,
// rounder top + fuller round bottom, thinner green rim, buttery-yellow
// ripe flesh centre, ~5% shorter. Pit, face, all expressions and poses
// are UNCHANGED and remain locked. The 🥑 emoji LOGO (Sidebar) and the
// favicon (app/icon.svg) are intentionally NOT changed here.
//
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
//   <GuacMascot expression="standing" />     // full-body: two arms + hands raised, two legs + feet
// 🔄 2026-06-04 (user-approved): the GetGuac brand mascot was REPLACED with
// the NEW avocado character (face-up, white eyes, amber belly seed) — now
// posed for EVERY old expression. Same {expression,size,className} API, so
// all ~45 call sites render the right pose unchanged. The original locked
// drawing is preserved below as GuacMascotLegacy (revert = make it default).
export default function GuacMascot({ expression = 'happy', size = 140, className = '' }) {
  const laying = expression === 'sleeping' // lie the avocado on its side
  return (
    <svg
      viewBox={laying ? '-35 35 290 220' : '0 0 220 290'}
      width={size}
      height={laying ? size * (220 / 290) : size * (290 / 220)}
      className={`select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="gmBody" cx="35%" cy="30%" r="80%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#064e3b" /></radialGradient>
        <radialGradient id="gmFlesh" cx="50%" cy="44%" r="68%"><stop offset="0%" stopColor="#f6ed8a" /><stop offset="38%" stopColor="#e7ec8e" /><stop offset="72%" stopColor="#b4d35f" /><stop offset="100%" stopColor="#84cc16" /></radialGradient>
        <radialGradient id="gmPit" cx="38%" cy="34%" r="78%"><stop offset="0%" stopColor="#dca838" /><stop offset="48%" stopColor="#a8590a" /><stop offset="100%" stopColor="#54260c" /></radialGradient>
      </defs>
      <g transform={laying ? 'rotate(-90 110 145)' : ''}>
        {/* limbs / held props BEHIND the body */}
        <PoseBehind e={expression} />
        {/* stem + leaf */}
        <path d="M 110 45 C 110 36, 114 29, 121 27" stroke="#6b4226" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <path d="M 109 41 C 99 27, 80 24, 71 33 C 78 45, 98 47, 109 41 Z" fill="#5cbf6f" />
        <path d="M 105 41 Q 88 38, 73 33" stroke="#3f9a52" strokeWidth="1.4" fill="none" opacity="0.7" />
        {/* body + flesh + seed */}
        <path d="M 110 42 C 84 42, 76 58, 74 82 C 72 103, 62 118, 52 142.2 C 38 172.6, 40 208.7, 74 231.5 C 92 246.7, 128 246.7, 146 231.5 C 180 208.7, 182 172.6, 168 142.2 C 158 118, 148 103, 146 82 C 144 58, 136 42, 110 42 Z" fill="url(#gmBody)" />
        <path d="M 78 70 C 70 96, 62 124, 58 152" stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.16" />
        <path d="M 110 52 C 87 52, 80 66, 78 88 C 76 107, 66 120.5, 57.8 142.7 C 45.2 170.1, 47 202.6, 77.6 223.3 C 93.8 236.9, 126.2 236.9, 142.4 223.3 C 173 202.6, 174.8 170.1, 162.2 142.7 C 154 120.5, 144 107, 142 88 C 140 66, 133 52, 110 52 Z" fill="url(#gmFlesh)" />
        <ellipse cx="110" cy="178" rx="38" ry="40" fill="url(#gmPit)" />
        <ellipse cx="96" cy="166" rx="9" ry="5" fill="#f3e0ad" opacity="0.32" />
        {/* cheeks */}
        <circle cx="75" cy="106" r="5.5" fill="#fb7185" opacity="0.5" />
        <circle cx="145" cy="106" r="5.5" fill="#fb7185" opacity="0.5" />
        {/* face + front props (halo / shades / sparkles / Zzz) */}
        <PoseFace e={expression} />
        <PoseFront e={expression} />
      </g>
    </svg>
  )
}

/* ── pose pieces (drawn on the new body) ─────────────────────────────── */
const PoseSparkle = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#facc15">
    <path d="M 0 -10 L 2.5 -2.5 L 10 0 L 2.5 2.5 L 0 10 L -2.5 2.5 L -10 0 L -2.5 -2.5 Z" />
  </g>
)
const ArmR = ({ x, y }) => (<><path d={`M 146 150 C 162 140, ${x - 6} ${y + 10}, ${x} ${y}`} stroke="#10b981" strokeWidth="13" fill="none" strokeLinecap="round" /><circle cx={x} cy={y} r="10" fill="#10b981" /></>)
const ArmL = ({ x, y }) => (<><path d={`M 74 150 C 58 140, ${x + 6} ${y + 10}, ${x} ${y}`} stroke="#10b981" strokeWidth="13" fill="none" strokeLinecap="round" /><circle cx={x} cy={y} r="10" fill="#10b981" /></>)
const Wings = () => (<><path d="M 70 92 C 50 84, 44 104, 60 110 C 52 100, 60 96, 72 100 Z" fill="#fff" opacity="0.92" stroke="#e5e7eb" strokeWidth="1" /><path d="M 150 92 C 170 84, 176 104, 160 110 C 168 100, 160 96, 148 100 Z" fill="#fff" opacity="0.92" stroke="#e5e7eb" strokeWidth="1" /></>)
const Feet = () => (<><ellipse cx="92" cy="250" rx="13" ry="8" fill="#047857" /><ellipse cx="128" cy="250" rx="13" ry="8" fill="#047857" /></>)
const Legs = () => (<><rect x="88" y="238" width="13" height="20" rx="6" fill="#047857" /><ellipse cx="90" cy="260" rx="13" ry="7" fill="#064e3b" /><rect x="119" y="238" width="13" height="20" rx="6" fill="#047857" /><ellipse cx="130" cy="260" rx="13" ry="7" fill="#064e3b" /></>)
const Shades = () => (<g><rect x="85" y="89" width="21" height="14" rx="5" fill="#1f2937" /><rect x="114" y="89" width="21" height="14" rx="5" fill="#1f2937" /><path d="M 106 93 Q 110 91 114 93" stroke="#1f2937" strokeWidth="3" fill="none" /><path d="M 85 92 L 74 88" stroke="#1f2937" strokeWidth="2.5" /><path d="M 135 92 L 146 88" stroke="#1f2937" strokeWidth="2.5" /><path d="M 89 95 Q 93 92 99 95" stroke="#fff" strokeWidth="2" fill="none" opacity="0.6" /></g>)
const Zzz = () => (<g fill="#9ca3af" fontFamily="sans-serif" fontWeight="bold"><text x="150" y="78" fontSize="13">z</text><text x="160" y="66" fontSize="17">Z</text><text x="173" y="52" fontSize="21">Z</text></g>)

function PoseBehind({ e }) {
  switch (e) {
    case 'celebrating': return (<><ArmL x={34} y={96} /><ArmR x={186} y={96} /></>)
    case 'standing': return (<><Legs /><ArmL x={34} y={96} /><ArmR x={186} y={96} /></>)
    case 'sitting': return <Feet />
    case 'angel': return <Wings />
    case 'thumbsup': return (<><ArmR x={187} y={108} /><rect x="182" y="88" width="7" height="16" rx="3.5" fill="#10b981" /></>)
    case 'eating': return (<><ArmR x={185} y={112} /><g stroke="#9ca3af" strokeWidth="2.4" strokeLinecap="round"><line x1="181" y1="108" x2="181" y2="84" /><line x1="187" y1="108" x2="187" y2="84" /><line x1="193" y1="108" x2="193" y2="84" /></g><rect x="179" y="106" width="16" height="6" rx="3" fill="#9ca3af" /></>)
    case 'rich': return (<><ArmR x={187} y={114} /><g transform="translate(187 98) rotate(-12)"><rect x="-20" y="-12" width="40" height="22" rx="2" fill="#22c55e" stroke="#14532d" strokeWidth="1" /><text x="0" y="5" fontSize="14" fontWeight="900" fontFamily="sans-serif" fill="#14532d" textAnchor="middle">$</text></g></>)
    case 'relaxing': return (<><ArmL x={33} y={116} /><g transform="translate(29 98)"><path d="M -10 -2 L 10 -2 L 7 22 L -7 22 Z" fill="#7dd3fc" opacity="0.7" stroke="#0ea5e9" strokeWidth="1.5" /><line x1="6" y1="-10" x2="2" y2="0" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" /></g></>)
    default: return null
  }
}

function PoseFace({ e }) {
  const open = (<><circle cx="96" cy="96" r="8.5" fill="#fff" stroke="#1f2937" strokeWidth="1.5" /><circle cx="124" cy="96" r="8.5" fill="#fff" stroke="#1f2937" strokeWidth="1.5" /><circle cx="97" cy="97" r="4.2" fill="#1f2937" /><circle cx="125" cy="97" r="4.2" fill="#1f2937" /><circle cx="94.5" cy="94" r="1.7" fill="#fff" /><circle cx="122.5" cy="94" r="1.7" fill="#fff" /></>)
  const closed = (<><path d="M 88 97 Q 96 103 104 97" stroke="#1f2937" strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M 116 97 Q 124 103 132 97" stroke="#1f2937" strokeWidth="3" fill="none" strokeLinecap="round" /></>)
  const wide = (<><circle cx="96" cy="95" r="10.5" fill="#fff" stroke="#1f2937" strokeWidth="1.5" /><circle cx="124" cy="95" r="10.5" fill="#fff" stroke="#1f2937" strokeWidth="1.5" /><circle cx="96" cy="96" r="5" fill="#1f2937" /><circle cx="124" cy="96" r="5" fill="#1f2937" /><circle cx="93.5" cy="92.5" r="2" fill="#fff" /><circle cx="121.5" cy="92.5" r="2" fill="#fff" /></>)
  const smile = (<path d="M 101 114 Q 110 122 119 114" stroke="#1f2937" strokeWidth="3.2" fill="none" strokeLinecap="round" />)
  const grin = (<><path d="M 99 112 Q 110 130 121 112 Z" fill="#1f2937" /><path d="M 101 112 L 119 112 L 117 117 Q 110 120 103 117 Z" fill="#fff" /><ellipse cx="110" cy="123" rx="5" ry="3" fill="#fb6f8a" /></>)
  const smallO = (<ellipse cx="110" cy="116" rx="4.5" ry="5.5" fill="#1f2937" />)
  const sleepDot = (<ellipse cx="110" cy="116" rx="4" ry="3" fill="#1f2937" />)
  switch (e) {
    case 'sleepy': case 'sleeping': return (<>{closed}{sleepDot}</>)
    case 'surprised': return (<>{wide}{smallO}</>)
    case 'celebrating': case 'eating': case 'standing': return (<>{open}{grin}</>)
    case 'angel': return (<>{closed}{smile}</>)
    case 'relaxing': case 'rich': return smile // eyes are hidden by the shades
    default: return (<>{open}{smile}</>)
  }
}

function PoseFront({ e }) {
  switch (e) {
    case 'celebrating': return (<><PoseSparkle x={44} y={64} s={0.8} /><PoseSparkle x={182} y={72} s={0.95} /><PoseSparkle x={110} y={30} s={0.85} /></>)
    case 'angel': return <ellipse cx="110" cy="18" rx="20" ry="6" fill="none" stroke="#fcd34d" strokeWidth="4" />
    case 'relaxing': case 'rich': return <Shades />
    case 'sleepy': case 'sleeping': return <Zzz />
    default: return null
  }
}

export function GuacMascotLegacy({ expression = 'happy', size = 140, className = '' }) {
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
        <radialGradient id="guacFlesh" cx="50%" cy="44%" r="68%">
          <stop offset="0%"   stopColor="#f6ed8a" />
          <stop offset="38%"  stopColor="#e7ec8e" />
          <stop offset="72%"  stopColor="#b4d35f" />
          <stop offset="100%" stopColor="#84cc16" />
        </radialGradient>
        <radialGradient id="guacPit" cx="38%" cy="32%" r="75%">
          <stop offset="0%"   stopColor="#fcd34d" />
          <stop offset="50%"  stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
      </defs>

      {/* Leaf */}
      <g transform="translate(120 24) rotate(-22)">
        <ellipse cx="0" cy="0" rx="9" ry="20" fill="#65a30d" />
        <path d="M 0 -16 Q 4 0 0 16" stroke="#3f6212" strokeWidth="1.4" fill="none" />
      </g>
      <rect x="106" y="30" width="3" height="14" rx="1.5" fill="#3f6212" />

      {/* Body — proper avocado silhouette: narrow neck up top, round bulb at bottom */}
      <path d="M 110 43.4
               C 86 43.4, 80 58.6, 80 81.4
               C 80 102.3, 64 117.5, 52 142.2
               C 38 172.6, 40 208.7, 74 231.5
               C 92 246.7, 128 246.7, 146 231.5
               C 180 208.7, 182 172.6, 168 142.2
               C 156 117.5, 140 102.3, 140 81.4
               C 140 58.6, 134 43.4, 110 43.4 Z"
            fill="url(#guacBody)" />

      {/* Subtle skin highlight along the upper-left */}
      <path d="M 80 74
               C 72 100, 64 130, 60 158"
            stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.16" />

      {/* Flesh (lighter green inset) — same silhouette, scaled in */}
      <path d="M 110 53.8
               C 88.4 53.8, 83 67.5, 83 88
               C 83 106.8, 68.6 120.5, 57.8 142.7
               C 45.2 170.1, 47 202.6, 77.6 223.3
               C 93.8 236.9, 126.2 236.9, 142.4 223.3
               C 173 202.6, 174.8 170.1, 162.2 142.7
               C 151.4 120.5, 137 106.8, 137 88
               C 137 67.5, 131.6 53.8, 110 53.8 Z"
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

      {/* Standing: full-body pose — two green arms with hands raised in a
          cheer + two little legs with feet. Drawn as additive overlays on
          top of the LOCKED body (same approach as `sitting` feet and the
          `eating` arm), so the brand silhouette itself is never touched.
          Bold arm thickness nods to the flex / maracas reference art. */}
      {expression === 'standing' && (
        <g>
          {/* Legs + feet — poke out the bottom of the bulb */}
          <g>
            {/* Left leg */}
            <rect x="89"  y="236" width="15" height="28" rx="7.5" fill="#047857" />
            <ellipse cx="91"  cy="265" rx="15" ry="7.5" fill="#064e3b" />
            {/* Right leg */}
            <rect x="116" y="236" width="15" height="28" rx="7.5" fill="#047857" />
            <ellipse cx="129" cy="265" rx="15" ry="7.5" fill="#064e3b" />
          </g>

          {/* Left arm — raised up and out */}
          <path d="M 60 188
                   C 44 172, 32 150, 27 128
                   C 25 120, 31 116, 36 121
                   C 42 142, 52 164, 68 180 Z"
                fill="#047857" />
          {/* Left hand */}
          <circle cx="31" cy="120" r="11" fill="#fde68a" stroke="#b45309" strokeWidth="1.2" strokeOpacity="0.45" />
          <g stroke="#b45309" strokeWidth="1" strokeOpacity="0.4" strokeLinecap="round">
            <line x1="26" y1="113" x2="24" y2="107" />
            <line x1="31" y1="111" x2="31" y2="105" />
            <line x1="36" y1="113" x2="38" y2="107" />
          </g>

          {/* Right arm — raised up and out (mirror) */}
          <path d="M 160 188
                   C 176 172, 188 150, 193 128
                   C 195 120, 189 116, 184 121
                   C 178 142, 168 164, 152 180 Z"
                fill="#047857" />
          {/* Right hand */}
          <circle cx="189" cy="120" r="11" fill="#fde68a" stroke="#b45309" strokeWidth="1.2" strokeOpacity="0.45" />
          <g stroke="#b45309" strokeWidth="1" strokeOpacity="0.4" strokeLinecap="round">
            <line x1="184" y1="113" x2="182" y2="107" />
            <line x1="189" y1="111" x2="189" y2="105" />
            <line x1="194" y1="113" x2="196" y2="107" />
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

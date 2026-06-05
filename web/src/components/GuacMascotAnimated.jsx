'use client'

// GuacMascotAnimated — our avocado mascot in three looping "action"
// animations, built entirely from OUR character (the GuacMascotAlt
// layout: face up top on a widened neck, seed as a belly), NOT the
// stock cartoon avocados. Arms are additive overlays drawn behind the
// body, so the brand silhouette underneath is unchanged.
//
//   <GuacMascotAnimated animation="wave"    size={140} />   // “have a nice day” — gentle bob + hand wave
//   <GuacMascotAnimated animation="flex"    size={140} />   // muscle flex — both arms pump, body bounces
//   <GuacMascotAnimated animation="maracas" size={140} />   // fiesta — white round eyes, tongue-out grin,
//                                                           //          maracas raised, jump → grounded shake
//
// The whole character (arms + body) lives in a `.gma-move` group so the
// hands move WITH the body, and each arm ALSO animates on top of that.
// Pure CSS keyframes (no deps, no canvas). Honors prefers-reduced-motion
// by falling back to the rest pose.
//
// 🔒 FINALIZED 2026-06-04 (user-approved) — the `maracas` variant is THE
// final mascot: white round eyes (+pupil+glint), glossy amber seed, slim
// curled green arms with darker-green mitten fists gripping the maracas,
// jump → hold → grounded down-swing → blink. Locked — ASK FIRST before
// changing the maracas variant.
export default function GuacMascotAnimated({ animation = 'wave', size = 140, className = '' }) {
  const a = ['wave', 'flex', 'maracas', 'search', 'idle', 'flip'].includes(animation) ? animation : 'wave'
  const s = a // gradient-id suffix, unique per animation

  return (
    <svg
      viewBox="0 0 220 290"
      width={size}
      height={size * (290 / 220)}
      className={`gma-anim gma-${a} select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`gb-${s}`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#064e3b" />
        </radialGradient>
        <radialGradient id={`gf-${s}`} cx="50%" cy="44%" r="68%">
          <stop offset="0%" stopColor="#f6ed8a" />
          <stop offset="38%" stopColor="#e7ec8e" />
          <stop offset="72%" stopColor="#b4d35f" />
          <stop offset="100%" stopColor="#84cc16" />
        </radialGradient>
        <radialGradient id={`gp-${s}`} cx="38%" cy="34%" r="78%">
          <stop offset="0%" stopColor="#dca838" />
          <stop offset="48%" stopColor="#a8590a" />
          <stop offset="100%" stopColor="#54260c" />
        </radialGradient>
        {a === 'maracas' && (
          <radialGradient id={`gmar-${s}`} cx="38%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ff7a6b" />
            <stop offset="60%" stopColor="#f4564a" />
            <stop offset="100%" stopColor="#d83b34" />
          </radialGradient>
        )}
        {a === 'search' && (
          <radialGradient id={`glass-${s}`} cx="36%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.45" />
          </radialGradient>
        )}
      </defs>

      {/* Whole character hops/sways as one unit → hands move WITH the body */}
      <g className="gma-move">
        {/* Arms sit BEHIND the body so they emerge from the sides */}
        <Arms animation={a} suffix={s} />

        <g className="gma-body">
          {/* Stem + pointed leaf */}
          <path d="M 110 45 C 110 36, 114 29, 121 27" stroke="#6b4226" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <path d="M 109 41 C 99 27, 80 24, 71 33 C 78 45, 98 47, 109 41 Z" fill="#5cbf6f" />
          <path d="M 105 41 Q 88 38, 73 33" stroke="#3f9a52" strokeWidth="1.4" fill="none" opacity="0.7" />

          {/* Body */}
          <path
            d="M 110 42 C 84 42, 76 58, 74 82 C 72 103, 62 118, 52 142.2 C 38 172.6, 40 208.7, 74 231.5 C 92 246.7, 128 246.7, 146 231.5 C 180 208.7, 182 172.6, 168 142.2 C 158 118, 148 103, 146 82 C 144 58, 136 42, 110 42 Z"
            fill={`url(#gb-${s})`}
          />
          {/* Skin highlight */}
          <path d="M 78 70 C 70 96, 62 124, 58 152" stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.16" />
          {/* Flesh */}
          <path
            d="M 110 52 C 87 52, 80 66, 78 88 C 76 107, 66 120.5, 57.8 142.7 C 45.2 170.1, 47 202.6, 77.6 223.3 C 93.8 236.9, 126.2 236.9, 142.4 223.3 C 173 202.6, 174.8 170.1, 162.2 142.7 C 154 120.5, 144 107, 142 88 C 140 66, 133 52, 110 52 Z"
            fill={`url(#gf-${s})`}
          />
          {/* Seed/belly */}
          <ellipse cx="110" cy="178" rx="38" ry="40" fill={`url(#gp-${s})`} />
          <ellipse cx="96" cy="166" rx="9" ry="5" fill="#f3e0ad" opacity="0.32" />
          {/* Cheeks */}
          <circle cx="75" cy="106" r="5.5" fill="#fb7185" opacity="0.5" />
          <circle cx="145" cy="106" r="5.5" fill="#fb7185" opacity="0.5" />

          {/* Face — varies per animation */}
          <Face animation={a} />
        </g>
      </g>

      <style dangerouslySetInnerHTML={{ __html: `
        .gma-move,
        .gma-armL,
        .gma-armR,
        .gma-eyes {
          transform-box: fill-box;
        }
        /* ---- WAVE ---- */
        .gma-wave .gma-move {
          transform-origin: 50% 92%;
          animation: gma-wave-bob 2.4s ease-in-out infinite;
        }
        .gma-wave .gma-armR {
          transform-origin: 88% 84%;
          animation: gma-wave-hand 0.7s ease-in-out infinite;
        }
        @keyframes gma-wave-bob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(-2deg); }
        }
        @keyframes gma-wave-hand {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(-34deg); }
        }
        /* ---- FLEX ---- */
        .gma-flex .gma-move {
          transform-origin: 50% 92%;
          animation: gma-flex-bounce 0.9s ease-in-out infinite;
        }
        .gma-flex .gma-armL {
          transform-origin: 92% 88%;
          animation: gma-flex-pumpL 0.9s ease-in-out infinite;
        }
        .gma-flex .gma-armR {
          transform-origin: 8% 88%;
          animation: gma-flex-pumpR 0.9s ease-in-out infinite;
        }
        @keyframes gma-flex-bounce {
          0%, 100% { transform: translateY(0) scale(1, 1); }
          50% { transform: translateY(-4px) scale(1.03, 0.97); }
        }
        @keyframes gma-flex-pumpL {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          50% { transform: rotate(6deg) translateY(-3px); }
        }
        @keyframes gma-flex-pumpR {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          50% { transform: rotate(-6deg) translateY(-3px); }
        }
        /* ---- MARACAS ---- (one jump per loop → grounded maraca shake + blink) */
        .gma-maracas .gma-move {
          transform-origin: 50% 96%;
          animation: gma-mar-jump 3.4s ease-in-out infinite;
        }
        .gma-maracas .gma-armL {
          transform-origin: 90% 96%;
          animation: gma-mar-shakeL 3.4s ease-in-out infinite;
        }
        .gma-maracas .gma-armR {
          transform-origin: 10% 96%;
          animation: gma-mar-shakeR 3.4s ease-in-out infinite;
        }
        .gma-maracas .gma-eyes {
          transform-origin: center;
          animation: gma-mar-blink 3.4s ease-in-out infinite;
        }
        @keyframes gma-mar-jump {
          0%   { transform: translateY(0) scaleY(1); }
          6%   { transform: translateY(-34px) scaleY(1.05); }
          14%  { transform: translateY(0) scaleY(1); }
          18%  { transform: translateY(0) scaleY(0.92); }
          24%  { transform: translateY(0) scaleY(1); }
          100% { transform: translateY(0) scaleY(1); }
        }
        /* still during the jump (0–24%), then swing DOWN toward horizontal while grounded */
        @keyframes gma-mar-shakeL {
          0%, 24% { transform: rotate(0deg); }
          42% { transform: rotate(-30deg); }
          60% { transform: rotate(-8deg); }
          78% { transform: rotate(-30deg); }
          96% { transform: rotate(-8deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes gma-mar-shakeR {
          0%, 24% { transform: rotate(0deg); }
          42% { transform: rotate(30deg); }
          60% { transform: rotate(8deg); }
          78% { transform: rotate(30deg); }
          96% { transform: rotate(8deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes gma-mar-blink {
          0%, 40%, 47%, 66%, 73%, 100% { transform: scaleY(1); }
          43.5%, 69.5% { transform: scaleY(0.12); }
        }
        /* ---- SEARCH ---- (gentle bob; magnifier arm sweeps to scan) */
        .gma-search .gma-move {
          transform-origin: 50% 92%;
          animation: gma-search-bob 3s ease-in-out infinite;
        }
        .gma-search .gma-armR {
          transform-origin: 8% 96%;
          animation: gma-search-sweep 2.4s ease-in-out infinite;
        }
        @keyframes gma-search-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes gma-search-sweep {
          0%, 100% { transform: rotate(-7deg); }
          50% { transform: rotate(7deg); }
        }
        /* ---- IDLE ---- (base mascot: soft breathe + occasional blink) */
        .gma-idle .gma-move {
          transform-origin: 50% 96%;
          animation: gma-idle-breathe 4s ease-in-out infinite;
        }
        .gma-idle .gma-eyes {
          transform-origin: center;
          animation: gma-idle-blink 4s ease-in-out infinite;
        }
        @keyframes gma-idle-breathe {
          0%, 100% { transform: scale(1, 1); }
          50% { transform: scale(1.015, 1.025); }
        }
        @keyframes gma-idle-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          96% { transform: scaleY(0.12); }
        }
        /* ---- FLIP ---- (base mascot does a full 360° 3D flip, then holds) */
        .gma-flip .gma-move {
          transform-origin: 50% 52%;
          animation: gma-flip 2.6s ease-in-out infinite;
        }
        @keyframes gma-flip {
          0%       { transform: perspective(600px) rotateY(0deg); }
          55%, 100% { transform: perspective(600px) rotateY(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gma-move,
          .gma-armL,
          .gma-armR,
          .gma-eyes {
            animation: none !important;
          }
        }
      ` }} />
    </svg>
  )
}

function Arms({ animation, suffix }) {
  if (animation === 'idle' || animation === 'flip') return null // base mascot, no arms
  if (animation === 'flex') {
    return (
      <>
        <g className="gma-armL">
          <path d="M 72 150 Q 42 150 38 116 Q 38 92 58 86" stroke="#10b981" strokeWidth="16" fill="none" strokeLinecap="round" />
          <circle cx="58" cy="86" r="11" fill="#10b981" />
        </g>
        <g className="gma-armR">
          <path d="M 148 150 Q 178 150 182 116 Q 182 92 162 86" stroke="#10b981" strokeWidth="16" fill="none" strokeLinecap="round" />
          <circle cx="162" cy="86" r="11" fill="#34d399" />
        </g>
      </>
    )
  }
  if (animation === 'maracas') {
    // Arms raised, maracas held up — our mascot green; matches the fiesta pose
    return (
      <>
        <g className="gma-armL">
          <path d="M 76 150 C 54 140, 38 124, 32 116" stroke="#10b981" strokeWidth="12" fill="none" strokeLinecap="round" />
          <Maraca cx={32} cy={78} hx={32} hy={116} rot={-26} suffix={suffix} />
          {/* clean fist gripping the handle */}
          <circle cx="32" cy="116" r="10" fill="#10b981" />
          <path d="M 25 113 Q 32 109 39 114" stroke="#0c8f63" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
          <circle cx="32" cy="116" r="10" fill="none" stroke="#0c8f63" strokeWidth="1.4" opacity="0.3" />
        </g>
        <g className="gma-armR">
          <path d="M 144 150 C 166 140, 182 124, 188 116" stroke="#10b981" strokeWidth="12" fill="none" strokeLinecap="round" />
          <Maraca cx={188} cy={78} hx={188} hy={116} rot={26} suffix={suffix} />
          {/* clean fist gripping the handle */}
          <circle cx="188" cy="116" r="10" fill="#10b981" />
          <path d="M 181 113 Q 188 109 195 114" stroke="#0c8f63" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
          <circle cx="188" cy="116" r="10" fill="none" stroke="#0c8f63" strokeWidth="1.4" opacity="0.3" />
        </g>
      </>
    )
  }
  if (animation === 'search') {
    return (
      <>
        {/* left arm — long, resting down-and-out */}
        <g className="gma-armL">
          <path d="M 74 150 C 54 160, 40 168, 30 180" stroke="#10b981" strokeWidth="12" fill="none" strokeLinecap="round" />
          <circle cx="29" cy="181" r="10" fill="#047857" />
        </g>
        {/* right arm — long, raised holding the magnifying glass high */}
        <g className="gma-armR">
          <path d="M 146 150 C 166 130, 180 110, 184 96" stroke="#10b981" strokeWidth="12" fill="none" strokeLinecap="round" />
          <line x1="186" y1="98" x2="200" y2="82" stroke="#4b5563" strokeWidth="7" strokeLinecap="round" />
          <circle cx="194" cy="62" r="17" fill={`url(#glass-${suffix})`} stroke="#374151" strokeWidth="5" />
          <path d="M 186 56 Q 190 50 197 50" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
          <circle cx="184" cy="96" r="10" fill="#047857" />
          <circle cx="184" cy="96" r="10" fill="none" stroke="#02402f" strokeWidth="1.4" opacity="0.35" />
        </g>
      </>
    )
  }
  // wave (default): right arm raised, left arm resting
  return (
    <>
      <g className="gma-armL">
        <path d="M 70 150 Q 48 180 44 204" stroke="#10b981" strokeWidth="15" fill="none" strokeLinecap="round" />
        <circle cx="44" cy="205" r="10" fill="#10b981" />
      </g>
      <g className="gma-armR">
        <path d="M 150 148 Q 180 120 188 82" stroke="#10b981" strokeWidth="15" fill="none" strokeLinecap="round" />
        <circle cx="189" cy="80" r="11" fill="#34d399" />
      </g>
    </>
  )
}

function Maraca({ cx, cy, hx, hy, rot, suffix }) {
  // Egg at (cx,cy), brown handle running down to the hand at (hx,hy),
  // the whole thing tilted `rot` degrees about the hand.
  return (
    <g transform={`rotate(${rot} ${hx} ${hy})`}>
      <path d={`M ${hx + (hx - cx) * 0.42} ${hy + (hy - cy) * 0.42} L ${cx + 1} ${cy + 10}`} stroke="#7a3b1f" strokeWidth="6" fill="none" strokeLinecap="round" />
      <ellipse cx={cx} cy={cy} rx="15" ry="19" fill={`url(#gmar-${suffix})`} />
      <path d={`M ${cx - 13} ${cy + 4} Q ${cx} ${cy + 10} ${cx + 13} ${cy - 6}`} stroke="#f9a826" strokeWidth="6" fill="none" />
      <ellipse cx={cx - 6} cy={cy - 8} rx="4" ry="6" fill="#fff" opacity="0.45" />
    </g>
  )
}

function Face({ animation }) {
  if (animation === 'flex') {
    return (
      <>
        {/* squint >< eyes */}
        <g stroke="#1f2937" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M 88 90 L 96 94 L 88 98" />
          <path d="M 132 90 L 124 94 L 132 98" />
        </g>
        {/* open grin */}
        <path d="M 100 112 Q 110 130, 120 112 Z" fill="#1f2937" />
        <ellipse cx="110" cy="118" rx="4" ry="3" fill="#fb7185" />
      </>
    )
  }
  if (animation === 'maracas') {
    return (
      <>
        {/* our mascot white eyes (blink via .gma-eyes) */}
        <g className="gma-eyes">
          <circle cx="96" cy="96" r="8.5" fill="#fff" stroke="#1f2937" strokeWidth="1.5" />
          <circle cx="124" cy="96" r="8.5" fill="#fff" stroke="#1f2937" strokeWidth="1.5" />
          <circle cx="97" cy="97" r="4.2" fill="#1f2937" />
          <circle cx="125" cy="97" r="4.2" fill="#1f2937" />
          <circle cx="94.5" cy="94" r="1.7" fill="#fff" />
          <circle cx="122.5" cy="94" r="1.7" fill="#fff" />
        </g>
        {/* tongue-out grin */}
        <path d="M 101 114 Q 110 129 119 114 Z" fill="#1f2937" />
        <ellipse cx="110" cy="122" rx="5" ry="3.5" fill="#fb6f8a" />
      </>
    )
  }
  if (animation === 'idle' || animation === 'flip') {
    return (
      <>
        {/* base mascot — white eyes (blink via .gma-eyes) + gentle smile */}
        <g className="gma-eyes">
          <circle cx="96" cy="96" r="8.5" fill="#fff" stroke="#1f2937" strokeWidth="1.5" />
          <circle cx="124" cy="96" r="8.5" fill="#fff" stroke="#1f2937" strokeWidth="1.5" />
          <circle cx="97" cy="97" r="4.2" fill="#1f2937" />
          <circle cx="125" cy="97" r="4.2" fill="#1f2937" />
          <circle cx="94.5" cy="94" r="1.7" fill="#fff" />
          <circle cx="122.5" cy="94" r="1.7" fill="#fff" />
        </g>
        <path d="M 101 114 Q 110 122 119 114" stroke="#1f2937" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      </>
    )
  }
  if (animation === 'search') {
    return (
      <>
        {/* white eyes looking up toward the glass + curious smile */}
        <circle cx="96" cy="96" r="8.5" fill="#fff" stroke="#1f2937" strokeWidth="1.5" />
        <circle cx="124" cy="96" r="8.5" fill="#fff" stroke="#1f2937" strokeWidth="1.5" />
        <circle cx="98" cy="93" r="4.2" fill="#1f2937" />
        <circle cx="127" cy="93" r="4.2" fill="#1f2937" />
        <circle cx="95.5" cy="90.5" r="1.7" fill="#fff" />
        <circle cx="124.5" cy="90.5" r="1.7" fill="#fff" />
        <path d="M 103 115 Q 110 121 117 115" stroke="#1f2937" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      </>
    )
  }
  // wave (default): happy eyes + smile
  return (
    <>
      <g>
        <circle cx="95" cy="94" r="8" fill="white" stroke="#1f2937" strokeWidth="1" />
        <circle cx="125" cy="94" r="8" fill="white" stroke="#1f2937" strokeWidth="1" />
        <circle cx="96" cy="95" r="4" fill="#1f2937" />
        <circle cx="126" cy="95" r="4" fill="#1f2937" />
        <circle cx="94" cy="92.5" r="1.6" fill="white" />
        <circle cx="124" cy="92.5" r="1.6" fill="white" />
      </g>
      <path d="M 101 114 Q 110 123, 119 114" stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </>
  )
}

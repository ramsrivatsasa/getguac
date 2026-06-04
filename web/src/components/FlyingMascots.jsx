'use client'
// FlyingMascots — composes N mascots translating across a horizontal
// track, like a flock of avocados breezing through. Pure composition
// of the locked GuacMascot (no changes to the mascot character itself
// — see feedback_mascot_locked memory).
//
// Use:
//   <FlyingMascots count={6} height={120} />
//   <FlyingMascots count={4} height={160} direction="ltr" loop bob />
//
// Props:
//   count       number of mascots in the flock (default 6)
//   height      track height in px (default 120). Mascots scale to fit.
//   direction   'ltr' | 'rtl' | 'auto' (mixed). default 'ltr'.
//   bob         when true, each mascot also bobs vertically (sin wave)
//               during flight. Default true.
//   loop        when true, animations repeat forever. Default true.
//   className   forwarded to the track wrapper.
//
// Each mascot picks deterministic-by-index variants for:
//   - mood (happy / relaxing / rich, rotating through)
//   - size (proportional to height, varying ±15%)
//   - y offset (band within track height)
//   - duration (8-16s, varying)
//   - delay (staggered so flock spreads out)
//   - rotation (-8° to +8°, suggesting forward lean)
//
// Respects prefers-reduced-motion — renders a static row of mascots
// when reduce-motion is set instead of flying them.

import { useEffect, useRef, useState } from 'react'
import GuacMascot from './GuacMascot'

const MOODS = ['happy', 'relaxing', 'rich']

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  try { return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true }
  catch { return false }
}

// Deterministic pseudo-random per index — same N always produces the
// same flock so SSR + client agree.
function seeded(i, salt) {
  const h = ((i + 1) * 2654435761 + salt * 16777619) >>> 0
  return (h % 10000) / 10000
}

export default function FlyingMascots({
  count = 6,
  height = 120,
  direction = 'ltr',
  bob = true,
  loop = true,
  className = '',
}) {
  const trackRef = useRef(null)
  const reduced = useReducedMotion()

  // Build the flock once per (count, direction, height) tuple.
  const flock = []
  for (let i = 0; i < count; i++) {
    const sizeMul = 0.85 + seeded(i, 1) * 0.30           // 0.85x → 1.15x
    const mascotSize = Math.round(height * 0.75 * sizeMul)
    const yPct = 5 + seeded(i, 2) * 70                    // 5% → 75% of track height
    const duration = 8 + seeded(i, 3) * 8                 // 8 → 16 s
    const delay = -1 * seeded(i, 4) * duration             // negative delay so flock is already mid-flight on mount
    const rotation = -8 + seeded(i, 5) * 16                // -8° → +8°
    const mood = MOODS[i % MOODS.length]
    // Direction: rtl mascots get a flipped translate keyframe AND a
    // scaleX(-1) so the (asymmetric) avocado faces the way it's moving.
    const dir = direction === 'auto'
      ? (seeded(i, 6) > 0.5 ? 'ltr' : 'rtl')
      : direction
    flock.push({ i, mascotSize, yPct, duration, delay, rotation, mood, dir })
  }

  // Reduced-motion: render a stationary row of mascots, no animation.
  if (reduced) {
    return (
      <div
        className={`flying-mascots-static relative w-full overflow-hidden ${className}`}
        style={{ height }}
        aria-hidden="true"
      >
        {flock.map(m => (
          <span
            key={m.i}
            className="absolute"
            style={{
              left: `${(m.i / Math.max(1, count - 1)) * 90}%`,
              top: `${m.yPct}%`,
              transform: `translate(-50%, -50%) rotate(${m.rotation}deg)`,
            }}
          >
            <GuacMascot expression={m.mood} size={m.mascotSize} />
          </span>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={trackRef}
      className={`flying-mascots-track relative w-full overflow-hidden ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      {flock.map(m => (
        <FlyingMascot key={m.i} mascot={m} loop={loop} bob={bob} />
      ))}

      {/* Scoped styles via styled-jsx — keyframes for the fly + bob.
          The fly translates from one edge to the other; bob is an
          independent translateY sin wave that composes on top. */}
      <style jsx>{`
        .flying-mascot-host {
          position: absolute;
          will-change: transform, opacity;
          /* Soft fade-in at the entry edge, fade-out at the exit edge,
             so the mascot doesn't suddenly appear / disappear at the
             viewport bounds. */
          animation-fill-mode: both;
          opacity: 0;
        }

        @keyframes flying-mascot-fly-ltr {
          0%   { opacity: 0; transform: translate(-110%, 0); }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { opacity: 0; transform: translate(110%, 0); }
        }
        @keyframes flying-mascot-fly-rtl {
          0%   { opacity: 0; transform: translate(110%, 0); }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-110%, 0); }
        }
        @keyframes flying-mascot-bob {
          0%, 100% { margin-top: 0; }
          50%      { margin-top: -8%; }
        }
        /* The mascot is wrapped in two layers so fly + bob compose
           cleanly: outer span = fly (translate X), inner span = bob
           (margin-top sin) + scaleX flip + rotation. */
      `}</style>
    </div>
  )
}

function FlyingMascot({ mascot, loop, bob }) {
  const m = mascot
  const animName = m.dir === 'rtl' ? 'flying-mascot-fly-rtl' : 'flying-mascot-fly-ltr'
  return (
    <span
      className="flying-mascot-host"
      style={{
        top: `${m.yPct}%`,
        // Width 0 so left:50% + transform centers each mascot's track
        // around mid-screen before the keyframe shoves it off-screen.
        left: '50%',
        width: 0,
        animationName: animName,
        animationDuration: `${m.duration}s`,
        animationDelay: `${m.delay}s`,
        animationTimingFunction: 'linear',
        animationIterationCount: loop ? 'infinite' : 1,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          // Center the mascot on the host's 0-width centroid.
          transform: `translate(-50%, -50%) scaleX(${m.dir === 'rtl' ? -1 : 1}) rotate(${m.rotation}deg)`,
          animation: bob ? `flying-mascot-bob ${m.duration / 3.5}s ease-in-out ${m.delay}s infinite` : 'none',
        }}
      >
        <GuacMascot expression={m.mood} size={m.mascotSize} />
      </span>
    </span>
  )
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => { setReduced(prefersReducedMotion()) }, [])
  return reduced
}


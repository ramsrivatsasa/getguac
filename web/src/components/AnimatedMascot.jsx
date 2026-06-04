'use client'

// Wraps the static GuacMascot SVG with subtle event-driven animations
// using the Web Animations API (element.animate(...)) — no
// framer-motion, no new deps. Matches the Dart AnimatedMascot on
// mobile so the two platforms feel identical.
//
// Listens to the global mascotEventBus. On bounce / wiggle / pulse /
// celebrate it runs the corresponding animation. `celebrate` also
// paints a 12-dot confetti burst on a sibling <canvas> overlay.
//
// Layout note: the wrapper renders as an inline-block sized exactly
// to the underlying GuacMascot so it can be swapped in anywhere
// GuacMascot was — including tight rows like the sidebar brand
// square — without reflowing siblings. The confetti canvas overlays
// the mascot using absolute positioning and a generous bounding box
// so dots can drift outside the mascot's footprint.
//
// Idle: when `idle` is true, the mascot gently breathes (scale
// 1 → 1.02 → 1 over 4s) on an infinite loop. Google-Doodle "alive"
// feel without being noisy.

import { useEffect, useRef } from 'react'
import GuacMascot from './GuacMascot'
import mascotBus from '../lib/mascotEventBus'

const CONFETTI_COLORS = ['#15803d', '#a3e635', '#facc15', '#f472b6', '#60a5fa']

// SSR-safe reduced-motion check. matchMedia is undefined during
// server rendering; default to "respect motion" so the SSR output is
// never falsely accessibility-friendly.
function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  try { return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true }
  catch { return false }
}

export default function AnimatedMascot({
  expression = 'happy',
  size = 140,
  idle = false,
  className = '',
}) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const idleAnimRef = useRef(null)
  // Track the current event-animation so a new event can cancel it
  // mid-flight — otherwise rapid event spam stacks WAAPI animations on
  // the same property and the visual gets stuck on the last frame.
  const eventAnimRef = useRef(null)
  const confettiRafRef = useRef(null)

  useEffect(() => {
    return mascotBus.subscribe((ev) => {
      // Accessibility: respect prefers-reduced-motion. Subscribers in
      // other parts of the app still fire (they may have non-motion
      // side effects), but the mascot itself stays still.
      if (prefersReducedMotion()) return
      const el = wrapRef.current
      if (!el) return
      // Cancel any prior event animation before starting a new one.
      try { eventAnimRef.current?.cancel() } catch (_) {}
      switch (ev.animation) {
        case 'bounce':   eventAnimRef.current = playBounce(el); return
        case 'wiggle':   eventAnimRef.current = playWiggle(el); return
        case 'pulse':    eventAnimRef.current = playPulse(el);  return
        case 'spin':     eventAnimRef.current = playSpin(el);   return
        case 'flip':     eventAnimRef.current = playFlip(el);   return
        case 'jump':     eventAnimRef.current = playJump(el);   return
        case 'dance':    eventAnimRef.current = playDance(el);  return
        case 'celebrate':
          eventAnimRef.current = playBounce(el)
          playWiggle(el)
          confettiRafRef.current = playConfetti(canvasRef.current, size, confettiRafRef)
          return
        default: return
      }
    })
  }, [size])

  // Unmount cleanup — cancel any in-flight animation or RAF loop so
  // the closure doesn't keep referencing a detached canvas / element.
  useEffect(() => {
    return () => {
      try { eventAnimRef.current?.cancel() } catch (_) {}
      if (confettiRafRef.current) cancelAnimationFrame(confettiRafRef.current)
    }
  }, [])

  // Idle breathing — kept separate so event animations stack on top
  // without fighting the idle loop. We pause it briefly during event
  // animations (the event uses `transform`, browsers compose multiple
  // animations on the same property by taking the last-applied, so
  // event animations will visibly win for their duration).
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    if (idle) {
      idleAnimRef.current?.cancel()
      idleAnimRef.current = el.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.02)' },
          { transform: 'scale(1)' },
        ],
        { duration: 4000, iterations: Infinity, easing: 'ease-in-out' },
      )
    } else {
      idleAnimRef.current?.cancel()
      idleAnimRef.current = null
    }
    return () => idleAnimRef.current?.cancel()
  }, [idle])

  return (
    <span
      className={`relative inline-block align-middle ${className}`}
      style={{ width: size, height: size * (280 / 220) }}
    >
      <span
        ref={wrapRef}
        style={{
          display: 'inline-block',
          width: size,
          height: size * (280 / 220),
          transformOrigin: 'center center',
        }}
      >
        <GuacMascot expression={expression} size={size} />
      </span>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        // Generous overlay so confetti can drift past the mascot bounds.
        // pointer-events-none so the canvas never grabs clicks meant
        // for siblings.
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: size * 2.4,
          height: size * 2.4,
          pointerEvents: 'none',
        }}
      />
    </span>
  )
}

// Durations stretched per user request — "animations that run for more
// time". Big bounce + multi-cycle wiggle + a longer pulse give a more
// visible, celebratory beat. Easing curves preserved so the feel
// stays Apple/Google-tasteful, just slower + more emphatic.

function playBounce(el) {
  // Amplified squash-and-stretch — translateY doubled (-12% → -24%)
  // so the mascot visibly leaves the baseline. Squash compression
  // and stretch percentages also pushed for a more "alive" feel.
  return el.animate(
    [
      { transform: 'scaleX(1)    scaleY(1)    translateY(0)' },
      { transform: 'scaleX(0.82) scaleY(1.20) translateY(-24%)', offset: 0.20 },
      { transform: 'scaleX(1.20) scaleY(0.82) translateY(-8%)',  offset: 0.45 },
      { transform: 'scaleX(0.92) scaleY(1.08) translateY(-16%)', offset: 0.65 },
      { transform: 'scaleX(1.06) scaleY(0.94) translateY(0)',    offset: 0.82 },
      { transform: 'scaleX(1)    scaleY(1)    translateY(0)' },
    ],
    { duration: 1800, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  )
}

function playWiggle(el) {
  // Amplified wiggle — translateX bumped ±3% → ±8% so the mascot
  // visibly leans across, not just tilts in place.
  return el.animate(
    [
      { transform: 'rotate(0deg)    translateX(0)' },
      { transform: 'rotate(-14deg)  translateX(-8%)', offset: 0.12 },
      { transform: 'rotate(14deg)   translateX(8%)',  offset: 0.30 },
      { transform: 'rotate(-11deg)  translateX(-6%)', offset: 0.48 },
      { transform: 'rotate(11deg)   translateX(6%)',  offset: 0.66 },
      { transform: 'rotate(-5deg)   translateX(-2%)', offset: 0.82 },
      { transform: 'rotate(2deg)    translateX(0)',   offset: 0.92 },
      { transform: 'rotate(0deg)    translateX(0)' },
    ],
    { duration: 2200, easing: 'ease-in-out' },
  )
}

function playPulse(el) {
  // Heartbeat-style pulse — TUM-tum × 3 over 3.0s, now WITH a bob
  // (translateY) on each TUM so the mascot lifts a little when its
  // heart hits hardest. Previously scale-only; user wanted motion.
  return el.animate(
    [
      { transform: 'scale(1)    translateY(0)' },
      { transform: 'scale(1.12) translateY(-6%)', offset: 0.08 },
      { transform: 'scale(0.98) translateY(0)',   offset: 0.16 },
      { transform: 'scale(1.08) translateY(-3%)', offset: 0.22 },
      { transform: 'scale(1)    translateY(0)',   offset: 0.32 },
      { transform: 'scale(1.12) translateY(-6%)', offset: 0.40 },
      { transform: 'scale(0.98) translateY(0)',   offset: 0.48 },
      { transform: 'scale(1.08) translateY(-3%)', offset: 0.54 },
      { transform: 'scale(1)    translateY(0)',   offset: 0.64 },
      { transform: 'scale(1.12) translateY(-6%)', offset: 0.72 },
      { transform: 'scale(0.98) translateY(0)',   offset: 0.80 },
      { transform: 'scale(1.08) translateY(-3%)', offset: 0.86 },
      { transform: 'scale(1)    translateY(0)' },
    ],
    { duration: 3000, easing: 'ease-in-out' },
  )
}

// === NEW EVENTS ===

function playSpin(el) {
  // Full 360° rotation — fresh / refresh moment. Slight scale dip at
  // the halfway point so it doesn't feel like a uniform wheel.
  return el.animate(
    [
      { transform: 'rotate(0deg)   scale(1)' },
      { transform: 'rotate(180deg) scale(0.92)', offset: 0.5 },
      { transform: 'rotate(360deg) scale(1)' },
    ],
    { duration: 1500, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  )
}

function playFlip(el) {
  // Quick front→back→front via Y-axis 3D flip. perspective set on
  // the element by the wrapper's CSS so the flip looks dimensional.
  return el.animate(
    [
      { transform: 'perspective(600px) rotateY(0deg)' },
      { transform: 'perspective(600px) rotateY(180deg)', offset: 0.5 },
      { transform: 'perspective(600px) rotateY(360deg)' },
    ],
    { duration: 1200, easing: 'cubic-bezier(0.5, 0, 0.5, 1)' },
  )
}

function playJump(el) {
  // High arc — mascot leaves the baseline by ~40% of its height,
  // squashes on landing. Multi-stage so the air time has anticipation
  // (crouch) + apex + landing recovery.
  return el.animate(
    [
      { transform: 'translateY(0)    scaleX(1)    scaleY(1)' },
      { transform: 'translateY(4%)   scaleX(1.10) scaleY(0.88)', offset: 0.12 }, // crouch
      { transform: 'translateY(-40%) scaleX(0.92) scaleY(1.12)', offset: 0.45 }, // apex
      { transform: 'translateY(-30%) scaleX(0.94) scaleY(1.08)', offset: 0.60 }, // descend
      { transform: 'translateY(4%)   scaleX(1.18) scaleY(0.78)', offset: 0.85 }, // squash
      { transform: 'translateY(0)    scaleX(1)    scaleY(1)' },
    ],
    { duration: 1600, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' },
  )
}

function playDance(el) {
  // Side-to-side groove. Combines translateX + rotation + small bob.
  // Two full cycles over 2.4s.
  return el.animate(
    [
      { transform: 'translateX(0)    translateY(0)   rotate(0deg)' },
      { transform: 'translateX(-12%) translateY(-4%) rotate(-10deg)', offset: 0.15 },
      { transform: 'translateX(12%)  translateY(-2%) rotate(10deg)',  offset: 0.35 },
      { transform: 'translateX(-10%) translateY(-4%) rotate(-9deg)',  offset: 0.55 },
      { transform: 'translateX(10%)  translateY(-2%) rotate(9deg)',   offset: 0.75 },
      { transform: 'translateX(-4%)  translateY(0)   rotate(-3deg)',  offset: 0.90 },
      { transform: 'translateX(0)    translateY(0)   rotate(0deg)' },
    ],
    { duration: 2400, easing: 'ease-in-out' },
  )
}

function playConfetti(canvas, size, rafRef) {
  if (!canvas) return null
  // Resize backing store to match displayed size — required for
  // crisp rendering on HiDPI. Done lazily so we don't pay the cost
  // until the canvas is actually painted on.
  const w = size * 2.4
  const h = size * 2.4
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
  canvas.width = w * dpr
  canvas.height = h * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)

  const cx = w / 2
  const cy = h / 2
  // Doubled to 24 dots so the longer animation has visual density
  // throughout its life — fewer dots looked sparse at 2.5s.
  const dots = []
  for (let i = 0; i < 24; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4
    const speed = 90 + Math.random() * 90       // farther travel for the longer window
    dots.push({
      angle,
      speed,
      color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
      size: 5 + Math.random() * 3,
      rotation: Math.random() * Math.PI,
      rotationVel: (Math.random() - 0.5) * 6,
    })
  }

  const start = performance.now()
  const duration = 4000  // bumped 2400→4000ms; user wanted the celebration to land harder

  function frame(now) {
    const progress = Math.min(1, (now - start) / duration)
    ctx.clearRect(0, 0, w, h)
    const fade = 1 - progress
    const ease = 1 - Math.pow(1 - progress, 2)
    for (const d of dots) {
      const dist = d.speed * ease
      const dx = Math.cos(d.angle) * dist
      // Gravity arc gets stronger at the longer duration so dots
      // visibly fall instead of drifting flat off-screen.
      const dy = Math.sin(d.angle) * dist + progress * progress * 80

      ctx.save()
      ctx.globalAlpha = Math.max(0, fade)
      ctx.translate(cx + dx, cy + dy)
      ctx.rotate(d.rotation + d.rotationVel * progress)
      ctx.fillStyle = d.color
      const rw = d.size * 1.6
      const rh = d.size * 0.7
      const rad = d.size * 0.35
      // Rounded-rect confetti — reads as paper, not pellets.
      roundedRect(ctx, -rw / 2, -rh / 2, rw, rh, rad)
      ctx.fill()
      ctx.restore()
    }
    if (progress < 1) {
      // Track the RAF id so the parent's unmount cleanup can cancel it.
      const id = requestAnimationFrame(frame)
      if (rafRef) rafRef.current = id
    } else {
      ctx.clearRect(0, 0, w, h)
      if (rafRef) rafRef.current = null
    }
  }
  const initial = requestAnimationFrame(frame)
  if (rafRef) rafRef.current = initial
  return initial
}

function roundedRect(ctx, x, y, w, h, r) {
  const min = Math.min(w, h) / 2
  if (r > min) r = min
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y,     x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x,     y + h, r)
  ctx.arcTo(x,     y + h, x,     y,     r)
  ctx.arcTo(x,     y,     x + w, y,     r)
  ctx.closePath()
}

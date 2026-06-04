// Animation primitives for GetGuac web — no dependencies, no Framer,
// no GSAP. Just the platform: requestAnimationFrame for numeric
// tweens and the Web Animations API (element.animate) for DOM
// transitions. Respects prefers-reduced-motion at every entry point.
//
// Easing curves are picked to match the Apple/Linear "easeOutQuint /
// easeInOutQuint" baseline — content slides into place quickly then
// settles, no overshoot.
//
// Public surface:
//   - EASE.out / EASE.inOut   cubic-bezier strings
//   - prefersReducedMotion()  boolean checker
//   - tween({ from, to, duration, easing, onUpdate, onDone })
//   - easeOutCubic(t)         math helpers for ad-hoc tweens
//   - shouldAnimate()         convenience wrapper used by primitives

// Apple's easeOutQuint variant — fast attack, soft settle. Use for
// MOST entrances (fades, slides, count-ups). Snappy without snapping.
export const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)'

// Symmetric inOutQuint — for emphasis transitions (a hero number
// counting between two values, a sheet sliding in then out).
export const EASE_IN_OUT = 'cubic-bezier(0.83, 0, 0.17, 1)'

// Slight overshoot — used sparingly for tap reactions and successful
// confirmation pops. NOT for entrances.
export const EASE_BACK_OUT = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

export const EASE = {
  out:     EASE_OUT,
  inOut:   EASE_IN_OUT,
  backOut: EASE_BACK_OUT,
}

// True when the OS / browser has asked for reduced motion. Read on
// every call (not cached) so the user can toggle it without a reload
// and our animations respect the change immediately.
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return true
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// Inverse of the above — returns true when motion is OK. Single
// negation in one place so the call sites read fluently.
export function shouldAnimate() {
  return !prefersReducedMotion()
}

// Cubic-eased progress, 0..1 → 0..1. Used by tween() and exposed
// for callers that drive their own RAF loop (e.g. SVG arc fills).
export function easeOutCubic(t) {
  const u = 1 - t
  return 1 - u * u * u
}

// Quintic — matches EASE_OUT visually. Slightly snappier finish than
// cubic; this is what CountUp uses by default.
export function easeOutQuint(t) {
  const u = 1 - t
  return 1 - u * u * u * u * u
}

// requestAnimationFrame-driven tween between two scalar values. The
// only generic numeric tween we ship — used by CountUp, count-down
// hero numbers, score arc fills, etc. Returns a cancel() so callers
// can abort mid-animation (React unmount path).
//
//   const cancel = tween({
//     from: 0, to: 87, duration: 600,
//     onUpdate: (v) => setDisplay(Math.round(v)),
//     onDone:   () => setDisplay(87),
//   })
//
// duration is honored verbatim. easing is one of the math helpers
// above (function reference, NOT a CSS string). Reduced-motion
// short-circuits to the end value on the next microtask so callers
// don't have to special-case it.
export function tween({ from = 0, to = 0, duration = 600, easing = easeOutQuint, onUpdate, onDone } = {}) {
  if (typeof window === 'undefined') {
    onUpdate && onUpdate(to)
    onDone && onDone()
    return () => {}
  }
  if (prefersReducedMotion() || duration <= 0 || from === to) {
    onUpdate && onUpdate(to)
    onDone && onDone()
    return () => {}
  }
  let raf = 0
  let cancelled = false
  const start = performance.now()
  const delta = to - from

  function step(now) {
    if (cancelled) return
    const elapsed = now - start
    const t = Math.min(1, elapsed / duration)
    const eased = easing(t)
    const value = from + delta * eased
    onUpdate && onUpdate(value)
    if (t < 1) {
      raf = requestAnimationFrame(step)
    } else {
      onUpdate && onUpdate(to)
      onDone && onDone()
    }
  }
  raf = requestAnimationFrame(step)
  return () => {
    cancelled = true
    if (raf) cancelAnimationFrame(raf)
  }
}

// Standard durations — single source of truth so all primitives feel
// the same. Tweak here, the whole app retunes.
export const DURATION = {
  micro:  120,   // hover state, tap flash
  fast:   180,   // tab cross-fades, chip swaps
  base:   220,   // most entrances
  medium: 320,   // hero blocks, modals
  slow:   600,   // count-ups, score arcs
}

// Stagger constants for FadeUpStagger and friends. Capped at 12
// items so a 100-item list doesn't take 4 seconds to settle.
export const STAGGER = {
  delayMs: 40,
  maxItems: 12,
}

'use client'

// Mascot event bus — a singleton EventTarget any client component can
// import to fire mascot animations without prop-drilling. Mirrors the
// Dart MascotEventBus on mobile so the two platforms behave the same
// for the same trigger.
//
// Why EventTarget
// ---------------
// It's a browser-native pub/sub with no dependency cost, supports N
// listeners (so multiple <AnimatedMascot/> mounted on a page all
// react), and survives across React renders since it's module-level.
//
// SSR safety
// ----------
// Imported by 'use client' components only. We still guard the
// constructor call so that any accidental server-side import of this
// file doesn't crash the build (Next.js compiles each module once
// even when the export is only used client-side).
//
// Animation taxonomy
// ------------------
//   bounce    — single quick pop. Receipt-saved / connection-active.
//   wiggle    — small rotation shake. Smashlist "Smashed!".
//   pulse     — soft heartbeat. Ambient ack.
//   celebrate — combo + confetti. Worth-It rating / referral applied
//               / smash-days milestone.
//   spin      — full 360° rotation. For freshness / refresh moments.
//   flip      — quick 180° + 180° (front-to-back-to-front).
//   jump      — high arc translateY (the mascot LEAPS).
//   dance     — translate side-to-side with rotation (loop 2x).

const ANIMATIONS = ['bounce', 'wiggle', 'pulse', 'celebrate', 'spin', 'flip', 'jump', 'dance']
export const MASCOT_EVENT = 'getguac:mascot'

const _target =
  typeof window !== 'undefined' ? new EventTarget() : null

function fire(animation, message) {
  if (!_target) return
  if (!ANIMATIONS.includes(animation)) return
  _target.dispatchEvent(
    new CustomEvent(MASCOT_EVENT, { detail: { animation, message } }),
  )
}

export function bounce() { fire('bounce') }
export function wiggle() { fire('wiggle') }
export function pulse() { fire('pulse') }
export function celebrate(message) { fire('celebrate', message) }
export function spin() { fire('spin') }
export function flip() { fire('flip') }
export function jump() { fire('jump') }
export function dance() { fire('dance') }

// Idempotent milestone celebrate. Caller passes a stable key
// ('smash_days_7'); we use localStorage to remember whether it has
// fired before. Returns true if it actually dispatched.
const FIRED_KEY = 'getguac.mascot.firedMilestones.v1'
export function celebrateOnce(key, message) {
  if (typeof window === 'undefined') return false
  let fired
  try {
    const raw = window.localStorage.getItem(FIRED_KEY)
    fired = raw ? new Set(JSON.parse(raw)) : new Set()
    if (!(fired instanceof Set)) fired = new Set()
  } catch {
    fired = new Set()
  }
  if (fired.has(key)) return false
  fired.add(key)
  try {
    window.localStorage.setItem(FIRED_KEY, JSON.stringify([...fired]))
  } catch {}
  celebrate(message)
  return true
}

// Subscribe. Returns an unsubscribe function — same pattern as
// addEventListener but with the unsubscribe captured so consumers
// don't have to plumb the listener reference back through cleanup.
export function subscribeMascot(handler) {
  if (!_target) return () => {}
  const wrapped = (e) => handler(e.detail)
  _target.addEventListener(MASCOT_EVENT, wrapped)
  return () => _target.removeEventListener(MASCOT_EVENT, wrapped)
}

// Default export keeps the call sites readable:
//   import mascotBus from '@/lib/mascotEventBus'
//   mascotBus.bounce()
const mascotBus = { bounce, wiggle, pulse, celebrate, celebrateOnce, spin, flip, jump, dance, subscribe: subscribeMascot }
export default mascotBus

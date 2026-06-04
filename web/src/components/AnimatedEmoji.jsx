'use client'
// AnimatedEmoji — wraps any emoji string with a chosen looping
// animation. Use it anywhere a decorative emoji appears (category
// icons, hero blocks, empty states, item-card watermarks, etc.).
//
//   <AnimatedEmoji char="🥑" anim="bob"      size={32} />
//   <AnimatedEmoji char="❤️"  anim="heartBeat" size={48} tapBurst />
//   <AnimatedEmoji char="🎉" anim="party"    size={56} />
//
// Named animations (defined in globals.css as @keyframes anim-emoji-*):
//   bob        — gentle Y-axis float (3.2s loop)
//   spin       — slow full rotation (4.8s loop)
//   jiggle     — small playful wiggle (2.2s loop)
//   drop       — one-shot fall + bounce on mount, then idle bob
//   wave       — hand-wave rotation (2.6s loop) — good for 👋
//   heartBeat  — scale pulse at heartbeat tempo (1.4s loop) — good for ❤️
//   dance      — combo bob + jiggle (3s loop)
//   party      — vigorous scale + rotation (2s loop) — good for 🎉🥳
//   none       — disables; useful for runtime opt-out
//
// tapBurst: when true, tapping the emoji fires a tiny particle burst
// (8 dots radiating outward, ~600ms). Cheap canvas-less implementation
// using positioned spans with CSS keyframes.
//
// Accessibility:
//   - All animations respect prefers-reduced-motion via globals.css.
//   - The wrapper is an inline-block <span> with role="img" + aria-label
//     so screen readers announce the emoji semantically.

import { useCallback, useState } from 'react'

const ANIM_CLASS = {
  bob:        'anim-emoji-bob',
  spin:       'anim-emoji-spin',
  jiggle:     'anim-emoji-jiggle',
  drop:       'anim-emoji-drop',
  wave:       'anim-emoji-wave',
  heartBeat:  'anim-emoji-heartbeat',
  dance:      'anim-emoji-dance',
  party:      'anim-emoji-party',
  none:       '',
}

const BURST_COLORS = ['#15803d', '#a3e635', '#facc15', '#f472b6', '#60a5fa', '#fb923c']

export default function AnimatedEmoji({
  char,
  anim = 'bob',
  size = 32,
  label,
  tapBurst = false,
  className = '',
  onClick,
}) {
  const [bursts, setBursts] = useState([])
  const animCls = ANIM_CLASS[anim] ?? ANIM_CLASS.bob

  const fireBurst = useCallback(() => {
    if (!tapBurst) return
    const id = Math.random().toString(36).slice(2, 8)
    setBursts(b => [...b, { id }])
    // Self-cleanup so we don't leak DOM nodes when the user spams the emoji.
    setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), 800)
  }, [tapBurst])

  const handleClick = useCallback((e) => {
    fireBurst()
    onClick?.(e)
  }, [fireBurst, onClick])

  return (
    <span
      role="img"
      aria-label={label || 'emoji'}
      onClick={handleClick}
      className={`relative inline-block align-middle ${tapBurst || onClick ? 'cursor-pointer select-none' : ''} ${className}`}
      style={{ width: size, height: size, lineHeight: 1 }}
    >
      <span
        className={`inline-block ${animCls}`}
        style={{
          fontSize: size,
          lineHeight: 1,
          // Each emoji gets a slightly randomized animation-delay so a
          // grid of emojis isn't visually synchronized. The randomness
          // is derived from the char so SSR matches client.
          animationDelay: `-${(charSeed(char) * 1.7) % 1}s`,
        }}
      >
        {char}
      </span>
      {bursts.map(b => (
        <Burst key={b.id} size={size} />
      ))}
    </span>
  )
}

function charSeed(s) {
  if (!s) return 0
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h) / 0xFFFFFFFF
}

/** Tap-burst — 8 dots radiating outward over 600ms. Pure CSS, no canvas. */
function Burst({ size }) {
  const r = size * 1.4
  return (
    <span className="absolute inset-0 pointer-events-none" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const dx = Math.cos(angle) * r
        const dy = Math.sin(angle) * r
        const color = BURST_COLORS[i % BURST_COLORS.length]
        return (
          <span
            key={i}
            className="anim-emoji-burst-dot absolute"
            style={{
              left: '50%',
              top: '50%',
              width: 6,
              height: 6,
              borderRadius: 9999,
              background: color,
              transform: 'translate(-50%, -50%)',
              ['--bdx']: `${dx}px`,
              ['--bdy']: `${dy}px`,
            }}
          />
        )
      })}
    </span>
  )
}

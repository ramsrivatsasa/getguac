'use client'

// Soft expanding ring — a single ping pulse that emerges from the
// child's bounds and fades. Use to celebrate a successful "applied"
// state (a rating just locked in, an inbox row just flipped to
// processed). NOT a continuous animation — fires once per trigger.
//
//   <PulseRing color="emerald" trigger={isProcessed}>
//     <span>Processed</span>
//   </PulseRing>
//
// Props:
//   color    'emerald' | 'amber' | 'rose' | 'violet'
//   trigger  boolean — when this flips truthy, the ring fires once
//   children element to wrap
//   className wrapper class
import { useEffect, useState } from 'react'

const COLORS = {
  emerald: 'shadow-[0_0_0_6px_rgba(16,185,129,0.18)]',
  amber:   'shadow-[0_0_0_6px_rgba(245,158,11,0.18)]',
  rose:    'shadow-[0_0_0_6px_rgba(244,63,94,0.18)]',
  violet:  'shadow-[0_0_0_6px_rgba(139,92,246,0.18)]',
}

export default function PulseRing({ color = 'emerald', trigger = false, children, className = '' }) {
  const [pulsing, setPulsing] = useState(false)
  useEffect(() => {
    if (!trigger) return
    setPulsing(true)
    const t = setTimeout(() => setPulsing(false), 720)
    return () => clearTimeout(t)
  }, [trigger])
  return (
    <span
      className={`inline-block rounded-full transition-shadow duration-700 ease-out ${pulsing ? COLORS[color] : ''} ${className}`}
    >
      {children}
    </span>
  )
}

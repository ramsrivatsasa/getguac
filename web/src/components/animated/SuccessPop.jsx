'use client'
import { useEffect, useState } from 'react'

// Fires a brief checkmark + expanding ring whenever `trigger` flips
// truthy. Renders absolutely-positioned over its parent (parent must
// be position: relative). Mostly self-contained — no portal, no
// global state.
//
//   <button className="relative" onClick={save}>
//     Save <SuccessPop trigger={justSaved} />
//   </button>
//
// Props:
//   trigger    when this changes from falsy to truthy, fires once
//   size       px size of the badge (default 28)
//   color      tailwind tone — 'emerald' (default) | 'amber' | 'rose'
//   className  forwarded to the absolutely-positioned wrapper
export default function SuccessPop({ trigger = false, size = 28, color = 'emerald', className = '' }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!trigger) return
    setShow(true)
    const t = setTimeout(() => setShow(false), 900)
    return () => clearTimeout(t)
  }, [trigger])
  if (!show) return null

  const ringColor =
    color === 'amber' ? 'bg-amber-500' :
    color === 'rose'  ? 'bg-rose-500'  : 'bg-emerald-500'

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 flex items-center justify-center anim-success-pop ${className}`}
      style={{ animationDuration: '900ms' }}
    >
      <span className={`relative inline-flex items-center justify-center rounded-full text-white ${ringColor}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12l5 5L20 7" className="anim-check-draw" />
        </svg>
      </span>
    </span>
  )
}

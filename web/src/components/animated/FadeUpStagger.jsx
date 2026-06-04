'use client'
import { Children, cloneElement, isValidElement } from 'react'
import { STAGGER, DURATION } from '../../lib/animations'

// Wraps a list of children and gives each one a staggered fade-up
// entrance via the .anim-fadeup CSS keyframe in globals.css. No
// JavaScript runs after mount — the keyframe + animation-delay does
// all the work, so it's GPU-cheap and respects prefers-reduced-motion
// (CSS media query in globals.css gates the animation).
//
//   <FadeUpStagger>
//     {receipts.map(r => <Row key={r.id} ... />)}
//   </FadeUpStagger>
//
// Props:
//   delayMs       per-item stagger (default 40ms)
//   maxItems      cap so a 100-item list doesn't take 4 seconds
//   duration      ms; CSS variable on the wrapper
//   className     forwarded to wrapper
//   as            tag name; default div
//   keyedBy       optional key to force re-trigger when filters change
//                 (consumer can append this to React keys themselves)
//
// IMPORTANT: this clones each child to inject a class + inline
// animation-delay. Children must accept className + style as props
// (intrinsic elements always do; custom components must forward).
export default function FadeUpStagger({
  children,
  delayMs = STAGGER.delayMs,
  maxItems = STAGGER.maxItems,
  duration = DURATION.medium,
  className = '',
  as: Tag = 'div',
  // Optional render-as-fragment mode for cases where the wrapper
  // would break layout (e.g. <tbody><tr>…). Pass `inline` true to
  // skip the wrapper element entirely.
  inline = false,
}) {
  const items = Children.toArray(children)
  const decorated = items.map((child, i) => {
    if (!isValidElement(child)) return child
    const idx = Math.min(i, maxItems - 1)
    const delay = idx * delayMs
    const existingStyle = child.props.style || {}
    const existingClass = child.props.className || ''
    return cloneElement(child, {
      className: `${existingClass} anim-fadeup`.trim(),
      style: {
        ...existingStyle,
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
      },
    })
  })
  if (inline) return <>{decorated}</>
  return <Tag className={className}>{decorated}</Tag>
}

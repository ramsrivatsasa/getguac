'use client'
import { DURATION } from '../../lib/animations'

// Slide-up + fade-in entrance. Plain CSS via the `.anim-slideup`
// keyframe in globals.css. Use for modals, drawers, single-shot
// result panels (car-miles trip card, parsed statement block).
//
//   <SlideUp>{result && <ResultCard ... />}</SlideUp>
//   <SlideUp delay={120}>{...}</SlideUp>
//
// Props:
//   delay      ms before the animation starts
//   duration   ms total
//   className  forwarded
//   as         tag override
export default function SlideUp({
  children,
  delay = 0,
  duration = DURATION.medium,
  className = '',
  as: Tag = 'div',
}) {
  return (
    <Tag
      className={`anim-slideup ${className}`.trim()}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
      }}
    >
      {children}
    </Tag>
  )
}

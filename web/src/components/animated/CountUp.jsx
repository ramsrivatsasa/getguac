'use client'
import { useEffect, useRef, useState } from 'react'
import { tween, easeOutQuint, DURATION, shouldAnimate } from '../../lib/animations'

// Numeric count-up — tweens between the previous `value` prop and the
// current one whenever the prop changes. Used everywhere a dollar
// amount, integer, or score needs to smooth-retally instead of flash-
// cutting.
//
//   <CountUp value={87} duration={600} />
//   <CountUp value={total} format={formatGuacMoney} />
//
// Props:
//   value      number to tween TO. First render snaps; subsequent
//              renders animate from the previous value.
//   duration   ms; defaults to DURATION.slow (600). Pass 0 to disable.
//   format     (n: number) => string. Defaults to integer round.
//   decimals   when format is omitted, render with this many decimals.
//   prefix     string prepended (e.g. '$').
//   suffix     string appended (e.g. ' pts').
//   className  forwarded to the wrapper span.
//   as         tag name override; defaults to span.
//   from       optional override of the start value. Use to count UP
//              from zero on initial mount even when value is non-zero.
//
// Respects prefers-reduced-motion via shouldAnimate() — when disabled,
// snaps immediately to the target.
export default function CountUp({
  value = 0,
  duration = DURATION.slow,
  format,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  as: Tag = 'span',
  from,
}) {
  const target = Number.isFinite(Number(value)) ? Number(value) : 0
  const [display, setDisplay] = useState(() => (from != null ? Number(from) : target))
  const prev = useRef(from != null ? Number(from) : target)
  const cancelRef = useRef(null)
  const mounted = useRef(false)

  useEffect(() => {
    // First mount: if `from` is provided, animate from that to target.
    // Otherwise snap to target so SSR/client agree and there's no
    // "0 → 87" flash on every page load.
    if (!mounted.current) {
      mounted.current = true
      if (from == null) {
        prev.current = target
        setDisplay(target)
        return
      }
    }
    if (cancelRef.current) cancelRef.current()
    if (!shouldAnimate() || duration <= 0) {
      prev.current = target
      setDisplay(target)
      return
    }
    cancelRef.current = tween({
      from: prev.current,
      to: target,
      duration,
      easing: easeOutQuint,
      onUpdate: (v) => setDisplay(v),
      onDone: () => { prev.current = target },
    })
    return () => { if (cancelRef.current) cancelRef.current() }
  }, [target, duration, from])

  // Format the display value. The format callback (when supplied) gets
  // the raw number so callers can do their own decimals/locale.
  let text
  if (typeof format === 'function') {
    text = format(display)
  } else {
    text = display.toFixed(decimals)
  }

  return (
    <Tag className={`tabular-nums ${className}`}>
      {prefix}{text}{suffix}
    </Tag>
  )
}

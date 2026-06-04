'use client'
// Lottie wrapper — renders character-quality animations from
// lottiefiles / iconscout JSON files. Two source options:
//
//   <LottieAnimation data={importedJson} />       // bundled in-repo
//   <LottieAnimation src="https://lottie.host/.../anim.json" />  // hot-linked
//
// Falls back gracefully — if the URL fails or the package fails to
// load (SSR, slow connection), we render `fallback` (an emoji glyph
// by default) so the slot doesn't end up empty.
//
// HOW TO ADD A NEW ANIMATION
//   1. Find a free Lottie at lottiefiles.com or iconscout.com (CC0 /
//      "Free for personal+commercial" filter).
//   2. Click "Download Lottie JSON". Save under web/src/lottie/<name>.json.
//   3. `import animData from '@/lottie/<name>.json'` and pass as `data`.
//      OR keep on lottiefiles' CDN and pass `src="<hot-link URL>"`.

import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'

// SSR-safe reduced-motion probe — lottie-web ignores the media query
// by default, so users with vestibular sensitivities still see the
// animation. We short-circuit to the fallback emoji when reduce-motion
// is set, matching the same treatment AnimatedMascot uses.
function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  try { return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true }
  catch { return false }
}

export default function LottieAnimation({
  data,
  src,
  size = 200,
  loop = true,
  autoplay = true,
  fallback = '🥑',
  label,
  className = '',
}) {
  const [animationData, setAnimationData] = useState(data || null)
  const [err, setErr] = useState(null)
  // Re-read prefers-reduced-motion on mount so the same JS bundle can
  // serve users on both settings. Static on first paint; if the user
  // flips the OS setting mid-session we don't re-evaluate (acceptable).
  const [reduced, setReduced] = useState(false)
  useEffect(() => { setReduced(prefersReducedMotion()) }, [])

  useEffect(() => {
    // If we already have inline data, nothing to fetch.
    if (data) { setAnimationData(data); return }
    if (!src) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(src, { mode: 'cors' })
        if (!res.ok) throw new Error(`Lottie fetch ${res.status}`)
        const json = await res.json()
        if (!cancelled) setAnimationData(json)
      } catch (e) {
        if (!cancelled) setErr(e.message || 'fetch failed')
      }
    })()
    return () => { cancelled = true }
  }, [src, data])

  // Fallback path: no data, fetch failed, OR reduced-motion is on.
  // In all three cases render the emoji glyph at the same footprint
  // so the layout doesn't shift between motion and non-motion users.
  if (err || !animationData || reduced) {
    return (
      <span
        role="img"
        aria-label={label || (reduced ? 'animation paused' : err ? 'animation unavailable' : 'animation loading')}
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.6, lineHeight: 1 }}
        title={err ? `Lottie failed: ${err}` : reduced ? 'Reduced-motion preference is on' : 'Lottie loading…'}
      >
        {fallback}
      </span>
    )
  }

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label || 'animation'}
    >
      <Lottie
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

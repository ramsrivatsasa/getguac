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

export default function LottieAnimation({
  data,
  src,
  size = 200,
  loop = true,
  autoplay = true,
  fallback = '🥑',
  className = '',
}) {
  const [animationData, setAnimationData] = useState(data || null)
  const [err, setErr] = useState(null)

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

  if (err || !animationData) {
    return (
      <span
        role="img"
        aria-label="lottie placeholder"
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.6, lineHeight: 1 }}
        title={err ? `Lottie failed: ${err}` : 'Lottie loading…'}
      >
        {fallback}
      </span>
    )
  }

  return (
    <div className={className} style={{ width: size, height: size }}>
      <Lottie
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

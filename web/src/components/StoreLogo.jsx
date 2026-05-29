// Single round avatar that prefers a real brand logo and falls back
// to a category emoji when the logo can't be resolved or fails to
// load. Used wherever we want merchants to read as themselves rather
// than as a generic 🛒.
//
// Why a fallback ref + onError instead of <picture>:
//   Clearbit returns a 404 for unknown brands. The browser fires
//   onError on the <img>, we swap to the emoji avatar without a
//   layout shift. <picture> with a source set doesn't trigger a
//   recovery path on 404 of the primary source.
'use client'
import { useState } from 'react'
import { logoUrlForStore } from '../lib/store-logo'

export function StoreLogo({
  storeName,
  fallbackEmoji = '🛒',
  size = 40,
  className = '',
  emojiClassName = 'bg-emerald-500 text-white',
}) {
  const [errored, setErrored] = useState(false)
  const url = logoUrlForStore(storeName)
  const px = `${size}px`
  if (url && !errored) {
    return (
      <div
        className={`rounded-2xl bg-white shadow-md ring-2 ring-white overflow-hidden flex items-center justify-center shrink-0 ${className}`}
        style={{ width: px, height: px }}
        title={storeName}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={storeName || 'Store logo'}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setErrored(true)}
          className="w-full h-full object-contain p-1"
        />
      </div>
    )
  }
  return (
    <div
      className={`rounded-2xl shadow-md ring-2 ring-white flex items-center justify-center text-xl shrink-0 ${emojiClassName} ${className}`}
      style={{ width: px, height: px }}
      title={storeName}
    >
      {fallbackEmoji}
    </div>
  )
}

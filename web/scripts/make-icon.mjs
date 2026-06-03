// One-shot: download the Noto avocado SVG and produce:
//   - icon-fg.png    (1024 transparent, foreground for adaptive icon —
//                     sits over the existing #15803d background set in
//                     mobile pubspec.yaml's adaptive_icon_background)
//   - icon.png       (1024 emerald-squircle + avocado, legacy fallback
//                     for Android 5-7 which don't honor the adaptive
//                     foreground/background split)
//
// Run once when the source emoji needs updating:
//   node web/scripts/make-icon.mjs

import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f951.svg'
const OUT_DIR = join(process.cwd(), '..', 'mobile', 'assets', 'icon')
const SIZE = 1024
const BG = '#15803d'   // emerald-700 — matches adaptive_icon_background

const res = await fetch(SRC)
if (!res.ok) throw new Error(`SVG fetch failed: ${res.status}`)
const src = Buffer.from(await res.arrayBuffer())
const meta = await sharp(src, { density: 1200 }).metadata()
console.log(`fetched source: ${src.length} bytes, ${meta.width}x${meta.height} ${meta.format}`)

// FOREGROUND: 70% of canvas, centered, transparent background.
// Android adaptive icons crop ~33% on each edge, so keep the artwork
// inside the safe zone or it'll get clipped by every launcher mask.
const fgArtSize = Math.round(SIZE * 0.66)
const fgArt = await sharp(src, { density: 1200 })
  .resize(fgArtSize, fgArtSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()

const fg = await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
  .composite([{ input: fgArt, gravity: 'center' }])
  .png()
  .toBuffer()

writeFileSync(join(OUT_DIR, 'icon-fg.png'), fg)
console.log(`wrote icon-fg.png (${fg.length} bytes)`)

// LEGACY: avocado over an emerald rounded-rect background. Used by
// Android < 8 that ignores the adaptive icon. Squircle radius ~22% of
// canvas matches the Android adaptive icon mask roughly.
const radius = Math.round(SIZE * 0.22)
const squircleSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
    <rect width="${SIZE}" height="${SIZE}" rx="${radius}" ry="${radius}" fill="${BG}"/>
  </svg>`
)
const squircle = await sharp(squircleSvg).png().toBuffer()

const legacyArtSize = Math.round(SIZE * 0.62)
const legacyArt = await sharp(src, { density: 1200 })
  .resize(legacyArtSize, legacyArtSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()

const legacy = await sharp(squircle)
  .composite([{ input: legacyArt, gravity: 'center' }])
  .png()
  .toBuffer()

writeFileSync(join(OUT_DIR, 'icon.png'), legacy)
console.log(`wrote icon.png (${legacy.length} bytes)`)

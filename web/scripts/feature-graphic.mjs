#!/usr/bin/env node
// =============================================================================
// Generate the Google Play "feature graphic" (1024x500) + a 16:9 hero banner.
// =============================================================================
// Brand gradient + the avocado genie (GuacWizard) + wordmark + tagline.
// Output: marketing-assets/store/graphics/feature-graphic-1024x500.png
//         marketing-assets/store/graphics/hero-1920x1080.png
//
// Usage: node web/scripts/feature-graphic.mjs
// =============================================================================

import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { genie } from './lib/brand-svg.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'marketing-assets', 'store', 'graphics')

function banner(W, H, { titleSize, tagSize, subSize, textX, genieX, genieY, genieH }) {
  const cy = H / 2
  return Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stop-color="#064e3b"/>
          <stop offset="0.6" stop-color="#059669"/>
          <stop offset="1" stop-color="#10b981"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
      <g fill="#ffffff" opacity="0.10">
        <circle cx="${W * 0.12}" cy="${H * 0.2}" r="${H * 0.02}"/>
        <circle cx="${W * 0.05}" cy="${H * 0.7}" r="${H * 0.014}"/>
        <circle cx="${W * 0.5}" cy="${H * 0.86}" r="${H * 0.018}"/>
      </g>
      <text x="${textX}" y="${cy - tagSize * 0.7}" font-family="Segoe UI, Arial, DejaVu Sans, sans-serif" font-size="${titleSize}" font-weight="900" fill="#ffffff" letter-spacing="-1">GetGuac</text>
      <text x="${textX}" y="${cy + tagSize * 0.7}" font-family="Segoe UI, Arial, DejaVu Sans, sans-serif" font-size="${tagSize}" font-weight="700" fill="#d1fae5">Where every dollar earns its smash.</text>
      <text x="${textX}" y="${cy + tagSize * 0.7 + subSize * 1.7}" font-family="Segoe UI, Arial, DejaVu Sans, sans-serif" font-size="${subSize}" font-weight="600" fill="#a7f3d0">Snap receipts · Save money · getguac.app</text>
      ${genie(genieX, genieY, genieH)}
    </svg>`
  )
}

mkdirSync(OUT, { recursive: true })

// 1024x500 Play feature graphic
await sharp(banner(1024, 500, {
  titleSize: 92, tagSize: 30, subSize: 19, textX: 60,
  genieX: 660, genieY: 18, genieH: 462,
})).png().toFile(resolve(OUT, 'feature-graphic-1024x500.png'))
console.log('✓ feature-graphic-1024x500.png')

// 1920x1080 hero banner (landing / social / video end card)
await sharp(banner(1920, 1080, {
  titleSize: 168, tagSize: 56, subSize: 34, textX: 130,
  genieX: 1230, genieY: 70, genieH: 940,
})).png().toFile(resolve(OUT, 'hero-1920x1080.png'))
console.log('✓ hero-1920x1080.png')

// 4096x2304 Play Console "Developer page" header. JPEG (opaque, <1MB).
await sharp(banner(4096, 2304, {
  titleSize: 358, tagSize: 120, subSize: 73, textX: 280,
  genieX: 2620, genieY: 150, genieH: 2000,
})).jpeg({ quality: 86 }).toFile(resolve(OUT, 'developer-header-4096x2304.jpg'))
console.log('✓ developer-header-4096x2304.jpg')

console.log('\nDone →', OUT)

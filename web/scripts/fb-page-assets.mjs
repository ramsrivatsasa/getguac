#!/usr/bin/env node
// =============================================================================
// Generate the Facebook Page assets for GetGuac (profile picture + cover).
// =============================================================================
// Output: marketing-assets/fb/page/
//   profile-1080x1080.png       → Page profile picture (FB crops it to a circle)
//   cover-1640x624.png          → Page cover photo (2x the 820x312 desktop slot)
//   cover-1640x624-GUIDES.png   → same cover with crop/overlap guides drawn on,
//                                 for eyeballing safety. DO NOT UPLOAD THIS ONE.
//
// Sizing rules this encodes (Facebook, 2026):
//  - Cover renders 820x312 on desktop but ~1.78:1 on mobile, which crops the
//    SIDES. Keep everything important inside the centre ~67% (MOBILE_SAFE).
//  - The profile picture overlays the cover: bottom-left on desktop, bottom-
//    centre on mobile. Keep the bottom band clear of text (PROFILE_OVERLAP).
//
// Usage: node web/scripts/fb-page-assets.mjs
// =============================================================================

import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { genie, brandGradientDefs, SANS } from './lib/brand-svg.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'marketing-assets', 'fb', 'page')
const APP_ICON = resolve(__dirname, '..', '..', 'mobile', 'assets', 'icon', 'icon.png')

const W = 1640
const H = 624
// Mobile crops to the centre 67.6% of the width (312/820 vs 360/640 aspect).
const MOBILE_SAFE = { x1: Math.round(W * 0.162), x2: Math.round(W * 0.838) }
// Bottom band where the profile picture sits on top of the cover.
const PROFILE_OVERLAP_Y = 452

const ICON_X = 268 // flush with the mobile-safe left edge
const ICON_Y = 132
const ICON_SIZE = 128
const TEXT_X = ICON_X + ICON_SIZE + 34
// The mascot's raised arms reach ~74px into its own box, so the text column
// has to stop short of GENIE_X + 74 or the tagline collides with the wand.
const GENIE_X = 1060
const GENIE_H = 400

function cover({ guides = false } = {}) {
  const guideLayer = guides
    ? `<g opacity="0.95">
         <rect x="${MOBILE_SAFE.x1}" y="0" width="${MOBILE_SAFE.x2 - MOBILE_SAFE.x1}" height="${H}"
               fill="none" stroke="#f43f5e" stroke-width="4" stroke-dasharray="16 12"/>
         <text x="${MOBILE_SAFE.x1 + 12}" y="34" font-family="${SANS}" font-size="20" font-weight="700" fill="#f43f5e">mobile-safe area</text>
         <line x1="0" y1="${PROFILE_OVERLAP_Y}" x2="${W}" y2="${PROFILE_OVERLAP_Y}"
               stroke="#38bdf8" stroke-width="4" stroke-dasharray="16 12"/>
         <text x="16" y="${PROFILE_OVERLAP_Y + 30}" font-family="${SANS}" font-size="20" font-weight="700" fill="#38bdf8">profile-picture overlap — keep clear</text>
       </g>`
    : ''

  return Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>${brandGradientDefs('bg')}</defs>
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
      <g fill="#ffffff" opacity="0.10">
        <circle cx="${W * 0.10}" cy="${H * 0.18}" r="${H * 0.022}"/>
        <circle cx="${W * 0.05}" cy="${H * 0.68}" r="${H * 0.015}"/>
        <circle cx="${W * 0.46}" cy="${H * 0.88}" r="${H * 0.018}"/>
        <circle cx="${W * 0.62}" cy="${H * 0.14}" r="${H * 0.012}"/>
      </g>
      <text x="${TEXT_X}" y="238" font-family="${SANS}" font-size="104" font-weight="900" fill="#ffffff" letter-spacing="-2">GetGuac</text>
      <text x="${TEXT_X}" y="298" font-family="${SANS}" font-size="32" font-weight="700" fill="#d1fae5">Free AI receipt scanner &amp; spending tracker</text>
      <text x="${TEXT_X}" y="348" font-family="${SANS}" font-size="25" font-weight="600" fill="#a7f3d0">Scan receipts · See where it goes · Catch hidden fees</text>
      <text x="${TEXT_X}" y="400" font-family="${SANS}" font-size="25" font-weight="700" fill="#ffffff" opacity="0.92">getguac.app · iOS &amp; Android</text>
      ${genie(GENIE_X, 130, GENIE_H)}
      ${guideLayer}
    </svg>`
  )
}

mkdirSync(OUT, { recursive: true })

// --- Profile picture -------------------------------------------------------
// The store app icon, which already reads well at small sizes and keeps the
// avocado inside the inscribed circle FB crops to.
await sharp(APP_ICON)
  .resize(1080, 1080, { fit: 'cover' })
  .png()
  .toFile(resolve(OUT, 'profile-1080x1080.png'))
console.log('✓ profile-1080x1080.png')

// --- Cover photo -----------------------------------------------------------
const iconBadge = await sharp(APP_ICON)
  .resize(ICON_SIZE, ICON_SIZE)
  .composite([{
    input: Buffer.from(
      `<svg width="${ICON_SIZE}" height="${ICON_SIZE}"><rect width="${ICON_SIZE}" height="${ICON_SIZE}" rx="30" ry="30" fill="#fff"/></svg>`
    ),
    blend: 'dest-in',
  }])
  .png()
  .toBuffer()

for (const guides of [false, true]) {
  const name = guides ? 'cover-1640x624-GUIDES.png' : 'cover-1640x624.png'
  await sharp(cover({ guides }))
    .composite([{ input: iconBadge, left: ICON_X, top: ICON_Y }])
    .png()
    .toFile(resolve(OUT, name))
  console.log('✓', name)
}

console.log('\nDone →', OUT)

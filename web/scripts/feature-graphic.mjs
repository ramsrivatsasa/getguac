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

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'marketing-assets', 'store', 'graphics')
const STAR = 'M0 -5 L1.12 -1.55 4.76 -1.55 1.82 0.59 2.94 4.05 0 1.9 -2.94 4.05 -1.82 0.59 -4.76 -1.55 -1.12 -1.55 Z'

// The avocado genie (matches components/GenieAvocado.jsx), as a nested-svg
// fragment placed at (gx,gy) scaled to height gh.
function genie(gx, gy, gh) {
  const gw = Math.round(gh * (440 / 560))
  return `<svg x="${gx}" y="${gy}" width="${gw}" height="${gh}" viewBox="0 0 440 560">
    <defs>
      <radialGradient id="gnBody" cx="35%" cy="28%" r="80%"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#064e3b"/></radialGradient>
      <radialGradient id="gnFlesh" cx="50%" cy="42%" r="68%"><stop offset="0%" stop-color="#f6ed8a"/><stop offset="40%" stop-color="#e7ec8e"/><stop offset="74%" stop-color="#b4d35f"/><stop offset="100%" stop-color="#84cc16"/></radialGradient>
      <radialGradient id="gnPit" cx="38%" cy="34%" r="78%"><stop offset="0%" stop-color="#dca838"/><stop offset="48%" stop-color="#a8590a"/><stop offset="100%" stop-color="#54260c"/></radialGradient>
      <linearGradient id="gnSwirl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#34d399"/><stop offset="100%" stop-color="#059669"/></linearGradient>
      <linearGradient id="gnScreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#cfe8ff"/><stop offset="100%" stop-color="#8ec5ff"/></linearGradient>
    </defs>
    <ellipse cx="220" cy="528" rx="120" ry="14" fill="#0f172a" opacity="0.10"/>
    <path d="M150 470 L290 470 L312 524 L128 524 Z" fill="#1f2937"/>
    <path d="M160 478 L280 478 L298 518 L142 518 Z" fill="url(#gnScreen)"/>
    <path d="M168 482 L210 482 L196 512 L150 512 Z" fill="#ffffff" opacity="0.25"/>
    <path d="M120 524 L320 524 L338 538 L102 538 Z" fill="#cbd5e1"/>
    <path d="M102 538 L338 538 L338 542 L102 542 Z" fill="#94a3b8"/>
    <path d="M196 398 C 172 426, 238 442, 214 468 C 198 486, 230 498, 219 508 C 240 496, 258 472, 236 450 C 260 430, 214 416, 246 398 Z" fill="url(#gnSwirl)"/>
    <path d="M210 410 C 196 430, 232 444, 218 462 C 208 476, 226 486, 219 496 C 230 484, 240 470, 228 456 C 242 442, 214 432, 230 412 Z" fill="#ecfdf5" opacity="0.5"/>
    <path d="M168 250 C 140 232, 124 196, 120 166" stroke="#10b981" stroke-width="20" fill="none" stroke-linecap="round"/>
    <path d="M272 250 C 300 232, 316 196, 320 166" stroke="#10b981" stroke-width="20" fill="none" stroke-linecap="round"/>
    <circle cx="118" cy="160" r="15" fill="#fde68a" stroke="#cf9b3c" stroke-width="2"/>
    <circle cx="322" cy="160" r="15" fill="#fde68a" stroke="#cf9b3c" stroke-width="2"/>
    <path d="M220 150 C 185 150, 174 172, 171 204 C 168 232, 154 252, 140 284 C 122 324, 124 372, 170 402 C 194 422, 246 422, 270 402 C 316 372, 318 324, 300 284 C 286 252, 272 232, 269 204 C 266 172, 255 150, 220 150 Z" fill="url(#gnBody)"/>
    <path d="M220 164 C 190 164, 181 184, 179 212 C 177 236, 163 254, 152 284 C 135 320, 138 366, 178 393 C 200 411, 240 411, 262 393 C 302 366, 305 320, 288 284 C 277 254, 263 236, 261 212 C 259 184, 250 164, 220 164 Z" fill="url(#gnFlesh)"/>
    <ellipse cx="220" cy="330" rx="50" ry="52" fill="url(#gnPit)"/>
    <path d="M180 176 Q 186 148 220 144 Q 254 148 260 176 Q 238 161 220 160 Q 202 161 180 176 Z" fill="#1f2937"/>
    <path d="M212 148 Q 214 120 226 100 Q 234 86 230 72 Q 244 84 240 104 Q 234 128 228 150 Z" fill="#1f2937"/>
    <rect x="210" y="145" width="17" height="8" rx="4" fill="#0b1220"/>
    <circle cx="200" cy="232" r="11" fill="#fff" stroke="#1f2937" stroke-width="2"/><circle cx="240" cy="232" r="11" fill="#fff" stroke="#1f2937" stroke-width="2"/>
    <circle cx="201" cy="233" r="5.5" fill="#1f2937"/><circle cx="241" cy="233" r="5.5" fill="#1f2937"/>
    <circle cx="173" cy="246" r="7" fill="#fb7185" opacity="0.5"/><circle cx="267" cy="246" r="7" fill="#fb7185" opacity="0.5"/>
    <path d="M198 256 Q 220 280 242 256 Z" fill="#1f2937"/>
    <path d="M203 258 L237 258 L233 266 Q 220 272 207 266 Z" fill="#fff"/>
    <path d="M211 270 Q 220 275 229 270 Q 225 286 220 294 Q 215 286 211 270 Z" fill="#1f2937"/>
    <circle cx="200" cy="232" r="17" fill="#e0f2fe" fill-opacity="0.32" stroke="#1f2937" stroke-width="3.5"/>
    <circle cx="240" cy="232" r="17" fill="#e0f2fe" fill-opacity="0.32" stroke="#1f2937" stroke-width="3.5"/>
    <line x1="217" y1="230" x2="223" y2="230" stroke="#1f2937" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M183 228 Q 174 224 168 227" stroke="#1f2937" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M257 228 Q 266 224 272 227" stroke="#1f2937" stroke-width="3" fill="none" stroke-linecap="round"/>
    <g fill="#fde047" stroke="#eab308" stroke-width="1.2">
      <path transform="translate(96 130) scale(2)" d="${STAR}"/>
      <path transform="translate(348 132) scale(1.6)" d="${STAR}"/>
      <path transform="translate(330 96) scale(1.2)" d="${STAR}"/>
    </g>
    <line x1="310" y1="184" x2="320" y2="170" stroke="#ef4444" stroke-width="8" stroke-linecap="round"/>
    <line x1="314" y1="178" x2="356" y2="118" stroke="#3b82f6" stroke-width="8" stroke-linecap="round"/>
    <line x1="324" y1="160" x2="342" y2="135" stroke="#bfdbfe" stroke-width="3" stroke-linecap="round"/>
    <path transform="translate(366 106) scale(3.8)" d="${STAR}" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.7"/>
  </svg>`
}

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

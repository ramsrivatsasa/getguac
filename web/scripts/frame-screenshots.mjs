#!/usr/bin/env node
// =============================================================================
// Turn raw phone screenshots into store-ready listing images.
// =============================================================================
// Reads the phone captures (marketing-assets/screens/phone/*.png), rounds their
// corners, drops them on a branded gradient with a big caption header, and
// exports at exact store sizes:
//
//   Google Play phone   1080 x 1920
//   Apple 6.7" (iPhone) 1290 x 2796
//   Apple 6.5" (iPhone) 1242 x 2688
//
// Output: marketing-assets/store/<size>/NN-key.png
//
// Captions + which screen → from marketing/how-it-works.md.
//
// Usage: node web/scripts/frame-screenshots.mjs
// =============================================================================

import sharp from 'sharp'
import { mkdirSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', 'marketing-assets')
const SRC = resolve(ROOT, 'screens', 'phone')

// caption + the source screen key, in store order
const PANELS = [
  { key: 'receipts', caption: 'Snap any receipt' },
  { key: 'items', caption: 'AI reads every line' },
  { key: 'dashboard', caption: 'Know your GuacScore' },
  { key: 'steals', caption: 'Find the better price' },
  { key: 'shopping', caption: 'Your Smashlist, automatic' },
  { key: 'guacanomics', caption: 'Every dollar earns its smash' },
  { key: 'reports', caption: 'Taxes, export-ready' },
  { key: 'guacwizard', caption: 'Meet the GuacWizard' },
]

const SIZES = [
  { name: 'play-1080x1920', w: 1080, h: 1920 },
  { name: 'ios-6.7-1290x2796', w: 1290, h: 2796 },
  { name: 'ios-6.5-1242x2688', w: 1242, h: 2688 },
]

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Find the captured file for a key (named NN-key.png).
function srcFor(key) {
  const f = readdirSync(SRC).find(n => n.endsWith(`-${key}.png`))
  if (!f) throw new Error(`No phone screenshot for "${key}" in ${SRC} — run capture-tour.mjs --shots first`)
  return resolve(SRC, f)
}

function backgroundSvg(w, h, caption) {
  const capSize = Math.round(w * 0.066)
  const capY = Math.round(h * 0.085)
  // wrap to two lines if long (~16 chars/line budget at this size)
  const words = caption.split(' ')
  let l1 = '', l2 = ''
  for (const word of words) {
    if ((l1 + ' ' + word).trim().length <= 16 || !l1) l1 = (l1 + ' ' + word).trim()
    else l2 = (l2 + ' ' + word).trim()
  }
  const lineGap = Math.round(capSize * 1.15)
  const tspans = l2
    ? `<tspan x="${w / 2}" y="${capY}">${esc(l1)}</tspan><tspan x="${w / 2}" y="${capY + lineGap}">${esc(l2)}</tspan>`
    : `<tspan x="${w / 2}" y="${capY}">${esc(l1)}</tspan>`
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stop-color="#064e3b"/>
          <stop offset="0.55" stop-color="#059669"/>
          <stop offset="1" stop-color="#34d399"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)"/>
      <text x="${w / 2}" y="0" text-anchor="middle"
        font-family="Segoe UI, Arial, DejaVu Sans, sans-serif"
        font-size="${capSize}" font-weight="800" fill="#ffffff"
        style="paint-order:stroke">${tspans}</text>
    </svg>`
  )
}

function shadowSvg(w, h, r) {
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#000000"/></svg>`
  )
}
function roundMask(w, h, r) {
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" rx="${r}" ry="${r}"/></svg>`
  )
}

async function compose(panel, size) {
  const { w: W, h: H } = size
  const srcPath = srcFor(panel.key)
  const meta = await sharp(srcPath).metadata()
  const ar = meta.width / meta.height

  // size the phone by height, anchored near the bottom; clamp width
  let phoneH = Math.round(H * 0.74)
  let phoneW = Math.round(phoneH * ar)
  if (phoneW > W * 0.86) { phoneW = Math.round(W * 0.86); phoneH = Math.round(phoneW / ar) }
  const x = Math.round((W - phoneW) / 2)
  const y = H - phoneH - Math.round(H * 0.045)
  const radius = Math.round(phoneW * 0.085)

  const phone = await sharp(srcPath)
    .resize(phoneW, phoneH, { fit: 'fill' })
    .composite([{ input: roundMask(phoneW, phoneH, radius), blend: 'dest-in' }])
    .png().toBuffer()

  // soft drop shadow behind the phone
  const pad = Math.round(phoneW * 0.06)
  const shadow = await sharp(shadowSvg(phoneW + pad * 2, phoneH + pad * 2, radius + pad))
    .blur(Math.round(pad * 0.9)).png().toBuffer()

  return sharp(backgroundSvg(W, H, panel.caption))
    .composite([
      { input: shadow, left: x - pad, top: y - pad + Math.round(pad * 0.4), opacity: 0.45 },
      { input: phone, left: x, top: y },
    ])
    .png()
}

let made = 0
for (const size of SIZES) {
  const dir = resolve(ROOT, 'store', size.name)
  mkdirSync(dir, { recursive: true })
  let n = 0
  for (const panel of PANELS) {
    const out = resolve(dir, `${String(++n).padStart(2, '0')}-${panel.key}.png`)
    await (await compose(panel, size)).toFile(out)
    made++
  }
  console.log(`✓ ${size.name} → ${dir}`)
}
console.log(`\nDone — ${made} store images.`)

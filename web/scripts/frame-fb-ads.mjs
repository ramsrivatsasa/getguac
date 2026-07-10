#!/usr/bin/env node
// =============================================================================
// Turn raw phone screenshots into Facebook-ad creatives.
// =============================================================================
// Reads the native app captures (marketing-assets/fb/native/*.png, 1080x2400
// emulator shots), crops off the status bar + AdMob test banner + bottom nav,
// rounds the corners, and drops each on the brand gradient at exact FB sizes:
//
//   feed     1080 x 1080
//   stories  1080 x 1920
//   link     1200 x 628
//
// Output: marketing-assets/fb/<size>/<key>.png
//
// Usage: node web/scripts/frame-fb-ads.mjs
// =============================================================================

import sharp from 'sharp'
import { mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', 'marketing-assets', 'fb')
const SRC = resolve(ROOT, 'native')

// Emulator shots are 1080x2400: status bar ends ~y=112, the AdMob test banner
// starts ~y=1900 (bottom nav below it). Crop to the app content in between.
const CROP = { left: 0, top: 112, width: 1080, height: 1788 }

const PANELS = [
  { key: 'dashboard', caption: 'Know where your money goes' },
  { key: 'dashboard-bars', caption: 'Spending by store, at a glance' },
  { key: 'receipts', caption: 'Snap any receipt' },
  { key: 'smashlist', caption: 'Your Smashlist, automatic' },
  { key: 'steals', caption: 'We hunt the best price' },
  { key: 'steals-cards', caption: 'Fresh Steals, found for you' },
  { key: 'guacmoney', caption: 'See the value you kept' },
]

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function gradientSvg(w, h) {
  return `<defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stop-color="#064e3b"/>
        <stop offset="0.55" stop-color="#059669"/>
        <stop offset="1" stop-color="#34d399"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>`
}

// Two-line-wrapped centered caption (top of portrait/square canvases).
function captionTspans(caption, cx, capY, lineGap, budget = 16) {
  let l1 = '', l2 = ''
  for (const word of caption.split(' ')) {
    if ((l1 + ' ' + word).trim().length <= budget || !l1) l1 = (l1 + ' ' + word).trim()
    else l2 = (l2 + ' ' + word).trim()
  }
  return l2
    ? `<tspan x="${cx}" y="${capY}">${esc(l1)}</tspan><tspan x="${cx}" y="${capY + lineGap}">${esc(l2)}</tspan>`
    : `<tspan x="${cx}" y="${capY}">${esc(l1)}</tspan>`
}

function portraitBg(w, h, caption) {
  const capSize = Math.round(w * 0.062)
  const capY = Math.round(h * 0.085)
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      ${gradientSvg(w, h)}
      <text x="${w / 2}" y="0" text-anchor="middle"
        font-family="Segoe UI, Arial, DejaVu Sans, sans-serif"
        font-size="${capSize}" font-weight="800" fill="#ffffff">${captionTspans(caption, w / 2, capY, Math.round(capSize * 1.15))}</text>
      <text x="44" y="${h - Math.round(h * 0.028)}" text-anchor="start"
        font-family="Segoe UI, Arial, DejaVu Sans, sans-serif"
        font-size="${Math.round(w * 0.03)}" font-weight="700" fill="#d1fae5">getguac.app</text>
    </svg>`
  )
}

function landscapeBg(w, h, caption) {
  const capSize = Math.round(h * 0.105)
  const lineGap = Math.round(capSize * 1.18)
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      ${gradientSvg(w, h)}
      <text x="64" y="0" text-anchor="start"
        font-family="Segoe UI, Arial, DejaVu Sans, sans-serif"
        font-size="${capSize}" font-weight="800" fill="#ffffff">${captionTspans(caption, 64, Math.round(h * 0.36), lineGap, 14)}</text>
      <text x="64" y="${h - 52}" text-anchor="start"
        font-family="Segoe UI, Arial, DejaVu Sans, sans-serif"
        font-size="${Math.round(h * 0.052)}" font-weight="700" fill="#d1fae5">getguac.app 🥑</text>
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

async function croppedPhone(key) {
  const src = resolve(SRC, `${key}.png`)
  if (!existsSync(src)) throw new Error(`missing capture ${src}`)
  return sharp(src).extract(CROP).png().toBuffer()
}

async function phoneAt(key, phoneW) {
  const buf = await croppedPhone(key)
  const meta = await sharp(buf).metadata()
  const phoneH = Math.round(phoneW * meta.height / meta.width)
  const radius = Math.round(phoneW * 0.075)
  const phone = await sharp(buf)
    .resize(phoneW, phoneH, { fit: 'fill' })
    .composite([{ input: roundMask(phoneW, phoneH, radius), blend: 'dest-in' }])
    .png().toBuffer()
  return { phone, phoneW, phoneH, radius }
}

async function withShadow(bg, phone, x, y, phoneW, phoneH, radius, clipH = null) {
  const pad = Math.round(phoneW * 0.06)
  let shadow = await sharp(shadowSvg(phoneW + pad * 2, phoneH + pad * 2, radius + pad))
    .blur(Math.round(pad * 0.9)).png().toBuffer()
  let ph = phone
  if (clipH) {
    ph = await sharp(phone).extract({ left: 0, top: 0, width: phoneW, height: clipH }).png().toBuffer()
    shadow = await sharp(shadow).extract({ left: 0, top: 0, width: phoneW + pad * 2, height: clipH + pad }).png().toBuffer()
  }
  return sharp(bg).composite([
    { input: shadow, left: x - pad, top: y - pad + Math.round(pad * 0.4), opacity: 0.45 },
    { input: ph, left: x, top: y },
  ]).png()
}

async function feed(panel) {          // 1080x1080
  const W = 1080, H = 1080
  const { phone, phoneW, phoneH, radius } = await phoneAt(panel.key, Math.round(H * 0.70 * CROP.width / CROP.height))
  const x = Math.round((W - phoneW) / 2)
  const y = H - phoneH - Math.round(H * 0.055)
  return withShadow(portraitBg(W, H, panel.caption), phone, x, y, phoneW, phoneH, radius)
}

async function stories(panel) {       // 1080x1920
  const W = 1080, H = 1920
  const { phone, phoneW, phoneH, radius } = await phoneAt(panel.key, Math.round(H * 0.76 * CROP.width / CROP.height))
  const x = Math.round((W - phoneW) / 2)
  const y = H - phoneH - Math.round(H * 0.045)
  return withShadow(portraitBg(W, H, panel.caption), phone, x, y, phoneW, phoneH, radius)
}

async function link(panel) {          // 1200x628 — phone on the right, top-aligned, clipped at the bottom edge
  const W = 1200, H = 628
  const { phone, phoneW, phoneH, radius } = await phoneAt(panel.key, 340)
  const x = W - phoneW - 88
  const y = 56
  const clip = H - y < phoneH ? H - y : null
  return withShadow(landscapeBg(W, H, panel.caption), phone, x, y, phoneW, phoneH, radius, clip)
}

const SIZES = [
  { name: 'feed-1080x1080', make: feed },
  { name: 'stories-1080x1920', make: stories },
  { name: 'link-1200x628', make: link },
]

let made = 0
for (const size of SIZES) {
  const dir = resolve(ROOT, size.name)
  mkdirSync(dir, { recursive: true })
  for (const panel of PANELS) {
    await (await size.make(panel)).toFile(resolve(dir, `${panel.key}.png`))
    made++
  }
  console.log(`✓ ${size.name}`)
}
console.log(`\nDone — ${made} FB ad images in ${ROOT}`)

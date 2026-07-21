'use client'
// Fruit Slice — the CLASSIC Fruit-Ninja-style arcade slicer for Guac Arcade.
// Whole fruit (no receipts, no spending) flies up in arcs; swipe the blade to
// slice, chain slices for combos, dodge the bombs, and splatter juice on the
// dark dojo wall. This is the classic cousin of Splurge Slicer (/games/splurge)
// — that one slices your REAL purchases; this one is pure fruit fun. Fruit-Ninja
// look: dark wooden backboard, whole real-fruit sprites that split into two
// halves + bright juice that stains the wall, gold COMBO pill, avocado lives.
//
// Fruit are REAL royalty-free images (Google Noto Emoji, Apache-2.0) from
// /public/games/fruit/<name>.png — images (not emoji glyphs) render everywhere,
// including the app's Flutter WebView where emoji go blank. Each has a canvas
// fallback below. The golden bonus is the GetGuac 🥑 logo (guac.png).
// SCORE IS GAME-ONLY. First finished round each day earns GuacMoney.
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useScoreSaver, SaveScoreLine, ArcadeHud, useArcadeSound,
  drawGuacAvocado,
  spawnBurst, updateBurst, drawBurst,
  spawnFloater, updateFloaters, drawFloaters,
  confettiBurst, updateConfetti, drawConfetti,
  makeShake, kick, stepShake,
} from './arcadeKit'

const INK = '#15281C'
const BODY = '#3d4a42'
const MUTED = '#5C6B60'
const GREEN = '#65A30D'
const AMBER = '#D9A514'
const CARD_BORDER = '1px solid rgba(20,83,45,0.10)'
const DISPLAY_FONT = "'Nunito', 'Bricolage Grotesque', ui-sans-serif, sans-serif"
// Dark wooden dojo backboard — the Fruit-Ninja-style stage; juice splatters read
// bright against it (drawn on the canvas each round; CSS value below is the
// container fallback behind any letterbox).
const FIELD_BG = 'linear-gradient(180deg, #3a2a1c 0%, #20160d 100%)'

const GRAVITY = 700          // arc gravity — items hang long enough to read + slice
const MIN_CUT_SPEED = 0.4    // blade must be moving to cut (px/ms)
const TRAIL_MS = 130
const COMBO_MS = 320         // slices within this window chain into a combo
const BEST_KEY = 'gg-fruit-best-v1'

// Canvas-drawn fruit. skinA/skinB = whole-fruit sphere gradient; flesh = inside
// face when sliced; juice = burst/splat colour; seeds/stripes/leaf = detailing.
const FRUITS = [
  { name: 'watermelon', r: 46, skinA: '#74c261', skinB: '#2f8a3c', flesh: '#fb6f8a', juice: '#f43f5e', seeds: true, stripes: true, leaf: false },
  { name: 'orange',     r: 40, skinA: '#fdba74', skinB: '#c2410c', flesh: '#fb923c', juice: '#f97316', seeds: false, stripes: false, leaf: true },
  { name: 'apple',      r: 40, skinA: '#f87171', skinB: '#991b1b', flesh: '#fde8b0', juice: '#ef4444', seeds: false, stripes: false, leaf: true },
  { name: 'lemon',      r: 36, skinA: '#fde047', skinB: '#a16207', flesh: '#fef3a0', juice: '#facc15', seeds: false, stripes: false, leaf: false },
  { name: 'lime',       r: 36, skinA: '#a3e635', skinB: '#3f6212', flesh: '#dcf5a0', juice: '#84cc16', seeds: false, stripes: false, leaf: false },
  { name: 'plum',       r: 36, skinA: '#c084fc', skinB: '#6b21a8', flesh: '#f0dcff', juice: '#a855f7', seeds: false, stripes: false, leaf: false },
  { name: 'kiwi',       r: 40, skinA: '#997c50', skinB: '#6d5334', flesh: '#c4ec6a', juice: '#a3e635', seeds: true, stripes: false, leaf: false },
  { name: 'peach',      r: 40, skinA: '#fecdd3', skinB: '#be123c', flesh: '#ffe4e6', juice: '#fb7185', seeds: false, stripes: false, leaf: true },
  { name: 'mango',      r: 40, skinA: '#fbbf24', skinB: '#b45309', flesh: '#fde68a', juice: '#f59e0b', seeds: false, stripes: false, leaf: true },
  { name: 'pineapple',  r: 46, skinA: '#fcd34d', skinB: '#a16207', flesh: '#fef08a', juice: '#eab308', seeds: false, stripes: false, leaf: true },
  { name: 'melon',      r: 46, skinA: '#e6cd92', skinB: '#9c7b3c', flesh: '#f6a760', juice: '#f59e0b', seeds: false, stripes: false, leaf: true, net: true },
  { name: 'strawberry', r: 38, skinA: '#fb5069', skinB: '#9f1239', flesh: '#fecdd3', juice: '#e11d48', seeds: false, stripes: false, leaf: false, berry: true },
]

// Real fruit art: transparent PNGs in web/public/games/fruit/<name>.png, one per
// entry in FRUITS above, plus guac.png (the 🥑 bonus). Most are Google Noto Emoji
// (Apache-2.0); watermelon + kiwi are our own whole-fruit renders (no whole
// watermelon/kiwi emoji exists). Whatever exists is used automatically; anything
// missing falls back to the canvas art below. Images render everywhere, incl. the
// app WebView. To restyle a fruit, just drop a replacement PNG here.
const IMG_BASE = '/games/fruit/'
const imgCache = {}
function getImg(name) {
  if (name in imgCache) return imgCache[name]
  if (typeof window === 'undefined') { imgCache[name] = null; return null }
  const img = new Image()
  img.onerror = () => { imgCache[name] = false }
  img.src = `${IMG_BASE}${name}.png`
  imgCache[name] = img
  return img
}
const imgReady = (o) => !!(o && o.complete && o.naturalWidth > 0)

const freshSim = () => ({
  items: [], halves: [], bursts: [], splats: [], floats: [], confetti: [],
  trail: [], cutIdx: 0, strokeCuts: [], comboBest: 0, down: false,
  shake: makeShake(),
  score: 0, sliced: 0, lives: 3, elapsed: 0,
  spawnIn: 700, slowUntil: 0, flash: 0, vignette: 0, lastT: null,
})

// #rrggbb + alpha → rgba() string, for the additive juice splats.
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// Dark wooden dojo backboard (Fruit-Ninja style) — painted once to an offscreen
// canvas and cached by the caller (regenerate only on resize). Local to Fruit
// Slice so the shared warm board other games use is untouched.
function makeDarkBoard(w, h) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, w); c.height = Math.max(1, h)
  const x = c.getContext('2d')
  const base = x.createLinearGradient(0, 0, 0, h)
  base.addColorStop(0, '#3a2a1c'); base.addColorStop(0.5, '#2b1e13'); base.addColorStop(1, '#1f150d')
  x.fillStyle = base; x.fillRect(0, 0, w, h)
  const planks = Math.max(4, Math.round(h / 150))
  const ph = h / planks
  for (let i = 0; i < planks; i++) {
    const py = i * ph
    const t = 0.9 + ((i * 37) % 20) / 100
    x.fillStyle = `rgba(${Math.round(64 * t)},${Math.round(44 * t)},${Math.round(26 * t)},0.5)`
    x.fillRect(0, py, w, ph)
    x.strokeStyle = 'rgba(15,9,4,0.4)'; x.lineWidth = 1
    for (let g = 0; g < 16; g++) {
      const gy = py + 6 + ((g * 53) % Math.max(1, ph - 12))
      x.beginPath(); x.moveTo(0, gy)
      for (let gx = 0; gx <= w; gx += 36) x.lineTo(gx, gy + Math.sin(gx * 0.02 + i + g) * 2.2)
      x.stroke()
    }
    x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 3
    x.beginPath(); x.moveTo(0, py); x.lineTo(w, py); x.stroke()
    x.strokeStyle = 'rgba(150,108,64,0.12)'; x.lineWidth = 1.5
    x.beginPath(); x.moveTo(0, py + 2.5); x.lineTo(w, py + 2.5); x.stroke()
  }
  const vg = x.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.2, w / 2, h * 0.5, Math.max(w, h) * 0.74)
  vg.addColorStop(0, 'rgba(120,86,48,0.16)'); vg.addColorStop(0.6, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)')
  x.fillStyle = vg; x.fillRect(0, 0, w, h)
  return c
}

function segHitsCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1
  const len2 = dx * dx + dy * dy || 1
  let t = ((cx - x1) * dx + (cy - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const px = x1 + t * dx - cx, py = y1 + t * dy - cy
  return px * px + py * py <= r * r
}

// ── canvas fruit art ────────────────────────────────────────────────────────
// A strawberry: heart-ish body + seeds + green calyx (its own silhouette).
function drawBerry(ctx, f, r) {
  ctx.beginPath()
  ctx.moveTo(0, r * 1.02)
  ctx.bezierCurveTo(-r * 1.06, r * 0.32, -r * 0.98, -r * 0.66, -r * 0.12, -r * 0.72)
  ctx.bezierCurveTo(-r * 0.05, -r * 0.9, r * 0.05, -r * 0.9, r * 0.12, -r * 0.72)
  ctx.bezierCurveTo(r * 0.98, -r * 0.66, r * 1.06, r * 0.32, 0, r * 1.02)
  ctx.closePath()
  const g = ctx.createRadialGradient(-r * 0.32, -r * 0.32, r * 0.1, r * 0.1, r * 0.1, r * 1.15)
  g.addColorStop(0, '#ff6b81'); g.addColorStop(0.5, f.skinA); g.addColorStop(1, f.skinB)
  ctx.fillStyle = g; ctx.fill()
  ctx.fillStyle = 'rgba(255,240,150,0.95)'
  for (let row = 0; row < 6; row++) for (let col = -2; col <= 2; col++) {
    const yy = -r * 0.5 + row * r * 0.28
    const xx = col * r * 0.3 * (1 - row * 0.08) + (row % 2 ? r * 0.14 : 0)
    if (Math.hypot(xx, yy) > r * 0.95) continue
    ctx.save(); ctx.translate(xx, yy); ctx.rotate(0.4)
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.045, r * 0.085, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.32)'
  ctx.beginPath(); ctx.ellipse(-r * 0.32, -r * 0.28, r * 0.24, r * 0.15, -0.5, 0, Math.PI * 2); ctx.fill()
  for (let k = -2; k <= 2; k++) { ctx.save(); ctx.rotate(k * 0.5); ctx.fillStyle = k % 2 ? '#3f6212' : '#4d7c0f'; ctx.beginPath(); ctx.ellipse(0, -r * 0.78, r * 0.15, r * 0.34, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
  ctx.fillStyle = '#3f6212'; ctx.beginPath(); ctx.arc(0, -r * 0.78, r * 0.09, 0, Math.PI * 2); ctx.fill()
}

function drawWhole(ctx, it, now) {
  const f = it.fruit
  ctx.save()
  ctx.translate(it.x, it.y)
  ctx.rotate(it.rot)
  const r = it.r
  // soft ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.20)'
  ctx.beginPath(); ctx.ellipse(0, r * 0.98, r * 0.86, r * 0.24, 0, 0, Math.PI * 2); ctx.fill()

  // Real-fruit image (royalty-free Noto Emoji art in /games/fruit) when loaded;
  // otherwise fall back to the canvas-drawn art below. Images render everywhere,
  // including the app WebView, where emoji glyphs go blank.
  const img = getImg(f.name)
  if (imgReady(img)) {
    const d = r * 2.2
    ctx.drawImage(img, -d / 2, -d / 2, d, d)
    ctx.restore()
    return
  }

  if (f.berry) { drawBerry(ctx, f, r); ctx.restore(); return }

  // lit sphere body
  const g = ctx.createRadialGradient(-r * 0.4, -r * 0.44, r * 0.1, r * 0.05, r * 0.05, r * 1.12)
  g.addColorStop(0, f.skinA); g.addColorStop(0.72, f.skinA); g.addColorStop(1, f.skinB)
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill()
  // terminator shade (bottom-right)
  const sh = ctx.createRadialGradient(r * 0.5, r * 0.55, r * 0.12, 0, 0, r * 1.12)
  sh.addColorStop(0, 'rgba(0,0,0,0.30)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)')
  ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()

  // surface texture, clipped to the body
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.99, 0, Math.PI * 2); ctx.clip()
  if (f.stripes) {                       // watermelon
    ctx.strokeStyle = 'rgba(6,46,22,0.55)'; ctx.lineWidth = r * 0.13; ctx.lineCap = 'round'
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath()
      ctx.ellipse(0, 0, r * 0.94, r * (0.3 + Math.abs(k) * 0.02), 0, -Math.PI / 2 + k * 0.42 - 0.32, -Math.PI / 2 + k * 0.42 + 0.32)
      ctx.stroke()
    }
  }
  if (f.net) {                           // cantaloupe netting
    ctx.strokeStyle = 'rgba(255,247,220,0.55)'; ctx.lineWidth = Math.max(1, r * 0.045)
    for (let a = -3; a <= 3; a++) {
      ctx.beginPath(); ctx.moveTo(-r, a * r * 0.28); ctx.quadraticCurveTo(0, a * r * 0.28 - r * 0.12, r, a * r * 0.28); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(a * r * 0.28, -r); ctx.quadraticCurveTo(a * r * 0.28 - r * 0.12, 0, a * r * 0.28, r); ctx.stroke()
    }
  }
  if (f.name === 'pineapple') {          // crosshatch scales
    ctx.strokeStyle = 'rgba(120,72,12,0.5)'; ctx.lineWidth = Math.max(1, r * 0.05)
    for (let d = -5; d <= 5; d++) {
      ctx.beginPath(); ctx.moveTo(-r, d * r * 0.22 - r); ctx.lineTo(r, d * r * 0.22 + r * 0.4); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-r, d * r * 0.22 + r * 0.4); ctx.lineTo(r, d * r * 0.22 - r); ctx.stroke()
    }
  }
  if (f.name === 'orange') {             // pores
    ctx.fillStyle = 'rgba(150,64,10,0.22)'
    for (let k = 0; k < 46; k++) {
      const a = k * 2.399963, rr = Math.sqrt(k / 46) * r * 0.92
      ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.028, 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.restore()

  // glossy highlight
  ctx.fillStyle = 'rgba(255,255,255,0.34)'
  ctx.beginPath(); ctx.ellipse(-r * 0.36, -r * 0.4, r * 0.3, r * 0.18, -0.5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.beginPath(); ctx.arc(-r * 0.46, -r * 0.48, r * 0.08, 0, Math.PI * 2); ctx.fill()

  // pineapple crown, else stem + leaf
  if (f.name === 'pineapple') {
    for (let k = -2; k <= 2; k++) {
      ctx.save(); ctx.rotate(k * 0.34)
      ctx.fillStyle = k % 2 ? '#3f6212' : '#65a30d'
      ctx.beginPath(); ctx.moveTo(-r * 0.13, -r * 0.88); ctx.quadraticCurveTo(0, -r * 1.7, r * 0.13, -r * 0.88); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
  } else if (f.leaf) {
    ctx.strokeStyle = '#6b4226'; ctx.lineWidth = Math.max(1.4, r * 0.09); ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(0, -r * 0.94); ctx.lineTo(r * 0.04, -r * 1.16); ctx.stroke()
    ctx.fillStyle = '#4d7c0f'
    ctx.beginPath(); ctx.ellipse(r * 0.24, -r * 1.02, r * 0.22, r * 0.11, -0.7, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

function drawBomb(ctx, it, now) {
  const r = it.r
  ctx.save()
  ctx.translate(it.x, it.y)
  // red danger glow so the dark bomb still reads on the dark dojo wall
  const dg = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r * 1.9)
  dg.addColorStop(0, 'rgba(239,68,68,0.30)'); dg.addColorStop(1, 'rgba(239,68,68,0)')
  ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath(); ctx.ellipse(0, r * 0.9, r * 0.8, r * 0.28, 0, 0, Math.PI * 2); ctx.fill()
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05)
  g.addColorStop(0, '#4b5563'); g.addColorStop(0.6, '#1f2937'); g.addColorStop(1, '#0b0f14')
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath(); ctx.ellipse(-r * 0.34, -r * 0.36, r * 0.24, r * 0.14, -0.5, 0, Math.PI * 2); ctx.fill()
  // fuse cap + fuse
  ctx.fillStyle = '#374151'; ctx.fillRect(-r * 0.22, -r * 1.12, r * 0.44, r * 0.34)
  ctx.strokeStyle = '#a16207'; ctx.lineWidth = Math.max(2, r * 0.1); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(0, -r * 1.1); ctx.quadraticCurveTo(r * 0.5, -r * 1.4, r * 0.34, -r * 1.6); ctx.stroke()
  // flickering spark
  const s = 2 + Math.abs(Math.sin(now / 70)) * 3
  ctx.fillStyle = '#fde047'
  ctx.beginPath(); ctx.arc(r * 0.34, -r * 1.6, s + 2, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#f97316'
  ctx.beginPath(); ctx.arc(r * 0.34, -r * 1.6, s, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawGuac(ctx, it, now) {
  const r = it.r
  // golden glow halo
  const glow = ctx.createRadialGradient(it.x, it.y, r * 0.4, it.x, it.y, r * 1.7)
  glow.addColorStop(0, 'rgba(250,204,21,0.5)')
  glow.addColorStop(1, 'rgba(250,204,21,0)')
  ctx.fillStyle = glow
  ctx.beginPath(); ctx.arc(it.x, it.y, r * 1.7, 0, Math.PI * 2); ctx.fill()
  // sparkles orbiting
  ctx.fillStyle = '#fef08a'
  for (let k = 0; k < 4; k++) {
    const a = now / 300 + (k * Math.PI) / 2
    const sx = it.x + Math.cos(a) * r * 1.35, sy = it.y + Math.sin(a) * r * 1.35
    ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, Math.PI * 2); ctx.fill()
  }
  // The golden bonus IS the GetGuac 🥑 logo — use the avocado image (guac.png);
  // fall back to the shared canvas mascot only if the image hasn't loaded.
  const img = getImg('guac')
  if (imgReady(img)) {
    ctx.save()
    ctx.translate(it.x, it.y)
    ctx.rotate(it.rot * 0.4)
    const d = r * 2.4
    ctx.drawImage(img, -d / 2, -d / 2, d, d)
    ctx.restore()
  } else {
    drawGuacAvocado(ctx, it.x, it.y, r, it.rot * 0.4)
  }
}

// Idle "attract" scene painted on the maroon stage behind the ▶ Play now pill —
// mirrors the game mockup: fruit + watermelon halves + a blade arc + COMBO ×3.
function drawAttract(ctx, w, h, now) {
  const F = Object.fromEntries(FRUITS.map((f) => [f.name, f]))
  // blade swipe arc
  ctx.save()
  ctx.lineCap = 'round'
  ctx.shadowColor = 'rgba(255,255,255,0.55)'; ctx.shadowBlur = 12
  ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(w * 0.16, h * 0.74)
  ctx.quadraticCurveTo(w * 0.52, h * 0.46, w * 0.86, h * 0.34)
  ctx.stroke()
  ctx.restore()
  // fruit + the signature watermelon halves
  drawWhole(ctx, { x: w * 0.19, y: h * 0.40, r: 30, rot: -0.3, fruit: F.lime }, now)
  drawWhole(ctx, { x: w * 0.72, y: h * 0.42, r: 34, rot: 0.2, fruit: F.orange }, now)
  drawWhole(ctx, { x: w * 0.85, y: h * 0.60, r: 30, rot: 0.1, fruit: F.kiwi }, now)
  drawHalf(ctx, { x: w * 0.35, y: h * 0.50, r: 40, side: -1, rot: -0.5, fruit: F.watermelon, age: 0, life: 1 })
  drawHalf(ctx, { x: w * 0.45, y: h * 0.66, r: 40, side: 1, rot: 0.6, fruit: F.watermelon, age: 0, life: 1 })
  // juice droplets
  ctx.fillStyle = 'rgba(96,165,250,0.9)'
  for (const [dx, dy] of [[0.38, 0.75], [0.41, 0.81]]) {
    ctx.beginPath(); ctx.ellipse(w * dx, h * dy, 5, 7, 0, 0, Math.PI * 2); ctx.fill()
  }
  // COMBO ×3
  ctx.save()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `900 ${Math.min(38, w * 0.05)}px ${DISPLAY_FONT}`
  ctx.shadowColor = 'rgba(251,191,36,0.55)'; ctx.shadowBlur = 16
  ctx.fillStyle = 'rgba(251,191,36,0.92)'
  ctx.fillText('COMBO ×3', w * 0.5, h * 0.86)
  ctx.restore()
}

// A sliced half: clip to a vertical half-disk, fill flesh, rim the arc with skin.
function drawHalf(ctx, hp) {
  const f = hp.fruit, r = hp.r
  const alpha = Math.max(0, 1 - hp.age / hp.life)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(hp.x, hp.y)
  ctx.rotate(hp.rot)

  // Image halves: reuse the real fruit art, clipped to this side, so the two
  // pieces that fly apart keep the pack's look (not flat canvas flesh). A soft
  // dark seam along the cut sells the split. Falls back to canvas art below.
  const himg = getImg(f.name)
  if (imgReady(himg)) {
    ctx.beginPath()
    if (hp.side < 0) ctx.rect(-r * 1.3, -r * 1.3, r * 1.3, r * 2.6)   // left half
    else ctx.rect(0, -r * 1.3, r * 1.3, r * 2.6)                       // right half
    ctx.clip()
    const d = r * 2.2
    ctx.drawImage(himg, -d / 2, -d / 2, d, d)
    ctx.globalAlpha = alpha * 0.5
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.fillRect(hp.side < 0 ? -3.5 : 0, -r * 1.15, 3.5, r * 2.3)
    ctx.restore()
    ctx.globalAlpha = 1
    return
  }

  ctx.beginPath()
  if (hp.side < 0) ctx.arc(0, 0, r, Math.PI * 0.5, Math.PI * 1.5)   // left half
  else ctx.arc(0, 0, r, -Math.PI * 0.5, Math.PI * 0.5)             // right half
  ctx.closePath()
  ctx.clip()
  // flesh face
  const g = ctx.createRadialGradient(0, 0, r * 0.08, 0, 0, r)
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.28, f.flesh); g.addColorStop(1, f.skinB)
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill()
  // white ring under the rind (watermelon look)
  if (f.stripes) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = r * 0.1
    ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.stroke()
  }
  // skin rim
  ctx.strokeStyle = f.skinB; ctx.lineWidth = r * 0.18
  ctx.beginPath(); ctx.arc(0, 0, r - r * 0.09, 0, Math.PI * 2); ctx.stroke()
  // seeds on the flesh face
  if (f.seeds) {
    ctx.fillStyle = 'rgba(30,20,10,0.65)'
    for (let k = 0; k < 5; k++) {
      const sa = (hp.side < 0 ? Math.PI : 0) + (k - 2) * 0.34
      const sx = Math.cos(sa) * r * 0.5, sy = Math.sin(sa) * r * 0.5
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(sa)
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.07, r * 0.04, 0, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
  }
  // wet shine along the cut edge
  ctx.globalAlpha = alpha * 0.5
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(hp.side < 0 ? -1.5 : -0.5, -r, 2, r * 2)
  ctx.restore()
  ctx.globalAlpha = 1
}

export default function FruitSlice() {
  const canvasRef = useRef(null)
  const sim = useRef(freshSim())
  const sizeRef = useRef({ w: 640, h: 480 })
  const statusRef = useRef('idle')
  const bestRef = useRef(0)
  const comboTimer = useRef(null)
  const woodRef = useRef({ c: null, w: 0, h: 0 })
  const [status, setStatusState] = useState('idle')
  const [hud, setHud] = useState({ score: 0, lives: 3 })
  const [combo, setCombo] = useState(0)
  const [best, setBest] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const [overReason, setOverReason] = useState('lives')
  const { saveRes, save, resetSave } = useScoreSaver('fruit')
  const { tone, muted, toggleMute } = useArcadeSound()

  useEffect(() => () => clearTimeout(comboTimer.current), [])

  const setStatus = useCallback((s) => { statusRef.current = s; setStatusState(s) }, [])

  useEffect(() => {
    try {
      const v = parseInt(localStorage.getItem(BEST_KEY) || '0', 10)
      if (v > 0) { bestRef.current = v; setBest(v) }
    } catch {}
  }, [])

  // Warm the royalty-free fruit + avocado art so the very first spawn is an image.
  useEffect(() => {
    for (const f of FRUITS) getImg(f.name)
    getImg('guac')
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const fit = () => {
      const box = canvas.parentElement.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(box.width * dpr)
      canvas.height = Math.round(box.height * dpr)
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { w: box.width, h: box.height }
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const pause = () => { if (statusRef.current === 'playing') setStatus('paused') }
    const vis = () => { if (document.hidden) pause() }
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', vis)
    return () => { window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', vis) }
  }, [setStatus])

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    let raf

    const syncHud = () => {
      const st = sim.current
      setHud({ score: st.score, lives: st.lives })
    }

    const endGame = (reason) => {
      const st = sim.current
      setOverReason(reason)
      setStatus('over')
      setCombo(0)
      save(st.score, null)
      if (st.score > bestRef.current) {
        bestRef.current = st.score
        setBest(st.score)
        setNewBest(true)
        try { localStorage.setItem(BEST_KEY, String(st.score)) } catch {}
        confettiBurst(st.confetti, sizeRef.current.w)
      } else {
        setNewBest(false)
      }
      tone({ f0: 320, f1: 90, t: 0.5, type: 'sawtooth', g: 0.14 })
    }

    // Decide what to toss: rare golden guac bonus, a bomb (ramps with time), or fruit.
    const rollItem = (st) => {
      if (Math.random() < 0.055) return { kind: 'guac', r: 36 }
      const bombChance = Math.min(0.16, 0.03 + st.elapsed * 0.0016)
      if (Math.random() < bombChance) return { kind: 'bomb', r: 30 }
      const f = FRUITS[Math.floor(Math.random() * FRUITS.length)]
      return { kind: 'fruit', fruit: f, r: f.r }
    }

    const spawnItem = (st) => {
      const { w, h } = sizeRef.current
      const base = rollItem(st)
      const r = base.r
      const x = r + Math.random() * (w - 2 * r)
      const grow = Math.min(0.14, st.elapsed * 0.0015)
      const frac = 0.54 + Math.random() * 0.24 + grow
      st.items.push({
        ...base, x, y: h + r, r,
        vx: (w / 2 - x) * (0.34 + Math.random() * 0.4) + (Math.random() - 0.5) * 60,
        vy: -Math.sqrt(2 * GRAVITY * Math.min(h - 30, h * frac)),
        rot: 0, spin: (Math.random() - 0.5) * 1.6,
      })
    }

    // A juice splatter shaped like real paint splash (Fruit-Ninja style): an
    // organic outline with a few long pointed tendrils, plus a spray of flung
    // droplets biased along the cut direction. `dir` = spray direction (radians).
    const pushSplat = (st, x, y, color, r, dir = Math.random() * Math.PI * 2) => {
      const N = 12 + Math.floor(Math.random() * 5)
      const pts = []
      for (let i = 0; i < N; i++) {
        const ang = (i / N) * Math.PI * 2
        // ~30% of points are long spikes → tendrils; the rest form the body
        const spike = Math.random() < 0.3 ? (1.45 + Math.random() * 1.05) : (0.6 + Math.random() * 0.4)
        pts.push({ x: Math.cos(ang) * r * spike, y: Math.sin(ang) * r * spike })
      }
      const drops = []
      const M = 9 + Math.floor(Math.random() * 8)
      for (let i = 0; i < M; i++) {
        const a = dir + (Math.random() - 0.5) * 1.5
        const dist = r * (1.0 + Math.random() * 2.6)
        drops.push({ dx: Math.cos(a) * dist, dy: Math.sin(a) * dist, dr: r * (0.05 + Math.random() * 0.24) })
      }
      st.splats.push({ x, y, color, pts, drops, age: 0, life: 4.5, rot: Math.random() * Math.PI })
      if (st.splats.length > 26) st.splats.shift()
    }

    const sliceFruit = (st, it, now) => {
      const { w } = sizeRef.current
      const f = it.fruit
      st.score += 1
      st.sliced += 1
      spawnBurst(st.bursts, it.x, it.y, { count: 24, color: f.juice, speed: 280, life: 0.62, size: 4.6, gravity: 360 })
      const jdir = Math.atan2(it.vy, it.vx)
      pushSplat(st, it.x, it.y, f.juice, it.r * (0.95 + Math.random() * 0.5), jdir)
      pushSplat(st, it.x + (Math.random() - 0.5) * it.r * 1.4, it.y + (Math.random() - 0.5) * it.r * 1.4, f.juice, it.r * (0.5 + Math.random() * 0.35), jdir + (Math.random() - 0.5) * 1.2)
      // two halves fly apart along the cut
      for (const side of [-1, 1]) {
        st.halves.push({
          fruit: f, r: it.r, side, x: it.x, y: it.y,
          vx: it.vx * 0.4 + side * (90 + Math.random() * 60),
          vy: it.vy * 0.5 - 40 - Math.random() * 40,
          rot: it.rot, spin: side * (2 + Math.random() * 2),
          age: 0, life: 1.2,
        })
      }
      tone({ f0: 620 + Math.random() * 160, f1: 240, t: 0.12, type: 'triangle', g: 0.12 })
      // combo: slices chained within COMBO_MS
      st.strokeCuts.push(now)
      const n = st.strokeCuts.filter((t) => now - t <= COMBO_MS).length
      if (n >= 3) {
        setCombo(n)
        clearTimeout(comboTimer.current)
        comboTimer.current = setTimeout(() => setCombo(0), 1000)
        if (n > st.comboBest) {
          st.score += n
          st.comboBest = n
          spawnFloater(st.floats, w / 2, sizeRef.current.h * 0.26, `COMBO ×${n}  +${n}`, { color: INK, size: 22, life: 1.2, vy: -20, banner: true })
          tone({ f0: 520, f1: 990, t: 0.16, type: 'square', g: 0.1 })
        }
      }
    }

    const onSlice = (it) => {
      const st = sim.current
      const now = performance.now()
      const { w, h } = sizeRef.current
      if (it.kind === 'bomb') {
        spawnBurst(st.bursts, it.x, it.y, { count: 34, color: '#1f2937', speed: 320, life: 0.6, size: 5, gravity: 260 })
        spawnBurst(st.bursts, it.x, it.y, { count: 20, color: '#f97316', speed: 260, life: 0.5, size: 4, gravity: 200 })
        kick(st.shake, 22)
        st.flash = 1
        endGame('bomb')
        return
      }
      if (it.kind === 'guac') {
        st.score += 5
        st.sliced += 1
        spawnBurst(st.bursts, it.x, it.y, { count: 22, color: '#facc15', speed: 260, life: 0.6, size: 4.4, gravity: 300 })
        spawnBurst(st.bursts, it.x, it.y, { count: 14, color: '#65A30D', speed: 200, life: 0.55, size: 4, gravity: 300 })
        spawnFloater(st.floats, it.x, it.y - it.r, 'GUAC +5', { color: '#facc15', size: 22, life: 1, vy: -50 })
        kick(st.shake, 6)
        tone({ f0: 660, f1: 1240, t: 0.2, type: 'triangle', g: 0.12 })
        syncHud()
        return
      }
      // fruit
      sliceFruit(st, it, now)
      kick(st.shake, 3)
      syncHud()
    }

    const update = (st, realMs, now) => {
      const ts = now < st.slowUntil ? 0.35 : 1
      const dt = (realMs * ts) / 1000
      const { w, h } = sizeRef.current
      st.elapsed += dt
      st.spawnIn -= realMs * ts
      if (st.spawnIn <= 0) {
        const n = Math.min(4, 1 + Math.floor(Math.random() * Math.min(4, 1.3 + st.elapsed / 20)))
        for (let i = 0; i < n; i++) spawnItem(st)
        st.spawnIn = Math.max(620, 1450 - st.elapsed * 9) * (0.8 + Math.random() * 0.4)
      }
      for (let i = st.items.length - 1; i >= 0; i--) {
        const it = st.items[i]
        it.vy += GRAVITY * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.spin * dt
        if (it.vy > 0 && it.y > h + it.r + 40) {
          st.items.splice(i, 1)
          if (it.kind === 'fruit') {   // only whole fruit dropped uncut costs a life
            st.lives -= 1
            st.vignette = 1
            spawnFloater(st.floats, Math.max(40, Math.min(w - 40, it.x)), h - 30, 'Missed!', { color: '#fecaca', size: 15, life: 0.8, vy: -30 })
            tone({ f0: 200, f1: 80, t: 0.18, type: 'sine', g: 0.12 })
            syncHud()
            if (st.lives <= 0) { endGame('lives'); return }
          }
        }
      }
      // halves
      for (let i = st.halves.length - 1; i >= 0; i--) {
        const hp = st.halves[i]
        hp.age += dt
        hp.vy += GRAVITY * dt; hp.x += hp.vx * dt; hp.y += hp.vy * dt; hp.rot += hp.spin * dt
        if (hp.age >= hp.life) st.halves.splice(i, 1)
      }
      updateBurst(st.bursts, dt)
      updateFloaters(st.floats, dt)
      updateConfetti(st.confetti, dt, h)
      for (let i = st.splats.length - 1; i >= 0; i--) { st.splats[i].age += dt; if (st.splats[i].age >= st.splats[i].life) st.splats.splice(i, 1) }
      stepShake(st.shake, dt)
      if (st.flash > 0) st.flash = Math.max(0, st.flash - realMs / 320)
      if (st.vignette > 0) st.vignette = Math.max(0, st.vignette - realMs / 420)

      // blade slicing along the trail
      const tr = st.trail
      while (st.down && st.cutIdx < tr.length - 1) {
        const a = tr[st.cutIdx], b = tr[st.cutIdx + 1]
        st.cutIdx++
        const speed = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, b.t - a.t)
        if (speed < MIN_CUT_SPEED) continue
        for (let i = st.items.length - 1; i >= 0; i--) {
          const it = st.items[i]
          if (segHitsCircle(a.x, a.y, b.x, b.y, it.x, it.y, it.r)) {
            st.items.splice(i, 1)
            onSlice(it)
            if (statusRef.current !== 'playing') return  // bomb ended the round
          }
        }
      }
      while (tr.length && now - tr[0].t > TRAIL_MS) { tr.shift(); st.cutIdx = Math.max(0, st.cutIdx - 1) }
    }

    const render = (st, now) => {
      const { w, h } = sizeRef.current
      ctx.clearRect(0, 0, w, h)
      // wooden board (cached; regenerated only on resize)
      const wref = woodRef.current
      const rw = Math.round(w), rh = Math.round(h)
      if (!wref.c || wref.w !== rw || wref.h !== rh) { wref.c = makeDarkBoard(rw, rh); wref.w = rw; wref.h = rh }
      ctx.drawImage(wref.c, 0, 0, w, h)
      if (statusRef.current === 'idle') { drawAttract(ctx, w, h, now); return }
      ctx.save()
      ctx.translate(st.shake.x, st.shake.y)
      // juice splats — bright, painted straight onto the dark dojo wall so the
      // colour pops and lingers (the Fruit-Ninja juice-on-the-wall look)
      for (const sp of st.splats) {
        const a = Math.max(0, 1 - sp.age / sp.life)
        ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(sp.rot || 0)
        ctx.fillStyle = hexA(sp.color, 0.62 * a)
        // organic splat body: smooth curve threaded through the spike points, so
        // long spikes become pointed tendrils and short ones the round body
        const p = sp.pts
        ctx.beginPath()
        ctx.moveTo((p[p.length - 1].x + p[0].x) / 2, (p[p.length - 1].y + p[0].y) / 2)
        for (let i = 0; i < p.length; i++) {
          const n = p[(i + 1) % p.length]
          ctx.quadraticCurveTo(p[i].x, p[i].y, (p[i].x + n.x) / 2, (p[i].y + n.y) / 2)
        }
        ctx.closePath(); ctx.fill()
        // flung droplets (the spray)
        for (const d of sp.drops) { ctx.beginPath(); ctx.arc(d.dx, d.dy, d.dr, 0, Math.PI * 2); ctx.fill() }
        // wet sheen
        ctx.fillStyle = hexA('#ffffff', 0.14 * a)
        ctx.beginPath(); ctx.ellipse(-sp.pts[0].x * 0.2, -Math.abs(sp.pts[0].y) * 0.3, 3, 2, 0, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }
      ctx.globalAlpha = 1
      for (const hp of st.halves) drawHalf(ctx, hp)
      drawBurst(ctx, st.bursts)
      for (const it of st.items) {
        if (it.kind === 'bomb') drawBomb(ctx, it, now)
        else if (it.kind === 'guac') drawGuac(ctx, it, now)
        else drawWhole(ctx, it, now)
      }
      // blade trail
      const tr = st.trail
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      for (let i = 1; i < tr.length; i++) {
        const k = Math.max(0, 1 - (now - tr[i].t) / TRAIL_MS) * (i / tr.length)
        if (k <= 0) continue
        ctx.beginPath(); ctx.moveTo(tr[i - 1].x, tr[i - 1].y); ctx.lineTo(tr[i].x, tr[i].y)
        ctx.strokeStyle = `rgba(190,242,100,${0.42 * k})`; ctx.lineWidth = 3 + 13 * k; ctx.stroke()
        ctx.strokeStyle = `rgba(255,255,255,${0.95 * k})`; ctx.lineWidth = 1 + 6 * k; ctx.stroke()
      }
      drawFloaters(ctx, st.floats)
      drawConfetti(ctx, st.confetti)
      ctx.restore()
      // bomb flash
      if (st.flash > 0) { ctx.fillStyle = `rgba(255,240,220,${0.7 * st.flash})`; ctx.fillRect(0, 0, w, h) }
      // low-life vignette
      if (st.vignette > 0) {
        const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72)
        g.addColorStop(0, 'rgba(225,29,72,0)')
        g.addColorStop(1, `rgba(225,29,72,${0.4 * st.vignette})`)
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
      }
    }

    const loop = (t) => {
      const st = sim.current
      const realMs = Math.min(50, st.lastT == null ? 16 : t - st.lastT)
      st.lastT = t
      const now = performance.now()
      if (statusRef.current === 'playing') update(st, realMs, now)
      render(st, now)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [setStatus, save, tone])

  const addSample = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const tr = sim.current.trail
    tr.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() })
    if (tr.length > 10) { tr.shift(); sim.current.cutIdx = Math.max(0, sim.current.cutIdx - 1) }
  }
  const onDown = (e) => {
    if (statusRef.current !== 'playing') return
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    const st = sim.current
    st.down = true
    st.trail = []; st.cutIdx = 0
    st.strokeCuts = []; st.comboBest = 0
    addSample(e)
  }
  const onMove = (e) => { if (sim.current.down && statusRef.current === 'playing') addSample(e) }
  const onUp = () => { sim.current.down = false }

  const start = () => {
    Object.assign(sim.current, freshSim())
    setHud({ score: 0, lives: 3 })
    setCombo(0)
    setNewBest(false)
    resetSave()
    setStatus('playing')
  }
  const resume = () => { sim.current.lastT = null; sim.current.down = false; setStatus('playing') }

  const overlayCard = 'rounded-2xl p-5 text-center w-full'
  const pillGreen = 'text-sm font-bold px-6 py-2.5 rounded-full text-white'

  return (
    <div className="mx-auto w-full select-none">
      {/* Arena — dark guac field */}
      <div className="relative rounded-2xl overflow-hidden" style={{ height: 'clamp(440px, calc(100svh - 230px), 560px)', minHeight: 420, background: FIELD_BG }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: status === 'playing' ? 'crosshair' : 'default' }}
        />

        {status === 'playing' && (
          <ArcadeHud
            dark={true}
            score={hud.score} scoreLabel="SCORE" best={best > 0 ? best : null}
            status={combo >= 3 ? `🍉 COMBO ×${combo}` : null} statusTone="gold"
            lives={hud.lives}
            hint="Swipe to slice the fruit · chain slices for combos · dodge the bombs"
            onPause={() => setStatus('paused')}
            muted={muted} onMute={toggleMute}
          />
        )}

        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
            <button
              onClick={start}
              className="pointer-events-auto flex items-center gap-2 font-display font-extrabold rounded-full transition-transform active:scale-95"
              style={{ background: '#7ED957', color: '#14311a', fontSize: 'clamp(18px, 2.4vw, 24px)', padding: '15px 32px', boxShadow: '0 0 0 7px rgba(126,217,87,0.22), 0 16px 34px rgba(0,0,0,0.4)' }}
            >
              <span aria-hidden style={{ fontSize: '0.8em' }}>▶</span> Play now
            </button>
          </div>
        )}

        {status === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(5,25,14,0.55)' }}>
            <div className={overlayCard} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 320 }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Paused 🍉</div>
              <p className="text-sm mt-1" style={{ color: BODY }}>The blade waits for no one — except you.</p>
              <button onClick={resume} className={`mt-3 ${pillGreen}`} style={{ background: GREEN }}>Resume</button>
            </div>
          </div>
        )}

        {status === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(5,25,14,0.55)' }}>
            <div className={overlayCard} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 380 }}>
              <div className="text-3xl mb-1">{overReason === 'bomb' ? '💥' : '🍉'}</div>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>
                {overReason === 'bomb' ? 'Boom! You sliced a bomb.' : 'Out of fruit lives!'}
              </div>
              <div className="text-[11px] font-semibold mt-3" style={{ color: MUTED }}>Score</div>
              <div className="font-display font-extrabold text-4xl" style={{ color: GREEN }}>{hud.score}</div>
              {newBest && (
                <div className="inline-block mt-1 text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: AMBER }}>New best! 🍉</div>
              )}
              <div className="text-sm mt-2" style={{ color: BODY }}>Best <span className="font-display font-extrabold" style={{ color: INK }}>{best}</span></div>
              <SaveScoreLine res={saveRes} />
              <button onClick={start} className={`mt-4 ${pillGreen}`} style={{ background: GREEN }}>Play again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

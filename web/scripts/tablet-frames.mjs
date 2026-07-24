#!/usr/bin/env node
// =============================================================================
// Tablet store screenshots — same design as the phone frames, iPad-sized.
// =============================================================================
// Headline text above, the goal's stat/ring bubble, device below running off the
// bottom edge — identical language to reel-frames.mjs, recomposed for a 3:4
// tablet canvas with a real iPad screen instead of a phone.
//
// Source: the 12 iPad Pro 13-inch simulator captures (2064x2752, already
// ad-free) in C:/Harward/attachments_ipdone. Three of those are empty states
// (an empty receipts list and two empty inboxes) and are deliberately unmapped —
// an empty screen sells the feature as doing nothing.
//
// Output:
//   marketing-assets/tablet-2064x2752/   App Store, iPad 13"
//   marketing-assets/tablet-1600x2560/   Play Store, 10" tablet
//
// Usage:
//   node web/scripts/tablet-frames.mjs              # both sizes
//   PRESET=ipad node web/scripts/tablet-frames.mjs  # one
// =============================================================================

import { chromium } from 'playwright'
import sharp from 'sharp'
import { readFileSync, readdirSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(__dirname, '..')
const ICON = resolve(WEB, '..', 'mobile', 'assets', 'icon', 'icon.png')
const IPAD_DIR = 'C:/Harward/attachments_ipdone'

// Authored at 1400 CSS px wide so the copy sits at a sane size on a tablet
// canvas; each preset picks the deviceScaleFactor that lands on the store size.
const CSS_W = 1400
const PRESETS = {
  ipad:    { dir: 'tablet-2064x2752', out: [2064, 2752] },  // App Store, iPad 13"
  ipad129: { dir: 'tablet-2048x2732', out: [2048, 2732] },  // App Store, iPad 12.9" slot
  play:    { dir: 'tablet-1600x2560', out: [1600, 2560] },  // Play, 10" tablet
}

const DEVICE_W = 1060      // iPad body width in CSS px
const DEVICE_TOP = 900     // y of its top edge — it runs off the bottom

// Which iPad capture backs each goal. Index into the chronologically-sorted
// file list. 1 / 4 / 9 are the empty states and are intentionally absent.
const SHOTS = {
  organized: 6,   // Guacanomics — GuacScore ring 74, trend, top-store bars
  fees:      7,   // GuacWizard 92/100 + insights
  'worth-it': 5,  // Worth It donut $1,172, 4.4★
  receipts:  2,   // itemised receipts list
  smashlist: 3,   // Smashlist
  guacmoney: 8,   // Rewards
  'guac-ai': 10,  // Guac AI chat
  games:     11,  // Arcade
  tax:       0,   // Dashboard — Tax Paid tile + spend-by-store
  subs:      0,   // same shot: "$59.84/mo across 4 subscriptions"
}

// Ring callouts, only where the screen behind them shows the same figure.
const RINGS = {
  organized: { value: 74, max: 100, show: '74', name: 'GuacScore', sub: 'Steady Guac' },
  fees:      { value: 92, max: 100, show: '92', name: 'GuacWizard', sub: 'Wizard score' },
  'worth-it':{ value: 4.4, max: 5, show: '4.4★', name: 'Worth It?', sub: 'avg of 26 rated' },
}

const src = readFileSync(resolve(WEB, 'src', 'components', 'GoalsShowcase.jsx'), 'utf8')
const m = src.match(/const CARDS = (\[[\s\S]*?\n\])\n/)
if (!m) throw new Error('Could not find the CARDS array in GoalsShowcase.jsx')
const CARDS = eval(m[1])

const iPads = readdirSync(IPAD_DIR).filter(f => /ipad/i.test(f) && /\.png$/i.test(f)).sort()
if (iPads.length < 12) throw new Error(`Expected 12 iPad captures in ${IPAD_DIR}, found ${iPads.length}`)

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const dataUri = (buf, mime = 'image/png') => `data:${mime};base64,${buf.toString('base64')}`
const iconUri = dataUri(readFileSync(ICON))

const R = 56, STROKE = 9
const RC = 2 * Math.PI * R
const RSVG = (R + STROKE) * 2 + 4

function ringCard(r) {
  return `<div class="bubble ring">
    <div class="rg">
      <svg viewBox="0 0 ${RSVG} ${RSVG}">
        <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#16a34a"/><stop offset="0.55" stop-color="#a8c414"/><stop offset="1" stop-color="#f59e0b"/>
        </linearGradient></defs>
        <circle cx="${RSVG / 2}" cy="${RSVG / 2}" r="${R}" fill="white"/>
        <circle cx="${RSVG / 2}" cy="${RSVG / 2}" r="${R}" fill="none" stroke="#e5e7eb" stroke-width="${STROKE}"/>
        <circle cx="${RSVG / 2}" cy="${RSVG / 2}" r="${R}" fill="none" stroke="url(#rg)" stroke-width="${STROKE}"
          stroke-linecap="round" stroke-dasharray="${RC}" stroke-dashoffset="${RC * (1 - r.value / r.max)}"
          transform="rotate(-90 ${RSVG / 2} ${RSVG / 2})"/>
      </svg>
      <span>${esc(r.show)}</span>
    </div>
    <div class="rm"><b>${esc(r.name)}</b><i>${esc(r.sub)}</i></div>
  </div>`
}

function statCard(c) {
  return `<div class="bubble stat">
    <div class="sh"><b>${esc(c.e)} ${esc(c.name)}</b><i>${esc(c.tag)}</i></div>
    <div class="sb">${esc(c.big)}</div>
    <div class="ss">${esc(c.sub)}</div>
  </div>`
}

const titleSize = t => (t.length > 36 ? 74 : t.length > 28 ? 82 : 90)

function html(c, shotUri, cssH) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: ${CSS_W}px; height: ${cssH}px; overflow: hidden; position: relative;
         background: #fff; font-family: 'Plus Jakarta Sans', sans-serif; }
  .glow { position: absolute; left: 50%; top: ${DEVICE_TOP - 220}px; transform: translateX(-50%);
          width: 1500px; height: 1500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(101,163,13,0.17) 0%, rgba(101,163,13,0.06) 44%, rgba(255,255,255,0) 70%); }
  .top { position: absolute; left: 0; right: 0; top: 150px; padding: 0 110px; text-align: center; }
  .brand { display: flex; align-items: center; justify-content: center; gap: 18px; }
  .brand img { width: 74px; height: 74px; border-radius: 19px; }
  .brand span { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 48px; color: #15281C; letter-spacing: -0.02em; }
  .emoji { font-size: 84px; line-height: 1; margin: 36px 0 20px; }
  h1 { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: ${titleSize(c.goal)}px;
       line-height: 1.06; letter-spacing: -0.035em; color: #15281C; }
  .blurb { font-size: 34px; line-height: 1.5; color: #56655B; margin: 28px auto 0; max-width: 1020px; }
  .cta { display: inline-block; margin-top: 38px; background: #65A30D; color: #fff; font-weight: 700;
         font-size: 34px; padding: 24px 52px; border-radius: 999px; box-shadow: 0 24px 48px -18px rgba(101,163,13,0.65); }

  /* the iPad: rounded screen inside a thin dark body */
  .device { position: absolute; left: 50%; top: ${DEVICE_TOP}px; transform: translateX(-50%); width: ${DEVICE_W}px; }
  .device img { width: 100%; display: block; border: 16px solid #17181b; border-radius: 46px;
                filter: drop-shadow(0 44px 64px rgba(20,40,28,0.34)); }

  /* Sits low and hangs well off the left edge. At +300 it landed squarely on
     the screen's OWN GuacScore ring — the callout hid the thing it pointed at. */
  .bubble { position: absolute; left: 24px; top: ${DEVICE_TOP + 620}px; background: #fff;
            border: 3px solid #65A30D; border-radius: 30px;
            box-shadow: 0 30px 58px -22px rgba(101,163,13,0.5); }
  .ring { width: 372px; display: flex; align-items: center; gap: 22px; padding: 26px 28px; }
  .rg { position: relative; width: 152px; height: 152px; flex: 0 0 152px; }
  .rg svg { width: 100%; height: 100%; display: block; }
  .rg span { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
             font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 46px; color: #15281C; letter-spacing: -0.03em; }
  .rm b { display: block; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 28px; color: #15281C; }
  .rm i { display: block; font-style: normal; font-size: 20px; font-weight: 700; color: #65A30D; margin-top: 7px; }
  .stat { width: 380px; padding: 26px 30px; }
  .sh { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; margin-bottom: 12px; }
  .sh b { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 26px; color: #15281C;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sh i { font-style: normal; font-size: 18px; color: #8A988E; white-space: nowrap; flex: 0 0 auto; }
  .sb { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 54px; letter-spacing: -0.02em; color: #15281C; line-height: 1.08; }
  .ss { font-size: 20px; color: #65A30D; font-weight: 700; margin-top: 8px; line-height: 1.35; }
</style></head><body>
  <div class="glow"></div>
  <div class="top">
    <div class="brand"><img src="${iconUri}"><span>GetGuac</span></div>
    <div class="emoji">${esc(c.e)}</div>
    <h1>${esc(c.goal)}</h1>
    <p class="blurb">${esc(c.blurb)}</p>
    <div class="cta">${esc(c.cta)} →</div>
  </div>
  <div class="device"><img src="${shotUri}"></div>
  ${RINGS[c.slug] ? ringCard(RINGS[c.slug]) : statCard(c)}
</body></html>`
}

const want = process.env.PRESET
const presets = want ? [[want, PRESETS[want]]] : Object.entries(PRESETS)
if (!presets[0][1]) throw new Error(`Unknown PRESET. Use: ${Object.keys(PRESETS).join(', ')}`)

// Pre-scale each iPad capture to the device width so the browser isn't
// resampling a 2064px image down to 1060 on every frame.
const shotCache = new Map()
async function shotUri(idx) {
  if (!shotCache.has(idx)) {
    const buf = await sharp(resolve(IPAD_DIR, iPads[idx]))
      .resize({ width: DEVICE_W - 32, kernel: 'lanczos3' })
      .png().toBuffer()
    shotCache.set(idx, dataUri(buf))
  }
  return shotCache.get(idx)
}

const b = await chromium.launch()

for (const [name, preset] of presets) {
  const dsf = preset.out[0] / CSS_W
  const cssH = Math.round(preset.out[1] / dsf)
  const out = resolve(WEB, 'marketing-assets', preset.dir)
  mkdirSync(out, { recursive: true })

  const page = await b.newPage({ viewport: { width: CSS_W, height: cssH }, deviceScaleFactor: dsf })
  let n = 0
  for (const c of CARDS) {
    const idx = SHOTS[c.slug]
    if (idx === undefined) continue           // no tablet screen for this goal
    await page.setContent(html(c, await shotUri(idx), cssH), { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(250)
    const shot = await page.screenshot()
    const nn = String(CARDS.indexOf(c) + 1).padStart(2, '0')
    await sharp(shot).resize(preset.out[0], preset.out[1], { fit: 'fill' }).png()
      .toFile(resolve(out, `${nn}-${c.slug}.png`))
    n++
  }
  await page.close()
  console.log(`✓ ${name}: ${n} frames at ${preset.out.join('x')} → ${preset.dir}`)
}

await b.close()

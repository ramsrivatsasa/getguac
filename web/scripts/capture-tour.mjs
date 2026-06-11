#!/usr/bin/env node
// =============================================================================
// Capture the GetGuac feature tour — screenshots + a captioned video.
// =============================================================================
// Drives a real browser through every feature (logged into the demo account
// seeded by seed-demo-account.mjs) and produces:
//   marketing-assets/screens/desktop/NN-key.png   (1440x900 @2x — web/landing)
//   marketing-assets/screens/phone/NN-key.png     (390x844  @3x — store frames)
//   marketing-assets/video/how-it-works.webm       (captioned screen tour)
//
// The scene list mirrors marketing/how-it-works.md. Captions are burned into
// the VIDEO only; the still screenshots are clean so frame-screenshots.mjs can
// add store-style header captions itself.
//
// Usage:
//   node web/scripts/capture-tour.mjs                 # shots + video
//   node web/scripts/capture-tour.mjs --shots         # screenshots only
//   node web/scripts/capture-tour.mjs --video         # video only
//   BASE_URL=http://localhost:3000 node web/scripts/capture-tour.mjs
//   DEMO_EMAIL=demo@getguac.app DEMO_PASSWORD='Guac!Demo2026' node ...
// =============================================================================

import { chromium } from 'playwright'
import { mkdirSync, renameSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'marketing-assets')
const BASE = (process.env.BASE_URL || 'https://getguac.app').replace(/\/$/, '')
const EMAIL = process.env.DEMO_EMAIL || 'demo@getguac.app'
const PASSWORD = process.env.DEMO_PASSWORD || 'Guac!Demo2026'

const onlyShots = process.argv.includes('--shots')
const onlyVideo = process.argv.includes('--video')
const doShots = !onlyVideo
const doVideo = !onlyShots

// Public landing (no auth) first, then authed feature routes. `public:true`
// means capture before signing in. Captions ≤ ~6 words for the video banner.
// Framed around "how GetGuac saves you money." video:false scenes are captured
// as stills but skipped in the video until their demo data is seeded.
const SCENES = [
  { key: 'landing', route: '/', caption: 'Stop leaving money on the table', public: true },
  { key: 'receipts', route: '/receipts', caption: 'Snap any receipt' },
  { key: 'items', route: '/items', caption: 'AI reads every line — no typing' },
  { key: 'dashboard', route: '/dashboard', caption: 'Your GuacScore + spending anomalies' },
  { key: 'steals', route: '/steals', caption: 'Find a cheaper price before you buy' },
  { key: 'returns', route: '/returns', caption: 'Claw back refunds you are owed' },
  { key: 'guacwizard', route: '/guacwizard', caption: 'GuacWizard hunts hidden fees & leaks' },
  { key: 'bank', route: '/bank', caption: 'Catch every bank fee & interest charge' },
  { key: 'bites', route: '/bites', caption: 'Rate every dish — skip the regrets' },
  { key: 'stash', route: '/stash', caption: 'Your whole Stash, in one place' },
  { key: 'shopping', route: '/shopping', caption: 'Your Smashlist builds itself' },
  { key: 'reports', route: '/reports', caption: 'Business & charity, tax-ready' },
  { key: 'guacanomics', route: '/guacanomics', caption: 'Every dollar earns its smash' },
]

const PROFILES = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, dsf: 2, fullPage: false },
  { name: 'phone', viewport: { width: 390, height: 844 }, dsf: 3, fullPage: false },
]

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('input[autocomplete="username"]', EMAIL)
  await page.fill('input[autocomplete="current-password"]', PASSWORD)
  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 45000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ])
  // settle the dashboard's first data load
  await page.waitForLoadState('networkidle').catch(() => {})
  await sleep(1500)
}

async function gotoScene(page, scene) {
  await page.goto(`${BASE}${scene.route}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  await sleep(2800) // let client-side data (React Query) fetch + charts render
  // nudge a tiny scroll so lazy content mounts, then back to top
  await page.evaluate(() => { window.scrollTo(0, 1); window.scrollTo(0, 0) })
}

async function showCaption(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById('__tourcap')
    if (!el) {
      el = document.createElement('div')
      el.id = '__tourcap'
      el.style.cssText = 'position:fixed;left:50%;bottom:34px;transform:translateX(-50%);' +
        'z-index:2147483647;background:#059669;color:#fff;font:700 21px/1.25 system-ui,-apple-system,sans-serif;' +
        'padding:13px 26px;border-radius:9999px;box-shadow:0 12px 34px rgba(0,0,0,.28);' +
        'max-width:88vw;text-align:center;letter-spacing:.2px;pointer-events:none'
      document.body.appendChild(el)
    }
    el.textContent = t
  }, text).catch(() => {})
}

// ─── screenshots: clean stills for each profile ────────────────────────────
async function captureShots() {
  for (const p of PROFILES) {
    const dir = resolve(OUT, 'screens', p.name)
    mkdirSync(dir, { recursive: true })
    const browser = await chromium.launch()
    const ctx = await browser.newContext({ viewport: p.viewport, deviceScaleFactor: p.dsf })
    const page = await ctx.newPage()

    // public scenes first (no auth), then login, then the rest
    const pub = SCENES.filter(s => s.public)
    const authed = SCENES.filter(s => !s.public)
    let n = 0
    for (const s of pub) {
      await gotoScene(page, s)
      await page.screenshot({ path: resolve(dir, `${String(++n).padStart(2, '0')}-${s.key}.png`) })
      console.log(`  [${p.name}] ${s.key}`)
    }
    await login(page)
    for (const s of authed) {
      await gotoScene(page, s)
      await page.screenshot({ path: resolve(dir, `${String(++n).padStart(2, '0')}-${s.key}.png`) })
      console.log(`  [${p.name}] ${s.key}`)
    }
    await browser.close()
    console.log(`✓ ${p.name} screenshots → ${dir}`)
  }
}

// ─── video: phone-viewport captioned tour ──────────────────────────────────
async function captureVideo() {
  const vdir = resolve(OUT, 'video')
  mkdirSync(vdir, { recursive: true })
  // recordVideo.size MUST equal the viewport (CSS px) or the page renders into
  // a corner and the rest letterboxes. Use a larger phone viewport at dsf 1 for
  // a crisp, full-frame 9:16-ish capture.
  const size = { width: 540, height: 1170 }
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: size, deviceScaleFactor: 1,
    recordVideo: { dir: vdir, size },
  })
  const page = await ctx.newPage()

  // Scene 1 (landing) plays before login since the user isn't authed yet.
  const landing = SCENES.find(s => s.public)
  await gotoScene(page, landing)
  await showCaption(page, landing.caption)
  await sleep(3000)

  await login(page)

  for (const s of SCENES.filter(x => !x.public && x.video !== false)) {
    await gotoScene(page, s)
    await showCaption(page, s.caption)
    await sleep(2900)
  }
  // hold the final frame
  await sleep(1200)

  await ctx.close() // flush the video file
  await browser.close()

  // Playwright names videos by a random id; rename the newest to our name.
  const vids = readdirSync(vdir).filter(f => f.endsWith('.webm'))
  if (vids.length) {
    const newest = vids.map(f => ({ f, t: f })).sort((a, b) => (a.f < b.f ? 1 : -1))[0].f
    try { renameSync(resolve(vdir, newest), resolve(vdir, 'how-it-works.webm')) } catch {}
  }
  console.log(`✓ video → ${resolve(vdir, 'how-it-works.webm')}`)
}

console.log(`Capturing from ${BASE} as ${EMAIL}`)
if (doShots) { console.log('— screenshots —'); await captureShots() }
if (doVideo) { console.log('— video —'); await captureVideo() }
console.log('\nDone. Assets in', OUT)

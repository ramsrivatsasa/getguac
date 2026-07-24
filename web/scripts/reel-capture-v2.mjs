#!/usr/bin/env node
// =============================================================================
// Capture the CHART-side of the app as phone screens, for Reel frames v2.
// =============================================================================
// v1 used public/home/goals/phone-*.webp, which are mostly list screens (rows of
// receipts, bills, stash items). Those read as "spreadsheet" at Reel size. This
// grabs the visual surfaces instead — the GuacScore ring, the category donut,
// the Worth-It donut, the Guacanomics charts — by scrolling each route to the
// element that actually holds the graphic before shooting.
//
// Shots are 390x844 @3x (1170x2532) so they stay sharp when the Reel composer
// puts them on screen at 660px. Raw shots land in .reel-tmp/, then this shells
// out to frame-iphone.mjs for the bezel.
//
// Output: marketing-assets/reel-src-v2/<key>_iphone.png (transparent bg)
//
// Usage:
//   node web/scripts/reel-capture-v2.mjs               # all, against prod
//   BASE_URL=http://localhost:3000 node ... reel-capture-v2.mjs
//   node web/scripts/reel-capture-v2.mjs guacscore     # just one
// =============================================================================

import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(__dirname, '..')
const TMP = resolve(WEB, '.reel-tmp')
const OUT = resolve(WEB, 'marketing-assets', 'reel-src-v2')

const BASE = (process.env.BASE_URL || 'https://getguac.app').replace(/\/$/, '')
const EMAIL = process.env.DEMO_EMAIL || 'demo@getguac.app'
const PASSWORD = process.env.DEMO_PASSWORD || 'Guac!Demo2026'

// `anchor` is text we scroll to before shooting — it's how we land on the chart
// instead of the top-of-page header. `offset` nudges the final scroll position
// (negative = show a bit above the anchor, so the section heading stays in frame).
const SHOTS = [
  { key: 'guacscore',    route: '/dashboard',    anchor: null,                   offset: 0,    note: 'GuacScore ring + core tiles' },
  { key: 'donut',        route: '/reports',      anchor: 'Spending by category', offset: -90,  note: 'category donut' },
  { key: 'worth-it',     route: '/validate',     anchor: null,                   offset: 0,    note: 'Worth It donut' },
  { key: 'tax-donut',    route: '/reports',      anchor: 'Tax summary',          offset: -90,  note: 'tax summary' },
  { key: 'stores-chart', route: '/reports',      anchor: 'Top stores by spend',  offset: -90,  note: 'top stores bars' },
  { key: 'subs-chart',   route: '/reports',      anchor: 'Subscriptions',        offset: -90,  note: 'subscriptions' },
  { key: 'guacanomics',  route: '/guacanomics',  anchor: null,                   offset: 0,    note: 'guacanomics charts' },
  { key: 'guacanomics2', route: '/guacanomics',  anchor: 'Worth It',             offset: -90,  note: 'guacanomics lower charts' },
  { key: 'guacwizard',   route: '/guacwizard',   anchor: null,                   offset: 0,    note: 'wizard score gauge' },
  { key: 'bank',         route: '/bank',         anchor: null,                   offset: 0,    note: 'bank bite' },
]

const only = process.argv[2]
const targets = only ? SHOTS.filter(s => s.key === only) : SHOTS
if (!targets.length) throw new Error(`No shot "${only}". Known: ${SHOTS.map(s => s.key).join(', ')}`)

const sleep = ms => new Promise(r => setTimeout(r, ms))

rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })
mkdirSync(OUT, { recursive: true })

const b = await chromium.launch()
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
})
const p = await ctx.newPage()

console.log('logging in as', EMAIL, 'at', BASE)
await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await p.fill('input[autocomplete="username"]', EMAIL)
await p.fill('input[autocomplete="current-password"]', PASSWORD)
await Promise.all([
  p.waitForURL('**/dashboard', { timeout: 60000 }).catch(() => {}),
  p.click('button[type="submit"]'),
])
await p.waitForLoadState('networkidle').catch(() => {})
await sleep(2500)

// HARD FAIL if we're still logged out. The first run of this script swallowed
// the login failure and cheerfully captured ten screenshots of the sign-in
// page, reporting every one as a success. Never again.
if (/\/login/.test(p.url())) {
  throw new Error(`Login failed — still at ${p.url()}. Check DEMO_EMAIL/DEMO_PASSWORD, or whether login now has a bot check.`)
}

for (const s of targets) {
  await p.goto(`${BASE}${s.route}`, { waitUntil: 'domcontentloaded' })
  await p.waitForLoadState('networkidle').catch(() => {})
  await sleep(3200)                       // charts animate in; let them settle

  if (s.anchor) {
    const found = await p.evaluate(({ text, offset }) => {
      const el = [...document.querySelectorAll('h1,h2,h3,h4')]
        .find(n => n.textContent.trim().toLowerCase().includes(text.toLowerCase()))
      if (!el) return false
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: 'instant' })
      return true
    }, { text: s.anchor, offset: s.offset })
    if (!found) console.warn('  ! anchor not found:', s.anchor, '— shooting top of page')
    await sleep(1400)                     // re-settle after the jump
  }

  await p.screenshot({ path: resolve(TMP, `${s.key}.png`) })
  console.log('✓ captured', s.key, '—', s.note)
}

await b.close()

console.log('\nframing…')
execFileSync(process.execPath, [resolve(__dirname, 'frame-iphone.mjs'), TMP, OUT], { stdio: 'inherit' })
rmSync(TMP, { recursive: true, force: true })
console.log('\n→', OUT)

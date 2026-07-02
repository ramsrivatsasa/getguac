// Capture full-page MOBILE screenshots of every app screen, logged in as the
// demo account, for use as design references / mockup source images.
//
// Usage (against the local dev server running the new design):
//   BASE_URL=http://localhost:3000 node scripts/capture-mobile.mjs
// Falls back to production if BASE_URL is unset.
//
// Output: <repo>/mobile-screens/<key>.png  (iPhone-ish 390x844 @3x, full page)
import { chromium, devices } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', '..', 'mobile-screens')
const BASE = (process.env.BASE_URL || 'https://getguac.app').replace(/\/$/, '')
const EMAIL = process.env.DEMO_EMAIL || 'demo@getguac.app'
const PASSWORD = process.env.DEMO_PASSWORD || 'Guac!Demo2026'

// Every app screen worth a mobile design image. [filename, route]
const ROUTES = [
  ['dashboard',    '/dashboard'],
  ['worth-it',     '/validate'],
  ['guacanomics',  '/guacanomics'],
  ['guacwizard',   '/guacwizard'],
  ['receipts',     '/receipts'],
  ['reports',      '/reports'],
  ['bills',        '/bills'],
  ['plan',         '/plan'],
  ['bank',         '/bank'],
  ['returns',      '/returns'],
  ['rewards',      '/rewards'],
  ['stores',       '/stores'],
  ['stash',        '/stash'],
  ['smashlist',    '/shopping'],
  ['steals',       '/steals'],
  ['marketplace',  '/marketplace'],
  ['bites',        '/bites'],
  ['inbox',        '/inbox'],
  ['connections',  '/connections'],
  ['chat',         '/chat'],
  ['car-miles',    '/car-miles'],
  ['profile',      '/profile'],
  ['coupons',      '/coupons'],
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(OUT, { recursive: true })

const b = await chromium.launch()
// iPhone 12/13-class viewport at 3x for crisp retina design images.
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: devices['iPhone 13']?.userAgent,
})
const p = await ctx.newPage()

console.log('base:', BASE, '| logging in as', EMAIL)
await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await p.fill('input[autocomplete="username"]', EMAIL)
await p.fill('input[autocomplete="current-password"]', PASSWORD)
await Promise.all([
  p.waitForURL('**/dashboard', { timeout: 60000 }).catch(() => {}),
  p.click('button[type="submit"]'),
])
await p.waitForLoadState('networkidle').catch(() => {})
await sleep(2000)

let ok = 0, fail = 0
for (const [key, route] of ROUTES) {
  try {
    await p.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await p.waitForLoadState('networkidle').catch(() => {})
    // Let data queries resolve + charts/animations settle (first dev-compile is slow).
    await sleep(3500)
    await p.evaluate(() => { window.scrollTo(0, 2); window.scrollTo(0, 0) })
    await sleep(400)
    const title = await p.title().catch(() => '')
    await p.screenshot({ path: resolve(OUT, `${key}.png`), fullPage: true })
    console.log('  ✓', key.padEnd(14), '|', title)
    ok++
  } catch (e) {
    console.log('  ✗', key.padEnd(14), '| FAILED:', e.message.split('\n')[0])
    fail++
  }
}
await b.close()
console.log(`\ndone → ${OUT}  (${ok} ok, ${fail} failed)`)

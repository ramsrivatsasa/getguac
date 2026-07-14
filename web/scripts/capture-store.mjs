// Store-listing screenshots — clean, single-screen, at the EXACT device sizes
// the Apple App Store and Google Play require. Logs in as the demo account
// (hydration-safe) and captures each key screen at one viewport (not a tall
// full-page scroll), with dev-only overlays (Next.js error toast, react-hot-
// toast) hidden so nothing dev-ish leaks into the store art.
//
// Usage (needs the local dev server running — Turnstile is off on localhost):
//   BASE_URL=http://localhost:3000 PROFILE=apple node scripts/capture-store.mjs
//   BASE_URL=http://localhost:3000 PROFILE=play  node scripts/capture-store.mjs
//
// Output: <repo>/store-screens/<profile>/<name>.png
import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const EMAIL = process.env.DEMO_EMAIL || 'demo@getguac.app'
const PASSWORD = process.env.DEMO_PASSWORD || 'Guac!Demo2026'
const PROFILE = (process.env.PROFILE || 'apple').toLowerCase()

// Exact store device targets (logical points × dsf = required pixel size).
const PROFILES = {
  apple: { w: 430, h: 932, dsf: 3, dir: 'apple' }, // 1290×2796  iPhone 6.7"
  play:  { w: 360, h: 640, dsf: 3, dir: 'play' },  // 1080×1920  16:9 portrait (Play-safe)
}
const PROF = PROFILES[PROFILE]
if (!PROF) { console.error('Unknown PROFILE:', PROFILE, '— use apple|play'); process.exit(1) }

// The screens worth putting on a store listing, in display order. [name, route]
const SCREENS = [
  ['01-dashboard',   '/dashboard'],
  ['02-receipts',    '/receipts'],
  ['03-reports',     '/reports'],
  ['04-guacwizard',  '/guacwizard'],
  ['05-guacanomics', '/guacanomics'],
  ['06-worth-it',    '/validate'],
  ['07-steals',      '/steals'],
  ['08-marketplace', '/marketplace'],
  ['09-games',       '/games'],
  ['10-smashlist',   '/shopping'],
]

// CSS that kills dev-only overlays before each shot. `nextjs-portal` is the
// Next.js dev error/indicator toast ("N errors"); role=status/alert are
// react-hot-toast pop-ups. None of these exist in a production build.
const HIDE_DEV = `
  nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog-overlay],
  #__next-build-watcher, [role="status"], [role="alert"] { display: none !important; }
`

const OUT = resolve(__dirname, '..', '..', 'store-screens', PROF.dir)
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const b = await chromium.launch()
const ctx = await b.newContext({
  viewport: { width: PROF.w, height: PROF.h },
  deviceScaleFactor: PROF.dsf,
  isMobile: true,
  hasTouch: true,
})
const p = await ctx.newPage()

console.log(`profile=${PROFILE} (${PROF.w * PROF.dsf}×${PROF.h * PROF.dsf}) | base=${BASE} | login ${EMAIL}`)
await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await p.waitForLoadState('networkidle').catch(() => {})
const USER_SEL = 'input[autocomplete="username"]'
const PASS_SEL = 'input[autocomplete="current-password"]'
await p.waitForSelector(USER_SEL, { state: 'visible', timeout: 30000 })
for (let attempt = 0; attempt < 3; attempt++) {
  await p.fill(USER_SEL, ''); await p.fill(USER_SEL, EMAIL)
  await p.fill(PASS_SEL, ''); await p.fill(PASS_SEL, PASSWORD)
  await sleep(300)
  if ((await p.inputValue(USER_SEL).catch(() => '')) === EMAIL) break
  await sleep(700)
}
await Promise.all([
  p.waitForURL('**/dashboard', { timeout: 60000 }).catch(() => {}),
  p.click('button[type="submit"]'),
])
await p.waitForLoadState('networkidle').catch(() => {})
await sleep(1800)
if (/\/login/.test(p.url())) {
  console.error('LOGIN FAILED — still at', p.url()); await b.close(); process.exit(1)
}
console.log('login OK →', p.url())

let ok = 0, fail = 0
for (const [name, route] of SCREENS) {
  try {
    await p.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await p.waitForLoadState('networkidle').catch(() => {})
    await sleep(3500) // let data/charts settle
    await p.addStyleTag({ content: HIDE_DEV }).catch(() => {})
    await p.evaluate(() => window.scrollTo(0, 0))
    await sleep(400)
    await p.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: false })
    console.log('  ✓', name)
    ok++
  } catch (e) {
    console.log('  ✗', name, '|', e.message.split('\n')[0]); fail++
  }
}
await b.close()
console.log(`\ndone → ${OUT}  (${ok} ok, ${fail} failed)`)

import { chromium } from 'playwright'
import sharp from 'sharp'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, rmSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SHOW = resolve(__dirname, '..', 'public', 'showcase')
const TMP = resolve(__dirname, '..', '.shot-tmp')
const BASE = (process.env.BASE_URL || 'https://getguac.app').replace(/\/$/, '')
const EMAIL = process.env.DEMO_EMAIL || 'demo@getguac.app'
const PASSWORD = process.env.DEMO_PASSWORD || 'Guac!Demo2026'
const ROUTES = [
  ['receipts', '/receipts'], ['items', '/items'], ['dashboard', '/dashboard'],
  ['bites', '/bites'], ['returns', '/returns'], ['guacwizard', '/guacwizard'],
  ['reports', '/reports'],
]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(TMP, { recursive: true })
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 440, height: 930 }, deviceScaleFactor: 2 })
const p = await ctx.newPage()
await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await p.fill('input[autocomplete="username"]', EMAIL)
await p.fill('input[autocomplete="current-password"]', PASSWORD)
await Promise.all([p.waitForURL('**/dashboard', { timeout: 45000 }).catch(() => {}), p.click('button[type="submit"]')])
await p.waitForLoadState('networkidle').catch(() => {})
await sleep(1500)
for (const [key, route] of ROUTES) {
  await p.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
  await p.waitForLoadState('networkidle').catch(() => {})
  await sleep(2600)
  await p.evaluate(() => { window.scrollTo(0, 1); window.scrollTo(0, 0) })
  const title = await p.title().catch(() => '')
  const raw = resolve(TMP, `${key}.png`)
  await p.screenshot({ path: raw })
  await sharp(raw).resize({ width: 560 }).png().toFile(resolve(SHOW, `${key}.png`))
  console.log('captured', key, '| title:', title)
}
await b.close()
rmSync(TMP, { recursive: true, force: true })
console.log('done')

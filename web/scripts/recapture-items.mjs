#!/usr/bin/env node
// One-off: recapture the "items" scene for marketing-assets/screens.
// The old capture pointed at /items (no such route -> 404 screenshot).
// The real "AI reads every line" view is a receipt detail: /receipts/<id>.
// The demo data is dated May-June 2026, so the receipts list defaults to
// "1M -> 0 results" — switch the window to All, then pick the receipt with
// the most line items and screenshot its detail page in both profiles.
//
//   node web/scripts/recapture-items.mjs
//   BASE_URL=http://localhost:3000 node web/scripts/recapture-items.mjs

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'marketing-assets', 'screens')
const BASE = (process.env.BASE_URL || 'https://getguac.app').replace(/\/$/, '')
const EMAIL = process.env.DEMO_EMAIL || 'demo@getguac.app'
const PASSWORD = process.env.DEMO_PASSWORD || 'Guac!Demo2026'

const PROFILES = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, dsf: 2 },
  { name: 'phone', viewport: { width: 390, height: 844 }, dsf: 3 },
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
  await page.waitForLoadState('networkidle').catch(() => {})
  await sleep(1500)
}

// Find the detail href once, on a desktop-sized page where the table renders.
async function findDetailHref(page) {
  await page.goto(`${BASE}/receipts`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.getByRole('button', { name: 'All', exact: true }).click()
  await page.waitForLoadState('networkidle').catch(() => {})
  await sleep(2600)
  // Prefer grocery receipts — they carry the most line items in the demo data.
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll('tbody tr')].filter(r => r.querySelector('a[aria-label="View"]'))
    const pick = (re) => rows.find(r => re.test(r.textContent || ''))
    const row = pick(/WALMART/i) || pick(/COSTCO/i) || pick(/TARGET/i) || pick(/CHIPOTLE/i) || rows[0]
    return row ? row.querySelector('a[aria-label="View"]').getAttribute('href') : null
  })
}

let href = null
for (const p of PROFILES) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: p.viewport, deviceScaleFactor: p.dsf })
  const page = await ctx.newPage()
  await login(page)
  if (!href) {
    href = await findDetailHref(page)
    if (!href) { console.error('no receipt detail link found'); process.exit(1) }
    console.log('receipt detail:', href)
  }
  await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  await sleep(2800)
  // The demo seeder stamps "[SEED v2 SQL]" into the notes field — swap it for
  // a natural note so the marketing still doesn't leak seed internals.
  await page.evaluate(() => {
    const ta = [...document.querySelectorAll('textarea')].find(t => /SEED/i.test(t.value))
    if (ta) {
      const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
      set.call(ta, 'Weekly grocery run 🛒')
      ta.dispatchEvent(new Event('input', { bubbles: true }))
    }
  })
  // The star of this scene is the parsed line-items list, not the edit form
  // above it — scroll the "Line Items" heading to the top of the frame.
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find(el => /line items/i.test(el.textContent || ''))
    if (h) { h.scrollIntoView({ block: 'start' }); window.scrollBy(0, -16) }
  })
  await sleep(600)
  mkdirSync(resolve(OUT, p.name), { recursive: true })
  const file = resolve(OUT, p.name, '03-items.png')
  await page.screenshot({ path: file })
  console.log(`[${p.name}] -> ${file}`)
  await browser.close()
}
console.log('done')

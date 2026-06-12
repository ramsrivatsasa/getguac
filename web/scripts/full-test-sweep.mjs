#!/usr/bin/env node
// Complete functional sweep against the live site, logged in as the demo:
//   B — page-load smoke across every app screen (no 404 / error boundary)
//   C — functional negatives (dead routes, empty inputs, bad email)
// Writes marketing-assets/qa/full-results.json (merged with auth results for the report).
import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, writeFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QA = resolve(__dirname, '..', '..', 'marketing-assets', 'qa', 'web')
mkdirSync(QA, { recursive: true })
const BASE = 'https://getguac.app'
const EMAIL = 'demo@getguac.app', PW = 'Guac!Demo2026'
const results = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rec = (id, area, name, expected, actual, status) => {
  results.push({ id, area, name, expected, actual, status })
  console.log(`${status === 'PASS' ? '✓' : status === 'BUG' ? '✗ BUG' : 'i'} ${id} ${name} — ${actual}`)
}

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 1500 } })
const page = await ctx.newPage()

// ── login as demo ──
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.fill('input[autocomplete="username"]', EMAIL)
await page.fill('input[autocomplete="current-password"]', PW)
await Promise.all([page.waitForURL('**/dashboard', { timeout: 45000 }).catch(() => {}), page.click('button[type="submit"]')])
await page.waitForLoadState('networkidle').catch(() => {})
await sleep(2500)
const loggedIn = /\/dashboard/.test(page.url())
rec('B0', 'Login', 'Demo sign-in (positive)', 'Lands on dashboard', loggedIn ? 'Dashboard loaded' : `stuck at ${page.url()}`, loggedIn ? 'PASS' : 'BUG')

// ── B: page-load smoke for every app screen ──
const PAGES = [
  'dashboard', 'receipts', 'reports', 'steals', 'returns', 'guacwizard', 'bites',
  'stash', 'shopping', 'bank', 'guacanomics', 'rewards', 'stores', 'statements',
  'profile', 'validate', 'car-miles', 'predictions', 'inbox', 'connections', 'notifications', 'invite',
]
let n = 0
for (const r of PAGES) {
  n++
  let ok = false, actual = ''
  try {
    const resp = await page.goto(`${BASE}/${r}`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})
    await sleep(1800)
    const title = await page.title().catch(() => '')
    const bodyTxt = (await page.locator('body').innerText().catch(() => '')).slice(0, 4000)
    const is404 = /page not found|404/i.test(title) || /Oops, page not found|Page not found/i.test(bodyTxt)
    const isErr = /something went wrong|application error|unhandled|TypeError|Cannot read/i.test(bodyTxt)
    const status = resp?.status() ?? 0
    ok = !is404 && !isErr && status < 500
    actual = is404 ? 'renders 404' : isErr ? 'error boundary shown' : status >= 500 ? `HTTP ${status}` : `OK (HTTP ${status})`
  } catch (e) { actual = 'load error: ' + e.message.slice(0, 50) }
  rec(`B${n}`, 'Page smoke', `/${r}`, 'Loads without 404/error', actual, ok ? 'PASS' : 'BUG')
}

// ── C: functional negatives ──
// C1 — dead route /items (only /items/[id] exists)
{
  await page.goto(`${BASE}/items`, { waitUntil: 'domcontentloaded' }); await sleep(1500)
  const t = (await page.locator('body').innerText().catch(() => '')).slice(0, 1500)
  const is404 = /page not found|oops/i.test(t)
  rec('C1', 'Negative', 'Dead route /items', 'Graceful 404 page', is404 ? '404 page shown' : 'no 404', is404 ? 'PASS' : 'BUG')
}
// C2 — random non-existent route
{
  await page.goto(`${BASE}/this-does-not-exist-xyz`, { waitUntil: 'domcontentloaded' }); await sleep(1200)
  const t = (await page.locator('body').innerText().catch(() => '')).slice(0, 1500)
  const is404 = /page not found|oops|404/i.test(t)
  rec('C2', 'Negative', 'Unknown route', 'Graceful 404 page', is404 ? '404 page shown' : 'no 404', is404 ? 'PASS' : 'BUG')
}
// C3 — Steals empty search
{
  await page.goto(`${BASE}/steals`, { waitUntil: 'domcontentloaded' }); await sleep(2500)
  let crashed = false
  try {
    const btn = page.locator('button:has-text("Find Steals")').first()
    if (await btn.count()) await btn.click({ force: true })
    await sleep(1500)
    const t = (await page.locator('body').innerText().catch(() => '')).slice(0, 1500)
    crashed = /something went wrong|TypeError|unhandled/i.test(t)
  } catch { crashed = true }
  rec('C3', 'Negative', 'Steals empty query', 'No crash; input handled', crashed ? 'crashed/error' : 'handled gracefully', crashed ? 'BUG' : 'PASS')
}
// C4 — best-prices API with empty query
{
  const r = await page.request.get(`${BASE}/api/best-prices?q=`).catch(() => null)
  const st = r ? r.status() : 0
  const ok = st === 400 || st === 422 || st === 200 // handled (bad-request or empty result)
  rec('C4', 'Negative', 'best-prices API empty q', 'Handled (4xx or empty 200)', `HTTP ${st}`, ok ? 'PASS' : (st >= 500 ? 'BUG' : 'INFO'))
}
// C5 — forgot-password with invalid email
{
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await sleep(1200)
  let handled = false
  try {
    await page.locator('button:has-text("Forgot password?")').first().click()
    await sleep(600)
    await page.locator('input[type="email"]').first().fill('notanemail')
    await page.locator('button:has-text("Send reset link")').first().click({ force: true })
    await sleep(800)
    handled = await page.locator('input[type="email"]').first().evaluate((el) => !el.validity.valid).catch(() => false)
  } catch {}
  rec('C5', 'Negative', 'Forgot-pw invalid email', 'Blocked by email validation', handled ? 'Blocked' : 'not blocked', handled ? 'PASS' : 'INFO')
}

await b.close()
writeFileSync(resolve(QA, '..', 'full-results.json'), JSON.stringify(results, null, 2))
const pass = results.filter((r) => r.status === 'PASS').length
const bug = results.filter((r) => r.status === 'BUG').length
console.log(`\n${pass} PASS · ${bug} BUG · ${results.length} total (functional sweep)`)

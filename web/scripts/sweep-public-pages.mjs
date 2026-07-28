#!/usr/bin/env node
// Load every PUBLIC page and report what breaks — status code, error
// boundary, console errors, failed sub-requests, and how long it took.
//
//   cd web && node scripts/sweep-public-pages.mjs
//   BASE_URL=http://localhost:3000 node scripts/sweep-public-pages.mjs
//
// Signed-in pages are covered by e2e-signup-receipt.mjs (as a real new user)
// and full-test-sweep.mjs (as the demo). This one is the logged-out surface:
// everything an ad click, a crawler, or a first-time visitor can reach.
import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, writeFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', '..', 'marketing-assets', 'qa', 'public-sweep')
mkdirSync(OUT, { recursive: true })
const BASE = (process.env.BASE_URL || 'https://getguac.app').replace(/\/$/, '')

const ROUTES = [
  '/', '/about', '/features', '/pricing', '/faq', '/contact', '/demo',
  '/how-it-works', '/how-email-works', '/tour', '/security', '/privacy', '/terms',
  '/download', '/delete-account', '/resources', '/articles', '/plan', '/coupons',
  '/marketplace', '/rakuten', '/games', '/join', '/start', '/login', '/register',
  // a representative deep page from each templated section
  '/articles/compound-interest', '/games/fruit', '/games/splurge',
  // machine-readable surfaces an ad or a crawler depends on
  '/sitemap.xml', '/robots.txt', '/ads.txt',
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const rows = []

for (const route of ROUTES) {
  const page = await ctx.newPage()
  const errors = []
  const failed = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push(`[pageerror] ${String(e).slice(0, 200)}`))
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 140)}`) })

  const t0 = Date.now()
  let status = 0
  try {
    const resp = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    status = resp?.status() ?? 0
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  } catch (e) {
    errors.push(`[navigation] ${e.message.slice(0, 160)}`)
  }
  const ms = Date.now() - t0
  const body = await page.locator('body').innerText().catch(() => '')
  const broke = /Application error|Unhandled Runtime Error|Something went wrong|This page could not be found/i.test(body)
  // A page that renders almost nothing is broken even when it returns 200.
  const thin = !/\.(xml|txt)$/.test(route) && body.replace(/\s+/g, ' ').trim().length < 200

  const ok = status > 0 && status < 400 && !broke && !thin
  rows.push({ route, status, ms, ok, broke, thin, errors: [...new Set(errors)], failed: [...new Set(failed)] })
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${String(status).padEnd(3)} ${String(ms).padStart(5)}ms  ${route}` +
    `${broke ? '  ERROR-BOUNDARY' : ''}${thin ? '  THIN-BODY' : ''}` +
    `${errors.length ? `  ${errors.length} console` : ''}${failed.length ? `  ${failed.length} failed-req` : ''}`,
  )
  await page.close()
}

await browser.close()
writeFileSync(resolve(OUT, 'results.json'), JSON.stringify({ base: BASE, rows }, null, 2))

const bad = rows.filter((r) => !r.ok)
console.log(`\n${'─'.repeat(64)}\n${rows.length - bad.length}/${rows.length} pages OK on ${BASE}`)
for (const r of bad) console.log(`  FAIL ${r.route} — ${r.status}${r.broke ? ' error boundary' : ''}${r.thin ? ' thin body' : ''}`)

// NB: this is time-to-network-idle, NOT time-to-first-paint. It is capped at
// 15s, so a page pinned at ~15000 never went quiet — usually a poller (the
// Turnstile widget does this on /register), not a slow page. Read it as "how
// long this page keeps talking", and check the waterfall before calling it slow.
const slow = rows.filter((r) => r.ms > 4000).sort((a, b) => b.ms - a.ms)
if (slow.length) {
  console.log(`\nlongest time-to-network-idle (>4s; 15s = hit the cap, still chattering):`)
  for (const r of slow.slice(0, 12)) console.log(`  ${String(r.ms).padStart(6)}ms  ${r.route}`)
}

const allErrs = new Map()
for (const r of rows) for (const e of r.errors) allErrs.set(e, (allErrs.get(e) || 0) + 1)
if (allErrs.size) {
  console.log(`\nconsole errors (deduped, most common first):`)
  for (const [e, n] of [...allErrs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`  ${n}× ${e}`)
}
const allFailed = new Map()
for (const r of rows) for (const f of r.failed) allFailed.set(f, (allFailed.get(f) || 0) + 1)
if (allFailed.size) {
  console.log(`\nfailed sub-requests:`)
  for (const [f, n] of [...allFailed.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`  ${n}× ${f}`)
}
console.log(`\nartifacts: ${OUT}`)
process.exit(bad.length ? 1 : 0)

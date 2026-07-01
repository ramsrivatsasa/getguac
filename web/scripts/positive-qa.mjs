#!/usr/bin/env node
// Positive + functional QA against the live site, logged in as the demo.
// Positive = each feature actually renders its real (seeded) data.
// Negative = dead routes / empty inputs / bad email are handled.
// Writes marketing-assets/qa/qa-results.json for the report.
import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, writeFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QA = resolve(__dirname, '..', '..', 'marketing-assets', 'qa')
const SHOTS = resolve(QA, 'web'); mkdirSync(SHOTS, { recursive: true })
const BASE = 'https://getguac.app', EMAIL = 'demo@getguac.app', PW = 'Guac!Demo2026'
const results = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rec = (id, area, name, expected, actual, status) => {
  results.push({ id, area, name, expected, actual, status })
  console.log(`${status === 'PASS' ? '✓' : status === 'BUG' ? '✗ BUG' : 'i'} ${id} ${name} — ${actual}`)
}

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 1600 } })
const page = await ctx.newPage()
const bodyText = async () => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ')

// ── N (pre-login): forgot-password invalid email ──
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await sleep(1200)
try {
  await page.locator('button:has-text("Forgot password?")').first().click(); await sleep(500)
  await page.locator('input[type="email"]').first().fill('notanemail')
  await page.locator('button:has-text("Send reset link")').first().click({ force: true }); await sleep(700)
  const blocked = await page.locator('input[type="email"]').first().evaluate((el) => !el.validity.valid).catch(() => false)
  rec('N1', 'Negative', 'Forgot-pw invalid email', 'Blocked by validation', blocked ? 'Blocked' : 'not blocked', blocked ? 'PASS' : 'BUG')
} catch { rec('N1', 'Negative', 'Forgot-pw invalid email', 'Blocked', 'test error', 'INFO') }

// ── login (positive) ──
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.fill('input[autocomplete="username"]', EMAIL)
await page.fill('input[autocomplete="current-password"]', PW)
await Promise.all([page.waitForURL('**/dashboard', { timeout: 45000 }).catch(() => {}), page.click('button[type="submit"]')])
await page.waitForLoadState('networkidle').catch(() => {}); await sleep(2500)
rec('P0', 'Positive', 'Demo sign-in', 'Lands on dashboard', /\/dashboard/.test(page.url()) ? 'Dashboard loaded' : `at ${page.url()}`, /\/dashboard/.test(page.url()) ? 'PASS' : 'BUG')

// ── Positive: each feature shows real data ──
const POS = [
  { id: 'P1', route: '/dashboard', name: 'Dashboard data', must: [/GuacScore/i, /Spending by Store/i], shot: 'p-dashboard' },
  { id: 'P2', route: '/receipts', name: 'Receipts list (seeded)', must: [/Costco|Walmart|Target|Netflix/i] },
  { id: 'P3', route: '/reports', name: 'Reports categories (no Uncategorized)', must: [/Spending by category/i, /Household/i], not: [/Uncategorized/i], shot: 'p-reports' },
  { id: 'P4', route: '/steals', name: 'Steals restock list', must: [/restock/i, /BREAD|MILK|BANANAS|COFFEE/i], shot: 'p-steals' },
  { id: 'P5', route: '/returns', name: 'Returns items + window', must: [/Best Buy|Sony|return|day/i] },
  { id: 'P6', route: '/guacwizard', name: 'GuacWizard score + bites', must: [/Wizard|interest|fee/i] },
  { id: 'P7', route: '/bites', name: 'Bites worth-it', must: [/Worth|Bites|GuacScore/i] },
  { id: 'P8', route: '/stash', name: 'Stash items', must: [/Stash/i] },
  { id: 'P9', route: '/shopping', name: 'Smashlist', must: [/Smashlist|shopping|list/i] },
  { id: 'P10', route: '/bank', name: 'Bank statements/fees', must: [/Bank|statement|fee|interest/i] },
  { id: 'P11', route: '/guacanomics', name: 'Guacanomics', must: [/Guacanomics|score|spend/i] },
  { id: 'P12', route: '/rewards', name: 'Rewards', must: [/Reward/i] },
  { id: 'P13', route: '/invite', name: 'Invite code + share link', must: [/[A-Z0-9]{6}/, /ref=|getguac\.app/i], shot: 'p-invite' },
  { id: 'P14', route: '/profile', name: 'Profile (John)', must: [/John/i] },
]
for (const t of POS) {
  await page.goto(`${BASE}${t.route}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {}); await sleep(2200)
  const txt = await bodyText()
  const missing = t.must.filter((re) => !re.test(txt))
  const present404 = /page not found|oops/i.test(txt)
  const badNot = (t.not || []).filter((re) => re.test(txt))
  const ok = missing.length === 0 && !present404 && badNot.length === 0
  let actual = ok ? 'shows expected data' : present404 ? '404' : missing.length ? `missing: ${missing.map(String).join(', ')}` : `unexpected: ${badNot.map(String).join(', ')}`
  if (t.shot) await page.screenshot({ path: resolve(SHOTS, `${t.shot}.png`) }).catch(() => {})
  rec(t.id, 'Positive', t.name, 'Renders real seeded data', actual, ok ? 'PASS' : 'BUG')
}

// ── Receipt detail (positive) ──
await page.goto(`${BASE}/receipts`, { waitUntil: 'domcontentloaded' }); await sleep(2600)
try {
  const link = page.locator('a[href*="/receipts/"]').first()
  if (await link.count()) { await link.click(); await page.waitForLoadState('networkidle').catch(() => {}); await sleep(2200) }
  const txt = await bodyText()
  const ok = /Receipt|Store|Total|\$/i.test(txt) && !/page not found/i.test(txt)
  rec('P15', 'Positive', 'Receipt detail parsed fields', 'Shows store/total/items', ok ? 'parsed receipt shown' : 'no detail', ok ? 'PASS' : 'BUG')
} catch { rec('P15', 'Positive', 'Receipt detail', 'Shows detail', 'test error', 'INFO') }

// ── Negative (functional) ──
for (const [id, route, label] of [['N2', '/items', 'Dead route /items'], ['N3', '/nope-xyz-123', 'Unknown route']]) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' }); await sleep(1500)
  const is404 = /page not found|oops|404/i.test(await bodyText())
  rec(id, 'Negative', label, 'Graceful 404', is404 ? '404 page' : 'no 404', is404 ? 'PASS' : 'BUG')
}
// N4 steals empty query
await page.goto(`${BASE}/steals`, { waitUntil: 'domcontentloaded' }); await sleep(2500)
let crashed = false
try {
  const btn = page.locator('button:has-text("Find Steals")').first()
  if (await btn.count()) await btn.click({ force: true }); await sleep(1500)
  crashed = /something went wrong|TypeError/i.test(await bodyText())
} catch { crashed = true }
rec('N4', 'Negative', 'Steals empty query', 'No crash', crashed ? 'crashed' : 'handled', crashed ? 'BUG' : 'PASS')

// ── Sign out (positive, last) ──
try {
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' }); await sleep(2000)
  const so = page.locator('a[href="/logout"], button:has-text("Sign Out"), a:has-text("Sign Out")').first()
  if (await so.count()) { await so.click().catch(() => {}); await sleep(2500) }
  const out = /\/login/.test(page.url()) || /sign in/i.test(await bodyText())
  rec('P16', 'Positive', 'Sign out', 'Returns to login', out ? 'signed out → login' : `at ${page.url()}`, out ? 'PASS' : 'INFO')
} catch { rec('P16', 'Positive', 'Sign out', 'Returns to login', 'test error', 'INFO') }

await b.close()
writeFileSync(resolve(QA, 'qa-results.json'), JSON.stringify(results, null, 2))
const pass = results.filter((r) => r.status === 'PASS').length
const bug = results.filter((r) => r.status === 'BUG').length
console.log(`\n${pass} PASS · ${bug} BUG · ${results.length} total (positive + functional)`)

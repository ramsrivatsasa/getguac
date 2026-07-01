#!/usr/bin/env node
// Stress test against live:
//   Part 1 — 20 simultaneous sign-up requests (shared web+mobile endpoint
//            /api/auth/sign-up). Measures how the burst is handled: rate
//            limiting (5/min/IP → 429), latency, and any real accounts created.
//   Part 2 — all major features hit simultaneously as the demo (read-only),
//            measuring latency + success under concurrency.
// Honeypot left empty + no turnstile token (legit-shaped requests).
import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, writeFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QA = resolve(__dirname, '..', '..', 'marketing-assets', 'qa')
mkdirSync(QA, { recursive: true })
const BASE = 'https://getguac.app'
const N = 20
const runId = Date.now().toString(36).slice(-4)
const out = { signup: {}, functions: {} }
const stats = (arr) => arr.length ? { min: Math.min(...arr), max: Math.max(...arr), avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) } : { min: 0, max: 0, avg: 0 }

// ───────── Part 1: 20 simultaneous sign-ups ─────────
console.log(`— Part 1: ${N} simultaneous sign-ups —`)
const t0all = Date.now()
const signupTasks = Array.from({ length: N }, (_, i) => {
  const u = `qa${runId}${String(i).padStart(2, '0')}` // valid 3-32, unique, available
  const payload = {
    username: u, email: `${u}@example.com`, password: 'StressTest123',
    first_name: 'QA', last_name: 'Stress', birth_date: null, age: null,
    mobile_no: null, website: '', turnstile_token: '',
  }
  const t0 = Date.now()
  return fetch(`${BASE}/api/auth/sign-up`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }).then(async (r) => ({ status: r.status, ms: Date.now() - t0, body: await r.json().catch(() => ({})), user: u }))
    .catch((e) => ({ status: 0, ms: Date.now() - t0, err: e.message, user: u }))
})
const signupRes = await Promise.all(signupTasks)
const wallMs = Date.now() - t0all
const byStatus = {}
for (const r of signupRes) byStatus[r.status] = (byStatus[r.status] || 0) + 1
const created = signupRes.filter((r) => r.status === 200 && r.body?.ok).map((r) => r.user)
const rateLimited = signupRes.filter((r) => r.status === 429).length
out.signup = {
  total: N, wallClockMs: wallMs, statusDistribution: byStatus,
  created, createdCount: created.length, rateLimited,
  latency: stats(signupRes.map((r) => r.ms)),
  sampleErrors: [...new Set(signupRes.filter((r) => r.status !== 200).map((r) => r.body?.error || `HTTP ${r.status}`))].slice(0, 5),
}
console.log(JSON.stringify(out.signup, null, 2))

// ───────── Part 2: all functions simultaneously (demo, read-only) ─────────
console.log(`\n— Part 2: all functions hit simultaneously (demo) —`)
const b = await chromium.launch()
const ctx = await b.newContext()
const page = await ctx.newPage()
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.fill('input[autocomplete="username"]', 'demo@getguac.app')
await page.fill('input[autocomplete="current-password"]', 'Guac!Demo2026')
await Promise.all([page.waitForURL('**/dashboard', { timeout: 45000 }).catch(() => {}), page.click('button[type="submit"]')])
await page.waitForLoadState('networkidle').catch(() => {})

const ROUTES = ['/dashboard', '/receipts', '/reports', '/steals', '/returns', '/guacwizard', '/bites',
  '/stash', '/shopping', '/bank', '/guacanomics', '/rewards', '/stores', '/statements',
  '/profile', '/validate', '/car-miles', '/predictions', '/inbox', '/invite']
const t0fn = Date.now()
const fnTasks = ROUTES.map((r) => {
  const t0 = Date.now()
  return ctx.request.get(`${BASE}${r}`).then((resp) => ({ route: r, status: resp.status(), ms: Date.now() - t0 }))
    .catch((e) => ({ route: r, status: 0, ms: Date.now() - t0, err: e.message }))
})
const fnRes = await Promise.all(fnTasks)
const fnWall = Date.now() - t0fn
out.functions = {
  concurrent: ROUTES.length, wallClockMs: fnWall,
  ok: fnRes.filter((r) => r.status >= 200 && r.status < 400).length,
  failed: fnRes.filter((r) => r.status >= 400 || r.status === 0).map((r) => `${r.route}:${r.status}`),
  latency: stats(fnRes.map((r) => r.ms)),
  slowest: fnRes.sort((a, b) => b.ms - a.ms).slice(0, 3).map((r) => `${r.route} ${r.ms}ms`),
}
console.log(JSON.stringify(out.functions, null, 2))
await b.close()

writeFileSync(resolve(QA, 'stress-results.json'), JSON.stringify(out, null, 2))
console.log('\n=== SUMMARY ===')
console.log(`Sign-up burst: ${out.signup.createdCount} created · ${out.signup.rateLimited} rate-limited (429) · status ${JSON.stringify(out.signup.statusDistribution)}`)
console.log(`Functions concurrent: ${out.functions.ok}/${out.functions.concurrent} OK in ${out.functions.wallClockMs}ms (avg ${out.functions.latency.avg}ms)`)
if (created.length) console.log(`\n⚠ Real accounts created (need cleanup): ${created.join(', ')}`)

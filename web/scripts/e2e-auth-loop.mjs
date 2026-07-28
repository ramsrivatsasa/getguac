#!/usr/bin/env node
// Register → confirm → sign in, N times, reporting per-run timings.
//
//   cd web && node scripts/e2e-auth-loop.mjs [runs]      (default 3)
//
// The full pipeline test (e2e-signup-receipt.mjs) proves the path works ONCE.
// This proves it works REPEATEDLY, which is a different question: it catches
// rate limiters that only bite on the 3rd attempt, username collisions, slow
// confirmation, and session bleed between accounts. Every account is deleted
// as soon as its run finishes, pass or fail.
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
function loadEnv() {
  const out = { ...process.env }
  try {
    const txt = readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8')
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !(m[1] in out)) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* env optional */ }
  return out
}
const env = loadEnv()
const BASE = (env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const RUNS = Math.max(parseInt(process.argv[2] || '3', 10) || 3, 1)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// See project memory: filling a React-controlled input before hydration is
// silently dropped, which looks exactly like a broken form.
async function hydrated(page) {
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
  await sleep(800)
}
async function reactFill(page, selector, value) {
  const el = page.locator(selector).first()
  for (let i = 0; i < 3; i++) {
    await el.fill(value)
    await sleep(250)
    if ((await el.inputValue().catch(() => '')) === value) return true
    await sleep(700)
  }
  return false
}

console.log(`— register/confirm/login × ${RUNS} against ${BASE} —\n`)
const browser = await chromium.launch()
const runs = []

for (let i = 1; i <= RUNS; i++) {
  // Fresh context per run: a leaked session from run N-1 would make run N's
  // login look like a pass without ever authenticating.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } })
  const page = await ctx.newPage()
  const stamp = `${Date.now().toString(36).slice(-5)}${i}`
  const U = {
    username: `qa${stamp}`, email: `qa${stamp}@example.com`,
    password: 'GuacQa!Test2026', first: 'Quinn', last: 'Tester', birth: '1994-03-15',
  }
  const r = { n: i, email: U.email, register: null, confirm: null, login: null, ms: {}, error: null }
  let userId = null
  const t0 = Date.now()

  try {
    // ── register ──
    await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' })
    await hydrated(page)
    await reactFill(page, 'input[autocomplete="username"]', U.username)
    const panel = page.locator('div.rounded-2xl.border-2').first()
    let available = false
    for (let k = 0; k < 30; k++) {
      const t = (await panel.innerText().catch(() => '')).replace(/\s+/g, ' ')
      if (/is available/.test(t)) { available = true; break }
      if (/Already taken|Reserved word/.test(t)) break
      await sleep(1000)
    }
    if (!available) throw new Error('username never reported available')

    await reactFill(page, 'input[placeholder="Alex"]', U.first)
    await reactFill(page, 'input[placeholder="Smith"]', U.last)
    await reactFill(page, 'input[type="email"]', U.email)
    const pw = page.locator('input[type="password"]')
    await pw.nth(0).fill(U.password)
    await pw.nth(1).fill(U.password)
    await reactFill(page, 'input[type="date"]', U.birth)
    await page.locator('input[type="checkbox"]').first().check()

    const tReg = Date.now()
    await page.locator('button[type="submit"]').first().click()
    await page.waitForFunction(
      () => /Check your (inbox|email)|confirm/i.test(document.body.innerText) || location.pathname === '/login',
      { timeout: 120000 },
    ).catch(() => {})

    for (let k = 0; k < 30 && !userId; k++) {
      const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
      userId = data?.users?.find((u) => u.email === U.email)?.id || null
      if (!userId) await sleep(2000)
    }
    r.ms.register = Date.now() - tReg
    r.register = Boolean(userId)
    if (!userId) throw new Error('no auth user created')

    // ── confirm (stands in for the emailed link) ──
    const tConf = Date.now()
    const { error: cErr } = await db.auth.admin.updateUserById(userId, { email_confirm: true })
    if (cErr) throw new Error(`confirm failed: ${cErr.message}`)
    const { data: after } = await db.auth.admin.getUserById(userId)
    r.confirm = Boolean(after?.user?.email_confirmed_at)
    r.ms.confirm = Date.now() - tConf
    if (!r.confirm) throw new Error('email_confirmed_at still null after confirm')

    // ── login ──
    const tLog = Date.now()
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await hydrated(page)
    await reactFill(page, 'input[autocomplete="username"]', U.email)
    await reactFill(page, 'input[autocomplete="current-password"]', U.password)
    await Promise.all([
      page.waitForURL('**/dashboard', { timeout: 120000 }).catch(() => {}),
      page.locator('button[type="submit"]').first().click(),
    ])
    await sleep(2000)
    r.login = /\/dashboard/.test(page.url())
    r.ms.login = Date.now() - tLog
    if (!r.login) {
      const msg = await page.locator('[role="alert"], .text-rose-700').first().innerText().catch(() => '')
      throw new Error(`login stuck at ${page.url()}${msg ? ` — "${msg.trim().slice(0, 100)}"` : ' (no error shown)'}`)
    }
  } catch (e) {
    r.error = e.message
  } finally {
    r.ms.total = Date.now() - t0
    if (userId) await db.auth.admin.deleteUser(userId).catch(() => {})
    await ctx.close()
  }

  runs.push(r)
  const ok = r.register && r.confirm && r.login
  console.log(
    `run ${i}  ${ok ? 'PASS' : 'FAIL'}  register ${r.register ? 'y' : 'n'}(${r.ms.register ?? '-'}ms)` +
    `  confirm ${r.confirm ? 'y' : 'n'}  login ${r.login ? 'y' : 'n'}(${r.ms.login ?? '-'}ms)` +
    `  total ${r.ms.total}ms${r.error ? `\n        ${r.error}` : ''}`,
  )
}

await browser.close()
const passed = runs.filter((r) => r.register && r.confirm && r.login).length
const reg = runs.map((r) => r.ms.register).filter(Boolean)
const log = runs.map((r) => r.ms.login).filter(Boolean)
const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0)
console.log(`\n${'─'.repeat(56)}\n${passed}/${RUNS} full cycles passed`)
if (reg.length) console.log(`  register: avg ${avg(reg)}ms  max ${Math.max(...reg)}ms`)
if (log.length) console.log(`  login:    avg ${avg(log)}ms  max ${Math.max(...log)}ms`)
for (const r of runs.filter((x) => x.error)) console.log(`  run ${r.n} FAILED — ${r.error}`)
process.exit(passed === RUNS ? 0 : 1)

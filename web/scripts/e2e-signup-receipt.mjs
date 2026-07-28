#!/usr/bin/env node
// End-to-end: a brand-new person signs up, confirms, signs in, adds their
// FIRST receipt, and walks every signed-in page.
//
//   cd web && node scripts/e2e-signup-receipt.mjs
//   BASE_URL=https://getguac.app node scripts/e2e-signup-receipt.mjs   (see CAPTCHA note)
//
// Why local by default: production enforces Turnstile on /register, and a
// headless browser cannot produce a token. Locally TURNSTILE_SECRET_KEY is
// unset, so verifyTurnstile() skips and the same route code runs unchanged.
// The database is the REAL one either way, which is the point — this proves
// the pipeline end to end, not a mock of it.
//
// The account is deleted at the end. KEEP_USER=1 leaves it for inspection.
//
// This is the empty-state test the demo account can never be: every page is
// visited by a user who owns exactly one receipt, so "no data yet" branches
// get exercised instead of the seeded happy path.
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', '..', 'marketing-assets', 'qa', 'e2e')
mkdirSync(OUT, { recursive: true })

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
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in web/.env.local')
  process.exit(1)
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Typing into a React-controlled input BEFORE hydration sets the DOM value but
// never fires React's onChange, so the component's state stays empty and the
// form silently ignores everything you typed. Every form step waits for this.
async function hydrated(page) {
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
  await sleep(800)
}

// Fill, then confirm React actually took the value; retype if it didn't.
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
const results = []
const rec = (id, name, expected, actual, status) => {
  results.push({ id, name, expected, actual, status })
  const mark = status === 'PASS' ? 'PASS' : status === 'BUG' ? 'BUG ' : 'info'
  console.log(`[${mark}] ${id} ${name} — ${actual}`)
}

// ── the test identity ────────────────────────────────────────────────
const stamp = Date.now().toString(36).slice(-6)
const USER = {
  username: `qa${stamp}`,
  email: `qa${stamp}@example.com`,
  password: 'GuacQa!Test2026',
  first: 'Quinn',
  last: 'Tester',
  birth: '1994-03-15',
}
console.log(`— e2e signup+receipt against ${BASE}`)
console.log(`  identity: @${USER.username} / ${USER.email}\n`)

// ── a receipt image the parser can actually read ─────────────────────
// Rendered rather than committed as a fixture so the totals stay in sync
// with what we assert below — a stale binary fixture would silently drift.
const RECEIPT = {
  store: 'Trader Joes',
  date: new Date(Date.now() - 86400_000).toISOString().slice(0, 10),
  items: [
    ['Bananas', 1.99], ['Avocados 4ct', 4.49], ['Oat Milk', 3.29],
    ['Sourdough Loaf', 4.99], ['Chicken Breast', 8.97],
  ],
  tax: 1.84,
}
RECEIPT.subtotal = RECEIPT.items.reduce((a, [, p]) => a + p, 0)
RECEIPT.total = Math.round((RECEIPT.subtotal + RECEIPT.tax) * 100) / 100

function receiptHtml() {
  const rows = RECEIPT.items.map(([n, p]) =>
    `<tr><td>${n}</td><td class="r">${p.toFixed(2)}</td></tr>`).join('')
  return `<html><body style="margin:0;background:#fff">
  <div style="width:360px;padding:26px 22px;font:14px/1.65 'Courier New',monospace;color:#111">
    <div style="text-align:center;font-size:19px;font-weight:700;letter-spacing:1px">TRADER JOE'S</div>
    <div style="text-align:center;font-size:12px">1231 Main Street<br/>Austin, TX 78701<br/>(512) 555-0184</div>
    <hr style="border:none;border-top:1px dashed #333;margin:14px 0"/>
    <div style="font-size:12px">DATE: ${RECEIPT.date}&nbsp;&nbsp;&nbsp;TIME: 14:22<br/>STORE #421&nbsp;&nbsp;&nbsp;REG 03</div>
    <hr style="border:none;border-top:1px dashed #333;margin:14px 0"/>
    <table style="width:100%;border-collapse:collapse">
      <style>td{padding:2px 0}.r{text-align:right}</style>${rows}
    </table>
    <hr style="border:none;border-top:1px dashed #333;margin:14px 0"/>
    <table style="width:100%;border-collapse:collapse">
      <tr><td>SUBTOTAL</td><td class="r">${RECEIPT.subtotal.toFixed(2)}</td></tr>
      <tr><td>SALES TAX</td><td class="r">${RECEIPT.tax.toFixed(2)}</td></tr>
      <tr style="font-weight:700;font-size:16px"><td>TOTAL</td><td class="r">$${RECEIPT.total.toFixed(2)}</td></tr>
      <tr><td>VISA ****4417</td><td class="r">${RECEIPT.total.toFixed(2)}</td></tr>
    </table>
    <hr style="border:none;border-top:1px dashed #333;margin:14px 0"/>
    <div style="text-align:center;font-size:12px">RETURNS WITHIN 30 DAYS<br/>WITH RECEIPT<br/><br/>THANK YOU FOR SHOPPING</div>
  </div></body></html>`
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } })

// Every console error / page crash / failed request on ANY page in this run.
const noise = []
function watch(page, label) {
  page.on('console', (m) => {
    if (m.type() === 'error') noise.push({ page: label, kind: 'console', text: m.text().slice(0, 300) })
  })
  page.on('pageerror', (e) => noise.push({ page: label, kind: 'pageerror', text: String(e).slice(0, 300) }))
  page.on('response', (r) => {
    if (r.status() >= 400) noise.push({ page: label, kind: 'http', text: `${r.status()} ${r.url().slice(0, 160)}` })
  })
}

const shotPage = await ctx.newPage()
await shotPage.setContent(receiptHtml())
const RECEIPT_PNG = resolve(OUT, 'receipt.png')
await shotPage.locator('div').first().screenshot({ path: RECEIPT_PNG })
await shotPage.close()
console.log(`  receipt image: ${RECEIPT_PNG} (total $${RECEIPT.total.toFixed(2)})\n`)

const page = await ctx.newPage()
watch(page, 'main')
let userId = null

try {
  // ── 1. REGISTER through the real form ──────────────────────────────
  await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' })
  await hydrated(page)
  await reactFill(page, 'input[autocomplete="username"]', USER.username)
  // Debounced, then a round trip to /api/auth/check-username. Read the handle
  // panel's own text rather than getByText('is available'): the verdict is
  // split across a <span class="font-mono"> and its parent, so a text locator
  // intermittently matches two nodes and throws strict-mode instead of
  // reporting the state. Poll the panel — one node, one answer.
  const panel = page.locator('div.rounded-2xl.border-2').first()
  let available = false
  let panelTxt = ''
  for (let i = 0; i < 30; i++) {
    panelTxt = (await panel.innerText().catch((e) => `<${e.message.slice(0, 60)}>`)).replace(/\s+/g, ' ')
    if (/is available/.test(panelTxt)) { available = true; break }
    if (/Already taken|Reserved word/.test(panelTxt)) break
    await sleep(1000)
  }
  if (!available) {
    await page.screenshot({ path: resolve(OUT, '00-username-check.png'), fullPage: true })
    console.log(`    panel text was: "${panelTxt.slice(0, 200)}"`)
    console.log(`    field value:    "${await page.locator('input[autocomplete="username"]').inputValue().catch(() => '?')}"`)
  }
  rec('R1', 'Username availability check', 'Live check says available',
    available ? `@${USER.username} available` : `no confirmation — panel read "${panelTxt.slice(0, 90)}"`,
    available ? 'PASS' : 'BUG')

  await reactFill(page, 'input[placeholder="Alex"]', USER.first)
  await reactFill(page, 'input[placeholder="Smith"]', USER.last)
  await reactFill(page, 'input[type="email"]', USER.email)
  const pw = page.locator('input[type="password"]')
  await pw.nth(0).fill(USER.password)
  await pw.nth(1).fill(USER.password)
  await reactFill(page, 'input[type="date"]', USER.birth)

  const age = await page.locator('input[readonly], input.bg-gray-50').first().inputValue().catch(() => '')
  rec('R2', 'Age auto-computes from birth date', 'Age filled from DOB',
    age ? `age=${age}` : 'age field empty', age ? 'PASS' : 'BUG')

  await page.locator('input[type="checkbox"]').first().check()
  const submit = page.getByRole('button', { name: /Create my free account/i })
  rec('R3', 'Submit gate', 'Enabled once form is valid',
    (await submit.isEnabled()) ? 'enabled' : 'still disabled', (await submit.isEnabled()) ? 'PASS' : 'BUG')
  await submit.click()

  // Either the confirm panel appears, or we get routed to /login. Sign-up is
  // the slowest route in the app — it does a username pre-flight, a Supabase
  // signUp, and a confirmation-email send before it answers.
  await page.waitForFunction(
    () => /Check your (inbox|email)|confirm/i.test(document.body.innerText) || location.pathname === '/login',
    { timeout: 120000 },
  ).catch(() => {})
  await sleep(1500)
  await page.screenshot({ path: resolve(OUT, '01-registered.png') })

  // Poll rather than read once: the row lands when the API answers, not when
  // the click returns. Reading once made this look like a signup failure.
  let created = null
  for (let i = 0; i < 30; i++) {
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
    created = list?.users?.find((u) => u.email === USER.email)
    if (created) break
    await sleep(2000)
  }
  userId = created?.id || null
  rec('R4', 'Account created in auth', 'auth.users row exists',
    userId ? `user ${userId.slice(0, 8)}…` : 'NO user row', userId ? 'PASS' : 'BUG')
  if (!userId) throw new Error('signup did not create a user — cannot continue')

  // ── 2. CONFIRM the email (the click we cannot make headlessly) ──────
  if (!created.email_confirmed_at) {
    await db.auth.admin.updateUserById(userId, { email_confirm: true })
    rec('R5', 'Email confirmation', 'Account activates once confirmed',
      'confirmed via admin API (stands in for the emailed link)', 'PASS')
  } else {
    rec('R5', 'Email confirmation', 'Confirm-email enforced',
      'auto-confirmed — "Confirm email" is OFF in Supabase Auth', 'BUG')
  }

  // ── 3. SIGN IN ─────────────────────────────────────────────────────
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await hydrated(page)
  await reactFill(page, 'input[autocomplete="username"]', USER.email)
  await reactFill(page, 'input[autocomplete="current-password"]', USER.password)
  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 120000 }).catch(() => {}),
    page.locator('button[type="submit"]').first().click(),
  ])
  await sleep(3000)
  const onDash = /\/dashboard/.test(page.url())
  await page.screenshot({ path: resolve(OUT, '02-dashboard-empty.png'), fullPage: true })
  // On failure, say WHY — a bare "stuck at /login" cannot distinguish a
  // rejected credential from a dev server still compiling the route.
  const loginErr = onDash ? '' : await page.locator('[role="alert"], .text-rose-700').first()
    .innerText().catch(() => '')
  rec('L1', 'Sign in with the new account', 'Lands on /dashboard',
    onDash ? 'dashboard loaded' : `stuck at ${page.url()}${loginErr ? ` — "${loginErr.trim().slice(0, 120)}"` : ' (no error shown)'}`,
    onDash ? 'PASS' : 'BUG')
  if (!onDash) throw new Error('cannot sign in — cannot continue')

  // The username claim happens at /auth/confirm, which we bypassed. Check
  // whether the handle survived; a lost handle is a real signup defect.
  const { data: prof } = await db.from('profiles').select('email_alias, first_name').eq('id', userId).maybeSingle()
  rec('L2', 'Handle claimed on the profile', `email_alias = ${USER.username}`,
    prof?.email_alias ? `email_alias=${prof.email_alias}` : 'email_alias is NULL (claimed at /auth/confirm only)',
    prof?.email_alias === USER.username ? 'PASS' : 'INFO')

  // ── 4. ADD THE FIRST RECEIPT ───────────────────────────────────────
  await page.goto(`${BASE}/receipts`, { waitUntil: 'domcontentloaded' })
  await sleep(2500)
  await page.screenshot({ path: resolve(OUT, '03-receipts-empty.png') })

  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles(RECEIPT_PNG)
  console.log('  uploaded — waiting on parse + save…')

  let saved = null
  for (let i = 0; i < 60; i++) {
    await sleep(2000)
    const { data: rows } = await db.from('receipts').select('id, store_name, total_amount, tax_paid, date')
      .eq('user_id', userId).limit(5)
    if (rows?.length) { saved = rows[0]; break }
  }
  await page.screenshot({ path: resolve(OUT, '04-receipt-saved.png'), fullPage: true })
  rec('C1', 'Receipt saved from an uploaded image', 'A receipts row for this user',
    saved ? `${saved.store_name} $${saved.total_amount} on ${saved.date}` : 'no receipt row after 120s',
    saved ? 'PASS' : 'BUG')

  if (saved) {
    const totalOk = Math.abs(Number(saved.total_amount) - RECEIPT.total) < 0.02
    rec('C2', 'Parsed total matches the receipt', `$${RECEIPT.total.toFixed(2)}`,
      `$${Number(saved.total_amount).toFixed(2)}`, totalOk ? 'PASS' : 'BUG')
    const taxOk = Math.abs(Number(saved.tax_paid || 0) - RECEIPT.tax) < 0.02
    rec('C3', 'Parsed tax matches the receipt', `$${RECEIPT.tax.toFixed(2)}`,
      `$${Number(saved.tax_paid || 0).toFixed(2)}`, taxOk ? 'PASS' : 'BUG')
    // Poll: the receipt row and its items are separate INSERTs inside the same
    // save request, so the receipt can exist for a moment before its items do.
    // Reading once here reported "0 items" on a run where the parser had in
    // fact returned 5 — a race in the assertion, not a parse failure.
    let items = []
    for (let i = 0; i < 15; i++) {
      const { data } = await db.from('receipt_items').select('id, item_name, price').eq('receipt_id', saved.id)
      items = data || []
      if (items.length) break
      await sleep(1000)
    }
    rec('C4', 'Line items extracted', `${RECEIPT.items.length} items`,
      `${items.length} items`, items.length >= 3 ? 'PASS' : 'BUG')

    await page.goto(`${BASE}/receipts`, { waitUntil: 'domcontentloaded' })
    await sleep(3000)
    const listed = await page.getByText(/trader\s*joe/i).first().isVisible().catch(() => false)
    rec('C5', 'Receipt appears in the list', 'Store name renders on /receipts',
      listed ? 'listed' : 'not found in list', listed ? 'PASS' : 'BUG')

    await page.goto(`${BASE}/receipts/${saved.id}`, { waitUntil: 'domcontentloaded' })
    await sleep(2500)
    await page.screenshot({ path: resolve(OUT, '05-receipt-detail.png'), fullPage: true })
    const detailOk = !/Something went wrong|not found/i.test(await page.locator('body').innerText())
    rec('C6', 'Receipt detail page', 'Renders without an error boundary',
      detailOk ? 'rendered' : 'error boundary / not found', detailOk ? 'PASS' : 'BUG')
  }

  // ── 5. WALK EVERY SIGNED-IN PAGE ───────────────────────────────────
  // No 'items': that route is only /items/[id], reached from a receipt's line
  // items. There is no index page and nothing links to /items, so its 404 is
  // correct — listing it here reported a bug that did not exist.
  const PAGES = [
    'dashboard', 'receipts', 'reports', 'guacanomics', 'guacwizard',
    'stores', 'steals', 'returns', 'bites', 'stash', 'shopping', 'bank',
    'statements', 'bills', 'car-miles', 'predictions', 'rewards', 'inbox',
    'notifications', 'connections', 'invite', 'chat', 'profile', 'validate',
  ]
  console.log('\n— walking signed-in pages —')
  for (const p of PAGES) {
    const before = noise.length
    const resp = await page.goto(`${BASE}/${p}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null)
    await sleep(2200)
    const body = await page.locator('body').innerText().catch(() => '')
    const broke = /Something went wrong|Application error|Unhandled Runtime Error|500 -/i.test(body)
    const status = resp?.status() ?? 0
    const errs = noise.slice(before).filter((n) => n.kind !== 'http')
    const ok = !broke && status < 400
    rec(`P-${p}`, `/${p}`, 'Renders for a brand-new user',
      `${status}${broke ? ' ERROR BOUNDARY' : ''}${errs.length ? ` ${errs.length} console err` : ''}`,
      ok ? 'PASS' : 'BUG')
  }
} catch (err) {
  rec('FATAL', 'Run aborted', 'complete run', err.message, 'BUG')
} finally {
  // ── 6. CLEAN UP ────────────────────────────────────────────────────
  if (userId && !env.KEEP_USER) {
    const { error } = await db.auth.admin.deleteUser(userId)
    console.log(error ? `\n  cleanup FAILED: ${error.message}` : `\n  cleaned up test user ${USER.email}`)
  } else if (userId) {
    console.log(`\n  KEEP_USER set — left ${USER.email} / ${USER.password} in place`)
  }
  // Sweep strays from earlier aborted runs. Matched narrowly: this script is
  // the only thing that creates a "Quinn Tester" at qa……@example.com, so a
  // real signup can never be caught by this.
  if (!env.KEEP_USER) {
    const { data: all } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const strays = (all?.users || []).filter((u) =>
      u.id !== userId &&
      /^qa[a-z0-9]{4,8}@example\.com$/.test(u.email || '') &&
      u.user_metadata?.first_name === USER.first && u.user_metadata?.last_name === USER.last)
    for (const s of strays) {
      await db.auth.admin.deleteUser(s.id)
      console.log(`  swept stray test account ${s.email}`)
    }
  }
  await browser.close()
}

// ── report ───────────────────────────────────────────────────────────
const pass = results.filter((r) => r.status === 'PASS').length
const bugs = results.filter((r) => r.status === 'BUG')
writeFileSync(resolve(OUT, 'results.json'), JSON.stringify({ base: BASE, user: USER.email, results, noise }, null, 2))
console.log(`\n${'─'.repeat(60)}\n${pass}/${results.length} passed, ${bugs.length} bugs`)
for (const b of bugs) console.log(`  BUG ${b.id} ${b.name} — expected ${b.expected}, got ${b.actual}`)

// Console/page errors, deduped, worst first — the signal the page walk exists for.
const byText = new Map()
for (const n of noise) {
  const k = `${n.kind}|${n.text}`
  byText.set(k, { ...n, count: (byText.get(k)?.count || 0) + 1 })
}
const uniq = [...byText.values()].sort((a, b) => b.count - a.count)
if (uniq.length) {
  console.log(`\n${uniq.length} distinct console/network errors:`)
  for (const n of uniq.slice(0, 30)) console.log(`  ${n.count}× [${n.kind}] ${n.text}`)
}
console.log(`\nartifacts: ${OUT}`)
process.exit(bugs.length ? 1 : 0)

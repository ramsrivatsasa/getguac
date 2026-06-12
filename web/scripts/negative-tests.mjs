#!/usr/bin/env node
// Negative-test sweep for the public auth forms (/register, /login).
// Drives each validation/failure path, verifies the expected error, captures a
// screenshot, and writes results JSON for the bug-report PDF.
//   BASE_URL=http://localhost:3000 node web/scripts/negative-tests.mjs
import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, writeFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QA = resolve(__dirname, '..', '..', 'marketing-assets', 'qa', 'web')
mkdirSync(QA, { recursive: true })
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const results = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1100, height: 1500 } })
const page = await ctx.newPage()

async function shot(name) { const f = `${name}.png`; await page.screenshot({ path: resolve(QA, f) }); return f }
async function toastText() {
  // react-hot-toast renders into a container; grab any visible toast text.
  try { return (await page.locator('[role="status"], .go2072408551, div:has-text("")').first().innerText()).trim() } catch { return '' }
}
function rec(id, area, name, expected, actual, status, shotFile) {
  results.push({ id, area, name, expected, actual, status, shot: shotFile })
  console.log(`${status === 'PASS' ? '✓' : status === 'BUG' ? '✗ BUG' : 'i'} ${id} ${name} — ${actual}`)
}

async function fill(sel, val) { const el = page.locator(sel).first(); await el.click(); await el.fill(val) }

// Pick an available handle so the submit-gated tests can proceed.
async function setAvailableUsername(handle) {
  await fill('input[autocomplete="username"]', handle)
  await sleep(900) // debounced live check
}

// ───────────────────────── REGISTER ─────────────────────────
await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' })
await sleep(800)

// R1 — empty form: submit button must be disabled (gated on username+terms)
{
  const btn = page.locator('button[type="submit"]')
  const disabled = await btn.isDisabled().catch(() => null)
  const s = await shot('R1-empty')
  rec('R1', 'Register', 'Empty form', 'Submit disabled until username+terms', disabled ? 'Submit is disabled' : 'Submit ENABLED on empty form', disabled ? 'PASS' : 'BUG', s)
}

// R2 — invalid username format
{
  await fill('input[autocomplete="username"]', 'a')
  await sleep(700)
  const txt = await page.locator('text=/start and end|3.?32 chars|Must start/i').first().innerText().catch(() => '')
  const s = await shot('R2-username-invalid')
  rec('R2', 'Register', 'Invalid username "a"', 'Shows invalid-format hint', txt || 'no hint shown', txt ? 'PASS' : 'BUG', s)
}

// R3 — reserved / taken username
{
  await fill('input[autocomplete="username"]', 'admin')
  await sleep(1100)
  const txt = await page.locator('text=/taken|reserved/i').first().innerText().catch(() => '')
  const s = await shot('R3-username-taken')
  rec('R3', 'Register', 'Reserved username "admin"', 'Shows taken/reserved', txt || 'no taken/reserved message', txt ? 'PASS' : 'INFO', s)
}

// R4 — available username
let availOk = false
{
  await setAvailableUsername('qaneg' + '7421')
  const txt = await page.locator('text=/is available/i').first().innerText().catch(() => '')
  availOk = !!txt
  const s = await shot('R4-username-available')
  rec('R4', 'Register', 'Available username', 'Shows "is available"', txt || 'not marked available', txt ? 'PASS' : 'INFO', s)
}

// Fill the rest of the form for the gated tests.
await fill('input[placeholder="Alex"]', 'Neg').catch(() => {})
await fill('input[placeholder="Smith"]', 'Test').catch(() => {})
await fill('input[type="email"]', 'negtest@example.com').catch(() => {})

// R5 — terms not accepted: still disabled even with available username
{
  await fill('input[type="password"]', 'ValidPass123')
  const confirms = page.locator('input[type="password"]')
  await confirms.nth(1).fill('ValidPass123').catch(() => {})
  const disabled = await page.locator('button[type="submit"]').isDisabled().catch(() => null)
  const s = await shot('R5-terms-unchecked')
  rec('R5', 'Register', 'Terms unchecked', 'Submit disabled until Terms accepted', disabled ? 'Submit disabled' : 'Submit ENABLED without Terms', disabled ? 'PASS' : 'BUG', s)
}

// Accept terms now.
await page.locator('input[type="checkbox"]').first().check().catch(() => {})

// R6 — password too short (<10)
{
  await page.locator('input[type="password"]').first().fill('short1')
  await page.locator('input[type="password"]').nth(1).fill('short1')
  await page.locator('button[type="submit"]').click({ force: true }).catch(() => {})
  await sleep(400)
  const invalid = await page.locator('input[type="password"]').first().evaluate((el) => !el.validity.valid).catch(() => false)
  const msg = await page.locator('input[type="password"]').first().evaluate((el) => el.validationMessage).catch(() => '')
  const s = await shot('R6-short-password')
  rec('R6', 'Register', 'Password < 10 chars', 'Blocked (minLength 10)', invalid ? `Blocked: "${msg}"` : 'Accepted short password', invalid ? 'PASS' : 'BUG', s)
}

// R7 — password mismatch (KEY CASE)
{
  await page.locator('input[type="password"]').first().fill('ValidPass123')
  await page.locator('input[type="password"]').nth(1).fill('Different123')
  await page.locator('button[type="submit"]').click({ force: true }).catch(() => {})
  await sleep(700)
  const txt = await page.locator('text=/passwords do not match/i').first().innerText().catch(() => '')
  const s = await shot('R7-password-mismatch')
  rec('R7', 'Register', 'Password mismatch', 'Toast: "Passwords do not match"', txt || 'no mismatch error', txt ? 'PASS' : 'BUG', s)
}

// R8 — invalid email format
{
  await page.locator('input[type="email"]').fill('notanemail')
  await page.locator('input[type="password"]').first().fill('ValidPass123')
  await page.locator('input[type="password"]').nth(1).fill('ValidPass123')
  await page.locator('button[type="submit"]').click({ force: true }).catch(() => {})
  await sleep(400)
  const invalid = await page.locator('input[type="email"]').evaluate((el) => !el.validity.valid).catch(() => false)
  const msg = await page.locator('input[type="email"]').evaluate((el) => el.validationMessage).catch(() => '')
  const s = await shot('R8-invalid-email')
  rec('R8', 'Register', 'Invalid email format', 'Blocked by email validation', invalid ? `Blocked: "${msg}"` : 'Accepted invalid email', invalid ? 'PASS' : 'BUG', s)
}

// ───────────────────────── LOGIN ─────────────────────────
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await sleep(700)

// L1 — empty submit
{
  await page.locator('button[type="submit"]').click({ force: true }).catch(() => {})
  await sleep(300)
  const invalid = await page.locator('input[autocomplete="username"]').evaluate((el) => !el.validity.valid).catch(() => false)
  const s = await shot('L1-empty')
  rec('L1', 'Login', 'Empty submit', 'Required fields block submit', invalid ? 'Blocked (required)' : 'Submitted empty form', invalid ? 'PASS' : 'BUG', s)
}

// L2 — wrong credentials
{
  await fill('input[autocomplete="username"]', 'nouser_qa@example.com')
  await fill('input[autocomplete="current-password"]', 'wrongpassword1')
  await page.locator('button[type="submit"]').click().catch(() => {})
  await sleep(2500)
  const txt = await page.locator('text=/invalid|incorrect|not found|confirm your email/i').first().innerText().catch(() => '')
  const s = await shot('L2-wrong-credentials')
  rec('L2', 'Login', 'Wrong credentials', 'Error toast, no login', txt || 'no error shown', txt ? 'PASS' : 'BUG', s)
}

await b.close()
writeFileSync(resolve(QA, '..', 'web-results.json'), JSON.stringify(results, null, 2))
const pass = results.filter((r) => r.status === 'PASS').length
const bug = results.filter((r) => r.status === 'BUG').length
console.log(`\n${pass} PASS · ${bug} BUG · ${results.length} total`)

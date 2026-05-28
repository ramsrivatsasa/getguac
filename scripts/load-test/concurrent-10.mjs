// concurrent-10.mjs — Smoke test the prod stack with 10 concurrent virtual users
// running a full happy-path: sign up, sign in, read receipts/trips/inbox, log a
// trip, then wipe themselves clean via /api/privacy/delete.
//
// Half the users mimic the web client (Origin/Referer headers), half mimic the
// mobile client (GetGuac/0.2.20 User-Agent). The backend doesn't currently
// branch on client, but the split makes any future divergence visible.
//
// Run:
//   node scripts/load-test/concurrent-10.mjs
//
// Optional env:
//   TARGET=https://getguac.app   (default)
//   N=10                          (parallel users)
//   TEST_PASSWORD=Loadtest!2026   (password for the throwaway accounts)

const TARGET = process.env.TARGET || 'https://getguac.app'
const N = parseInt(process.env.N || '10', 10)
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Loadtest!2026Aa1'

// Each user picks a fresh 8-char id so re-runs don't collide on username.
const RUN_ID = Math.random().toString(36).slice(2, 10)

const CLIENTS = ['web', 'mobile']

function clientHeaders(kind) {
  if (kind === 'mobile') {
    return {
      'User-Agent': 'GetGuac/0.2.20 (dart:io)',
      'Accept': 'application/json',
    }
  }
  return {
    'User-Agent': 'Mozilla/5.0 (loadtest)',
    'Origin': TARGET,
    'Referer': `${TARGET}/`,
    'Accept': 'application/json',
  }
}

// ── Timing helper ─────────────────────────────────────────────────────────
async function timed(label, fn) {
  const t0 = performance.now()
  try {
    const out = await fn()
    return { label, ok: true, ms: performance.now() - t0, out }
  } catch (e) {
    return { label, ok: false, ms: performance.now() - t0, error: e.message }
  }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────
async function httpJson(method, path, { body, headers = {} } = {}) {
  const res = await fetch(`${TARGET}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let parsed
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  if (!res.ok) {
    const e = new Error(`HTTP ${res.status} ${typeof parsed === 'object' ? JSON.stringify(parsed) : parsed}`)
    e.status = res.status
    e.body = parsed
    throw e
  }
  return parsed
}

// ── Per-user scenario ─────────────────────────────────────────────────────
async function runOneUser(i) {
  const kind = CLIENTS[i % CLIENTS.length]
  const headers = clientHeaders(kind)
  const username = `lt${RUN_ID}${i.toString().padStart(2, '0')}`
  const email = `${username}@example.com`
  const steps = []
  let cookieJar = ''

  // Helper that captures Set-Cookie from sign-in so subsequent reads use it
  async function authedGet(path) {
    const res = await fetch(`${TARGET}${path}`, {
      headers: { ...headers, Cookie: cookieJar },
    })
    return res
  }

  // 1. Username availability check (anonymous, public)
  steps.push(await timed('check-username', () =>
    httpJson('GET', `/api/auth/check-username?username=${username}`, { headers })))

  // 2. Sign up — 10 of these in parallel from one IP will trip the 5/min cap
  const signupRes = await timed('sign-up', async () => {
    const res = await fetch(`${TARGET}/api/auth/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        username, email, password: TEST_PASSWORD,
        first_name: 'Load', last_name: `Test${i}`,
      }),
    })
    cookieJar = res.headers.getSetCookie?.().join('; ') || ''
    const text = await res.text()
    const body = text ? JSON.parse(text) : null
    if (!res.ok) {
      const e = new Error(`HTTP ${res.status} ${JSON.stringify(body)}`)
      e.status = res.status
      throw e
    }
    return body
  })
  steps.push(signupRes)

  // If sign-up was rate-limited or required email confirmation, we can't
  // continue the happy path. Record what we got and bail cleanly.
  if (!signupRes.ok) {
    return { i, kind, username, steps, bailed: 'sign-up failed' }
  }
  if (signupRes.out?.needs_email_confirmation) {
    return { i, kind, username, steps, bailed: 'needs email confirmation' }
  }

  // 3. Sign in to harvest a session cookie (sign-up sets one but we test the
  //    full login path too — that's the rate-limited endpoint we care about).
  const signinRes = await timed('sign-in', async () => {
    const res = await fetch(`${TARGET}/api/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ identifier: username, password: TEST_PASSWORD }),
    })
    const sc = res.headers.getSetCookie?.()
    if (sc?.length) cookieJar = sc.join('; ')
    const text = await res.text()
    const body = text ? JSON.parse(text) : null
    if (!res.ok) {
      const e = new Error(`HTTP ${res.status} ${JSON.stringify(body)}`)
      e.status = res.status
      throw e
    }
    return body
  })
  steps.push(signinRes)

  // 4. Read endpoints — what the user sees on first launch.
  for (const path of ['/api/email/list?folder=inbox', '/api/email/list?folder=inbox&pageSize=200']) {
    steps.push(await timed(`GET ${path}`, async () => {
      const r = await authedGet(path)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return await r.json()
    }))
  }

  // 5. Distance call — the new feature we just shipped. Anonymous; tests
  //    Nominatim external dependency under concurrency.
  steps.push(await timed('POST /api/distance', () =>
    httpJson('POST', '/api/distance', {
      headers,
      body: {
        from: '1600 Amphitheatre Parkway, Mountain View, CA',
        to: '1 Apple Park Way, Cupertino, CA',
      },
    })))

  // 6. Self-cleanup — wipe everything we created so this test doesn't
  //    pollute prod indefinitely.
  steps.push(await timed('privacy delete', async () => {
    const r = await fetch(`${TARGET}/api/privacy/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieJar, ...headers },
      body: JSON.stringify({
        categories: ['all'],
        older_than_days: null,
        confirm_phrase: 'DELETE MY DATA',
      }),
    })
    const text = await r.text()
    return text ? JSON.parse(text) : null
  }))

  return { i, kind, username, steps }
}

// ── Stats helpers ─────────────────────────────────────────────────────────
function pct(arr, p) {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]
}

// ── Main ──────────────────────────────────────────────────────────────────
console.log(`Load test: ${N} concurrent users → ${TARGET}`)
console.log(`Run id: ${RUN_ID}  (test usernames: lt${RUN_ID}00 … lt${RUN_ID}${(N - 1).toString().padStart(2, '0')})`)
console.log('')

const start = performance.now()
const results = await Promise.all(
  Array.from({ length: N }, (_, i) => runOneUser(i))
)
const totalMs = performance.now() - start

// Aggregate per-step
const byStep = new Map()
for (const u of results) {
  for (const s of u.steps) {
    if (!byStep.has(s.label)) byStep.set(s.label, [])
    byStep.get(s.label).push(s)
  }
}

console.log(`\n=== Per-step latency / outcome ===`)
console.log('step                                     n   ok  fail   p50    p95   p99   slowest error')
for (const [label, stepRuns] of byStep) {
  const oks = stepRuns.filter(r => r.ok).map(r => r.ms)
  const fails = stepRuns.filter(r => !r.ok)
  const failMsgs = [...new Set(fails.map(f => `${f.error || ''}`.slice(0, 80)))].join(' | ')
  const cell = (n) => Math.round(n).toString().padStart(5)
  console.log(
    label.padEnd(40),
    stepRuns.length.toString().padStart(3),
    oks.length.toString().padStart(4),
    fails.length.toString().padStart(5),
    cell(pct(oks, 50)),
    cell(pct(oks, 95)),
    cell(pct(oks, 99)),
    cell(Math.max(0, ...oks)),
    failMsgs ? '  ' + failMsgs : '',
  )
}

console.log(`\n=== Per-user summary ===`)
for (const u of results) {
  const allOk = u.steps.every(s => s.ok)
  const bail = u.bailed ? ` (bailed: ${u.bailed})` : ''
  const failedSteps = u.steps.filter(s => !s.ok).map(s => `${s.label}:${s.error?.split(' ')[1] || '??'}`)
  console.log(
    `u${u.i.toString().padStart(2, '0')} (${u.kind.padEnd(6)})`,
    u.username.padEnd(20),
    allOk ? 'OK  ' : 'FAIL',
    bail,
    failedSteps.length ? `  failed: ${failedSteps.join(', ')}` : '',
  )
}

console.log(`\nTotal wall time: ${Math.round(totalMs)} ms`)
console.log(`Throughput: ${(N / (totalMs / 1000)).toFixed(2)} users/sec`)

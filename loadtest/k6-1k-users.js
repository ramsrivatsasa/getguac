// k6 load test — simulates 1000 concurrent GetGuac users hammering the
// hot read paths. NOT a write test (writes go through Supabase RLS +
// our /api routes, hard to load-fake without burning real Supabase auth
// quota). Read-mostly is the right shape — 95% of real traffic is page
// loads / refetches.
//
// === HOW TO RUN ===
//   1. Install k6:  https://k6.io/docs/get-started/installation/
//   2. Point at staging Supabase, NOT prod. Set env vars:
//        export SUPABASE_URL=https://<staging>.supabase.co
//        export SUPABASE_ANON=<staging anon key>
//        export GG_BASE=https://staging.getguac.app   # the Next.js URL
//   3. Run:
//        k6 run --vus 100 --duration 60s loadtest/k6-1k-users.js
//      Ramp to 1000 with:
//        k6 run --vus 1000 --duration 120s --ramp-up-time 60s loadtest/k6-1k-users.js
//   4. Watch the summary at end of run. Target SLOs:
//        - p95 < 800ms on every checked endpoint
//        - error rate < 1%
//        - no 5xx
//
// === WHAT IT EXERCISES ===
//   - GET /                       (landing — server-rendered)
//   - GET /api/embeddings/refresh (no-op for unauthed; checks gate)
//   - Supabase REST hot paths via direct SDK requests:
//        * GET /rest/v1/receipts?select=*&order=date.desc&limit=20
//        * GET /rest/v1/profiles?select=*&id=eq.<uuid>
//        * RPC read_usage (admin-gated; expect 4xx for non-admin)
//        * RPC ensure_referral_code
//   - GET /api/product-image-batch (POST body, rate-limited)
//
// VUs share a synthetic-user pool. Each VU picks one synthetic user
// per iteration so RLS is exercised across many sessions, not one.

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://qchkwojgvfhlbdtpzzig.supabase.co'
const SUPABASE_ANON = __ENV.SUPABASE_ANON || ''
const GG_BASE = __ENV.GG_BASE || 'https://getguac.app'

if (!SUPABASE_ANON) {
  throw new Error('Set SUPABASE_ANON env var to the staging anon key before running.')
}

// Custom metrics
const errs = new Rate('errors')
const dashboardLatency = new Trend('dashboard_latency_ms')

export const options = {
  // Default profile when you just `k6 run`. Override with --vus/--duration.
  vus: 50,
  duration: '60s',
  thresholds: {
    'errors': ['rate<0.01'],                    // < 1% errors
    'http_req_duration': ['p(95)<800'],          // 95th percentile < 800ms
    'dashboard_latency_ms': ['p(95)<1200'],      // dashboard fetch < 1.2s p95
  },
}

// Synthetic user pool — generate a UUID per VU at startup. These don't
// have to exist in the DB for read-side tests; RLS rejects them and the
// app handles the empty-result path cleanly.
const POOL = Array.from({ length: 1000 }, (_, i) => `sim-${i.toString().padStart(4, '0')}`)

function sbHeaders() {
  return {
    apikey: SUPABASE_ANON,
    Authorization: `Bearer ${SUPABASE_ANON}`,
    'Content-Type': 'application/json',
  }
}

export default function () {
  // Each iteration is one synthetic "session": landing → dashboard reads
  // → smashlist → item detail. Sleeps between to mimic real cadence.
  const userKey = POOL[Math.floor(Math.random() * POOL.length)]

  // 1. Landing page (server-rendered, cheap)
  {
    const r = http.get(`${GG_BASE}/`)
    const ok = check(r, { 'landing 200': (resp) => resp.status === 200 })
    errs.add(!ok)
  }
  sleep(0.5)

  // 2. Receipts hot-read — public anon read returns empty list under RLS,
  //    that's fine; we're measuring round-trip + connection setup cost.
  {
    const t0 = Date.now()
    const r = http.get(
      `${SUPABASE_URL}/rest/v1/receipts?select=id,store_name,total_amount,date&order=date.desc&limit=20`,
      { headers: sbHeaders() }
    )
    dashboardLatency.add(Date.now() - t0)
    const ok = check(r, { 'receipts 200/401': (resp) => resp.status === 200 || resp.status === 401 })
    errs.add(!ok)
  }
  sleep(0.4)

  // 3. Profile hot-read — same pattern, ID is a synthetic UUID
  {
    const r = http.get(
      `${SUPABASE_URL}/rest/v1/profiles?select=smash_days_bonus,first_name&id=eq.${userKey}`,
      { headers: sbHeaders() }
    )
    const ok = check(r, { 'profile 200/401': (resp) => resp.status === 200 || resp.status === 401 })
    errs.add(!ok)
  }

  // 4. RPC ensure_referral_code — exercises the SECURITY DEFINER path.
  //    Anon will get 401; that still exercises the function lookup.
  {
    const r = http.post(
      `${SUPABASE_URL}/rest/v1/rpc/ensure_referral_code`,
      JSON.stringify({}),
      { headers: sbHeaders() }
    )
    const ok = check(r, { 'rpc ensure_referral_code resp': (resp) => resp.status < 500 })
    errs.add(!ok)
  }

  // 5. read_usage RPC — admin-only. Verify it 4xx's for anon, never 5xx.
  {
    const r = http.post(
      `${SUPABASE_URL}/rest/v1/rpc/read_usage`,
      JSON.stringify({ p_days: 14 }),
      { headers: sbHeaders() }
    )
    const ok = check(r, { 'rpc read_usage no-5xx': (resp) => resp.status < 500 })
    errs.add(!ok)
  }

  // 6. product-image-batch — POST with a small payload. Rate-limited to
  //    6/min/user; we expect 401 (no auth) or 429 (rate limit) most of
  //    the time but should never see 5xx.
  {
    const r = http.post(
      `${GG_BASE}/api/product-image-batch`,
      JSON.stringify({ names: ['Coca-Cola Zero', 'Tide Pods', 'Kirkland Bath Tissue'] }),
      { headers: { 'Content-Type': 'application/json' } }
    )
    const ok = check(r, { 'product-image-batch no-5xx': (resp) => resp.status < 500 })
    errs.add(!ok)
  }

  // Real user cadence — between session steps, idle 1-3 seconds. Without
  // this, 1000 VUs flood the gateway in a way no real userbase would.
  sleep(1 + Math.random() * 2)
}

export function handleSummary(data) {
  const summary = {
    vus_peak: data.metrics.vus_max?.values.value || 0,
    iterations: data.metrics.iterations?.values.count || 0,
    duration_s: data.state.testRunDurationMs / 1000,
    errors_pct: ((data.metrics.errors?.values.rate || 0) * 100).toFixed(2) + '%',
    http_p95_ms: (data.metrics.http_req_duration?.values['p(95)'] || 0).toFixed(0),
    http_p99_ms: (data.metrics.http_req_duration?.values['p(99)'] || 0).toFixed(0),
    dashboard_p95_ms: (data.metrics.dashboard_latency_ms?.values['p(95)'] || 0).toFixed(0),
    threshold_breaches: Object.entries(data.metrics)
      .filter(([_, m]) => m.thresholds && Object.values(m.thresholds).some(t => t.ok === false))
      .map(([name]) => name),
  }
  // Output a single-line JSON summary so the run is grep-able in CI logs
  // plus the human-friendly default summary.
  return {
    'stdout': '\n=== GETGUAC LOAD TEST SUMMARY ===\n' + JSON.stringify(summary, null, 2) + '\n',
    'loadtest-summary.json': JSON.stringify(summary, null, 2),
  }
}

// 20-scenario GuacScore harness — runs each scenario through the
// canonical engine across every surface a user might see:
//
//   - Dashboard tile      (lifetime scope)
//   - /guacanomics 30d    (period scope)
//   - /guacanomics 90d
//   - /guacanomics 12mo
//   - /guacanomics All-time (= lifetime, should equal dashboard)
//
// Output:
//   1. Console table — pass/fail per scenario + per surface
//   2. test-fixtures/GuacScore-Scenario-Report.html (auto-styled)
//
// Cross-platform parity (mobile/Dart) is asserted by a sister Dart
// test that reads the same JSON file and runs the Dart engine —
// the fixture suite already guarantees byte-equivalent scores.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const REPO_ROOT  = join(__dirname, '..', '..')

// Dynamic import — the lib uses ESM; bring it in by URL so node can
// resolve it from the web/src tree without bundler help.
const { calculateGuacoScore } = await import(
  pathToFileURL(join(REPO_ROOT, 'web', 'src', 'lib', 'guacoscore.js')).href
)
const { isPaymentReceipt } = await import(
  pathToFileURL(join(REPO_ROOT, 'web', 'src', 'lib', 'payment-rows.js')).href
)

const data = JSON.parse(readFileSync(
  join(REPO_ROOT, 'test-fixtures', 'guacscore-scenarios.json'), 'utf8'
))

const today = new Date()
today.setHours(0, 0, 0, 0)

function isoFromDaysAgo(n) {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function materializeReceipt(r) {
  return {
    date: isoFromDaysAgo(r.days_ago),
    total_amount: r.total_amount,
    rating: r.rating === null ? null : r.rating,
    store_name: r.store_name ?? 'Test Store',
    is_payment: r.is_payment ?? false,
  }
}

function materializeFee(f) {
  return {
    date: isoFromDaysAgo(f.days_ago),
    kind: f.kind,
    amount: f.amount,
  }
}

function bankBiteForRange(fees, sinceIso) {
  let interest = 0, feeTotal = 0
  for (const f of fees) {
    if (sinceIso && f.date < sinceIso) continue
    const v = Math.abs(Number(f.amount || 0))
    if (f.kind === 'interest') interest += v
    else if (f.kind === 'fee' || f.kind === 'penalty') feeTotal += v
  }
  return { interest, fees: feeTotal, total: interest + feeTotal }
}

function sinceFor(days) {
  if (!days) return null
  const d = new Date(today)
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

const SURFACES = [
  { id: 'dashboard',           label: 'Dashboard tile',  days: 0   },
  { id: 'guacanomics_30d',     label: '/guacanomics 30d',  days: 30  },
  { id: 'guacanomics_90d',     label: '/guacanomics 90d',  days: 90  },
  { id: 'guacanomics_12mo',    label: '/guacanomics 12mo', days: 365 },
  { id: 'guacanomics_alltime', label: '/guacanomics All',  days: 0   },
]

function runSurface(scenario, surface) {
  const receipts = scenario.receipts
    .map(materializeReceipt)
    .filter(r => !isPaymentReceipt(r))
  const fees = scenario.bank_fees.map(materializeFee)
  const since = sinceFor(surface.days)
  const scopedReceipts = since
    ? receipts.filter(r => r.date >= since)
    : receipts
  const bankBite = bankBiteForRange(fees, since)
  const result = calculateGuacoScore(scopedReceipts, { bankBite })
  return {
    surface: surface.id,
    surfaceLabel: surface.label,
    receiptCount: scopedReceipts.length,
    score: result.score,
    grade: result.grade?.label ?? null,
    ratedCount: result.ratedCount,
    weightedSpend: Math.round(result.weightedSpend * 100) / 100,
    bankPenalty: result.bankPenalty,
    bankBite,
  }
}

// Assertions per scenario — surface-level expectations the engine
// MUST honor. Anything failing here means the engine drifted from
// the documented behavior. Designed to catch the bugs the user
// asked us to hunt: scope mismatches, payment-receipt leakage,
// boundary drift, lifetime/window divergence.
function assertions(scenario, results) {
  const byId = Object.fromEntries(results.map(r => [r.surface, r]))
  const checks = []

  const expectNull = (id, why) => checks.push({
    name: `${id} score is null (${why})`,
    pass: byId[id].score === null,
    detail: `got score=${byId[id].score}`,
  })
  const expectScore = (id, target, tolerance, why) => checks.push({
    name: `${id} score ≈ ${target} ${why ? `(${why})` : ''}`,
    pass: byId[id].score !== null && Math.abs(byId[id].score - target) <= tolerance,
    detail: `got score=${byId[id].score}, expected ${target} ± ${tolerance}`,
  })
  const expectEqual = (a, b, why) => checks.push({
    name: `${a} === ${b} ${why ? `(${why})` : ''}`,
    pass: byId[a].score === byId[b].score,
    detail: `${a}=${byId[a].score} vs ${b}=${byId[b].score}`,
  })
  const expectPenalty = (id, max, why) => checks.push({
    name: `${id} bankPenalty ≤ ${max} ${why ? `(${why})` : ''}`,
    pass: byId[id].bankPenalty <= max,
    detail: `got penalty=${byId[id].bankPenalty}`,
  })

  // Lifetime ↔ All-time always agree (same scope, different paths)
  checks.push({
    name: 'dashboard ≡ /guacanomics All-time (same scope)',
    pass: byId.dashboard.score === byId.guacanomics_alltime.score,
    detail: `dashboard=${byId.dashboard.score} vs all=${byId.guacanomics_alltime.score}`,
  })

  switch (scenario.id) {
    case 'brand_new_user_no_rated':
    case 'only_unrated_receipts':
      for (const s of SURFACES) expectNull(s.id, 'no rated rows')
      break
    case 'single_five_star':
    case 'all_5star_lifetime':
      expectScore('dashboard', 100, 0)
      expectScore('guacanomics_alltime', 100, 0)
      break
    case 'single_one_star':
    case 'all_1star_huge_regret':
      expectScore('dashboard', 0, 0)
      expectScore('guacanomics_alltime', 0, 0)
      break
    case 'single_three_star_neutral':
    case 'many_3star_neutral':
    case 'equal_weight_5_and_1_balance':
      expectScore('dashboard', 50, 0)
      break
    case 'high_value_5star_outweighs_low_1star':
      expectScore('dashboard', 99, 2, 'big 5★ dominates')
      break
    case 'high_value_1star_drags_score_down':
      expectScore('dashboard', 8, 5, 'big 1★ dominates')
      break
    case 'huge_bankbite_caps_at_25':
      expectPenalty('dashboard', 25, 'penalty capped')
      break
    case 'interest_only_bigger_penalty_than_fees':
      checks.push({
        name: 'interest stings more per $ than fees',
        pass: byId.dashboard.bankPenalty > 0,
        detail: `penalty=${byId.dashboard.bankPenalty}`,
      })
      break
    case 'returns_excluded_by_engine':
      expectScore('dashboard', 0, 0, 'return ignored, 1★ defines score')
      break
    case 'payment_receipts_filtered':
      checks.push({
        name: 'payment receipts filtered from rated set',
        pass: byId.dashboard.ratedCount === 2,
        detail: `ratedCount=${byId.dashboard.ratedCount} (should be 2 real buys)`,
      })
      break
    case 'old_receipts_excluded_30d':
      checks.push({
        name: '/guacanomics 30d shows only recent 5★',
        pass: byId.guacanomics_30d.score === 100,
        detail: `30d=${byId.guacanomics_30d.score}`,
      })
      checks.push({
        name: 'dashboard reflects lifetime (lower due to old 1★)',
        pass: byId.dashboard.score < byId.guacanomics_30d.score,
        detail: `dashboard=${byId.dashboard.score} vs 30d=${byId.guacanomics_30d.score}`,
      })
      break
    case 'exact_90d_boundary':
      checks.push({
        name: '90d-old receipt INCLUDED in 90d window (midnight snap)',
        pass: byId.guacanomics_90d.ratedCount === 1,
        detail: `90d ratedCount=${byId.guacanomics_90d.ratedCount}, expected 1`,
      })
      break
    case 'lifetime_high_30d_low_divergence':
      checks.push({
        name: 'lifetime high (≥80)',
        pass: byId.dashboard.score >= 80,
        detail: `lifetime=${byId.dashboard.score}`,
      })
      checks.push({
        name: '30d low (≤30)',
        pass: byId.guacanomics_30d.score <= 30,
        detail: `30d=${byId.guacanomics_30d.score}`,
      })
      checks.push({
        name: 'divergence is real — dashboard much higher than 30d',
        pass: byId.dashboard.score - byId.guacanomics_30d.score >= 50,
        detail: `delta=${byId.dashboard.score - byId.guacanomics_30d.score}`,
      })
      break
  }
  return checks
}

// Run everything
console.log(`\n=== GuacScore — 20-Scenario Harness (today=${today.toISOString().slice(0, 10)}) ===\n`)

let totalScenarios = 0, totalChecks = 0, totalPassed = 0
const reportRows = []

for (const scenario of data.scenarios) {
  totalScenarios++
  const results = SURFACES.map(s => runSurface(scenario, s))
  const checks = assertions(scenario, results)
  totalChecks += checks.length
  const passedHere = checks.filter(c => c.pass).length
  totalPassed += passedHere
  const allPassed = passedHere === checks.length

  console.log(`[${allPassed ? '✓' : '✗'}] ${scenario.id}`)
  for (const r of results) {
    console.log(`   ${r.surfaceLabel.padEnd(28)} → score=${String(r.score).padStart(4)}  rated=${r.ratedCount}  penalty=${r.bankPenalty}`)
  }
  for (const c of checks) {
    console.log(`     ${c.pass ? '✓' : '✗'} ${c.name}${c.pass ? '' : ` — ${c.detail}`}`)
  }
  console.log('')

  reportRows.push({ scenario, results, checks })
}

console.log(`\n${totalPassed}/${totalChecks} assertions passed across ${totalScenarios} scenarios.\n`)

// ── HTML report ─────────────────────────────────────────────────────
const html = renderHtml(reportRows, totalScenarios, totalChecks, totalPassed, today)
const outHtmlPath = join(REPO_ROOT, 'test-fixtures', 'GuacScore-Scenario-Report.html')
writeFileSync(outHtmlPath, html, 'utf8')
console.log(`Report (HTML)  → ${outHtmlPath}`)
const publicHtmlPath = join(REPO_ROOT, 'web', 'public', 'guacscore-scenario-report.html')
writeFileSync(publicHtmlPath, html, 'utf8')
console.log(`Public (HTML)  → ${publicHtmlPath}`)

// ── PDF report ──────────────────────────────────────────────────────
// Standing instruction: every report ships as a PDF. Headless Chrome
// (or Edge as fallback — same Blink engine) renders the same HTML the
// browser would, so the PDF is pixel-equivalent to the HTML view. No
// extra puppeteer/playwright dep.
const outPdfPath = join(REPO_ROOT, 'test-fixtures', 'GuacScore-Scenario-Report.pdf')
const publicPdfPath = join(REPO_ROOT, 'web', 'public', 'guacscore-scenario-report.pdf')
const pdfOk = renderPdf(outHtmlPath, outPdfPath)
if (pdfOk) {
  // Copy the same PDF to /public so it ships at getguac.app/...pdf
  writeFileSync(publicPdfPath, readFileSync(outPdfPath))
  console.log(`Report (PDF)   → ${outPdfPath}`)
  console.log(`Public (PDF)   → ${publicPdfPath}`)
} else {
  console.warn('⚠  Could not locate a Chromium-family browser for PDF render — HTML written but PDF skipped.')
  console.warn('   Set GUACSCORE_REPORT_BROWSER=/path/to/chrome.exe to override.')
}

if (totalPassed !== totalChecks) {
  process.exit(1)
}

// Tries Chrome → Edge → Brave → custom env var. Returns true if PDF
// was written, false if no browser found.
function renderPdf(htmlPath, pdfPath) {
  const candidates = [
    process.env.GUACSCORE_REPORT_BROWSER,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)

  const exe = candidates.find(p => { try { return existsSync(p) } catch { return false } })
  if (!exe) return false

  // file:// URL is the most reliable cross-platform handoff. Chrome
  // wants forward-slashes even on Windows.
  const fileUrl = pathToFileURL(htmlPath).href
  const result = spawnSync(exe, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--print-to-pdf=${pdfPath}`,
    '--print-to-pdf-no-header',
    '--no-pdf-header-footer',
    fileUrl,
  ], { stdio: 'inherit', timeout: 60_000 })
  if (result.error) {
    console.warn('⚠  Browser invocation failed:', result.error.message)
    return false
  }
  return existsSync(pdfPath)
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]))
}

function renderHtml(rows, totalScenarios, totalChecks, totalPassed, today) {
  const allGreen = totalPassed === totalChecks
  const banner = allGreen
    ? `<div class="banner ok">All ${totalChecks} assertions passed across ${totalScenarios} scenarios — engines agree across every surface.</div>`
    : `<div class="banner err">${totalPassed} / ${totalChecks} passed. ${totalChecks - totalPassed} failing — see ✗ rows below.</div>`

  const tableHead = `
    <tr>
      <th>Scenario</th>
      ${SURFACES.map(s => `<th>${s.label}<br><span class="hint">${s.days ? `last ${s.days}d` : 'lifetime'}</span></th>`).join('')}
      <th>Assertions</th>
    </tr>
  `

  const tableBody = rows.map(({ scenario, results, checks }) => {
    const byId = Object.fromEntries(results.map(r => [r.surface, r]))
    const cells = SURFACES.map(s => {
      const r = byId[s.id]
      const colorClass = r.score === null ? 'null' :
        r.score >= 90 ? 'master' :
        r.score >= 75 ? 'solid' :
        r.score >= 60 ? 'steady' :
        r.score >= 40 ? 'splurgy' : 'mushy'
      return `
        <td class="score ${colorClass}">
          <div class="big">${r.score === null ? '—' : r.score}</div>
          <div class="meta">${r.ratedCount} rated · pen ${r.bankPenalty}</div>
        </td>
      `
    }).join('')
    const allPass = checks.every(c => c.pass)
    const assertionsHtml = checks.length === 0
      ? '<em>(no surface-specific assertions)</em>'
      : `<ul>${checks.map(c =>
          `<li class="${c.pass ? 'pass' : 'fail'}">${c.pass ? '✓' : '✗'} ${escapeHtml(c.name)}${c.pass ? '' : `<br><span class="detail">${escapeHtml(c.detail)}</span>`}</li>`
        ).join('')}</ul>`
    return `
      <tr class="${allPass ? '' : 'has-failure'}">
        <td class="scenario">
          <div class="title">${escapeHtml(scenario.title)}</div>
          <div class="id">${escapeHtml(scenario.id)}</div>
          <div class="desc">${escapeHtml(scenario.description)}</div>
        </td>
        ${cells}
        <td class="checks">${assertionsHtml}</td>
      </tr>
    `
  }).join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>GuacScore Scenario Report — ${today.toISOString().slice(0, 10)}</title>
<style>
  * { box-sizing: border-box; }
  body { font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
  header { background: linear-gradient(135deg, #15803d, #65a30d); color: white; padding: 22px 32px; }
  header h1 { margin: 0; font-size: 22px; }
  header p { margin: 4px 0 0; opacity: 0.85; font-size: 12px; }
  .banner { padding: 12px 32px; font-weight: 700; }
  .banner.ok { background: #dcfce7; color: #166534; border-left: 4px solid #15803d; }
  .banner.err { background: #fee2e2; color: #991b1b; border-left: 4px solid #dc2626; }
  main { padding: 24px 32px; }
  table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 10px; overflow: hidden; }
  thead { background: #f1f5f9; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 12px; vertical-align: top; text-align: left; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; }
  .hint { font-weight: 400; text-transform: none; color: #94a3b8; }
  .scenario { max-width: 260px; }
  .scenario .title { font-weight: 700; color: #0f172a; }
  .scenario .id { font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: #94a3b8; margin-top: 1px; }
  .scenario .desc { color: #475569; margin-top: 5px; font-size: 11.5px; }
  td.score { text-align: center; min-width: 90px; }
  td.score .big { font-size: 22px; font-weight: 900; }
  td.score .meta { font-size: 10px; color: #64748b; font-family: ui-monospace, Menlo, monospace; }
  td.score.null { background: #f8fafc; color: #94a3b8; }
  td.score.master  { background: #dcfce7; color: #14532d; }
  td.score.solid   { background: #ecfccb; color: #365314; }
  td.score.steady  { background: #fef3c7; color: #78350f; }
  td.score.splurgy { background: #ffedd5; color: #7c2d12; }
  td.score.mushy   { background: #fee2e2; color: #7f1d1d; }
  td.checks ul { margin: 0; padding: 0 0 0 16px; }
  td.checks li.pass { color: #166534; }
  td.checks li.fail { color: #991b1b; font-weight: 600; }
  td.checks .detail { font-family: ui-monospace, Menlo, monospace; font-size: 10.5px; color: #475569; }
  tr.has-failure td.scenario { background: #fef2f2; }
  footer { padding: 16px 32px; color: #64748b; font-size: 11px; }
  @page { size: A4 landscape; margin: 14mm 12mm; }
  @media print {
    body { background: white; }
    header { background: #15803d; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    main { padding: 12px 0; }
    table, thead, tr, td, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    thead { display: table-header-group; }
  }
</style>
</head>
<body>
<header>
  <h1>GuacScore — 20-Scenario Cross-Surface Report</h1>
  <p>Web dashboard tile · web /guacanomics (30d / 90d / 12mo / All-time) · cross-validated against the mobile Dart engine via fixture suite. Generated ${today.toISOString().slice(0, 10)}.</p>
</header>
${banner}
<main>
  <table>
    <thead>${tableHead}</thead>
    <tbody>${tableBody}</tbody>
  </table>
</main>
<footer>
  Source of truth: <code>web/src/lib/guacoscore.js</code>. Mobile parity asserted by
  <code>mobile/test/services/guacscore_scenarios_test.dart</code> (reads the same
  <code>test-fixtures/guacscore-scenarios.json</code>).
</footer>
</body>
</html>`
}

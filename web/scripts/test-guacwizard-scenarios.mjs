// 20-scenario GuacWizard harness — runs each scenario through the
// canonical engine across surfaces a user might see:
//
//   - Dashboard tile      (lifetime scope by default; can be windowed)
//   - /guacwizard 30d window
//   - /guacwizard 90d window
//   - /guacwizard lifetime
//
// For score-engine fixtures the scope doesn't matter (the engine is
// pure on summary + accounts), so the scenarios are pre-aggregated.
// The harness asserts:
//   1. Score matches expected_score exactly.
//   2. Mobile (Dart) produces the same score (assertion happens in
//      the sister Dart test).
//   3. Specific reason-bands fire for each scenario.
//
// Output:
//   1. Console pass/fail
//   2. test-fixtures/GuacWizard-Scenario-Report.html
//   3. test-fixtures/GuacWizard-Scenario-Report.pdf (via headless
//      Chrome, mirrored to web/public for getguac.app/...pdf)

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const REPO_ROOT  = join(__dirname, '..', '..')

const { computeWizardScore } = await import(
  pathToFileURL(join(REPO_ROOT, 'web', 'src', 'lib', 'wizardScore.js')).href
)

const data = JSON.parse(readFileSync(
  join(REPO_ROOT, 'test-fixtures', 'guacwizard-scenarios.json'), 'utf8'
))

const today = new Date()
today.setHours(0, 0, 0, 0)

function runScenario(scenario) {
  const result = computeWizardScore({
    summary: scenario.summary,
    accounts: scenario.accounts,
  })
  return {
    score: result.score,
    reasons: result.reasons,
  }
}

console.log(`\n=== GuacWizard — 20-Scenario Harness (today=${today.toISOString().slice(0, 10)}) ===\n`)

let totalScenarios = 0, totalChecks = 0, totalPassed = 0
const reportRows = []

for (const scenario of data.scenarios) {
  totalScenarios++
  const r = runScenario(scenario)
  const checks = []

  // Always check: score matches the expected value exactly. If the
  // engine drifts (or a scenario's expected math is wrong), this is
  // the first thing to fail.
  checks.push({
    name: `score === ${scenario.expected_score}`,
    pass: r.score === scenario.expected_score,
    detail: `got ${r.score}, expected ${scenario.expected_score}`,
  })

  // Reason-band assertions per scenario id — make sure the right
  // explanation fires (i.e. "Debt grew by …" appears for the debt-
  // growth scenarios, "No bank data uploaded yet" for cold start).
  const hasReason = needle => r.reasons.some(x => x.why?.includes(needle))
  switch (scenario.id) {
    case 'perfect_no_data':
      checks.push({
        name: 'reason: "No bank data uploaded yet"',
        pass: hasReason('No bank data'),
        detail: `reasons=${JSON.stringify(r.reasons)}`,
      })
      break
    case 'moderate_interest_only':
    case 'heavy_interest_capped_at_35':
      checks.push({
        name: 'reason: interest paid',
        pass: hasReason('interest paid'),
        detail: `reasons=${JSON.stringify(r.reasons)}`,
      })
      break
    case 'moderate_fees_only':
    case 'heavy_fees_capped_at_20':
    case 'fees_only_no_statements_synthetic':
      checks.push({
        name: 'reason: fees paid',
        pass: hasReason('fees paid'),
        detail: `reasons=${JSON.stringify(r.reasons)}`,
      })
      break
    case 'debt_growth_penalty':
    case 'debt_growth_capped_at_20':
      checks.push({
        name: 'reason: debt grew',
        pass: hasReason('Debt grew'),
        detail: `reasons=${JSON.stringify(r.reasons)}`,
      })
      break
    case 'debt_shrunk_small_bonus':
    case 'debt_shrunk_bonus_capped_at_10':
      checks.push({
        name: 'reason: debt down',
        pass: hasReason('Debt down'),
        detail: `reasons=${JSON.stringify(r.reasons)}`,
      })
      break
    case 'high_apr_single_card':
      checks.push({
        name: 'reason: 1 card above 25% APR',
        pass: hasReason('1 card(s) above 25% APR'),
        detail: `reasons=${JSON.stringify(r.reasons)}`,
      })
      break
    case 'high_apr_three_cards':
      checks.push({
        name: 'reason: 3 cards above 25% APR',
        pass: hasReason('3 card(s) above 25% APR'),
        detail: `reasons=${JSON.stringify(r.reasons)}`,
      })
      break
    case 'worst_case_floor_at_zero':
      checks.push({
        name: 'score floors at 0 (no negatives leak through)',
        pass: r.score === 0 || r.score >= 0,
        detail: `score=${r.score}`,
      })
      break
    case 'best_case_ceiling_at_100':
      checks.push({
        name: 'score caps at 100',
        pass: r.score === 100,
        detail: `score=${r.score}`,
      })
      break
  }

  totalChecks += checks.length
  const passedHere = checks.filter(c => c.pass).length
  totalPassed += passedHere
  const allPassed = passedHere === checks.length

  console.log(`[${allPassed ? '✓' : '✗'}] ${scenario.id} → score=${r.score} (expected ${scenario.expected_score})`)
  for (const c of checks) {
    console.log(`     ${c.pass ? '✓' : '✗'} ${c.name}${c.pass ? '' : ` — ${c.detail}`}`)
  }
  if (r.reasons.length > 0) {
    for (const x of r.reasons) console.log(`       · ${x.label}  ${x.why}`)
  }
  console.log('')

  reportRows.push({ scenario, result: r, checks })
}

console.log(`\n${totalPassed}/${totalChecks} assertions passed across ${totalScenarios} scenarios.\n`)

// ── HTML report ─────────────────────────────────────────────────────
const html = renderHtml(reportRows, totalScenarios, totalChecks, totalPassed, today)
const outHtmlPath = join(REPO_ROOT, 'test-fixtures', 'GuacWizard-Scenario-Report.html')
writeFileSync(outHtmlPath, html, 'utf8')
console.log(`Report (HTML)  → ${outHtmlPath}`)
const publicHtmlPath = join(REPO_ROOT, 'web', 'public', 'guacwizard-scenario-report.html')
writeFileSync(publicHtmlPath, html, 'utf8')
console.log(`Public (HTML)  → ${publicHtmlPath}`)

// ── PDF report ──────────────────────────────────────────────────────
const outPdfPath = join(REPO_ROOT, 'test-fixtures', 'GuacWizard-Scenario-Report.pdf')
const publicPdfPath = join(REPO_ROOT, 'web', 'public', 'guacwizard-scenario-report.pdf')
if (renderPdf(outHtmlPath, outPdfPath)) {
  writeFileSync(publicPdfPath, readFileSync(outPdfPath))
  console.log(`Report (PDF)   → ${outPdfPath}`)
  console.log(`Public (PDF)   → ${publicPdfPath}`)
} else {
  console.warn('⚠  No Chromium-family browser found — HTML written but PDF skipped.')
}

if (totalPassed !== totalChecks) {
  process.exit(1)
}

function renderPdf(htmlPath, pdfPath) {
  const candidates = [
    process.env.GUACWIZARD_REPORT_BROWSER,
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
  if (result.error) return false
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
    ? `<div class="banner ok">All ${totalChecks} assertions passed across ${totalScenarios} scenarios — engines agree.</div>`
    : `<div class="banner err">${totalPassed} / ${totalChecks} passed. ${totalChecks - totalPassed} failing — see ✗ rows below.</div>`

  const body = rows.map(({ scenario, result, checks }) => {
    const tone = result.score == null ? 'null'
      : result.score >= 80 ? 'healthy'
      : result.score >= 60 ? 'fair'
      : result.score >= 40 ? 'watch'
      : 'urgent'
    const allPass = checks.every(c => c.pass)
    const reasonsHtml = result.reasons.length === 0
      ? '<em>(no reasons fired — neutral / cold-start path)</em>'
      : `<ul class="reasons">${result.reasons.map(r =>
          `<li><span class="rlabel">${escapeHtml(r.label)}</span> ${escapeHtml(r.why)}</li>`
        ).join('')}</ul>`
    const checksHtml = checks.map(c =>
      `<li class="${c.pass ? 'pass' : 'fail'}">${c.pass ? '✓' : '✗'} ${escapeHtml(c.name)}${c.pass ? '' : `<br><span class="detail">${escapeHtml(c.detail)}</span>`}</li>`
    ).join('')
    return `
      <tr class="${allPass ? '' : 'has-failure'}">
        <td class="scenario">
          <div class="title">${escapeHtml(scenario.title)}</div>
          <div class="id">${escapeHtml(scenario.id)}</div>
          <div class="desc">${escapeHtml(scenario.description)}</div>
        </td>
        <td class="score ${tone}">
          <div class="big">${result.score == null ? '—' : result.score}</div>
          <div class="meta">expected ${scenario.expected_score}</div>
        </td>
        <td class="reasons-cell">${reasonsHtml}</td>
        <td class="checks"><ul>${checksHtml}</ul></td>
      </tr>
    `
  }).join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>GuacWizard Scenario Report — ${today.toISOString().slice(0, 10)}</title>
<style>
  * { box-sizing: border-box; }
  body { font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
  header { background: linear-gradient(135deg, #1e40af, #6366f1); color: white; padding: 22px 32px; }
  header h1 { margin: 0; font-size: 22px; }
  header p { margin: 4px 0 0; opacity: 0.85; font-size: 12px; }
  .banner { padding: 12px 32px; font-weight: 700; }
  .banner.ok { background: #dcfce7; color: #166534; border-left: 4px solid #15803d; }
  .banner.err { background: #fee2e2; color: #991b1b; border-left: 4px solid #dc2626; }
  main { padding: 24px 32px; }
  table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 10px; overflow: hidden; }
  thead { background: #f1f5f9; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 12px; vertical-align: top; text-align: left; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; }
  .scenario { max-width: 280px; }
  .scenario .title { font-weight: 700; }
  .scenario .id { font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: #94a3b8; margin-top: 1px; }
  .scenario .desc { color: #475569; margin-top: 5px; font-size: 11.5px; }
  td.score { text-align: center; min-width: 110px; }
  td.score .big { font-size: 28px; font-weight: 900; }
  td.score .meta { font-size: 10px; color: #64748b; font-family: ui-monospace, Menlo, monospace; }
  td.score.null    { background: #f8fafc; color: #94a3b8; }
  td.score.healthy { background: #dcfce7; color: #14532d; }
  td.score.fair    { background: #fef3c7; color: #78350f; }
  td.score.watch   { background: #ffedd5; color: #7c2d12; }
  td.score.urgent  { background: #fee2e2; color: #7f1d1d; }
  ul.reasons { margin: 0; padding-left: 18px; }
  ul.reasons li { font-size: 11.5px; color: #334155; margin-bottom: 2px; }
  ul.reasons .rlabel { display: inline-block; min-width: 38px; font-family: ui-monospace, Menlo, monospace; font-weight: 700; color: #0f172a; }
  td.checks ul { margin: 0; padding-left: 16px; }
  td.checks li.pass { color: #166534; }
  td.checks li.fail { color: #991b1b; font-weight: 600; }
  td.checks .detail { font-family: ui-monospace, Menlo, monospace; font-size: 10.5px; color: #475569; }
  tr.has-failure td.scenario { background: #fef2f2; }
  footer { padding: 16px 32px; color: #64748b; font-size: 11px; }
  @page { size: A4 landscape; margin: 14mm 12mm; }
  @media print {
    body { background: white; }
    header { background: #1e40af; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    main { padding: 12px 0; }
    table, thead, tr, td, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    thead { display: table-header-group; }
  }
</style>
</head>
<body>
<header>
  <h1>GuacWizard — 20-Scenario Cross-Platform Report</h1>
  <p>Single canonical engine at <code>web/src/lib/wizardScore.js</code> · Web direct import · Mobile via <code>/api/guacwizard</code> · Dart fallback validated against the same fixture file · Generated ${today.toISOString().slice(0, 10)}.</p>
</header>
${banner}
<main>
  <table>
    <thead>
      <tr>
        <th>Scenario</th>
        <th>Score</th>
        <th>Reasons (why)</th>
        <th>Assertions</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
</main>
<footer>
  Cross-platform parity asserted by <code>mobile/test/services/guacwizard_scenarios_test.dart</code>, which reads the same <code>test-fixtures/guacwizard-scenarios.json</code> and runs the Dart engine. If both runners pass, web + iOS + Android agree on every scenario.
</footer>
</body>
</html>`
}

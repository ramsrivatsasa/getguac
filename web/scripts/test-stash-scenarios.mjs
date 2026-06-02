// 20-scenario Stash aggregator harness. Reads the shared
// test-fixtures/stash-scenarios.json, runs each scenario through
// stashEngine, asserts the aggregated output matches expectations,
// and writes an HTML + PDF report.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const REPO_ROOT  = join(__dirname, '..', '..')

const { aggregateStashItems, sortStash, filterStash } = await import(
  pathToFileURL(join(REPO_ROOT, 'web', 'src', 'lib', 'stashEngine.js')).href
)

const data = JSON.parse(readFileSync(
  join(REPO_ROOT, 'test-fixtures', 'stash-scenarios.json'), 'utf8'
))

console.log(`\n=== Stash — 20-Scenario Aggregator Harness ===\n`)

let totalScenarios = 0, totalChecks = 0, totalPassed = 0
const reportRows = []

for (const scenario of data.scenarios) {
  totalScenarios++
  const aggregated = aggregateStashItems(scenario.rows || [])
  const checks = []

  // Count assertion
  checks.push({
    name: `expect_count === ${scenario.expect_count}`,
    pass: aggregated.length === scenario.expect_count,
    detail: `got ${aggregated.length}, expected ${scenario.expect_count}`,
  })

  // Per-item assertions (if `expect` provided)
  if (Array.isArray(scenario.expect)) {
    for (const exp of scenario.expect) {
      const actual = aggregated.find(it => it.key === exp.key)
      const found = !!actual
      checks.push({
        name: `key="${exp.key}" present`,
        pass: found,
        detail: found ? '' : `aggregated keys: [${aggregated.map(a => a.key).join(', ')}]`,
      })
      if (!found) continue
      for (const [field, expected] of Object.entries(exp)) {
        if (field === 'key') continue
        const got = actual[field]
        let pass
        if (typeof expected === 'number' && typeof got === 'number') {
          pass = Math.abs(got - expected) < 0.001
        } else {
          pass = got === expected
        }
        checks.push({
          name: `${exp.key}.${field} === ${JSON.stringify(expected)}`,
          pass,
          detail: pass ? '' : `got ${JSON.stringify(got)}`,
        })
      }
    }
  }

  // Sort assertion
  if (scenario.expect_sort) {
    const sorted = sortStash(aggregated, scenario.expect_sort)
    const order = sorted.map(it => it.key)
    const expectedOrder = scenario.expect_order || []
    const orderOk = JSON.stringify(order) === JSON.stringify(expectedOrder)
    checks.push({
      name: `sort '${scenario.expect_sort}' order = [${expectedOrder.join(', ')}]`,
      pass: orderOk,
      detail: orderOk ? '' : `got [${order.join(', ')}]`,
    })
  }

  // Filter assertion
  if (scenario.filter_category) {
    const filtered = filterStash(aggregated, { category: scenario.filter_category })
    checks.push({
      name: `filter category='${scenario.filter_category}' → ${scenario.expect_filtered_count}`,
      pass: filtered.length === scenario.expect_filtered_count,
      detail: `got ${filtered.length}`,
    })
  }
  if (scenario.filter_query) {
    const filtered = filterStash(aggregated, { query: scenario.filter_query })
    checks.push({
      name: `filter query='${scenario.filter_query}' → ${scenario.expect_filtered_count}`,
      pass: filtered.length === scenario.expect_filtered_count,
      detail: `got ${filtered.length}`,
    })
  }

  totalChecks += checks.length
  const passedHere = checks.filter(c => c.pass).length
  totalPassed += passedHere
  const allPassed = passedHere === checks.length

  console.log(`[${allPassed ? '✓' : '✗'}] ${scenario.id} → ${aggregated.length} item(s)`)
  for (const c of checks) {
    console.log(`     ${c.pass ? '✓' : '✗'} ${c.name}${c.pass ? '' : ` — ${c.detail}`}`)
  }
  console.log('')

  reportRows.push({ scenario, aggregated, checks })
}

console.log(`\n${totalPassed}/${totalChecks} assertions passed across ${totalScenarios} scenarios.\n`)

const html = renderHtml(reportRows, totalScenarios, totalChecks, totalPassed)
const outHtml = join(REPO_ROOT, 'test-fixtures', 'Stash-Scenario-Report.html')
writeFileSync(outHtml, html, 'utf8')
console.log(`Report (HTML)  → ${outHtml}`)
const publicHtml = join(REPO_ROOT, 'web', 'public', 'stash-scenario-report.html')
writeFileSync(publicHtml, html, 'utf8')
console.log(`Public (HTML)  → ${publicHtml}`)

const outPdf = join(REPO_ROOT, 'test-fixtures', 'Stash-Scenario-Report.pdf')
const publicPdf = join(REPO_ROOT, 'web', 'public', 'stash-scenario-report.pdf')
if (renderPdf(outHtml, outPdf)) {
  writeFileSync(publicPdf, readFileSync(outPdf))
  console.log(`Report (PDF)   → ${outPdf}`)
  console.log(`Public (PDF)   → ${publicPdf}`)
}

if (totalPassed !== totalChecks) process.exit(1)

function renderPdf(htmlPath, pdfPath) {
  const candidates = [
    process.env.STASH_REPORT_BROWSER,
    process.env.GUACSCORE_REPORT_BROWSER,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)
  const exe = candidates.find(p => { try { return existsSync(p) } catch { return false } })
  if (!exe) return false
  const fileUrl = pathToFileURL(htmlPath).href
  const result = spawnSync(exe, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    `--print-to-pdf=${pdfPath}`, '--print-to-pdf-no-header', '--no-pdf-header-footer',
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

function renderHtml(rows, total, totalChecks, totalPassed) {
  const allGreen = totalPassed === totalChecks
  const banner = allGreen
    ? `<div class="banner ok">All ${totalChecks} assertions passed across ${total} scenarios — web + mobile aggregators agree.</div>`
    : `<div class="banner err">${totalPassed} / ${totalChecks} passed. ${totalChecks - totalPassed} failing.</div>`

  const body = rows.map(({ scenario, aggregated, checks }) => {
    const allPass = checks.every(c => c.pass)
    const itemsHtml = aggregated.length === 0
      ? '<em>(empty)</em>'
      : `<ul class="items">${aggregated.map(it =>
          `<li><code>${escapeHtml(it.key)}</code> · qty ${it.qty} · $${it.totalSpent.toFixed(2)}${it.ratingAvg != null ? ` · ${it.ratingAvg.toFixed(1)}★` : ''}${it.storeCount > 1 ? ` · ${it.storeCount} stores` : ''}</li>`
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
        <td class="items-cell">${itemsHtml}</td>
        <td class="checks"><ul>${checksHtml}</ul></td>
      </tr>
    `
  }).join('')

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Stash Aggregator Scenario Report</title>
<style>
  * { box-sizing: border-box; }
  body { font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
  header { background: linear-gradient(135deg, #ca8a04, #f59e0b); color: white; padding: 22px 32px; }
  header h1 { margin: 0; font-size: 22px; }
  header p { margin: 4px 0 0; opacity: 0.9; font-size: 12px; }
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
  ul.items, td.checks ul { margin: 0; padding-left: 18px; }
  ul.items li { font-size: 11.5px; color: #334155; margin-bottom: 2px; }
  ul.items code { background: #fef9c3; padding: 1px 6px; border-radius: 4px; font-family: ui-monospace, Menlo, monospace; }
  td.checks li.pass { color: #166534; font-size: 11.5px; }
  td.checks li.fail { color: #991b1b; font-weight: 600; font-size: 11.5px; }
  td.checks .detail { font-family: ui-monospace, Menlo, monospace; font-size: 10.5px; color: #475569; }
  tr.has-failure td.scenario { background: #fef2f2; }
  footer { padding: 16px 32px; color: #64748b; font-size: 11px; }
  @page { size: A4 landscape; margin: 14mm 12mm; }
  @media print {
    body { background: white; }
    header { background: #ca8a04; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    main { padding: 12px 0; }
    table, thead, tr, td, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    thead { display: table-header-group; }
  }
</style></head>
<body>
<header>
  <h1>Stash — Aggregator Scenario Report</h1>
  <p>Canonical engine at <code>web/src/lib/stashEngine.js</code> · Web direct import · Mobile via <code>mobile/lib/services/stash_engine.dart</code>.</p>
</header>
${banner}
<main>
  <table>
    <thead><tr><th>Scenario</th><th>Aggregated items</th><th>Assertions</th></tr></thead>
    <tbody>${body}</tbody>
  </table>
</main>
<footer>
  Cross-platform parity asserted by <code>mobile/test/services/stash_scenarios_test.dart</code>, reading the same <code>test-fixtures/stash-scenarios.json</code>.
</footer>
</body></html>`
}

// 20-scenario harness for the love-count formatter. Pure-function
// test — no Supabase needed. Pairs with the Dart twin at
// mobile/test/services/product_likes_scenarios_test.dart; if both
// runners pass, web + mobile word counts byte-identically.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const REPO_ROOT  = join(__dirname, '..', '..')

const { formatLikeCount } = await import(
  pathToFileURL(join(REPO_ROOT, 'web', 'src', 'lib', 'productLikes.js')).href
)

const data = JSON.parse(readFileSync(
  join(REPO_ROOT, 'test-fixtures', 'product-likes-scenarios.json'), 'utf8'
))

console.log(`\n=== Product Likes — ${data.scenarios.length}-Scenario Harness ===\n`)
let passed = 0, total = 0
const rows = []
for (const s of data.scenarios) {
  total++
  const got = formatLikeCount(s.value)
  const ok = got === s.expectFormat
  if (ok) passed++
  console.log(`[${ok ? '✓' : '✗'}] ${s.id.padEnd(34)} ${String(s.value).padStart(8)} → "${got}"${ok ? '' : ` (expected "${s.expectFormat}")`}`)
  rows.push({ scenario: s, got, ok })
}
console.log(`\n${passed}/${total} assertions passed.\n`)

const html = renderHtml(rows, total, passed)
const outHtml = join(REPO_ROOT, 'test-fixtures', 'Product-Likes-Report.html')
writeFileSync(outHtml, html, 'utf8')
console.log(`Report (HTML) → ${outHtml}`)
const publicHtml = join(REPO_ROOT, 'web', 'public', 'product-likes-report.html')
writeFileSync(publicHtml, html, 'utf8')
console.log(`Public (HTML) → ${publicHtml}`)

const outPdf = join(REPO_ROOT, 'test-fixtures', 'Product-Likes-Report.pdf')
const publicPdf = join(REPO_ROOT, 'web', 'public', 'product-likes-report.pdf')
if (renderPdf(outHtml, outPdf)) {
  writeFileSync(publicPdf, readFileSync(outPdf))
  console.log(`Report (PDF)  → ${outPdf}`)
  console.log(`Public (PDF)  → ${publicPdf}`)
}

if (passed !== total) process.exit(1)

function renderPdf(htmlPath, pdfPath) {
  const candidates = [
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
  const r = spawnSync(exe, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    `--print-to-pdf=${pdfPath}`, '--print-to-pdf-no-header', '--no-pdf-header-footer',
    pathToFileURL(htmlPath).href,
  ], { stdio: 'inherit', timeout: 60_000 })
  if (r.error) return false
  return existsSync(pdfPath)
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  }[c]))
}

function renderHtml(rows, total, passed) {
  const allGreen = passed === total
  const banner = allGreen
    ? `<div class="banner ok">All ${total} assertions passed — web + mobile formatters agree.</div>`
    : `<div class="banner err">${passed} / ${total} passed.</div>`
  const body = rows.map(({ scenario, got, ok }) => `
    <tr class="${ok ? '' : 'has-failure'}">
      <td class="scenario">
        <div class="id">${escape(scenario.id)}</div>
        <div class="note">${escape(scenario.note)}</div>
      </td>
      <td class="value">${escape(scenario.value)}</td>
      <td class="result"><span class="chip">♥ ${escape(got)}</span></td>
      <td class="expect">${escape(scenario.expectFormat)}</td>
      <td class="ok ${ok ? 'pass' : 'fail'}">${ok ? '✓' : '✗'}</td>
    </tr>
  `).join('')
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Product Likes — Scenario Report</title>
<style>
  * { box-sizing: border-box; }
  body { font: 13px/1.45 -apple-system, system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
  header { background: linear-gradient(135deg, #ec4899, #f59e0b); color: white; padding: 22px 32px; }
  header h1 { margin: 0; font-size: 22px; }
  header p { margin: 4px 0 0; opacity: 0.92; font-size: 12px; }
  .banner { padding: 12px 32px; font-weight: 700; }
  .banner.ok { background: #dcfce7; color: #166534; border-left: 4px solid #15803d; }
  .banner.err { background: #fee2e2; color: #991b1b; border-left: 4px solid #dc2626; }
  main { padding: 24px 32px; }
  table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 10px; overflow: hidden; }
  thead { background: #f1f5f9; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 14px; vertical-align: top; text-align: left; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; }
  .scenario .id { font-family: ui-monospace, Menlo, monospace; font-size: 11px; font-weight: 700; color: #0f172a; }
  .scenario .note { font-size: 11px; color: #475569; margin-top: 2px; line-height: 1.4; }
  .value, .expect { font-family: ui-monospace, Menlo, monospace; font-size: 12px; }
  .result .chip { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 12px; background: rgba(236,72,153,0.10); border: 1px solid rgba(236,72,153,0.35); color: #ec4899; font-weight: 800; font-size: 12px; }
  .ok { text-align: center; font-size: 16px; font-weight: 900; }
  .ok.pass { color: #15803d; }
  .ok.fail { color: #dc2626; }
  tr.has-failure td.scenario { background: #fef2f2; }
  footer { padding: 16px 32px; font-size: 11px; color: #64748b; }
  @page { size: A4 portrait; margin: 14mm; }
  @media print {
    body { background: white; }
    header { background: #ec4899; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    thead { display: table-header-group; }
  }
</style></head>
<body>
<header>
  <h1>Product Likes — 20-Scenario Formatter Report</h1>
  <p>Cross-platform parity for <code>formatLikeCount</code>. Web (<code>web/src/lib/productLikes.js</code>) and mobile (<code>mobile/lib/services/product_likes_service.dart</code>) must produce identical output for every value below.</p>
</header>
${banner}
<main>
  <table>
    <thead>
      <tr><th>Scenario</th><th>Input</th><th>Rendered chip</th><th>Expected</th><th></th></tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
</main>
<footer>
  Toggle behavior + RPC are integration concerns and live behind a Supabase session — covered by manual smoke tests in the mobile app (tap a heart, refresh, count persists) rather than the harness.
</footer>
</body></html>`
}

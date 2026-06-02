// 20-scenario harness for the Wikipedia name-cleaner + live-lookup
// pipeline. Pure portion (cleanProductNameForLookup) runs every time
// — fast, deterministic. Network portion (actual Wikipedia hits) is
// gated behind WIKI_NETWORK=1 so the suite doesn't spam the API on
// every CI build.
//
// Output: HTML + PDF reports written to test-fixtures/ and mirrored
// to web/public/ so they ship at getguac.app.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const REPO_ROOT  = join(__dirname, '..', '..')
const RUN_NETWORK = process.env.WIKI_NETWORK === '1'

const { cleanProductNameForLookup } = await import(
  pathToFileURL(join(REPO_ROOT, 'web', 'src', 'lib', 'productImage.js')).href
)

const data = JSON.parse(readFileSync(
  join(REPO_ROOT, 'test-fixtures', 'wikipedia-lookup-scenarios.json'), 'utf8'
))

console.log(`\n=== Wikipedia Lookup — ${data.scenarios.length}-Scenario Harness ===`)
console.log(`(network portion ${RUN_NETWORK ? 'ENABLED' : 'SKIPPED — set WIKI_NETWORK=1 to run'})\n`)

let pass = 0, total = 0
const rows = []

for (const s of data.scenarios) {
  const cleaned = cleanProductNameForLookup(s.raw)
  let cleanOk = cleaned === s.expectClean
  total++
  if (cleanOk) pass++
  let liveResult = null
  if (RUN_NETWORK && cleaned.length >= 3) {
    liveResult = await fetchWikiThumb(cleaned)
    const hasImage = !!liveResult?.thumbnail
    total++
    const liveOk = hasImage === s.expectHasImage
    if (liveOk) pass++
    console.log(`[${cleanOk ? '✓' : '✗'}/${liveOk ? '✓' : '✗'}] ${s.id.padEnd(24)} "${s.raw}" → "${cleaned}" ${hasImage ? '🖼️' : '∅'}`)
    rows.push({ scenario: s, cleaned, cleanOk, liveResult, liveOk, ranLive: true })
  } else {
    console.log(`[${cleanOk ? '✓' : '✗'}/-] ${s.id.padEnd(24)} "${s.raw}" → "${cleaned}"`)
    rows.push({ scenario: s, cleaned, cleanOk, liveResult: null, liveOk: null, ranLive: false })
  }
}

console.log(`\n${pass}/${total} assertions passed.\n`)

const html = renderHtml(rows, total, pass, RUN_NETWORK)
const outHtml = join(REPO_ROOT, 'test-fixtures', 'Wikipedia-Lookup-Report.html')
writeFileSync(outHtml, html, 'utf8')
console.log(`Report (HTML) → ${outHtml}`)
const publicHtml = join(REPO_ROOT, 'web', 'public', 'wikipedia-lookup-report.html')
writeFileSync(publicHtml, html, 'utf8')
console.log(`Public (HTML) → ${publicHtml}`)

const outPdf = join(REPO_ROOT, 'test-fixtures', 'Wikipedia-Lookup-Report.pdf')
const publicPdf = join(REPO_ROOT, 'web', 'public', 'wikipedia-lookup-report.pdf')
if (renderPdf(outHtml, outPdf)) {
  writeFileSync(publicPdf, readFileSync(outPdf))
  console.log(`Report (PDF)  → ${outPdf}`)
  console.log(`Public (PDF)  → ${publicPdf}`)
}

if (pass !== total) process.exit(1)

async function fetchWikiThumb(cleaned) {
  // Aliases mirror productImage.js — keep in sync.
  const WIKI_ALIASES = {
    'Mint':         'Mentha',
    'Pepper':       'Black pepper',
    'Coconut Milk': 'Coconut milk',
    'Hot Sauce':    'Hot sauce',
  }
  const alias = WIKI_ALIASES[cleaned]
  const candidates = alias ? [alias, cleaned, `${cleaned} (food)`] : [cleaned, `${cleaned} (food)`]
  for (const candidate of candidates) {
    const r = await tryOnce(candidate)
    if (r?.thumbnail) return r
  }
  return { ok: true, thumbnail: null }
}
async function tryOnce(title) {
  try {
    const u = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`
    const res = await fetch(u, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'GetGuac-Test/0.3' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const thumb = data?.thumbnail?.source
    if (!thumb) return null
    return { ok: true, thumbnail: thumb, title: data?.title || title }
  } catch (_) { return null }
}

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

function renderHtml(rows, total, pass, ran) {
  const allGreen = pass === total
  const banner = allGreen
    ? `<div class="banner ok">All ${total} assertions passed.</div>`
    : `<div class="banner err">${pass} / ${total} passed.</div>`
  const networkBanner = ran
    ? `<div class="net ran">Network portion ran — live Wikipedia thumbnails embedded below.</div>`
    : `<div class="net skipped">Network portion skipped. Run <code>WIKI_NETWORK=1 node web/scripts/test-wikipedia-lookup-scenarios.mjs</code> to verify each cleaned name actually resolves to an image.</div>`

  const body = rows.map(({ scenario, cleaned, cleanOk, liveResult, liveOk, ranLive }) => `
    <tr class="${(cleanOk && (!ranLive || liveOk)) ? '' : 'has-failure'}">
      <td class="scenario">
        <div class="id">${escape(scenario.id)}</div>
        <div class="note">${escape(scenario.note)}</div>
      </td>
      <td class="raw"><code>${escape(scenario.raw || '∅')}</code></td>
      <td class="cleaned">
        <code>${escape(cleaned || '∅')}</code>
        ${cleanOk
          ? '<span class="check pass">✓</span>'
          : `<span class="check fail">✗ expected <code>${escape(scenario.expectClean)}</code></span>`}
      </td>
      <td class="thumb">
        ${ranLive && liveResult?.thumbnail
          ? `<img src="${escape(liveResult.thumbnail)}" alt="${escape(liveResult.title || '')}" />`
          : ranLive
            ? '<span class="empty">no image</span>'
            : '<span class="empty">(skipped)</span>'}
      </td>
      <td class="expect">${scenario.expectHasImage ? 'image' : 'no image'}</td>
      <td class="ok ${ranLive ? (liveOk ? 'pass' : 'fail') : 'na'}">
        ${ranLive ? (liveOk ? '✓' : '✗') : '—'}
      </td>
    </tr>
  `).join('')

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Wikipedia Lookup — Scenario Report</title>
<style>
  * { box-sizing: border-box; }
  body { font: 13px/1.45 -apple-system, system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
  header { background: linear-gradient(135deg, #1e293b, #475569); color: white; padding: 22px 32px; }
  header h1 { margin: 0; font-size: 22px; }
  header p { margin: 4px 0 0; opacity: 0.85; font-size: 12px; }
  .banner { padding: 12px 32px; font-weight: 700; }
  .banner.ok { background: #dcfce7; color: #166534; border-left: 4px solid #15803d; }
  .banner.err { background: #fee2e2; color: #991b1b; border-left: 4px solid #dc2626; }
  .net { padding: 10px 32px; font-size: 12px; }
  .net.ran { background: #eff6ff; color: #1e40af; border-left: 4px solid #3b82f6; }
  .net.skipped { background: #fef3c7; color: #78350f; border-left: 4px solid #f59e0b; }
  .net code { background: rgba(0,0,0,0.05); padding: 1px 5px; border-radius: 3px; font-family: ui-monospace, Menlo, monospace; }
  main { padding: 24px 32px; }
  table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 10px; overflow: hidden; }
  thead { background: #f1f5f9; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 12px; vertical-align: middle; text-align: left; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; }
  .scenario .id { font-family: ui-monospace, Menlo, monospace; font-size: 11px; font-weight: 700; color: #0f172a; }
  .scenario .note { font-size: 11px; color: #475569; margin-top: 2px; line-height: 1.35; }
  td.raw code, td.cleaned code { background: #fef3c7; padding: 1px 6px; border-radius: 4px; font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; }
  .check.pass { color: #15803d; margin-left: 6px; font-weight: 800; }
  .check.fail { color: #b91c1c; margin-left: 6px; font-weight: 700; font-size: 10.5px; }
  td.thumb { width: 90px; text-align: center; }
  td.thumb img { max-width: 76px; max-height: 64px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  td.thumb .empty { font-size: 10px; color: #94a3b8; font-style: italic; }
  td.expect { font-size: 11px; color: #64748b; }
  td.ok { text-align: center; font-size: 16px; font-weight: 900; }
  td.ok.pass { color: #15803d; }
  td.ok.fail { color: #dc2626; }
  td.ok.na { color: #cbd5e1; }
  tr.has-failure td.scenario { background: #fef2f2; }
  footer { padding: 16px 32px; font-size: 11px; color: #64748b; }
  @page { size: A4 landscape; margin: 12mm; }
  @media print {
    body { background: white; }
    header { background: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    thead { display: table-header-group; }
  }
</style></head>
<body>
<header>
  <h1>Wikipedia Lookup — 20-Scenario Report</h1>
  <p>Tests <code>cleanProductNameForLookup</code> (pure) and the live Wikipedia REST hits that turn cleaned names into real Stash card images.</p>
</header>
${banner}
${networkBanner}
<main>
  <table>
    <thead>
      <tr><th>Scenario</th><th>Raw input</th><th>Cleaned (→ Wikipedia title)</th><th>Live thumbnail</th><th>Expect</th><th></th></tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
</main>
<footer>
  Cleaner lives in <code>web/src/lib/productImage.js#cleanProductNameForLookup</code>. The full pipeline (cache → wiki → CSE fallback) is in <code>resolveProductImage</code>. Mobile uses the same endpoint via <code>mobile/lib/services/product_image_service.dart</code>.
</footer>
</body></html>`
}

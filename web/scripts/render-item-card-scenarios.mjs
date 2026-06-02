// Item-card contract renderer — reads test-fixtures/item-card-scenarios.json
// and emits an HTML + PDF preview showing what each scenario looks
// like when implemented to spec. The HTML below is a faithful mockup
// of the mobile FetchCard layout, rendered in pure CSS so the same
// preview ships in any browser. Both platforms' card widgets MUST
// produce visually-equivalent output for the same props — divergence
// against this preview is a parity bug.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const REPO_ROOT  = join(__dirname, '..', '..')

const data = JSON.parse(readFileSync(
  join(REPO_ROOT, 'test-fixtures', 'item-card-scenarios.json'), 'utf8'
))

console.log(`\n=== Item Card — ${data.scenarios.length}-Scenario Contract Renderer ===\n`)
for (const s of data.scenarios) {
  console.log(`  · ${s.id} — ${s.title}`)
}
console.log(`\n${data.scenarios.length} scenarios specified.\n`)

const html = renderHtml(data)
const outHtml = join(REPO_ROOT, 'test-fixtures', 'Item-Card-Contract.html')
writeFileSync(outHtml, html, 'utf8')
console.log(`Contract (HTML) → ${outHtml}`)
const publicHtml = join(REPO_ROOT, 'web', 'public', 'item-card-contract.html')
writeFileSync(publicHtml, html, 'utf8')
console.log(`Public (HTML)   → ${publicHtml}`)

// Also publish the JSON spec itself so the React dev showcase
// (/_dev/item-card) can fetch it at runtime — single source of truth
// across the HTML preview, the PDF, the mobile widget test, and the
// React showcase page. Any change to the spec automatically reflows
// every consumer.
const publicJson = join(REPO_ROOT, 'web', 'public', 'item-card-scenarios.json')
writeFileSync(publicJson, readFileSync(
  join(REPO_ROOT, 'test-fixtures', 'item-card-scenarios.json'), 'utf8'
), 'utf8')
console.log(`Public (JSON)   → ${publicJson}`)

const outPdf = join(REPO_ROOT, 'test-fixtures', 'Item-Card-Contract.pdf')
const publicPdf = join(REPO_ROOT, 'web', 'public', 'item-card-contract.pdf')
if (renderPdf(outHtml, outPdf)) {
  writeFileSync(publicPdf, readFileSync(outPdf))
  console.log(`Contract (PDF)  → ${outPdf}`)
  console.log(`Public (PDF)    → ${publicPdf}`)
} else {
  console.warn('⚠  No browser found — PDF skipped.')
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
  const result = spawnSync(exe, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    `--print-to-pdf=${pdfPath}`, '--print-to-pdf-no-header', '--no-pdf-header-footer',
    pathToFileURL(htmlPath).href,
  ], { stdio: 'inherit', timeout: 60_000 })
  if (result.error) return false
  return existsSync(pdfPath)
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]))
}

function renderCard(props) {
  const tint = props.tint || '#fef9c3'
  const emoji = props.imageEmoji || '📦'
  const showStore = !!props.storeName
  const showValue = props.value != null
  const showUrg = !!props.urgency
  const fmt = n => {
    const v = Math.abs(n)
    if (v >= 1000) {
      const k = v / 1000
      return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`
    }
    return v === Math.round(v) ? `${Math.round(v)}` : v.toFixed(2)
  }
  const valueText = showValue
    ? (props.valueIsPrefix ? `${props.valueLabel || ''}${fmt(props.value)}` : `${fmt(props.value)}${props.valueLabel || ''}`)
    : ''
  const valueChip = showValue ? `
    <span class="value">
      <span class="coin">★</span>
      <span class="value-text">${escape(valueText)}</span>
    </span>` : ''

  // Personal rating chip — single star + number, or "Rate" when unrated.
  let personalChip = ''
  if (props.onRate || props.rating != null) {
    const r = props.rating || 0
    if (r === 0) {
      personalChip = `<span class="rchip rate-empty"><span class="rstar">☆</span> <span class="rnum">Rate</span></span>`
    } else {
      personalChip = `<span class="rchip rate-gold"><span class="rstar">★</span> <span class="rnum">${r}</span></span>`
    }
  }
  // Community rating chip — read-only, indigo tone, optional social count.
  let communityChip = ''
  if (props.communityRating != null) {
    const r = props.communityRating
    const rDisplay = r === Math.round(r) ? `${r}` : r.toFixed(1)
    const countText = props.communityRatingCount != null ? ` · ${fmt(props.communityRatingCount)}` : ''
    communityChip = `<span class="rchip rate-community"><span class="rstar">★</span> <span class="rnum">${rDisplay}${countText}</span></span>`
  }

  const urgencyHtml = showUrg ? `
    <div class="urgency" style="background:${props.urgencyBg || '#fecdd3'};color:${props.urgencyFg || '#9f1239'}">
      ${props.urgency.toLowerCase().includes('left') ? '<span class="bolt">⚡</span>' : ''}
      ${escape(props.urgency)}
    </div>` : ''

  const storeHtml = showStore ? `
    <div class="store-pill">
      <span class="store-emoji" style="background:${props.storeColor || '#6b7280'}">${escape(props.storeEmoji || '·')}</span>
      <span class="store-name">${escape(props.storeName)}</span>
    </div>` : ''

  return `
    <div class="card">
      <div class="image-tile" style="background:${tint}">${emoji}</div>
      <div class="content">
        ${urgencyHtml}
        <div class="title-row">
          <div class="title">${escape(props.title || '')}</div>
          ${valueChip}
        </div>
        ${props.subtitle ? `<div class="subtitle">${escape(props.subtitle)}</div>` : ''}
        <div class="utility">
          ${storeHtml}
          <span class="spacer"></span>
          ${personalChip}
          ${communityChip}
          ${props.onToggleSave != null ? `<span class="heart ${props.saved ? 'saved' : ''}">${props.saved ? '♥' : '♡'}</span>` : ''}
          ${props.onShare != null ? `<span class="icon">⤴</span>` : ''}
          ${props.onMenu != null ? `<span class="icon">⋯</span>` : ''}
        </div>
      </div>
    </div>
  `
}

function renderHtml(data) {
  const cards = data.scenarios.map(s => `
    <section class="scenario">
      <div class="meta">
        <div class="meta-title">${escape(s.title)}</div>
        <div class="meta-id">${escape(s.id)}</div>
        <div class="meta-desc">${escape(s.description)}</div>
      </div>
      <div class="render">${renderCard(s.props)}</div>
    </section>
  `).join('')

  const contractRows = Object.entries(data._contract).map(([k, v]) =>
    `<tr><td><code>${escape(k)}</code></td><td>${escape(v.type)}</td><td>${escape(v.default ?? '—')}</td><td>${escape(v.desc)}</td></tr>`
  ).join('')

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Item Card — Contract</title>
<style>
  * { box-sizing: border-box; }
  body { font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
  header { background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; padding: 22px 32px; }
  header h1 { margin: 0; font-size: 22px; }
  header p { margin: 4px 0 0; opacity: 0.95; font-size: 12px; }
  main { padding: 24px 32px 32px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; margin: 20px 0 10px; }
  .contract { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  .contract th, .contract td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 11.5px; vertical-align: top; }
  .contract th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; }
  .contract code { background: #fef3c7; padding: 1px 5px; border-radius: 4px; font-family: ui-monospace, Menlo, monospace; }
  .scenarios { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 14px; }
  .scenario { background: white; border-radius: 12px; padding: 12px 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; }
  .meta-title { font-weight: 800; color: #0f172a; }
  .meta-id { font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: #94a3b8; margin-top: 1px; }
  .meta-desc { color: #475569; font-size: 11.5px; margin-top: 4px; line-height: 1.4; }
  .render { margin-top: 10px; }

  /* === Card rendering matches mobile FetchCard layout === */
  .card { display: flex; gap: 12px; background: white; border-radius: 18px; padding: 10px 12px 8px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; align-items: flex-start; }
  .image-tile { width: 72px; height: 72px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 36px; flex-shrink: 0; }
  .content { flex: 1; min-width: 0; padding-top: 2px; }
  .urgency { display: inline-flex; align-items: center; gap: 2px; padding: 2px 7px; border-radius: 7px; font-size: 10px; font-weight: 900; margin-bottom: 4px; }
  .urgency .bolt { font-size: 9px; }
  .title-row { display: flex; gap: 8px; align-items: flex-start; }
  .title { flex: 1; font-size: 14px; font-weight: 800; color: #0f172a; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .subtitle { font-size: 11.5px; color: #64748b; font-weight: 500; line-height: 1.3; margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .utility { display: flex; align-items: center; gap: 4px; margin-top: 6px; flex-wrap: nowrap; }
  .store-pill { display: inline-flex; align-items: center; gap: 5px; background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 3px 8px 3px 3px; max-width: 60%; }
  .store-emoji { width: 16px; height: 16px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 9px; font-weight: 900; }
  .store-name { font-size: 10.5px; font-weight: 800; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .spacer { flex: 1; }
  /* Compact rating chips — single star + number. Personal=gold (tappable);
     community=indigo (read-only). Both same physical size to align cleanly. */
  .rchip { display: inline-flex; align-items: center; gap: 3px; padding: 3px 7px; border-radius: 14px; font-size: 11px; font-weight: 900; margin-left: 4px; }
  .rchip .rstar { font-size: 12px; line-height: 1; }
  .rchip .rnum  { line-height: 1; }
  .rate-empty { background: white; border: 1px solid #e2e8f0; color: #64748b; }
  .rate-empty .rstar { color: #94a3b8; }
  .rate-gold  { background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.35); color: #f59e0b; }
  .rate-community { background: rgba(99,102,241,0.10); border: 1px solid rgba(99,102,241,0.30); color: #6366f1; }
  .rate-community .rnum { font-weight: 800; }
  .value { display: inline-flex; align-items: center; gap: 4px; }
  .value .coin { width: 20px; height: 20px; border-radius: 50%; background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
  .value-text { font-size: 14px; font-weight: 900; color: #0f172a; }
  .heart, .icon { color: #94a3b8; font-size: 16px; margin-left: 4px; }
  .heart.saved { color: #ec4899; }

  footer { padding: 16px 32px; color: #64748b; font-size: 11px; }
  @page { size: A4 portrait; margin: 12mm; }
  @media print {
    body { background: white; }
    header { background: #f59e0b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .scenarios { grid-template-columns: repeat(2, 1fr); }
    .scenario, .card { break-inside: avoid; page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style></head>
<body>
<header>
  <h1>Item Card — Cross-Platform Contract</h1>
  <p>Single canonical spec at <code>test-fixtures/item-card-scenarios.json</code>. Mobile renders via <code>FetchCard</code> (Flutter). Web renders via <code>ItemRowCard</code> (React). Both must produce visually-equivalent output for the same props.</p>
</header>
<main>
  <h2>Prop contract</h2>
  <table class="contract">
    <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
    <tbody>${contractRows}</tbody>
  </table>

  <h2>${data.scenarios.length} scenarios</h2>
  <div class="scenarios">${cards}</div>
</main>
<footer>
  Mobile parity asserted by <code>mobile/test/widgets/fetch_card_scenarios_test.dart</code> — pumps each scenario through FetchCard and verifies the build succeeds (no exception). The HTML preview above is the visual reference.
</footer>
</body></html>`
}

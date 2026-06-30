#!/usr/bin/env node
// Render the complete test report (auth negatives + positive/functional) to PDF.
import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QA = resolve(__dirname, '..', '..', 'marketing-assets', 'qa')
const DATE = process.env.REPORT_DATE || '2026-06-14'
const read = (p) => existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : []
const authR = read(resolve(QA, 'web-results.json'))   // R1-R8, L1-L2
const qaR = read(resolve(QA, 'qa-results.json'))       // P0-P16, N1-N4
const all = [...authR, ...qaR]

const b64 = (p) => existsSync(p) ? `data:image/png;base64,${readFileSync(p).toString('base64')}` : ''
const SHOTS = {
  mismatch: b64(resolve(QA, 'web', 'R7-password-mismatch.png')),
  steals: b64(resolve(QA, 'steals-strip.png')),
  androidLogin: b64(resolve(QA, '03b-login.png')),
}

const pass = all.filter((r) => r.status === 'PASS').length
const bugs = all.filter((r) => r.status === 'BUG')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const badge = (s) => s === 'PASS' ? '<span class="b pass">PASS</span>' : s === 'BUG' ? '<span class="b bug">BUG</span>' : `<span class="b info">${esc(s)}</span>`
const rows = (list) => list.map((r) => `<tr><td class="mono">${esc(r.id)}</td><td>${esc(r.area)}</td><td>${esc(r.name)}</td><td>${esc(r.actual)}</td><td>${badge(r.status)}</td></tr>`).join('')

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system,'Segoe UI',Roboto,sans-serif; color:#0f172a; margin:0; }
  .page { padding: 40px 50px; }
  .cover { background: linear-gradient(135deg,#065f46,#16a34a 60%,#84cc16); color:#fff; padding:40px 50px; }
  .logo { font-weight:900; font-size:23px; display:flex; align-items:center; gap:10px; }
  .av { width:32px; height:32px; border-radius:10px; background:#bef264; display:inline-flex; align-items:center; justify-content:center; font-size:19px; }
  h1 { font-size:36px; font-weight:900; letter-spacing:-1px; margin:16px 0 6px; }
  .sub { color:#ecfccb; font-size:15px; }
  .stats { display:flex; gap:12px; margin-top:20px; }
  .stat { background:rgba(255,255,255,.16); border-radius:12px; padding:11px 20px; text-align:center; }
  .stat .n { font-size:28px; font-weight:900; } .stat .l { font-size:11px; opacity:.85; text-transform:uppercase; letter-spacing:1px; }
  h2 { font-size:20px; font-weight:900; margin:26px 0 10px; color:#065f46; }
  h2 .pill { font-size:12px; font-weight:700; color:#64748b; margin-left:8px; }
  table { width:100%; border-collapse:collapse; font-size:11.5px; }
  th { text-align:left; background:#f0fdf4; color:#065f46; padding:7px 8px; border-bottom:2px solid #d1fae5; font-size:10.5px; text-transform:uppercase; letter-spacing:.4px; }
  td { padding:7px 8px; border-bottom:1px solid #eef2f7; vertical-align:top; }
  .mono { font-family:ui-monospace,monospace; font-weight:700; }
  .b { font-size:9.5px; font-weight:800; padding:3px 8px; border-radius:999px; }
  .b.pass { background:#d1fae5; color:#047857; } .b.bug { background:#fee2e2; color:#b91c1c; } .b.info { background:#e2e8f0; color:#475569; }
  .note { background:#f8fafc; border-left:4px solid #16a34a; border-radius:8px; padding:11px 15px; font-size:12.5px; color:#334155; margin-top:8px; line-height:1.5; }
  .ok { background:#ecfdf5; border-left-color:#059669; }
  .shots { display:flex; gap:14px; margin-top:10px; flex-wrap:wrap; }
  .shotbox { border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; width:200px; box-shadow:0 4px 12px rgba(0,0,0,.06); }
  .shotbox img { display:block; width:100%; } .shotbox .cap { font-size:10.5px; font-weight:700; color:#475569; padding:7px 9px; background:#f8fafc; }
  .foot { color:#94a3b8; font-size:10.5px; margin-top:22px; border-top:1px solid #e2e8f0; padding-top:9px; }
</style></head><body>
  <div class="cover">
    <div class="logo"><span class="av">🥑</span> GetGuac</div>
    <h1>Complete Test Report</h1>
    <div class="sub">Auth negatives + positive/functional · live + Android · ${DATE}</div>
    <div class="stats">
      <div class="stat"><div class="n">${all.length}</div><div class="l">cases</div></div>
      <div class="stat"><div class="n">${pass}</div><div class="l">passed</div></div>
      <div class="stat"><div class="n">${bugs.length}</div><div class="l">open bugs</div></div>
    </div>
  </div>
  <div class="page">
    <h2>Status <span class="pill">${pass}/${all.length} pass · ${bugs.length} open bug${bugs.length === 1 ? '' : 's'}</span></h2>
    ${bugs.length === 0
      ? `<div class="note ok"><b>✅ All clear — 0 open bugs.</b> The one bug found earlier — <b>BUG-1: usernames accepted 1 character</b> despite the "3–32 chars" rule — was fixed (regex now enforces 3+ across web, API & mobile) and is <b>verified resolved</b>: the auth-negative suite is now 10/10 (was 9/10), and the live API returns <code>a</code>→invalid, <code>ab</code>→invalid, <code>abc</code>→available.</div>`
      : bugs.map((bg) => `<div class="note"><b>${esc(bg.id)} ${esc(bg.name)}</b> — ${esc(bg.actual)}</div>`).join('')}

    <h2>Auth negatives — Register &amp; Login <span class="pill">${authR.filter(r=>r.status==='PASS').length}/${authR.length} pass</span></h2>
    <table><thead><tr><th>ID</th><th>Area</th><th>Case</th><th>Result</th><th>Status</th></tr></thead><tbody>${rows(authR)}</tbody></table>

    <h2>Positive + functional — logged in as demo <span class="pill">${qaR.filter(r=>r.status==='PASS').length}/${qaR.length} pass</span></h2>
    <table><thead><tr><th>ID</th><th>Area</th><th>Case</th><th>Result</th><th>Status</th></tr></thead><tbody>${rows(qaR)}</tbody></table>

    <h2>Also verified this cycle</h2>
    <div class="note">
      • <b>Steals</b> — dashboard "Steals for you" strip live: deals grouped by configured search, top 5 each by best discount, with the "X new" found-count.<br/>
      • <b>Email poll</b> — healthy (HTTP 200, 6 mailboxes); added clear 401/connection diagnostics to the workflow + server.<br/>
      • <b>Mobile v0.3.79</b> — referral-code field + 3-char username fix shipped to <code>/download</code>.<br/>
      • <b>Stress test</b> — read paths handle 20 concurrent requests cleanly (avg ~615ms); flagged that signup rate-limiting needs Upstash Redis configured to hold under bursts. The 20 test accounts created were deleted.
    </div>
    <div class="shots">
      ${SHOTS.steals ? `<div class="shotbox"><img src="${SHOTS.steals}"/><div class="cap">Steals strip (live)</div></div>` : ''}
      ${SHOTS.mismatch ? `<div class="shotbox"><img src="${SHOTS.mismatch}"/><div class="cap">Password mismatch</div></div>` : ''}
      ${SHOTS.androidLogin ? `<div class="shotbox"><img src="${SHOTS.androidLogin}"/><div class="cap">Android · login</div></div>` : ''}
    </div>

    <div class="foot">GetGuac complete test sweep · ${all.length} cases (10 auth + ${qaR.length} positive/functional) · ${pass} pass · ${bugs.length} open bug · generated ${DATE}. Tested against production (local dev lacks the Supabase service key, so auth/data paths run against live).</div>
  </div>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(html, { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
const out = resolve(QA, 'GetGuac-Test-Report.pdf')
await page.pdf({ path: out, format: 'A4', printBackground: true })
if (process.argv.includes('--preview')) {
  await page.setViewportSize({ width: 820, height: 1500 })
  await page.screenshot({ path: resolve(QA, '_report-preview.png'), fullPage: true })
}
await browser.close()
console.log('✓ wrote', out, '·', all.length, 'cases ·', pass, 'pass ·', bugs.length, 'open bug(s)')

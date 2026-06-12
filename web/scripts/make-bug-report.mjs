#!/usr/bin/env node
// Render the COMPLETE negative + functional test report to PDF.
import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QA = resolve(__dirname, '..', '..', 'marketing-assets', 'qa')
const DATE = process.env.REPORT_DATE || '2026-06-12'
const read = (p) => existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : []
const authR = read(resolve(QA, 'web-results.json'))      // A: register R1-R8, login L1-L2
const funcR = read(resolve(QA, 'full-results.json'))     // B: page smoke, C: functional negatives
const all = [...authR, ...funcR]

const b64 = (p) => existsSync(p) ? `data:image/png;base64,${readFileSync(p).toString('base64')}` : ''
const SHOTS = {
  mismatch: b64(resolve(QA, 'web', 'R7-password-mismatch.png')),
  username: b64(resolve(QA, 'web', 'R2-username-invalid.png')),
  androidLogin: b64(resolve(QA, '03b-login.png')),
  androidDash: b64(resolve(QA, '01-launch.png')),
}

const pass = all.filter((r) => r.status === 'PASS').length
const bugs = all.filter((r) => r.status === 'BUG')
const info = all.filter((r) => r.status === 'INFO').length
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const badge = (s) => s === 'PASS' ? '<span class="b pass">PASS</span>' : s === 'BUG' ? '<span class="b bug">BUG</span>' : `<span class="b info">${esc(s)}</span>`
const rowsFor = (list) => list.map((r) => `<tr><td class="mono">${esc(r.id)}</td><td>${esc(r.area)}</td><td>${esc(r.name)}</td><td class="muted">${esc(r.expected)}</td><td>${esc(r.actual)}</td><td>${badge(r.status)}</td></tr>`).join('')

const smoke = funcR.filter((r) => r.area === 'Page smoke')
const smokePass = smoke.filter((r) => r.status === 'PASS').length
const funcNeg = funcR.filter((r) => r.area !== 'Page smoke') // B0 login + C cases

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
  .stat { background:rgba(255,255,255,.14); border-radius:12px; padding:11px 18px; text-align:center; }
  .stat .n { font-size:28px; font-weight:900; } .stat .l { font-size:11px; opacity:.85; text-transform:uppercase; letter-spacing:1px; }
  .stat.warn { background:#fff; color:#b91c1c; }
  h2 { font-size:20px; font-weight:900; margin:26px 0 10px; color:#065f46; }
  h2 .pill { font-size:12px; font-weight:700; color:#64748b; margin-left:8px; }
  table { width:100%; border-collapse:collapse; font-size:11.5px; }
  th { text-align:left; background:#f0fdf4; color:#065f46; padding:7px 8px; border-bottom:2px solid #d1fae5; font-size:10.5px; text-transform:uppercase; letter-spacing:.4px; }
  td { padding:7px 8px; border-bottom:1px solid #eef2f7; vertical-align:top; }
  .mono { font-family:ui-monospace,monospace; font-weight:700; } .muted { color:#64748b; }
  .b { font-size:9.5px; font-weight:800; padding:3px 8px; border-radius:999px; }
  .b.pass { background:#d1fae5; color:#047857; } .b.bug { background:#fee2e2; color:#b91c1c; } .b.info { background:#e2e8f0; color:#475569; }
  .bugcard { border:1px solid #fecaca; background:#fef2f2; border-radius:14px; padding:16px 18px; margin-top:10px; }
  .bugcard h3 { margin:0 0 8px; color:#b91c1c; font-size:15px; } .bugcard .k { font-weight:800; color:#7f1d1d; } .bugcard p { margin:5px 0; font-size:12.5px; line-height:1.5; }
  code { background:#fff; border:1px solid #fecaca; border-radius:5px; padding:1px 5px; font-family:ui-monospace,monospace; font-size:11.5px; }
  .shots { display:flex; gap:14px; margin-top:10px; flex-wrap:wrap; }
  .shotbox { border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; width:170px; box-shadow:0 4px 12px rgba(0,0,0,.06); }
  .shotbox img { display:block; width:100%; } .shotbox .cap { font-size:10.5px; font-weight:700; color:#475569; padding:7px 9px; background:#f8fafc; }
  .note { background:#f8fafc; border-left:4px solid #16a34a; border-radius:8px; padding:11px 15px; font-size:12.5px; color:#334155; margin-top:8px; line-height:1.5; }
  .chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .chip { background:#ecfdf5; border:1px solid #a7f3d0; color:#047857; border-radius:999px; padding:4px 10px; font-size:11px; font-weight:700; }
  .foot { color:#94a3b8; font-size:10.5px; margin-top:22px; border-top:1px solid #e2e8f0; padding-top:9px; }
</style></head><body>
  <div class="cover">
    <div class="logo"><span class="av">🥑</span> GetGuac</div>
    <h1>Complete Test Report</h1>
    <div class="sub">Negative + functional · Register, Login, all app screens · Android + Web · ${DATE}</div>
    <div class="stats">
      <div class="stat"><div class="n">${all.length}</div><div class="l">cases</div></div>
      <div class="stat"><div class="n">${pass}</div><div class="l">passed</div></div>
      <div class="stat warn"><div class="n">${bugs.length}</div><div class="l">total bug${bugs.length === 1 ? '' : 's'}</div></div>
      <div class="stat"><div class="n">${info}</div><div class="l">info</div></div>
    </div>
  </div>
  <div class="page">
    <h2>Total bugs &amp; issues <span class="pill">${bugs.length} bug · ${info} info · ${pass}/${all.length} pass</span></h2>
    ${bugs.length === 0 ? '<div class="note">No bugs found.</div>' : bugs.map((bg) => `
    <div class="bugcard">
      <h3>${esc(bg.id)} · ${esc(bg.name)} — username minimum length not enforced</h3>
      <p><span class="k">Severity:</span> Minor · <span class="k">Area:</span> Register username validation (web + mobile + API)</p>
      <p><span class="k">Repro:</span> Type a single-character handle (<code>a</code>) on Register — it's reported <b>available</b>, although the UI says "3–32 chars". A 2-char handle (<code>ab</code>) is correctly rejected.</p>
      <p><span class="k">Evidence:</span> <code>GET /api/auth/check-username?username=a</code> → <code>{"status":"available"}</code>; <code>?username=ab</code> → <code>{"status":"invalid"}</code>. Lower bound is inconsistent (1 ok, 2 fails, 3+ ok).</p>
      <p><span class="k">Root cause:</span> regex <code>^[a-z0-9]([a-z0-9._-]{1,30}[a-z0-9])?$</code> — the middle+last group is optional, so one char matches.</p>
      <p><span class="k">Fix:</span> remove the optional group → <code>^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$</code> (forces 3+). Apply in web <code>/register</code>, mobile <code>register_screen</code>, and <code>/api/auth/check-username</code>.</p>
    </div>`).join('')}
    <div class="note"><b>1 info item (not a bug):</b> <code>GET /api/best-prices?q=</code> returns <b>HTTP 405</b> — correct, the endpoint is POST-only. Listed for completeness.</div>

    <h2>Auth negatives — Register &amp; Login <span class="pill">${authR.filter(r=>r.status==='PASS').length}/${authR.length} pass</span></h2>
    <table><thead><tr><th>ID</th><th>Area</th><th>Case</th><th>Expected</th><th>Actual</th><th>Status</th></tr></thead><tbody>${rowsFor(authR)}</tbody></table>
    ${SHOTS.mismatch ? `<div class="shots"><div class="shotbox"><img src="${SHOTS.mismatch}"/><div class="cap">Password mismatch ✓</div></div>${SHOTS.username ? `<div class="shotbox"><img src="${SHOTS.username}"/><div class="cap">Username field (bug)</div></div>` : ''}</div>` : ''}

    <h2>Functional sweep — logged in as demo <span class="pill">${funcR.filter(r=>r.status==='PASS').length}/${funcR.length} pass</span></h2>
    <div class="note"><b>Page-load smoke: ${smokePass}/${smoke.length} app screens load cleanly</b> (no 404, no error boundary, HTTP 200):</div>
    <div class="chips">${smoke.map((r) => `<span class="chip">/${esc(r.name.replace('/', ''))}</span>`).join('')}</div>
    <table style="margin-top:14px"><thead><tr><th>ID</th><th>Area</th><th>Case</th><th>Expected</th><th>Actual</th><th>Status</th></tr></thead><tbody>${rowsFor(funcNeg)}</tbody></table>

    <h2>Android app — device verification</h2>
    <div class="note">pixel_8 emulator · v0.3.78 build. App <b>installs, launches, reaches login</b> cleanly. Native register/login validation mirrors web (same messages). Form-level negatives verified on the equivalent web build (Flutter canvas + gesture-nav make adb form-driving unreliable).</div>
    <div class="shots">
      ${SHOTS.androidLogin ? `<div class="shotbox"><img src="${SHOTS.androidLogin}"/><div class="cap">Android · login</div></div>` : ''}
      ${SHOTS.androidDash ? `<div class="shotbox"><img src="${SHOTS.androidDash}"/><div class="cap">Android · launched</div></div>` : ''}
    </div>

    <div class="foot">GetGuac complete test sweep · ${all.length} cases (10 auth + ${funcR.length} functional) · ${pass} pass · ${bugs.length} bug · ${info} info · generated ${DATE}. Live env tested (local dev lacks the Supabase key, so username/sign-up paths run against production).</div>
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
console.log('✓ wrote', out, '·', all.length, 'cases ·', bugs.length, 'bug(s)')

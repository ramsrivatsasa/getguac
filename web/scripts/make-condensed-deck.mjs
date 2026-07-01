// Condensed 10-slide deck → PDF. Mirrors /how-it-works + new features but
// merged per request. DOES NOT modify the live page — pure asset build.
// Uses public /showcase images for the how-it-works visuals and captures the
// new-feature pages live. Run: node scripts/make-condensed-deck.mjs
import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', '..', 'marketing-assets', 'qa')
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })
const SITE = 'https://getguac.app'
const PW = '297mm', PH = '210mm'

const shots = {}
// Public showcase images (no login) for the how-it-works visuals.
for (const name of ['receipts', 'items', 'reports', 'dashboard', 'returns']) {
  try {
    const r = await fetch(`${SITE}/showcase/${name}.png`)
    if (r.ok) shots[name] = `data:image/png;base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`
  } catch (e) { console.error('fetch', name, e.message) }
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 880 }, deviceScaleFactor: 1.5 })
const page = await ctx.newPage()
const grab = async (name) => { shots[name] = `data:image/png;base64,${(await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 880 } })).toString('base64')}` }
try {
  await page.goto(`${SITE}/marketplace?q=${encodeURIComponent('AirPods Pro')}`, { waitUntil: 'networkidle' })
  for (let i = 0; i < 25; i++) { if (await page.locator('a:has-text("$")').count() >= 6) break; await page.waitForTimeout(1200) }
  await page.waitForTimeout(800); await grab('marketplace')
  await page.goto(`${SITE}/plan`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  { const ins = await page.locator('input[type="number"]').all(); const v = ['35','65','40000','600','60000','6']; for (let i=0;i<Math.min(6,ins.length);i++) await ins[i].fill(v[i]) }
  await page.locator('button:has-text("Plan it")').first().click()
  for (let i = 0; i < 25; i++) { if (await page.locator('text=Tax benefits').count() > 0) break; await page.waitForTimeout(1200) }
  await page.waitForTimeout(600); await grab('plan')
  await page.goto(`${SITE}/security`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200); await grab('security')
} catch (e) { console.error('capture error:', e.message) } finally { await ctx.close() }

const STEP = [
  { emoji: '🧾', tag: 'Step 1 · Get receipts in', h: 'Three ways in — and a shield', steps: [
    'Camera — snap a paper receipt from the app, single shot or batch of three.',
    'Email — forward to your free you+g@getguac.app inbox; it auto-files in 10 min. A real two-way mailbox you hand to merchants instead of your personal email.',
    'Statement (optional) — drop a card or bank PDF and every line becomes a receipt.'], img: 'receipts' },
  { emoji: '✨', tag: 'Step 2 · Guac-AI reads it', h: 'Paper becomes data in seconds', steps: [
    'Store, date, total, tax, payment, last-4 — even faded or handwritten.',
    'Every line item becomes searchable history you can look up by name.',
    'Refund policy captured from the receipt, or filled from curated store defaults.'], img: 'items' },
  { emoji: '🧹', tag: 'Step 3 · Clean & organized', h: 'No duplicates, auto-categorized', steps: [
    'The same purchase from camera + email + statement collapses into one row.',
    '12 built-in categories plus your own — Pet, Yoga, Side hustle, with emoji & color.',
    'One-tap auto-categorize assigns the obvious ones; you confirm the edge cases.'], img: 'reports' },
  { emoji: '📊', tag: 'Step 4 · See it, score it, guided', h: 'Where it went — and was it worth it', steps: [
    'Dashboard + Reports — spending by store, by category, and repeat purchases.',
    'Rate each buy “Worth it?” → your GuacScore tracks how well you spend.',
    'GuacWizard surfaces avoidable bank bites (interest, fees) — calm, never preachy.'], img: 'dashboard' },
  { emoji: '↩️', tag: 'Step 5 · Returns & Car Miles', h: 'Money back, and tax-ready miles', steps: [
    'Per-item refund countdown so you never miss a return window.',
    'Mark items returned; a Returns page totals how much came back this year.',
    'Car Miles — share a Maps trip and get an audit-ready mileage log.'], img: 'returns' },
  { emoji: '🛡️', tag: 'Step 6 · Security & your data', h: 'Yours, only yours', steps: [
    'Row-level security in Postgres — gated by your login, not just app code.',
    'Encrypted at rest, TLS in transit, biometric unlock, zero third-party trackers.',
    'Delete any receipt, email, or your whole account instantly — no backups kept.'], img: 'security' },
  { emoji: '🛒', tag: 'New · Marketplace, Coupons & Steals', h: 'Spend less on what you buy', steps: [
    'Marketplace — the best price on anything across Walmart, Amazon, Target & more.',
    'Coupons — live promo codes for the big stores, pulled from the web.',
    'Steals — deals on the things you rebuy, surfaced right on your dashboard.'], img: 'marketplace' },
  { emoji: '🎯', tag: 'New · Plan, forecast & bills', h: 'Plan the big stuff', steps: [
    '18 calculators — retirement, mortgage, college, debt payoff, net worth & more.',
    'Guac-AI builds a strategy with current US tax tips (401k / IRA / HSA / 529).',
    'A bills calendar projects your subscriptions onto their due dates.'], img: 'plan' },
]

const featureSlide = (s, i, n) => `<section class="slide">
  <div class="left">
    <div class="ill">${s.emoji}</div><div class="tag">${s.tag}</div><h2>${s.h}</h2>
    <ol>${s.steps.map((b, k) => `<li><span class="sn">${k + 1}</span><span>${b}</span></li>`).join('')}</ol>
    <div class="page-no">How GetGuac works · ${i + 2} of ${n}</div>
  </div>
  <div class="right"><div class="frame"><div class="bar"><span></span><span></span><span></span></div>${shots[s.img] ? `<img src="${shots[s.img]}"/>` : '<div class="ph">screenshot</div>'}</div></div>
</section>`

const N = STEP.length + 2
const heroSlide = `<section class="slide title">
  <div class="blob b1"></div><div class="blob b2"></div>
  <div class="title-grid">
    <div class="title-copy">
      <div class="av">🥑</div><div class="kick">A quick tour</div>
      <h1>How <span class="grad">GetGuac</span> works</h1>
      <p class="lead">Snap a receipt, see where your money goes, find better prices, plan the big stuff. Free.</p>
      <div class="pills"><span>🧾 Receipts</span><span>📊 Insights</span><span>🛒 Marketplace</span><span>🎯 Calculators</span></div>
    </div>
    <div class="title-shot"><div class="frame"><div class="bar"><span></span><span></span><span></span></div>${shots.dashboard ? `<img src="${shots.dashboard}"/>` : ''}</div></div>
  </div></section>`
const closeSlide = `<section class="slide title">
  <div class="blob b1"></div><div class="blob b2"></div>
  <div class="av">🥑</div><h1 style="margin-top:8px">All of it. <span class="grad">Free.</span></h1>
  <p class="lead">Plus plain-English Articles & trusted Resources to learn as you go. No card, no catch — your data stays yours.</p>
  <div class="cta">getguac.app</div>
  <p style="color:#94a3b8;font-size:14px;margin-top:14px">Money's wingman. Keep your guac.</p></section>`

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:${PW} ${PH};margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0}
body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a}
.slide{width:${PW};height:${PH};page-break-after:always;display:flex;overflow:hidden;position:relative;background:linear-gradient(135deg,#f0fdf4,#ffffff 55%,#ecfccb)}
.left{width:44%;padding:54px 46px;display:flex;flex-direction:column;justify-content:center;position:relative}
.right{width:56%;display:flex;align-items:center;justify-content:center;padding:44px 46px 44px 0}
.ill{font-size:62px;line-height:1;margin-bottom:14px;filter:drop-shadow(0 8px 18px rgba(16,185,129,.25))}
.tag{font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#059669;margin-bottom:8px}
h2{font-size:36px;font-weight:900;line-height:1.08;letter-spacing:-.5px;margin-bottom:20px}
ol{list-style:none}li{display:flex;gap:14px;align-items:flex-start;font-size:16.5px;line-height:1.45;color:#334155;margin-bottom:15px}
.sn{flex:0 0 28px;width:28px;height:28px;border-radius:50%;background:#16a34a;color:#fff;font-weight:900;font-size:14px;display:flex;align-items:center;justify-content:center;margin-top:1px}
.page-no{position:absolute;bottom:26px;left:46px;font-size:12px;font-weight:700;color:#94a3b8}
.frame{width:100%;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(2,44,34,.22);border:1px solid #d1fae5;background:#fff}
.bar{height:32px;background:#f8fafc;border-bottom:1px solid #eef2f7;display:flex;align-items:center;gap:7px;padding:0 14px}
.bar span{width:11px;height:11px;border-radius:50%;background:#e2e8f0}.bar span:nth-child(1){background:#fca5a5}.bar span:nth-child(2){background:#fde68a}.bar span:nth-child(3){background:#86efac}
.frame img{display:block;width:100%}.ph{height:520px;display:flex;align-items:center;justify-content:center;color:#cbd5e1}
.title{flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(135deg,#065f46,#16a34a 58%,#84cc16);color:#fff}
.title .av{width:96px;height:96px;border-radius:28px;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;font-size:58px;margin-bottom:18px;box-shadow:0 14px 40px rgba(0,0,0,.2)}
.title .kick{font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:3px;color:#d9f99d;margin-bottom:12px}
.title h1{font-size:62px;font-weight:900;line-height:1.04;letter-spacing:-1.5px}.title .grad{color:#ecfccb}
.title .lead{font-size:21px;color:#ecfccb;margin-top:16px;max-width:820px}
.pills{display:flex;gap:12px;margin-top:26px}.pills span{background:rgba(255,255,255,.16);border-radius:999px;padding:9px 18px;font-size:15px;font-weight:700}
.cta{margin-top:18px;background:#fff;color:#065f46;font-weight:900;font-size:26px;padding:12px 32px;border-radius:999px}
.title-grid{display:flex;align-items:center;gap:46px;width:100%;max-width:1180px;padding:0 64px;text-align:left;position:relative;z-index:1}
.title-copy{flex:1;display:flex;flex-direction:column;align-items:flex-start}
.title-copy h1{font-size:54px}.title-copy .lead{max-width:none;margin-top:14px}.title-copy .pills{flex-wrap:wrap;margin-top:22px}
.title-shot{flex:0 0 46%}
.blob{position:absolute;border-radius:50%;filter:blur(50px);opacity:.4}.b1{width:360px;height:360px;background:#bbf7d0;top:-90px;right:-60px}.b2{width:320px;height:320px;background:#fef08a;bottom:-90px;left:-70px}
</style></head><body>${heroSlide}${STEP.map((s, i) => featureSlide(s, i, N)).join('')}${closeSlide}</body></html>`

const b2 = await browser.newPage()
await b2.setContent(html, { waitUntil: 'networkidle' })
await b2.waitForTimeout(500)
const out = resolve(OUT, 'GetGuac-How-It-Works-Condensed.pdf')
await b2.pdf({ path: out, width: PW, height: PH, printBackground: true })
await b2.setViewportSize({ width: 1123, height: 794 })
await b2.locator('.slide').first().screenshot({ path: resolve(OUT, '_cond-1.png') })
await b2.locator('.slide').nth(4).screenshot({ path: resolve(OUT, '_cond-5.png') })
await browser.close()
console.log('images:', Object.keys(shots).join(', '))
console.log('slides:', N, '| PDF:', out)

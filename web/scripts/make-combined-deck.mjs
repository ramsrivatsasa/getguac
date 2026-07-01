// Combined deck → one PDF = the live /how-it-works presentation (printed
// faithfully, with all its illustrations) followed by new-feature slides
// (Marketplace, Coupons, Plan, Articles, Bills, Dashboard). Leaves the
// existing GetGuac-How-It-Works-Deck.pdf untouched; writes a new file.
// Run: node scripts/make-combined-deck.mjs
import { chromium } from 'playwright'
import { PDFDocument } from 'pdf-lib'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', '..', 'marketing-assets', 'qa')
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })
const SITE = 'https://getguac.app'
const EMAIL = 'demo@getguac.app', PASS = 'Guac!Demo2026'
// A4 landscape — matches the printed how-it-works pages so the merged doc is uniform.
const PW = '297mm', PH = '210mm'

const browser = await chromium.launch()

// ── 1. Print the live /how-it-works page to PDF (faithful illustrations) ──
const howPage = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await howPage.goto(`${SITE}/how-it-works`, { waitUntil: 'networkidle' })
await howPage.waitForSelector('section[data-idx]', { timeout: 30000 })
await howPage.waitForTimeout(2500)
await howPage.emulateMedia({ media: 'print' })
const howBuf = await howPage.pdf({ width: PW, height: PH, printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } })
await howPage.close()

// ── 2. Capture new-feature screenshots ──
const ctx = await browser.newContext({ viewport: { width: 1280, height: 880 }, deviceScaleFactor: 1.5 })
const page = await ctx.newPage()
const shots = {}
const grab = async (name) => { shots[name] = `data:image/png;base64,${(await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 880 } })).toString('base64')}` }
try {
  await page.goto(`${SITE}/marketplace?q=${encodeURIComponent('AirPods Pro')}`, { waitUntil: 'networkidle' })
  for (let i = 0; i < 25; i++) { if (await page.locator('a:has-text("$")').count() >= 6) break; await page.waitForTimeout(1200) }
  await page.waitForTimeout(800); await grab('marketplace')
  await page.goto(`${SITE}/marketplace?tab=stores`, { waitUntil: 'networkidle' }); await page.waitForTimeout(2000); await grab('stores')
  await page.goto(`${SITE}/coupons`, { waitUntil: 'networkidle' })
  for (let i = 0; i < 25; i++) { if (await page.locator('a:has-text("Coupon"), a:has-text("Promo"), a:has-text("% Off")').count() >= 4) break; await page.waitForTimeout(1200) }
  await grab('coupons')
  await page.goto(`${SITE}/plan`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  { const ins = await page.locator('input[type="number"]').all(); const v = ['35','65','40000','600','60000','6']; for (let i=0;i<Math.min(6,ins.length);i++) await ins[i].fill(v[i]) }
  await page.locator('button:has-text("Plan it")').first().click()
  for (let i = 0; i < 25; i++) { if (await page.locator('text=Tax benefits').count() > 0) break; await page.waitForTimeout(1200) }
  await page.waitForTimeout(600); await grab('plan')
  await page.goto(`${SITE}/articles`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000); await grab('articles')
  await page.goto(`${SITE}/login`, { waitUntil: 'networkidle' })
  await page.locator('input[type="text"]').first().fill(EMAIL)
  await page.locator('input[type="password"]').first().fill(PASS)
  await page.keyboard.press('Enter'); await page.waitForTimeout(5000)
  await page.goto(`${SITE}/dashboard`, { waitUntil: 'networkidle' }); await page.waitForTimeout(2500); await grab('dashboard')
  await page.goto(`${SITE}/bills`, { waitUntil: 'networkidle' }); await page.waitForTimeout(2500); await grab('bills')
} catch (e) { console.error('capture error:', e.message) } finally { await ctx.close() }

// ── 3. Build new-feature slides HTML (A4 landscape, same look as the deck) ──
const FEATURES = [
  { emoji: '🛒', tag: 'Marketplace · Deals', h: 'Find the best price on anything', steps: ['Type any product or store in the search bar.', 'See live prices across Walmart, Amazon, Target & more — ranked by discount.', 'Save the search; sign in and GetGuac watches it for price drops.'], img: 'marketplace' },
  { emoji: '🎟️', tag: 'Marketplace · Stores', h: 'Grab a store coupon', steps: ['Open the Stores tab and pick a retailer.', 'Tap “Coupons” on its card.', 'See live promo codes pulled from Google — click through to redeem.'], img: 'stores' },
  { emoji: '🏷️', tag: 'Coupons', h: 'Browse every big-store coupon', steps: ['Open the Coupons page — no account needed.', 'Scroll the biggest stores, each with current codes.', 'Click an offer to open it at the source and use it at checkout.'], img: 'coupons' },
  { emoji: '🎯', tag: 'Plan & forecast', h: 'Plan a money goal in seconds', steps: ['Pick a calculator from the left (retirement, mortgage, college…).', 'Enter your numbers and press “Plan it”.', 'Get a forecast + a Guac-AI strategy with tax tips — then save it.'], img: 'plan' },
  { emoji: '📚', tag: 'Articles', h: 'Learn it, then do it', steps: ['Browse short, plain-English money guides.', 'Read a 2-minute article (compound interest, emergency funds…).', 'Tap “Run the numbers” to jump into the matching calculator.'], img: 'articles' },
  { emoji: '🗓️', tag: 'Bills calendar', h: 'See bills before they hit', steps: ['Add receipts and bank statements as usual.', 'GetGuac detects your recurring subscriptions automatically.', 'They land on a calendar with due dates + an upcoming-bills list.'], img: 'bills' },
  { emoji: '✨', tag: 'Your dashboard', h: 'How it all comes together', steps: ['GuacScore rates how worth-it your spending is.', '“Steals for you” surfaces deals on the things you actually buy.', 'Searches you saved on the Marketplace show up here, watched for you.'], img: 'dashboard' },
]
const featureSlide = (s, i) => `<section class="slide">
  <div class="left">
    <div class="ill">${s.emoji}</div><div class="tag">${s.tag}</div><h2>${s.h}</h2>
    <ol>${s.steps.map((b, k) => `<li><span class="sn">${k + 1}</span><span>${b}</span></li>`).join('')}</ol>
    <div class="page-no">New in GetGuac · ${i + 1} of ${FEATURES.length}</div>
  </div>
  <div class="right"><div class="frame"><div class="bar"><span></span><span></span><span></span></div>${shots[s.img] ? `<img src="${shots[s.img]}"/>` : '<div class="ph">screenshot</div>'}</div></div>
</section>`
const dividerSlide = `<section class="slide title">
  <div class="blob b1"></div><div class="blob b2"></div>
  <div class="av">🥑</div>
  <div class="kick">The tour continues</div>
  <h1>New in <span class="grad">GetGuac</span></h1>
  <p class="lead">Beyond receipts — a marketplace, live coupons, money calculators with Guac-AI, and a bills calendar.</p>
  <div class="pills"><span>🛒 Marketplace</span><span>🎟️ Coupons</span><span>🎯 Calculators</span><span>🗓️ Bills</span></div>
</section>`
const closeSlide = `<section class="slide title">
  <div class="blob b1"></div><div class="blob b2"></div>
  <div class="av">🥑</div><h1 style="margin-top:8px">All of it. <span class="grad">Free.</span></h1>
  <p class="lead">No card, no catch. Your data stays yours.</p><div class="cta">getguac.app</div>
  <p style="color:#94a3b8;font-size:14px;margin-top:14px">Money's wingman. Keep your guac.</p>
</section>`
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:${PW} ${PH};margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0}
body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a}
.slide{width:${PW};height:${PH};page-break-after:always;display:flex;overflow:hidden;position:relative;background:linear-gradient(135deg,#f0fdf4,#ffffff 55%,#ecfccb)}
.left{width:42%;padding:54px 46px;display:flex;flex-direction:column;justify-content:center;position:relative}
.right{width:58%;display:flex;align-items:center;justify-content:center;padding:44px 46px 44px 0}
.ill{font-size:64px;line-height:1;margin-bottom:14px;filter:drop-shadow(0 8px 18px rgba(16,185,129,.25))}
.tag{font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:1.4px;color:#059669;margin-bottom:8px}
h2{font-size:38px;font-weight:900;line-height:1.08;letter-spacing:-.5px;margin-bottom:20px}
ol{list-style:none}li{display:flex;gap:14px;align-items:flex-start;font-size:17px;line-height:1.45;color:#334155;margin-bottom:15px}
.sn{flex:0 0 28px;width:28px;height:28px;border-radius:50%;background:#16a34a;color:#fff;font-weight:900;font-size:14px;display:flex;align-items:center;justify-content:center;margin-top:1px}
.page-no{position:absolute;bottom:26px;left:46px;font-size:12px;font-weight:700;color:#94a3b8}
.frame{width:100%;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(2,44,34,.22);border:1px solid #d1fae5;background:#fff}
.bar{height:32px;background:#f8fafc;border-bottom:1px solid #eef2f7;display:flex;align-items:center;gap:7px;padding:0 14px}
.bar span{width:11px;height:11px;border-radius:50%;background:#e2e8f0}.bar span:nth-child(1){background:#fca5a5}.bar span:nth-child(2){background:#fde68a}.bar span:nth-child(3){background:#86efac}
.frame img{display:block;width:100%}.ph{height:520px;display:flex;align-items:center;justify-content:center;color:#cbd5e1}
.title{flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(135deg,#065f46,#16a34a 58%,#84cc16);color:#fff}
.title .av{width:96px;height:96px;border-radius:28px;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;font-size:58px;margin-bottom:18px;box-shadow:0 14px 40px rgba(0,0,0,.2)}
.title .kick{font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:3px;color:#d9f99d;margin-bottom:12px}
.title h1{font-size:64px;font-weight:900;line-height:1.04;letter-spacing:-1.5px}.title .grad{color:#ecfccb}
.title .lead{font-size:21px;color:#ecfccb;margin-top:16px;max-width:820px}
.pills{display:flex;gap:12px;margin-top:26px}.pills span{background:rgba(255,255,255,.16);border-radius:999px;padding:9px 18px;font-size:15px;font-weight:700}
.cta{margin-top:18px;background:#fff;color:#065f46;font-weight:900;font-size:26px;padding:12px 32px;border-radius:999px}
.blob{position:absolute;border-radius:50%;filter:blur(50px);opacity:.4}.b1{width:360px;height:360px;background:#bbf7d0;top:-90px;right:-60px}.b2{width:320px;height:320px;background:#fef08a;bottom:-90px;left:-70px}
</style></head><body>${dividerSlide}${FEATURES.map(featureSlide).join('')}${closeSlide}</body></html>`

const nf = await browser.newPage()
await nf.setContent(html, { waitUntil: 'networkidle' })
await nf.waitForTimeout(500)
const nfBuf = await nf.pdf({ width: PW, height: PH, printBackground: true })
await nf.locator('.slide').first().screenshot({ path: resolve(OUT, '_combined-divider.png') })
await nf.close()
await browser.close()

// ── 4. Merge: how-it-works pages, then new-feature pages ──
const merged = await PDFDocument.create()
let total = 0
for (const buf of [howBuf, nfBuf]) {
  const src = await PDFDocument.load(buf)
  const pages = await merged.copyPages(src, src.getPageIndices())
  pages.forEach((p) => merged.addPage(p))
  total += pages.length
}
const out = resolve(OUT, 'GetGuac-How-It-Works-Full.pdf')
writeFileSync(out, await merged.save())
console.log('how-it-works pages + new-feature pages =', total, 'total')
console.log('shots:', Object.keys(shots).join(', '))
console.log('PDF:', out)

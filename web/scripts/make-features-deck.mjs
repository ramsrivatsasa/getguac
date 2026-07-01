// "How GetGuac Works" deck → PDF. Captures live screenshots of each feature and
// pairs them with a numbered how-it-works walkthrough. A guided tour, not an
// announcement. Run: node scripts/make-features-deck.mjs
import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', '..', 'marketing-assets', 'qa')
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })
const SITE = 'https://getguac.app'
const EMAIL = 'demo@getguac.app', PASS = 'Guac!Demo2026'

const browser = await chromium.launch()
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

// ── how-it-works slides ──
const slides = [
  { kind: 'title' },
  { kind: 'idea' },
  { emoji: '🛒', tag: 'Marketplace · Deals', h: 'Find the best price on anything', steps: ['Type any product or store in the search bar.', 'See live prices across Walmart, Amazon, Target & more — ranked by discount.', 'Save the search; sign in and GetGuac watches it for price drops.'], img: 'marketplace' },
  { emoji: '🎟️', tag: 'Marketplace · Stores', h: 'Grab a store coupon', steps: ['Open the Stores tab and pick a retailer.', 'Tap “Coupons” on its card.', 'See live promo codes pulled from Google — click through to redeem.'], img: 'stores' },
  { emoji: '🏷️', tag: 'Coupons', h: 'Browse every big-store coupon', steps: ['Open the Coupons page — no account needed.', 'Scroll the biggest stores, each with current codes.', 'Click an offer to open it at the source and use it at checkout.'], img: 'coupons' },
  { emoji: '🎯', tag: 'Plan & forecast', h: 'Plan a money goal in seconds', steps: ['Pick a calculator from the left (retirement, mortgage, college…).', 'Enter your numbers and press “Plan it”.', 'Get a forecast + a Guac-AI strategy with tax tips — then Save it to your account.'], img: 'plan' },
  { emoji: '📚', tag: 'Articles', h: 'Learn it, then do it', steps: ['Browse short, plain-English money guides.', 'Read a 2-minute article (compound interest, emergency funds…).', 'Tap “Run the numbers” to jump into the matching calculator.'], img: 'articles' },
  { emoji: '🗓️', tag: 'Bills calendar', h: 'See bills before they hit', steps: ['Add receipts and bank statements as usual.', 'GetGuac detects your recurring subscriptions automatically.', 'They land on a calendar with due dates + an “upcoming bills” list.'], img: 'bills' },
  { emoji: '✨', tag: 'Your dashboard', h: 'How it all comes together', steps: ['GuacScore rates how worth-it your spending is.', '“Steals for you” surfaces deals on the things you actually buy.', 'Searches you saved on the Marketplace show up here, watched for you.'], img: 'dashboard' },
  { kind: 'close' },
]

const slideHtml = (s, i, n) => {
  if (s.kind === 'title') return `<section class="slide title">
    <div class="blob b1"></div><div class="blob b2"></div>
    <div class="title-grid">
      <div class="title-copy">
        <div class="av">🥑</div>
        <div class="kick">A quick tour</div>
        <h1>How <span class="grad">GetGuac</span> works</h1>
        <p class="lead">Your money's wingman — see where it goes, find better prices, plan the big stuff. Free.</p>
        <div class="pills"><span>🛒 Marketplace</span><span>🎯 Calculators</span><span>🎟️ Coupons</span><span>🗓️ Bills</span></div>
      </div>
      <div class="title-shot">
        <div class="frame"><div class="bar"><span></span><span></span><span></span></div>${shots.dashboard ? `<img src="${shots.dashboard}"/>` : ''}</div>
      </div>
    </div>
  </section>`
  if (s.kind === 'idea') return `<section class="slide title alt">
    <div class="blob b1"></div><div class="blob b2"></div>
    <div class="kick" style="color:#047857">The big idea</div>
    <h1 style="color:#0f172a;font-size:48px">Snap it. See it. <span class="grad2">Keep it.</span></h1>
    <div class="flow">
      <div class="step"><div class="n">1</div><div class="lbl">📸 Snap a receipt</div><div class="d">or forward an e-receipt</div></div>
      <div class="arrow">→</div>
      <div class="step"><div class="n">2</div><div class="lbl">📊 See your money</div><div class="d">GuacScore, reports, fees</div></div>
      <div class="arrow">→</div>
      <div class="step"><div class="n">3</div><div class="lbl">💸 Keep more</div><div class="d">deals, coupons, a plan</div></div>
    </div>
    <p class="lead" style="color:#475569">The rest of this tour shows how each piece works.</p>
  </section>`
  if (s.kind === 'close') return `<section class="slide title">
    <div class="blob b1"></div><div class="blob b2"></div>
    <div class="av">🥑</div>
    <h1 style="margin-top:8px">That's GetGuac.</h1>
    <p class="lead">Start free — no card, no catch. Your data stays yours.</p>
    <div class="cta">getguac.app</div>
    <p style="color:#94a3b8;font-size:14px;margin-top:14px">Money's wingman. Keep your guac.</p>
  </section>`
  return `<section class="slide">
    <div class="left">
      <div class="ill">${s.emoji}</div>
      <div class="tag">${s.tag}</div>
      <h2>${s.h}</h2>
      <ol>${s.steps.map((b, k) => `<li><span class="sn">${k + 1}</span><span>${b}</span></li>`).join('')}</ol>
      <div class="page-no">How it works · ${i} of ${n - 1}</div>
    </div>
    <div class="right">
      <div class="frame">
        <div class="bar"><span></span><span></span><span></span></div>
        ${shots[s.img] ? `<img src="${shots[s.img]}"/>` : `<div class="ph">screenshot</div>`}
      </div>
    </div>
  </section>`
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:297mm 167mm;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0}
body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a}
.slide{width:297mm;height:167mm;page-break-after:always;display:flex;overflow:hidden;position:relative;background:linear-gradient(135deg,#f0fdf4,#ffffff 55%,#ecfccb)}
.left{width:42%;padding:44px 40px;display:flex;flex-direction:column;justify-content:center;position:relative}
.right{width:58%;display:flex;align-items:center;justify-content:center;padding:34px 40px 34px 0}
.ill{font-size:60px;line-height:1;margin-bottom:12px;filter:drop-shadow(0 8px 18px rgba(16,185,129,.25))}
.tag{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1.4px;color:#059669;margin-bottom:8px}
h2{font-size:34px;font-weight:900;line-height:1.08;letter-spacing:-.5px;margin-bottom:18px}
ol{list-style:none}li{display:flex;gap:13px;align-items:flex-start;font-size:16px;line-height:1.42;color:#334155;margin-bottom:13px}
.sn{flex:0 0 26px;width:26px;height:26px;border-radius:50%;background:#16a34a;color:#fff;font-weight:900;font-size:13px;display:flex;align-items:center;justify-content:center;margin-top:1px}
.page-no{position:absolute;bottom:22px;left:40px;font-size:12px;font-weight:700;color:#94a3b8}
.frame{width:100%;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(2,44,34,.22);border:1px solid #d1fae5;background:#fff}
.bar{height:30px;background:#f8fafc;border-bottom:1px solid #eef2f7;display:flex;align-items:center;gap:7px;padding:0 14px}
.bar span{width:11px;height:11px;border-radius:50%;background:#e2e8f0}.bar span:nth-child(1){background:#fca5a5}.bar span:nth-child(2){background:#fde68a}.bar span:nth-child(3){background:#86efac}
.frame img{display:block;width:100%}.ph{height:520px;display:flex;align-items:center;justify-content:center;color:#cbd5e1}
.title{flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(135deg,#065f46,#16a34a 58%,#84cc16);color:#fff}
.title.alt{background:linear-gradient(135deg,#f0fdf4,#ecfccb)}
.title .av{width:92px;height:92px;border-radius:26px;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;font-size:54px;margin-bottom:16px;box-shadow:0 14px 40px rgba(0,0,0,.2)}
.title .kick{font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:3px;color:#d9f99d;margin-bottom:12px}
.title h1{font-size:58px;font-weight:900;line-height:1.04;letter-spacing:-1.5px}.title .grad{color:#ecfccb}.grad2{background:linear-gradient(90deg,#16a34a,#84cc16);-webkit-background-clip:text;background-clip:text;color:transparent}
.title .lead{font-size:20px;color:#ecfccb;margin-top:16px;max-width:780px}.title.alt .lead{color:#475569}
.pills{display:flex;gap:12px;margin-top:24px}.pills span{background:rgba(255,255,255,.16);border-radius:999px;padding:9px 18px;font-size:15px;font-weight:700}
.title-grid{display:flex;align-items:center;gap:46px;width:100%;max-width:1120px;padding:0 60px;text-align:left;position:relative;z-index:1}
.title-copy{flex:1;display:flex;flex-direction:column;align-items:flex-start}
.title-copy h1{font-size:50px}.title-copy .lead{max-width:none;margin-top:14px}.title-copy .pills{flex-wrap:wrap;margin-top:22px}
.title-shot{flex:0 0 44%}
.cta{margin-top:18px;background:#fff;color:#065f46;font-weight:900;font-size:24px;padding:12px 30px;border-radius:999px}
.flow{display:flex;align-items:center;gap:18px;margin:26px 0 8px}.flow .step{background:#fff;border:1px solid #d1fae5;border-radius:18px;padding:18px 22px;box-shadow:0 10px 24px rgba(2,44,34,.08);text-align:center;min-width:190px}
.flow .n{width:30px;height:30px;border-radius:50%;background:#16a34a;color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto 8px}
.flow .lbl{font-weight:900;font-size:18px;color:#0f172a}.flow .d{font-size:13px;color:#64748b;margin-top:3px}.flow .arrow{font-size:28px;color:#16a34a;font-weight:900}
.blob{position:absolute;border-radius:50%;filter:blur(50px);opacity:.4}.b1{width:340px;height:340px;background:#bbf7d0;top:-90px;right:-60px}.b2{width:300px;height:300px;background:#fef08a;bottom:-90px;left:-70px}
</style></head><body>
${slides.map((s) => slideHtml(s, slides.indexOf(s), slides.length)).join('')}
</body></html>`

const b2 = await browser.newPage()
await b2.setContent(html, { waitUntil: 'networkidle' })
await b2.waitForTimeout(500)
const out = resolve(OUT, 'GetGuac-How-It-Works-Deck-v2.pdf')
await b2.pdf({ path: out, width: '297mm', height: '167mm', printBackground: true })
// Page-1 preview PNG so we can eyeball the title slide without a PDF viewer.
await b2.setViewportSize({ width: 1123, height: 631 })
await b2.locator('.slide').first().screenshot({ path: resolve(OUT, '_deck-page1.png') })
await browser.close()
console.log('captured:', Object.keys(shots).join(', '))
console.log('slides:', slides.length, '| PDF:', out)

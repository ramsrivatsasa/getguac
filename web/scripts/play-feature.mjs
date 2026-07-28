// Google Play feature graphic — 1024x500, the banner at the top of the listing.
//
// Its own script because it's the one Play asset with no portrait equivalent:
// at 1024x500 the store-frame composition (headline stacked over a phone) has
// nowhere to go. This is a horizontal split instead — lockup and promise on
// the left, overlapping device screens on the right.
//
// Play also renders this small and crops it in places, so: no text near the
// edges, one short line, and nothing load-bearing in the outer 5%.
//
//   node scripts/play-feature.mjs                → 1024x500 feature graphic
//   SIZE=1200x628 node scripts/play-feature.mjs  → Google Ads landscape
//   SIZE=1200x1200 node scripts/play-feature.mjs → Google Ads square

import { chromium } from 'playwright'
import sharp from 'sharp'
import { readFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(__dirname, '..')
const ICON = resolve(WEB, '..', 'mobile', 'assets', 'icon', 'icon.png')
const OUT = resolve(WEB, 'marketing-assets', 'play-feature')

const [W, H] = (process.env.SIZE || '1024x500').split('x').map(Number)
if (!W || !H) throw new Error('SIZE must look like 1024x500')
const square = H / W > 0.8

const SHOTS_DIR = 'C:/Harward/attachments_ipdone'
const shot = (t) => resolve(SHOTS_DIR, `Simulator Screenshot - iPhone 17 Pro Max - 2026-07-16 at ${t}_iphone.png`)
// Three screens that read at thumbnail size: the score ring, the subscription
// money, the category donut.
const PHONES = [shot('14.00.19'), shot('14.00.11'), shot('14.03.10')]
for (const p of PHONES) if (!existsSync(p)) throw new Error(`missing screen: ${p}`)

const dataUri = (buf, mime = 'image/png') => `data:${mime};base64,${buf.toString('base64')}`
const fileUri = (p) => dataUri(readFileSync(p))

const PHONE_W = Math.round(W * (square ? 0.30 : 0.198))
const phones = await Promise.all(PHONES.map(p =>
  sharp(p).resize({ width: PHONE_W, kernel: 'lanczos3' }).png().toBuffer().then(b => dataUri(b))))

const HEAD = `<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@600;700&display=swap" rel="stylesheet">`

const html = `<!doctype html><html><head>${HEAD}
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: ${W}px; height: ${H}px; overflow: hidden; position: relative;
         background: #ffffff; font-family: 'Plus Jakarta Sans', sans-serif; }
  .wash { position: absolute; right: -14%; top: -30%; width: 86%; height: 190%;
          background: radial-gradient(ellipse at center, rgba(101,163,13,0.16) 0%, rgba(101,163,13,0.05) 46%, rgba(255,255,255,0) 72%); }
  .left { position: absolute; left: ${Math.round(W * 0.062)}px; top: 50%; transform: translateY(-50%);
          width: ${square ? '86%' : '40%'}; ${square ? 'top: 20%; transform: none; text-align: center; left: 7%;' : ''} }
  .brand { display: flex; align-items: center; gap: ${Math.round(W * 0.014)}px; ${square ? 'justify-content: center;' : ''} }
  .brand img { width: ${Math.round(W * 0.052)}px; height: ${Math.round(W * 0.052)}px; border-radius: ${Math.round(W * 0.014)}px; }
  .brand span { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800;
                font-size: ${Math.round(W * 0.038)}px; color: #15281C; letter-spacing: -0.02em; }
  h1 { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800;
       font-size: ${Math.round(W * (square ? 0.062 : 0.047))}px; line-height: 1.06; letter-spacing: -0.035em;
       color: #15281C; margin-top: ${Math.round(W * 0.028)}px; }
  h1 em { font-style: normal; color: #4D7C0F; }
  p { font-size: ${Math.round(W * (square ? 0.026 : 0.0225))}px; color: #56655B; margin-top: ${Math.round(W * 0.018)}px; line-height: 1.45; }

  .phones { position: absolute; ${square
      ? `left: 50%; bottom: -6%; transform: translateX(-50%);`
      : `right: ${Math.round(W * 0.045)}px; top: ${Math.round(H * 0.14)}px;`}
            display: flex; align-items: flex-start; }
  .phones img { width: ${PHONE_W}px; display: block; border-radius: ${Math.round(PHONE_W * 0.085)}px;
                filter: drop-shadow(0 26px 40px rgba(20,40,28,0.28)); }
  /* overlap and fan them so three screens read as one product, not a grid */
  .phones img:nth-child(1) { transform: rotate(-7deg) translateY(${Math.round(H * 0.04)}px); z-index: 1; }
  .phones img:nth-child(2) { margin-left: -${Math.round(PHONE_W * 0.40)}px; z-index: 3; }
  .phones img:nth-child(3) { margin-left: -${Math.round(PHONE_W * 0.40)}px; transform: rotate(7deg) translateY(${Math.round(H * 0.04)}px); z-index: 2; }
</style></head><body>
  <div class="wash"></div>
  <div class="left">
    <div class="brand"><img src="${fileUri(ICON)}"><span>GetGuac</span></div>
    <h1>Every receipt,<br><em>read and scored.</em></h1>
    <p>Refunds you're owed. Subscriptions you forgot. Fees you never saw.</p>
  </div>
  <div class="phones">${phones.map(p => `<img src="${p}">`).join('')}</div>
</body></html>`

mkdirSync(OUT, { recursive: true })
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
await p.setContent(html, { waitUntil: 'networkidle' })
await p.evaluate(() => document.fonts.ready)
await p.waitForTimeout(300)
const name = `feature-${W}x${H}.png`
await sharp(await p.screenshot()).resize(W, H, { fit: 'fill' }).png().toFile(resolve(OUT, name))
await b.close()
console.log('✓', name, '→', resolve(OUT, name))

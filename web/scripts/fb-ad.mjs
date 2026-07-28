// Facebook feed AD creative — one goal, one image, 1080x1350 (4:5).
//
// Why a separate script instead of another PRESET in reel-frames.mjs: that
// layout is authored for 9:16-and-taller, where the phone has ~1000px to run
// before the bottom edge. At 4:5 there is barely half that, so the whole
// composition has to be re-proportioned rather than resized. Everything else —
// the copy, the phone shot, the chip, the brand lockup — is lifted from the
// exact same source as the store frames so the ad and the listing match.
//
//   node scripts/fb-ad.mjs subs            → marketing-assets/fb-ads/subs-1080x1350.png
//   RATIO=1x1 node scripts/fb-ad.mjs subs  → 1080x1080 square variant
//
// 4:5 is the default because it occupies the most feed height Meta allows;
// the square is there for placements that crop it (right column, Marketplace).

import { chromium } from 'playwright'
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(__dirname, '..')
const GOALS = resolve(WEB, 'public', 'home', 'goals')
const STORE = resolve(WEB, 'marketing-assets', 'reel-src-apple')
const ICON = resolve(WEB, '..', 'mobile', 'assets', 'icon', 'icon.png')
const OUT = resolve(WEB, 'marketing-assets', 'fb-ads')

const RATIOS = { '4x5': [1080, 1350], '1x1': [1080, 1080] }
const ratioKey = process.env.RATIO || '4x5'
const ratio = RATIOS[ratioKey]
if (!ratio) throw new Error(`Unknown RATIO. Use: ${Object.keys(RATIOS).join(', ')}`)
const [W, H] = ratio

// Single source of truth for the copy — the same CARDS array the site, the
// store frames and the reels all render from.
const src = readFileSync(resolve(WEB, 'src', 'components', 'GoalsShowcase.jsx'), 'utf8')
const m = src.match(/const CARDS = (\[[\s\S]*?\n\])\n/)
if (!m) throw new Error('Could not find the CARDS array in GoalsShowcase.jsx')
const CARDS = eval(m[1])

const slug = process.argv[2] || 'subs'
const c = CARDS.find(x => x.slug === slug)
if (!c) throw new Error(`No goal with slug "${slug}". Known: ${CARDS.map(x => x.slug).join(', ')}`)

// Same override table as the store frames: prefer the 1170x2532 captures that
// actually contain charts over the 360px list-view webps.
const SCREEN_OVERRIDES = {
  organized: '05-guacanomics', tax: '03-reports', subs: '03-reports',
  fees: '04-guacwizard', 'worth-it': '06-worth-it', receipts: '02-receipts',
  steals: '07-steals', marketplace: '08-marketplace', games: '09-games',
  smashlist: '10-smashlist',
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const dataUri = (buf, mime = 'image/png') => `data:${mime};base64,${buf.toString('base64')}`
const fileUri = (p) => {
  const ext = p.slice(p.lastIndexOf('.') + 1).toLowerCase()
  const mime = ext === 'webp' ? 'image/webp' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
  return dataUri(readFileSync(p), mime)
}

// The phone is smaller here than in the store frames — at 4:5 a 660px device
// leaves no room for the headline to breathe.
const PHONE_W = 500
const PHONE_TOP = H === 1080 ? 545 : 615

async function phoneUri() {
  const override = SCREEN_OVERRIDES[slug]
  const file = override
    ? resolve(STORE, `${override}_iphone.png`)
    : resolve(GOALS, `phone-${slug}.webp`)
  const img = sharp(file).resize({ width: PHONE_W, kernel: 'lanczos3' })
  if (!override) img.sharpen({ sigma: 0.8 })
  return dataUri(await img.png().toBuffer())
}

// Headlines step down rather than wrap to four lines and shove the phone off.
const titleSize = t => (t.length > 36 ? 54 : t.length > 28 ? 60 : 66)

const HEAD = `<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">`

function html(phoneSrc) {
  return `<!doctype html><html><head>${HEAD}
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${W}px; height: ${H}px; overflow: hidden; position: relative;
    font-family: 'Plus Jakarta Sans', sans-serif; background: #ffffff;
  }
  .glow {
    position: absolute; left: 50%; top: ${PHONE_TOP - 260}px; transform: translateX(-50%);
    width: 1000px; height: 1000px; border-radius: 50%;
    background: radial-gradient(circle, rgba(101,163,13,0.20) 0%, rgba(101,163,13,0.08) 42%, rgba(255,255,255,0) 70%);
  }
  .top { position: absolute; left: 0; right: 0; top: 52px; padding: 0 68px; text-align: center; }
  .brand { display: flex; align-items: center; justify-content: center; gap: 13px; }
  .brand img { width: 50px; height: 50px; border-radius: 13px; }
  .brand span { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 33px; color: #15281C; letter-spacing: -0.02em; }
  .emoji { font-size: 56px; line-height: 1; margin: 22px 0 12px; }
  h1 {
    font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800;
    font-size: ${titleSize(c.goal)}px; line-height: 1.05; letter-spacing: -0.035em; color: #15281C;
  }
  .blurb { font-size: 25px; line-height: 1.45; color: #56655B; margin: 18px auto 0; max-width: 810px; }
  .cta {
    display: inline-block; margin-top: 24px; background: #65A30D; color: #fff;
    font-weight: 700; font-size: 26px; padding: 17px 36px; border-radius: 999px;
    box-shadow: 0 20px 40px -16px rgba(101,163,13,0.65);
  }
  .phone { position: absolute; left: 50%; top: ${PHONE_TOP}px; transform: translateX(-50%); width: ${PHONE_W}px; }
  .phone img { width: ${PHONE_W}px; display: block; filter: drop-shadow(0 32px 50px rgba(20,40,28,0.32)); }

  /* one thumb-stopping figure, readable before the app screen itself is */
  .chip {
    position: absolute; left: 40px; top: ${PHONE_TOP + 235}px; width: 320px;
    background: #fff; border-radius: 24px; padding: 20px 22px;
    border: 3px solid #65A30D; box-shadow: 0 24px 48px -18px rgba(101,163,13,0.5);
  }
  .chip .h { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 8px; }
  .chip .h b { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 19px; color: #15281C; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chip .h i { font-style: normal; font-size: 14px; color: #8A988E; white-space: nowrap; flex: 0 0 auto; }
  .chip .big { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 42px; letter-spacing: -0.02em; color: #15281C; line-height: 1.08; }
  .chip .sub { font-size: 16px; color: #65A30D; font-weight: 700; margin-top: 5px; line-height: 1.35; }

  /* store availability, bottom-right — the ad's only "where do I get it" cue */
  .avail {
    position: absolute; right: 44px; bottom: 40px; text-align: right;
    font-size: 20px; font-weight: 700; color: #4D7C0F;
  }
  .avail span { display: block; font-size: 17px; font-weight: 600; color: #8A988E; margin-top: 5px; }
</style></head><body>
  <div class="glow"></div>
  <div class="top">
    <div class="brand"><img src="${fileUri(ICON)}"><span>GetGuac</span></div>
    <div class="emoji">${esc(c.e)}</div>
    <h1>${esc(c.goal)}</h1>
    <p class="blurb">${esc(c.blurb)}</p>
    <div class="cta">${esc(c.cta)} &rarr;</div>
  </div>
  <div class="phone"><img src="${phoneSrc}"></div>
  <div class="chip">
    <div class="h"><b>${esc(c.e)} ${esc(c.name)}</b><i>${esc(c.tag)}</i></div>
    <div class="big">${esc(c.big)}</div>
    <div class="sub">${esc(c.sub)}</div>
  </div>
  <div class="avail">Free on iOS &amp; Android<span>getguac.app</span></div>
</body></html>`
}

mkdirSync(OUT, { recursive: true })
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
await p.setContent(html(await phoneUri()), { waitUntil: 'networkidle' })
await p.evaluate(() => document.fonts.ready)
await p.waitForTimeout(300)
const shot = await p.screenshot()
const name = `${slug}-${W}x${H}.png`
await sharp(shot).resize(W, H, { fit: 'fill' }).png().toFile(resolve(OUT, name))
await b.close()
console.log('✓', name, '—', c.goal, '\n→', resolve(OUT, name))

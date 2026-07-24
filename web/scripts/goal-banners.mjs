#!/usr/bin/env node
// =============================================================================
// One hero banner per "I want to…" goal, for social posts.
// =============================================================================
// Combines the two things the homepage shows separately:
//   1. the goal's mockup card (the strip you tap), and
//   2. its showcase panel — headline, blurb, and the REAL web + phone screens.
//
// Card data is READ OUT OF the component so the banners can never drift from
// the site copy. Screens come from public/home/goals/<web|phone>-<slug>.webp.
//
// Output: marketing-assets/goal-banners/<slug>.png at 1500x630, on plain white.
//
// Usage:
//   node web/scripts/goal-banners.mjs            # all goals
//   node web/scripts/goal-banners.mjs receipts   # just one (sample)
// =============================================================================

import { chromium } from 'playwright'
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(__dirname, '..')
const OUT = resolve(WEB, 'marketing-assets', 'goal-banners')
const GOALS = resolve(WEB, 'public', 'home', 'goals')
const ICON = resolve(WEB, '..', 'mobile', 'assets', 'icon', 'icon.png')

const W = 1500, H = 630

// Right-hand strip: the mockup card, then the web + phone cluster arranged
// exactly as the homepage showcase panel does it — phone overlapping the
// bottom-right of the web screen, not sitting beside it.
const LEFT_COL = 440
const PAD_L = 4, PAD_R = 56, GAP = 26
const CARD_W = 242
const CLUSTER_W = W - LEFT_COL - PAD_L - PAD_R - GAP - CARD_W
// The showcase panel renders the phone at 148px against a ~575px web screen.
const PHONE_W = Math.round(CLUSTER_W * (148 / 575))

// --- Single source of truth: lift CARDS straight out of the component -------
const src = readFileSync(resolve(WEB, 'src', 'components', 'GoalsShowcase.jsx'), 'utf8')
const m = src.match(/const CARDS = (\[[\s\S]*?\n\])\n/)
if (!m) throw new Error('Could not find the CARDS array in GoalsShowcase.jsx')
const CARDS = eval(m[1])

const only = process.argv[2]
const targets = only ? CARDS.filter(c => c.slug === only) : CARDS
if (!targets.length) throw new Error(`No goal with slug "${only}". Known: ${CARDS.map(c => c.slug).join(', ')}`)

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// setContent() serves the page from an about:blank origin, which refuses
// file:// subresources — so every image goes in as a data URI.
const dataUri = (p) => {
  const ext = p.slice(p.lastIndexOf('.') + 1).toLowerCase()
  const mime = ext === 'webp' ? 'image/webp' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
  return `data:${mime};base64,${readFileSync(p).toString('base64')}`
}

// Long headlines need to step down a size or they wrap to three lines.
const titleSize = t => (t.length > 34 ? 34 : t.length > 26 ? 38 : 42)

function html(c) {
  const rows = c.rows.map(r => `
    <div class="row ${r.neg ? 'neg' : ''}">
      <span class="ri">${esc(r.i)}</span>
      <div class="rt"><b>${esc(r.t)}</b><i>${esc(r.s)}</i></div>
      <span class="rv">${esc(r.r)}</span>
    </div>`).join('')

  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${W}px; height: ${H}px; overflow: hidden;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: #ffffff;
  }
  .stage { display: grid; grid-template-columns: ${LEFT_COL}px 1fr; height: 100%; align-items: center; }

  /* ---- left: the showcase copy ---- */
  .left { padding: 48px 0 48px 58px; }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 26px; }
  .brand img { width: 34px; height: 34px; border-radius: 9px; }
  .brand span { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 20px; color: #15281C; letter-spacing: -0.02em; }
  .emoji { font-size: 34px; line-height: 1; margin-bottom: 12px; }
  h1 {
    font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800;
    font-size: ${titleSize(c.goal)}px; line-height: 1.08; letter-spacing: -0.03em;
    color: #15281C; margin-bottom: 14px;
  }
  .blurb { font-size: 16.5px; line-height: 1.55; color: #56655B; margin-bottom: 22px; }
  .cta {
    display: inline-block; background: #65A30D; color: #fff; font-weight: 700;
    font-size: 15px; padding: 12px 22px; border-radius: 999px;
    box-shadow: 0 10px 24px -10px rgba(101,163,13,0.6);
  }
  .foot { margin-top: 26px; font-size: 13.5px; font-weight: 700; color: #4D7C0F; }
  .foot span { color: #8A988E; font-weight: 600; }

  /* ---- right: mockup card + the web/phone cluster ---- */
  /* Widths are explicit: leaving the web screen on flex let the grid track
     keep its intrinsic 900px and pushed the phone off-canvas. */
  .right { display: flex; align-items: center; gap: ${GAP}px; height: 100%; padding: 0 ${PAD_R}px 0 ${PAD_L}px; }
  .screens { flex: 0 0 ${CLUSTER_W}px; width: ${CLUSTER_W}px; position: relative; }
  .web {
    width: 100%; display: block;
    border-radius: 16px; border: 1px solid rgba(20,83,45,0.12);
    box-shadow: 0 20px 50px -24px rgba(20,40,28,0.4);
  }
  .phone {
    position: absolute; right: -6px; bottom: 0; width: ${PHONE_W}px; display: block;
    filter: drop-shadow(0 22px 34px rgba(20,40,28,0.4));
  }
  /* The tapped card — the piece the homepage shows in the strip above. */
  .card {
    flex: 0 0 ${CARD_W}px; width: ${CARD_W}px; align-self: center;
    background: #fff; border-radius: 22px; padding: 15px;
    border: 2px solid #65A30D;
    box-shadow: 0 22px 48px -22px rgba(101,163,13,0.42);
  }
  /* gap + nowrap: the longest pairing ("🔁 Subscriptions" / "last 12 months")
     collided at space-between alone. */
  .chead { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 9px; padding: 0 2px; }
  .chead b { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 14px; color: #15281C; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chead i { font-style: normal; font-size: 10px; color: #8A988E; white-space: nowrap; flex: 0 0 auto; }
  .cbig { text-align: center; margin: 4px 0 11px; }
  .cbig b { display: block; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 28px; letter-spacing: -0.02em; color: #15281C; line-height: 1.1; }
  .cbig i { display: block; font-style: normal; font-size: 11.5px; color: #65A30D; font-weight: 700; margin-top: 3px; }
  .rows { display: flex; flex-direction: column; gap: 6px; }
  .row { display: flex; align-items: center; gap: 8px; background: #F7FAF2; border-radius: 11px; padding: 7px 10px; }
  .row.neg { background: #FBF3EC; }
  .ri { font-size: 14px; }
  .rt { flex: 1; min-width: 0; }
  .rt b { display: block; font-weight: 700; font-size: 12px; color: #16241C; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rt i { display: block; font-style: normal; font-size: 10px; color: #8A988E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rv { font-weight: 800; font-size: 12px; color: #16241C; white-space: nowrap; }
  .row.neg .rv { color: #C2410C; }
</style></head><body>
  <div class="stage">
    <div class="left">
      <div class="brand"><img src="${dataUri(ICON)}"><span>GetGuac</span></div>
      <div class="emoji">${esc(c.e)}</div>
      <h1>${esc(c.goal)}</h1>
      <p class="blurb">${esc(c.blurb)}</p>
      <div class="cta">${esc(c.cta)} →</div>
      <div class="foot">getguac.app <span>· Free on iOS, Android &amp; web</span></div>
    </div>
    <div class="right">
      <div class="card">
        <div class="chead"><b>${esc(c.e)} ${esc(c.name)}</b><i>${esc(c.tag)}</i></div>
        <div class="cbig"><b>${esc(c.big)}</b><i>${esc(c.sub)}</i></div>
        <div class="rows">${rows}</div>
      </div>
      <div class="screens">
        <img class="web" src="${dataUri(resolve(GOALS, `web-${c.slug}.webp`))}">
        <img class="phone" src="${dataUri(resolve(GOALS, `phone-${c.slug}.webp`))}">
      </div>
    </div>
  </div>
</body></html>`
}

mkdirSync(OUT, { recursive: true })
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 })

for (const c of targets) {
  await p.setContent(html(c), { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(300)
  const shot = await p.screenshot({ clip: { x: 0, y: 0, width: W, height: H } })
  await sharp(shot).resize(W, H).png().toFile(resolve(OUT, `${c.slug}.png`))
  console.log('✓', `${c.slug}.png`, '—', c.goal)
}

await b.close()
console.log(`\n${targets.length} banner(s) →`, OUT)

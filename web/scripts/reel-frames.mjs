#!/usr/bin/env node
// =============================================================================
// Vertical (9:16) Reel frames — the mobile-app cut of the goal banners.
// =============================================================================
// Same copy, same brand, same source screens as goal-banners.mjs, but composed
// portrait at 1080x1920 with the PHONE as the hero (no web screen), ready to be
// stitched into a Facebook / Instagram Reel.
//
// Layout respects Reel safe areas: everything that must be read sits between
// y=220 and y=1500 — Facebook's own UI covers the top ~220px and bottom ~420px.
// The phone deliberately runs off the bottom edge, so the clipped part is the
// part the app chrome hides anyway.
//
// Card data is READ OUT OF GoalsShowcase.jsx so the frames can never drift from
// the site copy. Screens come from public/home/goals/phone-<slug>.webp, and are
// upscaled with sharp (lanczos + mild sharpen) BEFORE the browser sees them —
// letting Chromium stretch a 360px webp to 660px looks noticeably mushier.
//
// Output: marketing-assets/reel-1080x1920/<NN>-<slug>.png (+ 00-intro, 99-outro)
//
// Usage:
//   node web/scripts/reel-frames.mjs            # intro + 18 goals + outro
//   node web/scripts/reel-frames.mjs receipts   # just one (sample)
// =============================================================================

import { chromium } from 'playwright'
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(__dirname, '..')
const GOALS = resolve(WEB, 'public', 'home', 'goals')
const ICON = resolve(WEB, '..', 'mobile', 'assets', 'icon', 'icon.png')

// Presets. The layout is authored once at 1080 CSS px wide; taller targets just
// give the phone more room to run before the bottom edge cuts it, and a
// fractional deviceScaleFactor lands the export on the exact store pixel size.
// That's why App Store output isn't a resize of the Reel — 9:16 and 9:19.5 crop
// differently, so each is composed at its own height.
// Apple accepts only exact pixel sizes, and which one it accepts depends on the
// display-size slot App Store Connect shows you. 1290x2796 fits the 6.7"/6.9"
// slots and is REJECTED by a 6.5" slot, so every accepted iPhone size is built
// and you upload whichever matches the tab in front of you.
const size = (dir, w, h) => ({ dir, out: [w, h], dsf: w / 1080, cssH: Math.round(h / (w / 1080)) })
const PRESETS = {
  reel:    size('reel-1080x1920',  1080, 1920),   // Reels / Stories / Play phone
  apple:   size('store-1290x2796', 1290, 2796),   // iPhone 6.9" or 6.7"
  apple69: size('store-1320x2868', 1320, 2868),   // iPhone 6.9" (newest)
  apple65: size('store-1242x2688', 1242, 2688),   // iPhone 6.5"
  apple55: size('store-1242x2208', 1242, 2208),   // iPhone 5.5" (legacy slot)
}
const preset = PRESETS[process.env.PRESET || 'reel']
if (!preset) throw new Error(`Unknown PRESET. Use: ${Object.keys(PRESETS).join(', ')}`)

const OUT = resolve(WEB, 'marketing-assets', preset.dir)
const W = 1080, H = preset.cssH
const PHONE_W = 660          // phone body width in the final frame
const PHONE_TOP = 900        // y of the phone's top edge — it runs off the bottom

// --- Single source of truth: lift CARDS straight out of the component -------
const src = readFileSync(resolve(WEB, 'src', 'components', 'GoalsShowcase.jsx'), 'utf8')
const m = src.match(/const CARDS = (\[[\s\S]*?\n\])\n/)
if (!m) throw new Error('Could not find the CARDS array in GoalsShowcase.jsx')
const CARDS = eval(m[1])

// --- Rings, only where a real proportion exists -----------------------------
// A ring means "x out of y". Drawing one around "$2,291" or "15 items" would be
// inventing a denominator, so these three are the whole list — the two /100
// scores the app actually computes, plus the 5-star Worth-It average. Geometry
// and colours are the product ring from src/components/GuacoScoreCard.jsx.
//
// Values MUST match the screenshot sitting behind the callout. The first cut
// used the homepage's illustrative 74/92 against screens that read 75/88, so
// each frame argued with itself.
const RINGS = {
  organized: { value: 74,  max: 100, show: '74',   name: 'GuacScore',  sub: 'Steady Guac' },
  fees:      { value: 92,  max: 100, show: '92',   name: 'GuacWizard', sub: 'Wizard score' },
  'worth-it':{ value: 4.4, max: 5,   show: '4.4★', name: 'Worth It?',  sub: 'avg of 26 rated' },
}
const RING_R = 56, RING_STROKE = 9
const RING_C = 2 * Math.PI * RING_R
const RING_SVG = (RING_R + RING_STROKE) * 2 + 4

function ringCard(r) {
  const offset = RING_C * (1 - r.value / r.max)
  return `<div class="ringcard">
    <div class="ring">
      <svg viewBox="0 0 ${RING_SVG} ${RING_SVG}">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#16a34a"/><stop offset="0.55" stop-color="#a8c414"/><stop offset="1" stop-color="#f59e0b"/>
          </linearGradient>
        </defs>
        <circle cx="${RING_SVG / 2}" cy="${RING_SVG / 2}" r="${RING_R}" fill="white"/>
        <circle cx="${RING_SVG / 2}" cy="${RING_SVG / 2}" r="${RING_R}" fill="none" stroke="#e5e7eb" stroke-width="${RING_STROKE}"/>
        <circle cx="${RING_SVG / 2}" cy="${RING_SVG / 2}" r="${RING_R}" fill="none" stroke="url(#ringGrad)"
          stroke-width="${RING_STROKE}" stroke-linecap="round" stroke-dasharray="${RING_C}" stroke-dashoffset="${offset}"
          transform="rotate(-90 ${RING_SVG / 2} ${RING_SVG / 2})"/>
      </svg>
      <span class="rv">${esc(r.show)}</span>
    </div>
    <div class="rmeta"><b>${esc(r.name)}</b><i>${esc(r.sub)}</i></div>
  </div>`
}

const only = process.argv[2]
const targets = only ? CARDS.filter(c => c.slug === only) : CARDS
if (!targets.length) throw new Error(`No goal with slug "${only}". Known: ${CARDS.map(c => c.slug).join(', ')}`)

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// setContent() serves from an about:blank origin, which refuses file://
// subresources — so every image goes in as a data URI.
const dataUri = (buf, mime = 'image/png') => `data:${mime};base64,${buf.toString('base64')}`
const fileUri = (p) => {
  const ext = p.slice(p.lastIndexOf('.') + 1).toLowerCase()
  const mime = ext === 'webp' ? 'image/webp' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
  return dataUri(readFileSync(p), mime)
}

// --- Chart-rich screens, where we have one --------------------------------
// public/home/goals/phone-*.webp are only 360px wide and mostly list views.
// marketing-assets/screens/phone/* are the 1170x2532 captures behind the store
// listings and include the surfaces with actual graphics — the category donut,
// the GuacScore ring, the Wizard gauge. Prefer those; fall back per-goal.
//
// ⚠️ The two sets are DIFFERENT UI: these have the dark-green top bar (web app
// on a phone), the webp set has the white bar + bottom tab row (native app).
// Frames using an override therefore don't visually match the ones that don't.
const STORE = resolve(WEB, 'marketing-assets', 'reel-src-apple')
const SCREEN_OVERRIDES = {
  organized:   '05-guacanomics',  // GuacScore ring, 74/100 "Steady Guac"
  tax:         '03-reports',      // category donut, $1,839 centre
  subs:        '03-reports',
  fees:        '04-guacwizard',   // wizard gauge, 92/100
  'worth-it':  '06-worth-it',     // spend-by-rating donut, $1,172
  receipts:    '02-receipts',
  steals:      '07-steals',
  marketplace: '08-marketplace',
  games:       '09-games',
  smashlist:   '10-smashlist',
}

// The source phone shots are 360px wide; resample them to the exact display
// width here rather than letting the browser do it.
async function phoneUri(slug) {
  const override = SCREEN_OVERRIDES[slug]
  if (override) {
    const buf = await sharp(resolve(STORE, `${override}_iphone.png`))
      .resize({ width: PHONE_W, kernel: 'lanczos3' })
      .png()
      .toBuffer()
    return dataUri(buf)
  }
  const buf = await sharp(resolve(GOALS, `phone-${slug}.webp`))
    .resize({ width: PHONE_W, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.8 })
    .png()
    .toBuffer()
  return dataUri(buf)
}

// Long goals need to step down or they wrap to four lines.
const titleSize = t => (t.length > 36 ? 68 : t.length > 28 ? 76 : 84)

const HEAD = `<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">`

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${W}px; height: ${H}px; overflow: hidden; position: relative;
    font-family: 'Plus Jakarta Sans', sans-serif; background: #ffffff;
  }
  /* soft lime bloom behind the device so the white frame isn't flat */
  .glow {
    position: absolute; left: 50%; top: ${PHONE_TOP - 180}px; transform: translateX(-50%);
    width: 1120px; height: 1120px; border-radius: 50%;
    background: radial-gradient(circle, rgba(101,163,13,0.18) 0%, rgba(101,163,13,0.07) 42%, rgba(255,255,255,0) 70%);
  }
  .brand { display: flex; align-items: center; justify-content: center; gap: 16px; }
  .brand img { width: 62px; height: 62px; border-radius: 16px; }
  .brand span { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 40px; color: #15281C; letter-spacing: -0.02em; }
`

function goalHtml(c, phoneSrc) {
  return `<!doctype html><html><head>${HEAD}
<style>
  ${BASE_CSS}
  .top { position: absolute; left: 0; right: 0; top: 232px; padding: 0 72px; text-align: center; }
  .emoji { font-size: 74px; line-height: 1; margin: 34px 0 18px; }
  h1 {
    font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800;
    font-size: ${titleSize(c.goal)}px; line-height: 1.06; letter-spacing: -0.035em;
    color: #15281C;
  }
  .blurb { font-size: 30px; line-height: 1.5; color: #56655B; margin: 24px auto 0; max-width: 830px; }
  .cta {
    display: inline-block; margin-top: 34px; background: #65A30D; color: #fff;
    font-weight: 700; font-size: 30px; padding: 22px 44px; border-radius: 999px;
    box-shadow: 0 22px 44px -18px rgba(101,163,13,0.65);
  }

  /* the device: hero of the frame, running off the bottom edge */
  .phone { position: absolute; left: 50%; top: ${PHONE_TOP}px; transform: translateX(-50%); width: ${PHONE_W}px; }
  .phone img { width: ${PHONE_W}px; display: block; filter: drop-shadow(0 40px 60px rgba(20,40,28,0.34)); }

  /* the goal's headline number, lifted off the mockup card so the frame has
     one thumb-stopping figure even before the app screen is read. Sits low
     enough to clear the screen's own title bar, which it otherwise covered. */
  .chip {
    position: absolute; left: 40px; top: ${PHONE_TOP + 340}px; width: 322px;
    background: #fff; border-radius: 26px; padding: 22px 24px;
    border: 3px solid #65A30D; box-shadow: 0 26px 54px -20px rgba(101,163,13,0.5);
  }
  .chip .h { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 10px; }
  .chip .h b { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 22px; color: #15281C; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chip .h i { font-style: normal; font-size: 15px; color: #8A988E; white-space: nowrap; flex: 0 0 auto; }
  .chip .big { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 46px; letter-spacing: -0.02em; color: #15281C; line-height: 1.08; }
  .chip .sub { font-size: 17px; color: #65A30D; font-weight: 700; margin-top: 6px; line-height: 1.35; }

  /* ring variant — same slot, but the number sits inside the product gauge */
  .ringcard {
    position: absolute; left: 40px; top: ${PHONE_TOP + 300}px; width: 340px;
    display: flex; align-items: center; gap: 20px;
    background: #fff; border-radius: 28px; padding: 22px 26px;
    border: 3px solid #65A30D; box-shadow: 0 26px 54px -20px rgba(101,163,13,0.5);
  }
  .ring { position: relative; width: 132px; height: 132px; flex: 0 0 132px; }
  .ring svg { width: 100%; height: 100%; display: block; }
  .ring .rv {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 40px;
    letter-spacing: -0.03em; color: #15281C;
  }
  .rmeta { min-width: 0; }
  .rmeta b { display: block; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 24px; color: #15281C; line-height: 1.15; }
  .rmeta i { display: block; font-style: normal; font-size: 17px; font-weight: 700; color: #65A30D; margin-top: 6px; line-height: 1.3; }
</style></head><body>
  <div class="glow"></div>
  <div class="top">
    <div class="brand"><img src="${fileUri(ICON)}"><span>GetGuac</span></div>
    <div class="emoji">${esc(c.e)}</div>
    <h1>${esc(c.goal)}</h1>
    <p class="blurb">${esc(c.blurb)}</p>
    <div class="cta">${esc(c.cta)} →</div>
  </div>
  <div class="phone"><img src="${phoneSrc}"></div>
  ${RINGS[c.slug] ? ringCard(RINGS[c.slug]) : `<div class="chip">
    <div class="h"><b>${esc(c.e)} ${esc(c.name)}</b><i>${esc(c.tag)}</i></div>
    <div class="big">${esc(c.big)}</div>
    <div class="sub">${esc(c.sub)}</div>
  </div>`}
</body></html>`
}

function introHtml(phoneSrc) {
  return `<!doctype html><html><head>${HEAD}
<style>
  ${BASE_CSS}
  .top { position: absolute; left: 0; right: 0; top: 262px; padding: 0 72px; text-align: center; }
  h1 {
    font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800;
    font-size: 96px; line-height: 1.02; letter-spacing: -0.04em; color: #15281C; margin-top: 44px;
  }
  h1 em { font-style: normal; color: #65A30D; }
  .blurb { font-size: 32px; line-height: 1.5; color: #56655B; margin: 28px auto 0; max-width: 800px; }
  .phone { position: absolute; left: 50%; top: 940px; transform: translateX(-50%); width: ${PHONE_W}px; }
  .phone img { width: ${PHONE_W}px; display: block; filter: drop-shadow(0 40px 60px rgba(20,40,28,0.34)); }
</style></head><body>
  <div class="glow"></div>
  <div class="top">
    <div class="brand"><img src="${fileUri(ICON)}"><span>GetGuac</span></div>
    <h1>Your money&rsquo;s<br><em>wingman.</em></h1>
    <p class="blurb">Reads your receipts, scores every dollar, and keeps your guac.</p>
  </div>
  <div class="phone"><img src="${phoneSrc}"></div>
</body></html>`
}

function outroHtml() {
  return `<!doctype html><html><head>${HEAD}
<style>
  ${BASE_CSS}
  .glow { top: 420px; }
  .wrap { position: absolute; left: 0; right: 0; top: 420px; padding: 0 78px; text-align: center; }
  .brand img { width: 108px; height: 108px; border-radius: 28px; }
  .brand span { font-size: 62px; }
  h1 {
    font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800;
    font-size: 84px; line-height: 1.05; letter-spacing: -0.035em; color: #15281C; margin-top: 60px;
  }
  .blurb { font-size: 32px; line-height: 1.5; color: #56655B; margin: 30px auto 0; max-width: 800px; }
  .cta {
    display: inline-block; margin-top: 52px; background: #65A30D; color: #fff;
    font-weight: 800; font-size: 38px; padding: 28px 62px; border-radius: 999px;
    box-shadow: 0 26px 52px -18px rgba(101,163,13,0.65);
  }
  .stores { margin-top: 40px; font-size: 30px; font-weight: 700; color: #4D7C0F; }
  .stores span { display: block; margin-top: 12px; font-size: 25px; font-weight: 600; color: #8A988E; }
</style></head><body>
  <div class="glow"></div>
  <div class="wrap">
    <div class="brand"><img src="${fileUri(ICON)}"><span>GetGuac</span></div>
    <h1>Start keeping<br>your guac.</h1>
    <p class="blurb">Free to start. No card required. Your data stays yours.</p>
    <div class="cta">getguac.app</div>
    <div class="stores">Free on iOS, Android &amp; web<span>Snap a receipt in under a minute</span></div>
  </div>
</body></html>`
}

mkdirSync(OUT, { recursive: true })
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: preset.dsf })

async function shoot(html, name, label) {
  await p.setContent(html, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(300)
  const shot = await p.screenshot()
  // fractional dsf can land a pixel off; force the exact store dimensions
  await sharp(shot).resize(preset.out[0], preset.out[1], { fit: 'fill' }).png().toFile(resolve(OUT, name))
  console.log('✓', name, '—', label)
}

if (!only) await shoot(introHtml(await phoneUri('organized')), '00-intro.png', "Your money's wingman")

let n = 0
for (const c of targets) {
  n = CARDS.indexOf(c) + 1
  const nn = String(n).padStart(2, '0')
  await shoot(goalHtml(c, await phoneUri(c.slug)), `${nn}-${c.slug}.png`, c.goal)
}

if (!only) await shoot(outroHtml(), '99-outro.png', 'Start keeping your guac')

await b.close()
console.log(`\n${targets.length}${only ? '' : ' + 2'} frame(s) →`, OUT)

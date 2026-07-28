// Brand frames — the YNAB-style listing look.
//
// One saturated brand panel, bold white sans headline on top, real app screen
// in a device below, and a hand-drawn circle on the key word. Unlike the
// Monarch-style editorial-frames.mjs this keeps Bricolage, so the typography
// lock holds — YNAB's own frames are sans too.
//
// Doubles as the still-frame source for the App Preview video: each scene of
// the video is one of these frames with the phone screen swapped for live
// device footage, so the video and the screenshots stay visually identical.
//
//   PRESET=apple65 node scripts/brand-frames.mjs           → every frame
//   PRESET=apple65 node scripts/brand-frames.mjs subs      → one
//   PRESET=fb45    node scripts/brand-frames.mjs subs      → the FB feed ad

import { chromium } from 'playwright'
import sharp from 'sharp'
import { readFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(__dirname, '..')
const GOALS = resolve(WEB, 'public', 'home', 'goals')
const STORE = resolve(WEB, 'marketing-assets', 'reel-src-apple')

const size = (dir, w, h) => ({ dir, out: [w, h], dsf: w / 1080, cssH: Math.round(h / (w / 1080)) })
const PRESETS = {
  reel:    size('br-reel-1080x1920',  1080, 1920),
  apple69: size('br-store-1320x2868', 1320, 2868),
  apple:   size('br-store-1290x2796', 1290, 2796),
  apple65: size('br-store-1242x2688', 1242, 2688),
  apple55: size('br-store-1242x2208', 1242, 2208),
  fb45:    size('br-fb-1080x1350',    1080, 1350),
  fb11:    size('br-fb-1080x1080',    1080, 1080),
}
const preset = PRESETS[process.env.PRESET || 'apple65']
if (!preset) throw new Error(`Unknown PRESET. Use: ${Object.keys(PRESETS).join(', ')}`)

const OUT = resolve(WEB, 'marketing-assets', preset.dir)
const W = 1080, H = preset.cssH

const src = readFileSync(resolve(WEB, 'src', 'components', 'GoalsShowcase.jsx'), 'utf8')
const m = src.match(/const CARDS = (\[[\s\S]*?\n\])\n/)
if (!m) throw new Error('Could not find the CARDS array in GoalsShowcase.jsx')
const CARDS = eval(m[1])

const only = process.argv[2]
const wanted = only ? CARDS.filter(c => c.slug === only) : CARDS
if (!wanted.length) throw new Error(`No goal with slug "${only}". Known: ${CARDS.map(c => c.slug).join(', ')}`)

// The one word each headline gets the hand-drawn circle on. Same trick YNAB
// uses to give an otherwise plain headline a focal point.
const CIRCLE = {
  'meet-guac-ai': 'brain', organized: 'organized', receipts: 'receipt',
  bank: 'hide', subs: 'subscriptions', fees: 'fees', 'worth-it': 'worth',
  returns: 'refunds', smashlist: 'family', predictions: 'run out',
  steals: 'less', marketplace: 'coupons', stash: 'everything',
  'car-miles': 'miles', tax: 'ready', bills: 'before', guacmoney: 'rewards',
  'guac-ai': 'anything', games: 'fun',
}

// Real iOS simulator captures (2026-07-16, test-ads stripped). Preferred over
// everything else for three reasons: they're the NATIVE app so an iOS listing
// shows iOS UI, they're all the same chrome so the set doesn't look like two
// apps, and they're populated — the older webp/reel sources are empty states
// for several screens. Take the `_iphone`-suffixed siblings — those are the
// device-framed copies, so the screen sits in a real bezel instead of floating
// as a bare rounded rectangle.
const SHOTS_DIR = 'C:/Harward/attachments_ipdone'
const shot = (t) => `Simulator Screenshot - iPhone 17 Pro Max - 2026-07-16 at ${t}_iphone.png`
const SHOTS = {
  organized:  shot('14.00.19'),  // Guacanomics — GuacScore ring, spend tiles
  subs:       shot('14.00.11'),  // dashboard, "$111.14/mo across 7 subscriptions" expanded
  fees:       shot('14.00.27'),  // GuacWizard 92/100 + insight cards
  'worth-it': shot('14.00.48'),  // Worth It? — spend-by-rating donut
  returns:    shot('14.02.36'),  // Returns — 3 open windows with amounts
  steals:     shot('14.01.38'),  // Steals — saved searches + live deals
  stash:      shot('14.01.54'),  // Stash — owned items with prices
  'car-miles': shot('14.02.05'), // Car Miles — logged trips
  guacmoney:  shot('14.01.44'),  // Rewards
  tax:        shot('14.03.21'),  // Reports — business / charity / sales tax
  'guac-ai':  shot('14.04.37'),  // Guac AI chat with a real answer
  games:      shot('14.05.18'),  // Games / Splurge Slicer
}

// Older sources, used only where SHOTS has no entry.
const SCREEN_OVERRIDES = {
  receipts: '02-receipts', marketplace: '08-marketplace', smashlist: '10-smashlist',
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const dataUri = (buf, mime = 'image/png') => `data:${mime};base64,${buf.toString('base64')}`

// Not every card has a phone screen. `meet-guac-ai` is the React-rendered Guac
// AI banner on the site, not a screenshot, so there's no phone-*.webp for it.
// Drop those rather than crashing the whole run — and SAY which were dropped,
// so a short set never quietly looks like a complete one.
const screenFor = (c) => {
  for (const f of [
    SHOTS[c.slug] && resolve(SHOTS_DIR, SHOTS[c.slug]),
    SCREEN_OVERRIDES[c.slug] && resolve(STORE, `${SCREEN_OVERRIDES[c.slug]}_iphone.png`),
    resolve(GOALS, `phone-${c.slug}.webp`),
  ]) if (f && existsSync(f)) return f
  return null
}
const targets = wanted.filter(screenFor)
const skipped = wanted.filter(c => !screenFor(c))
if (skipped.length) console.log('skipped (no phone screen):', skipped.map(c => c.slug).join(', '))
if (!targets.length) throw new Error('nothing to render — no card had a usable phone screen')

const PHONE_W = Math.round(W * 0.66)
const PHONE_TOP = Math.round(H * 0.255)

async function phoneUri(c) {
  const file = screenFor(c)
  const img = sharp(file).resize({ width: PHONE_W, kernel: 'lanczos3' })
  if (!SCREEN_OVERRIDES[c.slug]) img.sharpen({ sigma: 0.8 })
  return dataUri(await img.png().toBuffer())
}

// Hand-drawn ellipse, stretched to whatever word it wraps. Inline SVG as a
// background so it tracks the text box instead of needing measured coords.
// Deeper lime than the on-brand #A3E635 — that one disappears against white.
const LASSO = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 80' preserveAspectRatio='none'>
  <path d='M100 6 C40 6 8 22 8 40 C8 60 46 74 104 74 C160 74 192 58 192 39 C192 21 158 7 96 7'
    fill='none' stroke='%2365A30D' stroke-width='4.5' stroke-linecap='round'/></svg>`

const HEAD = `<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@600;700&display=swap" rel="stylesheet">`

const titleSize = (t) => Math.round((t.length > 40 ? 82 : t.length > 30 ? 90 : 100) * (H / 2337) ** 0.28)

// Authored line breaks. Left to itself the headline orphans words ("Cancel
// subscriptions I / forgot about"), which reads badly at this size.
const LINES = {
  'meet-guac-ai': ['Put a brain', 'on my money'],
  organized:      ['Feel organized', 'about my finances'],
  receipts:       ['Never lose', 'a receipt again'],
  bank:           ['Know what my bank', 'statements hide'],
  subs:           ['Cancel subscriptions', 'I forgot about'],
  fees:           ['Catch hidden fees', 'before they bite'],
  'worth-it':     ['Stop buying stuff', 'that isn’t worth it'],
  returns:        ['Get back the refunds', 'I’m owed'],
  smashlist:      ['Plan shopping the', 'whole family sees'],
  predictions:    ['Know what I need', 'before I run out'],
  steals:         ['Pay less for what', 'I already buy'],
  marketplace:    ['Find coupons', 'and local deals'],
  stash:          ['Keep track of', 'everything I own'],
  'car-miles':    ['Log my miles', 'for tax time'],
  tax:            ['Be ready when', 'tax season comes'],
  bills:          ['See bills coming', 'before they hit'],
  guacmoney:      ['Earn rewards', 'for smart habits'],
  'guac-ai':      ['Ask my money', 'anything'],
  games:          ['Make saving', 'actually fun'],
}

// Wrap the circled word without disturbing the rest of the headline.
function markUp(c) {
  const word = CIRCLE[c.slug]
  const lines = LINES[c.slug] || [c.goal]
  return lines.map((line) => {
    if (!word) return esc(line)
    const i = line.toLowerCase().indexOf(word.toLowerCase())
    if (i < 0) return esc(line)
    return esc(line.slice(0, i)) + `<span class="lasso">` + esc(line.slice(i, i + word.length)) + `</span>` + esc(line.slice(i + word.length))
  }).join('<br>')
}

function frameHtml(c, phoneSrc) {
  const fs = titleSize(c.goal)
  return `<!doctype html><html><head>${HEAD}
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${W}px; height: ${H}px; overflow: hidden; position: relative;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: #ffffff;
  }
  /* barely-there lime bloom behind the device so the white isn't dead flat */
  .wash {
    position: absolute; left: 50%; top: ${Math.round(H * 0.16)}px; transform: translateX(-50%);
    width: 128%; height: 62%;
    background: radial-gradient(ellipse at center, rgba(101,163,13,0.13) 0%, rgba(101,163,13,0.04) 46%, rgba(255,255,255,0) 72%);
  }
  .top { position: absolute; left: 0; right: 0; top: ${Math.round(H * 0.072)}px; padding: 0 ${Math.round(W * 0.085)}px; text-align: center; }
  h1 {
    font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800;
    font-size: ${fs}px; line-height: 1.07; letter-spacing: -0.035em; color: #15281C;
  }
  /* the hand-drawn circle: padded so the stroke clears the glyphs */
  .lasso {
    position: relative; display: inline-block; padding: 0 ${Math.round(fs * 0.13)}px;
    background-image: url("data:image/svg+xml,${LASSO.replace(/\n\s*/g, ' ').replace(/"/g, "'").replace(/#/g, '%23')}");
    background-repeat: no-repeat; background-position: center;
    background-size: 100% ${Math.round(fs * 1.34)}px;
  }
  /* the "bubble" — one thumb-stopping figure lifted off the screen, so the
     frame reads at thumbnail size before anyone parses the app UI. Same
     content the site's goal cards use (big/sub/tag), so nothing new is claimed. */
  .chip {
    position: absolute; left: ${Math.round(W * 0.035)}px; top: ${PHONE_TOP + Math.round(H * 0.20)}px;
    width: ${Math.round(W * 0.34)}px; background: #fff; border-radius: ${Math.round(W * 0.026)}px;
    padding: ${Math.round(W * 0.021)}px ${Math.round(W * 0.023)}px;
    border: 3px solid #65A30D; box-shadow: 0 26px 54px -20px rgba(101,163,13,0.55);
  }
  .chip .h { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: ${Math.round(W * 0.009)}px; }
  .chip .h b { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: ${Math.round(W * 0.021)}px; color: #15281C; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chip .h i { font-style: normal; font-size: ${Math.round(W * 0.0145)}px; color: #8A988E; white-space: nowrap; flex: 0 0 auto; }
  .chip .big { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: ${Math.round(W * 0.045)}px; letter-spacing: -0.02em; color: #15281C; line-height: 1.08; }
  .chip .sub { font-size: ${Math.round(W * 0.0165)}px; color: #4D7C0F; font-weight: 700; margin-top: 5px; line-height: 1.35; }

  .phone { position: absolute; left: 50%; top: ${PHONE_TOP}px; transform: translateX(-50%); width: ${PHONE_W}px; }
  .phone img { width: ${PHONE_W}px; display: block; border-radius: ${Math.round(W * 0.055)}px; filter: drop-shadow(0 40px 62px rgba(20,40,28,0.26)); }
</style></head><body>
  <div class="wash"></div>
  <div class="top"><h1>${markUp(c)}</h1></div>
  <div class="phone"><img src="${phoneSrc}"></div>
  <div class="chip">
    <div class="h"><b>${esc(c.e)} ${esc(c.name)}</b><i>${esc(c.tag)}</i></div>
    <div class="big">${esc(c.big)}</div>
    <div class="sub">${esc(c.sub)}</div>
  </div>
</body></html>`
}

mkdirSync(OUT, { recursive: true })
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: preset.dsf })

// Numbered over what actually renders, so the set has no gaps where a card
// was skipped. Store listings show them in filename order.
for (const [i, c] of targets.entries()) {
  const name = `${String(i + 1).padStart(2, '0')}-${c.slug}.png`
  await p.setContent(frameHtml(c, await phoneUri(c)), { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(300)
  const shot = await p.screenshot()
  await sharp(shot).resize(preset.out[0], preset.out[1], { fit: 'fill' }).png().toFile(resolve(OUT, name))
  console.log('✓', name, '—', c.goal)
}

await b.close()
console.log(`\n${targets.length} frame(s) →`, OUT)

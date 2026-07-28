// Editorial store frames — the Monarch-style listing look.
//
// Differences from reel-frames.mjs (which stays as-is, it still builds the
// current live set):
//   · pastel colour panel per frame instead of flat white
//   · small uppercase kicker above the headline
//   · serif display face with an italic emphasis clause
//   · phone cropped by the bottom edge, no CTA pill
//
// ⚠️ TYPOGRAPHY: this is a deliberate, MARKETING-ONLY departure from the
// Bricolage+Jakarta lock — the serif is most of what makes the reference read
// as premium. The app and the site are untouched. Flip FACE below to go back.
//
//   PRESET=apple65 node scripts/editorial-frames.mjs          → all frames
//   PRESET=apple65 node scripts/editorial-frames.mjs subs     → just one
//   PRESET=fb45    node scripts/editorial-frames.mjs subs     → the FB feed ad

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

const size = (dir, w, h) => ({ dir, out: [w, h], dsf: w / 1080, cssH: Math.round(h / (w / 1080)) })
const PRESETS = {
  reel:    size('ed-reel-1080x1920',  1080, 1920),
  apple69: size('ed-store-1320x2868', 1320, 2868),
  apple:   size('ed-store-1290x2796', 1290, 2796),
  apple65: size('ed-store-1242x2688', 1242, 2688),
  apple55: size('ed-store-1242x2208', 1242, 2208),
  fb45:    size('ed-fb-1080x1350',    1080, 1350),
  fb11:    size('ed-fb-1080x1080',    1080, 1080),
}
const preset = PRESETS[process.env.PRESET || 'apple65']
if (!preset) throw new Error(`Unknown PRESET. Use: ${Object.keys(PRESETS).join(', ')}`)

const OUT = resolve(WEB, 'marketing-assets', preset.dir)
const W = 1080, H = preset.cssH

// --- copy: same single source of truth as every other frame script ----------
const src = readFileSync(resolve(WEB, 'src', 'components', 'GoalsShowcase.jsx'), 'utf8')
const m = src.match(/const CARDS = (\[[\s\S]*?\n\])\n/)
if (!m) throw new Error('Could not find the CARDS array in GoalsShowcase.jsx')
const CARDS = eval(m[1])

const only = process.argv[2]
const targets = only ? CARDS.filter(c => c.slug === only) : CARDS
if (!targets.length) throw new Error(`No goal with slug "${only}". Known: ${CARDS.map(c => c.slug).join(', ')}`)

// Where each headline breaks into its italic clause. The WORDS are never
// changed — only split — so the frames still say exactly what the site says.
const EMPHASIS = {
  'meet-guac-ai': ['Put a brain', 'on my money.'],
  organized:      ['Feel organized', 'about my finances.'],
  receipts:       ['Never lose a receipt', 'again.'],
  bank:           ['Know what my bank', 'statements hide.'],
  subs:           ['Cancel subscriptions', 'I forgot about.'],
  fees:           ['Catch hidden fees', 'before they bite.'],
  'worth-it':     ['Stop buying stuff', 'that isn’t worth it.'],
  returns:        ['Get back the refunds', 'I’m owed.'],
  smashlist:      ['Plan shopping', 'the whole family sees.'],
  predictions:    ['Know what I need', 'before I run out.'],
  steals:         ['Pay less for what', 'I already buy.'],
  marketplace:    ['Find coupons', 'and local deals.'],
  stash:          ['Keep track of', 'everything I own.'],
  'car-miles':    ['Log my miles', 'for tax time.'],
  tax:            ['Be ready when', 'tax season comes.'],
  bills:          ['See bills coming', 'before they hit.'],
  guacmoney:      ['Earn rewards', 'for smart habits.'],
  'guac-ai':      ['Ask my money', 'anything.'],
  games:          ['Make saving', 'actually fun.'],
}

// Warm avocado-adjacent panel tints, cycled so neighbouring frames differ.
const TINTS = [
  { bg: '#F4F8F1', ink: '#15281C', kick: '#4D7C0F', edge: '#E3EDDC' }, // sage
  { bg: '#FDF6EC', ink: '#26231A', kick: '#A16207', edge: '#F2E7D5' }, // cream
  { bg: '#FBEFE8', ink: '#2B211C', kick: '#C2410C', edge: '#F4DDD1' }, // blush
  { bg: '#EDF3F5', ink: '#1B2833', kick: '#0F766E', edge: '#DCE8EC' }, // slate
  { bg: '#F7F2E6', ink: '#262218', kick: '#B45309', edge: '#EDE2CC' }, // sand
  { bg: '#EFF5EF', ink: '#15281C', kick: '#166534', edge: '#DDEADD' }, // mint
]
const tintFor = (c) => TINTS[Math.max(0, CARDS.indexOf(c)) % TINTS.length]

// Chart-rich captures where we have them, same table the store frames use.
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

// Proportional so one composition serves 4:5 through 9:19.5. The phone is the
// bottom ~52% of the panel and runs off the edge; text sits in the top third.
const PHONE_W = Math.round(W * 0.64)
const PHONE_TOP = Math.round(H * 0.285)
const PAD = 82

async function phoneUri(slug) {
  const override = SCREEN_OVERRIDES[slug]
  const file = override ? resolve(STORE, `${override}_iphone.png`) : resolve(GOALS, `phone-${slug}.webp`)
  const img = sharp(file).resize({ width: PHONE_W, kernel: 'lanczos3' })
  if (!override) img.sharpen({ sigma: 0.8 })
  return dataUri(await img.png().toBuffer())
}

// Serif display face. Fraunces is the closest free match to the reference's
// high-contrast warmth and, unlike most Google serifs, ships a real italic.
const FACE = `'Fraunces', Georgia, serif`
const HEAD = `<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500;1,9..144,600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">`

const titleSize = (a, b) => {
  const n = (a + ' ' + b).length
  return Math.round((n > 42 ? 74 : n > 32 ? 82 : 92) * (H / 2688) ** 0.35)
}

function frameHtml(c, phoneSrc) {
  const t = tintFor(c)
  const [roman, ital] = EMPHASIS[c.slug] || [c.goal, '']
  const fs = titleSize(roman, ital)
  return `<!doctype html><html><head>${HEAD}
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${W}px; height: ${H}px; overflow: hidden; position: relative;
    background: ${t.bg}; font-family: 'Plus Jakarta Sans', sans-serif;
  }
  /* a second, warmer wash low in the panel so the flat tint has some depth */
  .wash {
    position: absolute; left: 50%; bottom: -18%; transform: translateX(-50%);
    width: 150%; height: 62%; border-radius: 50%;
    background: radial-gradient(ellipse at center, ${t.edge} 0%, ${t.bg} 68%);
  }
  .top { position: absolute; left: 0; right: 0; top: ${Math.round(H * 0.062)}px; padding: 0 ${PAD}px; text-align: center; }
  .kick {
    font-size: ${Math.round(fs * 0.30)}px; font-weight: 800; letter-spacing: 0.17em;
    text-transform: uppercase; color: ${t.kick};
  }
  h1 {
    font-family: ${FACE}; font-weight: 500; font-size: ${fs}px; line-height: 1.1;
    letter-spacing: -0.012em; color: ${t.ink}; margin-top: ${Math.round(fs * 0.42)}px;
  }
  h1 em { font-style: italic; font-weight: 600; display: block; }

  /* Honest badge. Swap the text for a real award or review the day there is
     one — the styling is deliberately a plain pill, NOT laurels, because
     laurels read as "we won something" and we haven't. */
  .badge {
    display: inline-block; margin-top: ${Math.round(fs * 0.52)}px;
    background: rgba(255,255,255,0.82); border: 2px solid ${t.edge};
    border-radius: 999px; padding: ${Math.round(fs * 0.17)}px ${Math.round(fs * 0.38)}px;
    font-size: ${Math.round(fs * 0.27)}px; font-weight: 700; color: ${t.kick};
    display: inline-flex; align-items: center; gap: ${Math.round(fs * 0.16)}px;
  }
  .badge img { width: ${Math.round(fs * 0.42)}px; height: ${Math.round(fs * 0.42)}px; border-radius: ${Math.round(fs * 0.12)}px; }

  .phone { position: absolute; left: 50%; top: ${PHONE_TOP}px; transform: translateX(-50%); width: ${PHONE_W}px; }
  .phone img { width: ${PHONE_W}px; display: block; filter: drop-shadow(0 44px 64px rgba(20,40,28,0.26)); }
</style></head><body>
  <div class="wash"></div>
  <div class="top">
    <div class="kick">${esc(c.name)}</div>
    <h1>${esc(roman)}${ital ? `<em>${esc(ital)}</em>` : ''}</h1>
    <div class="badge"><img src="${fileUri(ICON)}">Free on iOS, Android &amp; web</div>
  </div>
  <div class="phone"><img src="${phoneSrc}"></div>
</body></html>`
}

mkdirSync(OUT, { recursive: true })
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: preset.dsf })

let n = 0
for (const c of targets) {
  n = CARDS.indexOf(c) + 1
  const name = `${String(n).padStart(2, '0')}-${c.slug}.png`
  await p.setContent(frameHtml(c, await phoneUri(c.slug)), { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(300)
  const shot = await p.screenshot()
  await sharp(shot).resize(preset.out[0], preset.out[1], { fit: 'fill' }).png().toFile(resolve(OUT, name))
  console.log('✓', name, '—', c.goal)
}

await b.close()
console.log(`\n${targets.length} frame(s) →`, OUT)

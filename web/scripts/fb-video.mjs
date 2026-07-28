// Animated Facebook / Instagram video ads — one per goal card.
//
// Why these and not the store screenshots: App Store and Play screenshots are
// static PNG/JPEG, there is no animated screenshot slot on either store. Meta
// has no such restriction, so this is where motion actually earns anything.
// (The App Preview video is a separate job — Apple wants real screen-recorded
// app footage there, not a bubble swinging over a still.)
//
// Frames are rendered deterministically rather than screen-recorded: the CSS
// animations are paused and seeked with the Web Animations API, one screenshot
// per frame. That gives full-resolution, judder-free output instead of whatever
// Playwright's webm recorder decides to do.
//
//   node scripts/fb-video.mjs subs              → 4s, 1080x1350, 30fps
//   RATIO=9x16 node scripts/fb-video.mjs subs   → 1080x1920 (Reels/Stories)
//   node scripts/fb-video.mjs                   → every card with a screen

import { chromium } from 'playwright'
import sharp from 'sharp'
import { readFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(__dirname, '..')
const GOALS = resolve(WEB, 'public', 'home', 'goals')
const STORE = resolve(WEB, 'marketing-assets', 'reel-src-apple')
// STORE picks which store badge the ad closes on, and keeps the two campaigns
// in separate folders so an Android ad set can never pick up an iOS creative.
// The video itself is otherwise identical — Meta serves the same file, only the
// ad set's platform + destination URL differ.
const TARGET_STORE = (process.env.STORE || '').toLowerCase()
if (TARGET_STORE && !['ios', 'android', 'web', 'all'].includes(TARGET_STORE)) throw new Error("STORE must be 'ios', 'android', 'web' or 'all'")
const OUT = resolve(WEB, 'marketing-assets', TARGET_STORE ? `fb-video-${TARGET_STORE}` : 'fb-video')
const TMP = resolve(OUT, '_frames')

// Matches the badges already on the homepage (page.jsx) — same dark pill, same
// two-line lockup, same glyphs. ⚠️ These are our own rendering, NOT Apple's or
// Google's supplied badge artwork; both have brand guidelines that ask you to
// use their downloadable files, worth swapping in before a big spend.
const BADGES = {
  ios: {
    small: 'Download on the', big: 'App Store',
    svg: `<svg viewBox="0 0 384 512" width="__S__" height="__S__" fill="#fff"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.7-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>`,
  },
  android: {
    small: 'Get it on', big: 'Google Play',
    svg: `<svg viewBox="0 0 512 512" width="__S__" height="__S__"><path fill="#4285F4" d="M48 32 288 256 48 480c-10-6-16-17-16-30V62c0-13 6-24 16-30z"/><path fill="#34A853" d="M48 32c5-3 11-5 17-5 6 0 12 2 18 5l260 148-55 76z"/><path fill="#FBBC04" d="M288 256l55-76 92 52c30 17 30 51 0 68l-92 52z"/><path fill="#EA4335" d="M288 256l55 76L83 480c-6 3-12 5-18 5-6 0-12-2-17-5z"/></svg>`,
  },
  // Web close-card. This is the one the paid campaign should be using: the
  // store round-trip (click -> store -> install -> open -> sign up) produced 21
  // link clicks, ~2 store-listing visitors and 0 installs, while GetGuac is a
  // full web app where the ad click can land straight on a signup.
  web: {
    small: 'Free on the web', big: 'getguac.app',
    svg: `<svg viewBox="0 0 512 512" width="__S__" height="__S__" fill="none" stroke="#fff" stroke-width="34"><circle cx="256" cy="256" r="212"/><ellipse cx="256" cy="256" rx="98" ry="212"/><path d="M52 190h408M52 322h408"/></svg>`,
  },
  // Every platform in one pill — for a single creative that doesn't need a
  // separate ad set per OS. Rendered by the `all` branch below, which draws the
  // three glyphs side by side instead of one glyph + two lines of text.
  all: {
    small: 'iPhone, Android & web', big: 'getguac.app',
    svg: null,
  },
}

// Glyph row for the `all` badge — reuses the three real marks above so the
// lockup stays consistent with the single-platform variants.
const ALL_GLYPHS = ['ios', 'android', 'web']

const RATIOS = { '4x5': [1080, 1350], '9x16': [1080, 1920], '1x1': [1080, 1080] }
const ratio = RATIOS[process.env.RATIO || '4x5']
if (!ratio) throw new Error(`Unknown RATIO. Use: ${Object.keys(RATIOS).join(', ')}`)
const [W, H] = ratio
const FPS = 30
const SECONDS = 4
const TOTAL = FPS * SECONDS

const src = readFileSync(resolve(WEB, 'src', 'components', 'GoalsShowcase.jsx'), 'utf8')
const m = src.match(/const CARDS = (\[[\s\S]*?\n\])\n/)
if (!m) throw new Error('Could not find the CARDS array in GoalsShowcase.jsx')
const CARDS = eval(m[1])

const SHOTS_DIR = 'C:/Harward/attachments_ipdone'
const shot = (t) => `Simulator Screenshot - iPhone 17 Pro Max - 2026-07-16 at ${t}_iphone.png`
const SHOTS = {
  organized: shot('14.00.19'), subs: shot('14.00.11'), fees: shot('14.00.27'),
  'worth-it': shot('14.00.48'), returns: shot('14.02.36'), steals: shot('14.01.38'),
  stash: shot('14.01.54'), 'car-miles': shot('14.02.05'), guacmoney: shot('14.01.44'),
  tax: shot('14.03.21'), 'guac-ai': shot('14.04.37'), games: shot('14.05.18'),
}
const SCREEN_OVERRIDES = { receipts: '02-receipts', marketplace: '08-marketplace', smashlist: '10-smashlist' }

const screenFor = (c) => {
  for (const f of [
    SHOTS[c.slug] && resolve(SHOTS_DIR, SHOTS[c.slug]),
    SCREEN_OVERRIDES[c.slug] && resolve(STORE, `${SCREEN_OVERRIDES[c.slug]}_iphone.png`),
    resolve(GOALS, `phone-${c.slug}.webp`),
  ]) if (f && existsSync(f)) return f
  return null
}

const only = process.argv[2]
const wanted = only ? CARDS.filter(c => c.slug === only) : CARDS
if (!wanted.length) throw new Error(`No goal with slug "${only}". Known: ${CARDS.map(c => c.slug).join(', ')}`)
const targets = wanted.filter(screenFor)
const dropped = wanted.filter(c => !screenFor(c))
if (dropped.length) console.log('skipped (no phone screen):', dropped.map(c => c.slug).join(', '))

// A DISTINCT bubble entrance per card, so a carousel of these doesn't look
// like one template run seven times. Each pairs with an idle motion that keeps
// going after the entrance lands.
const ANIM = {
  subs:        { in: 'swing',   idle: 'sway'  },  // swings down on a pivot
  fees:        { in: 'pop',     idle: 'bob'   },
  'worth-it':  { in: 'flip',    idle: 'bob'   },
  steals:      { in: 'drop',    idle: 'sway'  },
  returns:     { in: 'rise',    idle: 'bob'   },
  stash:       { in: 'slideL',  idle: 'sway'  },
  games:       { in: 'zoom',    idle: 'bob'   },
  organized:   { in: 'rise',    idle: 'sway'  },
  'car-miles': { in: 'slideL',  idle: 'bob'   },
  guacmoney:   { in: 'pop',     idle: 'sway'  },
  tax:         { in: 'drop',    idle: 'bob'   },
  'guac-ai':   { in: 'swing',   idle: 'bob'   },
  receipts:    { in: 'rise',    idle: 'bob'   },
  marketplace: { in: 'pop',     idle: 'sway'  },
  smashlist:   { in: 'slideL',  idle: 'sway'  },
}

const CIRCLE = {
  organized: 'organized', receipts: 'receipt', bank: 'hide', subs: 'subscriptions',
  fees: 'fees', 'worth-it': 'worth', returns: 'refunds', smashlist: 'family',
  predictions: 'run out', steals: 'less', marketplace: 'coupons', stash: 'everything',
  'car-miles': 'miles', tax: 'ready', bills: 'before', guacmoney: 'rewards',
  'guac-ai': 'anything', games: 'fun',
}
const LINES = {
  organized: ['Feel organized', 'about my finances'],
  receipts: ['Never lose', 'a receipt again'],
  subs: ['Cancel subscriptions', 'I forgot about'],
  fees: ['Catch hidden fees', 'before they bite'],
  'worth-it': ['Stop buying stuff', 'that isn’t worth it'],
  returns: ['Get back the refunds', 'I’m owed'],
  smashlist: ['Plan shopping the', 'whole family sees'],
  steals: ['Pay less for what', 'I already buy'],
  stash: ['Keep track of', 'everything I own'],
  'car-miles': ['Log my miles', 'for tax time'],
  tax: ['Be ready when', 'tax season comes'],
  guacmoney: ['Earn rewards', 'for smart habits'],
  'guac-ai': ['Ask my money', 'anything'],
  games: ['Make saving', 'actually fun'],
  marketplace: ['Find coupons', 'and local deals'],
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const dataUri = (buf, mime = 'image/png') => `data:${mime};base64,${buf.toString('base64')}`

const PHONE_W = Math.round(W * 0.60)
const PHONE_TOP = Math.round(H * 0.30)

async function phoneUri(c) {
  const file = screenFor(c)
  const img = sharp(file).resize({ width: PHONE_W, kernel: 'lanczos3' })
  if (!SHOTS[c.slug] && !SCREEN_OVERRIDES[c.slug]) img.sharpen({ sigma: 0.8 })
  return dataUri(await img.png().toBuffer())
}

const LASSO = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 80' preserveAspectRatio='none'>
  <path d='M100 6 C40 6 8 22 8 40 C8 60 46 74 104 74 C160 74 192 58 192 39 C192 21 158 7 96 7'
    fill='none' stroke='%2365A30D' stroke-width='4.5' stroke-linecap='round'/></svg>`

const HEAD = `<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@600;700&display=swap" rel="stylesheet">`

const titleSize = (t) => Math.round((t.length > 40 ? 62 : t.length > 30 ? 68 : 76) * (H / 1350) ** 0.3)

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

function html(c, phoneSrc) {
  const fs = titleSize((LINES[c.slug] || [c.goal]).join(' '))
  const a = ANIM[c.slug] || { in: 'pop', idle: 'bob' }
  return `<!doctype html><html><head>${HEAD}
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: ${W}px; height: ${H}px; overflow: hidden; position: relative;
         font-family: 'Plus Jakarta Sans', sans-serif; background: #ffffff; }
  .wash { position: absolute; left: 50%; top: ${Math.round(H * 0.14)}px; transform: translateX(-50%);
          width: 128%; height: 66%;
          background: radial-gradient(ellipse at center, rgba(101,163,13,0.13) 0%, rgba(101,163,13,0.04) 46%, rgba(255,255,255,0) 72%); }
  .top { position: absolute; left: 0; right: 0; top: ${Math.round(H * 0.055)}px; padding: 0 ${Math.round(W * 0.075)}px; text-align: center; }
  h1 { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: ${fs}px;
       line-height: 1.07; letter-spacing: -0.035em; color: #15281C;
       animation: headIn 700ms cubic-bezier(.2,.8,.2,1) both; }
  .lasso { position: relative; display: inline-block; padding: 0 ${Math.round(fs * 0.13)}px;
           background-image: url("data:image/svg+xml,${LASSO.replace(/\n\s*/g, ' ').replace(/"/g, "'").replace(/#/g, '%23')}");
           background-repeat: no-repeat; background-position: center;
           background-size: 100% ${Math.round(fs * 1.34)}px;
           animation: lassoIn 460ms 220ms cubic-bezier(.2,.9,.3,1.2) both; }
  .phone { position: absolute; left: 50%; top: ${PHONE_TOP}px; width: ${PHONE_W}px;
           animation: phoneIn 900ms 260ms cubic-bezier(.2,.85,.25,1) both; }
  .phone img { width: ${PHONE_W}px; display: block; border-radius: ${Math.round(W * 0.05)}px;
               filter: drop-shadow(0 38px 58px rgba(20,40,28,0.26)); }

  .chip { position: absolute; left: ${Math.round(W * 0.032)}px; top: ${PHONE_TOP + Math.round(H * 0.30)}px;
          width: ${Math.round(W * 0.36)}px; background: #fff; border-radius: ${Math.round(W * 0.028)}px;
          padding: ${Math.round(W * 0.022)}px ${Math.round(W * 0.024)}px;
          border: 3px solid #65A30D; box-shadow: 0 26px 54px -20px rgba(101,163,13,0.55);
          transform-origin: 20% 0%;
          animation: ${a.in} 720ms 700ms cubic-bezier(.2,.9,.25,1.15) both,
                     ${a.idle} 2000ms 1420ms ease-in-out infinite; }
  .chip .h { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: ${Math.round(W * 0.009)}px; }
  .chip .h b { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: ${Math.round(W * 0.022)}px; color: #15281C; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chip .h i { font-style: normal; font-size: ${Math.round(W * 0.015)}px; color: #8A988E; white-space: nowrap; flex: 0 0 auto; }
  .chip .big { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: ${Math.round(W * 0.048)}px; letter-spacing: -0.02em; color: #15281C; line-height: 1.08; }
  .chip .sub { font-size: ${Math.round(W * 0.017)}px; color: #4D7C0F; font-weight: 700; margin-top: 5px; line-height: 1.35; }

  /* Frame 0 is the ad's thumbnail on Meta, so nothing fades up from nothing:
     the headline and phone are already legible at t=0 and merely settle. Only
     the bubble makes a real entrance. */
  @keyframes headIn  { from { transform: translateY(-16px) } to { transform: none } }
  @keyframes lassoIn { from { opacity: .25; background-size: 55% ${Math.round(fs * 1.34)}px } to { opacity: 1; background-size: 100% ${Math.round(fs * 1.34)}px } }
  @keyframes phoneIn { from { opacity: .55; transform: translateX(-50%) translateY(64px) } to { opacity: 1; transform: translateX(-50%) translateY(0) } }

  /* per-card entrances */
  @keyframes swing  { 0% { opacity: 0; transform: rotate(-14deg) translateY(-70px) } 60% { opacity: 1; transform: rotate(4deg) translateY(0) } 100% { opacity: 1; transform: rotate(0) } }
  @keyframes pop    { 0% { opacity: 0; transform: scale(.62) } 65% { opacity: 1; transform: scale(1.07) } 100% { opacity: 1; transform: scale(1) } }
  @keyframes flip   { 0% { opacity: 0; transform: perspective(900px) rotateY(-78deg) } 100% { opacity: 1; transform: perspective(900px) rotateY(0) } }
  @keyframes drop   { 0% { opacity: 0; transform: translateY(-190px) } 70% { opacity: 1; transform: translateY(14px) } 100% { opacity: 1; transform: translateY(0) } }
  @keyframes rise   { 0% { opacity: 0; transform: translateY(150px) } 100% { opacity: 1; transform: translateY(0) } }
  @keyframes slideL { 0% { opacity: 0; transform: translateX(-320px) } 100% { opacity: 1; transform: translateX(0) } }
  @keyframes zoom   { 0% { opacity: 0; transform: scale(1.5) rotate(6deg) } 100% { opacity: 1; transform: scale(1) rotate(0) } }

  /* idle — the "swing up and down" that keeps going once it's landed */
  @keyframes bob  { 0%,100% { translate: 0 0 } 50% { translate: 0 -14px } }
  @keyframes sway { 0%,100% { rotate: 0deg; translate: 0 0 } 50% { rotate: -2.2deg; translate: 0 -10px } }

  /* store badge — lands late so the ad closes on "where do I get it" */
  .badge { position: absolute; right: ${Math.round(W * 0.035)}px; bottom: ${Math.round(H * 0.035)}px;
           display: inline-flex; align-items: center; gap: ${Math.round(W * 0.011)}px;
           background: #0B1410; color: #fff; border-radius: ${Math.round(W * 0.013)}px;
           padding: ${Math.round(W * 0.011)}px ${Math.round(W * 0.020)}px ${Math.round(W * 0.011)}px ${Math.round(W * 0.015)}px;
           box-shadow: 0 18px 34px -12px rgba(0,0,0,0.45);
           animation: badgeIn 620ms 2250ms cubic-bezier(.2,.9,.25,1.1) both; }
  .badge i { display: block; font-style: normal; font-size: ${Math.round(W * 0.0125)}px; opacity: .8; line-height: 1.2; }
  .badge b { display: block; font-size: ${Math.round(W * 0.0205)}px; font-weight: 700; line-height: 1.15; }
  /* "all" variant: the three platform marks in a row before the wordmark. */
  .badge .glyphs { display: inline-flex; align-items: center; gap: ${Math.round(W * 0.008)}px; }
  @keyframes badgeIn { from { opacity: 0; transform: translateY(26px) scale(.94) } to { opacity: 1; transform: none } }
</style></head><body>
  <div class="wash"></div>
  <div class="top"><h1>${markUp(c)}</h1></div>
  <div class="phone"><img src="${phoneSrc}"></div>
  <div class="chip">
    <div class="h"><b>${esc(c.e)} ${esc(c.name)}</b><i>${esc(c.tag)}</i></div>
    <div class="big">${esc(c.big)}</div>
    <div class="sub">${esc(c.sub)}</div>
  </div>
  ${TARGET_STORE ? `<div class="badge">
    ${TARGET_STORE === 'all'
      // Three marks side by side, so one creative can run on every placement
      // without implying it's an iPhone-only or Android-only product.
      ? `<span class="glyphs">${ALL_GLYPHS.map((k) => BADGES[k].svg.replace(/__S__/g, String(Math.round(W * 0.023)))).join('')}</span>`
      : BADGES[TARGET_STORE].svg.replace(/__S__/g, String(Math.round(W * 0.026)))}
    <span><i>${BADGES[TARGET_STORE].small}</i><b>${BADGES[TARGET_STORE].big}</b></span>
  </div>` : ''}
</body></html>`
}

const ffmpeg = ['ffmpeg', 'C:/Users/Narasimha/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe']
  .find(p => { try { execFileSync(p, ['-version'], { stdio: 'ignore' }); return true } catch { return false } })

mkdirSync(OUT, { recursive: true })
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })

for (const c of targets) {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })
  await page.setContent(html(c, await phoneUri(c)), { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)

  for (let i = 0; i < TOTAL; i++) {
    const ms = (i / FPS) * 1000
    // Seek every running CSS animation to the same instant, then shoot. Far
    // steadier than recording playback and hoping the frame pacing holds.
    await page.evaluate((t) => {
      for (const a of document.getAnimations()) { a.pause(); a.currentTime = t }
    }, ms)
    await page.screenshot({ path: resolve(TMP, `f${String(i).padStart(4, '0')}.png`) })
  }

  const outFile = resolve(OUT, `${c.slug}-${W}x${H}.mp4`)
  if (ffmpeg) {
    execFileSync(ffmpeg, ['-y', '-framerate', String(FPS), '-i', resolve(TMP, 'f%04d.png'),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', outFile], { stdio: 'ignore' })
    console.log('✓', `${c.slug}-${W}x${H}.mp4`)
  } else {
    console.log('!', c.slug, '— frames only, ffmpeg not found:', TMP)
  }
}

rmSync(TMP, { recursive: true, force: true })
await b.close()
console.log(`\n${targets.length} video(s) →`, OUT)

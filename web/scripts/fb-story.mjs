// ONE multi-scene video ad — the YNAB structure.
//
// YNAB's App Preview is a single ~27s file that walks several features in
// sequence, not one clip per feature. This builds that: a brand open, six
// feature scenes, then a close on the store badge.
//
// Every scene lives in the same document, stacked and absolutely positioned,
// each with its own animation delay. That means transitions are real cross
// fades rather than concatenated clips, and the whole timeline can be seeked
// frame-by-frame with the Web Animations API for judder-free output.
//
//   STORE=android node scripts/fb-story.mjs        → 1080x1350 feed
//   STORE=ios RATIO=9x16 node scripts/fb-story.mjs → 1080x1920 Reels/Stories

import { chromium } from 'playwright'
import sharp from 'sharp'
import { readFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(__dirname, '..')
const ICON = resolve(WEB, '..', 'mobile', 'assets', 'icon', 'icon.png')
const SHOTS_DIR = 'C:/Harward/attachments_ipdone'
const OUT = resolve(WEB, 'marketing-assets', 'fb-story')

const RATIOS = { '4x5': [1080, 1350], '9x16': [1080, 1920], '1x1': [1080, 1080] }
const ratio = RATIOS[process.env.RATIO || '4x5']
if (!ratio) throw new Error(`Unknown RATIO. Use: ${Object.keys(RATIOS).join(', ')}`)
const [W, H] = ratio

const TARGET_STORE = (process.env.STORE || 'android').toLowerCase()
if (!['ios', 'android', 'web', 'all'].includes(TARGET_STORE)) throw new Error("STORE must be 'ios', 'android', 'web' or 'all'")

const FPS = 30
// Pacing, env-tunable: SCENE=5.4 node scripts/fb-story.mjs
const OPEN  = Number(process.env.OPEN  || 4.2)   // brand scene
const SCENE = Number(process.env.SCENE || 5.2)   // each feature scene
const CLOSE = Number(process.env.CLOSE || 6.0)   // badge scene — most text, holds longest
// Scenes do NOT overlap. A cross-fade superimposes two headlines mid-transition,
// which reads as a glitch rather than a dissolve — each scene fades out fully
// before the next fades in, giving a clean dip on the white ground.
const FADE = 0.22         // fade in/out INSIDE each scene's own slot

const src = readFileSync(resolve(WEB, 'src', 'components', 'GoalsShowcase.jsx'), 'utf8')
const m = src.match(/const CARDS = (\[[\s\S]*?\n\])\n/)
if (!m) throw new Error('Could not find the CARDS array in GoalsShowcase.jsx')
const CARDS = eval(m[1])

const shot = (t) => resolve(SHOTS_DIR, `Simulator Screenshot - iPhone 17 Pro Max - 2026-07-16 at ${t}_iphone.png`)
// Fallback source: the goal art the store frames already use
// (public/home/goals/phone-<slug>.webp). Lets a scene exist for any card
// without needing a fresh simulator capture in SHOTS_DIR.
const goal = (slug) => resolve(WEB, 'public', 'home', 'goals', `phone-${slug}.webp`)

// Blurb per slug, from the CARDS already lifted out of GoalsShowcase.jsx above.
// This is the sub-headline the store panels carry ("GetGuac spots every
// recurring charge, flags the price hikes...") which the animated scenes were
// missing.
const BLURB = Object.fromEntries(CARDS.map((c) => [c.slug, c.blurb]))
const SHOTS = {
  organized: shot('14.00.19'), subs: shot('14.00.11'), fees: shot('14.00.27'),
  'worth-it': shot('14.00.48'), returns: shot('14.02.36'), steals: shot('14.01.38'),
  stash: shot('14.01.54'), games: shot('14.05.18'),
  tax: shot('14.03.21'),        // Reports — business / charity / sales tax
  // From the goal art rather than the simulator dump, so the animated cut can
  // cover the same slides as the curated store sequence.
  receipts: goal('receipts'), smashlist: goal('smashlist'),
  'car-miles': goal('car-miles'), 'guac-ai': goal('guac-ai'),
}

// MAIN features only — YNAB's own preview shows just three before the CTA,
// because a store video is a hook, not a feature tour. Five here: get a grip,
// stop the two biggest leaks, get money back, pay less. Everything else lives
// in the screenshots. Edit this list to re-cut the video.
// Override from the command line: `node scripts/fb-story.mjs organized fees subs`
// Games is deliberately out of the default cut — it undersells a money app as a
// toy in the one scene most viewers actually reach.
// Mirrors the hand-curated cut in marketing-assets/fb-story/slide, in that
// order. Games, predictions, bank, bills and marketplace are deliberately out.
const DEFAULT_STORY = [
  'organized', 'receipts', 'subs', 'fees', 'worth-it', 'returns',
  'smashlist', 'steals', 'stash', 'car-miles', 'tax', 'guac-ai',
]
const STORY = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_STORY
for (const s of STORY) if (!SHOTS[s]) throw new Error(`no screen mapped for "${s}". Have: ${Object.keys(SHOTS).join(', ')}`)

const LINES = {
  organized: ['Feel organized', 'about my finances'],
  tax: ['Be ready when', 'tax season comes'],
  subs: ['Cancel subscriptions', 'I forgot about'],
  fees: ['Catch hidden fees', 'and bank bites'],
  returns: ['Get back the refunds', 'I’m owed'],
  steals: ['Pay less for what', 'I already buy'],
  games: ['Make saving', 'actually fun'],
  'worth-it': ['Know what was', 'actually worth it'],
  stash: ['Build a stash', 'without thinking'],
  receipts: ['Never lose', 'a receipt again'],
  smashlist: ['Know what to buy', 'before I shop'],
  'car-miles': ['Track every mile', 'I can write off'],
  'guac-ai': ['Ask my money', 'anything'],
}
const CIRCLE = {
  organized: 'organized', tax: 'ready', subs: 'subscriptions', fees: 'fees',
  returns: 'refunds', steals: 'less', games: 'fun',
  'worth-it': 'worth', stash: 'stash',
  receipts: 'receipt', smashlist: 'buy', 'car-miles': 'mile', 'guac-ai': 'anything',
}
// `fees` circles "bites" now that the line covers bank bites too — circling
// "fees" would ring the half of the message that was already obvious.
CIRCLE.fees = 'bites'
const ANIM = {
  organized: 'rise', tax: 'drop', subs: 'swing', fees: 'pop',
  returns: 'rise', steals: 'drop', games: 'zoom',
}
// Slugs added to the cut later were never given an entrance here, which left
// `animation-name: undefined` on their chip — it snapped in with no animation
// at all. Default them rather than leaving half the scenes without a move.
const chipAnim = (slug) => ANIM[slug] || 'rise'

const BADGES = {
  ios: { small: 'Download on the', big: 'App Store',
    svg: `<svg viewBox="0 0 384 512" width="__S__" height="__S__" fill="#fff"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.7-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>` },
  android: { small: 'Get it on', big: 'Google Play',
    svg: `<svg viewBox="0 0 512 512" width="__S__" height="__S__"><path fill="#4285F4" d="M48 32 288 256 48 480c-10-6-16-17-16-30V62c0-13 6-24 16-30z"/><path fill="#34A853" d="M48 32c5-3 11-5 17-5 6 0 12 2 18 5l260 148-55 76z"/><path fill="#FBBC04" d="M288 256l55-76 92 52c30 17 30 51 0 68l-92 52z"/><path fill="#EA4335" d="M288 256l55 76L83 480c-6 3-12 5-18 5-6 0-12-2-17-5z"/></svg>` },
  web: { small: 'Free on the web', big: 'getguac.app',
    svg: `<svg viewBox="0 0 512 512" width="__S__" height="__S__" fill="none" stroke="#fff" stroke-width="34"><circle cx="256" cy="256" r="212"/><ellipse cx="256" cy="256" rx="98" ry="212"/><path d="M52 190h408M52 322h408"/></svg>` },
  // All three marks on the close card. The closing line already says "Free on
  // iOS, Android & web", so a single-store badge under it contradicted the
  // copy — this makes the lockup agree with what the ad actually claims.
  all: { small: 'iPhone, Android & web', big: 'getguac.app', svg: null },
}

const ALL_GLYPHS = ['ios', 'android', 'web']

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const dataUri = (b, mime = 'image/png') => `data:${mime};base64,${b.toString('base64')}`

const PHONE_W = Math.round(W * 0.58)
// PHONE_TOP is derived further down, once the panel-parity header stack
// (brand lockup + emoji + headline + blurb) has been sized — the phone starts
// below whatever that stack needs.

for (const s of STORY) if (!existsSync(SHOTS[s])) throw new Error(`missing screen for ${s}: ${SHOTS[s]}`)
// Downscaling a 1290-wide capture to ~630 softens it; sharpen after the resize
// and lift contrast a touch so the app UI reads crisply at feed size.
// The open scene deliberately uses a screen NOT in STORY. Pointing it at the
// same dashboard the "organized" scene uses made the first two scenes show an
// identical screenshot back to back, which reads as a stutter.
const OPEN_SLUG = 'worth-it'
const phoneSrc = Object.fromEntries(await Promise.all([...STORY, OPEN_SLUG].map(async (s) =>
  [s, dataUri(await sharp(SHOTS[s])
    .resize({ width: PHONE_W, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.9 })
    .linear(1.06, -8)
    .png().toBuffer())])))
const openPhone = phoneSrc[OPEN_SLUG]

const LASSO = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 80' preserveAspectRatio='none'>
  <path d='M100 6 C40 6 8 22 8 40 C8 60 46 74 104 74 C160 74 192 58 192 39 C192 21 158 7 96 7'
    fill='none' stroke='%2365A30D' stroke-width='4.5' stroke-linecap='round'/></svg>`
const lassoUrl = LASSO.replace(/\n\s*/g, ' ').replace(/"/g, "'").replace(/#/g, '%23')

const titleSize = (t) => Math.round((t.length > 40 ? 62 : t.length > 30 ? 68 : 76) * (H / 1350) ** 0.3)

// ── Panel parity ────────────────────────────────────────────────────────────
// The curated store panels (marketing-assets/fb-story/slide) stack
// brand lockup → emoji → headline → blurb above the phone. The animated scenes
// carried only the headline, so they read as a different design. These are the
// panel's own ratios, measured off reel-frames.mjs at 1242 wide and rebuilt
// here from live parts, which is what lets each element animate on its own.
const BRAND_IMG  = Math.round(W * 0.050)
const BRAND_FS   = Math.round(W * 0.033)
const EMOJI_FS   = Math.round(W * 0.060)
const BLURB_FS   = Math.round(W * 0.027)
const BLURB_MAXW = Math.round(W * 0.80)
const BLURB_LH   = 1.45
// Vertical rhythm scales with the frame so the same stack fits 4x5 and 9x16.
const K = H / 1920
const TOP_PAD   = Math.round(H * 0.042)
const GAP_EMOJI = Math.round(30 * K)
const GAP_H1    = Math.round(22 * K)
const GAP_BLURB = Math.round(30 * K)
const GAP_PHONE = Math.round(46 * K)

// Three blurb lines are reserved whether a given card fills them or not, and
// the headline is measured at its LONGEST across the cut: the phone then sits
// at exactly the same height in every scene instead of jumping between cuts.
const BLURB_H = Math.round(3 * BLURB_FS * BLURB_LH)
const H1_H = Math.round(2 * Math.max(...STORY.map((s) => titleSize(LINES[s].join(' ')))) * 1.07)
const PHONE_TOP = TOP_PAD + BRAND_IMG + GAP_EMOJI + EMOJI_FS + GAP_H1 + H1_H + GAP_BLURB + BLURB_H + GAP_PHONE

function markUp(slug) {
  const word = CIRCLE[slug]
  return LINES[slug].map((line) => {
    const i = line.toLowerCase().indexOf(word.toLowerCase())
    if (i < 0) return esc(line)
    return esc(line.slice(0, i)) + `<span class="lasso">` + esc(line.slice(i, i + word.length)) + `</span>` + esc(line.slice(i + word.length))
  }).join('<br>')
}

// Scene start times
const starts = []
let t = OPEN
for (let i = 0; i < STORY.length; i++) { starts.push(t); t += SCENE }
const closeAt = t
const DURATION = closeAt + CLOSE
const TOTAL = Math.round(DURATION * FPS)

const badge = BADGES[TARGET_STORE]
// The open and close scenes carry a brand lockup AND two headline lines, so
// they need a smaller face and a lower phone than the feature scenes — at the
// feature sizing the second line collides with the top of the device.
const fsOpen = Math.round(W * 0.072)
const OPEN_TOP = Math.round(H * 0.075)
const OPEN_PHONE_TOP = Math.round(H * 0.42)
// The closing line is a full sentence pair, far longer than the open's three
// words, so it needs its own smaller size or line two runs past the margins.
const fsClose = Math.round(W * 0.052)

const brandIcon = dataUri(readFileSync(ICON))

const scenes = STORY.map((slug, i) => {
  const c = CARDS.find(x => x.slug === slug)
  const fs = titleSize(LINES[slug].join(' '))
  const at = starts[i]
  // Staggered top-down so the scene assembles in reading order: lockup, emoji,
  // headline, blurb — with the phone sliding up alongside the headline and the
  // chip landing last, once there is something for it to sit on top of.
  return `
  <div class="scene" style="animation-delay:${at}s; animation-duration:${SCENE}s">
    <div class="top">
      <div class="brand" style="animation-delay:${at + 0.05}s"><img src="${brandIcon}"><span>GetGuac</span></div>
      <div class="emoji" style="animation-delay:${at + 0.20}s">${esc(c.e)}</div>
      <h1 style="font-size:${fs}px; animation-delay:${at + 0.34}s">${markUp(slug)}</h1>
      <p class="blurb" style="animation-delay:${at + 0.58}s">${esc(c.blurb)}</p>
    </div>
    <div class="phone" style="animation-delay:${at + 0.30}s"><img src="${phoneSrc[slug]}"></div>
    <div class="chip" style="animation-delay:${at + 1.25}s, ${at + 2.35}s; animation-name:${chipAnim(slug)}, bob">
      <div class="h"><b>${esc(c.e)} ${esc(c.name)}</b><i>${esc(c.tag)}</i></div>
      <div class="big">${esc(c.big)}</div>
      <div class="sub">${esc(c.sub)}</div>
    </div>
  </div>`
}).join('')

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: ${W}px; height: ${H}px; overflow: hidden; position: relative;
         background: #ffffff; font-family: 'Plus Jakarta Sans', sans-serif; }
  .wash { position: absolute; left: 50%; top: ${Math.round(H * 0.14)}px; transform: translateX(-50%);
          width: 128%; height: 66%;
          background: radial-gradient(ellipse at center, rgba(101,163,13,0.09) 0%, rgba(101,163,13,0.03) 46%, rgba(255,255,255,0) 72%); }

  .scene, .open, .close { position: absolute; inset: 0; opacity: 0;
                          animation-name: sceneShow; animation-fill-mode: both; animation-timing-function: linear; }
  @keyframes sceneShow {
    0% { opacity: 0 } ${((FADE / SCENE) * 100).toFixed(1)}% { opacity: 1 }
    ${(100 - (FADE / SCENE) * 100).toFixed(1)}% { opacity: 1 } 100% { opacity: 0 }
  }

  .top { position: absolute; left: 0; right: 0; top: ${TOP_PAD}px; padding: 0 ${Math.round(W * 0.075)}px; text-align: center; }
  h1 { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; line-height: 1.07;
       letter-spacing: -0.035em; color: #15281C;
       animation: headIn 820ms both cubic-bezier(.2,.8,.2,1); }

  /* Panel parity — the lockup, emoji and blurb the store slides carry. Scoped
     to .scene so the open/close cards keep their own larger brand sizing. */
  .scene .brand { animation: fadeUp 620ms both cubic-bezier(.2,.8,.2,1); }
  .scene .brand img { width: ${BRAND_IMG}px; height: ${BRAND_IMG}px; border-radius: ${Math.round(BRAND_IMG * 0.26)}px; }
  .scene .brand span { font-size: ${BRAND_FS}px; letter-spacing: -0.02em; }
  .scene .emoji { font-size: ${EMOJI_FS}px; line-height: 1; margin-top: ${GAP_EMOJI}px;
                  animation: emojiIn 700ms both cubic-bezier(.2,.9,.25,1.2); }
  .scene h1 { margin-top: ${GAP_H1}px; }
  /* Fixed height, not auto: a two-line blurb and a three-line blurb must not
     move the phone underneath them between scenes. */
  .blurb { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 500;
           font-size: ${BLURB_FS}px; line-height: ${BLURB_LH}; color: #56655B;
           margin: ${GAP_BLURB}px auto 0; max-width: ${BLURB_MAXW}px; height: ${BLURB_H}px;
           animation: fadeUp 760ms both cubic-bezier(.2,.8,.2,1); }
  .lasso { position: relative; display: inline-block; padding: 0 .14em;
           background-image: url("data:image/svg+xml,${lassoUrl}");
           background-repeat: no-repeat; background-position: center; background-size: 100% 1.34em; }

  .phone { position: absolute; left: 50%; top: ${PHONE_TOP}px; width: ${PHONE_W}px;
           animation: phoneIn 1080ms both cubic-bezier(.2,.85,.25,1); }
  .phone img { width: ${PHONE_W}px; display: block; border-radius: ${Math.round(W * 0.05)}px;
               filter: drop-shadow(0 38px 58px rgba(20,40,28,0.26)); }

  .chip { position: absolute; left: ${Math.round(W * 0.032)}px; top: ${PHONE_TOP + Math.round(H * 0.30)}px;
          width: ${Math.round(W * 0.36)}px; background: #fff; border-radius: ${Math.round(W * 0.028)}px;
          padding: ${Math.round(W * 0.022)}px ${Math.round(W * 0.024)}px;
          border: 3px solid #65A30D; box-shadow: 0 26px 54px -20px rgba(101,163,13,0.55);
          transform-origin: 20% 0%;
          animation-duration: 920ms, 2800ms; animation-fill-mode: both, both;
          animation-timing-function: cubic-bezier(.2,.9,.25,1.15), ease-in-out;
          animation-iteration-count: 1, infinite; }
  .chip .h { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: ${Math.round(W * 0.009)}px; }
  .chip .h b { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: ${Math.round(W * 0.022)}px; color: #15281C; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chip .h i { font-style: normal; font-size: ${Math.round(W * 0.015)}px; color: #8A988E; white-space: nowrap; flex: 0 0 auto; }
  .chip .big { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: ${Math.round(W * 0.048)}px; letter-spacing: -0.02em; color: #15281C; line-height: 1.08; }
  .chip .sub { font-size: ${Math.round(W * 0.017)}px; color: #4D7C0F; font-weight: 700; margin-top: 5px; line-height: 1.35; }

  /* open + close */
  .brand { display: flex; align-items: center; justify-content: center; gap: ${Math.round(W * 0.016)}px; }
  .brand img { width: ${Math.round(W * 0.088)}px; height: ${Math.round(W * 0.088)}px; border-radius: ${Math.round(W * 0.024)}px; }
  .brand span { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: ${Math.round(W * 0.068)}px; color: #15281C; letter-spacing: -0.025em; }
  .openline { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: ${fsOpen}px;
              line-height: 1.06; letter-spacing: -0.035em; color: #15281C; text-align: center; margin-top: ${Math.round(H * 0.03)}px; }
  .openline em { font-style: normal; color: #4D7C0F; }
  /* the pay-off line, set below the headline so both land on the last frame
     without either shouting over the other */
  .closetag { text-align: center; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700;
              font-size: ${Math.round(W * 0.032)}px; line-height: 1.35; color: #2F6B33;
              margin-top: ${Math.round(H * 0.028)}px; }
  .closesub { text-align: center; font-size: ${Math.round(W * 0.024)}px; color: #7A8A80; margin-top: ${Math.round(H * 0.022)}px; }

  .badge { position: absolute; left: 50%; transform: translateX(-50%); bottom: ${Math.round(H * 0.13)}px;
           display: inline-flex; align-items: center; gap: ${Math.round(W * 0.013)}px;
           background: #0B1410; color: #fff; border-radius: ${Math.round(W * 0.016)}px;
           padding: ${Math.round(W * 0.015)}px ${Math.round(W * 0.026)}px ${Math.round(W * 0.015)}px ${Math.round(W * 0.020)}px;
           box-shadow: 0 18px 34px -12px rgba(0,0,0,0.45);
           animation: badgeIn 600ms ${closeAt + 0.55}s both cubic-bezier(.2,.9,.25,1.1); }
  .badge i { display: block; font-style: normal; font-size: ${Math.round(W * 0.016)}px; opacity: .8; line-height: 1.2; }
  .badge b { display: block; font-size: ${Math.round(W * 0.027)}px; font-weight: 700; line-height: 1.15; }
  .badge .glyphs { display: inline-flex; align-items: center; gap: ${Math.round(W * 0.010)}px; }

  /* Typewriter on the closing line. Width is stepped in ch units so the reveal
     lands roughly per character; the caret is the element's right border,
     blinking a fixed number of times then holding transparent — it types,
     blinks, and leaves the sentence sitting there.
     NB: no backticks in this comment, the whole sheet is a JS template literal. */
  .type { display: inline-block; white-space: nowrap; clip-path: inset(0 100% 0 0); }
  @keyframes typing { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0 0 0) } }
  /* Separate caret element rather than a right border: it sits flush after the
     period, and because the reveal is a clip (not a width animation) the line
     keeps its full width throughout and can never reflow mid-type. */
  .caret { display: inline-block; width: .06em; height: .92em; vertical-align: -.1em;
           background: #4D7C0F; margin-left: .05em; opacity: 0; }
  @keyframes caret { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }

  @keyframes headIn  { from { transform: translateY(-16px) } to { transform: none } }
  @keyframes fadeUp  { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
  @keyframes emojiIn { 0% { opacity: 0; transform: scale(.6) } 70% { opacity: 1; transform: scale(1.12) } 100% { opacity: 1; transform: scale(1) } }
  /* No opacity ramp — the device stays fully opaque and only slides. Fading it
     in left the screenshot looking washed out for a quarter of every scene. */
  @keyframes phoneIn { from { transform: translateX(-50%) translateY(60px) } to { transform: translateX(-50%) translateY(0) } }
  @keyframes badgeIn { from { opacity: 0; transform: translateX(-50%) translateY(24px) } to { opacity: 1; transform: translateX(-50%) translateY(0) } }
  @keyframes swing  { 0% { opacity: 0; transform: rotate(-14deg) translateY(-70px) } 60% { opacity: 1; transform: rotate(4deg) translateY(0) } 100% { opacity: 1; transform: rotate(0) } }
  @keyframes pop    { 0% { opacity: 0; transform: scale(.62) } 65% { opacity: 1; transform: scale(1.07) } 100% { opacity: 1; transform: scale(1) } }
  @keyframes drop   { 0% { opacity: 0; transform: translateY(-190px) } 70% { opacity: 1; transform: translateY(14px) } 100% { opacity: 1; transform: translateY(0) } }
  @keyframes rise   { 0% { opacity: 0; transform: translateY(150px) } 100% { opacity: 1; transform: translateY(0) } }
  @keyframes zoom   { 0% { opacity: 0; transform: scale(1.5) rotate(6deg) } 100% { opacity: 1; transform: scale(1) rotate(0) } }
  @keyframes bob    { 0%,100% { translate: 0 0 } 50% { translate: 0 -14px } }
</style></head><body>
  <div class="wash"></div>

  <div class="open" style="animation-delay:0s; animation-duration:${OPEN}s">
    <div class="top" style="top:${OPEN_TOP}px">
      <div class="brand"><img src="${dataUri(readFileSync(ICON))}"><span>GetGuac</span></div>
      <div class="openline">Your money&rsquo;s<br><span class="lasso">wingman.</span></div>
    </div>
    <div class="phone" style="animation-delay:.2s; top:${OPEN_PHONE_TOP}px"><img src="${openPhone}"></div>
  </div>

  ${scenes}

  <div class="close" style="animation-delay:${closeAt}s; animation-duration:${CLOSE}s">
    <div class="top" style="top:${Math.round(H * 0.19)}px">
      <div class="brand"><img src="${dataUri(readFileSync(ICON))}"><span>GetGuac</span></div>
      <div class="openline" style="font-size:${fsClose}px">Your money&rsquo;s been talking.<br>Finally, <span class="type" style="animation: typing 1.5s steps(21,end) ${closeAt + 0.5}s both"><em>GetGuac is listening.</em></span><span class="caret" style="animation: caret 620ms steps(1,end) ${closeAt + 2.0}s 4 forwards"></span></div>
      <div class="closetag">Keep more of your own money. Get Organized.</div>
      <div class="closesub">Free on iOS, Android &amp; web. No card required.</div>
    </div>
    <div class="badge">${TARGET_STORE === 'all'
      ? `<span class="glyphs">${ALL_GLYPHS.map((k) => BADGES[k].svg.replace(/__S__/g, String(Math.round(W * 0.030)))).join('')}</span>`
      : badge.svg.replace(/__S__/g, String(Math.round(W * 0.034)))}<span><i>${badge.small}</i><b>${badge.big}</b></span></div>
  </div>
</body></html>`

const ffmpeg = ['ffmpeg', 'C:/Users/Narasimha/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe']
  .find(p => { try { execFileSync(p, ['-version'], { stdio: 'ignore' }); return true } catch { return false } })
if (!ffmpeg) throw new Error('ffmpeg not found')

const TMP = resolve(OUT, '_frames')
mkdirSync(OUT, { recursive: true })
rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })

const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)

console.log(`${STORY.length} feature scenes + open + close · ${DURATION.toFixed(1)}s · ${TOTAL} frames`)
for (let i = 0; i < TOTAL; i++) {
  await page.evaluate((ms) => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms } }, (i / FPS) * 1000)
  await page.screenshot({ path: resolve(TMP, `f${String(i).padStart(4, '0')}.png`) })
  if (i % 60 === 0) console.log('  ', i, '/', TOTAL)
}

const outFile = resolve(OUT, `getguac-${TARGET_STORE}-${W}x${H}.mp4`)
execFileSync(ffmpeg, ['-y', '-framerate', String(FPS), '-i', resolve(TMP, 'f%04d.png'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-movflags', '+faststart', outFile], { stdio: 'ignore' })
rmSync(TMP, { recursive: true, force: true })
await b.close()
console.log('✓', outFile)

#!/usr/bin/env node
// =============================================================================
// Animated GuacScore ring — GIF (+ MP4) so the animation survives anywhere a
// "regular image" is all you can post.
// =============================================================================
// The ring fills 0 → 74 while the number counts with it, holds, then eases back
// for a clean loop. Geometry and colours are copied from the real product ring
// in src/components/GuacoScoreCard.jsx (large mode): r=56, stroke=9, round cap,
// rotate(-90), track #e5e7eb, gradient #16a34a → #a8c414 → #f59e0b.
//
// 74 / "Steady Guac" is the same illustrative pair the homepage already
// publishes on the Goals card — reusing it keeps marketing consistent and
// invents no new number.
//
// Output (marketing-assets/guacscore-gif/):
//   guacscore-square.gif / .mp4    1080x1080  — feed posts
//   guacscore-story.gif  / .mp4    1080x1920  — Stories / Reels
//
// GIF is the ask, but Facebook re-encodes uploaded GIFs to video anyway and
// autoplays MP4 more reliably — so both come out of one render.
//
// Usage:
//   node web/scripts/guacscore-gif.mjs           # both sizes
//   node web/scripts/guacscore-gif.mjs square    # just one
// =============================================================================

import { chromium } from 'playwright'
import ffmpeg from '@ffmpeg-installer/ffmpeg'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(__dirname, '..')
const OUT = resolve(WEB, 'marketing-assets', 'guacscore-gif')
const TMP = resolve(WEB, '.gif-tmp')
const ICON = resolve(WEB, '..', 'mobile', 'assets', 'icon', 'icon.png')
const FFMPEG = ffmpeg.path

const SCORE = 74
const GRADE = { emoji: '🙂', label: 'Steady Guac' }

const FPS = 25
const FILL = 30     // frames spent filling the ring
const HOLD = 25     // frames held at full
const EASE = 10     // frames easing back down, so the loop doesn't snap
const TOTAL = FILL + HOLD + EASE

const SIZES = {
  square: { key: 'square', W: 1080, H: 1080, ring: 560, num: 150, head: 62, sub: 34 },
  story:  { key: 'story',  W: 1080, H: 1920, ring: 660, num: 178, head: 74, sub: 38 },
}

const want = process.argv[2]
const targets = want ? [SIZES[want]] : Object.values(SIZES)
if (!targets[0]) throw new Error(`Unknown size "${want}". Use: ${Object.keys(SIZES).join(', ')}`)

const iconUri = `data:image/png;base64,${readFileSync(ICON).toString('base64')}`

// Ring geometry, lifted from GuacoScoreCard.jsx large mode.
const R = 56, STROKE = 9
const C = 2 * Math.PI * R
const SVG = (R + STROKE) * 2 + 4

const easeOut = t => 1 - Math.pow(1 - t, 3)
const easeIn = t => t * t

// progress 0..1 for each frame of the loop
function progressAt(i) {
  if (i < FILL) return easeOut(i / (FILL - 1))
  if (i < FILL + HOLD) return 1
  return 1 - easeIn((i - FILL - HOLD + 1) / EASE)
}

function html(s) {
  const vertical = s.H > s.W
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${s.W}px; height: ${s.H}px; overflow: hidden; position: relative;
    background: #fff; font-family: 'Plus Jakarta Sans', sans-serif;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: ${vertical ? 54 : 34}px; padding: ${vertical ? '0 80px' : '0 60px'};
  }
  .glow {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%);
    width: ${s.ring * 2}px; height: ${s.ring * 2}px; border-radius: 50%;
    background: radial-gradient(circle, rgba(101,163,13,0.16) 0%, rgba(101,163,13,0.06) 45%, rgba(255,255,255,0) 70%);
  }
  .brand { display: flex; align-items: center; gap: 14px; z-index: 1; }
  .brand img { width: 54px; height: 54px; border-radius: 14px; }
  .brand span { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 36px; color: #15281C; letter-spacing: -0.02em; }

  .ringwrap { position: relative; width: ${s.ring}px; height: ${s.ring}px; z-index: 1; }
  .ringwrap svg { width: 100%; height: 100%; display: block; }
  .center {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 2px;
  }
  .num {
    font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800;
    font-size: ${s.num}px; line-height: 1; color: #15281C;
    letter-spacing: -0.04em; font-variant-numeric: tabular-nums;
  }
  .of { font-size: ${Math.round(s.num * 0.19)}px; font-weight: 700; color: #8A988E; letter-spacing: 0.02em; }

  .grade {
    display: inline-flex; align-items: center; gap: 12px; z-index: 1;
    background: #F3F8EA; border: 2px solid rgba(101,163,13,0.35);
    border-radius: 999px; padding: ${vertical ? '18px 36px' : '14px 30px'};
    font-weight: 800; font-size: ${s.sub}px; color: #3F6212;
    opacity: 0; transition: opacity 220ms ease-out;
  }
  h1 {
    font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; z-index: 1;
    font-size: ${s.head}px; letter-spacing: -0.03em; color: #15281C; text-align: center; line-height: 1.08;
  }
  .foot { z-index: 1; font-size: ${Math.round(s.sub * 0.8)}px; font-weight: 700; color: #4D7C0F; }
  .foot span { color: #8A988E; font-weight: 600; }
</style></head><body>
  <div class="glow"></div>
  <div class="brand"><img src="${iconUri}"><span>GetGuac</span></div>
  <div class="ringwrap">
    <svg viewBox="0 0 ${SVG} ${SVG}">
      <defs>
        <linearGradient id="guacoRingGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#16a34a"/>
          <stop offset="0.55" stop-color="#a8c414"/>
          <stop offset="1" stop-color="#f59e0b"/>
        </linearGradient>
      </defs>
      <circle cx="${SVG / 2}" cy="${SVG / 2}" r="${R}" fill="white"/>
      <circle cx="${SVG / 2}" cy="${SVG / 2}" r="${R}" fill="none" stroke="#e5e7eb" stroke-width="${STROKE}"/>
      <circle id="arc" cx="${SVG / 2}" cy="${SVG / 2}" r="${R}" fill="none"
        stroke="url(#guacoRingGrad)" stroke-width="${STROKE}" stroke-linecap="round"
        stroke-dasharray="${C}" stroke-dashoffset="${C}"
        transform="rotate(-90 ${SVG / 2} ${SVG / 2})"/>
    </svg>
    <div class="center">
      <div class="num" id="num">0</div>
      <div class="of">of 100</div>
    </div>
  </div>
  <div class="grade" id="grade">${GRADE.emoji} ${GRADE.label}</div>
  <h1>Every dollar,<br>scored.</h1>
  <div class="foot">getguac.app <span>· Free on iOS, Android &amp; web</span></div>
<script>
  const C = ${C}, SCORE = ${SCORE}
  window.setProgress = (p) => {
    document.getElementById('arc').setAttribute('stroke-dashoffset', String(C * (1 - p)))
    document.getElementById('num').textContent = String(Math.round(SCORE * p))
    // the grade chip only earns its place once the ring is essentially there
    document.getElementById('grade').style.opacity = p > 0.92 ? '1' : '0'
  }
</script>
</body></html>`
}

mkdirSync(OUT, { recursive: true })
const b = await chromium.launch()

for (const s of targets) {
  const dir = resolve(TMP, s.key)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  const p = await b.newPage({ viewport: { width: s.W, height: s.H }, deviceScaleFactor: 1 })
  await p.setContent(html(s), { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(400)

  for (let i = 0; i < TOTAL; i++) {
    await p.evaluate(v => window.setProgress(v), progressAt(i))
    await p.waitForTimeout(16)            // let the chip's opacity transition land
    await p.screenshot({ path: resolve(dir, `f${String(i).padStart(4, '0')}.png`) })
  }
  await p.close()
  console.log(`✓ ${s.key}: ${TOTAL} frames rendered`)

  const pattern = resolve(dir, 'f%04d.png')
  const gif = resolve(OUT, `guacscore-${s.key}.gif`)
  const mp4 = resolve(OUT, `guacscore-${s.key}.mp4`)

  // stats_mode=diff keeps the palette on the pixels that actually move (the
  // arc), instead of spending it on the big flat white field.
  execFileSync(FFMPEG, [
    '-y', '-framerate', String(FPS), '-i', pattern,
    '-vf', `fps=${FPS},split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3`,
    '-loop', '0', gif,
  ], { stdio: ['ignore', 'ignore', 'pipe'] })

  execFileSync(FFMPEG, [
    '-y', '-framerate', String(FPS), '-i', pattern,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
    '-movflags', '+faststart', mp4,
  ], { stdio: ['ignore', 'ignore', 'pipe'] })

  console.log(`✓ ${s.key}: gif + mp4`)
}

await b.close()
rmSync(TMP, { recursive: true, force: true })
console.log('\n→', OUT)

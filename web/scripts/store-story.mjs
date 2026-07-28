// Story video assembled from the finished App Store panels.
//
// The store screenshots in marketing-assets/store-1242x2208 are already the
// designed creative — logo lockup, headline, subhead, CTA pill, device shot and
// a floating callout. Re-drawing that in a Playwright render would drift from
// what the stores actually show, so this script does NOT re-render anything:
// it uses those exact PNGs and only adds motion between them.
//
// 1242x2208 is exactly 9:16, so the panels map to 1080x1920 Reels/Stories with
// no cropping and no letterboxing.
//
//   node scripts/store-story.mjs                     -> default 9-scene cut
//   node scripts/store-story.mjs 00 01 04 05 99      -> pick panels by prefix
//   HOLD=2.6 XF=0.4 node scripts/store-story.mjs     -> pacing
//   RATIO=4x5 node scripts/store-story.mjs           -> 1080x1350 feed crop
//
// Requires ffmpeg (same binary the other ad scripts use).

import { readdirSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { execFileSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(__dirname, '..')
// Default source is the hand-curated cut in fb-story/slide — those panels are
// already in the wanted order and keep the small blurb text under each
// headline. SRC=... to build from any other folder.
const SRC = process.env.SRC
  ? resolve(process.env.SRC)
  : resolve(WEB, 'marketing-assets', 'fb-story', 'slide')
const OUT = resolve(WEB, 'marketing-assets', 'store-story')

const RATIOS = { '9x16': [1080, 1920], '4x5': [1080, 1350], '1x1': [1080, 1080] }
const [W, H] = RATIOS[process.env.RATIO || '9x16'] || RATIOS['9x16']

const HOLD = Number(process.env.HOLD || 2.4)   // seconds a panel is fully visible
const XF   = Number(process.env.XF   || 0.65)  // crossfade length — longer reads calmer
const FPS  = 30

// EXCLUDE=19,13 drops panels by prefix without editing the default list.
const EXCLUDE = (process.env.EXCLUDE || '').split(',').map((s) => s.trim()).filter(Boolean)

// Optional soundtrack. Trimmed to the video and faded at both ends so it never
// ends on a hard cut.
// ⚠️ Supply your own licensed track. Do NOT drop a commercial song in here:
// Meta fingerprints audio and will mute or reject the ad, and it is a
// copyright problem regardless of what the platform does. Meta's Ads Manager
// has a free, cleared music library built in — that is usually the right
// source, and it can be added at upload without touching this file.
const MUSIC = process.env.MUSIC || resolve(WEB, 'marketing-assets', 'audio', 'music.mp3')
const MUSIC_DB = process.env.MUSIC_DB || '-14'   // gain in dB; ads should sit quiet

// Default cut. Not all 20 panels: at ~2.4s each that is a 50-second ad, and
// paid social loses most viewers before 15s. This is a story arc — the problem,
// what it reads, what it finds, what you keep — ending on the outro card.
const DEFAULT = null   // null = every panel found

if (!existsSync(SRC)) throw new Error(`missing panels: ${SRC}`)

// PREFIX picks which set to build from. The CTA-less video panels are written
// as fb-*.png alongside the store set in the same folder, so without this the
// two would be interleaved and every scene would appear twice.
const PREFIX = process.env.PREFIX ?? ''
const all = readdirSync(SRC)
  .filter((f) => f.endsWith('.png') && (PREFIX ? f.startsWith(PREFIX) : true))
  .sort()   // numeric filename prefixes ARE the running order
if (!all.length) throw new Error(`no panels matching prefix "${PREFIX}" in ${SRC}`)

const wanted = process.argv.slice(2)
const picks = (wanted.length ? wanted : (DEFAULT || all.map((f) => f)))
  .map((p) => {
    const hit = all.find((f) => f === p || f.startsWith(`${PREFIX}${p}-`) || f.startsWith(`${p}-`))
    if (!hit) throw new Error(`no panel matching "${p}" in ${SRC}\n  available: ${all.join(', ')}`)
    return hit
  })
  .filter((f) => !EXCLUDE.some((x) => f.startsWith(`${PREFIX}${x}-`) || f.startsWith(`${x}-`) || f.includes(`-${x}.png`)))
  .map((f) => join(SRC, f))
if (!picks.length) throw new Error('every panel was excluded')

mkdirSync(OUT, { recursive: true })

const ffmpegCandidates = ['ffmpeg', 'C:/Users/Narasimha/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe']
const ffmpeg = ffmpegCandidates.find((c) => {
  try { execFileSync(c, ['-version'], { stdio: 'ignore' }); return true } catch { return false }
})
if (!ffmpeg) throw new Error('ffmpeg not found')

// Each still is held HOLD seconds, but a crossfade eats XF from the join, so
// every input must be HOLD+XF long or the last transition runs out of frames.
const inputs = picks.flatMap((p) => ['-loop', '1', '-t', String(HOLD + XF), '-i', p])

// Normalise every panel first: scale to fit, pad to exact canvas, fix SAR.
// force_original_aspect_ratio=decrease + pad means a non-9:16 panel letterboxes
// on brand white instead of being stretched.
// Slow push on every slide so a still never sits dead on screen — this is what
// reads as "animated" when the source is a flat PNG. Upscale first, then
// zoompan, because zoompan on a small source shimmers as it interpolates.
const ZOOM = Number(process.env.ZOOM || 1.06)   // final scale at end of scene
const frames = Math.round((HOLD + XF) * FPS)
const norm = picks.map((_, i) =>
  `[${i}:v]scale=${W * 2}:${H * 2}:force_original_aspect_ratio=decrease,` +
  `pad=${W * 2}:${H * 2}:(ow-iw)/2:(oh-ih)/2:color=white,` +
  `zoompan=z='min(1+(${(ZOOM - 1).toFixed(4)}*on/${frames}),${ZOOM})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
  // trim is NOT optional: zoompan emits d frames for EVERY frame it consumes,
  // and -loop 1 feeds it endlessly, so without this each scene runs for
  // minutes and a 12-slide cut came out at 6m17s instead of 37s.
  `d=${frames}:s=${W}x${H}:fps=${FPS},trim=duration=${(HOLD + XF).toFixed(3)},setpts=PTS-STARTPTS,setsar=1[v${i}]`
).join(';')

// Chain the crossfades. Offset for join i is cumulative visible time so far;
// getting this wrong is what makes a slideshow stutter or freeze at the end.
let chain = ''
let last = 'v0'
for (let i = 1; i < picks.length; i++) {
  const offset = (HOLD * i).toFixed(3)
  const out = i === picks.length - 1 ? 'vout' : `x${i}`
  // fadewhite, not fade. fb-story deliberately dips each scene out to the white
  // ground before the next fades in — a straight crossfade superimposes two
  // headlines mid-transition and reads as a glitch. This matches that.
  chain += `;[${last}][v${i}]xfade=transition=fadewhite:duration=${XF}:offset=${offset}[${out}]`
  last = out
}
if (picks.length === 1) chain = ';[v0]copy[vout]'

const total = (HOLD * picks.length + XF).toFixed(1)
const outFile = resolve(OUT, `store-story-${W}x${H}.mp4`)

process.stdout.write(`${picks.length} panels -> ${total}s @ ${W}x${H}\n`)
picks.forEach((p) => process.stdout.write(`  ${p.split(/[\\/]/).pop()}\n`))

const hasMusic = existsSync(MUSIC)
const dur = Number(total)

const args = ['-y', ...inputs]
if (hasMusic) args.push('-stream_loop', '-1', '-i', MUSIC)   // loop a short track to fit

args.push('-filter_complex', norm + chain, '-map', '[vout]')

if (hasMusic) {
  const audioIdx = picks.length
  args.push(
    '-filter_complex_script', // placeholder replaced below
  )
  args.pop()
  // Trim the track to the video, fade the last 1.2s so it doesn't cut dead,
  // and pull the level down — an ad soundtrack should sit under, not shout.
  args.push('-map', `${audioIdx}:a`,
    '-af', `volume=${MUSIC_DB}dB,afade=t=in:st=0:d=1.0,afade=t=out:st=${(dur - 1.2).toFixed(2)}:d=1.2`,
    '-c:a', 'aac', '-b:a', '128k', '-shortest')
}

args.push(
  // yuv420p + even dimensions: without both, the file plays on a desktop
  // player and shows a black frame on iPhone.
  '-pix_fmt', 'yuv420p',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
  '-movflags', '+faststart',
  '-r', String(FPS),
  outFile,
)

process.stdout.write(hasMusic ? `music: ${MUSIC}\n` : 'music: none (drop a licensed track at marketing-assets/audio/music.mp3)\n')
execFileSync(ffmpeg, args, { stdio: ['ignore', 'ignore', 'pipe'] })

process.stdout.write(`\n✓ ${outFile}\n`)

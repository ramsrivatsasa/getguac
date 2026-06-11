#!/usr/bin/env node
// =============================================================================
// Build the narrated product tour video (public/how-it-works-narrated.mp4).
// =============================================================================
// Per scene: generate TTS narration (Windows SpeechSynthesizer) in the rich,
// warm /how-it-works voice, measure its length, then drive a real browser
// through the live demo account holding each scene for exactly its narration
// duration while logging the recording timestamp. Finally, assemble one audio
// track by placing each clip's PCM at its logged timestamp (deterministic — no
// amix) and mux it onto the captured video so narration and visuals stay synced.
//
//   node web/scripts/make-narrated-tour.mjs
//   BASE_URL=https://getguac.app TTS_VOICE='Microsoft Zira Desktop' node ...
// =============================================================================

import { chromium } from 'playwright'
import { mkdirSync, readdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import ffmpeg from '@ffmpeg-installer/ffmpeg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const PUBLIC = resolve(ROOT, 'public')
const TMP = resolve(ROOT, '.narration-tmp')
const FFMPEG = ffmpeg.path
const BASE = (process.env.BASE_URL || 'https://getguac.app').replace(/\/$/, '')
const EMAIL = process.env.DEMO_EMAIL || 'demo@getguac.app'
const PASSWORD = process.env.DEMO_PASSWORD || 'Guac!Demo2026'
const VOICE = process.env.TTS_VOICE || 'Microsoft David Desktop'

// Narration in the rich, warm /how-it-works voice (condensed for video pacing —
// ~2 sentences/scene). Voice-rule clean: no points/cashback/streak.
const SCENES = [
  { key: 'landing', route: '/', caption: 'Take control of your money', public: true,
    say: "Welcome to GetGuac — your money's wingman. Every receipt you've lost, every fee you didn't notice, every subscription quietly draining your account... GetGuac catches it all, and turns it into clarity." },
  { key: 'receipts', route: '/receipts', caption: 'Snap any receipt',
    say: "Getting receipts in is the easy part. Snap a paper receipt with your phone — even crumpled or faded — or just forward an e-receipt to your free at-getguac-dot-app inbox." },
  { key: 'items', route: '/receipts', clickInto: 'a[href*="/receipts/"]', caption: 'AI reads every line',
    say: "Then the magic. In seconds, Guac A.I. reads the store, the date, the total, and every single line item — each one becoming searchable history. No typing, no spreadsheets." },
  { key: 'dashboard', route: '/dashboard', caption: 'Your GuacScore',
    say: "Here's where it all comes together. Your dashboard rolls everything into your GuacScore — one simple number for how well you're spending — and flags anything unusual at a glance." },
  { key: 'steals', route: '/steals', caption: 'Find a cheaper price',
    say: "Before you buy again, Steals quietly scouts for a cheaper price on the things you already get — so you pay less for the very same item next time." },
  { key: 'returns', route: '/returns', caption: 'Never miss a refund',
    say: "Don't lose money you're owed. GetGuac reads each store's refund window and reminds you before it closes, so a return deadline never quietly slips past you." },
  { key: 'guacwizard', route: '/guacwizard', caption: 'Hunt hidden fees',
    say: "Meet the GuacWizard — honest money guidance that never lectures. It scans your statements for avoidable interest and fees, and nudges you before they bite again." },
  { key: 'bank', route: '/bank', caption: 'Catch every bank fee',
    say: "It reads your bank statements too, catching every interest charge, late fee, and penalty — so you can stop bleeding money to your bank next month." },
  { key: 'bites', route: '/bites', caption: 'Rate what is worth it',
    say: "The hardest question isn't how much you spent — it's whether it was worth it. Tap a quick rating on each purchase, and your GuacScore sharpens as the regrets drop away." },
  { key: 'shopping', route: '/shopping', caption: 'Share a shopping list',
    say: "Your shopping list builds itself from what you actually buy — and you can share the whole thing with family in a single tap." },
  { key: 'reports', route: '/reports', caption: 'Tax-ready reports',
    say: "And when it counts, GetGuac gives you clean, tax-ready reports for business and charity — your whole financial picture, organized and ready." },
  { key: 'guacanomics', route: '/guacanomics', caption: 'Keep more of your money',
    say: "It's your money — GetGuac just helps you keep more of it. It's free, it's private, and it's on your side. Snap your first receipt today." },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── TTS: one WAV per scene via Windows SpeechSynthesizer ────────────────────
function ttsToWav(text, txtPath, wavPath) {
  writeFileSync(txtPath, text, 'utf8')
  const ps = [
    'Add-Type -AssemblyName System.Speech',
    '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer',
    `try { $s.SelectVoice('${VOICE}') } catch {}`,
    '$s.Rate = -1',
    `$t = Get-Content -Raw -Encoding UTF8 -Path '${txtPath.replace(/\\/g, '\\\\')}'`,
    `$s.SetOutputToWaveFile('${wavPath.replace(/\\/g, '\\\\')}')`,
    '$s.Speak($t)',
    '$s.Dispose()',
  ].join('; ')
  execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'ignore' })
}

// Parse a PCM WAV: returns { sampleRate, channels, bits, data:Buffer }.
function readPcm(path) {
  const b = readFileSync(path)
  let i = 12, fmt = null, data = null
  while (i < b.length - 8) {
    const id = b.toString('ascii', i, i + 4)
    const size = b.readUInt32LE(i + 4)
    if (id === 'fmt ') fmt = { channels: b.readUInt16LE(i + 10), sampleRate: b.readUInt32LE(i + 12), bits: b.readUInt16LE(i + 22) }
    if (id === 'data') { data = b.subarray(i + 8, i + 8 + size); break }
    i += 8 + size + (size % 2)
  }
  return { ...fmt, data }
}

function wavDurationSec(path) {
  const { sampleRate, channels, bits, data } = readPcm(path)
  return data.length / (sampleRate * channels * (bits / 8))
}

// Place each scene's mono-16-bit PCM at its startMs into one zero-filled track.
// Clips don't overlap, so direct assignment keeps full volume with no clipping.
function buildMixedWav(scenes, sampleRate, totalSec, outPath) {
  const total = Math.ceil(totalSec * sampleRate)
  const mix = Buffer.alloc(total * 2) // int16 mono
  for (const s of scenes) {
    const { data } = readPcm(resolve(TMP, `${s.key}.wav`))
    const startSample = Math.round((s.startMs / 1000) * sampleRate)
    for (let k = 0; k * 2 + 1 < data.length; k++) {
      const idx = (startSample + k) * 2
      if (idx + 1 >= mix.length) break
      mix.writeInt16LE(data.readInt16LE(k * 2), idx)
    }
  }
  const dataBytes = mix.length
  const buf = Buffer.alloc(44 + dataBytes)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataBytes, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(dataBytes, 40)
  mix.copy(buf, 44)
  writeFileSync(outPath, buf)
}

async function gotoScene(page, scene) {
  await page.goto(`${BASE}${scene.route}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  await sleep(2600)
  // Some scenes (e.g. a receipt's parsed detail) live on a dynamic route — open
  // the first matching link so the scene shows a real record, not a list/404.
  if (scene.clickInto) {
    try {
      const link = page.locator(scene.clickInto).first()
      if (await link.count()) {
        await link.click()
        await page.waitForLoadState('networkidle').catch(() => {})
        await sleep(2400)
      }
    } catch {}
  }
  await page.evaluate(() => { window.scrollTo(0, 1); window.scrollTo(0, 0) })
}

async function showCaption(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById('__tourcap')
    if (!el) {
      el = document.createElement('div')
      el.id = '__tourcap'
      el.style.cssText = 'position:fixed;left:50%;bottom:34px;transform:translateX(-50%);' +
        'z-index:2147483647;background:#059669;color:#fff;font:700 21px/1.25 system-ui,-apple-system,sans-serif;' +
        'padding:13px 26px;border-radius:9999px;box-shadow:0 12px 34px rgba(0,0,0,.28);' +
        'max-width:88vw;text-align:center;letter-spacing:.2px;pointer-events:none'
      document.body.appendChild(el)
    }
    el.textContent = t
  }, text).catch(() => {})
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('input[autocomplete="username"]', EMAIL)
  await page.fill('input[autocomplete="current-password"]', PASSWORD)
  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 45000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ])
  await page.waitForLoadState('networkidle').catch(() => {})
  await sleep(1500)
}

async function main() {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })

  console.log('— narration —')
  for (const s of SCENES) {
    const wav = resolve(TMP, `${s.key}.wav`)
    ttsToWav(s.say, resolve(TMP, `${s.key}.txt`), wav)
    s.dur = wavDurationSec(wav)
    console.log(`  ${s.key}: ${s.dur.toFixed(1)}s`)
  }
  const sampleRate = readPcm(resolve(TMP, `${SCENES[0].key}.wav`)).sampleRate

  console.log('— capture —')
  const size = { width: 540, height: 1170 }
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, recordVideo: { dir: TMP, size } })
  const page = await ctx.newPage()
  const t0 = Date.now()
  const TAIL = 0.7

  const landing = SCENES[0]
  await gotoScene(page, landing)
  await showCaption(page, landing.caption)
  landing.startMs = Date.now() - t0
  await sleep((landing.dur + TAIL) * 1000)

  await login(page)

  for (const s of SCENES.slice(1)) {
    await gotoScene(page, s)
    await showCaption(page, s.caption)
    s.startMs = Date.now() - t0
    await sleep((s.dur + TAIL) * 1000)
    console.log(`  ${s.key} @ ${(s.startMs / 1000).toFixed(1)}s`)
  }
  await sleep(1000)

  await ctx.close()
  await browser.close()

  const webm = resolve(TMP, readdirSync(TMP).filter((f) => f.endsWith('.webm')).sort().reverse()[0])

  console.log('— assemble audio —')
  const last = SCENES[SCENES.length - 1]
  const totalSec = (last.startMs / 1000) + last.dur + 1.2
  const mixed = resolve(TMP, 'narration.wav')
  buildMixedWav(SCENES, sampleRate, totalSec, mixed)

  console.log('— mux —')
  const narrated = resolve(PUBLIC, 'how-it-works-narrated.mp4')
  execFileSync(FFMPEG, [
    '-y', '-i', webm, '-i', mixed,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '23',
    '-c:a', 'aac', '-b:a', '160k',
    narrated,
  ], { stdio: 'inherit' })

  const silent = resolve(PUBLIC, 'how-it-works.mp4')
  execFileSync(FFMPEG, [
    '-y', '-i', webm,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '23', '-an',
    silent,
  ], { stdio: 'inherit' })

  console.log(`✓ ${narrated}`)
  console.log(`✓ ${silent}`)
  rmSync(TMP, { recursive: true, force: true })
}

main().catch((e) => { console.error(e); process.exit(1) })

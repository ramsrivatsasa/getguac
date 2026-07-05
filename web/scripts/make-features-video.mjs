#!/usr/bin/env node
// =============================================================================
// Build a narrated Smashlist + Steals + GuacMoney feature video — LOCAL output.
// =============================================================================
// Same pipeline as make-narrated-tour.mjs (Windows TTS → measure → drive the
// live demo account with Playwright → place PCM at logged timestamps → mux),
// but scoped to the three features and written OUTSIDE the repo so the mp4
// never lands in a deploy (see the downloads/ Vercel size-limit incident).
// Login happens in a throwaway context BEFORE recording starts, so the video
// opens directly on the Smashlist instead of the login form.
//
//   node web/scripts/make-features-video.mjs
//   BASE_URL=https://getguac.app TTS_VOICE='Microsoft Zira Desktop' node ...
//
// Output: <repo-parent>/getguac-videos/smashlist-steals-guacmoney.mp4
//         plus one PNG per scene for a quick visual QA without playing it.
// =============================================================================

import { chromium } from 'playwright'
import { mkdirSync, readdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import ffmpeg from '@ffmpeg-installer/ffmpeg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT = process.env.OUT_DIR || resolve(ROOT, '..', '..', 'getguac-videos')
const TMP = resolve(ROOT, '.features-video-tmp')
const FFMPEG = ffmpeg.path
const BASE = (process.env.BASE_URL || 'https://getguac.app').replace(/\/$/, '')
const EMAIL = process.env.DEMO_EMAIL || 'demo@getguac.app'
const PASSWORD = process.env.DEMO_PASSWORD || 'Guac!Demo2026'
const VOICE = process.env.TTS_VOICE || 'Microsoft David Desktop'

// Voice-rule clean: no points / cashback / streak. GuacMoney is value kept,
// never a redeemable payout.
const SCENES = [
  { key: 'smashlist', route: '/shopping', caption: 'Smashlist — your list writes itself',
    say: "Meet the Smashlist — the shopping list that writes itself. GetGuac has read your receipts, so it knows what you buy and how often — and it queues things up before you run out, grouped by store, with an estimated price on every item. Share the list with family in one tap, and smash items off as they land in your cart." },
  { key: 'steals', route: '/steals', caption: 'Steals — pay less for what you rebuy',
    say: "Before you buy again, Steals makes sure you never overpay. It runs a live shopping search for the exact brand and size you already buy, and lines up today's prices across stores. Spot a better one? That's a Steal — and the savings stay in your pocket." },
  { key: 'guacmoney', route: '/dashboard', caption: 'GuacMoney — 1,000 GM = $1 of value',
    say: "And every win lands on your GuacMoney tally. One hundred GuacMoney for every receipt you capture. One thousand for every dollar that comes back to you — refunds you claim in time, regret purchases you cut. A thousand GuacMoney is one dollar of real value. The money was always yours — GetGuac just helped you keep it." },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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

async function main() {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })
  mkdirSync(OUT, { recursive: true })

  console.log('— narration —')
  for (const s of SCENES) {
    const wav = resolve(TMP, `${s.key}.wav`)
    ttsToWav(s.say, resolve(TMP, `${s.key}.txt`), wav)
    s.dur = wavDurationSec(wav)
    console.log(`  ${s.key}: ${s.dur.toFixed(1)}s`)
  }
  const sampleRate = readPcm(resolve(TMP, `${SCENES[0].key}.wav`)).sampleRate

  const size = { width: 540, height: 1170 }
  const browser = await chromium.launch()

  // Login OFF-CAMERA in a throwaway context, keep the session's storage state.
  console.log('— login (not recorded) —')
  const authCtx = await browser.newContext({ viewport: size })
  const loginPage = await authCtx.newPage()
  await loginPage.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await loginPage.fill('input[autocomplete="username"]', EMAIL)
  await loginPage.fill('input[autocomplete="current-password"]', PASSWORD)
  await Promise.all([
    loginPage.waitForURL('**/dashboard', { timeout: 45000 }).catch(() => {}),
    loginPage.click('button[type="submit"]'),
  ])
  await loginPage.waitForLoadState('networkidle').catch(() => {})
  const storageState = await authCtx.storageState()
  await authCtx.close()

  console.log('— capture —')
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, storageState, recordVideo: { dir: TMP, size } })
  const page = await ctx.newPage()
  const t0 = Date.now()
  const TAIL = 0.7

  for (const s of SCENES) {
    await page.goto(`${BASE}${s.route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})
    await sleep(2600)
    await page.evaluate(() => { window.scrollTo(0, 1); window.scrollTo(0, 0) })
    await showCaption(page, s.caption)
    s.startMs = Date.now() - t0
    await page.screenshot({ path: resolve(OUT, `scene-${s.key}.png`) }).catch(() => {})
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
  const outMp4 = resolve(OUT, 'smashlist-steals-guacmoney.mp4')
  execFileSync(FFMPEG, [
    '-y', '-i', webm, '-i', mixed,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '23',
    '-c:a', 'aac', '-b:a', '160k',
    outMp4,
  ], { stdio: 'inherit' })

  console.log(`✓ ${outMp4}`)
  rmSync(TMP, { recursive: true, force: true })
}

main().catch((e) => { console.error(e); process.exit(1) })

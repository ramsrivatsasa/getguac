// Render the GuacMascot SVG into the two launcher-icon PNGs the
// flutter_launcher_icons toolchain consumes:
//
//   assets/icon/icon.png     — full background + mascot (legacy/iOS)
//   assets/icon/icon-fg.png  — mascot only, transparent bg (Android
//                              adaptive-icon foreground; the
//                              adaptive_icon_background color is set
//                              in pubspec.yaml)
//
// Uses headless Chrome (same browser the PDF-report pipeline calls)
// to rasterize a tiny HTML page that embeds the SVG. No external
// SVG→PNG library needed.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TPL = readFileSync(join(__dirname, 'render-launcher-icon.html'), 'utf8')

const OUT_DIR = join(__dirname, '..', 'assets', 'icon')
mkdirSync(OUT_DIR, { recursive: true })

const CHROME = findBrowser()
if (!CHROME) {
  console.error('No Chrome/Edge/Brave found — set ICON_RENDER_BROWSER to override.')
  process.exit(1)
}
console.log('Using browser:', CHROME)

renderOne({
  htmlContent: TPL.replace('FULL_BG_CLASS', 'bg-full'),
  outPng: join(OUT_DIR, 'icon.png'),
  transparent: false,
})
renderOne({
  htmlContent: TPL.replace('FULL_BG_CLASS', ''),
  outPng: join(OUT_DIR, 'icon-fg.png'),
  transparent: true,
})

function renderOne({ htmlContent, outPng, transparent }) {
  const tmpHtml = join(__dirname, '__tmp_render.html')
  writeFileSync(tmpHtml, htmlContent, 'utf8')
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1024,1024',
    '--hide-scrollbars',
    `--screenshot=${outPng}`,
  ]
  if (transparent) args.push('--default-background-color=00000000')
  args.push(pathToFileURL(tmpHtml).href)
  const r = spawnSync(CHROME, args, { stdio: 'inherit', timeout: 60_000 })
  if (r.error || !existsSync(outPng)) {
    console.error('Render failed:', outPng, r.error?.message)
    process.exit(1)
  }
  console.log('  →', outPng)
}

function findBrowser() {
  const candidates = [
    process.env.ICON_RENDER_BROWSER,
    process.env.GUACSCORE_REPORT_BROWSER,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)
  return candidates.find(p => { try { return existsSync(p) } catch { return false } })
}

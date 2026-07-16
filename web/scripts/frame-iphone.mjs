// Frame app screenshots inside a clean iPhone 17 Pro mockup (black titanium,
// thin uniform bezel, Dynamic Island, rounded screen). Transparent background.
//
// Usage:
//   node scripts/frame-iphone.mjs <inputDir-or-file> [outputDir]
//   - a directory: frames every .png/.jpg inside it
//   - a single file: frames just that one
// Output PNGs go to <outputDir> (default: <input>/framed), named *_iphone.png
//
// The frame math is proportional to the screenshot width, so any iPhone
// screenshot size works (it auto-detects dimensions).

import sharp from 'sharp'
import { readdir, mkdir, stat } from 'fs/promises'
import path from 'path'

async function frameOne(inputPath, outPath) {
  const meta = await sharp(inputPath).metadata()
  const W = meta.width, H = meta.height

  // Proportions tuned to look like a modern iPhone 17 Pro.
  const bezel   = Math.round(W * 0.028)     // thin uniform black bezel
  const screenR = Math.round(W * 0.130)     // screen corner radius (very round)
  const bodyR   = screenR + bezel           // outer body corner radius
  const BW = W + bezel * 2
  const BH = H + bezel * 2

  // Dynamic Island pill
  const diW = Math.round(W * 0.32)
  const diH = Math.round(W * 0.085)
  const diX = Math.round((BW - diW) / 2)
  const diY = bezel + Math.round(H * 0.018)

  // 1) screenshot rounded to the screen radius
  const roundMask = Buffer.from(
    `<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="${screenR}" ry="${screenR}"/></svg>`
  )
  const rounded = await sharp(inputPath)
    .resize(W, H, { fit: 'cover' })
    .composite([{ input: roundMask, blend: 'dest-in' }])
    .png().toBuffer()

  // 2) body: titanium rim gradient with a black inner ring
  const rim = Math.max(2, Math.round(bezel * 0.32))
  const bodySvg = Buffer.from(`
    <svg width="${BW}" height="${BH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0"   stop-color="#4a4a4d"/>
          <stop offset="0.35" stop-color="#141416"/>
          <stop offset="0.7" stop-color="#0a0a0b"/>
          <stop offset="1"   stop-color="#37373a"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${BW}" height="${BH}" rx="${bodyR}" ry="${bodyR}" fill="url(#g)"/>
      <rect x="${rim}" y="${rim}" width="${BW - rim*2}" height="${BH - rim*2}" rx="${bodyR - rim}" ry="${bodyR - rim}" fill="#000000"/>
    </svg>`)

  // 3) Dynamic Island (drawn on TOP of the screenshot)
  const diSvg = Buffer.from(`
    <svg width="${BW}" height="${BH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${diX}" y="${diY}" width="${diW}" height="${diH}" rx="${diH/2}" ry="${diH/2}" fill="#000000"/>
    </svg>`)

  await sharp({ create: { width: BW, height: BH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: bodySvg, top: 0, left: 0 },
      { input: rounded, top: bezel, left: bezel },
      { input: diSvg, top: 0, left: 0 },
    ])
    .png()
    .toFile(outPath)

  return { W, H, BW, BH }
}

async function main() {
  const input = process.argv[2]
  if (!input) { console.error('usage: node scripts/frame-iphone.mjs <dir-or-file> [outDir]'); process.exit(1) }
  const st = await stat(input)
  let files, baseDir
  if (st.isDirectory()) {
    baseDir = input
    // Optional FILTER env var: only frame files whose name contains it
    // (case-insensitive) — e.g. FILTER=iphone to skip iPad screenshots.
    const FILTER = (process.env.FILTER || '').toLowerCase()
    files = (await readdir(input))
      .filter(f => /\.(png|jpg|jpeg)$/i.test(f) && !/_iphone\.png$/i.test(f) && (!FILTER || f.toLowerCase().includes(FILTER)))
      .map(f => path.join(input, f))
  } else {
    baseDir = path.dirname(input)
    files = [input]
  }
  const outDir = process.argv[3] || path.join(baseDir, 'framed')
  await mkdir(outDir, { recursive: true })
  if (!files.length) { console.log('No images found in', input); return }

  for (const f of files) {
    const outName = path.basename(f).replace(/\.(png|jpg|jpeg)$/i, '') + '_iphone.png'
    const outPath = path.join(outDir, outName)
    const r = await frameOne(f, outPath)
    console.log(`framed ${path.basename(f)} (${r.W}x${r.H}) -> ${outName} (${r.BW}x${r.BH})`)
  }
  console.log(`\nDone. ${files.length} image(s) -> ${outDir}`)
}
main().catch(e => { console.error(e); process.exit(1) })

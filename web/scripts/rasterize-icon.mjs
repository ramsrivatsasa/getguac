#!/usr/bin/env node
// Rasterizes web/public/guacwizard.svg into the two PNGs flutter_launcher_icons
// reads: mobile/assets/icon/icon.png (1024×1024 full canvas, brand emerald
// background) and mobile/assets/icon/icon-fg.png (the wizard glyph on a
// transparent background, sized to fit inside Android's adaptive-icon safe zone).
//
// Lives in web/scripts/ so that `import sharp from 'sharp'` resolves against
// web/node_modules. Run from anywhere with: node web/scripts/rasterize-icon.mjs

import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..', '..')

const SVG_PATH = resolve(repo, 'web/public/guacwizard.svg')
const OUT_ICON = resolve(repo, 'mobile/assets/icon/icon.png')
const OUT_FG   = resolve(repo, 'mobile/assets/icon/icon-fg.png')

// Adaptive-icon foreground: Android crops to the inner ~66% of the canvas
// before applying the mask shape. We render the wizard at ~62% of the
// 1024 canvas (≈640 px), centred, on a transparent background.
const SIZE      = 1024
const FG_TARGET = 640
const FG_PAD    = Math.round((SIZE - FG_TARGET) / 2)

const BG_HEX = '#15803d' // adaptive-icon background = brand emerald

async function main() {
  const svg = await readFile(SVG_PATH, 'utf-8')

  // icon.png — full-bleed wizard on brand emerald (legacy launcher icon).
  const wizardLarge = await sharp(Buffer.from(svg))
    .resize(Math.round(SIZE * 0.84), Math.round(SIZE * 0.84), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer()
  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: BG_HEX },
  })
    .composite([{ input: wizardLarge, gravity: 'center' }])
    .png()
    .toFile(OUT_ICON)
  console.log(`[icon] wrote ${OUT_ICON}`)

  // icon-fg.png — wizard glyph only, transparent background, sized into the
  // 66% safe zone for Android adaptive icons.
  const wizardFg = await sharp(Buffer.from(svg))
    .resize(FG_TARGET, FG_TARGET, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer()
  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: wizardFg, left: FG_PAD, top: FG_PAD }])
    .png()
    .toFile(OUT_FG)
  console.log(`[icon-fg] wrote ${OUT_FG}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

#!/usr/bin/env node
// Build the /how-it-works slideshow images from the validated raw captures in
// marketing-assets/screens (produced by capture-tour.mjs + recapture-items.mjs).
// Web (desktop) screenshots only — the matching mobile shots are supplied by
// hand (real device screenshots), not generated here. Clean screenshots, no
// baked-in frames or captions; Slides.jsx draws the framing in CSS.
//
//   node web/scripts/make-howitworks-slides.mjs

import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(__dirname, '..', 'marketing-assets', 'screens')
const OUT = resolve(__dirname, '..', 'public', 'marketing', 'slides', 'v2')
mkdirSync(OUT, { recursive: true })

// key -> NN prefix in screens/{desktop,phone}/NN-key.png
const TOPICS = [
  ['receipts', '02'], ['items', '03'], ['dashboard', '04'], ['steals', '05'],
  ['returns', '06'], ['guacwizard', '07'], ['bank', '08'], ['bites', '09'],
  ['stash', '10'], ['shopping', '11'], ['reports', '12'], ['guacanomics', '13'],
]

for (const [key, nn] of TOPICS) {
  await sharp(resolve(SRC, 'desktop', `${nn}-${key}.png`))
    .resize({ width: 1200 })
    .webp({ quality: 80 })
    .toFile(resolve(OUT, `${key}-web.webp`))
  await sharp(resolve(SRC, 'phone', `${nn}-${key}.png`))
    .resize({ width: 480 })
    .webp({ quality: 82 })
    .toFile(resolve(OUT, `${key}-phone.webp`))
  console.log('slide', key)
}
console.log('done ->', OUT)

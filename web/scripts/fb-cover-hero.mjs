// =============================================================================
// Facebook Page cover built from the live homepage hero.
// =============================================================================
// The old cover was a hand-drawn green banner. This one reuses the actual
// site hero (real Bricolage/Jakarta type + the live HeroScoreCard mockup) so
// the Page matches getguac.app.
//
// Output: marketing-assets/fb/page/cover-1640x624.png (+ -GUIDES variant)
//
// Safe zones encoded below:
//  - Mobile crops the SIDES to the centre ~67.6% → keep content in x 266..1374.
//  - The profile picture overlays the bottom band → keep content above y 452.
// =============================================================================
import { chromium } from 'playwright'
import sharp from 'sharp'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'marketing-assets', 'fb', 'page')
mkdirSync(OUT, { recursive: true })

const W = 1640, H = 624
const SAFE = { x1: 266, x2: 1374 }
const OVERLAP_Y = 452
const SITE = process.env.SITE || 'https://getguac.app'

const CSS = `
  header, nav, footer { display: none !important; }
  .gg-hero ~ * { display: none !important; }
  html, body {
    margin: 0 !important; padding: 0 !important; overflow: hidden !important;
    width: ${W}px !important; height: ${H}px !important;
    background:
      radial-gradient(circle at 6% 22%, rgba(132,204,22,0.16), transparent 42%),
      radial-gradient(circle at 96% 82%, rgba(21,128,61,0.13), transparent 46%),
      #ffffff !important;
  }
  .gg-hero {
    position: fixed !important; top: 0 !important; left: ${SAFE.x1}px !important;
    width: ${SAFE.x2 - SAFE.x1}px !important; max-width: none !important;
    height: ${OVERLAP_Y}px !important;
    margin: 0 !important; padding: 0 !important;
    grid-template-columns: 1.12fr 0.88fr !important;
    gap: 24px !important; align-items: center !important;
  }
  /* Hide the long body paragraph and the two CTA buttons — a cover is a
     billboard, not a landing page. The store badges stay. The :not() keeps
     the short cover tagline injected below from being swept up too. */
  .gg-hero > div:first-child > p:not(#gg-cover-tag) { display: none !important; }
  .gg-hero > div:first-child > div:nth-of-type(2) { display: none !important; }
  .gg-hero .gg-h1 { font-size: 50px !important; margin: 0 0 14px !important; }
  .gg-hero > div:first-child > div:nth-of-type(1) { margin-bottom: 16px !important; }
  .gg-hero > div:first-child > div:nth-of-type(3) { margin-bottom: 14px !important; }
  #gg-cover-tag {
    font-size: 19px; line-height: 1.4; color: #56655B; font-weight: 600;
    margin: 0 0 20px; max-width: 460px;
  }
  /* The card is ~600px tall at full size; the safe band is 452. */
  .gg-hero-visual { transform: scale(0.66); transform-origin: center center; animation: none !important; }
  /* The band under the safe line is where the profile picture lands. Left it
     blank and it reads as an unfinished upload, so it gets a brand wash and a
     right-aligned wordmark — clear of the avatar on both desktop (bottom-left)
     and mobile (bottom-centre). */
  /* Light, not green: the avatar is itself a green gradient and would sink
     into a green band. A pale wash keeps it popping. */
  #gg-cover-foot {
    position: fixed; left: 0; right: 0; top: ${OVERLAP_Y}px; height: ${H - OVERLAP_Y}px;
    background: linear-gradient(180deg, #F6FBEF 0%, #ECF6E0 100%);
    border-top: 2px solid rgba(101,163,13,0.22);
    display: flex; align-items: center; justify-content: flex-end;
    padding-right: ${W - SAFE.x2}px; box-sizing: border-box;
    font-family: var(--font-jakarta), sans-serif; color: #3F6212;
    font-size: 26px; font-weight: 700; letter-spacing: -0.01em;
  }
  #gg-cover-foot span { color: #56655B; font-weight: 600; }
`

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 })
await p.goto(SITE, { waitUntil: 'networkidle', timeout: 60000 })
await p.waitForTimeout(3000)
await p.addStyleTag({ content: CSS })
await p.evaluate(() => {
  const col = document.querySelector('.gg-hero > div:first-child')
  const h1 = col.querySelector('.gg-h1')
  const tag = document.createElement('p')
  tag.id = 'gg-cover-tag'
  tag.textContent = 'Free AI receipt scanner & spending tracker. Snap a receipt, see where every dollar goes.'
  h1.insertAdjacentElement('afterend', tag)

  const foot = document.createElement('div')
  foot.id = 'gg-cover-foot'
  foot.innerHTML = 'getguac.app&nbsp;&nbsp;<span>· Free on iOS, Android &amp; web</span>'
  document.body.appendChild(foot)
})
await p.waitForTimeout(1200)
const shot = await p.screenshot({ clip: { x: 0, y: 0, width: W, height: H } })
await b.close()

const base = sharp(shot).resize(W, H)
await base.clone().png().toFile(resolve(OUT, 'cover-1640x624.png'))
console.log('✓ cover-1640x624.png')

const guides = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
     <rect x="${SAFE.x1}" y="0" width="${SAFE.x2 - SAFE.x1}" height="${H}"
           fill="none" stroke="#f43f5e" stroke-width="4" stroke-dasharray="16 12"/>
     <text x="${SAFE.x1 + 12}" y="30" font-family="sans-serif" font-size="20" font-weight="700" fill="#f43f5e">mobile-safe area</text>
     <line x1="0" y1="${OVERLAP_Y}" x2="${W}" y2="${OVERLAP_Y}" stroke="#38bdf8" stroke-width="4" stroke-dasharray="16 12"/>
     <text x="16" y="${OVERLAP_Y + 30}" font-family="sans-serif" font-size="20" font-weight="700" fill="#38bdf8">profile-picture overlap — keep clear</text>
   </svg>`
)
await base.clone().composite([{ input: guides }]).png().toFile(resolve(OUT, 'cover-1640x624-GUIDES.png'))
console.log('✓ cover-1640x624-GUIDES.png')
console.log('\nDone →', OUT)

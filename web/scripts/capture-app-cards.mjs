/* Captures individual GetGuac app cards as marketing screenshots, straight from
 * the demo account. Add a row to SHOTS to capture another card.
 *
 *   public/home/goals/web-subs.webp       <- the Subscriptions card on /reports
 *   public/home/goals/web-tax.webp        <- the Tax summary card on /reports
 *   public/home/goals/web-categories.webp <- the Spending by category card
 *
 * WHY: web-subs.webp and web-tax.webp were BYTE-IDENTICAL — both were the same
 * "Spending by category" screenshot from the top of Reports. So the
 * subscriptions guide showed a category donut while its alt text promised "the
 * desktop subscriptions screen", and /get-started step 13 promised tax records.
 * Meanwhile /goals/categories.html illustrated categories with the DASHBOARD.
 * Each of those pages now gets the card it actually talks about.
 *
 * 🔑 SIGN-IN GOES THROUGH /dev-signin, NOT THE LOGIN FORM. /api/auth/sign-in
 * makes the word-sum challenge mandatory for the demo account on purpose (its
 * password is public), which is what silently broke every earlier capture
 * script. /dev-signin only answers on localhost, with NODE_ENV != production
 * and GG_DEV_SIGNIN=1:
 *
 *   GG_DEV_SIGNIN=1 GG_DIST_DIR=.next-claude npx next dev -p 3001
 *   node scripts/capture-subscriptions.mjs
 *
 * 🔴 GUARDS ON CONTENT, NOT URL. Marketing screenshots were once shipped from an
 * EMPTY demo account — the URL was right and the page was blank. Each shot must
 * find its own card by heading text AND match a data regex inside that card, or
 * the file is not written and the script exits non-zero.
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, rmSync, statSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'public', 'home', 'goals')
const TMP = resolve(__dirname, '..', '.shot-subs-tmp')
const BASE = (process.env.BASE_URL || 'http://localhost:3001').replace(/\/$/, '')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(TMP, { recursive: true })

// heading:  the card's SectionTitle text, used to locate the .card wrapper
// expect:   proof the card rendered ITS OWN data rather than an empty shell
const SHOTS = [
  { key: 'web-subs',       route: '/reports', heading: 'Subscriptions',        expect: /recurring|\/mo/i, minChars: 220 },
  { key: 'web-tax',        route: '/reports', heading: 'Tax summary',          expect: /\$/,              minChars: 120 },
  { key: 'web-categories', route: '/reports', heading: 'Spending by category', expect: /%|\$/,            minChars: 200 },
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()

const signIn = await page.goto(`${BASE}/dev-signin?next=${encodeURIComponent('/reports')}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
if (signIn && signIn.status() === 404) {
  console.error('FAILED /dev-signin returned 404 — start the dev server with GG_DEV_SIGNIN=1')
  await browser.close()
  process.exit(1)
}
if (/\/login/.test(new URL(page.url()).pathname)) {
  console.error('FAILED bounced to /login — the session cookie did not stick')
  await browser.close()
  process.exit(1)
}

await page.waitForLoadState('networkidle').catch(() => {})
await sleep(6000)                                     // let the report queries settle
// Reports renders progressively; walk the page so every card mounts.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)) }
  window.scrollTo(0, 0)
})
await sleep(2500)

let wrote = 0
for (const shot of SHOTS) {
  const card = page.locator('.card', { hasText: shot.heading }).first()
  if (!(await card.count())) {
    console.error(`FAILED ${shot.key}: no .card containing "${shot.heading}" on ${shot.route}`)
    continue
  }
  await card.scrollIntoViewIfNeeded()
  await sleep(900)

  const text = await card.innerText()
  if (!shot.expect.test(text) || text.length < shot.minChars) {
    console.error(`FAILED ${shot.key}: REFUSED — ${text.length} chars, ${shot.expect} ${shot.expect.test(text) ? 'matched' : 'DID NOT match'}`)
    continue
  }

  const raw = resolve(TMP, `${shot.key}.png`)
  await card.screenshot({ path: raw })
  const dest = resolve(OUT, `${shot.key}.webp`)
  await sharp(raw).resize({ width: 1200 }).webp({ quality: 82 }).toFile(dest)
  const kb = Math.round(statSync(dest).size / 1024)
  console.log(`wrote ${shot.key}.webp  1200px  ${kb} KB  ("${shot.heading}" card, ${text.length} chars)`)
  wrote += 1
}

await browser.close()
rmSync(TMP, { recursive: true, force: true })
console.log(wrote === SHOTS.length ? `\nAll ${wrote} images written to public/home/goals/.` : `\nOnly ${wrote}/${SHOTS.length} written — see the failures above.`)
process.exit(wrote === SHOTS.length ? 0 : 1)

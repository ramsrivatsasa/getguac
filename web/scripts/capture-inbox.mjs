/* Captures the email-inbox surface at web and phone sizes, as
 * public/home/goals/web-inbox.webp and phone-inbox.webp.
 *
 * WHY: /how-email-works and the inbox story had no screenshots. The paired
 * web- and phone- set in public/home/goals covers 19 surfaces and inbox was not one
 * of them, so anything talking about the @getguac.app address had to borrow an
 * unrelated screen.
 *
 * 🔴 GUARDS ON CONTENT, NOT URL. Marketing screenshots were once captured from an
 * EMPTY demo account and shipped -- the URL was right and the page was blank. This
 * refuses to write a file unless the inbox actually rendered messages, and prints
 * what it counted so the numbers can be checked without opening the image.
 *
 * 🔑 WAIT FOR HYDRATION BEFORE FILLING. capture-showcase.mjs uses
 * `waitUntil: 'domcontentloaded'` then fills immediately; on the current login
 * page that fills the inputs before React hydrates, React re-renders from empty
 * state, and the submit button stays disabled forever (30s timeout). Wait for the
 * button to actually be enabled after filling.
 *
 *   node scripts/capture-inbox.mjs
 *   BASE_URL=http://localhost:3001 node scripts/capture-inbox.mjs
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, rmSync, existsSync, statSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'public', 'home', 'goals')
const TMP = resolve(__dirname, '..', '.shot-inbox-tmp')
const BASE = (process.env.BASE_URL || 'https://getguac.app').replace(/\/$/, '')
const EMAIL = process.env.DEMO_EMAIL || 'demo@getguac.app'
const PASSWORD = process.env.DEMO_PASSWORD || 'Guac!Demo2026'
const ROUTE = process.env.INBOX_ROUTE || '/inbox'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(TMP, { recursive: true })

const SIZES = [
  { key: 'web-inbox', width: 1440, height: 900, out: 1440 },
  { key: 'phone-inbox', width: 440, height: 930, out: 440 },
]

const b = await chromium.launch()
let wrote = 0

for (const s of SIZES) {
  const ctx = await b.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: 2 })
  const p = await ctx.newPage()

  await p.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await p.waitForSelector('input[autocomplete="username"]', { state: 'visible' })
  await sleep(900)                                   // let hydration attach handlers
  await p.fill('input[autocomplete="username"]', EMAIL)
  await p.fill('input[autocomplete="current-password"]', PASSWORD)
  await p.waitForFunction(() => {
    const btn = document.querySelector('button[type="submit"]')
    return btn && !btn.disabled
  }, { timeout: 15000 })
  await Promise.all([
    p.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 45000 }).catch(() => {}),
    p.click('button[type="submit"]'),
  ])
  await p.waitForLoadState('networkidle').catch(() => {})

  if (/\/login/.test(new URL(p.url()).pathname)) {
    console.error(`FAILED: still on /login at ${s.width}px - sign-in did not complete.`)
    await ctx.close()
    continue
  }

  await p.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' })
  await sleep(3000)

  const probe = await p.evaluate(() => {
    const txt = document.body.innerText
    return {
      path: location.pathname,
      chars: txt.length,
      empty: /no messages|nothing here|no emails|inbox is empty|no receipts yet/i.test(txt),
      rows: Math.max(
        document.querySelectorAll('li').length,
        document.querySelectorAll('tr').length,
        document.querySelectorAll('article').length,
      ),
    }
  })

  // Refuse rather than ship a blank screen.
  if (probe.empty || probe.chars < 400 || probe.rows === 0) {
    console.error(`REFUSED at ${s.width}px - inbox looks empty: ${JSON.stringify(probe)}`)
    await ctx.close()
    continue
  }

  const raw = resolve(TMP, `${s.key}.png`)
  await p.screenshot({ path: raw })
  const dest = resolve(OUT, `${s.key}.webp`)
  await sharp(raw).resize({ width: s.out }).webp({ quality: 82 }).toFile(dest)
  const kb = Math.round(statSync(dest).size / 1024)
  console.log(`wrote ${s.key}.webp  ${s.out}px wide  ${kb} KB  (path ${probe.path}, ${probe.rows} rows, ${probe.chars} chars)`)
  wrote += 1
  await ctx.close()
}

await b.close()
rmSync(TMP, { recursive: true, force: true })
console.log(wrote === SIZES.length ? `\nAll ${wrote} image(s) written to public/home/goals/.` : `\nOnly ${wrote}/${SIZES.length} written - see the refusals above.`)
process.exit(wrote === SIZES.length ? 0 : 1)

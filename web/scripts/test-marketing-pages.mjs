/* Loads every public marketing page in a real browser and reports what a build
 * cannot see: hydration mismatches, runtime errors, broken images, dead links.
 *
 * A green `next build` proves the modules compile. It does not prove the page
 * runs — an undefined identifier in client code is a RUNTIME error, a hydration
 * mismatch is a runtime error, and a 404 image is invisible to the compiler.
 * Every one of those has shipped to production here.
 *
 *   node scripts/test-marketing-pages.mjs http://127.0.0.1:3100
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://127.0.0.1:3100'

const PAGES = [
  '/', '/how-it-works', '/why-getguac', '/get-started', '/features', '/learn',
  '/security', '/pricing', '/articles', '/calculators', '/faq', '/marketplace',
  '/coupons', '/games', '/join', '/contact', '/about', '/tour', '/download',
  '/privacy', '/terms', '/how-email-works', '/login', '/register',
  '/sitemap.html', '/resources/index.html', '/goals/organize.html',
]

// Third-party ad/analytics chatter, plus the Vercel insights beacon that only
// exists on Vercel's edge. Reported but never fatal — see test-nav-parity.mjs.
const NOISE = /gstatic\.com|googlesyndication|doubleclick|adtrafficquality|googleads|facebook\.net|ampproject|vercel-scripts|_vercel\/insights|va\.vercel|google-analytics/

// React logs hydration failures through console.error, not as a page error, so
// the console is the only place they surface.
const HYDRATION = /hydrat|did not match|Text content does not match|server-rendered HTML/i

// GUARD: prove the server on this port is serving the build we just made.
//
// An orphaned `next start` from an earlier run keeps the port, the new one dies
// on EADDRINUSE, and every request lands on a process whose .next no longer has
// the current chunk hashes. Every page then "fails" with 400s on assets that
// are perfectly fine. That produced two confident, entirely wrong reports
// before this check existed — the same class of bug as the hardcoded port in
// test-static-nav.mjs. Assert it rather than eyeballing the log.
{
  const html = await fetch(BASE + '/').then((r) => r.text()).catch(() => '')
  const chunk = html.match(/\/_next\/static\/chunks\/webpack-[a-z0-9]+\.js/)
  if (!chunk) {
    console.error(`ABORT: no webpack chunk in the HTML at ${BASE} — is anything serving?`)
    process.exit(2)
  }
  const res = await fetch(BASE + chunk[0]).catch(() => null)
  if (!res || res.status !== 200) {
    console.error(`ABORT: ${BASE}${chunk[0]} returned ${res ? res.status : 'nothing'}.`)
    console.error('A STALE SERVER IS HOLDING THIS PORT. Kill it and restart; do not read the results below.')
    process.exit(2)
  }
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const rows = []

for (const p of PAGES) {
  const page = await ctx.newPage()
  const errors = []
  const badRes = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const t = m.text()
    if (/^Failed to load resource/.test(t)) return // no URL in the text; caught below
    errors.push(t)
  })
  page.on('response', (r) => { if (r.status() >= 400) badRes.push(`${r.status()} ${r.url()}`) })

  let status = 0
  try {
    const res = await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 45000 })
    status = res ? res.status() : 0
    await page.waitForTimeout(600)
  } catch (e) {
    errors.push(`navigation: ${e.message}`)
  }

  const info = await page.evaluate(() => ({
    // An <img> that resolved to nothing has naturalWidth 0. This catches a
    // renamed asset that still returns 200 from a catch-all far better than a
    // status check does.
    //
    // An img with NO src attribute is excluded: that is the lightbox pattern
    // the homepage, /join and the goal stories all use — an empty placeholder
    // inside a hidden dialog whose src is set on click. It has never loaded
    // because it has never been asked to.
    brokenImgs: [...document.images]
      .filter((i) => i.complete && i.naturalWidth === 0 && (i.getAttribute('src') || '').trim())
      .map((i) => i.getAttribute('src')),
    imgCount: document.images.length,
    chars: document.body.innerText.replace(/\s+/g, ' ').trim().length,
    h1: (document.querySelector('h1')?.textContent || '').trim().slice(0, 40),
    internalLinks: [...new Set([...document.querySelectorAll('a[href]')]
      .map((a) => a.getAttribute('href'))
      .filter((h) => h && (h.startsWith('/') || h.startsWith('.'))))],
  })).catch(() => ({ brokenImgs: [], imgCount: 0, chars: 0, h1: '', internalLinks: [] }))

  const real = errors.filter((e) => !NOISE.test(e))
  const realRes = badRes.filter((r) => !NOISE.test(r))
  rows.push({ p, status, ...info, errors: real, badRes: realRes,
    hydration: real.filter((e) => HYDRATION.test(e)) })
  await page.close()
}

await browser.close()

let fail = 0
console.log('page'.padEnd(26), 'code imgs bad chars h1  errs')
for (const r of rows) {
  const ok = (r.status === 200 || r.status === 307) && r.errors.length === 0
    && r.badRes.length === 0 && r.brokenImgs.length === 0 && r.chars > 300
  if (!ok) fail++
  console.log(
    (ok ? '  ' : 'X ') + r.p.padEnd(24),
    String(r.status).padEnd(4),
    String(r.imgCount).padEnd(4),
    String(r.brokenImgs.length).padEnd(3),
    String(r.chars).padEnd(5),
    (r.h1 ? 'y' : 'NO').padEnd(3),
    String(r.errors.length))
  if (r.hydration.length) console.log('      HYDRATION:', r.hydration[0].slice(0, 160))
  for (const e of r.errors.filter((x) => !HYDRATION.test(x)).slice(0, 3)) console.log('      err:', e.slice(0, 160))
  for (const b of r.badRes.slice(0, 4)) console.log('      res:', b)
  for (const b of r.brokenImgs.slice(0, 4)) console.log('      img:', b)
}

// Every internal href seen anywhere, checked once.
const targets = [...new Set(rows.flatMap((r) => r.internalLinks))]
  .filter((h) => !h.startsWith('#'))
  .map((h) => h.split('#')[0])
  .filter(Boolean)
const dead = []
for (const t of [...new Set(targets)]) {
  const res = await fetch(BASE + t, { redirect: 'manual' }).catch(() => null)
  if (!res || (res.status >= 400)) dead.push(`${res ? res.status : 'ERR'} ${t}`)
}
console.log(`\n${targets.length} distinct internal links, ${dead.length} dead`)
for (const d of dead) console.log('  X', d)

console.log(fail || dead.length ? `\n${fail} page(s) with problems` : '\nall pages clean')
process.exit(fail || dead.length ? 1 : 0)

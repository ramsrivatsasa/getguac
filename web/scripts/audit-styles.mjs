/* Style-conformance audit across EVERY public page, against the homepage.
 *
 * The homepage is the reference because it is the design everything else is
 * supposed to match, and because it is the page a visitor sees first — anything
 * that looks different after one click reads as a different site.
 *
 * Measures getComputedStyle, not source. Two pages can share a class name and
 * still render differently (a later rule, a different cascade, an inline style),
 * and they can use completely different class names and render identically.
 * Only the computed value settles it.
 *
 * Reports rather than fails on most things: some divergence is legitimate (an
 * article body is meant to be wider than a pricing table). Read the groups,
 * decide, then fix. --strict exits non-zero if any HARD group diverges.
 *
 *   node scripts/audit-styles.mjs http://127.0.0.1:3123
 *   node scripts/audit-styles.mjs http://127.0.0.1:3123 --strict
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://127.0.0.1:3123'
const STRICT = process.argv.includes('--strict')

const REACT_PAGES = [
  '/', '/how-it-works', '/why-getguac', '/get-started', '/features', '/resources',
  '/security', '/pricing', '/articles', '/calculators', '/faq', '/marketplace',
  '/coupons', '/about', '/contact', '/editorial-policy', '/privacy', '/terms',
  '/how-email-works', '/download', '/tour',
]
const STATIC_PAGES = [
  '/sitemap.html', '/resources/index.html', '/resources/calculators.html',
  '/resources/bills-calendar.html', '/resources/marketplace.html',
  '/resources/coupons.html', '/resources/worth-it.html', '/resources/security.html',
  '/resources/guides/budget.html', '/resources/guides/emergency-fund.html',
  '/resources/guides/refund-rights.html', '/resources/guides/subscriptions.html',
  '/goals/organize.html', '/goals/bills.html', '/goals/steals.html', '/goals/security.html',
]

// HARD groups must match the homepage exactly — these are the site's chrome and
// its type scale, the things that make two pages look like one product.
// SOFT groups are reported for judgement.
const PROBES = [
  { key: 'header', hard: true, sel: 'header', props: ['height', 'position', 'borderBottomWidth', 'borderBottomColor'] },
  // The brand TEXT, not the anchor wrapping it. On the React pages the anchor
  // is a flex box holding an emoji span and a text span, so measuring the
  // anchor reported the inherited body font and told us nothing.
  { key: 'brand', hard: true, sel: 'header a[href="/"] span:last-child, header a.brand, header a.logo', props: ['fontFamily', 'fontSize', 'fontWeight', 'color'] },
  { key: 'navlink', hard: true, sel: '.ggnav a:not(.btn):not(.btn-primary)', props: ['fontFamily', 'fontSize', 'fontWeight', 'color'] },
  // letterSpacing is measured RELATIVE to the element's own font-size. The
  // headings are fluid (clamp), so the absolute px value differs on every page
  // by design; -0.055em is the same tracking whether the h1 renders at 68px or
  // at 30px. Comparing the px value flagged 9 "variants" that were one setting.
  { key: 'h1', hard: true, sel: 'main h1, h1', props: ['fontFamily', 'fontWeight', 'trackingEm'] },
  { key: 'h2', hard: true, sel: 'main h2, h2', props: ['fontFamily', 'fontWeight', 'trackingEm'] },
  { key: 'body', hard: true, sel: 'main p', props: ['fontFamily'] },
  { key: 'cta', hard: true, sel: 'header .ggcta', props: ['fontSize', 'fontWeight', 'borderTopLeftRadius', 'paddingTop', 'paddingLeft', 'backgroundColor', 'color'] },
  { key: 'footer', hard: false, sel: 'footer', props: ['borderTopWidth', 'backgroundColor'] },
  { key: 'container', hard: false, sel: 'header > div, header .wrap', props: ['maxWidth', 'paddingLeft', 'paddingRight'] },
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })

async function measure(p) {
  const page = await ctx.newPage()
  // Wait for the nav to actually exist, not for a fixed number of milliseconds.
  // The static pages build their whole body client-side from goal-story.js /
  // resource-page.js, and their stylesheet lands with it — measuring on a timer
  // caught one of them mid-render and reported a phantom h2 variant on one run
  // in three. A flaky audit is worse than no audit: it trains you to re-run
  // until it goes green.
  try {
    await page.goto(BASE + p, { waitUntil: 'load', timeout: 40000 })
    await page.waitForSelector('.ggnav', { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(400)
  } catch { await page.close(); return null }
  // Task 3, measured rather than eyeballed: does page content begin on the
  // same vertical line as the logo, and end on the same line as the CTA?
  // ABSOLUTE positions, not offsets within the page. Where the logo sits and
  // where the CTA ends define the content band, and a visitor clicking between
  // pages sees any change in it as the layout shifting under them. Measuring a
  // page against its OWN logo cannot detect that — every page is aligned with
  // itself. At 1280px wide this found the React shell putting the logo at
  // x=78 against the homepage's x=50, on all 20 of its pages.
  const align = await page.evaluate(() => {
    const logo = document.querySelector('header a[href="/"], header a.brand, header a.logo')
    const cta = document.querySelector('header .ggcta')
    if (!logo || !cta) return null
    const L = logo.getBoundingClientRect(), C = cta.getBoundingClientRect()
    return { logoX: Math.round(L.left), ctaRight: Math.round(C.right), band: Math.round(C.right - L.left) }
  }).catch(() => null)

  const out = await page.evaluate((PROBES) => {
    // next/font hashes the family name on React pages while the static pages
    // name the family literally. Same typeface, different string.
    const fam = (v) => String(v).split(',')[0].replace(/["']/g, '')
      .replace(/^__/, '').replace(/_[0-9a-f]{4,}$/, '').replace(/_/g, ' ').trim()
    const r = {}
    for (const probe of PROBES) {
      const el = document.querySelector(probe.sel)
      if (!el) { r[probe.key] = null; continue }
      const cs = getComputedStyle(el)
      const em = (v) => {
        const px = parseFloat(v), size = parseFloat(cs.fontSize)
        return Number.isFinite(px) && size ? `${(px / size).toFixed(3)}em` : String(v)
      }
      r[probe.key] = Object.fromEntries(probe.props.map((k) => {
        if (k === 'fontFamily') return [k, fam(cs[k])]
        if (k === 'trackingEm') return [k, em(cs.letterSpacing)]
        return [k, cs[k]]
      }))
    }
    return r
  }, PROBES)
  await page.close()
  return { ...out, __align: align }
}

const ref = await measure('/')
if (!ref) { console.error('could not load the homepage'); process.exit(2) }

const results = []
for (const p of [...REACT_PAGES.slice(1), ...STATIC_PAGES]) {
  const m = await measure(p)
  results.push({ p, m, kind: p.endsWith('.html') ? 'static' : 'react' })
}
await browser.close()

let hardFails = 0
for (const probe of PROBES) {
  const want = ref[probe.key]
  const missing = []
  const diffs = new Map()
  for (const r of results) {
    if (!r.m) { missing.push(`${r.p} (did not load)`); continue }
    const got = r.m[probe.key]
    if (!got) { missing.push(r.p); continue }
    if (!want) continue
    const changed = Object.keys(want).filter((k) => want[k] !== got[k])
    if (!changed.length) continue
    const sig = changed.map((k) => `${k}: ${want[k]} -> ${got[k]}`).join(', ')
    if (!diffs.has(sig)) diffs.set(sig, [])
    diffs.get(sig).push(r.p)
  }
  const tag = probe.hard ? 'HARD' : 'soft'
  if (!want) { console.log(`?  ${probe.key} [${tag}] — not present on the homepage, skipped`); continue }
  if (!diffs.size && !missing.length) { console.log(`   ${probe.key} [${tag}] — all ${results.length} pages match`); continue }
  console.log(`${probe.hard && diffs.size ? 'X' : ' '}  ${probe.key} [${tag}] — ${diffs.size} variant(s), ${missing.length} page(s) without the element`)
  console.log(`      homepage: ${JSON.stringify(want)}`)
  for (const [sig, pages] of diffs) {
    console.log(`      * ${sig}`)
    console.log(`        ${pages.length} page(s): ${pages.slice(0, 6).join(' ')}${pages.length > 6 ? ` +${pages.length - 6} more` : ''}`)
  }
  if (missing.length) console.log(`      no element: ${missing.slice(0, 8).join(' ')}${missing.length > 8 ? ` +${missing.length - 8}` : ''}`)
  if (probe.hard && diffs.size) hardFails++
}

// The content band, in absolute page coordinates. HARD: every page must open
// with its logo on the same vertical line and its CTA ending on the same one,
// or the chrome visibly shifts as you click between pages.
const aligns = new Map()
for (const r of [{ p: '/', m: ref }, ...results]) {
  const a = r.m && r.m.__align
  if (!a) continue
  const sig = `logo x=${a.logoX}  cta right=${a.ctaRight}  band ${a.band}px`
  if (!aligns.has(sig)) aligns.set(sig, [])
  aligns.get(sig).push(r.p)
}
const bandBad = aligns.size > 1
if (bandBad) hardFails++
console.log(`${bandBad ? 'X' : ' '}  content band [HARD] — ${aligns.size} variant(s)`)
for (const [sig, pages] of [...aligns].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`      * ${sig.padEnd(42)} ${pages.length}: ${pages.slice(0, 5).join(' ')}${pages.length > 5 ? ` +${pages.length - 5}` : ''}`)
}

console.log(`\n${results.length + 1} pages measured. ${hardFails} HARD group(s) diverge.`)
process.exit(STRICT && hardFails ? 1 : 0)

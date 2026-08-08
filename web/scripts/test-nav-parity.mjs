/* Proves the three navs RESOLVE to the same thing, not just that they were
 * generated from the same file.
 *
 * test-static-nav.mjs already asserts the 33 static pages carry the right links.
 * It says nothing about the React header or the homepage, and it says nothing
 * about styling — which is where the drift actually was. The link lists matched
 * for weeks while the caret was ▼ at 9px on React pages and ▾ at 11px
 * everywhere else, and the dropdown card had different padding, radius and
 * hover colours on each surface.
 *
 * So: open the homepage, a React marketing page and a static page in one
 * browser and diff getComputedStyle() on the same elements. A green build
 * cannot catch any of this; only a browser can.
 *
 *   node scripts/test-nav-parity.mjs http://127.0.0.1:3100
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://127.0.0.1:3100'

// One of each kind of surface. /how-it-works is a plain MarketingShell page,
// /goals/organize.html is generated from gg-nav.js, / is homepage-source.html.
const SURFACES = [
  { name: 'home   (homepage-source.html)', url: '/' },
  { name: 'react  (MarketingShell)', url: '/how-it-works' },
  { name: 'static (gg-nav.js)', url: '/goals/organize.html' },
]

// The properties that were actually drifting. Colour and font come out of
// getComputedStyle already resolved, so a hex written differently in two files
// still compares equal — which is the point.
const LINK_PROPS = ['color', 'fontSize', 'fontWeight', 'fontFamily', 'textDecorationLine']
const CARET_PROPS = ['fontSize', 'fontStyle', 'opacity', 'color']
const CARD_PROPS = ['minWidth', 'backgroundColor', 'borderTopWidth', 'borderTopColor', 'borderTopLeftRadius', 'paddingTop', 'rowGap']
const ITEM_PROPS = ['paddingTop', 'paddingLeft', 'borderTopLeftRadius', 'fontSize', 'fontWeight', 'whiteSpace']

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const seen = []

for (const s of SURFACES) {
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message)))
  // "Failed to load resource: ... 404" arrives on the console WITHOUT the URL,
  // so it can neither be attributed nor filtered. Take the URL from the
  // response instead and drop the useless console twin.
  page.on('console', (m) => {
    if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errors.push(m.text())
  })
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push(`${res.status()} ${res.url()}`)
  })
  await page.goto(BASE + s.url, { waitUntil: 'networkidle' })

  const data = await page.evaluate(({ LINK_PROPS, CARET_PROPS, CARD_PROPS, ITEM_PROPS }) => {
    const pick = (el, props) => el
      ? Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]]))
      : null
    const header = document.querySelector('header')
    const nav = header && header.querySelector('.ggnav')
    if (!nav) return { missing: true }
    const top = nav.querySelector('.ggdd-top')
    const card = nav.querySelector('.ggdd-card')

    // next/font gives the React pages a hashed family name
    // (__Plus_Jakarta_Sans_14db65) while the static pages name the family
    // literally. Same typeface, different string, so compare the readable name.
    const family = (v) => String(v).split(',')[0].replace(/["']/g, '')
      .replace(/^__/, '').replace(/_[0-9a-f]{4,}$/, '').replace(/_/g, ' ').trim()

    // Sign in and Get started live OUTSIDE .ggnav on React pages —
    // MarketingAuthButtons owns them, because a signed-in visitor gets Sign out
    // / Dashboard there instead. Scan the whole header so the comparison sees
    // the row a visitor actually sees rather than the markup's inner half.
    const cta = [...header.querySelectorAll('a')]
      .filter((a) => /^(get started|start free)/i.test(a.textContent.trim()))[0]
    const outside = [...header.querySelectorAll('a')]
      .filter((a) => !nav.contains(a) && /^sign in$/i.test(a.textContent.trim()))
      .map((a) => a.textContent.trim())
    return {
      // Labels in order, caret stripped — the order bug, restated as data.
      tops: [...nav.querySelectorAll(':scope > .ggdd > .ggdd-top, :scope > a:not(.btn):not(.btn-primary)')]
        .map((a) => a.textContent.replace(/[▼▾]/g, '').trim()).concat(outside),
      cta: cta ? { href: cta.getAttribute('href'), label: cta.textContent.trim() } : null,
      dropdownLinks: [...nav.querySelectorAll('.ggdd-card a')].map((a) => a.getAttribute('href')),
      caretGlyph: nav.querySelector('.ggdd-caret')?.textContent || null,
      link: { ...pick(top, LINK_PROPS), fontFamily: family(getComputedStyle(top).fontFamily) },
      caret: pick(nav.querySelector('.ggdd-caret'), CARET_PROPS),
      card: pick(card, CARD_PROPS),
      item: pick(card?.querySelector('a'), ITEM_PROPS),
      // Does the hover menu actually open? A menu that renders but never
      // becomes visible is the same bug as a missing menu.
      opensOnHover: null,
    }
  }, { LINK_PROPS, CARET_PROPS, CARD_PROPS, ITEM_PROPS })

  if (!data.missing) {
    await page.hover('.ggdd-top')
    await page.waitForTimeout(250)
    data.opensOnHover = await page.evaluate(() => {
      const m = document.querySelector('.ggdd-menu')
      const cs = getComputedStyle(m)
      return cs.visibility === 'visible' && Number(cs.opacity) > 0.9
    })
  }
  seen.push({ ...s, ...data, errors })
  await page.close()
}
await browser.close()

const [ref, ...rest] = seen
let fail = 0
const cmp = (label, get) => {
  const a = JSON.stringify(get(ref))
  const bad = rest.filter((r) => JSON.stringify(get(r)) !== a)
  if (bad.length) {
    fail++
    console.log(`X ${label}`)
    for (const r of seen) console.log(`      ${r.name.padEnd(28)} ${JSON.stringify(get(r))}`)
  } else {
    console.log(`  ${label.padEnd(24)} ${a}`)
  }
}

// Ad and analytics tags produce console noise we neither cause nor control
// (blocked beacons, third-party CSP reports). Reported, never fatal — otherwise
// the signal that matters, a hydration mismatch, gets drowned and the test gets
// ignored. Anything from our own code still fails.
// _vercel/insights is injected by @vercel/analytics and only exists on Vercel's
// edge — running `next start` locally always 404s it. Environment, not a defect.
const THIRD_PARTY = /gstatic\.com|googlesyndication|doubleclick|adtrafficquality|googleads|facebook\.net|ampproject|vercel-scripts|_vercel\/insights/

for (const r of seen) {
  if (r.missing) { fail++; console.log(`X ${r.name}: no .ggnav on the page at all`) }
  const ours = r.errors.filter((e) => !THIRD_PARTY.test(e))
  const theirs = r.errors.length - ours.length
  if (ours.length) { fail++; console.log(`X ${r.name}: ${ours.length} page errors -> ${JSON.stringify(ours.slice(0, 2))}`) }
  if (theirs) console.log(`  ${r.name}: ${theirs} third-party console error(s), ignored`)
}

cmp('top-level labels', (r) => r.tops)
cmp('get-started CTA', (r) => r.cta)
cmp('dropdown link hrefs', (r) => r.dropdownLinks)
cmp('caret glyph', (r) => r.caretGlyph)
cmp('top link style', (r) => r.link)
cmp('caret style', (r) => r.caret)
cmp('dropdown card style', (r) => r.card)
cmp('dropdown item style', (r) => r.item)
cmp('opens on hover', (r) => r.opensOnHover)

console.log(fail ? `\n${fail} difference(s) between surfaces` : '\nall surfaces identical')
process.exit(fail ? 1 : 0)

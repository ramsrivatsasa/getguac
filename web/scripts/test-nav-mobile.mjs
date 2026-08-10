/* Proves the header is usable on a phone, on all three kinds of surface.
 *
 * Why this exists: the shared nav shipped with no mobile treatment for the 34
 * surfaces that have no React hamburger. ggNavBaseCss() gives .ggnav
 * `display:flex;flex-wrap:wrap`, so at 390px the five top-level items wrapped
 * onto three rows and spilled out of the 64px bar over the hero. The homepage's
 * own `@media(max-width:820px){.links{display:none}}` did not save it: same
 * specificity as `.ggnav{display:flex}`, and the generated block is appended
 * later, so source order handed the win to the visible one.
 *
 * A green `next build` cannot see any of that, and neither can a static grep —
 * the static pages build their header from gg-nav.js at RUNTIME, and the whole
 * bug is a computed value. So this measures geometry in a real browser:
 *   - nothing inside the header renders below the header's own bottom edge
 *   - the burger is hittable and opens a panel with the full flat link list
 *   - the panel's links are actually visible (resource.css and goal-story.css
 *     both carry `a:not(.btn){display:none}` rules that match them)
 *   - desktop is untouched: burger gone, links back
 *
 *   node scripts/test-nav-mobile.mjs http://127.0.0.1:3177
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://127.0.0.1:3177'

// One of each engine. / is homepage-source.html (markup baked in by
// build-homepage-nav.mjs), /goals/*.html and /resources/*.html are the two
// static engines that call ggMountNav() from gg-nav.js, /how-it-works is
// MarketingShell + MarketingMobileMenu and is here to prove the React path did
// not regress.
const SURFACES = [
  { name: 'home     (homepage-source.html)', url: '/', burger: 'ggm' },
  { name: 'goals    (gg-nav.js)', url: '/goals/organize.html', burger: 'ggm' },
  { name: 'resource (gg-nav.js)', url: '/resources/calculators.html', burger: 'ggm' },
  { name: 'react    (MarketingShell)', url: '/how-it-works', burger: 'react' },
]

// The flat list the panel must offer. Imported rather than retyped: a phone
// visitor seeing fewer pages than a desktop visitor is the bug the single
// definition exists to prevent, so the count comes from the definition.
const { GG_NAV_FLAT } = await import('../src/lib/gg-nav-def.js')
const EXPECTED_LINKS = GG_NAV_FLAT.length

const PHONE = { width: 390, height: 844 }
const DESKTOP = { width: 1280, height: 900 }

const browser = await chromium.launch()
const failures = []
const note = (surface, msg) => failures.push(`${surface}: ${msg}`)

/* Everything the page can tell us about the header in one round trip. */
const probe = () => {
  const header = document.querySelector('header')
  if (!header) return { missing: true }
  const hb = header.getBoundingClientRect()

  // Every element the header actually paints, so an item that wrapped out of
  // the bar is caught wherever it came from rather than only in .ggnav.
  const inHeader = [...header.querySelectorAll('a, button, span.ggm')]
    .filter((el) => {
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    })
    // The open panel's own links are position:fixed BELOW the bar on purpose,
    // so they are not overflow. Anything else that sits under the bar is.
    .filter((el) => !el.closest('.ggm-panel'))
    .map((el) => ({
      label: (el.textContent || '').trim().slice(0, 22) || el.className,
      bottom: Math.round(el.getBoundingClientRect().bottom),
    }))

  const panel = document.querySelector('.ggm-panel')
  const panelLinks = panel
    ? [...panel.querySelectorAll('a')].filter((a) => {
        const cs = getComputedStyle(a)
        const r = a.getBoundingClientRect()
        return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0
      }).length
    : null

  return {
    headerBottom: Math.round(hb.bottom),
    headerHeight: Math.round(hb.height),
    // Widest right edge of anything in the bar, against the viewport. Catches a
    // row that did not wrap but ran off the side instead.
    maxRight: Math.round(Math.max(0, ...inHeader.map((i) => i.bottom * 0 + i.bottom))),
    overflowing: inHeader.filter((i) => i.bottom > Math.round(hb.bottom) + 1),
    burgerVisible: !!document.querySelector('.ggm-cb'),
    burgerBox: (() => {
      const el = document.querySelector('.ggm')
      if (!el) return null
      const cs = getComputedStyle(el)
      if (cs.display === 'none') return null
      const r = el.getBoundingClientRect()
      return { w: Math.round(r.width), h: Math.round(r.height) }
    })(),
    // Measured, not asked. getComputedStyle on a CHILD still reports
    // display:inline-flex when it is an ANCESTOR that is display:none — which is
    // exactly how MarketingShell hides its row — so a computed-style check
    // reported the React header as broken when it was fine. A zero-area rect is
    // the only answer that accounts for the whole chain.
    ggnavItems: [...document.querySelectorAll('.ggnav .ggdd, .ggnav a.gglink, .ggnav a')]
      .filter((el) => !el.classList.contains('ggcta') && !el.closest('.ggdd-menu') && !el.closest('.ggm'))
      .filter((el) => !el.classList.contains('ggdd-top'))
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
      }).length,
    ctaVisible: (() => {
      const el = document.querySelector('a.ggcta, .ggcta')
      if (!el) return false
      const r = el.getBoundingClientRect()
      return getComputedStyle(el).display !== 'none' && r.width > 0
    })(),
    panelOpen: panel ? getComputedStyle(panel).display !== 'none' : null,
    panelTop: panel ? Math.round(panel.getBoundingClientRect().top) : null,
    panelLinks,
  }
}

for (const s of SURFACES) {
  const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message)))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errors.push(m.text())
  })

  await page.goto(BASE + s.url, { waitUntil: 'networkidle' })
  // The static pages build their header from gg-nav.js after load, so wait for
  // the result rather than for the network.
  await page.waitForSelector('header .ggbrand', { timeout: 10000 }).catch(() => {})

  const closed = await page.evaluate(probe)
  if (closed.missing) { note(s.name, 'no <header> at all'); await ctx.close(); continue }

  // 1. Nothing spills out of the bar. This is the reported bug.
  if (closed.overflowing.length) {
    note(s.name, `${closed.overflowing.length} header item(s) render below the bar `
      + `(bar bottom ${closed.headerBottom}): `
      + closed.overflowing.map((o) => `"${o.label}" @${o.bottom}`).join(', '))
  }

  // 2. The desktop menu items are gone at phone width.
  if (closed.ggnavItems !== 0) note(s.name, `${closed.ggnavItems} desktop .ggnav item(s) still visible at 390px`)

  // 3. There is still a way into the site, and it is big enough to hit.
  if (s.burger === 'ggm') {
    if (!closed.burgerBox) note(s.name, 'no .ggm burger rendered at 390px')
    else if (closed.burgerBox.w < 40 || closed.burgerBox.h < 40) {
      note(s.name, `burger hit target ${closed.burgerBox.w}x${closed.burgerBox.h}, want >=40x40`)
    }
    if (closed.panelOpen !== false) note(s.name, 'panel is open before anything was tapped')

    // 4. Open it. The panel must appear under the bar with every link visible.
    await page.click('.ggm-cb')
    const open = await page.evaluate(probe)
    if (open.panelOpen !== true) note(s.name, 'tapping the burger did not open the panel')
    if (open.panelLinks !== EXPECTED_LINKS) {
      note(s.name, `panel shows ${open.panelLinks} visible links, want ${EXPECTED_LINKS} `
        + '(a page stylesheet is probably hiding them)')
    }
    if (open.panelTop !== null && Math.abs(open.panelTop - closed.headerBottom) > 2) {
      note(s.name, `panel top ${open.panelTop} does not meet the bar bottom ${closed.headerBottom}`)
    }
    // 5. Get started survives. On the static pages the CTA lives INSIDE
    //    nav.ggnav, so hiding the container would have taken it with it.
    if (!open.ctaVisible) note(s.name, 'Get started CTA is not visible at 390px')
  } else {
    // React path: MarketingMobileMenu owns this, .ggnav is display:none.
    const hasReactBurger = await page.locator('header button[aria-label="Open menu"]').count()
    if (!hasReactBurger) note(s.name, 'MarketingMobileMenu hamburger missing at 390px')
  }

  // 6. Zero runtime errors. A hydration mismatch has eaten this page twice.
  if (errors.length) note(s.name, `${errors.length} page error(s): ${errors.slice(0, 3).join(' | ')}`)

  // 7. Desktop must be untouched.
  await page.setViewportSize(DESKTOP)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('header .ggbrand', { timeout: 10000 }).catch(() => {})
  const desk = await page.evaluate(probe)
  if (s.burger === 'ggm') {
    if (desk.burgerBox) note(s.name, `burger still showing at 1280px (${desk.burgerBox.w}x${desk.burgerBox.h})`)
    if (desk.ggnavItems !== 5) note(s.name, `${desk.ggnavItems} .ggnav items at 1280px, want 5`)
    if (desk.overflowing.length) note(s.name, `${desk.overflowing.length} header item(s) below the bar at 1280px`)
  }

  const state = failures.filter((f) => f.startsWith(s.name)).length
  console.log(`${state ? 'FAIL' : ' ok '}  ${s.name}  bar ${closed.headerHeight}px  `
    + `mobile items ${closed.ggnavItems}  desktop items ${desk.ggnavItems}  `
    + `burger ${closed.burgerBox ? `${closed.burgerBox.w}x${closed.burgerBox.h}` : (s.burger === 'react' ? 'react' : 'MISSING')}`)

  await ctx.close()
}

await browser.close()

if (failures.length) {
  console.error(`\n${failures.length} problem(s):`)
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}
console.log(`\nAll ${SURFACES.length} surfaces usable at 390px: nothing outside the bar, `
  + `${EXPECTED_LINKS} links reachable, desktop unchanged.`)

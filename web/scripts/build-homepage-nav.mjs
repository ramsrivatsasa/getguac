/* Writes the standard menu into src/app/homepage-source.html.
 *
 * The homepage cannot just load gg-nav.js the way the static pages do: page.jsx
 * pulls out the <style> and <body>, hands the markup to React via
 * dangerouslySetInnerHTML, and only the FIRST <script> is extracted and run —
 * a script tag inside injected HTML never executes. So the homepage needs the
 * menu as literal markup. Generating it here, from the same GG_NAV array the
 * 32 static pages use, keeps that markup from drifting into a fourth nav.
 *
 * Run after editing src/lib/gg-nav-def.js:  node scripts/build-homepage-nav.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ggMenuHtml, ggNavCss } from '../src/lib/gg-nav-def.js'

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PAGE = path.join(WEB, 'src', 'app', 'homepage-source.html')

// Imported straight from the definition. This used to load the GENERATED
// public/gg-nav.js in a vm sandbox with a fake `document`, which meant the
// homepage silently depended on build-gg-nav.mjs having been run first — run
// them out of order and the homepage was built from a stale nav.
const menu = ggMenuHtml()

// The homepage ships its own .site-head/.links CSS, written before the shared
// nav existed: a 72px bar with 13.5px/600 links in pill-shaped hover targets.
// MarketingShell renders every OTHER marketing page at 64px with 14.5px/500
// links and no pill. Side by side the two headers read as different sites, so
// these overrides pull the homepage onto the shell's values. They live here,
// appended to the generated block, so they cannot drift from ggNavCss() and so
// nothing edits homepage-source.html's original stylesheet by hand.
// What is left after ggNavCss() took over the shared tokens. Height, link
// type, dropdown metrics, the brand and the CTA all come from the definition
// now and were deleted from here — they were a second copy of the same numbers,
// which is how the homepage ended up as the only page with a pill CTA.
//
// These three rules are genuinely homepage-only: its .links stylesheet predates
// the shared nav and draws pill-shaped hover targets, which nothing else has.
const ALIGN_TO_SHELL = `
.site-head .wrap.nav{gap:18px}
.links{gap:18px}
.links a{padding:0;border-radius:0}
.links a:hover{background:transparent;color:#15281C}
.links .ggdd-card a{padding:9px 12px;border-radius:10px}
.links .ggdd-card a:hover{background:#F1F8EE;color:#15281C}
`

// 'inline': the homepage has no hamburger either, so like the static pages it
// keeps the links below the breakpoint and drops only the hover menus.
const css = ggNavCss('inline') + ALIGN_TO_SHELL

let html = fs.readFileSync(PAGE, 'utf8')

const between = (src, marker, body) => {
  const re = new RegExp(`(<!-- ${marker} START -->)[\\s\\S]*?(<!-- ${marker} END -->)`)
  if (!re.test(src)) throw new Error(`homepage-source.html is missing the ${marker} markers`)
  return src.replace(re, `$1${body}$2`)
}
const betweenCss = (src, marker, body) => {
  const re = new RegExp(`(/\\* ${marker} START \\*/)[\\s\\S]*?(/\\* ${marker} END \\*/)`)
  if (!re.test(src)) throw new Error(`homepage-source.html is missing the ${marker} CSS markers`)
  return src.replace(re, `$1${body}$2`)
}

html = between(html, 'GG_NAV', menu)
html = betweenCss(html, 'GG_NAV_CSS', css)
fs.writeFileSync(PAGE, html, 'utf8')

const tops = (menu.match(/class="ggdd-top"/g) || []).length
const links = (menu.match(/<a /g) || []).length
console.log(`homepage nav rebuilt: ${tops} dropdowns, ${links} links, ${css.length} bytes of css`)

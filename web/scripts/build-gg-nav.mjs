/* Generates web/public/gg-nav.js from web/src/lib/gg-nav-def.js.
 *
 * gg-nav.js used to be a hand-maintained second copy of the nav — same array,
 * same HTML builders, same stylesheet, "kept in step with" MarketingShell.jsx by
 * nothing but a comment saying so. It wasn't: the two stylesheets had drifted to
 * different carets, different dropdown padding and different hover colours.
 *
 * So the array and the builders now live in ONE file and this script bakes their
 * OUTPUT into gg-nav.js. Note it emits the finished HTML and CSS strings rather
 * than re-implementing ggMenuHtml() in browser syntax — a re-implementation is
 * exactly the thing that drifted, and the static pages only ever call the
 * functions, never the array.
 *
 * The output is plain ES5-ish browser script, not a module: build-standalone-
 * pages.ps1 concatenates it ahead of goal-story.js / resource-nav.js and inlines
 * the lot into a <script> tag in each page.
 *
 *   node scripts/build-gg-nav.mjs && pwsh scripts/build-standalone-pages.ps1
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ggNavHtml, ggFooterHtml, ggNavCss, GG_NAV, GG_FOOTER_LINKS, GG_CTA } from '../src/lib/gg-nav-def.js'

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(WEB, 'public', 'gg-nav.js')

// The static pages have no hamburger, so they keep the links and drop only the
// hover menus below 900px. See ggNavCss() for why this is the one thing that
// legitimately differs from the React shell.
const css = ggNavCss('inline')

const banner = `/* GENERATED FILE — DO NOT EDIT.
 *
 * Source: web/src/lib/gg-nav-def.js
 * Rebuild: node scripts/build-gg-nav.mjs && pwsh scripts/build-standalone-pages.ps1
 *
 * Hand-editing this file puts the static pages back out of step with the React
 * header and the homepage, which is the bug the single definition exists to
 * kill. Edit gg-nav-def.js instead.
 *
 * The links are absolute on purpose. These pages are served from /goals/*.html
 * and /resources/**, so /how-it-works has to resolve the same from every depth;
 * the old relative-prefix scheme is what left 31 pages pointing at .html files
 * that had become real routes.
 */`

const body = `${banner}
var GG_NAV_HTML = ${JSON.stringify(ggNavHtml())};
var GG_FOOTER_HTML = ${JSON.stringify(ggFooterHtml())};
var GG_NAV_CSS = ${JSON.stringify(css)};

/* Inner HTML for \`.wrap.nav\`. Both static page engines use that same container,
 * so one builder serves the goals pages and the resources pages alike. */
function ggNavHtml() { return GG_NAV_HTML; }
function ggFooterHtml() { return GG_FOOTER_HTML; }
function ggNavCss() { return GG_NAV_CSS; }

function ggNavStyles() {
  if (document.getElementById('gg-nav-style')) return;
  var el = document.createElement('style');
  el.id = 'gg-nav-style';
  el.textContent = GG_NAV_CSS;
  document.head.appendChild(el);
}

/* Replace whatever nav a page shipped with the standard one. Safe to call more
 * than once and safe to call before the page body exists — it no-ops rather
 * than throwing, so a page that renders its shell asynchronously can call it
 * again after rendering. */
function ggMountNav() {
  ggNavStyles();
  var bar = document.querySelector('.wrap.nav');
  if (bar && !bar.querySelector('.ggnav')) bar.innerHTML = GG_NAV_HTML;
  var footerLinks = document.querySelector('.footer span:last-child');
  if (footerLinks && !footerLinks.dataset.ggFooter) {
    footerLinks.dataset.ggFooter = '1';
    footerLinks.innerHTML = GG_FOOTER_HTML;
  }
}
`

fs.writeFileSync(OUT, body, 'utf8')

const tops = GG_NAV.length
const links = (ggNavHtml().match(/<a /g) || []).length
console.log(`public/gg-nav.js rebuilt: ${tops} top-level items, ${links} links `
  + `(cta ${GG_CTA.href}), ${GG_FOOTER_LINKS.length} footer links, ${css.length} bytes of css`)

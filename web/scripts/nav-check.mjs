/* Fails if any generated nav output is stale against src/lib/gg-nav-def.js.
 *
 * The definition is the single place to edit, but nothing FORCED anyone to
 * regenerate — and that gap is not hypothetical. `26a9b68` fixed links in the
 * generated HTML and never touched the sources, so source and output silently
 * disagreed and re-running the generator would have reverted production's fix.
 * This turns that silence into a failed check.
 *
 * It regenerates in memory and compares; it never writes. Run `npm run nav` to
 * fix a failure.
 *
 *   node scripts/nav-check.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ggNavHtml, ggFooterHtml, ggMenuHtml, ggNavCss } from '../src/lib/gg-nav-def.js'

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (...p) => fs.readFileSync(path.join(WEB, ...p), 'utf8')

const problems = []

// 1. public/gg-nav.js — the script the 33 static pages load. Compare the three
//    baked-in strings rather than the whole file, so the banner comment and the
//    helper functions are free to be reformatted without tripping this.
const navJs = read('public', 'gg-nav.js')
const baked = (varName) => {
  const m = navJs.match(new RegExp('var ' + varName + ' = (".*?");\\r?\\n'))
  return m ? JSON.parse(m[1]) : null
}
const expectInline = ggNavCss('inline')
if (baked('GG_NAV_HTML') !== ggNavHtml()) problems.push('public/gg-nav.js: GG_NAV_HTML is stale')
if (baked('GG_FOOTER_HTML') !== ggFooterHtml()) problems.push('public/gg-nav.js: GG_FOOTER_HTML is stale')
if (baked('GG_NAV_CSS') !== expectInline) problems.push('public/gg-nav.js: GG_NAV_CSS is stale')

// 2. src/app/homepage-source.html — markup and CSS between the markers.
const home = read('src', 'app', 'homepage-source.html')
const between = (src, re, label) => {
  const m = src.match(re)
  if (!m) { problems.push(`homepage-source.html: missing the ${label} markers`); return null }
  return m[1]
}
const homeMenu = between(home, /<!-- GG_NAV START -->([\s\S]*?)<!-- GG_NAV END -->/, 'GG_NAV')
const homeCss = between(home, /\/\* GG_NAV_CSS START \*\/([\s\S]*?)\/\* GG_NAV_CSS END \*\//, 'GG_NAV_CSS')
if (homeMenu !== null && homeMenu !== ggMenuHtml()) {
  problems.push('src/app/homepage-source.html: the GG_NAV markup is stale')
}
// The homepage block is ggNavCss('inline') plus the homepage-only ALIGN_TO_SHELL
// rules appended by build-homepage-nav.mjs, so check the prefix, not equality.
if (homeCss !== null && !homeCss.startsWith(expectInline)) {
  problems.push('src/app/homepage-source.html: the GG_NAV_CSS block is stale')
}

// 3. The 33 static pages carry gg-nav.js inlined by build-standalone-pages.ps1,
//    so a fresh gg-nav.js that was never inlined is its own kind of stale.
const pages = [
  ...fs.readdirSync(path.join(WEB, 'public', 'goals')).filter((f) => f.endsWith('.html')).map((f) => ['public', 'goals', f]),
  ...fs.readdirSync(path.join(WEB, 'public', 'resources')).filter((f) => f.endsWith('.html')).map((f) => ['public', 'resources', f]),
  ...fs.readdirSync(path.join(WEB, 'public', 'resources', 'guides')).filter((f) => f.endsWith('.html')).map((f) => ['public', 'resources', 'guides', f]),
  ['public', 'sitemap.html'],
]
// A short, distinctive slice of the current CSS. A full-string compare would
// fail on the pages' own escaping, and a class-name grep would pass on a page
// that still carries last month's rules for that class.
const probe = expectInline.slice(expectInline.indexOf('.ggright'), expectInline.indexOf('.ggright') + 40)
const stalePages = pages.filter((p) => !read(...p).includes(probe))
if (probe && stalePages.length) {
  problems.push(`${stalePages.length} of ${pages.length} static pages do not carry the current nav CSS `
    + `(first: ${stalePages[0].join('/')})`)
}

if (problems.length) {
  console.error('Nav outputs are STALE against src/lib/gg-nav-def.js:\n')
  for (const p of problems) console.error('  - ' + p)
  console.error('\nFix: npm run nav')
  process.exit(1)
}
console.log(`nav outputs current: gg-nav.js, homepage-source.html and ${pages.length} static pages `
  + 'all match src/lib/gg-nav-def.js')

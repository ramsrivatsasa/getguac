/* Browser test for the regenerated static pages.
 *
 * These pages are client-rendered — goal-story.js / resource-page.js build the
 * body from a template at runtime — so grepping the HTML proves nothing. The
 * last attempt at this change stripped the h1 and a third of the content from
 * 21 goals pages and a static check would not have caught it. So: load every
 * page in a real browser, and assert both that the new nav mounted AND that the
 * page content survived.
 */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.argv[2]
// Port 0 = let the OS assign a free one. A hardcoded port silently handed this
// test to an orphaned server from an earlier run that was serving stale files,
// and it reported 32 confident failures against content I was not looking at.
let PORT = 0

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }

// Assets (images, css) live in the real public tree; only the regenerated pages
// live in ROOT. Falling back means image 404s in the report are real broken
// links rather than an artifact of the scratch dir being partial.
const FALLBACK = 'C:/Money/getguac/web/public'
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  let file = path.join(ROOT, url)
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(FALLBACK, url)
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})
server.on('error', (e) => { console.error('SERVER FAILED TO BIND:', e.message); process.exit(2) })
await new Promise((r) => server.listen(PORT, '127.0.0.1', r))
PORT = server.address().port
console.log(`serving ${ROOT} on 127.0.0.1:${PORT}\n`)

// Derived from the definition, not typed. This was a literal five-label array and
// went stale the moment "Share GetGuac" was added — the nav was right and the
// test was wrong, which is the least useful way for a suite to fail. Same lesson
// as the hardcoded port that once made this file report a confident 0/32.
const { GG_NAV } = await import('../src/lib/gg-nav-def.js')
const EXPECTED_TOP = GG_NAV.map((n) => n.label)
const pages = [
  ...fs.readdirSync(path.join(ROOT, 'goals')).filter((f) => f.endsWith('.html')).map((f) => `/goals/${f}`),
  ...fs.readdirSync(path.join(ROOT, 'resources')).filter((f) => f.endsWith('.html')).map((f) => `/resources/${f}`),
  ...fs.readdirSync(path.join(ROOT, 'resources/guides')).filter((f) => f.endsWith('.html')).map((f) => `/resources/guides/${f}`),
  '/sitemap.html',
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const results = []

for (const p of pages) {
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(`http://127.0.0.1:${PORT}${p}`, { waitUntil: 'networkidle' })

  const r = await page.evaluate(() => {
    const nav = document.querySelector('.ggnav')
    const tops = nav ? [...nav.querySelectorAll(':scope > .ggdd > .ggdd-top, :scope > a:not(.btn)')]
      .map((a) => a.textContent.replace('▾', '').trim()) : []
    const dropdownLinks = nav ? nav.querySelectorAll('.ggdd-card a').length : 0
    const h1 = document.querySelector('h1')
    return {
      hasNav: !!nav,
      tops,
      dropdownLinks,
      cta: !!document.querySelector('.ggnav a.btn'),
      styleTag: !!document.getElementById('gg-nav-style'),
      h1: h1 ? h1.textContent.trim().slice(0, 60) : null,
      bodyChars: document.body.innerText.replace(/\s+/g, ' ').trim().length,
      staleLinks: [...document.querySelectorAll('a[href]')]
        .map((a) => a.getAttribute('href'))
        .filter((h) => /\.\.\/|how-it-works\.html|index\.html/.test(h)),
      ggDefined: typeof ggNavHtml,
      headerHTML: (document.querySelector('header')?.outerHTML || 'NONE').slice(0, 200),
    }
  })
  results.push({ page: p, ...r, errors })
  await page.close()
}

await browser.close()
server.close()

let fail = 0
console.log('page'.padEnd(42), 'nav', 'tops', 'dd', 'h1', 'chars', 'stale', 'err')
for (const r of results) {
  const topsOk = EXPECTED_TOP.every((t) => r.tops.includes(t))
  // sitemap.html is an index OF the static files, so relative .html links in its
  // body are the point, not drift. Its nav still has to be the standard one.
  const staleOk = r.page === '/sitemap.html' ? true : r.staleLinks.length === 0
  const ok = r.hasNav && topsOk && r.cta && r.styleTag && r.h1 && r.bodyChars > 900
    && staleOk && r.errors.length === 0
  if (!ok) fail++
  console.log(
    (ok ? '  ' : 'X ') + r.page.padEnd(40),
    String(r.hasNav).padEnd(5),
    String(r.tops.length).padEnd(4),
    String(r.dropdownLinks).padEnd(3),
    (r.h1 ? 'y' : 'NO').padEnd(3),
    String(r.bodyChars).padEnd(6),
    String(r.staleLinks.length).padEnd(5),
    String(r.errors.length))
  if (!ok) {
    if (!r.hasNav) {
      console.log('      typeof ggNavHtml =', r.ggDefined)
      console.log('      header =', r.headerHTML)
    }
    if (!topsOk) console.log('      tops =', JSON.stringify(r.tops))
    if (r.staleLinks.length) console.log('      stale =', JSON.stringify(r.staleLinks.slice(0, 6)))
    if (r.errors.length) console.log('      errors =', JSON.stringify(r.errors.slice(0, 3)))
  }
}
console.log(`\n${results.length - fail}/${results.length} pages passed`)
process.exit(fail ? 1 : 0)

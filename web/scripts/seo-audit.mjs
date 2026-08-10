/* Whole-site SEO audit. Reports, ranked; fails only on the things that are
 * unambiguously wrong.
 *
 * WHY A SCRIPT AND NOT A CHECKLIST. The canonical bug (6 sitemap URLs telling
 * Google they were duplicates of the homepage) survived weeks of work on these
 * pages because nothing was looking at the rendered <head> across the whole site
 * at once. Spot-checking three pages proves nothing about the other forty.
 *
 * WHAT IT CHECKS, per page: status, title (presence/length/uniqueness),
 * description (presence/length/uniqueness), self-canonical, robots, exactly one
 * h1, Open Graph, JSON-LD, lang, and image alt coverage. Across pages: duplicate
 * titles and descriptions, and pages that are indexable but absent from the
 * sitemap.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: guess at keywords or content quality. Those
 * are judgement calls, and a script that pretends otherwise produces confident
 * nonsense.
 *
 *   node scripts/seo-audit.mjs                       (production)
 *   node scripts/seo-audit.mjs http://localhost:3001
 *   node scripts/seo-audit.mjs --strict              (exit 1 on any HARD issue)
 */
const args = process.argv.slice(2)
const BASE = (args.find((a) => a.startsWith('http')) || 'https://getguac.app').replace(/\/$/, '')
const STRICT = args.includes('--strict')

// The static .html pages under public/resources are real content (calculators,
// bills calendar, four guides) and are NOT in the sitemap. They are audited too,
// because "not submitted" is itself one of the findings.
const EXTRA = [
  '/share',
  '/resources/index.html', '/resources/calculators.html', '/resources/bills-calendar.html',
  '/resources/marketplace.html', '/resources/coupons.html', '/resources/worth-it.html',
  '/resources/security.html',
  '/resources/guides/budget.html', '/resources/guides/emergency-fund.html',
  '/resources/guides/refund-rights.html', '/resources/guides/subscriptions.html',
  '/goals/organize.html', '/sitemap.html',
]

const norm = (p) => { const s = (p || '').replace(/\/+$/, ''); return s === '' ? '/' : s }
const attr = (html, re) => (html.match(re) || [])[1] || null
const one = (html, name) => attr(html, new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]+content="([^"]*)"`, 'i'))

const sitemapXml = await (await fetch(`${BASE}/sitemap.xml`)).text()
const sitemapPaths = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => norm(new URL(m[1]).pathname))
const sitemapSet = new Set(sitemapPaths)

// Audit the sitemap plus the extras, de-duplicated. Article detail pages are
// sampled rather than all 28 — they share one template, so page 1 and page 2
// failing identically tells us nothing page 1 did not.
const articlePages = sitemapPaths.filter((p) => p.startsWith('/articles/'))
const sampled = articlePages.slice(0, 3)
const targets = [...new Set([...sitemapPaths.filter((p) => !p.startsWith('/articles/')), ...sampled, ...EXTRA])]

const rows = []
for (const path of targets) {
  const res = await fetch(BASE + path, { redirect: 'follow' })
  const html = await res.text()
  const title = attr(html, /<title>([^<]*)<\/title>/i)
  const desc = one(html, 'description')
  const can = attr(html, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i)
  const robots = one(html, 'robots') || ''
  const h1s = (html.match(/<h1[\s>]/gi) || []).length
  const imgs = (html.match(/<img\b[^>]*>/gi) || [])
  const noAlt = imgs.filter((t) => !/\balt=/i.test(t)).length
  rows.push({
    path,
    status: res.status,
    title, titleLen: title ? title.length : 0,
    desc, descLen: desc ? desc.length : 0,
    canonical: can ? norm(new URL(can, BASE).pathname) : null,
    selfCanonical: can ? norm(new URL(can, BASE).pathname) === norm(path) : null,
    noindex: /noindex/i.test(robots),
    h1s,
    og: !!one(html, 'og:title'), ogImg: !!one(html, 'og:image'),
    jsonLd: (html.match(/application\/ld\+json/gi) || []).length,
    lang: attr(html, /<html[^>]+lang="([^"]*)"/i),
    imgs: imgs.length, noAlt,
    inSitemap: sitemapSet.has(norm(path)),
  })
}

const hard = []
const soft = []
const push = (list, code, path, detail) => list.push({ code, path, detail })

// ---- per page
for (const r of rows) {
  if (r.status >= 400) { push(hard, 'HTTP', r.path, `HTTP ${r.status}`); continue }
  if (r.selfCanonical === false) push(hard, 'CANONICAL', r.path, `points at ${r.canonical}`)
  if (!r.title) push(hard, 'NO-TITLE', r.path, '')
  if (!r.desc) push(hard, 'NO-DESC', r.path, '')
  if (r.h1s === 0) push(hard, 'NO-H1', r.path, '')
  if (r.h1s > 1) push(soft, 'MULTI-H1', r.path, `${r.h1s} h1 elements`)
  if (r.noindex && r.inSitemap) push(hard, 'NOINDEX-IN-SITEMAP', r.path, 'crawl requested, indexing refused')
  if (r.title && r.titleLen > 65) push(soft, 'TITLE-LONG', r.path, `${r.titleLen} chars, truncates in SERPs`)
  if (r.title && r.titleLen < 20) push(soft, 'TITLE-SHORT', r.path, `${r.titleLen} chars`)
  if (r.desc && (r.descLen < 70 || r.descLen > 165)) push(soft, 'DESC-LEN', r.path, `${r.descLen} chars (aim 70-165)`)
  if (!r.og) push(soft, 'NO-OG', r.path, 'no og:title, poor link previews')
  if (!r.ogImg) push(soft, 'NO-OG-IMAGE', r.path, '')
  if (!r.lang) push(soft, 'NO-LANG', r.path, '')
  if (r.noAlt > 0) push(soft, 'IMG-NO-ALT', r.path, `${r.noAlt} of ${r.imgs} images`)
  if (!r.inSitemap && !r.noindex && r.status === 200) push(soft, 'NOT-IN-SITEMAP', r.path, 'indexable but never submitted')
}

// ---- cross page
const byTitle = {}
const byDesc = {}
for (const r of rows) {
  if (r.title) (byTitle[r.title] = byTitle[r.title] || []).push(r.path)
  if (r.desc) (byDesc[r.desc] = byDesc[r.desc] || []).push(r.path)
}
for (const [t, ps] of Object.entries(byTitle)) {
  if (ps.length > 1) push(hard, 'DUPLICATE-TITLE', ps.join(', '), `"${t.slice(0, 50)}"`)
}
for (const [, ps] of Object.entries(byDesc)) {
  if (ps.length > 1) push(soft, 'DUPLICATE-DESC', ps.join(', '), '')
}

// ---- report
const group = (list) => list.reduce((a, i) => { (a[i.code] = a[i.code] || []).push(i); return a }, {})
console.log(`SEO audit of ${BASE} — ${rows.length} page(s)`)
console.log(`  sitemap URLs: ${sitemapPaths.length} (${articlePages.length} article pages, ${sampled.length} sampled)`)
console.log(`  reachable   : ${rows.filter((r) => r.status < 400).length}/${rows.length}`)
console.log(`  noindex     : ${rows.filter((r) => r.noindex).length}`)

for (const [label, list] of [['MUST FIX', hard], ['WORTH FIXING', soft]]) {
  console.log(`\n=== ${label} — ${list.length} finding(s) ===`)
  if (!list.length) { console.log('  none'); continue }
  for (const [code, items] of Object.entries(group(list))) {
    console.log(`  ${code}  (${items.length})`)
    for (const i of items.slice(0, 12)) console.log(`     ${i.path}${i.detail ? '  — ' + i.detail : ''}`)
    if (items.length > 12) console.log(`     ... and ${items.length - 12} more`)
  }
}

if (STRICT && hard.length) process.exit(1)

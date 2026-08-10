/* Every URL we submit in the sitemap must be self-canonical.
 *
 * WHY THIS EXISTS. Next.js inherits metadata, so `alternates: { canonical: '/' }`
 * on the root layout silently became the canonical of every page that did not
 * override it. Those pages were telling Google "I am a duplicate of the
 * homepage, do not index me" while we were submitting them in the sitemap.
 *
 * Measured on production 2026-08-10, before the fix: 6 of 45 sitemap URLs
 * canonicalised to `/` — /how-it-works, /security, /how-email-works, /download,
 * /privacy, /terms. That is not a subtle ranking nudge, it is an instruction not
 * to index a core page, and nothing in the build or the test suite noticed.
 *
 * A missing canonical is FINE and passes: a page with no tag is self-canonical
 * by default. Only a canonical pointing at a DIFFERENT path fails. That is the
 * safe direction — the bug was never "no tag", it was "the wrong tag".
 *
 *   node scripts/check-canonicals.mjs                      (production)
 *   node scripts/check-canonicals.mjs http://localhost:3001 (local)
 */
const BASE = (process.argv[2] || 'https://getguac.app').replace(/\/$/, '')

const norm = (p) => {
  const s = (p || '').replace(/\/+$/, '')
  return s === '' ? '/' : s
}

const sitemapUrl = `${BASE}/sitemap.xml`
const res = await fetch(sitemapUrl)
if (!res.ok) {
  console.error(`Could not read ${sitemapUrl} (HTTP ${res.status}).`)
  console.error('A sitemap that does not load is a failure, not a pass.')
  process.exit(2)
}
const xml = await res.text()
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
if (!locs.length) {
  console.error(`${sitemapUrl} contained no <loc> entries.`)
  process.exit(2)
}

const wrong = []
const noindexed = []
let missing = 0

for (const loc of locs) {
  // Rewrite the sitemap's absolute production URL onto whatever host we are
  // testing, so this works against localhost without a second code path.
  const path = new URL(loc).pathname
  const html = await (await fetch(BASE + path)).text()
  const can = (html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i) || [])[1]
  const robots = (html.match(/<meta[^>]+name="robots"[^>]+content="([^"]*)"/i) || [])[1] || ''

  if (/noindex/i.test(robots)) noindexed.push(path)
  if (!can) { missing += 1; continue }
  if (norm(new URL(can, BASE).pathname) !== norm(path)) {
    wrong.push({ path, can: norm(new URL(can, BASE).pathname) })
  }
}

console.log(`${locs.length} sitemap URL(s) checked against ${BASE}`)
console.log(`  self-canonical : ${locs.length - wrong.length - missing}`)
console.log(`  no canonical   : ${missing} (allowed - self-canonical by default)`)

// A noindexed URL in the sitemap is a contradictory signal: we are asking for it
// to be crawled and refusing to let it be indexed. Reported, not failed, because
// there are legitimate cases (a thin utility page kept out of the index on
// purpose) — but it should always be deliberate.
if (noindexed.length) {
  console.log(`  ⚠ noindex but submitted in the sitemap: ${noindexed.join(', ')}`)
}

if (wrong.length) {
  console.error(`\n${wrong.length} URL(s) canonicalise somewhere else:`)
  for (const w of wrong) console.error(`  - ${w.path}  ->  ${w.can}`)
  console.error('\nFix: give the page its own `alternates: { canonical: "<its path>" }`.')
  console.error('Do NOT put `alternates` back on the root layout - that is what caused this.')
  process.exit(1)
}
console.log('\nEvery sitemap URL is self-canonical.')

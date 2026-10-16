import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

const base = (process.argv[2] || 'http://127.0.0.1:3002').replace(/\/$/, '')
const get = async path => {
  try { return await fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(120000) }) }
  catch (error) { throw new Error(`GET ${path}: ${error.message}`, {cause:error}) }
}
const records = []
const robots = await (await get('/robots.txt')).text()
const sitemap = await (await get('/sitemap.xml')).text()
const disallowed = [...robots.matchAll(/^Disallow:\s*(\S+)/gmi)].map(m => m[1])
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname)
assert.equal(paths.length, new Set(paths).size, 'duplicate sitemap paths')
for (const path of paths) assert(!disallowed.some(rule => path.startsWith(rule)), `sitemap blocked: ${path}`)
const featurePaths = paths.filter(path => path.startsWith('/features/'))
assert.equal(featurePaths.length, 19, 'all 8 stages + 11 detail guides submitted')
for (const path of featurePaths) {
  const response = await get(path), html = await response.text()
  assert.equal(response.status, 200, path)
  assert(html.includes(`rel="canonical" href="https://getguac.app${path}"`), path)
  assert(!/<meta[^>]*name="(?:robots|googlebot)"[^>]*content="[^"]*noindex/i.test(html), path)
  records.push({ path, status: response.status, indexable: true })
}
for (const path of ['/login', '/register', '/reset-password']) {
  assert(!disallowed.some(rule => path.startsWith(rule)), `${path} must allow noindex discovery`)
  const response = await get(path), html = await response.text()
  assert.equal(response.status, 200, path)
  for (const bot of ['robots', 'googlebot']) assert(new RegExp(`<meta[^>]*name="${bot}"[^>]*content="[^"]*noindex`, 'i').test(html), `${path}: ${bot} noindex`)
  assert(!paths.includes(path), 'auth excluded from sitemap')
  records.push({ path, status: response.status, noindex: true })
}
for (const [path, destination] of [['/learn', '/academy/lessons'], ['/resources', '/academy/lessons'], ['/academy', '/academy/lessons'], ['/plan', '/calculators'], ['/home', '/']]) {
  const response = await get(path)
  assert.equal(response.status, 308, path)
  assert.equal(new URL(response.headers.get('location'), base).pathname, destination, path)
  const target = await get(destination)
  assert.equal(target.status, 200, destination)
  records.push({ path, status: response.status, destination })
}
const member = await get('/dashboard')
const memberHtml = await member.text()
if (member.status === 307) assert.equal(new URL(member.headers.get('location'), base).pathname, '/login')
else {
  assert.equal(member.status, 200)
  assert(/<meta[^>]*http-equiv="refresh"[^>]*content="[^"]*url=\/?login/i.test(memberHtml), 'streamed guest redirect must go to login')
  assert(/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(memberHtml), 'streamed redirect must not be indexed')
}
assert(disallowed.includes('/api/'), 'keep API crawl exclusion')
const output = '.local/indexing-policy-20261015.json'
await mkdir('.local', { recursive: true })
await writeFile(output, JSON.stringify({ checkedAt: new Date().toISOString(), base, sitemapPaths: paths.length, records, memberAuthPreserved: true }, null, 2))
console.log(`PASS ${records.length} feature/auth/redirect checks, sitemap policy and member auth guard`)

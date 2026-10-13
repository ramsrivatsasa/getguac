import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from 'playwright'
import { FEATURE_SEARCH, GROUP_SEARCH, relatedFeatureLinks } from '../src/lib/public-seo.mjs'

const base = process.env.RELEASE_URL || 'http://127.0.0.1:3002'
const paths = ['/', '/features', '/how-it-works', ...Object.keys(GROUP_SEARCH).map(key => `/features/${key}`), ...Object.keys(FEATURE_SEARCH).map(key => `/features/${key}`)]
const rows = []
for (const path of paths) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(120000) })
  assert.equal(response.status, 200, path)
  const html = await response.text()
  assert(!html.includes('Free forever'), `${path}: outdated price claim`);
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]
  const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)/i)?.[1]
  const ogUrl = html.match(/<meta[^>]*property="og:url"[^>]*content="([^"]*)/i)?.[1]
  assert(title?.endsWith(' | GetGuac'), path)
  assert.equal((title.match(/GetGuac/g) || []).length, 1, path)
  assert.equal(new URL(canonical).pathname.replace(/\/$/, '') || '/', path)
  assert.equal(new URL(ogUrl).pathname.replace(/\/$/, '') || '/', path)
  assert(!/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html), path)
  const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(x => JSON.parse(x[1]))
  if (path.split('/').length === 4) {
    const crumb = schemas.find(x => x['@type'] === 'BreadcrumbList')
    assert.equal(new URL(crumb.itemListElement.at(-1).item).pathname, path)
    const [, , group, tool] = path.split('/')
    for (const link of relatedFeatureLinks(group, tool)) {
      assert(html.includes(`href="${link.href}"`), `${path}: missing related guide`)
      assert(paths.includes(link.href), 'related guide must exist')
    }
  }
  rows.push({ path, title, canonical, ogUrl })
}
assert.equal(new Set(rows.map(x => x.title)).size, rows.length)
for (const path of ['/join', '/find-your-10']) {
  const response = await fetch(base + path)
  assert.equal(response.status, 200)
  assert(/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(await response.text()), `${path}: preserve intentional ad noindex`)
}

await fs.mkdir('.local/seo-review-20261012', { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    for (const key of ['capture/receipts', 'understand/budget', 'protect/goals']) {
      const response = await page.goto(`${base}/features/${key}`, { waitUntil: 'networkidle', timeout: 120000 })
      assert.equal(response.status(), 200)
      assert.equal(await page.locator('h1').count(), 1)
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'whole-page overflow')
      const nav = page.getByRole('navigation', { name: 'Related feature guides' })
      await nav.scrollIntoViewIfNeeded()
      for (const link of await nav.getByRole('link').all()) {
        const box = await link.boundingBox()
        assert(box.height >= 44, 'related guide touch target')
      }
      await page.screenshot({ path: `.local/seo-review-20261012/${key.replace('/', '-')}-${width}.png`, fullPage: true })
    }
    await page.goto(`${base}/features/capture/receipts`, { waitUntil: 'networkidle' })
    await page.getByRole('navigation', { name: 'Related feature guides' }).getByRole('link', { name: 'Spending reports' }).click()
    await page.waitForURL('**/features/understand/reports')
    await page.goBack()
    await page.waitForURL('**/features/capture/receipts')
    assert.deepEqual(errors, [], 'browser runtime errors')
    await page.close()
  }
} finally { await browser.close() }
await fs.writeFile('.local/seo-review-20261012/results.json', JSON.stringify(rows, null, 2))
console.log(`PASS ${rows.length} public-page metadata checks, ad noindex guards, desktop/mobile related-guide navigation and back`)

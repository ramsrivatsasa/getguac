import { mkdir, writeFile } from 'node:fs/promises'

const base = (process.argv[2] || 'https://getguac.app').replace(/\/$/, '')
const output = process.argv[3] || '.local/indexability-20261015.json'
const get = path => fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(60000) })
const robotsResponse = await get('/robots.txt')
const robots = await robotsResponse.text()
const maps = [...new Set(['/sitemap.xml', ...[...robots.matchAll(/^Sitemap:\s*(\S+)/gmi)].map(m => new URL(m[1]).pathname)])]
const paths = new Set(), sitemaps = []
for (let i = 0; i < maps.length; i++) {
  const response = await get(maps[i]), xml = await response.text()
  sitemaps.push({ path: maps[i], status: response.status })
  if (response.status !== 200) continue
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname)
  for (const path of locs) {
    if (/<sitemapindex\b/.test(xml)) { if (!maps.includes(path)) maps.push(path) }
    else paths.add(path)
  }
}
const links = new Map()
const rows = [], queue = [...paths]
await Promise.all(Array.from({ length: 5 }, async () => {
  while (queue.length) {
    const path = queue.shift()
    try {
      const response = await get(path), html = await response.text()
      // Template strings inside scripts are not rendered hyperlinks.
      const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
      for (const match of markup.matchAll(/<a\b[^>]*href=["']([^"']+)/gi)) {
        try {
          const url = new URL(match[1].replaceAll('&amp;', '&'), 'https://getguac.app' + path)
          if (url.origin !== 'https://getguac.app' || url.pathname.startsWith('/api/')) continue
          const key = url.pathname + url.search
          if (!links.has(key)) links.set(key, path)
        } catch {}
      }
      const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1]
      const directives = [...html.matchAll(/<meta[^>]*name=["'](?:robots|googlebot)["'][^>]*content=["']([^"']+)/gi)].map(m => m[1])
      directives.push(response.headers.get('x-robots-tag') || '')
      rows.push({ path, status: response.status, location: response.headers.get('location'), canonical, noindex: directives.some(s => /\b(noindex|none)\b/i.test(s)), title: html.match(/<title>([^<]*)/i)?.[1] })
    } catch (error) { rows.push({ path, error: error.message }) }
  }
}))
rows.sort((a,b) => a.path.localeCompare(b.path))
const failures = rows.filter(r => r.error || r.status !== 200 || r.noindex || !r.canonical || new URL(r.canonical, base).href !== `https://getguac.app${r.path}`)
const linkQueue = [...links].filter(([path]) => !paths.has(path)), linkResults = []
await Promise.all(Array.from({ length: 5 }, async () => {
  while (linkQueue.length) {
    const [path, source] = linkQueue.shift(), chain = []
    let current = path
    try {
      for (let hop = 0; hop < 10; hop++) {
        const response = await get(current)
        const location = response.headers.get('location')
        chain.push({ path: current, status: response.status, location })
        await response.body?.cancel()
        if (response.status < 300 || response.status >= 400 || !location) break
        const url = new URL(location, base + current)
        if (url.origin !== base) break
        current = url.pathname + url.search
        if (chain.some(r => r.path === current)) break
      }
      linkResults.push({ path, source, chain })
    } catch (error) { linkResults.push({ path, source, chain, error: error.message }) }
  }
}))
const brokenLinks = linkResults.filter(r => r.error || r.chain.at(-1)?.status >= 400 || (r.chain.at(-1)?.status >= 300 && new URL(r.chain.at(-1).location || base, base).origin === base))
const result = { checkedAt: new Date().toISOString(), base, robotsStatus: robotsResponse.status, robots, sitemaps, checked: rows.length, failures, linksChecked: links.size, brokenLinks, linkResults, rows }
await mkdir(output.slice(0, output.lastIndexOf('/')), { recursive: true })
await writeFile(output, JSON.stringify(result, null, 2))
console.log(JSON.stringify({ ...result, rows: undefined, linkResults: undefined }, null, 2))
process.exitCode = failures.length || brokenLinks.length || sitemaps.some(s => s.status !== 200) ? 1 : 0

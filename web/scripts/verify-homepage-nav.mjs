/* Mirrors loadHomepage() in src/app/page.jsx exactly. If page.jsx's regexes stop
 * matching, the homepage throws at request time — so assert them here rather
 * than finding out in the browser. */
import fs from 'node:fs'

const src = fs.readFileSync('src/app/homepage-source.html', 'utf8')
const ex = (s, re, l) => { const m = s.match(re); if (!m) throw new Error('MISSING ' + l); return m[1] }

const css = ex(src, /<style>([\s\S]*?)<\/style>/i, 'styles')
const body = ex(src, /<body[^>]*>([\s\S]*?)<\/body>/i, 'body')
const script = ex(body, /<script>([\s\S]*?)<\/script>/i, 'interaction script')

const labels = [...body.matchAll(/class="ggdd-top" href="([^"]+)">([^<]+)/g)].map((m) => `${m[2]} -> ${m[1]}`)
const plain = [...body.matchAll(/<nav class="links ggnav"[\s\S]*?<\/nav>/g)][0] || ''
const navLinks = [...String(plain).matchAll(/href="([^"]+)"/g)].map((m) => m[1])

console.log('page.jsx extraction still works:')
console.log('  css bytes        :', css.length)
console.log('  body bytes       :', body.length)
console.log('  script bytes     :', script.length)
console.log('  dropdown tops    :', labels.length, '->', labels.join(' | '))
console.log('  total nav links  :', navLinks.length)
console.log('  ggdd css present :', css.includes('.ggdd-card'))
console.log('  stale link left  :', body.includes('resources/index.html'))
console.log('  all nav hrefs    :', navLinks.join(' '))

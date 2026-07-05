// Ground-truth probe: does the Turnstile widget on getguac.app/register
// actually render and issue a token in a plain browser?
import { chromium } from 'playwright'

const runs = [
  { name: 'desktop', opts: {} },
  { name: 'mobile', opts: { viewport: { width: 412, height: 915 }, userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36', isMobile: true, hasTouch: true } },
]

for (const run of runs) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext(run.opts)
  const page = await ctx.newPage()
  const events = []
  page.on('console', m => { if (/turnstile/i.test(m.text())) events.push('console: ' + m.text()) })
  page.on('requestfailed', r => { if (/cloudflare|turnstile/i.test(r.url())) events.push('REQ FAILED: ' + r.url().slice(0, 120) + ' — ' + r.failure()?.errorText) })

  await page.addInitScript(() => {
    window.__tokens = []
    window.addEventListener('turnstile-token', e => window.__tokens.push((e.detail || 'EMPTY').slice(0, 20)))
  })
  await page.goto('https://getguac.app/register', { waitUntil: 'networkidle', timeout: 45000 }).catch(e => events.push('goto: ' + e.message))
  await page.waitForTimeout(12000)

  const state = await page.evaluate(() => {
    const div = document.querySelector('.cf-turnstile')
    const iframe = div?.querySelector('iframe')
    return {
      divPresent: !!div,
      divChildren: div ? div.childElementCount : -1,
      iframe: iframe ? { w: iframe.offsetWidth, h: iframe.offsetHeight } : null,
      turnstileGlobal: typeof window.turnstile,
      successCbDefined: typeof window.onTurnstileSuccess,
      tokens: window.__tokens,
      scriptTags: [...document.querySelectorAll('script[src*="challenges.cloudflare"]')].length,
    }
  })
  console.log(`=== ${run.name} ===`)
  console.log(JSON.stringify(state, null, 2))
  console.log(events.join('\n') || '(no failed cf requests)')
  await browser.close()
}

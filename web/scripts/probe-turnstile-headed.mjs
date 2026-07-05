// Headed variant of probe-register-turnstile.mjs — Turnstile (rightly)
// refuses headless bots, so the end-to-end token check needs a real window.
// Screenshots the widget, clicks its checkbox (automation-flagged browsers
// get the interactive challenge), then reports whether a token was issued.
import { chromium } from 'playwright'

const SHOT = process.env.SHOT_DIR || '.'
let browser
try {
  browser = await chromium.launch({ headless: false, channel: 'chrome' })
} catch {
  browser = await chromium.launch({ headless: false })
}
const page = await browser.newPage()
await page.addInitScript(() => {
  window.__tokens = []
  window.addEventListener('turnstile-token', e => window.__tokens.push((e.detail || 'EMPTY').slice(0, 24)))
})
await page.goto('https://getguac.app/register', { waitUntil: 'domcontentloaded', timeout: 45000 })
await page.waitForTimeout(8000)
const widget = page.locator('.cf-turnstile')
await widget.scrollIntoViewIfNeeded()
await widget.screenshot({ path: `${SHOT}/turnstile-before.png` }).catch(() => {})
// Managed-mode checkbox sits at the left edge of the 300x65 widget.
await widget.click({ position: { x: 28, y: 32 } }).catch(e => console.log('click failed: ' + e.message))
await page.waitForTimeout(10000)
await widget.screenshot({ path: `${SHOT}/turnstile-after.png` }).catch(() => {})
const state = await page.evaluate(() => ({
  widgetMounted: (document.querySelector('.cf-turnstile')?.childElementCount ?? 0) > 0,
  tokens: window.__tokens,
}))
console.log(JSON.stringify(state, null, 2))
await browser.close()

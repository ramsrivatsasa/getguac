// Render a stored email (body_html / body_text) to a PNG image + a PDF using
// headless Chromium. Used by /api/receipts/[id]/email-snapshot so email-sourced
// receipts get a real, durable receipt artifact — exactly like a photographed
// one — that survives the source email being deleted.
//
// Two launch paths:
//   - Serverless (Vercel / Lambda): @sparticuz/chromium ships a brotli-packed
//     Chromium it unpacks to /tmp. We must use puppeteer-core (no bundled
//     browser) + chromium.executablePath().
//   - Local dev (Windows/macOS): no packed binary, so we point puppeteer at an
//     installed Chrome/Edge. Override with PUPPETEER_EXECUTABLE_PATH if needed.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

// Email bodies are often bare fragments (a single <table>, or just text). Wrap
// them in a clean, print-friendly document with a sane width, base font, and a
// small header so the rendered receipt reads like a tidy document, not a raw
// 2000px-wide table. <base target="_blank"> keeps any anchors from trying to
// navigate the render frame.
function wrapHtml({ html, text, subject, from }) {
  const hasHtml = html && html.trim().length > 0
  const inner = hasHtml
    ? html
    : `<pre style="white-space:pre-wrap;word-break:break-word;font:14px/1.6 ui-monospace,Menlo,Consolas,monospace;margin:0">${esc(text)}</pre>`
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base target="_blank">
<style>
  html,body{margin:0;padding:0;background:#fff}
  body{font:15px/1.55 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a}
  .gg-head{padding:14px 22px;border-bottom:1px solid #e5e7eb;background:#f8fafc}
  .gg-tag{font:700 10px/1 ui-sans-serif,system-ui;letter-spacing:.08em;text-transform:uppercase;color:#047857}
  .gg-sub{font-weight:700;font-size:15px;color:#0f172a;margin-top:4px}
  .gg-from{font-size:12px;color:#64748b;margin-top:2px}
  .gg-body{padding:22px;max-width:760px}
  .gg-body img{max-width:100%;height:auto}
  .gg-body table{max-width:100%}
</style></head><body>
  <div class="gg-head">
    <div class="gg-tag">GetGuac &middot; source email</div>
    <div class="gg-sub">${esc(subject) || '(no subject)'}</div>
    <div class="gg-from">From ${esc(from) || 'unknown sender'}</div>
  </div>
  <div class="gg-body">${inner}</div>
</body></html>`
}

const exists = (p) => { try { return !!p && fs.existsSync(p) } catch { return false } }

async function launchBrowser() {
  const serverless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.AWS_EXECUTION_ENV
  if (serverless) {
    const chromium = (await import('@sparticuz/chromium')).default
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 800, height: 1000, deviceScaleFactor: 2 },
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  }
  // Local: find an installed Chromium-family browser.
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ]
  const executablePath = candidates.find(exists)
  if (!executablePath) throw new Error('No local Chrome/Edge found; set PUPPETEER_EXECUTABLE_PATH')
  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 800, height: 1000, deviceScaleFactor: 2 },
  })
}

// Returns { png: Buffer, pdf: Buffer }. Throws on launch/render failure so the
// caller can surface a clear error instead of writing an empty artifact.
export async function renderEmailSnapshot({ html, text, subject, from }) {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(wrapHtml({ html, text, subject, from }), {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    })
    // Give remote images (store logo, product thumbs) a brief window to load
    // without letting a slow tracker pixel hang the whole render.
    try {
      await page.evaluate(() => Promise.race([
        Promise.all(Array.from(document.images).filter((i) => !i.complete).map((i) =>
          new Promise((res) => { i.addEventListener('load', res); i.addEventListener('error', res) }))),
        new Promise((res) => setTimeout(res, 2500)),
      ]))
    } catch { /* best-effort */ }

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
    })
    const png = await page.screenshot({ fullPage: true, type: 'png' })
    return { png: Buffer.from(png), pdf: Buffer.from(pdf) }
  } finally {
    await browser.close().catch(() => {})
  }
}

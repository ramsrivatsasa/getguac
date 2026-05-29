// One-shot generator for 20 synthetic credit-card statement PDFs.
// Renders a realistic monthly statement HTML for each month spanning
// ~20 months back, populates random purchases + an interest charge +
// occasional fee + a payment, then prints to PDF via md-to-pdf.
//
// Run:
//   cd c:/Money/getguac
//   node test/generate_statements.js
// Writes:
//   test/statements/statement-YYYY-MM.pdf  (20 files)
//
// Designed to feed the parse-statement pipeline end-to-end: each PDF
// has the same column shape (Date / Description / Amount) that the
// existing /api/parse-statement code expects, plus explicit "Interest
// Charge", "Foreign Transaction Fee", "Late Payment Fee" lines so
// GuacWizard's bank-fee detection has signal.

/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

const OUT_DIR = path.join(__dirname, 'statements')
fs.mkdirSync(OUT_DIR, { recursive: true })

// Merchant pool — same recognizable names so when the parser ingests
// these statements the Stash / Smashlist surfaces look populated.
const MERCHANTS = [
  ['COSTCO WHOLESALE',     35, 145],
  ['WALMART',              22, 95],
  ['TARGET',               18, 75],
  ['AMAZON.COM',           15, 120],
  ['STARBUCKS',             5, 15],
  ['CHIPOTLE',              9, 18],
  ['MCDONALDS',             7, 16],
  ['SHELL',                28, 65],
  ['EXXON',                32, 70],
  ['CVS PHARMACY',         12, 45],
  ['WALGREENS',             8, 35],
  ['NETFLIX.COM',          19.99, 22.99],
  ['SPOTIFY USA',          16.99, 16.99],
  ['NYTIMES DIGITAL',      17, 17],
  ['ADOBE INC',            59.99, 59.99],
  ['HULU LLC',             18.99, 18.99],
  ['HOME DEPOT',           28, 220],
  ['BEST BUY',             45, 350],
  ['APPLE.COM/BILL',        9.99, 249],
  ['DOORDASH',             24, 65],
  ['UBER TRIP',            12, 45],
  ['LYFT RIDE',            14, 38],
  ['WHOLE FOODS MKT',      32, 110],
  ['TRADER JOES',          25, 80],
  ['SEPHORA',              28, 95],
  ['PETSMART',             32, 80],
  ['IKEA',                 45, 260],
  ['CHEVRON',              28, 70],
  ['SUBWAY',                8, 14],
  ['CHICK-FIL-A',          11, 22],
]

const rand = (a, b) => a + Math.random() * (b - a)
const irand = (a, b) => Math.floor(rand(a, b + 1))
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

function fmtUSD(n) {
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  return `${sign}$${abs.toFixed(2)}`
}

function monthName(d) {
  return d.toLocaleString('en-US', { month: 'long' })
}

function isoDateShort(d) {
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`
}

function generateMonthHtml(year, month, accountSuffix, openingBalance) {
  const statementDate = new Date(year, month, 28)
  const cycleStart = new Date(year, month - 1, 28)
  const dueDate = new Date(year, month + 1, 25)
  const transactions = []

  // 18-30 random purchases through the cycle
  const purchaseCount = irand(18, 30)
  for (let i = 0; i < purchaseCount; i++) {
    const txDate = new Date(cycleStart.getTime() + Math.random() * (statementDate - cycleStart))
    const [merchant, lo, hi] = pick(MERCHANTS)
    const amount = Math.round(rand(lo, hi) * 100) / 100
    transactions.push({ date: txDate, merchant, amount })
  }

  // Add a few explicit fee + interest lines
  transactions.push({
    date: new Date(statementDate),
    merchant: 'PURCHASE INTEREST CHARGE',
    amount: Math.round(rand(15, 75) * 100) / 100,
  })
  if (Math.random() < 0.4) {
    transactions.push({
      date: new Date(statementDate),
      merchant: 'FOREIGN TRANSACTION FEE',
      amount: Math.round(rand(1.5, 12) * 100) / 100,
    })
  }
  if (Math.random() < 0.2) {
    transactions.push({
      date: new Date(statementDate),
      merchant: 'LATE PAYMENT FEE',
      amount: 29.00,
    })
  }
  if (Math.random() < 0.1) {
    transactions.push({
      date: new Date(statementDate),
      merchant: 'ANNUAL FEE',
      amount: 95.00,
    })
  }

  // Sort chronologically
  transactions.sort((a, b) => a.date - b.date)

  // Add a payment near the start of the cycle
  const paymentAmount = openingBalance > 0 ? Math.round(rand(openingBalance * 0.4, openingBalance) * 100) / 100 : 200
  transactions.unshift({
    date: new Date(cycleStart.getTime() + 86400_000 * 3),
    merchant: 'AUTOPAY THANK YOU',
    amount: -paymentAmount,
  })

  const total = transactions.reduce((s, t) => s + t.amount, 0)
  const newBalance = Math.max(0, Math.round((openingBalance + total) * 100) / 100)
  const minPayment = Math.max(35, Math.round(newBalance * 0.025 * 100) / 100)

  const rowsHtml = transactions.map(t => `
    <tr>
      <td>${isoDateShort(t.date)}</td>
      <td>${t.merchant}</td>
      <td class="amount ${t.amount < 0 ? 'credit' : ''}">${fmtUSD(t.amount)}</td>
    </tr>
  `).join('')

  return `
<!doctype html>
<html><head><meta charset="utf-8"><title>Statement ${year}-${String(month+1).padStart(2,'0')}</title>
<style>
  @page { size: Letter; margin: 0.5in 0.6in; }
  body { font-family: -apple-system, "Segoe UI", Arial, sans-serif; font-size: 10pt; color: #1a202c; }
  .banner { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e40af; padding-bottom: 8pt; margin-bottom: 14pt; }
  .bank-name { font-size: 18pt; font-weight: 900; color: #1e3a8a; letter-spacing: -0.5pt; }
  .acct { font-size: 9pt; color: #64748b; text-align: right; }
  .summary { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10pt; margin-bottom: 18pt; }
  .summary > div { background: #f1f5f9; padding: 8pt 10pt; border-radius: 6pt; border-left: 3px solid #1e40af; }
  .summary .label { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.5pt; font-weight: 700; }
  .summary .value { font-size: 14pt; font-weight: 800; color: #0f172a; margin-top: 2pt; tabular-nums: 1; font-variant-numeric: tabular-nums; }
  h2 { font-size: 11pt; color: #1e40af; border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt; margin-top: 14pt; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th { text-align: left; padding: 5pt 8pt; background: #e0e7ff; color: #1e3a8a; border-bottom: 2px solid #1e40af; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.4pt; }
  td { padding: 4pt 8pt; border-bottom: 1px solid #f1f5f9; }
  td.amount { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  td.amount.credit { color: #059669; }
  tr:nth-child(even) td { background: #fafafa; }
  .footer-note { font-size: 8pt; color: #64748b; margin-top: 18pt; line-height: 1.6; }
  .due-due { font-weight: 800; color: #b91c1c; }
</style>
</head><body>
  <div class="banner">
    <div>
      <div class="bank-name">PRIME CARD VISA</div>
      <div style="font-size:9pt;color:#64748b;margin-top:2pt;">Issued by Big Bank N.A.</div>
    </div>
    <div class="acct">
      Account ending in <strong>${accountSuffix}</strong><br/>
      Statement Date: <strong>${statementDate.toLocaleDateString('en-US')}</strong><br/>
      Cycle: ${cycleStart.toLocaleDateString('en-US')} – ${statementDate.toLocaleDateString('en-US')}
    </div>
  </div>

  <div class="summary">
    <div><div class="label">Previous balance</div><div class="value">${fmtUSD(openingBalance)}</div></div>
    <div><div class="label">Payments / credits</div><div class="value">${fmtUSD(transactions.filter(t => t.amount < 0).reduce((s,t)=>s+t.amount,0))}</div></div>
    <div><div class="label">Purchases + fees</div><div class="value">${fmtUSD(transactions.filter(t => t.amount > 0).reduce((s,t)=>s+t.amount,0))}</div></div>
    <div><div class="label">New balance</div><div class="value">${fmtUSD(newBalance)}</div></div>
  </div>

  <div class="summary">
    <div style="background:#fef2f2;border-left-color:#b91c1c;">
      <div class="label">Minimum payment due</div>
      <div class="value due-due">${fmtUSD(minPayment)}</div>
    </div>
    <div style="background:#fef2f2;border-left-color:#b91c1c;">
      <div class="label">Payment due date</div>
      <div class="value due-due">${dueDate.toLocaleDateString('en-US')}</div>
    </div>
    <div><div class="label">Credit limit</div><div class="value">$15,000.00</div></div>
    <div><div class="label">Available credit</div><div class="value">${fmtUSD(Math.max(0, 15000 - newBalance))}</div></div>
  </div>

  <h2>Transactions — ${monthName(statementDate)} ${statementDate.getFullYear()}</h2>
  <table>
    <thead><tr><th style="width:60pt;">Date</th><th>Description</th><th style="width:80pt;text-align:right;">Amount</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="footer-note">
    Annual Percentage Rate (APR): 19.74% variable on purchases · 25.99% on cash advances · 29.99% penalty APR after any late payment.
    <br/>Pay by the due date to avoid interest. If you make only the minimum payment, you'll pay more in interest and it will take longer to pay off the balance.
    <br/><br/>Synthetic statement generated for QA testing — not a real account.
  </div>
</body></html>
`
}

// Render each month to PDF via Chrome's headless print. Falls back to
// md-to-pdf's underlying puppeteer if chrome isn't on PATH.
async function htmlToPdf(html, outPath) {
  // Reuse md-to-pdf's puppeteer (already in node_modules from earlier).
  const { mdToPdf } = require(path.join(__dirname, '..', 'node_modules', 'md-to-pdf'))
  // md-to-pdf accepts content as markdown by default — we want raw HTML
  // so we wrap it as `as_html: true`.
  const pdf = await mdToPdf({ content: html }, {
    pdf_options: { format: 'Letter', margin: { top: '0.5in', bottom: '0.5in', left: '0.6in', right: '0.6in' } },
    as_html: true,
  })
  fs.writeFileSync(outPath, pdf.content)
}

async function main() {
  const accountSuffix = '4242'
  let openingBalance = 0
  const today = new Date()
  for (let i = 19; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = date.getMonth()
    const html = generateMonthHtml(year, month, accountSuffix, openingBalance)
    const filename = `statement-${year}-${String(month + 1).padStart(2, '0')}.pdf`
    const outPath = path.join(OUT_DIR, filename)
    await htmlToPdf(html, outPath)
    // Carry balance forward for realism (random pay-down)
    openingBalance = Math.round(rand(200, 1500) * 100) / 100
    console.log(`✓ ${filename}`)
  }
  console.log(`\nGenerated 20 statements in ${OUT_DIR}`)
}

main().catch(e => { console.error(e); process.exit(1) })

// One-shot generator for ~30 synthetic receipt PNG images. Each
// renders as a classic narrow paper-receipt format (thermal-printer
// style) at ~400×800px so the testers can upload them through the
// app's photo flow and exercise the OCR pipeline end-to-end.
//
// Run:
//   cd c:/Money/getguac
//   node test/generate_receipts.js
// Writes:
//   test/receipts/receipt-N-<store>.png  (~30 files)

/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, 'receipts')
fs.mkdirSync(OUT_DIR, { recursive: true })

// Per-store layouts — we vary header / footer / spacing so the OCR
// pipeline sees real-world variety, not the same template repeated.
const TEMPLATES = [
  {
    store: 'Costco Wholesale',
    address: '1620 Anderson Rd · Mountain View, CA 94043',
    phone: '(650) 555-3000',
    items: [
      ['KS WHOLE MILK GAL',    '3.99'],
      ['KS LARGE EGGS 18CT',   '4.99'],
      ['ORG BANANAS 3LB',      '1.99'],
      ['KS WW BREAD',          '5.49'],
      ['KS COFFEE 3LB',        '17.99'],
      ['ROTISSERIE CHICKEN',   '4.99'],
      ['PAPER TOWELS 12PK',    '22.99'],
    ],
    member: 'Member #110 928 4242',
    tax: 4.92,
  },
  {
    store: 'Walmart',
    address: '600 Showers Dr · Mountain View, CA 94040',
    phone: '(650) 555-2400',
    items: [
      ['GV WHOLE MILK',        '3.48'],
      ['GV LRG EGGS 12CT',     '3.97'],
      ['BANANAS',              '0.58'],
      ['BREAD WHEAT',          '2.96'],
      ['LAYS CHIPS',           '4.28'],
    ],
    tax: 1.21,
  },
  {
    store: 'Target',
    address: '555 Showers Dr · Mountain View, CA 94040',
    phone: '(650) 555-1900',
    items: [
      ['ARCHER FARMS COFFEE',  '12.99'],
      ['MAR YOGURT GREEK 5CT', '5.99'],
      ['UP&UP PAPER TOWELS',   '14.99'],
      ['GOOD&GATHER EGGS 12',  '4.99'],
    ],
    tax: 3.20,
  },
  {
    store: 'Trader Joes',
    address: '590 Showers Dr · Mountain View, CA 94040',
    phone: '(650) 555-1100',
    items: [
      ['MANDARIN ORANGES 3LB', '4.49'],
      ['DARK CHOC ALMONDS',    '4.99'],
      ['EVERYTHING BAGEL S',   '2.99'],
      ['UNEXPECTED CHEDDAR',   '7.99'],
    ],
    tax: 1.65,
  },
  {
    store: 'Whole Foods Market',
    address: '774 Emerson St · Palo Alto, CA 94301',
    phone: '(650) 555-7400',
    items: [
      ['365 ORG MILK GAL',     '5.49'],
      ['ORG BANANAS 1LB',      '0.79'],
      ['ORG AVOCADO 4CT',      '7.96'],
      ['365 GREEK YOGURT',     '4.99'],
      ['ORG SPINACH 8OZ',      '3.99'],
    ],
    tax: 2.21,
  },
  {
    store: 'Starbucks',
    address: '291 Castro St · Mountain View, CA 94041',
    phone: '(650) 555-0822',
    items: [
      ['VENTI LATTE',          '5.85'],
      ['CRANBERRY ORANGE SCNE','4.45'],
    ],
    tax: 0.83,
  },
  {
    store: 'Chipotle',
    address: '900 Independence Ave · Mountain View',
    phone: '(650) 555-9988',
    items: [
      ['CHICKEN BOWL',         '11.50'],
      ['LARGE CHIPS+GUAC',     '5.95'],
    ],
    tax: 1.43,
  },
  {
    store: 'McDonalds',
    address: '590 N Shoreline Blvd · Mountain View',
    phone: '(650) 555-2200',
    items: [
      ['BIG MAC MEAL',         '12.99'],
      ['MEDIUM FRY',           '3.59'],
      ['M COKE',               '2.39'],
    ],
    tax: 1.50,
  },
  {
    store: 'CVS Pharmacy',
    address: '1380 W El Camino Real · Mountain View',
    phone: '(650) 555-3100',
    items: [
      ['TYLENOL 100CT',        '12.99'],
      ['VITAMIN D 250CT',      '14.49'],
      ['BANDAGES FAMILY PK',   '6.99'],
    ],
    tax: 2.92,
  },
  {
    store: 'Home Depot',
    address: '1781 E Bayshore Rd · East Palo Alto',
    phone: '(650) 555-4900',
    items: [
      ['DRILL BIT SET COBALT', '32.50'],
      ['MULCH PREMIUM 2CUFT',  '5.99'],
      ['GORILLA TAPE 12YD',    '9.99'],
    ],
    tax: 4.04,
  },
  {
    store: 'Best Buy',
    address: '999 Promenade Pl · Mountain View',
    phone: '(650) 555-6600',
    items: [
      ['USB-C CABLE 6FT',      '24.99'],
      ['HDMI CABLE 10FT',      '14.99'],
    ],
    tax: 3.40,
  },
  {
    store: 'Shell',
    address: '500 Castro St · Mountain View',
    phone: '(650) 555-8800',
    items: [
      ['UNL REG 11.823 GAL @ 3.79',  '44.81'],
    ],
    tax: 0,
  },
  {
    store: 'Costco Wholesale Gas',
    address: '1781 E Bayshore Rd · Costco Gas',
    phone: '(650) 555-3001',
    items: [
      ['UNL REG 13.45 GAL @ 3.42',   '46.00'],
    ],
    tax: 0,
  },
  {
    store: 'Merrifield Garden Center',
    address: '8132 Lee Hwy · Merrifield, VA',
    phone: '(703) 555-3434',
    items: [
      ['LOBELIA CARDINALIS 1Q','10.99'],
      ['POTTING SOIL 8QT',     '12.99'],
      ['SLOW RELEASE FERT 4LB','18.99'],
    ],
    tax: 2.74,
  },
  {
    store: 'Sephora',
    address: '550 University Ave · Palo Alto',
    phone: '(650) 555-0099',
    items: [
      ['SEPHORA MASCARA BLK',  '29.00'],
      ['SEPHORA FOUNDATION 02','48.00'],
    ],
    tax: 7.16,
  },
  {
    store: 'PetSmart',
    address: '1141 W El Camino Real · Sunnyvale',
    phone: '(408) 555-7700',
    items: [
      ['DOG FOOD 30LB',        '68.99'],
      ['DOG TREATS BACON',     '11.99'],
    ],
    tax: 0,
  },
  {
    store: 'IKEA',
    address: '4501 N 1st St · East Palo Alto',
    phone: '(650) 555-1212',
    items: [
      ['BILLY BOOKCASE WHT',   '99.00'],
      ['HEMNES NIGHTSTAND',    '129.00'],
    ],
    tax: 22.20,
  },
  {
    store: 'Aldi',
    address: '1234 El Camino Real · Mountain View',
    phone: '(650) 555-4040',
    items: [
      ['FROZEN VEG MIX 3PK',   '8.97'],
      ['EGG CARTON 12',        '2.79'],
      ['WHITE BREAD',          '1.49'],
    ],
    tax: 1.10,
  },
  {
    store: 'Sprouts Farmers Market',
    address: '450 W El Camino Real · Mountain View',
    phone: '(650) 555-7300',
    items: [
      ['ORG SPINACH',          '3.49'],
      ['ORG AVOCADO',          '1.99'],
      ['ORG QUINOA 1LB',       '6.99'],
    ],
    tax: 1.21,
  },
  {
    store: 'DoorDash',
    address: 'Order placed via DoorDash',
    phone: '',
    items: [
      ['OLIVE GARDEN — CHICK ALFR', '24.50'],
      ['SOUP / SALAD ADD-ON',  '6.00'],
      ['DELIVERY FEE',         '5.99'],
      ['SERVICE FEE',          '4.85'],
      ['DRIVER TIP',           '7.00'],
    ],
    tax: 4.16,
  },
]

function rand(a, b) { return a + Math.random() * (b - a) }

function receiptHtml(t, idx) {
  const subtotal = t.items.reduce((s, [, p]) => s + parseFloat(p), 0)
  const tax = t.tax || 0
  const total = subtotal + tax
  const date = new Date(Date.now() - idx * 86400_000 * 3)
  const tx = `TX#${Math.floor(rand(100000, 999999))}`
  const itemsHtml = t.items.map(([n, p]) => `
    <tr><td class="item">${n}</td><td class="price">${parseFloat(p).toFixed(2)}</td></tr>
  `).join('')
  return `
<!doctype html><html><head><meta charset="utf-8"><title>${t.store} receipt</title>
<style>
  @page { size: 3.5in 9in; margin: 0; }
  html, body { background: #fefdf7; }
  body { font-family: "Consolas","Menlo","Courier New",monospace; font-size: 11pt; color: #1a202c; padding: 18pt 14pt; width: 3.2in; }
  .header { text-align: center; border-bottom: 1px dashed #94a3b8; padding-bottom: 8pt; }
  .store { font-size: 16pt; font-weight: 900; letter-spacing: -0.3pt; }
  .addr { font-size: 9pt; color: #475569; margin-top: 3pt; }
  .meta { font-size: 9pt; color: #64748b; margin: 6pt 0 4pt; }
  table { width: 100%; border-collapse: collapse; margin-top: 10pt; }
  td { padding: 2pt 0; vertical-align: top; }
  td.item { font-size: 10pt; }
  td.price { text-align: right; font-variant-numeric: tabular-nums; width: 60pt; }
  .totals { margin-top: 8pt; border-top: 1px dashed #94a3b8; padding-top: 6pt; }
  .totals td { font-size: 10pt; }
  .totals .grand td { font-size: 13pt; font-weight: 900; padding-top: 4pt; }
  .footer { text-align: center; border-top: 1px dashed #94a3b8; padding-top: 8pt; margin-top: 12pt; font-size: 8.5pt; color: #64748b; line-height: 1.4; }
  .barcode { letter-spacing: -1.5pt; font-size: 24pt; text-align: center; margin: 8pt 0; font-family: "Libre Barcode 39","Consolas",monospace; }
</style>
</head><body>
  <div class="header">
    <div class="store">${t.store}</div>
    <div class="addr">${t.address}</div>
    ${t.phone ? `<div class="addr">${t.phone}</div>` : ''}
  </div>
  <div class="meta">
    ${date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} ·
    ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}<br/>
    ${tx}${t.member ? ' · ' + t.member : ''}
  </div>
  <table>
    ${itemsHtml}
  </table>
  <table class="totals">
    <tr><td>SUBTOTAL</td><td class="price">${subtotal.toFixed(2)}</td></tr>
    ${tax > 0 ? `<tr><td>TAX (8.25%)</td><td class="price">${tax.toFixed(2)}</td></tr>` : ''}
    <tr class="grand"><td>TOTAL</td><td class="price">$${total.toFixed(2)}</td></tr>
    <tr><td colspan="2" style="padding-top:6pt;font-size:9pt;color:#475569;">VISA ****4242 — APPROVED</td></tr>
  </table>
  <div class="footer">
    Items returned within 90 days with receipt.<br/>
    Questions? Visit ${t.store.toLowerCase().replace(/\\s+/g,'')}.com<br/>
    <span class="barcode">*${tx}*</span>
    Thank you for shopping!
  </div>
</body></html>
`
}

async function htmlToPng(html, outPath) {
  // md-to-pdf bundles puppeteer at top level after install.
  const puppeteer = require(path.join(__dirname, '..', 'node_modules', 'puppeteer'))
  const browser = await puppeteer.launch({ headless: 'new' })
  try {
    const page = await browser.newPage()
    // Receipt-narrow viewport — matches @page size at 96dpi-ish for
    // a result that reads like a printed receipt scan.
    await page.setViewport({ width: 340, height: 900, deviceScaleFactor: 2 })
    await page.setContent(html, { waitUntil: 'networkidle0' })
    await page.screenshot({ path: outPath, fullPage: true, type: 'png' })
  } finally {
    await browser.close()
  }
}

async function main() {
  for (let i = 0; i < TEMPLATES.length; i++) {
    const t = TEMPLATES[i]
    const safeName = t.store.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const filename = `receipt-${String(i + 1).padStart(2, '0')}-${safeName}.png`
    const outPath = path.join(OUT_DIR, filename)
    try {
      await htmlToPng(receiptHtml(t, i), outPath)
      console.log(`✓ ${filename}`)
    } catch (e) {
      console.error(`✗ ${filename}: ${e.message}`)
    }
  }
  console.log(`\nGenerated ${TEMPLATES.length} receipt images in ${OUT_DIR}`)
}

main().catch(e => { console.error(e); process.exit(1) })

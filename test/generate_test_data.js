// One-shot CSV generator for the 1,000-receipt tester fixture.
// Produces test/TEST_DATA_1000.csv with realistic cadences:
//   - Weekly groceries (rotating stores so Compare Stores has signal)
//   - Bi-weekly household runs
//   - Monthly subscriptions (Netflix, Spotify, etc.) with a price bump
//     mid-year so the subscription tracker flags an anomaly
//   - Frequent coffee + fast-food trips
//   - Sporadic big-ticket (electronics, home improvement)
//   - Bank fees (interest, ATM)
//   - Returns (negative amounts)
//   - Specialty items (LOBELIA CARDINALIS at Merrifield Garden Center,
//     KS / GV variants for embedding-merge testing)
//
// Run:
//   node test/generate_test_data.js
// Writes:
//   test/TEST_DATA_1000.csv

/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, 'TEST_DATA_1000.csv')
const TARGET_ROWS = 1000

// ─── Reference data ────────────────────────────────────────────────
// Stores: {name, store_priceMultiplier} — used to make the same item
// cost different prices across stores (Costco cheapest on bulk, Whole
// Foods most expensive, etc.) so Compare Stores has a real spread.
const STORES = {
  costco:     { name: 'Costco Wholesale', mult: 0.85 },
  walmart:    { name: 'Walmart',          mult: 0.92 },
  target:     { name: 'Target',           mult: 1.05 },
  trader:     { name: 'Trader Joes',      mult: 1.02 },
  whole:      { name: 'Whole Foods Market', mult: 1.28 },
  aldi:       { name: 'Aldi',             mult: 0.78 },
  sprouts:    { name: 'Sprouts Farmers Market', mult: 1.10 },
}

// Items keyed by category. price is the "base"; per-store multiplier
// scales it. qty defaults to 1; some items step up randomly.
const GROCERY_ITEMS = [
  ['MILK',                  3.99, 'grub'],
  ['EGGS',                  4.49, 'grub'],
  ['BANANAS',               0.79, 'grub'],
  ['BREAD',                 3.49, 'grub'],
  ['COFFEE',                11.49,'drinks'],
  ['CHIPS',                 3.79, 'snacks'],
  ['CHEESE BLOCK',          5.99, 'grub'],
  ['YOGURT 6PK',            6.49, 'grub'],
  ['APPLES 3LB',            4.99, 'grub'],
  ['CHICKEN BREAST',        9.99, 'grub'],
  ['GROUND BEEF 1LB',       6.99, 'grub'],
  ['PASTA',                 1.99, 'grub'],
  ['TOMATO SAUCE',          2.49, 'grub'],
  ['RICE 2LB',              4.99, 'grub'],
  ['OLIVE OIL',             8.99, 'grub'],
  ['CEREAL',                4.99, 'grub'],
  ['ORANGE JUICE',          4.49, 'drinks'],
  ['POPCORN',               3.49, 'snacks'],
  ['GRANOLA BARS',          5.99, 'snacks'],
  ['ICE CREAM',             5.99, 'snacks'],
]

const HOUSEHOLD_ITEMS = [
  ['PAPER TOWELS 12 ROLL',   22.99, 'household'],
  ['BOUNTY SELECT-A-SIZE 6PK', 17.84, 'household'],
  ['TIDE HE LIQUID 170 LOADS', 24.99, 'household'],
  ['DAWN ULTRA ORIGINAL',      4.66, 'household'],
  ['TOILET PAPER 24CT',       18.99, 'household'],
  ['DISHWASHER PODS 80CT',    14.99, 'household'],
  ['LAUNDRY DETERGENT',       12.99, 'household'],
  ['TRASH BAGS 80CT',          9.99, 'household'],
]

const SUBSCRIPTIONS = [
  { store: 'Netflix',  item: 'Premium Plan',             price: 22.99, before: 19.99, changeAt: 4 }, // bumps month 4
  { store: 'Spotify',  item: 'Family Plan',              price: 16.99 },
  { store: 'NYTimes',  item: 'Digital Subscription',     price: 17.00 },
  { store: 'Adobe',    item: 'Creative Cloud All Apps',  price: 59.99 },
  { store: 'Hulu',     item: 'No Ads',                   price: 18.99 },
  { store: 'Disney+',  item: 'Premium',                  price: 13.99 },
  { store: 'Audible',  item: 'Premium Plus',             price: 14.95 },
  { store: 'NYTimes Cooking', item: 'Recipe Box',        price: 5.00 },
  { store: 'iCloud',   item: '2TB Storage',              price: 9.99 },
  { store: 'Patreon',  item: 'Creator pledge',           price: 8.00 },
]

const RESTAURANTS = [
  { store: 'Starbucks',    item: 'Venti Latte',            price: 6.45 },
  { store: 'Starbucks',    item: 'Pumpkin Spice Latte',    price: 7.25 },
  { store: 'Chipotle',     item: 'Chicken Burrito Bowl',   price: 11.50 },
  { store: 'Chipotle',     item: 'Steak Burrito',          price: 12.95 },
  { store: 'McDonalds',    item: 'Big Mac Meal',           price: 12.99 },
  { store: 'McDonalds',    item: 'Quarter Pounder Meal',   price: 13.49 },
  { store: 'Chick-fil-A',  item: '#1 Spicy Chicken Meal',  price: 11.85 },
  { store: 'DoorDash',     item: 'Order from Olive Garden',price: 42.50 },
  { store: 'DoorDash',     item: 'Order from Sushi Roku',  price: 56.20 },
  { store: 'Uber Eats',    item: 'Order from Wendys',      price: 18.40 },
  { store: 'Olive Garden', item: 'Lunch for 2',            price: 48.20 },
  { store: 'PF Changs',    item: 'Dinner for 2',           price: 78.50 },
]

const GAS_STATIONS = [
  { store: 'Shell',                 base: 3.79, qtyRange: [9, 14] },
  { store: 'Costco Wholesale Gas',  base: 3.42, qtyRange: [10, 15] },
  { store: 'Exxon',                 base: 3.95, qtyRange: [9, 13] },
  { store: 'BP',                    base: 3.85, qtyRange: [9, 13] },
  { store: '7-Eleven',              base: 3.99, qtyRange: [8, 12] },
]

const HEALTH = [
  { store: 'CVS',       items: [['Tylenol Extra Strength 100ct', 12.99], ['Vitamin D3 1000IU 250ct', 14.49], ['Allergy Pills 24-hr', 18.99], ['Cough Syrup', 9.99]] },
  { store: 'Walgreens', items: [['Hand Sanitizer 32oz', 8.99], ['Bandages Variety', 6.99], ['Ibuprofen 200mg 100ct', 11.49]] },
  { store: 'Rite Aid',  items: [['First Aid Kit', 24.99], ['Multivitamins 90ct', 19.99]] },
]

const TECH = [
  { store: 'Best Buy',    item: 'USB-C Cable 6ft',     price: 24.99 },
  { store: 'Best Buy',    item: 'Bluetooth Speaker',   price: 89.99 },
  { store: 'Micro Center',item: 'NVMe SSD 1TB',        price: 99.99 },
  { store: 'Micro Center',item: 'LOBELIA CARDINALIS 1Q', price: 10.99 },
  { store: 'Apple Store', item: 'AirPods Pro',         price: 249.00 },
  { store: 'Apple Store', item: 'Lightning Cable 2m',  price: 35.00 },
  { store: 'Amazon',      item: 'Bluetooth Headphones',price: 89.99 },
  { store: 'Amazon',      item: 'USB Hub 7-Port',      price: 32.99 },
  { store: 'Amazon',      item: 'Kitchen Scale Digital',price: 18.49 },
  { store: 'Amazon',      item: 'Mechanical Keyboard', price: 119.00 },
]

const TRANSPORT = [
  { store: 'Uber',           items: [['Ride to airport', 38.50], ['Ride downtown', 14.75], ['Ride to airport', 42.20]] },
  { store: 'Lyft',           items: [['Ride to office', 22.85], ['Ride to airport', 27.85]] },
  { store: 'Parking Garage', items: [['Downtown Parking 3hr', 18.00], ['Airport Parking 1 day', 32.00]] },
]

const ENTERTAINMENT = [
  { store: 'AMC Theatres',  item: 'Movie ticket Avengers',   price: 14.25, qty: 2 },
  { store: 'Apple iTunes',  item: 'Album Download',          price: 11.99 },
  { store: 'Steam',         item: 'Game - Indie Hit',        price: 19.99 },
  { store: 'BookMyShow',    item: 'Concert Ticket',          price: 95.00 },
  { store: 'Ticketmaster',  item: 'NBA Game Section 200',    price: 145.00 },
]

const PET = [
  { store: 'Pet Smart',     items: [['Dog Food Premium 30lb', 68.99], ['Cat Litter 40lb', 24.99], ['Dog Treats Mix', 11.99]] },
  { store: 'Petco',         items: [['Cat Food 16lb', 32.99], ['Aquarium Filter', 28.99]] },
]

const BEAUTY = [
  { store: 'Sephora', items: [['Mascara Black', 29.00], ['Lipstick Red', 32.00], ['Foundation', 48.00], ['Serum 30ml', 65.00]] },
  { store: 'Ulta',    items: [['Hair Treatment', 24.99], ['Nail Polish Set', 18.99]] },
]

const HOMEIMP = [
  { store: 'Home Depot', items: [['Drill Bit Set Cobalt', 32.50], ['Mulch Premium 2cuft', 5.99], ['Tile Cutter', 49.99], ['Pipe Wrench', 18.99]] },
  { store: 'Lowes',      items: [['Paint - 1 Gallon Sherwin White', 42.00], ['Hammer 16oz', 14.99], ['Garden Hose 50ft', 28.99]] },
  { store: 'IKEA',       items: [['BILLY Bookcase White', 99.00], ['KALLAX Shelf 4x4', 129.00], ['MALM Bed Frame Queen', 199.00]] },
  { store: 'Merrifield Garden Center', items: [['LOBELIA CARDINALIS 1Q', 10.99], ['Tomato Plant 1G', 8.99], ['Hydrangea 3G', 24.99]] },
]

const BANK_FEES = [
  { store: 'Big Bank', item: 'Interest Charge - Purchase',    base: 38.20 },
  { store: 'Big Bank', item: 'Foreign Transaction Fee',       base: 2.50 },
  { store: 'Chase',    item: 'ATM Fee',                       base: 3.00 },
  { store: 'Chase',    item: 'Late Payment Fee',              base: 29.00 },
]

// ─── Helpers ───────────────────────────────────────────────────────
const rand = (a, b) => a + Math.random() * (b - a)
const irand = (a, b) => Math.floor(rand(a, b + 1))
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const isoDate = (d) => d.toISOString().slice(0, 10)

function variantPrice(basePrice, mult) {
  // Wobble ±5% so the same item at the same store isn't exactly the
  // same price every visit. Mimics real-world sale + receipt drift.
  const wobble = 1 + (Math.random() - 0.5) * 0.1
  return Math.round(basePrice * mult * wobble * 100) / 100
}

// CSV row escape
function csv(row) {
  return row.map(v => {
    const s = String(v ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }).join(',')
}

// ─── Generation ────────────────────────────────────────────────────
const rows = []
const HEADER = ['date','store_name','item_name','qty','price','category','is_subscription','is_return','payment_method','notes']
rows.push(csv(HEADER))

const today = new Date()
const startDays = 540  // ~18 months back

// 1) Weekly groceries — rotating stores so Compare Stores has signal
const groceryStoreKeys = Object.keys(STORES)
for (let week = 78; week >= 0; week--) {
  const date = new Date(today)
  date.setDate(date.getDate() - week * 7 - irand(0, 2))
  const storeKey = groceryStoreKeys[week % groceryStoreKeys.length]
  const store = STORES[storeKey]
  const itemsThisWeek = []
  // Pick 5-8 items, common ones weighted heavier
  const numItems = irand(5, 8)
  const picked = new Set()
  while (picked.size < numItems) picked.add(pick(GROCERY_ITEMS).join('||'))
  for (const key of picked) {
    const [name, basePrice, cat] = key.split('||')
    itemsThisWeek.push({ name, price: variantPrice(Number(basePrice), store.mult), category: cat })
  }
  for (const it of itemsThisWeek) {
    rows.push(csv([
      isoDate(date), store.name, it.name, 1, it.price, it.category, 'N', 'N',
      pick(['Visa ending 4242','Amex ending 1001','Cash']),
      `Weekly grocery — ${store.name}`,
    ]))
  }
}

// 2) Bi-weekly household — Costco / Walmart / Target rotation
for (let n = 0; n < 40; n++) {
  const date = new Date(today)
  date.setDate(date.getDate() - n * 14 - irand(0, 3))
  const storeKey = ['costco','walmart','target'][n % 3]
  const store = STORES[storeKey]
  const numItems = irand(2, 4)
  const picked = new Set()
  while (picked.size < numItems) picked.add(pick(HOUSEHOLD_ITEMS).join('||'))
  for (const key of picked) {
    const [name, basePrice, cat] = key.split('||')
    rows.push(csv([
      isoDate(date), store.name, name, 1, variantPrice(Number(basePrice), store.mult), cat, 'N', 'N',
      'Visa ending 4242', 'Bi-weekly household',
    ]))
  }
}

// 3) Monthly subscriptions — 12 months back, with price bumps for some
for (let month = 17; month >= 0; month--) {
  const date = new Date(today.getFullYear(), today.getMonth() - month, 1 + irand(0, 5))
  for (const sub of SUBSCRIPTIONS) {
    let price = sub.price
    if (sub.changeAt != null && month > sub.changeAt) price = sub.before
    rows.push(csv([
      isoDate(date), sub.store, sub.item, 1, price, 'subscriptions', 'Y', 'N',
      'Visa ending 4242', 'Monthly subscription',
    ]))
  }
}

// 4) Restaurants — 2-3 per week for 78 weeks
for (let week = 78; week >= 0; week--) {
  const visits = irand(2, 3)
  for (let v = 0; v < visits; v++) {
    const date = new Date(today)
    date.setDate(date.getDate() - week * 7 - irand(0, 6))
    const r = pick(RESTAURANTS)
    rows.push(csv([
      isoDate(date), r.store, r.item, 1, variantPrice(r.price, 1.0), 'eats', 'N', 'N',
      pick(['Visa ending 4242','Cash','Amex ending 1001']),
      `Restaurant visit ${week}.${v}`,
    ]))
  }
}

// 5) Gas — once a week
for (let week = 78; week >= 0; week--) {
  const date = new Date(today)
  date.setDate(date.getDate() - week * 7 - irand(0, 5))
  const station = pick(GAS_STATIONS)
  const gallons = Math.round(rand(station.qtyRange[0], station.qtyRange[1]) * 10) / 10
  const total = Math.round(gallons * variantPrice(station.base, 1.0) * 100) / 100
  rows.push(csv([
    isoDate(date), station.store, `Fuel ${gallons}gal`, 1, total, 'gas', 'N', 'N',
    pick(['Costco Anywhere Visa','Shell Fleet Card','Visa ending 4242']),
    `Gas fill ${gallons}gal`,
  ]))
}

// 6) Healthcare — 2x/month
for (let n = 0; n < 36; n++) {
  const date = new Date(today)
  date.setDate(date.getDate() - n * 15 - irand(0, 5))
  const store = pick(HEALTH)
  const it = pick(store.items)
  rows.push(csv([
    isoDate(date), store.store, it[0], 1, variantPrice(it[1], 1.0), 'health', 'N', 'N',
    'Visa ending 4242', 'Pharmacy / health',
  ]))
}

// 7) Tech — sporadic, ~30 events
for (let n = 0; n < 30; n++) {
  const date = new Date(today)
  date.setDate(date.getDate() - irand(0, startDays))
  const item = pick(TECH)
  rows.push(csv([
    isoDate(date), item.store, item.item, 1, variantPrice(item.price, 1.0), 'tech', 'N', 'N',
    pick(['Visa ending 4242','Amex ending 1001']),
    'Electronics / tech',
  ]))
}

// 8) Transport — weekly Uber + monthly parking
for (let week = 78; week >= 0; week--) {
  const date = new Date(today)
  date.setDate(date.getDate() - week * 7 - irand(0, 6))
  const set = pick(TRANSPORT)
  const it = pick(set.items)
  rows.push(csv([
    isoDate(date), set.store, it[0], 1, variantPrice(it[1], 1.0), 'transport', 'N', 'N',
    'Visa ending 4242', 'Rideshare / parking',
  ]))
}

// 9) Entertainment — sporadic
for (let n = 0; n < 25; n++) {
  const date = new Date(today)
  date.setDate(date.getDate() - irand(0, startDays))
  const e = pick(ENTERTAINMENT)
  rows.push(csv([
    isoDate(date), e.store, e.item, e.qty || 1, variantPrice(e.price, 1.0), 'entertainment', 'N', 'N',
    'Visa ending 4242', 'Entertainment',
  ]))
}

// 10) Pet supplies — monthly
for (let n = 0; n < 18; n++) {
  const date = new Date(today)
  date.setDate(date.getDate() - n * 30 - irand(0, 4))
  const store = pick(PET)
  const it = pick(store.items)
  rows.push(csv([
    isoDate(date), store.store, it[0], 1, variantPrice(it[1], 1.0), 'household', 'N', 'N',
    'Visa ending 4242', 'Pet supplies',
  ]))
}

// 11) Beauty — sporadic
for (let n = 0; n < 30; n++) {
  const date = new Date(today)
  date.setDate(date.getDate() - irand(0, startDays))
  const store = pick(BEAUTY)
  const it = pick(store.items)
  rows.push(csv([
    isoDate(date), store.store, it[0], 1, variantPrice(it[1], 1.0), 'health', 'N', 'N',
    'Visa ending 4242', 'Beauty',
  ]))
}

// 12) Home improvement — sporadic
for (let n = 0; n < 20; n++) {
  const date = new Date(today)
  date.setDate(date.getDate() - irand(0, startDays))
  const store = pick(HOMEIMP)
  const it = pick(store.items)
  rows.push(csv([
    isoDate(date), store.store, it[0], 1, variantPrice(it[1], 1.0), 'household', 'N', 'N',
    pick(['Home Depot Card','Visa ending 4242']),
    'Home improvement / garden',
  ]))
}

// 13) Bank fees — monthly interest + occasional ATM/late
for (let month = 17; month >= 0; month--) {
  const date = new Date(today.getFullYear(), today.getMonth() - month, 28)
  rows.push(csv([
    isoDate(date), 'Big Bank', 'Interest Charge - Purchase', 1,
    Math.round(rand(20, 60) * 100) / 100, 'bank-fees', 'N', 'N',
    'Statement', 'Monthly interest',
  ]))
}
for (let n = 0; n < 8; n++) {
  const date = new Date(today)
  date.setDate(date.getDate() - irand(0, startDays))
  const bf = pick(BANK_FEES.slice(1))
  rows.push(csv([
    isoDate(date), bf.store, bf.item, 1, variantPrice(bf.base, 1.0), 'bank-fees', 'N', 'N',
    'Statement', 'Bank fee',
  ]))
}

// 14) Returns — sporadic, negative amount
for (let n = 0; n < 15; n++) {
  const date = new Date(today)
  date.setDate(date.getDate() - irand(0, startDays))
  const item = pick(TECH)
  rows.push(csv([
    isoDate(date), item.store, `RETURN - ${item.item}`, 1,
    -variantPrice(item.price, 1.0), 'tech', 'N', 'Y',
    'Visa ending 4242', 'Return',
  ]))
}

// 15) Coffee shop daily — Mon-Fri × 30 weeks = 150 rows
for (let week = 30; week >= 0; week--) {
  for (let dow = 1; dow <= 5; dow++) {
    const date = new Date(today)
    date.setDate(date.getDate() - week * 7 + (dow - 5))
    if (date > today) continue
    rows.push(csv([
      isoDate(date), 'Starbucks', 'Grande Latte', 1, variantPrice(5.85, 1.0), 'eats', 'N', 'N',
      'Visa ending 4242', 'Morning coffee',
    ]))
  }
}

// 16) Specialty / variant-name items for embedding-merge testing
const VARIANTS = ['KS WHOLE MILK Gallon', 'GREAT VALUE 2% MILK Gallon', 'KS WHOLE MILK Gallon', 'Costco MILK Gallon', 'KS DAILY MULTI 365CT']
for (let n = 0; n < 20; n++) {
  const date = new Date(today)
  date.setDate(date.getDate() - irand(0, startDays))
  const name = pick(VARIANTS)
  const storeKey = pick(['costco', 'walmart'])
  const store = STORES[storeKey]
  rows.push(csv([
    isoDate(date), store.name, name, 1, variantPrice(3.79, store.mult), 'grub', 'N', 'N',
    'Visa ending 4242', 'Variant name — embedding-merge test',
  ]))
}

// Cap at target — if we generated too few, fill with extra coffee
// trips; if too many, slice. We aim slightly over and trim.
const lines = rows.slice(0, TARGET_ROWS + 1)  // +1 for header

fs.writeFileSync(OUT, lines.join('\n') + '\n', 'utf8')
console.log(`Wrote ${lines.length - 1} rows to ${OUT}`)
console.log(`Spans dates: oldest to newest receipts across the past ~78 weeks`)

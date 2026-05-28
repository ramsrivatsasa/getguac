#!/usr/bin/env node
// Seed test data for the smashlist / predictions engine.
//
// Generates ~6 months of plausible receipts for the signed-in user, hitting
// /api/receipts/save (the canonical save pipeline) so dedup, store
// resolution, Tier-2 inference, and rewards-row creation all run exactly as
// in production. After receipts are inserted you should:
//
//   1. Open /predictions in the app — you should see weekly + bi-weekly +
//      monthly items appear with cadence-based reminders.
//   2. Open /reports — Top Stores should show Costco/Walmart/Target, and
//      the donut should show grocery/household categories.
//   3. (Optional) Hit /api/embeddings/backfill or click the "Embed" button
//      so the embedding-centroid merge path lights up across naming
//      variants (KS Whole Milk vs GV 2% Milk vs Horizon Organic).
//
// Cadences exercised (designed to make the predictor's behavior easy to
// eyeball — the cadence math is explainability-load-bearing):
//   - WEEKLY        24 buys: milk, eggs, bread, bananas
//   - BI-WEEKLY     12 buys: paper towels, dish soap, coffee
//   - MONTHLY        6 buys: laundry detergent, dog food, vitamins
//   - QUARTERLY      2 buys: air filter, batteries     (sparse — should NOT predict next week)
//   - ONE-OFF        1 buy : random impulse items       (should NOT predict)
//
// Naming-variation realism: each canonical item has 3 different store-specific
// names so the embedding-centroid merge step has work to do.
//
// Safety:
//   - Every seeded receipt has validation_comment="[SEED v1]" so you can
//     find + delete them later (`--wipe` flag does this).
//   - Each receipt uses an Idempotency-Key derived from its synthetic id, so
//     re-running the script is a no-op (cached replay).
//
// Usage:
//   1. Sign into the app in your browser.
//   2. In devtools console: copy(await (await fetch('/api/_debug/session-token')).text())
//      OR run this in the console:
//        copy((await window._supabase?.auth.getSession())?.data?.session?.access_token)
//      OR open Application → Cookies → copy the sb-...-auth-token value's access_token.
//   3. Run:
//        BASE_URL=http://localhost:3000 \
//        ACCESS_TOKEN=eyJhbGciOi... \
//        node web/scripts/seed-predictions.mjs
//      Or to wipe seeded data:
//        ACCESS_TOKEN=... node web/scripts/seed-predictions.mjs --wipe
//
// Why a script and not a SQL seed: the predictor relies on store_id +
// store_location_id resolution, Tier-2 inference, and (later) embeddings —
// all of which happen inside the save pipeline. Going through HTTP keeps the
// test data shaped exactly like real receipts.

import { randomUUID, createHash } from 'node:crypto'

// ─── Config ──────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const ACCESS_TOKEN = process.env.ACCESS_TOKEN
const SEED_MARKER = '[SEED v1]'
const MODE = process.argv.includes('--wipe') ? 'wipe' : 'seed'

if (!ACCESS_TOKEN) {
  console.error('ACCESS_TOKEN env var required. See file header for how to get one.')
  process.exit(1)
}

// ─── Catalog: canonical items × store-specific names ─────────────────────

const STORES = [
  { name: 'Costco Wholesale',  city: 'Issaquah',  state: 'WA', zip: '98027' },
  { name: 'Walmart',           city: 'Bellevue',  state: 'WA', zip: '98004' },
  { name: 'Target',            city: 'Redmond',   state: 'WA', zip: '98052' },
]

// Each item: canonical id, category, three store-specific names + prices.
// Names varied enough that an exact-string match would fail — only the
// embedding-centroid merge collapses them. Prices roughly market 2026.
const CATALOG = {
  weekly: [
    {
      id: 'milk',
      category: 'groceries',
      variants: {
        'Costco Wholesale': { name: 'KS ORGANIC WHOLE MILK 2 PK',  price: 8.99 },
        'Walmart':          { name: 'GREAT VALUE 2% MILK 1 GAL',    price: 3.78 },
        'Target':           { name: 'HORIZON ORGANIC WHOLE 1/2 GAL', price: 5.49 },
      },
    },
    {
      id: 'eggs',
      category: 'groceries',
      variants: {
        'Costco Wholesale': { name: 'KIRKLAND CAGE FREE EGGS 24CT', price: 7.49 },
        'Walmart':          { name: 'GV LARGE EGGS DOZEN',          price: 3.12 },
        'Target':           { name: 'GOOD&GATHER FREE RANGE 12CT',  price: 4.99 },
      },
    },
    {
      id: 'bread',
      category: 'groceries',
      variants: {
        'Costco Wholesale': { name: 'DAVES KILLER 21 GRAIN 2 PK',   price: 7.99 },
        'Walmart':          { name: 'WONDER CLASSIC WHITE 20OZ',    price: 2.48 },
        'Target':           { name: 'NATURES OWN HONEY WHEAT',      price: 3.79 },
      },
    },
    {
      id: 'bananas',
      category: 'groceries',
      variants: {
        'Costco Wholesale': { name: 'ORG BANANAS 3LB',              price: 1.99 },
        'Walmart':          { name: 'FRESH BANANAS LB',             price: 0.58 },
        'Target':           { name: 'BANANAS BUNCH',                price: 1.29 },
      },
    },
  ],
  biweekly: [
    {
      id: 'paper_towels',
      category: 'household',
      variants: {
        'Costco Wholesale': { name: 'KS PAPER TOWELS 12 ROLL',      price: 22.99 },
        'Walmart':          { name: 'BOUNTY SELECT-A-SIZE 6 PK',    price: 17.84 },
        'Target':           { name: 'UP&UP ULTRA STRONG 8 ROLL',    price: 12.99 },
      },
    },
    {
      id: 'dish_soap',
      category: 'household',
      variants: {
        'Costco Wholesale': { name: 'DAWN PLATINUM 90 OZ',          price: 14.99 },
        'Walmart':          { name: 'DAWN ULTRA ORIGINAL 38OZ',     price: 6.97 },
        'Target':           { name: 'METHOD SQUIRT+MOP 25OZ',       price: 4.49 },
      },
    },
    {
      id: 'coffee',
      category: 'groceries',
      variants: {
        'Costco Wholesale': { name: 'KS COLOMBIAN WHOLE BEAN 3LB',  price: 19.99 },
        'Walmart':          { name: 'FOLGERS CLASSIC ROAST 48OZ',   price: 14.97 },
        'Target':           { name: 'STARBUCKS PIKE PLACE 18OZ',    price: 13.99 },
      },
    },
  ],
  monthly: [
    {
      id: 'laundry',
      category: 'household',
      variants: {
        'Costco Wholesale': { name: 'TIDE HE LIQUID 170 LOADS',     price: 24.99 },
        'Walmart':          { name: 'GAIN ORIGINAL 88 LOADS',       price: 13.97 },
        'Target':           { name: 'TIDE PODS SPRING MEADOW 81CT', price: 21.99 },
      },
    },
    {
      id: 'dog_food',
      category: 'pets',
      variants: {
        'Costco Wholesale': { name: 'KS ADULT CHICKEN&RICE 40LB',   price: 39.99 },
        'Walmart':          { name: 'PURINA PRO PLAN 35LB',         price: 54.98 },
        'Target':           { name: 'BLUE BUFFALO LIFE PROT 30LB',  price: 64.99 },
      },
    },
    {
      id: 'vitamins',
      category: 'health',
      variants: {
        'Costco Wholesale': { name: 'KS DAILY MULTI 365CT',         price: 11.99 },
        'Walmart':          { name: 'ONE A DAY MENS 200CT',         price: 14.97 },
        'Target':           { name: 'NATURE MADE WOMENS 90CT',      price: 9.99 },
      },
    },
  ],
  quarterly: [
    {
      id: 'air_filter',
      category: 'household',
      variants: {
        'Costco Wholesale': { name: 'FILTRETE 16x25x1 MERV 11 4PK', price: 39.99 },
        'Walmart':          { name: 'HONEYWELL FPR 7 16X25X1',      price: 8.97 },
        'Target':           { name: '3M FILTRETE ALLERGEN 20X25',   price: 24.99 },
      },
    },
    {
      id: 'batteries',
      category: 'household',
      variants: {
        'Costco Wholesale': { name: 'KS AA ALKALINE 48 PK',         price: 16.99 },
        'Walmart':          { name: 'ENERGIZER MAX AA 24CT',        price: 17.97 },
        'Target':           { name: 'DURACELL COPPERTOP AAA 16CT',  price: 11.99 },
      },
    },
  ],
  oneoff: [
    { id: 'umbrella',    category: 'misc',    name: 'TOTES AUTO UMBRELLA',       price: 14.99 },
    { id: 'mixer_bowl',  category: 'kitchen', name: 'OXO MIXING BOWL 3QT',       price: 19.99 },
    { id: 'phone_cable', category: 'misc',    name: 'ANKER USB-C CABLE 6FT',     price: 12.99 },
    { id: 'sunglasses',  category: 'misc',    name: 'FOSTER GRANT POLARIZED',    price: 24.99 },
  ],
}

// ─── Date helpers (anchor on today; walk backward 6 months) ──────────────

const TODAY = new Date()
function daysAgo(n) {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// ─── Receipt builder ─────────────────────────────────────────────────────

// Idempotency-Key: deterministic from a stable synthetic id so re-running
// the script returns the cached receipt instead of creating duplicates.
function idemKey(syntheticId) {
  return createHash('sha256').update(`seed-predictions:${syntheticId}`).digest('hex').slice(0, 32)
}

function pickStore(i) {
  // Rotate stores so each cadence cohort touches all 3, giving the
  // embedding merge multiple naming variants per canonical item.
  return STORES[i % STORES.length]
}

function buildReceipt({ syntheticId, store, dateStr, items }) {
  const total = items.reduce((s, it) => s + Number(it.price) * (it.qty || 1), 0)
  const tax = Math.round(total * 0.092 * 100) / 100   // ~9.2% WA combined
  return {
    syntheticId,
    parsed: {
      store_name: store.name,
      store_address: `100 Main St`,
      store_city: store.city,
      store_state: store.state,
      store_zip: store.zip,
      date: dateStr,
      total_amount: Math.round((total + tax) * 100) / 100,
      tax_paid: tax,
      payment_method: 'Visa',
      payment_last4: '4242',
      items,
    },
    validation_comment: SEED_MARKER,
  }
}

// Build the full set of receipts. Each cadence cohort gets its own anchored
// schedule so a "Wednesday milk run" pattern emerges cleanly.
function buildAllReceipts() {
  const receipts = []
  let cursor = 0

  // WEEKLY: 24 buys, every 7 days, rotating stores. Each receipt contains
  // a random 2-3 of the weekly items (real grocery runs aren't uniform).
  for (let i = 0; i < 24; i++) {
    const store = pickStore(i)
    const dateStr = daysAgo(i * 7 + 1)     // last week, 2 weeks ago, ...
    const pick = pickN(CATALOG.weekly, 2 + (i % 2))
    const items = pick.map(it => ({
      item_name: it.variants[store.name].name,
      price: it.variants[store.name].price,
      qty: 1,
      category: it.category,
    }))
    receipts.push(buildReceipt({
      syntheticId: `weekly-${i}-${store.name}`,
      store, dateStr, items,
    }))
    cursor++
  }

  // BI-WEEKLY: 12 buys, every 14 days. Layer onto the same receipts? No —
  // give them their own receipts to keep the cadence math unambiguous.
  for (let i = 0; i < 12; i++) {
    const store = pickStore(i + 1)
    const dateStr = daysAgo(i * 14 + 4)
    const pick = pickN(CATALOG.biweekly, 2)
    const items = pick.map(it => ({
      item_name: it.variants[store.name].name,
      price: it.variants[store.name].price,
      qty: 1,
      category: it.category,
    }))
    receipts.push(buildReceipt({
      syntheticId: `biweekly-${i}-${store.name}`,
      store, dateStr, items,
    }))
    cursor++
  }

  // MONTHLY: 6 buys, every ~30 days.
  for (let i = 0; i < 6; i++) {
    const store = pickStore(i + 2)
    const dateStr = daysAgo(i * 30 + 8)
    const pick = pickN(CATALOG.monthly, 2)
    const items = pick.map(it => ({
      item_name: it.variants[store.name].name,
      price: it.variants[store.name].price,
      qty: 1,
      category: it.category,
    }))
    receipts.push(buildReceipt({
      syntheticId: `monthly-${i}-${store.name}`,
      store, dateStr, items,
    }))
    cursor++
  }

  // QUARTERLY: 2 buys, ~90 days apart. Predictor should NOT surface these
  // as "due now" — they're a negative-control to catch overprediction.
  for (let i = 0; i < 2; i++) {
    const store = pickStore(i)
    const dateStr = daysAgo(i * 90 + 20)
    const items = CATALOG.quarterly.map(it => ({
      item_name: it.variants[store.name].name,
      price: it.variants[store.name].price,
      qty: 1,
      category: it.category,
    }))
    receipts.push(buildReceipt({
      syntheticId: `quarterly-${i}-${store.name}`,
      store, dateStr, items,
    }))
    cursor++
  }

  // ONE-OFFS: single buys. Predictor should never surface these.
  CATALOG.oneoff.forEach((it, i) => {
    const store = pickStore(i)
    const dateStr = daysAgo(15 + i * 11)
    receipts.push(buildReceipt({
      syntheticId: `oneoff-${it.id}-${store.name}`,
      store, dateStr,
      items: [{
        item_name: it.name,
        price: it.price,
        qty: 1,
        category: it.category,
      }],
    }))
    cursor++
  })

  return receipts
}

function pickN(arr, n) {
  const out = []
  const used = new Set()
  while (out.length < Math.min(n, arr.length)) {
    const idx = Math.floor(Math.random() * arr.length)
    if (used.has(idx)) continue
    used.add(idx)
    out.push(arr[idx])
  }
  return out
}

// ─── HTTP plumbing ───────────────────────────────────────────────────────

async function postSave({ parsed, syntheticId, validation_comment }) {
  const res = await fetch(`${BASE_URL}/api/receipts/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Idempotency-Key': idemKey(syntheticId),
    },
    body: JSON.stringify({ parsed, validation_comment }),
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { error: text } }
  if (!res.ok) throw new Error(`${res.status} ${json.error || text}`)
  return json
}

// ─── Wipe path ───────────────────────────────────────────────────────────
// Wipe goes through a dedicated server endpoint so RLS-correct deletes
// happen there (we don't ship a service-role key to a node script). Below
// we just guide the user to run it manually — keeping the script
// dependency-free.

async function wipe() {
  console.log(`Wipe path: open Supabase SQL editor and run:

  -- Preview what will be deleted:
  select id, store_name, date, total_amount, validation_comment
    from public.receipts
   where user_id = auth.uid()
     and validation_comment = '${SEED_MARKER}'
   order by date desc;

  -- Then delete (receipt_items cascade via FK):
  delete from public.receipts
   where user_id = auth.uid()
     and validation_comment = '${SEED_MARKER}';

This intentionally uses auth.uid() so it only ever touches your own seeded
rows. Receipt_items rows are removed by the ON DELETE CASCADE on their FK.`)
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  if (MODE === 'wipe') return wipe()

  const receipts = buildAllReceipts()
  console.log(`Seeding ${receipts.length} receipts via ${BASE_URL}/api/receipts/save ...`)
  let ok = 0, replayed = 0, failed = 0
  for (const r of receipts) {
    try {
      const result = await postSave(r)
      if (result.replayed) replayed++
      else ok++
      const d = r.parsed.date
      const n = r.parsed.items.length
      process.stdout.write(`  ${result.replayed ? '↩' : '+'} ${d}  ${r.parsed.store_name.padEnd(20)}  ${n} item${n === 1 ? '' : 's'}  $${r.parsed.total_amount.toFixed(2)}\n`)
    } catch (e) {
      failed++
      console.error(`  ✗ ${r.syntheticId}: ${e.message}`)
    }
  }
  console.log(`\nDone: ${ok} new, ${replayed} replayed (idempotent), ${failed} failed.`)
  console.log(`\nNext steps:`)
  console.log(`  1. Visit /predictions — weekly + bi-weekly + monthly items should appear.`)
  console.log(`  2. Visit /reports — Top Stores: Costco/Walmart/Target.`)
  console.log(`  3. (Optional) curl -X POST ${BASE_URL}/api/embeddings/backfill`)
  console.log(`     -H "Authorization: Bearer $ACCESS_TOKEN"  # backfills item embeddings`)
  console.log(`     so the centroid-merge path also lights up across naming variants.`)
}

main().catch(e => { console.error(e); process.exit(1) })

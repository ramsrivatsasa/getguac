// Seed a staging Supabase project with realistic synthetic data so the
// load test exercises real query plans (indexes, RLS policies, joins)
// instead of empty tables.
//
// Generates: 1000 synthetic profiles × ~80 receipts each × ~5 items
// per receipt = ~80K receipts, ~400K receipt_items. Hits the magnitude
// where missing indexes start to bite, but stays under the Supabase
// free-tier row caps.
//
// === USAGE ===
//   1. Create a separate Supabase project for staging. Apply ALL
//      migrations from web/supabase/ in order.
//   2. Grab the service role key (Project Settings → API).
//   3. Run:
//        STAGING_URL=https://<project>.supabase.co \
//        STAGING_SERVICE_KEY=<service-role-key> \
//        node loadtest/seed-staging.mjs
//   4. Re-run the same script later with --reset to truncate everything
//      first (it's idempotent on the synthetic user_ids).
//
// Reads no env beyond STAGING_URL + STAGING_SERVICE_KEY. NEVER points
// at prod by design — the bare envvar prevents accidental clobber.

import { createClient } from '@supabase/supabase-js'

const URL = process.env.STAGING_URL
const KEY = process.env.STAGING_SERVICE_KEY
if (!URL || !KEY) {
  console.error('Set STAGING_URL + STAGING_SERVICE_KEY before running.')
  process.exit(1)
}
if (URL.includes('qchkwojgvfhlbdtpzzig')) {
  console.error('Refusing to run against the production project ID.')
  process.exit(1)
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } })

const N_USERS = parseInt(process.env.N_USERS || '1000', 10)
const RECEIPTS_PER_USER = parseInt(process.env.RECEIPTS_PER_USER || '80', 10)
const ITEMS_PER_RECEIPT = parseInt(process.env.ITEMS_PER_RECEIPT || '5', 10)

const STORES = ['Costco', 'Trader Joe\'s', 'Whole Foods', 'Target', 'Walmart', 'Safeway', 'Sprouts', 'Aldi', 'Amazon', 'CVS']
const ITEMS = ['Tide Pods', 'Bananas', 'Greek Yogurt', 'Olive Oil', 'Cherrios', 'Whole Milk', 'Sourdough Bread', 'Eggs', 'Avocados', 'Spinach', 'Chicken Breast', 'Salmon', 'Apples', 'Coca-Cola', 'Sparkling Water', 'Paper Towels', 'Toothpaste', 'Shampoo']
const CATEGORIES = ['grocery', 'household', 'health', 'restaurant', 'apparel', 'gas']

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function daysAgoIso(d) {
  const x = new Date()
  x.setDate(x.getDate() - d)
  return x.toISOString().slice(0, 10)
}

async function chunked(rows, table, size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    const slice = rows.slice(i, i + size)
    const { error } = await sb.from(table).insert(slice)
    if (error) throw error
    if (i % (size * 10) === 0) console.log(`  ${table}: ${i}/${rows.length}`)
  }
}

async function reset() {
  console.log('Resetting synthetic rows…')
  // Delete by synthetic prefix. Order matters: items → receipts → profiles.
  await sb.from('receipt_items').delete().like('item_name', '%[loadtest]%')
  await sb.from('receipts').delete().like('store_name', '%[loadtest]%')
  // profiles delete also cascades to anything FK-linked.
  await sb.from('profiles').delete().like('first_name', 'loadtest-%')
}

async function main() {
  if (process.argv.includes('--reset')) {
    await reset()
    console.log('Reset done.')
    return
  }

  console.log(`Seeding ${N_USERS} users × ${RECEIPTS_PER_USER} receipts × ${ITEMS_PER_RECEIPT} items…`)

  const userIds = []

  // 1. Profiles — synthetic users. We can't create real auth.users without
  //    burning auth quota, so we insert directly into profiles.id with
  //    deterministic UUIDs. Skip the auth-user link for the load test.
  const profiles = []
  for (let i = 0; i < N_USERS; i++) {
    const id = `00000000-0000-0000-0000-${i.toString().padStart(12, '0')}`
    userIds.push(id)
    profiles.push({
      id,
      first_name: `loadtest-${i}`,
      email_alias: `loadtest${i}`,
      smash_days_bonus: 0,
    })
  }
  console.log(`Inserting ${profiles.length} profiles…`)
  await chunked(profiles, 'profiles', 1000)

  // 2. Receipts — RECEIPTS_PER_USER per user, spread over the last 180 days.
  let receiptCounter = 0
  for (let u = 0; u < userIds.length; u++) {
    const userId = userIds[u]
    const receipts = []
    for (let r = 0; r < RECEIPTS_PER_USER; r++) {
      receipts.push({
        user_id: userId,
        store_name: `${pick(STORES)} [loadtest]`,
        date: daysAgoIso(randInt(0, 180)),
        total_amount: randInt(800, 25000) / 100,
        tax_paid: randInt(0, 1500) / 100,
        category: pick(CATEGORIES),
      })
      receiptCounter++
    }
    const { data: inserted, error } = await sb.from('receipts').insert(receipts).select('id')
    if (error) throw error

    // 3. Items per receipt. Insert in one batch per user.
    const items = []
    for (const rec of inserted) {
      for (let i = 0; i < ITEMS_PER_RECEIPT; i++) {
        items.push({
          receipt_id: rec.id,
          item_name: `${pick(ITEMS)} [loadtest]`,
          qty: randInt(1, 4),
          price: randInt(99, 1999) / 100,
          returned: false,
        })
      }
    }
    if (items.length > 0) await chunked(items, 'receipt_items', 1000)

    if (u % 50 === 0) console.log(`  users: ${u}/${userIds.length} (${receiptCounter} receipts so far)`)
  }

  console.log(`Done. ${receiptCounter} receipts + ${receiptCounter * ITEMS_PER_RECEIPT} items seeded.`)
  console.log(`Hand off to k6: k6 run --vus 1000 --duration 120s loadtest/k6-1k-users.js`)
}

main().catch(e => { console.error(e); process.exit(1) })

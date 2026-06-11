#!/usr/bin/env node
// =============================================================================
// Seed a dedicated DEMO account with full, believable feature data.
// =============================================================================
// Used to produce App Store / Play screenshots and the how-it-works video
// against screens that look populated. Creates (or reuses) a stable demo user
// via the Supabase admin API, then inserts the same data set as
// scripts/seed-test-data.sql — ported to service-role JS inserts because we
// have the service-role key but no direct Postgres connection string.
//
//   - Weekly / bi-weekly / monthly grocery cadences  → Predictions + Smashlist
//   - Rated receipts (1-5★)                          → GuacScore / dashboard
//   - Subscriptions (Netflix/Spotify/Apple/Hulu)     → anomaly + subscription cards
//   - Merchant spike (Target 4×)                     → anomaly card
//   - Business + charity receipts                    → Reports tax summary
//   - Bank fees + interest                           → GuacScore bite penalty
//   - Predicted + curated shopping_list rows         → Smashlist buckets
//   - Rewards rows                                   → /rewards
//
// All seed rows are tagged so a re-run wipes the prior set for THIS user only.
//
// Usage:
//   node web/scripts/seed-demo-account.mjs           # create+seed demo user
//   node web/scripts/seed-demo-account.mjs --wipe    # remove seed rows only
//   DEMO_EMAIL=demo@getguac.app DEMO_PASSWORD='Guac!Demo2026' node ...
// =============================================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── env: parse web/.env.local (no dotenv dependency) ──────────────────────
function loadEnv() {
  const out = { ...process.env }
  try {
    const txt = readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8')
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !(m[1] in out)) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* env file optional if vars already exported */ }
  return out
}

const env = loadEnv()
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!URL || !ANON_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (web/.env.local).')
  process.exit(1)
}

const DEMO_EMAIL = env.DEMO_EMAIL || 'demo@getguac.app'
const DEMO_PASSWORD = env.DEMO_PASSWORD || 'Guac!Demo2026'
const TAG = '[SEED v2 SQL]' // reuse the SQL seed's marker so cleanup is shared
const WIPE_ONLY = process.argv.includes('--wipe')

// Anon client; we authenticate AS the demo user so RLS scopes every write to
// its own auth.uid(). No service-role key required.
const sb = createClient(URL, ANON_KEY, { auth: { persistSession: false } })

// ─── date helpers (UTC, YYYY-MM-DD) ────────────────────────────────────────
const MS_DAY = 86_400_000
const TODAY = new Date()
function daysAgo(n) {
  const d = new Date(TODAY.getTime() - n * MS_DAY)
  return d.toISOString().slice(0, 10)
}
function daysAhead(n) {
  const d = new Date(TODAY.getTime() + n * MS_DAY)
  return d.toISOString().slice(0, 10)
}

// ─── demo user: sign up (first run) or sign in (re-run) ─────────────────────
async function ensureDemoUser() {
  // Seed AS the demo user — RLS scopes every write to auth.uid(). signUp
  // returns a session immediately when email confirmation is off; otherwise
  // the user already exists, so sign in.
  let { data, error } = await sb.auth.signUp({
    email: DEMO_EMAIL, password: DEMO_PASSWORD,
    options: { data: { full_name: 'Demo Guac', is_demo: true } },
  })
  if (error || !data?.session) {
    ;({ data, error } = await sb.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD }))
    if (error) throw new Error(`Could not sign in demo user: ${error.message}`)
  }
  if (!data?.session) {
    throw new Error('No session for demo user — email confirmation is likely required. ' +
      'Either disable it (Supabase → Auth → Providers → Email → confirm off) or add ' +
      'SUPABASE_SERVICE_ROLE_KEY to seed via the admin API.')
  }
  return data.user.id
}

// ─── store find-or-create (shared table, no user_id) ───────────────────────
async function ensureStore(name) {
  const { data: hit } = await sb.from('stores').select('id').ilike('store_name', name).limit(1)
  if (hit && hit[0]) return hit[0].id
  const { data, error } = await sb.from('stores').insert({ store_name: name }).select('id').single()
  if (error) throw error
  return data.id
}

async function addReceipt(row) {
  const { data, error } = await sb.from('receipts').insert(row).select('id').single()
  if (error) throw error
  return data.id
}
async function addItems(rows) {
  if (!rows.length) return
  const { error } = await sb.from('receipt_items').insert(rows)
  if (error) throw error
}

// ─── wipe prior seed for this user (idempotent) ────────────────────────────
async function wipe(uid) {
  await sb.from('shopping_list').delete().eq('user_id', uid).eq('comments', TAG)
  await sb.from('receipts').delete().eq('user_id', uid).eq('validation_comment', TAG) // receipt_items cascade
  await sb.from('bank_fees').delete().eq('user_id', uid).like('raw_description', `${TAG}%`)
  await sb.from('rewards').delete().eq('user_id', uid).like('reward_no', 'SEED-%')
}

async function seed(uid) {
  const costco = await ensureStore('Costco Wholesale')
  const walmart = await ensureStore('Walmart')
  const target = await ensureStore('Target')
  const storeFor = i => [['Costco Wholesale', costco], ['Walmart', walmart], ['Target', target]][i % 3]

  // 1. WEEKLY GROCERY RUNS (24 buys, rotating 3 stores)
  for (let i = 0; i <= 23; i++) {
    const d = daysAgo(i * 7 + 6)
    const [name, sid] = storeFor(i)
    const total = 35.0 + (i % 5) * 3.5
    const rid = await addReceipt({
      user_id: uid, store_name: name, store_id: sid, date: d,
      total_amount: total, tax_paid: +(total * 0.082).toFixed(2),
      category: 'grub', rating: i < 4 ? 4 : 5, is_return: false,
      business_purchase: false, validation_comment: TAG, processed: true,
    })
    const m = i % 3
    await addItems([
      { receipt_id: rid, item_name: 'MILK', qty: 1, price: [3.99, 4.79, 5.49][m], category: 'grub', purchase_date: d },
      { receipt_id: rid, item_name: 'EGGS', qty: 1, price: [3.99, 4.29, 4.99][m], category: 'grub', purchase_date: d },
      { receipt_id: rid, item_name: 'BANANAS', qty: 1, price: [1.19, 0.59, 0.79][m], category: 'grub', purchase_date: d },
      { receipt_id: rid, item_name: 'BREAD', qty: 1, price: [3.49, 2.99, 3.79][m], category: 'grub', purchase_date: d },
      { receipt_id: rid, item_name: 'COFFEE', qty: 1, price: [9.99, 11.99, 13.49][m], category: 'drinks', purchase_date: d },
      { receipt_id: rid, item_name: 'CHIPS', qty: 1, price: [4.49, 2.99, 3.49][m], category: 'snacks', purchase_date: d },
    ])
  }

  // 2. BI-WEEKLY HOUSEHOLD (12 buys)
  for (let i = 0; i <= 11; i++) {
    const d = daysAgo(i * 14 + 12)
    const rid = await addReceipt({
      user_id: uid, store_name: 'Target', store_id: target, date: d,
      total_amount: 22.5, tax_paid: +(22.5 * 0.082).toFixed(2),
      category: 'household', rating: 4, validation_comment: TAG, processed: true,
    })
    await addItems([
      { receipt_id: rid, item_name: 'BOUNTY SELECT-A-SIZE 6 PK', qty: 1, price: 17.84, category: 'household', purchase_date: d },
      { receipt_id: rid, item_name: 'DAWN ULTRA ORIGINAL', qty: 1, price: 4.66, category: 'household', purchase_date: d },
      { receipt_id: rid, item_name: 'GREEN TEA', qty: 1, price: 4.49, category: 'tea', purchase_date: d },
      { receipt_id: rid, item_name: 'GRANOLA BARS', qty: 1, price: 5.99, category: 'snacks', purchase_date: d },
    ])
  }

  // 3. MONTHLY RESTOCK (6 buys)
  for (let i = 0; i <= 5; i++) {
    const d = daysAgo(i * 30 + 25)
    const rid = await addReceipt({
      user_id: uid, store_name: 'Costco Wholesale', store_id: costco, date: d,
      total_amount: 89.99, tax_paid: +(89.99 * 0.082).toFixed(2),
      category: 'household', rating: 5, validation_comment: TAG, processed: true,
    })
    await addItems([
      { receipt_id: rid, item_name: 'TIDE HE LIQUID 170 LOADS', qty: 1, price: 24.99, category: 'household', purchase_date: d },
      { receipt_id: rid, item_name: 'KS DAILY MULTI 365CT', qty: 1, price: 11.99, category: 'health', purchase_date: d },
      { receipt_id: rid, item_name: 'KS ADULT CHICKEN&RICE 40LB', qty: 1, price: 39.99, category: 'pets', purchase_date: d },
      { receipt_id: rid, item_name: 'PAPER TOWELS 12 ROLL', qty: 1, price: 22.99, category: 'household', purchase_date: d },
      { receipt_id: rid, item_name: 'POPCORN MULTIPACK', qty: 1, price: 8.99, category: 'snacks', purchase_date: d },
    ])
  }

  // 4. MONTHLY SUBSCRIPTIONS
  const sub = (store, amount, offset, i, n) => addReceipt({
    user_id: uid, store_name: store, date: daysAgo(i * 30 + offset),
    total_amount: amount, tax_paid: 0, category: 'subscriptions',
    validation_comment: TAG, processed: true,
  })
  for (let i = 0; i <= 5; i++) await sub('NETFLIX.COM', i === 0 ? 17.99 : 15.49, 2, i)
  for (let i = 0; i <= 5; i++) await sub('Spotify', 10.99, 5, i)
  for (let i = 0; i <= 5; i++) await sub('Apple.com/Bill', 19.95, 12, i)
  // 5. MISSING-RECURRING: Hulu paid 5× then silence (~70+ days ago)
  for (let i = 1; i <= 5; i++) await sub('Hulu', 12.99, 70, i)

  // 6. MERCHANT SPIKE: Target 4× usual in last 5 days
  await addReceipt({
    user_id: uid, store_name: 'Target', date: daysAgo(3), total_amount: 285.0,
    tax_paid: +(285.0 * 0.082).toFixed(2), category: 'household', rating: 3,
    validation_comment: TAG, processed: true,
  })

  // 7. BUSINESS PURCHASES (tax summary)
  for (let i = 0; i <= 3; i++) {
    await addReceipt({
      user_id: uid, store_name: 'Office Depot', date: daysAgo(i * 22 + 6),
      total_amount: 65.4, tax_paid: +(65.4 * 0.082).toFixed(2), category: 'office',
      business_purchase: true, rating: 5, validation_comment: TAG, processed: true,
    })
  }

  // 8. CHARITY DONATIONS (tax summary)
  for (let i = 0; i <= 2; i++) {
    await addReceipt({
      user_id: uid, store_name: 'Goodwill', date: daysAgo(i * 45 + 10),
      total_amount: 50.0, tax_paid: 0, category: 'charity',
      validation_comment: TAG, processed: true,
    })
  }

  // 9. ONE-OFF + QUARTERLY (negative controls)
  await addReceipt({ user_id: uid, store_name: 'Home Depot', date: daysAgo(20), total_amount: 14.99, tax_paid: 1.2, category: 'household', validation_comment: TAG, processed: true })
  await addReceipt({ user_id: uid, store_name: 'Best Buy', date: daysAgo(88), total_amount: 129.99, tax_paid: 10.6, category: 'tech', validation_comment: TAG, processed: true })
  await addReceipt({ user_id: uid, store_name: 'Patagonia', date: daysAgo(55), total_amount: 89.0, tax_paid: 7.3, category: 'apparel', validation_comment: TAG, processed: true })

  // 10. BANK FEES + INTEREST (GuacScore bite penalty)
  const fees = []
  for (let i = 0; i <= 3; i++) {
    fees.push({ user_id: uid, date: daysAgo(i * 30 + 5), kind: 'interest', fee_kind: 'Purchase interest', merchant: 'AMEX', amount: 20.0, raw_description: `${TAG} purchase interest` })
    fees.push({ user_id: uid, date: daysAgo(i * 30 + 9), kind: 'fee', fee_kind: 'Late fee', merchant: 'CHASE', amount: 10.0, raw_description: `${TAG} late fee` })
  }
  { const { error } = await sb.from('bank_fees').insert(fees); if (error) throw error }

  // 11. PREDICTED + CURATED shopping_list rows
  const predicted = [
    ['Whole Milk', 'Weekly', 'Pantry', costco, 'Avg every 7d, last bought 9d ago', 7, 9],
    ['Paper Towels', 'Biweekly', 'Pantry', target, 'Avg every 14d, last bought 13d ago', 14, 13],
    ['Dog Food', 'Monthly', 'Pantry', costco, 'Avg every 30d, last bought 28d ago', 30, 28],
    ['Cold Brew Coffee', 'Weekly', 'Cravings', costco, 'Avg every 7d, last bought 6d ago', 7, 6],
    ['Sparkling Water 12pk', 'Biweekly', 'Cravings', target, 'Avg every 14d, last bought 18d ago', 14, 18],
    ['Tortilla Chips', 'Weekly', 'Snack Stack', walmart, 'Avg every 7d, last bought 8d ago', 7, 8],
    ['Trail Mix', 'Biweekly', 'Snack Stack', target, 'Avg every 14d, last bought 12d ago', 14, 12],
    ['Frozen Pizza', 'Biweekly', 'Grub & Grab', walmart, 'Avg every 14d, last bought 17d ago', 14, 17],
    ['Ready Meals', 'Weekly', 'Grub & Grab', target, 'Avg every 7d, last bought 6d ago', 7, 6],
  ].map(([item, freq, list, sid, reason, cad, last]) => ({
    user_id: uid, item_name: item, qty: 1, frequency: freq, list_name: list,
    store_name_id: String(sid), predicted: true, predicted_reason: reason,
    predicted_avg_cadence_days: cad, predicted_last_purchase_date: daysAgo(last),
    approved: false, sent_to_store: false, comments: TAG,
  }))
  { const { error } = await sb.from('shopping_list').insert(predicted); if (error) throw error }

  const curated = [
    ['Coffee Beans', 'Cravings'], ['Cookies', 'Snack Stack'], ['Birthday Card', 'Grub & Grab'],
  ].map(([item, list]) => ({
    user_id: uid, item_name: item, qty: 1, frequency: 'Monthly', list_name: list,
    predicted: false, approved: true, sent_to_store: false, comments: TAG,
  }))
  { const { error } = await sb.from('shopping_list').insert(curated); if (error) throw error }

  // 12. REWARDS rows
  const short = uid.slice(0, 8)
  const rewards = [
    ['Costco Wholesale', `SEED-COSTCO-${short}`, 'loyalty', 'Costco Gold Star'],
    ['Target', `SEED-TARGET-${short}`, 'loyalty', 'Target Circle'],
    ['Walmart', `SEED-WMART-${short}`, 'loyalty', 'Walmart+ Member'],
  ].map(([store, no, type, title]) => ({
    user_id: uid, store_name: store, reward_no: no, expiry_date: daysAhead(365),
    reward_type: type, reward_title: title,
  }))
  { const { error } = await sb.from('rewards').insert(rewards); if (error) throw error }
}

// ─── main ──────────────────────────────────────────────────────────────────
const uid = await ensureDemoUser()
console.log(`Demo user: ${DEMO_EMAIL}  (id=${uid})`)
await wipe(uid)
console.log('Wiped prior seed rows.')
if (WIPE_ONLY) {
  console.log('Wipe-only mode — done.')
  process.exit(0)
}
await seed(uid)
console.log('\n✅ Seed complete.')
console.log(`   Login:    ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
console.log(`   User id:  ${uid}`)
console.log(`   Tag:      ${TAG}  (re-run wipes + reseeds; --wipe clears only)`)

// Backfill for migration_088: receipts whose line items span several
// categories become 'misc' at the receipt level.
//
//   node scripts/backfill-mixed-basket-misc.mjs           # dry run, prints what would change
//   node scripts/backfill-mixed-basket-misc.mjs --apply   # writes, after saving a rollback file
//
// Same rule as the save path (lib/auto-categorize.js) and the bulk
// categorizer: returned items don't count, and a receipt the USER
// categorized (category_source = 'user') is never touched.
//
// --apply writes backfill-mixed-basket-rollback-<stamp>.json next to this
// script: every row's previous category + source, so the change can be undone.

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
// .env.local lives one level up (web/), and is not committed.
for (const line of fs.readFileSync(path.join(HERE, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
const APPLY = process.argv.includes('--apply')
const sb = createClient(url, key, { auth: { persistSession: false } })

// Paged reads — the service role sees every user's rows, and PostgREST caps
// a single response at 1000.
async function readAll(table, cols) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(cols).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data || []))
    if (!data || data.length < 1000) return out
  }
}

const receipts = await readAll('receipts', 'id, user_id, store_name, date, category, category_source')
const items = await readAll('receipt_items', 'receipt_id, category, returned')

const kindsByReceipt = new Map()
for (const it of items) {
  if (!it.category || it.returned) continue
  if (!kindsByReceipt.has(it.receipt_id)) kindsByReceipt.set(it.receipt_id, new Set())
  kindsByReceipt.get(it.receipt_id).add(it.category)
}

const mixed = receipts.filter(r => (kindsByReceipt.get(r.id)?.size || 0) > 1)
const userOwned = mixed.filter(r => r.category_source === 'user')
const alreadyMisc = mixed.filter(r => r.category_source !== 'user' && r.category === 'misc')
const targets = mixed.filter(r => r.category_source !== 'user' && r.category !== 'misc')

console.log(`receipts: ${receipts.length} | line items: ${items.length}`)
console.log(`mixed-basket receipts: ${mixed.length}`)
console.log(`  already misc:            ${alreadyMisc.length}`)
console.log(`  user-categorized (skip): ${userOwned.length}`)
console.log(`  to update:               ${targets.length}`)

const byWas = new Map()
for (const r of targets) byWas.set(r.category || 'null', (byWas.get(r.category || 'null') || 0) + 1)
if (byWas.size) {
  console.log('\nwas → misc:')
  for (const [was, n] of [...byWas.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(was).padEnd(14)} ${n}`)
}
console.log('\nsample:')
for (const r of targets.slice(0, 10)) {
  console.log(`  ${r.date}  ${String(r.store_name || '').slice(0, 28).padEnd(28)} ${String(r.category || 'null').padEnd(14)} (${r.category_source || 'null'}) → misc  [${[...kindsByReceipt.get(r.id)].join(', ')}]`)
}

if (!APPLY) {
  console.log('\nDRY RUN — nothing written. Re-run with --apply to write.')
  process.exit(0)
}
if (targets.length === 0) {
  console.log('\nNothing to update.')
  process.exit(0)
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const rollbackPath = path.join(HERE, `backfill-mixed-basket-rollback-${stamp}.json`)
fs.writeFileSync(rollbackPath, JSON.stringify(
  targets.map(r => ({ id: r.id, category: r.category, category_source: r.category_source })), null, 2))
console.log(`\nrollback written: ${rollbackPath}`)

let ok = 0
const failed = []
for (const r of targets) {
  const { error } = await sb.from('receipts')
    .update({ category: 'misc', category_source: 'rule' })
    .eq('id', r.id)
  if (error) failed.push({ id: r.id, error: error.message })
  else ok += 1
}
console.log(`updated ${ok}/${targets.length}`)
if (failed.length) {
  console.log('failures:')
  for (const f of failed.slice(0, 10)) console.log(`  ${f.id}: ${f.error}`)
  process.exit(1)
}

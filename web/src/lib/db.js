// Typed query helpers — all queries use Row Level Security automatically.
//
// Column-list discipline:
//   - List pages get a narrow projection (saves JSON bytes + bandwidth)
//   - Detail/edit pages get full row via `select('*')` because the user is about
//     to edit every field anyway
//
import { createClient } from './supabase/client'
// Columns the list pages actually display. Skip `created_at`, `processed`,
// `payment_method`, `payment_last4`, `validation_*`, `validated_at` etc. that
// no list view shows. Saves ~40% on payload size for big receipt sets.
const RECEIPTS_LIST_COLS =
  'id, user_id, store_name, store_id, store_location_id, date, total_amount, tax_paid, ' +
  'reward_no, receipt_link, extra_page_urls, business_purchase, rating, validation_tags, category, ' +
  'from_statement, statement_source, statement_import_id, reconciled, reconciled_with, ' +
  // item_name (not count) so the receipts page can do full-text search
  // across line items client-side. Callers that just want a count read
  // `r.receipt_items?.length`.
  'is_return, receipt_items(item_name)'

// Bank statements — small set per user, used by list pages to show which
// statement / bank a receipt was imported from or reconciled against.
export async function getBankStatements() {
  const sb = createClient()
  // `bank_statements` may not exist for users who never imported a statement;
  // we tolerate the table-missing case by catching the error and returning [].
  try {
    const { data, error } = await sb
      .from('bank_statements')
      .select('id, statement_import_id, issuer, file_name, account_last4, period_start, period_end')
      .order('uploaded_at', { ascending: false })
      .limit(500)
    if (error) return []
    return data || []
  } catch {
    return []
  }
}

// Receipts
export async function getReceipts({ dateFrom, dateTo, storeId, storeLocationId } = {}) {
  const sb = createClient()
  let q = sb.from('receipts').select(RECEIPTS_LIST_COLS).order('date', { ascending: false })
  if (dateFrom) q = q.gte('date', dateFrom)
  if (dateTo) q = q.lte('date', dateTo)
  if (storeId) q = q.eq('store_id', storeId)
  if (storeLocationId) q = q.eq('store_location_id', storeLocationId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getReceipt(id) {
  const sb = createClient()
  const { data, error } = await sb
    .from('receipts')
    .select('*, receipt_items(*), receipt_refund_policies(*), store_locations(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// Only these keys exist as columns on the receipts table. Anything else (e.g. embedded
// receipt_items / receipt_refund_policies / store_locations from a join read) must be
// stripped before sending to upsert, or Supabase rejects them as unknown columns.
const RECEIPT_COLUMNS = [
  'id', 'user_id', 'store_name', 'store_id', 'store_location_id', 'date',
  'total_amount', 'tax_paid', 'reward_no', 'receipt_link', 'extra_page_urls',
  'business_purchase', 'processed', 'payment_method', 'payment_last4',
  'rating', 'validation_tags', 'validation_comment', 'validated_at',
  'category', 'category_source',
  'from_statement', 'statement_source', 'statement_import_id',
  'reconciled', 'reconciled_with', 'reconciled_at',
]

function pickReceiptColumns(receipt) {
  const out = {}
  for (const k of RECEIPT_COLUMNS) if (receipt[k] !== undefined) out[k] = receipt[k]
  return out
}

export async function upsertReceipt(receipt) {
  const sb = createClient()
  const clean = pickReceiptColumns(receipt)
  const { data, error } = await sb.from('receipts').upsert(clean).select().single()
  if (error) throw error
  return data
}

export async function deleteReceipt(id) {
  const sb = createClient()
  const { error } = await sb.from('receipts').delete().eq('id', id)
  if (error) throw error
}

const RECEIPT_ITEM_COLUMNS = [
  'id', 'receipt_id', 'sku', 'model', 'item_name', 'purchase_date',
  'qty', 'price', 'store_name_id', 'warranty_info', 'item_manual',
  'return_date', 'returned', 'refund_policy_id',
  'rating', 'validation_tags', 'validation_comment', 'validated_at',
  'category', 'store_item_id',
]

function pickItemColumns(item) {
  const out = {}
  for (const k of RECEIPT_ITEM_COLUMNS) if (item[k] !== undefined) out[k] = item[k]
  return out
}

export async function upsertReceiptItem(item) {
  const sb = createClient()
  const { data, error } = await sb.from('receipt_items').upsert(pickItemColumns(item)).select().single()
  if (error) throw error
  return data
}

export async function updateReceiptItem(id, patch) {
  const sb = createClient()
  const { error } = await sb.from('receipt_items').update(pickItemColumns(patch)).eq('id', id)
  if (error) throw error
}

// User-defined categories ─────────────────────────────────────────
const USER_CAT_COLORS = ['emerald','orange','sky','indigo','amber','lime','fuchsia','rose','red','violet','pink','gray']
const HEALTH_TIERS    = ['healthy','neutral','treat','harmful']

export async function getUserCategories() {
  const sb = createClient()
  const { data, error } = await sb.from('user_categories')
    .select('*')
    .order('label', { ascending: true })
  if (error) {
    // Schema cache miss / table missing = the user hasn't run
    // migration_011 yet. The 12 built-in preset categories still work,
    // so let the rest of the app keep functioning instead of throwing
    // and breaking every page that uses useCategories().
    const msg = (error.message || '').toLowerCase()
    const code = String(error.code || '')
    if (code === 'PGRST205' || code === '42P01' || msg.includes('schema cache') || msg.includes('does not exist')) {
      if (typeof console !== 'undefined') {
        console.warn('[getUserCategories] user_categories table missing — run migration_011_user_categories.sql in Supabase. Falling back to presets only.')
      }
      return []
    }
    throw error
  }
  return data || []
}

export async function createUserCategory({ label, emoji, color, health_tier }) {
  if (!label || !label.trim()) throw new Error('label required')
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not signed in')
  // Build a slug from the label
  const slug = label.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'custom'
  const safeColor = USER_CAT_COLORS.includes(color) ? color : 'gray'
  const safeTier  = HEALTH_TIERS.includes(health_tier) ? health_tier : 'neutral'
  const row = { user_id: user.id, slug, label: label.trim(), emoji: emoji || '📦', color: safeColor, health_tier: safeTier }
  let { data, error } = await sb.from('user_categories').insert(row).select().single()
  // Graceful fallback if migration_031 hasn't been applied — drop the new
  // column and retry. Keeps the picker working on older DBs.
  if (error) {
    const msg = (error.message || '').toLowerCase()
    if (msg.includes('health_tier')) {
      const { health_tier: _drop, ...legacy } = row
      ;({ data, error } = await sb.from('user_categories').insert(legacy).select().single())
    }
  }
  if (error) throw error
  return data
}

export async function deleteUserCategory(id) {
  const sb = createClient()
  const { error } = await sb.from('user_categories').delete().eq('id', id)
  if (error) throw error
}

// Bulk-update category for every receipt_item that shares the same product
// (same store_id + sku-or-name). Used by the Stash page so changing the category
// once propagates to every past purchase of that item.
export async function setStashProductCategory({ storeId, storeName, sku, item_name, category }) {
  const sb = createClient()
  let q = sb.from('receipt_items')
    .update({ category: category || null })
    .select('id')
  if (sku) q = q.ilike('sku', sku)
  else     q = q.ilike('item_name', item_name)
  // Scope the cross-receipt update to ONE store.
  //   - Prefer store_id (precise — survives store renames).
  //   - Fall back to store_name when the receipt has no store_id (mobile
  //     direct-insert doesn't populate the stores table). Without this
  //     fallback the lookup matches zero receipts → zero items updated
  //     → silent no-op even though the success toast fires.
  //   - If neither is available, bail out instead of updating across
  //     the user's entire history.
  let receiptQuery = sb.from('receipts').select('id')
  if (storeId) {
    receiptQuery = receiptQuery.eq('store_id', storeId)
  } else if (storeName) {
    receiptQuery = receiptQuery.eq('store_name', storeName)
  } else {
    return []
  }
  const { data: receiptIds } = await receiptQuery
  const ids = (receiptIds || []).map(r => r.id)
  if (ids.length === 0) return []
  q = q.in('receipt_id', ids)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

// Per-item Worth It? validation
export async function setItemValidation(id, { rating, validation_tags, validation_comment }) {
  const sb = createClient()
  const { data, error } = await sb
    .from('receipt_items')
    .update({
      rating,
      validation_tags: validation_tags || [],
      validation_comment: validation_comment || null,
      validated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Validation: receipts the user hasn't rated yet, oldest first so we work the backlog down.
export async function getUnvalidatedReceipts() {
  const sb = createClient()
  const { data, error } = await sb
    .from('receipts')
    .select('id, store_name, date, total_amount, tax_paid, business_purchase, receipt_link, rating')
    .is('rating', null)
    .order('date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function setReceiptValidation(id, { rating, validation_tags, validation_comment }) {
  const sb = createClient()
  const { data, error } = await sb
    .from('receipts')
    .update({
      rating,
      validation_tags: validation_tags || [],
      validation_comment: validation_comment || null,
      validated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Returns: all items the user has marked returned, joined to their parent receipt
// (which carries store, date, and refund policy info).
export async function getReturns() {
  const sb = createClient()
  const { data, error } = await sb
    .from('receipt_items')
    .select('*, receipts!inner(id, store_name, date, store_id, store_location_id, user_id, receipt_link)')
    .eq('returned', true)
    .order('return_date', { ascending: false })
  if (error) throw error
  return data || []
}

// Rewards
export async function getRewards() {
  const sb = createClient()
  const { data, error } = await sb.from('rewards').select('*').order('expiry_date', { ascending: true })
  if (error) throw error
  return data
}

export async function upsertReward(reward) {
  const sb = createClient()
  const { data, error } = await sb.from('rewards').upsert(reward).select().single()
  if (error) throw error
  return data
}

export async function deleteReward(id) {
  const sb = createClient()
  const { error } = await sb.from('rewards').delete().eq('id', id)
  if (error) throw error
}

// Shopping list
export async function getShoppingList() {
  const sb = createClient()
  const { data, error } = await sb.from('shopping_list').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function upsertShoppingItem(item) {
  const sb = createClient()
  const { data, error } = await sb.from('shopping_list').upsert(item).select().single()
  if (error) throw error
  return data
}

// Add a single item to the Smashlist (shopping list) from a receipt line or catalog row.
// Returns the newly-created shopping_list row.
export const SHOPPING_LISTS = ['Pantry', 'Cravings', 'Snack Stack', 'Grub & Grab']
export const SHOPPING_LIST_META = {
  'Pantry':      { emoji: '🥫', desc: 'Everyday staples', color: 'emerald' },
  'Cravings':    { emoji: '🍫', desc: 'Treats & wants',   color: 'rose' },
  'Snack Stack': { emoji: '🍿', desc: 'Snacks & quick bites', color: 'amber' },
  'Grub & Grab': { emoji: '🛍️', desc: 'Quick grocery run', color: 'lime' },
}

export async function addToShoppingList({
  sku, item_name, qty = 1, price = null, store_name_id = null,
  frequency = 'Monthly', comments = null, list_name = 'Pantry',
}) {
  if (!item_name) throw new Error('item_name required')
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not signed in')
  const { data, error } = await sb.from('shopping_list')
    .insert({
      user_id: user.id,
      sku: sku || null,
      item_name,
      qty: qty || 1,
      price,
      store_name_id,
      frequency,
      comments,
      list_name,
      order_date: new Date().toISOString().slice(0, 10),
      approved: false,
      sent_to_store: false,
    })
    .select().single()
  if (error) throw error
  return data
}

// Restaurant items — for the Bites page. All receipt_items from receipts whose
// category is 'eats'.
export async function getBites() {
  // Bites = "dishes you've tried." Catches eats two ways:
  //   1. The PARENT receipt is categorized 'eats' (restaurants, dining out).
  //   2. The individual ITEM is categorized 'eats' even if the parent
  //      receipt isn't — e.g. Costco rotisserie chicken on a grub run,
  //      Whole Foods prepared deli on a grocery receipt. Without this,
  //      those items were invisible to the rate-and-reorder UI.
  // Two queries (instead of one .or() across a join, which PostgREST
  // doesn't handle cleanly) and dedupe by item id. Cap each at 2000.
  const sb = createClient()
  const COLS = 'id, item_name, qty, price, rating, validation_comment, receipt_id, category, receipts!inner(id, store_name, store_id, date, category)'
  const [a, b] = await Promise.all([
    sb.from('receipt_items').select(COLS).eq('receipts.category', 'eats').order('id', { ascending: false }).limit(2000),
    sb.from('receipt_items').select(COLS).eq('category', 'eats').neq('receipts.category', 'eats').order('id', { ascending: false }).limit(2000),
  ])
  if (a.error) throw a.error
  if (b.error) throw b.error
  const seen = new Set()
  const out = []
  for (const row of [...(a.data || []), ...(b.data || [])]) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
  }
  return out
}

export async function deleteShoppingItem(id) {
  const sb = createClient()
  const { error } = await sb.from('shopping_list').delete().eq('id', id)
  if (error) throw error
}

// Car miles
export async function getTrips() {
  const sb = createClient()
  const { data, error } = await sb.from('car_trips').select('*').order('start_date', { ascending: false })
  if (error) throw error
  return data
}

export async function upsertTrip(trip) {
  const sb = createClient()
  const { data, error } = await sb.from('car_trips').upsert(trip).select().single()
  if (error) throw error
  return data
}

export async function deleteTrip(id) {
  const sb = createClient()
  const { error } = await sb.from('car_trips').delete().eq('id', id)
  if (error) throw error
}

// Profile
export async function getProfile(userId) {
  const sb = createClient()
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function updateProfile(userId, patch) {
  const sb = createClient()
  const { error } = await sb.from('profiles').update(patch).eq('id', userId)
  if (error) throw error
}

// Stores
export async function getStores() {
  const sb = createClient()
  // List page only renders these columns — skip `created_at` to slim payload
  const { data, error } = await sb
    .from('stores')
    .select('id, store_name, address, phone_no, website')
    .order('store_name', { ascending: true })
  if (error) throw error
  return data
}

export async function getStore(id) {
  const sb = createClient()
  const { data, error } = await sb
    .from('stores')
    .select('*, store_locations(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// Normalize a phone for comparison: keep digits only ("(703) 737-0255" → "7037370255").
function normalizePhone(p) {
  if (!p) return ''
  return String(p).replace(/\D+/g, '')
}

// Find an existing store by phone or address first, then name as a last resort.
// Phone + address identify a specific physical location and are more reliable
// than name (chains have variants: "The Home Depot" vs "Home Depot Leesburg").
export async function findStoreMatch({ store_name, address, phone_no }) {
  const sb = createClient()
  const phoneNorm = normalizePhone(phone_no)
  const addrNorm = (address || '').trim().toLowerCase()
  const nameNorm = (store_name || '').trim().toLowerCase()

  const { data: all } = await sb.from('stores').select('*')
  const stores = all || []

  // 1. Phone match (digits-only, ignores formatting) — most reliable for same location
  if (phoneNorm.length >= 7) {
    const hit = stores.find(s => normalizePhone(s.phone_no) === phoneNorm)
    if (hit) return hit
  }

  // 2. Address match (case-insensitive) — also identifies a specific location
  if (addrNorm) {
    const hit = stores.find(s => (s.address || '').trim().toLowerCase() === addrNorm)
    if (hit) return hit
  }

  // 3. Name match — last resort
  if (nameNorm) {
    const hit = stores.find(s => (s.store_name || '').trim().toLowerCase() === nameNorm)
    if (hit) return hit
  }

  return null
}

// Find-or-insert. Dedupes aggressively by phone → address → name so receipts
// from the same store always reuse the existing row.
export async function upsertStore({ store_name, address, phone_no, website }) {
  if (!store_name) throw new Error('store_name required')
  const sb = createClient()
  const name = store_name.trim()
  const existing = await findStoreMatch({ store_name: name, address, phone_no })

  if (existing) {
    // Backfill empty top-level fields if the scan picked them up
    const patch = {}
    if (!existing.address && address) patch.address = address
    if (!existing.phone_no && phone_no) patch.phone_no = phone_no
    if (!existing.website && website) patch.website = website
    if (Object.keys(patch).length > 0) {
      const { data: updated } = await sb.from('stores').update(patch).eq('id', existing.id).select().single()
      return updated || existing
    }
    return existing
  }

  const { data, error } = await sb
    .from('stores')
    .insert({ store_name: name, address, phone_no, website })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStore(id, patch) {
  const sb = createClient()
  const { data, error } = await sb.from('stores').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

// Store items catalog ─────────────────────────────────────────────
const STORE_ITEM_COLUMNS = ['id', 'store_id', 'sku', 'item_name', 'price', 'return_policy', 'warranty_info', 'item_manual']

function pickStoreItemCols(item) {
  const out = {}
  for (const k of STORE_ITEM_COLUMNS) if (item[k] !== undefined) out[k] = item[k]
  return out
}

// Find-or-insert into store_items by (store_id, sku). Returns the saved row.
// Backfills empty fields if the receipt scan picked them up (warranty, manual, etc).
export async function upsertStoreItem({ store_id, sku, item_name, price, return_policy, warranty_info, item_manual }) {
  if (!store_id || !item_name) return null
  const sb = createClient()

  // 1. Find existing by store + sku (case-insensitive)
  let existing = null
  if (sku) {
    const { data } = await sb.from('store_items').select('*')
      .eq('store_id', store_id)
      .ilike('sku', sku)
      .limit(1).maybeSingle()
    existing = data
  }
  // 2. Or by exact item name within store (no SKU case)
  if (!existing && !sku) {
    const { data } = await sb.from('store_items').select('*')
      .eq('store_id', store_id)
      .ilike('item_name', item_name.trim())
      .limit(1).maybeSingle()
    existing = data
  }

  if (existing) {
    const patch = {}
    if (price != null && price > 0) patch.price = price                 // always refresh price (latest known)
    if (!existing.return_policy && return_policy) patch.return_policy = return_policy
    if (!existing.warranty_info && warranty_info) patch.warranty_info = warranty_info
    if (!existing.item_manual   && item_manual)   patch.item_manual   = item_manual
    if (!existing.item_name && item_name) patch.item_name = item_name
    if (Object.keys(patch).length === 0) return existing
    const { data: updated } = await sb.from('store_items').update(patch).eq('id', existing.id).select().single()
    return updated || existing
  }

  const { data, error } = await sb.from('store_items')
    .insert(pickStoreItemCols({ store_id, sku, item_name, price, return_policy, warranty_info, item_manual }))
    .select().single()
  if (error) { console.warn('upsertStoreItem failed:', error.message); return null }
  return data
}

export async function getStoreItems(storeId) {
  const sb = createClient()
  const { data, error } = await sb.from('store_items')
    .select('*')
    .eq('store_id', storeId)
    .order('item_name', { ascending: true })
  if (error) throw error
  return data || []
}

// Global catalog across all stores — used by the shopping-list "Pick from catalog" modal
export async function getAllStoreItems() {
  const sb = createClient()
  const { data, error } = await sb.from('store_items')
    .select('*, stores(store_name)')
    .order('item_name', { ascending: true })
    .limit(2000)
  if (error) throw error
  return data || []
}

// Aggregated view across all receipt_items the user has purchased.
// One row per (store, sku-or-name) with totals + last-bought info.
// Returned items (returned = true) are excluded — they no longer represent
// something you actually own.
export async function getStashItems() {
  const sb = createClient()
  const { data, error } = await sb
    .from('receipt_items')
    .select('id, sku, model, item_name, qty, price, category, rating, returned, receipt_id, store_item_id, receipts!inner(id, store_id, store_name, date, category)')
    .eq('returned', false)
    .order('id', { ascending: false })
    .limit(5000)
  if (error) throw error
  return data || []
}

export async function deleteStore(id) {
  const sb = createClient()
  // 1. Block delete if any receipts reference this store.
  const { count: receiptCount, error: countErr } = await sb
    .from('receipts')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', id)
  if (countErr) throw new Error(`Could not check receipts: ${countErr.message}`)
  if ((receiptCount || 0) > 0) {
    throw new Error(`Receipts exist for this store — cannot delete (${receiptCount} receipt${receiptCount === 1 ? '' : 's'} linked). Remove the receipts first.`)
  }
  // 2. Remove child locations (no receipts at this point so nothing's linked).
  const { error: locErr } = await sb.from('store_locations').delete().eq('store_id', id)
  if (locErr) throw new Error(`Could not delete locations: ${locErr.message}`)
  // 3. Delete the store. Use .select() to verify the row actually went away —
  //    if RLS blocks, Supabase returns no error but data is empty.
  const { data, error } = await sb.from('stores').delete().eq('id', id).select()
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Delete blocked by RLS. Run migration_002_store_rls.sql in Supabase SQL Editor, then: NOTIFY pgrst, \'reload schema\';')
  }
}

// Store locations — find by (store_id, address) or insert
export async function upsertStoreLocation({
  store_id, location_name, address, city, state, zip, phone_no, store_no,
}) {
  if (!store_id) return null
  const sb = createClient()
  let q = sb.from('store_locations').select('*').eq('store_id', store_id)
  if (address) q = q.ilike('address', address)
  else q = q.is('address', null)
  const { data: existing } = await q.limit(1).maybeSingle()

  if (existing) {
    const patch = {}
    if (!existing.location_name && location_name) patch.location_name = location_name
    if (!existing.city && city) patch.city = city
    if (!existing.state && state) patch.state = state
    if (!existing.zip && zip) patch.zip = zip
    if (!existing.phone_no && phone_no) patch.phone_no = phone_no
    if (!existing.store_no && store_no) patch.store_no = store_no
    if (Object.keys(patch).length > 0) {
      const { data: updated } = await sb.from('store_locations').update(patch).eq('id', existing.id).select().single()
      return updated || existing
    }
    return existing
  }

  const { data, error } = await sb
    .from('store_locations')
    .insert({ store_id, location_name, address, city, state, zip, phone_no, store_no })
    .select()
    .single()
  if (error) throw error
  return data
}

// Receipt refund policies.
//
// Two pre-insert enhancements run here (instead of duplicating across every
// caller — server route, email-to-receipt importer, manual edit):
//   1. If the policy carries `days` but no `expiry_date`, compute the expiry
//      from `receipt.date + days`. The AI sometimes returns only the window
//      length when the receipt printed "30 days from purchase" without the
//      actual date. We now have both `receiptDate` + `days`, so we can fill
//      it in for the UI.
//   2. If `policies` is empty AND `storeName` is known, look up the store's
//      seeded default in store_return_policies and use that. Amazon e-receipts
//      never print the policy on the receipt body, but the user is still
//      protected by Amazon's published 30-day rule — surface it.
export async function replaceRefundPolicies(receiptId, policies, opts = {}) {
  const sb = createClient()
  await sb.from('receipt_refund_policies').delete().eq('receipt_id', receiptId)

  const { receiptDate, storeName, category } = opts
  let working = Array.isArray(policies) ? [...policies] : []

  // Fallback to store default when the receipt didn't print one.
  if (working.length === 0 && storeName) {
    const def = await fetchStoreDefaultPolicy(sb, storeName, category)
    if (def) working = [def]
  }

  if (working.length === 0) return []

  const rows = working.map(p => ({
    receipt_id: receiptId,
    policy_id: p.policy_id || null,
    days: p.days ?? null,
    expiry_date: p.expiry_date || deriveExpiry(receiptDate, p.days),
    eligible: p.eligible !== false,
    details: p.details || null,
    source: p.source || 'receipt',
    source_url: p.source_url || null,
  }))
  const { data, error } = await sb.from('receipt_refund_policies').insert(rows).select()
  if (error) throw error
  return data
}

function deriveExpiry(receiptDate, days) {
  if (!receiptDate || days == null) return null
  const d = new Date(receiptDate)
  if (isNaN(d.getTime())) return null
  d.setDate(d.getDate() + Number(days))
  return d.toISOString().slice(0, 10)
}

async function fetchStoreDefaultPolicy(sb, storeName, category) {
  try {
    const { normalizeStoreName } = await import('./store-name-normalize')
    const key = normalizeStoreName(storeName)
    if (!key) return null
    // Prefer a category-specific row, fall back to the catch-all (category IS NULL).
    let q = sb.from('store_return_policies')
      .select('policy_id, days, eligible, details, source_url, category')
      .eq('store_name_normalized', key)
    if (category) {
      const { data: catMatch } = await q.eq('category', category).limit(1).maybeSingle()
      if (catMatch) return { ...catMatch, source: 'store-default' }
    }
    const { data: anyMatch } = await sb.from('store_return_policies')
      .select('policy_id, days, eligible, details, source_url')
      .eq('store_name_normalized', key)
      .is('category', null)
      .limit(1)
      .maybeSingle()
    if (anyMatch) return { ...anyMatch, source: 'store-default' }
  } catch (e) {
    console.warn('[replaceRefundPolicies] store-default lookup failed:', e.message)
  }
  return null
}

// Curated default return policies for ALL stores at once. Returns a map
// keyed by the normalized store name with just the catch-all (category=null)
// row per store — enough for the /stores list to render a "90d" chip per
// row without N round-trips. Per-category overrides only matter on the
// store detail page, where getStoreReturnPolicies(storeName) is fine.
export async function getAllStoreDefaultPolicies() {
  const sb = createClient()
  const { data, error } = await sb
    .from('store_return_policies')
    .select('store_name_normalized, store_display_name, days, eligible, source_url, details')
    .is('category', null)
  if (error) return new Map()
  const out = new Map()
  for (const r of (data || [])) {
    out.set(r.store_name_normalized, r)
  }
  return out
}

// Curated return policies for a store, fetched by normalized store name.
// Returns ALL rows (the catch-all + any category-specific overrides) so the
// /stores/[id] page can render the full picture, sorted by category.
export async function getStoreReturnPolicies(storeName) {
  if (!storeName) return []
  const sb = createClient()
  const { normalizeStoreName } = await import('./store-name-normalize')
  const key = normalizeStoreName(storeName)
  if (!key) return []
  const { data, error } = await sb
    .from('store_return_policies')
    .select('id, policy_id, category, days, eligible, details, source_url, store_display_name')
    .eq('store_name_normalized', key)
    .order('category', { ascending: true, nullsFirst: true })
  if (error) return []
  return data || []
}

// Items the user still owns whose receipt-level refund policy is still
// inside its return window. Powers the "What can I still return?" tab on
// /returns. Includes days-remaining so the UI can colour-code urgency.
export async function getEligibleReturns() {
  const sb = createClient()
  const today = new Date().toISOString().slice(0, 10)
  // Join receipt_items → receipts → receipt_refund_policies. We filter on
  // expiry_date > today so a missing/stale expiry doesn't pollute the list
  // (the backfill migration_034 fills these in for older receipts).
  const { data, error } = await sb
    .from('receipt_items')
    .select(`
      id, item_name, sku, model, qty, price, returned, refund_policy_id,
      receipts!inner(id, store_id, store_name, date,
        receipt_refund_policies(policy_id, days, expiry_date, eligible, details, source, source_url)
      )
    `)
    .eq('returned', false)
    .order('purchase_date', { ascending: false, nullsFirst: false })
    .limit(500)
  if (error) return []
  const out = []
  for (const it of (data || [])) {
    const r = it.receipts
    if (!r) continue
    const policies = r.receipt_refund_policies || []
    // Match by item's refund_policy_id when set, otherwise the receipt's
    // first eligible policy (most one-policy receipts just have a default).
    const match = (it.refund_policy_id
      ? policies.find(p => p.policy_id === it.refund_policy_id)
      : null) || policies.find(p => p.eligible !== false)
    if (!match) continue
    if (match.eligible === false) continue
    if (!match.expiry_date) continue
    if (match.expiry_date <= today) continue
    const daysLeft = Math.ceil((new Date(match.expiry_date) - new Date(today)) / 86400000)
    out.push({
      item_id: it.id,
      item_name: it.item_name,
      sku: it.sku,
      model: it.model,
      qty: it.qty,
      price: it.price,
      receipt_id: r.id,
      store_id: r.store_id,
      store_name: r.store_name,
      receipt_date: r.date,
      policy: match,
      days_left: daysLeft,
    })
  }
  // Most urgent first.
  out.sort((a, b) => a.days_left - b.days_left)
  return out
}

// Auto-generate a placeholder reward number for a store the user can replace later.
// Returns existing reward_no if the user already has one for this store, otherwise
// creates a "GG-XXXXXXXX" placeholder and returns it.
export async function ensureStoreReward({ userId, storeName }) {
  if (!userId || !storeName) return ''
  const sb = createClient()
  const { data: existing } = await sb
    .from('rewards')
    .select('reward_no')
    .eq('user_id', userId)
    .ilike('store_name', storeName)
    .limit(1)
    .maybeSingle()
  if (existing?.reward_no) return existing.reward_no

  const placeholder = `GG-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
  const oneYear = new Date(); oneYear.setFullYear(oneYear.getFullYear() + 1)
  const { error } = await sb.from('rewards').insert({
    user_id: userId,
    reward_no: placeholder,
    expiry_date: oneYear.toISOString().slice(0, 10),
    reward_type: 'Loyalty',
    reward_title: `${storeName} (placeholder)`,
    description: 'Auto-created by receipt scan. Replace with your real loyalty number.',
    store_name: storeName,
    reward_points: 0,
  })
  if (error) {
    console.warn('ensureStoreReward insert failed:', error.message)
    return placeholder
  }
  return placeholder
}

// Storage
export async function uploadReceipt(file, userId) {
  const sb = createClient()
  const path = `${userId}/${Date.now()}_${file.name}`
  const { error } = await sb.storage.from('receipts').upload(path, file)
  if (error) throw error
  const { data } = sb.storage.from('receipts').getPublicUrl(path)
  return data.publicUrl
}

// Spending analytics (native SQL via Supabase RPC)
export async function getSpendingSummary(period = 'month') {
  const sb = createClient()
  const { data, error } = await sb.rpc('spending_summary', { period_type: period })
  if (error) throw error
  return data
}

// POST /api/stores/merge
//
// Detects stores that refer to the same merchant under different name
// variants ("Amazon" / "Amazon.com" / "AMAZON.COM, Inc.") and merges them:
//   - Picks the survivor (store with the most linked receipts, ties broken
//     by oldest created_at).
//   - Re-points every receipt.store_id and store_location.store_id from a
//     dupe to the survivor.
//   - Re-points store_items.store_id similarly so the Stash catalogue
//     doesn't get split between phantom stores.
//   - Deletes the dupe store rows.
//   - Optionally upgrades the survivor's display name to the canonical alias
//     ("Amazon" rather than "AMAZON.COM, INC").
//
// stores table is GLOBAL (shared across users) so merging affects everyone
// who used those variants. That's the correct behaviour — different users
// shopping at Amazon should see one merchant.
//
// Two modes:
//   { dryRun: true } / no body  → preview groups + counts, no writes
//   { confirm: true }           → actually merge
//
// Auth: any signed-in user can trigger. Rate-limited so it can't be spammed.

import { createApiClient } from '../../../../lib/supabase/server'
import { rateLimit, userRateKey } from '../../../../lib/apiGuard'
import { normalizeStoreName, canonicalStoreName, storeGroupKey } from '../../../../lib/store-name-normalize'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request) {
  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const rl = await rateLimit(userRateKey(user.id, 'store-merge'), { limit: 6, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const dryRun = !body?.confirm

  // 1. Pull every store + receipt-count, then group by normalized name.
  const { data: stores, error: sErr } = await sb
    .from('stores')
    .select('id, store_name, address, phone_no, created_at')
    .order('created_at', { ascending: true })
  if (sErr) return Response.json({ error: sErr.message }, { status: 500 })

  // Count linked receipts per store (only the caller's receipts — for the
  // preview, so the user sees what they're affecting). The actual merge
  // touches all users' receipts since stores is global.
  const { data: counts, error: cErr } = await sb
    .from('receipts')
    .select('store_id')
    .not('store_id', 'is', null)
  if (cErr) return Response.json({ error: cErr.message }, { status: 500 })
  const receiptCountByStore = new Map()
  for (const r of counts || []) {
    receiptCountByStore.set(r.store_id, (receiptCountByStore.get(r.store_id) || 0) + 1)
  }

  // Group stores by CANONICAL alias key. Without this, "Costco" and
  // "Costco Wholesale" hashed to different keys ("costco" vs
  // "costco wholesale") even though they're the same merchant — so the
  // merge endpoint left them as separate rows. storeGroupKey resolves
  // both to "costco" via the alias map, and the merger does its job.
  const groups = new Map()
  for (const s of stores || []) {
    const key = storeGroupKey(s.store_name)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push({ ...s, _receipts: receiptCountByStore.get(s.id) || 0 })
  }

  // Only groups with 2+ stores are merge candidates.
  const mergeGroups = []
  let totalDeleteStores = 0
  let totalRelinkReceipts = 0
  for (const [key, members] of groups) {
    if (members.length < 2) continue
    // Survivor: most receipts wins; ties broken by oldest created_at (stable).
    members.sort((a, b) => (b._receipts - a._receipts) || (a.created_at < b.created_at ? -1 : 1))
    const survivor = members[0]
    const dupes = members.slice(1)
    const dupeReceipts = dupes.reduce((n, d) => n + d._receipts, 0)
    mergeGroups.push({
      key,
      canonical_name: canonicalStoreName(survivor.store_name),
      survivor: { id: survivor.id, store_name: survivor.store_name, receipts: survivor._receipts },
      dupes: dupes.map(d => ({ id: d.id, store_name: d.store_name, receipts: d._receipts })),
      receipts_to_relink: dupeReceipts,
    })
    totalDeleteStores += dupes.length
    totalRelinkReceipts += dupeReceipts
  }

  if (dryRun) {
    return Response.json({
      ok: true,
      mode: 'dry-run',
      groups_with_variants: mergeGroups.length,
      stores_to_merge_away: totalDeleteStores,
      receipts_to_relink: totalRelinkReceipts,
      groups: mergeGroups,
      note: 'Re-run with body { "confirm": true } to actually merge.',
    })
  }

  // Execute: walk each group, do the relinks + canonical name upgrade + dupe delete.
  let storesDeleted = 0
  let receiptsRelinked = 0
  let locationsRelinked = 0
  let itemsRelinked = 0
  const errors = []
  for (const g of mergeGroups) {
    const survivorId = g.survivor.id
    const dupeIds = g.dupes.map(d => d.id)

    // Re-point receipts
    const { data: recRows, error: recErr } = await sb.from('receipts')
      .update({ store_id: survivorId })
      .in('store_id', dupeIds)
      .select('id')
    if (recErr) { errors.push({ group: g.key, step: 'receipts', error: recErr.message }); continue }
    receiptsRelinked += recRows?.length || 0

    // Re-point store_locations
    const { data: locRows, error: locErr } = await sb.from('store_locations')
      .update({ store_id: survivorId })
      .in('store_id', dupeIds)
      .select('id')
    if (locErr) { errors.push({ group: g.key, step: 'store_locations', error: locErr.message }); continue }
    locationsRelinked += locRows?.length || 0

    // Re-point store_items (Stash catalogue)
    const { data: itemRows, error: itemErr } = await sb.from('store_items')
      .update({ store_id: survivorId })
      .in('store_id', dupeIds)
      .select('id')
    // store_items table may not exist in older envs — treat the error as non-fatal.
    if (itemErr && !/relation .* does not exist/i.test(itemErr.message)) {
      errors.push({ group: g.key, step: 'store_items', error: itemErr.message })
    }
    itemsRelinked += itemRows?.length || 0

    // Upgrade survivor name to canonical when we know one (Amazon, Lowe's, …)
    if (g.canonical_name && g.canonical_name !== g.survivor.store_name) {
      await sb.from('stores').update({ store_name: g.canonical_name }).eq('id', survivorId)
    }

    // Delete the dupe stores
    const { error: delErr, count } = await sb.from('stores')
      .delete({ count: 'exact' })
      .in('id', dupeIds)
    if (delErr) { errors.push({ group: g.key, step: 'delete', error: delErr.message }); continue }
    storesDeleted += count || 0
  }

  return Response.json({
    ok: true,
    mode: 'execute',
    groups_processed: mergeGroups.length,
    stores_deleted: storesDeleted,
    receipts_relinked: receiptsRelinked,
    store_locations_relinked: locationsRelinked,
    store_items_relinked: itemsRelinked,
    errors,
  })
}

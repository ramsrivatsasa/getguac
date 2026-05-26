// Receipt deduplication. Same purchase forwarded multiple times (or the same
// e-receipt landing in both inbox + a +g subfolder) creates duplicate
// receipt rows. This endpoint groups receipts by (normalized store name,
// date, total ±1¢), keeps the best of each group, and:
//   1. Re-links any email_messages pointing at deleted rows to the keeper,
//      so the inbox-to-receipt navigation still works.
//   2. Deletes the duplicates. receipt_items cascade via FK.
//
// Matching, upgraded from the old exact-string version (v0.2.42):
//   - Store name runs through normalizeStoreName (alias-aware: "Amazon
//     Mktp" / "Amazon.com, Inc." / "amazon" all resolve to the same key).
//   - Total is bucketed to the cent and a second pass merges adjacent
//     buckets that differ by exactly 1¢ (AI rounding wobble).
//   - Returns ($-X) are NOT grouped with purchases ($+X) — we key the
//     sign separately so a refund row can't get deleted as a "duplicate"
//     of the matching charge.
//
// Keeper selection (best-row wins):
//   1. Prefer non-statement rows (they carry items / store FK / tax).
//   2. Then prefer rows with non-zero tax_paid (parsed receipts).
//   3. Then prefer rows with a receipt_link (had a photo / email body).
//   4. Tiebreaker: newest created_at.
//
// Two modes, controlled by the POST body:
//   { dryRun: true }   → returns the groups that WOULD be touched, no writes
//   { confirm: true }  → actually performs the dedup
// (Pass neither and the endpoint defaults to dryRun for safety.)
//
// Scoped to the calling user via RLS — only their receipts are affected.

import { createApiClient } from '../../../../lib/supabase/server'
import { rateLimit, userRateKey } from '../../../../lib/apiGuard'
import { normalizeStoreName } from '../../../../lib/store-name-normalize'

export const runtime = 'nodejs'
export const maxDuration = 30

/// Best-keeper comparator. Returns negative if `a` is a better keeper than `b`.
function compareForKeeper(a, b) {
  // 1. Non-statement wins.
  const aFromStmt = a.from_statement === true
  const bFromStmt = b.from_statement === true
  if (aFromStmt !== bFromStmt) return aFromStmt ? 1 : -1
  // 2. Has tax → wins (parsed receipt vs raw camera shot with $0 tax).
  const aTax = Number(a.tax_paid || 0) > 0
  const bTax = Number(b.tax_paid || 0) > 0
  if (aTax !== bTax) return aTax ? -1 : 1
  // 3. Has receipt_link → wins.
  const aLink = !!a.receipt_link
  const bLink = !!b.receipt_link
  if (aLink !== bLink) return aLink ? -1 : 1
  // 4. Newest created_at wins.
  return (b.created_at || '').localeCompare(a.created_at || '')
}

export async function POST(request) {
  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const rl = await rateLimit(userRateKey(user.id, 'receipt-dedup'), { limit: 6, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const dryRun = !body?.confirm   // default to safe preview unless caller opts in

  // Pull every receipt for the user; group client-side. Simple, transparent,
  // and fine at the scale of "one person's lifetime of receipts" (<10k rows).
  const { data: receipts, error } = await sb
    .from('receipts')
    .select('id, store_name, date, total_amount, tax_paid, from_statement, receipt_link, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Bucket by (normalized store, date, sign, cents). Sign separates refunds
  // from purchases; cents is the exact bucket; the ±1¢ merge happens next.
  const buckets = new Map()
  for (const r of receipts || []) {
    if (!r.store_name || !r.date || r.total_amount == null) continue
    const norm = normalizeStoreName(r.store_name)
    if (!norm) continue
    const total = Number(r.total_amount)
    const sign = total < 0 ? '-' : '+'
    const cents = Math.round(Math.abs(total) * 100)
    const key = `${norm}|${r.date}|${sign}|${cents}`
    if (!buckets.has(key)) buckets.set(key, { norm, date: r.date, sign, cents, rows: [] })
    buckets.get(key).rows.push(r)
  }

  // Second pass: merge buckets whose cents differ by exactly 1 from a
  // neighbour with the same (store, date, sign). Walks the buckets in
  // cents-ascending order so the lower bucket absorbs the upper one
  // deterministically.
  const byPrefix = new Map() // "norm|date|sign" -> sorted list of {cents, key, bucket}
  for (const [key, b] of buckets) {
    const prefix = `${b.norm}|${b.date}|${b.sign}`
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, [])
    byPrefix.get(prefix).push({ cents: b.cents, key, bucket: b })
  }
  for (const list of byPrefix.values()) {
    list.sort((a, b) => a.cents - b.cents)
    for (let i = 0; i < list.length - 1; i++) {
      const a = list[i], b = list[i + 1]
      if (!buckets.has(a.key) || !buckets.has(b.key)) continue
      if (b.cents - a.cents === 1) {
        // Merge b into a.
        buckets.get(a.key).rows.push(...buckets.get(b.key).rows)
        buckets.delete(b.key)
      }
    }
  }

  // Build dup groups from the merged buckets.
  const dupGroups = []
  let totalToDelete = 0
  for (const [key, b] of buckets) {
    if (b.rows.length <= 1) continue
    const sorted = [...b.rows].sort(compareForKeeper)
    const keeper = sorted[0]
    const toDelete = sorted.slice(1)
    dupGroups.push({
      key,
      store_name: keeper.store_name,
      normalized_store: b.norm,
      date: b.date,
      sign: b.sign,
      total_amount: Number(keeper.total_amount),
      keeper_id: keeper.id,
      keeper_reason: keeper.from_statement
        ? 'newest (all rows are statement)'
        : (Number(keeper.tax_paid || 0) > 0 ? 'parsed receipt (tax > 0)'
            : (keeper.receipt_link ? 'has receipt image / email'
                : 'newest non-statement')),
      delete_count: toDelete.length,
      delete_ids: toDelete.map(r => r.id),
      // Surface the AI variants we matched together so the user can see
      // why two rows clustered (e.g. "GLORY DAYS GRILL" + "Glory Days Grill").
      variants: [...new Set(b.rows.map(r => r.store_name))],
    })
    totalToDelete += toDelete.length
  }

  if (dryRun) {
    return Response.json({
      ok: true,
      mode: 'dry-run',
      groups_with_duplicates: dupGroups.length,
      receipts_to_delete: totalToDelete,
      groups: dupGroups,
      note: 'Re-run with body { "confirm": true } to actually delete.',
    })
  }

  // Execute: walk each group, relink emails, delete the duplicates.
  let relinked = 0
  let deleted = 0
  const errors = []
  for (const g of dupGroups) {
    // 1. Re-point email_messages from any deleted receipt to the keeper, so
    //    the inbox→receipt link keeps working.
    const { data: relinkRows, error: relinkErr } = await sb.from('email_messages')
      .update({ receipt_id: g.keeper_id })
      .in('receipt_id', g.delete_ids)
      .eq('user_id', user.id)
      .select('id')
    if (relinkErr) {
      errors.push({ group: g.key, step: 'relink', error: relinkErr.message })
      continue
    }
    relinked += relinkRows?.length || 0

    // 2. Delete the duplicate receipts. receipt_items + refund_policies
    //    cascade via FK ON DELETE CASCADE.
    const { error: delErr, count } = await sb.from('receipts')
      .delete({ count: 'exact' })
      .in('id', g.delete_ids)
      .eq('user_id', user.id)
    if (delErr) {
      errors.push({ group: g.key, step: 'delete', error: delErr.message })
      continue
    }
    deleted += count || 0
  }

  return Response.json({
    ok: true,
    mode: 'execute',
    groups_processed: dupGroups.length,
    receipts_deleted: deleted,
    email_messages_relinked: relinked,
    errors,
  })
}

// Receipt deduplication. Same purchase forwarded multiple times (or the same
// e-receipt landing in both inbox + a +g subfolder) creates duplicate
// receipt rows. This endpoint groups receipts by (store_name, date,
// total_amount), keeps the newest of each group, and:
//   1. Re-links any email_messages pointing at deleted rows to the keeper,
//      so the inbox-to-receipt navigation still works.
//   2. Deletes the duplicates. receipt_items cascade via FK.
//
// Two modes, controlled by the POST body:
//   { dryRun: true }   → returns the groups that WOULD be touched, no writes
//   { confirm: true }  → actually performs the dedup
// (Pass neither and the endpoint defaults to dryRun for safety.)
//
// Scoped to the calling user via RLS — only their receipts are affected.

import { createApiClient } from '../../../../lib/supabase/server'
import { rateLimit, userRateKey } from '../../../../lib/apiGuard'

export const runtime = 'nodejs'
export const maxDuration = 30

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
    .select('id, store_name, date, total_amount, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Build groups keyed by normalized (store|date|total). Skip rows missing
  // any of those fields — we can't safely match them.
  const groups = new Map()
  for (const r of receipts || []) {
    if (!r.store_name || !r.date || r.total_amount == null) continue
    const key = `${r.store_name.trim().toLowerCase()}|${r.date}|${Number(r.total_amount).toFixed(2)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }

  // Dup groups = anything with >1 entry. Keeper is the newest (groups are
  // already sorted desc by created_at via the query).
  const dupGroups = []
  let totalToDelete = 0
  for (const [key, rows] of groups) {
    if (rows.length <= 1) continue
    const keeper = rows[0]
    const toDelete = rows.slice(1)
    dupGroups.push({
      key,
      store_name: keeper.store_name,
      date: keeper.date,
      total_amount: Number(keeper.total_amount),
      keeper_id: keeper.id,
      delete_count: toDelete.length,
      delete_ids: toDelete.map(r => r.id),
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

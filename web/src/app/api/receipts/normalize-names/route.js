// POST /api/receipts/normalize-names
//
// The dashboard "Spending by Store" chart groups by receipts.store_name. If
// the same merchant arrives as "Amazon" / "Amazon.com" / "AMAZON.COM, Inc."
// across different forwards, the chart splits one merchant across several
// bars — even when those receipts all link to the same row in the stores
// table.
//
// This endpoint sweeps receipts.store_name into one of two canonical forms:
//   1. When the receipt has store_id set → use the linked store's name
//      (which was already canonicalised by the /api/stores/merge endpoint
//      or by the upsert path in lib/email-to-receipt.js).
//   2. When the receipt has no store_id → use canonicalStoreName() from
//      lib/store-name-normalize for any known-alias merchant; otherwise
//      leave the field alone.
//
// Two modes:
//   default (no body)  → dry-run preview
//   { confirm: true }  → actually rewrite

import { createApiClient } from '../../../../lib/supabase/server'
import { rateLimit, userRateKey } from '../../../../lib/apiGuard'
import { normalizeStoreName, canonicalStoreName } from '../../../../lib/store-name-normalize'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request) {
  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const rl = await rateLimit(userRateKey(user.id, 'receipt-normalize-names'), { limit: 6, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const dryRun = !body?.confirm

  // 1. Fetch receipts + the names of their linked stores in one shot.
  const { data: receipts, error } = await sb
    .from('receipts')
    .select(`id, store_name, store_id, store:store_id(store_name)`)
    .eq('user_id', user.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // 2. Compute the new name for each row.
  const changes = []   // { id, from, to, reason }
  for (const r of receipts || []) {
    const current = (r.store_name || '').trim()
    let target = current

    if (r.store_id && r.store?.store_name) {
      // Inherit the linked store's name. That row has already been
      // canonicalised by the merge endpoint / upsert path.
      target = r.store.store_name.trim()
    } else if (current) {
      // Unlinked receipt — best we can do is the alias map.
      target = canonicalStoreName(current)
    }

    // Compare on normalized key so we don't churn rows that differ only by
    // casing — we only write when the visible name actually changes.
    if (target && target !== current) {
      changes.push({
        id: r.id,
        from: current,
        to: target,
        reason: r.store_id ? 'linked-store' : 'alias-map',
      })
    }
  }

  if (dryRun) {
    // Surface a per-target summary so the user can scan "this many became
    // Amazon" without reading every row.
    const byTarget = new Map()
    for (const c of changes) {
      const key = c.to
      if (!byTarget.has(key)) byTarget.set(key, { to: key, count: 0, sample_from: [] })
      const g = byTarget.get(key)
      g.count++
      if (g.sample_from.length < 3 && !g.sample_from.includes(c.from)) g.sample_from.push(c.from)
    }
    return Response.json({
      ok: true,
      mode: 'dry-run',
      total_receipts_scanned: receipts?.length || 0,
      total_changes: changes.length,
      by_target: [...byTarget.values()].sort((a, b) => b.count - a.count),
      sample_changes: changes.slice(0, 10),
      note: 'Re-run with body { "confirm": true } to actually rewrite store_name.',
    })
  }

  // Execute — batch by target name so each UPDATE touches every row that
  // needs the same new value. Saves N round trips.
  const byTarget = new Map()
  for (const c of changes) {
    if (!byTarget.has(c.to)) byTarget.set(c.to, [])
    byTarget.get(c.to).push(c.id)
  }
  let updated = 0
  const errors = []
  for (const [target, ids] of byTarget) {
    const { data, error: upErr } = await sb.from('receipts')
      .update({ store_name: target })
      .in('id', ids)
      .eq('user_id', user.id)
      .select('id')
    if (upErr) { errors.push({ target, error: upErr.message }); continue }
    updated += data?.length || 0
  }

  return Response.json({
    ok: true,
    mode: 'execute',
    receipts_updated: updated,
    target_count: byTarget.size,
    errors,
  })
}

// POST /api/receipts/recategorize-gas
//
// Backfill: finds receipts that are gas-station fill-ups (per the
// central isGasStationReceipt() rule) but are NOT categorized as
// 'gas-up', and updates their category. The Refresh button on /bank
// calls this with {confirm:true} as one of its steps.
//
// Detection (one source of truth, shared with the save pipeline):
//   - store_name matches a known gas-station brand (Shell, BP, Exxon,
//     Costco Gas, Sam's Club Gas, BJ's Gas, Wawa, Sheetz, …), OR
//   - any item line matches fuel keywords (unleaded / regular gas /
//     premium / diesel / gallons / pump #, …).
//
// Preserves user-curated categories: rows with category_source='user'
// are left alone — if you intentionally tagged a Wawa coffee-run as
// 'drinks', it stays.
//
// Per-user (RLS scoped). Defaults to dry-run preview.

import { createApiClient } from '../../../../lib/supabase/server'
import { rateLimit, userRateKey } from '../../../../lib/apiGuard'
import {
  isGasStationReceipt,
} from '../../../../lib/categorizeRules'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request) {
  const sb = createApiClient()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user?.id) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const rl = await rateLimit(userRateKey(user.id, 'recategorize-gas'), { limit: 6, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const dryRun = body?.confirm !== true

  // Two candidate sets to inspect:
  //   A) Receipts whose store_name looks like a known gas station.
  //      Cheap server-side filter; pulls the obvious matches.
  //   B) Receipts that DON'T match by name but have a fuel item.
  //      Harder to filter server-side without joining receipt_items
  //      with an ILIKE per row, so we pull receipts NOT in gas-up
  //      category + their items and apply isGasStationReceipt()
  //      client-side. Bounded by user's recent receipts.
  //
  // Combined into one query with .select('*, receipt_items(item_name)').

  // First pass: pull receipts that are NOT already 'gas-up' AND not
  // user-curated. Include item names for the per-item fuel-keyword test.
  // Cap at 1000 rows (any realistic user is well under this).
  const { data: candidates, error: findErr } = await sb
    .from('receipts')
    .select('id, store_name, date, total_amount, category, category_source, receipt_items(item_name)')
    .eq('user_id', user.id)
    .or('category.is.null,category.neq.gas-up')
    .or('category_source.is.null,category_source.neq.user')
    .order('date', { ascending: false })
    .limit(1000)
  if (findErr) {
    return Response.json({ error: findErr.message }, { status: 500 })
  }

  const matches = (candidates || []).filter(r =>
    isGasStationReceipt(r.store_name, r.receipt_items || [])
  )
  const matched = matches.length

  if (matched === 0) {
    return Response.json({ matched: 0, updated: 0, dryRun })
  }

  if (dryRun) {
    return Response.json({
      matched,
      updated: 0,
      dryRun: true,
      samples: matches.slice(0, 10).map(r => ({
        id: r.id, store_name: r.store_name, date: r.date,
        total_amount: r.total_amount, was: r.category || 'null',
      })),
    })
  }

  const ids = matches.map(r => r.id)
  const { error: updErr, count } = await sb
    .from('receipts')
    .update({ category: 'gas-up', category_source: 'rule' }, { count: 'exact' })
    .in('id', ids)
    .eq('user_id', user.id)
  if (updErr) {
    return Response.json({ error: updErr.message, matched, updated: 0 }, { status: 500 })
  }

  return Response.json({
    matched,
    updated: count || 0,
    dryRun: false,
  })
}

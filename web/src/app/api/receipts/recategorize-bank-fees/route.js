// POST /api/receipts/recategorize-bank-fees
//
// Backfill: finds receipts that are bank fees / interest charges (per
// the central isBankChargeReceipt() rule) but are NOT categorized as
// 'bank-fees', and updates their category to 'bank-fees'.
//
// Why this exists:
//   New statement imports route fees + interest to category='bank-fees'
//   automatically (see /api/parse-statement/import). But pre-v0.2.41
//   imports landed them in 'misc' or whatever Gemini guessed, so the
//   Reports donut would show Bank Fees as a thin slice and most of the
//   actual fees + interest as a fat Misc slice. This endpoint sweeps
//   any existing misfilings into the right category in one pass.
//
// Behaviour:
//   - Per-user (RLS scoped). Defaults to dry-run preview.
//   - Pass {"confirm": true} to actually update.
//   - The /bank Refresh button calls this with confirm:true as one of
//     its steps, so the user gets re-categorization "for free" whenever
//     they hit Refresh — no separate UI affordance needed.
//
// Response:
//   { matched, updated, dryRun, samples? }

import { createApiClient } from '../../../../lib/supabase/server'
import { rateLimit, userRateKey } from '../../../../lib/apiGuard'
import { isBankChargeReceipt } from '../../../../lib/payment-rows'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request) {
  const sb = createApiClient()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user?.id) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const rl = await rateLimit(userRateKey(user.id, 'recategorize-bank-fees'), { limit: 6, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const dryRun = body?.confirm !== true

  // Narrow the candidate set server-side by store_name prefix — every
  // bank-charge row the statement importer ever produced starts with one
  // of these bracketed tags. Saves us pulling EVERY receipt to client.
  // (.or() with multiple ilike clauses translates to PostgREST `or(...)`.)
  const orFilter = [
    'store_name.ilike.[Fee]%',
    'store_name.ilike.[Annual fee]%',
    'store_name.ilike.[Late%',
    'store_name.ilike.[ATM%',
    'store_name.ilike.[Foreign%',
    'store_name.ilike.[Overdraft%',
    'store_name.ilike.[Interest]%',
    'store_name.ilike.[Purchase interest]%',
    'store_name.ilike.[Cash advance interest]%',
    'store_name.ilike.[Cash-advance interest]%',
  ].join(',')

  const { data: candidates, error: findErr } = await sb
    .from('receipts')
    .select('id, store_name, date, total_amount, category')
    .eq('user_id', user.id)
    .or(orFilter)
  if (findErr) {
    return Response.json({ error: findErr.message }, { status: 500 })
  }

  // Filter client-side via the central classifier to be extra-safe (handles
  // future schema fields like is_fee / is_interest columns automatically).
  // Only rows that are NOT already 'bank-fees' need updating — skip ones
  // the user has explicitly categorized differently? No — if the user
  // overrode bank-fees → travel for some reason, this would clobber that.
  // We keep it minimal: only touch rows currently in 'misc' / null.
  const matches = (candidates || []).filter(r =>
    isBankChargeReceipt(r) && (r.category == null || r.category === 'misc')
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
    .update({ category: 'bank-fees', category_source: 'rule' }, { count: 'exact' })
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

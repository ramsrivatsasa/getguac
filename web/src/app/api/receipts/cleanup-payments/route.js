// POST /api/receipts/cleanup-payments
//
// One-shot backfill that removes credit-card-payment rows from the
// receipts table. Pre-v0.2.71 the statement importer was writing every
// is_payment=true row to receipts with a store_name like
// "[Card payment] CHASE BANK PAYMENT" — those polluted the Spending
// charts. The importer no longer does this, but existing rows need
// cleanup.
//
// Behaviour:
//   - Authenticated user only deletes THEIR OWN payment receipts (RLS
//     enforces this naturally, but we filter by user_id too).
//   - Default mode = dry-run preview. Pass {"confirm": true} in the body
//     to actually delete.
//   - bank_transactions.receipt_id will be set to NULL for the linked
//     payment rows (best-effort — schema may or may not cascade).
//
// Response:
//   { matched, deleted, dryRun, samples? }

import { createApiClient } from '../../../../lib/supabase/server'
import { rateLimit, userRateKey } from '../../../../lib/apiGuard'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request) {
  const sb = createApiClient()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user?.id) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const rl = await rateLimit(userRateKey(user.id, 'cleanup-payments'), { limit: 6, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const dryRun = body?.confirm !== true

  // Find payment-receipts: store_name starts with "[Card payment]" (case
  // insensitive). ILIKE handles both "[Card payment]" and "[CARD PAYMENT]".
  const { data: matches, error: findErr } = await sb
    .from('receipts')
    .select('id, store_name, date, total_amount, statement_import_id')
    .eq('user_id', user.id)
    .ilike('store_name', '[Card payment]%')
    .order('date', { ascending: false })
  if (findErr) {
    return Response.json({ error: findErr.message }, { status: 500 })
  }

  const matched = matches?.length || 0
  if (matched === 0) {
    return Response.json({ matched: 0, deleted: 0, dryRun })
  }

  if (dryRun) {
    return Response.json({
      matched,
      deleted: 0,
      dryRun: true,
      samples: matches.slice(0, 10).map(r => ({
        id: r.id, store_name: r.store_name, date: r.date, total_amount: r.total_amount,
      })),
    })
  }

  const ids = matches.map(r => r.id)

  // Best-effort: null out the bank_transactions.receipt_id link before
  // deleting the receipt, so the transactions row keeps its kind='payment'
  // but no longer points at a phantom receipt. If the bank_transactions
  // table doesn't exist on this env (older deploy), ignore.
  try {
    await sb.from('bank_transactions').update({ receipt_id: null }).in('receipt_id', ids)
  } catch (e) {
    console.warn('[cleanup-payments] bank_transactions update skipped:', e.message)
  }

  // Cascade: receipt_items, receipt_refund_policies — all have ON DELETE
  // CASCADE on receipts.id per migration_001. Safe to just delete the
  // parent rows.
  const { error: delErr, count } = await sb
    .from('receipts')
    .delete({ count: 'exact' })
    .in('id', ids)
    .eq('user_id', user.id)
  if (delErr) {
    return Response.json({ error: delErr.message, matched, deleted: 0 }, { status: 500 })
  }

  return Response.json({
    matched,
    deleted: count || 0,
    dryRun: false,
  })
}

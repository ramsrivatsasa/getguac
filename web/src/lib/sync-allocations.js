// Keeps `expense_allocations` in step with the receipts it is derived from.
//
// Receipts are written from many places (upload, manual add, edit page, email
// poller, statement importer, mobile). Rather than bolt an allocation write on
// to each of them — where a missed path silently zeroes a category budget — the
// budget read path reconciles the period it is about to show. The work is
// idempotent and skips receipts whose split has not changed, so a period that
// is already in sync costs one select.
//
// Allocations the user corrected by hand (`allocation_mode = 'manual'`) are
// authoritative and are never recomputed.

import { allocationRowsForReceipt, sameAllocations } from './allocate-expenses'
import { visibleReceipt } from './receipt-visibility.mjs'

const MISSING_TABLE = /does not exist|schema cache|could not find the table/i

export function isMissingBudgetSchema(error) {
  return Boolean(error) && MISSING_TABLE.test(error.message || '')
}

/**
 * Recomputes allocations for every receipt dated in [from, to].
 *
 * @returns {{ synced: number, skipped: number, error: string|null }}
 */
export async function syncAllocationsForPeriod(sb, userId, from, to) {
  if (!userId) return { synced: 0, skipped: 0, error: null }

  const columns = 'id,user_id,total_amount,category,is_return,source,email_messages(email_classification)'
  let { data: receipts, error: receiptsError } = await sb
    .from('receipts')
    .select(`${columns},receipt_items(id,category,price,qty)`)
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
  // Older installations grant receipts but not the receipt_items relationship
  // read. Budgets still work there — every receipt just allocates at receipt
  // level instead of by item.
  if (receiptsError && /receipt_items|permission denied/i.test(receiptsError.message || '')) {
    const fallback = await sb.from('receipts').select(columns).eq('user_id', userId).gte('date', from).lte('date', to)
    receipts = fallback.data
    receiptsError = fallback.error
  }
  if (receiptsError) return { synced: 0, skipped: 0, error: receiptsError.message }
  receipts = (receipts || []).filter(visibleReceipt)
  if (!receipts?.length) return { synced: 0, skipped: 0, error: null }

  const receiptIds = receipts.map((receipt) => receipt.id)
  const { data: existing, error: existingError } = await sb
    .from('expense_allocations')
    .select('id,receipt_id,category,amount,allocation_mode,needs_review')
    .eq('user_id', userId)
    .in('receipt_id', receiptIds)
  if (existingError) {
    // Migration 084 not applied yet — budgets degrade to empty, not to an error.
    return { synced: 0, skipped: 0, error: isMissingBudgetSchema(existingError) ? null : existingError.message }
  }

  const byReceipt = new Map()
  for (const row of existing || []) {
    if (!byReceipt.has(row.receipt_id)) byReceipt.set(row.receipt_id, [])
    byReceipt.get(row.receipt_id).push(row)
  }

  const staleIds = []
  const inserts = []
  let skipped = 0

  for (const receipt of receipts) {
    const current = byReceipt.get(receipt.id) || []
    if (current.some((row) => row.allocation_mode === 'manual')) { skipped += 1; continue }

    const desired = allocationRowsForReceipt(receipt, receipt.receipt_items || [], userId)
    if (sameAllocations(current, desired)) continue

    for (const row of current) staleIds.push(row.id)
    inserts.push(...desired)
  }

  if (!staleIds.length && !inserts.length) return { synced: 0, skipped, error: null }

  if (staleIds.length) {
    const { error } = await sb.from('expense_allocations').delete().eq('user_id', userId).in('id', staleIds)
    if (error) return { synced: 0, skipped, error: error.message }
  }
  if (inserts.length) {
    const { error } = await sb.from('expense_allocations').insert(inserts)
    if (error) return { synced: 0, skipped, error: error.message }
  }
  return { synced: inserts.length, skipped, error: null }
}

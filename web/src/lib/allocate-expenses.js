// Expense allocation — spec §6.
//
// A canonical expense (one receipt) is split into `expense_allocations` rows so
// category budgets can be updated from real spending. The rules the spec fixes:
//
//   • By receipt — use the receipt-level category only when the receipt has one
//     clear category.
//   • By item — allocate each line item to its own category so one receipt can
//     move several budgets.
//   • A mixed basket is never forced into a single category.
//   • Returns and refunds reduce the original category (return receipts carry
//     negative money, so the signs fall out naturally).
//   • Uncategorized or low-confidence money lands in Needs review instead of
//     quietly distorting a budget.
//   • Allocations always sum to the canonical expense total (spec §12), so tax,
//     tip, fees, and discounts are spread across the categories they belong to
//     rather than disappearing.

export const UNCATEGORIZED = 'uncategorized'

const n = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0)
const round2 = (value) => Math.round((n(value) + Number.EPSILON) * 100) / 100
const slug = (value) => String(value ?? '').trim().toLowerCase()

// `price` is the LINE total on GetGuac receipts ("4@3.33 13.32" parses to
// qty 4, price 13.32), so qty must NOT be multiplied back in here.
export function itemBaseAmount(item) {
  return round2(item?.price)
}

// Item-level allocation applies when the basket carries at least one item that
// was actually classified. Without that, there is nothing to split by.
export function allocationModeFor(receipt, items = []) {
  const list = Array.isArray(items) ? items : []
  if (list.some((item) => slug(item?.category))) return 'item'
  return 'receipt'
}

// Spreads `residual` (tax, tip, fees, discounts — everything not on a line item)
// across the category groups in proportion to their size, and hands the rounding
// remainder to the largest group so the rows still sum to the receipt total.
function distributeResidual(groups, residual) {
  if (!groups.length) return
  const weight = groups.reduce((sum, group) => sum + Math.abs(group.amount), 0)
  if (round2(residual) === 0) return

  if (weight === 0) {
    groups[0].amount = round2(groups[0].amount + residual)
    return
  }
  let spread = 0
  for (const group of groups) {
    const share = round2(residual * (Math.abs(group.amount) / weight))
    group.amount = round2(group.amount + share)
    spread = round2(spread + share)
  }
  const remainder = round2(residual - spread)
  if (remainder !== 0) {
    const largest = groups.reduce((a, b) => (Math.abs(b.amount) > Math.abs(a.amount) ? b : a))
    largest.amount = round2(largest.amount + remainder)
  }
}

/**
 * Builds the allocation rows for one receipt.
 *
 * @param {object} receipt  Canonical receipt (total_amount, category, is_return).
 * @param {Array}  items    Its receipt_items rows.
 * @returns {Array<{category, amount, allocation_mode, confidence, needs_review, receipt_item_id}>}
 *          Rows summing to `receipt.total_amount`.
 */
export function buildReceiptAllocations(receipt, items = []) {
  if (!receipt) return []
  const total = round2(receipt.total_amount)
  const list = (Array.isArray(items) ? items : []).filter(Boolean)
  const mode = allocationModeFor(receipt, list)

  if (mode === 'receipt') {
    const category = slug(receipt.category)
    if (total === 0 && !category) return []
    return [{
      receipt_item_id: null,
      category: category || UNCATEGORIZED,
      amount: total,
      allocation_mode: 'receipt',
      confidence: category ? 0.8 : 0,
      needs_review: !category,
    }]
  }

  // By item: one group per category, so a mixed basket updates several budgets
  // and stays uncategorized only for the part that really is unknown.
  const order = []
  const byCategory = new Map()
  for (const item of list) {
    const category = slug(item.category) || UNCATEGORIZED
    if (!byCategory.has(category)) {
      const group = { category, amount: 0, needs_review: category === UNCATEGORIZED }
      byCategory.set(category, group)
      order.push(group)
    }
    const group = byCategory.get(category)
    group.amount = round2(group.amount + itemBaseAmount(item))
  }

  const itemised = order.reduce((sum, group) => round2(sum + group.amount), 0)
  distributeResidual(order, round2(total - itemised))

  return order
    .filter((group) => group.amount !== 0)
    .map((group) => ({
      receipt_item_id: null,
      category: group.category,
      amount: group.amount,
      allocation_mode: 'item',
      confidence: group.needs_review ? 0 : 0.9,
      needs_review: group.needs_review,
    }))
}

// Database-shaped rows for `expense_allocations`.
export function allocationRowsForReceipt(receipt, items = [], userId = null) {
  return buildReceiptAllocations(receipt, items).map((row) => ({
    ...row,
    user_id: userId ?? receipt?.user_id ?? null,
    receipt_id: receipt?.id ?? null,
  }))
}

// True when two allocation sets describe the same split — lets the sync skip
// receipts that have not changed instead of rewriting rows on every read.
export function sameAllocations(a = [], b = []) {
  const key = (rows) => rows
    .map((row) => `${row.category}|${round2(row.amount)}|${row.allocation_mode}|${row.needs_review ? 1 : 0}`)
    .sort()
    .join(';')
  return key(a) === key(b)
}

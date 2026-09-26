// Spending-by-category aggregation — ONE definition, two lenses.
//
// Every category view in the product answers the same question two ways:
//
//   'receipt' — the whole receipt total lands in the category the RECEIPT
//               carries. Complete (tax, tips, fees and unparsed lines are all
//               inside the total) but coarse: a $180 Target run that was
//               mostly nappies and one TV shows up entirely as one category.
//
//   'item'    — every line item lands in the category the ITEM carries. Fine
//               grained (that Target run splits across household / tech) but
//               never the full total: tax, tips, discounts and any line the
//               parser could not read are not line items, so the item total
//               is always ≤ the receipt total. `coverage` reports that gap
//               so a screen can say so out loud instead of quietly
//               under-reporting.
//
// Both lenses share the SAME exclusion rules, so switching lenses never
// changes which receipts are in scope — only how their money is split:
//   - returns (is_return) are excluded; a refund is not spending
//   - card payments / transfers are excluded (isPaymentReceipt)
//   - non-positive receipt totals are excluded, otherwise a $0 or negative
//     row drags a category share negative (this produced a real "Misc -169%"
//     on the /reports donut)
//   - returned line items are excluded, and items priced ≤ 0 are skipped
//
// `price` is treated as the LINE amount, not a unit price — that is the
// convention every other consumer of receipt_items uses (repeat-purchase
// spend on /reports, the stash engine), and qty is carried alongside for
// display rather than multiplied in.
//
// Consumers: /reports, /guacanomics, /api/chat snapshot. Add a screen here
// rather than re-deriving the maths locally — the two lenses drifting apart
// between screens is exactly the bug this module exists to prevent.

import { isPaymentReceipt } from './payment-rows'
import { CATEGORY_BY_SLUG } from './categories'

export const CATEGORY_MODES = [
  { key: 'receipt', label: 'By receipt', short: 'receipts' },
  { key: 'item', label: 'By item', short: 'items' },
]

export const DEFAULT_CATEGORY_MODE = 'receipt'

export function isCategoryMode(mode) {
  return CATEGORY_MODES.some(m => m.key === mode)
}

// A receipt that counts as spending in BOTH lenses. Exported so callers can
// filter their own drill-down lists with the identical rule.
export function isSpendReceipt(r) {
  if (!r) return false
  if (r.is_return) return false
  if (isPaymentReceipt(r)) return false
  return parseFloat(r.total_amount || 0) > 0
}

// A line item that counts in the item lens.
export function isSpendItem(it) {
  if (!it) return false
  if (it.returned) return false
  return parseFloat(it.price || 0) > 0
}

export function categorySlugOf(row) {
  return row?.category || 'misc'
}

// Category presentation metadata (label, emoji, palette colour name), falling
// back to Misc for any slug that is not a preset — user-defined categories
// still render rather than disappearing.
export function categoryMeta(slug) {
  return CATEGORY_BY_SLUG[slug] || CATEGORY_BY_SLUG.misc
}

/**
 * Aggregate receipts into category rows for one lens.
 *
 * @param {Array} receipts  rows from the receipts table. For mode 'item' each
 *                          row must carry an embedded `receipt_items` array
 *                          with at least { category, price, returned }.
 * @param {'receipt'|'item'} mode
 * @returns {{
 *   mode: string,
 *   rows: Array<{ slug, amount, count, label, emoji, color }>,
 *   total: number,
 *   receiptTotal: number,
 *   coverage: number|null,   // item total ÷ receipt total, null in receipt mode
 *   countedReceipts: number,
 *   countedItems: number,
 *   receiptsWithoutItems: number,
 * }}
 */
export function aggregateCategorySpend(receipts, mode = DEFAULT_CATEGORY_MODE) {
  const useItems = mode === 'item'
  const bucket = new Map()
  let total = 0
  let receiptTotal = 0
  let countedReceipts = 0
  let countedItems = 0
  let receiptsWithoutItems = 0

  const add = (slug, amount) => {
    const entry = bucket.get(slug) || { slug, amount: 0, count: 0 }
    entry.amount += amount
    entry.count += 1
    bucket.set(slug, entry)
  }

  for (const r of receipts || []) {
    if (!isSpendReceipt(r)) continue
    const amt = parseFloat(r.total_amount || 0)
    receiptTotal += amt
    countedReceipts += 1

    if (!useItems) {
      add(categorySlugOf(r), amt)
      total += amt
      continue
    }

    let itemsOnThisReceipt = 0
    for (const it of (r.receipt_items || [])) {
      if (!isSpendItem(it)) continue
      const line = parseFloat(it.price || 0)
      add(categorySlugOf(it), line)
      total += line
      countedItems += 1
      itemsOnThisReceipt += 1
    }
    // A receipt whose lines never parsed contributes nothing to the item
    // lens. Counting them lets a screen explain a low coverage number.
    if (itemsOnThisReceipt === 0) receiptsWithoutItems += 1
  }

  const rows = [...bucket.values()]
    .map(entry => {
      const meta = categoryMeta(entry.slug)
      return { ...entry, label: meta.label, emoji: meta.emoji, color: meta.color }
    })
    .sort((a, b) => b.amount - a.amount)

  return {
    mode: useItems ? 'item' : 'receipt',
    rows,
    total,
    receiptTotal,
    coverage: useItems && receiptTotal > 0 ? total / receiptTotal : null,
    countedReceipts,
    countedItems,
    receiptsWithoutItems,
  }
}

// Drill-down for the receipt lens: the receipts tagged with `slug`, newest
// first. Returns are excluded to match the totals above.
export function receiptsInCategory(receipts, slug) {
  if (!slug) return []
  return (receipts || [])
    .filter(r => isSpendReceipt(r) && categorySlugOf(r) === slug)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

// Drill-down for the item lens: every line item tagged with `slug`, flattened
// with just enough of its parent receipt to render a row and link back.
export function itemsInCategory(receipts, slug) {
  if (!slug) return []
  const out = []
  for (const r of (receipts || [])) {
    if (!isSpendReceipt(r)) continue
    for (const it of (r.receipt_items || [])) {
      if (!isSpendItem(it)) continue
      if (categorySlugOf(it) !== slug) continue
      out.push({
        ...it,
        amount: parseFloat(it.price || 0),
        receiptId: r.id,
        receiptDate: r.date,
        storeName: r.store_name,
        storeId: r.store_id,
      })
    }
  }
  return out.sort((a, b) => (b.receiptDate || '').localeCompare(a.receiptDate || ''))
}

// One-line explanation of what the item lens is and is not, so screens word
// the caveat identically. `fmtMoney` keeps currency formatting with the caller.
export function itemLensNote({ total, coverage, receiptsWithoutItems }, fmtMoney) {
  const parts = [`Line items total ${fmtMoney(total)}`]
  if (coverage != null) parts.push(`${Math.round(coverage * 100)}% of receipt totals`)
  parts.push('tax, tips and unparsed lines are not line items')
  if (receiptsWithoutItems > 0) {
    parts.push(`${receiptsWithoutItems} receipt${receiptsWithoutItems === 1 ? '' : 's'} with no itemised lines`)
  }
  return `${parts.join(' · ')}.`
}

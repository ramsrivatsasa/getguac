// Tax-summary engine.
//
// One function takes the user's receipts and returns the tax-relevant
// rollups: business spending, charity donations, sales tax paid. Used
// by:
//   - /reports page → Tax panel (visual breakdown + CSV export)
//   - future end-of-year automation (email tax-summary on Jan 31)
//   - future GuacWizard insights ("you've spent $X on business this
//     quarter — eligible for deduction")
//
// Pure function — no DB, no auth. Caller pulls receipts and hands them
// in. Mirrors the same exclusion rules used everywhere else (payments
// don't count, returns don't count, $0 rows don't count).

import { isPaymentReceipt } from './payment-rows'

/**
 * @param {Array<{
 *   id?: string, store_name?: string, date?: string,
 *   total_amount?: number, tax_paid?: number,
 *   category?: string, business_purchase?: boolean,
 *   is_return?: boolean
 * }>} receipts
 * @returns {{
 *   businessSpent: number, businessTax: number, businessCount: number,
 *   charityDonated: number, charityCount: number,
 *   salesTax: number, salesTaxCount: number,
 *   totalSpent: number,
 *   businessRows: Array<object>, charityRows: Array<object>,
 * }}
 */
export function computeTaxSummary(receipts = []) {
  const out = {
    businessSpent: 0, businessTax: 0, businessCount: 0,
    charityDonated: 0, charityCount: 0,
    salesTax: 0, salesTaxCount: 0,
    totalSpent: 0,
    businessRows: [],
    charityRows: [],
  }
  if (!Array.isArray(receipts)) return out

  for (const r of receipts) {
    if (!r) continue
    if (r.is_return) continue
    if (isPaymentReceipt(r)) continue
    const amt = parseFloat(r.total_amount || 0)
    if (!Number.isFinite(amt) || amt <= 0) continue

    out.totalSpent += amt
    const txAmt = parseFloat(r.tax_paid || 0) || 0
    if (txAmt > 0) {
      out.salesTax += txAmt
      out.salesTaxCount += 1
    }
    if (r.business_purchase) {
      out.businessSpent += amt
      out.businessTax   += txAmt
      out.businessCount += 1
      out.businessRows.push(r)
    }
    if ((r.category || '') === 'charity') {
      out.charityDonated += amt
      out.charityCount   += 1
      out.charityRows.push(r)
    }
  }
  return out
}

/**
 * Render an array of receipts as a CSV string suitable for downloading.
 * Header row: Date, Store, Category, Amount, Tax, Business, Notes.
 *
 * @param {Array<object>} rows
 * @returns {string} CSV body (no BOM)
 */
export function taxRowsToCsv(rows = []) {
  const header = ['Date', 'Store', 'Category', 'Amount', 'Tax', 'Business', 'Notes']
  const escape = (v) => {
    if (v == null) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push([
      r.date || '',
      r.store_name || '',
      r.category || '',
      parseFloat(r.total_amount || 0).toFixed(2),
      parseFloat(r.tax_paid || 0).toFixed(2),
      r.business_purchase ? 'Yes' : 'No',
      (r.validation_comment || '').slice(0, 200),
    ].map(escape).join(','))
  }
  return lines.join('\n')
}

/**
 * Convenience: build a CSV file name + body for a "year-end taxes" pack.
 * Combines business + charity + sales-tax-bearing rows into ONE export.
 *
 * @param {ReturnType<typeof computeTaxSummary>} summary
 * @param {string} periodLabel  e.g. "2026" or "Last 12 mo"
 */
export function buildTaxExportCsv(summary, periodLabel = 'export') {
  const merged = new Map()
  for (const r of summary.businessRows) merged.set(r.id || `${r.date}|${r.store_name}|${r.total_amount}`, r)
  for (const r of summary.charityRows)  merged.set(r.id || `${r.date}|${r.store_name}|${r.total_amount}`, r)
  const rows = [...merged.values()].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const safeLabel = String(periodLabel).replace(/[^A-Za-z0-9_-]+/g, '-')
  return {
    filename: `getguac-tax-${safeLabel}.csv`,
    body: taxRowsToCsv(rows),
    count: rows.length,
  }
}

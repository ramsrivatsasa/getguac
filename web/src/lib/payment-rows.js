// Payment-row classification helpers.
//
// "Payments" here means credit-card balance payoffs (paying the issuer,
// NOT a merchant) and ACH transfers between the user's own accounts.
// They show up on bank statements but are NOT spending — they're moves
// between accounts. We do NOT want them in:
//   - the dashboard's Total Spent / Spending by Store / Spending by Category
//   - the reports page's donut + category totals
//   - the /receipts table
//
// Pre-v0.2.71 the statement importer was inserting them as `receipts`
// rows with category='misc' and a store_name prefixed with "[Card payment]".
// That polluted spending totals (e.g. "Chase Bank" appeared as a
// $700 top spender). New imports skip them entirely; this helper exists
// so every legacy + reporting surface filters consistently.
//
// One source of truth: change the detection pattern HERE and every caller
// inherits it.

const PAYMENT_STORE_NAME_PREFIX_RE = /^\[card payment\]/i

/**
 * True when this receipt row is actually a credit-card payment / inter-
 * account transfer, NOT a spending event. Should be filtered out of
 * every "what did you spend" view.
 */
export function isPaymentReceipt(r) {
  if (!r) return false
  // Pattern 1: the legacy "[Card payment] <issuer>" store_name shape we
  // wrote for is_payment rows out of /api/parse-statement/import.
  const name = String(r.store_name || '')
  if (PAYMENT_STORE_NAME_PREFIX_RE.test(name)) return true
  // Future-proof: explicit is_payment column on receipts (not present today;
  // here so adding the column later "just works" everywhere).
  if (r.is_payment === true) return true
  return false
}

/** Convenience: filter an array of receipts to exclude payment rows. */
export function excludePaymentReceipts(receipts) {
  if (!Array.isArray(receipts)) return receipts
  return receipts.filter(r => !isPaymentReceipt(r))
}

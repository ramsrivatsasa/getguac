// Statement-row classification helpers.
//
// Bank statements produce three classes of receipt-like rows that need
// special handling separate from regular purchases:
//
//   1. PAYMENTS — credit-card balance payoffs / inter-account transfers.
//      Not spending. Excluded from every "what did you spend" view.
//      Lives in /bank only.
//
//   2. BANK FEES — annual fees, late fees, ATM fees, foreign-transaction
//      fees, overdraft fees. ARE spending (real money leaves your wallet)
//      and should be categorized as 'bank-fees', not 'misc'.
//
//   3. BANK INTEREST — interest charges on revolving balances and cash-
//      advance interest. Also spending, also 'bank-fees' category.
//
// New statement imports route fees + interest to bank-fees and skip
// payments entirely (see /api/parse-statement/import). Pre-existing
// rows from older imports may be miscategorized — these helpers + the
// /api/receipts/recategorize-bank-fees endpoint handle the backfill.
//
// One source of truth: change the detection patterns HERE and every
// classifier + cleanup surface inherits it.

const PAYMENT_STORE_NAME_PREFIX_RE = /^\[card payment\]/i
// Tagged-prefix patterns the statement importer writes when it identifies
// a row as a fee or interest charge. Match is case-insensitive.
const BANK_FEE_STORE_NAME_PREFIX_RE     = /^\[(fee|annual fee|late|atm|foreign|overdraft)/i
const BANK_INTEREST_STORE_NAME_PREFIX_RE = /^\[(interest|purchase interest|cash[- ]advance interest)/i

/**
 * True when this receipt row is actually a credit-card payment / inter-
 * account transfer, NOT a spending event. Should be filtered out of
 * every "what did you spend" view.
 */
export function isPaymentReceipt(r) {
  if (!r) return false
  const name = String(r.store_name || '')
  if (PAYMENT_STORE_NAME_PREFIX_RE.test(name)) return true
  if (r.is_payment === true) return true
  return false
}

/**
 * True when this receipt row is a bank fee (annual / late / ATM / foreign
 * / overdraft) — money the user paid the issuer, but NOT for a merchant
 * purchase. Counts as spending but belongs in the 'bank-fees' category.
 */
export function isBankFeeReceipt(r) {
  if (!r) return false
  const name = String(r.store_name || '')
  if (BANK_FEE_STORE_NAME_PREFIX_RE.test(name)) return true
  if (r.is_fee === true) return true
  return false
}

/**
 * True when this receipt row is a bank-issued interest charge (purchase
 * interest, cash-advance interest, balance-transfer interest). Also
 * spending, also 'bank-fees' category.
 */
export function isBankInterestReceipt(r) {
  if (!r) return false
  const name = String(r.store_name || '')
  if (BANK_INTEREST_STORE_NAME_PREFIX_RE.test(name)) return true
  if (r.is_interest === true) return true
  return false
}

/**
 * Convenience: the row IS spending (counts toward totals) AND belongs
 * in the bank-fees category. Used by the recategorize endpoint to find
 * rows currently in the wrong category.
 */
export function isBankChargeReceipt(r) {
  return isBankFeeReceipt(r) || isBankInterestReceipt(r)
}

/** Filter an array of receipts to exclude payment rows. */
export function excludePaymentReceipts(receipts) {
  if (!Array.isArray(receipts)) return receipts
  return receipts.filter(r => !isPaymentReceipt(r))
}

// Preserve source records for review. Suppress only confirmed empty email
// placeholders, never all zero receipts or legitimate zero-net exchanges.
export function visibleReceipt(receipt) {
  if (receipt.source !== 'email' || Number(receipt.total_amount) !== 0 || receipt.is_return || receipt.receiptItemsUnavailable) return true
  if (!Array.isArray(receipt.receipt_items) || receipt.receipt_items.length) return true
  const messages = receipt.email_messages || []
  return !messages.length || !messages.every(m => ['promotion','account_notice','order_update'].includes(m.email_classification))
}

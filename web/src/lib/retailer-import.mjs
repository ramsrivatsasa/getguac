const RETAILERS = { amazon: 'Amazon', walmart: 'Walmart', costco: 'Costco', instacart: 'Instacart', home_depot: 'The Home Depot' }
export { RETAILERS }

export function reviewedOrder(order, retailerId) {
  const id = String(order?.order_id || '').trim()
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(id)) return null
  const dateText = String(order?.date || '').trim()
  const date = new Date(dateText)
  // Never invent today's date for an incomplete historical purchase.
  if (!dateText || !Number.isFinite(date.getTime())) return null
  // ISO retailer timestamps describe the purchase's local calendar date;
  // converting an offset timestamp to UTC can shift it into another day.
  const isoDay = dateText.match(/^(\d{4}-\d{2}-\d{2})(?:T|$)/)?.[1]
  if (isoDay && new Date(`${isoDay}T00:00:00Z`).toISOString().slice(0, 10) !== isoDay) return null
  const total = Number(String(order?.total ?? '').replace(/[$,\s]/g, ''))
  if (!Number.isFinite(total) || total <= 0) return null
  const items = (Array.isArray(order?.items) ? order.items : []).slice(0, 200).flatMap(item => {
    const name = String(item?.name || item?.item_name || '').trim().slice(0, 300)
    if (!name) return []
    const quantity = Number(item?.qty ?? 1)
    const price = Number(String(item?.price ?? 0).replace(/[$,\s]/g, ''))
    return [{ item_name: name, qty: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      price: Number.isFinite(price) && price >= 0 ? price : 0 }]
  })
  return { key: `retailer_${retailerId}_${id}`, parsed: {
    store_name: RETAILERS[retailerId], date: isoDay || date.toISOString().slice(0, 10),
    total_amount: total, items,
  }, id }
}

export async function importReviewedOrders(sb, userId, retailerId, orders, saveReceipt) {
  let imported = 0, updated = 0, skipped = 0, failed = 0
  const receiptIds = new Set(), seen = new Set(), errors = []
  for (let index = 0; index < orders.length; index++) {
    const order = reviewedOrder(orders[index], retailerId)
    if (!order || seen.has(order.key)) { skipped++; continue }
    seen.add(order.key)
    try {
      const result = await saveReceipt(sb, userId, order.parsed, {
        retailer_order_key: order.key, source: 'manual',
        validation_comment: `Imported from ${RETAILERS[retailerId]} order ${order.id}; review totals and tax against the retailer invoice.`,
      })
      if (!result?.receipt_id) throw new Error('Receipt save did not return an ID')
      if (receiptIds.has(result.receipt_id)) {
        throw new Error('Distinct retailer orders returned the same receipt ID; order identity could not be preserved')
      }
      receiptIds.add(result.receipt_id)
      if (result.merged) updated++
      else imported++
    } catch (error) {
      failed++
      // Preserve per-order failures without losing successful saves in this batch.
      errors.push({ index, order_id: order.id, message: error.message || 'Could not save order' })
    }
  }
  return { imported, updated, skipped, failed, receipt_ids: [...receiptIds], errors }
}

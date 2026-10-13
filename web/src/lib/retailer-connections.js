import { RETAILERS } from './retailers'

function senderDomain(message) {
  return String(message?.fromAddr || '').toLowerCase().match(/@([a-z0-9.-]+)/)?.[1] || ''
}

function retailerFromReceipt(message, storeName) {
  const domain = senderDomain(message)
  const store = String(storeName || '').toLowerCase()
  const candidates = RETAILERS.filter((retailer, index, all) =>
    retailer.receiptDomain &&
    (domain === retailer.receiptDomain || domain.endsWith(`.${retailer.receiptDomain}`)) &&
    all.findIndex(item => item.id === retailer.id) === index
  )
  if (candidates.length === 1) return candidates[0]
  return candidates.find(retailer => {
    const words = retailer.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(word => word.length > 2)
    return words.some(word => store.includes(word))
  }) || candidates.find(retailer => retailer.id === 'amazon') || null
}

export async function verifyRetailerReceiptConnection(sb, userId, message, receiptId) {
  if (!userId || !receiptId) return null
  const { data: receipt } = await sb.from('receipts').select('store_name').eq('id', receiptId).eq('user_id', userId).maybeSingle()
  const retailer = retailerFromReceipt(message, receipt?.store_name)
  if (!retailer) return null

  const { data: existing } = await sb.from('user_connections')
    .select('receipts_seen').eq('user_id', userId).eq('retailer_id', retailer.id).maybeSingle()
  const { error } = await sb.from('user_connections').upsert({
    user_id: userId,
    retailer_id: retailer.id,
    status: 'verified',
    verified_at: new Date().toISOString(),
    receipts_seen: Number(existing?.receipts_seen || 0) + 1,
  }, { onConflict: 'user_id,retailer_id' })
  if (error) throw error
  return retailer.id
}

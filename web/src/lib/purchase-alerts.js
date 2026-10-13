import { matchRecallNotices } from './product-recalls.mjs'

export async function purchaseAlertsForUser(db, userId, notices) {
  const receipts = []
  const since = new Date(Date.now() - 455 * 86400000).toISOString().slice(0, 10)
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from('receipts')
      .select('id,date,store_name,category,is_return,receipt_items(item_name,category,returned)')
      .eq('user_id', userId).gte('date', since).order('date', { ascending: false }).order('id')
      .range(offset, offset + 499)
    if (error) throw new Error('Could not check purchases')
    receipts.push(...(data || []))
    if (!data || data.length < 500) break
  }
  return matchRecallNotices(notices, receipts)
}

import { allRecords } from './pagination.mjs'
import { visibleReceipt } from '../receipt-visibility.mjs'
import { reconcileProgress } from './reconcile.mjs'
export { find10Enabled, find10BackendAllowed } from './availability.mjs'

export async function loadRecurringData(sb, user) {
  const requests = [
    ['stores', sb.from('stores').select('id,store_name')],
    ['financialGoals', sb.from('financial_goals').select('*').eq('user_id', user.id)],
    ['incomeSources', sb.from('income_sources').select('*').eq('user_id', user.id).eq('is_active', true)],
    ['receipts', sb.from('receipts').select('id,store_name,date,total_amount,category,is_return,source,email_messages(email_classification),receipt_items(id),receipt_refund_policies(*)').eq('user_id', user.id)],
    ['billCycles', sb.from('bill_cycles').select('*,bill_series(name,category,cadence),bill_payment_links(receipt_id,amount)').eq('user_id', user.id)],
    ['wealthAccounts', sb.from('wealth_accounts').select('*').eq('user_id', user.id).eq('is_active', true)],
    ['debtAccounts', sb.from('debt_accounts').select('*').eq('user_id', user.id).eq('is_active', true)],
    ['items', sb.from('receipt_items').select('id,receipt_id,item_name,sku,model,qty,price,category,rating,returned,refund_policy_id,receipts!inner(user_id,date,store_name,is_return)').eq('receipts.user_id', user.id)],
    ['promotions', sb.from('promotions').select('id,merchant_name,title,benefit_text,expires_at,starts_at,source_url,verification_status,last_checked_at,status').eq('user_id', user.id).eq('status', 'active')],
  ]
  // Independent reads share one round trip window; no cross-user cache.
  const [results,progress,snapshot] = await Promise.all([
    Promise.all(requests.map(async ([name, query]) => [name, await allRecords(query.order('id'), name)])),
    sb.from('find10_progress').select('state').eq('user_id', user.id).maybeSingle(),
    sb.from('agent_snapshots').select('result').eq('user_id',user.id).eq('kind','plan').maybeSingle(),
  ])
  if(progress.error)throw new Error('Your saved plan could not be loaded. Please retry.')
  const records = { ...Object.fromEntries(results), sampleData: user.email === 'test@getguac.local', postalCode:user.user_metadata?.postal_code || user.user_metadata?.find10_postal_code || null }
  records.receipts = records.receipts.filter(visibleReceipt)
  records.depositQuotes = snapshot.data?.result?.data?.depositQuotes || {}
  records.priceQuotes = snapshot.data?.result?.data?.priceQuotes || {}
  records.planSuggestions = snapshot.data?.result?.data?.planSuggestions || null
  return { ...records, progress: reconcileProgress(progress.data?.state || { version: 0, actions: [], ledger: [], requests: [] }, records), captureCompletedAt: user.user_metadata?.find10_capture_completed_at || null, goalPct: user.user_metadata?.find10_goal_pct ?? 10, lastCheckIn: user.user_metadata?.find10_last_check_in || null }
}

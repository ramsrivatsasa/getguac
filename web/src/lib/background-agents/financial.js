import {shoppingSearchConfigured} from '../shopping-search-config.mjs'
import {refreshDepositQuotes} from '../find-your-10/deposit-discovery.mjs'
import {wealthJourney} from '../find-your-10/wealth-journey.mjs'
import {refreshPlanQuotes} from '../find-your-10/price-discovery.mjs'
import {searchPlanProducts} from '../find-your-10/plan-search.mjs'
import { computeDashboardAnalysis } from '../analysisEngine.js'
import { recurringAnalysis } from '../find-your-10/recurring.mjs'
import { allRecords } from '../find-your-10/pagination.mjs'
import { accountOpportunities } from '../find-your-10/opportunities.mjs'
import { reconcileProgress } from '../find-your-10/reconcile.mjs'
import { emptyProgress, progressTotals } from '../find-your-10/progress.mjs'
import { generatePlanSuggestions, filterPlanFeedback } from '../find-your-10/plan-ai.mjs'
import {billOptions} from '../find-your-10/bill-options.mjs'
import {personalCashPlan} from '../find-your-10/personal-cash.mjs'
import {visibleReceipt} from '../receipt-visibility.mjs'

const cents = value => {
  if (value == null || value === '') throw new Error('A financial amount is missing.')
  const amount = Number(value)
  if (!Number.isFinite(amount)) throw new Error('A financial amount is invalid.')
  return Math.round(amount * 100)
}
const total = (rows, field) => rows.reduce((sum, row) => sum + cents(row[field]), 0)

// This adapter only reads source records. The coordinator persists snapshots;
// it must never overwrite a member's goals, balances, or accepted plan actions.
export async function runFinancialAgent({ sb, userId, kind, now = new Date() }) {
  if (!sb || !userId) throw new Error('A user-scoped financial agent is required.')
  if (!['analysis', 'plan', 'goals', 'wealth'].includes(kind)) throw new Error('Unknown financial agent.')
  const date = new Date(now)
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid snapshot date.')
  const sourceCounts = {}
  const read = async (table, columns = '*', active = false, owner = 'user_id', order = 'id') => {
    let query = sb.from(table).select(columns).eq(owner, userId)
    if (active) query = query.eq('is_active', true)
    const rows = await allRecords(query.order(order), table)
    const visible = table === 'receipts' ? rows.filter(visibleReceipt) : rows
    sourceCounts[table] = visible.length
    return visible
  }
  let result
  if (kind === 'analysis') {
    const [receipts, fees, transactions] = await Promise.all([
      read('receipts','*,receipt_items(id),email_messages(email_classification)'), read('bank_fees'), read('bank_transactions'),
    ])
    // Future-dated entries cannot represent money already spent.
    const today = date.toISOString().slice(0, 10)
    const recorded = rows => rows.filter(row => String(row.date || '').slice(0, 10) <= today)
    result = computeDashboardAnalysis({ receipts: recorded(receipts), fees: recorded(fees), transactions: recorded(transactions), now: date })
  } else if (kind === 'goals') {
    const goals = await read('financial_goals')
    const today = date.toISOString().slice(0, 10)
    result = { goals: goals.map(goal => {
      const targetCents = cents(goal.target_amount), currentCents = cents(goal.current_amount)
      return { id: goal.id, name: goal.name, status: goal.status, targetDate: goal.target_date,
        targetCents, currentCents, remainingCents: Math.max(0, targetCents - currentCents),
        progressPct: targetCents > 0 ? Math.round(currentCents / targetCents * 10000) / 100 : null,
        overdue: goal.status === 'active' && Boolean(goal.target_date && goal.target_date < today) && currentCents < targetCents }
    }) }
  } else if (kind === 'wealth') {
    const [assets, debts, financialGoals, billCycles, progressRows] = await Promise.all([read('wealth_accounts', '*', true), read('debt_accounts', '*', true),read('financial_goals'),read('bill_cycles'),read('find10_progress','state',false,'user_id','user_id')])
    const progress=progressRows[0]?.state||emptyProgress()
    const assetCents = total(assets, 'balance'), debtCents = total(debts, 'balance')
    result = { assetCents, debtCents, netWorthCents: assetCents - debtCents,
      cashPlan:personalCashPlan({wealthAccounts:assets,debtAccounts:debts,financialGoals,billCycles},progress,progress.cashChoice?.inputs||{},date),
      cashCents: total(assets.filter(a => ['checking', 'savings'].includes(a.account_type)), 'balance'),
      minimumPaymentsCents: total(debts, 'minimum_payment'),
      basis: 'Saved account balances; no live valuations or investment recommendations.' }
  } else {
    const [incomeSources, receipts, billCycles, wealthAccounts, debtAccounts, auth, items, promotions, progressRows, financialGoals] = await Promise.all([
      read('income_sources', '*', true), read('receipts','*,receipt_items(id),email_messages(email_classification)'),
      read('bill_cycles', '*,bill_series(name,category,cadence),bill_payment_links(receipt_id,amount)'),
      read('wealth_accounts', '*', true), read('debt_accounts', '*', true),
      sb.auth.admin.getUserById(userId),
      read('receipt_items', 'id,receipt_id,item_name,sku,model,qty,price,category,rating,returned,receipts!inner(*)', false, 'receipts.user_id'),
      read('promotions', 'id,merchant_name,title,benefit_text,expires_at,starts_at,source_url,verification_status,last_checked_at,status'),
      read('find10_progress', 'state', false, 'user_id', 'user_id'),
      read('financial_goals'),
    ])
    if (auth.error || auth.data?.user?.id !== userId) throw new Error('Plan preferences could not be loaded.')
    const metadata = auth.data.user.user_metadata || {}
    const records = { incomeSources, receipts, billCycles, wealthAccounts, debtAccounts, items, promotions, financialGoals,
      countryCode:metadata.country_code||null, currency:metadata.preferred_currency||null, postalCode:metadata.postal_code||metadata.find10_postal_code||null,
      goalPct: metadata.find10_goal_pct ?? 10, captureCompletedAt: metadata.find10_capture_completed_at || null }
    const recurring = recurringAnalysis(records, date)
    const progress = reconcileProgress(progressRows[0]?.state || emptyProgress(), records, date.toISOString())
    const previousSnapshots=await read('agent_snapshots','result,kind',false,'user_id','kind')
    const previous=previousSnapshots.find(s=>s.kind==='plan')?.result?.data || {}
    const generated = await generatePlanSuggestions({...records,progress},{now:date,maxBatches:1,cursor:previous.planSuggestions?.nextCursor||0}).catch(()=>({status:'unavailable',suggestions:[]}))
    let planSuggestions=generated.status==='unavailable'&&previous.planSuggestions ? {...previous.planSuggestions,status:'stale'} : generated
    if(generated.status==='partial') {
      const fresh=new Set(generated.suggestions.map(s=>s.sourceId)),valid=new Set(items.map(i=>i.id))
      planSuggestions={...generated,suggestions:[...generated.suggestions,...(previous.planSuggestions?.suggestions||[]).filter(s=>valid.has(s.sourceId)&&!fresh.has(s.sourceId))]}
    }
    planSuggestions={...planSuggestions,suggestions:filterPlanFeedback({...records,progress},planSuggestions.suggestions)}
    records.planSuggestions=planSuggestions
    // The current shopping adapter supports US/USD only; never compare currencies silently.
    const priceDiscoveryStatus=!(await shoppingSearchConfigured())?'unavailable':records.countryCode!=='US'||records.currency!=='USD'?'unsupported_region':'ready'
    const priceQuotes=await refreshPlanQuotes(records,{search:priceDiscoveryStatus==='ready'?searchPlanProducts:undefined,previous:records.countryCode==='US'&&records.currency==='USD'?previous.priceQuotes:{},now:date,limit:5})
    const priceDiscovery={status:priceDiscoveryStatus==='ready'&&Object.values(priceQuotes).some(q=>q.status==='error')?'partial':priceDiscoveryStatus,checkedAt:date.toISOString(),provider:'serpapi'}

    const depositQuotes=await refreshDepositQuotes({previous:previous.depositQuotes,now:date})
    records.depositQuotes=depositQuotes
    result = { ...recurring, depositQuotes,
      planSuggestions, priceQuotes, priceDiscovery,
      cashPlan: personalCashPlan(records,progress,progress.cashChoice?.inputs||{},date),
      wealthJourney:wealthJourney({...records,progress},date),
      billChoices:billOptions({...records,progress},date).map(b=>({...b,savedChoice:progress.actions.find(a=>a.seriesId===b.seriesId&&a.optionId&&(a.accepted||a.optionId==='keep'))?.optionId||null})),
      progress: { ...progressTotals(progress, recurring.month), evidenceAdjustedCount: progress.ledger.filter(entry => entry.evidenceAdjusted).length },
      opportunities: accountOpportunities(records, date),
      progressBasis: 'Found is accepted estimates; Kept is reconciled against current saved evidence. Recorded transfers are separate.',
    }
  }
  return { ...(kind==='plan'&&(['partial','unavailable','stale'].includes(result.planSuggestions?.status)||['partial','unavailable','unsupported_region'].includes(result.priceDiscovery?.status))?{partial:true}:{}), kind, userId, generatedAt: date.toISOString(), algorithmVersion: 'financial-v1', sourceCounts, data: result }
}

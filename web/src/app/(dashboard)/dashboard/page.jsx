import { headers } from 'next/headers'
import { visibleReceipt } from '../../../lib/receipt-visibility.mjs'
import { redirect } from 'next/navigation'
import { find10Enabled, loadRecurringData } from '../../../lib/find-your-10/integration'
import { incomeReady } from '../../../lib/find-your-10/recurring.mjs'
import { createClient } from '../../../lib/supabase/server'
import DashboardClient from './DashboardClient'
import { syncAllocationsForPeriod } from '../../../lib/sync-allocations'
import {calendarDayKey} from '../../../lib/hydration-calendar.mjs'

// Always render fresh: Supabase queries run through fetch(), which Next's Data
// Cache would otherwise cache server-side — making the greeting name, totals,
// and anomalies show stale data after the user's rows change.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function DashboardPage() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if(!user) redirect('/login')
  if (find10Enabled() && user) {
    const { data: income, error } = await sb.from('income_sources').select('*').eq('user_id', user.id).eq('is_active', true)
    if (error) return <p role="alert">Income could not be loaded. Reload to retry before starting your plan.</p>
    if (!incomeReady(income)) redirect('/setup/income')
  }

  // Server-side initial data fetch (SSR) — TanStack Query hydrates on client.
  // The dashboard's period selector offers Daily/Weekly/Monthly/Yearly with
  // counts going out to 10 years, so we need the full receipt history here,
  // not just the latest 50. 5000 covers any realistic household over a
  // decade; users beyond that scale need pagination, not a higher cap.
  const now = new Date()
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const to = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
  // Category budget progress reads expense_allocations, which are derived from
  // this month's receipts. Reconcile before the read so the dashboard and the
  // Budget page always agree (spec 2 platform parity).
  if (user?.id) await syncAllocationsForPeriod(sb, user.id, from, to)

  const results = await Promise.all([
    // `rating` is required by the GuacScore tile — without it every
    // receipt looks unrated and `calculateGuacoScore` returns null
    // ("Fresh start" placeholder) even when the user has rated
    // purchases that /guacanomics correctly scores.
    sb.from('receipts').select('id,store_name,date,total_amount,tax_paid,business_purchase,category,is_return,rating,source,email_messages(email_classification),receipt_items(id)').order('date', { ascending: false }).limit(5000),
    sb.from('profiles').select('first_name,dashboard_preferences').eq('id', user?.id || '').single(),
    sb.from('income_sources').select('*').eq('is_active', true),
    sb.from('bill_cycles').select('*,bill_series(name,category,expected_amount),bill_payment_links(receipt_id,amount)').gte('due_date', from).lte('due_date', to),
    sb.from('savings_allocations').select('*').lte('period_start', to).gte('period_end', from),
    sb.from('budget_categories').select('*,budgets!inner(period_start,period_end,is_active)').eq('budgets.is_active', true).lte('budgets.period_start', to).gte('budgets.period_end', from),
    sb.from('expense_allocations').select('category,amount,needs_review,receipts!inner(date)').gte('receipts.date', from).lte('receipts.date', to),
    sb.from('receipt_items').select('item_name,sku,qty,price,purchase_date,category,receipt_id').not('price', 'is', null).order('purchase_date', { ascending: true }).limit(1000),
    sb.from('bank_fees').select('amount,kind'),
    sb.from('financial_goals').select('*').eq('status', 'active').order('priority').limit(5),
    sb.from('wealth_accounts').select('id,name,account_type,balance').eq('is_active', true),
    sb.from('debt_accounts').select('id,name,debt_type,balance,apr,minimum_payment,extra_payment').eq('is_active', true),
    sb.from('premium_entitlements').select('premium_until').eq('user_id', user?.id || '').maybeSingle(),
  ])
  if(results.some(result=>result.error))return <div role="alert" className="rounded-xl border border-violet-100 bg-white p-5"><h1 className="font-bold">Your dashboard records could not be loaded</h1><p className="mt-2">Please retry. If your session has expired, sign in again. Spending and savings totals will appear once your records load.</p><div className="mt-3 flex gap-3"><a href="/dashboard" className="inline-flex min-h-11 items-center underline">Retry dashboard</a><a href="/login" className="inline-flex min-h-11 items-center underline">Sign in again</a></div></div>
  const [{ data: receipts }, { data: profile }, { data: incomeSources }, { data: billCycles }, { data: savings }, { data: categories }, { data: allocations }, { data: items }, { data: bankFees }, { data: goals }, { data: wealthAccounts }, { data: debtAccounts }, { data: entitlement }] = results

  const premiumUntil = entitlement?.premium_until ? new Date(entitlement.premium_until) : null
  // Demo accounts are product showcases: every dashboard card must be
  // available in Customize mode without creating a fake paid entitlement.
  // Keep the override restricted to the two documented demo identities (and
  // an explicitly configured DEMO_EMAIL); ordinary users still use the real
  // premium_entitlements row above.
  const demoEmails = new Set([
    'demo@getguac.app',
    'localdemo@getguac.test',
    process.env.DEMO_EMAIL,
  ].filter(Boolean).map(email => email.toLowerCase()))
  const isDemo = demoEmails.has(String(user?.email || '').toLowerCase())
  const isPremium = isDemo || Boolean(premiumUntil && premiumUntil > new Date())
  const visibleReceipts = (receipts ?? []).filter(visibleReceipt)
  let find10 = null
  if (find10Enabled() && user) {
    try { find10 = await loadRecurringData(sb, user) }
    catch (error) { return <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5"><h1 className="font-bold">Your dashboard records could not be loaded</h1><p>{error.message}</p><a href="/dashboard" className="inline-flex min-h-11 items-center underline">Retry dashboard</a></div> }
  }

  return (
    <DashboardClient
      userId={user?.id ?? null}
      initialToday={calendarDayKey(now)}
      find10={find10}
      initialReceipts={visibleReceipts}
      firstName={profile?.first_name ?? 'User'}
      isPremium={isPremium}
      initialDashboardPreferences={profile?.dashboard_preferences ?? null}
      initialPlanning={{ period: { from, to }, monthReceipts: visibleReceipts.filter(receipt => receipt.date >= from && receipt.date <= to), incomeSources: incomeSources ?? [], billCycles: billCycles ?? [], savings: savings ?? [], categories: categories ?? [], allocations: allocations ?? [], items: items ?? [], bankFees: bankFees ?? [], goals: goals ?? [], wealthAccounts: wealthAccounts ?? [], debtAccounts: debtAccounts ?? [] }}
    />
  )
}

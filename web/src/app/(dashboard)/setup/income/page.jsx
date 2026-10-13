import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import { find10Enabled, find10BackendAllowed } from '../../../../lib/find-your-10/integration'
import { incomeReady } from '../../../../lib/find-your-10/recurring.mjs'
import BudgetClient from '../../budget/BudgetClient'

export const dynamic = 'force-dynamic'
export default async function IncomeSetup() {
  if (!find10Enabled()) notFound()
  if (!find10BackendAllowed()) redirect('/local-setup')
  const sb = createClient(); const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/register')
  const { data, error } = await sb.from('income_sources').select('*').eq('user_id', user.id).eq('is_active', true)
  if (error) return <p role="alert">Income could not be loaded. Reload to try again; your saved information has not changed.</p>
  if (incomeReady(data)) redirect('/dashboard')
  return <BudgetClient userId={user.id} incomeOnly />
}

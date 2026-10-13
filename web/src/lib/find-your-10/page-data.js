import { notFound, redirect } from 'next/navigation'
import { createClient } from '../supabase/server'
import { find10Enabled, find10BackendAllowed, loadRecurringData } from './integration'
import { incomeReady } from './recurring.mjs'
export async function loadPlanPage() {
  if (!find10Enabled()) notFound()
  if (!find10BackendAllowed()) redirect('/local-setup')
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  const data = await loadRecurringData(sb, user)
  if (!incomeReady(data.incomeSources)) redirect('/setup/income')
  return data
}

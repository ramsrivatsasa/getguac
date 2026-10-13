import BudgetClient from './BudgetClient'
import { createClient } from '../../../lib/supabase/server'

export const metadata = { title: 'Budget & money flow' }

export default async function BudgetPage() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  return <BudgetClient userId={user?.id ?? null} />
}

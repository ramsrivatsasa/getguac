import { createClient } from '../../../lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()

  // Server-side initial data fetch (SSR) — TanStack Query hydrates on client.
  // The dashboard's period selector offers Daily/Weekly/Monthly/Yearly with
  // counts going out to 10 years, so we need the full receipt history here,
  // not just the latest 50. 5000 covers any realistic household over a
  // decade; users beyond that scale need pagination, not a higher cap.
  const [{ data: receipts }, { data: rewards }, { data: profile }] = await Promise.all([
    sb.from('receipts').select('id,store_name,date,total_amount,tax_paid,business_purchase').order('date', { ascending: false }).limit(5000),
    sb.from('rewards').select('*').order('expiry_date', { ascending: true }).limit(10),
    sb.from('profiles').select('first_name').eq('id', user.id).single(),
  ])

  return (
    <DashboardClient
      initialReceipts={receipts ?? []}
      initialRewards={rewards ?? []}
      firstName={profile?.first_name ?? 'User'}
    />
  )
}

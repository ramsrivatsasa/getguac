// Server entry for /preview/dashboard. Same data fetch shape as the
// real dashboard page, just routed at a different URL so we can
// evaluate the redesigned card aesthetic with REAL user data without
// touching the production /dashboard surface.
//
// Pulls receipts + rewards + profile from Supabase, hands off to the
// PreviewDashboardClient (separate file because the redesign uses
// hooks / animations that only make sense client-side).

import { createClient } from '../../../../lib/supabase/server'
import PreviewDashboardClient from './PreviewDashboardClient'

export default async function PreviewDashboardPage() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()

  const [{ data: receipts }, { data: rewards }, { data: profile }] = await Promise.all([
    sb.from('receipts').select('id,store_name,date,total_amount,tax_paid,business_purchase,category,is_return,worthit_score').order('date', { ascending: false }).limit(500),
    sb.from('rewards').select('id, reward_title, reward_no, store_name, expiry_date').order('expiry_date', { ascending: true }).limit(10),
    sb.from('profiles').select('first_name').eq('id', user?.id || '').single(),
  ])

  return (
    <PreviewDashboardClient
      receipts={receipts ?? []}
      rewards={rewards ?? []}
      firstName={profile?.first_name ?? 'there'}
    />
  )
}

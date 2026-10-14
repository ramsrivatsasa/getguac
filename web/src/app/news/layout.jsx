import DashboardLayout from '../(dashboard)/layout'
import MarketingShell from '../../components/MarketingShell'
import { createClient } from '../../lib/supabase/server'

export const metadata = { title: 'News and Markets | GetGuac', description: 'Read financial news, explore market updates, and follow company stories with GetGuac.' }

export default async function NewsLayout({ children }) {
  const { data: { user } } = await createClient().auth.getUser()
  return user ? <DashboardLayout>{children}</DashboardLayout> : <MarketingShell><div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</div></MarketingShell>
}

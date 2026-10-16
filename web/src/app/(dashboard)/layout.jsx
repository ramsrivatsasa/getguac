import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '../../lib/supabase/server'
import Sidebar from '../../components/Sidebar'
import TopBar from '../../components/TopBar'
import QuickAddReceipt from '../../components/QuickAddReceipt'
import OutboxFlusher from '../../components/OutboxFlusher'
import GuacAgentRefresh from '../../components/GuacAgentRefresh'
import EmbedErrorBoundary from '../../components/EmbedErrorBoundary'
import { ConfirmProvider } from '../../components/ConfirmDialog'
import CommandPalette from '../../components/CommandPalette'
import AdSlot from '../../components/AdSlot'
import { find10Enabled, find10BackendAllowed } from '../../lib/find-your-10/integration'

export const metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

export default async function DashboardLayout({ children }) {
  if (find10Enabled() && !find10BackendAllowed()) redirect('/local-setup')
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')

  // Embedded mode (mobile WebView, set by /embed): render the page bare —
  // no sidebar/topbar/FAB — so it sits cleanly inside the native shell.
  const embedded = (await cookies()).get('guac_embedded')?.value === '1'
  if (embedded) {
    return (
      <ConfirmProvider>
        <main className="guac-embedded min-h-screen bg-gray-50 p-4">
          
          <EmbedErrorBoundary>{children}</EmbedErrorBoundary>
        </main>
        <OutboxFlusher />
        <GuacAgentRefresh />
      </ConfirmProvider>
    )
  }

  // Check admin status
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).single()
  const isAdmin = profile?.is_admin ?? false

  return (
    <ConfirmProvider>
      {/* Redesign shell: gradient backdrop with the whole app floating in a
          centered rounded card (mockup layout). */}
      <div
        className="min-h-screen bg-slate-50"
      >
        <div className="w-full flex items-start">
          <Sidebar isAdmin={isAdmin} find10={find10Enabled()} initialPlanPercent={user.user_metadata?.find10_goal_pct || 10} />
          <div className="flex-1 flex flex-col min-w-0 min-h-screen xl:pr-[280px]">
            <TopBar user={user} find10={find10Enabled()} />
            <main className="dashboard-main w-full max-w-[1664px] flex-1 min-w-0 p-4 lg:px-6 lg:py-4 [&>div]:!w-full [&>div]:!max-w-none [&>div]:!mx-0">
              
              {children}
              {!find10Enabled() && <AdSlot
                slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD || process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '9142744455'}
                minHeight={90}
                className="mx-auto mt-6 w-full max-w-5xl"
                tier={2}
              />}
            </main>
          </div>
        </div>
        <QuickAddReceipt />
        <OutboxFlusher />
        <GuacAgentRefresh />
        <CommandPalette find10={find10Enabled()} goalPct={user.user_metadata?.find10_goal_pct || 10} />
      </div>
    </ConfirmProvider>
  )
}

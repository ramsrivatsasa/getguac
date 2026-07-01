import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '../../lib/supabase/server'
import Sidebar from '../../components/Sidebar'
import TopBar from '../../components/TopBar'
import QuickAddReceipt from '../../components/QuickAddReceipt'
import OutboxFlusher from '../../components/OutboxFlusher'
import EmbedErrorBoundary from '../../components/EmbedErrorBoundary'
import { ConfirmProvider } from '../../components/ConfirmDialog'
import CommandPalette from '../../components/CommandPalette'

export default async function DashboardLayout({ children }) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')

  // Embedded mode (mobile WebView, set by /embed): render the page bare —
  // no sidebar/topbar/FAB — so it sits cleanly inside the native shell.
  const embedded = cookies().get('guac_embedded')?.value === '1'
  if (embedded) {
    return (
      <ConfirmProvider>
        <main className="guac-embedded min-h-screen bg-gray-50 p-4">
          <EmbedErrorBoundary>{children}</EmbedErrorBoundary>
        </main>
        <OutboxFlusher />
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
        className="h-screen overflow-hidden flex justify-center p-0 sm:p-3 lg:p-7"
        style={{ background: 'radial-gradient(120% 70% at 50% 0%, #F2F5EE 0%, #E6EAE1 80%)' }}
      >
        <div className="w-full max-w-[1320px] flex overflow-hidden rounded-none sm:rounded-2xl lg:rounded-[28px] border border-[#176B33]/10 bg-white shadow-[0_40px_90px_-50px_rgba(16,40,26,0.5)]">
          <Sidebar isAdmin={isAdmin} />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <TopBar user={user} />
            <main className="flex-1 overflow-y-auto p-4 lg:px-6 lg:py-4">
              {children}
            </main>
          </div>
        </div>
        <QuickAddReceipt />
        <OutboxFlusher />
        <CommandPalette />
      </div>
    </ConfirmProvider>
  )
}

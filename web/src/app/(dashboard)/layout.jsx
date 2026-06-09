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
        <main className="min-h-screen bg-gray-50 p-4">
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
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isAdmin={isAdmin} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar user={user} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
        <QuickAddReceipt />
        <OutboxFlusher />
        <CommandPalette />
      </div>
    </ConfirmProvider>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import Sidebar from '../../components/Sidebar'
import TopBar from '../../components/TopBar'
import QuickAddReceipt from '../../components/QuickAddReceipt'
import OutboxFlusher from '../../components/OutboxFlusher'
import { ConfirmProvider } from '../../components/ConfirmDialog'
import CommandPalette from '../../components/CommandPalette'

export default async function DashboardLayout({ children }) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')

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

import { notFound } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
export default async function AgentAdminLayout({ children }) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) notFound()
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) notFound()
  return children
}

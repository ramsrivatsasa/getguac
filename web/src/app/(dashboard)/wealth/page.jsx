import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import WealthClient from './WealthClient'

export const metadata = { title: 'Wealth Path · GetGuac' }

export default async function WealthPage() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  return <WealthClient />
}

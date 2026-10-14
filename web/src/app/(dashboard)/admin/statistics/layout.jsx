import { notFound } from 'next/navigation'
import { createApiClient } from '../../../../lib/supabase/server'
export default async function StatisticsLayout({children}) {
  const db=await createApiClient()
  const {data:{user}}=await db.auth.getUser()
  if(!user)notFound()
  const {data:profile}=await db.from('profiles').select('is_admin').eq('id',user.id).maybeSingle()
  if(!profile?.is_admin)notFound()
  return children
}

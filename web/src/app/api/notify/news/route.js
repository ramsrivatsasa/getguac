import { NextResponse } from 'next/server'
import { createApiClient } from '../../../../lib/supabase/server'
export const dynamic = 'force-dynamic'
const response = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
export async function GET() {
  const db = await createApiClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return response({ error: 'unauthorized' }, 401)
  const { data, error } = await db.from('news_notifications').select('id,title,stories,created_at,read_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
  if (error) return response({ error: 'News alerts could not load' }, 500)
  return response({ items: data || [] })
}
export async function PATCH(req) {
  const db = await createApiClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return response({ error: 'unauthorized' }, 401)
  const body = await req.json().catch(() => null)
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(body?.id || '')) return response({ error: 'Invalid notification' }, 400)
  const { error } = await db.from('news_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).eq('id', body.id).is('read_at', null)
  return error ? response({ error: 'Could not mark as read' }, 500) : response({ ok: true })
}

import { createApiClient } from '../../../../lib/supabase/server'
import { registrationTrial } from '../../../../lib/registration-trial.mjs'

export const dynamic = 'force-dynamic'
export async function GET() {
  const sb = await createApiClient()
  const { data: { user }, error } = await sb.auth.getUser()
  if (error || !user) return Response.json({ error: 'Not signed in' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  return Response.json(registrationTrial(user.created_at), { headers: { 'Cache-Control': 'private, no-store' } })
}

import { createClient } from '@supabase/supabase-js'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
import { guestRegistration } from '../../../../lib/guest-push-policy.mjs'
export async function POST(request) {
 const limit = await rateLimit(rateKey(request, 'guest-push'), { limit: 20, windowMs: 60000 })
 if (!limit.ok) return Response.json({ error: 'Too many requests' }, { status: 429 })
 const input = guestRegistration(await request.json().catch(() => null))
 if (!input) return Response.json({ error: 'Invalid device registration' }, { status: 400 })
 const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
 let converted = false
 const authorization = request.headers.get('authorization')
 if (authorization) {
  const { data, error } = await db.auth.getUser(authorization.replace(/^Bearer /i,''))
  if (error || !data.user) return Response.json({error:'Unauthorized'},{status:401})
  converted = true
 }
 const { error } = await db.rpc('register_guest_push',{...input,p_converted:converted})
 if (error) return Response.json({ error: 'Could not register device' }, { status: error.code === '23505' ? 409 : 503 })
 return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}})
}

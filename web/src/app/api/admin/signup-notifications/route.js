import { createClient } from '@supabase/supabase-js'
import { createApiClient } from '../../../../lib/supabase/server'
import { sendPushToDevice } from '../../../../lib/fcm'
import { guestEligible } from '../../../../lib/guest-push-policy.mjs'
export const maxDuration = 60
async function context() {
 const client=await createApiClient()
 const {data:{user}}=await client.auth.getUser()
 if(!user)return {error:Response.json({error:'Unauthorized'},{status:401})}
 const {data:profile}=await client.from('profiles').select('is_admin').eq('id',user.id).maybeSingle()
 if(!profile?.is_admin)return {error:Response.json({error:'Admin only'},{status:403})}
 return {db:createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})}
}
async function recipients(db, campaign) {
 const {data,error}=await db.rpc('guest_push_candidates',{p_campaign:campaign})
 if(error)throw error
 return data.filter(row=>guestEligible(row))
}
export async function GET(request) {
 const ctx=await context();if(ctx.error)return ctx.error
 try{return Response.json({eligibleInNextBatch:(await recipients(ctx.db, new URL(request.url).searchParams.get('campaign') || 'preview')).length,batchLimit:100},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Device registry unavailable'},{status:503})}
}
export async function POST(request) {
 const ctx=await context();if(ctx.error)return ctx.error
 const input=await request.json().catch(()=>null)
 if(!input || !/^[a-z0-9-]{8,80}$/.test(input.campaign||'') || typeof input.title!=='string' || !input.title.trim() || input.title.length>80 || typeof input.body!=='string' || !input.body.trim() || input.body.length>240 || input.confirm!==true)return Response.json({error:'Provide campaign, title, body and explicit confirmation'},{status:400})
 const {db}=ctx
 try {
  const rows=await recipients(db,input.campaign),result={sent:0,skipped:0,failed:0}
  for(const row of rows){
   const {data:linked,error:linkedError}=await db.from('push_tokens').select('token').eq('token',row.token).limit(1)
   if(linkedError)throw linkedError
   if(linked.length){result.skipped++;continue}
   const {error:claimError}=await db.from('guest_push_deliveries').insert({installation_hash:row.installation_hash,campaign:input.campaign})
   if(claimError){if(claimError.code==='23505'){result.skipped++;continue}throw claimError}
   const {data:current,error:currentError}=await db.from('guest_push_devices').select('*').eq('installation_hash',row.installation_hash).single()
   if(currentError)throw currentError
   if(!guestEligible(current)||current.token!==row.token){result.skipped++;continue}
   const sent=await sendPushToDevice(row.token,{title:input.title,body:input.body})
   const {error:saveError}=await db.from('guest_push_deliveries').update({status:sent.sent?'sent':'failed'}).eq('installation_hash',row.installation_hash).eq('campaign',input.campaign)
   if(saveError)throw saveError
   if(sent.dead)await db.from('guest_push_devices').update({consent:false}).eq('installation_hash',row.installation_hash)
   result[sent.sent?'sent':'failed']++
  }
  return Response.json(result,{headers:{'Cache-Control':'no-store'}})
 }catch{return Response.json({error:'Batch incomplete; inspect delivery records before retrying'},{status:503})}
}

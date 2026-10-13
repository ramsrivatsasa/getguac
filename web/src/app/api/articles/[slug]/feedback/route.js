import { createClient as serviceClient } from '@supabase/supabase-js'
import { createApiClient } from '../../../../../lib/supabase/server'
import { getArticle } from '../../../../../lib/articles'
import { academyLesson } from '../../../../../lib/academy'
import { articleFeedbackEnabled, feedbackInput, sameFeedbackOrigin } from '../../../../../lib/article-feedback.mjs'
import { rateLimit, userRateKey } from '../../../../../lib/apiGuard'
export const dynamic='force-dynamic'
function admin(){return serviceClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})}
function content(slug){return getArticle(slug)?.sourceSlug || academyLesson(slug)?.sourceSlug || null}
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}})
export async function GET(request,{params}) {
 if(!articleFeedbackEnabled())return reply({error:'Not found.'},404)
 const {slug}=await params; const key=content(slug);if(!key)return reply({error:'Article not found.'},404)
 const sb=await createApiClient();const {data:{user}}=await sb.auth.getUser();const db=admin()
 const [likes,dislikes,comments,own,mine]=await Promise.all([
  db.from('article_reactions').select('*',{count:'exact',head:true}).eq('article_slug',key).eq('reaction',1),
  db.from('article_reactions').select('*',{count:'exact',head:true}).eq('article_slug',key).eq('reaction',-1),
  db.from('article_comments').select('id,display_name,body,created_at,status').eq('article_slug',key).eq('status','approved').order('created_at',{ascending:false}).limit(30),
  user?db.from('article_reactions').select('reaction').eq('article_slug',key).eq('user_id',user.id).maybeSingle():Promise.resolve({data:null}),
  user?db.from('article_comments').select('id,display_name,body,created_at,status').eq('article_slug',key).eq('user_id',user.id).eq('status','pending').order('created_at',{ascending:false}).limit(10):Promise.resolve({data:[]}),
 ])
 if([likes,dislikes,comments,own,mine].some(x=>x.error))return reply({error:'Reader feedback is temporarily unavailable.'},503)
 return reply({likes:likes.count,dislikes:dislikes.count,reaction:own.data?.reaction||0,signedIn:Boolean(user),comments:comments.data,pending:mine.data})
}
export async function POST(request,{params}) {
 if(!articleFeedbackEnabled())return reply({error:'Not found.'},404)
 if(!sameFeedbackOrigin(request))return reply({error:'Use this site to submit feedback.'},403)
 const {slug}=await params;const key=content(slug);if(!key)return reply({error:'Article not found.'},404)
 const sb=await createApiClient();const {data:{user}}=await sb.auth.getUser();if(!user)return reply({error:'Sign in to react or comment.'},401)
 const raw=await request.text();if(raw.length>12000)return reply({error:'Comment is too long.'},413)
 let parsed;try{parsed=JSON.parse(raw)}catch{return reply({error:'Invalid request.'},400)}
 const input=feedbackInput(parsed);if(input.error)return reply({error:input.error},400)
 const limit=await rateLimit(userRateKey(user.id,'article-'+input.action),{limit:input.action==='comment'?5:30,windowMs:60000})
 if(!limit.ok)return reply({error:'Please wait a minute before submitting again.'},429)
 const db=admin();let result
 if(input.action==='react')result=input.reaction===0?await db.from('article_reactions').delete().eq('article_slug',key).eq('user_id',user.id):await db.from('article_reactions').upsert({article_slug:key,user_id:user.id,reaction:input.reaction,updated_at:new Date().toISOString()},{onConflict:'article_slug,user_id'})
 else result=await db.from('article_comments').insert({article_slug:key,user_id:user.id,body:input.body,display_name:input.displayName,status:'pending'})
 if(result.error)return reply({error:'Feedback could not be saved. Please retry.'},503)
 return reply({ok:true,message:input.action==='comment'?'Your comment is awaiting review.':'Reaction saved.'})
}

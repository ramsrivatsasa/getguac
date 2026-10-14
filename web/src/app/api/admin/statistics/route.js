import { createClient } from '@supabase/supabase-js'
import { createApiClient } from '../../../../lib/supabase/server'
import { calendarDay, dayBoundary, summarizeStatistics } from '../../../../lib/site-statistics.mjs'
export const dynamic='force-dynamic'
export const runtime='nodejs'
export const maxDuration=30
async function readAll(query, limit=50000) {
  const rows=[]
  for(let offset=0;offset<=limit;offset+=1000) {
    const {data,error}=await query().range(offset,offset+999).abortSignal(AbortSignal.timeout(10000))
    if(error)throw error
    rows.push(...(data||[]))
    if(rows.length>limit)throw new Error('RANGE_TOO_LARGE')
    if(!data||data.length<1000)return rows
  }
  throw new Error('RANGE_TOO_LARGE')
}
export async function GET(request) {
  const client=await createApiClient()
  const {data:{user}}=await client.auth.getUser()
  if(!user)return Response.json({error:'Not signed in'},{status:401})
  const {data:profile,error:profileError}=await client.from('profiles').select('is_admin').eq('id',user.id).maybeSingle()
  if(profileError||!profile?.is_admin)return Response.json({error:'Admin only'},{status:403})
  const params=new URL(request.url).searchParams
  const timezone=params.get('timezone')||'America/New_York'
  let from=params.get('from'),to=params.get('to')
  let start,end
  try {
    if(!['UTC','America/New_York'].includes(timezone))throw new Error()
    const today=calendarDay(new Date(),timezone)
    from??=today;to??=today
    start=dayBoundary(from,timezone)
    const days=(Date.parse(to)-Date.parse(from))/86400000
    if(!Number.isFinite(days)||days<0||days>29)throw new Error()
    dayBoundary(to,timezone)
    const next=new Date(Date.parse(to)+86400000).toISOString().slice(0,10)
    end=dayBoundary(next,timezone)
  }catch{return Response.json({error:'Choose a valid date range of up to 30 days.'},{status:400})}
  try {
    const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
    const expired=await db.from('site_statistics_events').delete().lt('occurred_at',new Date(Date.now()-30*86400000).toISOString()).abortSignal(AbortSignal.timeout(5000))
    if(expired.error)throw expired.error
    const [events,historical]=await Promise.all([
      readAll(()=>db.from('site_statistics_events').select('id,occurred_at,visitor_hash,path,event,country,region,city,device,source').gte('occurred_at',start).lt('occurred_at',end).order('occurred_at').order('id')),
      readAll(()=>db.from('site_visits').select('day,path,views').gte('day',from).lte('day',to).order('day').order('path')),
    ])
    const totals=new Map()
    for(const row of historical)if(!row.path.startsWith('/click/'))totals.set(row.path,(totals.get(row.path)||0)+Number(row.views))
    const {data:first}=await db.from('site_statistics_events').select('occurred_at').order('occurred_at').limit(1)
    const summary=summarizeStatistics(events,{timezone})
    const hourly=new Map(summary.hours.map(r=>[r.name,r.count]))
    const formatter=new Intl.DateTimeFormat('sv-SE',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'})
    const bins=new Map()
    for(let time=Date.parse(start);time<Date.parse(end);time+=3600000){const name=formatter.format(new Date(time))+':00';bins.set(name,hourly.get(name)||0)}
    summary.hours=[...bins].map(([name,count])=>({name,count}))
    return Response.json({from,to,timezone,collectedFrom:first?.[0]?.occurred_at||null,...summary,historical:{timezone:'UTC',views:[...totals.values()].reduce((a,b)=>a+b,0),pages:[...totals].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)},checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){return Response.json({error:error.message==='RANGE_TOO_LARGE'?'This range has too many records. Choose fewer days.':'Statistics could not load. Please retry.'},{status:error.message==='RANGE_TOO_LARGE'?422:503})}
}

import { createHash } from 'node:crypto'
import { cleanStatisticsPath, statisticsDimensions } from './site-statistics.mjs'
export async function recordSiteEvent(db, request, { path, event='page_view', referrer='' }) {
  try {
    if(process.env.NODE_ENV!=='production'||process.env.VERCEL_ENV==='preview')return
    if(request.headers.get('dnt')==='1'||request.headers.get('sec-gpc')==='1')return
    const host=(request.headers.get('x-forwarded-host')||request.headers.get('host')||'').split(',')[0].split(':')[0]
    if(!/(^|\.)getguac\.app$/.test(host))return
    const ua=request.headers.get('user-agent')||''
    if(!ua||/bot|crawler|spider|headless|lighthouse|curl|wget|node|preview/i.test(ua))return
    const ip=(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'').split(',')[0].trim()
    if((process.env.ANALYTICS_IGNORE_IPS||'').split(',').map(x=>x.trim()).includes(ip)&&ip)return
    if(/(^|;\s*)guac_embedded=1(;|$)/.test(request.headers.get('cookie')||''))return
    const clean=cleanStatisticsPath(path)
    if(!clean)return
    const day=new Date().toISOString().slice(0,10)
    const salt=process.env.VISIT_SALT||process.env.SUPABASE_SERVICE_ROLE_KEY
    if(!salt)return
    const visitor_hash=ip?createHash('sha256').update(`${salt}|${day}|${ip}|${ua}`).digest('hex'):null
    const {error}=await db.from('site_statistics_events').insert({path:clean,event,visitor_hash,...statisticsDimensions(request.headers,referrer)}).abortSignal(AbortSignal.timeout(1500))
    if(error)console.warn('[statistics] Event storage unavailable:',error.code)
  }catch { /* Analytics never blocks a visit or registration. */ }
}

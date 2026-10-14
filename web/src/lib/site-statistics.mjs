export const CLIENT_EVENTS = new Set(['page_view', 'signup_start', 'signup_submit', 'signup_error', 'store_click'])
export function calendarDay(date=new Date(), timezone='America/New_York') {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(p=>[p.type,p.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
export function cleanStatisticsPath(value) {
  if (typeof value !== 'string') return null
  const path = value.split(/[?#]/)[0]
  try { if(decodeURIComponent(path).includes('@'))return null } catch { return null }
  if (!path.startsWith('/') || path.startsWith('//') || path.length > 200 || /[\s\\<>\x00-\x1f]/.test(path)) return null
  if (/^\/(api|_next|admin|auth|embed)(\/|$)/.test(path) || /\.[a-z0-9]+$/i.test(path)) return null
  return path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '[record]').replace(/\/\d{4,}(?=\/|$)/g, '/[record]')
}
export function locationLabel(value) {
  try { return decodeURIComponent(value || '').replace(/[<>\x00-\x1f\x7f]/g, '').trim().slice(0, 80) || 'Unknown' } catch { return 'Unknown' }
}
export function statisticsDimensions(headers, referrer) {
  const ua = headers.get('user-agent') || ''
  let source = 'Direct / unknown'
  try {
    const host = new URL(referrer).hostname.toLowerCase()
    if (/(^|\.)(google|bing|duckduckgo)\./.test(host)) source = 'Search'
    else if (/(^|\.)(facebook|instagram|tiktok|linkedin|twitter|x)\.(com|net)$/.test(host)) source = 'Social'
    else if (!/(^|\.)getguac\.app$/.test(host)) source = 'Referral'
  } catch {}
  return {
    country: /^[A-Z]{2}$/.test(headers.get('x-vercel-ip-country') || '') ? headers.get('x-vercel-ip-country') : 'Unknown',
    region: locationLabel(headers.get('x-vercel-ip-country-region')),
    city: locationLabel(headers.get('x-vercel-ip-city')),
    device: /ipad|tablet/i.test(ua) ? 'Tablet' : /mobile|iphone|android/i.test(ua) ? 'Mobile' : 'Desktop',
    source,
  }
}
export function dayBoundary(day, timezone = 'UTC') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || new Date(day).toISOString().slice(0,10) !== day) throw new Error('Invalid date')
  const target = Date.parse(`${day}T00:00:00Z`)
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23' })
  let guess = target
  for (let i=0;i<4;i++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(p=>[p.type,p.value]))
    const represented = Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second)
    const correction = target - represented
    guess += correction
    if (!correction) break
  }
  return new Date(guess).toISOString()
}
const rank = values => [...values.entries()].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count || a.name.localeCompare(b.name))
export function summarizeStatistics(rows, { timezone='UTC', now=Date.now() }={}) {
  const pages=new Map(),locations=new Map(),devices=new Map(),sources=new Map(),hours=new Map(),landings=new Map(),exits=new Map(),transitions=new Map(),visitors=new Set()
  const add=(map,key)=>map.set(key,(map.get(key)||0)+1)
  const formatter=new Intl.DateTimeFormat('sv-SE',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'})
  const groups=new Map()
  const eventTotals={signup_start:0,signup_submit:0,signup_error:0,account_created:0,email_confirmed:0,store_click:0}
  for(const row of rows) {
    if(row.event==='page_view') {
      add(pages,row.path);add(locations,[row.city,row.region,row.country].filter(v=>v&&v!=='Unknown').join(', ') || 'Unknown')
      add(devices,row.device);add(sources,row.source);add(hours,formatter.format(new Date(row.occurred_at))+':00')
    }
    if(row.event in eventTotals) eventTotals[row.event]++
    if(row.visitor_hash) {
      visitors.add(row.visitor_hash)
      if(!groups.has(row.visitor_hash)) groups.set(row.visitor_hash,[])
      groups.get(row.visitor_hash).push(row)
    }
  }
  const funnel={visits:0,registration:0,started:0,submitted:0,created:0,confirmed:0}
  let openSessions=0,closedSessions=0
  for(const group of groups.values()) {
    group.sort((a,b)=>Date.parse(a.occurred_at)-Date.parse(b.occurred_at) || Number(a.id)-Number(b.id))
    const sessions=[]
    for(const row of group) {
      const current=sessions.at(-1)
      if(!current || Date.parse(row.occurred_at)-Date.parse(current.at(-1).occurred_at)>1800000) sessions.push([row])
      else current.push(row)
    }
    for(const session of sessions) {
      const views=session.filter(r=>r.event==='page_view')
      if(!views.length) continue
      add(landings,views[0].path);funnel.visits++
      let stage=0
      for(const row of session) {
        if(row.path==='/register'&&row.event==='page_view'&&stage===0){funnel.registration++;stage=1}
        if(row.event==='signup_start'&&stage===1){funnel.started++;stage=2}
        if(row.event==='signup_submit'&&stage===2){funnel.submitted++;stage=3}
        if(row.event==='account_created'&&stage===3){funnel.created++;stage=4}
        if(row.event==='email_confirmed'&&stage===4){funnel.confirmed++;stage=5}
      }
      for(let i=1;i<views.length;i++) if(views[i-1].path!==views[i].path) add(transitions,`${views[i-1].path} → ${views[i].path}`)
      if(now-Date.parse(session.at(-1).occurred_at)>1800000){add(exits,views.at(-1).path);closedSessions++}else openSessions++
    }
  }
  return {views:[...pages.values()].reduce((a,b)=>a+b,0),visitorDays:visitors.size,funnel,eventTotals,openSessions,closedSessions,pages:rank(pages),locations:rank(locations),devices:rank(devices),sources:rank(sources),hours:rank(hours).sort((a,b)=>a.name.localeCompare(b.name)),landings:rank(landings),lastPages:rank(exits),transitions:rank(transitions)}
}

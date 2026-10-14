'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import FeatureHeader from '../../../../components/FeatureHeader'
import { calendarDay } from '../../../../lib/site-statistics.mjs'
const today=()=>calendarDay()
const count=n=>new Intl.NumberFormat().format(n||0)
function Breakdown({title,rows,label='Page',note}) {
  const [expanded,setExpanded]=useState(false)
  return <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
    <h2 className="font-display text-lg font-bold">{title}</h2>
    {note&&<p className="mt-1 text-xs text-slate-500">{note}</p>}
    <div className={expanded?'max-h-96 overflow-y-auto':''} tabIndex={expanded?0:undefined} aria-label={expanded?`${title} records`:undefined}>
      <table className="mt-3 w-full table-fixed text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="py-2 font-medium">{label}</th><th className="w-20 py-2 text-right font-medium">Count</th></tr></thead><tbody>{(expanded?rows:rows.slice(0,8)).map(row=><tr key={row.name} className="border-b border-slate-100 last:border-0"><td className="break-words py-2 pr-3">{row.name}</td><td className="py-2 text-right font-semibold tabular-nums">{count(row.count)}</td></tr>)}</tbody></table>
    </div>
    {!rows.length&&<p className="py-4 text-sm text-slate-500">No records in this period.</p>}
    {rows.length>8&&<button className="mt-2 min-h-11 font-semibold text-violet-700" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>{expanded?'Show fewer':`Show all ${rows.length}`}</button>}
  </section>
}
export default function StatisticsPage() {
  const [from,setFrom]=useState(()=>new Date(Date.parse(today())-6*86400000).toISOString().slice(0,10)),[to,setTo]=useState(today),[timezone,setTimezone]=useState('America/New_York')
  const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[reload,setReload]=useState(0),[granularity,setGranularity]=useState('day')
  useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');fetch(`/api/admin/statistics?${new URLSearchParams({from,to,timezone})}`,{signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);return d}).then(setData).catch(e=>{if(e.name!=='AbortError'){setError(e.message);setData(null)}}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[from,to,timezone,reload])
  const buckets=new Map()
  for(const hour of data?.hours||[]){const key=granularity==='day'?hour.name.slice(0,10):hour.name;buckets.set(key,(buckets.get(key)||0)+hour.count)}
  const bars=[...buckets],peak=Math.max(0,...bars.map(([,n])=>n)),max=Math.max(1,peak)
  const funnel=data?Object.entries(data.funnel):[]
  const labels={visits:'Observed visits',registration:'Registration page',started:'Form started',submitted:'Form submitted',created:'Account created',confirmed:'Email confirmed'}
  return <div className="w-full min-w-0 space-y-4">
    <Link href="/admin" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-700">← Admin</Link>
    <FeatureHeader title="Website statistics" subtitle="See where visitors arrive, what they view, and where signup stops." expression="happy"/>
    <div className="grid grid-cols-2 items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex sm:flex-wrap">
      <label className="min-w-0 text-sm font-semibold sm:min-w-[160px]">From<input className="mt-1 block min-h-11 w-full min-w-0 max-w-full rounded-lg border border-slate-300 px-2 font-normal" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
      <label className="min-w-0 text-sm font-semibold sm:min-w-[160px]">Through<input className="mt-1 block min-h-11 w-full min-w-0 max-w-full rounded-lg border border-slate-300 px-2 font-normal" type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
      <label className="text-sm font-semibold">Timezone<select className="mt-1 block min-h-11 rounded-lg border border-slate-300 px-2 font-normal" value={timezone} onChange={e=>setTimezone(e.target.value)}><option value="America/New_York">Eastern Time</option><option value="UTC">UTC</option></select></label>
      <button className="min-h-11 rounded-lg bg-violet-700 px-4 font-semibold text-white disabled:opacity-50" disabled={loading} onClick={()=>setReload(n=>n+1)}>Refresh</button>
    </div>
    {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {loading&&<p role="status" className="text-sm text-slate-500">Loading statistics…</p>}
    {!loading&&data&&<>
      <p className="text-xs text-slate-500">Detailed tracking {data.collectedFrom?`has records from ${new Date(data.collectedFrom).toLocaleString('en-US',{timeZone:timezone})} (${timezone})`:'starts with the first recorded visit'}. Earlier time, location and journey details cannot be reconstructed.</p>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">{[['Page views',data.views],['Visitor-days',data.visitorDays],['Observed visits',data.funnel.visits],['Created accounts',data.eventTotals.account_created],['Signup errors',data.eventTotals.signup_error],['Store clicks',data.eventTotals.store_click]].map(([label,n])=><div key={label} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-display text-2xl font-bold tabular-nums">{count(n)}</p></div>)}</div>
      <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-bold">Page views over time</h2><label className="text-sm">Group by <select value={granularity} onChange={e=>setGranularity(e.target.value)} className="min-h-11 rounded-lg border px-2"><option value="day">Day</option><option value="hour">Hour</option></select></label></div>{data.views>0?<><svg viewBox="0 0 600 150" role="img" aria-label={`Page views by ${granularity}; highest bucket ${peak} views`} className="mt-3 w-full"><line x1="0" y1="135" x2="600" y2="135" stroke="#cbd5e1"/>{bars.map(([label,n],i)=><rect key={label} x={i*600/bars.length+1} y={135-n/max*125} width={Math.max(1,600/bars.length-2)} height={n/max*125} rx="2" fill="#7c3aed"><title>{label}: {n} page views</title></rect>)}</svg><p className="flex justify-between gap-2 text-xs text-slate-500"><span>{bars[0][0]}</span><span>{bars.at(-1)[0]}</span></p></>:<p className="py-5 text-sm text-slate-500">No page views recorded.</p>}</section>
      <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-display text-lg font-bold">Signup funnel</h2><p className="mt-1 text-xs text-slate-500">Ordered steps within inferred visits. Visits split after 30 minutes of inactivity and at UTC midnight. Confirmation on another day or device cannot be joined.</p><table className="mt-3 w-full table-fixed text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="py-2">Step</th><th className="w-16 text-right">Visits</th><th className="w-24 text-right">Drop-off</th></tr></thead><tbody>{funnel.map(([key,n],i)=><tr key={key} className="border-b border-slate-100"><td className="py-2 pr-2">{labels[key]}</td><td className="text-right font-semibold">{count(n)}</td><td className="text-right">{i&&funnel[i-1][1]?`${Math.round((1-n/funnel[i-1][1])*100)}%`:'—'}</td></tr>)}</tbody></table><p className="mt-2 text-xs text-slate-500">{count(data.eventTotals.account_created)} total account-created events · {count(data.eventTotals.email_confirmed)} confirmation events. These include outcomes that cannot be matched to a complete visit.</p></section>
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <Breakdown title="Pages viewed" rows={data.pages} note="Detailed page-view counts."/>
        <Breakdown title="Approximate locations" rows={data.locations} label="City, region, country" note="IP-derived hosting estimate. VPN/mobile routing can be inaccurate; missing locations stay Unknown."/>
        <Breakdown title="Landing pages" rows={data.landings} note="First observed page in each inferred visit."/>
        <Breakdown title="Last pages seen" rows={data.lastPages} note={`${data.closedSessions} inactive visits; ${data.openSessions} recent visits excluded. Last page does not prove why someone left.`}/>
        <Breakdown title="Page-to-page journeys" rows={data.transitions} label="From → to" note="Observed transitions within the same inferred visit."/>
        <Breakdown title="Time breakdown" rows={bars.filter(([,n])=>n>0).map(([name,n])=>({name,count:n}))} label={granularity==='day'?'Day':'Hour'} note={`${timezone} · buckets with recorded views`}/>
        <Breakdown title="Devices" rows={data.devices} label="Device" note="Page views, not unique devices."/>
        <Breakdown title="Traffic sources" rows={data.sources} label="Source" note="Broad referral categories only; no campaign tokens or personal URLs."/>
        <Breakdown title="Historical page totals" rows={data.historical.pages} note={`Existing daily counters, grouped by UTC date. ${count(data.historical.views)} views; dates may differ from Eastern-time detailed counts.`}/>
      </div>
      <p className="text-xs text-slate-500">Visitor-days are approximate daily visitors, not unique people across the date range. Bots, embedded app traffic and privacy opt-outs are excluded from detailed tracking. No IP addresses or form values are stored.</p>
    </>}
  </div>
}

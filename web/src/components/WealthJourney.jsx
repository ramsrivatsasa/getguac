'use client'
import {useState,useEffect,useRef} from 'react'

import {useRouter} from 'next/navigation'

import {wealthJourney} from '../lib/find-your-10/wealth-journey.mjs'

import {money} from '../lib/find-your-10/wizard.mjs'
import {planButton,planField} from './Find10Primitives'
import styles from './WealthJourney.module.css'
export default function WealthJourney({data}){
 const router=useRouter(),request=useRef(null),[state,setState]=useState(data.progress),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 useEffect(()=>setState(data.progress),[data.progress])
 const journey=wealthJourney({...data,progress:state}),p=journey.preferences
 const [reportMonth,setReportMonth]=useState(journey.month)
 const report=journey.entries[reportMonth]||{}
 async function save(input){setBusy(true);setError('');setNotice('');try{const payload={version:state.version,type:'wealth-journey',data:input},signature=JSON.stringify(payload);if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()};const response=await fetch('/api/find-your-10/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestId:request.current.id})});const result=await response.json();if(!response.ok)throw Error(result.error);setState(result.state);setNotice('Saved. Your plan now uses these details.');router.refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <section className={styles.page}>{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 <details className={styles.setup}><summary>{p.path?'Your saved path & preferences':'Set your starting point'}</summary><form key={p.updatedAt||'new'} onSubmit={e=>{e.preventDefault();save({kind:'preferences',...Object.fromEntries(new FormData(e.currentTarget))})}}><div className={styles.fields}>
 <label>How would you like to proceed?<select name="path" defaultValue={p.path||'undecided'} className={planField}><option value="undecided">Help me compare</option><option value="cash">Build cash first</option><option value="mixed">Explore saving and investing together</option><option value="invest">Explore recurring investment contributions</option></select></label>
 <label>When will you need this money?<select name="horizon" defaultValue={p.horizon||''} required className={planField}><option value="" disabled>Choose timeframe</option><option value="soon">Within 3 years</option><option value="medium">3–7 years</option><option value="long">More than 7 years</option></select></label>
 <label>How do you feel about losses?<select name="risk" defaultValue={p.risk||''} required className={planField}><option value="" disabled>Choose preference</option><option value="protect">I want to protect principal</option><option value="some">I could tolerate some losses</option><option value="comfortable">I accept substantial fluctuations</option></select></label>
 <label>Cash cushion you want to keep ($)<input name="reserve" type="number" min="0" max="9999999" step=".01" required defaultValue={p.reserveCents==null?'':p.reserveCents/100} className={planField}/></label></div><p className={styles.note}>Choose a cushion for your actual expenses and dependents. These answers guide the discussion; they are not an investment suitability assessment.</p><button disabled={busy} className={planButton}>Save my path</button></form></details>
 <section id="monthly"><h2>Record your monthly progress</h2><p>Record new money once. Moving previously saved cash to an investment account belongs in the transfer field, not new contributions. Saving replaces the report for that month.</p><form key={reportMonth+(report.recordedAt||'')} onSubmit={e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.currentTarget));save({kind:'month',...v,confirmed:v.confirmed==='on'})}}><div className={styles.fields}>
 <label>Month<input name="month" type="month" value={reportMonth} onChange={e=>setReportMonth(e.target.value)} max={journey.month} min="2000-01" required className={planField}/></label>
 {[["cash","New money added to cash ($)"],["invest","New money invested ($)"],["transfer","Existing savings moved to investments ($)"]].map(([name,label])=><label key={name}>{label}<input name={name} type="number" min="0" max="9999999" step=".01" required defaultValue={(report[name+'Cents']||0)/100} className={planField}/></label>)}
 <label>Destination account(s)<input name="destination" defaultValue={report.destination||''} required maxLength={120} placeholder="Account names only, no account numbers" className={planField}/></label></div><label className={styles.confirm}><input name="confirmed" type="checkbox" required/>These amounts were actually contributed or transferred; they are not planned amounts.</label><button disabled={busy} className={planButton}>Save monthly report</button></form>
 {Object.keys(journey.entries).length>0&&<div className={styles.history}><table><caption>Your reported contributions · editable by saving that month again</caption><thead><tr><th>Month</th><th>New cash</th><th>New investments</th><th>Transfers</th><th>Destination</th></tr></thead><tbody>{Object.entries(journey.entries).sort(([a],[b])=>b.localeCompare(a)).map(([month,e])=><tr key={month}><th>{month}</th><td>{money(e.cashCents)}</td><td>{money(e.investCents)}</td><td>{money(e.transferCents)}</td><td>{e.destination}</td></tr>)}</tbody></table></div>}
 </section>
 </section>
}

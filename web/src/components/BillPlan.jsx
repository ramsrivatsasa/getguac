'use client'
import {useState,useRef} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import FeatureHeader from './FeatureHeader'
import {utilityGuidance} from '../lib/find-your-10/utility-guidance.mjs'
import {billOptions} from '../lib/find-your-10/bill-options.mjs'
import {money} from '../lib/find-your-10/wizard.mjs'
import {recurringAnalysis} from '../lib/find-your-10/recurring.mjs'
import {StoreLogo} from './StoreLogo'
import PlanProgress from './PlanProgress'
import styles from './Find10Plan.module.css'
import AlternativePopup from './AlternativePopup'
import SuggestionFeedback from './SuggestionFeedback'
import BillQuote from './BillQuote'
export default function BillPlan({data,results=false,embedded=false,billChoices,onBillChoices,onFeedback}) {
  const bills=billOptions(data),router=useRouter(),request=useRef(null)
  const [localChoices,setLocalChoices]=useState(()=>({...Object.fromEntries(bills.filter(b=>b.strategy==='usage'&&b.options.some(o=>o.id==='reduce-usage')).map(b=>[b.seriesId,'reduce-usage'])),...Object.fromEntries((data.progress?.actions||[]).filter(a=>a.optionId&&(a.accepted||a.optionId==='keep')).map(a=>[a.seriesId,a.optionId]))}))
  const [expanded,setExpanded]=useState({})
  const choices=billChoices||localChoices,setChoices=onBillChoices||setLocalChoices
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const selectedOption=b=>{
    const option=b.options.find(o=>o.id===choices[b.seriesId])
    const quote=data.progress.actions.find(a=>a.seriesId===b.seriesId&&a.accepted&&a.optionId===option?.id)?.confirmedQuote
    return option&&quote?{...option,priceCents:quote.monthlyCents,setupCents:quote.switchingCents,differenceCents:Math.max(0,b.amountCents-quote.monthlyCents),firstYearCents:(b.amountCents-quote.monthlyCents)*12-quote.switchingCents,terms:quote.terms,perLine:false,quoteConfirmed:true}:option
  }
  const selected=bills.flatMap(b=>b.options.filter(o=>o.id===choices[b.seriesId]))
  async function save(){setBusy(true);setError('');try{
    const payload={version:data.progress.version,type:'bill-plan',data:{choices:bills.filter(b=>choices[b.seriesId]).map(b=>({seriesId:b.seriesId,optionId:choices[b.seriesId]}))}}
    const signature=JSON.stringify(payload);if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()}
    const r=await fetch('/api/find-your-10/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestId:request.current.id})});const result=await r.json();if(!r.ok)throw Error(result.error)
    setNotice('Bill plan saved.');window.dispatchEvent(new Event('plan-updated'));router.refresh()
  }catch(e){setError(e.message)}finally{setBusy(false)}}
  const actions=(data.progress?.actions||[]).filter(a=>!a.type||a.type==='bill')
  return <div className={embedded?"space-y-3":"mx-auto w-full max-w-6xl space-y-5 p-3 sm:p-5"}>{!embedded&&<><FeatureHeader title="Lower bills" subtitle={results?'Check your result against a later statement.':'Compare lower options. Keep the service you need.'}/><nav className="flex flex-wrap gap-3"><Link className="inline-flex min-h-11 items-center font-bold text-violet-700" href="/my-plan/bills">Compare options</Link><Link className="inline-flex min-h-11 items-center font-bold text-violet-700" href="/my-plan/bills/results">Saved actions & results →</Link></nav></>}
  {results?<PlanProgress resultsOnly data={{...data,progress:{...data.progress,actions,ledger:data.progress.ledger.filter(l=>actions.some(a=>a.id===l.actionId))}}} plan={recurringAnalysis(data)} date={new Date()}/>:<>
  <div className={styles.billStack}>{bills.map(b=>b.strategy==='usage'?<div key={b.id} className={styles.utilityRow}><strong>{b.title}</strong><span>{money(b.amountCents)}/mo</span><span>Review guides to reduce {b.title.toLowerCase()} usage</span><a className="text-violet-700" href={utilityGuidance(b.title).url} target="_blank" rel="noreferrer">View guide ↗</a><span className="text-sm text-slate-600">{choices[b.seriesId]==='reduce-usage'?'Task included on save':'Not included'}</span></div>:<article key={b.id} className="overflow-hidden rounded-xl border border-violet-100 bg-white">
  <table className={`${styles.planRows} ${styles.billSummary}`}><thead><tr><th>Bill</th><th>Current / month</th><th>Potential difference / month</th><th>Options</th></tr></thead><tbody><tr>
    <th scope="row"><button type="button" className="min-h-11 text-left font-semibold text-violet-700" aria-expanded={!!expanded[b.seriesId]} aria-controls={`bill-details-${b.seriesId}`} onClick={()=>setExpanded(previous=>({...previous,[b.seriesId]:!previous[b.seriesId]}))}>{b.title}</button></th>
    <td data-label="Current / month">{money(b.amountCents)}</td>    <td data-label="Potential difference / month">{(()=>{const o=selectedOption(b);return o?o.quoteRequired?'Quote needed':o.perLine?'Compare line charges':`${money(o.differenceCents)} before extra costs`:'—'})()}</td>
    <td><AlternativePopup id={`bill-options-${b.seriesId}`} title={b.title} label={selectedOption(b)?.title||`${b.options.length} ${b.options.length===1?'Option':'Options'}${b.options.some(o=>!o.quoteRequired&&Number.isFinite(o.priceCents))?` - ${money(Math.min(...b.options.filter(o=>!o.quoteRequired&&Number.isFinite(o.priceCents)).map(o=>o.priceCents)))}/mo`:''}`}>
      {b.options.map(o=><div key={o.id} className={styles.offerChoice}><label className="flex min-h-11 cursor-pointer items-center gap-2"><input type="radio" aria-label={`Select ${o.title}`} name={`bill-${b.seriesId}`} checked={choices[b.seriesId]===o.id} disabled={busy} onChange={()=>setChoices(c=>({...c,[b.seriesId]:o.id}))}/><StoreLogo storeName={o.title.split(' · ')[0]} size={28}/><span><strong>{o.title}</strong><span className="block text-sm">{o.quoteRequired?'Address quote needed':`${money(o.priceCents)}/mo${o.perLine?' per line':''}`}</span></span></label><p className="text-sm">{o.quoteRequired?'Price not yet confirmed':o.perLine?'Compare all line charges':`${money(o.differenceCents)}/mo less before extra costs`}</p><details><summary className="min-h-11 cursor-pointer py-2 text-violet-700">Offer terms</summary><p>{o.terms}</p><p>{o.tradeoff}</p>{o.checkedAt&&<p>Checked {o.checkedAt} · confirm address eligibility.</p>}{o.url&&<a href={o.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-violet-700">Check availability & price ↗</a>}</details>{onFeedback&&<SuggestionFeedback progress={data.progress} scope="bill" subject={b.seriesId} option={o.id} onSaved={onFeedback} disabled={busy}/>}</div>)}
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={choices[b.seriesId]==='keep'} disabled={busy} onChange={e=>setChoices(c=>{const next={...c};if(e.target.checked)next[b.seriesId]='keep';else delete next[b.seriesId];return next})}/>Keep</label>
    </AlternativePopup></td>
  </tr><tr hidden={!expanded[b.seriesId]} className={styles.detailsRow}><td colSpan={4}><div id={`bill-details-${b.seriesId}`} className="p-3 text-sm"><p>Latest statement · {b.date} · {money(b.amountCents)}/mo</p>{(()=>{const o=selectedOption(b);return o?<><p className="mt-2 font-semibold">{o.title}</p><p>{o.terms}</p><p>{o.tradeoff}</p>{!o.perLine&&!o.quoteRequired&&<p>First-year difference: {money(o.firstYearCents)}, including {money(o.setupCents)} listed setup cost. Extra fees may apply.</p>}{o.url&&<a href={o.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-violet-700">Provider offer ↗</a>}</>:null})()}{onFeedback&&(()=>{const action=data.progress.actions.find(a=>a.seriesId===b.seriesId&&a.accepted&&a.optionId===choices[b.seriesId]);return action?<BillQuote action={action} state={data.progress} onSaved={onFeedback}/>:null})()}</div></td></tr></tbody></table>
  {data.progress.actions.find(a=>a.seriesId===b.seriesId&&a.optionId&&(a.accepted||a.optionId==='keep'))&&<p role="status" className="text-sm font-semibold text-violet-800">Saved: {data.progress.actions.find(a=>a.seriesId===b.seriesId&&a.optionId&&(a.accepted||a.optionId==='keep')).optionTitle}. {data.progress.actions.find(a=>a.seriesId===b.seriesId&&a.optionId&&(a.accepted||a.optionId==='keep')).eligibilityPending?'Next: confirm eligibility and the full price with the provider.':''}</p>}
  </article>)}</div>
  {!bills.length&&<p>No bill alternatives to compare yet.</p>}
  {!embedded&&!!bills.length&&<div className={styles.quickFooter}><div><strong>{money(selected.reduce((n,o)=>n+o.differenceCents,0))}/mo</strong><p>Potential difference · confirm terms before switching</p></div><button disabled={busy||!Object.keys(choices).length} onClick={save} className="rounded-full bg-violet-800 px-5 text-sm font-bold text-white disabled:opacity-50">{busy?'Saving…':'Save bill plan'}</button></div>}{notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </>}</div>
}


'use client'
import { Fragment, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Coffee, CookingPot, ArrowRight, Check, Store, Leaf } from 'lucide-react'
import GuacMascot from './GuacMascot'
import {configureChoice,quickPlanTotals} from '../lib/find-your-10/lifecycle.mjs'
import { StoreLogo } from './StoreLogo'
import styles from './Find10Plan.module.css'
import { selectQuickAlternative, groupQuickOpportunities } from '../lib/find-your-10/quick-plan.mjs'
import { recurringAnalysis } from '../lib/find-your-10/recurring.mjs'
import BillPlan from './BillPlan'
import AlternativePopup from './AlternativePopup'
import ExcludedSuggestions from './ExcludedSuggestions'
import SuggestionFeedback from './SuggestionFeedback'
import {suggestionHidden,suggestionKey} from '../lib/find-your-10/suggestion-feedback.mjs'
import {billOptions} from '../lib/find-your-10/bill-options.mjs'
import { money } from '../lib/find-your-10/wizard.mjs'
import { purchaseWindow } from '../lib/find-your-10/wizard.mjs'
import RecordedPlanPurchases from './RecordedPlanPurchases'
import SavedAccountNavigation from './SavedAccountNavigation'
import {purchasePlanRows} from '../lib/find-your-10/purchase-plan.mjs'

function ProductPhoto({url,name,merchant,size=56}) {
  const [failed,setFailed]=useState(false)
  useEffect(()=>setFailed(false),[url])
  return url&&!failed?<img src={url} alt={name} width={size} height={size} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)} className="shrink-0 rounded-xl border border-violet-100 bg-white object-contain p-1" style={{width:size,height:size}}/>:<StoreLogo storeName={merchant} size={size} fallbackEmoji=""/>
}
function productSpecs(value='') {
  const dimensions=value.match(/(\d+(?:\.\d+)?)\s*["″]?\s*[x×]\s*(\d+(?:\.\d+)?)\s*["″]?\s*[x×]\s*(\d+(?:\.\d+)?)/i)
  const merv=value.match(/MERV\s*(\d+)/i),mpr=value.match(/MPR\s*(\d+)/i),pack=value.match(/(\d+)\s*-?\s*pack/i)
  return [dimensions&&dimensions.slice(1).join('×'),merv&&`MERV ${merv[1]}`,mpr&&`MPR ${mpr[1]}`,pack&&`${pack[1]}-pack`].filter(Boolean)
}
function compactProductName(value='') {
  return /filtrete/i.test(value)&&productSpecs(value).length?'Filtrete Air Filter':value
}
function ProductDescription({value,receiptId}) {
  const specs=productSpecs(value)
  return <div className="mb-3"><p>{value}</p>{specs.length>0&&<div className={styles.specChips} aria-label="Product specifications">{specs.map(spec=><span key={spec}>{spec}</span>)}</div>}{receiptId&&<Link className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-700" href={`/receipts/${receiptId}`}>View original receipt →</Link>}</div>
}
const compactNames = {'product:ikea-stand':'IKEA phone stand','product:target-tee':'Goodfellow tee','product:target-coffee':'Good & Gather · 12 oz'}
const shortLabel = option => compactNames[option.key] ? compactNames[option.key] : option.key==='product:sony-ch520' ? 'Compare with Sony' : option.key?.startsWith('home_coffee') ? 'Home latte' : option.key?.startsWith('home_meal') ? 'Cook at home' : option.key?.startsWith('drink_swap') ? 'Coffee + steamed milk' : option.key?.startsWith('return_check') ? 'Check return & replace' : /Dunkin/i.test(option.choice) ? 'Check Dunkin' : /Sony/i.test(option.choice) ? 'Compare Sony' : /^Cook one meal at home/i.test(option.choice)?'Cook at home':/^Make one coffee at home/i.test(option.choice)?'Home coffee':compactProductName(option.choice)

export default function QuickPlan({data:initialData}) {
  const [data,setData]=useState(initialData)
  const feedbackSaved=state=>{
    setData(previous=>({...previous,progress:state}))
    setChoices(previous=>Object.fromEntries(Object.entries(previous).filter(([id,value])=>{
      const candidate=opportunities.find(c=>c.id===id)
      const option=candidate?.alternatives.find(o=>o.key===value.alternative)||data.progress?.quickPlan?.choices?.find(c=>c.id===id)
      return value.decision==='keep'||!option||!suggestionHidden(state,suggestionKey('purchase',candidate?.itemKey||option.itemKey,option))
    })))
    setBillChoices(previous=>Object.fromEntries(Object.entries(previous).filter(([id,value])=>value==='keep'||billOptions({...data,progress:state}).find(b=>b.seriesId===id)?.options.some(o=>o.id===value))))
    setSaved(false);router.refresh()
  }
  const router=useRouter(), purchaseCatalogue=purchasePlanRows(data)
  const opportunities=purchaseCatalogue.filter(c=>!c.keepOnly&&c.alternatives?.some(o=>!o.needsPrice&&(o.estimateCents>0||o.reviewOnly&&o.listedDifferenceCents>0)))
  const selectablePurchases=opportunities.filter(c=>c.alternatives.some(o=>!o.needsPrice&&(o.estimateCents>0||o.reviewOnly&&o.listedDifferenceCents>0)))
  const [productImages,setProductImages]=useState({})
  const [expandedPurchases,setExpandedPurchases]=useState({})
  const [expandedDetails,setExpandedDetails]=useState({})
  const imageNames=JSON.stringify([...new Set(opportunities.flatMap(c=>[c.title,...(c.alternatives||[]).filter(o=>o.sourceLabel==='Product').map(o=>o.choice)]))])
  useEffect(()=>{
    let active=true
    const names=JSON.parse(imageNames)
    async function load(){
      for(let i=0;i<names.length;i+=20){
        try{const r=await fetch('/api/product-image-batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({names:names.slice(i,i+20)})});if(!r.ok)continue;const result=await r.json();if(active)setProductImages(previous=>({...previous,...result.byName}))}catch{}
      }
    }
    load();return()=>{active=false}
  },[imageNames])
  const groups=groupQuickOpportunities(opportunities,data.items), plan=recurringAnalysis(data), target=plan.incomeTargetCents
  const [choices,setChoices]=useState(()=>Object.fromEntries((data.progress?.quickPlan?.choices||[]).filter(c=>['accept','keep'].includes(c.decision)&&(!c.needsReview||c.reviewOnly)&&purchaseCatalogue.some(o=>o.id===c.id)).map(c=>[c.id,{decision:c.decision,alternative:c.selectedAlternative,homeCost:c.homeCost,cadence:c.cadence,occurrences:c.occurrences,mode:c.mode}])))
  const bills=billOptions(data)
  const [billChoices,setBillChoices]=useState(()=>({...Object.fromEntries(bills.filter(b=>b.strategy==='usage'&&b.options.some(o=>o.id==='reduce-usage')).map(b=>[b.seriesId,'reduce-usage'])),...Object.fromEntries((data.progress?.actions||[]).filter(a=>a.optionId&&(a.accepted||a.optionId==='keep')).map(a=>[a.seriesId,a.optionId]))}))
  const [purchasesChanged,setPurchasesChanged]=useState(false)
  const pendingRequest=useRef(null)
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false)
  const selected = c => {
    const previous=data.progress?.quickPlan?.choices?.find(p=>p.id===c.id)
    if(!purchasesChanged&&previous?.decision==='accept'&&previous?.completedAt)return previous
    try { return configureChoice(selectQuickAlternative(c,choices[c.id]?.alternative,choices[c.id]?.homeCost),choices[c.id]||{}) } catch { return {...c,estimateCents:0} }
  }
  const savedTotals=quickPlanTotals(data.progress,plan.month)
  const total=!purchasesChanged?savedTotals.plannedCents:opportunities.filter(c=>choices[c.id]?.decision==='accept').reduce((sum,c)=>sum+selected(c).estimateCents*(selected(c).occurrences||1),0)
  const billPotential=bills.reduce((n,b)=>{const saved=data.progress?.actions.find(a=>a.seriesId===b.seriesId&&a.accepted&&a.optionId===billChoices[b.seriesId]);return n+(saved?.confirmedQuote?Math.max(0,b.amountCents-saved.confirmedQuote.monthlyCents):(b.options.find(o=>o.id===billChoices[b.seriesId])?.differenceCents||0))},0)
  const monthly=!purchasesChanged?savedTotals.monthlyCents:opportunities.filter(c=>choices[c.id]?.decision==='accept'&&selected(c).cadence==='monthly').reduce((sum,c)=>sum+selected(c).estimateCents*(selected(c).occurrences||1),0)
  const adjust=(id,value)=>{setChoices(previous=>({...previous,[id]:{...previous[id],...value}}));setSaved(false);setPurchasesChanged(true)}
  const defaults=c=>({cadence:c.repeatEligible?'monthly':'once',occurrences:c.repeatEligible?c.observedFrequency:1,mode:'future'})
  const choose=(id,decision,alternative)=>{setChoices(previous=>({...previous,[id]:{...defaults(opportunities.find(c=>c.id===id)),...previous[id],decision,alternative,homeCost:undefined}}));setSaved(false);setPurchasesChanged(true)}
  async function save(){
    setBusy(true);setError('')
    try {
      const payload={version:data.progress?.version||0,type:'savings-plan',data:{bills:bills.filter(b=>billChoices[b.seriesId]==='keep'||b.options.some(o=>o.id===billChoices[b.seriesId])).map(b=>({seriesId:b.seriesId,optionId:billChoices[b.seriesId]})),choices:!purchasesChanged?null:Object.entries(choices).filter(([id])=>purchaseCatalogue.some(o=>o.id===id)).map(([id,value])=>({id,...value}))}}
      const signature=JSON.stringify(payload)
      if(pendingRequest.current?.signature!==signature)pendingRequest.current={signature,requestId:crypto.randomUUID()}
      const response=await fetch('/api/find-your-10/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestId:pendingRequest.current.requestId})})
      const result=await response.json();if(!response.ok)throw Error(result.error)
      setData(previous=>({...previous,progress:result.state}));pendingRequest.current=null;setSaved(true);window.dispatchEvent(new Event('plan-updated'));router.refresh()
    } catch(e){setError(e.message)} finally {setBusy(false)}
  }
  return <section className={`${styles.quick} rounded-2xl border border-violet-100 bg-white p-3 sm:p-4`} aria-labelledby="quick-plan-heading">
    <SavedAccountNavigation category="expenses" savedToken={saved} message="Your purchase and bill choices are saved. Where would you like to go?" />
    {purchaseWindow(data).historical&&<p className="mb-3 text-sm text-slate-600">Using your older receipts through {purchaseWindow(data).end}. Recorded prices are historical; current offers are checked separately.</p>}
    <div className="mb-3 flex flex-wrap items-center gap-2"><h2 id="quick-plan-heading" className="text-xl font-bold">Your options</h2>{opportunities.length>0&&<><button disabled={busy||!selectablePurchases.length} className="ml-auto min-h-11 rounded-full border border-violet-200 px-3 text-sm font-semibold text-violet-700 disabled:opacity-50" onClick={()=>{setChoices({...choices,...Object.fromEntries(selectablePurchases.map(c=>[c.id,{...defaults(c),...choices[c.id],decision:'accept',alternative:c.alternatives.find(o=>!o.needsPrice&&(o.estimateCents>0||o.reviewOnly&&o.listedDifferenceCents>0))?.key||null}]))});setSaved(false);setPurchasesChanged(true)}}>Select all purchases</button><button disabled={busy} className="min-h-11 px-3 text-sm text-violet-700" onClick={()=>{setChoices(previous=>Object.fromEntries(Object.entries(previous).filter(([id])=>!opportunities.some(o=>o.id===id))));setSaved(false);setPurchasesChanged(true)}}>Clear purchase choices</button></>}</div>
    <div className={styles.planSummary}><strong>{opportunities.length} {opportunities.length===1?'purchase':'purchases'} with lower listed prices · {bills.length} {bills.length===1?'bill':'bills'}</strong>{target>0&&<span>Your monthly {plan.goalPct}% goal · {money(target)}</span>}{opportunities.length>0&&<span>Prices before extra costs</span>}</div>
    {groups.map(group=><details key={group.title} open className={styles.opportunityGroup}>
      <summary><strong>{group.title}</strong><span>{group.options.length} {group.options.length===1?'purchase':'purchases'}</span><b>{group.estimateCents>0?`Up to ${money(group.estimateCents)}`:group.options.some(c=>c.alternatives?.some(o=>o.reviewOnly))?'Similar alternatives':'Your recorded purchases'}</b></summary>
      <div className={styles.planTableScroll} role="region" aria-label={`${group.title} purchases`} tabIndex={0}><table className={`${styles.planRows} ${styles.purchaseComparison}`}><thead><tr><th scope="col">Store</th><th scope="col">Purchase</th><th scope="col">Paid / unit</th><th scope="col">Est. save / change</th><th scope="col">Options</th></tr></thead><tbody>
      {group.options.map(c=>{
        const active=selected(c),options=(c.alternatives||[{...c,key:null}]).filter(option=>!option.needsPrice && (option.estimateCents>0||option.reviewOnly&&option.listedDifferenceCents>0)),coffee=/coffee|latte|espresso/i.test(c.title)
        return <Fragment key={c.id}>
          <tr>
            <td><span className={styles.purchaseMerchant}><StoreLogo storeName={c.merchant} size={22} fallbackEmoji=""/><span>{c.merchant}</span></span></td>
            <th scope="row"><button type="button" className="min-h-11 text-left font-semibold text-violet-700" aria-expanded={!!expandedDetails[c.id]} aria-controls={`purchase-details-${c.id}`} onClick={()=>{setExpandedDetails(previous=>({...previous,[c.id]:!previous[c.id]}))}}>{compactProductName(c.title)}</button>{c.model&&<div className={styles.specChips}><span>Model {c.model}</span></div>}</th>
            <td data-label="Paid / unit"><strong>{money(c.baselineCents)}</strong></td>            <td data-label="Est. save / change">{choices[c.id]?.decision==='accept'?active.reviewOnly?'Pending costs':money(active.estimateCents):'—'}</td>
            <td>{options.length>0?<AlternativePopup id={`purchase-options-${c.id}`} title={c.title} label={choices[c.id]?.decision==='accept'?shortLabel(active):`${options.length} ${options.length===1?'Option':'Options'} - ${money(Math.min(...options.map(o=>o.alternativeCents)))}${options.some(o=>o.editableHomeCost)?' est.':''}`}>
            {options.map((option,optionIndex)=>{
              const Icon=option.key?.startsWith('home_meal')?CookingPot:option.editableHomeCost?Coffee:option.needsPrice?Store:Leaf
              const isSelected=choices[c.id]?.decision==='accept'&&(choices[c.id]?.alternative||null)===(option.key||null)
              return <div key={option.key||'default'} className={styles.offerChoice}><label className={`flex min-h-11 w-full items-center gap-2 p-2 text-left transition ${isSelected?'border-violet-600 bg-violet-50 ring-1 ring-violet-600':'border-slate-200 hover:bg-slate-50'}`}><input type="radio" name={`purchase-${c.id}`} aria-label={`${shortLabel(option)} for ${c.title}`} checked={isSelected} disabled={busy} onChange={()=>choose(c.id,'accept',option.key)} className="h-4 w-4 shrink-0 accent-violet-700"/>{option.sourceLabel==='Product'?<ProductPhoto url={option.image||productImages[option.choice]} name={option.choice} merchant={option.store||(/IKEA/.test(option.choice)?'IKEA':/Sony/.test(option.choice)?'Sony':'Target')} size={44}/>:<Icon size={21} className="shrink-0 text-violet-700"/>}<span className="flex-1 text-sm font-semibold">{shortLabel(option)}{option.matchKind&&<span className="block text-sm font-normal text-violet-700">{option.matchKind} · {option.model}</span>}{option.sourceLabel==='Product'&&<span className="block text-sm font-normal text-slate-600">{option.condition==='new'?'Condition: New':'Condition not verified'}</span>}{option.store&&<span className="block text-sm font-normal text-slate-600">{option.store}</span>}<span className="mt-1 block text-sm font-normal text-slate-500">{option.reviewOnly?`${money(option.alternativeCents)} · ${money(option.listedDifferenceCents)} lower before extra costs`:option.needsPrice?(option.quotedPriceCents?`From ${money(option.quotedPriceCents)}`:'Price pending'):`${money(isSelected?active.alternativeCents:option.alternativeCents)}${option.editableHomeCost?' est.':''} · Save ${money(isSelected?active.estimateCents:option.estimateCents)}`}</span></span>{isSelected?<Check size={18} className="shrink-0 text-violet-700"/>:<ArrowRight size={16} className="shrink-0 text-slate-400"/>}</label>{/^https?:\/\//i.test(option.sourceUrl||'')&&<a href={option.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-violet-700 underline">View at {option.store||'retailer'} ↗</a>}{option.reviewOnly&&<p className="px-2 text-sm text-slate-600">{option.compatibilityEvidence?.manufacturerWarranty===false?'No manufacturer warranty. ':''}Condition and shipping unconfirmed. Save as a pending choice; no savings counted until total costs are confirmed.</p>}<SuggestionFeedback progress={data.progress} scope="purchase" subject={c.itemKey} option={option.key} onSaved={feedbackSaved} disabled={busy}/></div>
            })}
            <div className={styles.planControls}>
            {choices[c.id]?.decision==='accept'&&!active.reviewOnly&&<div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <label>Plan <select aria-label={`Plan type for ${c.title}`} className="min-h-11 rounded border px-2" value={active.cadence||'once'} onChange={e=>adjust(c.id,{cadence:e.target.value,occurrences:1,mode:'future'})}><option value="once">One-time</option>{c.repeatEligible&&<option value="monthly">Monthly habit</option>}</select></label>
              {active.cadence==='monthly'&&<label>Times/month <input aria-label={`Monthly changes for ${c.title}`} className="min-h-11 w-16 rounded border px-2" type="number" min="1" max={c.observedFrequency} value={choices[c.id]?.occurrences||1} onChange={e=>adjust(c.id,{occurrences:Number(e.target.value)})}/></label>}
              {active.sourceLabel==='Product'&&active.cadence!=='monthly'&&<label><select aria-label={`Purchase mode for ${c.title}`} className="min-h-11 rounded border px-2" value={active.mode||'future'} onChange={e=>adjust(c.id,{mode:e.target.value})}><option value="future">Next planned purchase</option><option value="return_replace">Return & replace</option></select></label>}
            </div>}
            </div>
            </AlternativePopup>:<span className="text-sm text-slate-600" role={c.discoveryStatus==='error'?'status':undefined}>{c.discoveryStatus==='error'?'Price check unavailable':'No verified lower price'}</span>}
            <label className="ml-2 inline-flex min-h-11 items-center gap-2 text-sm text-slate-600"><input type="checkbox" disabled={busy} checked={choices[c.id]?.decision==='keep'} aria-label={`Keep current choice for ${c.title}`} onChange={e=>{if(e.target.checked)choose(c.id,'keep',null);else{setChoices(previous=>{const next={...previous};delete next[c.id];return next});setSaved(false);setPurchasesChanged(true)}}} className="h-4 w-4 accent-violet-700"/>Keep</label></td>
          </tr>
          <tr hidden={!expandedDetails[c.id]} className={styles.detailsRow}><td colSpan={5}><div id={`purchase-details-${c.id}`} className="p-3 text-sm text-slate-600"><ProductDescription value={c.title} receiptId={c.receiptIds?.[0]}/>{active.choice&&active.choice!==c.title&&<ProductDescription value={active.choice}/>}<p className="mb-3 leading-relaxed">{c.reason}</p>{active.sourceLabel==='Product'&&<p className="mb-2">{['verified','verified-extract'].includes(active.retailerVerification)?`Retailer page checked ${active.retailerCheckedAt?.slice(0,10)}. Listed price; confirm delivery and checkout total.`:'Shopping listing price. Retailer page, delivery and checkout total are not verified.'}</p>}{active.editableHomeCost&&<label className="mb-3 block">At-home cost (ingredients + extras)<input type="number" min="0" step="0.01" max={(c.baselineCents-1)/100} value={choices[c.id]?.homeCost??active.alternativeCents/100} onChange={e=>{setChoices(previous=>({...previous,[c.id]:{...previous[c.id],homeCost:e.target.value}}));setSaved(false);setPurchasesChanged(true)}} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3"/></label>}<p className="rounded-lg bg-slate-50 p-3">{active.reviewOnly?`${money(c.baselineCents)} − ${money(active.alternativeCents)} = ${money(active.listedDifferenceCents)} listed price difference. No savings counted while purchase terms remain unconfirmed.`:active.needsPrice?'Price not yet verified. No savings counted.':`${money(c.baselineCents)} − ${money(active.alternativeCents)} = ${money(active.estimateCents)}`}<br/>{active.tradeoff}</p>{active.compatibilitySources?.map((url,index)=><a key={url} className="mr-3 inline-flex min-h-11 items-center underline" href={url} target="_blank" rel="noreferrer">{index===0?'Recorded model specs':'Alternative model specs'} ↗</a>)}{active.sourceUrl&&<a className="mr-3 inline-flex min-h-11 items-center underline" href={active.sourceUrl} target="_blank" rel="noreferrer">{active.sourceLabel||'Menu'} · {active.checkedAt}</a>}</div></td></tr>
        </Fragment>
      })}
    </tbody></table></div></details>)}    <RecordedPlanPurchases data={data} excludeKeys={opportunities.map(o=>o.itemKey)}/>
    {!opportunities.length&&!bills.length&&!data.items?.length&&<p className="my-4 text-sm">Add a receipt to find your next useful change.</p>}
    {!!bills.length&&<details id="bills" open className={styles.opportunityGroup}><summary><strong>Bills & utilities</strong><span>{bills.length} {bills.length===1?'bill':'bills'}</span></summary><div className="p-3"><fieldset disabled={busy}><BillPlan embedded data={data} billChoices={billChoices} onBillChoices={value=>{setBillChoices(value);setSaved(false)}} onFeedback={feedbackSaved}/></fieldset></div></details>}
    <ExcludedSuggestions progress={data.progress} onSaved={feedbackSaved} disabled={busy}/>
    {(!!opportunities.length||!!bills.length)&&<div className={styles.quickFooter}><div><strong className="text-xl text-violet-900">{money(total)}</strong><p className="text-sm text-slate-500">{money(monthly)}/month + {money(total-monthly)} one-time · estimated</p>{billPotential>0&&<p className="text-sm text-slate-500">Bills: {money(billPotential)}/mo compared difference · confirm final terms</p>}</div><button disabled={busy||saved} onClick={save} className="min-h-11 rounded-full bg-violet-800 px-5 text-sm font-bold text-white disabled:opacity-50">{busy?'Saving…':saved?'Plan saved ✓':'Save plan'}</button></div>}
    {saved&&<p role="status" className="mt-3 text-sm text-emerald-700">Saved. Your plan is ready.</p>}{error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </section>
}

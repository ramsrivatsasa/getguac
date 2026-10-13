'use client'
import {useEffect,useRef,useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {Coffee, CookingPot, RotateCcw, ShoppingBag, Droplets, Flame, Zap} from 'lucide-react'
import styles from './PlanTasks.module.css'
import {planTasks,quickPlanTotals} from '../lib/find-your-10/lifecycle.mjs'
import {recurringAnalysis} from '../lib/find-your-10/recurring.mjs'
import {money} from '../lib/find-your-10/wizard.mjs'
import {pendingBillTasks,pendingTaskCount} from '../lib/find-your-10/pending-tasks.mjs'
import PlanEvidence from './PlanEvidence'
import PlanDepositTasks from './PlanDepositTasks'
import UtilityChecklist from './UtilityChecklist'
import {utilityGuidance} from '../lib/find-your-10/utility-guidance.mjs'
import BillQuote from './BillQuote'
import ExcludedSuggestions from './ExcludedSuggestions'
import {quickOpportunities} from '../lib/find-your-10/quick-plan.mjs'
import {DINNER_RECIPES} from '../lib/find-your-10/local-options.mjs'
import RecordedPlanPurchases from './RecordedPlanPurchases'
export default function PlanTasks({data,pendingOnly=false}){
  const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const pendingRequest=useRef(null)
  const [state,setState]=useState(data.progress),[draft,setDraft]=useState({})
  useEffect(()=>{setState(data.progress)},[data.progress])
  const plan=recurringAnalysis(data),tasks=planTasks(state,plan.month),totals=quickPlanTotals(state,plan.month)
  const opportunities=quickOpportunities(data)
  const selected=t=>draft[t.id]??Boolean(t.completedAt)
  const available=t=>!t.needsReview && (!t.dependsOn||Boolean(tasks.find(d=>d.id===t.dependsOn)?.completedAt))
  const changes=tasks.filter(t=>draft[t.id]!==undefined&&draft[t.id]!==Boolean(t.completedAt))
  const utilities=(state.actions||[]).filter(a=>a.accepted&&a.usageReduction)
  const utilitySelected=a=>draft[`utility:${a.id}`]??Boolean(a.completedAt)
  const utilityChanges=utilities.filter(a=>draft[`utility:${a.id}`]!==undefined&&utilitySelected(a)!==Boolean(a.completedAt))
  const changeCount=changes.length+utilityChanges.length
  const visibleUtilities=pendingOnly?utilities.filter(a=>!a.completedAt):utilities
  const selectAll=()=>setDraft(Object.fromEntries([...tasks.filter(t=>available(t)&&!t.completedAt).map(t=>[t.id,true]),...utilities.filter(a=>!a.completedAt).map(a=>[`utility:${a.id}`,true])]))
  const pendingAmount=changes.reduce((sum,t)=>sum+(selected(t)?1:-1)*t.estimateCents,0)
  const earned=plan.incomeCents>0?Math.round((totals.completedCents+pendingAmount)/plan.incomeCents*1000)/10:0
  async function confirm(){
    setBusy(true);setError('')
    try{
      const payload={version:state.version,type:'plan-tasks',data:{tasks:changes.map(t=>({id:t.id,done:selected(t)})),utilities:utilityChanges.map(a=>({id:a.id,done:utilitySelected(a)}))}}
      const signature=JSON.stringify(payload)
      if(pendingRequest.current?.signature!==signature)pendingRequest.current={signature,requestId:crypto.randomUUID()}
      const response=await fetch('/api/find-your-10/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestId:pendingRequest.current.requestId})})
      const result=await response.json();if(!response.ok)throw Error(result.error)
      setState(result.state);setDraft({});pendingRequest.current=null;window.dispatchEvent(new Event('plan-updated'));router.refresh()
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  const done=tasks.filter(t=>t.completedAt).length+utilities.filter(a=>a.completedAt).length
  const displayed=pendingOnly?tasks.filter(t=>!t.completedAt):tasks
  const visibleTasks=displayed.filter((t,i)=>t.cadence!=='monthly'||displayed.findIndex(other=>other.choiceId===t.choiceId)===i)
  const billTasks=pendingOnly?pendingBillTasks(state,plan.month):(state.actions||[]).filter(a=>a.optionId&&a.accepted)
  return <section className={styles.section} aria-labelledby="plan-tasks-heading">
    {!pendingOnly&&<PlanDepositTasks state={state}/>}
    <header><h2 id="plan-tasks-heading">{pendingOnly?'Pending tasks':'Your next small wins'}</h2><span aria-live="polite">{pendingOnly?`${pendingTaskCount(state,plan.month)} pending`:`${done}/${tasks.length+utilities.length} done`}{changeCount?` · ${changeCount} changes selected`:''}</span><Link href="/my-plan">Edit choices →</Link></header>
    {!pendingOnly&&state.quickPlan?.choices?.some(c=>c.decision==='keep')&&<p className="text-sm text-slate-600">Saved choices · {state.quickPlan.choices.filter(c=>c.decision==='keep').length} {state.quickPlan.choices.filter(c=>c.decision==='keep').length===1?'purchase kept':'purchases kept'} · no savings counted</p>}
    {!!(visibleTasks.length||visibleUtilities.length)&&<div className={styles.tools}><button disabled={busy} onClick={selectAll}>Select all</button><button disabled={busy} onClick={()=>setDraft({})}>Clear pending changes</button><span>{money(totals.monthlyCents)}/month · {money(totals.oneTimeCents)} one-time planned</span></div>}
    {!!(visibleTasks.length||visibleUtilities.length)&&<div className={styles.scroll}><table className={styles.table}><thead><tr><th scope="col">Action</th><th scope="col">Estimate</th><th scope="col">Next step</th></tr></thead><tbody>{visibleTasks.map(task=>{
      const waiting=task.dependsOn&&!tasks.find(t=>t.id===task.dependsOn)?.completedAt
      const Icon=task.step==='return'?RotateCcw:/coffee|latte/i.test(task.title)?Coffee:/cook|dinner/i.test(task.title)?CookingPot:ShoppingBag
      const choice=state.quickPlan.choices.find(c=>c.id===task.choiceId)
      const series=task.cadence==='monthly'?tasks.filter(t=>t.choiceId===task.choiceId):[task]
      const rowSelected=series.every(selected),seriesDone=series.filter(t=>t.completedAt).length
      const toggle=value=>setDraft(previous=>({...previous,...Object.fromEntries(series.filter(available).map(t=>[t.id,value]))}))
      const alternatives=(opportunities.find(o=>o.id===choice.id)?.alternatives||[]).filter(o=>o.key!==choice.selectedAlternative&&!o.needsPrice&&o.estimateCents>0)
      const source=data.items?.find(i=>choice.sourceIds?.includes(i.id))
      const policies=data.receipts?.find(r=>r.id===task.receiptId)?.receipt_refund_policies||[]
      const policy=policies.find(p=>p.policy_id===source?.refund_policy_id)||(policies.length===1?policies[0]:null)

      return <tr key={task.id}><td><label className={styles.task}><input type="checkbox" checked={rowSelected} disabled={busy||!available(task)} onChange={e=>toggle(e.target.checked)}/><Icon size={18} aria-hidden="true"/><span>{task.cadence==='monthly'?choice.choice:task.title}<small>{task.needsReview?'Review choice':waiting?'Return first':task.cadence==='monthly'?`${seriesDone}/${series.length} this month`:task.completedAt?'Done':draft[task.id]?'Ready to confirm':'One-time'}</small></span></label></td><td><strong>{task.step==='return'?'—':money(task.estimateCents*series.length)}</strong></td><td><div className={styles.links}>{task.sourceUrl&&<a href={task.sourceUrl} target="_blank" rel="noreferrer">Product ↗</a>}{/cook|dinner|meal/i.test(task.title)&&<a href={DINNER_RECIPES[0].url} target="_blank" rel="noreferrer">Recipe ↗</a>}<details><summary>Details</summary><div className={styles.detail}>{task.cadence==='monthly'&&<fieldset><legend>Completed occurrences</legend>{series.map((t,i)=><div key={t.id}><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={selected(t)} disabled={busy||!available(t)} onChange={e=>setDraft(previous=>({...previous,[t.id]:e.target.checked}))}/>Occurrence {i+1}{t.completedAt?' · done':''}</label>{t.completedAt&&<PlanEvidence task={t} data={data} state={state} onSaved={updated=>{setState(updated);router.refresh()}}/>}</div>)}</fieldset>}<p>{choice.title} → {choice.choice}</p><p>{money(choice.baselineCents)} − {money(choice.alternativeCents||0)} · per change</p><p>{choice.tradeoff}</p>{task.mode==='return_replace'&&<div>{policy?<p>Return deadline: {policy.expiry_date||'See receipt'} · {policy.eligible?'Recorded as eligible':'Check eligibility with store'}</p>:<p>Ask the merchant to confirm eligibility and refund amount before replacing.</p>}<p>Actual refund minus replacement and fees determines savings.</p></div>}<div>{alternatives.map(o=><p key={o.key||o.choice}>{o.choice} · {money(o.alternativeCents)} {o.sourceUrl&&<a href={o.sourceUrl} target="_blank" rel="noreferrer">View ↗</a>}</p>)}</div><Link href="/my-plan">Change option →</Link>{task.cadence!=='monthly'&&task.completedAt&&task.step!=='return'&&<PlanEvidence task={task} data={data} state={state} onSaved={updated=>{setState(updated);router.refresh()}}/>}</div></details></div></td></tr>
    })}{visibleUtilities.map(action=>{
      const guide=utilityGuidance(action.title),Icon=/water/i.test(action.title)?Droplets:/gas/i.test(action.title)?Flame:Zap
      return <tr key={`utility:${action.id}`}><td><label className={styles.task}><input type="checkbox" checked={utilitySelected(action)} disabled={busy} onChange={e=>setDraft(previous=>({...previous,[`utility:${action.id}`]:e.target.checked}))}/><Icon size={18} aria-hidden="true"/><span>Review guides to reduce {action.title.toLowerCase()} usage<small>{action.completedAt?'Done':utilitySelected(action)?'Ready to confirm':'One-time'}</small></span></label></td><td><strong aria-label="No savings estimate">—</strong></td><td><div className={styles.links}><a href={guide.url} target="_blank" rel="noreferrer">{guide.source} guide ↗</a></div></td></tr>
    })}</tbody></table></div>}
    {billTasks.filter(a=>!a.usageReduction).map(a=><article key={a.id} className="rounded-xl border border-violet-100 bg-white p-4"><h3 className="font-bold">{a.title} · {a.optionTitle}</h3><p className="mt-2 text-sm">{a.usageReduction?'Reduce consumption and compare usage on your next bill.':a.perLine?'Compare the quote for all your lines, device balances and bundle discounts before switching. No savings counted yet.':`Confirm provider eligibility and the full price. ${money(a.potentialCents||0)}/month potential difference before extra costs.`}</p>{a.usageReduction&&<UtilityChecklist action={a} state={state} onSaved={updated=>{setState(updated);router.refresh()}}/>}<div className="mt-2 flex flex-wrap gap-4">{a.sourceUrl&&<a className="inline-flex min-h-11 items-center text-violet-700" href={a.sourceUrl} target="_blank" rel="noreferrer">Check provider →</a>}<Link className="inline-flex min-h-11 items-center text-violet-700" href="/my-plan/bills/results">Record bill result →</Link><Link className="inline-flex min-h-11 items-center text-violet-700" href="/my-plan#bills">Edit choice →</Link></div><BillQuote action={a} state={state} onSaved={updated=>{setState(updated);router.refresh()}}/></article>)}
    {pendingOnly&&!pendingTaskCount(state,plan.month)&&<p className="py-4 text-sm text-slate-600">You’re all caught up. New saved choices will appear here.</p>}
    {!pendingOnly&&!tasks.length&&!billTasks.length&&<RecordedPlanPurchases data={data} limit={5}/>}
    {!tasks.length&&!billTasks.length&&<Link href="/my-plan">Compare purchases & choose a change →</Link>}
    {!!(visibleTasks.length||visibleUtilities.length)&&<footer className={styles.footer}><strong aria-live="polite">{changeCount?`${changeCount} selected · ${money(pendingAmount)}`:`${done} done · ${money(totals.completedCents)}`}</strong><button disabled={busy||!changeCount} onClick={confirm}>{busy?'Saving…':'Save task changes'}</button></footer>}
    <ExcludedSuggestions progress={state} onSaved={updated=>{setState(updated);router.refresh()}} disabled={busy}/>
    <p className={styles.note}>* Completed actions at plan estimates. Verified savings use actual costs.</p>{error&&<p role="alert">{error} <button onClick={()=>router.refresh()}>Refresh plan</button></p>}
  </section>
}

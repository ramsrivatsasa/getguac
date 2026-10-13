'use client'
import SavedAccountNavigation from './SavedAccountNavigation'
import {useState,useRef,useEffect} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'

import PlanSavingsSummary from './PlanSavingsSummary'
import {expenseComparison} from '../lib/find-your-10/expense-comparison.mjs'
import {cdOptions,cdIllustration,CD_SUBJECT} from '../lib/find-your-10/cd-options.mjs'
import {personalCashPlan} from '../lib/find-your-10/personal-cash.mjs'
import {money} from '../lib/find-your-10/wizard.mjs'
import {planButton,planSecondary,planField} from './Find10Primitives'
import DepositOptionTable from './DepositOptionTable'
import ExcludedSuggestions from './ExcludedSuggestions'
import styles from './PlanCashComparison.module.css'
export default function PlanCdOptions({data,plan}) {
 const router=useRouter(),request=useRef(null),expense=expenseComparison(data)
 const [state,setState]=useState(data.progress),[balance,setBalance]=useState(data.progress?.cdChoice?.inputs?.balance??data.progress?.cdChoice?.balance??expense.balance),[selected,setSelected]=useState(data.progress?.cdChoice?.decision==='excluded'?'':data.progress?.cdChoice?.optionId||''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 useEffect(()=>setState(data.progress),[data.progress])
 const personal=personalCashPlan(data,state,{balance}),options=cdOptions(state,new Date(),data.depositQuotes),choice=options.find(o=>o.id===selected)
 let result=null;try{if(choice?.fresh)result=cdIllustration(choice,balance)}catch{}
 const valid=selected==='keep'||(result&&result.balanceCents>=choice.minimumCents&&confirmed)
 async function save(optionId=selected){setBusy(true);setError('');setNotice('');try{const payload={version:state.version,type:'cd-choice',data:{optionId,balance,accessConfirmed:confirmed}},signature=JSON.stringify(payload);if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()};const response=await fetch('/api/find-your-10/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestId:request.current.id})});const responseData=await response.json();if(!response.ok)throw Error(responseData.error);setState(responseData.state);setNotice('CD choice saved to your plan.');window.dispatchEvent(new Event('plan-updated'));router.refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}
 const feedbackSaved=next=>{setState(next);if(next.cdChoice?.decision==='excluded')setSelected('');router.refresh()}
 return <section className={styles.section} aria-label="CD options"><div className={styles.compareToolbar}><h2>Certificates of deposit</h2><label>Compare amount ($)<input className={planField} type="number" min="0" max="100000000" step=".01" value={balance} onChange={e=>{setBalance(e.target.value);setConfirmed(false)}}/></label></div>
 <DepositOptionTable cd options={options.map(o=>{let illustration=null;try{if(o.fresh)illustration=cdIllustration(o,balance)}catch{};return {...o,illustration}})} selected={selected} onSelect={id=>{setSelected(id);setConfirmed(false)}} busy={busy} progress={state} subject={CD_SUBJECT} onFeedback={feedbackSaved} context={personal.concerns} monthlyCents={expense.monthlyCents}/>
 <p className={styles.assumptions}>{options.length} CD offers from {new Set(options.map(o=>o.bank)).size} banks, not a whole-market ranking. Estimates use APY over months/12 with interest retained, before taxes and withdrawal penalties; actual calendar-day earnings can differ. A higher APY over a shorter term does not guarantee a higher renewal rate.</p>
 {choice&&<label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I can leave this amount for {choice.termMonths} months after covering bills and my cash cushion.</label>}
 <div className={styles.savebar}><button className={planSecondary} disabled={busy} aria-pressed={selected==='keep'} onClick={()=>{setSelected('keep');save('keep')}}>Keep money accessible for now</button><div><span>{choice?`${choice.title} · ${money(result?.balanceCents||0)}`:selected==='keep'?'Save in an accessible account first.':'Select a CD or keep cash accessible.'}</span><button className={planButton} disabled={busy||!valid} onClick={()=>save()}>{busy?'Saving…':'Save CD choice'}</button></div></div>{state.cdChoice&&state.cdChoice.decision!=='excluded'&&<div className={styles.saved}><div><p role="status">{notice||'CD choice saved to your plan.'}</p><SavedAccountNavigation category="cd" savedToken={notice}/></div></div>}{error&&<p role="alert">{error}</p>}
 <ExcludedSuggestions progress={{...state,suggestionFeedback:state.suggestionFeedback?.filter(f=>f.subject===CD_SUBJECT)}} disabled={busy} onSaved={feedbackSaved} reviewHref="/my-plan/build-wealth?option=cd"/>
 <p className={styles.assumptions}>Saving records your choice. It does not open a CD, move money or count interest as earned. <Link href="/my-plan/build-wealth?option=savings">Compare savings accounts →</Link></p></section>
}


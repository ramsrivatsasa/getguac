'use client'
import SavedAccountNavigation from './SavedAccountNavigation'
import PlanSavingsSummary from './PlanSavingsSummary'
import {expenseComparison} from '../lib/find-your-10/expense-comparison.mjs'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {Landmark,Check} from 'lucide-react'
import {cashComparison} from '../lib/find-your-10/cash-comparison.mjs'
import {cashIllustration,CASH_SUBJECT} from '../lib/find-your-10/cash-options.mjs'
import {personalCashPlan} from '../lib/find-your-10/personal-cash.mjs'
import {money} from '../lib/find-your-10/wizard.mjs'
import {planButton,planField,planSecondary} from './Find10Primitives'
import DepositOptionTable from './DepositOptionTable'
import ExcludedSuggestions from './ExcludedSuggestions'
import styles from './PlanCashComparison.module.css'
export default function PlanCashComparison({data,plan,step='choices',quick=false,category='savings'}) {
 const router=useRouter(),request=useRef(null)
 const [state,setState]=useState(data.progress),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 useEffect(()=>{setState(data.progress)},[data.progress])
 const expense=expenseComparison(data)
 const [values,setValues]=useState({balance:data.progress?.cashChoice?.inputs?.balance??expense.balance,currentApy:data.progress?.cashChoice?.inputs?.currentApy||'',currentFee:data.progress?.cashChoice?.inputs?.currentFee||''})
 const [selected,setSelected]=useState(data.progress?.cashChoice?.decision==='excluded'?'':data.progress?.cashChoice?.optionId||'')
 const [sort,setSort]=useState('apy')
 const personal=personalCashPlan(data,state,values)
 const options=personal.options.filter(o=>(o.kind||'savings')===category).sort((a,b)=>sort==='apy'?Number(b.apy)-Number(a.apy)||a.title.localeCompare(b.title):a.title.localeCompare(b.title))
 const saved=state.cashChoice,chosen=options.find(o=>o.id===selected)
 let illustration=null;try{if(chosen?.fresh)illustration=cashIllustration(chosen,values)}catch{}
 const update=(key,value)=>{setValues(v=>({...v,[key]:value}));setNotice('')}
 async function persist(type,input) {
  setBusy(true);setError('');setNotice('')
  try {
   const payload={version:state.version,type,data:input},signature=JSON.stringify(payload)
   if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()}
   const r=await fetch('/api/find-your-10/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestId:request.current.id})})
   const result=await r.json();if(!r.ok)throw Error(result.error)
   setState(result.state);setNotice(type==='cash-choice'?'Account choice saved to your plan.':'Manual comparison saved.');router.refresh()
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 const feedbackSaved=next=>{setState(next);if(next.cashChoice?.decision==='excluded')setSelected('');setNotice('');router.refresh()}
 const valid=selected==='keep'||(chosen?.fresh&&(String(values.balance)===''||(/^\d{1,9}(\.\d{1,2})?$/.test(String(values.balance))&&Number(values.balance)<=100000000)))
 if(step==='review')return <section className={styles.section}><h2 className="text-xl font-bold">Review your cash priorities</h2>{personal.context.concat(personal.concerns).map((text,i)=><p className="my-3 text-sm" key={i}>{text}</p>)}<p className="my-3 font-semibold">{personal.nextStep}</p><Link className={planButton+' ml-3'} href="/my-plan/earn/choices">Compare account options →</Link></section>
 if(step==='action'||step==='results')return <section className={styles.section}><h2 className="text-xl font-bold">{step==='action'?'Act on your saved choice':'Your cash-plan results'}</h2><p className="my-3">{saved&&saved.decision!=='excluded'?(saved.optionId==='keep'?'You chose to keep your current account.':`Saved for review: ${saved.option.title}`):'No current account choice is saved yet.'}</p>{saved?.result&&saved.decision!=='excluded'&&<p className="my-3">{money(saved.result.alternativeNetCents)} illustrated over one year on {money(saved.result.balanceCents)}. This is an estimate, not earned interest.</p>}{step==='action'&&saved?.option&&saved.decision!=='excluded'&&<a className={planSecondary} href={saved.option.url} target="_blank" rel="noreferrer">Review provider terms ↗</a>}<p className="my-3 text-sm">{step==='action'?'Confirm access, fees and eligibility before opening an account yourself. Record completed contributions separately.':'Saving an account choice does not move money or increase confirmed savings. Review your monthly contribution records for completed actions.'}</p><div className="flex flex-wrap gap-3"><Link className={planSecondary} href="/my-plan/earn/choices">{saved?'Review or change choice':'Choose an account'}</Link><Link className={planButton} href="/my-plan/build-wealth#monthly">Record monthly progress →</Link></div></section>
 return <section className={styles.section} aria-label={category==='money-market'?'Money market account options':'Savings account options'}>
  <div className={styles.compareToolbar}><h2>{category==='money-market'?'Money market accounts':'High-yield savings'}</h2><label>Compare amount ($)<input className={planField} type="number" min="0" max="100000000" step="0.01" value={values.balance} onChange={e=>update('balance',e.target.value)}/></label><details className={styles.cashChecks}><summary>Cash checks{personal.billCents>personal.checkingCents?' · review bills':''}</summary><div><dl><div><dt>Recorded savings</dt><dd>{money(personal.savingsCents)}</dd></div><div><dt>Recorded checking</dt><dd>{money(personal.checkingCents)}</dd></div><div><dt>Unpaid bills · next 30 days / overdue</dt><dd>{money(personal.billCents)}</dd></div></dl><p>Recorded balances are not live. Keep bill and emergency money accessible; a comparison is not a transfer amount.</p></div></details></div>
  {saved&&saved.decision!=='excluded'&&<div className={styles.saved} role="status"><Check size={20}/><div><strong>{saved.optionId==='keep'?'Saved: keep my current account':`Saved for review: ${saved.option.title}`}</strong>{saved.result&&<p>{money(saved.result.alternativeNetCents)} illustrated over one year on {money(saved.result.balanceCents)} · rate checked {saved.option.checkedAt}. This is a saved comparison, not earned interest.</p>}<SavedAccountNavigation category={category} savedToken={notice==='Account choice saved to your plan.'?notice:''}/></div></div>}
  <div className={styles.toolbar}><p>{options.length} {category==='money-market'?'money market':'savings'} accounts · dated bank rates · no promotional boosts</p><label>Sort by <select value={sort} onChange={e=>setSort(e.target.value)}><option value="bank">Account name</option><option value="apy">Highest APY</option></select></label></div>
  <DepositOptionTable options={options} selected={selected} onSelect={id=>{setSelected(id);setNotice('' )}} busy={busy} progress={state} subject={CASH_SUBJECT} onFeedback={feedbackSaved}/>
  <p className={styles.assumptions}>Illustrations assume the amount stays deposited for one year at an unchanged APY, before taxes and special-service charges. Variable rates can change. These are researched examples, not a whole-market ranking; no promotional boosts are included.</p>
  <details><summary>Compare with my current account</summary><p className="mb-3 text-sm">Saved balances do not include APY or fees. Add both to calculate the difference; otherwise we show interest only.</p><div className={styles.inputs}>{[['currentApy','Current APY (%)'],['currentFee','Current monthly fee ($)']].map(([key,label])=><label key={key}>{label}<input className={planField} type="number" min="0" step="0.01" max={key==='currentApy'?'100':'100000000'} value={values[key]} onChange={e=>update(key,e.target.value)}/></label>)}</div>{illustration?.differenceCents!=null&&<p className="mt-3 font-bold" aria-live="polite">{money(illustration.currentNetCents)} current → {money(illustration.alternativeNetCents)} selected · {money(illustration.differenceCents)} annual difference after monthly fees</p>}</details>
  <div className={styles.savebar}><button className={planSecondary} disabled={busy} aria-pressed={selected==='keep'} onClick={()=>{setSelected('keep');setNotice('')}}>{selected==='keep'?'Keeping my current account':'Keep my current account'}</button><div><span>{selected==='keep'?'Keep the access and services you already use.':chosen?`${chosen.title} · save for review`:'Choose an account to save for review.'}</span><button disabled={busy||!valid} className={planButton} onClick={()=>persist('cash-choice',{...values,optionId:selected})}>{busy?'Saving…':'Save account choice'}</button></div></div>
  {notice&&<p role="status" className="font-semibold text-emerald-800">{notice}</p>}{error&&<p role="alert" className="text-red-700">{error}</p>}
  <ExcludedSuggestions progress={{...state,suggestionFeedback:state.suggestionFeedback?.filter(f=>f.scope==='cash'&&f.subject===CASH_SUBJECT)}} onSaved={feedbackSaved} disabled={busy} reviewHref="/my-plan/cash-accounts"/>
  {!quick&&<Link className="inline-flex min-h-11 items-center font-bold text-violet-800" href="/my-plan/build-wealth">Compare savings & CD options →</Link>}
  <ManualComparison saved={state.cashComparison} balance={values.balance} busy={busy} persist={persist}/>
  <p className={styles.assumptions}>Saving a choice does not open an account, move money or add interest to your savings total. <a href="https://www.fdic.gov/resources/deposit-insurance" target="_blank" rel="noreferrer">How FDIC coverage works ↗</a></p>
 </section>
}
function ManualComparison({saved,balance,busy,persist}) {
 const [values,setValues]=useState(saved?.inputs||{balance,currentApy:'',alternativeApy:'',currentFee:'0',alternativeFee:'0'})
 let result=null;try{result=cashComparison(values)}catch{}
 return <details><summary>Compare another account manually</summary>{saved&&<p className="mb-3 text-sm">Saved manual comparison: {money(saved.result.currentNetCents)} current · {money(saved.result.alternativeNetCents)} alternative per year after fees.</p>}<form onSubmit={e=>{e.preventDefault();if(result)persist('cash-comparison',values)}}><div className={styles.inputs}>{[['balance','Manual balance ($)'],['currentApy','Manual current APY (%)'],['alternativeApy','Alternative APY (%)'],['currentFee','Manual current monthly fee ($)'],['alternativeFee','Alternative monthly fee ($)']].map(([key,label])=><label key={key}>{label}<input required className={planField} type="number" min="0" max={key.includes('Apy')?'100':'100000000'} step="0.01" value={values[key]} onChange={e=>setValues(v=>({...v,[key]:e.target.value}))}/></label>)}</div>{result&&<p className="my-3">{money(result.currentNetCents)} → {money(result.alternativeNetCents)} per year · {money(result.differenceCents)} difference</p>}<p className="my-3 text-xs">Your entered terms are a scenario. Constant balance and APY for one year, monthly fees paid separately, before taxes and switching costs.</p><button className={planButton} disabled={busy||!result}>Save manual comparison</button></form></details>
}

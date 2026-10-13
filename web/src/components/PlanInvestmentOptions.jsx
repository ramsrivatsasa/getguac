'use client'
import {Fragment,useState,useRef,useId} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {Layers,TrendingUp,Building2,Landmark,ArrowRight,BookOpen} from 'lucide-react'
import {INVESTMENT_OPTIONS,INVESTMENT_CATEGORIES,INVESTMENT_GUIDES,investmentMilestone,investmentFresh} from '../lib/find-your-10/investment-options.mjs'
import {ACCOUNT_OPTIONS} from '../lib/find-your-10/wealth-options.mjs'
import PlanSavingsSummary from './PlanSavingsSummary'
import {expenseComparison} from '../lib/find-your-10/expense-comparison.mjs'
import {money} from '../lib/find-your-10/wizard.mjs'
import {planButton,planField} from './Find10Primitives'
import {StoreLogo} from './StoreLogo'
import table from './DepositOptionTable.module.css'
import styles from './PlanInvestmentOptions.module.css'
const icons={mutual:Layers,etf:TrendingUp,stocks:Building2,bonds:Landmark}
const intros={mutual:'Compare index and actively managed funds. Fees below are annual fund expenses.',etf:'Compare brokerage access to ETFs. Individual fund fees and holdings vary.',stocks:'Compare brokerage access to stocks. Choose individual companies with your own research.',bonds:'Compare Treasury purchase routes and access rules. Bond funds are different from individual bonds.'}
export default function PlanInvestmentOptions({data}){
 const router=useRouter(),name=useId(),request=useRef(null),saved=data.progress?.investmentChoice
 const [category,setCategory]=useState(saved?.optionId&&INVESTMENT_CATEGORIES.some(([id])=>id===saved.optionId)?saved.optionId:'mutual')
 const [selected,setSelected]=useState(saved?.productId||''),[expanded,setExpanded]=useState(null)
 const [available,setAvailable]=useState(saved?.milestone?String(saved.milestone.startingCents/100):'0'),[confirmed,setConfirmed]=useState(false)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[filter,setFilter]=useState('all')
 const expense=expenseComparison(data),option=INVESTMENT_OPTIONS.find(o=>o.id===selected&&o.category===category)
 const options=INVESTMENT_OPTIONS.filter(o=>o.category===category&&(filter==='all'||(filter==='index'?o.approach.startsWith('Index'):o.approach.startsWith('Active'))))
 let milestone=null
 try{if(option)milestone=investmentMilestone(option,available,expense.monthlyCents)}catch{/* Display input validation inline. */}
 function changeCategory(id){setCategory(id);setFilter('all');setExpanded(null);setError('')}
 async function save(){
  setBusy(true);setError('');setNotice('')
  try{
   const payload={version:data.progress.version,type:'investment-choice',data:{productId:selected,available,cashConfirmed:confirmed}},signature=JSON.stringify(payload)
   if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()}
   const response=await fetch('/api/find-your-10/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestId:request.current.id})})
   const result=await response.json();if(!response.ok)throw Error(result.error||'Could not save this choice.')
   setNotice('Investment choice saved to your plan.');window.dispatchEvent(new Event('plan-updated'));router.refresh()
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <section className={styles.root} aria-label="Investment options">
  <PlanSavingsSummary expense={expense}/>

  <div className={styles.tabs} role="tablist" aria-label="Investment categories">{INVESTMENT_CATEGORIES.map(([id,label],index)=>{const Icon=icons[id];return <button key={id} id={`${name}-${id}-tab`} type="button" role="tab" aria-selected={category===id} aria-controls={`${name}-panel`} tabIndex={category===id?0:-1} onClick={()=>changeCategory(id)} onKeyDown={e=>{let i;if(e.key==='ArrowRight')i=(index+1)%4;else if(e.key==='ArrowLeft')i=(index+3)%4;else if(e.key==='Home')i=0;else if(e.key==='End')i=3;else return;e.preventDefault();changeCategory(INVESTMENT_CATEGORIES[i][0]);e.currentTarget.parentElement.children[i].focus()}}><Icon size={18}/>{label}</button>})}</div>
  <div role="tabpanel" id={`${name}-panel`} aria-labelledby={`${name}-${category}-tab`}>
   <div className={styles.intro}><div><h2>{category==='mutual'?'Mutual funds to compare':category==='bonds'?'Treasury options to compare':`${category==='etf'?'ETF':'Stock'} access to compare`}</h2><p>{intros[category]}</p></div>{category==='mutual'&&<label>Approach<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All approaches</option><option value="index">Index funds</option><option value="active">Active funds</option></select></label>}</div>
   <div className={table.scroll} role="region" aria-label="Compare investment options" tabIndex={0}><table className={table.table}><caption>{options.length} researched options · neutral examples, not ranked recommendations</caption><thead><tr><th scope="col">Choose</th><th scope="col">{category==='mutual'?'Fund & provider':'Provider & option'}</th><th scope="col">Starting minimum</th><th scope="col">{category==='mutual'?'Fund expense':'Costs'}</th><th scope="col">Key risk / access</th><th scope="col">Details</th></tr></thead><tbody>{options.map(o=><Fragment key={o.id}><tr className={selected===o.id?table.selected:undefined}><td><label className={table.radio}><input type="radio" name={name} aria-label={`Select ${o.title}${o.ticker?` (${o.ticker})`:` at ${o.provider}`}`} checked={selected===o.id} disabled={busy||!investmentFresh(o)} onChange={()=>setSelected(o.id)}/></label></td><th scope="row"><div className={table.institution}><StoreLogo storeName={o.provider} size={32} fallbackEmoji="🏛️" className="!rounded-lg !shadow-none !ring-0"/><div><a href={o.url} target="_blank" rel="noreferrer">{o.title} ↗</a><small>{o.provider}{o.ticker?` · ${o.ticker}`:''}</small><small>{o.approach}</small></div></div></th><td><strong>{o.minimumCents===0?'No minimum':money(o.minimumCents)}</strong><small>{o.id==='treasury-marketable'?'Minimum bid':o.category==='mutual'?'Fund minimum':'Purchase minimum'}</small></td><td><strong>{o.fee}</strong>{o.expenseRatio!=null&&<small>{money(Math.round(100000*o.expenseRatio/100))} / $1,000 per year*</small>}</td><td>{o.risk}</td><td><button type="button" aria-expanded={expanded===o.id} aria-controls={`${name}-${o.id}-details`} onClick={()=>setExpanded(expanded===o.id?null:o.id)}>{expanded===o.id?'Less −':'Details +'}</button></td></tr>{expanded===o.id&&<tr><td colSpan={6} id={`${name}-${o.id}-details`}><div className={styles.details}><dl><div><dt>Where to hold it</dt><dd>{o.account}</dd></div><div><dt>Account opening</dt><dd>{o.accountMinimum}</dd></div><div><dt>Later contributions</dt><dd>{o.additional}</dd></div></dl><div><p>{o.charges}</p><details><summary>Approach & conditions</summary><p>{o.notes}</p></details><div className={styles.links}><a href={o.url} target="_blank" rel="noreferrer">Provider details ↗</a><a href={o.sources?.[0]||o.url} target="_blank" rel="noreferrer">Source & terms ↗</a><a href={o.guide} target="_blank" rel="noreferrer">Read guide ↗</a></div><p className={styles.note}>Checked {o.checkedAt}{investmentFresh(o)?'':' · Recheck required before saving'}</p></div></div></td></tr>}</Fragment>)}</tbody></table></div>
   <p className={styles.note}>{category==='mutual'?'*Expense estimate uses a constant $1,000 balance; actual fund costs vary. Broker fees and taxes are separate.':'Verify eligibility and account terms. These are access comparisons, not specific stock or ETF selections.'}</p>
  </div>
  {option&&<div className={styles.milestone} aria-label="Your funding milestone"><div className={styles.intro}><div><span className={styles.kicker}>YOUR CHOICE</span><h3>{option.title}{option.ticker?` · ${option.ticker}`:''}</h3></div><span className={styles.badge}>{option.minimumCents===0?'No fund minimum':`${money(option.minimumCents)} starting minimum`}</span></div><div className={styles.funding}><label>Starting cash for comparison ($)<input className={planField} type="number" min="0" max="100000000" step="0.01" value={available} onChange={e=>{setAvailable(e.target.value);setConfirmed(false)}}/></label><div aria-live="polite">{milestone?<><strong>{milestone.gapCents===0?(option.minimumCents===0?'No minimum to build toward':'Starting minimum reached'):milestone.months?`About ${milestone.months} months to the minimum`:'Set a recurring savings amount to estimate timing'}</strong><p>{milestone.gapCents>0?`${money(milestone.gapCents)} remaining · ${money(milestone.monthlyCents)}/month from planned expense savings.`:'Review access, fees and risk before making your own investment decision.'}</p></>:<p>Enter a valid non-negative amount with up to two decimal places.</p>}</div></div><p className={styles.note}>Starting cash is confirmed by you; monthly additions are planned. No returns, withdrawals or taxes assumed. A minimum is not a recommendation to invest.</p><label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirmed this amount after bills and my cash reserve.</label><div className={styles.save}><Link href="/my-plan/build-wealth">Compare savings while building your balance <ArrowRight size={16}/></Link><button className={planButton} disabled={busy||!milestone||!confirmed||!investmentFresh(option)} onClick={save}>{busy?'Saving…':'Save to my plan'}</button></div></div>}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className={styles.error}>{error}</p>}
  <div className={styles.resources}><BookOpen size={18}/><a href={INVESTMENT_GUIDES[category]} target="_blank" rel="noreferrer">{category==='mutual'?'How mutual funds work':'Explore this investment type'} ↗</a><details><summary>Accounts, costs & ongoing review</summary><div className={styles.accountGrid}>{ACCOUNT_OPTIONS.map(a=><div key={a.name}><h3>{a.name}</h3><p>{a.text}</p><a href={a.url} target="_blank" rel="noreferrer">Account guide ↗</a></div>)}</div><p>Review your saved amount, fees, holdings and goals when your circumstances change. Compare concentration and ongoing costs; past returns do not predict future results.</p></details></div>
 </section>
}


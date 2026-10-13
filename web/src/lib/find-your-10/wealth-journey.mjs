import {recurringAnalysis} from './recurring.mjs'
import {personalCashPlan} from './personal-cash.mjs'
export const PATHS=['cash','mixed','invest','undecided']
export function wealthJourney(data,now=new Date()){
 const plan=recurringAnalysis(data,now),state=data.progress||{},cash=personalCashPlan(data,state,{},now),preferences=state.wealthJourney?.preferences||{}
 const entries=state.wealthJourney?.months||{},month=entries[plan.month]||{}
 const confirmedCents=(state.ledger||[]).filter(e=>e.period===plan.month).reduce((n,e)=>n+e.amountCents,0)
 const goals=(data.financialGoals||[]).filter(g=>g.status==='active')
 const reserve=preferences.reserveCents
 const gaps=[]
 if(!plan.ready)gaps.push('Confirm your income to calculate the monthly target.')
 if(reserve==null)gaps.push('Choose the cash cushion you want to protect.')
 if(!preferences.horizon)gaps.push('Tell us when you expect to need this money.')
 if(!preferences.risk)gaps.push('Tell us how you feel about investment losses.')
 const reasons=[...cash.concerns]
 const debts=(data.debtAccounts||[]).filter(d=>d.is_active!==false&&Number(d.balance)>0)
 if(debts.length)reasons.push(`Review your recorded debt costs before choosing contributions: ${debts.map(d=>`${d.name||'Debt'} (${Number(d.apr)||0}% APR)`).join(', ')}. No repayment or investment allocation is assumed.`)
 if(reserve!=null&&cash.savingsCents<reserve)reasons.push(`Your recorded savings are below your chosen cash cushion by $${((reserve-cash.savingsCents)/100).toFixed(2)}.`)
 if(preferences.horizon==='soon')reasons.push('You expect to use this money within three years. Compare accessible cash and maturity dates before market investments.')
 if(preferences.risk==='protect')reasons.push('You want to protect principal. Review insured deposits; market investments can lose value.')
 const readyToExplore=gaps.length===0&&reasons.length===0
 return {month:plan.month,goalPct:plan.goalPct,targetCents:plan.ready?plan.incomeTargetCents:null,confirmedCents,cash,goals,preferences,entries,monthEntry:month,gaps,reasons,readyToExplore,
 priority:gaps.length?'Complete your starting point':reasons.length?'Protect money you need first':preferences.path==='cash'?'Build your cash cushion at your pace':'Compare investment accounts and costs',
 pathLabel:{cash:'Build cash first',mixed:'Explore saving and investing together',invest:'Explore recurring investment contributions',undecided:'Compare before choosing'}[preferences.path]||'Choose your path',
 reserveMonths:reserve!=null&&plan.ready&&plan.incomeTargetCents>0?Math.ceil(Math.max(0,reserve-cash.savingsCents)/plan.incomeTargetCents):null,
 reportedCents:(month.cashCents||0)+(month.investCents||0),
 steps:[{title:'Find and confirm your savings',detail:'Complete your expense actions and review the evidence.',href:'/my-plan/details'},{title:'Protect cash for bills and goals',detail:cash.nextStep,href:'/my-plan/cash-accounts'},{title:'Compare accounts and investments',detail:readyToExplore?'Your recorded checks are complete. Compare costs, access and eligibility before deciding.':'Review your priorities below. You can learn about every path now.',href:'#options'},{title:'Record this month and review again',detail:'Track new contributions separately from transfers of money already saved.',href:'#monthly'}]}
}
const moneyInput=value=>{const s=String(value??'');if(!/^\d{1,7}(\.\d{1,2})?$/.test(s))throw Error('Enter a nonnegative amount with up to two decimal places.');return Math.round(Number(s)*100)}
export function updateWealthJourney(previous={},input,now){
 const next=structuredClone(previous)
 if(input.kind==='preferences'){
  if(!PATHS.includes(input.path)||!['soon','medium','long'].includes(input.horizon)||!['protect','some','comfortable'].includes(input.risk))throw Error('Choose a path, timeframe and risk preference.')
  next.preferences={path:input.path,horizon:input.horizon,risk:input.risk,reserveCents:moneyInput(input.reserve),updatedAt:now}
 }else if(input.kind==='month'){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)||input.month>now.slice(0,7)||input.month<'2000-01')throw Error('Choose a current or past month.')
  if(input.confirmed!==true)throw Error('Confirm these are completed contributions, not a forecast.')
  const destination=String(input.destination||'').trim()
  if(!destination||destination.length>120)throw Error('Enter the destination account name (up to 120 characters).')
  next.months||={};next.months[input.month]={cashCents:moneyInput(input.cash),investCents:moneyInput(input.invest),transferCents:moneyInput(input.transfer),destination,recordedAt:now}
 }else throw Error('Choose a valid wealth-plan action.')
 return next
}

import {cashOptions,cashIllustration} from './cash-options.mjs'

const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value/100)
const amount = value => value!==null && value!==undefined && value!=='' && Number.isFinite(Number(value)) && Number(value)>=0 ? Math.round(Number(value)*100) : null
const unique = rows => [...new Map((rows||[]).filter(r=>r.id).map(r=>[r.id,r])).values()]

// Shared by scheduled agents and the page. Recorded cash is not a safe-to-transfer balance.
export function personalCashPlan(data={},progress=data.progress||{},inputs={},now=new Date()) {
 const today=new Date(now).toISOString().slice(0,10), end=new Date(now)
 end.setUTCDate(end.getUTCDate()+30)
 const accounts=unique(data.wealthAccounts).filter(a=>a.is_active!==false&&['checking','savings'].includes(a.account_type))
 const sum=rows=>rows.reduce((n,a)=>n+(amount(a.balance)??0),0)
 const savingsCents=sum(accounts.filter(a=>a.account_type==='savings')),checkingCents=sum(accounts.filter(a=>a.account_type==='checking'))
 const bills=unique(data.billCycles).filter(b=>!['paid','skipped','canceled','needs_review'].includes(b.status)&&b.due_date&&b.due_date<=end.toISOString().slice(0,10))
 const billCents=bills.reduce((n,b)=>n+Math.max(0,(amount(b.statement_amount??b.expected_amount)??0)-(amount(b.paid_amount)??0)),0)
 const unknownBills=bills.some(b=>amount(b.statement_amount??b.expected_amount)===null)
 const comparison={balance:String(savingsCents/100),currentApy:'',currentFee:'',...inputs}
 const comparisonCents=amount(comparison.balance)
 const context=[]
 if(accounts.length)context.push(`${money(savingsCents)} in saved savings accounts; ${money(checkingCents)} in checking. Balances are recorded, not live.`)
 else context.push('Add your savings balance in Wealth Path to compare earnings using your own records.')
 if(bills.length)context.push(`${money(billCents)} in recorded unpaid bills due within 30 days or overdue${unknownBills?'; some bill amounts are missing':''}. Keep bill money accessible.`)
 const concerns=[]
 if(!accounts.length||accounts.some(a=>amount(a.balance)===null))concerns.push('Confirm your account balances before deciding how much to move.')
 if(comparisonCents>savingsCents)concerns.push('Your comparison exceeds recorded savings. Confirm the source of the extra cash and upcoming expenses.')
 if(billCents>checkingCents)concerns.push(`Recorded bills exceed recorded checking: ${money(billCents)} due versus ${money(checkingCents)} in checking. Review bill funding before moving cash.`)
 const debt=unique(data.debtAccounts).filter(d=>d.is_active!==false&&amount(d.balance)>0&&Number(d.apr)>0)
 const options=cashOptions(progress,new Date(now),data.depositQuotes).map(option=>{
  let illustration=null
  try { if(option.fresh&&comparisonCents>0)illustration=cashIllustration(option,comparison) } catch { /* incomplete user input */ }
  const reasons=[]
  if(illustration)reasons.push(`${money(illustration.alternativeNetCents)} estimated annual interest after monthly fees on your ${money(comparisonCents)} comparison.`)
  else reasons.push('Enter a comparison balance to see your estimated annual interest.')
  if(illustration?.differenceCents!=null)reasons.push(`${money(illustration.differenceCents)} annual difference versus the current terms you entered.`)
  if(option.id==='marcus-savings'&&illustration)reasons.push('Compare its transfer processing with the dates you need money; availability is not guaranteed the same day.')
  if(option.id==='amex-savings'&&checkingCents>0)reasons.push('Your recorded checking can remain the spending account; this savings account has no debit card or ATM access.')
  const tradeoffs=[...concerns]
  const higherDebt=debt.filter(d=>Number(d.apr)>Number(option.apy)).sort((a,b)=>Number(b.apr)-Number(a.apr))[0]
  if(higherDebt)tradeoffs.push(`Your ${higherDebt.name||'recorded debt'} has a ${Number(higherDebt.apr)}% APR and ${money(amount(higherDebt.balance))} balance, above this ${option.apy}% APY. Compare the interest cost while preserving cash for bills and emergencies.`)
  if(!option.fresh)tradeoffs.push('Provider terms need rechecking; new earnings estimates and selection are unavailable.')
  return {...option,reasons,personalTradeoffs:tradeoffs,illustration}
 })
 return {version:'personal-cash-v1',asOf:today,savingsCents,checkingCents,billCents,defaultBalance:String(savingsCents/100),context,concerns,options,
  missing:['Current APY and monthly fees are needed to calculate an improvement over your account.','Confirm your cash cushion and access needs; saved records do not establish an amount safe to transfer.'],
  nextStep:billCents>checkingCents?'Review bill funding, then choose a comparison amount.':'Compare recorded savings, then review access and terms before choosing.',
  basis:'One-year constant-balance illustration; variable APY, before tax. No transfer or earned savings is recorded.'}
}

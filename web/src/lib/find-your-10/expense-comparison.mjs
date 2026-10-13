import {planPeriod,quickPlanTotals} from './lifecycle.mjs'
// Planned and verified amounts are alternative views, never added together.
export function expenseComparison(data,now=new Date()){
 const state=data.progress||{},month=planPeriod(now),totals=quickPlanTotals(state,month)
 const billCents=(state.actions||[]).filter(a=>a.accepted&&!a.needsReview&&a.optionId&&!a.usageReduction).reduce((n,a)=>n+Math.max(0,a.estimateCents||0),0)
 const plannedCents=totals.plannedCents+billCents,confirmedCents=(state.ledger||[]).filter(l=>l.period===month).reduce((n,l)=>n+l.amountCents,0)
 return {balance:String(plannedCents/100),plannedCents,monthlyCents:totals.monthlyCents+billCents,oneTimeCents:totals.oneTimeCents,confirmedCents,month}
}

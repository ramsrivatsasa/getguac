export function billCostEstimate(increaseCents, monthlyFeeCents = 0, switchingCents = 0) {
  if (![increaseCents,monthlyFeeCents,switchingCents].every(n=>Number.isSafeInteger(n)&&n>=0)) throw Error('Enter valid nonnegative costs.')
  const monthlyCents=increaseCents-monthlyFeeCents
  return {monthlyCents,firstMonthCents:monthlyCents-switchingCents,firstYearCents:monthlyCents*12-switchingCents,
    breakEvenMonths:monthlyCents>0?Math.ceil(switchingCents/monthlyCents):null}
}
export function latestBillReviews(reviews,cycles,today) {
  const bySeries=new Map()
  for(const review of reviews){
    const cycle=cycles.find(c=>c.id===review.id)
    if(!cycle||cycle.due_date>today||cycle.statement_amount==null||!Number.isFinite(Number(cycle.statement_amount))||Number(cycle.statement_amount)<0)continue
    const key=cycle.bill_series_id||cycle.id, previous=bySeries.get(key)
    if(!previous||cycle.due_date>previous.date)bySeries.set(key,{review,date:cycle.due_date})
  }
  return [...bySeries.values()].map(v=>v.review)
}

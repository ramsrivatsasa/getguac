import {allowedSuggestions} from './suggestion-feedback.mjs'
// Public provider terms checked 2026-09-28. Address/account eligibility is separate.
export const INTERNET_OPTIONS = [
  {id:'fios-300',title:'Verizon Fios · 300 Mbps',priceCents:4000,setupCents:0,url:'https://www.verizon.com/home/internet/fios-fastest-internet/',terms:'Advertised with Auto Pay and paper-free billing. Ask Verizon to confirm this price for your existing account.',tradeoff:'Up to 300 Mbps fiber. Check your current speed, bundle discounts and any change fees.',checkedAt:'2026-09-28'},
  {id:'tmobile-rely',title:'T-Mobile · Rely Home Internet',priceCents:5000,setupCents:3500,url:'https://www.t-mobile.com/home-internet/plans',terms:'AutoPay price before taxes and fees. Address approval required; $35 connection charge.',tradeoff:'5G wireless instead of fiber; speed depends on signal and congestion. Test coverage before canceling Fios.',checkedAt:'2026-09-28'},
  {id:'cox-internet',title:'Cox Internet',priceCents:null,setupCents:0,postalCodes:['20171'],quoteRequired:true,url:'https://www.cox.com/residential/internet.html',terms:'Check your service address for the available speed tiers and full monthly price.',tradeoff:'Compare equipment, installation, data allowances and the price after any promotion. No savings assumed until you have a matching quote.',checkedAt:'2026-09-29'},
  {id:'att-air',title:'AT&T Internet Air',priceCents:5500,setupCents:0,url:'https://www.att.com/internet/internet-air/',terms:'Starting price with AutoPay and paperless billing, plus taxes and fees. Service address approval required.',tradeoff:'5G home internet; speeds depend on coverage and congestion. Self-setup and All-Fi Hub included; compare your final quote before switching.',checkedAt:'2026-09-29'},
]
// Regular monthly, per-line prices; a whole household statement is not a
// comparable baseline. These review tasks intentionally carry no savings.
export const MOBILE_OPTIONS = [
  {id:'visible-base',title:'Visible · Unlimited',priceCents:2500,perLine:true,setupCents:0,url:'https://www.visible.com/plans',terms:'Regular monthly price per line, taxes and fees included. Promotional discounts are not used.',tradeoff:'Verizon network; data may slow during congestion. Hotspot up to 5 Mbps and video up to 480p. Check unlocked-device compatibility, coverage, device balances and lost bundle discounts.',checkedAt:'2026-09-29'},
  {id:'visible-plus',title:'Visible+ · Unlimited',priceCents:3500,perLine:true,setupCents:0,url:'https://www.visible.com/plans',terms:'Regular monthly price per line, taxes and fees included. Promotional discounts are not used.',tradeoff:'Premium data on Verizon’s network; hotspot up to 10 Mbps. Check your phone, coverage and international needs. Device installments and other existing-account charges are separate.',checkedAt:'2026-09-29'},
]
export function billStrategy(bill) {
  const context=`${bill.bill_series?.name||bill.title||''} ${bill.bill_series?.category||''}`
  if(/water|sewer|electric|dominion|power|energy|utility|utilities|natural gas|gas bill/i.test(context))return 'usage'
  if(/fios|internet|broadband|fiber|mobile|wireless|phone|subscription/i.test(context))return 'compare'
  return 'review'
}
export function billOptions(data, now=new Date()) {
  const today=now.toISOString().slice(0,10), latest=new Map()
  for(const b of data.billCycles||[]) {
    if(b.bill_series?.cadence!=='monthly'||b.statement_amount==null||!Number.isFinite(Number(b.statement_amount))||Number(b.statement_amount)<=0||b.due_date>today||['canceled','skipped','needs_review'].includes(b.status))continue
    if(!latest.has(b.bill_series_id)||latest.get(b.bill_series_id).due_date<b.due_date)latest.set(b.bill_series_id,b)
  }
  return [...latest.values()].map(b=>{
    const amountCents=Math.round(Number(b.statement_amount)*100)
    const internet=/fios|internet|broadband|fiber/i.test(`${b.bill_series?.name} ${b.bill_series?.category}`)
    const mobile=!internet&&/mobile|wireless|cellular|cell phone|phone plan/i.test(`${b.bill_series?.name} ${b.bill_series?.category}`)
    const strategy=billStrategy(b)
    const options=strategy==='usage'?[{id:'reduce-usage',title:`Review guides to reduce ${b.bill_series.name.toLowerCase()} usage`,priceCents:null,setupCents:0,differenceCents:0,firstYearCents:0,terms:'Choose a usage-reduction task for this household bill.',tradeoff:'Compare usage units and billing-period length on your next statement. No dollar saving is assumed.',usage:true}]:internet?INTERNET_OPTIONS.filter(o=>(!o.postalCodes||o.postalCodes.includes(data.postalCode))&&(!o.quoteRequired&&Number.isInteger(o.priceCents)&&o.priceCents<amountCents)&&now>=new Date(o.checkedAt+'T00:00:00Z')&&now-new Date(o.checkedAt+'T00:00:00Z')<=30*86400000).map(o=>({...o,differenceCents:o.quoteRequired?0:amountCents-o.priceCents,firstYearCents:o.quoteRequired?0:(amountCents-o.priceCents)*12-o.setupCents})):[]
    const available=mobile&&strategy==='compare'?MOBILE_OPTIONS.filter(o=>now>=new Date(o.checkedAt)&&now-new Date(o.checkedAt)<=30*86400000).map(o=>({...o,differenceCents:0,firstYearCents:0,comparisonPending:true})):options
    return {id:b.id,seriesId:b.bill_series_id,title:b.bill_series.name,category:b.bill_series.category,amountCents,date:b.due_date,strategy,options:allowedSuggestions(data.progress,'bill',b.bill_series_id,available)}
  })
}

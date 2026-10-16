import {quickOpportunities} from './quick-plan.mjs'
import {recordedExpenses} from './recorded-expenses.mjs'
import {recordedModel} from './product-identity.mjs'
import {sameApparelSize} from './apparel-size.mjs'

// A purchase decision does not require a cheaper offer. Keep remains available
// without treating unmatched products or failed discovery as savings.
export function purchasePlanRows(data,now=new Date()) {
 const records=recordedExpenses(data,now).groups.filter(g=>!g.receiptTotal)
 const keys=new Set(records.map(g=>g.key))
 const offers=quickOpportunities(data,now).filter(c=>keys.has(c.itemKey)).map(c=>({...c,model:recordedModel(records.find(g=>g.key===c.itemKey))}))
 const offered=new Set(offers.map(c=>c.itemKey))
 const review=records.filter(g=>!offered.has(g.key)).map(g=>{
  const latest=[...g.rows].sort((a,b)=>b.receipts.date.localeCompare(a.receipts.date))[0]
  const baselineCents=Math.round(Number(latest.price)*100/Number(latest.qty))
  const quote=data.priceQuotes?.[g.key]
  const reason=quote?.status==='error'?'Price check unavailable. Your recorded purchase is still available to keep.':!sameApparelSize(g.title,g.title,latest.category)?'Recorded size is missing or unclear; a cheaper size match has not been verified.':'No comparable lower price verified yet.'
  return {id:`quick:${latest.id}`,itemKey:g.key,title:g.title,model:recordedModel(g),merchant:latest.receipts.store_name,category:latest.category,baselineCents,alternativeCents:baselineCents,estimateCents:0,choice:'Keep current purchase',kind:'Recorded purchase',keepOnly:true,reason,tradeoff:'Keeping this purchase adds no estimated savings.',alternatives:[],sourceIds:g.rows.map(r=>r.id),receiptIds:[...new Set(g.rows.map(r=>r.receipt_id))],observedFrequency:new Set(g.rows.map(r=>r.receipt_id)).size,repeatEligible:false,discoveryStatus:quote?.status||'pending'}
 })
 return [...offers,...review]
}

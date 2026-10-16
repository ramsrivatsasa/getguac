import {sameApparelSize} from './apparel-size.mjs'
import {compatibilityVersion} from './compatible-products.mjs'
import {recordedModel,containsModel} from './product-identity.mjs'
import {isBasketProduce} from './grocery-basket.mjs'

export const discoveryDefaults={minRecurringSpendCents:0,minOneTimeSpendCents:5000}

// Guac AI recommendations are a research signal, never a price or saving.
// Keep financial math deterministic and spend the bounded search budget on
// identifiable purchases with meaningful recorded spending first.
export function discoveryPriority(groups,data,now=new Date()) {
 const historyStart=new Date(now);historyStart.setUTCDate(historyStart.getUTCDate()-180)
 const start=historyStart.toISOString().slice(0,10),through=new Date(now).toISOString().slice(0,10)
 const policy={...discoveryDefaults,...data.discoveryPolicy}
 const recommendations=data.planSuggestions?.suggestions||[]
 return groups.filter(g=>!isBasketProduce(g)&&sameApparelSize(g.title,g.title,g.rows.map(row=>row.category||'').join(' '))&&!/^\s*(?:merchandise|knits|receipt total|purchase|items?)\s*$/i.test(g.title))
  .map(g=>{
   const spending=g.rows.reduce((n,r)=>n+Math.max(0,Math.round(Number(r.price)*100)),0)
   const model=recordedModel(g)
   const repeats=new Set((data.items||g.rows).filter(r=>String(r.item_name||'').trim().toLowerCase().replace(/\s+/g,' ')===g.key&&(!model||containsModel(r.model||'',model))&&Number(r.price)>0&&Number(r.qty)>0&&!r.returned&&r.receipts?.is_return!==true&&r.receipts?.date>=start&&r.receipts?.date<=through).map(r=>r.receipt_id)).size||new Set(g.rows.map(r=>r.receipt_id)).size
   const recommended=recommendations.some(s=>g.rows.some(r=>r.id===s.sourceId)&&s.alternatives?.some(a=>['brand_check','return_check'].includes(a.kind)))
   return {group:g,spending,repeats,recommended,researched:Boolean(compatibilityVersion(g))}
  }).filter(g=>g.researched||g.spending>=(g.repeats>=2?policy.minRecurringSpendCents:policy.minOneTimeSpendCents))
  .sort((a,b)=>Number(b.repeats>=2)-Number(a.repeats>=2)||Number(b.recommended)-Number(a.recommended)||b.spending-a.spending||b.repeats-a.repeats)
  .map(g=>g.group)
}

import {sameApparelSize} from './apparel-size.mjs'
import {containsModel} from './product-identity.mjs'
import {isAirFilter} from './filter-match.mjs'
import {isBasketProduce} from './grocery-basket.mjs'
import {comparableCondition} from './offer-condition.mjs'
import {priceOptions} from './price-discovery.mjs'
import {allowedSuggestions} from './suggestion-feedback.mjs'
import { purchaseGroups, purchaseWindow } from './wizard.mjs'
import { isDiningItem, usableItem } from './opportunities.mjs'
import { localCoffeeOptions, comparableProductOption } from './local-options.mjs'
export function withHomeCost(candidate, cost) {
  if (!candidate.editableHomeCost || cost == null) return candidate
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(String(cost))) throw new Error('Enter a valid at-home cost.')
  const alternativeCents = Math.round(Number(cost)*100)
  if (alternativeCents >= candidate.baselineCents) throw new Error('At-home costs must be less than this purchase to estimate a saving.')
  return {...candidate,alternativeCents,estimateCents:candidate.baselineCents-alternativeCents,homeCost:String(cost)}
}
export function selectQuickAlternative(candidate, key, cost) {
  const selected = key ? candidate.alternatives?.find(a=>a.key===key) : candidate
  if (!selected) throw new Error('This choice changed. Refresh your plan.')
  return withHomeCost({...candidate,sourceUrl:undefined,sourceLabel:undefined,checkedAt:undefined,expiresAt:undefined,difference:undefined,...selected,selectedAlternative:key||null},cost)
}
export function quickOpportunities(data, now = new Date()) {
  const window = purchaseWindow(data, now)
  const candidates = [], historyCandidates = new Map()
  const covered = new Set((data.progress?.actions || []).filter(a => a.accepted).map(a => a.itemKey || a.category))
  for (const g of purchaseGroups(data, now)) {
    if(isBasketProduce(g))continue
    if (covered.has(g.key)) continue
    const rows = [...g.rows].sort((a,b) => b.receipts.date.localeCompare(a.receipts.date))
    const latest = rows[0], unit = Math.round(Number(latest.price)*100 / Number(latest.qty))
    const dining = rows.some(isDiningItem)
    const discretionary = dining || /coffee|chips|snack|headphones|phone stand|gaming|candy/i.test(g.title)
    const essential = /medicine|medical|prescription|baby|insulin|rent|utilities/i.test(g.title+' '+latest.category)
    if (essential) continue
    const historyStart=new Date(now);historyStart.setUTCDate(historyStart.getUTCDate()-180)
    const historyAllowed=r=>allowedSuggestions(data.progress,'purchase',g.key,[{key:`history:${r.id}`,historyMerchant:r.receipts.store_name}]).length>0
    const matchingIdentity=r=>(!latest.model||containsModel(r.model||'',latest.model))&&sameApparelSize(latest.item_name,r.item_name)
    const historical=!dining&&(data.items||[]).filter(r=>usableItem(r)&&matchingIdentity(r)&&r.id!==latest.id&&String(r.item_name||'').trim().toLowerCase().replace(/\s+/g,' ')===g.key&&(!latest.sku||!r.sku||latest.sku===r.sku)&&r.receipts.date>=historyStart.toISOString().slice(0,10)&&r.receipts.date<latest.receipts.date&&Math.round(Number(r.price)*100/Number(r.qty))<unit).sort((a,b)=>a.price/a.qty-b.price/b.qty).find(historyAllowed)
    if(historical) {
      const alternativeCents=Math.round(Number(historical.price)*100/Number(historical.qty))
      const option={key:`history:${historical.id}`,historyMerchant:historical.receipts.store_name,feedbackIdentity:`history:${String(historical.receipts.store_name||"unknown").trim().toLowerCase().replace(/\s+/g," ")}`,choice:`Buy again at ${historical.receipts.store_name}`,alternativeCents,estimateCents:unit-alternativeCents,sourceUrl:`/receipts/${historical.receipt_id}`,sourceLabel:'Your receipt',checkedAt:historical.receipts.date,tradeoff:'Your earlier unit price for the same recorded item. Confirm pack size, current price and extra costs before buying.',basis:'previous matching purchase'}
      historyCandidates.set(g.key,{id:'quick:'+latest.id,itemKey:g.key,title:g.title,kind:'Your previous lower price',reason:'Compare your own matching purchases first.',baselineCents:unit,sourceIds:[latest.id,historical.id],receiptIds:[...new Set([latest.receipt_id,historical.receipt_id])],...option,alternatives:[option]})
    }
    const quotes=(data.priceQuotes?.[g.key]?.options||[]).filter(q=>(q.reviewOnly||comparableCondition(q))&&q.expiresAt && new Date(q.expiresAt)>now && Number.isInteger(q.alternativeCents)&&q.alternativeCents>0&&q.alternativeCents<unit&&priceOptions([{...q,title:q.choice,url:q.sourceUrl,price:q.alternativeCents/100}],g,now).length>0)
    if(!dining && quotes.length){
      // Old shopping caches used product IDs shared by several sellers. Do not
      // guess which seller an ambiguous saved selection meant.
      const alternatives=[...new Map(quotes.map(q=>{
        const key=quotes.filter(other=>other.key===q.key).length>1?`quote:${q.sourceUrl}`:q.key
        return [key,{...q,key,estimateCents:q.reviewOnly?0:unit-q.alternativeCents}]
      })).values()]
      candidates.push({id:'quick:'+latest.id,itemKey:g.key,title:g.title,kind:'Lower listed prices',reason:alternatives.every(o=>o.reviewOnly)?'Lower listed price for a similar product. Compare specifications and purchase terms before choosing.':'Comparable options from shopping listings. Check size and features.',baselineCents:unit,sourceIds:rows.map(r=>r.id),receiptIds:[...new Set(rows.map(r=>r.receipt_id))],...alternatives[0],alternatives})
      continue
    }
    const suggestion = data.planSuggestions?.suggestions?.find(s=>g.rows.some(r=>r.id===s.sourceId))
    if (suggestion) {
      const source = g.rows.find(r=>r.id===suggestion.sourceId)
      const baseline = Math.round(Number(source.price)*100/Number(source.qty))
      let alternatives = suggestion.alternatives.flatMap((a,index)=>{
        let alternativeCents=null, editableHomeCost=false
        if (a.kind==='home_coffee' && dining && /coffee|latte|cappuccino|espresso/i.test(g.title)) { alternativeCents=100;editableHomeCost=true }
        else if (a.kind==='home_meal' && dining) { alternativeCents=1500;editableHomeCost=true }
        else if (a.kind==='skip_once' && !dining && discretionary && (g.frequency>=2 || g.lowRated)) alternativeCents=0
        else if (!['brand_check','drink_swap','return_check'].includes(a.kind)) return []
        if (alternativeCents !== null && alternativeCents>=baseline) return []
        return [{key:a.kind+':'+index,choice:a.label,alternativeCents,editableHomeCost,estimateCents:alternativeCents===null?0:baseline-alternativeCents,needsPrice:alternativeCents===null,basis:alternativeCents===null?'price check needed':'one purchase replaced',math:alternativeCents===null?'No saving counted until a comparable price is recorded.':'Recorded purchase minus assumed replacement cost.',tradeoff:editableHomeCost?'At-home cost is an editable illustrative assumption. Include ingredients for the same serving or number of diners, plus any equipment or other costs.':a.kind==='return_check'?'Confirm the return deadline, refundable amount, condition, exact replacement model and needed features. Net saving = refund minus replacement price, tax, shipping and restocking fees. Equal quality is not assumed.':alternativeCents===null?'Check the same size, extras, availability and travel costs. An alternative brand or different drink is not automatically cheaper.':'Only choose this if no replacement purchase is needed.'}]
      })
      if (dining && /coffee|latte|cappuccino|espresso/i.test(g.title)) {
        const local = localCoffeeOptions(data.postalCode,baseline,now)
        if (local.length) alternatives=[...alternatives.filter(a=>a.editableHomeCost),...local]
      }
      if (alternatives.length) {
        candidates.push({id:'quick:'+source.id,itemKey:g.key,title:g.title,kind:'Guac AI suggestions',reason:`${g.frequency} recorded purchase${g.frequency===1?'':'s'} in the last 30 days. Alternatives suggested by Guac AI; prices calculated separately.`,baselineCents:baseline,sourceIds:g.rows.map(r=>r.id),receiptIds:[...new Set(g.rows.map(r=>r.receipt_id))],...alternatives[0],alternatives,modelAssisted:true})
        continue
      }
    }
    const previous = rows.filter(r => r.receipts.date < latest.receipts.date).sort((a,b) => a.price/a.qty-b.price/b.qty)
    const usual = previous.length >= 2 ? Math.round(previous[Math.floor(previous.length/2)].price*100/previous[Math.floor(previous.length/2)].qty) : null
    const anomaly = !dining && historical && usual > 0 && unit >= usual*1.25 && unit-usual >= 100
    const lower = !dining && rows.find(r => matchingIdentity(r)&&r.receipts.store_name !== latest.receipts.store_name && Math.round(r.price*100/r.qty)<unit && historyAllowed(r))
    if (lower) {
      const alternative = Math.round(lower.price*100/lower.qty)
      candidates.push({id:'quick:'+latest.id,itemKey:g.key,title:g.title,kind:'Recorded price difference',feedbackIdentity:`history:${String(lower.receipts.store_name||'unknown').trim().toLowerCase().replace(/\s+/g,' ')}`,reason:`The same recorded item cost more at ${latest.receipts.store_name} than at ${lower.receipts.store_name}.`,choice:`Check ${lower.receipts.store_name} before your next purchase`,baselineCents:unit,alternativeCents:alternative,estimateCents:unit-alternative,math:'One matching unit; before any extra travel, shipping or membership costs.',tradeoff:'Historical receipt prices, not a live offer. Confirm brand, pack size and current availability. Extra costs reduce this estimate.',sourceIds:[latest.id,lower.id],receiptIds:[latest.receipt_id,lower.receipt_id],basis:'next matching purchase'})
    } else if (anomaly) {
      candidates.push({id:'quick:'+latest.id,itemKey:g.key,title:g.title,kind:'Unusual price increase',reason:`Your latest unit price is ${Math.round((unit/usual-1)*100)}% above the median of ${previous.length} earlier purchases in the last 30 days.`,choice:'Check the price and choose the previous-priced option if available',baselineCents:unit,alternativeCents:usual,estimateCents:unit-usual,math:'One matching unit at the previous median price; before extra costs.',tradeoff:'Check brand, pack size and any discount first. A price increase is not proof of an error. This scenario applies only if the earlier price is available again.',sourceIds:rows.map(r=>r.id),receiptIds:[...new Set(rows.map(r=>r.receipt_id))],basis:'next matching purchase'})
    } else if (dining && /coffee|latte|cappuccino|espresso/i.test(g.title) && g.frequency>=2 && unit>100) {
      candidates.push({id:'quick:'+latest.id,itemKey:g.key,title:g.title,kind:'Try coffee at home',reason:`Your latest coffee cost $${(unit/100).toFixed(2)}. Replace one cafe coffee with a cup at home.`,choice:'Make one coffee at home instead',baselineCents:unit,alternativeCents:100,estimateCents:unit-100,editableHomeCost:true,math:'One cafe coffee replaced with one homemade cup.',tradeoff:'The $1 home cost is an illustrative assumption, not a measured cost. Include coffee, milk and other ingredients; equipment purchases reduce or eliminate savings.',sourceIds:rows.map(r=>r.id),receiptIds:[...new Set(rows.map(r=>r.receipt_id))],basis:'one coffee replaced'})
    } else if (dining && g.frequency>=2 && unit>1500) {
      candidates.push({id:'quick:'+latest.id,itemKey:g.key,title:g.title,kind:'Try a meal at home',reason:`Your latest dining purchase cost $${(unit/100).toFixed(2)}. Replace one comparable restaurant occasion with a meal at home.`,choice:'Cook one meal at home instead',baselineCents:unit,alternativeCents:1500,estimateCents:unit-1500,editableHomeCost:true,math:'One restaurant occasion replaced with a home meal for the same people.',tradeoff:'The $15 home cost is an illustrative assumption, not your measured grocery cost. Adjust for the same number of diners, ingredients, delivery and any equipment needed.',sourceIds:rows.map(r=>r.id),receiptIds:[...new Set(rows.map(r=>r.receipt_id))],basis:'one meal replaced'})
    } else if(discretionary && g.frequency>=2) {
      candidates.push({id:'quick:'+latest.id,itemKey:g.key,title:g.title,kind:'Repeat purchase to consider',reason:`You recorded ${g.frequency} purchases totaling $${(g.totalCents/100).toFixed(2)} in the last 30 days. That does not make them unnecessary.`,choice:'Skip one optional repeat',baselineCents:unit,alternativeCents:0,estimateCents:unit,math:'One purchase skipped − $0 replacement cost.',tradeoff:'Choose only if this is optional for you. If you would buy a replacement, keep this purchase for now. This is a one-time scenario, not a monthly forecast.',sourceIds:rows.map(r=>r.id),receiptIds:[...new Set(rows.map(r=>r.receipt_id))],basis:'one purchase skipped'})
    } else if(discretionary && g.lowRated>0 && latest.rating>0 && latest.rating<=2) {
      candidates.push({id:'quick:'+latest.id,itemKey:g.key,title:g.title,kind:'Purchase you rated poorly',reason:`You rated this purchase ${latest.rating} out of 5. It cost $${(unit/100).toFixed(2)} per unit; consider keeping what you have instead of a planned repeat.`,choice:'Keep using what I have; postpone one repeat purchase',baselineCents:unit,alternativeCents:0,estimateCents:unit,math:'One repeat purchase postponed − $0 additional cost.',tradeoff:'Only applies if another purchase was planned and your existing item still meets your needs. Not a refund or recurring saving.',sourceIds:[latest.id],receiptIds:[latest.receipt_id],basis:'one planned repeat purchase'})
    }
  }
  for(const g of purchaseGroups(data,now)) {
    if(candidates.some(c=>c.itemKey===g.key)||covered.has(g.key))continue
    const latest=[...g.rows].sort((a,b)=>b.receipts.date.localeCompare(a.receipts.date))[0]
    const baselineCents=Math.round(Number(latest.price)*100/Number(latest.qty))
    const offer=comparableProductOption(g.title,baselineCents,now)
    if(offer)candidates.push({id:'quick:'+latest.id,itemKey:g.key,title:g.title,kind:'Comparable product',reason:'A sourced alternative for your next purchase; check model, size and total cost.',baselineCents,sourceIds:[latest.id],receiptIds:[latest.receipt_id],...offer,alternatives:[offer]})
  }
  for(const [key,c] of historyCandidates)if(!candidates.some(x=>x.itemKey===key))candidates.push(c)
  return candidates.map(c=>{
    const product=c.kind==='Lower listed prices'?null:comparableProductOption(c.title,c.baselineCents,now)
    const history=historyCandidates.get(c.itemKey)
    const option=history?.alternatives[0] || product || (c.alternatives || [c]).find(a=>!a.needsPrice && (a.estimateCents>0||a.reviewOnly&&a.listedDifferenceCents>0))
    return option ? {...c,...option,sourceIds:[...new Set([...c.sourceIds,...(history?.sourceIds||[])])],receiptIds:[...new Set([...c.receiptIds,...(history?.receiptIds||[])])],alternatives:[option,...(product&&product.key!==option.key?[product]:[]),...(c.alternatives || []).filter(a=>a.key!==option.key&&a.key!==product?.key)]} : null
  }).filter(Boolean).flatMap(c=>{
    const alternatives=allowedSuggestions(data.progress,'purchase',c.itemKey,c.alternatives||[c]).filter(a=>(a.sourceLabel!=='Product'||a.available===true)&&sameApparelSize(c.title,a.sourceLabel==='Your receipt'?c.title:a.choice))
    return alternatives.length?[{...c,...alternatives[0],alternatives}]:[]
  }).map(c=>{
    const rows=(data.items||[]).filter(i=>c.sourceIds.includes(i.id))
    const observedFrequency=new Set(rows.map(i=>i.receipt_id)).size
    const historyStart=new Date(now);historyStart.setUTCDate(historyStart.getUTCDate()-180)
    const repeatHistory=(data.items||[]).filter(i=>usableItem(i)&&String(i.item_name||'').trim().toLowerCase().replace(/\s+/g,' ')===c.itemKey&&i.receipts.date>=historyStart.toISOString().slice(0,10)&&i.receipts.date<=now.toISOString().slice(0,10))
    const repeatEligible=new Set(repeatHistory.map(i=>i.receipt_id)).size>1 && rows.some(i=>isDiningItem(i)||isAirFilter(i.item_name)||/grocer|grub|food|coffee|snack|household consumable|detergent|paper towels|toilet paper|cleaning supplies|pet food/i.test(`${i.category} ${i.item_name}`))
    return {...c,observedFrequency,repeatEligible,category:rows[0]?.category||null,merchant:data.items?.find(i=>i.id===c.sourceIds[0])?.receipts?.store_name || 'Merchant not recorded'}
  }).map(c=>({...c,historicalBaseline:window.historical,baselineThrough:window.end,reason:window.historical?c.reason.replace(/in the last 30 days/g,`in your recorded 30-day period ending ${window.end}`).replace(/earlier purchases in the last 30 days/g,`earlier purchases in your recorded period ending ${window.end}`):c.reason})).sort((a,b)=>Number(Boolean(b.modelAssisted))-Number(Boolean(a.modelAssisted))||b.estimateCents-a.estimateCents)
}

export function groupQuickOpportunities(opportunities, items = []) {
  const groups = new Map()
  for (const opportunity of opportunities) {
    const source = items.find(item => item.id === opportunity.sourceIds[0])
    const context = `${source?.category || opportunity.category || ''} ${opportunity.title}`
    const category = source && isDiningItem(source) ? 'Dining & coffee'
      : /grocer|grub|produce|food/i.test(context) ? 'Groceries'
      : /subscription|bill|internet|phone plan/i.test(context) ? 'Bills & subscriptions'
      : /electronics|clothing|fits|shopping|headphone|shirt|tee|knits|footwear|shoes|stand|household/i.test(context) ? 'Shopping'
      : 'Other spending'
    if (!groups.has(category)) groups.set(category, [])
    groups.get(category).push(opportunity)
  }
  return [...groups].map(([title, options]) => ({title, options, estimateCents:options.reduce((sum, option) => sum + option.estimateCents, 0)}))
}

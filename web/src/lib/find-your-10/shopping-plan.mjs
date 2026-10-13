import {allowedSuggestions,suggestionKey,suggestionHidden} from './suggestion-feedback.mjs'
import { createHash } from 'node:crypto'
import { isDiningItem } from './opportunities.mjs'

// Stable per member and purchase group: retries and price refreshes must not
// overwrite a shopping row the member has reviewed or edited.
export function planShoppingId(userId, itemKey) {
  const hex = createHash('sha256').update(JSON.stringify(['plan-shopping',userId,itemKey])).digest('hex')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`
}

export async function ensurePlanShoppingStores(sb, progress, data) {
  data.stores ||= []
  for(const choice of progress.quickPlan?.choices||[]) {
    if(choice.decision!=='accept'||choice.needsReview||!choice.store||!choice.sourceUrl?.startsWith('https://'))continue
    const name=choice.store.trim()
    if(data.stores.some(s=>s.store_name.toLowerCase()===name.toLowerCase()))continue
    const id=planShoppingId('retailer',name.toLowerCase())
    const {error}=await sb.from('stores').upsert({id,store_name:name},{onConflict:'id',ignoreDuplicates:true})
    if(error)throw Error('The selected retailer could not be saved. Retry saving your plan.')
    data.stores.push({id,store_name:name})
  }
}

export function recurringShoppingRows(progress, data, userId, now = new Date(), provenance = {}) {
  const rows = new Map()
  for (const choice of progress?.quickPlan?.choices || []) {
    if(choice.cadence==='once'&&choice.completedAt)continue
    if (choice.decision !== 'accept' || !['monthly','once'].includes(choice.cadence) || choice.mode==='return_replace' || choice.needsReview || !(choice.alternativeCents>0)) continue
    const sources = (data.items || []).filter(item => choice.sourceIds?.includes(item.id))
    if (!sources.length || sources.some(isDiningItem)) continue
    const grocery=sources.some(item => /^(grub|groceries|grocery|food|produce)$/i.test(item.category || item.receipts?.category || ''))
    const options = allowedSuggestions(progress,'purchase',choice.itemKey,[choice]).filter(option =>
      !option.needsPrice && !option.editableHomeCost && Number.isInteger(option.alternativeCents) &&
      option.alternativeCents > 0 && option.alternativeCents < choice.baselineCents &&
      option.sourceUrl?.startsWith('https://') && option.expiresAt && new Date(option.expiresAt) > now)

    const cheapest = options[0]
    if(!cheapest&&choice.cadence==='once')continue
    const storeKey=value=>String(value||'').toLowerCase().replace(/^www\./,'').replace(/\.com$/,'').replace(/[^a-z0-9]/g,'')
    const store=(data.stores||[]).find(s=>storeKey(s.store_name)===storeKey(cheapest?.store))
    const id = planShoppingId(userId, choice.itemKey || choice.id)
    rows.set(id, {id, user_id:userId, item_name:cheapest?.choice || choice.title, qty:choice.occurrences || 1,
      price:cheapest ? cheapest.alternativeCents / 100 : null, frequency:choice.cadence==='monthly'?'Monthly':'One-time', list_name:grocery?'Pantry':'Grub & Grab',store_name_id:store?.id||null,
      approved:false, sent_to_store:false, order_date:now.toISOString().slice(0,10),
      comments:cheapest?`From your savings plan: ${choice.title}. Selected option${cheapest.store?` at ${cheapest.store}`:""}; review size, availability and extra costs. ${cheapest.sourceUrl} Checked: ${cheapest.checkedAt || 'see listing'}.`:`From your savings plan: ${choice.title}. Review current prices and your preferred alternative before shopping. The earlier price is not treated as a current offer.`})
    provenance[id]={row:rows.get(id),optionKey:cheapest?suggestionKey('purchase',choice.itemKey,cheapest):null,subject:choice.itemKey}
  }
  return [...rows.values()]
}

const editableFields=['item_name','qty','price','frequency','list_name','approved','sent_to_store','order_date','comments','sku','store_name_id']
export function unchangedPlanRow(actual, original) {
  return editableFields.every(key => (actual[key] ?? null) === (original[key] ?? null))
}

export function replaceablePlanRow(actual, row, tracked) {
  if(!actual||actual.approved||actual.sent_to_store)return false
  const history=Array.isArray(tracked)?tracked:tracked?[tracked]:[]
  if(!history.some(entry=>unchangedPlanRow(actual,entry.row)))return false
  // A date rollover alone is not a new shopping decision.
  return ['item_name','qty','price','frequency','list_name','store_name_id'].some(key=>(actual[key]??null)!==(row[key]??null))
}

// Record the exact generated row before insertion. A later rejection may remove
// only that untouched row; manual edits and approvals always win.
export function prepareShoppingProvenance(progress, data, userId) {
  const generated={}
  recurringShoppingRows(progress,data,userId,new Date(),generated)
  progress.shoppingPlanRows ||= {}
  for(const [id,entry] of Object.entries(generated)) {
    const previous=progress.shoppingPlanRows[id]
    const history=previous?(Array.isArray(previous)?previous:[previous]):[]
    if(!history.some(p=>p.optionKey===entry.optionKey&&unchangedPlanRow(p.row,entry.row)))history.push(entry)
    progress.shoppingPlanRows[id]=history
  }
  return progress
}

export async function syncPlanShopping(sb, progress, data, userId, {insert=true} = {}) {
  const excluded=(progress.suggestionFeedback||[]).filter(f=>f.scope==='purchase'&&!f.restoredAt)
  if(excluded.length) {
    const ids=[...new Set(excluded.map(f=>planShoppingId(userId,f.subject)))]
    const {data:existing,error}=await sb.from('shopping_list').select('*').eq('user_id',userId).in('id',ids)
    if(error)throw new Error('Your preference is saved, but Shopping List could not be updated. Retry this change.')
    for(const actual of existing||[]) {
      const tracked=progress.shoppingPlanRows?.[actual.id]
      let source=(Array.isArray(tracked)?tracked:tracked?[tracked]:[]).find(entry=>unchangedPlanRow(actual,entry.row))
      // Migrate older generated rows only when every editable value still matches
      // the original plan saved on that day. Uncertain rows belong to the member.
      if(!source&&progress.quickPlan?.savedAt?.slice(0,10)===actual.order_date) {
        const legacy=structuredClone(progress),generated={}
        legacy.suggestionFeedback=[]
        for(const c of legacy.quickPlan.choices)if(c.decision==='excluded')c.decision='accept'
        recurringShoppingRows(legacy,data,userId,new Date(progress.quickPlan.savedAt),generated)
        source=generated[actual.id]
      }
      if(!source?.optionKey||!suggestionHidden(progress,source.optionKey)||!unchangedPlanRow(actual,source.row))continue
      let removal=sb.from('shopping_list').delete().eq('user_id',userId).eq('id',actual.id)
      for(const key of editableFields)removal=actual[key]==null?removal.is(key,null):removal.eq(key,actual[key])
      const result=await removal
      if(result.error)throw new Error('Your preference is saved, but Shopping List could not be updated. Retry this change.')
    }
  }
  if(!insert)return {count:0}
  const rows = recurringShoppingRows(progress, data, userId)
  if (!rows.length) return {count:0}
  const {error} = await sb.from('shopping_list').upsert(rows, {onConflict:'id', ignoreDuplicates:true})
  if (error) throw new Error('Your plan is saved, but Shopping List could not be updated. Save the plan again to retry.')
  // Follow a changed plan selection only while the row still matches recorded
  // provenance. Conditional writes also protect edits made during this save.
  for(const row of rows) {
    const {data:actual,error:readError}=await sb.from('shopping_list').select('*').eq('user_id',userId).eq('id',row.id).maybeSingle()
    if(readError)throw Error('Shopping retailer could not be checked. Retry saving your plan.')
    const replace=replaceablePlanRow(actual,row,progress.shoppingPlanRows?.[row.id])
    const repair=row.store_name_id&&actual?.store_name_id==null&&unchangedPlanRow(actual,{...row,store_name_id:null})
    if(replace||repair) {
      let update=sb.from('shopping_list').update(replace?row:{store_name_id:row.store_name_id}).eq('user_id',userId).eq('id',row.id)
      for(const key of editableFields)update=actual[key]==null?update.is(key,null):update.eq(key,actual[key])
      if((await update).error)throw Error('Shopping retailer could not be updated. Retry saving your plan.')
    }
  }
  return {count:rows.length}
}

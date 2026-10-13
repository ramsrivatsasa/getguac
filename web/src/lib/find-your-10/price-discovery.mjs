import {sameApparelSize} from './apparel-size.mjs'
import {recordedModel,productSearchQuery,containsModel} from './product-identity.mjs'
import {compatibleReviewOption,compatibilityVersion} from './compatible-products.mjs'
import {discoveryPriority} from './discovery-priority.mjs'
import {sameMeasurements} from './product-measurements.mjs'
import {offerCondition,comparableCondition} from './offer-condition.mjs'
import {purchaseGroups} from './wizard.mjs'
import {isDiningItem} from './opportunities.mjs'
import {isAirFilter,matchingFilter,packSize} from './filter-match.mjs'
const normalized=s=>String(s).toLowerCase().replace(/whitedove/g,'white dove').replace(/fl\s+oz/g,'oz').replace(/["\u2033]/g,' in ').replace(/\b(?:ct|ea)\b/g,'count').replace(/\b(?:1\s+)?dozen\b/g,'12 count').replace(/(\d)\s*x\s*(?=\d)/g,'$1 x ').replace(/(\d)w\b/g,'$1 watt').replace(/\bquart(?:s)?\b/g,'qt').replace(/\binches?\b/g,'in')
const terms=s=>normalized(s).match(/[a-z0-9]+/g)||[]
export function priceOptions(results, group, now=new Date()) {
 const latest=[...group.rows].sort((a,b)=>b.receipts.date.localeCompare(a.receipts.date))[0]
 if(group.rows.some(isDiningItem))return []
 const baseline=Math.round(latest.price/latest.qty*100)
 const units=normalized(group.title).match(/\b\d+(?:\.\d+)?\s*(?:oz|ml|lb|kg|pack|count|ct)\b/g)||[]
 const tokens=terms(group.title).filter(t=>t.length>2&&!['the','and','for','with','pack'].includes(t))
 const numbers=terms(group.title.replace(/\b1\s*-?\s*pack\b/ig,'')).filter(t=>/\d/.test(t))
 const egg=/\beggs?\b/i.test(group.title)
 if(egg&&!/\b\d+\s*(?:count|pack)\b/.test(normalized(group.title)))return []
 const requirements=['organic','cage free','free range','pasture raised','brown','white','extra large','large'].filter(t=>normalized(group.title).replace(/-/g,' ').includes(t))
 return results.flatMap(r=>{
  const cents=Math.round(Number(r.price)*100)
  let url;try{url=new URL(r.url);if(url.protocol!=='https:')return []}catch{return []}
  const title=String(r.title||r.matched_name||'')
  const model=recordedModel(group)
  const exactModel=model&&containsModel([title,r.model].filter(Boolean).join(' '),model)
  if(model&&!exactModel){const review=compatibleReviewOption(r,group,now);return review?[review]:[]}
  if(!sameApparelSize(group.title,title))return []
  if(!sameMeasurements(group.title,title))return []
  if(/\b(?:potting|soil)\b/i.test(group.title)&&['cactus','succulent','orchid','african violet','seed starting'].some(t=>title.toLowerCase().includes(t)&&!group.title.toLowerCase().includes(t)))return []
  if(egg&&/egg carton|flocked|decorative|artificial|miniature|hard boiled|liquid/i.test(title))return []
  if(r.available!==true||!comparableCondition(r)||r.installment||!r.store||!title||!Number.isFinite(cents)||cents<=0||cents>=baseline)return []
  if(/used|refurbished|renewed|parts only|replacement pads/i.test(title))return []
  if(egg&&requirements.some(t=>!normalized(title).replace(/-/g,' ').includes(t)))return []
  if(packSize(normalized(group.title))!==packSize(normalized(title)))return []
  const filter=isAirFilter(group.title)
  if(filter&&!matchingFilter(group.title,title))return []
  if(!filter&&units.filter(u=>!/^1\s*pack$/.test(u)).some(u=>!normalized(title).replace(/\s/g,'').includes(u.replace(/\s/g,''))))return []
  if(!filter&&numbers.some(t=>!terms(title).includes(t)))return []
  const matches=tokens.filter(t=>terms(title).includes(t)).length
  if(!filter&&!exactModel&&(matches<Math.max(1,Math.ceil(tokens.length*0.75))||!tokens.length))return []
  const ratingNote=filter&&!/\b(?:MERV|MPR|FPR)\s*\d+/i.test(group.title)?'Original filtration rating is not recorded. Confirm this rating suits your HVAC system; equivalent filtration is not verified. ':''
  return [{key:`quote:${url.href}`,choice:title,model:r.model,store:r.store,image:r.image,sourceLabel:'Product',condition:offerCondition(r),available:r.available,retailerVerification:r.retailerVerification||'unverified',retailerCheckedAt:r.retailerCheckedAt,retailerSourceUrl:r.retailerSourceUrl,sourceUrl:url.href,checkedAt:new Date(now).toISOString(),expiresAt:new Date(+new Date(now)+86400000).toISOString(),alternativeCents:cents,estimateCents:baseline-cents,needsPrice:false,editableHomeCost:false,basis:'one future purchase',tradeoff:`${r.store}. Listed price before tax, shipping and fees. Compare fit, size and features; equal quality and local stock are not assumed. ${ratingNote}${r.notes||''}`}]
 }).sort((a,b)=>a.alternativeCents-b.alternativeCents).filter((r,i,all)=>all.findIndex(x=>x.sourceUrl===r.sourceUrl)===i).slice(0,3)
}
export async function refreshPlanQuotes(data,{search,previous={},now=new Date(),limit=5}={}) {
 const stamp=new Date(now).toISOString()
 const groups=discoveryPriority(purchaseGroups(data,now).filter(g=>!g.rows.some(isDiningItem)&&!/medicine|medical|prescription|baby|insulin/i.test(g.title+' '+g.rows.map(r=>r.category||'').join(' '))),data,now)
 const quotes=Object.fromEntries(groups.filter(g=>previous[g.key]&&String(previous[g.key].productModel||'')===recordedModel(g)&&String(previous[g.key].compatibilityVersion||'')===compatibilityVersion(g)).map(g=>[g.key,previous[g.key]]))
 if(typeof search!=='function')return quotes
 const pending=groups.filter(g=>{const q=quotes[g.key];return !q||(q.status==='error'?!q.attemptedAt||+new Date(now)-Date.parse(q.attemptedAt)>=900000:!q.checkedAt||!Number.isFinite(Date.parse(q.checkedAt))||+new Date(now)-Date.parse(q.checkedAt)>=86400000)}).sort((a,b)=>(quotes[a.key]?.attemptedAt||quotes[a.key]?.checkedAt||'').localeCompare(quotes[b.key]?.attemptedAt||quotes[b.key]?.checkedAt||''))
 await Promise.all(pending.slice(0,Math.max(0,Math.min(5,limit))).map(async group=>{const productModel=recordedModel(group),version=compatibilityVersion(group);try{const results=await search(productSearchQuery(group),group);if(!Array.isArray(results))throw Error('Invalid shopping response');const options=priceOptions(results,group,now);quotes[group.key]={productModel,compatibilityVersion:version,attemptedAt:stamp,checkedAt:stamp,status:options.length?'found':'no_match',options}}catch{quotes[group.key]={...quotes[group.key],productModel,compatibilityVersion:version,attemptedAt:stamp,status:'error',options:quotes[group.key]?.options||[]}}}))
 return quotes
}

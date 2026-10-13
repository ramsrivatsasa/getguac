import {serpApiShopping,resolveShoppingStores} from '../serpShopping.js'
import {isAirFilter} from './filter-match.mjs'
import {enrichRetailerOffer} from './retailer-evidence.mjs'
import {priceOptions} from './price-discovery.mjs'
import {productSearchQuery,recordedModel,containsModel} from './product-identity.mjs'
import {offerCondition} from './offer-condition.mjs'
import {tavilySearchKey} from '../tavily-search.mjs'
import {searchTavilyProducts} from './tavily-products.mjs'
import {searchCompatibleProducts} from './compatible-search.mjs'
export async function searchPlanProducts(query,group,options={}) {
  query=productSearchQuery({...group,title:query})
  // Explicit injected providers retain their existing behavior for callers/tests.
  if(options.search)return searchShoppingProducts(query,group,options)
  const fallback=options.fallback||searchTavilyProducts
  const enabled=await (options.tavilyConfigured||tavilySearchKey)()
  const compatible=Promise.resolve().then(()=>enabled&&(!options.primary&&!options.fallback||options.compatible)?(options.compatible||searchCompatibleProducts)(group):[]).then(rows=>({rows}),error=>({error}))
  let rows,error
  try {rows=await (options.primary||searchShoppingProducts)(query,group,options)}catch(e){error=e}
  if(!rows?.length&&enabled)try{rows=await fallback(query,group)}catch(e){error=e}
  const {rows:related=[],error:relatedError}=await compatible
  if(rows?.length||related.length)return [...(rows||[]),...related]
  if(error)throw error
  if(relatedError)throw relatedError
  return rows||[]
}
async function searchShoppingProducts(query,group,{search=serpApiShopping,resolve=resolveShoppingStores,verify=enrichRetailerOffer}={}) {
  const filter=isAirFilter(query)
  const searchQuery=query+(/\beggs?\b/i.test(query)?' grocery':'')
  const rows=await search(searchQuery,{timeoutMs:12000})
  // Google URLs screen candidates only; only resolved retailer offers are persisted.
  const latest=[...group.rows].sort((a,b)=>b.receipts.date.localeCompare(a.receipts.date))[0]
  const words=query.toLowerCase().match(/[a-z]{3,}/g)||[]
  const specialty=/\b(?:potting|soil)\b/i.test(query)?['cactus','succulent','orchid','african violet','seed starting']:[]
  const candidates=rows.filter(row=>!specialty.some(term=>row.title.toLowerCase().includes(term)&&!query.toLowerCase().includes(term))&&row.price>0&&row.price<latest.price/latest.qty&&
    (recordedModel(group)?containsModel([row.title,row.model].filter(Boolean).join(' '),recordedModel(group)):filter?isAirFilter(row.title):words.filter(w=>row.title.toLowerCase().includes(w)).length>=Math.max(2,Math.ceil(words.length/2))))
    .sort((a,b)=>words.filter(w=>b.title.toLowerCase().includes(w)).length-words.filter(w=>a.title.toLowerCase().includes(w)).length).slice(0,3)
  const results=await Promise.allSettled(candidates.map(row=>resolve(row,{timeoutMs:12000})))
  const resolved=results.filter(r=>r.status==='fulfilled').flatMap(r=>r.value)
  const plausible=resolved.filter(row=>offerCondition(row)!=='pre-owned'&&priceOptions([{...row,condition:'new',available:true}],group).length).slice(0,6)
  // Preserve a qualifying result from independent sellers, but never cache an
  // incomplete lookup as a successful no-match.
  if(!plausible.length&&results.some(r=>r.status==='rejected'))throw Error('Retailer details unavailable; retry discovery')
  const verified=await Promise.all(plausible.map(row=>verify(row)))
  const usable=verified.filter(row=>priceOptions([row],group).length)
  if(!usable.length&&verified.some(row=>['unavailable','unverified'].includes(row.retailerVerification)))throw Error('Retailer details unavailable; retry discovery')
  return usable
}

import {tavilySearch} from '../tavily-search.mjs'
import {retailerHtml,retailerOfferEvidence} from './retailer-evidence.mjs'
import {priceOptions} from './price-discovery.mjs'

const retailers=['walmart.com','target.com','homedepot.com','lowes.com','kroger.com','bestbuy.com','acehardware.com','sherwin-williams.com','deltafaucet.com','nike.com','underarmour.com','oldnavy.gap.com','ae.com','abercrombie.com']
export function supportedRetailerUrl(raw) {
  try {const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&retailers.some(d=>u.hostname===d||u.hostname.endsWith('.'+d))}catch{return false}
}
export function productNames(html) {
  const names=[]
  function visit(v){if(!v||typeof v!=='object')return;if([].concat(v['@type']||[]).some(t=>String(t).split('/').pop()==='Product')&&typeof v.name==='string')names.push(v.name);for(const c of Object.values(v))if(c&&typeof c==='object')if(Array.isArray(c))c.forEach(visit);else visit(c)}
  for(const script of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))try{visit(JSON.parse(script[1]))}catch{}
  return [...new Set(names)]
}
// Search snippets are discovery leads only: prices come from retailer Offer data.
export async function searchTavilyProducts(query,group,{search=tavilySearch,read=retailerHtml,now=new Date()}={}) {
  const results=await search(query,{domains:retailers})
  const urls=[...new Set(results.map(r=>r.url).filter(supportedRetailerUrl))].slice(0,5)
  const checked=await Promise.allSettled(urls.map(async url=>{
    const page=await read(url)
    if(!supportedRetailerUrl(page.url||url))throw Error('Unsupported retailer redirect')
    let verified=0
    const offers=productNames(page.html).flatMap(title=>{
      const listing={title,url:page.url||url,store:new URL(page.url||url).hostname.replace(/^www\./,''),source:'tavily'}
      const evidence=retailerOfferEvidence(page.html,listing,now)
      if(!evidence)return []
      verified++
      const offer={...listing,...evidence}
      return priceOptions([offer],group,now).length?[offer]:[]
    })
    if(!verified)throw Error('Retailer price data unavailable')
    return offers
  }))
  const offers=checked.filter(r=>r.status==='fulfilled').flatMap(r=>r.value)
  if(!offers.length&&checked.some(r=>r.status==='rejected'))throw Error('Tavily retailer details unavailable; retry discovery')
  return offers.slice(0,6)
}

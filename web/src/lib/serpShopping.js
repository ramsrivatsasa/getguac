import {shoppingSearchKey} from './shopping-search-config.mjs'
// SerpApi Google Shopping client — shared by /api/best-prices and the
// cache-warming cron. Returns enriched product results (photos, ratings,
// review counts, sale prices, store names). Server-only (reads SERPAPI_KEY).

export async function serpApiShopping(query, {timeoutMs=10000} = {}) {
  const key = await shoppingSearchKey()
  if (!key) throw new Error('Shopping search is not configured')
  const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&num=40&q=${encodeURIComponent(query)}&api_key=${key}`
  const res = await fetch(url, {signal:AbortSignal.timeout(timeoutMs)})
  if (!res.ok) throw new Error(`SerpApi ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error('Shopping provider returned an error')
  // SerpApi splits results across shopping_results AND inline_shopping_results
  // — merge both so we don't end up with just 1–2 items.
  const items = [
    ...(Array.isArray(json.shopping_results) ? json.shopping_results : []),
    ...(Array.isArray(json.inline_shopping_results) ? json.inline_shopping_results : []),
  ]
  const seen = new Set()
  return items.map(it => {
    const price = Number(it.extracted_price) || 0
    const orig = Number(it.old_price_extracted ?? it.extracted_old_price) || 0
    const link = String(it.link || '')
    const productLink = String(it.product_link || '')
    return {
      store: String(it.source || it.seller || '').trim(),
      price,
      original_price: orig > price ? orig : 0,
      // url = a DIRECT merchant link (→ "View deal"); google_url = the exact
      // Google product page (→ "View on Google") when no merchant link exists.
      url: link && !/\bgoogle\.[a-z.]+\//i.test(link) ? link : '',
      google_url: productLink,
      product_id: String(it.product_id || ''),
      immersiveToken: String(it.immersive_product_page_token || ''),   // for the on-click direct-merchant resolver
      image: String(it.thumbnail || ''),
      title: String(it.title || ''),
      rating: Math.min(5, Math.max(0, Number(it.rating) || 0)),
      review_count: Math.max(0, Math.round(Number(it.reviews) || 0)),
      specs: Array.isArray(it.extensions) ? it.extensions.join(' · ') : String(it.extensions || ''),
      available: /out of stock|unavailable/i.test(String(it.availability||'')) ? false : null,
      condition: String(it.second_hand_condition || ''),
      installment: Boolean(it.installment),
      notes: String(it.delivery || '').trim(),
      matched_name: String(it.title || ''),
    }
  }).filter(r => r.store && r.price > 0)
    .sort((a, b) => a.price - b.price)
    .filter(r => {                     // dedup overlapping titles across the two arrays
      const k = [r.title,r.store,r.url,r.product_id].join('|').toLowerCase().trim()
      if (!k) return true
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .slice(0, 30)
}

/** Build the /api/best-prices-shaped payload for a query (or null if no hits). */
export async function buildSerpPayload(query, enhancement = null) {
  const results = await serpApiShopping(query)
  if (!results.length) return null
  return {
    query,
    broadened_query: null,
    mode: 'serpapi',
    results,
    sources: [],
    enhancement: enhancement || {
      original: query, enhanced: query, applied_aliases: [], category: null, matched_stash: null,
    },
    _model: 'serpapi:google_shopping',
  }
}

export async function resolveShoppingStores(item,{timeoutMs=7000}={}) {
  if(item.url)return [item]
  if(!item.immersiveToken)return []
  const key=await shoppingSearchKey()
  if(!key)throw Error('Shopping search is not configured')
  const url=new URL('https://serpapi.com/search.json')
  url.search=new URLSearchParams({engine:'google_immersive_product',page_token:item.immersiveToken,api_key:key})
  const response=await fetch(url,{signal:AbortSignal.timeout(timeoutMs)})
  if(!response.ok)throw Error(`Shopping detail HTTP ${response.status}`)
  const result=await response.json()
  if(result.error)throw Error('Shopping detail provider returned an error')
  return (result.product_results?.stores||[]).flatMap(store=>{
    let link;try{link=new URL(store.link)}catch{return []}
    if(link.protocol!=='https:'||/(^|\.)google\.[a-z.]+$/.test(link.hostname))return []
    const notes=(store.details_and_offers||[]).join(' · ')
    return [{...item,title:store.title||result.product_results.title||item.title,store:store.name,url:link.href,
      price:Number(store.extracted_price),available:/out of stock|unavailable/i.test(notes)?false:null,
      condition:/\bused\b|pre[ -]?owned|refurbished|renewed|open[ -]?box/i.test(notes)?'pre-owned':store.condition||store.second_hand_condition||item.condition||'',installment:/\/mo|per month|installment/i.test(store.price||''),
      notes,immersiveToken:undefined}]
  })
}

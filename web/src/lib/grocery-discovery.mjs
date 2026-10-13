import { tavilySearch } from './tavily-search.mjs'
import { retailerHtml, retailerOfferEvidence } from './find-your-10/retailer-evidence.mjs'
import { productNames } from './find-your-10/tavily-products.mjs'
import { cacheKeyFor, getCachedSearch, setCachedSearch } from './shoppingCache.js'

const domains = ['walmart.com', 'target.com', 'kroger.com', 'safeway.com', 'aldi.us', 'wegmans.com', 'giantfood.com']
const words = value => String(value || '').toLowerCase().replace(/(\d+(?:\.\d+)?)\s*(gal|gallon|oz|lb)\b/g, '$1 $2').replace(/\bgal\b|\bgallons\b/g, 'gallon').replace(/\blbs?\b|\bpounds\b/g, 'pound').replace(/\boz\b|\bounces\b/g, 'ounce').match(/\d+(?:\.\d+)?|[a-z]+/g) || []
export function grocerySpecMatches(item, title) {
  const identity = words(item.item_name), specs = words(item.comments)
  if (!identity.length || !specs.length) return false
  const candidate = words(title)
  const declared = `${item.item_name} ${item.comments}`.toLowerCase()
  if (/\borganic\b/i.test(title) !== /\borganic\b/.test(declared) || /lactose\s*free/i.test(title) !== /lactose\s*free/.test(declared)) return false
  // Missing variety/size is a review lead, not a match. Explicit specifications
  // must all appear; model numbers and price alone cannot establish equivalence.
  return identity.every(token => candidate.includes(token)) && specs.every(token => candidate.includes(token))
}
function supported(raw) {
  try { const u = new URL(raw); return u.protocol === 'https:' && !u.username && !u.password && !u.port && domains.some(domain => u.hostname === domain || u.hostname.endsWith('.' + domain)) } catch { return false }
}
function localOfferEvidence(html, postalCode, title) {
  if (!/^\d{5}$/.test(postalCode || '')) return false
  const postals = new Set()
  function visit(value) {
    if (!value || typeof value !== 'object') return
    if ([].concat(value['@type'] || []).some(type => String(type).split('/').pop() === 'Product') && value.name === title) {
      for (const offer of [].concat(value.offers || [])) for (const place of [].concat(offer.availableAtOrFrom || [])) {
        const postal = String(place?.address?.postalCode || ''); if (postal) postals.add(postal)
      }
    }
    for (const child of Object.values(value)) if (child && typeof child === 'object') Array.isArray(child) ? child.forEach(visit) : visit(child)
  }
  for (const script of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) try { visit(JSON.parse(script[1])) } catch {}
  // Ambiguous pages with several store prices cannot identify one local quote.
  return postals.size === 1 && postals.has(postalCode)
}
export function groceryCacheKey(item, postalCode) { return cacheKeyFor(`groceries-v2:US:USD:${postalCode || 'national'}:${`${item.item_name} ${item.comments || ''}`.slice(0, 200)}`) }
export async function cachedGroceryItems(sb, items, postalCode) {
  if (!items.length) return {}
  const keys = items.map(item => groceryCacheKey(item, postalCode))
  const { data, error } = await sb.from('shopping_cache').select('cache_key,payload,updated_at').in('cache_key', keys).gte('updated_at', new Date(Date.now() - 86400000).toISOString())
  if (error) return {}
  const results = new Map((data || []).filter(row => Date.now() - Date.parse(row.payload?.checkedAt || '') < 86400000).map(row => [row.cache_key, row.payload]))
  return Object.fromEntries(items.filter(item => results.has(groceryCacheKey(item, postalCode))).map(item => [item.id, { ...results.get(groceryCacheKey(item, postalCode)), itemId: item.id }]))
}
export async function discoverGroceryItem(item, { postalCode, now = new Date(), search = tavilySearch, read = retailerHtml, getCache = getCachedSearch, setCache = setCachedSearch } = {}) {
  if (!item.comments?.trim()) return { itemId: item.id, status: 'needs_specification', quotes: [], checkedAt: now.toISOString() }
  const query = `${item.item_name} ${item.comments}`.slice(0, 200)
  const key = groceryCacheKey(item, postalCode)
  const cached = await getCache(key)
  if (cached && now.getTime() - Date.parse(cached.checkedAt) < 86400000) return { ...cached, itemId: item.id }
  const leads = await search(query, { domains })
  const checked = await Promise.allSettled([...new Set(leads.map(lead => lead.url).filter(supported))].slice(0, 3).map(async url => {
    const page = await read(url)
    if (!supported(page.url || url)) return []
    return productNames(page.html).filter(title => grocerySpecMatches(item, title)).flatMap(title => {
      const listing = { title, url: page.url || url }, evidence = retailerOfferEvidence(page.html, listing, now)
      if (!evidence || evidence.available !== true || evidence.condition === 'pre-owned') return []
      return [{ title, storeId: new URL(listing.url).hostname.replace(/^www\./, ''), unitCents: Math.round(evidence.price * 100), currency: 'USD', sourceUrl: listing.url, checkedAt: now.toISOString(), available: true, verified: true, locationVerified: localOfferEvidence(page.html, postalCode, title), specKey: query.toLowerCase() }]
    })
  }))
  const quotes = checked.filter(r => r.status === 'fulfilled').flatMap(r => r.value).slice(0, 6)
  const matchingLead = leads.some(lead => supported(lead.url) && grocerySpecMatches(item, lead.title))
  const result = { status: quotes.length ? 'found' : matchingLead || checked.some(r => r.status === 'rejected') ? 'unavailable' : 'no_match', quotes, checkedAt: now.toISOString() }
  await setCache(key, result)
  return { ...result, itemId: item.id }
}
export async function refreshSavedGroceryBasket(sb, userId, metadata, { limit = 2, now = new Date() } = {}) {
  const ids = metadata.grocery_basket?.itemIds || []
  if (!ids.length || metadata.country_code !== 'US' || metadata.preferred_currency !== 'USD') return { status: 'not_requested', checked: 0, remaining: 0 }
  const { data: items, error } = await sb.from('shopping_list').select('id,item_name,comments').eq('user_id', userId).eq('approved', true).eq('sent_to_store', false).eq('list_name', 'Grub & Grab').in('id', ids.slice(0, 40))
  if (error) throw Error('Saved grocery basket unavailable')
  const postalCode = metadata.postal_code || metadata.find10_postal_code
  const previous = await cachedGroceryItems(sb, items, postalCode)
  const stale = items.filter(item => item.comments?.trim() && !previous[item.id])
  const batch = stale.slice(0, Math.min(2, limit))
  const results = await Promise.allSettled(batch.map(item => discoverGroceryItem(item, { postalCode, now })))
  return { status: results.some(r => r.status === 'rejected') ? 'unavailable' : stale.length > batch.length ? 'partial' : 'checked', checked: batch.length, remaining: Math.max(0, stale.length - batch.length), checkedAt: now.toISOString(), basis: 'Bounded cached merchant listing checks; estimates require matching local evidence and extra costs.' }
}

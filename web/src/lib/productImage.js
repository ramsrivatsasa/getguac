// Product image resolver — returns a catalog-quality image URL for a
// given item name. Cached forever in public.product_images so each
// unique item costs at most one Google Custom Search call ever.
//
// Why Google Custom Search Image API:
//   - Free tier: 100 queries/day (covers small-scale usage)
//   - Pay-as-you-go: ~$5 per 1000 queries above the free tier
//   - Best image quality for arbitrary item names (groceries, plants,
//     household goods, electronics) vs alternatives like Open Food
//     Facts (grocery only) or Bing Image Search (more $ at scale)
//
// Config:
//   - GOOGLE_CSE_API_KEY — your API key from
//     https://developers.google.com/custom-search/v1/introduction
//   - GOOGLE_CSE_CX — your Custom Search Engine ID configured for
//     image search at https://programmablesearchengine.google.com
//
// If either env var is missing we DEGRADE GRACEFULLY: the lookup
// returns null, the cache write is skipped, and the consumer
// (share landing page) renders the brand logo + emoji fallback.

import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Normalize an item name into a stable cache key. Lowercase, strip
// non-alphanumeric, collapse whitespace. Matches the same shape as
// price_lookups.cache_key so the two caches can correlate if we ever
// need to (e.g. "show price + image side by side" in a future
// surface).
export function imageCacheKey(itemName) {
  return String(itemName || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

// Single-item resolver. Checks the cache, then Google CSE on miss.
// Returns null when nothing can be resolved (env vars missing, CSE
// returns no results, etc.). Never throws.
export async function resolveProductImage(itemName) {
  const key = imageCacheKey(itemName)
  if (!key) return null
  const sb = admin()

  // 1. Cache lookup. Bumps hit_count atomically (best-effort).
  try {
    const { data: cached } = await sb
      .from('product_images')
      .select('image_url, hit_count')
      .eq('cache_key', key)
      .maybeSingle()
    if (cached) {
      // Fire-and-forget hit-count bump.
      sb.from('product_images')
        .update({ hit_count: (cached.hit_count || 0) + 1 })
        .eq('cache_key', key)
        .then(() => {}, () => {})
      return cached.image_url || null
    }
  } catch {}

  // 2. Cache miss — call Google CSE if configured.
  const apiKey = process.env.GOOGLE_CSE_API_KEY
  const cx = process.env.GOOGLE_CSE_CX
  if (!apiKey || !cx) return null

  let imageUrl = null
  let raw = null
  try {
    const u = new URL('https://www.googleapis.com/customsearch/v1')
    u.searchParams.set('key', apiKey)
    u.searchParams.set('cx', cx)
    u.searchParams.set('q', itemName)
    u.searchParams.set('searchType', 'image')
    u.searchParams.set('num', '1')
    u.searchParams.set('imgSize', 'large')
    u.searchParams.set('safe', 'active')
    const res = await fetch(u.toString(), {
      method: 'GET',
      // 8-second cap so a stuck CSE response can't pin a share-create
      // call. The user's share still works without an image.
      signal: AbortSignal.timeout(8000),
    })
    raw = await res.json().catch(() => null)
    if (res.ok && raw?.items?.length > 0) {
      imageUrl = raw.items[0].link || null
    }
  } catch (e) {
    if (typeof console !== 'undefined') {
      console.warn('[productImage] CSE call failed:', e.message)
    }
  }

  // 3. Persist whatever we got (including null on legitimate "no
  // results" so we don't re-query the same dead-end item).
  try {
    await sb.from('product_images').upsert({
      cache_key: key,
      image_url: imageUrl,
      source: 'google_cse',
      raw: raw ? { items_count: raw.items?.length || 0 } : null,
      checked_at: new Date().toISOString(),
    }, { onConflict: 'cache_key' })
  } catch {}

  return imageUrl
}

// Bulk variant — resolves a set of item names in parallel. Used by
// /api/share/create to enrich every tile in a share payload without
// firing the calls one-at-a-time. Promise.allSettled keeps a single
// failure from poisoning the whole share.
export async function resolveProductImages(itemNames) {
  const unique = [...new Set(itemNames.map(n => imageCacheKey(n)).filter(Boolean))]
  if (unique.length === 0) return new Map()
  const results = await Promise.allSettled(
    unique.map(async key => {
      // Re-derive original name from the first matching input — the
      // CSE call wants the human-readable item name, not the cache key.
      const orig = itemNames.find(n => imageCacheKey(n) === key)
      const url = await resolveProductImage(orig)
      return [key, url]
    })
  )
  const out = new Map()
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      const [key, url] = r.value
      if (url) out.set(key, url)
    }
  }
  return out
}

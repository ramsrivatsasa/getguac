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

  // 2. Cache miss — try Wikipedia first (free, no key, great for
  // generic groceries like "Cauliflower" / "Mint" / "Olive Oil"),
  // then fall back to Google CSE (paid, broad coverage for brand
  // names) when configured. The order means we never burn the CSE
  // quota on items Wikipedia already has.
  let imageUrl = null
  let source = null
  let raw = null

  // ── Try Wikipedia ─────────────────────────────────────────────────
  // Strip qty/size suffixes ("Cauliflower 1.5LB" → "Cauliflower") so
  // the lookup hits the article. Title-cased for path matching.
  //
  // Many common-food articles redirect through a disambig page that
  // has no thumbnail (Mint, Salt, Lemon) — for those we try a second
  // pass with `_(food)` appended (Wikipedia's standard disambig
  // suffix for food articles).
  const cleaned = cleanProductNameForLookup(itemName)
  if (cleaned.length >= 3) {
    // Alias map for common food terms whose Wikipedia article lives
    // under a non-obvious title. We try the alias FIRST so we skip
    // the disambig dance. Easy to extend — add a pair whenever a new
    // Stash item misses for predictable reasons.
    const WIKI_ALIASES = {
      'Mint':         'Mentha',
      'Pepper':       'Black pepper',
      'Coconut Milk': 'Coconut milk',
      'Hot Sauce':    'Hot sauce',
    }
    const alias = WIKI_ALIASES[cleaned]
    const candidates = alias
      ? [alias, cleaned, `${cleaned} (food)`]
      : [cleaned, `${cleaned} (food)`]
    for (const candidate of candidates) {
      const r = await wikipediaSummary(candidate)
      if (r?.thumbnail) {
        imageUrl = r.thumbnail
        source = 'wikipedia'
        raw = { wiki_title: r.title || candidate, wiki_candidate: candidate }
        break
      }
    }
  }

  // ── Fall back to Google CSE (if configured) ──────────────────────
  const apiKey = process.env.GOOGLE_CSE_API_KEY
  const cx = process.env.GOOGLE_CSE_CX
  if (!imageUrl && apiKey && cx) {
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
        signal: AbortSignal.timeout(8000),
      })
      raw = await res.json().catch(() => null)
      if (res.ok && raw?.items?.length > 0) {
        imageUrl = raw.items[0].link || null
        source = 'google_cse'
      }
    } catch (e) {
      if (typeof console !== 'undefined') {
        console.warn('[productImage] CSE call failed:', e.message)
      }
    }
  }

  // 3. Persist whatever we got (including null on legitimate "no
  // results" so we don't re-query the same dead-end item).
  try {
    await sb.from('product_images').upsert({
      cache_key: key,
      image_url: imageUrl,
      source: source || (apiKey ? 'cse_miss' : 'wiki_miss'),
      raw,
      checked_at: new Date().toISOString(),
    }, { onConflict: 'cache_key' })
  } catch {}

  return imageUrl
}

/**
 * Single Wikipedia REST summary fetch. Returns { thumbnail, title }
 * or null on miss/error. Pulled out so the resolver can call it
 * twice (once with the base name, once with `_(food)` suffix to
 * skip past disambig pages that lack thumbnails).
 */
async function wikipediaSummary(title) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GetGuac/0.3 (https://getguac.app)',
      },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    const thumb = data?.thumbnail?.source
    if (!thumb) return null
    return { thumbnail: thumb, title: data?.title || title }
  } catch (_) {
    return null
  }
}

/**
 * Clean a raw item name to a generic concept Wikipedia is likely
 * to know.
 *   "Cauliflower 1.5LB"   → "Cauliflower"
 *   "MINT 1 OZ"           → "Mint"
 *   "Organic Avocado HASS" → "Avocado"
 *   "Fresh Strawberries 2lb" → "Strawberries"
 *
 * Pure function so it can be tested without a network call.
 */
export function cleanProductNameForLookup(rawName) {
  if (!rawName) return ''
  let s = String(rawName).trim()
  // Strip multi-word units first: "Coconut Milk 13.5 fl oz" →
  // "Coconut Milk". Pattern is "<number> fl oz/floz" optionally
  // followed by anything else.
  s = s.replace(/\s+\d+(\.\d+)?\s*fl\.?\s*oz\.?.*$/i, '')
  // Strip qty/size suffix: "Cauliflower 1.5LB" → "Cauliflower"
  s = s.replace(/\s+\d+(\.\d+)?\s*(lb|lbs|oz|kg|g|ml|l|ct|count|pack|pk|x\d+|-pack)\b.*$/i, '')
  // Strip trailing bare number: "Mint 1" → "Mint"
  s = s.replace(/\s+\d+(\.\d+)?\s*$/, '')
  s = s.replace(/\s{2,}/g, ' ').trim()
  // Strip leading "Organic"/"Fresh"/"Frozen" etc.
  const STRIP = ['organic','fresh','frozen','roasted','raw','whole','natural','pure','premium','kirkland','great value']
  const lower = s.toLowerCase()
  for (const p of STRIP) {
    if (lower.startsWith(`${p} `)) { s = s.slice(p.length + 1).trim(); break }
  }
  // Drop trailing all-caps variety codes ("Avocado HASS" → "Avocado")
  const parts = s.split(/\s+/)
  if (parts.length > 1 && /^[A-Z]{2,5}$/.test(parts[parts.length - 1])) parts.pop()
  s = parts.join(' ')
  // Title-case (Wikipedia paths are case-sensitive)
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
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

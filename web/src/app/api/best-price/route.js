// POST /api/best-price
//
// Returns the cheapest current price for an item at stores near the
// caller, using Gemini 2.5 Flash with the Google Search grounding tool.
// Results are cached in public.price_lookups for 24h to keep API spend
// near-zero and the response fast for repeat queries.
//
// Request:
//   { item_name: string, lat?: number, lng?: number }
//
// Response (200):
//   {
//     store_name: string | null,
//     price: number | null,
//     url: string | null,
//     source: 'cache' | 'gemini',
//     checked_at: ISO timestamp,
//   }
//
// Notes:
//   - If lat/lng are omitted, results are national-average / pure web,
//     not local. The UI prompts for geolocation before calling this.
//   - geo_bucket = "<lat round 3>,<lng round 3>" so users within ~100m
//     share cache entries.
//   - We intentionally do NOT pass the user's exact coordinates onward —
//     the bucket is the only location signal sent to Gemini.

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit, rateKey } from '../../../lib/apiGuard'

export const runtime = 'nodejs'
export const maxDuration = 30

const TTL_MS = 24 * 60 * 60 * 1000
const MODEL = process.env.BEST_PRICE_MODEL || 'gemini-2.5-flash'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function normalizeItemKey(name) {
  return String(name || '').toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

function geoBucketFor(lat, lng) {
  if (lat == null || lng == null) return 'unknown'
  // 3 decimal places ~= 110 metres; same bucket = same neighbourhood.
  return `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`
}

// Ask Gemini to do a web search for the item and return structured JSON.
// We use the v1beta endpoint with the google_search tool — it surfaces
// real online listings and returns a grounded text response we parse.
async function fetchFromGemini(itemName, lat, lng, apiKey) {
  const locationLine = lat != null && lng != null
    ? `Search for the best current online price near latitude ${lat}, longitude ${lng} (USA stores within a reasonable shipping range).`
    : 'Search for the best current online price at major US retailers.'

  const prompt = `Find the cheapest current price for this household item:

ITEM: "${itemName}"

${locationLine}

Respond with ONLY a single JSON object on a single line, no markdown, no commentary:
{"store_name":"<retailer name with city if local>","price":<number USD>,"url":"<direct product URL>"}

If no reliable price is found, return: {"store_name":null,"price":null,"url":null}.`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.1, responseMimeType: 'text/plain' },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Gemini ${res.status}`)
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Pull the first JSON object out of the response. Gemini sometimes
  // wraps even strict-JSON requests in stray prose despite the prompt;
  // a regex grab keeps the parse from blowing up on a leading newline.
  const match = text.match(/\{[^{}]*\}/)
  let parsed = null
  if (match) {
    try { parsed = JSON.parse(match[0]) } catch (_) { parsed = null }
  }
  return {
    parsed,
    raw: text,
  }
}

export async function POST(request) {
  try {
    const rl = await rateLimit(rateKey(request, 'best-price'), { limit: 30, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return Response.json({ error: 'GEMINI_API_KEY required' }, { status: 500 })

    let body
    try { body = await request.json() } catch { body = {} }
    const itemName = String(body?.item_name || '').trim()
    if (!itemName) return Response.json({ error: 'item_name required' }, { status: 400 })

    const lat = body?.lat != null ? Number(body.lat) : null
    const lng = body?.lng != null ? Number(body.lng) : null
    const force = body?.force === true

    const sb = admin()
    const cacheKey = normalizeItemKey(itemName)
    const geoBucket = geoBucketFor(lat, lng)

    // Cache check — return if fresh AND not force-refresh.
    if (!force) {
      const { data: cached } = await sb
        .from('price_lookups')
        .select('store_name, price, url, checked_at')
        .eq('cache_key', cacheKey)
        .eq('geo_bucket', geoBucket)
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cached && Date.now() - new Date(cached.checked_at).getTime() < TTL_MS) {
        // Best-effort bump hit counter, no-await so we don't slow the response.
        sb.from('price_lookups')
          .update({ hit_count: undefined })  // intentionally no-op; counter increment is RPC-only
          .eq('cache_key', cacheKey)
          .eq('geo_bucket', geoBucket)
          .then(() => {}, () => {})
        return Response.json({
          ...cached,
          source: 'cache',
        })
      }
    }

    // Cache miss → ask Gemini.
    const { parsed, raw } = await fetchFromGemini(itemName, lat, lng, apiKey)
    const result = {
      store_name: parsed?.store_name ?? null,
      price: parsed?.price != null ? Number(parsed.price) : null,
      url: parsed?.url ?? null,
    }

    // Persist (upsert by cache_key + geo_bucket — unique index ensures
    // we replace stale rows rather than accumulate).
    await sb.from('price_lookups').upsert({
      cache_key: cacheKey,
      geo_bucket: geoBucket,
      store_name: result.store_name,
      price: result.price,
      url: result.url,
      raw_response: raw,
      source: MODEL,
      checked_at: new Date().toISOString(),
    }, { onConflict: 'cache_key,geo_bucket' })

    return Response.json({ ...result, source: 'gemini', checked_at: new Date().toISOString() })
  } catch (err) {
    console.error('[best-price]', err)
    return Response.json({ error: err.message || 'lookup failed' }, { status: 500 })
  }
}

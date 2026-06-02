// POST /api/product-image-batch
//
// Batch image resolver for the Stash card list. Body: { names: [..] }
// Returns: { images: { "cache-key": "https://..." } }
//
// Strategy comes from web/src/lib/productImage.js — public.product_images
// table holds the cache; Google Custom Search Image API fills misses.
// If GOOGLE_CSE_API_KEY isn't configured, the endpoint still serves
// the cached hits and returns nothing for misses (UI falls back to
// the category emoji).
//
// Same auth model as /api/guacoscore — needs a Supabase session.
//
// Used by web/src/app/(dashboard)/stash/page.jsx and mobile Stash
// to decorate each card with `imageUrl`.

import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { resolveProductImages, imageCacheKey } from '../../../lib/productImage'

export async function POST(req) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const names = Array.isArray(body?.names) ? body.names.filter(n => typeof n === 'string' && n.trim().length > 0) : []
  if (names.length === 0) return NextResponse.json({ images: {} })
  // Cap the batch — Google CSE has a 100/day free tier; a runaway
  // call here could burn it on a single page render.
  const capped = names.slice(0, 80)

  const map = await resolveProductImages(capped)
  const images = {}
  // Output is keyed by the cache key so the client can correlate
  // back via the same imageCacheKey() helper without exposing the
  // server-side normalization details.
  for (const [key, url] of map.entries()) images[key] = url
  // Also include the cache key for each requested name so the client
  // doesn't have to re-derive it.
  const byName = {}
  for (const n of capped) {
    const k = imageCacheKey(n)
    if (images[k]) byName[n] = images[k]
  }
  return NextResponse.json({ images, byName })
}

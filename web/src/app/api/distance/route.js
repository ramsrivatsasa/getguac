// Distance calculator — geocodes two addresses via OpenStreetMap Nominatim
// (free, no API key) and returns approximate driving miles between them.
//
// Returns straight-line distance (Haversine) × 1.3 to estimate road circuity.
// For exact driving distance, swap in Google Distance Matrix or OpenRouteService.

import { rateLimit, rateKey } from '../../../lib/apiGuard'
export const runtime = 'nodejs'

const EARTH_MILES = 3958.8
const ROAD_FACTOR = 1.3   // straight-line → typical road distance

// Reverse geocode lat/lng → human-readable address (for "Use my location")
export async function GET(request) {
  try {
    // Nominatim usage policy: 1 req/sec. Rate-limit per-IP to honor it.
    const rl = rateLimit(rateKey(request, 'distance-rev'), { limit: 30, windowMs: 60_000 })
    if (!rl.ok) {
      return Response.json({ error: `Slow down — ${rl.retryAfter}s` }, { status: 429 })
    }
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat'))
    const lng = parseFloat(searchParams.get('lng'))
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return Response.json({ error: 'lat and lng query params required' }, { status: 400 })
    }
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`
    const res = await fetch(url, { headers: { 'User-Agent': 'GetGuac/1.0 (https://getguac.app)' } })
    if (!res.ok) throw new Error(`Reverse geocode failed (${res.status})`)
    const data = await res.json()
    return Response.json({
      address: data?.display_name || `${lat},${lng}`,
      raw: data?.address || null,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

async function geocodeOnce(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'GetGuac/1.0 (https://getguac.app)', 'Accept-Language': 'en' },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) return null
  const { lat, lon, display_name } = data[0]
  return { lat: parseFloat(lat), lng: parseFloat(lon), display_name }
}

// Google Maps shares are often just a short link (maps.app.goo.gl/XXX) — no
// address text. Follow the redirect to find the actual maps.google.com URL,
// then pull coordinates or a place name out of it.
async function resolveMapsUrl(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'GetGuac/1.0' } })
    const finalUrl = res.url || url
    // /@lat,lng,zoom — most reliable when present
    const at = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (at) {
      const placeName = decodeURIComponent((finalUrl.match(/\/maps\/place\/([^/@]+)/)?.[1] || '').replace(/\+/g, ' '))
      return { lat: parseFloat(at[1]), lng: parseFloat(at[2]), display_name: placeName || 'Shared location' }
    }
    // ?q=lat,lng
    const qCoords = finalUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (qCoords) {
      return { lat: parseFloat(qCoords[1]), lng: parseFloat(qCoords[2]), display_name: 'Shared location' }
    }
    // /maps/place/Some+Place+Name/ — feed to Nominatim
    const placePath = finalUrl.match(/\/maps\/place\/([^/@?]+)/)
    if (placePath) {
      return geocode(decodeURIComponent(placePath[1].replace(/\+/g, ' ')))
    }
    // ?q=text
    const qText = finalUrl.match(/[?&]q=([^&]+)/)
    if (qText) {
      return geocode(decodeURIComponent(qText[1].replace(/\+/g, ' ')))
    }
    return null
  } catch (_) {
    return null
  }
}

// Tries a few normalized variants of the input string because Nominatim is finicky.
// e.g. "13619 Beckingham Drive,Herndon,VA" works much better as
// "13619 Beckingham Drive, Herndon, VA, USA"
async function geocode(address) {
  if (!address || !address.trim()) return null
  const raw = address.trim()

  // Short-circuit: Google Maps share URLs need redirect-following, not geocoding.
  if (/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(?:www\.)?google\.com\/maps)/i.test(raw)) {
    return resolveMapsUrl(raw)
  }

  // If the input is multi-line and one of those lines is a Maps short link,
  // resolve THAT first — it's almost always the most accurate signal.
  const lines = raw.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean)
  const mapsLine = lines.find(l => /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(?:www\.)?google\.com\/maps)/i.test(l))
  if (mapsLine) {
    const fromUrl = await resolveMapsUrl(mapsLine)
    if (fromUrl) return fromUrl
  }

  // Treat ` · ` (the bullet our mobile share-cleaner inserts between place + address)
  // and newlines as comma separators so Nominatim's parser has a chance.
  // Drop any remaining URL fragments so they don't pollute the query.
  const normalized = raw
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s*[·•]\s*/g, ', ')
    .replace(/[\r\n]+/g, ', ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const withUsa = /\b(usa|united states)\b/i.test(normalized) ? normalized : `${normalized}, USA`
  const parts = normalized.split(',').map(s => s.trim()).filter(Boolean)

  // Pick out the line that looks like an address (starts with a number) — that's
  // the strongest Nominatim signal in a multi-line "Place\nStreet\nCity" share.
  const addressIdx = parts.findIndex(p => /^\d+\s+\S/.test(p))
  const addressOnward = addressIdx >= 0
    ? `${parts.slice(addressIdx).join(', ')}, USA`
    : null
  const cityState = parts.length >= 2 ? `${parts.slice(-2).join(', ')}, USA` : null

  const variants = [
    addressOnward,
    withUsa,
    normalized,
    withUsa.replace(/^\d+\s+/, ''),
    cityState,
  ].filter(Boolean)

  for (const q of variants) {
    const hit = await geocodeOnce(q)
    if (hit) return hit
  }
  return null
}

function haversineMiles(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(h))
}

// Accepts either { from, to } strings, or { fromCoords: {lat,lng}, to } / { from, toCoords }.
async function resolve(addressOrLabel, coords) {
  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
    return { lat: coords.lat, lng: coords.lng, display_name: addressOrLabel || 'Current location' }
  }
  if (!addressOrLabel) return null
  return geocode(addressOrLabel)
}

export async function POST(request) {
  try {
    const rl = rateLimit(rateKey(request, 'distance-fwd'), { limit: 30, windowMs: 60_000 })
    if (!rl.ok) {
      return Response.json({ error: `Slow down — ${rl.retryAfter}s` }, { status: 429 })
    }
    const { from, to, fromCoords, toCoords } = await request.json()
    if (!from && !fromCoords) return Response.json({ error: 'from or fromCoords required' }, { status: 400 })
    if (!to   && !toCoords)   return Response.json({ error: 'to or toCoords required'   }, { status: 400 })

    const [a, b] = await Promise.all([resolve(from, fromCoords), resolve(to, toCoords)])
    if (!a) return Response.json({ error: `Could not find address: ${from}` }, { status: 404 })
    if (!b) return Response.json({ error: `Could not find address: ${to}` }, { status: 404 })

    const straight = haversineMiles(a, b)
    const driving = straight * ROAD_FACTOR

    return Response.json({
      miles: Math.round(driving * 10) / 10,
      straight_line_miles: Math.round(straight * 10) / 10,
      from: { ...a },
      to:   { ...b },
    })
  } catch (err) {
    console.error('[api/distance]', err)
    return Response.json({ error: err.message || 'Distance calc failed' }, { status: 500 })
  }
}

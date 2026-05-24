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

// Tries a few normalized variants of the input string because Nominatim is finicky.
// e.g. "13619 Beckingham Drive,Herndon,VA" works much better as
// "13619 Beckingham Drive, Herndon, VA, USA"
async function geocode(address) {
  if (!address || !address.trim()) return null
  const raw = address.trim()
  const cleaned = raw.replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim()
  const withUsa = /\b(usa|united states)\b/i.test(cleaned) ? cleaned : `${cleaned}, USA`

  const variants = [
    cleaned,
    withUsa,
    // Drop the leading house number — Nominatim sometimes misses precise numbers
    withUsa.replace(/^\d+\s+/, ''),
    // Just the city + state (last 2 comma-separated tokens) + USA
    (() => {
      const parts = cleaned.split(',').map(s => s.trim()).filter(Boolean)
      if (parts.length < 2) return null
      return `${parts.slice(-2).join(', ')}, USA`
    })(),
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

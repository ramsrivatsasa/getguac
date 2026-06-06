// GET /api/rakuten/coupons
//
// Server-side proxy for the Rakuten Advertising Coupon API. Keeps the OAuth2
// credentials on the server — the browser only ever sees coupon JSON.
//
// Query params (all optional — pass-through to the Coupon API):
//   mid            advertiser/merchant id (one retailer)
//   category       coupon category id
//   network        network id (US = 1)
//   promotiontype  promotion type id
//   resultsperpage default 20  (capped at 100)
//   pagenumber     default 1
//
// Responses:
//   200 { configured:true, format, data|raw }   — coupons (JSON or raw XML)
//   503 { configured:false, error }             — credentials not set yet
//   429 { error:'rate limited' }
//   500 { error }
//
// When credentials aren't configured this returns 503 (not 500) so the UI can
// distinguish "not set up yet" from "the call broke".

import { rateLimit, rateKey } from '../../../../lib/apiGuard'
import { rakutenConfigured, fetchCoupons } from '../../../../lib/rakuten'

export async function GET(request) {
  try {
    const rl = await rateLimit(rateKey(request, 'rakuten-coupons'), { limit: 30, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    if (!rakutenConfigured()) {
      return Response.json(
        { configured: false, error: 'Rakuten not configured — set RAKUTEN_CLIENT_ID / RAKUTEN_CLIENT_SECRET / RAKUTEN_ACCOUNT_SID' },
        { status: 503 },
      )
    }

    const { searchParams } = new URL(request.url)
    const num = (k, def) => {
      const v = Number(searchParams.get(k))
      return Number.isFinite(v) && v > 0 ? v : def
    }

    const result = await fetchCoupons({
      mid:           searchParams.get('mid') || undefined,
      category:      searchParams.get('category') || undefined,
      network:       searchParams.get('network') || undefined,
      promotiontype: searchParams.get('promotiontype') || undefined,
      resultsperpage: Math.min(num('resultsperpage', 20), 100),
      pagenumber:     num('pagenumber', 1),
    })

    return Response.json({ configured: true, ...result })
  } catch (err) {
    console.error('[rakuten-coupons]', err)
    return Response.json({ error: err.message || 'coupon lookup failed' }, { status: 500 })
  }
}

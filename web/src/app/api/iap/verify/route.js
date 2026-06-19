// POST /api/iap/verify — validate a mobile in-app purchase and grant premium.
//
// Body: { platform: 'android'|'ios', productId, purchaseToken }
// Auth: the caller's Supabase session (or Bearer token) identifies the user.
//
// On success we upsert premium_entitlements (read by the app + web AdSlot to
// hide Tier-2 ads) and log the receipt in iap_purchases — both service-role-
// write-only, so a client can never self-grant premium. Renewals / refunds are
// reconciled separately by /api/iap/notifications (Play RTDN).

import { createApiClient } from '../../../../lib/supabase/server'
import { adminClient, verifyAndroidSubscription, applyEntitlement } from '../../../../lib/playBilling'

export const runtime = 'nodejs'
export const maxDuration = 20

export async function POST(request) {
  const sb = createApiClient() // accepts the mobile app's Bearer access token
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Bad JSON' }, { status: 400 }) }
  const { platform, productId, purchaseToken } = body || {}
  if (!platform || !productId || !purchaseToken) {
    return Response.json({ error: 'platform, productId, purchaseToken required' }, { status: 400 })
  }

  let result
  try {
    if (platform === 'android') {
      result = await verifyAndroidSubscription(productId, purchaseToken)
    } else {
      // iOS validation (App Store Server API) — wire when you ship iOS.
      return Response.json({ error: 'iOS validation not implemented yet' }, { status: 501 })
    }
  } catch (e) {
    return Response.json({ error: `Verification failed: ${e.message}` }, { status: 402 })
  }

  const { error: entErr } = await applyEntitlement(adminClient(), {
    userId: user.id,
    premiumUntil: result.expiresAt.toISOString(),
    platform,
    productId,
    purchaseToken,
    raw: result.raw,
  })
  if (entErr) return Response.json({ error: 'Could not save entitlement' }, { status: 500 })

  return Response.json({
    premium: true,
    premium_until: result.expiresAt.toISOString(),
    verified: result.verified,
  })
}

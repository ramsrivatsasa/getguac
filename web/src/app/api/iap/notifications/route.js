// POST /api/iap/notifications — Google Play Real-time Developer Notifications
// (RTDN). Delivered via a Pub/Sub push subscription whenever a subscription
// renews, cancels, expires, is revoked/refunded, etc. This keeps premium_until
// accurate WITHOUT waiting for the app to re-open — the production source of
// truth for entitlement.
//
// Setup (your side): in Play Console → Monetization setup, point RTDN at a
// Pub/Sub topic; add a PUSH subscription to that topic with endpoint
//   https://getguac.app/api/iap/notifications?secret=<IAP_RTDN_SECRET>
// and set IAP_RTDN_SECRET in env. (If the env is unset we accept anyway so it
// can be wired/tested first.)

import { adminClient, verifyAndroidSubscription, applyEntitlement } from '../../../../lib/playBilling'

export const runtime = 'nodejs'
export const maxDuration = 20

const SUBSCRIPTION_REVOKED = 12 // refund / chargeback → end access immediately

export async function POST(request) {
  // Shared-secret check (the Pub/Sub push URL carries ?secret=...).
  const secret = process.env.IAP_RTDN_SECRET
  if (secret) {
    const url = new URL(request.url)
    if (url.searchParams.get('secret') !== secret) {
      return new Response('forbidden', { status: 403 })
    }
  }

  let envelope
  try { envelope = await request.json() } catch { return new Response('ok', { status: 200 }) }

  // Pub/Sub push wraps the payload as base64 in message.data.
  const dataB64 = envelope?.message?.data
  if (!dataB64) return new Response('ok', { status: 200 })

  let note
  try {
    note = JSON.parse(Buffer.from(dataB64, 'base64').toString('utf8'))
  } catch { return new Response('ok', { status: 200 }) }

  const sub = note?.subscriptionNotification
  if (!sub?.purchaseToken || !sub?.subscriptionId) {
    // test publishes, voided-purchase or one-time-product notifications — ack.
    return new Response('ok', { status: 200 })
  }

  const { purchaseToken, subscriptionId, notificationType } = sub

  try {
    const db = adminClient()

    // Map the purchase back to a user via the receipt we logged at purchase.
    const { data: row } = await db
      .from('iap_purchases')
      .select('user_id')
      .eq('platform', 'android')
      .eq('purchase_token', purchaseToken)
      .maybeSingle()
    if (!row?.user_id) {
      // Unknown token (never verified on our side) — nothing to update.
      return new Response('ok', { status: 200 })
    }

    let premiumUntil
    let raw = note
    if (notificationType === SUBSCRIPTION_REVOKED) {
      // Refund / chargeback — revoke access now.
      premiumUntil = new Date().toISOString()
    } else {
      // Re-validate to get the authoritative expiry (covers renew/cancel/expire:
      // a cancel keeps access until expiry; an expiry is already in the past).
      const result = await verifyAndroidSubscription(subscriptionId, purchaseToken)
      premiumUntil = result.expiresAt.toISOString()
      raw = result.raw
    }

    await applyEntitlement(db, {
      userId: row.user_id,
      premiumUntil,
      platform: 'android',
      productId: subscriptionId,
      purchaseToken,
      raw,
    })
    return new Response('ok', { status: 200 })
  } catch (e) {
    // 5xx → Pub/Sub retries with backoff (good for transient failures).
    return new Response(`error: ${e.message}`, { status: 500 })
  }
}

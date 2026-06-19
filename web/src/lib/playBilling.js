// Shared Google Play Billing helpers — used by /api/iap/verify (client-driven
// purchase verification) and /api/iap/notifications (server-to-server RTDN that
// keeps premium_until accurate through renew / cancel / refund / revoke).
import crypto from 'node:crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE_NAME || 'app.getguac.getguac'

// Service-role Supabase client (bypasses RLS). The ONLY thing allowed to write
// premium_entitlements / iap_purchases.
export function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

// Mint a Google OAuth access token from the service-account key (RS256 JWT).
async function googleAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const signingInput = `${header}.${claim}`
  const signature = b64url(crypto.createSign('RSA-SHA256').update(signingInput).sign(sa.private_key))
  const assertion = `${signingInput}.${signature}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!res.ok) throw new Error(`google token ${res.status}`)
  return (await res.json()).access_token
}

// Validate a subscription purchase against the Play Developer API.
// Returns { expiresAt: Date, raw, verified }. If the service account isn't
// configured and IAP_ALLOW_UNVERIFIED=1, grants a 30-day TEST window so the
// flow is testable before Play API access is wired (never enable in prod).
export async function verifyAndroidSubscription(productId, purchaseToken) {
  const saJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
  if (!saJson) {
    if (process.env.IAP_ALLOW_UNVERIFIED === '1') {
      return { expiresAt: new Date(Date.now() + 30 * 864e5), raw: { test: true }, verified: false }
    }
    throw new Error('Play validation not configured (set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)')
  }
  const sa = typeof saJson === 'string' ? JSON.parse(saJson) : saJson
  const token = await googleAccessToken(sa)
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`androidpublisher ${res.status}`)
  const data = await res.json()
  const expiresAt = data.expiryTimeMillis ? new Date(Number(data.expiryTimeMillis)) : null
  if (!expiresAt) throw new Error('no expiry on purchase')
  return { expiresAt, raw: data, verified: true }
}

// Upsert the entitlement + receipt log in one place (idempotent).
export async function applyEntitlement(db, { userId, premiumUntil, platform, productId, purchaseToken, raw }) {
  if (purchaseToken) {
    await db.from('iap_purchases').upsert({
      user_id: userId,
      platform,
      product_id: productId,
      purchase_token: purchaseToken,
      expires_at: premiumUntil,
      raw,
    }, { onConflict: 'platform,purchase_token' })
  }
  return db.from('premium_entitlements').upsert({
    user_id: userId,
    premium_until: premiumUntil,
    platform,
    product_id: productId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}

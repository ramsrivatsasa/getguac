// POST /api/iap/verify — validate a mobile in-app purchase and grant premium.
//
// Body: { platform: 'android'|'ios', productId, purchaseToken }
// Auth: the caller's Supabase session identifies the user.
//
// Android: validated against the Google Play Developer API using a service
// account (env GOOGLE_PLAY_SERVICE_ACCOUNT_JSON). If that env isn't set yet
// and IAP_ALLOW_UNVERIFIED=1, we grant a short test window so the end-to-end
// purchase → entitlement → ad-removal flow is testable before Play API access
// is wired. NEVER ship to production with IAP_ALLOW_UNVERIFIED=1.
//
// On success we upsert premium_entitlements (read by the app + web AdSlot to
// hide Tier-2 ads) and log the receipt in iap_purchases. Both tables are
// service-role-write-only, so a client can never self-grant premium.

import crypto from 'node:crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createApiClient } from '../../../../lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 20

const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE_NAME || 'app.getguac.getguac'

function admin() {
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
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  if (!res.ok) throw new Error(`google token ${res.status}`)
  return (await res.json()).access_token
}

// Returns { expiresAt: Date, raw } when the subscription purchase is valid.
async function verifyAndroid(productId, purchaseToken) {
  const saJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
  if (!saJson) {
    if (process.env.IAP_ALLOW_UNVERIFIED === '1') {
      // TEST MODE — trust the token, grant 30 days. Remove before production.
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
  // expiryTimeMillis is a string of epoch ms.
  const expiresAt = data.expiryTimeMillis ? new Date(Number(data.expiryTimeMillis)) : null
  if (!expiresAt) throw new Error('no expiry on purchase')
  return { expiresAt, raw: data, verified: true }
}

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
      result = await verifyAndroid(productId, purchaseToken)
    } else {
      // iOS validation (App Store Server API) — wire when you ship iOS.
      return Response.json({ error: 'iOS validation not implemented yet' }, { status: 501 })
    }
  } catch (e) {
    return Response.json({ error: `Verification failed: ${e.message}` }, { status: 402 })
  }

  const db = admin()
  // Log the receipt (idempotent on platform+token).
  await db.from('iap_purchases').upsert({
    user_id: user.id,
    platform,
    product_id: productId,
    purchase_token: purchaseToken,
    expires_at: result.expiresAt.toISOString(),
    raw: result.raw,
  }, { onConflict: 'platform,purchase_token' })

  // Grant/extend the entitlement.
  const { error: entErr } = await db.from('premium_entitlements').upsert({
    user_id: user.id,
    premium_until: result.expiresAt.toISOString(),
    platform,
    product_id: productId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (entErr) return Response.json({ error: 'Could not save entitlement' }, { status: 500 })

  return Response.json({
    premium: true,
    premium_until: result.expiresAt.toISOString(),
    verified: result.verified,
  })
}

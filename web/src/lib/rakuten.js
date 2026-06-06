// Server-only Rakuten Advertising (LinkSynergy) API client — Coupons & Deals.
//
// ⚠️  SERVER ONLY. Never import this into a client component / anything that
//     ships to the browser: it reads RAKUTEN_CLIENT_SECRET from process.env.
//
// === WHAT THIS IS ===
// Rakuten Advertising (formerly Rakuten Marketing / LinkShare) exposes its
// APIs behind an OAuth2 "client-credentials" flow. You exchange a
// client_id + client_secret + your account SID (the OAuth `scope`) for a
// short-lived bearer token, then call the Coupon API with that token to pull
// live coupons / deals per advertiser.
//
// === HOW TO GET CREDENTIALS ===
//   1. Log in to the Rakuten Advertising Publisher dashboard:
//        https://rakutenadvertising.com  →  Publisher → Tools → API
//      (a.k.a. the "Developers" portal at https://developers.rakutenadvertising.com)
//   2. Create an API application. You'll be issued:
//        • client_id      → RAKUTEN_CLIENT_ID
//        • client_secret  → RAKUTEN_CLIENT_SECRET
//   3. Your account SID (a numeric ID, used as the OAuth `scope`) is on your
//        account page → RAKUTEN_ACCOUNT_SID
//   4. Drop all three into web/.env.local (local) AND Vercel → Project
//      Settings → Environment Variables (prod). Then this module lights up.
//
// Until the env vars are set, `rakutenConfigured()` returns false and the
// API route responds 503 {configured:false} — nothing throws.

const TOKEN_URL  = process.env.RAKUTEN_TOKEN_URL  || 'https://api.linksynergy.com/token'
const COUPON_URL = process.env.RAKUTEN_COUPON_URL || 'https://api.linksynergy.com/coupon/1.0'

// Module-memory token cache. Each serverless instance keeps its own; that's
// fine — tokens are cheap to re-mint and valid for ~hours, so at most we do
// one token call per cold instance per token lifetime.
let cachedToken = null // { accessToken: string, expiresAt: number(ms) }

/** True only when all three credentials are present. */
export function rakutenConfigured() {
  return Boolean(
    process.env.RAKUTEN_CLIENT_ID &&
    process.env.RAKUTEN_CLIENT_SECRET &&
    process.env.RAKUTEN_ACCOUNT_SID
  )
}

/**
 * Get a valid bearer access token, minting + caching a new one when the
 * cached token is missing or within 60s of expiry.
 * @param {{ force?: boolean }} [opts] — force a fresh mint (e.g. after a 401)
 * @returns {Promise<string>} access token
 */
export async function getAccessToken({ force = false } = {}) {
  const id     = process.env.RAKUTEN_CLIENT_ID
  const secret = process.env.RAKUTEN_CLIENT_SECRET
  const sid    = process.env.RAKUTEN_ACCOUNT_SID
  if (!id || !secret || !sid) {
    throw new Error('Rakuten credentials missing (need RAKUTEN_CLIENT_ID, RAKUTEN_CLIENT_SECRET, RAKUTEN_ACCOUNT_SID)')
  }

  const now = Date.now()
  if (!force && cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.accessToken
  }

  // OAuth2 client-credentials: HTTP Basic header = base64(client_id:client_secret),
  // body carries grant_type + the account SID as the scope.
  const basic = Buffer.from(`${id}:${secret}`).toString('base64')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: sid }).toString(),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.access_token) {
    throw new Error(json?.error_description || json?.error || `Rakuten token request failed (${res.status})`)
  }

  const ttlMs = (Number(json.expires_in) || 3600) * 1000
  cachedToken = { accessToken: json.access_token, expiresAt: now + ttlMs }
  return cachedToken.accessToken
}

/**
 * Fetch coupons / deals from the Rakuten Coupon API.
 *
 * NOTE on response format: the legacy Coupon Web Service returns XML. We send
 * `Accept: application/json` and parse JSON when we get it; otherwise we return
 * the raw XML string ({format:'xml'}) so the caller can decide to parse it once
 * we've seen the real live shape (we'd add a tiny XML parser then — no point
 * pulling a dependency in on speculation).
 *
 * @param {Object} [params]
 * @param {string|number} [params.mid]            advertiser/merchant id (filter to one retailer)
 * @param {string|number} [params.category]       coupon category id
 * @param {string|number} [params.network]        network id (e.g. US = 1)
 * @param {string|number} [params.promotiontype]  promotion type id
 * @param {number}        [params.resultsperpage=20]
 * @param {number}        [params.pagenumber=1]
 * @param {AbortSignal}   [params.signal]
 * @returns {Promise<{format:'json'|'xml'|'json-parse-failed', data?:any, raw?:string}>}
 */
export async function fetchCoupons({
  mid, category, network, promotiontype,
  resultsperpage = 20, pagenumber = 1, signal,
} = {}) {
  const token = await getAccessToken()

  const qs = new URLSearchParams()
  if (mid)           qs.set('mid', String(mid))
  if (category)      qs.set('category', String(category))
  if (network)       qs.set('network', String(network))
  if (promotiontype) qs.set('promotiontype', String(promotiontype))
  qs.set('resultsperpage', String(resultsperpage))
  qs.set('pagenumber', String(pagenumber))

  const res = await fetch(`${COUPON_URL}?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal,
  })

  const contentType = res.headers.get('content-type') || ''
  const raw = await res.text()

  if (res.status === 401) {
    // Token likely expired mid-flight — caller can retry with force-refresh.
    throw new Error('Rakuten coupon request unauthorized (401) — token may be expired')
  }
  if (!res.ok) {
    throw new Error(`Rakuten coupon request failed (${res.status}): ${raw.slice(0, 300)}`)
  }

  if (contentType.includes('application/json')) {
    try { return { format: 'json', data: JSON.parse(raw) } }
    catch { return { format: 'json-parse-failed', raw } }
  }
  return { format: 'xml', raw }
}

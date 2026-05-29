// POST /api/share/create
//
// Creates a public share record so the caller can hand a non-logged-in
// recipient a /share/<token> URL. Used by the Buy Again card Share menu
// (kind='item') and the Smashlist top-level Share menu (kind='list').
//
// Request:
//   {
//     kind:    'item' | 'list',
//     payload: { ... }   // shape depends on kind; rendered verbatim by /share/[token]
//     channel: 'whatsapp' | 'sms' | 'email' | 'copy' | 'native'   // attribution
//   }
//
// Response (200):
//   {
//     token: 'aB3xZk9q',
//     url:   'https://getguac.app/share/aB3xZk9q',
//     expires_at: ISO timestamp
//   }
//
// Auth:
//   - Sharer must be signed in (cookie or Bearer). We attribute the share
//     to their user_id for the future referral / payout flow.
//   - Public read of the resulting row happens via /share/[token]'s anon
//     Supabase client, gated by RLS (live-only filter).
//
// Storage:
//   - Token is 6 random bytes encoded as base64url (~8 chars). Plenty
//     unique for foreseeable share volume and short enough to type/share.
//   - 30-day expiry. After that the row stays around (for view-count
//     audit) but RLS hides it from public reads.

import { randomBytes } from 'crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createApiClient } from '../../../../lib/supabase/server'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'

export const runtime = 'nodejs'

const TTL_DAYS = 30
const ALLOWED_KINDS = new Set(['item', 'list'])
const ALLOWED_CHANNELS = new Set(['whatsapp', 'sms', 'email', 'copy', 'native', 'other'])

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function newToken() {
  // 6 bytes → 8 base64url chars. Collision probability is negligible
  // at any plausible share volume; if it ever bites, the unique-index
  // constraint will fail the insert and we retry.
  return randomBytes(6).toString('base64url')
}

function publicBaseUrl(request) {
  // Production resolves via the configured NEXT_PUBLIC_SITE_URL (set in
  // Vercel). Local dev / preview falls back to the request's origin so
  // the URL is clickable on the same machine without any config.
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/+$/, '')
  try {
    const u = new URL(request.url)
    return `${u.protocol}//${u.host}`
  } catch {
    return 'https://getguac.app'
  }
}

export async function POST(request) {
  try {
    const rl = await rateLimit(rateKey(request, 'share-create'), { limit: 30, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    // Require auth — only signed-in users can mint share links.
    const userSb = createApiClient()
    const { data: { user } } = await userSb.auth.getUser()
    if (!user) return Response.json({ error: 'not signed in' }, { status: 401 })

    let body
    try { body = await request.json() } catch { body = {} }
    const kind = String(body?.kind || '').toLowerCase()
    const payload = body?.payload
    const channel = String(body?.channel || 'other').toLowerCase()

    if (!ALLOWED_KINDS.has(kind)) {
      return Response.json({ error: 'kind must be item or list' }, { status: 400 })
    }
    if (!payload || typeof payload !== 'object') {
      return Response.json({ error: 'payload required' }, { status: 400 })
    }
    if (!ALLOWED_CHANNELS.has(channel)) {
      return Response.json({ error: `channel must be one of ${[...ALLOWED_CHANNELS].join(',')}` }, { status: 400 })
    }

    // Stamp the kind into the payload so the public page can branch
    // even if the caller forgot to include it inside payload.
    const enrichedPayload = { kind, ...payload, kind }

    const sb = admin()
    const expiresAt = new Date(Date.now() + TTL_DAYS * 86400_000).toISOString()

    // Retry on the (vanishingly unlikely) token collision.
    let token = null
    let inserted = null
    let lastErr = null
    for (let attempt = 0; attempt < 3; attempt++) {
      token = newToken()
      const { data, error } = await sb.from('shared_items').insert({
        token,
        shared_by_user_id: user.id,
        payload: enrichedPayload,
        channel,
        expires_at: expiresAt,
      }).select('token, expires_at').single()
      if (!error) { inserted = data; break }
      lastErr = error
      // Postgres unique violation code is 23505; only retry on that.
      if (error.code !== '23505') break
    }
    if (!inserted) {
      console.error('[share/create] insert failed:', lastErr)
      return Response.json({ error: lastErr?.message || 'insert failed' }, { status: 500 })
    }

    const base = publicBaseUrl(request)
    const url = `${base}/share/${inserted.token}`
    return Response.json({
      token: inserted.token,
      url,
      expires_at: inserted.expires_at,
    })
  } catch (err) {
    console.error('[share/create]', err)
    return Response.json({ error: err.message || 'share failed' }, { status: 500 })
  }
}

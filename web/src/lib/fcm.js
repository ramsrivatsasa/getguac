// Firebase Cloud Messaging sender — server-side only. Wraps
// firebase-admin's `messaging().sendEachForMulticast` so the rest
// of the app can call `sendPushToUser(userId, payload)` without
// thinking about token fetching, batching, or stale-token cleanup.
//
// Setup (one-time, done outside this codebase):
//   1. Create a Firebase project at console.firebase.google.com,
//      enable Cloud Messaging.
//   2. Download a service-account JSON key (Project Settings →
//      Service Accounts → "Generate new private key").
//   3. Set the JSON contents (as a single line, base64-encoded
//      OR the raw JSON string) in Vercel as the env var
//      `FIREBASE_SERVICE_ACCOUNT_JSON`. This module accepts both
//      forms — raw JSON or base64 — and falls back to a no-op
//      sender if the var is missing so a misconfigured deploy
//      doesn't crash the cron run.
//
// On the device side, register your bundle id (com.getguac.app or
// equivalent) in the Firebase console and drop the
// google-services.json / GoogleService-Info.plist into the mobile
// project so the device token actually belongs to this project.

import admin from 'firebase-admin'
import { createClient } from '@supabase/supabase-js'

let _adminApp = null
let _initError = null

function _loadAdmin() {
  if (_adminApp) return _adminApp
  if (_initError) return null
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) {
    _initError = 'FIREBASE_SERVICE_ACCOUNT_JSON not set — push sends disabled.'
    console.warn('[fcm]', _initError)
    return null
  }
  try {
    // Accept either raw JSON or base64-encoded JSON. Vercel's env
    // var UI strips newlines, so users typically paste the JSON
    // directly; base64 is provided for those who'd rather not
    // expose private-key newlines through copy-paste.
    let parsed
    try { parsed = JSON.parse(raw) }
    catch { parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) }
    _adminApp = admin.apps.length
      ? admin.app()
      : admin.initializeApp({ credential: admin.credential.cert(parsed) })
    return _adminApp
  } catch (e) {
    _initError = `firebase-admin init failed: ${e.message}`
    console.error('[fcm]', _initError)
    return null
  }
}

// Service-role Supabase client — bypasses RLS so the dispatcher
// can read every user's tokens / log every send. Used only on the
// server; never expose this key to the browser.
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// Cache token reads inside a single dispatcher run.
const _tokenCache = new Map()  // userId -> token[]

async function _getTokensForUser(userId) {
  if (_tokenCache.has(userId)) return _tokenCache.get(userId)
  const sb = serviceClient()
  const { data, error } = await sb
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
  if (error) {
    console.error('[fcm] token fetch failed', userId, error)
    _tokenCache.set(userId, [])
    return []
  }
  const tokens = (data || []).map(r => r.token).filter(Boolean)
  _tokenCache.set(userId, tokens)
  return tokens
}

// Prune tokens that FCM tells us are dead (UNREGISTERED). Keeps
// `push_tokens` from growing forever with stale device tokens.
async function _pruneDeadTokens(tokens) {
  if (!tokens.length) return
  const sb = serviceClient()
  // Chunk because Postgres `in` lists have a length limit.
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100)
    await sb.from('push_tokens').delete().in('token', chunk)
  }
}

/// Send a push to every device the user has registered. Returns
/// { sent, failed, dead } counts. `category` is required so the
/// caller can write to `notification_log` with a sensible key;
/// pass the same {category, eventKey} pair every time for an
/// event-id-based dedup.
///
/// payload: { title, body, route?, data? }
/// data    is merged into the FCM `data` block; `route` becomes
///         data.route so the mobile app can deep-link on tap.
export async function sendPushToUser(userId, { title, body, route, data = {} }, { category, eventKey } = {}) {
  if (!userId || !title || !body) return { sent: 0, failed: 0, dead: 0 }
  const app = _loadAdmin()
  if (!app) return { sent: 0, failed: 0, dead: 0, error: _initError }

  // Dedup — never resend the same (user, category, eventKey).
  if (category && eventKey) {
    const sb = serviceClient()
    const { data: existing } = await sb
      .from('notification_log')
      .select('id')
      .eq('user_id', userId)
      .eq('category', category)
      .eq('event_key', eventKey)
      .limit(1)
      .maybeSingle()
    if (existing) return { sent: 0, failed: 0, dead: 0, deduped: true }
  }

  // User preference check.
  if (category) {
    const sb = serviceClient()
    const { data: profile } = await sb
      .from('profiles')
      .select('notification_prefs')
      .eq('id', userId)
      .maybeSingle()
    const prefs = profile?.notification_prefs || {}
    if (prefs[category] === false) return { sent: 0, failed: 0, dead: 0, muted: true }
  }

  const tokens = await _getTokensForUser(userId)
  if (!tokens.length) return { sent: 0, failed: 0, dead: 0, noTokens: true }

  const message = {
    notification: { title, body },
    data: Object.fromEntries(Object.entries({ ...data, route: route ?? '' }).map(([k, v]) => [k, String(v ?? '')])),
    tokens,
    android: {
      priority: 'high',
      notification: { channelId: 'getguac_default', sound: 'default' },
    },
    apns: {
      payload: { aps: { sound: 'default', badge: 1 } },
    },
  }

  let response
  try {
    response = await admin.messaging().sendEachForMulticast(message)
  } catch (e) {
    console.error('[fcm] send failed', userId, e)
    return { sent: 0, failed: tokens.length, dead: 0, error: e.message }
  }

  const dead = []
  let sent = 0, failed = 0
  response.responses.forEach((r, i) => {
    if (r.success) {
      sent++
    } else {
      failed++
      const code = r.error?.code || ''
      if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
        dead.push(tokens[i])
      }
    }
  })
  if (dead.length) await _pruneDeadTokens(dead)

  // Log the send so we don't repeat it.
  if (category && eventKey && sent > 0) {
    const sb = serviceClient()
    await sb.from('notification_log').insert({
      user_id: userId, category, event_key: eventKey,
    }).select() // surface errors in logs without failing the call
  }

  return { sent, failed, dead: dead.length }
}

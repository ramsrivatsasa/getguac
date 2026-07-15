// Server-side error/crash capture. Writes one row to audit_log so failures on
// the server (API routes, the email poll/sync) and web render crashes land in
// the SAME place the mobile app's DebugLog does — which means they all show up
// in the admin crash dashboard (/admin/crashes) and the crash-digest email.
//
// Best-effort by design: this is called from catch blocks, so it must never
// throw or mask the original error.

import { createClient as createServiceClient } from '@supabase/supabase-js'

// Reused across calls within a single serverless instance.
let _admin = null
function admin() {
  if (_admin) return _admin
  _admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  return _admin
}

// tag       short grouping label ('email_poll', 'email_sync', 'react-render', …)
// message   human-readable error text
// level     'error' | 'warn'
// userId    affected user's auth id, when known (nullable — anon web crashes)
// platform  'server' | 'web'
// action    audit_log.action; keep a small vocabulary the digest can reason about
// meta      extra JSON (stack, uid, url, …)
// client    optional existing service-role client to reuse (poll/sync pass theirs)
export async function reportServerError(
  { tag = 'server', message, level = 'error', userId = null, platform = 'server', action = 'server_error', meta = null },
  client = null
) {
  try {
    const sb = client || admin()
    await sb.from('audit_log').insert({
      user_id: userId,
      action,
      status: level,
      detail: {
        tag,
        message: String(message ?? '').slice(0, 2000),
        platform,
        ...(meta ? { meta } : {}),
      },
    })
  } catch (_) {
    // swallow — capture is best-effort
  }
}

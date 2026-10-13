// POST /api/email/sync — lightweight, on-demand pull for the CURRENT user.
//
// Why this exists: receipt/email pulling normally rides on the GitHub Actions
// cron hitting /api/email/poll every 10 min. If that cron ever stops (a
// CRON_SECRET mismatch, a disabled schedule, GitHub incident), mail silently
// stops arriving. This endpoint decouples an active user from the cron: the
// inbox calls it on open, so anyone using the app pulls their own new mail
// regardless of the cron's health.
//
// It's the incremental sibling of /api/email/backfill:
//   - backfill: from UID 1 across all folders (heavy; historical re-pull).
//   - sync:     from each folder's stored cursor forward (cheap; new mail only).
//
// Auth: the user's own session. Rate-limited to 1 per 90s per user so mounting
// the inbox repeatedly can't hammer IMAP. Upstream cleanup (move-to-Guacked /
// auto-delete) is intentionally left to the cron — sync only mirrors new mail
// locally, which is all "not pulling" is about.

import { createApiClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit, userRateKey } from '../../../../lib/apiGuard'
import { syncInboxMessages } from '../../../../lib/email-sync'

export const runtime = 'nodejs'
export const maxDuration = 60

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST() {
  const sb = await createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  // Quiet rate limit: over-limit isn't an error, it's "nothing to do right now".
  const rl = await rateLimit(userRateKey(user.id, 'email-sync'), { limit: 1, windowMs: 90_000 })
  if (!rl.ok) return Response.json({ ok: true, skipped: 'cooldown', inserted: 0 })

  const result = await syncInboxMessages({ sb: adminClient(), userId: user.id, allowReprovision: true, allowReceiptParsing: true, requireReceiptProvider: false })
  const { httpStatus, status, reason, ...summary } = result
  // Preserve the manual endpoint's quiet no-mailbox/config/disabled response.
  if (summary.skipped) summary.ok = true
  return Response.json(summary, { status: httpStatus || 200 })
}

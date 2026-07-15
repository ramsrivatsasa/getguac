// POST /api/report-error — client/web crash sink.
//
// The root error boundary (app/global-error.js) posts render crashes here so
// they land in audit_log and appear in the admin crash dashboard (Sentry also
// gets them when NEXT_PUBLIC_SENTRY_DSN is set). Auth is optional — crashes can
// happen while signed out — so we attach the user id when we have it and record
// anonymously otherwise. Rate-limited by IP to keep it from being abused.

import { createApiClient } from '../../../lib/supabase/server'
import { reportServerError } from '../../../lib/report-error'
import { rateLimit, rateKey } from '../../../lib/apiGuard'

export const runtime = 'nodejs'

export async function POST(request) {
  const rl = await rateLimit(rateKey(request, 'report-error'), { limit: 20, windowMs: 60_000 })
  if (!rl.ok) return Response.json({ ok: false }, { status: 429 })

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ ok: false }, { status: 400 })

  let userId = null
  try {
    const sb = createApiClient()
    const { data: { user } } = await sb.auth.getUser()
    userId = user?.id || null
  } catch (_) { /* anonymous crash */ }

  await reportServerError({
    tag: String(body.tag || 'web-error').slice(0, 60),
    message: String(body.message || 'Unknown web error').slice(0, 500),
    level: 'error',
    userId,
    platform: 'web',
    action: 'web_error',
    meta: {
      stack: String(body.stack || '').split('\n').slice(0, 20).join('\n'),
      url: String(body.url || '').slice(0, 300),
      digest: body.digest || null,
      ua: request.headers.get('user-agent')?.slice(0, 200) || null,
    },
  })

  return Response.json({ ok: true })
}

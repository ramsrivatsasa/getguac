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
import { safeErrorText, errorPath } from '../../../lib/error-feedback.mjs'

export const runtime = 'nodejs'

export async function POST(request) {
  const rl = await rateLimit(rateKey(request, 'report-error'), { limit: 20, windowMs: 60_000 })
  if (!rl.ok) return Response.json({ ok: false }, { status: 429 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body.message !== 'string' || body.message.length > 5000) return Response.json({ ok: false }, { status: 400 })

  let userId = null
  try {
    const sb = await createApiClient()
    const { data: { user } } = await sb.auth.getUser()
    userId = user?.id || null
  } catch (_) { /* anonymous crash */ }

  const saved = await reportServerError({
    tag: safeErrorText(body.tag || 'web-error', 60),
    message: safeErrorText(body.message || 'Unknown web error', 1000),
    level: 'error',
    userId,
    platform: ['ios', 'android'].includes(body.platform) ? body.platform : 'web',
    action: body.manual === true ? 'error_report' : 'web_error',
    meta: {
      stack: safeErrorText(String(body.stack || '').split('\n').slice(0, 20).join('\n'), 2000),
      url: errorPath(body.url),
      endpoint: errorPath(body.endpoint || '/'),
      status: Number.isInteger(body.status) ? body.status : null,
      digest: typeof body.digest === 'string' ? body.digest.slice(0, 100) : null,
      ua: request.headers.get('user-agent')?.slice(0, 200) || null,
    },
  })

  return saved?.ok ? Response.json({ ok: true, reportId: saved.id, notification: 'admin-crash-digest' }) : Response.json({ ok: false, error: 'Report could not be saved. Please retry.' }, { status: 503 })
}

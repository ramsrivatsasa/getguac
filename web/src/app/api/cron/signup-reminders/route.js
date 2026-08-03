// Re-sends the confirmation email to people who registered but never clicked.
//
// WHY THIS EXISTS
// An account that is created and never confirmed is invisible and useless: the
// person wanted in, gave us their details, and one email failing to arrive (or
// landing in spam) ended it. On 2026-08-03 one such account had been sitting
// unconfirmed for four days — a Yahoo address, and Yahoo is the provider most
// likely to filter a young sending domain.
//
// This runs daily and nudges them.
//
// ── THE RULES, AND WHY EACH ONE EXISTS ──────────────────────────────────────
// This sends mail to real people who are not yet customers. Getting it wrong
// is not a bug, it is spam — and spam complaints damage the sending-domain
// reputation that `send.getguac.app` is still building, which would hurt the
// confirmation emails this job is trying to rescue. So it is deliberately
// conservative:
//
//   MAX_REMINDERS = 2   Two nudges, then we stop forever. If someone has
//                       ignored three emails they are not confused, they have
//                       decided.
//   FIRST_AFTER_H = 24  Not sooner. Plenty of people confirm the next morning,
//                       and a reminder that arrives before they have looked is
//                       both useless and annoying.
//   GAP_H = 48          Minimum spacing between nudges.
//   MAX_AGE_DAYS = 30   Never email someone about a signup they made a month
//                       ago. At that point it reads as a cold email from a
//                       company they do not remember.
//
// State lives in public.signups (reminder_count, last_reminder_at) — the same
// row that carries confirmed_at, so the check and the counter cannot disagree.
// That makes the job safe to re-run: a double-fire or a replayed deploy cannot
// send the same nudge twice.
import { createClient as createServerClient } from '../../../../lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_REMINDERS = 2
const FIRST_AFTER_H = 24
const GAP_H         = 48
const MAX_AGE_DAYS  = 30

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

// Same CRON_SECRET check the other jobs use — header or Authorization: Bearer.
function authorized(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const got = req.headers.get('x-cron-secret')
        || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return got === secret
}

async function run(req) {
  if (!authorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sbAdmin = admin()
  const now = Date.now()
  const firstCutoff = new Date(now - FIRST_AFTER_H * 3600_000).toISOString()
  const ageCutoff   = new Date(now - MAX_AGE_DAYS * 86400_000).toISOString()

  // Unconfirmed, old enough to nudge, young enough that a nudge still makes
  // sense, and not already nudged to the cap.
  const { data: pending, error } = await sbAdmin
    .from('signups')
    .select('user_id, email, created_at, reminder_count, last_reminder_at')
    .is('confirmed_at', null)
    .lt('created_at', firstCutoff)
    .gt('created_at', ageCutoff)
    .lt('reminder_count', MAX_REMINDERS)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    console.error('[cron/signup-reminders] query failed:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }

  const due = (pending || []).filter((s) => {
    if (!s.last_reminder_at) return true                 // never nudged
    return now - new Date(s.last_reminder_at).getTime() >= GAP_H * 3600_000
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://getguac.app'
  const sb = createServerClient()
  const results = { considered: pending?.length || 0, due: due.length, sent: 0, failed: 0, errors: [] }

  for (const s of due) {
    try {
      // Supabase decides whether an actual send happens; it is a no-op for an
      // already-confirmed address, which keeps this safe against a race with
      // someone confirming mid-run.
      const { error: sendErr } = await sb.auth.resend({
        type: 'signup',
        email: s.email,
        options: { emailRedirectTo: `${baseUrl}/auth/confirm` },
      })
      if (sendErr) throw new Error(sendErr.message)

      // Count the send even though the *delivery* is not confirmable from
      // here. Under-counting would let the cap be exceeded, and sending a
      // stranger a third email is worse than skipping a second one.
      const { error: upErr } = await sbAdmin
        .from('signups')
        .update({
          reminder_count: (s.reminder_count || 0) + 1,
          last_reminder_at: new Date().toISOString(),
        })
        .eq('user_id', s.user_id)
      if (upErr) throw new Error(`counter: ${upErr.message}`)

      results.sent++
    } catch (e) {
      results.failed++
      results.errors.push({ email: s.email, error: e.message })
      console.error('[cron/signup-reminders]', s.email, e.message)
    }
  }

  console.log('[cron/signup-reminders]', JSON.stringify(results))
  return Response.json({ ok: true, ...results })
}

export async function GET(req)  { return run(req) }
export async function POST(req) { return run(req) }

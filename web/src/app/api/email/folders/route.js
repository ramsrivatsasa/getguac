// GET /api/email/folders — diagnostic endpoint that lists the IMAP folders the
// poller can see on the calling user's Migadu mailbox, with subscription and
// flag info. Useful for figuring out why a folder (like `g` or `receipts`) is
// or isn't being polled.
//
// Read-only. No DB writes. Rate-limited so it can't be turned into an IMAP
// bandwidth hog.

import { createApiClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit, userRateKey } from '../../../../lib/apiGuard'
import { decryptSecret } from '../../../../lib/crypto'
import { ImapFlow } from 'imapflow'
import { ENDPOINTS, fullEmail } from '../../../../lib/migadu'

export const runtime = 'nodejs'
export const maxDuration = 30

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request) {
  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const rl = rateLimit(userRateKey(user.id, 'email-folders'), { limit: 12, windowMs: 60_000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  if (!process.env.MIGADU_API_KEY || !process.env.EMAIL_ENCRYPTION_KEY) {
    return Response.json({ error: 'Email infrastructure not configured.' }, { status: 503 })
  }

  const { data: prof } = await admin()
    .from('profiles')
    .select('email_alias, email_inbox_password_enc, email_inbox_provisioned')
    .eq('id', user.id)
    .maybeSingle()
  if (!prof?.email_inbox_provisioned || !prof.email_inbox_password_enc || !prof.email_alias) {
    return Response.json({ error: 'Your inbox is not provisioned yet.' }, { status: 400 })
  }

  let password
  try { password = decryptSecret(prof.email_inbox_password_enc) }
  catch { return Response.json({ error: 'Mailbox credentials unavailable.' }, { status: 500 }) }

  const client = new ImapFlow({
    host: ENDPOINTS.imap.host,
    port: ENDPOINTS.imap.port,
    secure: ENDPOINTS.imap.secure,
    auth: { user: fullEmail(prof.email_alias), pass: password },
    logger: false,
  })

  try {
    await client.connect()
    const list = await client.list()
    const subscribed = await client.listSubscribed().catch(() => [])
    const subscribedPaths = new Set(subscribed.map(f => f.path))

    const folders = (list || []).map(f => ({
      path: f.path,
      name: f.name,
      flags: Array.isArray(f.flags) ? f.flags : [...(f.flags || [])],
      subscribed: subscribedPaths.has(f.path),
      specialUse: f.specialUse || null,
      delimiter: f.delimiter || null,
    }))

    return Response.json({
      ok: true,
      mailbox: fullEmail(prof.email_alias),
      folder_count: folders.length,
      folders,
    })
  } catch (e) {
    return Response.json({ error: `IMAP list failed: ${e.message}` }, { status: 500 })
  } finally {
    await client.logout().catch(() => {})
  }
}

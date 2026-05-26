// Atomic email-alias claim.
//
// POST /api/email/claim   body: { alias: "ram" }
//   → 200 { alias: "ram", status: "claimed" }
//   → 409 { alias: "ram", status: "taken" | "reserved" }
//   → 400 { alias: "ra",  status: "invalid" }
//
// Server-side validation + race protection live in the claim_email_alias RPC
// (security definer, enforced uniqueness via index).

import { createClient } from '../../../../lib/supabase/server'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
import { createMailbox, mailboxExists, fullEmail, receiptsAddress } from '../../../../lib/migadu'
import { encryptSecret, generateMailboxPassword } from '../../../../lib/crypto'
export const runtime = 'nodejs'

// Provision a real Migadu mailbox for a newly-claimed alias. Best-effort:
// if Migadu provisioning fails the alias stays claimed in the DB so the user
// can retry later — we don't want a transient API hiccup to lose the alias.
async function provisionMailbox(sb, user, alias) {
  // Skip if Migadu isn't configured yet (lets the app run without email infra).
  if (!process.env.MIGADU_API_KEY || !process.env.EMAIL_ENCRYPTION_KEY) {
    return { provisioned: false, reason: 'not_configured' }
  }
  try {
    const already = await mailboxExists(alias)
    if (already) {
      return { provisioned: true, reason: 'already_existed' }
    }
    const password = generateMailboxPassword()
    const name = [user.user_metadata?.firstName, user.user_metadata?.lastName].filter(Boolean).join(' ') || alias
    await createMailbox({ localPart: alias, password, name })
    const encrypted = encryptSecret(password)
    await sb.from('profiles')
      .update({
        email_inbox_provisioned: true,
        email_inbox_password_enc: encrypted,
      })
      .eq('id', user.id)
    return { provisioned: true, password, email: fullEmail(alias), receipts: receiptsAddress(alias) }
  } catch (e) {
    console.error('[email/claim] mailbox provisioning failed:', e.message)
    return { provisioned: false, reason: 'error', error: e.message }
  }
}

export async function POST(request) {
  try {
    const rl = await rateLimit(rateKey(request, 'email-claim'), { limit: 10, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const raw = String(body?.alias || '').toLowerCase().trim()
    if (!raw) return Response.json({ status: 'invalid', error: 'alias required' }, { status: 400 })

    const { data, error } = await sb.rpc('claim_email_alias', { p_alias: raw })
    if (error) {
      console.error('[email/claim] rpc failed:', error.message)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // RPC returns one row: { alias, status }
    const row = Array.isArray(data) ? data[0] : data
    const status = row?.status

    if (status === 'claimed') {
      const prov = await provisionMailbox(sb, user, row.alias)
      return Response.json({
        alias: row.alias,
        status,
        full: `${row.alias}@${process.env.EMAIL_DOMAIN || 'getguac.app'}`,
        mailbox: prov,
      })
    }
    if (status === 'taken')            return Response.json({ alias: row.alias, status }, { status: 409 })
    if (status === 'reserved')         return Response.json({ alias: row.alias, status }, { status: 409 })
    if (status === 'invalid')          return Response.json({ alias: row?.alias || raw, status }, { status: 400 })
    return Response.json({ status: 'unknown', raw }, { status: 500 })
  } catch (err) {
    console.error('[email/claim]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// GET    /api/email/:id  → full message body
// PATCH  /api/email/:id  → update fields (read_at, starred, folder)
// DELETE /api/email/:id  → move to trash (folder='trash');
//                          2nd delete from trash removes the row AND deletes
//                          the upstream Migadu mailbox copy via IMAP.
//
// Permanent delete also targets the Migadu copy so the user's "delete" in
// GetGuac removes the message everywhere — not just from our mirror.
// Optional `?keepMigadu=1` query param leaves Migadu untouched if the user
// wants to clear inbox clutter on their phone but keep the archive on the
// mail server.

import { createApiClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
import { deleteImapMessage } from '../../../../lib/imap-poll'
import { decryptSecret } from '../../../../lib/crypto'
export const runtime = 'nodejs'
export const maxDuration = 30

const DETAIL_COLS =
  'id, uid, imap_folder, message_id, from_addr, to_addr, delivered_to, subject, received_at, ' +
  'preview, body_text, body_html, attachments_summary, has_attachments, ' +
  'is_receipts_hook, processed, receipt_id, read_at, starred, folder, created_at'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request, { params }) {
  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const { data, error } = await sb
    .from('email_messages')
    .select(DETAIL_COLS)
    .eq('id', params.id)
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data)  return Response.json({ error: 'Not found' }, { status: 404 })

  // Auto mark-as-read when the user opens a message
  if (!data.read_at) {
    await sb.from('email_messages').update({ read_at: new Date().toISOString() }).eq('id', params.id)
    data.read_at = new Date().toISOString()
  }
  return Response.json({ message: data })
}

export async function PATCH(request, { params }) {
  const rl = await rateLimit(rateKey(request, 'email-patch'), { limit: 60, windowMs: 60_000 })
  if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const patch = {}
  if (typeof body.read    === 'boolean') patch.read_at  = body.read ? new Date().toISOString() : null
  if (typeof body.starred === 'boolean') patch.starred  = body.starred
  if (typeof body.folder  === 'string' && ['inbox','trash','junk','sent','archive'].includes(body.folder)) patch.folder = body.folder

  if (Object.keys(patch).length === 0) return Response.json({ error: 'nothing to update' }, { status: 400 })
  const { error } = await sb.from('email_messages').update(patch).eq('id', params.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(request, { params }) {
  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  // Two-step delete: inbox → trash, trash → row removed (+ Migadu nuke).
  // The trash hop is purely a UI safety net; nothing leaves Migadu yet.
  const { data: row } = await sb
    .from('email_messages')
    .select('id, folder, uid, imap_folder')
    .eq('id', params.id)
    .maybeSingle()
  if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

  // Step 1: inbox → trash (no IMAP delete yet — they can still undo)
  if (row.folder !== 'trash') {
    const { error } = await sb.from('email_messages').update({ folder: 'trash' }).eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, moved: 'trash' })
  }

  // Step 2: permanent delete. By default also remove the Migadu copy. The
  // user can pass ?keepMigadu=1 to leave the mailbox untouched.
  const url = new URL(request.url)
  const keepMigadu = url.searchParams.get('keepMigadu') === '1'

  let migaduResult = { attempted: false }
  if (!keepMigadu && row.uid && row.imap_folder) {
    if (!process.env.MIGADU_API_KEY || !process.env.EMAIL_ENCRYPTION_KEY) {
      // Mail infra not configured — skip silently, the user can still drop
      // the local row. Don't fail the delete on infra-missing in dev envs.
      migaduResult = { attempted: false, reason: 'email-infra-not-configured' }
    } else {
      // Need service role to read the encrypted mailbox password (RLS hides
      // it from the user's own session).
      const admin = adminClient()
      const { data: prof } = await admin
        .from('profiles')
        .select('email_alias, email_inbox_password_enc, email_inbox_provisioned')
        .eq('id', user.id)
        .maybeSingle()
      if (prof?.email_inbox_provisioned && prof.email_alias && prof.email_inbox_password_enc) {
        try {
          const password = decryptSecret(prof.email_inbox_password_enc)
          const r = await deleteImapMessage({
            localPart: prof.email_alias,
            password,
            folder: row.imap_folder,
            uid: row.uid,
          })
          migaduResult = { attempted: true, ok: r.ok }
        } catch (e) {
          // Don't block the local row delete just because IMAP failed —
          // surface the error so the UI can warn the user.
          migaduResult = { attempted: true, ok: false, error: e.message }
        }
      } else {
        migaduResult = { attempted: false, reason: 'mailbox-not-provisioned' }
      }
    }
  } else if (keepMigadu) {
    migaduResult = { attempted: false, reason: 'keepMigadu=1' }
  } else {
    migaduResult = { attempted: false, reason: 'no-uid-or-folder' }
  }

  // Always remove the local row last — if IMAP fails we still want the
  // local UI to reflect the user's delete intent.
  const { error } = await sb.from('email_messages').delete().eq('id', params.id)
  if (error) return Response.json({ error: error.message, migadu: migaduResult }, { status: 500 })
  return Response.json({ ok: true, removed: true, migadu: migaduResult })
}

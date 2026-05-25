// GET    /api/email/:id  → full message body
// PATCH  /api/email/:id  → update fields (read_at, starred, folder)
// DELETE /api/email/:id  → move to trash (folder='trash'); 2nd delete from trash removes the row

import { createClient } from '../../../../lib/supabase/server'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
export const runtime = 'nodejs'

const DETAIL_COLS =
  'id, uid, message_id, from_addr, to_addr, delivered_to, subject, received_at, ' +
  'preview, body_text, body_html, attachments_summary, has_attachments, ' +
  'is_receipts_hook, processed, receipt_id, read_at, starred, folder, created_at'

export async function GET(request, { params }) {
  const sb = createClient()
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
  const rl = rateLimit(rateKey(request, 'email-patch'), { limit: 60, windowMs: 60_000 })
  if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

  const sb = createClient()
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
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  // Two-step delete: inbox → trash, trash → row removed
  const { data: row } = await sb.from('email_messages').select('folder').eq('id', params.id).maybeSingle()
  if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

  if (row.folder === 'trash') {
    const { error } = await sb.from('email_messages').delete().eq('id', params.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, removed: true })
  }
  const { error } = await sb.from('email_messages').update({ folder: 'trash' }).eq('id', params.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, moved: 'trash' })
}

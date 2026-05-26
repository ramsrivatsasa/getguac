// GET /api/email/list?folder=inbox&page=0&pageSize=50
//
// Returns the current user's mailbox slice. Cheap query — selects only the
// columns the inbox list view needs, not the full bodies.

import { createApiClient } from '../../../../lib/supabase/server'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
export const runtime = 'nodejs'

const LIST_COLS =
  'id, uid, from_addr, to_addr, subject, received_at, preview, ' +
  'is_receipts_hook, has_attachments, processed, receipt_id, ' +
  'read_at, starred, folder, ' +
  // Embed the linked receipt so the inbox row can show "Lowe's · $42.99"
  // instead of the forwarder's email — that's what users actually scan for.
  'receipt:receipt_id(store_name, total_amount, date, is_return, processed)'

export async function GET(request) {
  const rl = rateLimit(rateKey(request, 'email-list'), { limit: 60, windowMs: 60_000 })
  if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const url = new URL(request.url)
  const folder    = url.searchParams.get('folder')   || 'inbox'
  const page      = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10))
  // Default 200 covers ~99% of users without needing a "load more" UI on the
  // current clients. Cap 500 keeps a single page payload under ~250 KB.
  // When users routinely cross 500 messages, wire up infinite scroll.
  const pageSize  = Math.min(500, Math.max(10, parseInt(url.searchParams.get('pageSize') || '200', 10)))
  const filter    = url.searchParams.get('filter') || ''  // '', 'unread', 'receipts', 'starred'
  const q         = (url.searchParams.get('q') || '').trim().toLowerCase()

  let query = sb.from('email_messages')
    .select(LIST_COLS, { count: 'exact' })
    .eq('folder', folder)
    .order('received_at', { ascending: false, nullsFirst: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)

  if (filter === 'unread')   query = query.is('read_at', null)
  if (filter === 'receipts') query = query.eq('is_receipts_hook', true)
  if (filter === 'starred')  query = query.eq('starred', true)
  if (q) query = query.or(`subject.ilike.%${q}%,from_addr.ilike.%${q}%,preview.ilike.%${q}%`)

  const { data, error, count } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ messages: data || [], total: count || 0, page, pageSize })
}

// Direct messages — central API.
//
// Same pattern as lib/households.js: every UI read+write goes through here
// so the schema and validation rules live in one place. UI components
// never touch dm_threads / dm_messages tables directly.
//
// Schema (migration 048):
//   dm_threads     { id, user_a, user_b, last_message_at, created_at }
//                   user_a < user_b enforced by table CHECK so the same pair
//                   never has two threads.
//   dm_messages    { id, thread_id, user_id, body, created_at }
//
// RLS: only the two participants can read/write their thread. Enforced by
// the SECURITY DEFINER helper `is_dm_participant()`.

import { createClient } from './supabase/client'
import { lookupUserIdByEmail } from './displayNames'

/**
 * Return all threads the current user participates in, newest first.
 * Includes the OTHER participant's id (peer_id) so the UI can show
 * "chat with @ ___".
 */
export async function listMyThreads() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return []

  const { data, error } = await sb
    .from('dm_threads')
    .select('id, user_a, user_b, last_message_at, created_at')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order('last_message_at', { ascending: false })
  if (error) throw error

  return (data || []).map(t => ({
    id: t.id,
    peer_id: t.user_a === user.id ? t.user_b : t.user_a,
    last_message_at: t.last_message_at,
    created_at: t.created_at,
  }))
}

/**
 * Open (or create if missing) the thread between the current user and
 * the given peer user-id. Idempotent — duplicate inserts collapse via
 * the unique (user_a, user_b) index.
 */
export async function openThreadWith(peerUserId) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not signed in')
  if (!peerUserId || peerUserId === user.id) {
    throw new Error('You cannot DM yourself.')
  }

  // Canonical ordering — user_a < user_b. String compare works for uuids.
  const [a, b] = user.id < peerUserId ? [user.id, peerUserId] : [peerUserId, user.id]

  // Try to find existing first to avoid hitting the unique-violation path.
  const { data: existing } = await sb
    .from('dm_threads')
    .select('id')
    .eq('user_a', a).eq('user_b', b)
    .maybeSingle()
  if (existing?.id) return existing.id

  const { data: created, error } = await sb
    .from('dm_threads')
    .insert({ user_a: a, user_b: b })
    .select('id')
    .single()
  if (error) {
    // Race: someone else inserted simultaneously. Re-fetch.
    if (error.code === '23505') {
      const { data: retry } = await sb
        .from('dm_threads').select('id').eq('user_a', a).eq('user_b', b).single()
      if (retry?.id) return retry.id
    }
    throw error
  }
  return created.id
}

/**
 * Convenience: start (or resume) a thread by the peer's email. Calls the
 * SECURITY DEFINER RPC `lookup_user_id_by_email` so it works regardless of
 * the strict `profiles: own row` RLS.
 *
 * Throws with a user-friendly message when no GetGuac account exists for
 * that email.
 */
export async function openThreadByEmail(email) {
  const clean = String(email || '').trim().toLowerCase()
  if (!clean) throw new Error('Email is required')
  const peerId = await lookupUserIdByEmail(clean)
  if (!peerId) throw new Error(`No GetGuac account for ${clean}. Ask them to sign up first.`)
  return openThreadWith(peerId)
}

/**
 * Latest N messages in a thread, oldest-first so the UI appends new at the
 * bottom (matches lib/households.js shape for parity).
 */
export async function listMessages(threadId, limit = 200) {
  const sb = createClient()
  const { data, error } = await sb
    .from('dm_messages')
    .select('id, user_id, body, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []).reverse()
}

/**
 * Post a message. Trims + caps at 2000 chars (matches DB CHECK). Bumps
 * the thread's last_message_at so listMyThreads() stays sorted.
 */
export async function postMessage(threadId, body) {
  const sb = createClient()
  const trimmed = String(body || '').trim()
  if (!trimmed) throw new Error('Empty message')
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data, error } = await sb
    .from('dm_messages')
    .insert({
      thread_id: threadId,
      user_id:   user.id,
      body:      trimmed.slice(0, 2000),
    })
    .select('id, user_id, body, created_at')
    .single()
  if (error) throw error

  // Bump thread sort key. Best-effort: a failure here just means the
  // thread list won't re-sort until the next message — harmless.
  await sb.from('dm_threads')
    .update({ last_message_at: data.created_at })
    .eq('id', threadId)
    .then(() => {}, e => console.warn('[dms] bump last_message_at failed:', e.message))

  return data
}

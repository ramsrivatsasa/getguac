// Households — central API.
//
// All household reads + writes route through this lib so the schema +
// validation rules live in one file. UI components and API routes
// import these helpers; they never hit `households` / `household_members`
// / `household_messages` tables directly.
//
// Schema overview (migration 046):
//   households            { id, name, created_by, created_at }
//   household_members     { household_id, user_id, role, joined_at }
//   household_messages    { id, household_id, user_id, body, created_at }
//   shopping_list.household_id  optional FK; when set, all members
//                                 of that household share the row.

import { createClient } from './supabase/client'
import { lookupUserIdByEmail } from './displayNames'

/**
 * Get the current user's primary household (one user, one household
 * in v1 — we'll generalize if needed). Returns null when the user
 * isn't in any household yet.
 *
 * Includes a `members` array so the UI can render the roster without
 * a second round-trip.
 */
export async function getMyHousehold() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null

  // Find membership rows for me. RLS scopes to my user_id by default.
  const { data: memberships } = await sb
    .from('household_members')
    .select('household_id, role, joined_at')
    .eq('user_id', user.id)
    .limit(1)
  const m = memberships?.[0]
  if (!m) return null

  const { data: house } = await sb
    .from('households')
    .select('id, name, created_by, created_at')
    .eq('id', m.household_id)
    .single()
  if (!house) return null

  // Pull every member's role + minimal identity (we don't expose email
  // unless the user has a profile row that opted in). For now: user_id
  // + role + joined_at. UI can resolve display names from profiles in
  // a follow-up.
  const { data: members } = await sb
    .from('household_members')
    .select('user_id, role, joined_at')
    .eq('household_id', house.id)
    .order('joined_at', { ascending: true })

  return {
    id: house.id,
    name: house.name,
    created_by: house.created_by,
    created_at: house.created_at,
    my_role: m.role,
    members: members || [],
  }
}

/**
 * Create a new household with the given name. The caller automatically
 * becomes its owner (one membership row inserted as part of the same
 * call). Returns the new household record OR throws on error.
 */
export async function createHousehold(name) {
  const sb = createClient()
  const trimmed = String(name || '').trim()
  if (!trimmed) throw new Error('Household name is required')
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data: house, error: hErr } = await sb
    .from('households')
    .insert({ name: trimmed.slice(0, 80), created_by: user.id })
    .select('id, name, created_by, created_at')
    .single()
  if (hErr) throw hErr

  const { error: mErr } = await sb
    .from('household_members')
    .insert({ household_id: house.id, user_id: user.id, role: 'owner' })
  if (mErr) {
    // Best-effort rollback so we don't leave an orphan household.
    await sb.from('households').delete().eq('id', house.id)
    throw mErr
  }
  return house
}

/**
 * Owner-only: add a member by their getguac email (or username — we
 * resolve via the `profiles` table). The added user's RLS unlocks
 * household reads + shared shopping list rows immediately.
 *
 * For v1 we require the invitee to already have a GetGuac account.
 * Email-invite-pending-acceptance is a future improvement.
 */
export async function addMemberByEmail(householdId, email) {
  const sb = createClient()
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanEmail) throw new Error('Email is required')

  // `profiles` has an "own row only" RLS so a direct SELECT returns 0
  // for anyone else's email — broken for invites. Use the SECURITY
  // DEFINER RPC from migration 048 instead.
  const peerId = await lookupUserIdByEmail(cleanEmail)
  if (!peerId) throw new Error(`No GetGuac account for ${cleanEmail}. Ask them to sign up first.`)

  const { error: mErr } = await sb
    .from('household_members')
    .insert({ household_id: householdId, user_id: peerId, role: 'member' })
  if (mErr) {
    if (mErr.code === '23505') throw new Error('That person is already in the household.')
    throw mErr
  }
  return { ok: true }
}

/**
 * Leave the household. If the caller is the only owner, ownership is
 * promoted to the longest-tenured member; if no other members exist,
 * the entire household is deleted.
 */
export async function leaveHousehold(householdId) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not signed in')

  // If I'm the owner AND there's someone else, promote them first.
  const { data: members } = await sb
    .from('household_members')
    .select('user_id, role, joined_at')
    .eq('household_id', householdId)
    .order('joined_at', { ascending: true })
  const me = members?.find(m => m.user_id === user.id)
  if (!me) throw new Error('You are not in this household.')

  if (me.role === 'owner') {
    const other = members.find(m => m.user_id !== user.id)
    if (other) {
      await sb.from('household_members')
        .update({ role: 'owner' })
        .eq('household_id', householdId)
        .eq('user_id', other.user_id)
    } else {
      // Solo owner leaving → delete the household entirely. CASCADE
      // cleans up household_members + household_messages.
      await sb.from('households').delete().eq('id', householdId)
      return { ok: true, deleted: true }
    }
  }

  const { error } = await sb.from('household_members')
    .delete()
    .eq('household_id', householdId)
    .eq('user_id', user.id)
  if (error) throw error
  return { ok: true, deleted: false }
}

/**
 * Owner-only: remove another member. Owner can't remove themselves
 * via this helper — use leaveHousehold() instead.
 */
export async function removeMember(householdId, userId) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not signed in')
  if (userId === user.id) throw new Error('Use Leave Household to remove yourself.')

  const { error } = await sb.from('household_members')
    .delete()
    .eq('household_id', householdId)
    .eq('user_id', userId)
  if (error) throw error
  return { ok: true }
}

/**
 * Latest N messages in the household chat thread, oldest-first so the
 * UI can append the newest at the bottom.
 */
export async function listMessages(householdId, limit = 200) {
  const sb = createClient()
  const { data, error } = await sb
    .from('household_messages')
    .select('id, user_id, body, created_at')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []).reverse()
}

/**
 * Post a chat message. Body trimmed + capped at 2000 chars (matches
 * the DB CHECK constraint).
 */
export async function postMessage(householdId, body) {
  const sb = createClient()
  const trimmed = String(body || '').trim()
  if (!trimmed) throw new Error('Empty message')
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data, error } = await sb
    .from('household_messages')
    .insert({
      household_id: householdId,
      user_id:      user.id,
      body:         trimmed.slice(0, 2000),
    })
    .select('id, user_id, body, created_at')
    .single()
  if (error) throw error
  return data
}

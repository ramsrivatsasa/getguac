// Display-name resolution — central lookup.
//
// The `profiles` RLS policy is "own row only" so a plain
// `select first_name from profiles where id = ?` returns 0 rows for
// anyone else. We need to show names in:
//   - Household chat roster
//   - Household member list
//   - DM thread list + DM messages
//
// So migration 048 added a SECURITY DEFINER RPC `get_display_names(uuid[])`
// that returns just first+last name (never email). This module wraps it
// with two small affordances:
//
//   - Batched lookup over an array of ids (one round-trip per render)
//   - A safe fallback formatter (`formatName(row, uid)`) that renders a
//     short hash when no name is set, so UI never shows raw uuids.
//
// Callers should always go through here — never read `profiles.first_name`
// directly, because the RLS will return null for any user other than yourself.

import { createClient } from './supabase/client'

/**
 * Resolve display info for a set of user ids. Returns a Map<userId, row>
 * where row = { first_name, last_name } (either field may be null).
 *
 * Empty/duplicate inputs handled. Missing ids simply don't appear in the
 * map — the caller uses formatName() with the fallback.
 */
export async function getDisplayNames(userIds) {
  const map = new Map()
  const ids = Array.from(new Set((userIds || []).filter(Boolean)))
  if (ids.length === 0) return map

  const sb = createClient()
  const { data, error } = await sb.rpc('get_display_names', { p_ids: ids })
  if (error) {
    // RPC missing → migration 048 not applied yet. Caller falls back to
    // formatName() with the user-id fragment.
    console.warn('[displayNames] get_display_names RPC unavailable:', error.message)
    return map
  }
  for (const row of data || []) {
    map.set(row.id, { first_name: row.first_name, last_name: row.last_name })
  }
  return map
}

/**
 * Format a user for display. Prefers first+last name, falls back to first,
 * falls back to "User abc12345" (first 8 chars of the uuid). Never returns
 * an empty string.
 *
 * Pass `row` from getDisplayNames() (or null) plus the original user id.
 */
export function formatName(row, userId) {
  const first = row?.first_name?.trim()
  const last = row?.last_name?.trim()
  if (first && last) return `${first} ${last}`
  if (first) return first
  if (last) return last
  return `User ${String(userId || '').slice(0, 8)}`
}

/**
 * Short "initial" for an avatar bubble. Picks the first letter of the
 * resolved name, or '?' when we know nothing. Always uppercase.
 */
export function initialFor(row, userId) {
  const name = formatName(row, userId)
  // formatName always returns something — pull the first letter.
  const ch = name.replace(/^User\s/, '').trim().charAt(0)
  return (ch || '?').toUpperCase()
}

/**
 * Look up a user-id from any of three handle forms:
 *   - real email       (alex@gmail.com  → profiles.email)
 *   - getguac handle   (alex            → profiles.email_alias)
 *   - getguac address  (alex@getguac.app→ split → profiles.email_alias)
 *
 * Used by:
 *   - household invite (addMemberByEmail)
 *   - DM open-by-handle (openThreadByEmail)
 *
 * Migration 050 extended the RPC to handle all three forms server-side;
 * we just normalize whitespace + lowercase before sending. RPC name kept
 * as `lookup_user_id_by_email` for backward compatibility, but the
 * parameter accepts any of the three.
 */
export async function lookupUserIdByEmail(input) {
  const clean = String(input || '').trim().toLowerCase()
  if (!clean) return null
  const sb = createClient()
  const { data, error } = await sb.rpc('lookup_user_id_by_email', { p_email: clean })
  if (error) {
    console.warn('[displayNames] lookup_user_id_by_email RPC unavailable:', error.message)
    return null
  }
  return data || null
}

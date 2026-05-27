// Pre-insert duplicate detection for the `receipts` table.
//
// All three receipt-creation paths (email parser, manual photo upload,
// quick-add form) previously inserted blindly, producing one row per
// source even when the rows were obviously the same purchase. This
// helper centralizes the "does a matching receipt already exist?" check
// so every path uses the SAME definition of "duplicate" as the /api/
// receipts/dedup endpoint:
//
//   same user · same normalized store · same date · same sign · same
//   total to ±1¢
//
// Returns the existing receipt id (string) or null.
//
// Notes:
// - Refunds vs purchases are kept separate via sign so a $-12.50 return
//   doesn't get merged with a $+12.50 purchase on the same day.
// - The ±1¢ window is checked client-side (within 1) because pgsql
//   abs(total - $X) < 0.011 wouldn't use the index well at scale; the
//   user/date filters narrow the candidate set enough that the in-app
//   loop is cheap.
// - Takes the supabase client as a parameter so it works equally well
//   from the user-session client (manual upload) and the admin client
//   (email poll worker).
//
// Caller's responsibility: decide what to do when a duplicate exists.
// Typical choice is to UPDATE the existing row with any new data
// (longer item list, parsed link, etc) rather than INSERT a second row.

import { normalizeStoreName } from './store-name-normalize'

export async function findExistingReceipt(sb, userId, candidate) {
  if (!sb || !userId || !candidate) return null
  const { store_name, date, total_amount } = candidate
  if (!store_name || !date || total_amount == null) return null

  const norm = normalizeStoreName(store_name)
  if (!norm) return null

  const total = Number(total_amount)
  if (!Number.isFinite(total)) return null
  const sign = total < 0 ? -1 : 1
  const absCents = Math.round(Math.abs(total) * 100)

  // Pull candidate rows for the same user + date. RLS still scopes to the
  // user, but we filter explicitly so the admin client path is also safe.
  const { data, error } = await sb
    .from('receipts')
    .select('id, store_name, total_amount')
    .eq('user_id', userId)
    .eq('date', date)
    .limit(50)
  if (error || !data || data.length === 0) return null

  for (const r of data) {
    if (!r.store_name) continue
    if (normalizeStoreName(r.store_name) !== norm) continue
    const rTotal = Number(r.total_amount || 0)
    const rSign = rTotal < 0 ? -1 : 1
    if (rSign !== sign) continue
    const rCents = Math.round(Math.abs(rTotal) * 100)
    if (Math.abs(rCents - absCents) <= 1) return r.id
  }
  return null
}

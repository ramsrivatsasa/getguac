// Consecutive-day count of receipt activity — branded "Smash days" to
// fit the GetGuac voice (Smashlist, "smash that buy"). Powers the 🥑
// counter chip on the dashboard and the social-proof line on public
// share-landing pages.
//
// Anchoring rule: today OR yesterday counts as the latest "smash day"
// so the counter doesn't reset to 0 the moment a user opens the app
// in the morning before scanning. The count starts at the most recent
// activity day and walks backward until it hits a gap.

export function computeSmashDays(receipts = []) {
  if (!Array.isArray(receipts) || receipts.length === 0) {
    return { smashDays: 0, lastActiveIso: null }
  }
  // Collect distinct YYYY-MM-DD strings the user logged activity on.
  const days = new Set()
  for (const r of receipts) {
    if (!r?.date) continue
    // Receipts can carry timestamptz or yyyy-mm-dd; normalize.
    const iso = String(r.date).slice(0, 10)
    if (iso.length === 10) days.add(iso)
  }
  if (days.size === 0) return { smashDays: 0, lastActiveIso: null }

  // Walk backward day-by-day from today; if today wasn't active,
  // accept yesterday as the starting point (grace day). Stop on the
  // first gap.
  const todayIso = new Date().toISOString().slice(0, 10)
  const yest = new Date(); yest.setDate(yest.getDate() - 1)
  const yestIso = yest.toISOString().slice(0, 10)

  let cursor
  if (days.has(todayIso)) cursor = new Date(todayIso + 'T00:00:00Z')
  else if (days.has(yestIso)) cursor = new Date(yestIso + 'T00:00:00Z')
  else return { smashDays: 0, lastActiveIso: [...days].sort().pop() }

  let smashDays = 0
  while (true) {
    const iso = cursor.toISOString().slice(0, 10)
    if (!days.has(iso)) break
    smashDays++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return { smashDays, lastActiveIso: [...days].sort().pop() }
}

// Consecutive-day count of receipt activity — branded "Smash days" to
// fit the GetGuac voice (Shopping List, "smash that buy"). Powers the 🥑
// counter chip on the dashboard and the social-proof line on public
// share-landing pages.
//
// Anchoring rule: today OR yesterday counts as the latest "smash day"
// so the counter doesn't reset to 0 the moment a user opens the app
// in the morning before scanning. The count starts at the most recent
// activity day and walks backward until it hits a gap.

export function computeSmashDays(receipts = [], bonus = 0) {
  if (!Array.isArray(receipts) || receipts.length === 0) {
    return { smashDays: bonus || 0, lastActiveIso: null }
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

  // Walk backward day-by-day from LOCAL today; if today wasn't active,
  // accept LOCAL yesterday as the starting point (grace day). Stop on
  // the first gap.
  //
  // Local-not-UTC matters: receipt.date is stored as printed on the
  // receipt (calendar day, no timezone), and mobile derives today from
  // DateTime.now() locally. If web used UTC midnight, a user in PST
  // would lose their streak at 4pm local when UTC rolled over — and
  // disagree with mobile by a day. Match the mobile algorithm exactly.
  const localIso = (d) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  const now = new Date()
  const todayIso = localIso(now)
  const yest = new Date(now); yest.setDate(yest.getDate() - 1)
  const yestIso = localIso(yest)

  let cursor
  if (days.has(todayIso)) cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  else if (days.has(yestIso)) cursor = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate())
  else return { smashDays: bonus || 0, lastActiveIso: [...days].sort().pop() }

  let smashDays = 0
  while (true) {
    const iso = localIso(cursor)
    if (!days.has(iso)) break
    smashDays++
    cursor.setDate(cursor.getDate() - 1)
  }
  // Referral bonus (profiles.smash_days_bonus) adds to the streak count.
  return { smashDays: smashDays + (bonus || 0), lastActiveIso: [...days].sort().pop() }
}

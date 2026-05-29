// Receipt-scan streak — counts consecutive days (ending today or
// yesterday) that the user has at least one receipt for. Powers the
// "🔥 N-day streak" chip on the dashboard.
//
// Why "today OR yesterday" anchors the streak:
//   If the user hasn't scanned yet today, we don't want their 30-day
//   streak to read "0" — that'd punish them for not opening the app
//   in the morning. We anchor on the most recent receipt day; the
//   streak survives as long as it's within 1 day of today.

export function computeReceiptStreak(receipts = []) {
  if (!Array.isArray(receipts) || receipts.length === 0) {
    return { streak: 0, lastScanIso: null }
  }
  // Collect distinct YYYY-MM-DD strings the user scanned on.
  const days = new Set()
  for (const r of receipts) {
    if (!r?.date) continue
    // Receipts can carry timestamptz or yyyy-mm-dd; normalize.
    const iso = String(r.date).slice(0, 10)
    if (iso.length === 10) days.add(iso)
  }
  if (days.size === 0) return { streak: 0, lastScanIso: null }

  // Walk backward day-by-day from today; if today wasn't scanned,
  // accept yesterday as the starting point (grace day). Stop on the
  // first gap.
  const todayIso = new Date().toISOString().slice(0, 10)
  const yest = new Date(); yest.setDate(yest.getDate() - 1)
  const yestIso = yest.toISOString().slice(0, 10)

  let cursor
  if (days.has(todayIso)) cursor = new Date(todayIso + 'T00:00:00Z')
  else if (days.has(yestIso)) cursor = new Date(yestIso + 'T00:00:00Z')
  else return { streak: 0, lastScanIso: [...days].sort().pop() }

  let streak = 0
  while (true) {
    const iso = cursor.toISOString().slice(0, 10)
    if (!days.has(iso)) break
    streak++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return { streak, lastScanIso: [...days].sort().pop() }
}

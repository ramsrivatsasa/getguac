import { createHash } from 'node:crypto'
import { fetchRecallNotices } from './product-recalls.mjs'
import { purchaseAlertsForUser } from './purchase-alerts.js'

export async function dispatchProductAlerts(db, sendPush, loadNotices = fetchRecallNotices) {
  const { notices, unavailable } = await loadNotices()
  const results = { attempted: 0, sent: 0, failed: 0, unavailable }
  const hour = new Date().getUTCHours()
  // Page users, not tokens: multiple devices must not duplicate the work.
  for (let offset = 0; ; offset += 100) {
    const { data: profiles, error } = await db.from('profiles')
      .select('id,notification_prefs').order('id').range(offset, offset + 99)
    if (error) throw new Error('Could not load alert preferences')
    for (const profile of profiles || []) {
      const prefs = profile.notification_prefs || {}
      if (prefs.product_recall === false) continue
      if (prefs.quiet_hours) {
        const start = Number(prefs.quiet_start ?? 22), end = Number(prefs.quiet_end ?? 7)
        if (start < end ? hour >= start && hour < end : hour >= start || hour < end) continue
      }
      try {
        const alerts = await purchaseAlertsForUser(db, profile.id, notices)
        const { data: log, error: logError } = await db.from('notification_log')
          .select('event_key').eq('user_id', profile.id).eq('category', 'product_recall')
        if (logError) throw new Error('Could not check already-sent alerts')
        const seen = new Set((log || []).map(r => r.event_key))
        let queued = 0
        for (const alert of alerts) {
          const eventKey = `recall:${createHash('sha256').update(alert.id).digest('hex')}`
          if (seen.has(eventKey)) continue
          if (queued++ >= 3) break
          results.attempted++
          const result = await sendPush(profile.id, {
            title: 'Product recall: check your purchase',
            body: `${alert.itemName} may match a ${alert.source} recall. Check the brand and lot number in the official notice.`,
            route: '/notifications',
          }, { category: 'product_recall', eventKey })
          if (result.sent > 0) results.sent++
          if (result.error || result.failed > 0) results.failed++
        }
      } catch { results.failed++ }
    }
    if (!profiles || profiles.length < 100) break
  }
  return results
}

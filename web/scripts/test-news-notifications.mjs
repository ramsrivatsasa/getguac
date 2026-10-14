import assert from 'node:assert/strict'
import { newsDigestKey, selectDigestStories, newsFrequency } from '../src/lib/news-notifications.mjs'
import { dispatchNewsNotifications } from '../src/lib/dispatch-news-notifications.mjs'
import { safeAuthNext } from '../src/lib/auth-next.mjs'
const now = new Date('2026-10-14T14:00:00Z')
assert.equal(newsFrequency({}), 'daily')
assert.equal(newsDigestKey({ news_frequency: 'off' }, now), null)
assert.equal(newsDigestKey({}, now), newsDigestKey({}, new Date('2026-10-14T23:00:00Z')))
assert.equal(newsDigestKey({ news_frequency: 'weekly' }, now), newsDigestKey({ news_frequency: 'weekly' }, new Date('2026-10-18T14:00:00Z')))
assert.equal(newsDigestKey({ quiet_hours: true, quiet_start: 22, quiet_end: 7 }, new Date('2026-10-14T23:00:00Z')), null)
const story = { title: 'AAPL earnings report', date: '2026-10-14T10:00:00Z', link: 'https://example.test/report', source: 'Synthetic test' }
assert.equal(selectDigestStories([story, story], {}, [], now).length, 1)
assert.equal(selectDigestStories([story], { news_watchlist_only: true }, ['MSFT'], now).length, 0)
assert.equal(selectDigestStories([story], { news_watchlist_only: true }, ['AAPL'], now).length, 1)
assert.equal(selectDigestStories([story], { news_frequency: 'important' }, [], now).length, 0)
assert.equal(selectDigestStories([{ ...story, important: true }], { news_frequency: 'important' }, [], now).length, 1)
assert.equal(selectDigestStories([{ ...story, date: '2026-10-15' }], {}, [], now).length, 0)
assert.equal(selectDigestStories([{ ...story, link: 'javascript:alert(1)' }], {}, [], now).length, 0)
assert.equal(selectDigestStories([{ ...story, date: '2026-10-10' }], {}, [], now).length, 0)
assert.equal(selectDigestStories([{ ...story, date: '2026-10-10' }], { news_frequency: 'weekly' }, [], now).length, 1)
assert.equal(selectDigestStories([{ ...story, title: 'Apple reports results' }], { news_watchlist_only: true }, ['AAPL'], now).length, 1)
assert.equal(selectDigestStories([{ ...story, title: 'FOMC monetary policy decision', link: 'https://www.federalreserve.gov/newsevents/pressreleases/test.htm' }], { news_frequency: 'important' }, [], now).length, 1)
assert.equal(safeAuthNext('/news?tab=watchlist'), '/news?tab=watchlist')
for (const path of ['https://example.test', '//example.test', '/\\example.test', null]) assert.equal(safeAuthNext(path), '/dashboard')
const stored = new Set(), pushes = []
const profiles = [{ id: 'off', notification_prefs: { news_frequency: 'off' } }, { id: 'daily', notification_prefs: {} }, { id: 'weekly', notification_prefs: { news_frequency: 'weekly', news_push: true } }]
const db = { from: table => table === 'profiles' ? { select: () => ({ order: () => ({ range: async () => ({ data: profiles }) }) }) } : { upsert: row => ({ select: async () => {
  const key = `${row.user_id}:${row.event_key}`
  if (stored.has(key)) return { data: [] }
  stored.add(key); return { data: [{ id: key, title: row.title }] }
} }) } }
const options = { now, loadNews: async () => ({ items: [story] }) }
const sendPush = async id => { pushes.push(id); return { sent: 1 } }
assert.equal((await dispatchNewsNotifications(db, sendPush, options)).created, 2)
assert.deepEqual(pushes, ['weekly'])
assert.equal((await dispatchNewsNotifications(db, sendPush, options)).created, 0)
assert.deepEqual(pushes, ['weekly'])
console.log('PASS news cadence, quiet hours, source priority, watchlist scope, freshness and safe links')

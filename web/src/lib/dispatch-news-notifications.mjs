import { readWatchlists } from './watchlists.mjs'
import { newsDigestKey, selectDigestStories } from './news-notifications.mjs'

// Reuses the existing notification job; no page must remain open.
export async function dispatchNewsNotifications(db, sendPush, { now = new Date(), loadNews } = {}) {
  const result = { created: 0, pushed: 0, failed: 0 }
  const news = loadNews ? await loadNews() : await (async () => {
    const { readNewsSnapshot, runNewsAgent } = await import('./background-agents/news')
    return await readNewsSnapshot(db) || await runNewsAgent({})
  })()
  for (let offset = 0; ; offset += 100) {
    const { data: profiles, error } = await db.from('profiles').select('id,notification_prefs').order('id').range(offset, offset + 99)
    if (error) throw new Error('News preferences could not load')
    for (const profile of profiles || []) {
      try {
        const prefs = profile.notification_prefs || {}, eventKey = newsDigestKey(prefs, now)
        if (!eventKey) continue
        let symbols = []
        if (prefs.news_watchlist_only === true) {
          const { data, error: userError } = await db.auth.admin.getUserById(profile.id)
          if (userError) throw new Error('Watchlists unavailable')
          symbols = [...new Set(readWatchlists(data.user?.user_metadata).lists.flatMap(list => list.symbols))]
        }
        const stories = selectDigestStories(news.items, prefs, symbols, now)
        if (!stories.length) continue
        const { data, error: writeError } = await db.from('news_notifications').upsert({ user_id: profile.id, event_key: eventKey, title: prefs.news_frequency === 'weekly' ? 'Your weekly news roundup' : 'Your news roundup', stories, created_at: now.toISOString() }, { onConflict: 'user_id,event_key', ignoreDuplicates: true }).select('id,title')
        if (writeError) throw new Error('News notification could not save')
        if (!data?.length) continue
        result.created++
        if (prefs.news_push === true) {
          const sent = await sendPush(profile.id, { title: data[0].title, body: stories[0].title, route: '/notifications' }, { category: 'news', eventKey })
          result.pushed += sent.sent > 0 ? 1 : 0
          if (sent.error || sent.failed) result.failed++
        }
      } catch { result.failed++ }
    }
    if (!profiles || profiles.length < 100) break
  }
  return result
}

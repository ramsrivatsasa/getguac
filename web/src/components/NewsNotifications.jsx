'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

export default function NewsNotifications() {
  const client = useQueryClient(), [error, setError] = useState(''), [busy, setBusy] = useState(null)
  const alerts = useQuery({ queryKey: ['news-notifications'], queryFn: async () => {
    const res = await fetch('/api/notify/news')
    if (!res.ok) throw new Error('News alerts could not load')
    return res.json()
  }, staleTime: 60000 })
  async function mark(id) {
    setBusy(id); setError('')
    try {
      const res = await fetch('/api/notify/news', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      if (!res.ok) throw new Error()
      await client.invalidateQueries({ queryKey: ['news-notifications'] })
    } catch { setError('Could not mark this alert as read. Try again.') } finally { setBusy(null) }
  }
  return <section aria-label="News alerts" className="rounded-xl border border-violet-100 bg-white p-4">
    <h2 className="font-display text-lg font-bold">News alerts</h2>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {alerts.isLoading ? <p role="status" className="py-3 text-sm">Loading news alerts…</p> : alerts.isError ? <p role="alert" className="py-3 text-sm">News alerts could not load. <button className="min-h-11 underline" onClick={() => alerts.refetch()}>Retry</button></p> : !alerts.data?.items?.length ? <p className="py-3 text-sm text-guac-muted">Your next roundup will appear here when matching news is available.</p> : <div className="divide-y divide-violet-100">{alerts.data.items.map(item => <article key={item.id} className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">{item.title}{!item.read_at && <span className="ml-2 text-xs text-violet-700">New</span>}</h3><time className="text-xs text-guac-muted" dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString()}</time></div>
      <ul className="mt-1">{(item.stories || []).map(story => <li key={story.url} className="py-1"><a className="block py-1 text-sm font-semibold text-violet-800 underline-offset-2 hover:underline" href={story.url} target="_blank" rel="noreferrer">{story.title}</a><p className="text-xs text-guac-muted">{story.source} · {new Date(story.date).toLocaleDateString()}</p></li>)}</ul>
      {!item.read_at && <button disabled={busy === item.id} onClick={() => mark(item.id)} className="min-h-11 text-sm font-semibold text-violet-700 disabled:opacity-50">{busy === item.id ? 'Saving…' : 'Mark as read'}</button>}
    </article>)}</div>}
  </section>
}

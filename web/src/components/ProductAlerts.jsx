'use client'
import { useEffect, useState } from 'react'
import { Bell, ExternalLink } from 'lucide-react'

export default function ProductAlerts() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setError(false)
    fetch('/api/notify/product-alerts', { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error('Unavailable'); return r.json() })
      .then(setData).catch(e => { if (e.name !== 'AbortError') setError(true) })
    return () => controller.abort()
  }, [retry])

  return (
    <section className="card space-y-3" aria-labelledby="product-alert-title">
      <h2 id="product-alert-title" className="font-bold flex items-center gap-2"><Bell size={18} /> Product safety notifications</h2>
      <p className="text-sm text-gray-600">Recent official recalls that may match your purchases, with groceries first. Check the brand, package dates and lot number in the notice.</p>
      {error ? <p role="alert" className="text-sm text-amber-800">Could not check your purchases. <button className="underline font-semibold" onClick={() => setRetry(n => n + 1)}>Try again</button></p>
        : !data ? <p role="status" className="text-sm text-gray-500">Checking your purchases…</p>
        : <>
          {data.unavailable.length > 0 && <p role="status" className="text-sm text-amber-800">{data.unavailable.join(' and ')} updates are unavailable. Results may be incomplete.</p>}
          {data.alerts.length === 0 && <p className="text-sm text-gray-500">No possible matches found in the available notices. Short or generic receipt descriptions may miss a match.</p>}
          {(expanded ? data.alerts : data.alerts.slice(0, 3)).map(alert => (
            <article key={alert.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2 break-words">
              <p className="text-xs font-semibold text-amber-900">Possible purchase match · {alert.source} · <time className="whitespace-nowrap" dateTime={alert.date}>{alert.date}</time></p>
              <h3 className="font-semibold text-gray-900">{alert.title}</h3>
              <p className="text-sm text-gray-700">You bought {alert.itemName}{alert.storeName ? ` at ${alert.storeName}` : ''} on {alert.purchaseDate}. Your receipt cannot confirm whether the recalled lot is yours.</p>
              <a href={alert.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-bold text-guac-700 underline">Check official notice <ExternalLink size={14} /></a>
            </article>
          ))}
          {data.alerts.length > 3 && <button className="btn-secondary" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>{expanded ? 'Show fewer' : `Show all ${data.alerts.length} notifications`}</button>}
        </>}
      <p className="text-xs text-gray-500">FDA product recalls and USDA food alerts from the past 90 days, plus selected state notices. Receipt matching is approximate and does not cover every recall.</p>
    </section>
  )
}

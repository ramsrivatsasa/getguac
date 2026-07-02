'use client'
// /coupons — a dedicated page that pulls live coupons for the big stores from
// Google (via /api/coupons → SerpApi) and lays them out per store. Fetches are
// concurrency-limited (3 at a time) to stay under the IP rate limit, and each
// store's result is cross-user cached (coupons::<store>, 7-day) so repeat
// visits are basically free. No AI-invented codes — these are real results.

import { useEffect, useRef, useState } from 'react'
import { Ticket, Globe, ExternalLink, Search } from 'lucide-react'
import { STORE_CATALOG } from '../lib/storeCatalog'

// The "big stores" we feature on the coupons page (kept under the rate limit).
const BIG = STORE_CATALOG.slice(0, 12)
const CONCURRENCY = 3

export default function CouponsPageClient() {
  const [map, setMap] = useState({}) // slug -> { status: 'loading'|'done'|'error', coupons: [] }
  const [filter, setFilter] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    let cancelled = false
    const queue = [...BIG]

    async function worker() {
      while (queue.length && !cancelled) {
        const store = queue.shift()
        setMap((m) => ({ ...m, [store.slug]: { status: 'loading', coupons: [] } }))
        try {
          const res = await fetch('/api/coupons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ store: store.name }),
          })
          const data = await res.json().catch(() => ({}))
          if (cancelled) return
          setMap((m) => ({ ...m, [store.slug]: { status: res.ok ? 'done' : 'error', coupons: data.coupons || [] } }))
        } catch {
          if (!cancelled) setMap((m) => ({ ...m, [store.slug]: { status: 'error', coupons: [] } }))
        }
      }
    }
    Promise.all(Array.from({ length: CONCURRENCY }, worker))
    return () => { cancelled = true }
  }, [])

  const q = filter.trim().toLowerCase()
  const stores = q ? BIG.filter((s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)) : BIG

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
      <div className="relative max-w-md mx-auto mb-10">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Find a store…"
          className="w-full pl-11 pr-4 py-3 rounded-full border border-guac-line2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-guac-600"
        />
      </div>

      <div className="space-y-8">
        {stores.map((s) => (
          <StoreCoupons key={s.slug} s={s} st={map[s.slug] || { status: 'loading', coupons: [] }} />
        ))}
        {stores.length === 0 && <p className="text-center text-gray-500 py-10">No store matches “{filter}”.</p>}
      </div>
    </div>
  )
}

function StoreCoupons({ s, st }) {
  const coupons = (st.coupons || []).slice(0, 6)
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: s.color }}>
          <span className="drop-shadow-sm">{s.emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="gg-h2 leading-tight">{s.name} coupons</h2>
          <p className="text-[11px] text-gray-400">{s.category}</p>
        </div>
        <a href={s.dealsUrl} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-guac-700 hover:underline">
          Official deals <ExternalLink size={12} />
        </a>
      </div>

      <div className="p-3">
        {st.status === 'loading' && (
          <div className="grid sm:grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-50 animate-pulse" />
            ))}
          </div>
        )}
        {st.status === 'error' && (
          <p className="text-sm text-gray-400 px-1 py-2">Couldn’t load coupons right now. <a className="text-guac-700 font-semibold hover:underline" href={s.dealsUrl} target="_blank" rel="noreferrer">See {s.name} deals →</a></p>
        )}
        {st.status === 'done' && coupons.length === 0 && (
          <p className="text-sm text-gray-400 px-1 py-2">No coupon pages found right now.</p>
        )}
        {st.status === 'done' && coupons.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2">
            {coupons.map((c, i) => <CouponCard key={i} c={c} />)}
          </div>
        )}
      </div>
    </section>
  )
}

function CouponCard({ c }) {
  return (
    <a href={c.url} target="_blank" rel="noreferrer"
      className="block rounded-xl border border-gray-100 hover:border-guac-line2 hover:bg-guac-50/40 p-3 transition-colors">
      <div className="flex items-start gap-2">
        <Ticket size={15} className="text-guac-600 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{c.title}</p>
          {c.snippet && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{c.snippet}</p>}
          <p className="text-[10px] text-guac-700 font-semibold mt-1 inline-flex items-center gap-1">
            <Globe size={10} /> {c.source}{c.date ? ` · ${c.date}` : ''}
          </p>
        </div>
        <ExternalLink size={13} className="text-gray-300 shrink-0 mt-0.5" />
      </div>
    </a>
  )
}

'use client'
// /rakuten — standalone, shareable Deals & Coupons page powered by the
// Rakuten Advertising Coupon API.
//
// PUBLIC (not behind the auth middleware) and intentionally NOT linked from
// any navigation/menu — a direct-URL-only page so the link can be shared.
//
// It calls GET /api/rakuten/coupons (server-side proxy that holds the OAuth2
// credentials). Until the RAKUTEN_* env vars are set, that route returns
// 503 {configured:false} and this page shows a friendly "coming soon" state
// instead of an error. Once credentials are added, it renders the coupons.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import GuacMascotAnimated from '../../components/GuacMascotAnimated'

// ── Best-effort coupon extraction ─────────────────────────────────────────
// Rakuten's Coupon API shape can vary (and the legacy service returns XML).
// We defensively pull the largest array-of-objects out of the JSON payload
// and normalise common field names so the page renders something sensible
// the moment real data flows — to be tightened once we see the live shape.
function pick(obj, keys) {
  for (const want of keys) {
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase() === want) return obj[k]
    }
  }
  return undefined
}
function normalizeCoupon(o) {
  if (!o || typeof o !== 'object') return null
  const title = pick(o, ['offerdescription', 'description', 'offer', 'title', 'couponrestriction', 'name'])
  const advertiser = pick(o, ['advertisername', 'merchantname', 'advertiser', 'network'])
  const link = pick(o, ['clickurl', 'link', 'url'])
  const code = pick(o, ['couponcode', 'code'])
  const ends = pick(o, ['offerenddate', 'enddate', 'enddatetime', 'expires'])
  if (!title && !link && !code) return null
  return {
    title: String(title || advertiser || 'Deal'),
    advertiser: advertiser ? String(advertiser) : null,
    link: link ? String(link) : null,
    code: code ? String(code) : null,
    ends: ends ? String(ends) : null,
  }
}
function extractCoupons(payload) {
  const d = payload?.data
  if (!d) return []
  const arrays = []
  const visit = (node, depth) => {
    if (!node || depth > 5) return
    if (Array.isArray(node)) {
      if (node.length && typeof node[0] === 'object') arrays.push(node)
      return
    }
    if (typeof node === 'object') for (const k of Object.keys(node)) visit(node[k], depth + 1)
  }
  visit(d, 0)
  const best = arrays.sort((a, b) => b.length - a.length)[0] || []
  return best.map(normalizeCoupon).filter(Boolean)
}

export default function RakutenDealsPage() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/rakuten/coupons?resultsperpage=24', { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.status === 503 || json?.configured === false) {
          setState({ status: 'unconfigured' })
          return
        }
        if (!res.ok) {
          setState({ status: 'error', message: json?.error || `Request failed (${res.status})` })
          return
        }
        const coupons = extractCoupons(json)
        setState({ status: 'ready', coupons, format: json?.format })
      } catch (err) {
        if (!cancelled) setState({ status: 'error', message: err.message || 'Failed to load' })
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/60 to-white">
      <header className="sticky top-0 z-20 backdrop-blur bg-white/80 border-b border-emerald-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-emerald-800">
            <span className="text-xl">🥑</span> GetGuac
          </Link>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Deals &amp; Coupons</p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-7">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-emerald-900">Deals &amp; Coupons</h1>
          <p className="text-gray-500 mt-1">Live offers from your favourite stores, powered by Rakuten Advertising.</p>
        </div>

        {state.status === 'loading' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 animate-pulse">
                <div className="h-3 w-24 bg-gray-100 rounded mb-3" />
                <div className="h-4 w-full bg-gray-100 rounded mb-2" />
                <div className="h-4 w-2/3 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {state.status === 'unconfigured' && (
          <div className="rounded-3xl bg-white border border-emerald-100 shadow-sm py-16 px-6 flex flex-col items-center text-center">
            <GuacMascotAnimated animation="idle" size={120} />
            <h2 className="mt-4 text-lg font-bold text-emerald-900">Live deals are coming soon 🥑</h2>
            <p className="mt-1 max-w-md text-gray-500">
              We&apos;re wiring up the Rakuten Advertising connection. Check back shortly — your
              store coupons will appear right here.
            </p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="rounded-3xl bg-white border border-rose-100 shadow-sm py-14 px-6 flex flex-col items-center text-center">
            <GuacMascotAnimated animation="idle" size={110} />
            <h2 className="mt-4 text-lg font-bold text-rose-700">Couldn&apos;t load deals</h2>
            <p className="mt-1 max-w-md text-gray-500">{state.message}</p>
          </div>
        )}

        {state.status === 'ready' && state.coupons.length === 0 && (
          <div className="rounded-3xl bg-white border border-emerald-100 shadow-sm py-16 px-6 flex flex-col items-center text-center">
            <GuacMascotAnimated animation="idle" size={120} />
            <h2 className="mt-4 text-lg font-bold text-emerald-900">No deals right now</h2>
            <p className="mt-1 max-w-md text-gray-500">Nothing live at the moment — check back soon for fresh coupons.</p>
          </div>
        )}

        {state.status === 'ready' && state.coupons.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.coupons.map((c, i) => (
              <div key={i} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 flex flex-col hover:shadow-md transition-shadow">
                {c.advertiser && (
                  <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 mb-1.5">{c.advertiser}</p>
                )}
                <p className="font-semibold text-gray-900 leading-snug flex-1">{c.title}</p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {c.code && (
                    <span className="font-mono text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded-lg">
                      {c.code}
                    </span>
                  )}
                  {c.ends && <span className="text-[11px] text-gray-400">ends {c.ends}</span>}
                </div>
                {c.link && (
                  <a href={c.link} target="_blank" rel="noopener noreferrer"
                    className="mt-3 inline-flex justify-center items-center px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors">
                    Shop deal
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

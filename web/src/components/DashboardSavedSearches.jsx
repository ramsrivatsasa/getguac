'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Bookmark, ArrowRight, Search } from 'lucide-react'
import { useSavedSearches, useAddSavedSearch } from '../hooks/useSavedSearches'
import { getSavedSearches as getCookieSearches, clearSavedSearches } from '../lib/marketplaceSearches'

// Shows the searches the user saved in the Marketplace on the dashboard home —
// and CLAIMS any that were saved to the anonymous cookie into their account.
//
// Why claim: the public /marketplace always writes saves to a first-party
// cookie (it has no session), so a search saved before signing in — OR saved
// on the marketplace while logged in — never reached the account and so never
// showed on the dashboard. On dashboard load we import the cookie's searches
// into saved_searches (idempotent dedupe) and clear the cookie, fulfilling the
// marketplace's "create an account and we'll watch these for you" promise.
export default function DashboardSavedSearches({ embedded = false, showEmpty = false }) {
  const { data: saved = [] } = useSavedSearches()
  const addSearch = useAddSavedSearch()
  const claimed = useRef(false)

  useEffect(() => {
    if (claimed.current) return
    const cookie = getCookieSearches()
    if (!cookie.length) return
    claimed.current = true
    ;(async () => {
      for (const s of cookie) {
        try { await addSearch.mutateAsync({ label: s.q, query: s.q }) } catch { /* skip */ }
      }
      clearSavedSearches()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!saved.length && !showEmpty) return null
  const items = saved.slice(0, 12)

  return (
    <div className={embedded ? '' : 'bg-white rounded-2xl border border-guac-line shadow-sm p-4 mb-4'}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="gg-h2 inline-flex items-center gap-2">
          <Bookmark size={15} className="text-gray-400" /> Searches you saved
        </h3>
        <Link href="/steals" className="text-xs font-semibold text-gray-500 hover:underline inline-flex items-center gap-1">
          Manage in Steals <ArrowRight size={12} />
        </Link>
      </div>
      {items.length ? <div className="flex flex-wrap gap-2">
        {items.map((s) => {
          const q = s.query || s.label
          return (
            <Link
              key={s.id}
              href={`/marketplace?q=${encodeURIComponent(q)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Search size={12} /> {s.label || s.query}
            </Link>
          )
        })}
      </div> : <Link href="/steals" className="flex min-h-24 items-center gap-3 rounded-xl border border-dashed border-violet-200 bg-violet-50/60 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-white"><Search size={17}/></span><span><strong className="block text-sm text-slate-900">Save a product search</strong><span className="mt-1 block text-xs font-normal text-slate-500">Get back to products you are comparing and watch for better prices.</span></span></Link>}
    </div>
  )
}

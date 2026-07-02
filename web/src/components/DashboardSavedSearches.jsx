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
export default function DashboardSavedSearches() {
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

  if (!saved.length) return null
  const items = saved.slice(0, 12)

  return (
    <div className="bg-white rounded-2xl border border-guac-line shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="gg-h2 inline-flex items-center gap-2">
          <Bookmark size={15} className="text-gray-400" /> Searches you saved
        </h3>
        <Link href="/steals" className="text-xs font-semibold text-gray-500 hover:underline inline-flex items-center gap-1">
          Manage in Steals <ArrowRight size={12} />
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
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
      </div>
    </div>
  )
}

'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Clock, ChevronRight, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getEligibleReturns } from '../lib/db'

// In-app return-window reminder. Surfaces items whose return window
// closes within URGENT_DAYS (default 7) so the user can act on them
// before the window expires. Dismissable per browser session so it
// doesn't nag you all day after you've already seen it; comes back
// on the next session OR when a new urgent item appears.
//
// Why in-app banner (not email): no send-mail infra for the user's
// own outgoing notifications yet, and an email cron would require
// scheduled-fire infrastructure. The dashboard banner gets the same
// "remind me before I lose money" signal across without any new
// pipes.

const URGENT_DAYS = 7
const DISMISS_KEY = 'getguac.returns-banner.dismissed.v1'

export default function UpcomingReturnsBanner() {
  const [dismissed, setDismissed] = useState(false)

  // Hydrate dismiss state from sessionStorage so the banner doesn't
  // flicker back on every nav within the same tab.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.sessionStorage.getItem(DISMISS_KEY)
      if (stored) setDismissed(true)
    } catch {}
  }, [])

  const { data: returns = [] } = useQuery({
    queryKey: ['eligible-returns'],
    queryFn: getEligibleReturns,
    staleTime: 5 * 60_000,
  })

  // Filter to truly-urgent rows + dedupe by item id (safety net).
  const urgent = returns.filter(r => Number(r.daysLeft) > 0 && Number(r.daysLeft) <= URGENT_DAYS)
  if (urgent.length === 0 || dismissed) return null

  // Sort soonest-first so the most-urgent items render at the top.
  urgent.sort((a, b) => a.daysLeft - b.daysLeft)
  const first = urgent[0]
  const more = urgent.length - 1

  function dismiss() {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {}
  }

  return (
    <div className="card border-l-4 border-amber-400 bg-amber-50/40 flex items-center justify-between gap-3 py-3 px-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Clock size={18} className="text-amber-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-amber-900">
            {urgent.length === 1 ? '1 item' : `${urgent.length} items`} expire returnable in {URGENT_DAYS} days or less
          </p>
          <p className="text-xs text-amber-800/80 mt-0.5 truncate">
            <span className="font-semibold">{first.item_name}</span>
            {first.store_name && <> at {String(first.store_name).toUpperCase()}</>}
            {' · '}
            <span className="font-mono">{first.daysLeft} day{first.daysLeft === 1 ? '' : 's'} left</span>
            {more > 0 && <span className="text-amber-700"> · +{more} more</span>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Link
          href="/returns"
          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors"
        >
          Review
          <ChevronRight size={12} />
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="w-8 h-8 rounded-lg text-amber-700 hover:bg-amber-100 flex items-center justify-center transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

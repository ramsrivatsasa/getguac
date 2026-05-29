// Recent-activity feed for the dashboard. Stitches together the
// user's most recent receipts + most recent Smashlist adds + most
// recent ratings into a single chronological timeline. Lives next
// to the GuacScore / Smash days tiles so the dashboard reads as
// "where am I now and what just happened".
//
// Reads-only — no mutations, no client cache writes. Data comes
// from existing TanStack queries (receipts, shopping list, stash)
// so we don't add a new server round-trip just to render it.
'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Receipt, ShoppingCart, Star, Clock, PiggyBank } from 'lucide-react'
import { getShoppingList } from '../lib/db'
import { displayStoreName } from '../lib/store-name-normalize'
import { logoUrlForStore } from '../lib/store-logo'
import { fetchRecent as fetchRecentGuacMoney, sourceLabel as guacMoneySourceLabel } from '../lib/guacMoney'

const ICONS = {
  receipt: <Receipt size={13} className="text-emerald-700" />,
  smashlist: <ShoppingCart size={13} className="text-rose-700" />,
  rating: <Star size={13} className="text-amber-600 fill-amber-500" />,
  guacmoney: <PiggyBank size={13} className="text-emerald-700" />,
}

const ROW_LIMIT = 10

export function ActivityFeed({ receipts = [] }) {
  const { data: shopping = [] } = useQuery({
    queryKey: ['shopping'],
    queryFn: getShoppingList,
    staleTime: 1000 * 60,
  })

  // GuacMoney earn events — separate query so the feed picks up
  // recent saves as soon as the user does an Auto-Add Cheapest.
  const { data: guacMoneyEvents = [] } = useQuery({
    queryKey: ['guac-money-recent'],
    queryFn: () => fetchRecentGuacMoney(20),
    staleTime: 30_000,
  })

  const events = useMemo(() => {
    const out = []
    // Recent receipts — chronological top-10.
    for (const r of receipts.slice(0, 30)) {
      if (!r?.date) continue
      out.push({
        kind: 'receipt',
        ts: r.date,
        label: 'Receipt scanned',
        title: r.store_name || 'Unknown store',
        amount: Number(r.total_amount) || 0,
        store: r.store_name,
        href: `/receipts/${r.id}`,
      })
    }
    // Recent Smashlist adds — order by created_at descending.
    const recentAdds = [...shopping]
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 20)
    for (const it of recentAdds) {
      if (it.predicted && !it.approved) continue   // skip Buy Again suggestions
      out.push({
        kind: 'smashlist',
        ts: it.created_at || '',
        label: 'Added to Smashlist',
        title: it.item_name || 'Item',
        amount: it.price ? Number(it.price) : null,
        store: it.store?.store_name,
        href: '/shopping',
      })
    }
    // GuacMoney earn events — most prominent in the feed when present
    // since "you saved real $X" is the win-state the user actively
    // wants to see.
    for (const ev of guacMoneyEvents) {
      out.push({
        kind: 'guacmoney',
        ts: ev.created_at,
        label: guacMoneySourceLabel(ev.source),
        title: ev.item_name || 'Save',
        amount: Number(ev.amount) || 0,
        store: ev.store_name,
        moneyEarn: true,
        href: '/shopping',
      })
    }
    // Sort merged feed descending by timestamp, cap at ROW_LIMIT.
    return out
      .filter(e => e.ts)
      .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
      .slice(0, ROW_LIMIT)
  }, [receipts, shopping, guacMoneyEvents])

  if (events.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={14} className="text-emerald-700" />
          <h3 className="font-bold text-gray-800 text-sm">Recent activity</h3>
        </div>
        <p className="text-xs text-gray-500">
          Scan a receipt or add an item to your Smashlist — your activity will land here.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={14} className="text-emerald-700" />
        <h3 className="font-bold text-gray-800 text-sm">Recent activity</h3>
        <span className="ml-auto text-[10px] text-gray-400 uppercase tracking-wider font-bold">
          last {events.length}
        </span>
      </div>
      <ul className="divide-y divide-gray-100">
        {events.map((e, i) => (
          <ActivityRow key={`${e.kind}-${e.ts}-${i}`} event={e} />
        ))}
      </ul>
    </div>
  )
}

function ActivityRow({ event }) {
  const date = event.ts
    ? new Date(String(event.ts).slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''
  const inner = (
    <div className="flex items-center gap-2.5 py-2 text-sm">
      <span className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center shrink-0 ring-1 ring-gray-100">
        {logoForEvent(event)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate">{event.title}</p>
        <p className="text-[11px] text-gray-500">
          {event.label}
          {event.store && <> · {displayStoreName(event.store)}</>}
        </p>
      </div>
      <div className="text-right shrink-0">
        {event.amount != null && (
          <p className={`font-bold tabular-nums text-sm ${event.moneyEarn ? 'text-emerald-600' : 'text-emerald-700'}`}>
            {event.moneyEarn ? '+' : ''}${event.amount.toFixed(2)}
            {event.moneyEarn && <span className="text-[10px] ml-1">🥑</span>}
          </p>
        )}
        <p className="text-[10px] text-gray-400">{date}</p>
      </div>
    </div>
  )
  if (event.href) {
    return (
      <li>
        <Link href={event.href} className="block hover:bg-gray-50/70 -mx-2 px-2 rounded-lg transition-colors">
          {inner}
        </Link>
      </li>
    )
  }
  return <li>{inner}</li>
}

function logoForEvent(event) {
  if (event.store) {
    const url = logoUrlForStore(event.store)
    if (url) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          width={16}
          height={16}
          loading="lazy"
          className="w-4 h-4 object-contain"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      )
    }
  }
  return ICONS[event.kind] || <Clock size={13} className="text-gray-400" />
}

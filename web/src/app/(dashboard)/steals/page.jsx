'use client'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Search, BadgeDollarSign, Crown, ShoppingCart, Clock, Gift, RefreshCw } from 'lucide-react'
import { getStashItems, getReceipts, getRewards } from '../../../lib/db'
import { predictReplenishItems, expiringRewards } from '../../../lib/userProfile'
import BestPricesModal from '../../../components/BestPricesModal'
import GuacMascot from '../../../components/GuacMascot'
import { displayStoreName } from '../../../lib/store-name-normalize'

export default function StealsPage() {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState(null)

  // Surface the user's recent purchases so they can one-tap check current prices
  const { data: rows = [] } = useQuery({ queryKey: ['stash'], queryFn: getStashItems, staleTime: 60_000 })
  const { data: receipts = [] } = useQuery({ queryKey: ['receipts'], queryFn: () => getReceipts({}), staleTime: 60_000 })
  const { data: rewards = [] } = useQuery({ queryKey: ['rewards'], queryFn: getRewards, staleTime: 60_000 })

  // Local-deal intelligence — derived from the user's own data
  const replenish = useMemo(() => predictReplenishItems({ receipts, items: rows }, { now: Date.now(), limit: 6 }), [receipts, rows])
  const expiring  = useMemo(() => expiringRewards(rewards, 30), [rewards])

  // Top 8 unique products by spend
  const topItems = []
  const seen = new Set()
  for (const r of rows) {
    const key = (r.sku || r.item_name || '').toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    topItems.push({ item_name: r.item_name, sku: r.sku, category: r.category, last_price: parseFloat(r.price || 0) })
    if (topItems.length >= 8) break
  }

  function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setPicked({ item_name: query.trim() })
  }

  return (
    <div className="space-y-5 max-w-5xl font-sans">
      <div className="flex items-center gap-3 flex-wrap">
        <GuacMascot expression="rich" size={70} />
        <div className="flex-1 min-w-[200px]">
          <h1 className="page-title">Steals</h1>
          <p className="text-sm text-gray-500">Finding your Steals — cheapest store across the web for anything you want.</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">🥑 Guac-AI Powered</span>
      </div>

      {/* Search box */}
      <form onSubmit={handleSearch} className="card flex items-center gap-3">
        <Search size={16} className="text-emerald-600 shrink-0" />
        <input
          className="flex-1 bg-transparent text-base focus:outline-none placeholder:text-gray-400 font-sans"
          placeholder="Type any product, SKU, or brand…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button type="submit" disabled={!query.trim()} className="btn-primary">
          <BadgeDollarSign size={15} /> Find Steals
        </button>
      </form>

      {/* Local Deals — from your own purchase history & rewards */}
      {(replenish.length > 0 || expiring.length > 0) && (
        <div className="card bg-gradient-to-br from-amber-50/50 to-rose-50/40 border-amber-200/60">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-1.5">
            <Clock size={12} /> Local Deals — based on your history
          </p>

          {expiring.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-1.5 flex items-center gap-1">
                <Gift size={10} /> Rewards expiring soon
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {expiring.slice(0, 6).map(r => (
                  <Link key={r.id} href={`/rewards/${r.id}`}
                    className="rounded-xl bg-white border border-rose-200 hover:border-rose-400 hover:shadow-md transition-all px-3 py-2 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 text-base">🎁</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{r.reward_title || r.reward_no}</p>
                      <p className="text-[10px] text-gray-500 truncate">{displayStoreName(r.store_name)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-[10px] font-bold tabular-nums ${r.expires_in_days <= 7 ? 'text-rose-600' : 'text-amber-700'}`}>
                        {r.expires_in_days === 0 ? 'today' : `${r.expires_in_days}d`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {replenish.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5 flex items-center gap-1">
                <RefreshCw size={10} /> Likely due for a restock
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {replenish.map(r => (
                  <button key={r.key}
                    onClick={() => setPicked({ item_name: r.item_name, sku: r.sku, category: r.category })}
                    className="text-left rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-md transition-all px-3 py-2 flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-base ${
                      r.tag === 'stale' ? 'bg-rose-100 text-rose-700'
                      : r.tag === 'overdue' ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      <RefreshCw size={14} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{r.item_name}</p>
                      <p className="text-[10px] text-gray-500">
                        {r.times_bought}× · last {r.days_since_last}d ago
                        {r.store_name && <> · usually {displayStoreName(r.store_name)}</>}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-gray-500 shrink-0">Steal&nbsp;it</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent stash items — quick one-tap */}
      {topItems.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            ⚡ One-tap from your Stash
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {topItems.map((it, i) => (
              <button
                key={i}
                onClick={() => setPicked(it)}
                className="group text-left rounded-2xl border border-emerald-100 bg-white p-3 hover:shadow-lg hover:border-emerald-400 hover:scale-[1.03] hover:-translate-y-0.5 active:scale-[0.98] transition-all">
                <div className="flex items-start gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 via-rose-500 to-fuchsia-600 text-white shadow-md flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Crown size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">{it.item_name}</p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {it.sku ? <span className="font-mono">SKU {it.sku}</span> : 'no SKU'}
                      {it.last_price > 0 && <span className="ml-2">last <span className="font-bold text-emerald-700">${it.last_price.toFixed(2)}</span></span>}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="card bg-gradient-to-br from-emerald-50/60 to-lime-50/40">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingCart size={14} className="text-emerald-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">How Steals works</span>
        </div>
        <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
          <li>Type the product name or pick from your Stash.</li>
          <li>Guac-AI scans the live web — Walmart, Amazon, Target, Costco, Home Depot, Lowe&apos;s, and more.</li>
          <li>Cheapest store wins. Tap the link to go straight to that product page.</li>
        </ol>
      </div>

      <BestPricesModal open={!!picked} onClose={() => setPicked(null)} item={picked} />
    </div>
  )
}

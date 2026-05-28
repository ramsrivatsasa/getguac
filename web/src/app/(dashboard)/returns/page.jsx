'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Undo2, Search, ExternalLink, RotateCcw, Calendar, Store as StoreIcon, Clock, Shield } from 'lucide-react'
import { getReturns, updateReceiptItem, getEligibleReturns } from '../../../lib/db'
import GuacMascot from '../../../components/GuacMascot'
import { displayStoreName } from '../../../lib/store-name-normalize'

export default function ReturnsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  // Two views on this page now:
  //   'eligible' — items still in their return window with a days-remaining countdown
  //   'returned' — items already returned (the original /returns view)
  // Default to 'eligible' because that's the action-driving view.
  const [tab, setTab] = useState('eligible')

  const { data: returns = [], isLoading, error } = useQuery({
    queryKey: ['returns'],
    queryFn: getReturns,
    staleTime: 1000 * 60,
  })

  const { data: eligible = [], isLoading: eligLoading } = useQuery({
    queryKey: ['returns-eligible'],
    queryFn: getEligibleReturns,
    staleTime: 1000 * 60,
  })

  const undoReturn = useMutation({
    mutationFn: (id) => updateReceiptItem(id, { returned: false, return_date: null }),
    onSuccess: () => {
      toast.success('Return reversed')
      qc.invalidateQueries({ queryKey: ['returns'] })
      qc.invalidateQueries({ queryKey: ['receipts'] })
    },
    onError: err => toast.error(err.message),
  })

  const markReturned = useMutation({
    mutationFn: (id) => updateReceiptItem(id, { returned: true, return_date: new Date().toISOString().slice(0, 10) }),
    onSuccess: () => {
      toast.success('Marked as returned')
      qc.invalidateQueries({ queryKey: ['returns'] })
      qc.invalidateQueries({ queryKey: ['returns-eligible'] })
      qc.invalidateQueries({ queryKey: ['receipts'] })
    },
    onError: err => toast.error(err.message),
  })

  const filtered = returns.filter(r => {
    const s = search.toLowerCase()
    return r.item_name?.toLowerCase().includes(s) ||
           r.sku?.toLowerCase().includes(s) ||
           r.model?.toLowerCase().includes(s) ||
           r.receipts?.store_name?.toLowerCase().includes(s)
  })

  const filteredEligible = eligible.filter(r => {
    const s = search.toLowerCase()
    return r.item_name?.toLowerCase().includes(s) ||
           r.sku?.toLowerCase().includes(s) ||
           r.model?.toLowerCase().includes(s) ||
           r.store_name?.toLowerCase().includes(s)
  })

  const totalRefunded = filtered.reduce((sum, r) => sum + Math.abs(parseFloat(r.price || 0)), 0)
  const totalEligibleValue = filteredEligible.reduce((sum, r) => sum + Math.abs(parseFloat(r.price || 0) * (r.qty || 1)), 0)

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-100 via-amber-100 to-emerald-100 shadow-sm ring-2 ring-white flex items-center justify-center">
            <GuacMascot expression="surprised" size={32} />
          </div>
          <div>
            <h1 className="page-title leading-none">Returns</h1>
            <p className="text-xs text-gray-500 mt-1">Refunds tracked, money clawed back.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-3 py-1.5">
            <Clock size={12} /> {eligible.length} still returnable
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100 rounded-full px-3 py-1.5">
            <Undo2 size={12} /> {returns.length} returned
          </span>
        </div>
      </div>

      {/* Tabs: still returnable vs already returned */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'eligible', label: `Still returnable (${eligible.length})`, icon: Clock },
          { id: 'returned', label: `Already returned (${returns.length})`, icon: Undo2 },
        ].map(t => {
          const active = tab === t.id
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${active ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tab === 'returned' ? (
          <>
            <div className="card text-center py-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Returned Items</p>
              <p className="text-2xl font-semibold mt-1">{returns.length}</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Refunded</p>
              <p className="text-2xl font-semibold mt-1 text-rose-600">${totalRefunded.toFixed(2)}</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Stores</p>
              <p className="text-2xl font-semibold mt-1">{new Set(returns.map(r => r.receipts?.store_name).filter(Boolean)).size}</p>
            </div>
          </>
        ) : (
          <>
            <div className="card text-center py-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">In Return Window</p>
              <p className="text-2xl font-semibold mt-1">{eligible.length}</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Value if Returned</p>
              <p className="text-2xl font-semibold mt-1 text-emerald-700">${totalEligibleValue.toFixed(2)}</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Expiring Soon (7d)</p>
              <p className="text-2xl font-semibold mt-1 text-amber-600">{eligible.filter(e => e.days_left <= 7).length}</p>
            </div>
          </>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search by item, SKU, model, or store…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {tab === 'eligible' && (
        <div className="card p-0 overflow-hidden">
          {eligLoading ? (
            <div className="py-12 text-center text-gray-400">Loading returnables…</div>
          ) : filteredEligible.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center gap-3">
              <GuacMascot expression="relaxing" size={140} />
              <p className="text-gray-500 max-w-md">
                {eligible.length === 0
                  ? "Nothing in a return window right now. Items appear here when a receipt's policy gives you days remaining."
                  : 'No matches for that search.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
                  <tr>{['Days Left','Item','Store','Bought','Refund','Policy','Actions'].map(h =>
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  )}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredEligible.map(r => {
                    const refund = Math.abs(parseFloat(r.price || 0)) * (r.qty || 1)
                    // Color-code urgency: red <= 3d, amber <= 7d, emerald > 7d.
                    const tone = r.days_left <= 3
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : r.days_left <= 7
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    return (
                      <tr key={r.item_id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center justify-center min-w-[3.5rem] px-2 py-1 rounded-lg text-sm font-bold border ${tone}`}>
                            {r.days_left}d
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.item_name}</p>
                          {(r.sku || r.model) && (
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                              {[r.sku && `SKU ${r.sku}`, r.model && `Mdl ${r.model}`].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r.store_id ? (
                            <Link href={`/stores/${r.store_id}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                              <StoreIcon size={11} />{displayStoreName(r.store_name)}
                            </Link>
                          ) : (
                            <span className="text-gray-500">{displayStoreName(r.store_name) || '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{r.receipt_date || '—'}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">${refund.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Shield size={11} className="text-emerald-600" />
                            <span className="text-gray-600">
                              {r.policy.days ? `${r.policy.days}d window` : 'lifetime'} · expires {r.policy.expiry_date}
                            </span>
                            {r.policy.source_url && (
                              <a
                                href={r.policy.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-emerald-700 hover:underline"
                                title="View merchant's published policy"
                              >
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Link href={`/receipts/${r.receipt_id}`} className="inline-flex items-center gap-1 font-mono text-xs text-blue-600 hover:underline">
                              receipt<ExternalLink size={10} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => markReturned.mutate(r.item_id)}
                              disabled={markReturned.isPending}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100"
                              title="Mark this item as returned"
                            >
                              <Undo2 size={12} /> Returned
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'returned' && (
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading returns…</div>
        ) : error ? (
          <div className="py-8 text-center text-rose-600 text-sm">
            Failed to load: {error.message}
            <div className="text-xs text-gray-400 mt-2">
              If this says &quot;Could not find relationship…&quot;, run this in Supabase SQL Editor:<br />
              <code className="bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">NOTIFY pgrst, &apos;reload schema&apos;;</code>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center gap-3">
            <GuacMascot expression="relaxing" size={140} />
            <p className="text-gray-500 max-w-md">
              {returns.length === 0
                ? 'No returns yet. Mark items as returned from the receipt detail page or the receipts list.'
                : 'No results.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
                <tr>{['Return Date','Item','SKU','Model','Qty','Refund','Store','Receipt Date','Receipt ID','Actions'].map(h =>
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                )}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => {
                  const refund = Math.abs(parseFloat(r.price || 0))
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-500">
                        {r.return_date ? (
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={11} className="text-gray-400" />{r.return_date}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium">{r.item_name}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{r.sku || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{r.model || '—'}</td>
                      <td className="px-4 py-3">{r.qty}</td>
                      <td className="px-4 py-3 font-semibold text-rose-600">${refund.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {r.receipts?.store_id ? (
                          <Link href={`/stores/${r.receipts.store_id}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                            <StoreIcon size={11} />{displayStoreName(r.receipts.store_name)}
                          </Link>
                        ) : (
                          <span className="text-gray-500">{displayStoreName(r.receipts?.store_name) || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{r.receipts?.date || '—'}</td>
                      <td className="px-4 py-3">
                        <Link href={`/receipts/${r.receipt_id}`} className="inline-flex items-center gap-1 font-mono text-xs text-blue-600 hover:underline">
                          {r.receipt_id?.slice(0, 8)}<ExternalLink size={10} />
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => undoReturn.mutate(r.id)}
                          disabled={undoReturn.isPending}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                          title="Mark as not returned"
                        >
                          <RotateCcw size={12} /> Undo
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </div>
  )
}

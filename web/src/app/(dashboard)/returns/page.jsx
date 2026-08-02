'use client'
import { useState } from 'react'
import useCurrencySymbol from '../../../hooks/useCurrencySymbol'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Undo2, Search, ExternalLink, RotateCcw, Receipt, Clock } from 'lucide-react'
import { getReturns, updateReceiptItem, getEligibleReturns } from '../../../lib/db'
import FeatureHeader from '../../../components/FeatureHeader'
import { displayStoreName } from '../../../lib/store-name-normalize'
import { StoreLogo } from '../../../components/StoreLogo'
import { formatDateShort } from '../../../lib/dateFormat'

// Money → $1,234.56 (thousands separators, always 2 decimals). Mockup renders
// every dollar figure in Bricolage (font-display) with grouped thousands.
const fmtMoney = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ReturnsPage() {
  const __cur = useCurrencySymbol()
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

  // Shared header cells for both tables — mockup label treatment.
  const thBase = 'px-5 py-3.5 font-extrabold'

  return (
    <div className="space-y-5 max-w-7xl">
      <FeatureHeader
        expression="surprised"
        title="Returns"
        subtitle="Refunds tracked, money clawed back."
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-guac-100 text-guac-600 rounded-full px-3.5 py-2">
              <Clock size={12} /> {eligible.length} still returnable
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3.5 py-2" style={{ background: '#FEF1F1', color: '#C2554F' }}>
              <Undo2 size={12} /> {returns.length} returned
            </span>
          </div>
        }
      />

      {/* Tabs: still returnable vs already returned */}
      <div className="flex gap-7 border-b border-guac-line2">
        {[
          { id: 'eligible', label: `Still returnable (${eligible.length})` },
          { id: 'returned', label: `Already returned (${returns.length})` },
        ].map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`pb-3.5 -mb-px text-sm border-b-[2.5px] transition-colors ${active ? 'font-extrabold text-guac-700 border-guac-600' : 'font-semibold text-guac-faint border-transparent hover:text-guac-body'}`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* KPI tiles — keyed cross-fade on tab change. */}
      <div key={tab} className="grid grid-cols-3 gap-3.5 anim-crossfade">
        {tab === 'returned' ? (
          <>
            <div className="rounded-2xl border border-guac-line bg-white px-5 py-4 text-center">
              <p className="text-[10.5px] font-extrabold tracking-[0.07em] text-guac-faint">RETURNED ITEMS</p>
              <p className="gg-num font-display text-3xl font-extrabold text-guac-ink mt-2">{returns.length}</p>
            </div>
            <div className="rounded-2xl border px-5 py-4 text-center" style={{ background: '#FEF1F1', borderColor: 'rgba(220,38,38,0.16)' }}>
              <p className="text-[10.5px] font-extrabold tracking-[0.07em]" style={{ color: '#C2554F' }}>TOTAL REFUNDED</p>
              <p className="gg-num font-display text-3xl font-extrabold mt-2" style={{ color: '#DC2626' }}>{__cur}{fmtMoney(totalRefunded)}</p>
            </div>
            <div className="rounded-2xl border border-guac-line bg-white px-5 py-4 text-center">
              <p className="text-[10.5px] font-extrabold tracking-[0.07em] text-guac-faint">STORES</p>
              <p className="gg-num font-display text-3xl font-extrabold text-guac-ink mt-2">{new Set(returns.map(r => r.receipts?.store_name).filter(Boolean)).size}</p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-guac-line bg-white px-5 py-4 text-center">
              <p className="text-[10.5px] font-extrabold tracking-[0.07em] text-guac-faint">IN RETURN WINDOW</p>
              <p className="gg-num font-display text-3xl font-extrabold text-guac-ink mt-2">{eligible.length}</p>
            </div>
            <div className="rounded-2xl border bg-guac-50 px-5 py-4 text-center" style={{ borderColor: 'rgba(31,138,61,0.16)' }}>
              <p className="text-[10.5px] font-extrabold tracking-[0.07em]" style={{ color: '#3F7A4F' }}>VALUE IF RETURNED</p>
              <p className="gg-num font-display text-3xl font-extrabold text-guac-600 mt-2">{__cur}{fmtMoney(totalEligibleValue)}</p>
            </div>
            <div className="rounded-2xl border border-guac-line bg-white px-5 py-4 text-center">
              <p className="text-[10.5px] font-extrabold tracking-[0.07em] text-guac-faint">EXPIRING SOON (7D)</p>
              <p className="gg-num font-display text-3xl font-extrabold mt-2 text-amber-600">{eligible.filter(e => e.days_left <= 7).length}</p>
            </div>
          </>
        )}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-guac-mist" />
        <input className="input pl-10" placeholder="Search by item, SKU, model, or store…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {tab === 'eligible' && (
        <div className="card p-0 overflow-hidden">
          {eligLoading ? (
            <div className="py-12 text-center text-gray-400 flex flex-col items-center gap-3">
              <p>Loading returnables…</p>
            </div>
          ) : filteredEligible.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center gap-3">
              <p className="text-guac-muted max-w-md">
                {eligible.length === 0
                  ? "Nothing in a return window right now. Items appear here when a receipt's policy gives you days remaining."
                  : 'No matches for that search.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="gg-tbl w-full text-sm">
                <thead className="border-b border-guac-line gg-colhead">
                  <tr>
                    <th className={`${thBase} text-left`}>Days Left</th>
                    <th className={`${thBase} text-left`}>Item</th>
                    <th className={`${thBase} text-left`}>Store</th>
                    <th className={`${thBase} text-left`}>Bought</th>
                    <th className={`${thBase} text-right`}>Refund</th>
                    <th className={`${thBase} text-left`}>Policy</th>
                    <th className={`${thBase} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEligible.map(r => {
                    const refund = Math.abs(parseFloat(r.price || 0)) * (r.qty || 1)
                    // Color-code urgency: red <= 3d, amber <= 7d, guac-green > 7d.
                    const tone = r.days_left <= 3
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : r.days_left <= 7
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-guac-100 text-guac-600 border-guac-line2'
                    return (
                      <tr key={r.item_id} className="hover:bg-guac-row transition-colors" style={{ borderBottom: '1px solid rgba(20,83,45,0.06)' }}>
                        <td className="px-5 py-3.5">
                          <span className={`gg-num inline-flex items-center justify-self-start px-2.5 py-[5px] rounded-[9px] text-xs font-extrabold border ${tone}`}>
                            {r.days_left}d
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-[13.5px] font-bold text-guac-ink">{r.item_name}</div>
                          {(r.sku || r.model) && (
                            <div className="text-[10.5px] text-guac-label font-mono mt-0.5">
                              {[r.sku && `SKU ${r.sku}`, r.model && `Mdl ${r.model}`].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <StoreLogo storeName={r.store_name} size={26} />
                            {r.store_id ? (
                              <Link href={`/stores/${r.store_id}`} className="text-[13px] font-bold text-guac-ink hover:text-guac-700 hover:underline truncate">
                                {displayStoreName(r.store_name)}
                              </Link>
                            ) : (
                              <span className="text-[13px] font-bold text-guac-ink truncate">{displayStoreName(r.store_name) || '—'}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[12.5px] text-guac-muted whitespace-nowrap">{formatDateShort(r.receipt_date) || '—'}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="gg-num font-display text-sm font-extrabold text-guac-600">{__cur}{fmtMoney(refund)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-guac-faint">
                            {r.policy.days ? `${r.policy.days}d window` : 'lifetime'} · expires {formatDateShort(r.policy.expiry_date)}
                          </span>
                          {r.policy.source_url && (
                            <a href={r.policy.source_url} target="_blank" rel="noopener noreferrer"
                              className="ml-1 inline-flex items-center align-middle text-guac-600 hover:underline"
                              title="View merchant's published policy">
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/receipts/${r.receipt_id}`} title="View receipt"
                              className="inline-flex items-center justify-center w-[34px] h-[30px] rounded-[9px] border border-guac-line2 bg-white text-guac-body hover:bg-guac-50 transition-colors">
                              <Receipt size={15} />
                            </Link>
                            <button type="button" onClick={() => markReturned.mutate(r.item_id)} disabled={markReturned.isPending}
                              title="Mark returned"
                              className="inline-flex items-center justify-center w-[34px] h-[30px] rounded-[9px] bg-guac-100 text-guac-600 hover:brightness-95 disabled:opacity-50 transition-all">
                              <Undo2 size={15} />
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
            <div className="py-12 text-center text-gray-400 flex flex-col items-center gap-3">
              <p>Loading returns…</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-rose-600 text-sm flex flex-col items-center gap-3">
              <p>Failed to load: {error.message}</p>
              <div className="text-xs text-gray-400 mt-2">
                If this says &quot;Could not find relationship…&quot;, run this in Supabase SQL Editor:<br />
                <code className="bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">NOTIFY pgrst, &apos;reload schema&apos;;</code>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center gap-3">
              <p className="text-guac-muted max-w-md">
                {returns.length === 0
                  ? 'No returns yet. Mark items as returned from the receipt detail page or the receipts list.'
                  : 'No results.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="gg-tbl w-full text-sm">
                <thead className="border-b border-guac-line gg-colhead">
                  <tr>
                    <th className={`${thBase} text-left`}>Return Date</th>
                    <th className={`${thBase} text-left`}>Item</th>
                    <th className={`${thBase} text-right`}>Refund</th>
                    <th className={`${thBase} text-left`}>Store</th>
                    <th className={`${thBase} text-left`}>Receipt Date</th>
                    <th className={`${thBase} text-center`}>Rcpt</th>
                    <th className={`${thBase} text-center`}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const refund = Math.abs(parseFloat(r.price || 0))
                    return (
                      <tr key={r.id} className="hover:bg-guac-row transition-colors" style={{ borderBottom: '1px solid rgba(20,83,45,0.06)' }}>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {r.return_date ? (
                            <span className="text-[12px] font-semibold text-guac-muted">
                              {formatDateShort(r.return_date)}
                            </span>
                          ) : <span className="text-guac-faint">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-[13.5px] font-bold text-guac-ink">{r.item_name}</div>
                          <div className="text-[10.5px] text-guac-label font-mono mt-0.5">
                            {[r.sku && `SKU ${r.sku}`, r.model && r.model, `Qty ${r.qty}`].filter(Boolean).join(' · ')}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="gg-num font-display text-sm font-extrabold" style={{ color: '#DC2626' }}>{__cur}{fmtMoney(refund)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <StoreLogo storeName={r.receipts?.store_name} size={26} />
                            {r.receipts?.store_id ? (
                              <Link href={`/stores/${r.receipts.store_id}`} className="text-[13px] font-bold text-guac-ink hover:text-guac-700 hover:underline truncate">
                                {displayStoreName(r.receipts.store_name)}
                              </Link>
                            ) : (
                              <span className="text-[13px] font-bold text-guac-ink truncate">{displayStoreName(r.receipts?.store_name) || '—'}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[12.5px] text-guac-muted whitespace-nowrap">{formatDateShort(r.receipts?.date) || '—'}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-center">
                            <Link href={`/receipts/${r.receipt_id}`} title={`Receipt ${r.receipt_id?.slice(0, 8)}`}
                              className="inline-flex items-center justify-center w-[30px] h-[28px] rounded-lg border border-guac-line2 bg-white text-guac-body hover:bg-guac-50 transition-colors">
                              <Receipt size={14} />
                            </Link>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-center">
                            <button type="button" onClick={() => undoReturn.mutate(r.id)} disabled={undoReturn.isPending}
                              title="Mark as not returned"
                              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-guac-line2 bg-white text-guac-body hover:bg-guac-50 disabled:opacity-50 transition-colors">
                              <RotateCcw size={12} /> Undo
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
    </div>
  )
}

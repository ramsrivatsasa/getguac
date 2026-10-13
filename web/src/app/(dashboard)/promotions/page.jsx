'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Bot, Mail, Search, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import FeatureHeader from '../../../components/FeatureHeader'
import MascotLoading from '../../../components/MascotLoading'
import PromotionCard from '../../../components/PromotionCard'
import { usePromotions, useUpdatePromotion } from '../../../hooks/usePromotions'
import { currentPromotions } from '../../../lib/promotion-presentation.mjs'

const filters = [
  { value: '', label: 'All sources' },
  { value: 'email', label: 'Email' },
  { value: 'web', label: 'Web' },
  { value: 'ai', label: 'Guac AI' },
]

export default function PromotionsPage() {
  const params = useSearchParams()
  const [query, setQuery] = useState('')
  const [source, setSource] = useState(() => ['email', 'web', 'ai'].includes(params.get('source')) ? params.get('source') : '')
  const [expiry, setExpiry] = useState('')
  const [type, setType] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState('')
  const qc = useQueryClient()
  const { data: promotions = [], isLoading, error } = usePromotions({ status: 'active,review', q: query })
  const update = useUpdatePromotion()
  const visible = currentPromotions(promotions, { source, expiry, type })

  function dismiss(id) {
    update.mutate({ id, status: 'dismissed' }, {
      onSuccess: () => toast.success('Offer dismissed'),
      onError: e => toast.error(e.message),
    })
  }
  function keep(id) {
    update.mutate({ id, status: 'active' }, { onSuccess: () => toast.success('Offer kept in Rewards'), onError: e => toast.error(e.message) })
  }
  async function searchWeb() {
    setSearching(true); setSearchResult('')
    try {
      const response = await fetch('/api/promotions/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
      const data = await response.json(); if (!response.ok) throw Error(data.error)
      setSearchResult(data.message); await qc.invalidateQueries({ queryKey: ['promotions'] })
    } catch (e) { setSearchResult(e.message) } finally { setSearching(false) }
  }

  return <div className="max-w-7xl space-y-5">
    <FeatureHeader expression="rich" title="Promotions" subtitle="Find useful merchant offers and keep the ones you want in Rewards." />
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-64 flex-1 max-w-lg"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="input pl-9" placeholder="Search merchants and offers…" value={query} onChange={e => setQuery(e.target.value)}/></div>
      <button type="button" className="btn-secondary min-h-11" disabled={searching || query.trim().length < 2} onClick={searchWeb}>{searching ? 'Searching…' : 'Search merchant websites'}</button>
      {filters.map(f => <button key={f.value} type="button" onClick={() => setSource(f.value)} className={source === f.value ? 'btn-secondary border-violet-200 bg-violet-100 text-xs text-violet-700' : 'btn-secondary text-xs'}>{f.label}</button>)}
      <select aria-label="Offer expiration" className="input w-auto" value={expiry} onChange={e => setExpiry(e.target.value)}><option value="">All current offers</option><option value="dated">Confirmed expiry</option><option value="week">Ends within 7 days</option></select>
      <select aria-label="Discount type" className="input w-auto" value={type} onChange={e => setType(e.target.value)}><option value="">All benefits</option><option value="percent">Percentage off</option><option value="amount">Money off</option><option value="free">Free item</option></select>
    </div>
    {searchResult && <p role="status" className="text-sm text-slate-600">{searchResult}</p>}
    {isLoading ? <MascotLoading label="Finding useful offers…"/> : error ? <div className="card text-sm text-rose-600">{error.message}</div> : visible.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(p => <PromotionCard key={p.id} promotion={p} onDismiss={dismiss} onKeep={keep}/>)}</div> : <div className="card py-14 text-center"><ShieldCheck className="mx-auto text-emerald-600"/><h2 className="mt-3 font-black text-slate-900">No useful promotions yet</h2><p className="mt-1 text-sm text-slate-500">Offer emails will appear here instead of being saved as receipts.</p></div>}
  </div>
}

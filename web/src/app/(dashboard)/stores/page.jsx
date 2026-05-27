'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Store, Phone, Globe, MapPin, ChevronRight, ChevronDown, Search, Trash2, AlertTriangle, Shield, ExternalLink } from 'lucide-react'
import { getStores, deleteStore, getAllStoreDefaultPolicies } from '../../../lib/db'
import { normalizeStoreName } from '../../../lib/store-name-normalize'
function normalizePhone(p) {
  if (!p) return ''
  return String(p).replace(/\D+/g, '')
}

function normalizeName(n) {
  return (n || '').trim().toLowerCase()
}

function normalizeAddr(a) {
  return (a || '').trim().toLowerCase()
}

// Group stores into duplicate clusters keyed by phone OR address OR name.
function findDuplicateClusters(stores) {
  const groups = new Map()
  for (const s of stores) {
    const keys = []
    const name = normalizeName(s.store_name)
    const phone = normalizePhone(s.phone_no)
    const addr = normalizeAddr(s.address)
    if (name) keys.push(`name:${name}`)
    if (phone.length >= 7) keys.push(`phone:${phone}`)
    if (addr) keys.push(`addr:${addr}`)
    for (const k of keys) {
      if (!groups.has(k)) groups.set(k, new Set())
      groups.get(k).add(s.id)
    }
  }
  // Union-find: merge any clusters that share a store
  const parent = new Map()
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x) } return x }
  for (const s of stores) parent.set(s.id, s.id)
  for (const ids of groups.values()) {
    const arr = [...ids]
    for (let i = 1; i < arr.length; i++) {
      const a = find(arr[0]); const b = find(arr[i])
      if (a !== b) parent.set(a, b)
    }
  }
  const cluster = new Map()
  for (const s of stores) {
    const root = find(s.id)
    if (!cluster.has(root)) cluster.set(root, [])
    cluster.get(root).push(s)
  }
  return [...cluster.values()].filter(g => g.length > 1)
}

export default function StoresPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(() => new Set())

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: getStores,
    staleTime: 1000 * 60 * 5,
  })

  // One bulk fetch of every curated default policy (catch-all rows only).
  // Lookups by normalized store name happen client-side so the per-row chip
  // doesn't need a round-trip per store.
  const { data: policyMap } = useQuery({
    queryKey: ['store-default-policies'],
    queryFn: getAllStoreDefaultPolicies,
    staleTime: 1000 * 60 * 60, // 1 hour — these rarely change
  })

  function policyFor(store) {
    if (!policyMap || !store?.store_name) return null
    const key = normalizeStoreName(store.store_name)
    return key ? policyMap.get(key) || null : null
  }

  const del = useMutation({
    mutationFn: deleteStore,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stores'] }),
    onError: (err) => toast.error(err.message),
  })

  const filtered = stores.filter(s =>
    s.store_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.address?.toLowerCase().includes(search.toLowerCase())
  )

  const duplicateClusters = findDuplicateClusters(stores)
  const dupIds = new Set(duplicateClusters.flatMap(c => c.map(s => s.id)))

  // Group filtered stores by normalized name. Groups of size > 1 render as accordions.
  const grouped = (() => {
    const m = new Map()
    for (const s of filtered) {
      const key = (s.store_name || '').trim().toLowerCase()
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(s)
    }
    return [...m.entries()].map(([key, list]) => ({
      key,
      display: list[0]?.store_name || 'Unnamed',
      stores: list.sort((a, b) => (a.address || '').localeCompare(b.address || '')),
    })).sort((a, b) => a.display.localeCompare(b.display))
  })()

  const [expandedGroups, setExpandedGroups] = useState(() => new Set())
  function toggleGroup(key) {
    setExpandedGroups(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  const allSelected = filtered.length > 0 && filtered.every(s => selected.has(s.id))
  function toggleOne(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    setSelected(prev => allSelected ? new Set() : new Set(filtered.map(s => s.id)))
  }
  async function handleDeleteSelected() {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} store${selected.size === 1 ? '' : 's'}? Their receipts will be kept but unlinked from the store.`)) return
    const ids = [...selected]
    const results = await Promise.allSettled(ids.map(id => del.mutateAsync(id)))
    const failures = results.filter(r => r.status === 'rejected')
    setSelected(new Set())
    if (failures.length > 0) {
      const msg = failures[0].reason?.message || 'Delete failed'
      toast.error(`${failures.length} failed — ${msg}`)
    } else {
      toast.success(`Deleted ${ids.length}`)
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-xl"><Store className="text-blue-800" size={22} /></div>
          <h1 className="page-title">Stores</h1>
        </div>
        <span className="text-sm text-gray-400">{stores.length} store{stores.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search stores…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {filtered.length > 0 && (
          <button type="button" onClick={toggleAll} className="btn-secondary text-xs py-1.5">
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        )}
        {selected.size > 0 && (
          <button type="button" onClick={handleDeleteSelected} className="btn-danger text-xs py-1.5">
            <Trash2 size={13} /> Delete {selected.size}
          </button>
        )}
      </div>

      {duplicateClusters.length > 0 && (
        <div className="card border-amber-300 bg-amber-50/60">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-amber-600" />
            <h3 className="font-semibold text-amber-900">
              {duplicateClusters.length} duplicate group{duplicateClusters.length === 1 ? '' : 's'} detected
            </h3>
            <span className="text-xs text-amber-700 ml-auto">Matched by name, phone, or address</span>
          </div>
          <div className="space-y-4">
            {duplicateClusters.map((group, i) => (
              <div key={i} className="bg-white rounded-lg border border-amber-200 p-3">
                <p className="text-xs text-amber-700 font-medium mb-2">Group {i + 1} — {group.length} stores</p>
                <div className="space-y-2">
                  {group.map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{s.store_name}</p>
                        <div className="flex gap-3 text-xs text-gray-500">
                          {s.phone_no && <span><Phone size={10} className="inline mr-0.5" />{s.phone_no}</span>}
                          {s.address && <span className="truncate"><MapPin size={10} className="inline mr-0.5" />{s.address}</span>}
                        </div>
                      </div>
                      <Link href={`/stores/${s.id}`} className="btn-ghost text-xs py-1">View</Link>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(`Delete "${s.store_name}"? Receipts pointing to this store will be unlinked but kept.`)) return
                          try { await del.mutateAsync(s.id); toast.success('Deleted') }
                          catch (e) { toast.error(e.message) }
                        }}
                        className="btn-ghost text-xs py-1 text-rose-500 hover:bg-rose-50">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-gray-400">Loading stores…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          {stores.length === 0 ? 'No stores yet — they are created automatically when you scan receipts.' : 'No results.'}
        </div>
      ) : (
        <div className="card p-0 divide-y divide-gray-50">
          {grouped.map(g => {
            const isMulti = g.stores.length > 1
            const isOpen = expandedGroups.has(g.key)
            const groupAllSelected = g.stores.every(s => selected.has(s.id))
            const groupAnyDup = g.stores.some(s => dupIds.has(s.id))

            // Single-location store → render as a normal row, unchanged behavior
            if (!isMulti) {
              const store = g.stores[0]
              return (
                <div key={store.id}
                  className={`flex items-center gap-3 px-5 py-4 hover:bg-gray-50/70 transition-colors group ${selected.has(store.id) ? 'bg-blue-50/60' : ''} ${dupIds.has(store.id) ? 'border-l-4 border-l-amber-400' : ''}`}>
                  {dupIds.has(store.id) && (
                    <span title="Duplicate detected" className="text-amber-500"><AlertTriangle size={14} /></span>
                  )}
                  <input type="checkbox" className="w-4 h-4 rounded cursor-pointer" checked={selected.has(store.id)}
                    onChange={() => toggleOne(store.id)} aria-label={`Select ${store.store_name}`} />
                  <Link href={`/stores/${store.id}`} className="flex-1 flex items-center justify-between min-w-0">
                    <div className="space-y-1 min-w-0">
                      <p className="font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{store.store_name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                        {store.address && <span className="flex items-center gap-1"><MapPin size={11} />{store.address}</span>}
                        {store.phone_no && <span className="flex items-center gap-1"><Phone size={11} />{store.phone_no}</span>}
                        {store.website && <span className="flex items-center gap-1"><Globe size={11} />{store.website}</span>}
                      </div>
                    </div>
                    {/* Return-policy chip — pulled from store_return_policies
                        by normalized name. Click bubbles up to the row's Link
                        so it lands on the detail page, where the full policy
                        card lives. */}
                    <PolicyChip policy={policyFor(store)} className="mr-3" />
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 shrink-0 ml-4" />
                  </Link>
                </div>
              )
            }

            // Multi-location group → accordion
            return (
              <div key={g.key}>
                <button
                  type="button"
                  onClick={() => toggleGroup(g.key)}
                  className={`w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50/70 transition-colors text-left ${groupAnyDup ? 'border-l-4 border-l-amber-400' : ''}`}
                >
                  {groupAnyDup && <span title="Contains duplicates" className="text-amber-500"><AlertTriangle size={14} /></span>}
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded cursor-pointer"
                    checked={groupAllSelected}
                    onClick={e => e.stopPropagation()}
                    onChange={() => {
                      setSelected(prev => {
                        const n = new Set(prev)
                        if (groupAllSelected) g.stores.forEach(s => n.delete(s.id))
                        else g.stores.forEach(s => n.add(s.id))
                        return n
                      })
                    }}
                    aria-label={`Select all ${g.display} locations`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{g.display}</p>
                    <p className="text-xs text-gray-400">{g.stores.length} locations</p>
                  </div>
                  {/* Same chip on the merchant-group header; all locations
                      share the chain's curated policy. */}
                  <PolicyChip policy={policyFor(g.stores[0])} className="mr-3" />
                  {isOpen
                    ? <ChevronDown size={16} className="text-gray-400 shrink-0" />
                    : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
                </button>
                {isOpen && (
                  <div className="bg-gray-50/40 border-t border-gray-100">
                    {g.stores.map(store => (
                      <div key={store.id}
                        className={`flex items-center gap-3 pl-12 pr-5 py-3 hover:bg-white transition-colors group ${selected.has(store.id) ? 'bg-blue-50/60' : ''} ${dupIds.has(store.id) ? 'border-l-4 border-l-amber-400' : ''}`}>
                        {dupIds.has(store.id) && (
                          <span title="Duplicate detected" className="text-amber-500"><AlertTriangle size={12} /></span>
                        )}
                        <input type="checkbox" className="w-4 h-4 rounded cursor-pointer" checked={selected.has(store.id)}
                          onChange={() => toggleOne(store.id)} aria-label={`Select ${store.store_name} location`} />
                        <Link href={`/stores/${store.id}`} className="flex-1 flex items-center justify-between min-w-0">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600">
                              {store.address
                                ? <span className="flex items-center gap-1 font-medium text-gray-700"><MapPin size={11} />{store.address}</span>
                                : <span className="text-gray-400 italic">No address</span>}
                              {store.phone_no && <span className="flex items-center gap-1"><Phone size={11} />{store.phone_no}</span>}
                              {store.website && <span className="flex items-center gap-1"><Globe size={11} />{store.website}</span>}
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 shrink-0 ml-4" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Compact return-policy chip rendered on each row of the stores list.
// Tone reflects friendliness of the policy:
//   emerald = generous (lifetime / 90d+)
//   sky     = standard (30-89d)
//   amber   = tight (<30d, still eligible)
//   gray    = non-returnable (e.g. restaurants, prepared food)
function PolicyChip({ policy, className = '' }) {
  if (!policy) return null
  const days = policy.days
  const eligible = policy.eligible !== false
  const label = !eligible
    ? 'Final sale'
    : days == null
      ? 'Lifetime ∞'
      : `${days}d return`
  const tone = !eligible
    ? 'bg-gray-100 text-gray-600 border-gray-200'
    : days == null || days >= 90
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : days >= 30
        ? 'bg-sky-50 text-sky-700 border-sky-100'
        : 'bg-amber-50 text-amber-700 border-amber-100'
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tone} ${className}`}
      title={policy.details ? `${policy.details} — click row for full policy + citation` : 'Tap row for full policy + citation'}
    >
      <Shield size={10} /> {label}
    </span>
  )
}

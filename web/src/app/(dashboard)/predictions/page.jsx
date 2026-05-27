'use client'
import { useState, useMemo } from 'react'
import { useAliases, useUpdateAliasStatus } from '../../../hooks/useAliases'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, RotateCcw, Sparkles, Filter } from 'lucide-react'
import GuacMascot from '../../../components/GuacMascot'

const FILTERS = [
  { value: 'all',       label: 'All' },
  { value: 'auto',      label: 'Auto-merged' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected',  label: 'Rejected' },
]

const STATUS_STYLE = {
  auto:      { color: 'bg-violet-100 text-violet-700',  label: 'Auto' },
  confirmed: { color: 'bg-emerald-100 text-emerald-700', label: 'Confirmed' },
  rejected:  { color: 'bg-rose-100 text-rose-700',       label: 'Rejected' },
}

export default function PredictionsPage() {
  const [filter, setFilter] = useState('all')
  const { data: aliases = [], isLoading } = useAliases()
  const update = useUpdateAliasStatus()

  const filtered = useMemo(() => {
    if (filter === 'all') return aliases
    return aliases.filter(a => a.status === filter)
  }, [aliases, filter])

  const counts = useMemo(() => {
    const m = { all: aliases.length, auto: 0, confirmed: 0, rejected: 0 }
    for (const a of aliases) m[a.status] = (m[a.status] || 0) + 1
    return m
  }, [aliases])

  function setStatus(alias_key, status, verb) {
    update.mutate({ alias_key, status }, {
      onSuccess: () => toast.success(verb),
      onError: e => toast.error(e.message),
    })
  }

  return (
    <div className="space-y-5 max-w-6xl font-sans">
      <div>
        <h1 className="page-title inline-flex items-center gap-2">
          <Sparkles size={22} className="text-violet-500" /> Predictions
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Items the predictor has decided are the same product. Confirm to lock the merge in, reject to keep them separate.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
              filter === f.value
                ? 'bg-violet-500 text-white border-violet-500 shadow'
                : 'bg-white text-gray-700 border-gray-200 hover:border-violet-300'
            }`}
          >
            {filter === f.value && <Filter size={12} />}
            {f.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
              filter === f.value ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-500'
            }`}>{counts[f.value] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center gap-3">
            <GuacMascot expression="sitting" size={140} />
            <p className="text-gray-500 max-w-md">
              {aliases.length === 0
                ? "No merges yet. After your first 'Predict now' run, items the predictor decides are the same product will show up here."
                : `Nothing matches the "${filter}" filter.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Alias</th>
                  <th className="px-4 py-3 text-left font-semibold">Merged into</th>
                  <th className="px-4 py-3 text-left font-semibold">Similarity</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(a => {
                  const style = STATUS_STYLE[a.status] || STATUS_STYLE.auto
                  return (
                    <tr key={a.alias_key} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-700">{a.alias_key}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{a.canonical_display_name || a.canonical_key}</div>
                        {a.canonical_display_name && a.canonical_display_name !== a.canonical_key && (
                          <div className="text-[11px] text-gray-400">{a.canonical_key}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {a.similarity != null
                          ? <span className="badge-gray">{(a.similarity * 100).toFixed(1)}%</span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${style.color}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {a.status !== 'confirmed' && (
                            <button
                              disabled={update.isPending}
                              onClick={() => setStatus(a.alias_key, 'confirmed', 'Merge confirmed')}
                              className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50"
                              title="Lock this merge so future predictions always treat these as the same product"
                            >
                              <CheckCircle size={12} /> Confirm
                            </button>
                          )}
                          {a.status !== 'rejected' && (
                            <button
                              disabled={update.isPending}
                              onClick={() => setStatus(a.alias_key, 'rejected', 'Merge rejected — kept separate')}
                              className="px-2 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50"
                              title="Keep these as separate products from now on"
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          )}
                          {a.status !== 'auto' && (
                            <button
                              disabled={update.isPending}
                              onClick={() => setStatus(a.alias_key, 'auto', 'Reset to auto')}
                              className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50"
                              title="Let the predictor decide again next run"
                            >
                              <RotateCcw size={12} /> Reset
                            </button>
                          )}
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
    </div>
  )
}

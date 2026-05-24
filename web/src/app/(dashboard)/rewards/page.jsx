'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRewards, useUpsertReward, useDeleteReward } from '../../../hooks/useRewards'
import toast from 'react-hot-toast'
import { Plus, Trash2, Eye } from 'lucide-react'
import GuacMascot from '../../../components/GuacMascot'

const EMPTY = { reward_no: '', expiry_date: '', reward_type: '', reward_title: '', description: '', store_name: '' }
const today = new Date().toISOString().split('T')[0]

export default function RewardsPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [selected, setSelected] = useState(() => new Set())
  const { data: rewards = [], isLoading } = useRewards()
  const upsert = useUpsertReward()
  const del = useDeleteReward()
  const s = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  function handleSave(e) {
    e.preventDefault()
    upsert.mutate(form, {
      onSuccess: () => { toast.success('Reward saved'); setForm(EMPTY); setShowForm(false) },
      onError: err => toast.error(err.message),
    })
  }

  function handleDelete(id) {
    if (!confirm('Delete this reward?')) return
    del.mutate(id, { onSuccess: () => toast.success('Deleted'), onError: err => toast.error(err.message) })
  }

  const allSelected = rewards.length > 0 && rewards.every(r => selected.has(r.id))
  function toggleOne(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    setSelected(prev => allSelected ? new Set() : new Set(rewards.map(r => r.id)))
  }
  async function handleDeleteSelected() {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} reward${selected.size === 1 ? '' : 's'}?`)) return
    const ids = [...selected]
    const results = await Promise.allSettled(ids.map(id => del.mutateAsync(id)))
    const failed = results.filter(r => r.status === 'rejected').length
    setSelected(new Set())
    if (failed) toast.error(`${failed} failed`); else toast.success(`Deleted ${ids.length}`)
  }

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Rewards</h1>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary"><GuacMascot expression="happy" size={22} /> Add Reward</button>
      </div>

      {showForm && (
        <div className="card space-y-4">
          <h3 className="font-semibold">Add Reward</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div><label className="label">Reward No</label><input required className="input" value={form.reward_no} onChange={s('reward_no')} /></div>
              <div><label className="label">Expiry Date</label><input type="date" required className="input" value={form.expiry_date} onChange={s('expiry_date')} /></div>
              <div><label className="label">Type</label><input required className="input" placeholder="Points / Coupon" value={form.reward_type} onChange={s('reward_type')} /></div>
              <div><label className="label">Reward Title</label><input required className="input" value={form.reward_title} onChange={s('reward_title')} /></div>
              <div><label className="label">Store Name</label><input required className="input" value={form.store_name} onChange={s('store_name')} /></div>
            </div>
            <div><label className="label">Description</label><textarea rows={2} className="input resize-none" value={form.description} onChange={s('description')} /></div>
            <div className="flex gap-3">
              <button type="submit" disabled={upsert.isPending} className="btn-primary">{upsert.isPending ? 'Saving…' : 'Save'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {rewards.length > 0 && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleAll} className="btn-secondary text-xs py-1.5">
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
          {selected.size > 0 && (
            <button type="button" onClick={handleDeleteSelected} className="btn-danger text-xs py-1.5">
              <Trash2 size={13} /> Delete {selected.size}
            </button>
          )}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : rewards.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No rewards yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="pl-4 pr-2 py-3 w-10">
                    <input type="checkbox" className="w-4 h-4 rounded cursor-pointer" checked={allSelected}
                      onChange={toggleAll} aria-label="Select all" />
                  </th>
                  {['Reward No','Title','Type','Store','Expiry','Status','Actions'].map(h =>
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rewards.map(r => (
                  <tr key={r.id} className={`hover:bg-gray-50/50 ${selected.has(r.id) ? 'bg-blue-50/60' : ''}`}>
                    <td className="pl-4 pr-2 py-3">
                      <input type="checkbox" className="w-4 h-4 rounded cursor-pointer" checked={selected.has(r.id)}
                        onChange={() => toggleOne(r.id)} aria-label={`Select ${r.reward_title}`} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.reward_no}</td>
                    <td className="px-4 py-3 font-medium">{r.reward_title}</td>
                    <td className="px-4 py-3 text-gray-500">{r.reward_type}</td>
                    <td className="px-4 py-3 text-gray-500">{r.store_name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.expiry_date}</td>
                    <td className="px-4 py-3">
                      <span className={r.expiry_date < today ? 'badge-red' : 'badge-green'}>
                        {r.expiry_date < today ? 'Expired' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Link href={`/rewards/${r.id}`} aria-label="View"
                          className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-sm">
                          <Eye size={14} />
                        </Link>
                        <button onClick={() => handleDelete(r.id)} aria-label="Delete"
                          className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-sm">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

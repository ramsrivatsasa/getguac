'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useRewards, useUpsertReward } from '../../../../hooks/useRewards'
import toast from 'react-hot-toast'
import { ArrowLeft, Save } from 'lucide-react'
export default function RewardDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: rewards = [], isLoading } = useRewards()
  const upsert = useUpsertReward()
  const reward = rewards.find(r => r.id === id)
  const [local, setLocal] = useState(null)
  const current = local ?? reward
  const s = k => e => setLocal(p => ({ ...(p ?? reward), [k]: e.target.value }))

  if (isLoading) return <div className="py-16 text-center text-gray-400">Loading…</div>
  if (!current) return <div className="py-16 text-center text-red-500">Reward not found</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-ghost p-1.5"><ArrowLeft size={20} /></button>
        <h1 className="page-title">Reward Details</h1>
      </div>
      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Reward No</label><input className="input" value={current.reward_no || ''} onChange={s('reward_no')} /></div>
          <div><label className="label">Expiry Date</label><input type="date" className="input" value={current.expiry_date || ''} onChange={s('expiry_date')} /></div>
          <div><label className="label">Type</label><input className="input" value={current.reward_type || ''} onChange={s('reward_type')} /></div>
          <div><label className="label">Store</label><input className="input" value={current.store_name || ''} onChange={s('store_name')} /></div>
        </div>
        <div><label className="label">Title</label><input className="input" value={current.reward_title || ''} onChange={s('reward_title')} /></div>
        <div><label className="label">Description</label><textarea rows={4} className="input resize-none" value={current.description || ''} onChange={s('description')} /></div>
        <button onClick={() => upsert.mutate(current, { onSuccess: () => toast.success('Saved'), onError: err => toast.error(err.message) })}
          disabled={upsert.isPending} className="btn-primary">
          <Save size={15} /> {upsert.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

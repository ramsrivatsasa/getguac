'use client'
import {eligibleRestockItem} from '../lib/restock-eligibility.mjs'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useUpsertShoppingItem } from '../hooks/useShopping'
import { createClient } from '../lib/supabase/client'
import { getShoppingList } from '../lib/db'
import { _internals } from '../lib/predict-smashlist'
import { allRecords } from '../lib/find-your-10/pagination.mjs'
import { shoppingSelectionDetails } from '../lib/background-agents/shopping-selection.mjs'

const keyOf = _internals.normalizeKey
export default function ShoppingAgentSuggestions({ items = [] }) {
  const qc = useQueryClient()
  const upsert = useUpsertShoppingItem()
  const [hidden, setHidden] = useState([])
  const [busy, setBusy] = useState(null)
  const { data } = useQuery({ queryKey: ['agents'], queryFn: async () => {
    const response = await fetch('/api/agents', { cache: 'no-store' })
    if (!response.ok) throw new Error('Suggestions could not refresh.')
    return response.json()
  }, staleTime: 30_000 })
  const { data: dismissed } = useQuery({ queryKey: ['shopping-agent-dismissed'], queryFn: async () => {
    const sb = createClient()
    const { data: { user }, error } = await sb.auth.getUser()
    if (error || !user) throw new Error('Sign in to load suggestions.')
    return allRecords(sb.from('smashlist_predict_dismissed').select('item_key').eq('user_id', user.id).order('item_key'), 'Dismissed suggestions')
  }, staleTime: 0 })
  const snapshot = data?.snapshots?.find(row => row.kind === 'shopping')
  const snapshotAge = Date.now() - Date.parse(snapshot?.refreshed_at || '')
  const suggestions = (snapshot?.result?.data?.recommendations || []).filter(item => eligibleRestockItem(item) && !hidden.includes(item.key) && !dismissed?.some(row => row.item_key === item.key)
    && !items.some(row => keyOf(row.item_name) === keyOf(item.item_name) && !row.sent_to_store))
  if (!dismissed || !suggestions.length || !Number.isFinite(snapshotAge) || snapshotAge < -60_000 || snapshotAge > 48 * 60 * 60_000) return null

  async function act(item, action) {
    setBusy(item.key)
    try {
      if (action === 'dismiss') {
        const response = await fetch('/api/smashlist/dismiss', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: item.key }) })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Could not dismiss suggestion.')
        toast.success(`Won't suggest "${item.item_name}" again`)
      } else {
        if (typeof item.item_name !== 'string' || !item.item_name.trim() || item.item_name.length > 300 || !Number.isFinite(Number(item.qty)) || Number(item.qty) <= 0 || Number(item.qty) > 1000) throw new Error('This suggestion needs a refresh before it can be added.')
        // Re-read before adding: the nightly predictor may have inserted this
        // suggestion since the snapshot was generated. Approve that row instead.
        const current = await getShoppingList()
        const existing = current.find(row => !row.sent_to_store && keyOf(row.item_name) === keyOf(item.item_name))
        const sb = createClient()
        const { data: { user }, error } = await sb.auth.getUser()
        if (error || !user) throw new Error('Sign in again before adding an item.')
        const selectionDetails = shoppingSelectionDetails(item)
        await upsert.mutateAsync(existing ? { id: existing.id, approved: true, ...(existing.predicted ? shoppingSelectionDetails(existing) : {}) } : {
          user_id: user.id, item_name: item.item_name, qty: item.qty || 1, price: item.price,
          store_name_id: item.store_id || null, list_name: item.list_name, approved: true, sent_to_store: false,
          predicted: true, ...selectionDetails, predicted_at: new Date().toISOString(),
          predicted_avg_cadence_days: item.predicted_avg_cadence_days,
          predicted_last_purchase_date: item.predicted_last_purchase_date,
          order_date: new Date().toISOString().slice(0, 10),
        })
        toast.success('Added to your shopping list')
      }
      setHidden(previous => [...previous, item.key])
      await qc.invalidateQueries({ queryKey: ['shopping'] })
      await qc.invalidateQueries({ queryKey: ['shopping-agent-dismissed'] })
      await qc.invalidateQueries({ queryKey: ['agents'] })
    } catch (error) { toast.error(error.message || 'Please retry.') }
    finally { setBusy(null) }
  }

  return <section className="space-y-2" style={{ order: 6 }} aria-label="Fresh replenishment suggestions">
    <div className="flex items-center gap-2"><Sparkles size={16} className="text-violet-500" /><h2 className="gg-h2">Ready to restock?</h2></div>
    <p className="text-xs text-gray-500">Based on your saved purchases. Add the items you need.</p>
    <div className="grid gap-2 sm:grid-cols-2">{suggestions.slice(0, 6).map(item => <div key={item.key} className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-3">
      <div className="min-w-0 flex-1"><p className="break-words text-sm font-bold text-gray-900">{item.item_name}</p><p className="text-xs text-gray-500">{item.predicted_reason}</p></div>
      <div className="flex gap-2"><button type="button" disabled={busy !== null} onClick={() => act(item, 'add')} aria-label={`Add ${item.item_name} to shopping list`} className="min-h-11 rounded-xl bg-guac-600 px-4 text-sm font-bold text-white disabled:opacity-50">{busy === item.key ? 'Saving…' : 'Add'}</button><button type="button" disabled={busy !== null} onClick={() => act(item, 'dismiss')} aria-label={`Dismiss ${item.item_name}`} className="min-h-11 rounded-xl px-3 text-sm text-gray-600 disabled:opacity-50">Dismiss</button></div>
    </div>)}</div>
  </section>
}

'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
export default function SavedGroceryBasket() {
  const { data } = useQuery({ queryKey: ['grocery-basket'], queryFn: async () => { const response = await fetch('/api/groceries'); if (!response.ok) return null; return response.json() }, staleTime: 60000 })
  if (!data?.basket?.itemIds?.length) return null
  const choice = data.basket.choice
  const fresh = choice && !choice.needsRefresh && Date.now() - Date.parse(choice.checkedAt) < 86400000
  return <section className="rounded-xl border border-violet-100 bg-white px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Your grocery basket</h2><p className="text-sm text-slate-500">{data.basket.itemIds.length} saved items{fresh ? ` · ${choice.storeId} · $${(choice.estimatedSavingsCents / 100).toFixed(2)} basket estimate` : ' · compare your next trip'}{choice && !fresh ? ' · prices need refreshing' : ''}</p></div><Link href="/shopping/groceries" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-700">Review basket →</Link></div>{fresh && <p className="text-xs text-slate-500">One trip estimate, separate from monthly planned and receipt-verified savings.</p>}</section>
}

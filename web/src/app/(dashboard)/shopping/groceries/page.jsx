'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import FeatureHeader from '../../../../components/FeatureHeader'
import MascotLoading from '../../../../components/MascotLoading'
import { useShoppingList, useUpsertShoppingItem } from '../../../../hooks/useShopping'
import { createClient } from '../../../../lib/supabase/client'
import { compareGroceryBasket } from '../../../../lib/grocery-basket-plan.mjs'
import { safeOfferUrl } from '../../../../lib/promotion-presentation.mjs'
import SavedAccountNavigation from '../../../../components/SavedAccountNavigation'

const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
// The dedicated grocery list is explicit: household Pantry items are not
// silently treated as food merely because they share a shopping page.
const groceryLists = new Set(['Grub & Grab'])
export default function GroceriesPage() {
  const { data: shopping = [], isLoading, error } = useShoppingList()
  const upsert = useUpsertShoppingItem()
  const saved = useQuery({ queryKey: ['grocery-basket'], queryFn: async () => {
    const response = await fetch('/api/groceries'); const data = await response.json()
    if (!response.ok) throw Error(data.error); return data
  } })
  const [selected, setSelected] = useState(new Set())
  const [budget, setBudget] = useState('')
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [spec, setSpec] = useState('')
  const [qty, setQty] = useState('1')
  const [quotes, setQuotes] = useState({})
  const [comparing, setComparing] = useState(false)
  const [comparisonMessage, setComparisonMessage] = useState('')
  const [costs, setCosts] = useState({})
  const [savedChoice, setSavedChoice] = useState(null)
  const [savedToken, setSavedToken] = useState('')
  const [researchEnabled, setResearchEnabled] = useState(false)
  const initialized = useRef(false)
  const [ready, setReady] = useState(false)
  useEffect(() => { if (saved.data && !initialized.current) { initialized.current = true; setSelected(new Set(saved.data.basket.itemIds)); setBudget(saved.data.basket.monthlyBudget ?? ''); setQuotes(saved.data.quotes || {}); setCosts(saved.data.basket.extraCosts || {}); setSavedChoice(saved.data.basket.choice || null); setResearchEnabled(saved.data.researchEnabled); setReady(true) } }, [saved.data])
  const items = shopping.filter(item => item.approved && !item.sent_to_store && groceryLists.has(item.list_name))
  const basket = items.filter(item => selected.has(item.id))
  const pricesKnown = basket.length > 0 && basket.every(item => item.price !== null && item.price !== '' && Number.isFinite(Number(item.price)) && Number(item.price) >= 0)
  const recordedCost = pricesKnown ? basket.reduce((sum, item) => sum + Number(item.price) * Number(item.qty || 1), 0) : null
  const lines = basket.map(item => ({ id: item.id, qty: Number(item.qty || 1), baselineUnitCents: item.price == null || item.price === '' ? null : Math.round(Number(item.price) * 100), specKey: `${item.item_name} ${item.comments || ''}`.slice(0, 200).toLowerCase() }))
  const offers = basket.flatMap(item => (quotes[item.id]?.quotes || []).filter(quote => quote.specKey === lines.find(line => line.id === item.id)?.specKey && Date.now() - Date.parse(quote.checkedAt) < 86400000 && safeOfferUrl(quote.sourceUrl)).map(quote => ({ ...quote, lineId: item.id })))
  const storeIds = [...new Set(offers.map(offer => offer.storeId))].slice(0, 8)
  const storeOptions = storeIds.map(id => ({ id, extraCostsConfirmed: costs[id] !== undefined && costs[id] !== '' && Number(costs[id]) >= 0, extraCostsCents: costs[id] === undefined || costs[id] === '' ? null : Math.round(Number(costs[id]) * 100) }))
  let comparison = null
  try { comparison = compareGroceryBasket(lines, offers, storeOptions) } catch { /* Invalid quantities must be corrected in the saved list. */ }
  const netSaving = comparison?.bestSingle?.estimatedSavingsCents
  async function compare() {
    setComparing(true); setComparisonMessage('')
    try {
      if (!(await save())) return
      const response = await fetch('/api/groceries/compare', { method: 'POST' }); const data = await response.json()
      if (!response.ok) throw Error(data.error)
      setQuotes(data.quotes); setResearchEnabled(true); setComparisonMessage(`${data.message}${data.remaining ? ` ${data.remaining} items remain for the next check.` : ''}`)
    } catch (e) { setComparisonMessage(e.message) } finally { setComparing(false) }
  }
  async function toggleResearch(enabled) {
    try {
      const response = await fetch('/api/groceries', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ researchEnabled: enabled }) })
      if (!response.ok) throw Error('Refresh preference could not be saved.')
      setResearchEnabled(enabled)
    } catch (e) { toast.error(e.message) }
  }
  async function save(selectedStore = null) {
    setSaving(true)
    try {
      const response = await fetch('/api/groceries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemIds: basket.map(item => item.id), monthlyBudget: budget === '' ? null : Number(budget), extraCosts: costs, selectedStore }) })
      const data = await response.json(); if (!response.ok) throw Error(data.error)
      setSavedChoice(data.basket.choice); if (selectedStore) setSavedToken(data.basket.savedAt); toast.success('Grocery basket saved'); saved.refetch(); return true
    } catch (e) { toast.error(e.message); return false } finally { setSaving(false) }
  }
  async function add(event) {
    event.preventDefault()
    try {
      const { data: { user } } = await createClient().auth.getUser()
      if (!user) throw Error('Please sign in again.')
      const item = await upsert.mutateAsync({ user_id: user.id, item_name: name.trim(), comments: spec.trim() || null, qty: Number(qty), list_name: 'Grub & Grab', approved: true, sent_to_store: false, frequency: 'One-time' })
      setSelected(previous => new Set([...previous, item.id])); setName(''); setSpec(''); setQty('1'); toast.success('Added to your shopping list')
    } catch (e) { toast.error(e.message) }
  }
  return <div className="max-w-7xl space-y-4">
    <SavedAccountNavigation category="groceries" savedToken={savedToken} message="Your basket choice is saved. Where would you like to go?" />
    <FeatureHeader title="Groceries" subtitle="Plan one practical shopping trip for your whole basket." action={<Link className="btn-secondary" href="/shopping">Shopping list</Link>} />
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Grocery plan summary">
      <div className="card p-4"><label className="text-sm font-semibold" htmlFor="grocery-budget">Monthly grocery budget</label><input id="grocery-budget" disabled={!ready} className="input mt-2" type="number" min="0" max="1000000" step="0.01" placeholder="Set your budget" value={budget} onChange={e => setBudget(e.target.value)} /></div>
      <div className="card grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 p-4 sm:block"><p className="text-sm font-semibold">Recorded grocery spending</p><p className="text-lg font-bold text-violet-700 sm:mt-2 sm:text-xl">{saved.data?.recordedSpending == null ? 'Unavailable' : money(saved.data.recordedSpending)}</p><p className="col-span-2 mt-1 text-xs text-slate-500">Groceries category · last 30 days</p></div>
      <div className="card grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 p-4 sm:block"><p className="text-sm font-semibold">Basket at saved prices</p><p className="text-lg font-bold text-violet-700 sm:mt-2 sm:text-xl">{recordedCost === null ? 'Not yet priced' : money(recordedCost)}</p><p className="col-span-2 mt-1 text-xs text-slate-500">{basket.length} items · current store prices may differ</p></div>
      <div className="card grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 p-4 sm:block"><p className="text-sm font-semibold">Estimated basket savings</p><p className="text-lg font-bold text-violet-700 sm:mt-2 sm:text-xl">{netSaving > 0 ? money(netSaving / 100) : 'Not confirmed'}</p><p className="col-span-2 mt-1 text-xs text-slate-500">{netSaving > 0 ? 'For this basket · separate from receipt-verified savings' : 'Matching local prices and extra costs required'}</p></div>
    </section>
    <section className="card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Your next basket</h2><button className="btn-secondary min-h-11" type="button" disabled={!ready} onClick={() => setSelected(new Set(items.slice(0, 40).map(item => item.id)))}>Select grocery items</button></div>
      {isLoading ? <MascotLoading label="Loading your shopping list…" className="!min-h-24" /> : error ? <p role="alert">Your shopping list could not load. <button className="underline" onClick={() => location.reload()}>Retry</button></p> : <div className="space-y-1">{items.map(item => <label key={item.id} className="flex min-h-14 items-center gap-3 border-b border-violet-100 py-2"><input type="checkbox" disabled={!ready} aria-label={`Include ${item.item_name}`} checked={selected.has(item.id)} onChange={e => setSelected(previous => { const next = new Set(previous); e.target.checked ? next.add(item.id) : next.delete(item.id); return next })} /><span className="min-w-0 flex-1 break-words"><span className="font-semibold">{item.item_name}</span>{item.comments && <span className="block text-sm text-slate-500">{item.comments}</span>}</span><span className="shrink-0 text-sm">Qty {item.qty || 1}</span><span className="shrink-0 text-sm">{item.price == null ? 'Unpriced' : money(Number(item.price))}</span></label>)}{!items.length && <p className="text-sm text-slate-500">Add groceries below. They will also appear in your shopping list.</p>}</div>}
      <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_80px_auto]" onSubmit={add}><input aria-label="Grocery item" className="input" required maxLength={160} placeholder="Item, e.g. whole milk" value={name} onChange={e => setName(e.target.value)} /><input aria-label="Size and variety" className="input" maxLength={300} placeholder="Size, variety, pack or dietary needs" value={spec} onChange={e => setSpec(e.target.value)} /><input aria-label="Quantity" className="input" type="number" required min="1" max="1000" value={qty} onChange={e => setQty(e.target.value)} /><button className="btn-secondary min-h-11" disabled={upsert.isPending || !ready}>Add item</button></form>
      <div className="flex flex-wrap justify-between gap-3 items-center"><p className="text-sm text-slate-500">Save up to 40 items for one basket. Repeated purchases have no minimum amount.</p><button type="button" className="btn-primary min-h-11" disabled={saving || saved.isLoading || !!saved.error || basket.length > 40} onClick={() => save()}>{saving ? 'Saving…' : 'Save basket'}</button></div>
      {saved.error && <p role="alert" className="text-sm text-rose-700">Saved basket could not load. <button className="underline" onClick={() => saved.refetch()}>Retry</button></p>}
    </section>
    <section className="card p-4 space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Compare the whole trip</h2><button type="button" className="btn-secondary min-h-11" disabled={!ready || !basket.length || comparing || basket.length > 40} onClick={compare}>{comparing ? 'Checking merchant prices…' : 'Compare basket prices'}</button></div><p className="text-sm text-slate-500">One store first. A second stop appears only when confirmed extra costs still leave more savings.</p><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" disabled={!ready || comparing} checked={researchEnabled} onChange={e => toggleResearch(e.target.checked)} />Keep saved basket prices fresh in the background</label>{comparisonMessage && <p role="status" className="text-sm">{comparisonMessage}</p>}
      {storeIds.map(id => {
        const published = basket.map(item => ({ item, offer: offers.filter(offer => offer.lineId === item.id && offer.storeId === id).sort((a, b) => a.unitCents - b.unitCents)[0] })).filter(row => row.offer)
        const subtotal = published.reduce((sum, row) => sum + row.offer.unitCents * Number(row.item.qty || 1), 0)
        const result = comparison?.singleStores.find(store => store.storeId === id)
        return <div key={id} className="rounded-xl border border-violet-100 p-3"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{id}</h3><span className="text-sm">{published.length}/{basket.length} priced · {money(subtotal / 100)} published subtotal</span></div><p className="col-span-2 mt-1 text-xs text-slate-500">{published.every(row => row.offer.locationVerified) ? 'Matching local listings checked' : 'Local stock and price remain unconfirmed'} · before extra costs</p><label className="mt-2 flex flex-wrap items-center gap-2 text-sm">Extra trip, delivery and membership costs ($)<input className="input w-28" type="number" min="0" max="10000" step="0.01" placeholder="Unknown" aria-label={`Extra costs for ${id}`} value={costs[id] ?? ''} onChange={e => setCosts(previous => ({ ...previous, [id]: e.target.value }))} /></label>{result?.totalCents !== null && result?.totalCents !== undefined && <p className="mt-2 text-sm font-semibold">Complete basket {money(result.totalCents / 100)}{result.estimatedSavingsCents > 0 ? ` · ${money(result.estimatedSavingsCents / 100)} estimated saving` : ''}</p>}{result?.estimatedSavingsCents > 0 && <button type="button" className="mt-2 min-h-11 rounded-xl bg-violet-700 px-3 text-sm font-semibold text-white" disabled={saving} onClick={() => save(id)}>{savedChoice?.storeId === id ? "Saved basket choice" : "Choose for this basket"}</button>}<details className="mt-2"><summary className="cursor-pointer py-2 text-sm font-semibold text-violet-700">Items & sources</summary>{published.map(({ item, offer }) => <div key={item.id} className="flex flex-wrap justify-between gap-2 border-t border-violet-100 py-2 text-sm"><span className="min-w-0 flex-1 break-words">{offer.title} · qty {item.qty || 1}</span><a className="text-violet-700 underline" href={safeOfferUrl(offer.sourceUrl)} target="_blank" rel="noreferrer">{money(offer.unitCents / 100)} / unit ↗</a></div>)}</details></div>
      })}
      {comparison?.splitOption && <p className="text-sm font-semibold text-violet-700">Two-store option: {comparison.splitOption.storeIds.join(' + ')} · {money(comparison.splitOption.totalCents / 100)} including extra costs · {money(comparison.splitOption.extraSavingVersusSingleCents / 100)} better than one store.</p>}
    </section>
  </div>
}

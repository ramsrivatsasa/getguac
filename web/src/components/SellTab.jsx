'use client'
// "Sell" tab — peer-to-peer Marketplace (Facebook-Marketplace style). GetGuac
// account holders upload listings (photos + price + details); anyone can
// browse. Data via lib/marketplaceListings (RLS-enforced). Photos reuse the
// receipts storage bucket.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus, X, MapPin, Tag, ImagePlus, Loader2, Trash2, BadgeCheck, Mail } from 'lucide-react'
import {
  LISTING_CATEGORIES, LISTING_CONDITIONS,
  getCurrentUserId, listListings, createListing, deleteListing, markListingSold,
} from '../lib/marketplaceListings'

const money = (n) => `$${(Number(n) || 0).toFixed(Number(n) % 1 === 0 ? 0 : 2)}`

export default function SellTab({ query = '' }) {
  const [me, setMe] = useState(undefined) // undefined = loading auth, null = guest, string = userId
  const [category, setCategory] = useState('All')
  const [listings, setListings] = useState([])
  const [status, setStatus] = useState('loading') // loading | done | error | needs-setup
  const [formOpen, setFormOpen] = useState(false)
  const [detail, setDetail] = useState(null)

  useEffect(() => { getCurrentUserId().then((id) => setMe(id)).catch(() => setMe(null)) }, [])

  async function load() {
    setStatus('loading')
    try {
      setListings(await listListings({ category }))
      setStatus('done')
    } catch (e) {
      // Table missing = migration not applied yet — show a friendly setup note.
      setStatus(/relation|does not exist|schema cache/i.test(e.message || '') ? 'needs-setup' : 'error')
    }
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [category])

  const q = query.trim().toLowerCase()
  const shown = q
    ? listings.filter((l) =>
        (l.title || '').toLowerCase().includes(q) ||
        (l.description || '').toLowerCase().includes(q) ||
        (l.category || '').toLowerCase().includes(q))
    : listings

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-black text-gray-900">Marketplace</h2>
          <p className="text-sm text-gray-500">
            Buy & sell with the GetGuac community{me === null ? ' — members only to sell' : ''}.
          </p>
        </div>
        <SellCta me={me} onClick={() => setFormOpen(true)} className="shrink-0" />
      </div>

      {/* Category rail */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {LISTING_CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              category === c ? 'bg-emerald-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-200 hover:text-emerald-700'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="bg-gray-100" style={{ aspectRatio: '1 / 1' }} />
              <div className="p-3 space-y-2"><div className="h-4 bg-gray-100 rounded w-1/3" /><div className="h-3 bg-gray-100 rounded w-3/4" /></div>
            </div>
          ))}
        </div>
      )}

      {status === 'needs-setup' && (
        <div className="text-center py-12 text-gray-600">
          <div className="text-5xl mb-3">🛠️</div>
          <p className="font-bold text-gray-800">Marketplace selling is almost ready.</p>
          <p className="text-sm mt-1">The listings table needs to be enabled (migration_073). Once applied, sellers can post here.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-12">
          <p className="text-rose-600 font-semibold">Couldn’t load listings.</p>
          <button onClick={load} className="btn-secondary mt-3">Try again</button>
        </div>
      )}

      {status === 'done' && shown.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-5xl mb-3">🛍️</div>
          <p className="font-semibold text-gray-700">{q ? `No items match “${query}”.` : 'No listings yet — be the first to sell.'}</p>
          <SellCta me={me} onClick={() => setFormOpen(true)} className="mt-4" label="List an item" />
        </div>
      )}

      {status === 'done' && shown.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {shown.map((l) => <ListingCard key={l.id} l={l} onClick={() => setDetail(l)} />)}
        </div>
      )}

      {formOpen && <ListingForm onClose={() => setFormOpen(false)} onCreated={() => { setFormOpen(false); load() }} />}
      {detail && <ListingDetail l={detail} me={me} onClose={() => setDetail(null)} onChanged={() => { setDetail(null); load() }} />}
    </div>
  )
}

// Members-only sell CTA: signed-in users get the "list" button; guests get a
// sign-in link (selling is restricted to GetGuac members — also enforced by RLS).
function SellCta({ me, onClick, className = '', label = 'Sell an item' }) {
  if (me === null) {
    return (
      <Link href="/login" className={`btn-primary inline-flex items-center gap-1.5 ${className}`}>
        <Plus size={16} /> Sign in to sell
      </Link>
    )
  }
  return (
    <button onClick={onClick} disabled={me === undefined} className={`btn-primary inline-flex items-center gap-1.5 disabled:opacity-60 ${className}`}>
      <Plus size={16} /> {label}
    </button>
  )
}

function ListingCard({ l, onClick }) {
  const img = Array.isArray(l.images) && l.images[0]
  return (
    <button onClick={onClick} className="text-left bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:border-emerald-200 hover:-translate-y-0.5 transition-all flex flex-col">
      <div className="relative bg-gray-50 flex items-center justify-center" style={{ aspectRatio: '1 / 1' }}>
        {img
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={img} alt={l.title} className="object-cover w-full h-full" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          : <span className="text-5xl opacity-50">📦</span>}
        {l.condition && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-gray-700 shadow-sm">{l.condition}</span>}
      </div>
      <div className="p-3">
        <p className="text-lg font-extrabold text-gray-900 tabular-nums">{Number(l.price) === 0 ? 'Free' : money(l.price)}</p>
        <p className="font-semibold text-gray-800 text-sm line-clamp-1">{l.title}</p>
        {l.location && <p className="text-[11px] text-gray-400 mt-0.5 inline-flex items-center gap-1"><MapPin size={10} /> {l.location}</p>}
      </div>
    </button>
  )
}

function ListingForm({ onClose, onCreated }) {
  const [f, setF] = useState({ title: '', price: '', category: 'Electronics', condition: 'Good', location: '', description: '', contact_email: '' })
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  function onPick(e) {
    const picked = Array.from(e.target.files || []).slice(0, 5)
    setFiles(picked)
    setPreviews(picked.map((file) => URL.createObjectURL(file)))
  }

  async function submit(e) {
    e.preventDefault()
    if (!f.title.trim()) { toast.error('Add a title.'); return }
    setSaving(true)
    try {
      await createListing({ ...f, images: files })
      toast.success('Listed! 🎉')
      onCreated()
    } catch (err) {
      toast.error(err.message || 'Could not create listing.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-black text-gray-900">List an item</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Photos */}
          <div>
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-emerald-200 rounded-xl py-5 flex flex-col items-center gap-1 text-emerald-700 hover:bg-emerald-50">
              <ImagePlus size={22} />
              <span className="text-sm font-semibold">{files.length ? `${files.length} photo${files.length > 1 ? 's' : ''} selected` : 'Add photos (up to 5)'}</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPick} className="hidden" />
            {previews.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {previews.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                ))}
              </div>
            )}
          </div>
          <input className="input w-full" placeholder="What are you selling?" value={f.title} onChange={set('title')} maxLength={120} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input w-full" placeholder="Price (USD)" inputMode="decimal" value={f.price} onChange={set('price')} />
            <select className="input w-full" value={f.condition} onChange={set('condition')}>
              {LISTING_CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className="input w-full" value={f.category} onChange={set('category')}>
              {LISTING_CATEGORIES.filter((c) => c !== 'All').map((c) => <option key={c}>{c}</option>)}
            </select>
            <input className="input w-full" placeholder="Location (city)" value={f.location} onChange={set('location')} maxLength={60} />
          </div>
          <textarea className="input w-full min-h-[90px] resize-y" placeholder="Describe your item — condition, details, why you’re selling…" value={f.description} onChange={set('description')} maxLength={2000} />
          <input className="input w-full" placeholder="Contact email (optional — how buyers reach you)" value={f.contact_email} onChange={set('contact_email')} />
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-1.5">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Tag size={15} />} {saving ? 'Listing…' : 'List it'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ListingDetail({ l, me, onClose, onChanged }) {
  const isOwner = me && me === l.seller_id
  const imgs = Array.isArray(l.images) ? l.images : []
  const [busy, setBusy] = useState(false)

  async function remove() {
    if (!confirm('Delete this listing?')) return
    setBusy(true)
    try { await deleteListing(l.id); toast.success('Listing removed'); onChanged() }
    catch (e) { toast.error(e.message); setBusy(false) }
  }
  async function sold() {
    setBusy(true)
    try { await markListingSold(l.id); toast.success('Marked sold'); onChanged() }
    catch (e) { toast.error(e.message); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Listing</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {imgs.length > 0 && (
            <div className="flex gap-2 overflow-x-auto bg-gray-50 p-3">
              {imgs.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={l.title} className="h-56 rounded-xl object-cover" />
              ))}
            </div>
          )}
          <div className="p-4 space-y-2">
            <p className="text-2xl font-extrabold text-emerald-700">{Number(l.price) === 0 ? 'Free' : money(l.price)}</p>
            <h3 className="text-lg font-bold text-gray-900">{l.title}</h3>
            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
              {l.condition && <span className="px-2 py-0.5 rounded-full bg-gray-100 font-semibold">{l.condition}</span>}
              {l.category && <span className="px-2 py-0.5 rounded-full bg-gray-100 font-semibold">{l.category}</span>}
              {l.location && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {l.location}</span>}
            </div>
            {l.description && <p className="text-sm text-gray-700 whitespace-pre-wrap pt-1">{l.description}</p>}
            {l.receipt_id && (
              <p className="text-xs text-emerald-700 inline-flex items-center gap-1 pt-1"><BadgeCheck size={13} /> Proof of purchase on file</p>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-2">
          {isOwner ? (
            <div className="flex gap-2">
              <button onClick={sold} disabled={busy} className="btn-secondary text-sm">Mark sold</button>
              <button onClick={remove} disabled={busy} className="inline-flex items-center gap-1 text-sm font-bold text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl"><Trash2 size={14} /> Delete</button>
            </div>
          ) : <span className="text-xs text-gray-400">Seller is a GetGuac member</span>}
          {l.contact_email
            ? <a href={`mailto:${l.contact_email}?subject=${encodeURIComponent('Interested in: ' + l.title)}`} className="btn-primary inline-flex items-center gap-1.5"><Mail size={15} /> Contact seller</a>
            : <Link href="/register" className="btn-primary inline-flex items-center gap-1.5"><Mail size={15} /> Sign in to contact</Link>}
        </div>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useTrips, useUpsertTrip, useDeleteTrip } from '../../../hooks/useTrips'
import toast from 'react-hot-toast'
import { Trash2, Car, Pencil, MapPin, Calculator, Loader2, Crosshair } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getStores } from '../../../lib/db'
import AddressInput from '../../../components/AddressInput'
import GuacMascot from '../../../components/GuacMascot'
import { displayStoreName } from '../../../lib/store-name-normalize'

const EMPTY = { start_date: '', end_date: '', total_miles: '', description: '', category: 'Personal', from_address: '', to_address: '', tags: [] }

// Quick tag chips — designed for one-tap mobile entry. Desktop also gets the
// full description textarea below.
const TRIP_TAGS = [
  { label: 'Commute',  emoji: '🛣️' },
  { label: 'Work',     emoji: '💼' },
  { label: 'Client',   emoji: '🤝' },
  { label: 'Errand',   emoji: '🧾' },
  { label: 'Grocery',  emoji: '🥑' },
  { label: 'Doctor',   emoji: '🩺' },
  { label: 'School',   emoji: '🏫' },
  { label: 'Airport',  emoji: '✈️' },
  { label: 'Vacation', emoji: '🏖️' },
  { label: 'Friend',   emoji: '👋' },
  { label: 'Family',   emoji: '👨‍👩‍👧' },
  { label: 'Side trip', emoji: '↪️' },
]

export default function CarMilesPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const { data: trips = [], isLoading } = useTrips()
  const upsert = useUpsertTrip()
  const del = useDeleteTrip()
  const s = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  function startEdit(t) {
    setEditingId(t.id)
    setForm({
      start_date: t.start_date || '',
      end_date: t.end_date || '',
      total_miles: t.total_miles ?? '',
      description: t.description || '',
      category: t.category || 'Personal',
      from_address: t.from_address || '',
      to_address:   t.to_address   || '',
      tags: Array.isArray(t.tags) ? t.tags : [],
    })
    setShowForm(true)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function toggleTag(tag) {
    setForm(p => {
      const cur = Array.isArray(p.tags) ? p.tags : []
      const next = cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag]
      return { ...p, tags: next }
    })
  }

  // Date helpers — keep start_date / end_date / days in sync
  function addDays(dateStr, days) {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    if (isNaN(d)) return ''
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }
  function diffDays(start, end) {
    if (!start || !end) return ''
    const a = new Date(start + 'T00:00:00')
    const b = new Date(end + 'T00:00:00')
    if (isNaN(a) || isNaN(b)) return ''
    return Math.max(0, Math.round((b - a) / 86400000))
  }

  function onStartDateChange(e) {
    const start_date = e.target.value
    setForm(p => {
      // End date defaults to start if empty; else recompute days
      const next = { ...p, start_date }
      if (!p.end_date) next.end_date = start_date
      return next
    })
  }
  function onDaysChange(e) {
    const days = parseInt(e.target.value, 10)
    setForm(p => {
      if (!p.start_date || Number.isNaN(days)) return p
      return { ...p, end_date: addDays(p.start_date, days) }
    })
  }
  function onEndDateChange(e) {
    setForm(p => ({ ...p, end_date: e.target.value }))
  }
  const tripDays = form.start_date && form.end_date ? diffDays(form.start_date, form.end_date) : ''

  function cancelForm() {
    setShowForm(false); setForm(EMPTY); setEditingId(null)
  }

  // Distance calculator — calls /api/distance which geocodes via Nominatim + Haversine.
  const [calculating, setCalculating] = useState(false)
  const [locating, setLocating]       = useState(false)
  const [fromCoords, setFromCoords]   = useState(null)
  const [toCoords,   setToCoords]     = useState(null)

  async function calcMiles() {
    if (!form.from_address?.trim() || !form.to_address?.trim()) {
      toast.error('Enter both From and To addresses')
      return
    }
    setCalculating(true)
    try {
      const res = await fetch('/api/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: form.from_address, to: form.to_address,
          fromCoords, toCoords,   // skip geocoding if we already have them
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Distance lookup failed')
      setForm(p => ({ ...p, total_miles: String(data.miles) }))
      toast.success(`~${data.miles} mi (driving est.)`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setCalculating(false)
    }
  }

  // "Use my location" → fills From field with reverse-geocoded address
  function useMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocation not supported in this browser'); return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      try {
        const res = await fetch(`/api/distance?lat=${lat}&lng=${lng}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Reverse geocode failed')
        setForm(p => ({ ...p, from_address: data.address }))
        setFromCoords({ lat, lng })
        toast.success('Location filled')
      } catch (e) {
        toast.error(e.message)
      } finally {
        setLocating(false)
      }
    }, (err) => {
      setLocating(false)
      toast.error(err.message || 'Location denied')
    }, { enableHighAccuracy: false, timeout: 8000 })
  }

  // "Pick a store" — fill To with one of the user's stores
  const { data: storesList = [] } = useQuery({ queryKey: ['stores'], queryFn: getStores, staleTime: 60_000 })

  const allSelected = trips.length > 0 && trips.every(t => selected.has(t.id))
  function toggleOne(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    setSelected(prev => allSelected ? new Set() : new Set(trips.map(t => t.id)))
  }
  async function handleDeleteSelected() {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} trip${selected.size === 1 ? '' : 's'}?`)) return
    const ids = [...selected]
    const results = await Promise.allSettled(ids.map(id => del.mutateAsync(id)))
    const failed = results.filter(r => r.status === 'rejected').length
    setSelected(new Set())
    if (failed) toast.error(`${failed} failed`); else toast.success(`Deleted ${ids.length}`)
  }

  const businessMiles = trips.filter(t => t.category === 'Business').reduce((sum, t) => sum + parseFloat(t.total_miles || 0), 0)
  const personalMiles = trips.filter(t => t.category === 'Personal').reduce((sum, t) => sum + parseFloat(t.total_miles || 0), 0)

  function handleSave(e) {
    e.preventDefault()
    const payload = editingId ? { ...form, id: editingId } : form
    upsert.mutate(payload, {
      onSuccess: () => {
        toast.success(editingId ? 'Trip updated' : 'Trip added')
        setForm(EMPTY); setShowForm(false); setEditingId(null)
      },
      onError: err => toast.error(err.message),
    })
  }

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Car Miles</h1>
        <button onClick={() => { setEditingId(null); setForm(EMPTY); setShowForm(v => !v) }} className="btn-primary"><GuacMascot expression="happy" size={22} /> Add Trip</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Business Miles', miles: businessMiles, color: 'bg-blue-100 text-blue-700' },
          { label: 'Personal Miles', miles: personalMiles, color: 'bg-green-100 text-green-700' },
          { label: 'Total Miles', miles: businessMiles + personalMiles, color: 'bg-purple-100 text-purple-700' },
        ].map(({ label, miles, color }) => (
          <div key={label} className="stat-card">
            <div className={`p-3 rounded-xl ${color}`}><Car size={20} /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-xl font-bold">{miles.toFixed(1)} mi</p>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="card space-y-4">
          <h3 className="font-semibold">{editingId ? 'Edit Trip' : 'Add Trip'}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            {/* From / To addresses with auto-calculate */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                <MapPin size={12} /> Route (auto-calculates miles)
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="label">From</label>
                    <button type="button" onClick={useMyLocation} disabled={locating}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 mb-1">
                      {locating ? <Loader2 size={10} className="animate-spin" /> : <Crosshair size={10} />}
                      Use my location
                    </button>
                  </div>
                  <AddressInput
                    value={form.from_address}
                    onChange={v => { setForm(p => ({ ...p, from_address: v })); setFromCoords(null) }}
                    onSelect={({ address, lat, lng }) => { setForm(p => ({ ...p, from_address: address })); setFromCoords({ lat, lng }) }}
                    placeholder="123 Main St, Leesburg VA"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="label">To</label>
                    {storesList.length > 0 && (
                      <select
                        onChange={e => {
                          const s = storesList.find(x => x.id === e.target.value)
                          if (!s) return
                          const addr = [s.store_name, s.address].filter(Boolean).join(', ')
                          setForm(p => ({ ...p, to_address: addr }))
                          setToCoords(null)
                          e.target.value = ''
                        }}
                        value=""
                        className="text-[10px] font-bold text-emerald-700 bg-transparent border-none cursor-pointer mb-1">
                        <option value="" disabled>🏪 Pick a store…</option>
                        {storesList.map(st => (
                          <option key={st.id} value={st.id}>{displayStoreName(st.store_name)}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <AddressInput
                    value={form.to_address}
                    onChange={v => { setForm(p => ({ ...p, to_address: v })); setToCoords(null) }}
                    onSelect={({ address, lat, lng }) => { setForm(p => ({ ...p, to_address: address })); setToCoords({ lat, lng }) }}
                    placeholder="Home Depot, Fairfax VA"
                  />
                </div>
              </div>
              <button type="button" onClick={calcMiles} disabled={calculating}
                className="btn-secondary text-xs py-1.5">
                {calculating
                  ? <><Loader2 size={13} className="animate-spin" /> Calculating…</>
                  : <><Calculator size={13} /> Calculate miles</>}
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="label">Start Date</label>
                <input type="date" required className="input" value={form.start_date} onChange={onStartDateChange} />
              </div>
              <div>
                <label className="label">Days</label>
                <input
                  type="number" min="0" step="1"
                  className="input tabular-nums"
                  value={tripDays}
                  onChange={onDaysChange}
                  placeholder="0"
                  disabled={!form.start_date}
                  title={form.start_date ? 'Sets end date = start + days' : 'Pick a start date first'}
                />
              </div>
              <div>
                <label className="label">End Date</label>
                <input type="date" required className="input" value={form.end_date} onChange={onEndDateChange} />
              </div>
              <div>
                <label className="label">Total Miles</label>
                <input type="number" step="0.1" required className="input" value={form.total_miles} onChange={s('total_miles')} />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input font-sans" value={form.category} onChange={s('category')}>
                  <option>Business</option><option>Personal</option>
                </select>
              </div>
            </div>
            {/* Quick tags — works on mobile + desktop */}
            <div>
              <label className="label">Quick tags <span className="text-[10px] text-gray-400 normal-case font-normal">tap any that fit</span></label>
              <div className="flex flex-wrap gap-1.5">
                {TRIP_TAGS.map(t => {
                  const active = (form.tags || []).includes(t.label)
                  return (
                    <button key={t.label} type="button" onClick={() => toggleTag(t.label)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                        active
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-800'
                      }`}>
                      {t.emoji} {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Description: compact on mobile, full textarea on desktop */}
            <div>
              <label className="label">
                Description
                <span className="hidden sm:inline text-[10px] text-gray-400 normal-case font-normal ml-1">— notes, mileage purpose, etc.</span>
              </label>
              <input className="input sm:hidden" placeholder="Optional note" value={form.description} onChange={s('description')} />
              <textarea
                rows={3}
                className="input hidden sm:block resize-none"
                placeholder="Anything you'd want to remember — purpose, who you met, what you bought, mileage rationale for taxes…"
                value={form.description}
                onChange={s('description')}
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={upsert.isPending} className="btn-primary">
                {upsert.isPending ? 'Saving…' : editingId ? 'Update Trip' : 'Add Trip'}
              </button>
              <button type="button" className="btn-secondary" onClick={cancelForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {trips.length > 0 && (
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
        ) : trips.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No trips yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="pl-4 pr-2 py-3 w-10">
                    <input type="checkbox" className="w-4 h-4 rounded cursor-pointer" checked={allSelected}
                      onChange={toggleAll} aria-label="Select all" />
                  </th>
                  {['Start','End','Miles','Category','Description','Actions'].map(h =>
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {trips.map(t => (
                  <tr key={t.id} className={`hover:bg-gray-50/50 ${selected.has(t.id) ? 'bg-blue-50/60' : ''}`}>
                    <td className="pl-4 pr-2 py-3">
                      <input type="checkbox" className="w-4 h-4 rounded cursor-pointer" checked={selected.has(t.id)}
                        onChange={() => toggleOne(t.id)} aria-label="Select trip" />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{t.start_date}</td>
                    <td className="px-4 py-3 text-gray-500">{t.end_date}</td>
                    <td className="px-4 py-3 font-bold">{t.total_miles}</td>
                    <td className="px-4 py-3">
                      <span className={t.category === 'Business' ? 'badge-blue' : 'badge-green'}>{t.category}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs">
                      {(t.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-0.5">
                          {(t.tags || []).slice(0, 4).map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">{tag}</span>
                          ))}
                          {(t.tags || []).length > 4 && <span className="text-[10px] text-gray-400">+{(t.tags || []).length - 4}</span>}
                        </div>
                      )}
                      <span className="truncate block">{t.description || (((t.tags || []).length === 0) ? '—' : '')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => startEdit(t)} aria-label="Edit trip"
                          className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-sm">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => del.mutate(t.id, { onSuccess: () => toast.success('Deleted') })} aria-label="Delete trip"
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

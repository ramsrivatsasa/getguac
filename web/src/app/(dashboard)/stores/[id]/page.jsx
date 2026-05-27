'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStore, updateStore, getReceipts, getStoreReturnPolicies } from '../../../../lib/db'
import { formatDateShort } from '../../../../lib/dateFormat'
import toast from 'react-hot-toast'
import { ArrowLeft, Save, Store, Phone, Globe, MapPin, Receipt, ChevronRight, Hash, Navigation, Crosshair, Loader2, Shield, ExternalLink } from 'lucide-react'
export default function StoreDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: store, isLoading } = useQuery({
    queryKey: ['stores', id],
    queryFn: () => getStore(id),
    enabled: !!id,
  })

  const { data: receipts = [] } = useQuery({
    queryKey: ['receipts', { storeId: id }],
    queryFn: () => getReceipts({ storeId: id }),
    enabled: !!id,
  })

  // Curated return policies (from store_return_policies, seeded migration 026)
  // for this store. Looks up by normalized store_name so "COSTCO WHOLESALE"
  // and "Costco #218 RESTON" both find Costco's policy.
  const { data: returnPolicies = [] } = useQuery({
    queryKey: ['store-return-policies', store?.store_name],
    queryFn: () => getStoreReturnPolicies(store?.store_name),
    enabled: !!store?.store_name,
  })

  const [form, setForm] = useState({ store_name: '', address: '', phone_no: '', website: '' })

  useEffect(() => {
    if (store) setForm({
      store_name: store.store_name || '',
      address: store.address || '',
      phone_no: store.phone_no || '',
      website: store.website || '',
    })
  }, [store])

  const saveMutation = useMutation({
    mutationFn: (patch) => updateStore(id, patch),
    onSuccess: () => {
      toast.success('Store updated')
      qc.invalidateQueries({ queryKey: ['stores'] })
    },
    onError: err => toast.error(err.message),
  })

  function handleSave(e) {
    e.preventDefault()
    saveMutation.mutate(form)
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  if (isLoading) return <div className="py-16 text-center text-gray-400">Loading…</div>
  if (!store) return <div className="py-16 text-center text-red-500">Store not found</div>

  const locations = store.store_locations || []
  const totalSpend = receipts.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0)

  // Group receipts by location for the by-location view
  const byLocation = new Map()
  for (const loc of locations) byLocation.set(loc.id, { loc, items: [] })
  byLocation.set('_none', { loc: null, items: [] })
  for (const r of receipts) {
    const key = r.store_location_id && byLocation.has(r.store_location_id) ? r.store_location_id : '_none'
    byLocation.get(key).items.push(r)
  }

  const fields = [
    { label: 'Store Name', key: 'store_name', icon: Store, required: true },
    { label: 'Address', key: 'address', icon: MapPin },
    { label: 'Phone No', key: 'phone_no', icon: Phone },
    { label: 'Website', key: 'website', icon: Globe },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-ghost p-1.5"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-xl"><Store className="text-blue-800" size={18} /></div>
          <h1 className="page-title">{store.store_name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Receipts</p>
          <p className="text-2xl font-semibold mt-1">{receipts.length}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Locations</p>
          <p className="text-2xl font-semibold mt-1">{locations.length || 1}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Spend</p>
          <p className="text-2xl font-semibold mt-1">${totalSpend.toFixed(2)}</p>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Store Details</h3>
        <form onSubmit={handleSave} className="space-y-4">
          {fields.map(({ label, key, icon: Icon, required }) => (
            <div key={key}>
              <label className="label flex items-center gap-1.5">
                <Icon size={13} className="text-gray-400" /> {label}
              </label>
              <input className="input" value={form[key]} onChange={f(key)} required={required} placeholder={label} />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
              <Save size={15} /> {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Directions + Distance from current location */}
      {store.address && (
        <StoreDirections
          storeName={store.store_name}
          address={store.address}
          phone={store.phone_no}
        />
      )}

      {locations.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">Locations</h3>
          <div className="divide-y divide-gray-100">
            {locations.map(loc => {
              const fullAddr = [loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(', ')
              return (
                <div key={loc.id} className="py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                  <span className="font-medium">{loc.location_name || loc.city || 'Location'}</span>
                  {fullAddr && <span className="text-gray-500 flex items-center gap-1"><MapPin size={11} />{fullAddr}</span>}
                  {loc.phone_no && <span className="text-gray-500 flex items-center gap-1"><Phone size={11} />{loc.phone_no}</span>}
                  {loc.store_no && <span className="text-gray-400 text-xs flex items-center gap-1"><Hash size={10} />Store #{loc.store_no}</span>}
                  {fullAddr && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddr)}`}
                      target="_blank" rel="noreferrer"
                      title="Open directions in Google Maps"
                      className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100">
                      <Navigation size={11} /> Directions
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Return Policy — curated from store_return_policies. The merchant's
          published policy + a clickable citation so the user can verify
          before driving back to the store with an item to return. */}
      {returnPolicies.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-emerald-600" />
            <h3 className="font-semibold text-gray-800">Return Policy</h3>
            <span className="ml-auto text-[11px] text-gray-400">From the merchant's published policy</span>
          </div>
          <div className="space-y-3">
            {returnPolicies.map(p => {
              const windowLabel = p.days == null ? 'No time limit' : `${p.days} days`
              const eligible = p.eligible !== false
              return (
                <div key={p.id} className="flex items-start gap-3 py-2 border-t border-gray-100 first:border-0 first:pt-0">
                  <div className={`shrink-0 w-12 text-center px-2 py-1 rounded-lg text-xs font-bold ${eligible ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                    {p.days == null && eligible ? '∞' : (p.days ?? '—')}
                    <div className="text-[9px] font-medium uppercase tracking-wider text-gray-500 mt-0.5">
                      {p.days == null && eligible ? 'days' : (eligible ? 'days' : 'final')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span>{p.category ? p.category : 'All items'}</span>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">#{p.policy_id}</span>
                    </div>
                    {p.details && <p className="text-xs text-gray-600 mt-0.5">{p.details}</p>}
                    {p.source_url && (
                      <a
                        href={p.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900"
                        title={`Read ${store.store_name}'s full return policy`}
                      >
                        Read {store.store_name}'s full policy <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b">
          <Receipt size={16} className="text-gray-500" />
          <h3 className="font-semibold text-gray-800">Receipts at this store</h3>
          <span className="text-sm text-gray-400 ml-auto">{receipts.length}</span>
        </div>
        {receipts.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">No receipts yet for this store.</p>
        ) : (
          [...byLocation.values()].filter(g => g.items.length > 0).map(({ loc, items }) => (
            <div key={loc?.id || 'none'}>
              <div className="bg-gray-50/70 px-5 py-2 text-xs uppercase tracking-wide text-gray-500 border-b">
                {loc ? (
                  <>
                    {loc.location_name || loc.city || 'Location'}
                    {loc.address && <span className="text-gray-400 normal-case ml-2">— {loc.address}{loc.city ? `, ${loc.city}` : ''}</span>}
                  </>
                ) : 'Unassigned location'}
                <span className="float-right">{items.length} receipt{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map(r => (
                  <Link key={r.id} href={`/receipts/${r.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/70 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="text-sm text-gray-500 w-24 shrink-0">{formatDateShort(r.date)}</span>
                      <span className={`text-sm font-semibold ${parseFloat(r.total_amount) < 0 ? 'text-rose-600' : 'text-gray-800'}`}>
                        ${parseFloat(r.total_amount || 0).toFixed(2)}
                      </span>
                      {r.business_purchase && <span className="badge-blue text-xs">Biz</span>}
                      {parseFloat(r.total_amount) < 0 && <span className="badge-gray text-xs">Return</span>}
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500" />
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="text-xs text-gray-400">
        Store ID: <span className="font-mono">{store.id}</span>
        {store.created_at && <span className="ml-4">Created: {new Date(store.created_at).toLocaleDateString()}</span>}
      </div>
    </div>
  )
}

// "Directions + distance from me" card. Opens Google Maps directions; calls
// /api/distance with the user's geolocation to show an estimated drive distance.
function StoreDirections({ storeName, address, phone }) {
  const [distance, setDistance] = useState(null)
  const [loading, setLoading]   = useState(false)
  const destination = `${storeName}, ${address}`
  const mapsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`

  function getDistance() {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      try {
        const res = await fetch('/api/distance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: destination, fromCoords: { lat, lng } }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setDistance(data.miles)
      } catch (e) {
        toast.error(e.message)
      } finally {
        setLoading(false)
      }
    }, (err) => {
      setLoading(false)
      toast.error(err.message || 'Location denied')
    }, { enableHighAccuracy: false, timeout: 8000 })
  }

  return (
    <div className="card bg-gradient-to-br from-emerald-50/60 to-lime-50/40 border-emerald-200">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white shadow-md flex items-center justify-center ring-2 ring-white">
          <Navigation size={18} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Get there</p>
          <p className="text-sm text-gray-700 mt-0.5 flex items-center gap-1">
            <MapPin size={12} className="text-gray-400" /> {address}
          </p>
          {distance != null && (
            <p className="text-xs text-emerald-700 mt-1 font-semibold">
              ~{distance} mi from your current location (driving est.)
            </p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={getDistance}
            disabled={loading}
            className="btn-secondary text-xs py-1.5"
            title="Estimate driving distance from your current location">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Crosshair size={13} />}
            {loading ? 'Locating…' : 'Distance from me'}
          </button>
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            className="btn-primary text-xs py-1.5"
            title="Open in Google Maps">
            <Navigation size={13} /> Directions
          </a>
          {phone && (
            <a
              href={`tel:${phone.replace(/\D+/g, '')}`}
              className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all flex items-center justify-center shadow-sm"
              title={`Call ${phone}`}>
              <Phone size={13} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

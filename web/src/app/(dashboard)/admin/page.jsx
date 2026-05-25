'use client'
import { useState } from 'react'
import { createClient } from '../../../lib/supabase/client'
import { ShieldCheck, Search } from 'lucide-react'
export default function AdminPage() {
  const [type, setType] = useState('receipts')
  const [userName, setUserName] = useState('')
  const [store, setStore] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const sb = createClient()

  async function search(e) {
    e.preventDefault()
    setLoading(true)
    try {
      // Admin queries via service role — in production, use a Next.js API route with service key
      let q = sb.from(type === 'receipts' ? 'receipts' : 'rewards').select('*, profiles(first_name,last_name,email)')
      if (store) q = q.ilike('store_name', `%${store}%`)
      const { data, error } = await q.limit(50)
      if (error) throw error
      setResults(data ?? [])
    } catch (err) {
      alert('Search requires admin RLS or service role key: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-100 rounded-xl"><ShieldCheck className="text-blue-800" size={22} /></div>
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="text-sm text-gray-400">admin@getguac.app</p>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4">Search All Records</h3>
        <form onSubmit={search} className="space-y-4">
          <div className="flex gap-2 mb-3">
            {['receipts','rewards'].map(t => (
              <button key={t} type="button" onClick={() => { setType(t); setResults([]) }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize ${type === t ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Store Name</label><input className="input" placeholder="Filter by store…" value={store} onChange={e => setStore(e.target.value)} /></div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary"><Search size={15} /> {loading ? 'Searching…' : 'Search'}</button>
        </form>
      </div>

      {results.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b text-sm font-semibold">{results.length} results</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                <tr>{['ID','User','Store','Date','Amount'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map(r => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.id.substring(0, 8)}…</td>
                    <td className="px-4 py-3">{r.profiles?.email ?? '—'}</td>
                    <td className="px-4 py-3 font-medium">{r.store_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{r.date ?? r.expiry_date ?? '—'}</td>
                    <td className="px-4 py-3">{r.total_amount ? `$${r.total_amount}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card border-amber-200 bg-amber-50">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Full cross-user admin search requires a Next.js API route using <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          Add <code>src/app/api/admin/search/route.js</code> with the service role client for production.
        </p>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '../../../lib/supabase/client'
import { ShieldCheck, Search, Upload, Trash2 } from 'lucide-react'
import { displayStoreName } from '../../../lib/store-name-normalize'
import { useConfirm } from '../../../components/ConfirmDialog'
export default function AdminPage() {
  const confirm = useConfirm()
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
      await confirm({
        title: 'Search failed',
        body: 'Search requires admin RLS or service role key:\n\n' + err.message,
        confirmText: 'OK',
        cancelText: null,
      })
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
                    <td className="px-4 py-3 font-medium">{displayStoreName(r.store_name) ?? '—'}</td>
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

      <TestDataImporter />
    </div>
  )
}

// QA tester onboarding helper — paste-or-upload a CSV (we ship one at
// getguac/test/TEST_DATA.csv) and the server bulk-creates receipts +
// line items in YOUR own account. Tagged `[TEST IMPORT]` so the
// Clear button below can wipe them all in one shot when QA is done.
//
// Designed to be removed cleanly once we're past tester onboarding:
//   1. Delete this component
//   2. Delete src/app/api/admin/import-test-data/route.js
//   3. Delete src/app/api/admin/clear-test-data/route.js
// (Nothing else depends on them.)
function TestDataImporter() {
  const [csv, setCsv] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1_000_000) { toast.error('CSV too large (max 1MB)'); return }
    const text = await file.text()
    setCsv(text)
    toast.success(`Loaded ${file.name} (${text.split('\n').length - 1} rows)`)
  }

  async function runImport() {
    if (!csv.trim()) { toast.error('Paste a CSV or pick a file first'); return }
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/import-test-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setResult(data)
      toast.success(`Imported ${data.receipts_created} receipts · ${data.items_created} items`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function runClear() {
    if (!(await confirm({
      title: 'Wipe all test-imported receipts?',
      body: 'Removes every receipt tagged [TEST IMPORT]. Your real receipts stay.',
      confirmText: 'Wipe test data',
      danger: true,
    }))) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/clear-test-data', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Clear failed')
      toast.success(`Cleared ${data.deleted} test receipts`)
      setResult({ deleted: data.deleted, cleared: true })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card border-emerald-200 bg-emerald-50/40 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
          <Upload className="text-emerald-800" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-emerald-900">Tester data importer</h3>
          <p className="text-xs text-emerald-800/80 mt-0.5">
            Bulk-import the QA fixture from <code className="px-1 py-0.5 bg-white rounded text-[11px]">getguac/test/TEST_DATA.csv</code> into your own account.
            Tagged <code className="px-1 py-0.5 bg-white rounded text-[11px]">[TEST IMPORT]</code> so you can wipe them in one click.
            <span className="block mt-1 text-amber-800 font-semibold">Remove this whole section before going live to real users.</span>
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="block text-sm"
        />
        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer font-semibold">Or paste CSV directly</summary>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={8}
            placeholder="date,store_name,item_name,qty,price,category,..."
            className="w-full mt-2 font-mono text-[11px] p-2 border border-gray-200 rounded-lg"
          />
        </details>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runImport}
            disabled={busy || !csv.trim()}
            className="btn-primary inline-flex items-center gap-1.5 text-sm disabled:opacity-50"
          >
            <Upload size={14} /> {busy ? 'Importing…' : 'Import to my account'}
          </button>
          <button
            type="button"
            onClick={runClear}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold disabled:opacity-50"
          >
            <Trash2 size={14} /> Clear all test data
          </button>
        </div>

        {result && (
          <div className="text-xs bg-white border border-emerald-200 rounded-lg p-3 font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(result, null, 2)}
          </div>
        )}
      </div>
    </div>
  )
}

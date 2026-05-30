'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '../../../store'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { createClient } from '../../../lib/supabase/client'
import {
  Upload, Loader2, FileText, Image as ImageIcon, Check, ShieldCheck, ShoppingBag, Undo2, AlertTriangle, Percent, CreditCard, ChevronDown, ChevronRight, Briefcase, Banknote
} from 'lucide-react'
import GuacMascot from '../../../components/GuacMascot'
import { CATEGORIES, CATEGORY_BY_SLUG } from '../../../lib/categories'
import { useConfirm } from '../../../components/ConfirmDialog'
// Sections used to group rows in the preview. Each kind picks a section.
const SECTIONS = [
  { key: 'purchase', label: 'Spending',      icon: ShoppingBag,   tone: 'rose',    desc: 'Merchant purchases — these become receipts and feed your analytics.' },
  { key: 'refund',   label: 'Refunds',       icon: Undo2,         tone: 'emerald', desc: 'Money credited back from a merchant. Reconciles against the original purchase.' },
  { key: 'fee',      label: 'Fees',          icon: AlertTriangle, tone: 'amber',   desc: 'Annual fees, overdraft, ATM, foreign-tx, late fees.' },
  { key: 'interest', label: 'Interest',      icon: Percent,       tone: 'orange',  desc: 'Purchase / cash-advance interest charges.' },
  { key: 'payment',  label: 'Card payments', icon: CreditCard,    tone: 'gray',    desc: 'Payments made TO your credit card.' },
]

function rowSectionKey(t) {
  if (t.is_payment)  return 'payment'
  if (t.is_fee)      return 'fee'
  if (t.is_interest) return 'interest'
  if (t.is_refund)   return 'refund'
  return 'purchase'
}

const TONE = {
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-100',    icon: 'text-rose-600',    chip: 'bg-rose-100 text-rose-700'        },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-100', icon: 'text-emerald-600', chip: 'bg-emerald-100 text-emerald-800'  },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-800',   ring: 'ring-amber-100',   icon: 'text-amber-600',   chip: 'bg-amber-100 text-amber-800'      },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-800',  ring: 'ring-orange-100',  icon: 'text-orange-600',  chip: 'bg-orange-100 text-orange-800'    },
  gray:    { bg: 'bg-gray-50',    text: 'text-gray-700',    ring: 'ring-gray-200',    icon: 'text-gray-500',    chip: 'bg-gray-100 text-gray-700'        },
}

export default function StatementsPage() {
  const confirm = useConfirm()
  const [file, setFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [collapsed, setCollapsed] = useState(() => new Set())
  // Mark every imported row as a business expense. Each row can be overridden
  // individually after this toggle is set.
  const [businessAll, setBusinessAll] = useState(false)

  const onDrop = useCallback(async (files) => {
    const f = files?.[0]
    if (!f) return
    setFile(f); setParsed(null); setParsing(true)
    try {
      const fd = new FormData(); fd.append('file', f)
      const res = await fetch('/api/parse-statement', { method: 'POST', body: fd })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error('Server returned non-JSON') }
      if (!res.ok) throw new Error(data.error || 'Parse failed')
      setParsed(data)
      toast.success(`Found ${data.transactions?.length || 0} transactions`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setParsing(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: false,
  })

  // If the Bank page (or any other entry point) dropped a file into the store,
  // pick it up on mount and start parsing immediately.
  const pendingFile = useStore(s => s.pendingStatementFile)
  const setPendingFile = useStore(s => s.setPendingStatementFile)
  useEffect(() => {
    if (pendingFile) {
      const f = pendingFile
      setPendingFile(null)
      onDrop([f])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function patchRow(idx, patch) {
    setParsed(p => p && ({
      ...p,
      transactions: p.transactions.map((t, i) => i === idx ? { ...t, ...patch } : t),
    }))
  }
  function toggleRow(idx) { patchRow(idx, { _import: !parsed.transactions[idx]._import }) }
  function toggleBusinessRow(idx) {
    const t = parsed.transactions[idx]
    const current = (typeof t._business === 'boolean') ? t._business : businessAll
    patchRow(idx, { _business: !current })
  }
  function toggleBusinessAll() {
    const next = !businessAll
    setBusinessAll(next)
    // Apply to every row but keep any explicit per-row override the user set
    setParsed(p => p && ({
      ...p,
      transactions: p.transactions.map(t => ({ ...t, _business: next })),
    }))
  }
  function setSection(sectionKey, val) {
    setParsed(p => p && ({
      ...p,
      transactions: p.transactions.map(t => rowSectionKey(t) === sectionKey ? { ...t, _import: val } : t),
    }))
  }
  function toggleCollapse(key) {
    setCollapsed(prev => {
      const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n
    })
  }

  // Group + totals
  const grouped = useMemo(() => {
    const out = Object.fromEntries(SECTIONS.map(s => [s.key, []]))
    if (!parsed?.transactions) return out
    parsed.transactions.forEach((t, i) => { out[rowSectionKey(t)].push({ ...t, _i: i }) })
    return out
  }, [parsed])

  const totals = parsed?.totals || {}
  const selectedCount = useMemo(
    () => (parsed?.transactions || []).filter(t => t._import).length,
    [parsed]
  )

  // Category breakdown of selected spending rows (Spending + Refunds net)
  const categoryBreakdown = useMemo(() => {
    if (!parsed?.transactions) return []
    const m = new Map()
    for (const t of parsed.transactions) {
      if (t.is_fee || t.is_interest || t.is_payment) continue
      const slug = t.category || 'misc'
      if (!m.has(slug)) m.set(slug, { slug, net: 0, count: 0 })
      const e = m.get(slug)
      e.net += t.amount
      e.count += 1
    }
    return [...m.values()]
      .map(e => ({ ...e, meta: CATEGORY_BY_SLUG[e.slug] || CATEGORY_BY_SLUG['misc'] }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
  }, [parsed])

  async function handleReplaceExisting() {
    const dup = parsed?.duplicate_of
    if (!dup?.id) return
    if (!(await confirm({
      title: 'Replace the existing statement?',
      body: `Delete the previously uploaded statement (${dup.period_start} → ${dup.period_end}) and re-import?\n\nThis removes its bank_fees and bank_transactions. Receipts that came from it stay.`,
      confirmText: 'Replace',
      danger: true,
    }))) return
    try {
      const sb = createClient()
      const { error } = await sb.from('bank_statements').delete().eq('id', dup.id)
      if (error) throw error
      // Clear the warning + proceed with the import. Use force just in case
      // another duplicate slipped in between the parse and now.
      setParsed(p => p && ({ ...p, duplicate_of: null }))
      toast.success('Old statement removed — importing fresh copy…')
      await handleImport({ force: true })
    } catch (e) {
      toast.error(`Replace failed: ${e.message}`)
    }
  }

  async function handleImport({ force = false } = {}) {
    if (!parsed) return
    setImporting(true)
    try {
      const res = await fetch('/api/parse-statement/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issuer:           parsed.issuer,
          account_last4:    parsed.account_last4,
          file_name:        parsed.file_name,
          statement_kind:   parsed.statement_kind,
          period_start:     parsed.period_start,
          period_end:       parsed.period_end,
          totals:           parsed.totals,
          finance:          parsed.finance,
          business_default: businessAll,
          force,
          // Send EVERY row (including de-selected ones) so the server can
          // persist fees + interest into bank_fees regardless of opt-in.
          // The server filters by `_import` for receipts insertion.
          transactions: parsed.transactions.map(t => ({
            ...t,
            business: (typeof t._business === 'boolean') ? t._business : businessAll,
          })),
        }),
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error('Server returned non-JSON') }
      if (res.status === 409 && data.error === 'duplicate_statement') {
        // Server caught a duplicate the client somehow missed (e.g. another tab
        // raced us). Surface it.
        toast.error(data.message || 'Duplicate statement detected', { duration: 9000 })
        setParsed(p => p && ({ ...p, duplicate_of: data.duplicate_of || p.duplicate_of }))
        return
      }
      if (!res.ok) throw new Error(data.error || 'Import failed')
      const bits = []
      bits.push(`Imported ${data.imported} receipt${data.imported === 1 ? '' : 's'}`)
      if (data.fees_logged)  bits.push(`${data.fees_logged} fee${data.fees_logged === 1 ? '' : 's'} logged`)
      if (data.transactions) bits.push(`${data.transactions} transactions saved`)
      if (data.reconciled)   bits.push(`auto-paired ${data.reconciled}`)
      toast.success(bits.join(' · '))
      // Surface warnings (usually a missing migration) so the user knows the
      // bank-ledger writes silently failed instead of guessing.
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        console.warn('[import warnings]', data.warnings)
        const missing = data.warnings.find(w =>
          /relation .* does not exist|could not find the table|column .* does not exist|could not find the .* column/i.test(w))
        if (missing) {
          toast.error(
            `Bank ledger write failed — looks like a migration is missing.\n\n${missing}\n\nRun the combined Bank SQL (migrations 017 + 018 + 019) in Supabase, then run "notify pgrst, 'reload schema';".`,
            { duration: 12000 }
          )
        } else {
          toast(`Bank ledger partial: ${data.warnings[0]}`, { icon: '⚠️', duration: 6000 })
        }
      }
      setParsed(null); setFile(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 via-lime-100 to-amber-100 shadow-sm ring-2 ring-white flex items-center justify-center">
            <GuacMascot expression="rich" size={42} />
          </div>
          <div>
            <h1 className="page-title leading-none">Crunch a Statement</h1>
            <p className="text-sm text-gray-500 mt-1">Drop a credit-card or bank statement — every transaction, every fee, sorted in one shot.</p>
          </div>
        </div>
        <Link href="/bank" className="btn-secondary text-sm">
          <Banknote size={14} /> Back to Bank
        </Link>
      </div>

      <div className="card bg-emerald-50/40 border-emerald-100">
        <div className="flex gap-3">
          <ShieldCheck className="text-emerald-700 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-emerald-900">
            <p className="font-semibold mb-1">How your statement is handled</p>
            <ul className="list-disc pl-5 space-y-1 text-emerald-800/90">
              <li>The file is sent to our AI parser, processed in memory, and not stored.</li>
              <li>Each row is auto-classified as <b>Spending</b>, <b>Refund</b>, <b>Fee</b>, <b>Interest</b>, or <b>Card payment</b>.</li>
              <li>Only the rows you confirm are written to your receipts. Fees / interest / card-payments are off by default.</li>
              <li>You can wipe imported rows any time from <span className="font-mono">Profile → Privacy &amp; Security</span>.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="card">
        <div {...getRootProps()} className={
          'border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ' +
          (isDragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/30')
        }>
          <input {...getInputProps()} />
          {parsing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
              <p className="text-sm font-medium text-gray-700">Reading your statement…</p>
            </div>
          ) : file ? (
            <div className="flex flex-col items-center gap-2">
              {file.type === 'application/pdf' ? <FileText size={32} className="text-emerald-600" /> : <ImageIcon size={32} className="text-emerald-600" />}
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-gray-400">Drop another file to replace</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={32} className="text-gray-400" />
              <p className="text-sm font-semibold text-gray-800">Drop your statement here</p>
              <p className="text-xs text-gray-500">PDF, JPG, PNG · up to 8 MB</p>
            </div>
          )}
        </div>
      </div>

      {parsed && (
        <>
          {/* Duplicate-statement warning */}
          {parsed.duplicate_of && (
            <div className="card border-amber-300 bg-gradient-to-br from-amber-50 via-amber-50/60 to-white">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={22} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-amber-900">Already uploaded</p>
                  <p className="text-sm text-amber-800 mt-0.5">
                    A statement for {parsed.account_last4 ? <span className="font-mono">••{parsed.account_last4}</span> : 'this account'}
                    {parsed.duplicate_of.period_start && parsed.duplicate_of.period_end && (
                      <> covering <span className="font-semibold">{parsed.duplicate_of.period_start} → {parsed.duplicate_of.period_end}</span></>
                    )} was uploaded on <span className="font-semibold">{parsed.duplicate_of.uploaded_at?.slice(0,10)}</span>.
                    {parsed.duplicate_of.imported_count ? ` It produced ${parsed.duplicate_of.imported_count} receipt${parsed.duplicate_of.imported_count === 1 ? '' : 's'}.` : ''}
                  </p>
                  <p className="text-xs text-amber-700 mt-2">Pick one:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      onClick={handleReplaceExisting}
                      disabled={importing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                      title="Delete the previously uploaded statement + its bank_fees/bank_transactions, then import this one. Existing receipts from that import are preserved."
                    >
                      Replace existing
                    </button>
                    <button
                      onClick={() => handleImport({ force: true })}
                      disabled={importing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-amber-800 border border-amber-300 hover:bg-amber-50 disabled:opacity-50 transition-colors"
                      title="Import anyway — you'll end up with two copies of this statement"
                    >
                      Import anyway
                    </button>
                    <Link
                      href={`/bank`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                    >
                      View existing in Bank
                    </Link>
                    <button
                      onClick={() => { setParsed(null); setFile(null) }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header strip */}
          <div className="card flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-lg">{parsed.issuer || 'Statement'}</h3>
              <p className="text-xs text-gray-500">
                {parsed.account_last4 ? `••${parsed.account_last4}` : ''}
                {parsed.period_start && parsed.period_end ? ` · ${parsed.period_start} → ${parsed.period_end}` : ''}
                {' · '}{parsed.transactions.length} rows · {selectedCount} selected
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={toggleBusinessAll}
                className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
                  businessAll
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                    : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                }`}
                title="Tag every imported row as a business expense"
              >
                <Briefcase size={14} />
                {businessAll ? 'Business expense' : 'Mark as business'}
              </button>
              <button
                className="btn-primary text-sm"
                onClick={() => handleImport()}
                disabled={importing || selectedCount === 0 || !!parsed.duplicate_of}
                title={parsed.duplicate_of ? 'Resolve the duplicate warning above first' : ''}
              >
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Import {selectedCount}
              </button>
            </div>
          </div>

          {/* Totals cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <TotalCard label="Purchases"     value={totals.purchases}     tone="rose"    icon={ShoppingBag} />
            <TotalCard label="Refunds"       value={totals.refunds}       tone="emerald" icon={Undo2} />
            <TotalCard label="Fees"          value={totals.fees}          tone="amber"   icon={AlertTriangle} />
            <TotalCard label="Interest"      value={totals.interest}      tone="orange"  icon={Percent} />
            <TotalCard label="Card payments" value={totals.payments}      tone="gray"    icon={CreditCard} />
          </div>

          {/* Category breakdown */}
          {categoryBreakdown.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Spending by category (this statement)</h3>
              <div className="flex flex-wrap gap-2">
                {categoryBreakdown.map(c => (
                  <span key={c.slug} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 border border-gray-200">
                    <span>{c.meta.emoji}</span>
                    <span>{c.meta.label}</span>
                    <span className={c.net < 0 ? 'text-emerald-700' : 'text-gray-700'}>${Math.abs(c.net).toFixed(2)}</span>
                    <span className="text-gray-400 text-[10px]">{c.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sections */}
          {SECTIONS.map(section => {
            const rows = grouped[section.key]
            if (rows.length === 0) return null
            const isCollapsed = collapsed.has(section.key)
            const Icon = section.icon
            const tone = TONE[section.tone]
            const selected = rows.filter(r => r._import).length
            const sum = rows.reduce((n, r) => n + Math.abs(r.amount), 0)

            return (
              <div key={section.key} className={`card ${tone.ring} ring-1`}>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 -mx-1 px-1 py-1"
                  onClick={() => toggleCollapse(section.key)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone.bg}`}>
                      <Icon size={18} className={tone.icon} />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-semibold text-gray-900">{section.label} <span className="text-gray-400 font-normal text-xs">· {rows.length} row{rows.length === 1 ? '' : 's'} · ${sum.toFixed(2)}</span></p>
                      <p className="text-[11px] text-gray-500 truncate">{section.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-semibold ${tone.text}`}>{selected}/{rows.length} selected</span>
                    {isCollapsed ? <ChevronRight size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </button>

                {!isCollapsed && (
                  <>
                    <div className="flex items-center justify-end gap-2 mt-3 mb-1">
                      <button className="btn-secondary text-xs py-1" onClick={() => setSection(section.key, true)}>Select all</button>
                      <button className="btn-secondary text-xs py-1" onClick={() => setSection(section.key, false)}>Clear</button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-[10px] text-gray-500 uppercase tracking-wide bg-gray-50">
                          <tr>
                            <th className="px-2 py-2 w-8"></th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">{section.key === 'fee' || section.key === 'interest' ? 'Fee / Charge' : 'Merchant'}</th>
                            {section.key === 'purchase' || section.key === 'refund' ? (
                              <th className="px-3 py-2 text-left">Category</th>
                            ) : (
                              <th className="px-3 py-2 text-left">Kind</th>
                            )}
                            <th className="px-2 py-2 w-10 text-center" title="Business expense">Biz</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {rows.map(t => (
                            <tr key={t._i} className={t._import ? 'bg-white' : 'bg-gray-50/40 opacity-70'}>
                              <td className="px-2 py-2 text-center">
                                <input type="checkbox" className="w-4 h-4 accent-emerald-600"
                                  checked={!!t._import} onChange={() => toggleRow(t._i)} />
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">
                                <input className="bg-transparent w-28 outline-none focus:bg-white focus:px-1 rounded"
                                  value={t.date} onChange={e => patchRow(t._i, { date: e.target.value })} />
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-900 font-medium">
                                <input className="bg-transparent w-full outline-none focus:bg-white focus:px-1 rounded"
                                  value={t.merchant} onChange={e => patchRow(t._i, { merchant: e.target.value })} />
                                {t.fee_kind && (
                                  <span className={`mr-1 inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${tone.chip}`}>{t.fee_kind}</span>
                                )}
                                {t.raw_description && t.raw_description !== t.merchant && (
                                  <p className="text-[10px] text-gray-400 truncate" title={t.raw_description}>{t.raw_description}</p>
                                )}
                              </td>
                              {section.key === 'purchase' || section.key === 'refund' ? (
                                <td className="px-3 py-2 text-xs">
                                  <select className="bg-transparent text-xs outline-none focus:bg-white rounded"
                                    value={t.category || 'misc'} onChange={e => patchRow(t._i, { category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.emoji} {c.label}</option>)}
                                  </select>
                                </td>
                              ) : (
                                <td className="px-3 py-2 text-xs text-gray-500 capitalize">{t.kind || section.key}</td>
                              )}
                              <td className="px-2 py-2 text-center">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 accent-blue-600"
                                  checked={(typeof t._business === 'boolean') ? t._business : businessAll}
                                  onChange={() => toggleBusinessRow(t._i)}
                                  title="Mark this row as a business expense"
                                />
                              </td>
                              <td className={'px-3 py-2 text-right text-xs font-mono ' + (t.amount < 0 ? 'text-emerald-700' : 'text-gray-900')}>
                                ${t.amount.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

function TotalCard({ label, value, tone, icon: Icon }) {
  const t = TONE[tone] || TONE.gray
  const display = value == null ? '—' : `$${Number(value).toFixed(2)}`
  return (
    <div className={`stat-card ${t.bg} ${t.ring} ring-1`}>
      <div className={`p-3 rounded-xl bg-white shadow-sm`}><Icon size={20} className={t.icon} /></div>
      <div>
        <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">{label}</p>
        <p className={`text-lg font-extrabold ${t.text}`}>{display}</p>
      </div>
    </div>
  )
}

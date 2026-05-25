'use client'
import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createClient } from '../../../lib/supabase/client'
import { useStore } from '../../../store'
import {
  Banknote, FileText, AlertTriangle, Percent, CreditCard, Trash2, ExternalLink, ChevronDown, ChevronRight, Sparkles, ArrowLeft, Upload, Calendar, Clock, Wand2, Loader2, RefreshCw
} from 'lucide-react'
import GuacMascot from '../../../components/GuacMascot'
import { bankAccountTotals, PERIODS } from '../../../lib/financeInsights'
const FEE_KIND_TONE = {
  interest: 'bg-orange-100 text-orange-800 border-orange-200',
  fee:      'bg-amber-100 text-amber-800 border-amber-200',
  penalty:  'bg-rose-100 text-rose-700 border-rose-200',
}

const KIND_STYLE = {
  purchase:   { label: 'Purchase',   cls: 'bg-rose-50 text-rose-700 border-rose-100' },
  refund:     { label: 'Refund',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  fee:        { label: 'Fee',        cls: 'bg-amber-50 text-amber-800 border-amber-100' },
  interest:   { label: 'Interest',   cls: 'bg-orange-50 text-orange-800 border-orange-100' },
  payment:    { label: 'Payment',    cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  deposit:    { label: 'Deposit',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  withdrawal: { label: 'Withdrawal', cls: 'bg-rose-50 text-rose-700 border-rose-100' },
  transfer:   { label: 'Transfer',   cls: 'bg-sky-50 text-sky-700 border-sky-100' },
  other:      { label: 'Other',      cls: 'bg-gray-100 text-gray-700 border-gray-200' },
}

// View states: 'banks' (default), 'statements' (one bank picked), 'transactions' (one statement picked)
export default function BankPage() {
  const sb = createClient()
  const qc = useQueryClient()
  const router = useRouter()
  const setPendingFile = useStore(s => s.setPendingStatementFile)
  const [view, setView] = useState('banks')
  const [pickedIssuer, setPickedIssuer] = useState(null)
  const [pickedStatementId, setPickedStatementId] = useState(null)
  const [pageDragging, setPageDragging] = useState(false)
  // Default to "all time" so newly-uploaded statements show their totals
  // immediately. The user can switch to YTD / 30d / etc. from the chips.
  const [period, setPeriod] = useState('all')

  // Drag-anywhere: when a file is dragged over the page, show a full-page drop
  // overlay. On drop, stash the file in Zustand and route to /statements which
  // immediately starts parsing.
  function handleFileForUpload(file) {
    if (!file) return
    setPendingFile(file)
    router.push('/statements')
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => handleFileForUpload(files?.[0]),
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: false,
    noClick: false,
  })

  // Drag-anywhere overlay (matches the /receipts page pattern)
  useEffect(() => {
    let depth = 0
    const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files')
    const onEnter = (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; setPageDragging(true) }
    const onOver  = (e) => { if (!hasFiles(e)) return; e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy' }
    const onLeave = (e) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (depth === 0) setPageDragging(false) }
    const onDropWin = (e) => { if (e.dataTransfer?.files?.length) e.preventDefault(); depth = 0; setPageDragging(false) }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDropWin)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDropWin)
    }
  }, [])

  const handleOverlayDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setPageDragging(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) handleFileForUpload(f)
  }

  const { data: statements = [], isLoading: loadingS, error: errS } = useQuery({
    queryKey: ['bank_statements'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('bank_statements')
        .select('*')
        .order('period_end', { ascending: false, nullsFirst: false })
        .order('uploaded_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const { data: fees = [], error: errF } = useQuery({
    queryKey: ['bank_fees'],
    queryFn: async () => {
      const { data, error } = await sb.from('bank_fees').select('*, receipts(id, store_name)').order('date', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const { data: transactions = [], error: errT } = useQuery({
    queryKey: ['bank_transactions'],
    queryFn: async () => {
      const { data, error } = await sb.from('bank_transactions').select('*, receipts(id, store_name)').order('date', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const deleteStatement = useMutation({
    mutationFn: async (id) => {
      const { error } = await sb.from('bank_statements').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Statement removed')
      qc.invalidateQueries({ queryKey: ['bank_statements'] })
      qc.invalidateQueries({ queryKey: ['bank_fees'] })
      qc.invalidateQueries({ queryKey: ['bank_transactions'] })
    },
    onError: e => toast.error(e.message),
  })

  // ── Refresh + reconcile ──────────────────────────────────────────────
  // The "Refresh" button on the Bank page. Does four passes:
  //   1. Backfill bank_transactions from receipts for any statement missing them
  //      (same logic as repairLedger, runs first so counts are accurate).
  //   2. Recount transaction_count + fee_count + imported_count for every
  //      statement by querying the actual child tables.
  //   3. Run reconcile_all to pair statement rows with real receipts.
  //   4. Update reconciled_count per statement based on receipts.reconciled.
  // Then invalidates every bank-related query so the UI picks up changes.
  const refreshAll = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const result = { repaired: 0, statementsFixed: 0, reconciled: 0, countersUpdated: 0 }

      // ── 1. Backfill bank_transactions where missing ─────────────────
      for (const stmt of statements) {
        const { count } = await sb.from('bank_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('statement_id', stmt.id)
        if ((count ?? 0) > 0) continue
        if (!stmt.statement_import_id) continue
        const { data: rcpts } = await sb.from('receipts')
          .select('id, store_name, date, total_amount, category, business_purchase')
          .eq('statement_import_id', stmt.statement_import_id)
        if (!rcpts || rcpts.length === 0) continue
        const txns = rcpts.map((r, i) => {
          const amt = Number(r.total_amount || 0)
          const looksFee     = /^\[Fee\]|^\[Annual fee|^\[Late|^\[ATM|^\[Foreign|^\[Overdraft/i.test(r.store_name || '')
          const looksInt     = /^\[Interest\]|^\[Purchase interest|^\[Cash[- ]advance interest/i.test(r.store_name || '')
          const looksPayment = /^\[Card payment\]/i.test(r.store_name || '')
          const isRefund     = amt < 0 && !looksFee && !looksInt && !looksPayment
          const kind = looksPayment ? 'payment'
                     : looksFee     ? 'fee'
                     : looksInt     ? 'interest'
                     : isRefund     ? 'refund'
                     : amt < 0      ? 'deposit'
                     : 'purchase'
          return {
            user_id:     user.id,
            statement_id: stmt.id,
            receipt_id:  r.id,
            position:    i,
            date:        r.date,
            merchant:    (r.store_name || '').slice(0, 200) || 'Unknown',
            amount:      amt,
            category:    (looksFee || looksInt || looksPayment) ? null : (r.category || 'misc'),
            kind,
            is_payment:  looksPayment,
            is_fee:      looksFee,
            is_interest: looksInt,
            is_refund:   isRefund,
            imported:    true,
            business:    Boolean(r.business_purchase),
          }
        })
        const { error: insErr } = await sb.from('bank_transactions').insert(txns)
        if (insErr) throw new Error(`Backfill failed for ${stmt.id.slice(0,8)}: ${insErr.message}`)
        result.repaired += txns.length
      }

      // ── 2. Recount counters per statement from actual rows ──────────
      for (const stmt of statements) {
        const [{ count: txCount }, { count: feeCount }, { count: impCount }] = await Promise.all([
          sb.from('bank_transactions').select('id', { count: 'exact', head: true }).eq('statement_id', stmt.id),
          sb.from('bank_fees').select('id', { count: 'exact', head: true }).eq('statement_id', stmt.id),
          sb.from('receipts').select('id', { count: 'exact', head: true }).eq('statement_import_id', stmt.statement_import_id || '00000000-0000-0000-0000-000000000000'),
        ])
        const t = txCount ?? 0, f = feeCount ?? 0, i = impCount ?? 0
        const needsUpdate =
          (stmt.transaction_count ?? 0) !== t ||
          (stmt.fee_count ?? 0)         !== f ||
          (stmt.imported_count ?? 0)    !== i
        if (needsUpdate) {
          await sb.from('bank_statements').update({
            transaction_count: t,
            fee_count:         f,
            imported_count:    i,
          }).eq('id', stmt.id)
          result.countersUpdated++
        }
      }

      // ── 3. Re-run global reconcile ──────────────────────────────────
      try {
        const { data: paired, error: rxErr } = await sb.rpc('reconcile_all')
        if (rxErr) console.warn('[refresh] reconcile_all failed:', rxErr.message)
        else result.reconciled = Number(paired || 0)
      } catch (e) {
        console.warn('[refresh] reconcile_all threw:', e.message)
      }

      // ── 4. Sync reconciled_count per statement ──────────────────────
      for (const stmt of statements) {
        if (!stmt.statement_import_id) continue
        const { count: rxCount } = await sb.from('receipts')
          .select('id', { count: 'exact', head: true })
          .eq('statement_import_id', stmt.statement_import_id)
          .eq('reconciled', true)
        if ((rxCount ?? 0) !== (stmt.reconciled_count ?? 0)) {
          await sb.from('bank_statements').update({
            reconciled_count: rxCount ?? 0,
          }).eq('id', stmt.id)
        }
      }

      result.statementsFixed = statements.length
      return result
    },
    onSuccess: (r) => {
      const bits = []
      bits.push(`Checked ${r.statementsFixed} statement${r.statementsFixed === 1 ? '' : 's'}`)
      if (r.repaired > 0)        bits.push(`${r.repaired} transactions backfilled`)
      if (r.countersUpdated > 0) bits.push(`${r.countersUpdated} counter${r.countersUpdated === 1 ? '' : 's'} corrected`)
      if (r.reconciled > 0)      bits.push(`${r.reconciled} new pair${r.reconciled === 1 ? '' : 's'} reconciled`)
      const allClean = r.repaired === 0 && r.countersUpdated === 0 && r.reconciled === 0
      if (allClean) toast.success(`Everything's in sync · ${r.statementsFixed} statement${r.statementsFixed === 1 ? '' : 's'}`, { icon: '✓' })
      else          toast.success(bits.join(' · '))
      qc.invalidateQueries({ queryKey: ['bank_statements'] })
      qc.invalidateQueries({ queryKey: ['bank_fees'] })
      qc.invalidateQueries({ queryKey: ['bank_transactions'] })
      qc.invalidateQueries({ queryKey: ['receipts'] })
    },
    onError: e => toast.error(`Refresh failed: ${e.message}`),
  })

  // ── Ledger repair ────────────────────────────────────────────────────
  // If statements exist but bank_transactions is empty (statement was uploaded
  // before migration 018 ran, or the insert failed mid-import), backfill the
  // ledger from receipts that share the statement_import_id. Idempotent: skips
  // statements that already have transactions.
  const repairLedger = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Not signed in')
      let filled = 0
      let skipped = 0
      for (const stmt of statements) {
        // Already has transactions? skip.
        const { count } = await sb.from('bank_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('statement_id', stmt.id)
        if ((count ?? 0) > 0) { skipped++; continue }

        if (!stmt.statement_import_id) continue
        const { data: rcpts } = await sb.from('receipts')
          .select('id, store_name, date, total_amount, category, business_purchase')
          .eq('statement_import_id', stmt.statement_import_id)
        if (!rcpts || rcpts.length === 0) continue

        const txns = rcpts.map((r, i) => {
          const amt = Number(r.total_amount || 0)
          const looksFee     = /^\[Fee\]|^\[Annual fee|^\[Late|^\[ATM|^\[Foreign|^\[Overdraft/i.test(r.store_name || '')
          const looksInt     = /^\[Interest\]|^\[Purchase interest|^\[Cash[- ]advance interest/i.test(r.store_name || '')
          const looksPayment = /^\[Card payment\]/i.test(r.store_name || '')
          const isRefund     = amt < 0 && !looksFee && !looksInt && !looksPayment
          const kind = looksPayment ? 'payment'
                     : looksFee     ? 'fee'
                     : looksInt     ? 'interest'
                     : isRefund     ? 'refund'
                     : amt < 0      ? 'deposit'
                     : 'purchase'
          return {
            user_id:     user.id,
            statement_id: stmt.id,
            receipt_id:  r.id,
            position:    i,
            date:        r.date,
            merchant:    (r.store_name || '').slice(0, 200) || 'Unknown',
            amount:      amt,
            category:    (looksFee || looksInt || looksPayment) ? null : (r.category || 'misc'),
            kind,
            is_payment:  looksPayment,
            is_fee:      looksFee,
            is_interest: looksInt,
            is_refund:   isRefund,
            imported:    true,
            business:    Boolean(r.business_purchase),
          }
        })

        const { error: insErr } = await sb.from('bank_transactions').insert(txns)
        if (insErr) throw new Error(`Statement ${stmt.id.slice(0,8)}: ${insErr.message}`)

        // Update counters on the parent statement
        await sb.from('bank_statements').update({
          transaction_count: txns.length,
          imported_count:    Math.max(stmt.imported_count || 0, txns.length),
        }).eq('id', stmt.id)

        filled += txns.length
      }
      return { filled, skipped }
    },
    onSuccess: ({ filled, skipped }) => {
      if (filled > 0) toast.success(`Repaired — ${filled} transactions backfilled from receipts.`)
      else if (skipped > 0) toast(`All ${skipped} statement${skipped === 1 ? '' : 's'} already had transactions. Nothing to repair.`, { icon: '✓' })
      else toast('No receipts found for any uploaded statement. Try re-uploading.', { icon: 'ℹ️' })
      qc.invalidateQueries({ queryKey: ['bank_transactions'] })
      qc.invalidateQueries({ queryKey: ['bank_statements'] })
    },
    onError: e => toast.error(`Repair failed: ${e.message}`),
  })

  // ── Group statements by BANK ACCOUNT, period-aware ────────────────────
  // Uses the shared engine in lib/financeInsights so /bank and /guacwizard
  // always agree on the per-account totals. Account number is the strong
  // de-dupe key; statements typed with different issuer names collapse into
  // one bank when last4 matches.
  const banks = useMemo(() => {
    const acct = bankAccountTotals({ statements, fees, transactions }, period)
    const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const aliasMap = new Map()
    const stmtsMap = new Map()
    for (const s of statements) {
      const k = s.account_last4 ? `acct:${s.account_last4}` : `issuer:${normalize(s.issuer) || 'unknown'}`
      if (!aliasMap.has(k)) aliasMap.set(k, new Set())
      if (s.issuer) aliasMap.get(k).add(s.issuer)
      if (!stmtsMap.has(k)) stmtsMap.set(k, [])
      stmtsMap.get(k).push(s)
    }
    return acct.map(a => ({
      ...a,
      issuerAliases: [...(aliasMap.get(a.key) || [])],
      statements: stmtsMap.get(a.key) || [],
      latestPeriod: a.latestPeriodEnd,
    }))
  }, [statements, fees, transactions, period])

  const pickedBank = useMemo(
    () => banks.find(b => b.key === pickedIssuer) || null,
    [banks, pickedIssuer]
  )
  const pickedStatement = useMemo(
    () => statements.find(s => s.id === pickedStatementId) || null,
    [statements, pickedStatementId]
  )

  // Header CTA — catchy "Crunch a Statement"
  function HeaderCTA() {
    return (
      <Link
        href="/statements"
        className="group inline-flex items-center gap-2 h-11 pl-3 pr-5 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-lime-500 text-white font-bold text-sm shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-all"
        title="Upload a credit-card or bank statement"
      >
        <GuacMascot expression="rich" size={28} />
        <span>Crunch a Statement</span>
      </Link>
    )
  }

  const overallTotals = useMemo(() => {
    return {
      banks:      banks.length,
      statements: statements.length,
      fees:       banks.reduce((n, b) => n + b.totalFees + b.totalInterest, 0),
      transactions: transactions.length,
    }
  }, [banks, statements, transactions])

  // ── Error state: surface a clear "run the migration" message ───────────
  if (errS) {
    return (
      <div className="space-y-5 max-w-3xl">
        <PageHeader title="Bank" subtitle="Statements, fees, and transactions." cta={<HeaderCTA />} />
        <div className="card border-rose-200 bg-rose-50/40">
          <p className="font-semibold text-rose-900 flex items-center gap-2"><AlertTriangle size={16} /> Bank tables not ready</p>
          <p className="text-sm text-rose-800 mt-2 font-mono break-words">{errS.message}</p>
          <div className="text-xs text-rose-700 mt-3 space-y-1">
            <p>Open Supabase → SQL editor and run the combined Bank SQL (migrations <strong>017 + 018 + 019</strong>).</p>
            <p>Then run: <code className="font-mono px-1.5 py-0.5 rounded bg-white">notify pgrst, 'reload schema';</code></p>
            <p className="text-rose-600">If you already ran it and still see this, the PostgREST schema cache may be stale — wait ~10 seconds then hard-refresh (Ctrl+Shift+R). If it persists, the simplest fix is to restart the project in the Supabase dashboard.</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Drill: Statement transactions view ─────────────────────────────────
  if (view === 'transactions' && pickedStatement) {
    const stmtTx = transactions.filter(t => t.statement_id === pickedStatement.id)
    const stmtFees = fees.filter(f => f.statement_id === pickedStatement.id)
    return (
      <div className="space-y-5 max-w-7xl">
        <Breadcrumb
          onBank={() => { setView('banks'); setPickedIssuer(null); setPickedStatementId(null) }}
          onIssuer={() => { setView('statements'); setPickedStatementId(null) }}
          issuer={pickedStatement.issuer}
          leaf={`${pickedStatement.period_start || ''} → ${pickedStatement.period_end || ''}`}
        />
        <StatementDetail statement={pickedStatement} fees={stmtFees} transactions={stmtTx} />
      </div>
    )
  }

  // ── Drill: One bank's statements (+ combined transactions view) ─────────
  if (view === 'statements' && pickedBank) {
    const stmtIds = new Set(pickedBank.statements.map(s => s.id))
    const combinedTx   = transactions.filter(t => stmtIds.has(t.statement_id))
    const combinedFees = fees.filter(f => stmtIds.has(f.statement_id))
    return (
      <div className="space-y-5 max-w-7xl">
        <Breadcrumb
          onBank={() => { setView('banks'); setPickedIssuer(null) }}
          issuer={`${pickedBank.issuer}${pickedBank.account_last4 ? ` ••${pickedBank.account_last4}` : ''}`}
        />

        <div className="card flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 via-sky-100 to-emerald-100 shadow-sm ring-2 ring-white flex items-center justify-center">
              <Banknote size={28} className="text-indigo-700" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 leading-none flex items-center gap-2">
                {pickedBank.issuer}
                {pickedBank.account_last4 && (
                  <span className="font-mono text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">
                    ••{pickedBank.account_last4}
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {pickedBank.statements.length} statement{pickedBank.statements.length === 1 ? '' : 's'} · {combinedTx.length} transactions combined
                {pickedBank.totalFees > 0 && ` · $${pickedBank.totalFees.toFixed(2)} in fees`}
                {pickedBank.totalInterest > 0 && ` · $${pickedBank.totalInterest.toFixed(2)} interest`}
              </p>
              {pickedBank.issuerAliases.length > 1 && (
                <p className="text-[11px] text-amber-700 mt-1" title={pickedBank.issuerAliases.join(' · ')}>
                  Merged from {pickedBank.issuerAliases.length} issuer name variants: {pickedBank.issuerAliases.join(' · ')}
                </p>
              )}
            </div>
          </div>
          <HeaderCTA />
        </div>

        {/* Combined transactions across every statement for this account */}
        {combinedTx.length > 0 && (
          <details className="card group" open>
            <summary className="cursor-pointer flex items-center justify-between gap-2 list-none">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-600" />
                <h3 className="font-semibold text-gray-900 text-sm">All transactions across this account</h3>
                <span className="text-[11px] text-gray-400">· {combinedTx.length} rows from {pickedBank.statements.length} statement{pickedBank.statements.length === 1 ? '' : 's'}</span>
              </div>
              <ChevronDown size={14} className="text-gray-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-3">
              <CombinedTransactionTable transactions={combinedTx} statements={pickedBank.statements} />
            </div>
          </details>
        )}

        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Statements for {pickedBank.issuer}</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left">Period</th>
                <th className="px-3 py-2 text-left">Account</th>
                <th className="px-3 py-2 text-right">Rows / Imported</th>
                <th className="px-3 py-2 text-right">Fees</th>
                <th className="px-3 py-2 text-right">Paired</th>
                <th className="px-3 py-2 text-right">Uploaded</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pickedBank.statements.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/60 cursor-pointer"
                  onClick={() => { setPickedStatementId(s.id); setView('transactions') }}>
                  <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {s.period_start && s.period_end ? `${s.period_start} → ${s.period_end}` : '—'}
                    {s.statement_kind && <span className="ml-2 text-[10px] text-gray-400">{s.statement_kind}</span>}
                    {s.minimum_payment_due != null && s.payment_due_date && (() => {
                      const d = daysUntil(s.payment_due_date)
                      const tone = d == null ? 'gray' : d < 0 ? 'rose' : d <= 7 ? 'amber' : 'emerald'
                      const cls = { rose: 'bg-rose-100 text-rose-700', amber: 'bg-amber-100 text-amber-800', emerald: 'bg-emerald-100 text-emerald-800', gray: 'bg-gray-100 text-gray-600' }[tone]
                      return (
                        <div className={`inline-block mt-1 ml-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
                          ${Number(s.minimum_payment_due).toFixed(2)} due {s.payment_due_date}
                          {d != null && d < 0 ? ` · ${-d}d late` : d != null && d <= 7 ? ` · ${d}d` : ''}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-3 py-3 text-xs font-mono text-gray-600">{s.account_last4 ? `••${s.account_last4}` : '—'}</td>
                  <td className="px-3 py-3 text-right text-xs">{s.imported_count}/{s.transaction_count || s.row_count}</td>
                  <td className="px-3 py-3 text-right text-xs">
                    {s.fee_count > 0
                      ? <span className="font-semibold text-amber-700">{s.fee_count}</span>
                      : <span className="text-gray-300">0</span>}
                  </td>
                  <td className="px-3 py-3 text-right text-xs">
                    {s.reconciled_count > 0
                      ? <span className="font-semibold text-emerald-700">{s.reconciled_count}</span>
                      : <span className="text-gray-300">0</span>}
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-gray-500">{new Date(s.uploaded_at).toLocaleDateString()}</td>
                  <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { if (confirm('Remove this statement + its fee log? (Receipts stay.)')) deleteStatement.mutate(s.id) }}
                      className="text-gray-300 hover:text-rose-500 transition-colors"
                      title="Remove statement + fee log"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Default: list of banks ─────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl">
      {/* Drag-anywhere overlay */}
      {pageDragging && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-500/20 backdrop-blur-sm"
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
          onDrop={handleOverlayDrop}
        >
          <div className="rounded-2xl border-4 border-dashed border-emerald-500 bg-white/95 px-10 py-8 flex flex-col items-center gap-3 shadow-2xl pointer-events-none">
            <GuacMascot expression="rich" size={64} />
            <p className="text-xl font-semibold text-emerald-800">Drop to crunch this statement</p>
            <p className="text-sm text-gray-500">PDF or image — we&apos;ll parse every transaction</p>
          </div>
        </div>
      )}

      <PageHeader
        title="Bank"
        subtitle="Every statement you uploaded, every fee they charged you."
        cta={<HeaderCTA />}
      />

      {/* Big drop card — always visible so users see it without dragging */}
      <div {...getRootProps()} className={
        'card border-2 border-dashed text-center cursor-pointer transition-all py-5 ' +
        (isDragActive ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/40')
      }>
        <input {...getInputProps()} />
        <div className="flex items-center justify-center gap-3">
          <GuacMascot expression="thumbsup" size={32} />
          <div className="text-left">
            <p className="font-bold text-emerald-900">Drop a statement here, or click to pick a file</p>
            <p className="text-[11px] text-gray-500">PDF or image · drag it from any screen · you can also paste with Ctrl+V on the next page</p>
          </div>
        </div>
      </div>

      {/* Empty-ledger diagnostic — tells the user WHY totals are zero */}
      {statements.length > 0 && (errT || errF || (transactions.length === 0 && fees.length === 0)) && (
        <div className="card border-amber-300 bg-amber-50/40">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-amber-900 flex-1">
              <p className="font-bold">Statements found, but no transactions or fees recorded</p>
              <p className="mt-1 text-amber-800">
                {statements.length} statement{statements.length === 1 ? ' is' : 's are'} in the Bank table, but{' '}
                <span className="font-mono">bank_transactions</span> and <span className="font-mono">bank_fees</span> are empty — so the per-card totals can&apos;t be computed.
              </p>
              {(errT || errF) && (
                <p className="mt-2 text-xs bg-white rounded-lg p-2 font-mono break-words text-rose-700">
                  {errT?.message || errF?.message}
                </p>
              )}
              <p className="mt-2 text-xs text-amber-800">
                Most likely the statement was uploaded before <strong>migration 018</strong> finished, so the import skipped <span className="font-mono">bank_transactions</span>. Two ways to fix:
              </p>
              <ul className="mt-1 ml-4 text-xs text-amber-800 list-disc">
                <li>Click <strong>Repair from receipts</strong> below — backfills the ledger from receipts already imported.</li>
                <li>Or, re-upload the statement and pick <strong>Replace existing</strong> on the duplicate warning.</li>
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => repairLedger.mutate()}
                  disabled={repairLedger.isPending}
                  className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {repairLedger.isPending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Repair from receipts
                </button>
                <Link href="/statements" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-800 hover:bg-amber-50 transition-colors">
                  Re-upload statement
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Period selector — drives all per-card totals below */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1 flex-wrap">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p.key ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => refreshAll.mutate()}
            disabled={refreshAll.isPending || statements.length === 0}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-white border border-emerald-200 text-emerald-800 font-bold text-xs shadow-sm hover:bg-emerald-50 disabled:opacity-50 transition-all"
            title="Re-sync counters from actual rows, backfill missing transactions, and re-run reconcile"
          >
            {refreshAll.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <RefreshCw size={14} />}
            Refresh
          </button>
          <Link
            href="/guacwizard"
            className="inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-bold text-xs shadow hover:shadow-lg transition-all"
            title="Open GuacWizard for behavioral insights"
          >
            <Wand2 size={14} /> Ask the Wizard
          </Link>
        </div>
      </div>

      {/* Overall stat strip — totals across all cards for the chosen period */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Banknote}        tone="indigo"  label="Banks"        value={overallTotals.banks} raw />
        <Stat icon={FileText}        tone="sky"     label="Statements"   value={overallTotals.statements} raw />
        <Stat icon={AlertTriangle}   tone="amber"   label="Fees + Interest" value={overallTotals.fees} />
        <Stat icon={CreditCard}      tone="emerald" label="Transactions" value={overallTotals.transactions} raw />
      </div>

      {loadingS ? (
        <div className="card py-12 text-center text-gray-400 text-sm">Loading…</div>
      ) : banks.length === 0 ? (
        <div className="card py-14 text-center space-y-3">
          <GuacMascot expression="sitting" size={64} />
          <p className="text-gray-700 font-semibold">No statements yet</p>
          <p className="text-sm text-gray-500">Drop a credit-card or bank statement and we&apos;ll do the rest.</p>
          <HeaderCTA />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map(b => (
            <button
              key={b.key}
              type="button"
              onClick={() => { setPickedIssuer(b.key); setView('statements') }}
              className="card text-left hover:shadow-lg hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 via-sky-100 to-emerald-100 ring-1 ring-white flex items-center justify-center shrink-0">
                    <Banknote size={26} className="text-indigo-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 truncate flex items-center gap-2">
                      <span className="truncate">{b.issuer}</span>
                      {b.account_last4 && (
                        <span className="font-mono text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5 shrink-0">
                          ••{b.account_last4}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {b.statements.length} statement{b.statements.length === 1 ? '' : 's'} · latest {b.latestPeriod || '—'}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider mt-0.5">
                      {(PERIODS.find(p => p.key === period) || PERIODS[3]).label}
                    </p>
                    {b.issuerAliases.length > 1 && (
                      <p className="text-[10px] text-gray-400 italic mt-0.5 truncate" title={b.issuerAliases.join(' · ')}>
                        merged: {b.issuerAliases.join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-emerald-600 transition-colors shrink-0" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-rose-50 border border-rose-100 px-2 py-1.5">
                  <p className="text-[9px] uppercase tracking-wider text-rose-600 font-semibold">Purchases</p>
                  <p className="font-bold text-rose-700">${b.totalPurchases.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-sky-50 border border-sky-100 px-2 py-1.5">
                  <p className="text-[9px] uppercase tracking-wider text-sky-700 font-semibold">Payments made</p>
                  <p className="font-bold text-sky-800">${b.totalPayments.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-2 py-1.5">
                  <p className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold">Fees paid</p>
                  <p className="font-bold text-amber-800">${b.totalFees.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-orange-50 border border-orange-100 px-2 py-1.5">
                  <p className="text-[9px] uppercase tracking-wider text-orange-700 font-semibold">Interest paid</p>
                  <p className="font-bold text-orange-800">${b.totalInterest.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-1.5 col-span-2">
                  <p className="text-[9px] uppercase tracking-wider text-emerald-600 font-semibold">Refunds</p>
                  <p className="font-bold text-emerald-700">${b.totalRefunds.toFixed(2)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PageHeader({ title, subtitle, cta }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 via-sky-100 to-emerald-100 shadow-sm ring-2 ring-white flex items-center justify-center">
          <GuacMascot expression="rich" size={32} />
        </div>
        <div>
          <h1 className="page-title leading-none">{title}</h1>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
      </div>
      {cta}
    </div>
  )
}

function Breadcrumb({ onBank, onIssuer, issuer, leaf }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
      <button onClick={onBank} className="inline-flex items-center gap-1 hover:text-emerald-700 font-medium">
        <ArrowLeft size={14} /> Banks
      </button>
      {issuer && (
        <>
          <ChevronRight size={12} className="text-gray-300" />
          {onIssuer ? (
            <button onClick={onIssuer} className="hover:text-emerald-700 font-medium">{issuer}</button>
          ) : (
            <span className="font-semibold text-gray-700">{issuer}</span>
          )}
        </>
      )}
      {leaf && (
        <>
          <ChevronRight size={12} className="text-gray-300" />
          <span className="font-semibold text-gray-700">{leaf}</span>
        </>
      )}
    </div>
  )
}

function payoffMonthsLabel(m) {
  if (m == null) return '∞ (never with minimum)'
  if (m < 12) return `${m} mo`
  const y = Math.floor(m / 12); const r = m % 12
  return r === 0 ? `${y} yr` : `${y} yr ${r} mo`
}
function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr); due.setHours(0, 0, 0, 0)
  return Math.round((due - today) / 86400000)
}

function FinanceSummary({ statement: s }) {
  const hasAny = s.minimum_payment_due != null || s.payment_due_date || s.new_balance != null ||
    s.purchase_apr != null || s.balance_transfer_apr != null || s.cash_advance_apr != null
  if (!hasAny) return null

  const dDays = daysUntil(s.payment_due_date)
  const dueTone =
    dDays == null ? 'gray' :
    dDays < 0   ? 'rose' :
    dDays <= 3  ? 'rose' :
    dDays <= 7  ? 'amber' :
    'emerald'
  const DUE_TONE = {
    rose:    'bg-rose-50 text-rose-800 border-rose-200',
    amber:   'bg-amber-50 text-amber-800 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    gray:    'bg-gray-50 text-gray-700 border-gray-200',
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard size={16} className="text-indigo-600" />
        <h3 className="font-semibold text-gray-900 text-sm">Payment summary</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {s.minimum_payment_due != null && (
          <FinanceCell label="Minimum due" value={`$${Number(s.minimum_payment_due).toFixed(2)}`} accent="rose" emoji="💸" />
        )}
        {s.payment_due_date && (
          <div className={`rounded-xl border px-3 py-2.5 ${DUE_TONE[dueTone]}`}>
            <p className="text-[10px] uppercase tracking-wider font-bold opacity-70 flex items-center gap-1"><Calendar size={11} /> Due date</p>
            <p className="text-sm font-bold mt-0.5">{s.payment_due_date}</p>
            <p className="text-[10px] mt-0.5">
              {dDays == null ? '' : dDays < 0 ? `${-dDays} day${-dDays === 1 ? '' : 's'} overdue` : dDays === 0 ? 'Due today' : `in ${dDays} day${dDays === 1 ? '' : 's'}`}
            </p>
          </div>
        )}
        {s.new_balance != null && (
          <FinanceCell label="Statement balance" value={`$${Number(s.new_balance).toFixed(2)}`} accent="indigo" />
        )}
        {s.previous_balance != null && (
          <FinanceCell label="Previous balance" value={`$${Number(s.previous_balance).toFixed(2)}`} accent="gray" />
        )}
        {s.credit_limit != null && (
          <FinanceCell label="Credit limit" value={`$${Number(s.credit_limit).toFixed(0)}`} accent="gray" />
        )}
        {s.available_credit != null && (
          <FinanceCell label="Available credit" value={`$${Number(s.available_credit).toFixed(0)}`} accent="emerald" />
        )}
      </div>

      {(s.purchase_apr != null || s.balance_transfer_apr != null || s.cash_advance_apr != null) && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          {s.purchase_apr != null && (
            <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold flex items-center gap-1"><Percent size={10} /> Purchase APR</p>
              <p className="font-bold text-rose-800">{Number(s.purchase_apr).toFixed(2)}%</p>
            </div>
          )}
          {s.balance_transfer_apr != null && (
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold flex items-center gap-1"><Percent size={10} /> Balance-transfer APR</p>
              <p className="font-bold text-amber-800">{Number(s.balance_transfer_apr).toFixed(2)}%</p>
            </div>
          )}
          {s.cash_advance_apr != null && (
            <div className="rounded-lg bg-orange-50 border border-orange-100 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-orange-700 font-semibold flex items-center gap-1"><Percent size={10} /> Cash-advance APR</p>
              <p className="font-bold text-orange-800">{Number(s.cash_advance_apr).toFixed(2)}%</p>
            </div>
          )}
        </div>
      )}

      {(s.new_balance != null && s.minimum_payment_due != null && s.purchase_apr != null) && (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-amber-50/40 p-3">
          <div className="flex items-start gap-3">
            <Clock size={18} className="text-emerald-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-emerald-900">Paying minimum only?</p>
              {s.payoff_months_min == null ? (
                <p className="text-sm text-rose-700 font-bold mt-0.5">Minimum doesn&apos;t even cover monthly interest — balance grows forever.</p>
              ) : (
                <p className="text-sm text-gray-700 mt-0.5">
                  <span className="font-bold text-emerald-800">{payoffMonthsLabel(s.payoff_months_min)}</span> to clear ${Number(s.new_balance).toFixed(2)}
                  {s.payoff_total_interest != null && (
                    <> · costs you <span className="font-bold text-rose-700">${Number(s.payoff_total_interest).toFixed(2)}</span> in interest</>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const FINANCE_TONE = {
  rose:    'bg-rose-50 text-rose-700 border-rose-100',
  indigo:  'bg-indigo-50 text-indigo-700 border-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  gray:    'bg-gray-50 text-gray-700 border-gray-200',
}
function FinanceCell({ label, value, accent = 'gray', emoji }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${FINANCE_TONE[accent] || FINANCE_TONE.gray}`}>
      <p className="text-[10px] uppercase tracking-wider font-bold opacity-70">{emoji ? `${emoji} ` : ''}{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  )
}

function StatementDetail({ statement, fees, transactions }) {
  const t = statement.totals || {}
  const [kindFilter, setKindFilter] = useState('all')

  // Compute the three "money the bank moved" totals from the actual rows.
  // If the AI extracted totals from the statement header, prefer those; else
  // fall back to summing the rows we parsed. Either way these are guaranteed
  // to display SOMETHING when there are transactions or fees.
  const computed = useMemo(() => {
    const sum = (arr) => arr.reduce((n, x) => n + Math.abs(Number(x.amount || 0)), 0)
    return {
      payments:  sum(transactions.filter(x => x.is_payment)),
      interest:  sum(transactions.filter(x => x.is_interest).concat(fees.filter(f => f.kind === 'interest'))),
      fees:      sum(transactions.filter(x => x.is_fee).concat(fees.filter(f => f.kind === 'fee' || f.kind === 'penalty'))),
      purchases: transactions.filter(x => x.kind === 'purchase' || (!x.is_payment && !x.is_fee && !x.is_interest && !x.is_refund && x.amount > 0)).reduce((n, x) => n + Number(x.amount || 0), 0),
      refunds:   sum(transactions.filter(x => x.is_refund || (x.amount < 0 && !x.is_payment && !x.is_fee && !x.is_interest))),
    }
  }, [transactions, fees])

  const pick = (aiVal, computedVal) =>
    (aiVal != null && Number(aiVal) > 0) ? Number(aiVal) : computedVal

  const display = {
    payments:  pick(t.payments,  computed.payments),
    interest:  pick(t.interest,  computed.interest),
    fees:      pick(t.fees,      computed.fees),
    purchases: pick(t.purchases, computed.purchases),
    refunds:   pick(t.refunds,   computed.refunds),
  }

  const counts = transactions.reduce((acc, tx) => {
    acc[tx.kind] = (acc[tx.kind] || 0) + 1
    return acc
  }, { all: transactions.length })

  const visible = kindFilter === 'all'
    ? transactions
    : transactions.filter(tx => tx.kind === kindFilter)

  return (
    <div className="space-y-4">
      <FinanceSummary statement={statement} />

      {/* What the bank moved this period — the three numbers users actually ask about */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <BigTotal
          label="Total payments made"
          value={display.payments}
          icon={CreditCard}
          tone="sky"
          sub={`${transactions.filter(x => x.is_payment).length} payment${transactions.filter(x => x.is_payment).length === 1 ? '' : 's'} this period`}
        />
        <BigTotal
          label="Total interest paid"
          value={display.interest}
          icon={Percent}
          tone="orange"
          sub={statement.purchase_apr != null ? `Purchase APR ${Number(statement.purchase_apr).toFixed(2)}%` : null}
        />
        <BigTotal
          label="Total fees paid"
          value={display.fees}
          icon={AlertTriangle}
          tone="amber"
          sub={`${fees.filter(f => f.kind === 'fee' || f.kind === 'penalty').length} fee row${fees.filter(f => f.kind === 'fee' || f.kind === 'penalty').length === 1 ? '' : 's'}`}
        />
      </div>

      <div className="card flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{statement.issuer || 'Statement'} {statement.account_last4 && <span className="font-mono text-sm text-gray-500">••{statement.account_last4}</span>}</h2>
          <p className="text-xs text-gray-500">
            {statement.period_start && statement.period_end ? `${statement.period_start} → ${statement.period_end}` : '—'}
            {statement.statement_kind && ` · ${statement.statement_kind}`}
            {' · '}Uploaded {new Date(statement.uploaded_at).toLocaleDateString()}
          </p>
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
          <Mini label="Purchases" value={display.purchases} />
          <Mini label="Refunds"   value={display.refunds} />
          <Mini label="Fees"      value={display.fees} />
          <Mini label="Interest"  value={display.interest} />
          <Mini label="Payments"  value={display.payments} />
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="card py-12 text-center text-gray-400 text-sm">
          No transactions recorded for this statement. If you imported recently, this usually means migration 018 hasn&apos;t been run.
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Transactions <span className="normal-case text-gray-400 font-normal">· {transactions.length} parsed</span></p>
            <div className="inline-flex bg-gray-50 rounded-lg p-0.5 gap-0.5 border border-gray-100 flex-wrap">
              {['all', ...Object.keys(counts).filter(k => k !== 'all')].map(k => (
                <button key={k} onClick={() => setKindFilter(k)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${kindFilter === k ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                  {k === 'all' ? 'All' : (KIND_STYLE[k]?.label || k)} <span className="text-gray-400">{counts[k]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  <th className="px-2 py-2 text-left">Date</th>
                  <th className="px-2 py-2 text-left">Kind</th>
                  <th className="px-2 py-2 text-left">Merchant</th>
                  <th className="px-2 py-2 text-left">Category</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map(tx => {
                  const k = KIND_STYLE[tx.kind] || KIND_STYLE.other
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/60">
                      <td className="px-2 py-1.5 whitespace-nowrap text-gray-600">{tx.date}</td>
                      <td className="px-2 py-1.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${k.cls}`}>
                          {tx.fee_kind || k.label}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-gray-900 font-medium">
                        {tx.merchant}
                        {tx.raw_description && tx.raw_description !== tx.merchant && (
                          <div className="text-[10px] text-gray-400 truncate max-w-md" title={tx.raw_description}>{tx.raw_description}</div>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-gray-500">{tx.category || '—'}</td>
                      <td className="px-2 py-1.5 text-[10px]">
                        {tx.receipts ? (
                          <Link href={`/receipts/${tx.receipts.id}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">
                            Imported <ExternalLink size={9} />
                          </Link>
                        ) : tx.is_fee || tx.is_interest ? (
                          <span className="inline-block px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100 font-semibold">Fee logged</span>
                        ) : tx.is_payment ? (
                          <span className="inline-block px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-semibold">Skipped (payment)</span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Not imported</span>
                        )}
                        {tx.business && (
                          <span className="ml-1 inline-block px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-semibold">Biz</span>
                        )}
                      </td>
                      <td className={'px-2 py-1.5 text-right font-mono ' + (tx.amount < 0 ? 'text-emerald-700' : 'text-gray-900')}>
                        ${tx.amount.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {fees.length > 0 && (
        <div className="card">
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-2">Fees on this statement</p>
          <ul className="space-y-1">
            {fees.map(f => (
              <li key={f.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">
                <span className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${FEE_KIND_TONE[f.kind] || FEE_KIND_TONE.fee}`}>
                    {f.fee_kind || f.kind}
                  </span>
                  <span className="text-gray-600">{f.date}</span>
                  {f.merchant && <span className="text-gray-500 truncate max-w-xs">{f.merchant}</span>}
                </span>
                <span className="font-mono font-semibold text-amber-700">${Number(f.amount).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// Flattened transactions across every statement of a single bank account.
// Same row shape as the single-statement detail table but with an extra
// "Period" column showing which statement the row came from.
function CombinedTransactionTable({ transactions, statements }) {
  const [kindFilter, setKindFilter] = useState('all')
  const stmtById = useMemo(() => {
    const m = new Map()
    for (const s of statements) m.set(s.id, s)
    return m
  }, [statements])

  const counts = transactions.reduce((acc, tx) => {
    acc[tx.kind] = (acc[tx.kind] || 0) + 1
    return acc
  }, { all: transactions.length })

  const visible = kindFilter === 'all'
    ? transactions
    : transactions.filter(tx => tx.kind === kindFilter)

  return (
    <div>
      <div className="flex items-center justify-end mb-2">
        <div className="inline-flex bg-gray-50 rounded-lg p-0.5 gap-0.5 border border-gray-100 flex-wrap">
          {['all', ...Object.keys(counts).filter(k => k !== 'all')].map(k => (
            <button key={k} onClick={() => setKindFilter(k)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${kindFilter === k ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
              {k === 'all' ? 'All' : (KIND_STYLE[k]?.label || k)} <span className="text-gray-400">{counts[k]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              <th className="px-2 py-2 text-left">Date</th>
              <th className="px-2 py-2 text-left">Kind</th>
              <th className="px-2 py-2 text-left">Merchant</th>
              <th className="px-2 py-2 text-left">Period</th>
              <th className="px-2 py-2 text-left">Status</th>
              <th className="px-2 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map(tx => {
              const k = KIND_STYLE[tx.kind] || KIND_STYLE.other
              const stmt = stmtById.get(tx.statement_id)
              return (
                <tr key={tx.id} className="hover:bg-gray-50/60">
                  <td className="px-2 py-1.5 whitespace-nowrap text-gray-600">{tx.date}</td>
                  <td className="px-2 py-1.5">
                    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${k.cls}`}>
                      {tx.fee_kind || k.label}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-gray-900 font-medium">{tx.merchant}</td>
                  <td className="px-2 py-1.5 text-[10px] text-gray-500 whitespace-nowrap">
                    {stmt?.period_start && stmt?.period_end ? `${stmt.period_start.slice(5)} → ${stmt.period_end.slice(5)}` : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-[10px]">
                    {tx.receipts ? (
                      <Link href={`/receipts/${tx.receipts.id}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">
                        Imported <ExternalLink size={9} />
                      </Link>
                    ) : tx.is_fee || tx.is_interest ? (
                      <span className="inline-block px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100 font-semibold">Fee logged</span>
                    ) : tx.is_payment ? (
                      <span className="inline-block px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-semibold">Payment</span>
                    ) : (
                      <span className="inline-block px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Not imported</span>
                    )}
                  </td>
                  <td className={'px-2 py-1.5 text-right font-mono ' + (tx.amount < 0 ? 'text-emerald-700' : 'text-gray-900')}>
                    ${tx.amount.toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Mini({ label, value }) {
  return (
    <div className="rounded-lg bg-white border border-gray-100 px-2.5 py-1.5">
      <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value == null ? '—' : `$${Number(value).toFixed(2)}`}</p>
    </div>
  )
}

const BIG_TOTAL_TONE = {
  sky:    { bg: 'bg-sky-50',    border: 'border-sky-200',    text: 'text-sky-900',    icon: 'text-sky-600',    accent: 'text-sky-700'    },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', icon: 'text-orange-600', accent: 'text-orange-700' },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-900',  icon: 'text-amber-600',  accent: 'text-amber-700'  },
}
function BigTotal({ label, value, icon: Icon, tone, sub }) {
  const t = BIG_TOTAL_TONE[tone] || BIG_TOTAL_TONE.sky
  return (
    <div className={`card ${t.bg} ${t.border} border`}>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
          <Icon size={22} className={t.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] uppercase tracking-wider font-bold ${t.accent}`}>{label}</p>
          <p className={`text-2xl font-extrabold ${t.text} mt-0.5`}>${Number(value || 0).toFixed(2)}</p>
          {sub && <p className={`text-[11px] ${t.accent} mt-1`}>{sub}</p>}
        </div>
      </div>
    </div>
  )
}

const TOTAL_TONE = {
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   icon: 'text-amber-600'   },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  icon: 'text-orange-600'  },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  icon: 'text-indigo-600'  },
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-700',     icon: 'text-sky-600'     },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-600' },
}
function Stat({ icon: Icon, tone, label, value, raw }) {
  const t = TOTAL_TONE[tone] || TOTAL_TONE.amber
  const display = raw ? value : (value == null ? '$0.00' : `$${Number(value).toFixed(2)}`)
  return (
    <div className="stat-card">
      <div className={`p-3 rounded-xl ${t.bg}`}><Icon size={20} className={t.icon} /></div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-xl font-bold ${t.text}`}>{display}</p>
      </div>
    </div>
  )
}

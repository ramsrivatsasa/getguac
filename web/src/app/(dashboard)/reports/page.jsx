// /reports — aggregate views over the user's receipts:
//   1. Spending by category (donut chart + category breakdown)
//   2. Top stores by spend (table)
//   3. Repeat purchases (items bought 2+ times — pantry essentials)
//   4. One-time orders (items bought exactly once — impulse / try-it buys)
//
// Single supabase round-trip pulls receipts + embedded receipt_items, then
// we aggregate client-side. Fast enough for users with <10k receipts; for
// power users we'd swap to a server-side SQL aggregate.

'use client'
import {DONUT,donutGeometry,donutCategoryColor} from '../../../lib/donut-style.mjs'
import { useMemo, useState, Fragment } from 'react'
import useCurrencySymbol from '../../../hooks/useCurrencySymbol'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '../../../lib/supabase/client'
import { CATEGORIES, categoryLabel, categoryClass, CATEGORY_BY_SLUG } from '../../../lib/categories'
import { isPaymentReceipt } from '../../../lib/payment-rows'
import { displayStoreName, storeGroupKey } from '../../../lib/store-name-normalize'
import { computeTaxSummary, buildTaxExportCsv, taxRowsToCsv } from '../../../lib/tax-summary'
import { detectSubscriptions, summarizeSubscriptions } from '../../../lib/subscription-tracker'
import { computeSpendingTrend, formatTrend } from '../../../lib/spending-trends'
import { formatDateShort } from '../../../lib/dateFormat'
import { periodStartIsoDate, timeframeLabel } from '../../../lib/timeframe'
import { useStore } from '../../../store'
import TimeframePicker from '../../../components/TimeframePicker'
import { BarChart3, PieChart as PieIcon, Repeat, Award, Store as StoreIcon, X, Receipt as ReceiptIcon, Download, HeartHandshake, Briefcase, Percent, RotateCw, TrendingUp } from 'lucide-react'
import FeatureHeader from '../../../components/FeatureHeader'
import { StoreLogo } from '../../../components/StoreLogo'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

// Time-frame is owned by the dashboard via the Zustand store.
// /reports reads `spendingPeriod` + `spendingPeriodCount` and
// derives the `dateFrom` cutoff through the shared
// `periodStartIsoDate` helper — same window the dashboard and
// /guacwizard use.

// Recharts donut colors — matches CATEGORIES palette as closely as Tailwind lets.


// Presentation-only money formatter — thousands separators + 2 decimals
// ($1,234.56), matching the mockup. `dp` overrides fraction digits (e.g. 0
// for the whole-dollar KPI / donut-center figures the mockup shows as $16,399).
//
// The symbol is passed IN rather than hardcoded, so an Italian viewer sees
// €1,234.56. It is only ever the symbol — the number is untouched, nothing is
// converted, and the CSV export below deliberately carries no symbol at all.
// `sym` comes from useCurrencySymbol() inside the component; taking it as an
// argument keeps this a pure function and keeps the hook out of module scope.
const moneyWith = (sym) => (n, dp = 2) =>
  `${sym}${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`

// Presentation-only date formatter — `DD MMM YYYY` with spaces (mockup style).
// Reuses the shared formatter's parsing and just swaps its dashes for spaces so
// no other view's date rendering changes.
const dateSpaced = (input) => formatDateShort(input).replace(/-/g, ' ')

// Pull receipts + items in a single query. Date filter on receipts is server-side;
// items come along as an embedded array per receipt.
async function getReportsData({ dateFrom }) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not signed in')
  let q = sb.from('receipts')
    // business_purchase + validation_comment are needed by the tax-
    // summary panel (lib/tax-summary.js) — without business_purchase
    // every receipt looks personal and the Business column reads $0
    // even when the user has tagged rows.
    .select('id, store_name, store_id, date, total_amount, tax_paid, category, is_return, from_statement, business_purchase, validation_comment, receipt_items(id, item_name, sku, qty, price, returned, category)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(5000)
  if (dateFrom) q = q.gte('date', dateFrom)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export default function ReportsPage() {
  const curSymbol = useCurrencySymbol()
  const money = useMemo(() => moneyWith(curSymbol), [curSymbol])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categoryMode, setCategoryMode] = useState('receipt')
  const [businessOnly, setBusinessOnly] = useState(false)
  const [taxReportMode, setTaxReportMode] = useState('category')
  const { spendingPeriod, spendingPeriodCount } = useStore()
  const dateFrom = periodStartIsoDate(spendingPeriod, spendingPeriodCount)
  const periodLabel = timeframeLabel(spendingPeriod, spendingPeriodCount)
  // `period` carries the window's label + day-span. Used for the trend badge
  // (shown only for windows ≤ 90d) and CSV/section labels. (Restored — a
  // refactor had left period.days / period.label references dangling, which
  // crashed the page with "period is not defined".)
  const period = {
    label: periodLabel,
    days: dateFrom ? Math.round((Date.now() - new Date(dateFrom).getTime()) / 86400000) : null,
  }

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['reports', spendingPeriod, spendingPeriodCount],
    queryFn: () => getReportsData({ dateFrom }),
    staleTime: 60_000,
  })
  const reportReceipts = useMemo(
    () => businessOnly ? receipts.filter(receipt => receipt.business_purchase) : receipts,
    [businessOnly, receipts]
  )

  // Subscriptions need a wider lens than the page's period chip to
  // detect recurring patterns. Pull last 12 months regardless of
  // chip — gives the detector enough samples to spot monthly +
  // quarterly cadence reliably.
  const subsDateFrom = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data: subsReceipts = [] } = useQuery({
    queryKey: ['reports-subs', subsDateFrom],
    queryFn: () => getReportsData({ dateFrom: subsDateFrom }),
    staleTime: 5 * 60_000,
  })

  // Aggregate everything in one pass: category totals, store totals, per-item history.
  const { receiptByCategory, itemByCategory, byStore, itemHistory, totalSpent, totalItemSpent, totalReceipts } = useMemo(() => {
    const receiptCat = new Map()
    const itemCat = new Map()
    const store = new Map()
    const items = new Map()  // key = lower(item_name)|sku, value = { name, sku, count, qty, spent, lastDate, stores }
    let sum = 0
    let itemSum = 0
    for (const r of reportReceipts) {
      if (r.is_return) continue                      // refunds don't count as spend
      if (isPaymentReceipt(r)) continue              // CC payments move money between accounts; not spending
      const amt = parseFloat(r.total_amount || 0)
      if (amt <= 0) continue                         // skip $0 / negative-but-not-marked-return rows so they don't drag category totals negative (was producing "Misc -169%" on the donut)
      sum += amt
      const ck = r.category || 'misc'
      receiptCat.set(ck, (receiptCat.get(ck) || 0) + amt)
      // Bucket by CANONICAL alias key (same logic the dashboard's
      // Spending-by-Store chart uses) — not by raw store_id. Otherwise
      // every duplicate `stores` table row for the same merchant gets
      // its own line, producing "COSTCO" appearing 8 times. The
      // storeGroupKey collapses every variant to one bucket.
      const sk = storeGroupKey(r.store_name) || (r.store_id || `name:${r.store_name || '—'}`)
      const sentry = store.get(sk) || { id: r.store_id, name: displayStoreName(r.store_name) || '—', count: 0, spent: 0 }
      sentry.count++
      sentry.spent += amt
      store.set(sk, sentry)
      for (const it of (r.receipt_items || [])) {
        if (it.returned) continue
        const itemAmount = parseFloat(it.price || 0)
        if (itemAmount > 0) {
          const itemCategory = it.category || 'misc'
          itemCat.set(itemCategory, (itemCat.get(itemCategory) || 0) + itemAmount)
          itemSum += itemAmount
        }
        const key = `${(it.item_name || '').toLowerCase().trim()}|${(it.sku || '').trim()}`
        if (!key.replace('|', '')) continue
        const ie = items.get(key) || {
          name: it.item_name, sku: it.sku, count: 0, qty: 0, spent: 0,
          lastDate: null, lastReceiptId: null, stores: new Set(),
        }
        ie.count++
        ie.qty += parseInt(it.qty || 1, 10)
        ie.spent += parseFloat(it.price || 0)
        if (!ie.lastDate || r.date > ie.lastDate) {
          ie.lastDate = r.date
          ie.lastReceiptId = r.id
        }
        if (r.store_name) ie.stores.add(r.store_name)
        items.set(key, ie)
      }
    }
    return {
      receiptByCategory: [...receiptCat.entries()].map(([slug, amount]) => ({ slug, amount })).sort((a, b) => b.amount - a.amount),
      itemByCategory: [...itemCat.entries()].map(([slug, amount]) => ({ slug, amount })).sort((a, b) => b.amount - a.amount),
      byStore: [...store.values()].sort((a, b) => b.spent - a.spent),
      itemHistory: [...items.values()].map(it => ({ ...it, stores: [...it.stores] })),
      totalSpent: sum,
      totalItemSpent: itemSum,
      totalReceipts: reportReceipts.filter(r => !r.is_return && !isPaymentReceipt(r)).length,
    }
  }, [reportReceipts])

  const byCategory = categoryMode === 'item' ? itemByCategory : receiptByCategory
  const categoryTotal = categoryMode === 'item' ? totalItemSpent : totalSpent

  const oneTime = useMemo(() => itemHistory.filter(it => it.count === 1).sort((a, b) => b.spent - a.spent), [itemHistory])
  const repeats = useMemo(() => itemHistory.filter(it => it.count >= 2).sort((a, b) => b.count - a.count || b.spent - a.spent), [itemHistory])

  // Top-stores table: click a column header to re-sort. Default is spend
  // descending (matches the byStore memo). `showAllStores` toggles the
  // 25-row cap so power users can see every merchant they've shopped.
  const [storeSort, setStoreSort] = useState({ key: 'spent', dir: 'desc' })
  const [showAllStores, setShowAllStores] = useState(false)
  const toggleStoreSort = (key) => setStoreSort(s =>
    s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' })
  const sortedStores = useMemo(() => {
    const val = (s) => storeSort.key === 'name' ? (s.name || '').toLowerCase()
      : storeSort.key === 'avg' ? (s.spent / (s.count || 1))
      : s[storeSort.key]
    const arr = [...byStore].sort((a, b) => {
      const av = val(a), bv = val(b)
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
      return storeSort.dir === 'desc' ? -cmp : cmp
    })
    return showAllStores ? arr : arr.slice(0, 25)
  }, [byStore, storeSort, showAllStores])

  // Tax rollups — computed via the central lib so the same numbers
  // show on /reports today AND can be reused later (year-end email,
  // GuacWizard prompts, etc.) without duplicating the aggregation.
  const taxStats = useMemo(() => computeTaxSummary(receipts), [receipts])
  const taxItemStats = useMemo(() => {
    const businessRows = []
    const charityRows = []
    for (const receipt of receipts) {
      if (receipt.is_return || isPaymentReceipt(receipt)) continue
      for (const item of (receipt.receipt_items || [])) {
        const amount = parseFloat(item.price || 0)
        if (item.returned || amount <= 0) continue
        const row = { ...item, amount, date: receipt.date, store_name: receipt.store_name, receipt_id: receipt.id, business_purchase: Boolean(receipt.business_purchase) }
        if (receipt.business_purchase) businessRows.push(row)
        if ((item.category || '') === 'charity') charityRows.push(row)
      }
    }
    return {
      businessRows, charityRows,
      businessSpent: businessRows.reduce((sum, row) => sum + row.amount, 0),
      charityDonated: charityRows.reduce((sum, row) => sum + row.amount, 0),
    }
  }, [receipts])

  // Subscription detection — always runs against the 12-month window
  // (not the page chip) so monthly + quarterly patterns surface
  // regardless of which period the user is viewing.
  const subscriptions = useMemo(() => detectSubscriptions(subsReceipts), [subsReceipts])
  const subsSummary   = useMemo(() => summarizeSubscriptions(subscriptions), [subscriptions])

  // Per-category trend: this period's spend vs avg of prior 3 windows
  // of the same length. Reuses the 12-month subscription dataset so
  // the detector has prior data to compare against. We only surface
  // the badge when the chip period is <= 3 months (1M/3M) — beyond
  // that the prior-window math needs more history than the 12-month
  // window provides and the % would mis-report.
  const trendsShown = period.days != null && period.days <= 90
  const categoryTrends = useMemo(() => {
    if (!trendsShown) return {}
    return computeSpendingTrend(subsReceipts, 'daily', period.days).byCategory
  }, [trendsShown, subsReceipts, period.days])

  // Build the CSV on-click (client-side, no endpoint). Triggers a
  // download via a synthetic anchor.
  function downloadTaxCsv() {
    const { filename, body, count } = buildTaxExportCsv(taxStats, period.label)
    if (count === 0) return
    const blob = new Blob([body], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function downloadTaxRows(kind) {
    const rows = taxReportMode === 'item'
      ? (kind === 'business' ? taxItemStats.businessRows : taxItemStats.charityRows)
      : (kind === 'business' ? taxStats.businessRows : taxStats.charityRows)
    if (!rows.length) return
    const itemCsv = taxReportMode === 'item' && [
      ['Date', 'Store', 'Item', 'SKU', 'Category', 'Quantity', 'Amount', 'Classification', 'Receipt ID'],
      ...rows.map(row => [row.date, displayStoreName(row.store_name), row.item_name, row.sku, row.category || 'misc', row.qty || 1, row.amount.toFixed(2), kind === 'business' ? 'Business' : 'Charity', row.receipt_id]),
    ].map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${taxReportMode === 'item' ? itemCsv : taxRowsToCsv(rows)}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const periodSlug = period.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    a.href = url
    a.download = `getguac-${kind}-${taxReportMode}-${periodSlug}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function downloadCurrentTaxCsv() {
    if (taxReportMode === 'category') return downloadTaxCsv()
    const rows = [
      ...taxItemStats.businessRows.map(row => ({ ...row, classification: 'Business' })),
      ...taxItemStats.charityRows.map(row => ({ ...row, classification: 'Charity' })),
    ]
    if (!rows.length) return
    const headers = ['Date', 'Store', 'Item', 'SKU', 'Category', 'Quantity', 'Amount', 'Classification', 'Receipt ID']
    const body = [headers, ...rows.map(row => [row.date, displayStoreName(row.store_name), row.item_name, row.sku, row.category || 'misc', row.qty || 1, row.amount.toFixed(2), row.classification, row.receipt_id])]
      .map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `getguac-tax-items-${period.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  function downloadCategoryCsv(mode) {
    const csvCell = (value) => {
      let text = value == null ? '' : String(value)
      if (/^[=+\-@]/.test(text)) text = `'${text}`
      return `"${text.replaceAll('"', '""')}"`
    }
    const rows = mode === 'item'
      ? reportReceipts.flatMap(r => {
          if (r.is_return || isPaymentReceipt(r)) return []
          return (r.receipt_items || [])
            .filter(it => !it.returned && parseFloat(it.price || 0) > 0 && (!selectedCategory || (it.category || 'misc') === selectedCategory))
            .map(it => [r.date, displayStoreName(r.store_name), it.item_name, it.sku, it.qty || 1, it.category || 'misc', parseFloat(it.price || 0), r.business_purchase ? 'Business' : 'Personal', r.id])
        })
      : reportReceipts
          .filter(r => !r.is_return && !isPaymentReceipt(r) && parseFloat(r.total_amount || 0) > 0 && (!selectedCategory || (r.category || 'misc') === selectedCategory))
          .map(r => [r.date, displayStoreName(r.store_name), r.category || 'misc', parseFloat(r.total_amount || 0), parseFloat(r.tax_paid || 0), (r.receipt_items || []).filter(it => !it.returned).length, r.business_purchase ? 'Business' : 'Personal', r.id])
    const headers = mode === 'item'
      ? ['Date', 'Store', 'Item', 'SKU', 'Quantity', 'Item category', 'Item amount', 'Purchase type', 'Receipt ID']
      : ['Date', 'Store', 'Receipt category', 'Receipt total', 'Tax paid', 'Item count', 'Purchase type', 'Receipt ID']
    const body = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const scope = selectedCategory ? `-${selectedCategory}` : '-all-categories'
    const periodSlug = period.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    a.href = url
    a.download = `getguac-${businessOnly ? 'business-' : ''}${mode}-spending-${periodSlug}${scope}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Receipts in the user-selected category. Tagging is on the receipt itself
  // (r.category) — receipt_items have their own category but the donut groups
  // by receipt-level, so we keep this consistent. Returns are excluded to match
  // the donut totals.
  const categoryReceipts = useMemo(() => {
    if (!selectedCategory) return []
    return reportReceipts
      .filter(r => !r.is_return && (r.category || 'misc') === selectedCategory)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [reportReceipts, selectedCategory])

  const categoryItems = useMemo(() => {
    if (!selectedCategory) return []
    return reportReceipts.flatMap(r => {
      if (r.is_return || isPaymentReceipt(r)) return []
      return (r.receipt_items || [])
        .filter(it => !it.returned && (it.category || 'misc') === selectedCategory && parseFloat(it.price || 0) > 0)
        .map(it => ({ ...it, receiptId: r.id, receiptDate: r.date, storeName: r.store_name, storeId: r.store_id }))
    }).sort((a, b) => (b.receiptDate || '').localeCompare(a.receiptDate || ''))
  }, [reportReceipts, selectedCategory])

  function changeCategoryMode(mode) {
    setCategoryMode(mode)
    setSelectedCategory(null)
  }

  function toggleCategory(slug) {
    setSelectedCategory(prev => prev === slug ? null : slug)
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <FeatureHeader
        theme="reports"
        title="Reports"
        subtitle={<><span className="font-bold">{money(totalSpent, 0)}</span> tracked across <span className="font-bold">{totalReceipts}</span> receipt{totalReceipts === 1 ? '' : 's'} · {periodLabel}</>}
        action={<TimeframePicker compact />}
      />

      {isLoading ? (
        <div className="text-gray-400 py-10 text-center flex flex-col items-center gap-3">
          <p>Loading reports…</p>
        </div>
      ) : receipts.length === 0 ? (
        <div className="card py-16 text-center flex flex-col items-center gap-3">
          <p className="text-gray-500">No receipts in this window. Try a wider period.</p>
        </div>
      ) : (
        <>
          {/* KPI strip — headline numbers for the selected window */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Total spent"
              value={money(totalSpent, 0)}
              sub={`across ${byCategory.length} categor${byCategory.length === 1 ? 'y' : 'ies'}`}
            />
            <KpiCard
              label="Top category"
              value={byCategory[0] ? (CATEGORY_BY_SLUG[byCategory[0].slug]?.label || byCategory[0].slug) : '—'}
              sub={byCategory[0] && totalSpent > 0 ? `${money(byCategory[0].amount)} · ${((byCategory[0].amount / totalSpent) * 100).toFixed(0)}% of spend` : 'no spend yet'}
            />
            <KpiCard
              label="Tax-deductible"
              accent="guac"
              value={money(taxStats.businessSpent)}
              sub={`${taxStats.businessCount} business receipt${taxStats.businessCount === 1 ? '' : 's'}`}
            />
            <KpiCard
              label="Sales tax paid"
              value={money(taxStats.salesTax)}
              sub={`across ${taxStats.salesTaxCount} receipt${taxStats.salesTaxCount === 1 ? '' : 's'}`}
            />
          </div>

          {/* 1. Spending by category */}
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <SectionTitle emoji="🥧" title="Spending by category" />
              <div className="flex flex-wrap items-center gap-2">
                <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${businessOnly ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-guac-line bg-white text-gray-600'}`}>
                  <input type="checkbox" checked={businessOnly} onChange={event => { setBusinessOnly(event.target.checked); setSelectedCategory(null) }} className="h-4 w-4 rounded border-gray-300 accent-blue-600" />
                  Business only
                </label>
                <div className="inline-flex rounded-lg border border-guac-line bg-guac-50 p-1" role="group" aria-label="Category grouping">
                  {[
                    ['receipt', 'By receipt'],
                    ['item', 'By item'],
                  ].map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => changeCategoryMode(mode)}
                      aria-pressed={categoryMode === mode}
                      className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${categoryMode === mode ? 'bg-white text-guac-800 shadow-sm' : 'text-gray-500 hover:text-guac-700'}`}
                    >{label}</button>
                  ))}
                </div>
                  <button
                    type="button"
                    onClick={() => downloadCategoryCsv(categoryMode)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-guac-line bg-white px-3 py-2 text-xs font-bold text-guac-700 hover:bg-guac-50 transition-colors"
                    title={`Download ${businessOnly ? 'business ' : ''}${categoryMode === 'item' ? 'item' : 'receipt'} categories for ${period.label}${selectedCategory ? `, filtered to ${categoryLabel(selectedCategory)}` : ''}`}
                  >
                    <Download size={13} /> Download CSV
                  </button>
              </div>
            </div>
            {categoryMode === 'item' && (
              <p className="-mt-2 mb-4 text-xs text-gray-400">
                Categorized line items total {money(categoryTotal)}. Receipt-level tax, tips, and unparsed amounts may not be included.
              </p>
            )}
            <div className="flex flex-col lg:flex-row gap-8 items-center">
              <CategoryDonut data={byCategory} total={categoryTotal} caption={categoryMode === 'item' ? `${period.label} · items` : period.label} />
              {/* Right column: each row = coloured dot + emoji + label, a
                  share bar, then amount · share. 4th col (Trend badge) only
                  on ≤90d windows. Same +/-% formatter as the Dashboard's
                  Total Spent badge — rose for up, guac for down. */}
              <div className="flex-1 min-w-0 w-full">
                <div
                  className="grid items-center gap-x-4 px-1.5 pb-2 border-b border-guac-line gg-colhead"
                  style={{ gridTemplateColumns: trendsShown && categoryMode === 'receipt' ? 'minmax(120px,150px) 1fr auto auto' : 'minmax(120px,150px) 1fr auto' }}
                >
                  <span>Category</span>
                  <span />
                  <span className="text-right">Amount · Share</span>
                  {trendsShown && categoryMode === 'receipt' && <span className="text-right w-12" title={`vs avg of prior 3 ${period.label.toLowerCase()} windows`}>Trend</span>}
                </div>
                {byCategory.slice(0, 10).map(c => {
                  const isSelected = selectedCategory === c.slug
                  const meta = CATEGORY_BY_SLUG[c.slug]
                  const color = donutCategoryColor(c.slug)
                  const pct = categoryTotal > 0 ? (c.amount / categoryTotal) * 100 : 0
                  const trend = trendsShown && categoryMode === 'receipt' ? formatTrend(categoryTrends[c.slug]?.deltaPct) : null
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => toggleCategory(c.slug)}
                      title={isSelected ? 'Hide records' : 'Show records'}
                      className={`w-full grid items-center gap-x-4 px-1.5 py-2 rounded-lg text-left transition-colors hover:bg-guac-row ${isSelected ? 'bg-guac-row ring-1 ring-guac-line2' : ''}`}
                      style={{ gridTemplateColumns: trendsShown && categoryMode === 'receipt' ? 'minmax(120px,150px) 1fr auto auto' : 'minmax(120px,150px) 1fr auto' }}
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-guac-ink min-w-0">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                        <span className="text-base leading-none shrink-0">{meta?.emoji}</span>
                        <span className="truncate">{meta?.label || c.slug}</span>
                      </span>
                      <span className="h-2 rounded-full bg-guac-50 overflow-hidden">
                        <span className="block h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 1.5)}%`, background: 'linear-gradient(90deg,#16a34a,#f59e0b,#dc2626)' }} />
                      </span>
                      <span className="text-right whitespace-nowrap">
                        <span className="gg-num font-semibold text-[13px] text-guac-ink">{money(c.amount)}</span>
                        <span className="gg-sub ml-2 inline-block w-8 text-right">{pct.toFixed(0)}%</span>
                      </span>
                      {trendsShown && categoryMode === 'receipt' && (
                        <span className="text-right w-12">
                          {trend && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                                trend.tone === 'up'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : trend.tone === 'down'
                                    ? 'bg-guac-50 text-guac-700 border border-guac-line'
                                    : 'bg-gray-50 text-gray-400 border border-gray-100'
                              }`}
                              title={`vs avg of prior 3 ${period.label.toLowerCase()} windows`}
                            >{trend.label}</span>
                          )}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 1b. Drill-down: receipts in the selected category */}
          {selectedCategory && (
            <div className="card">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs ${categoryClass(selectedCategory)}`}>
                    <span className="w-2 h-2 rounded-full" style={{ background: donutCategoryColor(selectedCategory) }} />
                    <span>{categoryLabel(selectedCategory)}</span>
                  </span>
                  <h2 className="gg-h3">
                    {categoryMode === 'item'
                      ? `${categoryItems.length} item${categoryItems.length === 1 ? '' : 's'} in ${period.label.toLowerCase()}`
                      : `${categoryReceipts.length} receipt${categoryReceipts.length === 1 ? '' : 's'} in ${period.label.toLowerCase()}`}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                  title="Close drill-down"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
              {categoryMode === 'item' ? (categoryItems.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No line items tagged with this category in the selected period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="gg-tbl w-full text-sm">
                    <thead className="border-b border-guac-line gg-colhead">
                      <tr>
                        <th className="px-3 py-1 text-left">Date</th>
                        <th className="px-3 py-1 text-left">Store</th>
                        <th className="px-3 py-1 text-left">Item</th>
                        <th className="px-3 py-1 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-guac-line">
                      {categoryItems.map((it, index) => (
                        <tr key={`${it.receiptId}-${it.id || index}`} className="hover:bg-guac-50/30">
                          <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap gg-num">{dateSpaced(it.receiptDate)}</td>
                          <td className="px-3 py-1.5">
                            {it.storeId ? (
                              <Link href={`/stores/${it.storeId}`} className="text-guac-700 hover:underline">{displayStoreName(it.storeName) || '—'}</Link>
                            ) : <span>{displayStoreName(it.storeName) || '—'}</span>}
                          </td>
                          <td className="px-3 py-1.5 text-gray-600">{it.item_name || 'Unnamed item'}</td>
                          <td className="px-3 py-1.5 text-right font-semibold gg-num text-guac-ink">
                            <Link href={`/receipts/${it.receiptId}`} className="hover:text-guac-700">{money(it.price)}</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )) : categoryReceipts.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No receipts tagged with this category in the selected period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="gg-tbl w-full text-sm">
                    <thead className="border-b border-guac-line gg-colhead">
                      <tr>
                        <th className="px-3 py-1 text-left">Date</th>
                        <th className="px-3 py-1 text-left">Store</th>
                        <th className="px-3 py-1 text-left">Items</th>
                        <th className="px-3 py-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-guac-line">
                      {categoryReceipts.map(r => {
                        const itemCount = (r.receipt_items || []).filter(i => !i.returned).length
                        const preview = (r.receipt_items || []).filter(i => !i.returned).slice(0, 3).map(i => i.item_name).filter(Boolean).join(', ')
                        return (
                          <tr key={r.id} className="hover:bg-guac-50/30">
                            <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap gg-num">{dateSpaced(r.date)}</td>
                            <td className="px-3 py-1.5">
                              {r.store_id ? (
                                <Link href={`/stores/${r.store_id}`} className="text-guac-700 hover:underline">{displayStoreName(r.store_name) || '—'}</Link>
                              ) : <span>{displayStoreName(r.store_name) || '—'}</span>}
                            </td>
                            <td className="px-3 py-1.5 text-gray-500 max-w-md truncate" title={preview}>
                              {itemCount > 0
                                ? <><span className="text-gray-700 font-medium">{itemCount}</span> {preview && <span className="text-gray-400">· {preview}{itemCount > 3 ? '…' : ''}</span>}</>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-3 py-1.5 text-right font-semibold gg-num text-guac-ink">
                              <Link href={`/receipts/${r.id}`} className="hover:text-guac-700">{money(r.total_amount)}</Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 2. Tax-relevant rollup. Business purchases, charity
              donations, and sales tax paid — the three buckets the
              user needs at filing time. Numbers come from
              lib/tax-summary.js so the same logic powers any future
              year-end email automation. The export button builds a
              CSV client-side via buildTaxExportCsv(). */}
          <div className="card">
            <SectionTitle
              emoji="🧮"
              title="Tax summary"
              meta={period.label}
              nowrap
              beside={<div className="inline-flex rounded-lg border border-guac-line bg-guac-50 p-1" role="group" aria-label="Tax report detail">{[['category','By category'],['item','By item']].map(([mode,label]) => <button type="button" key={mode} onClick={() => setTaxReportMode(mode)} aria-pressed={taxReportMode === mode} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold ${taxReportMode === mode ? 'bg-white text-guac-800 shadow-sm' : 'text-gray-500'}`}>{label}</button>)}</div>}
              action={<div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => downloadTaxRows('business')} disabled={(taxReportMode === 'item' ? taxItemStats.businessRows.length : taxStats.businessCount) === 0} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-extrabold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"><Download size={12}/> Business</button>
                <button type="button" onClick={() => downloadTaxRows('charity')} disabled={(taxReportMode === 'item' ? taxItemStats.charityRows.length : taxStats.charityCount) === 0} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-extrabold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"><Download size={12}/> Charity</button>
                <button
                  type="button"
                  onClick={downloadCurrentTaxCsv}
                  disabled={taxReportMode === 'item' ? taxItemStats.businessRows.length === 0 && taxItemStats.charityRows.length === 0 : taxStats.businessCount === 0 && taxStats.charityCount === 0}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-guac-50 border border-guac-line2 text-guac-700 font-extrabold text-xs hover:bg-guac-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Download business + charity receipts as CSV for filing"
                >
                  <Download size={12} /> Combined
                </button>
              </div>}
            />
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-guac-line2 bg-guac-50/60 p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.05em] font-extrabold text-guac-700"><span className="text-sm">💼</span> Business</div>
                <p className="gg-stat !text-guac-700 mt-2">{money(taxReportMode === 'item' ? taxItemStats.businessSpent : taxStats.businessSpent)}</p>
                <p className="gg-sub mt-1.5">
                  {taxReportMode === 'item' ? `${taxItemStats.businessRows.length} item${taxItemStats.businessRows.length === 1 ? '' : 's'}` : <>{taxStats.businessCount} receipt{taxStats.businessCount === 1 ? '' : 's'}{taxStats.businessTax > 0 && <> · {money(taxStats.businessTax)} tax</>}</>}
                </p>
              </div>
              <div className="rounded-2xl border border-rose-200/60 bg-rose-50/50 p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.05em] font-extrabold text-rose-600"><span className="text-sm">💝</span> Charity</div>
                <p className="gg-stat !text-rose-600 mt-2">{money(taxReportMode === 'item' ? taxItemStats.charityDonated : taxStats.charityDonated)}</p>
                <p className="gg-sub mt-1.5">{taxReportMode === 'item' ? taxItemStats.charityRows.length : taxStats.charityCount} {taxReportMode === 'item' ? 'charity item' : 'donation'}{(taxReportMode === 'item' ? taxItemStats.charityRows.length : taxStats.charityCount) === 1 ? '' : 's'}</p>
              </div>
              <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.05em] font-extrabold text-amber-700"><span className="text-sm">🧾</span> Sales tax paid</div>
                <p className="gg-stat !text-amber-600 mt-2">{money(taxStats.salesTax)}</p>
                <p className="gg-sub mt-1.5">across {taxStats.salesTaxCount} receipt{taxStats.salesTaxCount === 1 ? '' : 's'}</p>
              </div>
            </div>
            <p className="mt-3 gg-sub">
              Business + charity rows export to a CSV ready for your accountant or tax software. Payment / refund rows are excluded.
            </p>
          </div>

          {/* 3. Subscriptions — recurring-charge detector. Always
              looks at the last 12 months regardless of the page chip
              so monthly/quarterly patterns surface reliably. */}
          {subscriptions.length > 0 && (
            <div className="card">
              <SectionTitle
                emoji="🔁"
                title="Subscriptions"
                meta="detected from last 12 mo"
                action={
                  <div className="gg-sub">
                    <span className="font-bold text-violet-800 gg-num">{money(subsSummary.monthlyTotal)}</span>/mo
                    {' · '}
                    <span className="font-bold text-violet-700 gg-num">{money(subsSummary.annualTotal, 0)}</span>/yr
                    {' · '}
                    <span>{subsSummary.count} recurring</span>
                    {subsSummary.priceIncreaseCount > 0 && (
                      <> · <span className="text-rose-600 font-semibold">{subsSummary.priceIncreaseCount} ↑ priced up</span></>
                    )}
                  </div>
                }
              />
              <div className="overflow-x-auto">
                <table className="gg-tbl w-full text-sm">
                  <thead className="border-b border-guac-line gg-colhead">
                    <tr>
                      <th className="px-3 py-2 text-left">Merchant</th>
                      <th className="px-3 py-2 text-left">Cadence</th>
                      <th className="px-3 py-2 text-right">Avg charge</th>
                      <th className="px-3 py-2 text-right">Last charge</th>
                      <th className="px-3 py-2 text-right">Per month</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-guac-line">
                    {subscriptions.map(s => (
                      <tr key={s.storeKey} className="hover:bg-violet-50/30">
                        <td className="px-3 py-1.5">
                          <div className="font-semibold text-gray-800">{s.merchant.toUpperCase()}</div>
                          {s.category && (
                            <div className="text-[10px] text-gray-400 mt-0.5">{s.category}</div>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500">
                          {s.intervalLabel}
                          <span className="text-[10px] text-gray-400 ml-1">· {s.occurrences}×</span>
                        </td>
                        <td className="px-3 py-1.5 text-right gg-num text-gray-700">{money(s.avgAmount)}</td>
                        <td className="px-3 py-1.5 text-right text-gray-500 gg-num">
                          {dateSpaced(s.lastDate)}
                          {s.priceChanged && (s.priceChangePct ?? 0) !== 0 && (
                            <span
                              className={`ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold px-1 py-0.5 rounded-full ${
                                (s.priceChangePct ?? 0) > 0
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : 'bg-guac-50 text-guac-700 border border-guac-line'
                              }`}
                              title={`Last charge ${(s.priceChangePct ?? 0) > 0 ? 'up' : 'down'} ${Math.abs(Math.round(s.priceChangePct))}% vs prior avg`}
                            >
                              <TrendingUp size={9} />
                              {(s.priceChangePct ?? 0) > 0 ? '+' : ''}{Math.round(s.priceChangePct)}%
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-bold text-violet-800 gg-num">{money(s.monthlyCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-gray-400">
                Spotted by recurring-charge pattern (3+ similar charges at roughly the same interval). Cancel the ones you forgot you had.
              </p>
            </div>
          )}

          {/* 4. Top stores by spend */}
          <div className="card">
            <SectionTitle
              emoji="🏪"
              title="Top stores by spend"
              action={byStore.length > 25 ? (
                <button
                  onClick={() => setShowAllStores(v => !v)}
                  className="text-xs font-extrabold text-guac-700 hover:underline"
                >
                  {showAllStores ? 'Show top 25' : `Show all ${byStore.length}`}
                </button>
              ) : null}
            />
            <div className="overflow-x-auto">
              <table className="gg-tbl w-full text-sm">
                <thead className="border-b border-guac-line gg-colhead">
                  <tr>
                    <th className="px-3 py-1 text-left">Rank</th>
                    <SortableTh label="Store" sortKey="name" align="left" sort={storeSort} onSort={toggleStoreSort} />
                    <SortableTh label="Receipts" sortKey="count" align="right" sort={storeSort} onSort={toggleStoreSort} />
                    <SortableTh label="Total spend" sortKey="spent" align="right" sort={storeSort} onSort={toggleStoreSort} />
                    <SortableTh label="Avg basket" sortKey="avg" align="right" sort={storeSort} onSort={toggleStoreSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-guac-line">
                  {sortedStores.map((s, i) => (
                    <tr key={s.id || s.name} className="hover:bg-guac-row">
                      <td className="px-3 py-2"><RankBadge rank={i + 1} /></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <StoreLogo storeName={s.name} size={22} />
                          {s.id ? (
                            <Link href={`/stores/${s.id}`} className="font-semibold text-guac-ink hover:text-guac-700 hover:underline">{s.name}</Link>
                          ) : <span className="font-semibold text-guac-ink">{s.name}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-guac-muted gg-num">{s.count}</td>
                      <td className="px-3 py-2 text-right gg-num font-semibold text-guac-ink">{money(s.spent)}</td>
                      <td className="px-3 py-2 text-right gg-num text-guac-muted">{money(s.spent / s.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Repeat purchases */}
          <div className="card">
            <SectionTitle emoji="🛒" title="Repeat purchases" meta="bought 2+ times" />
            {repeats.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No repeat purchases yet in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="gg-tbl w-full text-sm">
                  <thead className="border-b border-guac-line gg-colhead">
                    <tr>
                      <th className="px-3 py-1 text-left">Item</th>
                      <th className="px-3 py-1 text-right">Buys</th>
                      <th className="px-3 py-1 text-right">Total qty</th>
                      <th className="px-3 py-1 text-right">Total spend</th>
                      <th className="px-3 py-1 text-left">Stores</th>
                      <th className="px-3 py-1 text-left">Last bought</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-guac-line">
                    {repeats.slice(0, 50).map(it => (
                      <tr key={(it.name || '') + '|' + (it.sku || '')} className="hover:bg-guac-50/40">
                        <td className="px-3 py-1 max-w-xs truncate" title={it.name}>{it.name || '—'}</td>
                        <td className="px-3 py-1 text-right font-semibold gg-num">{it.count}</td>
                        <td className="px-3 py-1 text-right text-gray-500 gg-num">{it.qty}</td>
                        <td className="px-3 py-1 text-right gg-num text-guac-ink">{money(it.spent)}</td>
                        <td className="px-3 py-1 text-gray-500 max-w-xs truncate" title={it.stores.join(', ')}>{it.stores.join(', ') || '—'}</td>
                        <td className="px-3 py-1 text-gray-500 whitespace-nowrap gg-num">
                          {it.lastReceiptId
                            ? <Link href={`/receipts/${it.lastReceiptId}`} className="text-guac-700 hover:underline">{dateSpaced(it.lastDate)}</Link>
                            : dateSpaced(it.lastDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4. One-time orders */}
          <div className="card">
            <SectionTitle emoji="🎯" title="One-time orders" meta="bought exactly once" />
            {oneTime.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Nothing bought just once in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="gg-tbl w-full text-sm">
                  <thead className="border-b border-guac-line gg-colhead">
                    <tr>
                      <th className="px-3 py-1 text-left">Item</th>
                      <th className="px-3 py-1 text-right">Spend</th>
                      <th className="px-3 py-1 text-left">Store</th>
                      <th className="px-3 py-1 text-left">Bought</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-guac-line">
                    {oneTime.slice(0, 100).map(it => (
                      <tr key={(it.name || '') + '|' + (it.sku || '')} className="hover:bg-guac-50/40">
                        <td className="px-3 py-1 max-w-md truncate" title={it.name}>{it.name || '—'}</td>
                        <td className="px-3 py-1 text-right gg-num text-guac-ink">{money(it.spent)}</td>
                        <td className="px-3 py-1 text-gray-500 max-w-xs truncate">{it.stores[0] || '—'}</td>
                        <td className="px-3 py-1 text-gray-500 whitespace-nowrap gg-num">
                          {it.lastReceiptId
                            ? <Link href={`/receipts/${it.lastReceiptId}`} className="text-guac-700 hover:underline">{dateSpaced(it.lastDate)}</Link>
                            : dateSpaced(it.lastDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ONE section heading for the whole page so no card drifts typographically:
// an emoji chip + a Bricolage (font-display) 18px title, optional muted meta,
// and a right-aligned action. Every card on /reports uses this so the header
// size / weight / font is identical top to bottom.
function SectionTitle({ emoji, title, meta, action, beside, nowrap = false }) {
  return (
    <div className={`flex items-center justify-between gap-3 mb-4 ${nowrap ? 'flex-nowrap overflow-x-auto' : 'flex-wrap'}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="gg-chip">{emoji}</span>
        <h2 className="gg-h2 truncate">
          {title}
          {meta && <span className="font-sans font-semibold gg-sub ml-1.5">· {meta}</span>}
        </h2>
        {beside && <div className="shrink-0">{beside}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// KPI strip card — same footprint everywhere: tiny uppercase label,
// Bricolage value, muted sub. `emoji` optional (top-category card).
function KpiCard({ label, value, sub, emoji, accent }) {
  return (
    <div className="card !p-4">
      <div className="gg-eyebrow">{label}</div>
      <div className={`gg-stat mt-1 truncate ${accent === 'guac' ? '!text-guac-700' : ''}`}>
        {emoji && <span className="mr-1">{emoji}</span>}{value}
      </div>
      <div className="gg-sub mt-1.5 truncate">{sub}</div>
    </div>
  )
}

// Top-3 get a coloured medal chip; everyone else a plain muted number.
function RankBadge({ rank }) {
  const tone = rank === 1 ? 'bg-amber-100 text-amber-700'
    : rank === 2 ? 'bg-gray-100 text-gray-500'
    : rank === 3 ? 'bg-orange-100 text-orange-700'
    : null
  if (tone) return <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-extrabold ${tone}`}>{rank}</span>
  return <span className="inline-block w-6 text-center text-xs font-bold text-guac-label">{rank}</span>
}

// Clickable table header: shows the active sort direction and toggles it.
// align controls text/justify so the arrow sits beside numeric columns.
function SortableTh({ label, sortKey, align, sort, onSort }) {
  const active = sort.key === sortKey
  const Arrow = sort.dir === 'desc' ? ChevronDown : ChevronUp
  return (
    <th className={`px-3 py-1 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-0.5 uppercase tracking-[0.05em] font-extrabold ${align === 'right' ? 'flex-row-reverse' : ''} ${active ? 'text-guac-700' : 'text-guac-label hover:text-guac-700'}`}
      >
        {label}
        <Arrow size={11} className={active ? 'opacity-100' : 'opacity-0'} />
      </button>
    </th>
  )
}

// Native SVG donut. Reliable across layouts — recharts silently fails to
// render when its parent has computed-zero width. Each segment is a circle
// with strokeDasharray sized to its fraction of the total.
// ⚠️ Calls the hook itself rather than taking `money` as a prop. `money` is
// scoped inside ReportsPage now (it depends on the resolved symbol), and this
// component sits outside it — referencing the parent's `money` here is a
// ReferenceError that takes the whole page down to the error boundary.
// Learned the hard way: the page rendered "Something went sideways."
function CategoryDonut({ data, total, size = 300, caption }) {
  const curSymbol = useCurrencySymbol()
  const money = useMemo(() => moneyWith(curSymbol), [curSymbol])
  if (!data || data.length === 0 || !total) {
    return (
      <div className="shrink-0 flex items-center justify-center text-gray-300 text-xs" style={{ width: size, height: size }}>
        No data
      </div>
    )
  }
  const {radius,stroke} = donutGeometry(size)
  const circumference = 2 * Math.PI * radius
  let cursor = 0
  const cx = size / 2
  const cy = size / 2
  const center = money(total, 0)
  return (
    <div className="shrink-0 relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke={DONUT.track} strokeWidth={stroke} />
        {data.map(d => {
          const frac = total > 0 ? d.amount / total : 0
          const arcLen = circumference * frac
          // Small gap between slices: shorten each arc by 2px, leave a 2px gap.
          const visible = Math.max(0, arcLen)
          const segment = (
            <circle
              key={d.slug}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={donutCategoryColor(d.slug)}
              strokeWidth={stroke}
              strokeDasharray={`${visible} ${circumference - visible}`}
              strokeDashoffset={-cursor}
            >
              <title>{`${d.slug}: ${money(d.amount)} (${((d.amount / total) * 100).toFixed(0)}%)`}</title>
            </circle>
          )
          cursor += arcLen
          return segment
        })}
      </svg>
      {/* Center label — total spend so the donut isn't just a colour wheel. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="gg-eyebrow">Total</span>
        <span className="gg-stat mt-0.5">{center}</span>
        {caption && <span className="gg-sub mt-0.5">{caption.toLowerCase()}</span>}
      </div>
    </div>
  )
}

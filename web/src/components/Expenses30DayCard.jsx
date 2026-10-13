'use client'
import { useState } from 'react'
import { subDays, subWeeks, subMonths, subYears, differenceInCalendarDays } from 'date-fns'

const money = value => Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export default function Expenses30DayCard({ receipts, today, header, period = 'monthly', periodCount = 1, rangeLabel }) {
  const [selected, setSelected] = useState(null)
  if(!today)return <section className="dashboard-edit-card min-w-0 p-4 sm:p-5" aria-label="Expenses over selected timeframe">{header}<p className="text-xs text-slate-500">Loading expense chart…</p></section>
  const start = ({ daily: subDays, weekly: subWeeks, monthly: subMonths, yearly: subYears }[period] || subMonths)(today, periodCount)
  const dayCount = differenceInCalendarDays(today, start) + 1
  const bucketSize = Math.max(1, Math.ceil(dayCount / 30))
  const days = Array.from({ length: Math.ceil(dayCount / bucketSize) }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index * bucketSize)
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + Math.min(dayCount - 1, (index + 1) * bucketSize - 1))
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { key: dateKey(date), end: dateKey(end), label, fullLabel: bucketSize > 1 ? `${label} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : label, amount: 0 }
  })
  for (const receipt of receipts) {
    const key = String(receipt.date || '').slice(0, 10)
    const day = days.find(day => key >= day.key && key <= day.end)
    const amount = Number(receipt.total_amount)
    if (day && !receipt.is_return && Number.isFinite(amount) && amount > 0) day.amount += amount
  }
  const total = days.reduce((sum, day) => sum + day.amount, 0)
  const average = total / dayCount
  const barAverage = total / days.length
  const max = Math.max(...days.map(day => day.amount), 1)
  const active = days.find(day => day.key === selected)
  return <section className="dashboard-edit-card min-w-0 p-4 sm:p-5" aria-label="Expenses over selected timeframe">
    {header}
    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
      <p className="text-xs text-slate-500">{rangeLabel} · {days[0].label} – {today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · Recorded purchases</p>
      <p className="text-sm font-bold text-slate-700">Total <span className="gg-num">{money(total)}</span></p>
    </div>
    <div className="mt-4 flex items-center justify-between gap-2 text-xs" aria-live="polite">
      <span className="font-semibold text-slate-600">{active ? `${active.fullLabel}: ${money(active.amount)}` : bucketSize > 1 ? `Expenses · up to ${bucketSize} days per bar` : 'Daily expenses'}</span>
      <span className="rounded-lg border border-slate-200 px-2 py-1 text-slate-600">Avg <strong className="gg-num">{money(average)}</strong> / day</span>
    </div>
    <div className="relative mt-2 h-32">
      <div aria-hidden="true" title="Average per bar" className="pointer-events-none absolute inset-x-0 border-t-2 border-dotted border-slate-400" style={{ bottom: `${barAverage / max * 100}%` }} />
      <div className="relative grid h-full items-end gap-[3px] sm:gap-2" style={{ gridTemplateColumns: `repeat(${days.length},minmax(0,1fr))` }}>
        {days.map(day => <button key={day.key} type="button" aria-label={`${day.fullLabel}: ${money(day.amount)}`} aria-pressed={selected === day.key} title={`${day.fullLabel}: ${money(day.amount)}`} onClick={() => setSelected(day.key)} className="group flex h-full min-w-0 items-end justify-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
          <span className={`w-full max-w-5 rounded-full transition-colors ${selected === day.key ? 'bg-violet-800' : 'bg-violet-500 group-hover:bg-violet-700'}`} style={{ height: day.amount ? `${Math.max(4, day.amount / max * 100)}%` : '3px', opacity: day.amount ? 1 : .25 }} />
        </button>)}
      </div>
    </div>
    <div className="mt-2 flex justify-between text-xs text-slate-500">{[...new Set([0, Math.floor((days.length - 1) / 4), Math.floor((days.length - 1) / 2), Math.floor((days.length - 1) * 3 / 4), days.length - 1])].map(index => <span key={index}>{days[index].label}</span>)}</div>
    {!total && <p className="mt-2 text-xs text-slate-500">Add a receipt to see your daily expenses.</p>}
  </section>
}

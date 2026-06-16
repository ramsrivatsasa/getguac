'use client'
// Bills calendar — a PocketSmith-style month view of upcoming recurring bills.
// Projects detected subscriptions onto their due dates so the user can see
// what's coming and when. Pure client: pulls receipts, runs the projector.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, CalendarDays, AlertTriangle, Repeat } from 'lucide-react'
import { getReceipts } from '../lib/db'
import { projectBills, toIso } from '../lib/billsCalendar'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const money = (n) => `$${(Number(n) || 0).toFixed(2)}`
const money0 = (n) => `$${Math.round(Number(n) || 0)}`

export default function BillsCalendar() {
  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => getReceipts(),
    staleTime: 5 * 60 * 1000,
  })

  const today = new Date()
  const todayIso = toIso(today)
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [selected, setSelected] = useState(todayIso)

  const bills = useMemo(() => projectBills(receipts, { from: today, monthsAhead: 12 }), [receipts])

  const monthPrefix = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`
  const byDay = useMemo(() => {
    const map = {}
    for (const b of bills) if (b.dateIso.startsWith(monthPrefix)) (map[b.dateIso] ||= []).push(b)
    return map
  }, [bills, monthPrefix])
  const monthTotal = useMemo(
    () => Object.values(byDay).reduce((s, list) => s + list.reduce((a, b) => a + b.amount, 0), 0),
    [byDay],
  )
  const upcoming = useMemo(() => bills.filter((b) => b.dateIso >= todayIso).slice(0, 10), [bills, todayIso])

  // Calendar grid cells (leading blanks + day numbers).
  const startWeekday = new Date(cursor.y, cursor.m, 1).getDay()
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const cells = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const monthName = new Date(cursor.y, cursor.m, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const shiftMonth = (delta) => {
    const d = new Date(cursor.y, cursor.m + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  const selectedBills = selected ? bills.filter((b) => b.dateIso === selected) : []
  const noBills = !isLoading && bills.length === 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 inline-flex items-center gap-2">
            <CalendarDays className="text-emerald-600" /> Bills calendar
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Your recurring bills, laid out on the days they’re due.</p>
        </div>
      </div>

      {noBills ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="text-5xl mb-3">🗓️</div>
          <p className="font-bold text-gray-800">No recurring bills detected yet.</p>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Once GetGuac sees a few charges from the same merchant (Netflix, Spotify, your gym…), they’ll show up here
            on their due dates. Keep adding receipts and statements.
          </p>
          <Link href="/receipts" className="btn-primary inline-flex mt-4">Add receipts</Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
          {/* Calendar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronLeft size={18} /></button>
              <div className="text-center">
                <div className="font-black text-gray-900">{monthName}</div>
                <div className="text-[11px] font-semibold text-emerald-700">{money(monthTotal)} due this month</div>
              </div>
              <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronRight size={18} /></button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-[10px] font-bold uppercase tracking-wider text-gray-400 py-1">{w[0]}</div>
              ))}
              {cells.map((day, i) => {
                if (day === null) return <div key={`b${i}`} />
                const iso = `${monthPrefix}-${String(day).padStart(2, '0')}`
                const dayBills = byDay[iso] || []
                const total = dayBills.reduce((s, b) => s + b.amount, 0)
                const isToday = iso === todayIso
                const isSel = iso === selected
                return (
                  <button
                    key={iso}
                    onClick={() => setSelected(iso)}
                    className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-0.5 text-xs transition-all ${
                      isSel ? 'border-emerald-500 bg-emerald-50' : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <span className={`font-bold ${isToday ? 'w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center' : 'text-gray-700'}`}>
                      {day}
                    </span>
                    {total > 0 && (
                      <span className="text-[9px] font-extrabold text-emerald-700 leading-none">{money0(total)}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Side panel: selected day + upcoming */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-bold text-gray-900 text-sm mb-2">
                {selected === todayIso ? 'Due today' : new Date(`${selected}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </h3>
              {selectedBills.length === 0 ? (
                <p className="text-sm text-gray-400">No bills due.</p>
              ) : (
                <div className="space-y-2">
                  {selectedBills.map((b, i) => <BillRow key={i} b={b} />)}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-bold text-gray-900 text-sm mb-2 inline-flex items-center gap-1.5"><Repeat size={14} className="text-emerald-600" /> Upcoming bills</h3>
              {upcoming.length === 0 ? (
                <p className="text-sm text-gray-400">Nothing coming up.</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((b, i) => <BillRow key={i} b={b} showDate />)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BillRow({ b, showDate }) {
  const when = new Date(`${b.dateIso}T00:00:00`)
  const days = Math.round((when - new Date(new Date().toDateString())) / 86400000)
  const rel = days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="font-semibold text-gray-800 text-sm truncate">{b.merchant}</p>
        <p className="text-[11px] text-gray-400">
          {showDate ? when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` · ${rel}` : b.intervalLabel}
          {b.priceChanged && <span className="ml-1 text-amber-600 inline-flex items-center gap-0.5"><AlertTriangle size={9} /> price changed</span>}
        </p>
      </div>
      <span className="font-black text-emerald-700 tabular-nums text-sm shrink-0">{money(b.amount)}</span>
    </div>
  )
}

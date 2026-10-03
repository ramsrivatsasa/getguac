'use client'

import Link from 'next/link'
import { useState } from 'react'

// The "Find your 10%" teaser from the v6.3 plan (screens A1/A2, requirement J-01).
// Pure arithmetic in the browser: nothing typed here is stored, sent to the
// server, added to a URL or passed to any analytics or ad pixel.
const GOAL_STEPS = [10, 12, 15]
const MAX_MONTHLY = 1000000

const money = (value) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function parseAmount(raw) {
  const cleaned = String(raw).replace(/[$,\s]/g, '')
  if (cleaned === '') return { value: null, error: '' }
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value <= 0) return { value: null, error: 'Enter a monthly amount above $0, like 4200.' }
  if (value > MAX_MONTHLY) return { value: null, error: 'That looks like more than a monthly amount. Enter what comes in each month.' }
  return { value, error: '' }
}

export default function TenPercentTeaser({ compact = false }) {
  const [raw, setRaw] = useState('')
  const [shown, setShown] = useState(null)
  const [error, setError] = useState('')

  function onSubmit(event) {
    event.preventDefault()
    const { value, error: message } = parseAmount(raw)
    if (value == null) {
      setShown(null)
      setError(message || 'Enter what your household brings home each month.')
      return
    }
    setError('')
    setShown(value)
  }

  function onChange(event) {
    setRaw(event.target.value)
    if (error) setError('')
  }

  return (
    <div className="tp-teaser rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="tp-teaser-head flex items-center gap-3">
        <span aria-hidden="true" className="tp-teaser-mark text-3xl">🥑</span>
        <p className="tp-teaser-kicker text-xs font-extrabold uppercase tracking-[.16em] text-emerald-700">See your 10%</p>
      </div>
      <form onSubmit={onSubmit} noValidate className="tp-teaser-form mt-4">
        <label htmlFor={compact ? 'tp-income-compact' : 'tp-income'} className="tp-teaser-label block text-sm font-bold text-slate-900">
          What does your household bring home each month?
        </label>
        <div className={`tp-teaser-field mt-2 flex items-center rounded-2xl border bg-white px-4 ${error ? 'border-red-400' : 'border-slate-300 focus-within:border-emerald-600'}`}>
          <span aria-hidden="true" className="tp-teaser-currency text-lg font-bold text-slate-500">$</span>
          <input
            id={compact ? 'tp-income-compact' : 'tp-income'}
            inputMode="decimal"
            autoComplete="off"
            placeholder="4,200"
            value={raw}
            onChange={onChange}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'tp-income-error' : 'tp-income-help'}
            className="tp-teaser-input min-h-12 w-full bg-transparent px-2 text-lg font-bold text-slate-950 outline-none"
          />
          <span className="tp-teaser-unit whitespace-nowrap text-sm text-slate-500">per month</span>
        </div>
        {error
          ? <p id="tp-income-error" role="alert" className="tp-teaser-error mt-2 text-sm font-semibold text-red-700">{error}</p>
          : <p id="tp-income-help" className="tp-teaser-help mt-2 text-xs text-slate-500">Nothing is saved or sent. This is just math on your screen.</p>}
        <button type="submit" className="tp-teaser-submit btn-primary mt-4 w-full justify-center">Show my 10%</button>
      </form>

      <div aria-live="polite" className="tp-teaser-result">
        {shown != null && (
          <div className="tp-teaser-answer mt-6 border-t border-slate-100 pt-5">
            <p className="tp-teaser-answer-label text-sm text-slate-600">Your 10% is about</p>
            <p className="tp-teaser-answer-value font-black leading-none text-emerald-700">
              <span className="tp-teaser-amount text-5xl">{money(shown * 0.1)}</span>
              <span className="tp-teaser-per ml-1 text-lg font-bold text-slate-500">/month</span>
            </p>
            <p className="tp-teaser-math mt-2 text-xs text-slate-500">10% of {money(shown)}. A goal, not a promise.</p>
            <ul className="tp-teaser-steps mt-4 flex flex-wrap gap-2">
              {GOAL_STEPS.map((pct) => (
                <li key={pct} className={`tp-teaser-step rounded-full px-3 py-1 text-xs font-bold ${pct === 10 ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800'}`}>
                  {pct}% = {money(shown * pct / 100)}
                </li>
              ))}
            </ul>
            <p className="tp-teaser-how mt-4 text-sm leading-6 text-slate-700">We help you find it by cutting spending, lowering bills, making your money earn more and finding cheaper options.</p>
            <Link href="/register" className="tp-teaser-cta btn-primary mt-4 w-full justify-center">Start finding mine, free</Link>
            <p className="tp-teaser-timing mt-2 text-center text-xs text-slate-500">Results as soon as you add your expenses.</p>
          </div>
        )}
      </div>
    </div>
  )
}

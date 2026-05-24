'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '../../../lib/supabase/client'
import { generateInsights, PERIODS } from '../../../lib/financeInsights'
import GuacMascot from '../../../components/GuacMascot'
import { TrendingUp, TrendingDown, AlertTriangle, Percent, CreditCard, Banknote, Sparkles } from 'lucide-react'

const SEVERITY_STYLE = {
  good:    { card: 'bg-emerald-50 border-emerald-200', label: 'text-emerald-700' },
  neutral: { card: 'bg-gray-50 border-gray-200',       label: 'text-gray-700' },
  watch:   { card: 'bg-amber-50 border-amber-200',     label: 'text-amber-800' },
  warning: { card: 'bg-orange-50 border-orange-200',   label: 'text-orange-800' },
  urgent:  { card: 'bg-rose-50 border-rose-300',       label: 'text-rose-800' },
}

const MASCOT_BY_SCORE = (score) => {
  if (score >= 80) return 'rich'
  if (score >= 65) return 'celebrating'
  if (score >= 50) return 'thumbsup'
  if (score >= 35) return 'sleepy'
  return 'surprised'
}

// GuacWizard health score — 0 to 100. Higher = healthier.
// Rough heuristic; transparent on the page so users see the breakdown.
function computeWizardScore({ summary, accounts }) {
  let score = 100
  const reasons = []
  const { totalInterest, totalFees, netDebtChange, totalPurch } = summary

  if (totalInterest > 0) {
    const penalty = Math.min(35, Math.round(totalInterest / 10))
    score -= penalty
    reasons.push({ label: `-${penalty}`, why: `$${totalInterest.toFixed(2)} in interest paid` })
  }
  if (totalFees > 0) {
    const penalty = Math.min(20, Math.round(totalFees / 5))
    score -= penalty
    reasons.push({ label: `-${penalty}`, why: `$${totalFees.toFixed(2)} in fees paid` })
  }
  if (totalPurch > 0 && netDebtChange > 100) {
    const penalty = Math.min(20, Math.round(netDebtChange / 50))
    score -= penalty
    reasons.push({ label: `-${penalty}`, why: `Debt grew by $${netDebtChange.toFixed(2)}` })
  } else if (netDebtChange < -100) {
    const bonus = Math.min(10, Math.round(Math.abs(netDebtChange) / 100))
    score += bonus
    reasons.push({ label: `+${bonus}`, why: `Debt down $${Math.abs(netDebtChange).toFixed(2)}` })
  }
  const highApr = accounts.filter(a => a.latestApr != null && Number(a.latestApr) >= 25).length
  if (highApr > 0) {
    score -= highApr * 5
    reasons.push({ label: `-${highApr * 5}`, why: `${highApr} card(s) above 25% APR` })
  }
  if (accounts.length === 0) {
    score = 50
    reasons.push({ label: 'baseline', why: 'No statements uploaded yet' })
  }

  score = Math.max(0, Math.min(100, score))
  return { score, reasons }
}

export default function GuacWizardPage() {
  const sb = createClient()
  const [period, setPeriod] = useState('ytd')

  const { data: statements = [] }   = useQuery({ queryKey: ['bank_statements'],   queryFn: async () => { const { data } = await sb.from('bank_statements').select('*'); return data || [] }})
  const { data: fees = [] }         = useQuery({ queryKey: ['bank_fees'],         queryFn: async () => { const { data } = await sb.from('bank_fees').select('*'); return data || [] }})
  const { data: transactions = [] } = useQuery({ queryKey: ['bank_transactions'], queryFn: async () => { const { data } = await sb.from('bank_transactions').select('*'); return data || [] }})

  const result = useMemo(
    () => generateInsights({ statements, fees, transactions }, period),
    [statements, fees, transactions, period]
  )
  const { insights, summary, accounts } = result
  const { score, reasons } = useMemo(() => computeWizardScore(result), [result])

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Wizard header */}
      <div className="card overflow-hidden bg-gradient-to-br from-emerald-100 via-lime-50 to-amber-50 border-emerald-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-3xl bg-white shadow-md ring-2 ring-emerald-200 flex items-center justify-center shrink-0">
              <GuacMascot expression={MASCOT_BY_SCORE(score)} size={64} />
              <span className="absolute -top-1 -right-1 text-2xl">🧙‍♂️</span>
            </div>
            <div>
              <h1 className="text-3xl font-black text-emerald-900 leading-none flex items-center gap-2">
                GuacWizard
                <Sparkles size={22} className="text-amber-500" />
              </h1>
              <p className="text-sm text-emerald-800 mt-1.5">Your money sage. Reads every statement, calls out every leak.</p>
            </div>
          </div>

          {/* Score ring */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">Wizard score</p>
              <p className="text-4xl font-black text-emerald-900 leading-none">{score}<span className="text-base font-bold opacity-60"> / 100</span></p>
              <p className="text-[10px] text-emerald-800 mt-0.5">{summary.periodLabel}</p>
            </div>
          </div>
        </div>

        {/* Period chips */}
        <div className="mt-4 inline-flex bg-white/70 backdrop-blur rounded-xl p-1 gap-1 flex-wrap">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p.key ? 'bg-emerald-600 text-white shadow' : 'text-emerald-800 hover:bg-emerald-100'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Money-moved strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile icon={CreditCard}     tone="sky"     label="Payments made"    value={summary.totalPayments} />
        <Tile icon={Percent}        tone="orange"  label="Interest paid"    value={summary.totalInterest} bold />
        <Tile icon={AlertTriangle}  tone="amber"   label="Fees paid"        value={summary.totalFees} bold />
        <Tile icon={TrendingUp}     tone="rose"    label="Purchases"        value={summary.totalPurch} />
        <Tile icon={TrendingDown}   tone="emerald" label="Refunds"          value={summary.totalRefunds} />
      </div>

      {/* Insights stream */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
          <Sparkles size={14} className="text-amber-500" /> Insights
        </h2>
        {insights.length === 0 ? (
          <div className="card py-10 text-center text-gray-500">
            <GuacMascot expression="sleeping" size={48} />
            <p className="mt-2">Nothing to report for this period. Try a longer window.</p>
          </div>
        ) : (
          insights.map(i => {
            const s = SEVERITY_STYLE[i.severity] || SEVERITY_STYLE.neutral
            return (
              <div key={i.id} className={`card border ${s.card}`}>
                <div className="flex items-start gap-3">
                  <div className="text-3xl shrink-0">{i.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold ${s.label}`}>{i.title}</p>
                    {i.body && <p className="text-sm text-gray-700 mt-1">{i.body}</p>}
                    {i.action && (
                      <p className="text-xs text-emerald-900 mt-2 font-semibold flex items-start gap-1">
                        <span className="text-emerald-600">→</span> {i.action}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-white/70 ${s.label} shrink-0`}>{i.severity}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Per-card breakdown */}
      {accounts.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-800 mb-3 flex items-center gap-2">
            <Banknote size={14} className="text-emerald-600" /> Cost per card — {summary.periodLabel}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">Card</th>
                  <th className="px-3 py-2 text-right">Interest paid</th>
                  <th className="px-3 py-2 text-right">Fees paid</th>
                  <th className="px-3 py-2 text-right">Payments made</th>
                  <th className="px-3 py-2 text-right">Purchases</th>
                  <th className="px-3 py-2 text-right">APR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {accounts.map(a => (
                  <tr key={a.key} className="hover:bg-gray-50/60">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {a.issuer}
                      {a.account_last4 && <span className="ml-2 font-mono text-xs text-indigo-700">••{a.account_last4}</span>}
                      <span className="ml-2 text-[10px] text-gray-400">{a.statementCount} stmt{a.statementCount === 1 ? '' : 's'}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-orange-700 font-semibold">${a.totalInterest.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-700 font-semibold">${a.totalFees.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono text-sky-700">${a.totalPayments.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono text-rose-700">${a.totalPurchases.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-xs text-gray-600">{a.latestApr != null ? `${Number(a.latestApr).toFixed(2)}%` : '—'}</td>
                  </tr>
                ))}
                <tr className="bg-emerald-50/40 font-bold border-t-2 border-emerald-200">
                  <td className="px-3 py-2 text-emerald-900">Total</td>
                  <td className="px-3 py-2 text-right font-mono text-orange-800">${summary.totalInterest.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-800">${summary.totalFees.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono text-sky-800">${summary.totalPayments.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono text-rose-800">${summary.totalPurch.toFixed(2)}</td>
                  <td className="px-3 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Score breakdown */}
      {reasons.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">How the score is calculated</h3>
          <p className="text-xs text-gray-500 mb-3">Starts at 100. Penalties for interest / fees / debt growth. Bonuses for paying it down.</p>
          <ul className="space-y-1.5">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                <span className="text-gray-700">{r.why}</span>
                <span className={`font-mono font-bold ${r.label.startsWith('+') ? 'text-emerald-700' : r.label.startsWith('-') ? 'text-rose-700' : 'text-gray-600'}`}>{r.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {accounts.length === 0 && (
        <div className="card py-12 text-center">
          <GuacMascot expression="sitting" size={64} />
          <p className="mt-3 font-semibold text-gray-700">Upload a statement to wake the wizard</p>
          <Link href="/bank" className="btn-primary text-sm mt-3 inline-flex">Go to Bank</Link>
        </div>
      )}
    </div>
  )
}

const TILE_TONE = {
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-800',     icon: 'text-sky-600',     border: 'border-sky-100' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-800',  icon: 'text-orange-600',  border: 'border-orange-200' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-800',   icon: 'text-amber-600',   border: 'border-amber-200' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-800',    icon: 'text-rose-600',    border: 'border-rose-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-800', icon: 'text-emerald-600', border: 'border-emerald-100' },
}
function Tile({ icon: Icon, tone, label, value, bold }) {
  const t = TILE_TONE[tone] || TILE_TONE.sky
  return (
    <div className={`stat-card border ${t.border} ${t.bg}`}>
      <div className={`p-3 rounded-xl bg-white shadow-sm`}><Icon size={20} className={t.icon} /></div>
      <div className="min-w-0">
        <p className={`text-[10px] uppercase tracking-wider font-bold ${t.text} opacity-80`}>{label}</p>
        <p className={`${bold ? 'text-2xl font-extrabold' : 'text-xl font-bold'} ${t.text}`}>${Number(value || 0).toFixed(2)}</p>
      </div>
    </div>
  )
}

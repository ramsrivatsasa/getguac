'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { generateInsights } from '../../../lib/financeInsights'
import { computeWizardScore } from '../../../lib/wizardScore'
import { useBankData } from '../../../lib/useBankData'
import { periodStartDate, timeframeLabel } from '../../../lib/timeframe'
import { useStore } from '../../../store'
import GuacMascot from '../../../components/GuacMascot'
import FeatureHeader from '../../../components/FeatureHeader'
import LottieAnimation from '../../../components/LottieAnimation'
import emptyListLottie from '../../../lottie/empty-list.json'
import TimeframePicker from '../../../components/TimeframePicker'
import { CountUp, FadeUpStagger } from '../../../components/animated'
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

// GuacWizard health score is computed in lib/wizardScore.js so the
// dashboard tile and this page never drift. Don't redefine it here.

export default function GuacWizardPage() {
  // Time-frame inherited from the dashboard's selector via the
  // shared Zustand store (persisted to localStorage). The dashboard
  // is the single edit surface — this page reads the (period,
  // count) tuple and displays the current label inline.
  const { spendingPeriod, spendingPeriodCount } = useStore()
  const since = periodStartDate(spendingPeriod, spendingPeriodCount)
  const tfLabel = timeframeLabel(spendingPeriod, spendingPeriodCount)

  // All bank queries (statements / fees / transactions) come through
  // the shared useBankData hook so the dashboard tile and this page
  // run identical math against identical row orderings.
  const { statements, fees, transactions, isLoading } = useBankData()

  // While the bank queries are in flight, skip generateInsights —
  // empty arrays would trip computeWizardScore's accounts.length=0
  // baseline (50) and flash a wrong score before the real data lands.
  const result = useMemo(
    () => isLoading ? null : generateInsights({ statements, fees, transactions }, since),
    [statements, fees, transactions, since, isLoading]
  )
  const { insights = [], summary = { totalPayments: 0, totalInterest: 0, totalFees: 0, totalPurch: 0, totalRefunds: 0, netDebtChange: 0 }, accounts = [] } = result || {}
  const { score, reasons } = useMemo(
    () => result ? computeWizardScore(result) : { score: null, reasons: [] },
    [result]
  )

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Wizard header — standard FeatureHeader layout (matches Guacanomics):
          no card background, mascot + title + subtitle, score on the right. */}
      <FeatureHeader
        theme="wizard"
        title={<span className="flex items-center gap-2">GuacWizard <Sparkles size={20} className="text-amber-500 shrink-0" /></span>}
        subtitle="Your money sage. Reads every statement, calls out every leak."
        action={
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">Wizard score</p>
            <p className="text-4xl font-black text-emerald-900 leading-none">
              <CountUp value={Number(score) || 0} duration={680} from={0} />
              <span className="text-base font-bold opacity-60"> / 100</span>
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">{tfLabel}</p>
          </div>
        }
      />

      {/* Standard time-frame picker — syncs across pages via the store. */}
      <TimeframePicker />

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
          <div className="card py-10 text-center text-gray-500 flex flex-col items-center gap-3">
            <LottieAnimation data={emptyListLottie} size={140} fallback="😴" />
            <p className="mt-2">Nothing to report for this period. Try a longer window.</p>
          </div>
        ) : (
          // Staggered fade-up — each insight lands 45ms after the
          // previous so the wizard "writes" its findings instead of
          // dumping them all at once.
          <FadeUpStagger inline delayMs={50}>
          {insights.map(i => {
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
          })}
          </FadeUpStagger>
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

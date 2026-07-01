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
import TimeframePicker from '../../../components/TimeframePicker'
import { CountUp, FadeUpStagger } from '../../../components/animated'
import { Banknote, Sparkles } from 'lucide-react'

// Money figures render with thousands separators + 2 dp and a leading $ —
// matching the mockup (Bricolage display font via .gg-num, neutral ink).
const fmtMoney = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const SEVERITY_STYLE = {
  good:    { card: 'bg-[#F4FAF5] border-guac-line2',   label: 'text-guac-700',       badge: 'bg-[#DDF3E1]' },
  neutral: { card: 'bg-gray-50 border-gray-200',       label: 'text-gray-700',       badge: 'bg-gray-100' },
  watch:   { card: 'bg-[#FEFBEF] border-amber-100',    label: 'text-[#A07A1A]',      badge: 'bg-[#FCEFC7]' },
  warning: { card: 'bg-[#FFF6EF] border-orange-100',   label: 'text-[#B23C0C]',      badge: 'bg-[#FFE0CB]' },
  urgent:  { card: 'bg-[#FDF3F3] border-rose-200',     label: 'text-rose-700',       badge: 'bg-[#FBDADA]' },
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
        subtitle="Our money wizard 🪄 — one wave, no sneaky fee, charge, or leak survives the spell."
        action={
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-guac-700">Wizard score</p>
            <p className="gg-stat text-4xl leading-none">
              <CountUp value={Number(score) || 0} duration={680} from={0} />
              <span className="text-base font-bold text-guac-mist"> / 100</span>
            </p>
            <p className="text-[11px] text-guac-mist mt-0.5">{tfLabel}</p>
          </div>
        }
      />

      {/* Standard time-frame picker — syncs across pages via the store. */}
      <TimeframePicker />

      {/* Money-moved strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile emoji="💳" label="Payments made"    value={summary.totalPayments} />
        <Tile emoji="🪙" label="Interest paid"    value={summary.totalInterest} bold />
        <Tile emoji="⚠️" label="Fees paid"        value={summary.totalFees} bold />
        <Tile emoji="📈" label="Purchases"        value={summary.totalPurch} />
        <Tile emoji="📉" label="Refunds"          value={summary.totalRefunds} />
      </div>

      {/* Insights stream */}
      <div className="space-y-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-guac-700 flex items-center gap-2">
          <Sparkles size={14} className="text-amber-500" /> Insights
        </h2>
        {insights.length === 0 ? (
          <div className="card py-10 text-center text-gray-500 flex flex-col items-center gap-3">
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
                  <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center text-xl shrink-0 ${s.badge}`}>{i.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold ${s.label}`}>{i.title}</p>
                    {i.body && <p className="text-sm text-gray-700 mt-1">{i.body}</p>}
                    {i.action && (
                      <p className="text-xs text-guac-ink mt-2 font-semibold flex items-start gap-1">
                        <span className="text-guac-600">→</span> {i.action}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-white/70 ${s.label} shrink-0`}>{i.severity.toUpperCase()}</span>
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
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-guac-700 mb-3 flex items-center gap-2">
            <Banknote size={14} className="text-guac-600" /> Cost per card — {summary.periodLabel}
          </h2>
          <div className="overflow-x-auto">
            <table className="gg-tbl w-full text-sm">
              <thead className="border-b border-guac-line gg-colhead">
                <tr>
                  <th className="px-3 py-2 text-left">Card</th>
                  <th className="px-3 py-2 text-right">Interest paid</th>
                  <th className="px-3 py-2 text-right">Fees paid</th>
                  <th className="px-3 py-2 text-right">Payments made</th>
                  <th className="px-3 py-2 text-right">Purchases</th>
                  <th className="px-3 py-2 text-right">APR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-guac-line">
                {accounts.map(a => (
                  <tr key={a.key} className="hover:bg-guac-row">
                    <td className="px-3 py-2 font-semibold text-guac-ink">
                      {a.issuer}
                      {a.account_last4 && <span className="ml-2 text-xs font-medium text-guac-mist">••{a.account_last4}</span>}
                      <span className="ml-2 text-[10px] text-guac-mist">· {a.statementCount} stmt{a.statementCount === 1 ? '' : 's'}</span>
                    </td>
                    <td className="px-3 py-2 text-right gg-num font-bold text-guac-ink">{fmtMoney(a.totalInterest)}</td>
                    <td className="px-3 py-2 text-right gg-num text-guac-mist">{fmtMoney(a.totalFees)}</td>
                    <td className="px-3 py-2 text-right gg-num font-bold text-guac-ink">{fmtMoney(a.totalPayments)}</td>
                    <td className="px-3 py-2 text-right gg-num font-bold text-guac-ink">{fmtMoney(a.totalPurchases)}</td>
                    <td className="px-3 py-2 text-right gg-num text-xs text-guac-body">{a.latestApr != null ? `${Number(a.latestApr).toFixed(2)}%` : '—'}</td>
                  </tr>
                ))}
                <tr className="bg-guac-50/40 font-bold border-t-2 border-guac-line2">
                  <td className="px-3 py-2 text-guac-ink">Total</td>
                  <td className="px-3 py-2 text-right gg-num gg-stat text-sm text-guac-ink">{fmtMoney(summary.totalInterest)}</td>
                  <td className="px-3 py-2 text-right gg-num gg-stat text-sm text-guac-ink">{fmtMoney(summary.totalFees)}</td>
                  <td className="px-3 py-2 text-right gg-num gg-stat text-sm text-guac-ink">{fmtMoney(summary.totalPayments)}</td>
                  <td className="px-3 py-2 text-right gg-num gg-stat text-sm text-guac-ink">{fmtMoney(summary.totalPurch)}</td>
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
          <h3 className="gg-h3 mb-2">How the score is calculated</h3>
          <p className="text-xs text-gray-500 mb-3">Starts at 100. Penalties for interest / fees / debt growth. Bonuses for paying it down.</p>
          <ul className="space-y-1.5">
            {reasons.map((r, i) => (
              <li key={i} className={`flex items-center justify-between text-[13.5px] rounded-xl px-4 py-3 ${r.label.startsWith('-') ? 'bg-rose-50' : r.label.startsWith('+') ? 'bg-guac-50' : 'bg-gray-50'}`}>
                <span className="font-semibold text-guac-ink">{r.why}</span>
                <span className={`gg-num gg-stat text-sm ${r.label.startsWith('+') ? 'text-guac-700' : r.label.startsWith('-') ? 'text-rose-600' : 'text-gray-600'}`}>{r.label}</span>
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

function Tile({ emoji, label, value, bold }) {
  return (
    <div className="stat-card bg-white border rounded-[18px]" style={{ borderColor: 'rgba(20,83,45,.1)' }}>
      <div className="text-2xl leading-none shrink-0">{emoji}</div>
      <div className="min-w-0">
        <p className="text-[10.5px] uppercase tracking-[0.06em] font-extrabold text-guac-label">{label}</p>
        <p className="gg-stat gg-num text-[22px] text-guac-ink">{fmtMoney(value)}</p>
      </div>
    </div>
  )
}

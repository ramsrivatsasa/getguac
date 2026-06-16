'use client'
// Plan & forecast — a CalcXML-style calculators hub: left nav (categories +
// calculators), the selected calculator in the middle, an ad rail on the right.
// Each calculator is config-driven ({fields, compute}) and gets a Guac-AI
// strategy (current US tax benefits, pros/cons, motivation) with built-in
// guidance as fallback. Saving requires a profile (auth user_metadata).

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '../lib/supabase/client'
import AdSlot from './AdSlot'
import {
  PiggyBank, HeartPulse, GraduationCap, Umbrella, Save, Check, Loader2, Sparkles, BookOpen,
  Home, Car, CreditCard, Landmark, TrendingUp, Target, Wallet, Scale,
} from 'lucide-react'

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`
const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`
const isSet = (v) => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v))

// ── finance helpers ──────────────────────────────────────────────────────
function fv(present, monthly, annualRatePct, years) {
  const i = (annualRatePct / 100) / 12, n = years * 12
  if (n <= 0) return present
  if (i === 0) return present + monthly * n
  return present * Math.pow(1 + i, n) + monthly * ((Math.pow(1 + i, n) - 1) / i)
}
function pmtNeeded(target, present, annualRatePct, years) {
  const i = (annualRatePct / 100) / 12, n = years * 12
  if (n <= 0) return Math.max(0, target - present)
  const remaining = Math.max(0, target - present * Math.pow(1 + i, n))
  if (i === 0) return remaining / n
  return remaining * i / (Math.pow(1 + i, n) - 1)
}
function loanPayment(principal, annualRatePct, years) {
  const i = (annualRatePct / 100) / 12, n = years * 12
  if (n <= 0) return principal
  if (i === 0) return principal / n
  return principal * i / (1 - Math.pow(1 + i, -n))
}
function yearsToReach(present, monthly, annualRatePct, target) {
  if (present >= target) return 0
  let y = 0
  while (y < 100 && fv(present, monthly, annualRatePct, y) < target) y += 1 / 12
  return y
}

const CATEGORIES = ['Retirement', 'Family', 'Save & invest', 'Debt & loans', 'Home']

const CALCS = [
  // ── Retirement ──
  {
    id: 'retirement', cat: 'Retirement', icon: PiggyBank, title: 'Retirement', subtitle: 'Will your nest egg cover it?',
    aiGoal: 'saving for retirement',
    fields: [
      { key: 'age', label: 'Current age', placeholder: '35' },
      { key: 'retire', label: 'Retire at', placeholder: '65' },
      { key: 'savings', label: 'Saved so far', prefix: '$', step: 1000, placeholder: '40,000' },
      { key: 'monthly', label: 'Save / month', prefix: '$', step: 50, placeholder: '600' },
      { key: 'income', label: 'Income you want / yr', prefix: '$', step: 1000, placeholder: '60,000' },
      { key: 'ret', label: 'Return / yr', suffix: '%', step: 0.5, placeholder: '6' },
    ],
    validate: (v) => v.retire > v.age || 'Retirement age should be above your current age.',
    compute: (v) => {
      const years = Math.max(0, v.retire - v.age)
      const projected = fv(v.savings, v.monthly, v.ret, years)
      const contributions = v.savings + v.monthly * 12 * years
      const target = v.income * 25
      const onTrack = projected >= target
      const extra = onTrack ? 0 : Math.max(0, pmtNeeded(target, v.savings, v.ret, years) - v.monthly)
      return {
        tone: onTrack ? 'ok' : 'warn',
        headline: (<>
          <p>At {v.retire}: ~<b className="text-emerald-800">{money(projected)}</b> · you’d want ~<b>{money(target)}</b> (25× your {money(v.income)}/yr).</p>
          {onTrack ? <p className="mt-1 font-bold text-emerald-700">✅ On track — and so much of it is growth.</p>
                   : <p className="mt-1 font-bold text-amber-700">~{money(extra)}/mo closes the gap. Totally doable.</p>}
        </>),
        insights: [
          `💸 ~${money(Math.max(0, projected - contributions))} of that is pure growth — you only put in ${money(contributions)}.`,
          `🏦 Grab your full 401(k) match first (instant 100% return), then a Roth IRA grows 100% tax-free.`,
          `📈 Even $100/mo more compounds into thousands by ${v.retire}.`,
        ],
      }
    },
    guide: ['Retirement saving wins on time, not heroics — early dollars compound for decades. The 25× rule pairs with the 4% rule: 25× the income you want lets you draw ~4%/yr to last 30+ years.'],
    pros: ['Compounding favors early dollars', '401(k) match is free money', 'Tax-advantaged accounts cut taxes', 'Automatic — set and forget'],
    cons: ['Locked until ~59½', 'Market dips near retirement sting', 'Inflation erodes fixed income', 'Easy to under-save for years'],
  },
  {
    id: 'million', cat: 'Retirement', icon: Target, title: 'Save $1 million', subtitle: 'How long to seven figures',
    aiGoal: 'reaching a $1,000,000 savings milestone',
    fields: [
      { key: 'savings', label: 'Saved so far', prefix: '$', step: 1000, placeholder: '25,000' },
      { key: 'monthly', label: 'Save / month', prefix: '$', step: 50, placeholder: '700' },
      { key: 'ret', label: 'Return / yr', suffix: '%', step: 0.5, placeholder: '7' },
    ],
    validate: (v) => v.monthly > 0 || 'Add a monthly amount.',
    compute: (v) => {
      const years = yearsToReach(v.savings, v.monthly, v.ret, 1000000)
      const reach = years >= 100 ? null : years
      return {
        tone: 'ok',
        headline: reach == null
          ? <p>At this pace it’s a long road — nudge the monthly up and watch it shrink fast.</p>
          : <p>You hit <b className="text-emerald-800">$1,000,000</b> in ~<b>{reach.toFixed(1)} years</b>. 🎉</p>,
        insights: [
          `📈 The last few years do the most — compounding accelerates as the balance grows.`,
          `💪 Bumping the monthly even a little can cut years off the timeline.`,
        ],
      }
    },
  },
  // ── Family ──
  {
    id: 'college', cat: 'Family', icon: GraduationCap, title: 'College fund', subtitle: 'Save up for tuition',
    aiGoal: "saving for a child's college with a 529 plan",
    fields: [
      { key: 'childAge', label: 'Child’s age', placeholder: '5' },
      { key: 'startAge', label: 'Starts college at', placeholder: '18' },
      { key: 'cost', label: 'Target cost (total)', prefix: '$', step: 5000, placeholder: '120,000' },
      { key: 'savings', label: 'Saved so far', prefix: '$', step: 1000, placeholder: '8,000' },
      { key: 'ret', label: 'Return / yr', suffix: '%', step: 0.5, placeholder: '5' },
    ],
    validate: (v) => v.startAge > v.childAge || 'College-start age should be above the child’s age.',
    compute: (v) => {
      const years = Math.max(0, v.startAge - v.childAge)
      const need = pmtNeeded(v.cost, v.savings, v.ret, years)
      return {
        tone: 'ok',
        headline: <p>Save ~<b className="text-emerald-800">{money(need)}/mo</b> for {years} years to reach <b>{money(v.cost)}</b>.</p>,
        insights: [`🎓 A 529 plan grows tax-free for education — many states add a tax deduction.`, `⏱️ Starting now is the cheapest it’ll ever be.`],
      }
    },
    guide: ['Tuition inflates ~5%/yr, so target a future number. A 529 is the default tool: tax-free growth for qualified education.'],
    pros: ['Tax-free growth for education', 'Possible state tax deduction', 'High limits', 'Change beneficiary anytime'],
    cons: ['Non-education use: tax + 10% penalty', 'Slight financial-aid impact', 'Limited investments', 'Overfunding risk'],
  },
  {
    id: 'healthcare', cat: 'Family', icon: HeartPulse, title: 'Healthcare in retirement', subtitle: 'The cost most people miss',
    aiGoal: 'saving for healthcare costs in retirement with an HSA',
    fields: [
      { key: 'age', label: 'Current age', placeholder: '40' },
      { key: 'retire', label: 'Retire at', placeholder: '65' },
      { key: 'life', label: 'Live to', placeholder: '88' },
      { key: 'annual', label: 'Healthcare / yr', prefix: '$', step: 500, placeholder: '7,000' },
      { key: 'ret', label: 'Return / yr', suffix: '%', step: 0.5, placeholder: '5' },
    ],
    validate: (v) => (v.life > v.retire && v.retire >= v.age) || 'Check the ages.',
    compute: (v) => {
      const yrs = Math.max(0, v.life - v.retire)
      const total = v.annual * yrs
      const monthly = pmtNeeded(total, 0, v.ret, Math.max(0, v.retire - v.age))
      return {
        tone: 'ok',
        headline: <p>~<b className="text-emerald-800">{money(total)}</b> across {yrs} retirement years. Set aside ~<b>{money(monthly)}/mo</b> until {v.retire}.</p>,
        insights: [`🏥 An HSA is triple tax-advantaged — the #1 account for this.`, `👵 Fidelity estimates a 65-yr-old couple needs ~$315k for healthcare alone.`],
      }
    },
    guide: ['Medicare starts at 65 but skips dental, vision, and long-term care. The HSA is the most tax-efficient way to prepare — pre-tax in, tax-free growth, tax-free for medical.'],
    pros: ['HSA triple tax advantage', 'Funds roll over', 'Becomes an IRA after 65', 'Invest for growth'],
    cons: ['Needs a high-deductible plan', 'Contribution limits', 'Penalty for non-medical pre-65', 'Costs are unpredictable'],
  },
  // ── Save & invest ──
  {
    id: 'emergency', cat: 'Save & invest', icon: Umbrella, title: 'Emergency fund', subtitle: 'Your safety net',
    aiGoal: 'building an emergency fund',
    fields: [
      { key: 'expenses', label: 'Monthly expenses', prefix: '$', step: 100, placeholder: '3,500' },
      { key: 'months', label: 'Months of cushion', placeholder: '6' },
      { key: 'savings', label: 'Saved so far', prefix: '$', step: 500, placeholder: '4,000' },
      { key: 'fillMonths', label: 'Fill it in (months)', placeholder: '12' },
    ],
    validate: () => true,
    compute: (v) => {
      const target = v.expenses * v.months
      const gap = Math.max(0, target - v.savings)
      const monthly = v.fillMonths > 0 ? gap / v.fillMonths : gap
      const done = gap <= 0
      const p = target > 0 ? Math.min(100, Math.round((v.savings / target) * 100)) : 0
      return {
        tone: done ? 'ok' : 'warn',
        headline: <p>Goal: <b>{money(target)}</b> ({v.months} mo).{' '}{done ? <b className="text-emerald-700">✅ Fully funded!</b> : <>You’re <b>{p}% there</b> — ~<b className="text-emerald-800">{money(monthly)}/mo</b> finishes it.</>}</p>,
        insights: [`🏦 Keep it in a high-yield savings account (~4–5% APY), not checking.`, `⚡ Automate the transfer on payday so it fills itself.`],
      }
    },
    guide: ['An emergency fund keeps a job loss or medical bill from becoming debt. 3 months if income’s steady, 6+ if variable. Keep it liquid in a HYSA.'],
    pros: ['Instant access', 'FDIC-insured', '~4–5% APY in a HYSA', 'Stops emergencies becoming debt'],
    cons: ['Lags investing returns', 'Inflation erodes idle cash', 'Tempting to dip in', 'Too large = lazy money'],
  },
  {
    id: 'savings-goal', cat: 'Save & invest', icon: Wallet, title: 'Savings goal', subtitle: 'Hit any number',
    aiGoal: 'saving toward a specific dollar goal',
    fields: [
      { key: 'goal', label: 'Goal amount', prefix: '$', step: 500, placeholder: '20,000' },
      { key: 'savings', label: 'Saved so far', prefix: '$', step: 500, placeholder: '2,000' },
      { key: 'years', label: 'In how many years', placeholder: '3' },
      { key: 'ret', label: 'Return / yr', suffix: '%', step: 0.5, placeholder: '4' },
    ],
    validate: (v) => v.years > 0 || 'Add a timeframe.',
    compute: (v) => {
      const need = pmtNeeded(v.goal, v.savings, v.ret, v.years)
      return { tone: 'ok', headline: <p>Save ~<b className="text-emerald-800">{money(need)}/mo</b> for {v.years} years to reach <b>{money(v.goal)}</b>.</p>,
        insights: [`📈 A high-yield account or index fund makes the goal arrive sooner.`, `🎯 Automating the monthly transfer is the single biggest predictor of hitting it.`] }
    },
  },
  {
    id: 'invest-growth', cat: 'Save & invest', icon: TrendingUp, title: 'Investment growth', subtitle: 'Watch it compound',
    aiGoal: 'growing an investment over time',
    fields: [
      { key: 'start', label: 'Starting amount', prefix: '$', step: 1000, placeholder: '10,000' },
      { key: 'monthly', label: 'Add / month', prefix: '$', step: 50, placeholder: '300' },
      { key: 'years', label: 'For how many years', placeholder: '20' },
      { key: 'ret', label: 'Return / yr', suffix: '%', step: 0.5, placeholder: '7' },
    ],
    validate: (v) => v.years > 0 || 'Add a timeframe.',
    compute: (v) => {
      const end = fv(v.start, v.monthly, v.ret, v.years)
      const put = v.start + v.monthly * 12 * v.years
      return { tone: 'ok', headline: <p>In {v.years} years: ~<b className="text-emerald-800">{money(end)}</b> — you put in {money(put)}, growth added <b>{money(Math.max(0, end - put))}</b>.</p>,
        insights: [`🪄 That growth is compounding — returns earning returns.`, `🛡️ A tax-advantaged account (Roth IRA / 401k) keeps more of it yours.`] }
    },
  },
  // ── Debt & loans ──
  {
    id: 'mortgage', cat: 'Debt & loans', icon: Landmark, title: 'Mortgage payment', subtitle: 'Monthly principal & interest',
    aiGoal: 'taking on or managing a mortgage',
    fields: [
      { key: 'amount', label: 'Loan amount', prefix: '$', step: 5000, placeholder: '350,000' },
      { key: 'rate', label: 'Interest rate', suffix: '%', step: 0.125, placeholder: '6.5' },
      { key: 'years', label: 'Term (years)', placeholder: '30' },
    ],
    validate: (v) => v.years > 0 || 'Add a term.',
    compute: (v) => {
      const m = loanPayment(v.amount, v.rate, v.years)
      const total = m * v.years * 12
      return { tone: 'ok', headline: <p>~<b className="text-emerald-800">{money(m)}/mo</b> (P&I). Over {v.years} yrs you’ll pay <b>{money(total)}</b> — {money(total - v.amount)} of it interest.</p>,
        insights: [`🏦 A 15-year term costs more monthly but saves a fortune in interest.`, `💡 One extra payment a year can shave years off the loan.`] }
    },
  },
  {
    id: 'auto-loan', cat: 'Debt & loans', icon: Car, title: 'Auto loan', subtitle: 'Car payment',
    aiGoal: 'financing a car',
    fields: [
      { key: 'amount', label: 'Loan amount', prefix: '$', step: 1000, placeholder: '30,000' },
      { key: 'rate', label: 'Interest rate', suffix: '%', step: 0.25, placeholder: '7' },
      { key: 'years', label: 'Term (years)', placeholder: '5' },
    ],
    validate: (v) => v.years > 0 || 'Add a term.',
    compute: (v) => {
      const m = loanPayment(v.amount, v.rate, v.years)
      const total = m * v.years * 12
      return { tone: 'ok', headline: <p>~<b className="text-emerald-800">{money(m)}/mo</b>. Total cost <b>{money(total)}</b> ({money(total - v.amount)} interest).</p>,
        insights: [`🚗 Shorter terms = less interest and you’re never “upside down”.`, `💡 A bigger down payment cuts both the payment and the interest.`] }
    },
  },
  {
    id: 'credit-card', cat: 'Debt & loans', icon: CreditCard, title: 'Credit-card payoff', subtitle: 'Crush the balance',
    aiGoal: 'paying off credit-card debt',
    fields: [
      { key: 'balance', label: 'Balance', prefix: '$', step: 100, placeholder: '6,000' },
      { key: 'apr', label: 'APR', suffix: '%', step: 0.5, placeholder: '24' },
      { key: 'payment', label: 'Pay / month', prefix: '$', step: 25, placeholder: '300' },
    ],
    validate: (v) => v.payment > 0 || 'Add a monthly payment.',
    compute: (v) => {
      const i = (v.apr / 100) / 12
      const minInterest = v.balance * i
      if (v.payment <= minInterest) {
        return { tone: 'warn', headline: <p className="font-bold text-amber-700">At {money(v.payment)}/mo you barely dent it — the interest is ~{money(minInterest)}/mo. Pay more to actually make progress.</p>,
          insights: [`🔥 Above the interest is the only way the balance falls.`, `💳 A 0% balance-transfer card can pause interest while you attack the principal.`] }
      }
      const months = Math.ceil(-Math.log(1 - (v.balance * i) / v.payment) / Math.log(1 + i))
      const totalInterest = v.payment * months - v.balance
      return { tone: 'ok', headline: <p>Debt-free in ~<b className="text-emerald-800">{months} months</b> ({(months / 12).toFixed(1)} yrs). Interest paid: <b>{money(totalInterest)}</b>.</p>,
        insights: [`💳 A 0% balance-transfer offer could wipe out most of that ${money(totalInterest)} interest.`, `⚡ Every extra $50/mo gets you free months sooner.`] }
    },
  },
  {
    id: 'dti', cat: 'Debt & loans', icon: Scale, title: 'Debt-to-income', subtitle: 'How lenders see you',
    aiGoal: 'understanding and improving a debt-to-income ratio',
    fields: [
      { key: 'debt', label: 'Monthly debt payments', prefix: '$', step: 50, placeholder: '1,200' },
      { key: 'income', label: 'Gross monthly income', prefix: '$', step: 100, placeholder: '6,000' },
    ],
    validate: (v) => v.income > 0 || 'Add your income.',
    compute: (v) => {
      const ratio = (v.debt / v.income) * 100
      const good = ratio <= 36
      return { tone: good ? 'ok' : 'warn', headline: <p>Your DTI is <b className={good ? 'text-emerald-800' : 'text-amber-700'}>{pct(ratio)}</b>. {good ? 'Lenders love under 36%. ✅' : 'Aim for under 36% to qualify easily.'}</p>,
        insights: [`🏦 Under 36% (and housing under 28%) is the lender sweet spot.`, `📉 Paying down a card or two is the fastest way to drop this.`] }
    },
  },
  // ── Home ──
  {
    id: 'afford-home', cat: 'Home', icon: Home, title: 'Home affordability', subtitle: 'What you can buy',
    aiGoal: 'figuring out how much house they can afford',
    fields: [
      { key: 'income', label: 'Annual income', prefix: '$', step: 1000, placeholder: '90,000' },
      { key: 'down', label: 'Down payment', prefix: '$', step: 5000, placeholder: '40,000' },
      { key: 'rate', label: 'Mortgage rate', suffix: '%', step: 0.125, placeholder: '6.5' },
      { key: 'debts', label: 'Other monthly debts', prefix: '$', step: 50, placeholder: '400' },
    ],
    validate: (v) => v.income > 0 || 'Add your income.',
    compute: (v) => {
      const monthlyIncome = v.income / 12
      const maxTotal = monthlyIncome * 0.36 - v.debts
      const maxHousing = Math.min(monthlyIncome * 0.28, maxTotal)
      const maxPI = Math.max(0, maxHousing * 0.8) // leave ~20% for taxes/insurance
      const i = (v.rate / 100) / 12, n = 360
      const loan = i > 0 ? maxPI * (1 - Math.pow(1 + i, -n)) / i : maxPI * n
      const price = loan + v.down
      return { tone: 'ok', headline: <p>You can likely afford a home around <b className="text-emerald-800">{money(price)}</b> (~{money(maxHousing)}/mo all-in).</p>,
        insights: [`🏠 Lenders use the 28/36 rule — housing ≤28% of income, all debt ≤36%.`, `💡 A bigger down payment or a lower rate stretches your budget further.`] }
    },
  },
]

export default function PlanCalculators() {
  const [authed, setAuthed] = useState(null)
  const [saved, setSaved] = useState({})
  const [selId, setSelId] = useState(CALCS[0].id)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      const u = data?.user
      setAuthed(!!u)
      if (u?.user_metadata) {
        const sp = {}
        for (const c of CALCS) { const v = u.user_metadata[`gg_plan_${c.id}`]; if (v && typeof v === 'object') sp[c.id] = v }
        setSaved(sp)
      }
    }).catch(() => setAuthed(false))
  }, [])

  // Deep-link from an article: /plan#mortgage preselects that calculator.
  useEffect(() => {
    const h = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : ''
    if (h && CALCS.some((c) => c.id === h)) setSelId(h)
  }, [])

  async function onSave(id, vals) {
    const sb = createClient()
    const { error } = await sb.auth.updateUser({ data: { [`gg_plan_${id}`]: vals } })
    if (error) throw error
  }

  const selected = CALCS.find((c) => c.id === selId) || CALCS[0]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* Motivation — slim strip */}
      <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-lime-500 text-white px-4 py-2 text-center shadow-sm mb-3">
        <p className="font-bold text-sm">🌱 Every dollar you save today is future-you saying thank you — pick a calculator and take one step.</p>
      </div>

      <div className="lg:grid lg:grid-cols-[210px_1fr_180px] lg:gap-5">
        {/* Left nav */}
        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-3">
            {CATEGORIES.map((cat) => (
              <div key={cat}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/70 px-2 mb-1">{cat}</div>
                <div className="space-y-0.5">
                  {CALCS.filter((c) => c.cat === cat).map((c) => {
                    const Icon = c.icon
                    const active = c.id === selId
                    return (
                      <button key={c.id} onClick={() => setSelId(c.id)}
                        className={`w-full text-left text-sm rounded-lg px-2 py-1.5 inline-flex items-center gap-2 transition-colors ${active ? 'bg-emerald-100 text-emerald-900 font-bold' : 'text-gray-600 hover:bg-emerald-50'}`}>
                        <Icon size={14} className={active ? 'text-emerald-700' : 'text-gray-400'} /> {c.title}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Center: selected calculator (+ mobile picker) */}
        <div className="min-w-0">
          <select value={selId} onChange={(e) => setSelId(e.target.value)}
            className="lg:hidden w-full mb-3 input rounded-lg border border-gray-200 px-3 py-2 text-sm">
            {CATEGORIES.map((cat) => (
              <optgroup key={cat} label={cat}>
                {CALCS.filter((c) => c.cat === cat).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </optgroup>
            ))}
          </select>
          <Calculator key={selected.id} {...selected} authed={authed} savedVals={saved[selected.id]} onSave={onSave} />
          <p className="text-[11px] text-gray-400 text-center pt-3">Estimates &amp; general guidance — not personalized financial advice.</p>
        </div>

        {/* Right ad rail */}
        <aside className="hidden lg:block">
          <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RIGHT || ''} format="vertical" minHeight={600} className="sticky top-20" />
        </aside>
      </div>
    </div>
  )
}

function Calculator({ id, icon: Icon, title, subtitle, fields, validate, compute, guide, pros, cons, aiGoal, authed, savedVals, onSave }) {
  const [vals, setVals] = useState({})
  const [planned, setPlanned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [ai, setAi] = useState({ status: 'idle', data: null })
  const touched = useRef(false)

  useEffect(() => {
    if (savedVals && !touched.current) {
      setVals(savedVals)
      if (fields.every((f) => isSet(savedVals[f.key]))) setPlanned(true)
      setSavedOk(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedVals])

  const set = (k) => (val) => { touched.current = true; setVals((p) => ({ ...p, [k]: val })); setPlanned(false); setSavedOk(false) }
  const allSet = fields.every((f) => isSet(vals[f.key]))
  const check = allSet ? (validate ? validate(vals) : true) : false
  const valid = check === true
  const result = planned && valid ? compute(vals) : null

  async function save() {
    if (!authed) return
    setSaving(true)
    try { await onSave(id, vals); setSavedOk(true) } catch { /* */ } finally { setSaving(false) }
  }
  async function fetchAI(v) {
    setAi({ status: 'loading', data: null })
    try {
      const res = await fetch('/api/plan-strategy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ calc: id, goal: aiGoal, inputs: v }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'failed')
      setAi({ status: 'done', data })
    } catch { setAi({ status: 'error', data: null }) }
  }
  function planIt() {
    setPlanned(true)
    if (fields.every((f) => isSet(vals[f.key])) && (validate ? validate(vals) === true : true)) fetchAI(vals)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Icon size={20} /></div>
        <div>
          <h2 className="font-black text-gray-900 leading-tight text-lg">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="text-[11px] font-semibold text-gray-500">{f.label}</span>
            <div className="mt-0.5 flex items-center rounded-lg border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-emerald-300 overflow-hidden">
              {f.prefix && <span className="pl-2.5 text-gray-400 text-sm">{f.prefix}</span>}
              <input type="number" inputMode="decimal" step={f.step || 1} min={0}
                value={vals[f.key] ?? ''} placeholder={f.placeholder}
                onChange={(e) => set(f.key)(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-sm outline-none bg-transparent placeholder:text-gray-300" />
              {f.suffix && <span className="pr-2.5 text-gray-400 text-sm">{f.suffix}</span>}
            </div>
          </label>
        ))}
      </div>

      <button onClick={planIt} disabled={!allSet} className="mt-3 w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
        {result ? 'Update plan' : 'Plan it'}
      </button>
      {planned && allSet && !valid && typeof check === 'string' && <p className="text-xs text-amber-600 mt-1.5">{check}</p>}

      {result && (
        <>
          <div className={`mt-3 rounded-xl bg-gradient-to-br ${result.tone === 'warn' ? 'from-amber-50 to-orange-50 border-amber-200' : 'from-emerald-50 to-lime-50 border-emerald-200'} border p-3 text-sm`}>
            {result.headline}
          </div>

          <div className="mt-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80 inline-flex items-center gap-1 mb-1"><Sparkles size={11} /> Guac-AI strategy</div>
            {ai.status === 'loading' ? (
              <p className="text-[12px] text-gray-400 inline-flex items-center gap-1.5"><Loader2 size={12} className="animate-spin text-emerald-500" /> Guac-AI is building your strategy…</p>
            ) : (
              <>
                <ul className="space-y-1.5">
                  {(ai.status === 'done' && ai.data?.strategies?.length ? ai.data.strategies : result.insights).map((t, i) => (
                    <li key={i} className="text-[12px] text-gray-600 leading-snug">{t}</li>
                  ))}
                </ul>
                {ai.status === 'done' && ai.data?.taxBenefits?.length > 0 && (
                  <div className="mt-2 rounded-lg bg-emerald-50/70 border border-emerald-100 p-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-0.5">Tax benefits</div>
                    <ul className="space-y-1">{ai.data.taxBenefits.map((t, i) => <li key={i} className="text-[11.5px] text-emerald-900/80 leading-snug">🏛️ {t}</li>)}</ul>
                  </div>
                )}
                {ai.status === 'done' && ai.data?.encouragement && <p className="text-[12px] text-emerald-700 font-semibold mt-2">💪 {ai.data.encouragement}</p>}
              </>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between min-h-[18px]">
            {authed ? (
              <>
                <span className="text-[11px] text-gray-400">{savedOk ? <span className="text-emerald-700 font-semibold inline-flex items-center gap-1"><Check size={12} /> Saved to your account</span> : 'Save these numbers?'}</span>
                <button onClick={save} disabled={saving} className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 disabled:opacity-50">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {savedOk ? 'Update' : 'Save'}
                </button>
              </>
            ) : authed === false ? (
              <span className="text-[11px] text-gray-400"><Link href="/register" className="text-emerald-700 font-bold hover:underline">Sign up free</Link> to save your plan.</span>
            ) : null}
          </div>
        </>
      )}

      {(guide || (ai.data?.pros?.length) || pros) && (
        <details className="mt-3 border-t border-gray-100 pt-2">
          <summary className="cursor-pointer text-xs font-bold text-emerald-700 inline-flex items-center gap-1 select-none"><BookOpen size={12} /> Strategy guide &amp; pros / cons</summary>
          <div className="mt-2 text-[12px] text-gray-600 space-y-2 leading-relaxed">
            {(guide || []).map((p, i) => <p key={i}>{p}</p>)}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">Pros</div>
                <ul className="space-y-1">{((ai.data?.pros?.length ? ai.data.pros : pros) || []).map((x, i) => <li key={i} className="flex gap-1.5"><span className="text-emerald-500 font-bold">＋</span><span>{x}</span></li>)}</ul>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">Watch-outs</div>
                <ul className="space-y-1">{((ai.data?.cons?.length ? ai.data.cons : cons) || []).map((x, i) => <li key={i} className="flex gap-1.5"><span className="text-amber-500 font-bold">－</span><span>{x}</span></li>)}</ul>
              </div>
            </div>
          </div>
        </details>
      )}
    </div>
  )
}

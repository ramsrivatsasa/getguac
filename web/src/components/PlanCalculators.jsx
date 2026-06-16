'use client'
// Plan & forecast — financial-goal calculators (PocketSmith/Origin-style).
// Flow: fields start EMPTY → user enters their own numbers → clicks "Plan it"
// → sees the projection → is asked if they want to save it (persisted to this
// device via localStorage, so it's pre-filled next time). Pure client math.

import { useState } from 'react'
import { PiggyBank, HeartPulse, GraduationCap, Umbrella, TrendingUp, Save, Check } from 'lucide-react'

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`
const isSet = (v) => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v))

function fv(present, monthly, annualRatePct, years) {
  const i = (annualRatePct / 100) / 12
  const n = years * 12
  if (n <= 0) return present
  if (i === 0) return present + monthly * n
  return present * Math.pow(1 + i, n) + monthly * ((Math.pow(1 + i, n) - 1) / i)
}
function pmtNeeded(target, present, annualRatePct, years) {
  const i = (annualRatePct / 100) / 12
  const n = years * 12
  if (n <= 0) return Math.max(0, target - present)
  const grown = present * Math.pow(1 + i, n)
  const remaining = Math.max(0, target - grown)
  if (i === 0) return remaining / n
  return remaining * i / (Math.pow(1 + i, n) - 1)
}

// Each calculator: its inputs + a validate (sanity) + compute (the result).
const CALCS = [
  {
    id: 'retirement', icon: PiggyBank, title: 'Retirement', subtitle: 'Will your nest egg cover it?',
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
      const target = v.income * 25
      const onTrack = projected >= target
      const extra = onTrack ? 0 : pmtNeeded(target, v.savings, v.ret, years) - v.monthly
      return {
        tone: onTrack ? 'ok' : 'warn',
        node: (
          <>
            <p>At {v.retire} you’ll have ~<b className="text-emerald-800">{money(projected)}</b>. To draw {money(v.income)}/yr you’d want ~<b>{money(target)}</b>.</p>
            {onTrack
              ? <p className="mt-1 font-bold text-emerald-700">✅ On track — you’re covered.</p>
              : <p className="mt-1 font-bold text-amber-700">Add ~{money(extra)}/mo to close the gap.</p>}
          </>
        ),
      }
    },
  },
  {
    id: 'college', icon: GraduationCap, title: 'College fund', subtitle: 'Save up for tuition',
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
      return { tone: 'ok', node: <p>Save ~<b className="text-emerald-800">{money(need)}/mo</b> for {years} years to reach <b>{money(v.cost)}</b>.</p> }
    },
  },
  {
    id: 'healthcare', icon: HeartPulse, title: 'Healthcare in retirement', subtitle: 'The cost most people miss',
    fields: [
      { key: 'age', label: 'Current age', placeholder: '40' },
      { key: 'retire', label: 'Retire at', placeholder: '65' },
      { key: 'life', label: 'Live to', placeholder: '88' },
      { key: 'annual', label: 'Healthcare / yr', prefix: '$', step: 500, placeholder: '7,000' },
      { key: 'ret', label: 'Return / yr', suffix: '%', step: 0.5, placeholder: '5' },
    ],
    validate: (v) => (v.life > v.retire && v.retire >= v.age) || 'Check the ages — retire after now, live past retirement.',
    compute: (v) => {
      const yearsInRetirement = Math.max(0, v.life - v.retire)
      const totalNeed = v.annual * yearsInRetirement
      const monthly = pmtNeeded(totalNeed, 0, v.ret, Math.max(0, v.retire - v.age))
      return { tone: 'ok', node: <p>~<b className="text-emerald-800">{money(totalNeed)}</b> across {yearsInRetirement} retirement years. Set aside ~<b>{money(monthly)}/mo</b> until {v.retire}.</p> }
    },
  },
  {
    id: 'emergency', icon: Umbrella, title: 'Emergency fund', subtitle: 'Your safety net',
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
      return {
        tone: done ? 'ok' : 'warn',
        node: <p>Goal: <b>{money(target)}</b> ({v.months} months).{' '}
          {done ? <b className="text-emerald-700">✅ Fully funded!</b> : <>You’re <b>{money(gap)}</b> short — save ~<b className="text-emerald-800">{money(monthly)}/mo</b>.</>}</p>,
      }
    },
  },
]

export default function PlanCalculators() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-gray-900 inline-flex items-center gap-2">
          <TrendingUp className="text-emerald-600" /> Plan &amp; forecast
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Enter your numbers, hit <b>Plan it</b>, and we’ll forecast the big stuff.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        {CALCS.map((c) => <Calculator key={c.id} {...c} />)}
      </div>
      <p className="text-[11px] text-gray-400 text-center pt-1">
        Estimates for planning only — not financial advice. Assumes steady returns; real markets vary.
      </p>
    </div>
  )
}

function Calculator({ id, icon: Icon, title, subtitle, fields, validate, compute }) {
  const KEY = `gg_plan_${id}`
  const initial = (() => {
    if (typeof window === 'undefined') return {}
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') return s } catch {}
    return {}
  })()
  const [vals, setVals] = useState(initial)
  const allInitial = fields.every((f) => isSet(initial[f.key]))
  const [planned, setPlanned] = useState(allInitial) // returning users see their saved plan
  const [saved, setSaved] = useState(false)

  const set = (k) => (val) => { setVals((p) => ({ ...p, [k]: val })); setPlanned(false); setSaved(false) }
  const allSet = fields.every((f) => isSet(vals[f.key]))
  const check = allSet ? (validate ? validate(vals) : true) : false
  const valid = check === true
  const result = planned && valid ? compute(vals) : null

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(vals)); setSaved(true) } catch { /* private mode */ }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Icon size={18} /></div>
        <div>
          <h3 className="font-black text-gray-900 leading-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="text-[11px] font-semibold text-gray-500">{f.label}</span>
            <div className="mt-0.5 flex items-center rounded-lg border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-emerald-300 overflow-hidden">
              {f.prefix && <span className="pl-2.5 text-gray-400 text-sm">{f.prefix}</span>}
              <input
                type="number" inputMode="decimal" step={f.step || 1} min={0}
                value={vals[f.key] ?? ''} placeholder={f.placeholder}
                onChange={(e) => set(f.key)(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-sm outline-none bg-transparent placeholder:text-gray-300"
              />
              {f.suffix && <span className="pr-2.5 text-gray-400 text-sm">{f.suffix}</span>}
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={() => setPlanned(true)}
        disabled={!allSet}
        className="mt-3 w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {result ? 'Update plan' : 'Plan it'}
      </button>

      {planned && allSet && !valid && typeof check === 'string' && (
        <p className="text-xs text-amber-600 mt-1.5">{check}</p>
      )}

      {result && (
        <>
          <div className={`mt-3 rounded-xl bg-gradient-to-br ${result.tone === 'warn' ? 'from-amber-50 to-orange-50 border-amber-200' : 'from-emerald-50 to-lime-50 border-emerald-200'} border p-3 text-sm`}>
            {result.node}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              {saved ? <span className="text-emerald-700 font-semibold inline-flex items-center gap-1"><Check size={12} /> Saved on this device</span> : 'Save these numbers for next time?'}
            </span>
            <button onClick={save} className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1">
              <Save size={12} /> {saved ? 'Update' : 'Save'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

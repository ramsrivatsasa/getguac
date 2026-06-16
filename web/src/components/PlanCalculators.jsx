'use client'
// Plan & forecast — financial-goal calculators (PocketSmith/Origin-style).
// Retirement, healthcare-in-retirement, college fund, and emergency fund.
// Pure client math; no data dependency, so it works for everyone immediately.

import { useState } from 'react'
import { PiggyBank, HeartPulse, GraduationCap, Umbrella, TrendingUp } from 'lucide-react'

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`

// Future value of a present sum plus monthly contributions.
function fv(present, monthly, annualRatePct, years) {
  const i = (annualRatePct / 100) / 12
  const n = years * 12
  if (n <= 0) return present
  if (i === 0) return present + monthly * n
  return present * Math.pow(1 + i, n) + monthly * ((Math.pow(1 + i, n) - 1) / i)
}

// Monthly contribution needed to reach `target` from `present` over `years`.
function pmtNeeded(target, present, annualRatePct, years) {
  const i = (annualRatePct / 100) / 12
  const n = years * 12
  if (n <= 0) return Math.max(0, target - present)
  const grownPresent = present * Math.pow(1 + i, n)
  const remaining = Math.max(0, target - grownPresent)
  if (i === 0) return remaining / n
  return remaining * i / (Math.pow(1 + i, n) - 1)
}

export default function PlanCalculators() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-gray-900 inline-flex items-center gap-2">
          <TrendingUp className="text-emerald-600" /> Plan &amp; forecast
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Project the big stuff — retirement, healthcare, college, a safety net.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Retirement />
        <College />
        <Healthcare />
        <Emergency />
      </div>
      <p className="text-[11px] text-gray-400 text-center pt-1">
        Estimates for planning only — not financial advice. Assumes steady returns; real markets vary.
      </p>
    </div>
  )
}

function Card({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Icon size={18} /></div>
        <div>
          <h3 className="font-black text-gray-900 leading-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, prefix, suffix, step = 1, min = 0 }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-gray-500">{label}</span>
      <div className="mt-0.5 flex items-center rounded-lg border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-emerald-300 overflow-hidden">
        {prefix && <span className="pl-2.5 text-gray-400 text-sm">{prefix}</span>}
        <input
          type="number" inputMode="decimal" step={step} min={min} value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full px-2.5 py-1.5 text-sm outline-none bg-transparent"
        />
        {suffix && <span className="pr-2.5 text-gray-400 text-sm">{suffix}</span>}
      </div>
    </label>
  )
}

function Result({ children, tone = 'ok' }) {
  const c = tone === 'warn' ? 'from-amber-50 to-orange-50 border-amber-200' : 'from-emerald-50 to-lime-50 border-emerald-200'
  return <div className={`mt-3 rounded-xl bg-gradient-to-br ${c} border p-3 text-sm`}>{children}</div>
}

function Retirement() {
  const [age, setAge] = useState(35)
  const [retire, setRetire] = useState(65)
  const [savings, setSavings] = useState(40000)
  const [monthly, setMonthly] = useState(600)
  const [income, setIncome] = useState(60000)
  const [ret, setRet] = useState(6)
  const years = Math.max(0, retire - age)
  const projected = fv(savings, monthly, ret, years)
  const target = income * 25 // 4% rule
  const onTrack = projected >= target
  const extra = onTrack ? 0 : pmtNeeded(target, savings, ret, years) - monthly
  return (
    <Card icon={PiggyBank} title="Retirement" subtitle="Will your nest egg cover it?">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Current age" value={age} onChange={setAge} />
        <Field label="Retire at" value={retire} onChange={setRetire} />
        <Field label="Saved so far" value={savings} onChange={setSavings} prefix="$" step={1000} />
        <Field label="Save / month" value={monthly} onChange={setMonthly} prefix="$" step={50} />
        <Field label="Income you want / yr" value={income} onChange={setIncome} prefix="$" step={1000} />
        <Field label="Return / yr" value={ret} onChange={setRet} suffix="%" step={0.5} />
      </div>
      <Result tone={onTrack ? 'ok' : 'warn'}>
        <p>At {retire} you’ll have ~<b className="text-emerald-800">{money(projected)}</b>. To draw {money(income)}/yr you’d want ~<b>{money(target)}</b>.</p>
        {onTrack
          ? <p className="mt-1 font-bold text-emerald-700">✅ On track — you’re covered.</p>
          : <p className="mt-1 font-bold text-amber-700">Add ~{money(extra)}/mo to close the gap.</p>}
      </Result>
    </Card>
  )
}

function College() {
  const [childAge, setChildAge] = useState(5)
  const [startAge, setStartAge] = useState(18)
  const [cost, setCost] = useState(120000)
  const [savings, setSavings] = useState(8000)
  const [ret, setRet] = useState(5)
  const years = Math.max(0, startAge - childAge)
  const need = pmtNeeded(cost, savings, ret, years)
  return (
    <Card icon={GraduationCap} title="College fund" subtitle="Save up for tuition">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Child’s age" value={childAge} onChange={setChildAge} />
        <Field label="Starts college at" value={startAge} onChange={setStartAge} />
        <Field label="Target cost (total)" value={cost} onChange={setCost} prefix="$" step={5000} />
        <Field label="Saved so far" value={savings} onChange={setSavings} prefix="$" step={1000} />
        <Field label="Return / yr" value={ret} onChange={setRet} suffix="%" step={0.5} />
      </div>
      <Result>
        <p>Save ~<b className="text-emerald-800">{money(need)}/mo</b> for {years} years to reach <b>{money(cost)}</b>.</p>
      </Result>
    </Card>
  )
}

function Healthcare() {
  const [retire, setRetire] = useState(65)
  const [life, setLife] = useState(88)
  const [annual, setAnnual] = useState(7000)
  const [age, setAge] = useState(40)
  const [ret, setRet] = useState(5)
  const yearsInRetirement = Math.max(0, life - retire)
  const totalNeed = annual * yearsInRetirement
  const yearsToSave = Math.max(0, retire - age)
  const monthly = pmtNeeded(totalNeed, 0, ret, yearsToSave)
  return (
    <Card icon={HeartPulse} title="Healthcare in retirement" subtitle="The cost most people miss">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Current age" value={age} onChange={setAge} />
        <Field label="Retire at" value={retire} onChange={setRetire} />
        <Field label="Live to" value={life} onChange={setLife} />
        <Field label="Healthcare / yr" value={annual} onChange={setAnnual} prefix="$" step={500} />
        <Field label="Return / yr" value={ret} onChange={setRet} suffix="%" step={0.5} />
      </div>
      <Result>
        <p>~<b className="text-emerald-800">{money(totalNeed)}</b> across {yearsInRetirement} retirement years. Set aside ~<b>{money(monthly)}/mo</b> until {retire}.</p>
      </Result>
    </Card>
  )
}

function Emergency() {
  const [expenses, setExpenses] = useState(3500)
  const [months, setMonths] = useState(6)
  const [savings, setSavings] = useState(4000)
  const [fillMonths, setFillMonths] = useState(12)
  const target = expenses * months
  const gap = Math.max(0, target - savings)
  const monthly = fillMonths > 0 ? gap / fillMonths : gap
  const done = gap <= 0
  return (
    <Card icon={Umbrella} title="Emergency fund" subtitle="Your safety net">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Monthly expenses" value={expenses} onChange={setExpenses} prefix="$" step={100} />
        <Field label="Months of cushion" value={months} onChange={setMonths} />
        <Field label="Saved so far" value={savings} onChange={setSavings} prefix="$" step={500} />
        <Field label="Fill it in (months)" value={fillMonths} onChange={setFillMonths} />
      </div>
      <Result tone={done ? 'ok' : 'warn'}>
        <p>Goal: <b>{money(target)}</b> ({months} months).{' '}
          {done ? <b className="text-emerald-700">✅ Fully funded!</b> : <>You’re <b>{money(gap)}</b> short — save ~<b className="text-emerald-800">{money(monthly)}/mo</b>.</>}</p>
      </Result>
    </Card>
  )
}

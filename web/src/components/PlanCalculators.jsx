'use client'
// Plan & forecast — financial-goal calculators (PocketSmith/Origin/CalcXML-style).
// Each calculator: enter numbers → "Plan it" → a forecast PLUS real strategies,
// a short strategy guide, and pros/cons — so it teaches, not just calculates.
// Saving requires a GetGuac profile (Supabase auth user_metadata: login-gated,
// cross-device). Public page; guests get a "sign up to save" nudge.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '../lib/supabase/client'
import { PiggyBank, HeartPulse, GraduationCap, Umbrella, Save, Check, Loader2, Lightbulb, BookOpen } from 'lucide-react'

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
      const contributions = v.savings + v.monthly * 12 * years
      const growth = Math.max(0, projected - contributions)
      const target = v.income * 25
      const onTrack = projected >= target
      const extra = onTrack ? 0 : Math.max(0, pmtNeeded(target, v.savings, v.ret, years) - v.monthly)
      const bump = fv(v.savings, v.monthly + 100, v.ret, years) - projected
      return {
        tone: onTrack ? 'ok' : 'warn',
        headline: (
          <>
            <p>At {v.retire}: ~<b className="text-emerald-800">{money(projected)}</b> · you’d want ~<b>{money(target)}</b> (25× your {money(v.income)}/yr).</p>
            {onTrack
              ? <p className="mt-1 font-bold text-emerald-700">✅ On track — and look how much is just growth.</p>
              : <p className="mt-1 font-bold text-amber-700">Short by ~{money(target - projected)} — but ~{money(extra)}/mo closes it. Totally doable.</p>}
          </>
        ),
        insights: [
          `💸 ~${money(growth)} of that is pure growth — your money earning its own money (you only put in ${money(contributions)}).`,
          `📈 Just $100/mo more → ~${money(bump)} extra by ${v.retire}. Small raises compound hard.`,
          `🏦 Grab your full employer 401(k) match first — it’s an instant 100% return, then a Roth IRA grows 100% tax-free.`,
        ],
      }
    },
    guide: [
      'Retirement saving wins on time, not heroics. Money invested early compounds for decades, so your first dollars do far more work than your last — starting now beats saving more later.',
      'The “25× rule” pairs with the 4% rule: a nest egg of 25× the income you want lets you withdraw ~4% a year and have it likely last 30+ years. Use tax-advantaged accounts in order: 401(k) up to the match → Roth/Traditional IRA → back to the 401(k).',
    ],
    pros: ['Compounding makes early dollars worth the most', '401(k) match is free, instant 100% return', 'Tax-advantaged accounts cut your tax bill', 'Automatic — set it and forget it'],
    cons: ['Funds are locked until ~59½ (early-withdrawal penalty)', 'Market dips near retirement can sting', 'Inflation erodes fixed income over time', 'Easy to under-save for years without noticing'],
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
      const contributions = v.savings + need * 12 * years
      const growth = Math.max(0, v.cost - contributions)
      const waitCost = years > 1 ? pmtNeeded(v.cost, v.savings, v.ret, years - 1) - need : 0
      const inflated = v.cost * Math.pow(1.05, years)
      return {
        tone: 'ok',
        headline: <p>Save ~<b className="text-emerald-800">{money(need)}/mo</b> for {years} years to reach <b>{money(v.cost)}</b>. You’ve got time on your side.</p>,
        insights: [
          `🎓 Use a 529 plan — tax-free growth for education, and many states hand you a tax deduction for contributing.`,
          growth > 0 ? `📈 Compounding does ~${money(growth)} of the work — you only contribute ~${money(contributions)}.` : `📈 Start early so compounding can do more of the lifting.`,
          waitCost > 0 ? `⏱️ Wait one year and the monthly jumps ~${money(waitCost)}. Starting now is the cheapest it’ll ever be.` : `⏱️ The earlier you start, the smaller the monthly.`,
        ],
      }
    },
    guide: [
      'College costs are big but predictable — you know roughly when the bill arrives, so steady monthly saving into a growth account does most of the work. Tuition has historically risen ~5%/yr, so target a future number, not today’s sticker price.',
      'A 529 plan is the default tool: contributions grow tax-free and come out tax-free for qualified education. You don’t have to fund 100% — many families aim for a third from savings, a third from current income, and a third from aid/loans.',
    ],
    pros: ['529 growth is tax-free for education', 'Many states give a tax deduction', 'High contribution limits', 'You can change the beneficiary later'],
    cons: ['Non-education withdrawals: tax + 10% penalty on earnings', 'Can slightly reduce financial-aid eligibility', 'Limited investment menu', 'Overfunding risk if a scholarship lands'],
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
      const yearsToSave = Math.max(0, v.retire - v.age)
      const monthly = pmtNeeded(totalNeed, 0, v.ret, yearsToSave)
      const viaHsa = pmtNeeded(totalNeed, 0, v.ret + 1, yearsToSave)
      return {
        tone: 'ok',
        headline: <p>~<b className="text-emerald-800">{money(totalNeed)}</b> across {yearsInRetirement} retirement years. Set aside ~<b>{money(monthly)}/mo</b> until {v.retire} — start now and it’s painless.</p>,
        insights: [
          `🏥 An HSA is the single best account for this — triple tax-advantaged (deduct in, grow tax-free, withdraw tax-free for medical).`,
          `👵 Fidelity estimates a 65-year-old couple needs ~$315k for healthcare alone — the cost people most underestimate.`,
          `📈 Investing it (not just parking cash) could cut the monthly to ~${money(viaHsa)} — the gap is compounding.`,
        ],
      }
    },
    guide: [
      'Healthcare is the retirement cost people forget. Medicare starts at 65 but leaves big gaps — premiums, dental, vision, hearing, and especially long-term care. Estimating it now and saving steadily beats a nasty surprise at 70.',
      'The Health Savings Account (HSA) is the most powerful account in the tax code for this: money goes in pre-tax, grows tax-free invested, and comes out tax-free for medical costs. After 65 it also works like a regular IRA for non-medical use.',
    ],
    pros: ['HSA is triple tax-advantaged', 'HSA funds roll over (not use-it-or-lose-it)', 'After 65, HSA doubles as a retirement account', 'Invest it like a 401(k) for growth'],
    cons: ['HSA needs a high-deductible health plan', 'Annual contribution limits', 'Penalty for non-medical use before 65', 'Future medical costs are hard to predict'],
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
      const pct = target > 0 ? Math.min(100, Math.round((v.savings / target) * 100)) : 0
      const hysaYield = Math.round(target * 0.045)
      return {
        tone: done ? 'ok' : 'warn',
        headline: (
          <p>Goal: <b>{money(target)}</b> ({v.months} months).{' '}
            {done ? <b className="text-emerald-700">✅ Fully funded — that’s real peace of mind.</b> : <>You’re <b>{pct}% there</b> — ~<b className="text-emerald-800">{money(monthly)}/mo</b> finishes it.</>}</p>
        ),
        insights: [
          `🏦 Keep it in a high-yield savings account (~4–5% APY), not checking — fully funded, that’s ~${money(hysaYield)}/yr in free interest.`,
          `📊 3 months if your income’s steady; 6+ if it’s variable or you’re the sole earner.`,
          done ? `🎯 Funded! Your next dollar is better off in retirement or killing high-interest debt.` : `⚡ Automate the transfer on payday so it fills itself — no willpower required.`,
        ],
      }
    },
    guide: [
      'An emergency fund is the foundation everything else stands on — it’s what keeps a job loss, medical bill, or car repair from becoming credit-card debt. It isn’t an investment; its job is to be boring, safe, and instantly available.',
      'Aim for 3 months of expenses if your income is stable, 6+ if it’s variable or you’re the only earner. Park it in a high-yield savings account so it earns ~4–5% while staying liquid, and automate the deposit so it builds without you thinking about it.',
    ],
    pros: ['Liquid — instant access in a crisis', 'FDIC-insured and safe', 'Earns ~4–5% APY in a HYSA', 'Keeps emergencies from becoming debt'],
    cons: ['Returns lag investing (opportunity cost)', 'Inflation slowly erodes idle cash', 'Tempting to dip into for non-emergencies', 'Too large = lazy money that should be invested'],
  },
]

export default function PlanCalculators() {
  const [authed, setAuthed] = useState(null)
  const [saved, setSaved] = useState({})

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      const u = data?.user
      setAuthed(!!u)
      if (u?.user_metadata) {
        const sp = {}
        for (const c of CALCS) {
          const v = u.user_metadata[`gg_plan_${c.id}`]
          if (v && typeof v === 'object') sp[c.id] = v
        }
        setSaved(sp)
      }
    }).catch(() => setAuthed(false))
  }, [])

  async function onSave(id, vals) {
    const sb = createClient()
    const { error } = await sb.auth.updateUser({ data: { [`gg_plan_${id}`]: vals } })
    if (error) throw error
  }

  return (
    <div className="space-y-4">
      {/* Motivation */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-lime-500 text-white p-4 sm:p-5 text-center shadow-sm">
        <p className="font-black text-lg">Every dollar you save today is future-you saying thank you. 🌱</p>
        <p className="text-emerald-50 text-sm mt-0.5">Small, steady beats big and someday. Run a number, take one step.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        {CALCS.map((c) => <Calculator key={c.id} {...c} authed={authed} savedVals={saved[c.id]} onSave={onSave} />)}
      </div>
      <p className="text-[11px] text-gray-400 text-center pt-1">
        Estimates &amp; general guidance — not personalized financial advice. Assumes steady returns; real markets vary.
      </p>
    </div>
  )
}

function Calculator({ id, icon: Icon, title, subtitle, fields, validate, compute, guide, pros, cons, authed, savedVals, onSave }) {
  const [vals, setVals] = useState({})
  const [planned, setPlanned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
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
    try { await onSave(id, vals); setSavedOk(true) } catch { /* ignore */ } finally { setSaving(false) }
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

      <button onClick={() => setPlanned(true)} disabled={!allSet}
        className="mt-3 w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
        {result ? 'Update plan' : 'Plan it'}
      </button>

      {planned && allSet && !valid && typeof check === 'string' && (
        <p className="text-xs text-amber-600 mt-1.5">{check}</p>
      )}

      {result && (
        <>
          <div className={`mt-3 rounded-xl bg-gradient-to-br ${result.tone === 'warn' ? 'from-amber-50 to-orange-50 border-amber-200' : 'from-emerald-50 to-lime-50 border-emerald-200'} border p-3 text-sm`}>
            {result.headline}
          </div>

          <div className="mt-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80 inline-flex items-center gap-1 mb-1"><Lightbulb size={11} /> Strategies</div>
            <ul className="space-y-1.5">
              {result.insights.map((t, i) => <li key={i} className="text-[12px] text-gray-600 leading-snug">{t}</li>)}
            </ul>
          </div>

          <div className="mt-3 flex items-center justify-between min-h-[18px]">
            {authed ? (
              <>
                <span className="text-[11px] text-gray-400">
                  {savedOk ? <span className="text-emerald-700 font-semibold inline-flex items-center gap-1"><Check size={12} /> Saved to your account</span> : 'Save these numbers?'}
                </span>
                <button onClick={save} disabled={saving} className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 disabled:opacity-50">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {savedOk ? 'Update' : 'Save'}
                </button>
              </>
            ) : authed === false ? (
              <span className="text-[11px] text-gray-400">
                <Link href="/register" className="text-emerald-700 font-bold hover:underline">Sign up free</Link> to save your plan.
              </span>
            ) : null}
          </div>
        </>
      )}

      {/* Strategy guide + pros/cons — always available, collapsed by default. */}
      {(guide || pros || cons) && (
        <details className="mt-3 border-t border-gray-100 pt-2">
          <summary className="cursor-pointer text-xs font-bold text-emerald-700 inline-flex items-center gap-1 select-none">
            <BookOpen size={12} /> Strategy guide &amp; pros / cons
          </summary>
          <div className="mt-2 text-[12px] text-gray-600 space-y-2 leading-relaxed">
            {(guide || []).map((p, i) => <p key={i}>{p}</p>)}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">Pros</div>
                <ul className="space-y-1">{(pros || []).map((x, i) => <li key={i} className="flex gap-1.5"><span className="text-emerald-500 font-bold">＋</span><span>{x}</span></li>)}</ul>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">Watch-outs</div>
                <ul className="space-y-1">{(cons || []).map((x, i) => <li key={i} className="flex gap-1.5"><span className="text-amber-500 font-bold">－</span><span>{x}</span></li>)}</ul>
              </div>
            </div>
          </div>
        </details>
      )}
    </div>
  )
}

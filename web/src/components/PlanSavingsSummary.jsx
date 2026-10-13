import {money} from '../lib/find-your-10/wizard.mjs'
export default function PlanSavingsSummary({expense}) {
 return <div><dl aria-label="Savings from your expense plan" className="grid gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3 sm:grid-cols-3">{[['Monthly planned',expense.monthlyCents],['One-time planned',expense.oneTimeCents],['Verified savings this month',expense.confirmedCents]].map(([label,value])=><div key={label} className="flex items-center justify-between gap-2 sm:block"><dt className="text-sm text-slate-600">{label}</dt><dd className="text-lg font-bold text-violet-800">{money(value)}</dd></div>)}</dl><p className="mt-2 text-sm text-slate-600">Expense-plan estimates and verified savings are separate; do not add them together.</p></div>
}

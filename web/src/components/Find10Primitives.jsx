// Shared wizard presentation, using the established signed-in design language.
import Link from 'next/link'
export const planButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-violet-800 px-5 py-2 text-sm font-bold text-white disabled:opacity-50'
export const planSecondary = 'inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-violet-900 disabled:opacity-50'
export const planPanel = 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-6'
export const planField = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3'
export function PlanEmpty({ children, href, label }) { return <div className="rounded-2xl bg-slate-50 p-5"><p className="text-sm text-slate-600">{children}</p><Link className="mt-2 inline-flex min-h-11 items-center font-bold text-violet-800" href={href}>{label} →</Link></div> }

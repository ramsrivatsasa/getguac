import { LockKeyhole, ShieldCheck, WalletCards } from 'lucide-react'

const defaultItems = [[WalletCards, 'Free forever', 'No card required'], [LockKeyhole, 'Private by design', 'No bank login required'], [ShieldCheck, 'You stay in control', 'Your data stays yours']]

export default function TrustLine({ className = '', items = defaultItems }) {
  return <section aria-label="GetGuac trust promises" className={`max-w-6xl mx-auto px-4 sm:px-6 ${className}`}><div className="grid sm:grid-cols-3 border-y border-slate-200">{items.map(([Icon, title, detail]) => <div key={title} className="flex items-center gap-3 py-5 sm:px-5 first:pl-0"><Icon size={19} className="text-emerald-700 shrink-0"/><div><p className="font-bold text-sm text-[#17291D]">{title}</p><p className="text-xs text-slate-500 mt-0.5">{detail}</p></div></div>)}</div></section>
}

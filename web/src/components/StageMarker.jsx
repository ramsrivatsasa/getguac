import Link from 'next/link'
import { MONEY_GROUPS, TOOL_GROUP } from '../lib/money-journey'

export default function StageMarker({ active, label = 'Where this fits' }) {
  return (
    <nav aria-label="GetGuac journey" className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-slate-500 mb-3">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {MONEY_GROUPS.map((stage, index) => {
          const selected = stage.slug === (TOOL_GROUP[active] || active)
          return <Link key={stage.slug} href={`/features/${stage.slug}`} className="min-h-11 shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold" style={{ borderColor: selected ? stage.color : '#DCE5DE', color: selected ? stage.color : '#53645A', background: '#fff' }}><span>{index + 1}</span>{stage.name}</Link>
        })}
      </div>
    </nav>
  )
}

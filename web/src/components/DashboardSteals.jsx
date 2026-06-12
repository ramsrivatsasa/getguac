'use client'
// Dashboard "Steals for you" strip. Surfaces the deals the Steals job has
// found (seen_steals), grouped by the search the user configured, top 5 per
// group, ordered by relevance (best discount first). The header carries the
// "X new" count so the user sees how many fresh steals were found.
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Tag, Star, ArrowRight } from 'lucide-react'
import { getStealsFeed } from '../lib/steals'

const PER_STEAL = 5

// Relevance = discount weight (savings the user cares about) + a small rating
// tiebreak. Steals with a real original_price and a big markdown rank first.
function relevance(d) {
  const price = Number(d.price) || 0
  const orig = Number(d.original_price) || 0
  const discount = orig > price && orig > 0 ? (orig - price) / orig : 0
  return discount * 100 + (Number(d.rating) || 0)
}

export default function DashboardSteals() {
  const { data } = useQuery({ queryKey: ['steals-feed'], queryFn: getStealsFeed, staleTime: 60_000 })
  const steals = data?.steals || []
  const unread = data?.unread || 0
  if (!steals.length) return null

  // Group by the configured steal (the saved search the deal came from).
  const groups = {}
  for (const d of steals) {
    const q = (d.query || 'Your watchlist').trim()
    ;(groups[q] ||= []).push(d)
  }
  // Top PER_STEAL per group by relevance; order groups by their best deal.
  const ordered = Object.entries(groups)
    .map(([q, items]) => [q, items.slice().sort((a, b) => relevance(b) - relevance(a)).slice(0, PER_STEAL)])
    .sort((a, b) => relevance(b[1][0]) - relevance(a[1][0]))

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Tag size={18} className="text-emerald-600" /> Steals for you
          {unread > 0 && (
            <span className="text-[11px] font-extrabold bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">
              {unread} new
            </span>
          )}
        </h3>
        <Link href="/steals" className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1">
          All steals <ArrowRight size={13} />
        </Link>
      </div>
      <div className="space-y-4">
        {ordered.map(([q, items]) => (
          <div key={q}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 truncate">{q}</div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
              {items.map((d) => <DealCard key={d.deal_key} d={d} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function DealCard({ d }) {
  const price = Number(d.price) || 0
  const orig = Number(d.original_price) || 0
  const off = orig > price && orig > 0 ? Math.round(((orig - price) / orig) * 100) : 0
  return (
    <a
      href={d.url || '/steals'}
      target={d.url ? '_blank' : undefined}
      rel="noopener noreferrer"
      className="snap-start shrink-0 w-40 rounded-xl border border-gray-100 bg-white hover:shadow-md hover:border-emerald-200 transition overflow-hidden"
    >
      <div className="h-24 bg-gray-50 flex items-center justify-center overflow-hidden">
        {d.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.image} alt={d.title || d.store} loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <Tag size={24} className="text-gray-300" />
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight min-h-[28px]">{d.title || d.store}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-sm font-black text-emerald-700 tabular-nums">${price.toFixed(2)}</span>
          {orig > price && <span className="text-[10px] text-gray-400 line-through tabular-nums">${orig.toFixed(2)}</span>}
          {off > 0 && <span className="text-[9px] font-extrabold bg-rose-100 text-rose-700 rounded px-1">−{off}%</span>}
        </div>
        <div className="flex items-center justify-between mt-1 gap-1">
          <span className="text-[10px] text-gray-500 truncate">{d.store}</span>
          {Number(d.rating) > 0 && (
            <span className="text-[10px] text-amber-600 inline-flex items-center gap-0.5 shrink-0">
              <Star size={9} className="fill-amber-400 text-amber-400" />{Number(d.rating).toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}

'use client'
// Dashboard "Steals for you" strip. Surfaces the deals the Steals job has
// found (seen_steals), grouped by the search the user configured, top 5 per
// group, ordered by relevance (best discount first). The header carries the
// "X new" count so the user sees how many fresh steals were found.
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Tag, Star, ArrowRight, Search, ChevronDown } from 'lucide-react'
import { getStealsFeed } from '../lib/steals'
import { useSavedSearches } from '../hooks/useSavedSearches'

// Show a generous run per search so the row actually fills and scrolls
// horizontally (5 left a half-empty row on wide screens).
const PER_STEAL = 15

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
  const { data: savedSearches = [] } = useSavedSearches()
  const steals = data?.steals || []
  const unread = data?.unread || 0
  const [open, setOpen] = useState(true)
  if (!steals.length && !savedSearches.length) return null

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

  // Configured searches that haven't found a deal yet → "hunting" rows, so the
  // user sees every search they set up (not just the ones with results).
  const haveDeals = new Set(ordered.map(([q]) => q.toLowerCase()))
  const hunting = [...new Set(
    savedSearches.map((s) => (s.query || s.label || '').trim()).filter(Boolean),
  )].filter((q) => !haveDeals.has(q.toLowerCase()))

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="font-semibold text-gray-900 flex items-center gap-2 -m-1 p-1 rounded-lg hover:text-emerald-800"
        >
          <Tag size={18} className="text-emerald-600" /> Steals for you
          {unread > 0 && (
            <span className="text-[11px] font-extrabold bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">
              {unread} new
            </span>
          )}
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
        <Link href="/steals" className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1">
          All steals <ArrowRight size={13} />
        </Link>
      </div>
      {open && (
      <div className="space-y-4">
        {ordered.map(([q, items]) => (
          <div key={q}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 truncate">{q}</div>
            <AutoScrollRow>
              {items.map((d) => <DealCard key={d.deal_key} d={d} />)}
            </AutoScrollRow>
          </div>
        ))}
        {hunting.map((q) => (
          <div key={`hunt-${q}`}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 truncate">{q}</div>
            <Link href="/steals" className="flex items-center gap-2 text-xs text-gray-400 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-3 py-3 hover:border-emerald-200 hover:text-emerald-700 transition-colors">
              <Search size={13} className="animate-pulse" /> Hunting for deals on this — they’ll land here the moment we find one.
            </Link>
          </div>
        ))}
      </div>
      )}
    </section>
  )
}

// A horizontal row that auto-scrolls itself. It creeps right until it hits the
// end of the box, then reverses (ping-pong) — so the deals keep cycling without
// the user dragging. Pauses while hovered/touched so they can read + click, and
// honors prefers-reduced-motion. Manual scroll still works (overflow-x-auto).
function AutoScrollRow({ children }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    let dir = 1
    let paused = false
    let raf = 0
    const SPEED = 0.7 // px per frame (~42px/s at 60fps)
    const pause = () => { paused = true }
    const resume = () => { paused = false }

    const step = () => {
      if (!paused) {
        const max = el.scrollWidth - el.clientWidth
        if (max > 1) {
          if (el.scrollLeft >= max - 0.5) dir = -1
          else if (el.scrollLeft <= 0.5) dir = 1
          el.scrollLeft += dir * SPEED
        }
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)

    el.addEventListener('mouseenter', pause)
    el.addEventListener('mouseleave', resume)
    el.addEventListener('touchstart', pause, { passive: true })
    el.addEventListener('touchend', resume, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('mouseenter', pause)
      el.removeEventListener('mouseleave', resume)
      el.removeEventListener('touchstart', pause)
      el.removeEventListener('touchend', resume)
    }
  }, [])

  return (
    <div ref={ref} className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
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

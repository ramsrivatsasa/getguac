'use client'
// Global command palette — Cmd+K / Ctrl+K from anywhere in the app.
//
// Searches across receipts, stores, items, rewards, and known actions
// in parallel, groups results by type, and routes the user to the
// right detail page on click. Keyboard-only navigable.
//
// Mounted once in the dashboard layout — listens at the window level
// so every page gets the shortcut without needing per-route wiring.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase/client'
import { Search, Receipt as ReceiptIcon, Store as StoreIcon, ShoppingBag, Gift, LogOut, Settings, Zap, ArrowRight, X } from 'lucide-react'

const ACTIONS = [
  { id: 'go-dashboard', label: 'Dashboard',  hint: 'Home',         icon: Zap,         href: '/dashboard' },
  { id: 'go-receipts',  label: 'Receipts',   hint: 'All receipts', icon: ReceiptIcon, href: '/receipts' },
  { id: 'go-stash',     label: 'Stash',      hint: 'Items',        icon: ShoppingBag, href: '/stash' },
  { id: 'go-steals',    label: 'Steals',     hint: 'Find deals',   icon: Zap,         href: '/steals' },
  { id: 'go-stores',    label: 'Stores',     hint: 'All stores',   icon: StoreIcon,   href: '/stores' },
  { id: 'go-rewards',   label: 'Rewards',    hint: 'Loyalty',      icon: Gift,        href: '/rewards' },
  { id: 'go-profile',   label: 'Profile',    hint: 'Settings',     icon: Settings,    href: '/profile' },
]

function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

export default function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ receipts: [], stores: [], items: [], rewards: [] })
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)
  const debounced = useDebounced(query.trim(), 200)

  // Cmd+K / Ctrl+K shortcut. Also Escape to close.
  useEffect(() => {
    function onKey(e) {
      const mod = e.metaKey || e.ctrlKey
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) {
      // Focus + reset the cursor every open.
      setTimeout(() => inputRef.current?.focus(), 30)
      setActiveIdx(0)
    } else {
      setQuery('')
      setResults({ receipts: [], stores: [], items: [], rewards: [] })
    }
  }, [open])

  // Run searches in parallel against the four tables. Every query is
  // ilike-prefixed so we can match middle-of-word substrings too. RLS
  // gates everything to the signed-in user.
  useEffect(() => {
    if (!open) return
    if (debounced.length < 2) {
      setResults({ receipts: [], stores: [], items: [], rewards: [] })
      return
    }
    let cancelled = false
    setLoading(true)
    const sb = createClient()
    const like = `%${debounced}%`
    Promise.all([
      sb.from('receipts').select('id, store_name, date, total_amount').ilike('store_name', like).order('date', { ascending: false }).limit(5),
      sb.from('stores').select('id, store_name, address').ilike('store_name', like).limit(5),
      sb.from('receipt_items').select('id, item_name, sku, receipts!inner(id, store_name, date)').ilike('item_name', like).limit(5),
      sb.from('rewards').select('id, reward_title, reward_no, store_name, expiry_date').or(`reward_title.ilike.${like},reward_no.ilike.${like},store_name.ilike.${like}`).limit(5),
    ]).then(([r1, r2, r3, r4]) => {
      if (cancelled) return
      setResults({
        receipts: r1.data || [],
        stores:   r2.data || [],
        items:    r3.data || [],
        rewards:  r4.data || [],
      })
      setLoading(false)
      setActiveIdx(0)
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, debounced])

  // Flattened, ordered list — drives keyboard nav + visual highlight.
  const flat = useMemo(() => {
    const out = []
    const q = debounced.toLowerCase()
    // Action shortcuts always show when there's no query OR they
    // contain the query string.
    for (const a of ACTIONS) {
      if (!q || a.label.toLowerCase().includes(q) || a.hint.toLowerCase().includes(q)) {
        out.push({ kind: 'action', ...a, label: a.label, href: a.href })
      }
    }
    for (const r of results.receipts) {
      out.push({
        kind: 'receipt',
        id: `receipt-${r.id}`,
        label: r.store_name || 'Receipt',
        hint: `${r.date || ''} · $${Number(r.total_amount || 0).toFixed(2)}`,
        href: `/receipts/${r.id}`,
        icon: ReceiptIcon,
      })
    }
    for (const s of results.stores) {
      out.push({
        kind: 'store',
        id: `store-${s.id}`,
        label: s.store_name,
        hint: s.address || 'Store',
        href: `/stores/${s.id}`,
        icon: StoreIcon,
      })
    }
    for (const it of results.items) {
      out.push({
        kind: 'item',
        id: `item-${it.id}`,
        label: it.item_name,
        hint: `${it.receipts?.store_name || ''} · ${it.receipts?.date || ''}`,
        href: `/receipts/${it.receipts?.id || ''}`,
        icon: ShoppingBag,
      })
    }
    for (const r of results.rewards) {
      out.push({
        kind: 'reward',
        id: `reward-${r.id}`,
        label: r.reward_title || r.reward_no || 'Reward',
        hint: `${r.store_name || ''}${r.expiry_date ? ` · exp ${r.expiry_date}` : ''}`,
        href: `/rewards/${r.id}`,
        icon: Gift,
      })
    }
    return out
  }, [results, debounced])

  const goTo = useCallback((href) => {
    setOpen(false)
    router.push(href)
  }, [router])

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const pick = flat[activeIdx]
      if (pick?.href) goTo(pick.href)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4 cmd-fade-in"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Search GetGuac"
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden cmd-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Search size={18} className="text-emerald-600" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 outline-none text-base placeholder:text-gray-400"
            placeholder="Search receipts, stores, items, rewards…"
          />
          <kbd className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">ESC</kbd>
          <button
            onClick={() => setOpen(false)}
            className="ml-1 w-7 h-7 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto py-2">
          {flat.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              {loading ? 'Searching…' : debounced.length < 2 ? 'Type at least 2 characters to search.' : 'No matches.'}
            </div>
          )}
          {flat.map((r, i) => {
            const Icon = r.icon || ArrowRight
            const active = i === activeIdx
            return (
              <button
                key={r.id}
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => goTo(r.href)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                  active ? 'bg-emerald-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Icon size={15} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.label}</p>
                  {r.hint && <p className="text-[11px] text-gray-500 truncate">{r.hint}</p>}
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{r.kind}</span>
              </button>
            )
          })}
        </div>

        <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 flex items-center gap-3 text-[11px] text-gray-500">
          <span><kbd className="bg-white border border-gray-200 rounded px-1.5 py-0.5 font-semibold">↑↓</kbd> navigate</span>
          <span><kbd className="bg-white border border-gray-200 rounded px-1.5 py-0.5 font-semibold">↵</kbd> open</span>
          <span className="ml-auto"><kbd className="bg-white border border-gray-200 rounded px-1.5 py-0.5 font-semibold">⌘K</kbd> toggle</span>
        </div>
      </div>

      <style jsx>{`
        .cmd-fade-in { animation: cmd-fade 180ms ease-out both; }
        .cmd-pop-in  { animation: cmd-pop 220ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes cmd-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cmd-pop  {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)     scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cmd-fade-in, .cmd-pop-in { animation: none; }
        }
      `}</style>
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../lib/supabase/client'
import { useStore } from '../store'
import {
  LayoutDashboard, Receipt, Gift, ShoppingCart, Car, User, X, Store, Undo2, Sparkles, ChevronsLeft, ChevronsRight, Package, Utensils, BadgeDollarSign, Banknote, Wand2, Mail, BarChart3,
  Inbox as InboxIcon, Send, Trash2, Filter, ChevronDown, Home,
} from 'lucide-react'
import clsx from 'clsx'
import GuacMascot from './GuacMascot'

// Every item gets a `hoverMascot` expression. It's hidden by default and
// fades in when the cursor is over the row. Pick the expression that best
// fits the page's vibe.
const sections = [
  {
    title: 'Overview',
    items: [
      { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',   emoji: '🏠', hoverMascot: 'sitting' },
      { href: '/guacanomics', icon: Sparkles,        label: 'Guacanomics', emoji: '✨', hoverMascot: 'celebrating' },
      { href: '/validate',    icon: Receipt,         label: 'Worth It?',   emoji: '🥑', hoverMascot: 'thumbsup' },
      { href: '/guacwizard',  icon: Wand2,           label: 'GuacWizard',  emoji: '🧙‍♂️✨', hoverMascot: 'rich' },
    ],
  },
  {
    title: 'Money',
    items: [
      { href: '/receipts', icon: Receipt,        label: 'Receipts', emoji: '🧾', hoverMascot: 'happy' },
      { href: '/inbox',    icon: Mail,           label: 'Inbox',    emoji: '📬', hoverMascot: 'eating' },
      { href: '/reports',  icon: BarChart3,      label: 'Reports',  emoji: '📊', hoverMascot: 'celebrating' },
      { href: '/bank',     icon: Banknote,       label: 'Bank',     emoji: '🏦', hoverMascot: 'rich' },
      { href: '/returns',  icon: Undo2,          label: 'Returns',  emoji: '↩️', hoverMascot: 'surprised' },
      { href: '/rewards',  icon: Gift,           label: 'Rewards',  emoji: '🎁', hoverMascot: 'celebrating' },
    ],
  },
  {
    title: 'Shop',
    items: [
      { href: '/stash',    icon: Package,        label: 'Stash',     emoji: '📦', hoverMascot: 'sitting' },
      { href: '/bites',    icon: Utensils,       label: 'Bites',     emoji: '🍽️', hoverMascot: 'eating' },
      { href: '/shopping',    icon: ShoppingCart,   label: 'Smashlist',   emoji: '🛒', hoverMascot: 'thumbsup' },
      { href: '/predictions', icon: Sparkles,       label: 'Predictions', emoji: '🪄', hoverMascot: 'celebrating' },
      { href: '/steals',      icon: BadgeDollarSign, label: 'Steals',     emoji: '💎', hoverMascot: 'rich' },
    ],
  },
  {
    title: 'More',
    items: [
      { href: '/stores',    icon: Store, label: 'Stores',    emoji: '🏪', hoverMascot: 'happy' },
      { href: '/car-miles', icon: Car,   label: 'Car Miles', emoji: '🚗', hoverMascot: 'relaxing' },
      { href: '/profile',   icon: User,  label: 'Profile',   emoji: '👤', hoverMascot: 'sitting' },
      { href: '/profile#household', icon: Home,  label: 'House', emoji: '🏡', hoverMascot: 'happy' },
    ],
  },
]

export default function Sidebar({ isAdmin }) {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, toggleSidebar } = useStore()

  async function handleLogout() {
    const sb = createClient()
    await sb.auth.signOut()
    // Land users on the marketing home page so they see the brand, not a bare login form.
    router.push('/')
    router.refresh()
  }

  const isActive = (href) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  const collapsed = sidebarCollapsed

  // Inbox sub-nav visibility — clicking the Inbox item when you're already on
  // /inbox toggles the sub-nav (Folders + Filters) closed. Persisted so the
  // user's preference sticks across reloads.
  const [inboxSubExpanded, setInboxSubExpanded] = useStateClient('inbox_sub_expanded', true)

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={clsx(
        'fixed lg:static inset-y-0 left-0 z-50 flex flex-col overflow-hidden font-sans',
        'bg-gradient-to-b from-emerald-50/80 via-white to-lime-50/60 text-gray-700',
        'border-r border-emerald-100',
        'transform transition-all duration-200 ease-in-out',
        collapsed ? 'lg:w-20' : 'lg:w-64',
        'w-64',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Brand */}
        <div className={clsx(
          'flex items-center border-b border-emerald-100/80 h-16 shrink-0',
          collapsed ? 'lg:justify-center px-3' : 'px-5 justify-between'
        )}>
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-300 via-emerald-400 to-emerald-700 shadow-md ring-2 ring-white flex items-center justify-center text-2xl shrink-0">
              🥑
            </div>
            {!collapsed && (
              <div className="min-w-0 font-sans">
                <div className="text-xl font-black tracking-tight text-emerald-900 leading-none font-sans">GetGuac</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-1 uppercase tracking-wider font-sans">money's wingman</div>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button className="lg:hidden text-gray-500 hover:text-gray-800" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-1.5 overflow-y-auto">
          {sections.map(section => (
            <div key={section.title} className={clsx('mb-1', collapsed && 'lg:mb-0.5')}>
              {!collapsed && (
                <div className="px-5 pb-0.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700/70">
                  {section.title}
                </div>
              )}
              <div className={clsx('space-y-px', collapsed ? 'lg:px-2 px-3' : 'px-3')}>
                {section.items.map(({ href, icon: Icon, label, emoji, hoverMascot }) => {
                  const active = isActive(href)
                  return (
                    <div key={href}>
                      <Link
                        href={href}
                        onClick={(e) => {
                          // Special case: clicking the Inbox item while you're
                          // already on /inbox doesn't navigate — it toggles the
                          // sub-nav (Folders + Filters) closed/open. Otherwise
                          // navigate normally.
                          if (href === '/inbox' && active && !collapsed) {
                            e.preventDefault()
                            setInboxSubExpanded(v => !v)
                          }
                          setSidebarOpen(false)
                        }}
                        title={collapsed ? label : undefined}
                        className={clsx(
                          'group flex items-center rounded-2xl text-sm transition-all',
                          collapsed ? 'lg:justify-center lg:px-2 lg:py-1.5 px-3 py-1.5 gap-2.5' : 'gap-2.5 px-3 py-1.5',
                          active
                            ? 'bg-gradient-to-r from-emerald-100 to-lime-100 text-emerald-900 font-semibold shadow-sm ring-1 ring-emerald-200/60'
                            : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-900'
                        )}
                      >
                        <span className={clsx(
                          'flex items-center justify-center text-base shrink-0 transition-all',
                          collapsed ? 'w-8 h-8 lg:w-8 lg:h-8' : 'w-7 h-7',
                          'rounded-xl',
                          active ? 'bg-white shadow-sm ring-1 ring-emerald-200/60' : 'group-hover:bg-white/70'
                        )}>{emoji}</span>
                        {!collapsed && (
                          <>
                            <span className="flex-1">{label}</span>
                            {/* Show chevron on the Inbox row when active so users
                                know it's a toggle as well as a link. */}
                            {href === '/inbox' && active && (
                              <ChevronDown size={14} className={`shrink-0 text-emerald-700 transition-transform ${inboxSubExpanded ? '' : '-rotate-90'}`} />
                            )}
                            {hoverMascot && (
                              <span
                                className="shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
                                aria-hidden="true"
                              >
                                <GuacMascot expression={hoverMascot} size={22} />
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                      {/* Inbox: render the Folders + Filters accordion inline when
                          the user is on the inbox page AND the sub-nav is expanded. */}
                      {href === '/inbox' && active && !collapsed && inboxSubExpanded && (
                        <InboxSubNav onNavigate={() => setSidebarOpen(false)} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {isAdmin && (
            <div className={collapsed ? 'lg:px-2 px-3' : 'px-3'}>
              <Link
                href="/admin"
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? 'Admin' : undefined}
                className={clsx(
                  'group flex items-center rounded-2xl text-sm transition-all',
                  collapsed ? 'lg:justify-center lg:px-2 lg:py-1.5 px-3 py-1.5 gap-2.5' : 'gap-2.5 px-3 py-1.5',
                  pathname === '/admin'
                    ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 font-semibold shadow-sm ring-1 ring-amber-200'
                    : 'text-gray-600 hover:bg-amber-50 hover:text-amber-900'
                )}
              >
                <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/70 shadow-sm text-base shrink-0">🛡️</span>
                {!collapsed && <span>Admin</span>}
              </Link>
            </div>
          )}
        </nav>

        {/* Footer: collapse toggle + logout */}
        <div className="border-t border-emerald-100/80 p-3 space-y-1 shrink-0">
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign Out' : undefined}
            className={clsx(
              'flex items-center w-full rounded-2xl text-sm font-medium transition-all',
              'text-gray-600 hover:bg-rose-50 hover:text-rose-700',
              collapsed ? 'lg:justify-center lg:px-2 lg:py-1.5 px-3 py-1.5 gap-2.5' : 'gap-2.5 px-3 py-1.5'
            )}>
            <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/70 text-base shrink-0">👋</span>
            {!collapsed && <span>Sign Out</span>}
          </button>

          {/* Collapse toggle (desktop only) */}
          <button
            onClick={toggleSidebar}
            title={collapsed ? 'Expand' : 'Collapse'}
            className={clsx(
              'hidden lg:flex items-center w-full rounded-2xl text-xs font-semibold transition-all',
              'text-emerald-700 hover:bg-emerald-100',
              collapsed ? 'justify-center px-2 py-2 gap-2' : 'gap-2 px-3 py-2'
            )}>
            {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> <span>Collapse</span></>}
          </button>
        </div>
      </aside>
    </>
  )
}

// ── Inbox sub-nav ────────────────────────────────────────────────────────
// Folders (Inbox / Sent / Trash) + Filters (All / Unread / Receipts / Starred)
// rendered as accordion sections under the main "Inbox" item. State lives in
// URL search params so:
//   1. Sidebar links drive the inbox page directly (no shared component state)
//   2. The selected folder / filter is bookmarkable
//   3. Re-visits restore the last view
const INBOX_FOLDERS = [
  { value: 'inbox', label: 'Inbox', icon: InboxIcon },
  { value: 'sent',  label: 'Sent',  icon: Send },
  { value: 'trash', label: 'Trash', icon: Trash2 },
]
const INBOX_FILTERS = [
  { value: '',         label: 'All' },
  { value: 'unread',   label: 'Unread' },
  { value: 'receipts', label: 'Receipts' },
  { value: 'starred',  label: 'Starred' },
]

function InboxSubNav({ onNavigate }) {
  const sp = useSearchParams()
  const folder = sp?.get('folder') || 'inbox'
  const filter = sp?.get('filter') || ''

  const [foldersOpen, setFoldersOpen] = useStateClient('inbox_sub_folders_open', true)
  const [filtersOpen, setFiltersOpen] = useStateClient('inbox_sub_filters_open', false)

  // Build a URL preserving other params (compose state, etc.) but updating folder/filter.
  function buildHref({ nextFolder, nextFilter }) {
    const params = new URLSearchParams(sp?.toString() || '')
    if (nextFolder !== undefined) {
      if (nextFolder && nextFolder !== 'inbox') params.set('folder', nextFolder)
      else params.delete('folder')
    }
    if (nextFilter !== undefined) {
      if (nextFilter) params.set('filter', nextFilter)
      else params.delete('filter')
    }
    const qs = params.toString()
    return qs ? `/inbox?${qs}` : '/inbox'
  }

  return (
    <div className="mt-1 ml-2 pl-3 border-l-2 border-emerald-100 space-y-1">
      {/* Folders. Chevron sits to the LEFT of the label so it aligns vertically
          with the Inbox mascot icon column above. */}
      <button
        type="button"
        onClick={() => setFoldersOpen(v => !v)}
        className="w-full flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-emerald-700 hover:text-emerald-900 py-0.5"
      >
        <ChevronDown size={11} className={`shrink-0 transition-transform ${foldersOpen ? '' : '-rotate-90'}`} />
        <span>Folders</span>
      </button>
      {foldersOpen && (
        <div className="space-y-px">
          {INBOX_FOLDERS.map(f => {
            const Icon = f.icon
            const active = folder === f.value
            return (
              <Link
                key={f.value}
                href={buildHref({ nextFolder: f.value })}
                onClick={onNavigate}
                className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-colors ${
                  active ? 'bg-emerald-100 text-emerald-900 font-semibold' : 'text-gray-600 hover:bg-emerald-50'
                }`}
              >
                <Icon size={12} /> {f.label}
              </Link>
            )
          })}
        </div>
      )}

      {/* Filters. Chevron on the LEFT so it aligns vertically with the Folders
          chevron and the Inbox mascot column above. */}
      <button
        type="button"
        onClick={() => setFiltersOpen(v => !v)}
        className="w-full flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-amber-700 hover:text-amber-900 pt-1 pb-0.5"
      >
        <ChevronDown size={11} className={`shrink-0 transition-transform ${filtersOpen ? '' : '-rotate-90'}`} />
        <span>Filters</span>
        {filter && <span className="w-1 h-1 rounded-full bg-amber-500" />}
      </button>
      {filtersOpen && (
        <div className="space-y-px">
          {INBOX_FILTERS.map(f => {
            const active = filter === f.value
            return (
              <Link
                key={f.value || 'all'}
                href={buildHref({ nextFilter: f.value })}
                onClick={onNavigate}
                className={`block px-2 py-1 rounded-lg text-xs transition-colors ${
                  active ? 'bg-amber-100 text-amber-900 font-semibold' : 'text-gray-600 hover:bg-amber-50'
                }`}
              >
                {f.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Tiny useState that persists to localStorage. Used by InboxSubNav's section
// expand/collapse so the user's preference sticks across reloads.
function useStateClient(key, initial) {
  const [v, setV] = useState(initial)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem(key)
    if (raw === '1' || raw === 'true') setV(true)
    else if (raw === '0' || raw === 'false') setV(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (typeof window === 'undefined') return
    try { localStorage.setItem(key, v ? '1' : '0') } catch {}
  }, [key, v])
  return [v, setV]
}

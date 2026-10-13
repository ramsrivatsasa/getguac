'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../lib/supabase/client'
import { useStore } from '../store'
import {
  ListTodo, LayoutDashboard, Receipt, Gift, ShoppingCart, Car, User, X, Store, Undo2, Sparkles, ChevronsLeft, ChevronsRight, Package, Utensils, BadgeDollarSign, Banknote, Wand2, Mail, BarChart3,
  Inbox as InboxIcon, Send, Trash2, Filter, ChevronDown, Home, MessageSquare, Link2, ShoppingBag, Ticket, CalendarDays, TrendingUp, BookOpen, Gamepad2, WalletCards, ShieldCheck, LogOut, Megaphone,
} from 'lucide-react'
import clsx from 'clsx'

// Every item gets a `hoverMascot` expression. It's hidden by default and
// fades in when the cursor is over the row. Pick the expression that best
// fits the page's vibe.
const sections = [
  {
    title: 'MY GUAC',
    items: [
      { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',   emoji: '🏠', hoverMascot: 'sitting' },
      { href: '/news', icon: TrendingUp, label: 'News & Finance', emoji: '📰', hoverMascot: 'happy' },
      { href: '/guacanomics', icon: Sparkles,        label: 'Guacanomics', emoji: '✨', hoverMascot: 'celebrating' },
      { href: '/validate',    icon: Receipt,         label: 'Worth It?',   emoji: '🥑', hoverMascot: 'thumbsup' },
      { href: '/chat',        icon: MessageSquare,   label: 'Guac AI',     emoji: '🥑💬', hoverMascot: 'happy' },
      { href: '/guac-ai/agents', icon: Sparkles, label: 'AI agents', emoji: '🤖', hoverMascot: 'happy' },
      { href: '/guacwizard',  icon: Wand2,           label: 'GuacWizard',  emoji: '🧙‍♂️✨', hoverMascot: 'rich' },
    ],
  },
  {
    title: 'Money',
    items: [
      { href: '/receipts', icon: Receipt,        label: 'Receipts', emoji: '🧾', hoverMascot: 'happy' },
      { href: '/reports',  icon: BarChart3,      label: 'Reports',  emoji: '📊', hoverMascot: 'celebrating' },
      { href: '/budget',   icon: WalletCards,    label: 'Budget',   emoji: '💵', hoverMascot: 'rich' },
      { href: '/bills',    icon: CalendarDays,   label: 'Bills',    emoji: '🗓️', hoverMascot: 'sitting' },
      { href: '/wealth',   icon: TrendingUp, label: 'Wealth Path', emoji: '🎯', hoverMascot: 'rich' },
      { href: '/bank',     icon: Banknote,       label: 'Bank',     emoji: '🏦', hoverMascot: 'rich' },
      { href: '/returns',  icon: Undo2,          label: 'Returns',  emoji: '↩️', hoverMascot: 'surprised' },
      { href: '/rewards',  icon: Gift,           label: 'Rewards',  emoji: '🎁', hoverMascot: 'celebrating' },
      { href: '/stores',   icon: Store,          label: 'Stores',   emoji: '🏪', hoverMascot: 'happy' },
    ],
  },
  {
    // Chatter — the communication surfaces. Inbox (where forwarded
    // e-receipts land) + Chat (in-app assistant). Pulled out of Money
    // + More so users see them as one category instead of buried in
    // two unrelated places. "Chatter" picked over "Messages" / "Mail"
    // to stay on the Guac brand voice (Smashlist / Stash / Guac...)
    // without colliding with competitor vocabulary (Fetch's "Inbox"
    // means something different).
    title: 'Chatter',
    items: [
      { href: '/inbox',       icon: Mail,          label: 'Inbox',       emoji: '📬', hoverMascot: 'eating' },
      { href: '/notifications', icon: InboxIcon, label: 'Notifications', emoji: '🔔', hoverMascot: 'sitting' },
      { href: '/connections', icon: Link2,         label: 'Connections', emoji: '🔌', hoverMascot: 'thumbsup' },
    ],
  },
  {
    title: 'Shop',
    items: [
      { href: '/stash',       icon: Package,        label: 'My Items',    emoji: '📦', hoverMascot: 'sitting' },
      { href: '/bites',       icon: Utensils,       label: 'Bites',       emoji: '🍽️', hoverMascot: 'eating' },
      { href: '/shopping',    icon: ShoppingCart,   label: 'Shopping List', emoji: '🛒', hoverMascot: 'thumbsup' },
      { href: '/steals',      icon: BadgeDollarSign, label: 'Steals',     emoji: '💎', hoverMascot: 'rich' },
      { href: '/promotions',  icon: Megaphone,       label: 'Promotions', emoji: '📣', hoverMascot: 'celebrating' },
      { href: '/marketplace', icon: ShoppingBag,    label: 'Marketplace', emoji: '🛍️', hoverMascot: 'rich' },
      { href: '/coupons',     icon: Ticket,         label: 'Coupons',     emoji: '🎟️', hoverMascot: 'happy' },
    ],
  },
  {
    title: 'More',
    items: [
      { href: '/games',     icon: Gamepad2, label: 'Games',     emoji: '🎮', hoverMascot: 'celebrating' },
      { href: '/car-miles', icon: Car,   label: 'Car Miles', emoji: '🚗', hoverMascot: 'relaxing' },
      { href: '/profile',   icon: User,  label: 'Profile',   emoji: '👤', hoverMascot: 'sitting' },
      { href: '/profile#household', icon: Home, label: 'House', emoji: '🏡', hoverMascot: 'happy' },
    ],
  },
]

const navIconTones = [
  'text-violet-600',
  'text-blue-600',
  'text-fuchsia-600',
  'text-orange-600',
  'text-cyan-600',
  'text-rose-600',
]

export default function Sidebar({ isAdmin, find10 = false, initialPlanPercent = 10 }) {
  const [planPercent,setPlanPercent]=useState(initialPlanPercent)
  const [pendingCount,setPendingCount]=useState(null)
  const memberSections = sections.map(section => ({ ...section, items: section.items.filter(item => item.href !== '/guac-ai/agents' || isAdmin) }))
  const navigation = find10 ? memberSections.map((section, index) => index ? section : { ...section, items: [section.items[0], { href: '/my-plan/details', icon: TrendingUp, label: planPercent==null?'My Plan':`My ${planPercent}% Plan`, emoji: '🥑', hoverMascot: 'happy' }, { href: '/tasks', icon: ListTodo, label: 'Tasks' }, ...section.items.slice(1)] }) : memberSections
  const pathname = usePathname()
  const router = useRouter()
  useEffect(()=>{
    if(!find10)return
    let active=true
    const refresh=()=>fetch('/api/find-your-10/progress').then(r=>r.ok?r.json():null).then(result=>{if(active){setPlanPercent(result?.percent??null);setPendingCount(result?.pendingTasks??null)}}).catch(()=>{})
    refresh();const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);window.addEventListener('plan-updated',refresh)
    return ()=>{active=false;clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('plan-updated',refresh)}
  },[find10,pathname])
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
        'fixed lg:sticky lg:top-0 lg:self-start lg:h-screen inset-y-0 left-0 z-50 flex flex-col overflow-hidden font-sans',
        'bg-white text-slate-600',
        'border-r border-slate-200',
        'transform transition-all duration-200 ease-in-out',
        collapsed ? 'lg:w-24' : 'lg:w-64',
        'w-72',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )} style={{ fontFamily: 'var(--font-jakarta)' }}>
        {/* Brand */}
        <div className={clsx(
          'flex items-center border-b border-slate-200 h-16 shrink-0',
          collapsed ? 'lg:justify-center px-3' : 'px-6 justify-between'
        )}>
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
            {/* Brand logo — matches the marketing home-page lockup EXACTLY
                (MarketingShell.jsx): 🥑 emoji + "GetGuac" in Bricolage
                display, #15281C. The "money's wingman" tagline sits beneath
                it. Collapsed rail shows the emoji only. */}
            {collapsed ? (
              <span className="leading-none" style={{ fontSize: 22 }} aria-label="GetGuac">🥑</span>
            ) : (
              <div className="min-w-0">
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ fontSize: 22 }}>🥑</span>
                  <span style={{ fontFamily: 'var(--font-bricolage), sans-serif', fontWeight: 800, fontSize: 20, color: '#15281C', letterSpacing: '-0.02em' }}>GetGuac</span>
                </div>
                <div className="text-[10px] text-slate-600 font-bold mt-1 uppercase tracking-[0.14em]">money&apos;s wingman</div>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button type="button" aria-label="Close navigation" className="lg:hidden inline-flex min-h-11 min-w-11 items-center justify-center text-gray-500 hover:text-gray-800" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-1 overflow-y-auto">
          {navigation.map((section, sectionIndex) => (
            <div key={section.title} className={clsx('mb-0.5', collapsed && 'lg:mb-0.5')}>
              {!collapsed && (
                <div className="px-6 pb-1 pt-2 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  {section.title}
                </div>
              )}
              <div className={clsx('space-y-px', collapsed ? 'lg:px-2 px-3' : 'px-4')}>
                {section.items.map(({ href, icon: Icon, label }, itemIndex) => {
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
                          'group flex items-center rounded-xl text-sm transition-all',
                          collapsed ? 'lg:flex-col lg:justify-center lg:gap-1 lg:px-1 lg:py-2 px-3 py-1.5 gap-3' : 'gap-3 px-3.5 py-1.5',
                          // Active row is a flat avocado pill with an inset
                          // hairline ring — no pop/scale animation, so clicking
                          // a menu item never looks like it vibrates.
                          active
                            ? 'bg-violet-100 text-violet-800 font-extrabold shadow-[inset_0_0_0_1px_rgba(124,58,237,0.16)]'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-violet-700'
                        )}
                      >
                        <span className={clsx(
                          'flex items-center justify-center shrink-0 transition-colors',
                          collapsed
                            ? clsx('w-8 h-8 rounded-lg', active ? 'bg-white text-violet-700 shadow-sm ring-1 ring-violet-200/70' : 'group-hover:bg-white/70')
                            : clsx('w-5', active ? 'text-violet-700' : navIconTones[(sectionIndex + itemIndex) % navIconTones.length])
                        )}><Icon size={collapsed ? 18 : 16} strokeWidth={active ? 2.4 : 1.9} /></span>
                        {!collapsed ? (
                          <>
                            <span className="flex-1">{label}</span>
                            {/* Show chevron on the Inbox row when active so users
                                know it's a toggle as well as a link. */}
                            {href === '/inbox' && active && (
                              <ChevronDown size={14} className={`shrink-0 text-violet-700 transition-transform ${inboxSubExpanded ? '' : '-rotate-90'}`} />
                            )}
                          </>
                        ) : (
                          // Collapsed rail: tiny label tucked under the icon
                          // (email-client style). Desktop only — the mobile
                          // drawer is always full-width with normal rows.
                          <span className="hidden lg:block w-full text-[9.5px] font-semibold leading-[1.1] text-center tracking-tight">{label}</span>
                        )}
                        {href==='/tasks'&&pendingCount>0&&<span aria-label={`${pendingCount} pending tasks`} className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold tabular-nums text-violet-800">{pendingCount}</span>}
                      </Link>
                      {/* Inbox: render the Folders + Filters accordion inline when
                          the user is on the inbox page AND the sub-nav is expanded. */}
                      {href === '/inbox' && active && !collapsed && inboxSubExpanded && (
                        <InboxSubNav onNavigate={() => setSidebarOpen(false)} />
                      )}
                      {href === '/shopping' && !collapsed && <Link href="/shopping/groceries" onClick={() => setSidebarOpen(false)} className={clsx('ml-9 flex min-h-11 items-center rounded-lg px-3 text-sm', pathname === '/shopping/groceries' ? 'bg-violet-50 font-semibold text-violet-700' : 'text-gray-600 hover:bg-violet-50')}>Groceries</Link>}
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
                  collapsed ? 'lg:flex-col lg:justify-center lg:gap-0.5 lg:px-1 lg:py-1.5 px-3 py-1.5 gap-2.5' : 'gap-2.5 px-3 py-1.5',
                  pathname === '/admin'
                    ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 font-semibold shadow-sm ring-1 ring-amber-200'
                    : 'text-gray-600 hover:bg-amber-50 hover:text-amber-900'
                )}
              >
                <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/70 shadow-sm shrink-0"><ShieldCheck size={17} /></span>
                {!collapsed
                  ? <span>Admin</span>
                  : <span className="hidden lg:block w-full text-[9.5px] font-semibold leading-[1.1] text-center tracking-tight">Admin</span>}
              </Link>
            </div>
          )}
        </nav>

        {pathname === '/dashboard' && !collapsed && (
          <div className="hidden shrink-0 border-t border-slate-200 p-2 lg:block">
            <div className="rounded-xl border border-slate-200 bg-white p-2">
              <div className="flex items-center justify-between px-1 pb-1.5"><p className="text-[10px] font-black text-[#27372D]">Dashboard presets</p><span className="text-[10px] text-slate-400">ⓘ</span></div>
              {[['Everyday', LayoutDashboard, true], ['Save more', ShieldCheck, false], ['Pay debt', Banknote, false], ['Build wealth', TrendingUp, false]].map(([label, Icon, active]) => (
                <button type="button" key={label} className={clsx('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-colors', active ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50')}>
                  <Icon size={12}/><span className="flex-1 text-left">{label}</span>{active && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer: collapse toggle + logout */}
        <div className="border-t border-slate-200 p-3 space-y-1 shrink-0">
          <button type="button" onClick={() => { setSidebarOpen(false); window.dispatchEvent(new Event('guac-open-error-report')) }} title="Report error" aria-label="Report error" className={clsx('flex items-center w-full rounded-2xl text-sm font-medium text-slate-600 hover:bg-violet-50 hover:text-violet-700 min-h-11', collapsed ? 'lg:flex-col lg:justify-center lg:gap-0.5 lg:px-1 lg:py-1.5 px-3 py-1.5 gap-2.5' : 'gap-2.5 px-3 py-1.5')}>
            <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/70 shrink-0"><MessageSquare size={17}/></span>
            <span className={collapsed ? 'hidden lg:block w-full text-[9.5px] font-semibold leading-[1.1] text-center tracking-tight' : ''}>Report error</span>
          </button>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign Out' : undefined}
            className={clsx(
              'flex items-center w-full rounded-2xl text-sm font-medium transition-all',
              'text-slate-600 hover:bg-rose-50 hover:text-rose-700',
              collapsed ? 'lg:flex-col lg:justify-center lg:gap-0.5 lg:px-1 lg:py-1.5 px-3 py-1.5 gap-2.5' : 'gap-2.5 px-3 py-1.5'
            )}>
            <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/70 shrink-0"><LogOut size={17} /></span>
            {!collapsed
              ? <span>Sign Out</span>
              : <span className="hidden lg:block w-full text-[9.5px] font-semibold leading-[1.1] text-center tracking-tight">Sign Out</span>}
          </button>

          {/* Collapse toggle (desktop only) */}
          <button
            onClick={toggleSidebar}
            title={collapsed ? 'Expand' : 'Collapse'}
            className={clsx(
              'hidden lg:flex items-center w-full rounded-2xl text-xs font-semibold transition-all',
              'text-violet-700 hover:bg-violet-100',
              collapsed ? 'flex-col justify-center gap-0.5 px-1 py-1.5' : 'gap-2 px-3 py-2'
            )}>
            {collapsed
              ? <><ChevronsRight size={16} /><span className="text-[9.5px] leading-[1.1]">Expand</span></>
              : <><ChevronsLeft size={16} /> <span>Collapse</span></>}
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

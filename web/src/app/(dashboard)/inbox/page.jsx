'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import toast from 'react-hot-toast'
import {
  Mail, Search, Inbox as InboxIcon, Star, Archive, Trash2, Reply, Send, Loader2, X, Sparkles, Filter, Edit3, RefreshCw, ChevronsLeft, ChevronsRight, ChevronDown, DownloadCloud,
} from 'lucide-react'
import GuacMascot from '../../../components/GuacMascot'
import { displayStoreName } from '../../../lib/store-name-normalize'

const FILTERS = [
  { value: '',         label: 'All' },
  { value: 'unread',   label: 'Unread' },
  { value: 'receipts', label: 'Receipts' },
  { value: 'starred',  label: 'Starred' },
]

const FOLDERS = [
  { value: 'inbox',  label: 'Inbox',   icon: InboxIcon },
  { value: 'sent',   label: 'Sent',    icon: Send },
  { value: 'trash',  label: 'Trash',   icon: Trash2 },
]

export default function InboxPage() {
  const qc = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  // Folder + filter live in URL search params now (sidebar sub-nav drives them).
  // ?folder=sent  ?filter=unread, etc. Missing param = default ('inbox' / 'All').
  const folder = searchParams.get('folder') || 'inbox'
  const filter = searchParams.get('filter') || ''
  function setFolder(next) {
    const params = new URLSearchParams(searchParams.toString())
    if (!next || next === 'inbox') params.delete('folder'); else params.set('folder', next)
    router.replace(`/inbox${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
  }
  function setFilter(next) {
    const params = new URLSearchParams(searchParams.toString())
    if (!next) params.delete('filter'); else params.set('filter', next)
    router.replace(`/inbox${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
  }
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composePrefill, setComposePrefill] = useState(null)
  // Collapsed folder rail (icons-only). Persisted in localStorage.
  const [railCollapsed, setRailCollapsed] = useState(false)
  // Accordion: each section (Folders / Filters) can collapse to save vertical
  // space in the rail. Defaults: folders open (you need the inbox/sent/trash
  // shortcut), filters closed (most users keep the default 'All' filter).
  const [foldersOpen, setFoldersOpen] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const fo = localStorage.getItem('inbox_folders_open')
    const fi = localStorage.getItem('inbox_filters_open')
    if (fo === '0') setFoldersOpen(false)
    if (fi === '1') setFiltersOpen(true)
  }, [])
  function toggleFolders() {
    setFoldersOpen(v => {
      const next = !v
      if (typeof window !== 'undefined') localStorage.setItem('inbox_folders_open', next ? '1' : '0')
      return next
    })
  }
  function toggleFilters() {
    setFiltersOpen(v => {
      const next = !v
      if (typeof window !== 'undefined') localStorage.setItem('inbox_filters_open', next ? '1' : '0')
      return next
    })
  }
  useEffect(() => {
    const stored = typeof window !== 'undefined' && localStorage.getItem('inbox_rail_collapsed')
    if (stored === '1') setRailCollapsed(true)
  }, [])
  function toggleRail() {
    setRailCollapsed(v => {
      const next = !v
      if (typeof window !== 'undefined') localStorage.setItem('inbox_rail_collapsed', next ? '1' : '0')
      return next
    })
  }

  const list = useQuery({
    queryKey: ['inbox', folder, filter, q],
    queryFn: async () => {
      const params = new URLSearchParams({ folder, filter, q })
      const res = await fetch(`/api/email/list?${params}`)
      if (!res.ok) throw new Error('Could not load inbox')
      return res.json()
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })

  const message = useQuery({
    queryKey: ['email', selectedId],
    queryFn: async () => {
      if (!selectedId) return null
      const res = await fetch(`/api/email/${selectedId}`)
      if (!res.ok) throw new Error('Could not load message')
      return res.json()
    },
    enabled: !!selectedId,
  })

  const patch = useMutation({
    mutationFn: async ({ id, ...body }) => {
      const res = await fetch(`/api/email/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Update failed')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox'] })
      qc.invalidateQueries({ queryKey: ['email', selectedId] })
    },
  })

  const trash = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/email/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      return res.json()
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['inbox'] })
      setSelectedId(null)
      toast.success(data?.removed ? 'Removed permanently' : 'Moved to Trash')
    },
  })

  // Force-pull from IMAP across every folder (INBOX, g, receipts). Rate-limited
  // server-side to 1 call per 5 min per user — the toast surfaces that cooldown
  // along with per-folder counts so the user can see exactly what arrived.
  const backfill = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/email/backfill', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || `Backfill failed (${res.status})`)
      return body
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['inbox'] })
      const perFolder = data?.messages_per_folder || {}
      const counts = Object.entries(perFolder).map(([k, v]) => `${k}: ${v}`).join(', ')
      toast.success(
        `Backfill: ${data?.inserted || 0} new, ${data?.drafted || 0} drafted${counts ? ` (${counts})` : ''}`,
        { duration: 6000 }
      )
    },
    onError: (e) => toast.error(e.message),
  })

  const messages = list.data?.messages || []
  const total = list.data?.total || 0

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <GuacMascot expression="eating" size={64} />
          <div>
            <h1 className="page-title">Inbox</h1>
            {(() => {
              const todayStr = new Date().toISOString().slice(0, 10)
              const filed = messages.filter(m => m.receipt)
              const filedToday = filed.filter(m => (m.received_at || '').slice(0, 10) === todayStr)
              return (
                <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span><span className="font-semibold text-gray-700">{total}</span> message{total === 1 ? '' : 's'}</span>
                  {filed.length > 0 && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-emerald-700">🥑 <span className="font-semibold">{filed.length}</span> filed</span>
                    </>
                  )}
                  {filedToday.length > 0 && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        {filedToday.length} today
                      </span>
                    </>
                  )}
                </p>
              )
            })()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => list.refetch()}
            className="btn-secondary flex items-center gap-2"
            title="Refresh"
          >
            <RefreshCw size={14} className={list.isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => backfill.mutate()}
            disabled={backfill.isPending}
            className="btn-secondary flex items-center gap-2"
            title="Force-pull from IMAP (1/5 min). Use this when a forwarded receipt isn't showing up."
          >
            <DownloadCloud size={14} className={backfill.isPending ? 'animate-pulse' : ''} />
            {backfill.isPending ? 'Pulling…' : 'Backfill'}
          </button>
          <button
            onClick={() => { setComposePrefill(null); setComposeOpen(true) }}
            className="btn-primary flex items-center gap-2"
          >
            <Edit3 size={14} /> Compose
          </button>
        </div>
      </div>

      {/* Resizable 2-pane layout: message list + preview. The Folders /
          Filters sub-nav now lives in the main left sidebar (under the Inbox
          item) instead of a separate panel here. Sizes persist in
          localStorage via autoSaveId. */}
      <div className="h-[calc(100vh-200px)] hidden lg:block">
        <PanelGroup direction="horizontal" autoSaveId="inbox-layout-v2" className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
          {/* List panel */}
          <Panel defaultSize={35} minSize={20}>
            <section className="h-full bg-white flex flex-col">
              <div className="p-3 border-b border-gray-100 flex items-center gap-2 shrink-0">
                <Search size={14} className="text-gray-400" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search sender, subject, preview…"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {list.isLoading ? (
                  <div className="p-10 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Loading…
                  </div>
                ) : messages.length === 0 ? (
                  <EmptyState folder={folder} filter={filter} />
                ) : (
                  messages.map(m => (
                    <MessageRow
                      key={m.id}
                      m={m}
                      selected={selectedId === m.id}
                      onClick={() => setSelectedId(m.id)}
                      onToggleStar={() => patch.mutate({ id: m.id, starred: !m.starred })}
                    />
                  ))
                )}
              </div>
            </section>
          </Panel>

          <PanelResizeHandle className="w-1 bg-gray-100 hover:bg-emerald-300 transition-colors data-[resize-handle-active]:bg-emerald-400" />

          {/* Preview panel */}
          <Panel defaultSize={47} minSize={25}>
            <section className="h-full bg-white flex flex-col">
              {selectedId && message.data?.message ? (
                <MessagePreview
                  m={message.data.message}
                  onStar={() => patch.mutate({ id: selectedId, starred: !message.data.message.starred })}
                  onTrash={() => { if (confirm('Move to Trash?')) trash.mutate(selectedId) }}
                  onReply={() => {
                    const m = message.data.message
                    setComposePrefill({
                      to: m.from_addr,
                      subject: m.subject?.startsWith('Re:') ? m.subject : `Re: ${m.subject || ''}`,
                      body: `\n\n———\nOn ${new Date(m.received_at).toLocaleString()}, ${m.from_addr} wrote:\n${(m.body_text || m.preview || '').split('\n').map(l => '> ' + l).join('\n').slice(0, 4000)}`,
                      in_reply_to_id: m.id,
                    })
                    setComposeOpen(true)
                  }}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm flex-col gap-4 px-6 text-center bg-gradient-to-br from-emerald-50/40 to-lime-50/30">
                  <GuacMascot expression="relaxing" size={120} />
                  <div className="space-y-1.5">
                    <p className="font-bold text-emerald-900 text-base">Pick a message to read</p>
                    <p className="text-gray-500 text-xs max-w-xs">
                      Forward any receipt to your <span className="font-mono font-semibold text-emerald-700">+g</span> address and Guac-AI will file it as a receipt automatically.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </Panel>
        </PanelGroup>
      </div>

      {/* Mobile/tablet stacked layout (no resize) */}
      <div className="lg:hidden space-y-3">
        {!selectedId ? (
          <>
            <div className="card p-2 flex gap-1 overflow-x-auto">
              {FOLDERS.map(f => {
                const active = folder === f.value
                return (
                  <button key={f.value} onClick={() => setFolder(f.value)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${active ? 'bg-emerald-100 text-emerald-900' : 'text-gray-600'}`}>
                    {f.label}
                  </button>
                )
              })}
              <span className="border-l border-gray-200 mx-1" />
              {FILTERS.map(f => (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${filter === f.value ? 'bg-amber-100 text-amber-900' : 'text-gray-500'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="card p-0 overflow-hidden">
              <div className="p-3 border-b border-gray-100 flex items-center gap-2">
                <Search size={14} className="text-gray-400" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="flex-1 bg-transparent text-sm outline-none" />
              </div>
              <div className="divide-y divide-gray-50 max-h-[calc(100vh-280px)] overflow-y-auto">
                {messages.length === 0
                  ? <EmptyState folder={folder} filter={filter} />
                  : messages.map(m => (
                      <MessageRow key={m.id} m={m} selected={false}
                        onClick={() => setSelectedId(m.id)}
                        onToggleStar={() => patch.mutate({ id: m.id, starred: !m.starred })} />
                    ))}
              </div>
            </div>
          </>
        ) : (
          <div className="card p-0 overflow-hidden">
            <button onClick={() => setSelectedId(null)} className="px-4 py-2 text-sm font-semibold text-emerald-700 flex items-center gap-1">
              ← Back
            </button>
            {message.data?.message && (
              <MessagePreview
                m={message.data.message}
                onStar={() => patch.mutate({ id: selectedId, starred: !message.data.message.starred })}
                onTrash={() => { if (confirm('Move to Trash?')) trash.mutate(selectedId) }}
                onReply={() => {
                  const m = message.data.message
                  setComposePrefill({
                    to: m.from_addr,
                    subject: m.subject?.startsWith('Re:') ? m.subject : `Re: ${m.subject || ''}`,
                    body: `\n\n———\nOn ${new Date(m.received_at).toLocaleString()}, ${m.from_addr} wrote:\n${(m.body_text || m.preview || '').split('\n').map(l => '> ' + l).join('\n').slice(0, 4000)}`,
                    in_reply_to_id: m.id,
                  })
                  setComposeOpen(true)
                }}
              />
            )}
          </div>
        )}
      </div>

      {composeOpen && (
        <ComposeModal
          prefill={composePrefill}
          onClose={() => { setComposeOpen(false); setComposePrefill(null) }}
          onSent={() => {
            setComposeOpen(false)
            setComposePrefill(null)
            qc.invalidateQueries({ queryKey: ['inbox'] })
            toast.success('Message sent')
          }}
        />
      )}
    </div>
  )
}

// Strip the email-wrapper boilerplate from a preview string so we show the
// actual content of forwarded receipts instead of "----- Forwarded message -----"
// on every row. Cheap, idempotent, runs in O(n) per row.
function cleanPreview(s) {
  if (!s) return ''
  return s
    .replace(/-{3,}\s*Forwarded message\s*-{3,}/gi, '')
    .replace(/^(From|To|Sent|Date|Subject|Cc|Bcc):.*$/gim, '')
    .replace(/Sent from my (iPhone|iPad|Android|Samsung|Galaxy)[^\n]*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatMoney(n) {
  if (n == null || isNaN(n)) return null
  const abs = Math.abs(Number(n))
  const sign = Number(n) < 0 ? '-' : ''
  return `${sign}$${abs.toFixed(2)}`
}

function MessageRow({ m, selected, onClick, onToggleStar }) {
  const unread = !m.read_at
  const rcpt = m.receipt  // embedded { store_name, total_amount, date, is_return, processed }
  const isReceipt = !!rcpt
  const isReturn = rcpt?.is_return
  const amount = rcpt ? formatMoney(rcpt.total_amount) : null
  const cleanedPreview = cleanPreview(m.preview)
  return (
    <button
      onClick={onClick}
      className={`w-full text-left pl-2 pr-3 py-2.5 flex items-start gap-2 transition relative ${
        selected ? 'bg-emerald-50' : unread ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-50'
      }`}
    >
      {/* Avocado-green accent stripe for receipt-hook rows — instant visual scan */}
      {m.is_receipts_hook && (
        <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-r ${
          isReturn ? 'bg-rose-400' : isReceipt && rcpt?.processed ? 'bg-emerald-500' : 'bg-emerald-300 animate-pulse'
        }`} />
      )}
      <span
        onClick={(e) => { e.stopPropagation(); onToggleStar() }}
        className="mt-1 cursor-pointer ml-1"
        title={m.starred ? 'Unstar' : 'Star'}
      >
        <Star size={14} className={m.starred ? 'fill-amber-400 text-amber-500' : 'text-gray-300 hover:text-amber-400'} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {isReceipt ? (
            <>
              <span className="text-base">{isReturn ? '↩️' : '🥑'}</span>
              <span className={`text-sm truncate ${unread ? 'font-extrabold text-emerald-900' : 'font-bold text-emerald-800'}`}>
                {displayStoreName(rcpt.store_name) || 'Receipt'}
              </span>
              {amount && (
                <span className={`text-xs font-extrabold tabular-nums ${isReturn ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {amount}
                </span>
              )}
              {!rcpt.processed && (
                <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">Parsing…</span>
              )}
            </>
          ) : (
            <>
              <span className={`text-xs truncate ${unread ? 'font-extrabold text-gray-900' : 'font-semibold text-gray-600'}`}>
                {trimAddr(m.from_addr)}
              </span>
              {m.is_receipts_hook && (
                <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">+g</span>
              )}
            </>
          )}
          <span className="text-[10px] text-gray-400 ml-auto shrink-0">{shortDate(m.received_at)}</span>
        </div>
        <p className={`text-sm truncate ${unread ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
          {m.subject || '(no subject)'}
        </p>
        {cleanedPreview && (
          <p className="text-xs text-gray-500 truncate">{cleanedPreview}</p>
        )}
      </div>
    </button>
  )
}

function MessagePreview({ m, onStar, onTrash, onReply }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 text-base leading-snug">{m.subject || '(no subject)'}</h2>
          <p className="text-xs text-gray-500 mt-1">
            <strong>{m.from_addr}</strong> · {new Date(m.received_at).toLocaleString()}
          </p>
          {m.delivered_to && m.delivered_to !== m.to_addr && (
            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">Delivered to: {m.delivered_to}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onStar} className="p-2 hover:bg-amber-50 rounded-lg" title={m.starred ? 'Unstar' : 'Star'}>
            <Star size={16} className={m.starred ? 'fill-amber-400 text-amber-500' : 'text-gray-400'} />
          </button>
          <button onClick={onReply} className="p-2 hover:bg-emerald-50 rounded-lg" title="Reply">
            <Reply size={16} className="text-emerald-700" />
          </button>
          <button onClick={onTrash} className="p-2 hover:bg-rose-50 rounded-lg" title="Trash">
            <Trash2 size={16} className="text-rose-600" />
          </button>
        </div>
      </div>
      {m.processed && m.receipt_id && (
        <div className="px-4 py-2 bg-amber-50/60 border-b border-amber-100 text-xs text-amber-900 flex items-center gap-2">
          <Sparkles size={12} /> Guac-AI parsed this into a receipt.
          <a href={`/receipts/${m.receipt_id}`} className="ml-auto font-bold text-amber-800 hover:underline">Open receipt →</a>
        </div>
      )}
      <div className="flex-1 overflow-y-auto bg-white">
        <MessageBody m={m} />
      </div>
    </div>
  )
}

// Renders the message body. Prefers the HTML version (full layout, images,
// tables, logos) inside a sandboxed iframe so the email's CSS can't escape
// and clobber our app's styles. Falls back to plain text otherwise.
function MessageBody({ m }) {
  const [view, setView] = useState(m.body_html ? 'html' : 'text')
  const hasHtml = !!m.body_html
  const hasText = !!m.body_text
  const iframeRef = useRef(null)
  const [iframeHeight, setIframeHeight] = useState(null)

  // Auto-resize iframe to the email body's actual content height. Without this
  // the iframe takes the panel's full height and leaves a huge whitespace gap
  // below short emails (Amazon "Ordered:" emails are particularly bad — three
  // items, then 1000px of nothing).
  //
  // The iframe reports its scrollHeight to us via postMessage; we set the
  // iframe's `style.height` to match. Re-fires on image load + window resize.
  useEffect(() => {
    function handler(e) {
      if (!iframeRef.current) return
      if (e.source !== iframeRef.current.contentWindow) return
      if (typeof e.data?.guacEmailHeight === 'number') {
        // Cap at 5000px so a truly massive marketing email still has a scroll
        // ceiling rather than overflowing the page indefinitely.
        setIframeHeight(Math.min(5000, Math.max(120, e.data.guacEmailHeight)))
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Reset the height when switching messages so we re-measure
  useEffect(() => { setIframeHeight(null) }, [m.id, view])

  if (!hasHtml && !hasText) {
    return <div className="p-5 text-sm text-gray-400">(Empty body)</div>
  }

  return (
    <div className="flex flex-col h-full">
      {hasHtml && hasText && (
        <div className="px-4 pt-3 pb-1 border-b border-gray-100 flex items-center gap-1 text-[11px] shrink-0">
          <span className="text-gray-400 mr-1">View:</span>
          <button
            onClick={() => setView('html')}
            className={`px-2 py-1 rounded-full font-semibold ${view === 'html' ? 'bg-emerald-100 text-emerald-900' : 'text-gray-500 hover:bg-gray-100'}`}
          >Rich</button>
          <button
            onClick={() => setView('text')}
            className={`px-2 py-1 rounded-full font-semibold ${view === 'text' ? 'bg-emerald-100 text-emerald-900' : 'text-gray-500 hover:bg-gray-100'}`}
          >Plain</button>
        </div>
      )}
      {view === 'html' && hasHtml ? (
        // Wrap the iframe in a scroll container so the iframe itself can size
        // to content (no internal scrollbar, no trailing whitespace) while the
        // parent still scrolls when the email is taller than the panel.
        <div className="flex-1 overflow-y-auto bg-white">
          <iframe
            ref={iframeRef}
            // allow-scripts is required for the height-reporting postMessage to fire
            // from inside the sandboxed iframe. Without allow-same-origin the script
            // can't read cookies or the parent DOM, which is enough isolation for
            // arbitrary marketing HTML.
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            srcDoc={buildEmailSrcDoc(m.body_html)}
            title={`email-${m.id}`}
            style={iframeHeight ? { height: iframeHeight + 'px' } : { height: '120px' }}
            className="w-full bg-white border-0 block"
          />
        </div>
      ) : (
        <div className="flex-1 p-5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-sans overflow-y-auto">
          {m.body_text || (m.preview ? m.preview + '…' : '(Empty body)')}
        </div>
      )}
    </div>
  )
}

// Wrap the raw HTML with a base styling preamble so it renders consistently
// inside the iframe (most marketing emails assume Gmail-ish defaults).
function buildEmailSrcDoc(html) {
  return `<!doctype html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base target="_blank">
<style>
  html, body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; }
  body { word-wrap: break-word; }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
  a { color: #15803d; }
</style>
</head><body>${html}
<script>
  // Report our document height to the parent so it can size the iframe to fit
  // the actual content (avoids huge whitespace below short emails).
  (function () {
    function report() {
      try {
        var h = Math.max(
          document.documentElement.scrollHeight,
          document.body ? document.body.scrollHeight : 0
        );
        parent.postMessage({ guacEmailHeight: h }, '*');
      } catch (_) {}
    }
    window.addEventListener('load', report);
    window.addEventListener('resize', report);
    // Re-fire after lazy-loaded images settle
    setTimeout(report, 200);
    setTimeout(report, 800);
    setTimeout(report, 2000);
    // Re-fire whenever an image finishes loading
    var imgs = document.images || [];
    for (var i = 0; i < imgs.length; i++) imgs[i].addEventListener('load', report);
  })();
</script>
</body></html>`
}

function ComposeModal({ prefill, onClose, onSent }) {
  const [to, setTo] = useState(prefill?.to || '')
  const [subject, setSubject] = useState(prefill?.subject || '')
  const [body, setBody] = useState(prefill?.body || '')
  const [sending, setSending] = useState(false)

  async function send() {
    if (!to || !body.trim()) {
      toast.error('To + body required')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body, in_reply_to_id: prefill?.in_reply_to_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')
      onSent()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">{prefill?.in_reply_to_id ? 'Reply' : 'New message'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3 flex-1 overflow-y-auto">
          <input className="input" placeholder="To" value={to} onChange={e => setTo(e.target.value)} />
          <input className="input" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
          <textarea className="input min-h-[280px] resize-y" placeholder="Write your message…" value={body} onChange={e => setBody(e.target.value)} />
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">Sent from your GetGuac Mail · TLS</p>
          <button onClick={send} disabled={sending} className="btn-primary flex items-center gap-2">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ folder, filter }) {
  return (
    <div className="p-10 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
      <GuacMascot expression="relaxing" size={84} />
      <p>
        {filter === 'unread'   ? 'All caught up. Nothing unread.' :
         filter === 'receipts' ? 'No receipts forwarded yet. Try forwarding an order confirmation to your +g address.' :
         filter === 'starred'  ? 'No starred messages.' :
         folder === 'trash'    ? 'Trash is empty.' :
         folder === 'sent'     ? "You haven't sent anything yet." :
                                 'Your inbox is empty. Mail will arrive here within 10 minutes of being sent to your GetGuac address.'}
      </p>
    </div>
  )
}

function trimAddr(s) {
  if (!s) return '—'
  const m = s.match(/^"?([^"<]+?)"?\s*<.+>$/) || s.match(/^([^@]+)@/)
  return (m ? m[1] : s).trim()
}

function shortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString([], { year: '2-digit', month: 'short', day: 'numeric' })
}

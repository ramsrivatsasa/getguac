// Reusable per-item Share button — small circular icon that opens a
// channel-picker dropdown (WhatsApp / SMS / Email / Copy / native
// sheet). On pick, the caller-supplied buildPayload() produces a
// snapshot JSON, the component mints a /share/<token> URL via
// /api/share/create, and routes the user through their channel of
// choice with the URL appended (or passed as the structured `url`
// field for the native sheet so it triggers a rich preview).
//
// Used by both:
//   - Buy Again card on /shopping
//   - Stash ProductCard on /stash
//
// Props:
//   item                    — the row being shared (powers the toast +
//                             share-text title; not part of the payload)
//   buildPayload()          — async, returns the kind='item' payload
//                             the public /share/[token] page renders
//   triggerClassName        — optional override for the button styling
'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Share2, MessageCircle, Phone, Mail, Copy } from 'lucide-react'

export function ShareItemButton({ item, buildPayload, triggerClassName }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  function handleBlur(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
  }

  async function mintShareUrl(channel) {
    setBusy(true)
    try {
      const payload = await buildPayload()
      const res = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'item', payload, channel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Share failed')
      return data.url
    } finally {
      setBusy(false)
    }
  }

  async function go(channel) {
    setOpen(false)
    try {
      const url = await mintShareUrl(channel)
      const title = item?.item_name || 'Check this out on GetGuac'
      const text = `🥑 Check out "${title}" on GetGuac:`
      if (channel === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener,noreferrer')
      } else if (channel === 'sms') {
        const isPhone = /iPhone|iPad|Android/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')
        if (isPhone) {
          window.location.href = `sms:?body=${encodeURIComponent(`${text} ${url}`)}`
        } else {
          await navigator.clipboard.writeText(`${text} ${url}`)
          toast.success('SMS not supported on desktop — copied so you can paste')
        }
      } else if (channel === 'email') {
        const subject = `Check out ${title} on GetGuac`
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`
      } else if (channel === 'copy') {
        await navigator.clipboard.writeText(`${text} ${url}`)
        toast.success('Copied — paste anywhere 🛒')
      } else if (channel === 'native') {
        if (typeof navigator?.share === 'function') {
          try {
            await navigator.share({ title, text, url })
            return
          } catch (e) {
            if (e?.name === 'AbortError') return
          }
        }
        await navigator.clipboard.writeText(`${text} ${url}`)
        toast.success('Copied — paste anywhere 🛒')
      }
    } catch (e) {
      toast.error(e.message || 'Share failed')
    }
  }

  return (
    <div className="relative inline-block" onBlur={handleBlur}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        disabled={busy}
        title="Share this item"
        className={triggerClassName || 'w-8 h-8 rounded-xl bg-white/70 hover:bg-white text-emerald-700 hover:text-emerald-900 ring-1 ring-emerald-200 shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-center'}
      >
        <Share2 size={13} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-52 rounded-xl bg-white shadow-xl ring-1 ring-gray-200 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
            Share this item via…
          </div>
          {[
            { key: 'whatsapp', icon: <MessageCircle size={14} className="text-emerald-600" />, label: 'WhatsApp', tone: 'hover:bg-emerald-50' },
            { key: 'sms',      icon: <Phone size={14} className="text-sky-600" />,            label: 'Text / SMS', tone: 'hover:bg-sky-50' },
            { key: 'email',    icon: <Mail size={14} className="text-amber-600" />,           label: 'Email',     tone: 'hover:bg-amber-50' },
            { key: 'copy',     icon: <Copy size={14} className="text-gray-600" />,            label: 'Copy link', tone: 'hover:bg-gray-50' },
            { key: 'native',   icon: <Share2 size={14} className="text-violet-600" />,        label: 'More…',     tone: 'hover:bg-violet-50' },
          ].map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => go(opt.key)}
              disabled={busy}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-800 disabled:opacity-50 ${opt.tone}`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

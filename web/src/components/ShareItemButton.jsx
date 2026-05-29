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
// Why the dropdown goes through createPortal:
//   Both cards live in a CSS grid where every card has `transform:
//   scale` for hover effects — each one is its own stacking context.
//   An absolute-positioned dropdown inside a card can't z-index above
//   a sibling card (they're not in the same stacking context). The
//   portal renders the menu directly under document.body so it
//   floats above every card unconditionally.
'use client'
import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { Share2, MessageCircle, Phone, Mail, Copy } from 'lucide-react'

export function ShareItemButton({ item, buildPayload, triggerClassName }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pos, setPos] = useState(null)  // { top, right } in viewport coords
  const btnRef = useRef(null)
  const menuRef = useRef(null)

  // Measure the trigger button when the menu opens so we know where
  // to render the floating panel. useLayoutEffect runs synchronously
  // so the panel doesn't flash at (0,0) before the position lands.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    })
  }, [open])

  // Click-outside: close when a click lands outside both the trigger
  // and the menu. Listening on `mousedown` (not click) so the menu
  // closes on the same tick the user starts interacting elsewhere.
  useEffect(() => {
    if (!open) return
    function onDown(e) {
      const t = e.target
      if (btnRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

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

  const menu = open && pos && typeof window !== 'undefined' && createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: pos.top,
        right: pos.right,
        zIndex: 9999,
      }}
      className="w-52 rounded-xl bg-white shadow-2xl ring-1 ring-gray-200 overflow-hidden"
    >
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
    </div>,
    document.body,
  )

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        disabled={busy}
        title="Share this item"
        className={triggerClassName || 'w-8 h-8 rounded-xl bg-white/70 hover:bg-white text-emerald-700 hover:text-emerald-900 ring-1 ring-emerald-200 shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-center'}
      >
        <Share2 size={13} />
      </button>
      {menu}
    </>
  )
}

'use client'
// The "Guac (AI)" conversation inside /chat — a pinned assistant thread that
// sits alongside the person-to-person DM threads. Mirrors Thread's layout
// (header / scroll area / composer) so the two kinds of conversation feel
// like one surface. Answers come from POST /api/chat, which grounds the
// model in a server-built snapshot of the signed-in user's receipts.
//
// The conversation persists per-tab in sessionStorage (capped) — enough to
// survive navigation, gone when the tab closes. Nothing is written to the DB.

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Send, Eraser, X } from 'lucide-react'

// Render an assistant reply, turning [label](/in-app/path) markdown links into
// clickable in-app links (Guac emits these for "show me my Costco receipts",
// "open my reports", etc.). Only internal paths (starting with /) are linked —
// external URLs are left as plain text, so the model can't smuggle links out.
function renderRich(text) {
  const out = []
  const re = /\[([^\]]+)\]\((\/[^)\s]+)\)/g
  let last = 0, m, key = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(
      <Link key={key++} href={m[2]} className="underline font-semibold text-guac-700 hover:text-guac-800">{m[1]}</Link>,
    )
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
import GuacMascot from './GuacMascot'

const STORE_KEY = 'gg-ai-chat-v1'

const STARTERS = [
  'Where did my money go this month?',
  'What subscriptions am I paying for?',
  'Which store do I spend the most at?',
  'How do I forward email receipts?',
]

function loadThread() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null')
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

export default function GuacAiThread({ onBack, onClose, heightClass = 'h-[70vh]' }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)

  // sessionStorage is browser-only — hydrate after mount.
  useEffect(() => { setMessages(loadThread()) }, [])
  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-40))) } catch {}
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, busy])

  async function send(text) {
    const content = (text ?? input).trim()
    if (!content || busy) return
    setInput('')
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-16) }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
      setMessages(m => [...m, { role: 'assistant', content: json.reply, sources: Array.isArray(json.sources) ? json.sources : [] }])
    } catch (e) {
      toast.error(e.message)
      // put the question back so a retry is one keystroke away
      setMessages(m => m.slice(0, -1))
      setInput(content)
    } finally {
      setBusy(false)
    }
  }

  function clearThread() {
    setMessages([])
    try { sessionStorage.removeItem(STORE_KEY) } catch {}
  }

  return (
    <div className={`flex flex-col ${heightClass}`}>
      <header className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5 shrink-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="lg:hidden text-guac-700 text-xs font-semibold"
          >← Back</button>
        )}
        <GuacMascot expression="happy" size={22} className="shrink-0" />
        <span className="font-semibold text-gray-800 text-sm truncate">Guac · AI assistant</span>
        <div className="ml-auto flex items-center gap-1.5">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearThread}
              className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Eraser size={12} /> Clear
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close Guac AI" className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-6 px-4 flex flex-col items-center gap-2">
            <GuacMascot expression="happy" size={52} />
            <p className="text-sm font-bold text-gray-800">Hey — I&apos;m Guac 🥑</p>
            <p className="text-xs text-gray-500 max-w-sm">
              I can read a summary of your receipts and answer questions about your
              spending, subscriptions, and stores — or explain any GetGuac feature.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {STARTERS.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="px-3 py-1.5 rounded-full bg-white ring-1 ring-gray-200 text-xs font-semibold text-guac-700 hover:bg-guac-50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => {
          const mine = m.role === 'user'
          return (
            <div key={idx} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex flex-col gap-1 max-w-[78%] ${mine ? 'items-end' : 'items-start'}`}>
                <div className={`anim-bubble-in rounded-2xl px-3 py-1.5 text-sm leading-snug whitespace-pre-wrap ${
                  mine
                    ? 'bg-guac-700 text-white rounded-br-md'
                    : 'bg-white text-gray-800 ring-1 ring-gray-100 rounded-bl-md'
                }`}>
                  {mine ? m.content : renderRich(m.content)}
                </div>
                {!mine && m.sources?.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-1">
                    {m.sources.map((s, i) => (
                      <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" title={s.title}
                        className="inline-flex items-center gap-1 text-[10px] max-w-[170px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 hover:text-guac-700 hover:bg-guac-50 transition-colors">
                        🔗 <span className="truncate">{s.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {busy && (
          <div className="flex justify-start">
            <div className="anim-bubble-in rounded-2xl rounded-bl-md bg-white ring-1 ring-gray-100 px-3 py-2.5 inline-flex items-center gap-1" aria-label="Guac is typing">
              <span className="w-1.5 h-1.5 rounded-full bg-guac-600 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-guac-600 animate-bounce" style={{ animationDelay: '140ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-guac-600 animate-bounce" style={{ animationDelay: '280ms' }} />
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send() }}
        className="flex gap-2 p-2 border-t border-gray-100 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about your spending…"
          maxLength={2000}
          className="input flex-1 text-sm"
        />
        <button type="submit" className="btn-primary text-xs px-3" disabled={busy || !input.trim()}>
          <Send size={12} />
        </button>
      </form>
      <p className="text-center text-[10px] text-gray-400 px-3 pb-2">
        Guac reads a summary of your receipts to answer — it never changes your data.
      </p>
    </div>
  )
}

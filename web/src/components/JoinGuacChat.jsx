'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Send, Sparkles, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import GuacMascot from './GuacMascot'
import { trackClick } from '../lib/track-click'

const STORE_KEY = 'gg-join-agent-v2'

const STARTERS = [
  'How does GetGuac save me money?',
  'Is GetGuac really free?',
  'Do I need to connect my bank?',
]

const WELCOME = {
  role: 'assistant',
  content: 'Hey — I’m Guac 🥑 What would you like help with: understanding your spending, catching subscriptions, tracking receipts, or seeing how GetGuac works?',
}

function renderReply(text) {
  return String(text).split(/(\/login\?demo=1|\/start)/g).map((part, index) => {
    if (part === '/login?demo=1') return <Link key={index} href={part} target="_blank" rel="noopener noreferrer" onClick={() => trackClick('join-chat-demo-link')} className="font-extrabold text-[#4D7C0F] underline underline-offset-2">Try the demo</Link>
    if (part === '/start') return <Link key={index} href={part} target="_blank" rel="noopener noreferrer" onClick={() => trackClick('join-chat-signup-link')} className="font-extrabold text-[#4D7C0F] underline underline-offset-2">Join free</Link>
    return part
  })
}

export default function JoinGuacChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null')
      if (Array.isArray(saved) && saved.length) setMessages(saved.slice(-12))
    } catch {}
    const timer = setTimeout(() => setOpen(true), 900)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-12))) } catch {}
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, busy, open])

  async function send(value) {
    const content = (value ?? input).trim()
    if (!content || busy) return
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const res = await fetch('/api/join-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-10) }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'I could not answer that just now.')
      setMessages(current => [...current, { role: 'assistant', content: json.reply }])
    } catch (error) {
      setMessages(current => [...current, {
        role: 'assistant',
        content: `${error.message} You can still explore the demo or create a free account — no card required.`,
      }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-[70]">
      {open ? (
        <section
          aria-label="Chat with Guac"
          className="max-h-[calc(100dvh-1.5rem)] w-[min(324px,calc(100vw-1.5rem))] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-[#D9E2DA]"
        >
          <header className="flex items-center gap-2.5 border-b border-gray-100 bg-white px-4 py-3 text-[#1F2937]">
            <GuacMascot expression="happy" size={25} className="shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-extrabold">Guac · AI assistant</div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Guac-AI" className="ml-auto rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <X size={18} />
            </button>
          </header>

          <div ref={scrollRef} className="relative h-[min(32vh,250px)] space-y-3 overflow-y-auto bg-[#F8FAFB] p-3">
            {messages.length === 1 && (
              <div className="flex min-h-full flex-col items-center justify-center px-3 py-6 text-center">
                <GuacMascot expression="happy" size={46} />
                <h2 className="mt-4 text-base font-extrabold text-[#1F2937]">Hey — I&apos;m Guac 🥑</h2>
                <p className="mt-1.5 max-w-[310px] text-xs leading-relaxed text-gray-500">
                  Ask me how GetGuac reads receipts, catches subscriptions, tracks returns, and helps you understand where your money goes.
                </p>
                <div className="mt-4 flex w-full max-w-[300px] flex-col items-stretch gap-2">
                  <Link href="/login?demo=1" target="_blank" rel="noopener noreferrer" onClick={() => trackClick('join-chat-demo-starter')} className="rounded-full bg-white px-4 py-2 text-center text-xs font-extrabold text-[#4D7C0F] shadow-sm ring-1 ring-[#CFE1C1] transition hover:bg-[#F0F7E8]">
                    🥑 Try our demo
                  </Link>
                  {STARTERS.map(question => (
                    <button key={question} type="button" onClick={() => send(question)} className="rounded-full bg-white px-4 py-2 text-center text-xs font-bold text-[#155E3B] shadow-sm ring-1 ring-gray-200 transition hover:bg-[#F0F7E8]">
                      {question}
                    </button>
                  ))}
                  <div className="mt-1 flex items-center justify-between gap-3 rounded-2xl bg-white p-2 pl-3 shadow-sm ring-1 ring-gray-200">
                    <span className="text-left text-xs font-bold text-[#1F2937]">Do you want to play free games?</span>
                    <Link href="/games" target="_blank" rel="noopener noreferrer" onClick={() => trackClick('join-chat-games')} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FF7548] via-[#F7B733] to-[#39CFA0] px-3 py-2 text-xs font-extrabold text-white shadow-md transition hover:-translate-y-0.5">
                      🎮 Games
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message, index) => index === 0 ? null : (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[86%] flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-br-md bg-[#4D7C0F] text-white' : 'rounded-bl-md bg-white text-[#26342B] shadow-sm ring-1 ring-black/5'}`}>
                    {message.role === 'assistant' ? renderReply(message.content) : message.content}
                  </div>
                  {message.role === 'assistant' && index > 0 && (
                    <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-gray-400">
                      Helpful?
                      <button type="button" aria-label="Helpful answer" onClick={() => trackClick('join-chat-helpful')} className="rounded p-1 hover:bg-white hover:text-[#4D7C0F]"><ThumbsUp size={11} /></button>
                      <button type="button" aria-label="Unhelpful answer" onClick={() => trackClick('join-chat-unhelpful')} className="rounded p-1 hover:bg-white hover:text-red-500"><ThumbsDown size={11} /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {busy && <div className="w-fit rounded-2xl rounded-bl-md bg-white px-4 py-2 text-sm text-[#6B7A70] shadow-sm">Guac is thinking…</div>}
          </div>

          <div className="border-t border-black/5 bg-white p-3">
            <form onSubmit={event => { event.preventDefault(); send() }} className="flex gap-2">
              <input value={input} onChange={event => setInput(event.target.value)} maxLength={600} placeholder="Ask about GetGuac…" aria-label="Ask Guac-AI" className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-[#65A30D] focus:ring-2 focus:ring-[#65A30D]/15" />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Send message" className="grid w-11 place-items-center rounded-xl bg-[#65A30D] text-white transition hover:bg-[#4D7C0F] disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} /></button>
            </form>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <Link href="/start" target="_blank" rel="noopener noreferrer" onClick={() => trackClick('join-chat-signup')} className="rounded-xl bg-[#65A30D] px-3 py-2 text-center text-xs font-extrabold text-white hover:bg-[#4D7C0F]">Join free</Link>
              <Link href="/login?demo=1" target="_blank" rel="noopener noreferrer" onClick={() => trackClick('join-chat-demo')} className="rounded-xl bg-[#F0F7E8] px-3 py-2 text-center text-xs font-extrabold text-[#4D7C0F] hover:bg-[#E6F2D8]">Try the demo</Link>
            </div>
            <p className="mt-2 text-center text-[10px] text-gray-400">No card · No bank connection · Your data is never sold</p>
          </div>
        </section>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-full bg-[#15281C] py-2 pl-2 pr-4 text-sm font-extrabold text-white shadow-xl transition hover:-translate-y-0.5" aria-label="Ask Guac-AI">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><GuacMascot expression="happy" size={31} /></span>
          <MessageCircle size={16} /> Ask Guac-AI
        </button>
      )}
    </div>
  )
}

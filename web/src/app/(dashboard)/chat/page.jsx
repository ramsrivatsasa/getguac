'use client'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { MessageSquare, Send, Plus, Mail } from 'lucide-react'
import { createClient } from '../../../lib/supabase/client'
import {
  listMyThreads, openThreadByEmail, listMessages, postMessage,
} from '../../../lib/dms'
import { getDisplayNames, formatName, initialFor } from '../../../lib/displayNames'

// /chat — direct-message UI between any two GetGuac users. Mirrors the
// shape of HouseholdPanel.jsx's chat section (oldest-first scroll,
// optimistic append, realtime invalidation) but scoped to one peer at a
// time. Every read/write goes through lib/dms.js.
//
// Layout: two-column on desktop (thread list + selected thread), stacked
// on mobile (you tap a thread to drill in; an X returns to the list).

export default function ChatPage() {
  const sb = createClient()
  const qc = useQueryClient()
  const [activeId, setActiveId] = useState(null)
  const [newEmail, setNewEmail] = useState('')
  const [opening, setOpening] = useState(false)

  const { data: threads = [], refetch: refetchThreads } = useQuery({
    queryKey: ['dm-threads'],
    queryFn: listMyThreads,
    staleTime: 30_000,
  })

  // Pull display names for every peer once, batched.
  const peerIds = threads.map(t => t.peer_id)
  const { data: names = new Map() } = useQuery({
    queryKey: ['display-names', peerIds.slice().sort().join(',')],
    queryFn: () => getDisplayNames(peerIds),
    staleTime: 5 * 60_000,
    enabled: peerIds.length > 0,
  })

  // Realtime: when any new dm_message lands in a thread I'm in, invalidate
  // both the thread list (for last_message_at re-sort) and the message
  // list for that thread. We subscribe at the user level so the broadcast
  // covers every thread without one channel per thread.
  useEffect(() => {
    let userId
    sb.auth.getUser().then(({ data }) => {
      userId = data?.user?.id
      if (!userId) return
      const ch = sb.channel(`dm-user:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'dm_messages',
        }, (payload) => {
          // RLS already filters to my threads — any insert that gets
          // through is one I care about.
          qc.invalidateQueries({ queryKey: ['dm-messages', payload.new.thread_id] })
          refetchThreads()
        })
        .subscribe()
      return () => { sb.removeChannel(ch) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startNew(e) {
    e.preventDefault()
    const email = newEmail.trim()
    if (!email) return
    setOpening(true)
    try {
      const tid = await openThreadByEmail(email)
      setNewEmail('')
      await refetchThreads()
      setActiveId(tid)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="space-y-3 max-w-5xl">
      <div className="flex items-center gap-2">
        <MessageSquare size={18} className="text-emerald-700" />
        <h1 className="page-title">Chat</h1>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-3">
        {/* Thread list */}
        <aside className={`card p-3 space-y-3 ${activeId ? 'hidden lg:block' : ''}`}>
          <form onSubmit={startNew} className="space-y-2">
            <label className="label text-[10px]">Start chat by email</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="friend@example.com"
                className="input flex-1 text-xs"
              />
              <button type="submit" className="btn-primary text-xs px-3" disabled={opening}>
                <Plus size={12} /> {opening ? '…' : 'Open'}
              </button>
            </div>
          </form>

          <div className="border-t border-gray-100 pt-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Conversations</h3>
            {threads.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">
                No chats yet. Enter an email above to start one.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {threads.map(t => {
                  const active = t.id === activeId
                  const row = names.get(t.peer_id)
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(t.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${
                          active
                            ? 'bg-emerald-100 text-emerald-900 font-semibold'
                            : 'hover:bg-emerald-50 text-gray-700'
                        }`}
                      >
                        <span className="w-7 h-7 rounded-full bg-emerald-200/60 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0">
                          {initialFor(row, t.peer_id)}
                        </span>
                        <span className="flex-1 min-w-0 truncate">{formatName(row, t.peer_id)}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {new Date(t.last_message_at).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Selected thread */}
        <section className={`card p-0 ${activeId ? '' : 'hidden lg:block'}`}>
          {activeId ? (
            <Thread
              threadId={activeId}
              peerName={formatName(names.get(threads.find(t => t.id === activeId)?.peer_id), threads.find(t => t.id === activeId)?.peer_id)}
              onBack={() => setActiveId(null)}
            />
          ) : (
            <div className="p-8 text-center text-gray-400 text-sm">
              <Mail size={28} className="mx-auto mb-2 text-gray-300" />
              Pick a conversation, or start one by email.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Thread({ threadId, peerName, onBack }) {
  const sb = createClient()
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')
  const scrollRef = useRef(null)

  const { data: messages = [] } = useQuery({
    queryKey: ['dm-messages', threadId],
    queryFn: () => listMessages(threadId),
    staleTime: 30_000,
  })

  // Pull display names for every author seen in the message list (so my
  // own messages also resolve, not just the peer's).
  const authorIds = Array.from(new Set(messages.map(m => m.user_id)))
  const { data: names = new Map() } = useQuery({
    queryKey: ['display-names', authorIds.slice().sort().join(',')],
    queryFn: () => getDisplayNames(authorIds),
    staleTime: 5 * 60_000,
    enabled: authorIds.length > 0,
  })

  // My own user-id so we can right-align my bubbles.
  const { data: meId } = useQuery({
    queryKey: ['me-id'],
    queryFn: async () => (await sb.auth.getUser()).data?.user?.id || null,
  })

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages.length])

  async function send(e) {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return
    setDraft('')
    try {
      const msg = await postMessage(threadId, body)
      qc.setQueryData(['dm-messages', threadId], (old = []) => [...old, msg])
    } catch (err) {
      toast.error(err.message)
      setDraft(body)
    }
  }

  return (
    <div className="flex flex-col h-[70vh]">
      <header className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="lg:hidden text-emerald-700 text-xs font-semibold"
        >← Back</button>
        <span className="font-semibold text-gray-800 text-sm truncate">{peerName}</span>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-center text-gray-400 text-xs py-4">No messages yet — say hi.</p>
        ) : (
          messages.map(m => {
            const mine = m.user_id === meId
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-sm leading-snug ${
                  mine
                    ? 'bg-emerald-600 text-white rounded-br-md'
                    : 'bg-white text-gray-800 ring-1 ring-gray-100 rounded-bl-md'
                }`}>
                  {!mine && (
                    <div className="text-[10px] font-bold text-emerald-700 mb-0.5">
                      {formatName(names.get(m.user_id), m.user_id)}
                    </div>
                  )}
                  <div className="break-words">{m.body}</div>
                  <div className={`text-[9px] ${mine ? 'text-emerald-100' : 'text-gray-400'} mt-0.5 text-right`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <form onSubmit={send} className="flex gap-2 p-2 border-t border-gray-100 shrink-0">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          className="input flex-1 text-sm"
        />
        <button type="submit" className="btn-primary text-xs px-3" disabled={!draft.trim()}>
          <Send size={12} />
        </button>
      </form>
    </div>
  )
}

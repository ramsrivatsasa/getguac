'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Home, UserPlus, LogOut, Crown, Users, Send, MessageSquare, X } from 'lucide-react'
import { createClient } from '../lib/supabase/client'
import {
  getMyHousehold, createHousehold, addMemberByEmail, leaveHousehold, removeMember,
  listMessages, postMessage,
} from '../lib/households'
import { openThreadWith } from '../lib/dms'
import { getDisplayNames, formatName, initialFor } from '../lib/displayNames'
import { useConfirm } from './ConfirmDialog'

// Single Profile-page component that handles every household
// interaction: create / invite / member list / leave / chat. Reads +
// writes go through lib/households.js — no inline DB calls here.
//
// Realtime: subscribes to a Supabase realtime channel scoped to the
// current household_id so other members' messages + member changes
// land without a refresh. Channel torn down on unmount.

export default function HouseholdPanel() {
  const qc = useQueryClient()
  const sb = createClient()
  const confirm = useConfirm()
  const { data: household, isLoading, refetch } = useQuery({
    queryKey: ['household'],
    queryFn: getMyHousehold,
    staleTime: 30_000,
  })

  // Realtime: when there's a household, subscribe to member + message
  // changes so the UI updates the moment someone else adds/removes/chats.
  useEffect(() => {
    if (!household?.id) return
    // Guard the subscribe + teardown — realtime-js can throw inside
    // transportConnect when the WS handshake fails (e.g. table missing
    // from the supabase_realtime publication). Without try/catch, that
    // exception bubbles up during dashboard render and triggers React
    // hydration errors #418/#423/#425 on every page that mounts this
    // component. See migration_060_realtime_publication.sql.
    let ch = null
    try {
      ch = sb
        .channel(`household:${household.id}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'household_members',
          filter: `household_id=eq.${household.id}`,
        }, () => refetch())
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'household_messages',
          filter: `household_id=eq.${household.id}`,
        }, () => qc.invalidateQueries({ queryKey: ['household-messages', household.id] }))
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'shopping_list',
          filter: `household_id=eq.${household.id}`,
        }, () => qc.invalidateQueries({ queryKey: ['shopping'] }))
        .subscribe()
    } catch (err) {
      console.warn('[household] realtime subscribe failed', err)
    }
    return () => {
      if (ch) {
        try { sb.removeChannel(ch) } catch {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id])

  if (isLoading) {
    return (
      <div className="card py-6 text-center text-gray-400 text-sm">Loading household…</div>
    )
  }

  if (!household) return <CreateForm onCreated={() => refetch()} />

  return (
    <div className="space-y-3">
      <Header household={household} onChanged={() => refetch()} />
      <Members household={household} onChanged={() => refetch()} />
      <Chat householdId={household.id} memberIds={household.members.map(m => m.user_id)} />
    </div>
  )
}

// Shared display-name lookup. Returns a Map<user_id, { first_name, last_name }>.
// Cached at the page level so Members + Chat share the same map.
function useDisplayNames(userIds) {
  const key = JSON.stringify([...new Set(userIds || [])].sort())
  const { data } = useQuery({
    queryKey: ['display-names', key],
    queryFn: () => getDisplayNames(userIds),
    staleTime: 5 * 60_000,
    enabled: Array.isArray(userIds) && userIds.length > 0,
  })
  return data || new Map()
}

// ─────────────────────────────────────────────────────────────────────────
// Subviews
// ─────────────────────────────────────────────────────────────────────────

function CreateForm({ onCreated }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await createHousehold(name)
      toast.success('Household created')
      setName('')
      onCreated?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="card border-emerald-100 bg-emerald-50/30 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Home size={16} className="text-emerald-700" />
        <h3 className="font-bold text-emerald-900 text-sm">Start a household</h3>
      </div>
      <p className="text-xs text-emerald-800/80 mb-3">
        Share a shopping list + a quick chat with whoever lives with you. Receipts + analytics stay personal — only the list and chat are shared.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="The Johnson Family"
          maxLength={80}
          required
          className="input flex-1"
        />
        <button type="submit" className="btn-primary text-xs px-4" disabled={busy}>
          {busy ? '…' : 'Create'}
        </button>
      </div>
    </form>
  )
}

function Header({ household, onChanged }) {
  const isOwner = household.my_role === 'owner'
  async function handleLeave() {
    const solo = household.members.length <= 1
    const title = solo ? `Delete "${household.name}"?` : `Leave "${household.name}"?`
    const body = solo
      ? `You're the only member, so leaving deletes the household.`
      : `Other members keep the list.`
    if (!(await confirm({ title, body, confirmText: solo ? 'Delete' : 'Leave', danger: true }))) return
    try {
      await leaveHousehold(household.id)
      toast.success(solo ? 'Household deleted' : 'You left the household')
      onChanged?.()
    } catch (err) {
      toast.error(err.message)
    }
  }
  return (
    <div className="card flex items-center justify-between gap-3 p-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <Home size={16} className="text-emerald-700" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate">{household.name}</p>
          <p className="text-[11px] text-gray-500">
            {household.members.length} member{household.members.length === 1 ? '' : 's'}
            {isOwner && <> · <span className="text-emerald-700">you own this</span></>}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLeave}
        className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-rose-700 hover:bg-rose-50 text-xs font-semibold"
      >
        <LogOut size={12} /> Leave
      </button>
    </div>
  )
}

function Members({ household, onChanged }) {
  const router = useRouter()
  const sb = createClient()
  const isOwner = household.my_role === 'owner'
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const names = useDisplayNames(household.members.map(m => m.user_id))
  const { data: meId } = useQuery({
    queryKey: ['me-id'],
    queryFn: async () => (await sb.auth.getUser()).data?.user?.id || null,
    staleTime: Infinity,
  })

  async function chatWith(peerId) {
    try {
      const tid = await openThreadWith(peerId)
      router.push(`/chat?thread=${tid}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function invite(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await addMemberByEmail(household.id, email)
      toast.success(`${email} added`)
      setEmail('')
      onChanged?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(userId) {
    if (!(await confirm({ title: 'Remove this member?', body: 'They lose access to this household.', confirmText: 'Remove', danger: true }))) return
    try {
      await removeMember(household.id, userId)
      toast.success('Removed')
      onChanged?.()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Users size={14} className="text-gray-500" />
        <h4 className="font-semibold text-gray-800 text-sm">Members</h4>
      </div>
      <ul className="space-y-1">
        {household.members.map(m => (
          <li key={m.user_id} className="flex items-center justify-between gap-2 text-xs py-1">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0">
                {initialFor(names.get(m.user_id), m.user_id)}
              </span>
              <span className="text-gray-700 truncate">{formatName(names.get(m.user_id), m.user_id)}</span>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {m.role === 'owner' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <Crown size={9} /> owner
                </span>
              )}
              {meId && m.user_id !== meId && (
                <button
                  type="button"
                  onClick={() => chatWith(m.user_id)}
                  title="Send a direct message"
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                >
                  <MessageSquare size={11} /> Chat
                </button>
              )}
              {isOwner && m.role !== 'owner' && (
                <button
                  type="button"
                  onClick={() => handleRemove(m.user_id)}
                  className="text-rose-600 hover:text-rose-800 text-[10px] font-semibold"
                >Remove</button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {isOwner && (
        <form onSubmit={invite} className="flex gap-2 pt-1 border-t border-gray-100">
          <input
            type="text"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="handle or email"
            className="input flex-1 text-xs"
            required
          />
          <button type="submit" className="btn-secondary text-xs px-3" disabled={busy}>
            <UserPlus size={12} /> {busy ? '…' : 'Add'}
          </button>
        </form>
      )}
      {!isOwner && (
        <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-100">
          Ask the household owner to add new members.
        </p>
      )}
    </div>
  )
}

function Chat({ householdId, memberIds }) {
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')
  const scrollRef = useRef(null)
  const { data: messages = [] } = useQuery({
    queryKey: ['household-messages', householdId],
    queryFn: () => listMessages(householdId),
    staleTime: 30_000,
  })
  const names = useDisplayNames(memberIds)

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
      const msg = await postMessage(householdId, body)
      // Optimistic-ish: append immediately. Realtime will dedupe on
      // primary key when the postgres_changes event arrives.
      qc.setQueryData(['household-messages', householdId], (old = []) => [...old, msg])
    } catch (err) {
      toast.error(err.message)
      setDraft(body)
    }
  }

  return (
    <div className="card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <MessageSquare size={14} className="text-gray-500" />
        <h4 className="font-semibold text-gray-800 text-sm">Family chat</h4>
        <span className="text-[10px] text-gray-400">"I'm at Costco — anything else?"</span>
      </div>
      <div
        ref={scrollRef}
        className="rounded-lg bg-gray-50 border border-gray-100 p-2 space-y-1 max-h-64 overflow-y-auto text-sm"
      >
        {messages.length === 0 ? (
          <p className="text-center text-gray-400 text-xs py-4">No messages yet — say hi.</p>
        ) : (
          messages.map(m => (
            <div key={m.id} className="flex items-baseline gap-2 leading-tight">
              <span className="text-[10px] font-semibold text-emerald-700 shrink-0">
                {formatName(names.get(m.user_id), m.user_id)}
              </span>
              <span className="text-gray-700 break-words">{m.body}</span>
              <span className="text-[10px] text-gray-300 shrink-0 ml-auto">
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
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

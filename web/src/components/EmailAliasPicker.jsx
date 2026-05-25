'use client'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Mail, Check, X, Loader2, Copy, Sparkles, AlertCircle } from 'lucide-react'
import { createClient } from '../lib/supabase/client'
const EMAIL_DOMAIN = process.env.NEXT_PUBLIC_EMAIL_DOMAIN || 'getguac.app'
const VALID_RE = /^[a-z0-9]([a-z0-9._-]{1,30}[a-z0-9])?$/

export default function EmailAliasPicker({ userId }) {
  const sb = createClient()
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')
  const [checkResult, setCheckResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const debounceRef = useRef(null)

  // Current alias from profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', userId, 'email_alias'],
    queryFn: async () => {
      const { data } = await sb.from('profiles').select('email_alias, alias_set_at').eq('id', userId).maybeSingle()
      return data
    },
    enabled: !!userId,
  })

  // Debounced availability check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!draft) { setCheckResult(null); return }
    const norm = draft.toLowerCase().trim()
    if (!VALID_RE.test(norm)) {
      setCheckResult({ status: 'invalid' })
      return
    }
    if (norm === profile?.email_alias) {
      setCheckResult({ status: 'self' })
      return
    }
    debounceRef.current = setTimeout(async () => {
      setChecking(true)
      try {
        const res = await fetch(`/api/email/check?alias=${encodeURIComponent(norm)}`)
        const data = await res.json()
        setCheckResult(data)
      } catch (e) {
        setCheckResult({ status: 'error', error: e.message })
      } finally {
        setChecking(false)
      }
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [draft, profile?.email_alias])

  const claim = useMutation({
    mutationFn: async (alias) => {
      const res = await fetch('/api/email/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.status || 'Claim failed')
      return data
    },
    onSuccess: (d) => {
      toast.success(`Claimed ${d.full || d.alias + '@' + EMAIL_DOMAIN}`)
      setDraft(''); setCheckResult(null)
      qc.invalidateQueries({ queryKey: ['profile', userId, 'email_alias'] })
    },
    onError: e => toast.error(e.message),
  })

  function copyAlias(text) {
    navigator.clipboard?.writeText(text)
    toast.success('Copied')
  }

  if (profileLoading) return <div className="card py-6 text-center text-gray-400 text-sm">Loading…</div>

  const currentFull = profile?.email_alias ? `${profile.email_alias}@${EMAIL_DOMAIN}` : null
  const status = checkResult?.status
  const draftNorm = draft.toLowerCase().trim()

  return (
    <div className="card space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-lime-100 ring-1 ring-emerald-200 flex items-center justify-center shrink-0">
          <Mail size={20} className="text-emerald-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">Your GetGuac email</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Forward order confirmations to this address — GetGuac auto-creates the receipt.
          </p>
        </div>
      </div>

      {/* Currently-claimed alias */}
      {currentFull ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">Current address</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-base font-bold text-emerald-900 truncate">{currentFull}</span>
            <button
              type="button"
              onClick={() => copyAlias(currentFull)}
              className="ml-auto text-emerald-700 hover:text-emerald-900 p-1 rounded-md hover:bg-emerald-100/60"
              title="Copy"
            >
              <Copy size={14} />
            </button>
          </div>
          {profile.alias_set_at && (
            <p className="text-[10px] text-emerald-700/70 mt-1">
              Claimed {new Date(profile.alias_set_at).toLocaleDateString()}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900">
            No address claimed yet. Pick one below — it&apos;s yours forever, and uniquely yours on GetGuac.
          </p>
        </div>
      )}

      {/* Picker */}
      <div>
        <label className="label">{currentFull ? 'Change to a new address' : 'Pick your address'}</label>
        <div className="flex items-stretch gap-2">
          <div className="flex-1 flex items-stretch rounded-xl border-2 border-gray-200 focus-within:border-emerald-400 transition-colors overflow-hidden">
            <input
              className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="e.g. ram"
              autoComplete="off"
              spellCheck={false}
              maxLength={32}
            />
            <span className="flex items-center px-3 text-sm text-gray-500 font-mono bg-gray-50 border-l border-gray-200">
              @{EMAIL_DOMAIN}
            </span>
          </div>
          <button
            type="button"
            onClick={() => claim.mutate(draftNorm)}
            disabled={
              !draftNorm ||
              claim.isPending ||
              checking ||
              status !== 'available'
            }
            className="btn-primary text-sm whitespace-nowrap"
          >
            {claim.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Claim
          </button>
        </div>

        {/* Live availability status */}
        <div className="mt-2 min-h-[20px] text-xs">
          {!draftNorm ? (
            <span className="text-gray-400">3–32 chars · letters, numbers, dot / dash / underscore</span>
          ) : checking ? (
            <span className="text-gray-500 inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Checking…</span>
          ) : status === 'available' ? (
            <span className="text-emerald-700 font-semibold inline-flex items-center gap-1"><Check size={12} /> {draftNorm}@{EMAIL_DOMAIN} is available</span>
          ) : status === 'taken' ? (
            <span className="text-rose-700 font-semibold inline-flex items-center gap-1"><X size={12} /> Already taken</span>
          ) : status === 'reserved' ? (
            <span className="text-amber-700 font-semibold inline-flex items-center gap-1"><AlertCircle size={12} /> Reserved word — try something else</span>
          ) : status === 'invalid' ? (
            <span className="text-gray-500">Must start and end with a letter or number · 3–32 chars</span>
          ) : status === 'self' ? (
            <span className="text-gray-500">This is your current address</span>
          ) : null}
        </div>

        {/* Suggestions */}
        {checkResult?.suggestions?.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1.5 flex items-center gap-1">
              <Sparkles size={11} className="text-emerald-500" /> Available alternatives
            </p>
            <div className="flex flex-wrap gap-1.5">
              {checkResult.suggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraft(s)}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  title={`Use ${s}@${EMAIL_DOMAIN}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-400 leading-relaxed">
        Tip: once an address is claimed, you can change it but the old one is freed for someone else to take.
        Pick something you&apos;re happy keeping.
      </p>
    </div>
  )
}

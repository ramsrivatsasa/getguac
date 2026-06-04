'use client'
// /invite — Invite-a-friend page.
//
// Shows the signed-in user's 6-char referral code (lazily allocated
// on first visit via ensure_referral_code RPC) plus a shareable URL,
// copy buttons, and a list of past referrals + their credit status.
//
// Reward concept: each successful referral grants 3 Smash days to BOTH
// the inviter and the new user. Smash days are normally derived from
// receipt activity; the referral RPC bumps profiles.smash_days_bonus
// which the dashboard 🔥 chip adds on top.
//
// Pairs with mobile/lib/screens/invite/invite_screen.dart calling the
// same RPCs against the same tables.

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Copy, Share2, UserPlus, CheckCircle2, Hourglass } from 'lucide-react'
import { createClient } from '../../../lib/supabase/client'
import GuacMascot from '../../../components/GuacMascot'
import { track } from '../../../lib/analytics'
import { SuccessPop } from '../../../components/animated'
import mascotBus from '../../../lib/mascotEventBus'

const REWARD_DAYS = 3

export default function InvitePage() {
  const sb = createClient()
  const [busy, setBusy] = useState(false)
  // Bumped on every successful copy so the SuccessPop fires beside
  // the copy button. Counter, not boolean, so two rapid copies fire
  // two pops back-to-back.
  const [copyPop, setCopyPop] = useState(0)

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await sb.auth.getUser(); return data.user },
  })

  // Lazily allocate the caller's 6-char code via the SECURITY DEFINER RPC.
  // The RPC is idempotent — first call inserts + returns, subsequent
  // calls just read. Cache for the session.
  const { data: code, isLoading: codeLoading, error: codeError } = useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: async () => {
      const { data, error } = await sb.rpc('ensure_referral_code')
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
    staleTime: Infinity,
  })

  // Past referrals the current user made. We're the referrer side here
  // — RLS still allows seeing rows where we're the referee but those
  // belong on a "Invited by" line, not in this list.
  const { data: sentRefs = [] } = useQuery({
    queryKey: ['referrals-sent', user?.id],
    queryFn: async () => {
      const { data } = await sb
        .from('referrals')
        .select('id, referee_id, code, created_at, credited_at, reward_smash_days')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!user?.id,
  })

  const shareUrl = useMemo(() => {
    if (!code) return ''
    return `https://getguac.app/?ref=${code}`
  }, [code])

  async function copy(text, label) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
      // Referrals are a celebration moment — pop the mascot + fire
      // the local SuccessPop on the button so the copy feels earned.
      setCopyPop(p => p + 1)
      mascotBus.pulse()
      if (label === 'Link' || label === 'Share link') {
        track('referral_link_copied')
      }
    } catch {
      toast.error('Copy failed — long-press to copy manually')
    }
  }

  async function share() {
    if (!shareUrl) return
    setBusy(true)
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: 'Join me on GetGuac',
          text: `I'm tracking my spending with GetGuac. Use my code ${code} and we both get ${REWARD_DAYS} Smash days.`,
          url: shareUrl,
        })
      } else {
        await copy(shareUrl, 'Share link')
      }
    } catch {
      // user cancelled — no-op
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6 pb-20">
      <header className="flex items-start gap-4">
        <GuacMascot expression="celebrating" size={70} />
        <div className="flex-1 min-w-0">
          <h1 className="page-title">Invite friends</h1>
          <p className="text-sm text-gray-500 mt-1">
            Share your code. When a friend signs up with it, you each get{' '}
            <strong className="text-emerald-700">{REWARD_DAYS} Smash days</strong> on
            your 🔥 chip.
          </p>
        </div>
      </header>

      {/* Big code card */}
      <section className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 text-white rounded-2xl p-6 shadow-md">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-50">
          Your invite code
        </p>
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <p className="text-4xl font-black tracking-[0.25em] tabular-nums select-all">
            {codeLoading ? '······' : (code || '——————')}
          </p>
          {code && (
            <button
              type="button"
              onClick={() => copy(code, 'Code')}
              className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-sm font-bold backdrop-blur transition hover:scale-[1.04] active:scale-95"
            >
              <Copy size={14} /> Copy
              {/* SuccessPop fires the check + ring on the button each
                  time the user copies. */}
              <SuccessPop trigger={copyPop} size={28} />
            </button>
          )}
        </div>
        {codeError && (
          <p className="mt-3 text-xs text-rose-100">
            Could not load code: {codeError.message}
          </p>
        )}
      </section>

      {/* Share link card */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
          Shareable link
        </p>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
          <code className="flex-1 text-sm font-mono text-gray-800 truncate">
            {shareUrl || 'Loading…'}
          </code>
          {shareUrl && (
            <button
              type="button"
              onClick={() => copy(shareUrl, 'Link')}
              className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 inline-flex items-center gap-1.5"
            >
              <Copy size={12} /> Copy
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={share}
          disabled={!shareUrl || busy}
          className="btn-primary w-full justify-center mt-3"
        >
          <Share2 size={15} /> Share
        </button>
        <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
          The <span className="font-mono">?ref=</span> bit on the URL is what
          tells us who invited the new user. We apply the credit automatically
          once they finish signing up.
        </p>
      </section>

      {/* Reward explanation */}
      <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
        <h2 className="font-extrabold text-emerald-900 text-base mb-1.5">
          How the reward works
        </h2>
        <ul className="text-sm text-emerald-900/90 space-y-1.5 list-disc pl-5 leading-relaxed">
          <li>You share your code or link with a friend.</li>
          <li>They sign up at getguac.app and the code lands with them.</li>
          <li>
            On their first dashboard load, we credit{' '}
            <strong>{REWARD_DAYS} Smash days</strong> to your 🔥 chip — and{' '}
            <strong>{REWARD_DAYS} more</strong> to theirs.
          </li>
          <li>One bonus per new user. Self-referrals don't count.</li>
        </ul>
      </section>

      {/* Past invites */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
          People you've invited ({sentRefs.length})
        </h2>
        {sentRefs.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 text-sm text-gray-500 flex items-center gap-3">
            <UserPlus size={18} className="text-gray-400" />
            No one yet — share your code above to get started.
          </div>
        ) : (
          <ul className="space-y-2">
            {sentRefs.map(r => (
              <li
                key={r.id}
                className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-3"
              >
                <div
                  className={
                    'w-10 h-10 rounded-full flex items-center justify-center ' +
                    (r.credited_at
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700')
                  }
                >
                  {r.credited_at ? <CheckCircle2 size={18} /> : <Hourglass size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    Friend signed up with <span className="font-mono">{r.code}</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {r.credited_at
                      ? `Credited · +${r.reward_smash_days} Smash days each`
                      : 'Pending'}
                    {' · '}
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-gray-400 pt-2">
        Question or stuck? <Link href="/profile" className="text-emerald-700 font-semibold hover:underline">Profile</Link>
      </p>
    </div>
  )
}

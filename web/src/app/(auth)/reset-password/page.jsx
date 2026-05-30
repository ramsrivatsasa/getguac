'use client'
// Branded password-reset landing.
//
// The Supabase email template links to:
//   https://getguac.app/reset-password?token_hash={{ .TokenHash }}&type=recovery
//
// We pull the hash out of the query, exchange it for a recovery
// session via verifyOtp, then let the user enter a new password.
// On success they're sent to /login with a success toast.
//
// Why not link directly to Supabase's /auth/v1/verify endpoint? That
// works but the email URL is *.supabase.co — confusing and looks
// untrustworthy in some mail clients. Routing through getguac.app
// keeps every user-facing URL on our domain.

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'
import toast from 'react-hot-toast'
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react'
import GuacMascot from '../../../components/GuacMascot'

export default function ResetPasswordPage() {
  const router = useRouter()
  const search = useSearchParams()
  const [stage, setStage] = useState('verifying') // verifying | ready | saving | done | error
  const [errMsg, setErrMsg] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    const sb = createClient()
    const tokenHash = search.get('token_hash') || search.get('token')
    const type = search.get('type') || 'recovery'
    if (!tokenHash) {
      setStage('error')
      setErrMsg('Missing recovery token. Open the link from the email directly — copy-pasting can strip the token.')
      return
    }
    sb.auth.verifyOtp({ token_hash: tokenHash, type })
      .then(({ error }) => {
        if (error) {
          setStage('error')
          setErrMsg(
            error.message.includes('expired')
              ? 'This reset link has expired. Request a new one from the sign-in page.'
              : error.message
          )
          return
        }
        setStage('ready')
      })
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.")
      return
    }
    setStage('saving')
    const sb = createClient()
    const { error } = await sb.auth.updateUser({ password })
    if (error) {
      setStage('ready')
      toast.error(error.message)
      return
    }
    setStage('done')
    toast.success('Password updated 🥑')
    setTimeout(() => router.push('/login'), 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-green-800 to-lime-700 p-4 font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <GuacMascot expression={stage === 'error' ? 'sad' : 'happy'} size={80} />
          <h1 className="text-3xl font-black text-white mt-2">Reset your password</h1>
          <p className="text-emerald-100 text-sm mt-1">Pick a new password for your GetGuac account.</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          {stage === 'verifying' && (
            <div className="flex flex-col items-center py-8 text-emerald-700">
              <Loader2 className="animate-spin" size={32} />
              <p className="mt-3 text-sm font-semibold">Verifying your link…</p>
            </div>
          )}

          {stage === 'error' && (
            <div className="text-center space-y-3 py-4">
              <p className="text-rose-700 font-semibold">Couldn&apos;t verify this link</p>
              <p className="text-sm text-gray-600">{errMsg}</p>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
              >
                Back to sign in
              </button>
            </div>
          )}

          {(stage === 'ready' || stage === 'saving') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  New password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Confirm password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  placeholder="Repeat the password"
                  minLength={8}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={stage === 'saving'}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold shadow hover:shadow-lg disabled:opacity-60 transition"
              >
                {stage === 'saving'
                  ? (<><Loader2 className="animate-spin" size={16} /> Saving…</>)
                  : (<><KeyRound size={16} /> Set new password</>)}
              </button>
            </form>
          )}

          {stage === 'done' && (
            <div className="text-center py-6">
              <CheckCircle2 className="mx-auto text-emerald-600" size={42} />
              <p className="text-emerald-800 font-bold mt-2">Password updated.</p>
              <p className="text-sm text-gray-500 mt-1">Redirecting you to sign in…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

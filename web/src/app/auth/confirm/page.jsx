'use client'
// Post-email-confirmation landing page.
//
// Supabase redirects here after the user clicks the confirmation link in
// the signup email. The URL contains a session in the hash fragment which
// the supabase-js client picks up automatically (#access_token=... &refresh_token=...
// & type=signup). Once we have a session, we call our own /api/auth/finish-signup
// to claim the pending username + provision the Migadu mailbox using the
// `pending_username` we stashed in user_metadata at signup time.
//
// On success: green tick + auto-redirect to /dashboard.
// On failure to claim username: still successful auth, just need them to
// pick a different handle from /profile. We send them there with a toast.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'
import toast from 'react-hot-toast'
import GuacMascot from '../../../components/GuacMascot'

export default function ConfirmEmailPage() {
  const router = useRouter()
  const [state, setState] = useState('checking')   // checking | claiming | done | failed
  const [detail, setDetail] = useState('')

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const sb = createClient()
        // Wait for the hash-based session pickup. Supabase JS auto-parses
        // the URL on init; we just need to read the result.
        // Give it a couple of ticks to settle.
        await new Promise(r => setTimeout(r, 150))
        const { data: { session } } = await sb.auth.getSession()
        if (cancelled) return
        if (!session?.user) {
          setState('failed')
          setDetail('No session found. The confirmation link may have expired — try signing in, and we will resend the email automatically.')
          return
        }

        setState('claiming')
        const res = await fetch('/api/auth/finish-signup', { method: 'POST' })
        const body = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          // Auth succeeded but post-confirm provisioning didn't. Still let them in.
          toast(body.error || "You're verified — couldn't reserve your handle, pick one in Profile.")
          setState('done')
          setTimeout(() => router.replace('/dashboard'), 800)
          return
        }
        setState('done')
        setDetail(body.username ? `Welcome to GetGuac, @${body.username}!` : "You're verified.")
        setTimeout(() => router.replace('/dashboard'), 1200)
      } catch (e) {
        if (!cancelled) {
          setState('failed')
          setDetail(e.message || 'Confirmation failed')
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-emerald-50 to-lime-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center space-y-4">
        <GuacMascot size={96} />
        {state === 'checking' && (
          <>
            <h1 className="text-xl font-bold text-emerald-800">Confirming your email…</h1>
            <p className="text-sm text-gray-600">Hang on a second — GuacWizard is checking your spell.</p>
          </>
        )}
        {state === 'claiming' && (
          <>
            <h1 className="text-xl font-bold text-emerald-800">Setting things up…</h1>
            <p className="text-sm text-gray-600">Claiming your @getguac.app handle and provisioning your inbox.</p>
          </>
        )}
        {state === 'done' && (
          <>
            <h1 className="text-2xl font-bold text-emerald-700">✓ Confirmed</h1>
            <p className="text-sm text-gray-600">{detail || 'Your account is active.'} Redirecting…</p>
          </>
        )}
        {state === 'failed' && (
          <>
            <h1 className="text-xl font-bold text-rose-700">Could not confirm</h1>
            <p className="text-sm text-gray-600">{detail}</p>
            <a href="/login" className="inline-block mt-3 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700">Go to sign in</a>
          </>
        )}
      </div>
    </div>
  )
}

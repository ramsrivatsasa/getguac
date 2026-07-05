'use client'
// Tiny client island that watches the URL for a ?ref=<CODE> query
// param and stashes it in localStorage under `pending_referral_code`.
// Rendered on both the public landing page (/) and the /register
// page so the code survives the round trip through the sign-up flow.
//
// The actual credit happens later in PostSignupReferralApply (mounted
// inside the dashboard) which reads the same localStorage key, calls
// apply_referral_code RPC, and clears it. Keeping capture + apply in
// separate components means we don't need a session to capture (the
// landing page renders before sign-in) AND we don't fire the RPC
// unless we have a session (the dashboard route is auth-gated).

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'pending_referral_code'
// Matches the DB check: 6 uppercase alphanumeric chars.
const VALID = /^[A-Z0-9]{6}$/

export default function ReferralCapture({ banner = false }) {
  // With `banner` the component also RENDERS a welcome strip for the invited
  // friend — telling them exactly what to do (tap Get started) and where to
  // learn more (/how-it-works). Without it, capture stays invisible.
  const [code, setCode] = useState('')
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const raw = params.get('ref')
      if (raw) {
        const fresh = String(raw).toUpperCase().trim()
        // Don't clobber an existing stash if one's already pending
        // (first invite wins — usually because the user came back via
        // a second link).
        if (VALID.test(fresh) && !window.localStorage.getItem(STORAGE_KEY)) {
          window.localStorage.setItem(STORAGE_KEY, fresh)
        }
      }
      const stashed = window.localStorage.getItem(STORAGE_KEY)
      if (stashed && VALID.test(stashed)) setCode(stashed)
    } catch {
      // private mode / disabled storage — ignore
    }
  }, [])
  if (!banner || !code) return null
  return (
    <div className="mx-auto max-w-3xl mt-4 px-4">
      <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3 text-sm text-emerald-900 text-center space-y-2">
        <p>
          <span className="mr-1.5">🎁</span>
          <strong>You&apos;ve been invited to GetGuac!</strong>{' '}
          Create your free account — invite code{' '}
          <span className="font-mono font-bold">{code}</span> applies automatically and you&apos;ll both earn Smash days.
        </p>
        {/* Real button, not just instructions — on phones the header's own
            Get started hides behind the hamburger menu, so the invited
            friend needs a tappable CTA right here in the banner. */}
        <p>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white font-bold px-5 py-2 hover:bg-emerald-700 transition shadow-sm"
          >
            Get started →
          </Link>
        </p>
        <p>
          <Link href="/how-it-works" className="font-bold text-emerald-700 underline underline-offset-2">
            First time here? See how GetGuac works →
          </Link>
        </p>
      </div>
    </div>
  )
}

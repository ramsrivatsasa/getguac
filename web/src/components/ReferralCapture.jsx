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

import { useEffect } from 'react'

const STORAGE_KEY = 'pending_referral_code'
// Matches the DB check: 6 uppercase alphanumeric chars.
const VALID = /^[A-Z0-9]{6}$/

export default function ReferralCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const raw = params.get('ref')
      if (!raw) return
      const code = String(raw).toUpperCase().trim()
      if (!VALID.test(code)) return
      // Don't clobber an existing stash if one's already pending
      // (first invite wins — usually because the user came back via
      // a second link).
      if (window.localStorage.getItem(STORAGE_KEY)) return
      window.localStorage.setItem(STORAGE_KEY, code)
    } catch {
      // private mode / disabled storage — ignore
    }
  }, [])
  return null
}

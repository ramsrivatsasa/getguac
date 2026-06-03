'use client'
// On the first authenticated dashboard load after sign-up, this
// component picks up the `pending_referral_code` that ReferralCapture
// stashed in localStorage during the landing-page / register-page
// visit, calls the apply_referral_code RPC, and shows a toast on
// success.
//
// Idempotent: the RPC itself rejects double-apply (referee_id is
// UNIQUE in the referrals table) so even if this runs twice we get a
// graceful no-op. We clear the localStorage entry on any terminal
// response (success OR a non-retryable failure like "already used")
// so the toast doesn't fire on every dashboard mount.

import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '../lib/supabase/client'

const STORAGE_KEY = 'pending_referral_code'

export default function PostSignupReferralApply() {
  // Guard against React 18 strict-mode double-effect — a network call
  // is cheap, but the toast firing twice is a visual bug.
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true

    let cancelled = false
    ;(async () => {
      let code = null
      try { code = window.localStorage.getItem(STORAGE_KEY) } catch { return }
      if (!code) return

      const sb = createClient()
      // Need a session — dashboard is auth-gated, but the server
      // component redirects before we get here only when totally
      // signed out; race-paranoia check.
      const { data: { user } } = await sb.auth.getUser()
      if (!user || cancelled) return

      const { data, error } = await sb.rpc('apply_referral_code', { p_code: code })
      if (cancelled) return

      // RPC returns { success, message, smash_days_credited }.
      // Network / RLS errors get retried on the next dashboard mount;
      // anything else (success or business-logic rejection) clears
      // the stash so we don't pester the user.
      if (error) return

      try { window.localStorage.removeItem(STORAGE_KEY) } catch {}

      if (data?.success) {
        toast.success(
          data.message || `+${data.smash_days_credited || 3} Smash days — invite applied`,
          { duration: 5000 },
        )
      }
      // Silent on business rejections (already used / self-referral /
      // bad code). No need to surface "you already redeemed" to a
      // user who just signed up.
    })()

    return () => { cancelled = true }
  }, [])

  return null
}

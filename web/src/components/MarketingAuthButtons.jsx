'use client'
// Auth-aware CTA for the marketing header. Checks the session client-side so
// the marketing pages can stay statically rendered: a logged-in visitor sees a
// "Dashboard" button (so they can get back to the app from /marketplace,
// /coupons, etc.), everyone else sees the usual Sign in / Get started.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '../lib/supabase/client'

export default function MarketingAuthButtons() {
  const [authed, setAuthed] = useState(null) // null = checking, true/false = known

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => setAuthed(!!data?.user)).catch(() => setAuthed(false))
  }, [])

  async function signOut() {
    try { await createClient().auth.signOut() } catch { /* ignore */ }
    window.location.href = '/'
  }

  if (authed) {
    return (
      <>
        <button onClick={signOut} className="hidden sm:inline btn-secondary">Sign out</button>
        <Link href="/dashboard" className="btn-primary">Dashboard</Link>
      </>
    )
  }
  // Checking or logged-out → marketing CTAs.
  return (
    <>
      <Link href="/login" className="hidden sm:inline btn-secondary">Sign in</Link>
      <Link href="/register" className="btn-primary">Get started</Link>
    </>
  )
}

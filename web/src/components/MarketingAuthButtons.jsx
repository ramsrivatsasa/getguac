'use client'
// Auth-aware CTA for the marketing header. Checks the session client-side so
// the marketing pages can stay statically rendered: a logged-in visitor sees a
// "Dashboard" button (so they can get back to the app from /marketplace,
// /coupons, etc.), everyone else sees the usual Sign in / Get started.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '../lib/supabase/client'
import { GG_CTA } from '../lib/gg-nav-def'

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
      {/* Plain link, not btn-secondary — the homepage renders Sign in as text
          next to the Get started pill, and every marketing header now matches
          it. A bordered Sign in put two buttons of near-equal weight side by
          side and blunted the one CTA that matters. */}
      <Link
        href="/login"
        className="hidden sm:inline"
        style={{ color: '#5C6B60', fontWeight: 700, fontSize: 14.5, textDecoration: 'none' }}
      >
        Sign in
      </Link>
      {/* GG_CTA, not a literal /register. The homepage and all 33 static pages
          send Get started to /join; only this header went straight to the signup
          form, so the same button did two different things depending on which
          page you happened to be on.
          ggcta, not btn-primary: the global button is a 14px/12px-radius
          rounded rect, while the homepage and static headers draw a 14.5px
          pill. Same button, two shapes, depending on the page. */}
      <Link href={GG_CTA.href} className="ggcta">{GG_CTA.label}</Link>
    </>
  )
}

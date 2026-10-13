'use client'
// PostHog client init + Next.js App Router pageview tracking + Supabase
// auth identification. Env-var gated: when NEXT_PUBLIC_POSTHOG_KEY is
// absent, the provider just renders its children and does nothing else
// (no network, no global side effects).
//
// Mounted from app/layout.jsx so every route gets pageviews. We disable
// PostHog's built-in capture_pageview because the App Router doesn't fire
// the route-change events PostHog hooks into — instead we watch pathname +
// searchParams and capture $pageview manually on every change.

import { useEffect, useState, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '../lib/supabase/client'

const POSTHOG_KEY  = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

function PosthogPageviewTracker({ client }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  useEffect(() => {
    if (!POSTHOG_KEY) return
    if (!client?.__loaded) return
    const search = searchParams?.toString()
    const url = pathname + (search ? `?${search}` : '')
    client.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams, client])
  return null
}

export default function PosthogProvider({ children }) {
  const [client, setClient] = useState(null)
  useEffect(() => {
    if (!POSTHOG_KEY) return
    let cancelled = false, subscription
    import('posthog-js').then(({ default: posthog }) => {
    if (cancelled) return
    if (!posthog.__loaded) posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: false, // we fire $pageview manually (see tracker above)
    })
    setClient(posthog)

    // Tie events to the signed-in Supabase user. SIGNED_IN fires both on
    // login and on every cold start with an existing session, so identify
    // is idempotent in practice.
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      const u = data?.user
      if (u && posthog.__loaded) {
        posthog.identify(u.id, { email: u.email })
      }
    }).catch(() => {})

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (!posthog.__loaded) return
      if (event === 'SIGNED_IN' && session?.user) {
        posthog.identify(session.user.id, { email: session.user.email })
      } else if (event === 'SIGNED_OUT') {
        posthog.reset()
      }
    })
    subscription = sub.subscription
    }).catch(() => {})
    return () => { cancelled = true; subscription?.unsubscribe?.() }
  }, [])

  return (
    <>
      {/* useSearchParams() requires a Suspense boundary or the Vercel
          static-export build freezes (see project memory). */}
      <Suspense fallback={null}>
        <PosthogPageviewTracker client={client} />
      </Suspense>
      {children}
    </>
  )
}

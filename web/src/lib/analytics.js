// Tiny analytics helper. Calls posthog.capture if PostHog has been
// initialized (NEXT_PUBLIC_POSTHOG_KEY present + PosthogProvider mounted),
// otherwise no-ops silently so callers don't have to feature-gate.
//
// Client-side only — server-side capture would require posthog-node, which
// we intentionally skip for free-tier simplicity. If a server route needs to
// emit an event, queue it on the response and let the client fire it.

'use client'
import posthog from 'posthog-js'

export function track(event, props) {
  try {
    // posthog.__loaded is set by posthog.init(); when missing we no-op.
    if (typeof window === 'undefined') return
    if (!posthog || !posthog.__loaded) return
    posthog.capture(event, props || {})
  } catch {
    // Analytics must never throw into product code.
  }
}

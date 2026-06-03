// Sentry Node/server runtime init. Same env-var gating as the client config —
// absent DSN means no init, no network, no overhead.

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    ignoreErrors: [
      'AbortError',
      'NetworkError',
      'Load failed',
      'Failed to fetch',
    ],
  })
}

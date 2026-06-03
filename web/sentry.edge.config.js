// Sentry edge-runtime init (middleware + edge route handlers). Same env-var
// gating — missing DSN means no init.

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

// Sentry browser-side init. Loaded automatically by @sentry/nextjs in the
// client bundle. DSN comes from NEXT_PUBLIC_SENTRY_DSN at build time —
// when absent we skip Sentry.init entirely so the SDK no-ops cleanly
// (free-tier ready: no DSN means no network calls, no errors captured).

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Common noise on spotty mobile networks — these aren't actionable.
    ignoreErrors: [
      'AbortError',
      'NetworkError',
      'Load failed',
      'Failed to fetch',
    ],
  })
}

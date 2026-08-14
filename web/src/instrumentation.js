import * as Sentry from '@sentry/nextjs'

const sharedOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  ignoreErrors: ['AbortError', 'NetworkError', 'Load failed', 'Failed to fetch'],
}

export async function register() {
  if (!sharedOptions.dsn) return
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init(sharedOptions)
  }
}

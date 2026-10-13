const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
let client, loading

if (dsn) {
  loading = import('@sentry/nextjs').then(Sentry => {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      ignoreErrors: ['AbortError', 'NetworkError', 'Load failed', 'Failed to fetch'],
    })
    client = Sentry
    return Sentry
  }).catch(() => {})
}

export function onRouterTransitionStart(...args) {
  if (client) client.captureRouterTransitionStart(...args)
  else loading?.then(Sentry => Sentry?.captureRouterTransitionStart(...args))
}

'use client'
// Catches React render errors at the root so Sentry sees them (Next.js App
// Router won't report these to Sentry without a global-error boundary). Shows a
// calm recover-card instead of a white screen — principle #1: never crash the
// UI. Sentry no-ops cleanly when NEXT_PUBLIC_SENTRY_DSN is unset.
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: '-apple-system, Segoe UI, Roboto, sans-serif', background: 'linear-gradient(135deg,#f0fdf4,#ffffff 55%,#ecfccb)' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: 'center', background: '#fff', border: '1px solid #d1fae5', borderRadius: 20, padding: '32px 28px', boxShadow: '0 24px 60px rgba(2,44,34,.12)' }}>
            <div style={{ fontSize: 44 }} aria-hidden="true">🥑</div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#065f46', margin: '10px 0 6px' }}>Something went sideways.</h1>
            <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.5, margin: '0 0 18px' }}>
              A hiccup on our end — your data is safe. Give it another go.
            </p>
            <button
              onClick={() => reset()}
              style={{ background: '#16a34a', color: '#fff', fontWeight: 800, border: 0, borderRadius: 999, padding: '11px 26px', fontSize: 15, cursor: 'pointer' }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

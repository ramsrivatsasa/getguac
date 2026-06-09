'use client'
// Auth bootstrap for the mobile WebView (see mobile WebAppScreen).
//
// The native app opens /embed#access_token=…&refresh_token=…&next=/reports.
// Tokens live in the URL fragment, so they never reach the server or any log.
// We hand them to Supabase (setSession writes the SSR auth cookies the server
// layout reads), drop a `guac_embedded` cookie so the dashboard layout hides
// its sidebar/topbar, then redirect to the requested page — now signed in and
// chrome-free inside the mobile shell.
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

export default function EmbedBootstrap() {
  const [msg, setMsg] = useState('Signing you in…')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''))
        const access_token = hash.get('access_token')
        const refresh_token = hash.get('refresh_token')
        const next = hash.get('next') || '/dashboard'
        const safeNext = next.startsWith('/') ? next : '/dashboard'

        // Mark this WebView context as embedded for a year.
        document.cookie = `guac_embedded=1; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`

        if (!access_token || !refresh_token) {
          setMsg(`Missing sign-in token${refresh_token ? '' : ' (no refresh token)'} — reopen from the app.`)
          return
        }

        const sb = createClient()
        const { error: setErr } = await sb.auth.setSession({ access_token, refresh_token })
        if (setErr) { setMsg(`Sign-in failed: ${setErr.message}`); return }

        // Confirm the session actually persisted (writes the SSR cookies the
        // server layout reads) BEFORE navigating — avoids a login bounce.
        const { data: { user }, error: userErr } = await sb.auth.getUser()
        if (userErr || !user) { setMsg(`Session not established${userErr ? `: ${userErr.message}` : ''}.`); return }

        if (cancelled) return
        window.location.replace(safeNext)
      } catch (e) {
        if (!cancelled) setMsg(`Couldn't start session: ${e?.message || e}`)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif', color: '#166534', background: '#f0fdf4',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 34 }}>🥑</div>
        <p style={{ marginTop: 8, fontWeight: 700 }}>{msg}</p>
      </div>
    </div>
  )
}

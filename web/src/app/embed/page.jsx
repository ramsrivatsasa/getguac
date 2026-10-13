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
  const [msg, setMsg] = useState('Preparing your page…')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // React Strict Mode mounts effects twice in local development. The
        // first pass removes the secret-bearing fragment immediately, so keep
        // a one-tab copy long enough for the second pass to finish the same
        // bootstrap. It is removed as soon as the session is established.
        const rawHash = (window.location.hash || '').replace(/^#/, '')
        if (rawHash) sessionStorage.setItem('guac_embed_params', rawHash)
        const hash = new URLSearchParams(
          rawHash || sessionStorage.getItem('guac_embed_params') || ''
        )
        const access_token = hash.get('access_token')
        const refresh_token = hash.get('refresh_token')
        const next = hash.get('next') || '/dashboard'
        const safeNext = /^\/(?!\/)/.test(next) ? next : '/dashboard'

        // Remove credentials from visible history before any asynchronous work.
        window.history.replaceState(null, '', '/embed')

        // Mark this WebView context as embedded for a year.
        document.cookie = `guac_embedded=1; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`

        if (!access_token || !refresh_token) {
          setMsg(`Missing sign-in token${refresh_token ? '' : ' (no refresh token)'} — reopen from the app.`)
          return
        }

        const sb = createClient()
        const { data: setData, error: setErr } = await sb.auth.setSession({ access_token, refresh_token })
        if (setErr) { setMsg(`Sign-in failed: ${setErr.message}`); return }

        // Trust the session setSession hands back (in-memory) — it has already
        // written the SSR auth cookies the server layout reads. We deliberately
        // do NOT call getUser() here: in the Android WebView its server
        // round-trip + cookie read-back was throwing "Auth session missing"
        // even though setSession succeeded. Fall back to a local getSession()
        // read if setSession returned no session object.
        let session = setData?.session ?? null
        if (!session) {
          const { data: getData } = await sb.auth.getSession()
          session = getData?.session ?? null
        }
        if (!session) { setMsg('Session not established — reopen from the app.'); return }

        if (cancelled) return
        sessionStorage.removeItem('guac_embed_params')
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
        <style>{`
          @keyframes guacFloat { 0%,100% { transform: translateY(0) rotate(-4deg) } 50% { transform: translateY(-10px) rotate(4deg) } }
          @keyframes guacLoad { from { transform: translateX(-100%) } to { transform: translateX(260%) } }
        `}</style>
        <div style={{ fontSize: 48, animation: 'guacFloat 1.1s ease-in-out infinite' }}>🥑</div>
        <p style={{ marginTop: 8, fontWeight: 700 }}>{msg}</p>
        <div style={{ width: 150, height: 4, margin: '12px auto 0', borderRadius: 99, overflow: 'hidden', background: '#dce8df' }}>
          <div style={{ width: '45%', height: '100%', borderRadius: 99, background: '#65a30d', animation: 'guacLoad 1.15s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

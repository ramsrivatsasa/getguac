'use client'
// Cloudflare Turnstile CAPTCHA for the MOBILE APP's register screen.
//
// Turnstile only runs on allow-listed hostnames (getguac.app), so the Flutter
// register screen can't render the widget natively. Instead it opens this page
// in a small webview_flutter dialog with a JavaScript channel named
// `TurnstileBridge`, and we post the token back through it:
//
//   window.TurnstileBridge.postMessage(<token>)   // '' = error/expired
//
// The app then includes the token as `turnstile_token` in its
// POST /api/auth/sign-up, which verifies it exactly like a web signup.
// A window.parent.postMessage fallback keeps the page testable in an iframe.
import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

function sendToken(token) {
  try { window.TurnstileBridge?.postMessage(token) } catch {}
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'turnstile-token', token }, '*')
    }
  } catch {}
}

export default function TurnstileEmbedPage() {
  const boxRef = useRef(null)
  const rendered = useRef(false)
  const [status, setStatus] = useState(SITE_KEY ? 'loading' : 'unconfigured') // loading | ready | done | unconfigured

  // Explicit render (not the data-sitekey auto-scan): inside a WebView the
  // script can finish loading before React commits the container div, and the
  // auto-scan would find nothing. Poll briefly for window.turnstile instead.
  useEffect(() => {
    if (!SITE_KEY) return
    let tries = 0
    const timer = setInterval(() => {
      if (rendered.current) { clearInterval(timer); return }
      if (window.turnstile && boxRef.current) {
        rendered.current = true
        clearInterval(timer)
        window.turnstile.render(boxRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => { setStatus('done'); sendToken(token) },
          'error-callback': () => sendToken(''),
          'expired-callback': () => sendToken(''),
        })
        setStatus('ready')
      } else if (++tries > 200) { // ~20s — give up, app shows its cancel path
        clearInterval(timer)
      }
    }, 100)
    return () => clearInterval(timer)
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 14, padding: 16,
      fontFamily: 'system-ui, sans-serif', background: '#fff', color: '#166534',
    }}>
      {SITE_KEY && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />}
      <div style={{ fontSize: 30 }}>🥑</div>
      <p style={{ fontWeight: 700, fontSize: 14, margin: 0, textAlign: 'center' }}>
        {status === 'done' ? 'All set — thanks!' :
         status === 'unconfigured' ? 'Security check unavailable right now.' :
         'Quick security check…'}
      </p>
      <div ref={boxRef} />
      {status === 'loading' && (
        <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>Loading the check…</p>
      )}
    </div>
  )
}
